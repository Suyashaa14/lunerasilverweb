import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { BUTTON, Card, CardHead, ErrorNote } from '../../components/admin/ui';
import { money } from '../../components/admin/format';

interface Supplier { id: number; name: string }

interface Line {
  key: number;
  description: string;
  unitCost: string;
  vatAmount: string;
  /** Book this line into stock as a sellable piece. */
  stockIn: boolean;
  name: string;
  category: string;
  sku: string;
  purity: string;
  silverWeightGrams: string;
  makingCharge: string;
  stonePrice: string;
}

const emptyLine = (key: number): Line => ({
  key, description: '', unitCost: '', vatAmount: '',
  stockIn: true, name: '', category: 'rings', sku: '', purity: '925',
  silverWeightGrams: '', makingCharge: '', stonePrice: '',
});

const CATEGORIES = ['rings', 'necklaces', 'earrings', 'bangles', 'pendants', 'other'];
const n = (v: string) => (v.trim() === '' ? 0 : Number(v));

export function PurchaseForm() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [tds, setTds] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/suppliers').then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const set = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const goods = lines.reduce((s, l) => s + n(l.unitCost), 0);
  const vat = lines.reduce((s, l) => s + n(l.vatAmount), 0);
  const total = goods + vat - n(tds);
  const stockCount = lines.filter((l) => l.stockIn).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) return setError('Choose a supplier.');
    if (billNo.trim() === '') return setError('Enter the bill number from the supplier’s invoice.');

    for (const l of lines) {
      if (l.description.trim() === '') return setError('Every line needs a description.');
      if (n(l.unitCost) <= 0) return setError(`"${l.description}" needs a cost.`);
      if (l.stockIn) {
        if (l.name.trim() === '') return setError(`"${l.description}" is going into stock, so it needs a piece name.`);
        if (n(l.silverWeightGrams) <= 0) return setError(`"${l.name}" needs a silver weight.`);
      }
    }

    setSaving(true);
    try {
      const purchase = await apiPost('/purchases', {
        supplierId: Number(supplierId),
        billNo: billNo.trim(),
        billDate,
        tdsAmount: n(tds) || undefined,
        notes: notes.trim() || null,
        items: lines.map((l) => ({
          description: l.description.trim(),
          unitCost: n(l.unitCost),
          vatAmount: n(l.vatAmount) || undefined,
          ...(l.stockIn
            ? {
                stockIn: {
                  name: l.name.trim(),
                  category: l.category,
                  sku: l.sku.trim() || undefined,
                  purity: l.purity.trim() || undefined,
                  silverWeightGrams: n(l.silverWeightGrams),
                  makingCharge: n(l.makingCharge),
                  stonePrice: n(l.stonePrice) || null,
                },
              }
            : {}),
        })),
      });
      navigate(`/admin/purchases/${purchase.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this bill.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-[1200px] pb-28 md:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-neutral-500">Purchases / New bill</div>
          <h1 className="text-3xl font-semibold tracking-tight">Enter a supplier bill</h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            Each line can become a piece in stock, carrying what you paid for it. That cost is what every margin is measured against.
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <button type="button" onClick={() => navigate('/admin/purchases')} className={BUTTON.secondary}>Cancel</button>
          <button type="submit" disabled={saving} className={BUTTON.primary}>{saving ? 'Saving…' : 'Save bill'}</button>
        </div>
      </header>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHead title="The bill" />
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block sm:col-span-1">
                <span className="text-sm text-neutral-600">Supplier</span>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm bg-white">
                  <option value="">Choose…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {suppliers.length === 0 && (
                  <span className="text-xs text-red-600 mt-1 block">No suppliers yet — add one first.</span>
                )}
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Bill number</span>
                <input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="BILL-2082-0117"
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                <span className="text-xs text-neutral-400 mt-1 block">The same bill cannot be entered twice.</span>
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Bill date</span>
                <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
              </label>
            </div>
          </Card>

          {lines.map((l, index) => (
            <Card key={l.key}>
              <CardHead
                title={`Line ${index + 1}`}
                right={lines.length > 1 ? (
                  <button type="button" onClick={() => setLines(lines.filter((x) => x.key !== l.key))}
                    className="text-sm text-neutral-500 underline underline-offset-2">Remove</button>
                ) : undefined}
              />
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="block sm:col-span-1">
                    <span className="text-sm text-neutral-600">What it is</span>
                    <input value={l.description} onChange={(e) => set(l.key, { description: e.target.value })}
                      placeholder="Moon Ring" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-sm text-neutral-600">Cost</span>
                    <input type="number" step="0.01" value={l.unitCost} onChange={(e) => set(l.key, { unitCost: e.target.value })}
                      className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                  </label>
                  <label className="block">
                    <span className="text-sm text-neutral-600">VAT on this line</span>
                    <input type="number" step="0.01" value={l.vatAmount} onChange={(e) => set(l.key, { vatAmount: e.target.value })}
                      className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                    <span className="text-xs text-neutral-400 mt-1 block">You are not VAT-registered, so this is added to the cost.</span>
                  </label>
                </div>

                <label className="flex items-start gap-2.5 text-sm text-neutral-700 pt-1">
                  <input type="checkbox" checked={l.stockIn} onChange={(e) => set(l.key, { stockIn: e.target.checked })} className="mt-0.5" />
                  <span>
                    Put this on the shelf as a piece
                    <span className="block text-xs text-neutral-400">
                      Untick for something that is not stock — packaging, freight, tools.
                    </span>
                  </span>
                </label>

                {l.stockIn && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-neutral-100">
                    <label className="block pt-4">
                      <span className="text-sm text-neutral-600">Piece name</span>
                      <input value={l.name} onChange={(e) => set(l.key, { name: e.target.value })}
                        className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
                    </label>
                    <label className="block sm:pt-4">
                      <span className="text-sm text-neutral-600">Category</span>
                      <select value={l.category} onChange={(e) => set(l.key, { category: e.target.value })}
                        className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm bg-white capitalize">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="block sm:pt-4">
                      <span className="text-sm text-neutral-600">SKU</span>
                      <input value={l.sku} onChange={(e) => set(l.key, { sku: e.target.value })} placeholder="auto"
                        className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                    </label>
                    <label className="block">
                      <span className="text-sm text-neutral-600">Silver weight (g)</span>
                      <input type="number" step="0.001" value={l.silverWeightGrams} onChange={(e) => set(l.key, { silverWeightGrams: e.target.value })}
                        className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                    </label>
                    <label className="block">
                      <span className="text-sm text-neutral-600">Making charge</span>
                      <input type="number" step="0.01" value={l.makingCharge} onChange={(e) => set(l.key, { makingCharge: e.target.value })}
                        className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                      <span className="text-xs text-neutral-400 mt-1 block">Your margin when it sells.</span>
                    </label>
                    <label className="block">
                      <span className="text-sm text-neutral-600">Stone price</span>
                      <input type="number" step="0.01" value={l.stonePrice} onChange={(e) => set(l.key, { stonePrice: e.target.value })}
                        className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm font-mono" />
                    </label>
                  </div>
                )}
              </div>
            </Card>
          ))}

          <button type="button" onClick={() => setLines([...lines, emptyLine(Date.now())])} className={BUTTON.secondary}>
            Add another line
          </button>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHead title="Bill total" />
            <div className="px-5 py-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Goods</span><span className="font-mono tabular-nums">{money(goods)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">VAT</span><span className="font-mono tabular-nums">{money(vat)}</span></div>
              <label className="flex items-center justify-between gap-3">
                <span className="text-neutral-500">TDS withheld</span>
                <input type="number" step="0.01" value={tds} onChange={(e) => setTds(e.target.value)}
                  className="w-28 px-2 py-1.5 rounded-lg border border-neutral-200 text-sm font-mono text-right" />
              </label>
              <div className="flex justify-between pt-2 border-t border-neutral-100 text-base font-semibold">
                <span>You owe</span><span className="font-mono tabular-nums">{money(total)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead title="On save" />
            <p className="px-5 py-4 text-sm text-neutral-600">
              {stockCount === 0
                ? 'No lines are going into stock, so this bill records the spend only.'
                : `${stockCount} piece${stockCount === 1 ? '' : 's'} will appear in Jewellery, each carrying what you paid for it, with a stock-in row on its ledger.`}
            </p>
          </Card>

          <Card>
            <CardHead title="Note" />
            <div className="px-5 py-4">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" placeholder="Optional" />
            </div>
          </Card>
        </div>
      </div>

      <div className="md:hidden fixed inset-x-0 bottom-0 p-4 bg-neutral-50/95 backdrop-blur border-t border-neutral-200 flex gap-3">
        <button type="button" onClick={() => navigate('/admin/purchases')} className={BUTTON.secondary}>Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-3.5 rounded-xl bg-neutral-900 text-white text-[15px] font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : `Save bill · ${money(total)}`}
        </button>
      </div>
    </form>
  );
}
