import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { BUTTON, Card, CardHead, ErrorNote, Loading, PageHeader } from '../../components/admin/ui';
import { money } from '../../components/admin/format';

interface Account { id: number; code: string; name: string; type: string }
interface EntryRow { id: number; entryNo: string; entryDateBs: string; narration: string; referenceType: string | null; amount: number }
interface EntryLine { id: number; account: string; accountName: string; debit: number; credit: number; note: string | null }
interface Entry extends EntryRow { lines: EntryLine[] }

export function Ledger() {
  const [tab, setTab] = useState<'entries' | 'accounts'>('entries');
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiGet('/ledger/entries?limit=100'), apiGet('/ledger/accounts')])
      .then(([e, a]) => { setEntries(e); setAccounts(a); })
      .catch(() => setError('Could not load the ledger.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openEntry = async (id: number) => {
    try { setOpen(await apiGet(`/ledger/entries/${id}`)); }
    catch { setError('Could not open that entry.'); }
  };

  /**
   * A manual entry, for what a document cannot express — an opening balance, a
   * bank charge, the accountant's year-end adjustment. Two lines only here;
   * anything more complex belongs with the accountant.
   */
  const addEntry = async () => {
    const options = accounts.map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` }));
    const answer = await dialog.ask({
      title: 'Manual journal entry',
      description: 'For what no document covers — an opening balance, a bank charge, an adjustment. It must balance: the same amount goes out of one account and into another.',
      confirmLabel: 'Post entry',
      fields: [
        { name: 'date', label: 'Date', type: 'text', defaultValue: new Date().toISOString().slice(0, 10), help: 'YYYY-MM-DD' },
        { name: 'narration', label: 'What is it for', placeholder: 'Bank charge for September' },
        { name: 'debit', label: 'Debit — the account receiving value', type: 'select', options },
        { name: 'credit', label: 'Credit — the account giving value', type: 'select', options },
        { name: 'amount', label: 'Amount', type: 'number' },
      ],
    });
    if (!answer) return;

    if (answer.debit === answer.credit) { setError('Debit and credit must be different accounts.'); return; }
    const amount = Number(answer.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError('Enter an amount greater than zero.'); return; }

    try {
      await apiPost('/ledger/entries', {
        date: answer.date,
        narration: answer.narration,
        lines: [{ account: answer.debit, debit: amount }, { account: answer.credit, credit: amount }],
      });
      setError(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post that entry.');
    }
  };

  if (loading && entries.length === 0) return <Loading />;

  return (
    <div className="max-w-[1100px]">
      <Dialog request={dialog.request} onSettle={dialog.settle} />

      <PageHeader
        title="Ledger"
        subtitle="Every sale, payment, bill and expense writes a balanced entry here automatically. This is where the reports read from."
        actions={<button onClick={addEntry} className={BUTTON.secondary}>Manual entry</button>}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 mb-5">
        {(['entries', 'accounts'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition ${
              tab === t ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
            }`}>
            {t === 'entries' ? 'Journal' : 'Chart of accounts'}
          </button>
        ))}
      </div>

      {tab === 'entries' ? (
        <Card>
          <CardHead title="Journal" right={<span className="text-xs text-neutral-400">{entries.length} most recent</span>} />
          {entries.length === 0 ? (
            <div className="px-5 py-10 text-sm text-neutral-400 text-center">
              Nothing posted yet. Entries appear automatically as you sell, take payment and enter bills.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {entries.map((e) => (
                <li key={e.id}>
                  <button onClick={() => openEntry(e.id)} className="w-full flex items-center justify-between gap-4 px-5 py-3 text-left hover:bg-neutral-50">
                    <div className="min-w-0">
                      <span className="font-mono tabular-nums text-sm text-neutral-900">{e.entryNo}</span>
                      <span className="text-sm text-neutral-600 ml-3">{e.narration}</span>
                      <div className="font-mono tabular-nums text-xs text-neutral-400">{e.entryDateBs}</div>
                    </div>
                    <span className="font-mono tabular-nums text-sm font-semibold shrink-0">{money(e.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card>
          <CardHead title="Chart of accounts" right={<span className="text-xs text-neutral-400">{accounts.length} accounts</span>} />
          <ul className="divide-y divide-neutral-100">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
                <span><span className="font-mono tabular-nums text-neutral-400 mr-3">{a.code}</span>{a.name}</span>
                <span className="text-neutral-400 capitalize text-xs">{a.type}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-neutral-200 shadow-xl">
            <div className="px-5 py-4 border-b border-neutral-100">
              <div className="font-mono tabular-nums text-sm text-neutral-500">{open.entryNo} · {open.entryDateBs}</div>
              <h2 className="text-[17px] font-semibold mt-0.5">{open.narration}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                  <th className="text-left font-medium px-5 py-2.5">Account</th>
                  <th className="text-right font-medium px-5 py-2.5">Debit</th>
                  <th className="text-right font-medium px-5 py-2.5">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {open.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-2.5"><span className="font-mono tabular-nums text-neutral-400 mr-2">{l.account}</span>{l.accountName}</td>
                    <td className="px-5 py-2.5 text-right font-mono tabular-nums">{l.debit ? money(l.debit) : ''}</td>
                    <td className="px-5 py-2.5 text-right font-mono tabular-nums">{l.credit ? money(l.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-neutral-100 flex justify-between items-center">
              <span className="text-xs text-neutral-400">Entries cannot be edited or deleted. Correct one by posting its reverse.</span>
              <button onClick={() => setOpen(null)} className={BUTTON.secondary}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
