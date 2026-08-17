import { useEffect, useRef, useState } from 'react';
import { Filter } from 'lucide-react';

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = Boolean(from || to);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative mb-4" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium ${
          active ? 'border-neutral-900 text-neutral-900 bg-neutral-50' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
        }`}
      >
        <Filter size={14} />
        Filter
        {active && <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 z-40 bg-white border border-neutral-200 rounded-lg shadow-lg p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500 mb-1.5">From</span>
              <input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} className="px-3 py-2 border border-neutral-300 rounded-md text-sm" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500 mb-1.5">To</span>
              <input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} className="px-3 py-2 border border-neutral-300 rounded-md text-sm" />
            </label>
            <button type="button" onClick={() => onChange(todayStr(), todayStr())} className="px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 underline whitespace-nowrap">
              Today
            </button>
            {active && (
              <button type="button" onClick={() => onChange('', '')} className="px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 underline whitespace-nowrap">
                Show all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
