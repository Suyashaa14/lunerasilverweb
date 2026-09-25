import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiGet, apiPut } from '../../api/client';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { BUTTON, Card, CardHead, EmptyState, ErrorNote, Loading, StatusPill } from '../../components/admin/ui';
import { num } from '../../components/admin/format';

interface Customer {
  id: number; name: string; phone: string | null; email: string | null;
  pan: string | null; addressLine: string | null; city: string | null;
}
interface InvoiceRow {
  id: number; invoiceNo: string; issuedDateBs: string;
  totalAmount: number; paid: number; outstanding: number; isVoid: boolean;
}

const statusOf = (r: InvoiceRow) =>
  r.isVoid ? 'void' : r.outstanding <= 0 ? 'paid' : r.paid > 0 ? 'part paid' : 'unpaid';

export function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();

  const load = useCallback(async () => {
    const [c, inv] = await Promise.all([
      apiGet(`/customers/${id}`),
      apiGet(`/invoices?customerId=${id}&includeVoid=true&pageSize=100`),
    ]);
    setCustomer(c);
    setInvoices(inv.data);
  }, [id]);

  useEffect(() => { load().catch(() => setError('Could not load this customer.')); }, [load]);

  const edit = async () => {
    if (!customer) return;
    const answer = await dialog.ask({
      title: 'Edit customer',
      confirmLabel: 'Save',
      fields: [
        { name: 'name', label: 'Name', defaultValue: customer.name },
        { name: 'phone', label: 'Phone', required: false, defaultValue: customer.phone ?? '' },
        { name: 'email', label: 'Email', required: false, defaultValue: customer.email ?? '' },
        { name: 'addressLine', label: 'Address', required: false, defaultValue: customer.addressLine ?? '' },
        { name: 'city', label: 'City', required: false, defaultValue: customer.city ?? '' },
        { name: 'pan', label: 'PAN', required: false, defaultValue: customer.pan ?? '', help: 'Nine digits.' },
      ],
    });
    if (!answer) return;

    try {
      await apiPut(`/customers/${id}`, {
        name: answer.name,
        phone: answer.phone || null,
        email: answer.email || null,
        addressLine: answer.addressLine || null,
        city: answer.city || null,
        pan: answer.pan || null,
      });
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    }
  };

  if (error && !customer) return <ErrorNote>{error}</ErrorNote>;
  if (!customer) return <Loading />;

  const live = invoices.filter((i) => !i.isVoid);
  const owed = live.reduce((s, i) => s + i.outstanding, 0);
  const spent = live.reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div className="max-w-[1100px]">
      <Dialog request={dialog.request} onSettle={dialog.settle} />

      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-neutral-500">
            <Link to="/admin/customers" className="hover:underline">Customers</Link> / {customer.name}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">{customer.name}</h1>
          <p className="text-sm text-neutral-500 mt-1 font-mono tabular-nums">
            {[customer.phone, customer.city, customer.pan && `PAN ${customer.pan}`].filter(Boolean).join(' · ') || 'No contact details'}
          </p>
        </div>
        <button onClick={edit} className={BUTTON.secondary}>Edit</button>
      </header>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <Card className="px-5 py-4">
          <div className="text-sm text-neutral-500">Invoices</div>
          <div className="font-mono tabular-nums text-2xl font-semibold mt-1">{live.length}</div>
        </Card>
        <Card className="px-5 py-4">
          <div className="text-sm text-neutral-500">Spent</div>
          <div className="font-mono tabular-nums text-2xl font-semibold mt-1">{num(spent)}</div>
        </Card>
        <Card className={`px-5 py-4 ${owed > 0 ? 'bg-red-50/50' : ''}`}>
          <div className="text-sm text-neutral-500">Still owes</div>
          <div className={`font-mono tabular-nums text-2xl font-semibold mt-1 ${owed > 0 ? 'text-red-700' : 'text-neutral-400'}`}>
            {owed > 0 ? num(owed) : '—'}
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Invoices" right={<span className="text-xs text-neutral-400">Newest first</span>} />
        {invoices.length === 0 ? (
          <div className="px-5 py-10 text-sm text-neutral-400 text-center">Nothing bought yet.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {invoices.map((i) => (
              <li key={i.id}>
                <Link to={`/admin/invoices/${i.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-neutral-50">
                  <div>
                    <div className="font-mono tabular-nums text-neutral-900">{i.invoiceNo}</div>
                    <div className="font-mono tabular-nums text-xs text-neutral-400">{i.issuedDateBs}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    {i.outstanding > 0 && !i.isVoid && (
                      <span className="font-mono tabular-nums text-sm text-red-700">{num(i.outstanding)} owed</span>
                    )}
                    <span className="font-mono tabular-nums font-semibold">{num(i.totalAmount)}</span>
                    <StatusPill status={statusOf(i)} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {live.length === 0 && invoices.length === 0 && (
        <div className="mt-5">
          <EmptyState title="No purchases yet" detail="Their first invoice will appear here." />
        </div>
      )}
    </div>
  );
}
