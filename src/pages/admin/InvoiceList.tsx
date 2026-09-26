import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { EmptyState, ErrorNote, Loading } from '../../components/admin/ui';

interface Row {
  id: number;
  invoiceNo: string;
  issuedDateBs: string;
  issuedAt: string;
  buyerName: string;
  totalAmount: number;
  paid: number;
  outstanding: number;
  isVoid: boolean;
}

const num = (v: number) => Math.round(v).toLocaleString();

function Status({ row }: { row: Row }) {
  if (row.isVoid) return <span className="px-2 py-1 rounded-md border border-neutral-200 text-neutral-500 text-xs">Void</span>;
  if (row.outstanding <= 0) return <span className="px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">Paid</span>;
  if (row.paid > 0) return <span className="px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-xs">Part paid</span>;
  return <span className="px-2 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs">Unpaid</span>;
}

export function InvoiceList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [includeVoid, setIncludeVoid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '50' });
    if (search.trim()) params.set('search', search.trim());
    if (includeVoid) params.set('includeVoid', 'true');

    apiGet(`/invoices?${params}`)
      .then((res: { data: Row[]; total: number }) => { setRows(res.data); setTotal(res.total); })
      .then(() => setError(null))
      .catch(() => setError('Could not load invoices. Check the connection and try again.'))
      .finally(() => setLoading(false));
  }, [search, includeVoid]);

  const owed = rows.filter((r) => !r.isVoid).reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="max-w-[1200px]">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            {total} issued{owed > 0 && <> · <span className="text-red-700">{num(owed)} still owed</span></>}
          </p>
        </div>
        <Link to="/admin/invoices/new" className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold">
          New sale
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice number or buyer"
          className="flex-1 min-w-[220px] px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={includeVoid} onChange={(e) => setIncludeVoid(e.target.checked)} />
          Show void
        </label>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState
          title={error ? 'Nothing to show' : 'No invoices yet'}
          detail={error ? 'The list could not be loaded.' : 'Record a counter sale and it will appear here.'}
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                  <th className="text-left font-medium px-5 py-3">Invoice</th>
                  <th className="text-left font-medium px-5 py-3">Date (BS)</th>
                  <th className="text-left font-medium px-5 py-3">Buyer</th>
                  <th className="text-right font-medium px-5 py-3">Total</th>
                  <th className="text-right font-medium px-5 py-3">Outstanding</th>
                  <th className="text-right font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.id} className={r.isVoid ? 'text-neutral-400' : ''}>
                    <td className="px-5 py-3">
                      <Link to={`/admin/invoices/${r.id}`} className="font-mono tabular-nums text-neutral-900 hover:underline">
                        {r.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums text-neutral-600">{r.issuedDateBs}</td>
                    <td className="px-5 py-3">{r.buyerName}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{num(r.totalAmount)}</td>
                    <td className={`px-5 py-3 text-right font-mono tabular-nums ${r.outstanding > 0 ? 'text-red-700' : 'text-neutral-400'}`}>
                      {r.outstanding > 0 ? num(r.outstanding) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right"><Status row={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {rows.map((r) => (
              <Link key={r.id} to={`/admin/invoices/${r.id}`} className="block bg-white border border-neutral-200 rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono tabular-nums text-[15px] text-neutral-900">{r.invoiceNo}</span>
                  <Status row={r} />
                </div>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <span className="text-sm text-neutral-600 truncate">{r.buyerName}</span>
                  <span className="font-mono tabular-nums text-[15px] font-semibold">{num(r.totalAmount)}</span>
                </div>
                <div className="text-xs text-neutral-400 mt-1 font-mono tabular-nums">{r.issuedDateBs}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
