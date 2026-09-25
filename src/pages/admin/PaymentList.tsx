import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { BUTTON, Card, CardHead, EmptyState, ErrorNote, Loading, PageHeader, StatusPill } from '../../components/admin/ui';
import { num } from '../../components/admin/format';

interface Payment {
  id: number;
  invoiceId: number | null;
  invoiceNo: string | null;
  customerName: string | null;
  amount: number;
  method: string;
  referenceNo: string | null;
  status: 'pending' | 'verified' | 'rejected' | 'refunded';
  receivedDateBs: string;
  note: string | null;
}

const TABS = [
  { key: 'pending', label: 'Needs checking' },
  { key: 'verified', label: 'Confirmed' },
  { key: 'rejected', label: 'Rejected' },
  { key: '', label: 'All' },
];

const methodLabel = (m: string) => m.replace('_', ' ');

export function PaymentList() {
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState<Payment[]>([]);
  const [pending, setPending] = useState<{ count: number; amount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useDialog();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (tab) params.set('status', tab);
    Promise.all([apiGet(`/payments?${params}`), apiGet('/payments/pending-count')])
      .then(([list, count]) => { setRows(list); setPending(count); })
      .catch(() => setError('Could not load payments.'))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(load, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'That did not work.'); }
    finally { setBusy(false); }
  };

  const verify = (p: Payment) => act(() => apiPost(`/payments/${p.id}/verify`));

  const reject = async (p: Payment) => {
    const answer = await dialog.ask({
      title: 'Reject this payment',
      description: `${num(p.amount)} by ${methodLabel(p.method)}. Rejecting means the money never arrived — the invoice goes back to unpaid.`,
      confirmLabel: 'Reject payment',
      tone: 'danger',
      fields: [{ name: 'reason', label: 'Reason', type: 'textarea', placeholder: 'Not on the bank statement' }],
    });
    if (!answer) return;
    act(() => apiPost(`/payments/${p.id}/reject`, { reason: answer.reason }));
  };

  if (loading && rows.length === 0) return <Loading />;

  return (
    <div className="max-w-[1200px]">
      <Dialog request={dialog.request} onSettle={dialog.settle} />

      <PageHeader
        title="Payments"
        subtitle={
          pending && pending.count > 0
            ? <>Money in hand is counted straight away. <span className="text-amber-700 font-medium">{pending.count} payment{pending.count === 1 ? '' : 's'} worth {num(pending.amount)} still needs checking against a statement.</span></>
            : 'Money in hand is counted straight away. Anything else waits here until you confirm it.'
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              tab === t.key ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t.label}
            {t.key === 'pending' && pending && pending.count > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-semibold">{pending.count}</span>
            )}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={tab === 'pending' ? 'Nothing waiting' : 'Nothing here'}
          detail={tab === 'pending'
            ? 'Every payment received has been confirmed. Bank transfers and eSewa payments appear here until you check them.'
            : 'No payments with this status.'}
        />
      ) : (
        <Card>
          <CardHead title={TABS.find((t) => t.key === tab)?.label ?? 'All'} right={<span className="text-xs text-neutral-400">{rows.length} shown</span>} />
          <ul className="divide-y divide-neutral-100">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-mono tabular-nums text-[15px] font-semibold ${p.amount < 0 ? 'text-red-700' : 'text-neutral-900'}`}>
                      {num(p.amount)}
                    </span>
                    <span className="text-sm text-neutral-600 capitalize">{methodLabel(p.method)}</span>
                    <StatusPill status={p.status} />
                  </div>
                  <div className="text-sm text-neutral-500 mt-0.5">
                    {p.invoiceNo ? (
                      <Link to={`/admin/invoices/${p.invoiceId}`} className="font-mono tabular-nums hover:underline">{p.invoiceNo}</Link>
                    ) : (
                      <span className="text-neutral-400">no invoice</span>
                    )}
                    {p.customerName && <> · {p.customerName}</>}
                    <span className="font-mono tabular-nums text-neutral-400"> · {p.receivedDateBs}</span>
                  </div>
                  {p.referenceNo && <div className="text-xs text-neutral-400 font-mono tabular-nums mt-0.5">ref {p.referenceNo}</div>}
                  {p.note && <div className="text-xs text-neutral-400 mt-0.5">{p.note}</div>}
                </div>

                {p.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => reject(p)} disabled={busy} className={BUTTON.danger}>Reject</button>
                    <button onClick={() => verify(p)} disabled={busy} className={BUTTON.primary}>Confirm</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
