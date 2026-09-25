import type { ReactNode } from 'react';

/**
 * The shared shell pieces. Markup is identical to what the dashboard, jewellery
 * and invoice screens already used, so adopting these changes nothing visually.
 */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-neutral-200 rounded-xl ${className}`}>{children}</div>;
}

export function CardHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-4 border-b border-neutral-100">
      <h2 className="text-[15px] font-semibold text-neutral-900">{title}</h2>
      {right}
    </div>
  );
}

export function Figure({ value, unit, tone }: { value: string; unit?: string; tone?: 'good' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-neutral-900';
  return (
    <div className={`font-mono tabular-nums text-3xl font-medium tracking-tight ${toneClass}`}>
      {value}
      {unit && <span className="text-xl text-neutral-400 ml-1">{unit}</span>}
    </div>
  );
}

export function StatCell({ label, value, note, unit, tone, tinted }: {
  label: string; value: string; note?: string; unit?: string; tone?: 'good' | 'bad'; tinted?: boolean;
}) {
  return (
    <div className={`px-6 py-5 flex-1 min-w-[150px] ${tinted ? 'bg-neutral-50/70' : ''}`}>
      <div className="text-sm text-neutral-500 mb-2">{label}</div>
      <Figure value={value} unit={unit} tone={tone} />
      {note && <div className="text-xs text-neutral-400 mt-2">{note}</div>}
    </div>
  );
}

/**
 * Status colours in one place. A piece marked `sold` must look the same on the
 * list, the detail page and anywhere added later.
 */
export const STATUS_STYLE: Record<string, string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  reserved: 'border-amber-200 bg-amber-50 text-amber-700',
  sold: 'border-neutral-200 text-neutral-500',
  damaged: 'border-red-200 bg-red-50 text-red-700',
  lost: 'border-red-200 bg-red-50 text-red-700',
  voided: 'border-neutral-200 text-neutral-400',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'part paid': 'border-amber-200 bg-amber-50 text-amber-700',
  unpaid: 'border-red-200 bg-red-50 text-red-700',
  void: 'border-neutral-200 text-neutral-500',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
};

export function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span className={`px-2 py-1 rounded-md border text-xs capitalize ${STATUS_STYLE[status] ?? 'border-neutral-200 text-neutral-600'} ${className}`}>
      {status}
    </span>
  );
}

/** Severity dots for the alerts panel and anywhere else ranking matters. */
export const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-600',
  warning: 'bg-amber-600',
  info: 'bg-neutral-400',
  good: 'bg-emerald-600',
};

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * An empty list should say why it is empty and what to do, not just sit blank.
 */
export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl px-6 py-14 text-center">
      <div className="text-neutral-900 font-medium">{title}</div>
      {detail && <div className="text-sm text-neutral-500 mt-1">{detail}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ what = 'Loading…' }: { what?: string }) {
  return <div className="text-neutral-500">{what}</div>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{children}</div>
  );
}

export const BUTTON = {
  primary: 'px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50',
  secondary: 'px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium disabled:opacity-50',
  danger: 'px-4 py-2.5 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-700 disabled:opacity-50',
};
