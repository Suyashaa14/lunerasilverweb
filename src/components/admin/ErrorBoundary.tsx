import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; onReset?: () => void }
interface State { error: Error | null; where: string | null }

/**
 * Catches a render error in a page and says what happened.
 *
 * Without this, one bad figure anywhere on a screen blanks the whole window and
 * leaves nothing to go on -- no message, no page, no way to tell which screen
 * broke. The books are not worth much if a screen can vanish silently.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, where: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the console so the whole stack is still there to copy.
    console.error('Admin screen failed to render:', error, info.componentStack);
    this.setState({ where: info.componentStack?.split('\n').slice(1, 4).join('\n') ?? null });
  }

  render() {
    const { error, where } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="max-w-[720px]">
        <h1 className="text-2xl font-semibold tracking-tight">This screen could not be drawn</h1>
        <p className="text-sm text-neutral-500 mt-2">
          Nothing has been changed or lost. The rest of the admin still works — use the menu to go elsewhere.
        </p>

        <div className="mt-5 bg-white border border-red-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-red-100 text-sm font-semibold text-red-700">
            {error.name}
          </div>
          <pre className="px-5 py-4 text-xs text-neutral-700 whitespace-pre-wrap break-words">{error.message}</pre>
          {where && (
            <pre className="px-5 pb-4 text-[11px] text-neutral-400 whitespace-pre-wrap break-words">{where.trim()}</pre>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => { this.setState({ error: null, where: null }); this.props.onReset?.(); }}
            className="admin-primary-action px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium"
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
