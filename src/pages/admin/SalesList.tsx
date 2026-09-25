import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { DateRangeFilter } from './DateRangeFilter';
import { Pagination } from './Pagination';

interface Sale {
  id: number;
  ringName: string;
  category: string;
  source: 'homemade' | 'bought';
  jewelryId: number | null;
  silverWeightGrams: number;
  silverRatePerGram: number;
  stoneWeightGrams: number | null;
  stonePrice: number;
  makingCharge: number;
  soldPrice: number;
  soldAt: string;
  silverCost: number;
  totalCost: number;
  profit: number;
}

interface SalesSummary {
  count: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

const PAGE_SIZE = 20;

export function SalesList() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const dateQuery = `from=${from}&to=${to}`;
    Promise.all([
      apiGet(`/sales?${dateQuery}&page=${page}&pageSize=${PAGE_SIZE}`),
      apiGet(`/sales/summary?${dateQuery}`),
    ])
      .then(([salesRes, summaryRes]) => {
        setSales(salesRes.data);
        setTotal(salesRes.total);
        setSummary(summaryRes);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, page]);

  const setRange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(1);
  };

  // The sales table is retired and read-only. Counter sales become invoices,
  // so there is nothing to delete here any more.

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Sales</h1>
        <Link to="/admin/sales/new" className="admin-primary-action px-4 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-black">
          Add sale
        </Link>
      </div>

      <DateRangeFilter from={from} to={to} onChange={setRange} />

      {summary && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="px-3 py-2.5 rounded-md bg-neutral-50">
              <div className="text-xs text-neutral-400 uppercase tracking-wide">Revenue ({summary.count} sold)</div>
              <div className="text-lg font-semibold">Rs {summary.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="px-3 py-2.5 rounded-md bg-neutral-50">
              <div className="text-xs text-neutral-400 uppercase tracking-wide">Cost</div>
              <div className="text-lg font-semibold">Rs {summary.totalCost.toLocaleString()}</div>
            </div>
            <div className={`px-3 py-2.5 rounded-md ${summary.totalProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="text-xs text-neutral-400 uppercase tracking-wide">Profit</div>
              <div className={`text-lg font-semibold ${summary.totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                Rs {summary.totalProfit.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Ring</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Source</th>
              <th className="text-left px-4 py-3">Silver cost</th>
              <th className="text-left px-4 py-3">Stone cost</th>
              <th className="text-left px-4 py-3">Making charge</th>
              <th className="text-left px-4 py-3">Sold price</th>
              <th className="text-left px-4 py-3">Profit</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-neutral-400" colSpan={10}>Loading…</td></tr>
            ) : sales.length === 0 ? (
              <tr><td className="px-4 py-6 text-neutral-400" colSpan={10}>No sales{(from || to) ? ' in this range.' : ' yet.'}</td></tr>
            ) : sales.map((s) => (
              <tr key={s.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 whitespace-nowrap">{s.soldAt}</td>
                <td className="px-4 py-3 font-medium">
                  {s.ringName}
                  {s.jewelryId !== null && <span className="ml-1.5 text-xs text-neutral-400" title="Linked to inventory">🔗</span>}
                </td>
                <td className="px-4 py-3 text-neutral-500 capitalize">{s.category}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${s.source === 'homemade' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                    {s.source}
                  </span>
                </td>
                <td className="px-4 py-3">Rs {s.silverCost.toLocaleString()}</td>
                <td className="px-4 py-3">Rs {s.stonePrice.toLocaleString()}</td>
                <td className="px-4 py-3">{s.source === 'bought' ? `Rs ${s.makingCharge.toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3 font-medium">Rs {s.soldPrice.toLocaleString()}</td>
                <td className={`px-4 py-3 font-medium ${s.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Rs {s.profit.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 whitespace-nowrap">
                    <Link to={`/admin/sales/${s.id}/edit`} className="text-neutral-600 hover:text-neutral-900 underline">Edit</Link>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
      </div>
    </div>
  );
}
