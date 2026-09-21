import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { apiGet } from '../../api/client';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'good';
  message: string;
  detail: string;
  action: { label: string; href: string };
}

// Severity drives the dot alone. The row reads as text, not as a coloured bar.
const DOT: Record<Alert['severity'], string> = {
  critical: 'bg-red-600',
  warning: 'bg-amber-600',
  info: 'bg-neutral-400',
  good: 'bg-emerald-600',
};

const relativeTime = (from: number) => {
  const seconds = Math.floor((Date.now() - from) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
};

export function AlertsBell({ variant = 'plain' }: { variant?: 'plain' | 'boxed' }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [, forceTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    apiGet('/dashboard/alerts')
      .then((a) => {
        setAlerts(a);
        setFetchedAt(Date.now());
      })
      .catch(() => setAlerts([]));
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keep "Updated just now" honest while the panel sits open.
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [open]);

  const backToDashboard = () => {
    setOpen(false);
    if (location.pathname !== '/admin') navigate('/admin');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          variant === 'boxed'
            ? 'relative w-11 h-11 flex items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'
            : 'relative p-2 rounded-md text-neutral-600 hover:bg-neutral-100'
        }
        aria-label={alerts.length > 0 ? `Alerts (${alerts.length})` : 'Alerts'}
      >
        <Bell className="w-5 h-5" />
        {alerts.length > 0 && (
          <span
            className={
              variant === 'boxed'
                ? 'absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center justify-center'
                : 'absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center'
            }
          >
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-w-[92vw] bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-100">
            <h2 className="text-[17px] font-semibold text-neutral-900">Needs attention</h2>
            <span className="font-mono tabular-nums text-neutral-400">{alerts.length}</span>
          </div>

          <div className="flex-1 min-h-[120px] max-h-[60vh] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-5 py-10 text-sm text-neutral-400 text-center">Nothing to flag right now.</div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-4">
                    <span className={`mt-[9px] w-2 h-2 rounded-full shrink-0 ${DOT[a.severity]}`} />
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-neutral-900 leading-snug">{a.message}</div>
                      <div className="text-sm text-neutral-500 mt-0.5">
                        {a.detail}
                        {' · '}
                        <Link
                          to={a.action.href}
                          onClick={() => setOpen(false)}
                          className="text-neutral-500 hover:text-neutral-900 underline-offset-2 hover:underline"
                        >
                          {a.action.label}
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={backToDashboard}
              className="text-[15px] font-semibold text-neutral-900 hover:underline underline-offset-2"
            >
              Back to dashboard
            </button>
            <span className="text-sm text-neutral-400">Updated {relativeTime(fetchedAt)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
