import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ApiError, apiPost } from '../../api/client';
import { money } from './format';

export interface Supplier { id: number; name: string }

/**
 * A piece typed in at the till, with where it came from. It is not saved until
 * the sale is issued: then it goes in through a supplier bill, so it carries
 * its cost and source exactly as one entered under Purchases would.
 */
export interface PieceDraft {
  key: number;
  supplierId: number;
  supplierName: string;
  /** Blank when the paper bill is lost; one is made up at save time. */
  billNo: string;
  billDate: string;
  supplierPaid: boolean;
  name: string;
  category: string;
  purity: string;
  silverWeightGrams: number;
  ratePerGram: number;
  makingCharge: number;
  stoneWeightGrams: number | null;
  stonePrice: number | null;
  /** What the buyer pays for it, as typed. */
  totalAmount: number;
  /** Worked out from the total, never typed: the part of today's price that
      is not silver, making or stone. Stored on the piece as its margin. */
  profitAmount: number;
}

export const CATEGORIES = ['rings', 'necklaces', 'earrings', 'bangles', 'pendants', 'other'];

const round2 = (x: number) => Math.round(x * 100) / 100;

/** What the shop paid: silver at the rate paid, plus making, plus stone. */
export const draftCost = (d: PieceDraft) =>
  round2(d.silverWeightGrams * d.ratePerGram + d.makingCharge + (d.stonePrice ?? 0));

/** Today's price before any margin: silver at today's rate, plus making and stone. */
const basePrice = (weight: number, making: number, stone: number, todayRate: number) =>
  round2(weight * todayRate + making + stone);

const n = (v: string) => (v.trim() === '' ? 0 : Number(v));
const str = (v: number | null | undefined) => (v === null || v === undefined || v === 0 ? '' : String(v));

// 16px on phones: anything smaller and iOS zooms the page on focus.
const INPUT = 'mt-1 w-full px-3 py-3 sm:py-2.5 rounded-lg border border-neutral-200 text-base sm:text-sm bg-white';
const NUM = `${INPUT} font-mono tabular-nums`;

