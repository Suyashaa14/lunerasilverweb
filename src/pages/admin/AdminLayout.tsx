import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AlertsBell } from './AlertsBell';

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/jewelries', label: 'Jewelries' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/invoices', label: 'Invoices' },
  { to: '/admin/expenses', label: 'Expenses' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => setMobileNavOpen(false), [location.pathname]);

  if (loading) return <div className="p-10 text-neutral-500">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  // Routes whose page renders its own header row, bell included.
  const ownsHeader = location.pathname === '/admin';

  const currentLabel = [...LINKS].reverse().find((l) =>
    l.end ? location.pathname === l.to : location.pathname.startsWith(l.to),
  )?.label ?? 'Admin';

  const navContent = (
    <>
      <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <div className="text-xs tracking-widest text-neutral-400 uppercase">Lunera Silver</div>
          <div className="text-lg font-semibold">Admin</div>
        </div>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="md:hidden p-1.5 -mr-1.5 rounded-md text-neutral-500 hover:bg-neutral-100"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `admin-nav-link px-3 py-2.5 rounded-md text-sm font-medium transition ${
                isActive ? 'admin-nav-link-active bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-neutral-200">
        <div className="px-3 text-xs text-neutral-400 mb-2 truncate">{user.email}</div>
        <button
          onClick={() => logout()}
          className="w-full px-3 py-2 rounded-md text-sm font-medium text-neutral-600 hover:bg-neutral-100 text-left"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-shell min-h-screen bg-neutral-50 text-neutral-900 md:flex">
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white sticky top-0 z-30">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 -ml-2 rounded-md text-neutral-600 hover:bg-neutral-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* The dashboard puts its own title and bell in the page header, so the
            mobile bar there is just the menu button. */}
        {!ownsHeader && <div className="text-sm font-semibold">{currentLabel}</div>}
        {!ownsHeader && <AlertsBell />}
      </div>

      {mobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 md:w-60 shrink-0 border-r border-neutral-200 bg-white flex flex-col transform transition-transform duration-200 ease-out md:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8">
        {/* Pages that build their own header put the bell in it (the dashboard
            sits it beside the period control). Everything else gets this row. */}
        {!ownsHeader && (
          <div className="hidden md:flex justify-end mb-4">
            <AlertsBell />
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
