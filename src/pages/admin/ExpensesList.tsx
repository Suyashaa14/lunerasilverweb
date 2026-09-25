import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { ErrorNote } from '../../components/admin/ui';
import { DateRangeFilter } from './DateRangeFilter';
import { Pagination } from './Pagination';

interface Expense {
  id: number;
  category: string;
  amount: number;
  spentAt: string;
  note: string | null;
}

interface ExpensesSummary {
  count: number;
  totalAmount: number;
}

const PAGE_SIZE = 20;

export function ExpensesList() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ExpensesSummary | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  const dialog = useDialog();
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const dateQuery = `from=${from}&to=${to}`;
    Promise.all([
      apiGet(`/expenses?${dateQuery}&page=${page}&pageSize=${PAGE_SIZE}`),
      apiGet(`/expenses/summary?${dateQuery}`),
    ])
      .then(([expensesRes, summaryRes]) => {
        setExpenses(expensesRes.data);
        setTotal(expensesRes.total);
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

  // Expenses are never deleted. Voiding keeps the row and its number, takes it
  // out of every total, and records who cancelled it and why.
  const voidExpense = async (id: number) => {
    const answer = await dialog.ask({
      title: 'Void this expense',
      description: 'The record stays and keeps its number, but stops counting in any total.',
      confirmLabel: 'Void expense',
      tone: 'danger',
      fields: [{ name: 'reason', label: 'Reason', type: 'textarea', placeholder: 'Entered twice' }],
    });
    if (!answer) return;
    try {
      await apiPost(`/expenses/${id}/void`, { reason: answer.reason });
      load();
    } catch (err) {
      setVoidError(err instanceof ApiError ? err.message : 'Could not void this expense.');
    }
  };

  return (
    <div>
      <Dialog request={dialog.request} onSettle={dialog.settle} />
      {voidError && <ErrorNote>{voidError}</ErrorNote>}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <Link to="/admin/expenses/new" className="admin-primary-action px-4 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-black">
          Add expense
        </Link>
      </div>

      <DateRangeFilter from={from} to={to} onChange={setRange} />

      {summary && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 mb-6">
          <div className="px-3 py-2.5 rounded-md bg-neutral-50 inline-block">
            <div className="text-xs text-neutral-400 uppercase tracking-wide">Total ({summary.count} expenses)</div>
            <div className="text-lg font-semibold">Rs {summary.totalAmount.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Note</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-neutral-400" colSpan={5}>Loading…</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td className="px-4 py-6 text-neutral-400" colSpan={5}>No expenses{(from || to) ? ' in this range.' : ' yet.'}</td></tr>
            ) : expenses.map((e) => (
              <tr key={e.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 whitespace-nowrap">{e.spentAt}</td>
                <td className="px-4 py-3 font-medium capitalize">{e.category}</td>
                <td className="px-4 py-3">Rs {e.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-neutral-500">{e.note || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 whitespace-nowrap">
                    <Link to={`/admin/expenses/${e.id}/edit`} className="text-neutral-600 hover:text-neutral-900 underline">Edit</Link>
                    <button onClick={() => voidExpense(e.id)} className="text-red-600 hover:text-red-800 underline">Void</button>
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
