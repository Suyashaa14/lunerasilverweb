import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { EmptyState, ErrorNote, Loading, StatusPill } from '../../components/admin/ui';
import { num, grams } from '../../components/admin/format';

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

export function JewelryList() {
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [stale, setStale] = useState(false);
  const [noCost, setNoCost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();

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

  const remove = async (id: number, name: string) => {
    const answer = await dialog.ask({
      title: `Delete ${name}?`,
      description:
        'The record is kept, always. It is taken off the shelf and marked, so the stock history and any past documents still read correctly.',
      confirmLabel: 'Delete piece',
      tone: 'danger',
      fields: [
        {
          name: 'status', label: 'Why', type: 'select',
          options: [
            { value: 'voided', label: 'Entered by mistake — it never existed' },
            { value: 'damaged', label: 'Damaged — it broke' },
            { value: 'lost', label: 'Lost — it is missing' },
          ],
        },
        { name: 'reason', label: 'Note', type: 'textarea', help: 'Kept in the stock history.' },
      ],
    });
    if (!answer) return;
    try { await apiPost(`/jewelries/${id}/retire`, { status: answer.status, reason: answer.reason }); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not delete this piece.'); }
  };

  if (!cat) return <Loading />;

  return (
    <div className="max-w-[1400px]">
      <Dialog request={dialog.request} onSettle={dialog.settle} />
      {error && <ErrorNote>{error}</ErrorNote>}
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
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or code"
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
        {(stale || noCost || search || category || status) && (
          <button
            onClick={() => { setSearch(''); setCategory(''); setStatus(''); setStale(false); setNoCost(false); }}
            className="text-sm text-neutral-500 underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden lg:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
              <th className="text-left font-medium px-5 py-3">Piece</th>
              <th className="text-right font-medium px-5 py-3">Silver g</th>
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
                  <Link to={`/admin/jewelries/${p.id}`} className="font-medium text-neutral-900 hover:underline">{p.name}</Link>
                  <div className="text-xs text-neutral-400 capitalize">
                    {p.category}
                    {p.sku && <span className="font-mono tabular-nums"> · {p.sku}</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{grams(p.silverWeightGrams)}</td>
                <td className={`px-5 py-3 text-right font-mono tabular-nums ${p.costPrice === null ? 'text-red-600' : ''}`}>
                  {p.costPrice === null ? 'not set' : num(p.costPrice)}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">{p.priceToday === null ? '—' : num(p.priceToday)}</td>
                <td className={`px-5 py-3 text-right font-mono tabular-nums ${p.isStale ? 'text-red-600' : 'text-neutral-500'}`}>
                  {p.daysInStock !== null ? `${p.daysInStock} d` : p.soldAt ? `Sold ${new Date(p.soldAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <StatusPill status={p.status} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link to={`/admin/jewelries/${p.id}/edit`} className="text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-2">
                      Edit
                    </Link>
                    {/* A sold piece is on a tax document. It is reversed with a
                        credit note, never deleted, so the button is not offered. */}
                    {['available', 'reserved'].includes(p.status) && (
                      <button onClick={() => remove(p.id, p.name)} className="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {cat.data.map((p) => (
          <div key={p.id} className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5">
            <Link to={`/admin/jewelries/${p.id}`} className="block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-neutral-900 truncate">{p.name}</div>
                  <div className="text-xs text-neutral-400 capitalize">{p.category} · {grams(p.silverWeightGrams)} g</div>
                </div>
                <StatusPill status={p.status} className="shrink-0" />
              </div>
              <div className="flex items-end justify-between gap-3 mt-2">
                <span className={`text-xs font-mono tabular-nums ${p.isStale ? 'text-red-600' : 'text-neutral-400'}`}>
                  {p.daysInStock !== null ? `${p.daysInStock} days in stock` : p.costPrice === null ? 'no cost price' : ''}
                </span>
                <span className="font-mono tabular-nums text-lg font-semibold">{p.priceToday === null ? '—' : num(p.priceToday)}</span>
              </div>
            </Link>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100">
              <Link to={`/admin/jewelries/${p.id}/edit`} className="text-sm text-neutral-600">Edit</Link>
              {['available', 'reserved'].includes(p.status) && (
                <button onClick={() => remove(p.id, p.name)} className="text-sm text-red-600">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {cat.data.length === 0 && (
        <EmptyState title="Nothing matches" detail="Try clearing the filters." />
      )}

      <p className="text-xs text-neutral-400 mt-5">
        Price today = silver weight × {cat.silverRatePerGram.toFixed(2)} + making charge + stone price.
        It moves with the daily rate; nothing is stored.
      </p>
    </div>
  );
}
