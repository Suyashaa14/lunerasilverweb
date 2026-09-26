import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { Card, CardHead, ErrorNote, Loading, PageHeader, StatusPill } from '../../components/admin/ui';

interface Row {
  jewelryId: number; sku: string; status: string;
  ledgerBalance: number; expectedBalance: number; agrees: boolean;
}

export function StockCheck() {
  const [rows, setRows] = useState<Row[]>([]);
  const [problems, setProblems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/inventory/reconcile')
      .then((res: { data: Row[]; disagreements: Row[] }) => { setRows(res.data); setProblems(res.disagreements); })
      .catch(() => setError('Could not run the stock check.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const noHistory = rows.filter((r) => r.ledgerBalance === 0 && r.expectedBalance === 1);

  return (
    <div className="max-w-[1000px]">
      <PageHeader
        title="Stock check"
        subtitle="Rebuilds what should be on the shelf from the stock ledger, and compares it with what each piece says about itself."
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <Card className={`mb-5 px-5 py-5 ${problems.length > 0 ? 'bg-red-50/50 border-red-200' : ''}`}>
        <div className={`font-mono tabular-nums text-4xl font-semibold ${problems.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
          {problems.length}
        </div>
        <p className="text-sm text-neutral-600 mt-1">
          {problems.length === 0
            ? `No disagreements across ${rows.length} pieces. Every movement adds up.`
            : `piece${problems.length === 1 ? '' : 's'} whose ledger does not match its status. Until these are explained, the stock figure cannot be trusted.`}
        </p>
      </Card>

      {problems.length > 0 && (
        <Card className="mb-5">
          <CardHead title="Needs explaining" />
          <ul className="divide-y divide-neutral-100">
            {problems.map((r) => (
              <li key={r.jewelryId} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <Link to={`/admin/jewelries/${r.jewelryId}`} className="font-mono tabular-nums hover:underline">{r.sku}</Link>
                <div className="flex items-center gap-4 text-sm">
                  <StatusPill status={r.status} />
                  <span className="text-neutral-500">
                    ledger says <strong className="font-mono tabular-nums text-red-700">{r.ledgerBalance}</strong>,
                    status implies <strong className="font-mono tabular-nums">{r.expectedBalance}</strong>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {noHistory.length > 0 && (
        <Card>
          <CardHead
            title="No ledger history"
            right={<span className="text-xs text-neutral-400">{noHistory.length} piece{noHistory.length === 1 ? '' : 's'}</span>}
          />
          <p className="px-5 py-3 text-sm text-neutral-600 border-b border-neutral-100">
            These were added before the stock ledger existed, or without a purchase bill. They are not errors — there is simply
            nothing recorded about where they came from, so they have no cost price either.
          </p>
          <ul className="divide-y divide-neutral-100">
            {noHistory.map((r) => (
              <li key={r.jewelryId} className="flex items-center justify-between gap-4 px-5 py-3">
                <Link to={`/admin/jewelries/${r.jewelryId}`} className="font-mono tabular-nums text-sm hover:underline">{r.sku}</Link>
                <StatusPill status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
