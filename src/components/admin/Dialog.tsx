import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BUTTON } from './ui';

/**
 * Replaces browser prompt() and confirm().
 *
 * Those cannot validate, cannot explain what the action does, and cannot be
 * styled — which matters here because every one of these actions is
 * irreversible bookkeeping: voiding an invoice, retiring a piece, refunding
 * money. Each needs room to say what will happen and to insist on a reason.
 */

export interface DialogField {
  name: string;
  label: string;
  /** `select` needs options; `text` is a single line; `textarea` is several. */
  type?: 'text' | 'textarea' | 'select' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  help?: string;
}

export interface DialogRequest {
  title: string;
  /** What will happen, in plain words. Shown above the fields. */
  description?: ReactNode;
  fields?: DialogField[];
  confirmLabel?: string;
  tone?: 'default' | 'danger';
}

type Resolver = (value: Record<string, string> | null) => void;

export function useDialog() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const resolver = useRef<Resolver | null>(null);

  const ask = (next: DialogRequest): Promise<Record<string, string> | null> => {
    setRequest(next);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  };

  const settle = (value: Record<string, string> | null) => {
    setRequest(null);
    resolver.current?.(value);
    resolver.current = null;
  };

  return { request, ask, settle };
}

export function Dialog({ request, onSettle }: { request: DialogRequest | null; onSettle: Resolver }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (!request) return;
    const initial: Record<string, string> = {};
    for (const field of request.fields ?? []) initial[field.name] = field.defaultValue ?? '';
    setValues(initial);
    setError(null);
    // Focus straight into the first field so it behaves like the prompt it replaces.
    const timer = setTimeout(() => firstField.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSettle(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request, onSettle]);

  if (!request) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const field of request.fields ?? []) {
      if (field.required !== false && (values[field.name] ?? '').trim() === '') {
        setError(`${field.label} is required.`);
        return;
      }
    }
    onSettle(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onSettle(null)} aria-hidden="true" />

      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={request.title}
        className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-neutral-200 shadow-xl"
      >
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-[17px] font-semibold text-neutral-900">{request.title}</h2>
          {request.description && <p className="text-sm text-neutral-500 mt-1">{request.description}</p>}
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

          {(request.fields ?? []).map((field, index) => (
            <label key={field.name} className="block">
              <span className="text-sm text-neutral-600">{field.label}</span>

              {field.type === 'select' ? (
                <select
                  ref={index === 0 ? (firstField as React.RefObject<HTMLSelectElement>) : undefined}
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm bg-white"
                >
                  <option value="">Choose…</option>
                  {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  ref={index === 0 ? (firstField as React.RefObject<HTMLTextAreaElement>) : undefined}
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm"
                />
              ) : (
                <input
                  ref={index === 0 ? (firstField as React.RefObject<HTMLInputElement>) : undefined}
                  type={field.type === 'number' ? 'number' : 'text'}
                  step={field.type === 'number' ? '0.01' : undefined}
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm"
                />
              )}

              {field.help && <span className="text-xs text-neutral-400 mt-1 block">{field.help}</span>}
            </label>
          ))}
        </div>

        <div className="flex gap-2 justify-end px-5 py-4 border-t border-neutral-100">
          <button type="button" onClick={() => onSettle(null)} className={BUTTON.secondary}>Cancel</button>
          <button
            type="submit"
            className={request.tone === 'danger'
              ? 'px-5 py-2.5 rounded-lg bg-red-700 text-white text-sm font-semibold'
              : BUTTON.primary}
          >
            {request.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}
