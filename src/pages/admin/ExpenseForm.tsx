import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Documents } from '../../components/admin/Documents';
import { apiGet, apiPost, apiPut, ApiError } from '../../api/client';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function ExpenseForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [spentAt, setSpentAt] = useState(todayStr());
  const [note, setNote] = useState('');
  const [knownCategories, setKnownCategories] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    apiGet('/expenses?from=&to=&page=1&pageSize=200').then((res: { data: { category: string }[] }) => {
      setKnownCategories(Array.from(new Set(res.data.map((e) => e.category))));
    });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    apiGet(`/expenses/${id}`).then((expense) => {
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setSpentAt(expense.spentAt);
      setNote(expense.note ?? '');
      setLoading(false);
    });
  }, [id, isEdit]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = { category, amount, spentAt, note: note || undefined };

    try {
      if (isEdit) await apiPut(`/expenses/${id}`, payload);
      else await apiPost('/expenses', payload);
      navigate('/admin/expenses');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-lg">
      <button type="button" onClick={() => navigate('/admin/expenses')} className="text-sm text-neutral-500 hover:text-neutral-900 mb-4">
        ← Back to expenses
      </button>

      <h1 className="text-2xl font-semibold mb-6">{isEdit ? 'Edit expense' : 'Add expense'}</h1>

      {error && <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <form onSubmit={submit} className="space-y-5">
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-neutral-700 mb-1.5">Category</span>
            <input
              required
              list="expense-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Petrol, Food, Stall rent"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
            />
            <datalist id="expense-categories">
              {knownCategories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Amount (Rs)</span>
              <input
                required type="number" step="0.01" min="0"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Date</span>
              <input
                required type="date"
                value={spentAt} onChange={(e) => setSpentAt(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-neutral-700 mb-1.5">Note</span>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} placeholder="Optional"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/expenses')} className="px-4 py-2 rounded-md text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            Cancel
          </button>
          <button
            type="submit" disabled={submitting}
            className="px-4 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </form>

      {/* Only once the expense exists: a receipt has to attach to something.
          On a new expense, save first and the panel appears. */}
      {isEdit && id && (
        <div className="mt-5 bg-white border border-neutral-200 rounded-lg p-5">
          <h2 className="text-[15px] font-semibold mb-3">Receipt</h2>
          <Documents referenceType="expense" referenceId={Number(id)} documentType="expense_receipt" />
        </div>
      )}
    </div>
  );
}
