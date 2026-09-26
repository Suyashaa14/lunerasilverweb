import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { BUTTON, Card, ErrorNote, Loading, PageHeader, StatusPill } from '../../components/admin/ui';
import { money } from '../../components/admin/format';

interface Period {
  name: string; startDateBs: string; endDateBs: string; status: 'open' | 'closed';
  totalDebit: number; totalCredit: number; balances: boolean;
}

export function YearEnd() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useDialog();

  const load = useCallback(() => {
    setLoading(true);
    apiGet('/ledger/periods')
      .then(setPeriods)
      .catch(() => setError('Could not load the fiscal years.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'That did not work.'); }
    finally { setBusy(false); }
  };

  const close = async (p: Period) => {
    const answer = await dialog.ask({
      title: `Close ${p.name}`,
      description: p.balances
        ? `The books balance at ${money(p.totalDebit)}. Once closed, nothing new can be recorded in this year — no invoice, no payment, no expense.`
        : `These books do not balance: debits ${money(p.totalDebit)} against credits ${money(p.totalCredit)}. Closing is refused until that is fixed.`,
      confirmLabel: p.balances ? 'Close the year' : 'Try anyway',
      tone: 'danger',
      fields: [{ name: 'confirm', label: `Type ${p.name} to confirm`, placeholder: p.name }],
    });
    if (!answer) return;
    if (answer.confirm !== p.name) { setError(`Type ${p.name} exactly to confirm.`); return; }
    run(() => apiPost(`/ledger/periods/${encodeURIComponent(p.name)}/close`));
  };

  const reopen = async (p: Period) => {
    const answer = await dialog.ask({
      title: `Reopen ${p.name}`,
      description: 'Reopening a signed-off year is the kind of thing an auditor asks about. The reason is kept permanently.',
      confirmLabel: 'Reopen the year',
      tone: 'danger',
      fields: [{ name: 'reason', label: 'Why', type: 'textarea', placeholder: 'Correcting a misposted entry' }],
    });
    if (!answer) return;
    run(() => apiPost(`/ledger/periods/${encodeURIComponent(p.name)}/reopen`, { reason: answer.reason }));
  };

  if (loading && periods.length === 0) return <Loading />;

  return (
    <div className="max-w-[900px]">
      <Dialog request={dialog.request} onSettle={dialog.settle} />

      <PageHeader
        title="Year end"
        subtitle="Closing a fiscal year locks it. Nothing can be recorded into a closed year until it is deliberately reopened."
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="space-y-4">
        {periods.map((p) => (
          <Card key={p.name} className="px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-xl font-semibold">{p.name}</span>
                  <StatusPill status={p.status} />
                </div>
                <div className="font-mono tabular-nums text-sm text-neutral-500 mt-1">
                  {p.startDateBs} — {p.endDateBs}
                </div>
                <div className="text-sm mt-2">
                  {p.totalDebit === 0 ? (
                    <span className="text-neutral-400">Nothing posted in this year.</span>
                  ) : p.balances ? (
                    <span className="text-emerald-700">
                      Balances at <span className="font-mono tabular-nums">{money(p.totalDebit)}</span>
                    </span>
                  ) : (
                    <span className="text-red-700">
                      Does not balance — debits <span className="font-mono tabular-nums">{money(p.totalDebit)}</span>,
                      credits <span className="font-mono tabular-nums">{money(p.totalCredit)}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {p.status === 'open' ? (
                  <button onClick={() => close(p)} disabled={busy} className={BUTTON.danger}>Close year</button>
                ) : (
                  <button onClick={() => reopen(p)} disabled={busy} className={BUTTON.secondary}>Reopen</button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-neutral-400 mt-5">
        A year that does not balance cannot be closed. Closing it would freeze a wrong figure into every later report.
      </p>
    </div>
  );
}
