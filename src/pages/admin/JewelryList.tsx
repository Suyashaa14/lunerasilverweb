import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';

interface Piece {
  id: number; sku: string; name: string; category: string; status: string;
  silverWeightGrams: number; makingCharge: number; costPrice: number | null;
  priceToday: number | null; daysInStock: number | null; isStale: boolean;
  soldAt: string | null; imageUrl: string | null;
}
interface Catalogue {
  data: Piece[];
  totals: { pieces: number; silverGrams: number; costTotal: number };
  categories: string[];
  silverRatePerGram: number;
  staleDays: number;
}

const num = (v: number) => Math.round(v).toLocaleString();
const grams = (v: number) => v.toFixed(3);

const STATUS: Record<string, string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  reserved: 'border-amber-200 bg-amber-50 text-amber-700',
  sold: 'border-neutral-200 text-neutral-500',
  damaged: 'border-red-200 bg-red-50 text-red-700',
  lost: 'border-red-200 bg-red-50 text-red-700',
  voided: 'border-neutral-200 text-neutral-400',
};

export function JewelryList() {
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [stale, setStale] = useState(false);
  const [noCost, setNoCost] = useState(false);

  const load = () => {
    const p = new URLSearchParams({ pageSize: '100' });
    if (search.trim()) p.set('search', search.trim());
    if (category) p.set('category', category);
    if (status) p.set('status', status);
    if (stale) p.set('stale', 'true');
    if (noCost) p.set('noCost', 'true');
    apiGet(`/jewelries/catalogue?${p}`).then(setCat).catch(() => setCat(null));
  };

  useEffect(load, [search, category, status, stale, noCost]);

  const retire = async (id: number) => {
    const choice = prompt('Take this piece off the shelf.\n\nType one of:\n  damaged\n  lost\n  voided  (entered by mistake)');
    if (choice === null) return;
    const s = choice.trim().toLowerCase();
    if (!['damaged', 'lost', 'voided'].includes(s)) { alert('Type damaged, lost or voided.'); return; }
    const reason = prompt('Why? Kept in the stock history.');
    if (reason === null || reason.trim() === '') return;
    try { await apiPost(`/jewelries/${id}/retire`, { status: s, reason: reason.trim() }); load(); }
    catch (err) { alert(err instanceof ApiError ? err.message : 'Could not retire this piece.'); }
  };

  if (!cat) return <div className="text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-[1400px]">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Jewellery</h1>
          <p className="text-sm text-neutral-500 mt-1.5 font-mono tabular-nums">
            {cat.totals.pieces} pieces · {grams(cat.totals.silverGrams)} g silver · Rs {num(cat.totals.costTotal)} at cost
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm">
            <span className="text-neutral-500">Silver rate today </span>
            <strong className="font-mono tabular-nums">{cat.silverRatePerGram.toFixed(2)}</strong>
            <span className="text-neutral-400"> /g</span>
          </div>
          <Link to="/admin/jewelries/new" className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold">New piece</Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU or name"
          className="flex-1 min-w-[200px] px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm">
          <option value="">All categories</option>
          {cat.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm">
          <option value="">Any status</option>
          {['available', 'reserved', 'sold', 'damaged', 'lost', 'voided'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setStale(!stale)} className={`px-4 py-2.5 rounded-lg border text-sm ${stale ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}>
          Unsold {cat.staleDays}+ days
        </button>
        <button onClick={() => setNoCost(!noCost)} className={`px-4 py-2.5 rounded-lg border text-sm ${noCost ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}>
          No cost price
        </button>
        <span className="ml-auto text-sm text-neutral-500">Showing {cat.data.length} of {cat.totals.pieces}</span>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
              <th className="text-left font-medium px-5 py-3">SKU</th>
              <th className="text-left font-medium px-5 py-3">Name</th>
              <th className="text-left font-medium px-5 py-3">Category</th>
              <th className="text-right font-medium px-5 py-3">Silver g</th>
              <th className="text-right font-medium px-5 py-3">Making</th>
              <th className="text-right font-medium px-5 py-3">Cost</th>
              <th className="text-right font-medium px-5 py-3">Price today</th>
              <th className="text-right font-medium px-5 py-3">In stock</th>
              <th className="text-right font-medium px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {cat.data.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3">
                  <Link to={`/admin/jewelries/${p.id}`} className="font-mono tabular-nums text-neutral-900 hover:underline">{p.sku}</Link>
                </td>
                <td className="px-5 py-3 font-medium text-neutral-900">{p.name}</td>
                <td className="px-5 py-3 capitalize text-neutral-600">{p.category}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{grams(p.silverWeightGrams)}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{num(p.makingCharge)}</td>
                <td className={`px-5 py-3 text-right font-mono tabular-nums ${p.costPrice === null ? 'text-red-600' : ''}`}>
                  {p.costPrice === null ? 'not set' : num(p.costPrice)}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">{p.priceToday === null ? '—' : num(p.priceToday)}</td>
                <td className={`px-5 py-3 text-right font-mono tabular-nums ${p.isStale ? 'text-red-600' : 'text-neutral-500'}`}>
                  {p.daysInStock !== null ? `${p.daysInStock} d` : p.soldAt ? `Sold ${new Date(p.soldAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`px-2 py-1 rounded-md border text-xs capitalize ${STATUS[p.status] ?? 'border-neutral-200'}`}>{p.status}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  {['available', 'reserved'].includes(p.status) && (
                    <button onClick={() => retire(p.id)} className="text-xs text-neutral-500 underline underline-offset-2">Retire</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {cat.data.map((p) => (
          <Link key={p.id} to={`/admin/jewelries/${p.id}`} className="block bg-white border border-neutral-200 rounded-xl px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-neutral-900 truncate">{p.name}</div>
                <div className="font-mono tabular-nums text-xs text-neutral-400">{p.sku} · {grams(p.silverWeightGrams)} g</div>
              </div>
              <span className={`px-2 py-1 rounded-md border text-xs capitalize shrink-0 ${STATUS[p.status] ?? 'border-neutral-200'}`}>{p.status}</span>
            </div>
            <div className="flex items-end justify-between gap-3 mt-2">
              <span className={`text-xs font-mono tabular-nums ${p.isStale ? 'text-red-600' : 'text-neutral-400'}`}>
                {p.daysInStock !== null ? `${p.daysInStock} days in stock` : p.costPrice === null ? 'no cost price' : ''}
              </span>
              <span className="font-mono tabular-nums text-lg font-semibold">{p.priceToday === null ? '—' : num(p.priceToday)}</span>
            </div>
          </Link>
        ))}
      </div>

      {cat.data.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl px-6 py-14 text-center">
          <div className="text-neutral-900 font-medium">Nothing matches</div>
          <div className="text-sm text-neutral-500 mt-1">Try clearing the filters.</div>
        </div>
      )}

      <p className="text-xs text-neutral-400 mt-5">
        Price today = silver weight × {cat.silverRatePerGram.toFixed(2)} + making charge + stone price.
        It moves with the daily rate; nothing is stored.
      </p>
    </div>
  );
}
