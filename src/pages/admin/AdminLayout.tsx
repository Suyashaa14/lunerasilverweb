import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Boxes, ChevronDown, FileText, Home, LogOut, MoreHorizontal, Settings, ShoppingBag, Wallet, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api/client';
import { AlertsBell } from './AlertsBell';

interface ChildDef {
  to: string;
  label: string;
  /** Paths that live under `to` but belong to a sibling. Keeps Invoices from
      lighting up while you are on the New sale screen. */
  not?: string[];
}

interface SectionDef {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Every path that belongs to this section. */
  match: string[];
  /** Owner-only. Mirrors authenticateAdmin on the API, so the menu never
      offers something the server will refuse. */
  adminOnly?: boolean;
  /** Where the section lands when it has no children of its own. */
  to?: string;
  children?: ChildDef[];
}

/**
 * Five destinations plus Settings, each opening to reveal its own screens.
 * Selling, invoices and web orders are one idea — money coming in — so they
 * live together under Sales rather than competing for three top-level slots.
 */
const SECTIONS: SectionDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, to: '/admin', match: ['/admin'] },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingBag,
    match: ['/admin/invoices', '/admin/orders'],
    children: [
      // New sale is a button on the sales list now, not a place you navigate to.
      { to: '/admin/invoices', label: 'All sales' },
      { to: '/admin/orders', label: 'Orders' },
    ],
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: Boxes,
    match: ['/admin/jewelries', '/admin/purchases', '/admin/suppliers', '/admin/stock-check'],
    children: [
      { to: '/admin/jewelries', label: 'Jewellery' },
      { to: '/admin/purchases', label: 'Purchases' },
      { to: '/admin/suppliers', label: 'Suppliers' },
      { to: '/admin/stock-check', label: 'Stock check' },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    icon: Wallet,
    match: ['/admin/payments', '/admin/expenses', '/admin/customers'],
    children: [
      { to: '/admin/payments', label: 'Payments' },
      { to: '/admin/expenses', label: 'Expenses' },
      { to: '/admin/customers', label: 'Customers' },
    ],
  },
  {
    id: 'books',
    label: 'Books',
    icon: BookOpen,
    adminOnly: true,
    match: ['/admin/analytics', '/admin/reports', '/admin/ledger', '/admin/year-end'],
    children: [
      { to: '/admin/analytics', label: 'Analytics' },
      { to: '/admin/reports', label: 'Reports' },
      { to: '/admin/ledger', label: 'Ledger' },
      { to: '/admin/year-end', label: 'Year end' },
    ],
  },
];

// Pinned to the bottom of the sidebar: reached rarely, always in the same place.
const SETTINGS: SectionDef = {
  id: 'settings',
  label: 'Settings',
  icon: Settings,
  adminOnly: true,
  match: ['/admin/settings', '/admin/users'],
  children: [
    { to: '/admin/settings', label: 'General' },
    { to: '/admin/users', label: 'Users' },
  ],
};

/** The four things done standing at the counter. Everything else is behind More. */
const PHONE_TABS: Array<ChildDef & { label: string; icon: ComponentType<{ className?: string }>; section?: string; badge?: 'payments' }> = [
  { to: '/admin/invoices/new', label: 'Sell', icon: ShoppingBag },
  { to: '/admin/invoices', label: 'Sales', icon: FileText, not: ['/admin/invoices/new'] },
  { to: '/admin/jewelries', label: 'Stock', icon: Boxes, section: 'stock' },
  { to: '/admin/payments', label: 'Money', icon: Wallet, section: 'money', badge: 'payments' },
];

const ALL_SECTIONS = [...SECTIONS, SETTINGS];

