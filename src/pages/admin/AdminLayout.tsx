import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AlertsBell } from './AlertsBell';

interface NavLinkDef {
  to: string;
  label: string;
  end?: boolean;
  /** Not yet built. Shown greyed out so the shape of the app is visible. */
  soon?: boolean;
}

interface NavSection {
  title: string;
  /** Sections only the owner sees. Mirrors authenticateAdmin on the API, so the
      menu never offers something the server will refuse. */
  adminOnly?: boolean;
  links: NavLinkDef[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'Daily',
    links: [
      { to: '/admin', label: 'Dashboard', end: true },
      { to: '/admin/invoices/new', label: 'Sell' },
      { to: '/admin/invoices', label: 'Invoices', end: true },
      { to: '/admin/orders', label: 'Orders' },
    ],
  },
  {
    title: 'Stock',
    links: [
      { to: '/admin/jewelries', label: 'Jewellery' },
      { to: '/admin/purchases', label: 'Purchases', soon: true },
      { to: '/admin/suppliers', label: 'Suppliers', soon: true },
    ],
  },
  {
    title: 'Money',
    links: [
      { to: '/admin/payments', label: 'Payments', soon: true },
      { to: '/admin/expenses', label: 'Expenses' },
    ],
  },
  {
    title: 'People',
    links: [{ to: '/admin/customers', label: 'Customers', soon: true }],
  },
  {
    title: 'Books',
    adminOnly: true,
    links: [
      { to: '/admin/analytics', label: 'Analytics' },
      { to: '/admin/reports', label: 'Reports', soon: true },
      { to: '/admin/ledger', label: 'Ledger', soon: true },
      { to: '/admin/year-end', label: 'Year end', soon: true },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
    links: [
      { to: '/admin/settings', label: 'Settings' },
      { to: '/admin/users', label: 'Users', soon: true },
    ],
  },
];

const ALL_LINKS = SECTIONS.flatMap((s) => s.links);

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

  const visibleSections = SECTIONS.filter((section) => !section.adminOnly || user.role === 'admin');

  const currentLabel = [...ALL_LINKS].reverse().find((l) =>
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
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-4 last:mb-0">
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.links.map((l) =>
                l.soon ? (
                  // Not built yet. Left visible but inert, so the shape of the
                  // app is obvious and nobody clicks into a dead route.
                  <span
                    key={l.to}
                    title="Not built yet"
                    className="px-3 py-2.5 rounded-md text-sm font-medium text-neutral-300 cursor-default select-none"
                  >
                    {l.label}
                  </span>
                ) : (
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
                ),
              )}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-neutral-200">
        <div className="px-3 mb-2">
          <div className="text-xs text-neutral-500 truncate">{user.email}</div>
          <div className="text-[11px] text-neutral-400 capitalize">{user.role}</div>
        </div>
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
