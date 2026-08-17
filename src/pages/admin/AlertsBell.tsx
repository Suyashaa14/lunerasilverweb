import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { apiGet } from '../../api/client';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'good';
  icon: string;
  message: string;
}

const SEVERITY_STYLE: Record<Alert['severity'], string> = {
  critical: 'bg-red-50 border-red-100',
  warning: 'bg-amber-50 border-amber-100',
  info: 'bg-blue-50 border-blue-100',
  good: 'bg-emerald-50 border-emerald-100',
};

export function AlertsBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet('/dashboard/alerts').then(setAlerts).catch(() => setAlerts([]));
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-md text-neutral-600 hover:bg-neutral-100"
        aria-label="Alerts"
      >
        <Bell className="w-5 h-5" />
        {alerts.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 text-sm font-semibold">Alerts</div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-6 text-sm text-neutral-400 text-center">Nothing to flag right now.</div>
            ) : (
              <div className="p-2 space-y-1.5">
                {alerts.map((a) => (
                  <div key={a.id} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-md border text-sm ${SEVERITY_STYLE[a.severity]}`}>
                    <span className="shrink-0">{a.icon}</span>
                    <span className="text-neutral-700">{a.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
