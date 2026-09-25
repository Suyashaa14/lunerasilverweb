import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';

interface Item {
  id: number; name: string; sku: string | null;
  silverWeightGrams: number | null; silverRatePerGram: number | null; makingCharge: number | null;
  unitPrice: number; discount: number; lineTotal: number;
}
interface Invoice {
  id: number; invoiceNo: string; issuedAt: string; issuedDateBs: string; fiscalYear: string;
  seller: { name: string; address: string; pan: string };
  buyer: { name: string; address: string; pan: string | null };
  subtotal: number; discount: number; taxableAmount: number; vatAmount: number; vatRate: number; totalAmount: number;
  paymentMethod: string; isVoid: boolean; voidReason: string | null; printCount: number; items: Item[];
}
interface Balance { total: number; paid: number; pending: number; outstanding: number; isSettled: boolean }
interface Payment { id: number; amount: number; method: string; status: string; receivedDateBs: string; note: string | null }

const num = (v: number) => Math.round(v).toLocaleString();

export function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [inv, bal, pays] = await Promise.all([
      apiGet(`/invoices/${id}`),
      apiGet(`/payments/balance/${id}`),
      apiGet(`/payments?invoiceId=${id}`),
    ]);
    setInvoice(inv);
    setBalance(bal);
    setPayments(pays);
  }, [id]);

  useEffect(() => { load().catch(() => setError('Could not load this invoice.')); }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try { await fn(); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'That did not work.'); }
    finally { setBusy(false); }
  };

  const takePayment = () => {
    if (!balance) return;
    const raw = prompt(`How much is being paid?\n\n${num(balance.outstanding)} is outstanding.`, String(balance.outstanding));
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) { alert('Enter a number greater than zero.'); return; }
    act(() => apiPost('/payments', { invoiceId: Number(id), amount, method: invoice?.paymentMethod ?? 'cash' }));
  };

  const voidInvoice = () => {
    const reason = prompt('Why is this invoice being voided?\n\nThe invoice stays and keeps its number, but stops counting.');
    if (reason === null) return;
    if (reason.trim() === '') { alert('A reason is required.'); return; }
    act(() => apiPost(`/invoices/${id}/void`, { reason: reason.trim() }));
  };

  const creditNote = () => {
    const reason = prompt('Why is this being credited?\n\nThe original invoice stays; a credit note records the reversal.');
    if (reason === null) return;
    if (reason.trim() === '') { alert('A reason is required.'); return; }
    const refund = balance && balance.paid > 0 && confirm(`Hand back ${num(balance.paid)} in cash as well?`);
    act(() => apiPost(`/invoices/${id}/credit-note`, {
      reason: reason.trim(),
      ...(refund ? { refund: { amount: balance!.paid, method: 'cash' } } : {}),
    }));
  };

  const print = () => act(async () => { await apiPost(`/invoices/${id}/print`); window.print(); });

  if (error && !invoice) return <div className="text-red-700">{error}</div>;
  if (!invoice) return <div className="text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-[1000px]">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6 print:hidden">
        <div>
          <div className="text-sm text-neutral-500">
            <Link to="/admin/invoices" className="hover:underline">Invoices</Link> / {invoice.invoiceNo}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="font-mono tabular-nums text-3xl font-semibold tracking-tight">{invoice.invoiceNo}</h1>
            {invoice.isVoid && <span className="px-2.5 py-1 rounded-md border border-neutral-300 text-neutral-500 text-sm">Void</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={print} disabled={busy} className="px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium">Print</button>
          {!invoice.isVoid && balance && !balance.isSettled && (
            <button onClick={takePayment} disabled={busy} className="px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold">Take payment</button>
          )}
          {!invoice.isVoid && (
            <>
              <button onClick={creditNote} disabled={busy} className="px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium">Credit note</button>
              <button onClick={voidInvoice} disabled={busy} className="px-4 py-2.5 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-700">Void</button>
            </>
          )}
        </div>
      </header>

      {error && <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 print:hidden">{error}</div>}
      {invoice.isVoid && invoice.voidReason && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-neutral-100 border border-neutral-200 text-sm text-neutral-600">
          Voided: {invoice.voidReason}
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
          <div className="px-5 py-4">
            <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2">From</div>
            <div className="font-medium text-neutral-900">{invoice.seller.name}</div>
            <div className="text-sm text-neutral-600">{invoice.seller.address}</div>
            <div className="text-sm text-neutral-600 font-mono tabular-nums">PAN {invoice.seller.pan}</div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2">To</div>
            <div className="font-medium text-neutral-900">{invoice.buyer.name}</div>
            <div className="text-sm text-neutral-600">{invoice.buyer.address}</div>
            {invoice.buyer.pan && <div className="text-sm text-neutral-600 font-mono tabular-nums">PAN {invoice.buyer.pan}</div>}
          </div>
        </div>

        <div className="px-5 py-3 border-y border-neutral-100 flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <span className="text-neutral-500">Date <strong className="font-mono tabular-nums text-neutral-900 font-medium">{invoice.issuedDateBs}</strong> <span className="text-neutral-400">BS</span></span>
          <span className="text-neutral-500">Fiscal year <strong className="font-mono tabular-nums text-neutral-900 font-medium">{invoice.fiscalYear}</strong></span>
          <span className="text-neutral-500 capitalize">Paid by <strong className="text-neutral-900 font-medium">{invoice.paymentMethod.replace('_', ' ')}</strong></span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
              <th className="text-left font-medium px-5 py-3">Item</th>
              <th className="text-right font-medium px-5 py-3 hidden sm:table-cell">Silver</th>
              <th className="text-right font-medium px-5 py-3 hidden sm:table-cell">Making</th>
              <th className="text-right font-medium px-5 py-3">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td className="px-5 py-3">
                  <div className="text-neutral-900">{it.name}</div>
                  {it.sku && <div className="text-xs text-neutral-400 font-mono tabular-nums">{it.sku}</div>}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-neutral-600 hidden sm:table-cell">
                  {it.silverWeightGrams ?? '—'} g {it.silverRatePerGram ? <span className="text-neutral-400">× {it.silverRatePerGram}</span> : null}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-neutral-600 hidden sm:table-cell">{it.makingCharge ?? '—'}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{num(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-5 py-4 border-t border-neutral-100 flex justify-end">
          <div className="w-full sm:w-72 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span className="font-mono tabular-nums">{num(invoice.subtotal)}</span></div>
            {invoice.discount > 0 && <div className="flex justify-between"><span className="text-neutral-500">Discount</span><span className="font-mono tabular-nums">−{num(invoice.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-neutral-500">VAT ({invoice.vatRate}%)</span><span className="font-mono tabular-nums">{num(invoice.vatAmount)}</span></div>
            <div className="flex justify-between pt-2 border-t border-neutral-100 text-base font-semibold">
              <span>Total</span><span className="font-mono tabular-nums">{num(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {balance && !invoice.isVoid && (
        <div className="mt-5 bg-white border border-neutral-200 rounded-xl print:hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Payments</h2>
            <span className={`font-mono tabular-nums text-sm ${balance.outstanding > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {balance.outstanding > 0 ? `${num(balance.outstanding)} outstanding` : 'Settled'}
            </span>
          </div>
          {payments.length === 0 ? (
            <div className="px-5 py-6 text-sm text-neutral-400 text-center">Nothing received yet.</div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div>
                    <span className="capitalize text-neutral-800">{p.method.replace('_', ' ')}</span>
                    <span className="text-neutral-400 font-mono tabular-nums ml-2">{p.receivedDateBs}</span>
                    {p.note && <div className="text-xs text-neutral-400">{p.note}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    {p.status !== 'verified' && <span className="text-xs text-amber-700 capitalize">{p.status}</span>}
                    <span className={`font-mono tabular-nums ${p.amount < 0 ? 'text-red-700' : ''}`}>{num(p.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {invoice.printCount > 1 && (
        <div className="hidden print:block mt-4 text-sm text-neutral-500">COPY — print {invoice.printCount}</div>
      )}
    </div>
  );
}
