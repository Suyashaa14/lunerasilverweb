import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { money } from '../../components/admin/format';
import { NewPieceSheet, draftCost, type PieceDraft, type Supplier } from '../../components/admin/NewPieceSheet';

interface Piece {
  id: number;
  name: string;
  category: string;
  silverWeightGrams: number;
  price: number;
  status: string;
}

/**
 * One line on the sale: a piece already on the shelf, or one typed in here
 * with where it came from. A typed-in piece gets its id once its bill is saved;
 * kept on the line so a retry after a failed sale does not enter it twice.
 */
interface SaleLine {
  key: number;
  piece?: Piece;
  draft?: PieceDraft;
  createdId?: number;
  /** What it is being sold for, as typed. */
  price: string;
  /** The price it would carry untouched. A change from this is sent as the
      price actually charged -- an old sale at an old rate, a bargain. */
  basePrice: number;
}

const todayLocal = () => {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'esewa_qr', label: 'eSewa' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];


/**
 * The counter discounts a bill as a whole ("call it 500 off"), but an invoice
 * stores a discount against each line. The figure is split across the pieces in
 * proportion to their price, and the last piece absorbs the rounding drift, so
 * the parts always add back up to exactly what was typed.
 */
const splitDiscount = (prices: number[], discount: number): number[] => {
  const total = prices.reduce((a, b) => a + b, 0);
  if (discount <= 0 || total <= 0) return prices.map(() => 0);

  const shares = prices.map((p) => Math.round((p / total) * discount * 100) / 100);
  const drift = Math.round((discount - shares.reduce((a, b) => a + b, 0)) * 100) / 100;
  shares[shares.length - 1] = Math.round((shares[shares.length - 1] + drift) * 100) / 100;
  return shares;
};

/**
 * The sale itself. Rendered full-page at /admin/invoices/new (the phone's Sell
 * tab lands here) and inside a modal on the sales list, so the shop floor can
 * record a sale without leaving the list it was reading.
 */
