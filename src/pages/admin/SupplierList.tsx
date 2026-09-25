import { useEffect, useState } from 'react';
import { ApiError, apiGet, apiPost, apiPut } from '../../api/client';
import { Dialog, useDialog, type DialogField } from '../../components/admin/Dialog';
import { BUTTON, Card, EmptyState, ErrorNote, Loading, PageHeader, StatusPill } from '../../components/admin/ui';

interface Supplier {
  id: number; name: string; pan: string | null; phone: string | null;
  email: string | null; addressLine: string | null; city: string | null; isActive: boolean;
}

const FIELDS = (s?: Supplier): DialogField[] => [
  { name: 'name', label: 'Name', defaultValue: s?.name ?? '' },
  { name: 'pan', label: 'PAN', required: false, defaultValue: s?.pan ?? '', help: 'Nine digits. Needed on a purchase bill for your records.' },
  { name: 'phone', label: 'Phone', required: false, defaultValue: s?.phone ?? '' },
  { name: 'email', label: 'Email', required: false, defaultValue: s?.email ?? '' },
  { name: 'addressLine', label: 'Address', required: false, defaultValue: s?.addressLine ?? '' },
  { name: 'city', label: 'City', required: false, defaultValue: s?.city ?? '' },
];

const payload = (a: Record<string, string>) => ({
  name: a.name,
  pan: a.pan || null,
  phone: a.phone || null,
  email: a.email || null,
  addressLine: a.addressLine || null,
  city: a.city || null,
});

export function SupplierList() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();

  const load = () => {
    setLoading(true);
    apiGet(`/suppliers${showInactive ? '?includeInactive=true' : ''}`)
      .then(setRows)
      .catch(() => setError('Could not load suppliers.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [showInactive]);

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); setError(null); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'That did not work.'); }
  };

  const add = async () => {
    const answer = await dialog.ask({ title: 'New supplier', confirmLabel: 'Add supplier', fields: FIELDS() });
    if (answer) run(() => apiPost('/suppliers', payload(answer)));
  };

  const edit = async (s: Supplier) => {
    const answer = await dialog.ask({ title: `Edit ${s.name}`, confirmLabel: 'Save', fields: FIELDS(s) });
    if (answer) run(() => apiPut(`/suppliers/${s.id}`, payload(answer)));
  };

  // Suppliers are never deleted -- their name is on purchase bills you have to
  // keep. Deactivating just takes them out of the dropdown.
  const toggle = (s: Supplier) =>
    run(() => apiPut(`/suppliers/${s.id}`, { name: s.name, isActive: !s.isActive }));

  if (loading && rows.length === 0) return <Loading />;

  return (
    <div className="max-w-[1000px]">
      <Dialog request={dialog.request} onSettle={dialog.settle} />

      <PageHeader
        title="Suppliers"
        subtitle="Who you buy from. Their name goes on every purchase bill."
        actions={<button onClick={add} className={BUTTON.primary}>New supplier</button>}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <label className="flex items-center gap-2 text-sm text-neutral-600 mb-5">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Show inactive
      </label>

      {rows.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          detail="Add one, then enter their bill to book stock in with its real cost."
          action={<button onClick={add} className={BUTTON.primary}>New supplier</button>}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-100">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">{s.name}</span>
                    {!s.isActive && <StatusPill status="inactive" />}
                  </div>
                  <div className="text-sm text-neutral-500 font-mono tabular-nums mt-0.5">
                    {[s.pan && `PAN ${s.pan}`, s.phone, s.city].filter(Boolean).join(' · ') || 'No details'}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => edit(s)} className={BUTTON.secondary}>Edit</button>
                  <button onClick={() => toggle(s)} className={BUTTON.secondary}>
                    {s.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
