import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { BUTTON, EmptyState, ErrorNote, Loading, PageHeader, StatusPill } from '../../components/admin/ui';
import { num } from '../../components/admin/format';

interface Row {
  id: number; supplierName: string; billNo: string;
  billDateBs: string; totalAmount: number; paymentStatus: string;
}

export function PurchaseList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/purchases')
      .then(setRows)
      .catch(() => setError('Could not load purchase bills.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const total = rows.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="max-w-[1100px]">
      <PageHeader
        title="Purchases"
        subtitle={rows.length === 0 ? 'Supplier bills. This is where cost price comes from.' : `${rows.length} bills · ${num(total)} spent`}
        actions={<Link to="/admin/purchases/new" className={BUTTON.primary}>New bill</Link>}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {rows.length === 0 ? (
        <EmptyState
          title="No bills entered yet"
          detail="Until a piece arrives on a bill it has no cost price, so its margin cannot be worked out and your stock is valued at nothing."
          action={<Link to="/admin/purchases/new" className={BUTTON.primary}>Enter your first bill</Link>}
        />
      ) : (
        <>
          <div className="hidden md:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                  <th className="text-left font-medium px-5 py-3">Bill</th>
                  <th className="text-left font-medium px-5 py-3">Supplier</th>
                  <th className="text-left font-medium px-5 py-3">Date (BS)</th>
                  <th className="text-right font-medium px-5 py-3">Total</th>
                  <th className="text-right font-medium px-5 py-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3">
                      <Link to={`/admin/purchases/${r.id}`} className="font-mono tabular-nums text-neutral-900 hover:underline">{r.billNo}</Link>
                    </td>
                    <td className="px-5 py-3">{r.supplierName}</td>
                    <td className="px-5 py-3 font-mono tabular-nums text-neutral-600">{r.billDateBs}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">{num(r.totalAmount)}</td>
                    <td className="px-5 py-3 text-right"><StatusPill status={r.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {rows.map((r) => (
              <Link key={r.id} to={`/admin/purchases/${r.id}`} className="block bg-white border border-neutral-200 rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono tabular-nums text-neutral-900">{r.billNo}</span>
                  <StatusPill status={r.paymentStatus} />
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <span className="text-sm text-neutral-600 truncate">{r.supplierName}</span>
                  <span className="font-mono tabular-nums font-semibold">{num(r.totalAmount)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