export function CounterSaleForm({
  mode = 'page',
  onIssued,
  onCancel,
}: {
  mode?: 'page' | 'modal';
  onIssued: (invoiceId: number) => void;
  onCancel: () => void;
}) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [todayRate, setTodayRate] = useState(0);
  const [saleDate, setSaleDate] = useState(todayLocal());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PieceDraft | null>(null);
  const [lastSource, setLastSource] = useState<Pick<PieceDraft, 'supplierId' | 'billNo' | 'billDate' | 'supplierPaid'> | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [discount, setDiscount] = useState('');
  const [method, setMethod] = useState('cash');
  const [payNow, setPayNow] = useState(true);
  const [skillPromoRate, setSkillPromoRate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/jewelries?status=available&pageSize=200')
      .then((res: { data: Piece[] }) => setPieces(res.data))
      .catch(() => setPieces([]));

    // The server prices the invoice; this is only so the counter sees the same
    // figure it is about to issue. A failed read shows no levy rather than a
    // guessed one.
    apiGet('/settings')
      .then((res: { skillPromoRate?: number; silverRatePerGram?: number }) => {
        setSkillPromoRate(Number(res?.skillPromoRate ?? 0));
        setTodayRate(Number(res?.silverRatePerGram ?? 0));
      })
      .catch(() => setSkillPromoRate(0));

    apiGet('/suppliers').then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const available = pieces.filter(
    (p) => !lines.some((l) => l.piece?.id === p.id) && p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const linePrice = (l: SaleLine) => Math.max(0, Number(l.price) || 0);
  const subtotal = lines.reduce((sum, l) => sum + linePrice(l), 0);
  const newCount = lines.filter((l) => l.draft).length;

  const addPiece = (p: Piece) =>
    setLines([...lines, { key: p.id, piece: p, price: String(p.price), basePrice: p.price }]);

  const openNew = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (d: PieceDraft) => { setEditing(d); setSheetOpen(true); };

  const saveDraft = (d: PieceDraft) => {
    const base = d.totalAmount;
    setLines((ls) => {
      const existing = ls.find((l) => l.draft?.key === d.key);
      if (!existing) return [...ls, { key: d.key, draft: d, price: String(base), basePrice: base }];
      // Keep a price typed by hand; otherwise follow the new figures.
      const edited = Number(existing.price) !== existing.basePrice;
      return ls.map((l) => (l.key === existing.key ? { ...l, draft: d, basePrice: base, price: edited ? l.price : String(base) } : l));
    });
    setLastSource({ supplierId: d.supplierId, billNo: d.billNo, billDate: d.billDate, supplierPaid: d.supplierPaid });
    setSheetOpen(false);
  };

  /**
   * Puts the typed-in pieces on the shelf through their supplier bills, one bill
   * per supplier and bill number, and returns each line's piece id. A bill
   * already entered gets the new pieces added to it.
   */
  const createNewPieces = async (current: SaleLine[]): Promise<SaleLine[]> => {
    const pending = current.filter((l) => l.draft && !l.createdId);
    const groups = new Map<string, SaleLine[]>();
    for (const l of pending) {
      const d = l.draft!;
      const k = `${d.supplierId}|${d.billNo}|${d.billNo ? '' : d.billDate}`;
      groups.set(k, [...(groups.get(k) ?? []), l]);
    }

    let next = current;
    for (const group of groups.values()) {
      const first = group[0].draft!;
      // No paper bill: a number is made up so the piece still has a source.
      const billNo = first.billNo || `NB-${first.billDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const bill = await apiPost('/purchases', {
        supplierId: first.supplierId,
        billNo,
        billDate: first.billDate,
        addToExisting: true,
        paymentStatus: first.supplierPaid ? 'paid' : 'unpaid',
        notes: 'Entered at the till with a sale',
        items: group.map(({ draft: d }) => ({
          description: d!.name,
          stockIn: {
            name: d!.name,
            category: d!.category,
            purity: d!.purity || undefined,
            silverWeightGrams: d!.silverWeightGrams,
            ratePerGram: d!.ratePerGram,
            makingCharge: d!.makingCharge,
            stoneWeightGrams: d!.stoneWeightGrams,
            stonePrice: d!.stonePrice,
            profitAmount: d!.profitAmount,
          },
        })),
      });
      // The pieces just added are the bill's last lines, in the order sent.
      const ids: number[] = bill.items.slice(-group.length).map((i: { jewelryId: number }) => i.jewelryId);
      next = next.map((l) => {
        const at = group.findIndex((g) => g.key === l.key);
        return at === -1 ? l : { ...l, createdId: ids[at] };
      });
      setLines(next);
    }
    return next;
  };
  const discountValue = Math.max(0, Number(discount) || 0);
  const goods = Math.max(0, subtotal - discountValue);
  // Charged on the goods after the discount, matching how the invoice does it.
  const skillPromo = Math.round(goods * skillPromoRate) / 100;
  const total = Math.round((goods + skillPromo) * 100) / 100;
  const isModal = mode === 'modal';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lines.length === 0) {
      setError('Add at least one piece to the sale.');
      return;
    }
    if (name.trim() === '') {
      setError('Enter the buyer’s name.');
      return;
    }
    if (discountValue > subtotal) {
      setError('The discount is larger than the sale.');
      return;
    }

    setSaving(true);
    try {
      const ready = await createNewPieces(lines);
      const shares = splitDiscount(ready.map(linePrice), discountValue);

      const invoice = await apiPost('/invoices', {
        ...(saleDate !== todayLocal() ? { issuedAt: saleDate } : {}),
        customer: {
          name: name.trim(),
          phone: phone.trim() || null,
          addressLine: address.trim() || null,
        },
        paymentMethod: method,
        items: ready.map((l, i) => ({
          jewelryId: l.piece?.id ?? l.createdId,
          // A new piece always goes at the total typed for it; an existing one
          // only when its price was changed here.
          ...(l.draft || linePrice(l) !== l.basePrice ? { unitPrice: linePrice(l) } : {}),
          discount: shares[i],
        })),
      });

      // Cash in hand is recorded straight away; anything else is confirmed
      // later against a statement, so it is left off rather than assumed.
      if (payNow) {
        await apiPost('/payments', { invoiceId: invoice.id, amount: invoice.totalAmount, method });
      }

      onIssued(invoice.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the sale.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={isModal ? '' : 'max-w-[1100px] pb-28 md:pb-0'}>
      {!isModal && (
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-sm text-neutral-500">Sales / New sale</div>
            <h1 className="text-3xl font-semibold tracking-tight">Counter sale</h1>
          </div>
          <div className="hidden md:flex gap-2">
            <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Issue invoice'}
            </button>
          </div>
        </header>
      )}

      <div className={isModal ? 'px-5 sm:px-6 pt-5' : ''}>
        {error && <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-neutral-200 rounded-xl">
              <div className="px-4 sm:px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-4">
                <h2 className="text-[15px] font-semibold">Pieces</h2>
                <span className="font-mono tabular-nums text-sm text-neutral-500">{lines.length} on this sale</span>
              </div>

              {lines.length > 0 && (
                <ul className="divide-y divide-neutral-100">
                  {lines.map((l) => {
                    const title = l.piece?.name ?? l.draft!.name;
                    const meta = l.piece
                      ? `${l.piece.category} · ${l.piece.silverWeightGrams} g`
                      : `${l.draft!.category} · ${l.draft!.silverWeightGrams} g · cost ${money(draftCost(l.draft!))}`;
                    return (
                      <li key={l.key} className="px-4 sm:px-5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[15px] text-neutral-900 truncate">{title}</span>
                              {l.draft && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium">New</span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500 capitalize truncate">{meta}</div>
                            {l.draft && (
                              <div className="text-xs text-neutral-500 truncate">
                                From {l.draft.supplierName}{l.draft.billNo ? `, bill ${l.draft.billNo}` : ', no bill number'}
                              </div>
                            )}
                          </div>
                          <label className="shrink-0 text-right">
                            <span className="sr-only">Price for {title}</span>
                            <input
                              inputMode="decimal"
                              value={l.price}
                              onChange={(e) => {
                                const price = e.target.value.replace(/[^\d.]/g, '');
                                setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, price } : x)));
                              }}
                              className="w-28 px-2.5 py-2 rounded-lg border border-neutral-200 text-base sm:text-sm text-right font-mono tabular-nums"
                            />
                            {linePrice(l) !== l.basePrice && (
                              <span className="block text-[11px] text-amber-700 mt-0.5">was {money(l.basePrice)}</span>
                            )}
                          </label>
                        </div>
                        <div className="flex gap-4 mt-1.5">
                          {l.draft && !l.createdId && (
                            <button type="button" onClick={() => openEdit(l.draft!)} className="text-sm text-neutral-600 underline underline-offset-2">
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setLines(lines.filter((x) => x.key !== l.key))}
                            disabled={Boolean(l.createdId)}
                            className="text-sm text-neutral-500 underline underline-offset-2 disabled:no-underline disabled:text-neutral-300"
                          >
                            {l.createdId ? 'In stock now' : 'Remove'}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="px-4 sm:px-5 py-4 border-t border-neutral-100">
                <div className="flex gap-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search available pieces"
                    className="min-w-0 flex-1 px-3 py-2.5 rounded-lg border border-neutral-200 text-base sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => (sheetOpen && !editing ? setSheetOpen(false) : openNew())}
                    aria-expanded={sheetOpen}
                    className={`shrink-0 whitespace-nowrap px-3.5 py-2.5 rounded-lg border border-neutral-900 text-sm font-semibold ${
                      sheetOpen && !editing ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'
                    }`}
                  >
                    {sheetOpen && !editing ? 'Close' : '+ Create jewellery'}
                  </button>
                </div>
              </div>

              <NewPieceSheet
                open={sheetOpen}
                initial={editing}
                suppliers={suppliers}
                onSupplierAdded={(sup) => setSuppliers((ss) => [...ss, sup])}
                todayRate={todayRate}
                defaultBillDate={saleDate}
                lastSource={lastSource}
                onSave={saveDraft}
                onClose={() => setSheetOpen(false)}
              />

              {!sheetOpen && (
              <div className="px-4 sm:px-5 pb-4">
                <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100">
                  {available.length === 0 ? (
                    <div className="py-6 text-sm text-neutral-400 text-center">
                      {search ? 'Nothing matches.' : 'Nothing available to add.'}{' '}
                      <button type="button" onClick={openNew} className="text-neutral-700 underline underline-offset-2">Create it</button>
                    </div>
                  ) : (
                    available.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addPiece(p)}
                        className="w-full flex items-center justify-between gap-4 py-3 sm:py-2.5 text-left hover:bg-neutral-50"
                      >
                        <span className="text-sm text-neutral-800 truncate">{p.name}</span>
                        <span className="font-mono tabular-nums text-sm text-neutral-600">{money(p.price)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
              )}
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="text-[15px] font-semibold">Buyer</h2>
              </div>
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-neutral-600">Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm text-neutral-600">Phone</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
                  <span className="text-xs text-neutral-400 mt-1 block">A returning buyer is matched on this, so they are not entered twice.</span>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm text-neutral-600">Address</span>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Tole, ward, city" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
                  <span className="text-xs text-neutral-400 mt-1 block">Printed on the invoice as the buyer’s address.</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white border border-neutral-200 rounded-xl">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="text-[15px] font-semibold">Total</h2>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3 text-sm py-1">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-mono tabular-nums text-neutral-900">{money(subtotal)}</span>
                </div>
                <label className="flex items-center justify-between gap-3 text-sm py-1">
                  <span className="text-neutral-600">Discount</span>
                  <input
                    inputMode="decimal"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0"
                    className="w-28 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-right font-mono tabular-nums"
                  />
                </label>
                {skillPromoRate > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm py-1">
                    <span className="text-neutral-600">Skill promotional ({skillPromoRate}%)</span>
                    <span className="font-mono tabular-nums text-neutral-900">{money(skillPromo)}</span>
                  </div>
                )}
                <div className="mt-3 pt-4 border-t border-neutral-100">
                  <div className="font-mono tabular-nums text-4xl font-semibold tracking-tight">{money(total)}</div>
                  <div className="text-sm text-neutral-500 mt-1">
                    {lines.length} piece{lines.length === 1 ? '' : 's'}
                    {newCount > 0 && <> · {newCount} new to stock</>}
                    {discountValue > 0 && <> · {money(discountValue)} off</>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="text-[15px] font-semibold">Payment</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <label className="block">
                  <span className="text-sm text-neutral-600">Sale date</span>
                  <input type="date" value={saleDate} max={todayLocal()} onChange={(e) => setSaleDate(e.target.value || todayLocal())}
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-base sm:text-sm bg-white" />
                  {saleDate !== todayLocal() && (
                    <span className="text-xs text-amber-700 mt-1 block">Logging an earlier sale. Check each price is what you charged then.</span>
                  )}
                </label>
                <label className="block">
                  <span className="text-sm text-neutral-600">Method</span>
                  <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm bg-white">
                    {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </label>
                <label className="flex items-start gap-2.5 text-sm text-neutral-700">
                  <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} className="mt-0.5" />
                  <span>
                    Paid in full now
                    <span className="block text-xs text-neutral-400">
                      Leave unticked to issue the invoice and record the money later.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModal ? (
        // Stays on screen while the piece list scrolls above it.
        <div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-neutral-200 bg-white/95 backdrop-blur">
          <div className="text-sm text-neutral-500">
            {lines.length} piece{lines.length === 1 ? '' : 's'} · <span className="font-mono tabular-nums text-neutral-900 font-semibold">{money(total)}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Issue invoice'}
            </button>
          </div>
        </div>
      ) : (
        <div className="md:hidden admin-phone-actions fixed inset-x-0 bottom-0 p-4 bg-neutral-50/95 backdrop-blur border-t border-neutral-200 flex gap-3 z-30">
          <button type="button" onClick={onCancel} className="px-5 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 px-4 py-3.5 rounded-xl bg-neutral-900 text-white text-[15px] font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : `Issue invoice · ${money(total)}`}
          </button>
        </div>
      )}

    </form>
  );
}

/** The full-page route, kept for the phone's Sell tab and for bookmarks. */
export function CounterSale() {
  const navigate = useNavigate();
  return (
    <CounterSaleForm
      onIssued={(id) => navigate(`/admin/invoices/${id}`)}
      onCancel={() => navigate('/admin/invoices')}
    />
  );
}
