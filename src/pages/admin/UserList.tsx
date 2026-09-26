import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { BUTTON, Card, ErrorNote, Loading, PageHeader, StatusPill } from '../../components/admin/ui';

interface User {
  id: number; name: string; email: string;
  phone: string | null; role: 'admin' | 'staff' | 'customer'; isActive: boolean;
}

const ROLE_NOTE: Record<string, string> = {
  admin: 'Everything, including voiding, credit notes, the books and who has access.',
  staff: 'Sell, take payment, add stock, manage customers and suppliers.',
  customer: 'A shopper. No access to the admin at all.',
};

export function UserList() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<User[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();

  const load = useCallback(() => {
    setLoading(true);
    apiGet(`/users${showInactive ? '?includeInactive=true' : ''}`)
      .then(setRows)
      .catch(() => setError('Could not load the accounts.'))
      .finally(() => setLoading(false));
  }, [showInactive]);

  useEffect(load, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try { await fn(); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'That did not work.'); }
  };

  const invite = async () => {
    const answer = await dialog.ask({
      title: 'New account',
      description: 'Access to the shop is given by you, never claimed by someone filling in a form. Share the password with them directly and ask them to change it.',
      confirmLabel: 'Create account',
      fields: [
        { name: 'name', label: 'Name' },
        { name: 'email', label: 'Email' },
        { name: 'password', label: 'Password', help: 'At least 8 characters.' },
        {
          name: 'role', label: 'What they can do', type: 'select', defaultValue: 'staff',
          options: [
            { value: 'staff', label: 'Staff — run the shop' },
            { value: 'admin', label: 'Admin — everything, including the books' },
          ],
        },
      ],
    });
    if (!answer) return;
    run(() => apiPost('/users', answer));
  };

  const changeRole = async (u: User) => {
    const answer = await dialog.ask({
      title: `Change what ${u.name} can do`,
      confirmLabel: 'Change',
      fields: [{
        name: 'role', label: 'Role', type: 'select', defaultValue: u.role,
        options: [
          { value: 'staff', label: 'Staff — run the shop' },
          { value: 'admin', label: 'Admin — everything, including the books' },
          { value: 'customer', label: 'Customer — no admin access' },
        ],
      }],
    });
    if (!answer || answer.role === u.role) return;
    run(() => apiPost(`/users/${u.id}/role`, { role: answer.role }));
  };

  const setActive = async (u: User, active: boolean) => {
    if (active) return run(() => apiPost(`/users/${u.id}/activate`));
    const answer = await dialog.ask({
      title: `Turn off ${u.name}'s access`,
      description: 'The account stays — their name is on invoices and in the audit log, so it cannot be removed. They simply cannot sign in.',
      confirmLabel: 'Turn off access',
      tone: 'danger',
    });
    if (!answer) return;
    run(() => apiPost(`/users/${u.id}/deactivate`));
  };

  const anonymise = async (u: User) => {
    const answer = await dialog.ask({
      title: `Erase ${u.name}'s details`,
      description: 'For a "delete my account" request. Their name, email and phone are replaced and the account is switched off. The row itself stays, so old invoices still make sense. This cannot be undone.',
      confirmLabel: 'Erase details',
      tone: 'danger',
      fields: [{ name: 'confirm', label: 'Type ERASE to confirm', placeholder: 'ERASE' }],
    });
    if (!answer) return;
    if (answer.confirm !== 'ERASE') { setError('Type ERASE exactly to confirm.'); return; }
    run(() => apiPost(`/users/${u.id}/anonymise`));
  };

  if (loading && rows.length === 0) return <Loading />;

  const staff = rows.filter((u) => u.role !== 'customer');
  const customers = rows.filter((u) => u.role === 'customer');

  return (
    <div className="max-w-[1000px]">
      <Dialog request={dialog.request} onSettle={dialog.settle} />

      <PageHeader
        title="Users"
        subtitle="Who can sign in, and what they can reach."
        actions={<button onClick={invite} className={BUTTON.primary}>New account</button>}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <label className="flex items-center gap-2 text-sm text-neutral-600 mb-5">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Show switched-off accounts
      </label>

      <Card className="mb-5">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-[15px] font-semibold">Shop access</h2>
        </div>
        <ul className="divide-y divide-neutral-100">
          {staff.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900">{u.name}</span>
                  <StatusPill status={u.role} />
                  {!u.isActive && <StatusPill status="switched off" />}
                  {me?.id === u.id && <span className="text-xs text-neutral-400">you</span>}
                </div>
                <div className="text-sm text-neutral-500 mt-0.5">{u.email}</div>
                <div className="text-xs text-neutral-400 mt-0.5">{ROLE_NOTE[u.role]}</div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button onClick={() => changeRole(u)} className={BUTTON.secondary}>Role</button>
                <button onClick={() => setActive(u, !u.isActive)} className={BUTTON.secondary}>
                  {u.isActive ? 'Turn off' : 'Turn on'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {customers.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-neutral-100 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">Shoppers</h2>
            <span className="text-xs text-neutral-400">{customers.length} with a storefront login</span>
          </div>
          <ul className="divide-y divide-neutral-100">
            {customers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
                <div>
                  <span className="text-neutral-900">{u.name}</span>
                  {!u.isActive && <StatusPill status="switched off" className="ml-2" />}
                  <div className="text-sm text-neutral-500">{u.email}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setActive(u, !u.isActive)} className={BUTTON.secondary}>
                    {u.isActive ? 'Turn off' : 'Turn on'}
                  </button>
                  <button onClick={() => anonymise(u)} className={BUTTON.danger}>Erase details</button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-neutral-400 mt-5">
        Accounts are never deleted. A person's name appears on invoices and in the audit log, so removing the row
        would strand that history. Turn access off, or erase the details.
      </p>
    </div>
  );
}
