import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { BUTTON, EmptyState, ErrorNote, Loading, PageHeader } from '../../components/admin/ui';

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  pan: string | null;
  city: string | null;
}

export function CustomerList() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '100' });
    if (search.trim()) params.set('search', search.trim());
    apiGet(`/customers?${params}`)
      .then((res: { data: Customer[]; total: number }) => { setRows(res.data); setTotal(res.total); })
      .catch(() => setError('Could not load customers.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search]);

  const addCustomer = async () => {
    const answer = await dialog.ask({
      title: 'New customer',
      description: 'A buyer is matched on their phone number, so a returning customer is never entered twice.',
      confirmLabel: 'Add customer',
      fields: [
        { name: 'name', label: 'Name' },
        { name: 'phone', label: 'Phone', required: false, help: 'How a repeat visit is recognised.' },
        { name: 'city', label: 'City', required: false },
        { name: 'pan', label: 'PAN', required: false, help: 'Nine digits. Only needed if the buyer is VAT-registered.' },
      ],
    });
    if (!answer) return;

    try {
      await apiPost('/customers', {
        name: answer.name,
        phone: answer.phone || null,
        city: answer.city || null,
        pan: answer.pan || null,
      });
      setError(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this customer.');
    }
  };

  if (loading && rows.length === 0) return <Loading />;

  return (
    <div className="max-w-[1100px]">
      <Dialog request={dialog.request} onSettle={dialog.settle} />

      <PageHeader
        title="Customers"
        subtitle={`${total} on record`}
        actions={<button onClick={addCustomer} className={BUTTON.primary}>New customer</button>}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, phone or email"
        className="w-full max-w-md px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm mb-5"
      />

      {rows.length === 0 ? (
        <EmptyState
          title={search ? 'Nobody matches that' : 'No customers yet'}
          detail={search ? 'Try a different name or number.' : 'A customer is created automatically the first time you record a sale.'}
        />
      ) : (
        <>
          <div className="hidden md:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                  <th className="text-left font-medium px-5 py-3">Name</th>
                  <th className="text-left font-medium px-5 py-3">Phone</th>
                  <th className="text-left font-medium px-5 py-3">City</th>
                  <th className="text-left font-medium px-5 py-3">PAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3">
                      <Link to={`/admin/customers/${c.id}`} className="font-medium text-neutral-900 hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums text-neutral-600">{c.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-neutral-600">{c.city ?? '—'}</td>
                    <td className="px-5 py-3 font-mono tabular-nums text-neutral-600">{c.pan ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {rows.map((c) => (
              <Link key={c.id} to={`/admin/customers/${c.id}`} className="block bg-white border border-neutral-200 rounded-xl px-4 py-3.5">
                <div className="font-medium text-neutral-900">{c.name}</div>
                <div className="text-sm text-neutral-500 font-mono tabular-nums mt-0.5">
                  {c.phone ?? 'no phone'}{c.city ? ` · ${c.city}` : ''}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