/** Longest matching prefix wins. */
function sectionFor(pathname: string): SectionDef | undefined {
  let best: SectionDef | undefined;
  let bestLength = -1;
  for (const section of ALL_SECTIONS) {
    for (const prefix of section.match) {
      const hit = prefix === '/admin' ? pathname === '/admin' : pathname === prefix || pathname.startsWith(`${prefix}/`);
      if (hit && prefix.length > bestLength) {
        best = section;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

function childActive(child: ChildDef, pathname: string): boolean {
  const hit = pathname === child.to || pathname.startsWith(`${child.to}/`);
  if (!hit) return false;
  return !(child.not ?? []).some((n) => pathname === n || pathname.startsWith(`${n}/`));
}

export function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [pendingPayments, setPendingPayments] = useState(0);

  const current = sectionFor(location.pathname);
  // One section open at a time, and the one you are in opens itself.
  const [openId, setOpenId] = useState<string | null>(current?.id ?? null);

  useEffect(() => setMoreOpen(false), [location.pathname]);
  useEffect(() => {
    if (current?.children) setOpenId(current.id);
  }, [current?.id]);

  // The one number in the system that is genuinely waiting on a person.
  useEffect(() => {
    if (!user) return;
    apiGet('/payments/pending-count')
      .then((r) => setPendingPayments(r?.count ?? 0))
      .catch(() => setPendingPayments(0));
  }, [user, location.pathname]);

  if (loading) return <div className="p-10 text-neutral-500">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const visible = (s: SectionDef) => !s.adminOnly || user.role === 'admin';
  const sections = SECTIONS.filter(visible);
  const ownsHeader = location.pathname === '/admin'; // the dashboard draws its own header

  const badgeFor = (s: SectionDef) => (s.id === 'money' ? pendingPayments : 0);

  const Badge = ({ count, dark }: { count: number; dark?: boolean }) =>
    count > 0 ? (
      <span
        className={`ml-auto min-w-[20px] px-1.5 py-0.5 rounded-full text-[11px] font-semibold text-center ${
          dark ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
        }`}
      >
        {count}
      </span>
    ) : null;

  /** A section in the sidebar: a plain link, or a header that opens a list. */
  const navSection = (s: SectionDef, onNavigate?: () => void) => {
    const Icon = s.icon;
    const inSection = current?.id === s.id;
    const count = badgeFor(s);

    if (!s.children) {
      return (
        <NavLink
          key={s.id}
          to={s.to!}
          onClick={onNavigate}
          className={`admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
            inSection ? 'admin-nav-link-active bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Icon className="w-[18px] h-[18px] shrink-0" />
          {s.label}
        </NavLink>
      );
    }

    const open = openId === s.id;
    return (
      <div key={s.id}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            // Closed and somewhere else? Open it and go to its first screen.
            if (!open && !inSection) {
              setOpenId(s.id);
              navigate(s.children![0].to);
              onNavigate?.();
              return;
            }
            setOpenId(open ? null : s.id);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition text-left ${
            inSection ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Icon className="w-[18px] h-[18px] shrink-0" />
          {s.label}
          <Badge count={count} />
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform ${count > 0 ? 'ml-1.5' : 'ml-auto'} ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
        {open && (
          <div className="mt-0.5 mb-1 ml-[26px] pl-3 border-l border-neutral-200 flex flex-col gap-0.5">
            {s.children.map((c) => {
              const active = childActive(c, location.pathname);
              return (
                <NavLink
                  key={c.to}
                  to={c.to}
                  onClick={onNavigate}
                  className={`admin-nav-link px-3 py-2 rounded-md text-[13px] font-medium transition ${
                    active
                      ? 'admin-nav-link-active bg-neutral-900 text-white'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {c.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const sidebar = (
    <>
      <div className="px-6 py-5 border-b border-neutral-200">
        <div className="text-xs tracking-widest text-neutral-400 uppercase">Lunera Silver</div>
        <div className="text-lg font-semibold">Admin</div>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {sections.map((s) => navSection(s))}
        {visible(SETTINGS) && (
          <>
            <div className="flex-1 min-h-[16px]" />
            <div className="pt-2 border-t border-neutral-200">{navSection(SETTINGS)}</div>
          </>
        )}
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

  /* On a phone there is no sidebar, so the section's screens appear as a strip
     of tabs above the page instead. On desktop the open dropdown already
     shows them, so the strip stays hidden. */
  const phoneTabRow = current?.children && (
    <div className="md:hidden flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 mb-4">
      {current.children.map((c) => {
        const active = childActive(c, location.pathname);
        return (
          <NavLink
            key={c.to}
            to={c.to}
            className={`admin-nav-link shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition ${
              active
                ? 'border-neutral-900 bg-neutral-900 text-white admin-nav-link-active'
                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {c.label}
          </NavLink>
        );
      })}
    </div>
  );

  const phoneActive = (t: (typeof PHONE_TABS)[number]) =>
    t.section ? current?.id === t.section : childActive(t, location.pathname);
  const moreActive = !PHONE_TABS.some(phoneActive);

  return (
    <div className="admin-shell min-h-screen bg-neutral-50 text-neutral-900 md:flex">
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white sticky top-0 z-30">
        <div className="text-sm font-semibold">{current?.label ?? 'Admin'}</div>
        {!ownsHeader && <AlertsBell />}
      </div>

      <aside className="hidden md:flex md:static w-60 shrink-0 border-r border-neutral-200 bg-white flex-col">
        {sidebar}
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
        {!ownsHeader && (
          <div className="hidden md:flex justify-end mb-4">
            <AlertsBell />
          </div>
        )}
        {phoneTabRow}
        <Outlet />
      </main>

      {/* Phone tab bar. Fixed, thumb height, safe-area aware. */}
      <nav className="admin-tabbar md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-neutral-200 bg-white">
        {PHONE_TABS.map((t) => {
          const Icon = t.icon;
          const active = phoneActive(t);
          const count = t.badge === 'payments' ? pendingPayments : 0;
          return (
            <button
              key={t.to}
              type="button"
              onClick={() => navigate(t.to)}
              className={`relative flex-1 flex flex-col items-center gap-1 py-2 pb-2.5 text-[10.5px] font-medium ${
                active ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              <Icon className="w-[19px] h-[19px]" />
              {t.label}
              {count > 0 && (
                <span className="absolute top-1 right-[calc(50%-18px)] min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center gap-1 py-2 pb-2.5 text-[10.5px] font-medium ${
            moreActive ? 'text-neutral-900' : 'text-neutral-400'
          }`}
        >
          <MoreHorizontal className="w-[19px] h-[19px]" />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-t-2xl border-t border-neutral-200 p-4 pb-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">More</div>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 -mr-1.5 rounded-md text-neutral-500 hover:bg-neutral-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {sections.map((s) => navSection(s, () => setMoreOpen(false)))}
              {visible(SETTINGS) && navSection(SETTINGS, () => setMoreOpen(false))}
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs text-neutral-500 truncate">{user.email}</div>
                <div className="text-[11px] text-neutral-400 capitalize">{user.role}</div>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
