import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';

interface Piece {
  id: number;
  name: string;
  category: string;
  silverWeightGrams: number;
  price: number;
  status: string;
}

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'esewa_qr', label: 'eSewa' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];

const num = (v: number) => Math.round(v).toLocaleString();

export function CounterSale() {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Piece[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('cash');
  const [payNow, setPayNow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/jewelries?status=available&pageSize=200')
      .then((res: { data: Piece[] }) => setPieces(res.data))
      .catch(() => setPieces([]));
  }, []);

  const available = pieces.filter(
    (p) => !picked.some((s) => s.id === p.id) && p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const total = picked.reduce((sum, p) => sum + p.price, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (picked.length === 0) {
      setError('Add at least one piece to the sale.');
      return;
    }
    if (name.trim() === '') {
      setError('Enter the buyer’s name.');
      return;
    }

    setSaving(true);
    try {
      const invoice = await apiPost('/invoices', {
        customer: { name: name.trim(), phone: phone.trim() || null },
        paymentMethod: method,
        items: picked.map((p) => ({ jewelryId: p.id })),
      });

      // Cash in hand is recorded straight away; anything else is confirmed
      // later against a statement, so it is left off rather than assumed.
      if (payNow) {
        await apiPost('/payments', { invoiceId: invoice.id, amount: invoice.totalAmount, method });
      }

      navigate(`/admin/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the sale.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-[1100px] pb-28 md:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-neutral-500">Invoices / New sale</div>
          <h1 className="text-3xl font-semibold tracking-tight">Counter sale</h1>
        </div>
        <div className="hidden md:flex gap-2">
          <button type="button" onClick={() => navigate('/admin/invoices')} className="px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Issue invoice'}
          </button>
        </div>
      </header>

      {error && <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-neutral-200 rounded-xl">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-4">
              <h2 className="text-[15px] font-semibold">Pieces</h2>
              <span className="font-mono tabular-nums text-sm text-neutral-500">{picked.length} on this sale</span>
            </div>

            {picked.length > 0 && (
              <ul className="divide-y divide-neutral-100">
                {picked.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <div className="text-[15px] text-neutral-900 truncate">{p.name}</div>
                      <div className="text-xs text-neutral-500 capitalize">{p.category} · {p.silverWeightGrams} g</div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono tabular-nums text-[15px]">{num(p.price)}</span>
                      <button type="button" onClick={() => setPicked(picked.filter((x) => x.id !== p.id))} className="text-sm text-neutral-500 underline underline-offset-2">
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="px-5 py-4 border-t border-neutral-100">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search available pieces"
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm"
              />
              <div className="mt-3 max-h-64 overflow-y-auto divide-y divide-neutral-100">
                {available.length === 0 ? (
                  <div className="py-6 text-sm text-neutral-400 text-center">Nothing available to add.</div>
                ) : (
                  available.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPicked([...picked, p])}
                      className="w-full flex items-center justify-between gap-4 py-2.5 text-left hover:bg-neutral-50"
                    >
                      <span className="text-sm text-neutral-800 truncate">{p.name}</span>
                      <span className="font-mono tabular-nums text-sm text-neutral-600">{num(p.price)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
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
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-neutral-200 rounded-xl">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-[15px] font-semibold">Total</h2>
            </div>
            <div className="px-5 py-5">
              <div className="font-mono tabular-nums text-4xl font-semibold tracking-tight">{num(total)}</div>
              <div className="text-sm text-neutral-500 mt-1">
                {picked.length} piece{picked.length === 1 ? '' : 's'} · VAT 0
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-[15px] font-semibold">Payment</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
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

      <div className="md:hidden fixed inset-x-0 bottom-0 p-4 bg-neutral-50/95 backdrop-blur border-t border-neutral-200 flex gap-3">
        <button type="button" onClick={() => navigate('/admin/invoices')} className="px-5 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] font-medium">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-3.5 rounded-xl bg-neutral-900 text-white text-[15px] font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : `Issue invoice · ${num(total)}`}
        </button>
      </div>
    </form>
  );
}