export function NewPieceSheet({
  open,
  initial,
  suppliers,
  onSupplierAdded,
  todayRate,
  defaultBillDate,
  lastSource,
  onSave,
  onClose,
}: {
  open: boolean;
  /** Set when editing a piece already on this sale. */
  initial: PieceDraft | null;
  suppliers: Supplier[];
  onSupplierAdded: (s: Supplier) => void;
  todayRate: number;
  defaultBillDate: string;
  /** The supplier and bill of the last piece typed in, so a run of pieces off
      one old bill does not mean choosing it again each time. */
  lastSource: Pick<PieceDraft, 'supplierId' | 'billNo' | 'billDate' | 'supplierPaid'> | null;
  onSave: (d: PieceDraft) => void;
  onClose: () => void;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(defaultBillDate);
  const [supplierPaid, setSupplierPaid] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('rings');
  const [purity, setPurity] = useState('925');
  const [weight, setWeight] = useState('');
  const [rate, setRate] = useState('');
  const [making, setMaking] = useState('');
  const [stoneWeight, setStoneWeight] = useState('');
  const [stonePrice, setStonePrice] = useState('');
  const [total, setTotal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fill on every open: blank for a new piece, the draft's figures for an edit.
  useEffect(() => {
    if (!open) return;
    const d = initial;
    const src = d ?? lastSource;
    setSupplierId(src ? String(src.supplierId) : '');
    setBillNo(src?.billNo ?? '');
    setBillDate(src?.billDate ?? defaultBillDate);
    setSupplierPaid(src?.supplierPaid ?? true);
    setName(d?.name ?? '');
    setCategory(d?.category ?? 'rings');
    setPurity(d?.purity ?? '925');
    setWeight(str(d?.silverWeightGrams));
    setRate(d ? String(d.ratePerGram) : todayRate ? String(todayRate) : '');
    setMaking(str(d?.makingCharge));
    setStoneWeight(str(d?.stoneWeightGrams));
    setStonePrice(str(d?.stonePrice));
    setTotal(str(d?.totalAmount));
    setNewSupplier('');
    setAddingSupplier(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Opened from a line lower down the page: bring it into view.
  useEffect(() => {
    if (open) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [open, initial]);

  if (!open) return null;

  const draft: PieceDraft = {
    key: initial?.key ?? Date.now(),
    supplierId: Number(supplierId),
    supplierName: suppliers.find((s) => String(s.id) === supplierId)?.name ?? '',
    billNo: billNo.trim(),
    billDate,
    supplierPaid,
    name: name.trim(),
    category,
    purity: purity.trim(),
    silverWeightGrams: n(weight),
    ratePerGram: n(rate),
    makingCharge: n(making),
    stoneWeightGrams: n(stoneWeight) || null,
    stonePrice: n(stonePrice) || null,
    totalAmount: round2(n(total)),
    // Never below zero: the piece's own margin cannot be negative. A sale below
    // today's price still goes through at the typed total.
    profitAmount: Math.max(0, round2(n(total) - basePrice(n(weight), n(making), n(stonePrice), todayRate))),
  };
  const cost = draftCost(draft);
  const profit = round2(draft.totalAmount - cost);

  const addSupplier = async () => {
    if (newSupplier.trim() === '') return setError('Type the supplier’s name.');
    setBusy(true);
    try {
      const s = await apiPost('/suppliers', { name: newSupplier.trim() });
      onSupplierAdded({ id: s.id, name: s.name });
      setSupplierId(String(s.id));
      setAddingSupplier(false);
      setNewSupplier('');
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the supplier.');
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!supplierId) return setError('Choose where it came from.');
    if (draft.name === '') return setError('Give the piece a name.');
    if (draft.silverWeightGrams <= 0) return setError('Enter the silver weight.');
    if (draft.ratePerGram <= 0) return setError('Enter the silver rate you paid.');
    if (draft.totalAmount <= 0) return setError('Enter the total amount it sells for.');
    onSave(draft);
  };

  return (
    // Opens in place inside the sale, not over it. It sits inside the sale's own
    // <form>, so it is a plain div, and Enter here must not issue the invoice.
    <div
      ref={panelRef}
      role="region"
      aria-label={initial ? 'Edit piece' : 'Create jewellery'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
          save();
        }
      }}
      className="scroll-mt-20 border-t border-neutral-200 bg-neutral-50/60"
    >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4">
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-900">{initial ? 'Edit piece' : 'Create jewellery'}</h3>
            <p className="text-xs text-neutral-500">Saved with the sale, with its cost and where it came from.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-md text-neutral-500 hover:bg-neutral-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 space-y-6">
          {error && <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Where it came from</h3>
            {addingSupplier ? (
              <div>
                <span className="text-sm text-neutral-600">New supplier</span>
                <div className="flex gap-2">
                  <input value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="Supplier name" className={INPUT} autoFocus />
                  <button type="button" onClick={addSupplier} disabled={busy} className="mt-1 px-4 rounded-lg bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap">
                    Add
                  </button>
                </div>
                <button type="button" onClick={() => setAddingSupplier(false)} className="mt-2 text-sm text-neutral-500 underline underline-offset-2">
                  Choose an existing one
                </button>
              </div>
            ) : (
              <label className="block">
                <span className="text-sm text-neutral-600">Supplier</span>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={INPUT}>
                  <option value="">Choose…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={() => setAddingSupplier(true)} className="mt-2 text-sm text-neutral-700 underline underline-offset-2">
                  + New supplier
                </button>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className="text-sm text-neutral-600">Bill number</span>
                <input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="If you have it" className={`${INPUT} font-mono`} />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Bill date</span>
                <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className={INPUT} />
              </label>
            </div>
            <p className="text-xs text-neutral-400 mt-1.5">
              Same supplier and bill number as an earlier piece? It is added to that bill, not entered twice.
            </p>
            <label className="flex items-start gap-2.5 text-sm text-neutral-700 mt-3">
              <input type="checkbox" checked={supplierPaid} onChange={(e) => setSupplierPaid(e.target.checked)} className="mt-0.5 w-4 h-4" />
              <span>Supplier already paid for this</span>
            </label>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">The piece</h3>
            <label className="block">
              <span className="text-sm text-neutral-600">Product name</span>
              <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Infinite Silver Bracelet" className={INPUT} />
            </label>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className="text-sm text-neutral-600">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${INPUT} capitalize`}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Purity</span>
                <input value={purity} onChange={(e) => setPurity(e.target.value)} className={NUM} />
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">What you paid</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-neutral-600">Silver weight (g)</span>
                <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={NUM} />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Silver rate paid (/g)</span>
                <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={NUM} />
              </label>
              <label className="block col-span-2">
                <span className="text-sm text-neutral-600">Making charge</span>
                <input inputMode="decimal" value={making} onChange={(e) => setMaking(e.target.value)} className={NUM} />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Stone weight (g)</span>
                <input inputMode="decimal" value={stoneWeight} onChange={(e) => setStoneWeight(e.target.value)} className={NUM} />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Stone cost</span>
                <input inputMode="decimal" value={stonePrice} onChange={(e) => setStonePrice(e.target.value)} className={NUM} />
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">What you sell it for</h3>
            <label className="block">
              <span className="text-sm text-neutral-600">Total amount</span>
              <input inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="What the buyer pays" className={`${NUM} text-lg sm:text-base font-semibold`} />
            </label>
          </section>

          <section className="rounded-xl bg-neutral-50 px-4 py-3 text-sm space-y-1.5">
            <div className="flex justify-between gap-3">
              <span className="text-neutral-600">Cost</span>
              <span className="font-mono tabular-nums font-semibold">{money(draftCost(draft))}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-neutral-600">Total amount</span>
              <span className="font-mono tabular-nums font-semibold">{money(draft.totalAmount)}</span>
            </div>
            <div className="flex justify-between gap-3 pt-1.5 border-t border-neutral-200">
              <span className="font-medium text-neutral-900">Your profit</span>
              <span className={`font-mono tabular-nums font-semibold ${profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {draft.totalAmount > 0 ? money(profit) : '—'}
              </span>
            </div>
            {draft.totalAmount > 0 && profit < 0 && (
              <p className="text-xs text-red-700">This is less than you paid for it.</p>
            )}
            <p className="text-xs text-neutral-400">Total amount minus what you paid.</p>
          </section>
        </div>

        <div className="px-4 sm:px-5 pb-4 flex gap-3">
          <button type="button" onClick={onClose} className="px-5 py-3.5 sm:py-2.5 rounded-xl sm:rounded-lg border border-neutral-200 bg-white text-[15px] sm:text-sm font-medium">
            Cancel
          </button>
          <button type="button" onClick={save} className="flex-1 px-4 py-3.5 sm:py-2.5 rounded-xl sm:rounded-lg bg-neutral-900 text-white text-[15px] sm:text-sm font-semibold">
            {initial ? 'Save piece' : 'Add to sale'}
          </button>
        </div>
    </div>
  );
}
