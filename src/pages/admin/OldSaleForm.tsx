import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { BUTTON, Card, CardHead, ErrorNote } from '../../components/admin/ui';
import { money } from '../../components/admin/format';
import { CATEGORIES } from '../../components/admin/NewPieceSheet';

/** One line as it is written on the paper bill. */
interface Line {
  key: number;
  name: string;
  category: string;
  quantity: string;
  weightGrams: string;
  amount: string;
  /** What the shop paid for the line, if known. */
  cost: string;
}

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'esewa_qr', label: 'eSewa' },
  { value: 'bank_transfer', label: 'Bank transfer' },
];

const emptyLine = (key: number): Line => ({ key, name: '', category: 'rings', quantity: '1', weightGrams: '', amount: '', cost: '' });
const n = (v: string) => (v.trim() === '' ? 0 : Number(v));
const round2 = (x: number) => Math.round(x * 100) / 100;
const decimal = (v: string) => v.replace(/[^\d.]/g, '');

const todayLocal = () => {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// 16px on phones: anything smaller and iOS zooms the page on focus.
const INPUT = 'mt-1 w-full px-3 py-3 sm:py-2.5 rounded-lg border border-neutral-200 text-base sm:text-sm bg-white';
const NUM = `${INPUT} font-mono tabular-nums`;

/**
 * Logs a sale made before the system, straight from its paper bill: what was
 * sold, the weight, the amount, the discount and what the buyer paid, plus what
 * the shop paid when that is known. Each line becomes a sold piece carrying
 * that cost -- or none, never a guess -- and the sale keeps the bill's own
 * number, exactly as written.
 *
 * Built for typing a stack of bills: after each save the form clears but keeps
 * the date, and says which bill went in.
 */
export function OldSaleForm() {
  const navigate = useNavigate();
  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [location, setLocation] = useState('');
  const [rate, setRate] = useState('');
  /** Where the rate in the box came from, or null when it was typed. */
  const [rateFrom, setRateFrom] = useState<{ source: 'shop' | 'fenegosida'; day: string } | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  const [discount, setDiscount] = useState('');
  const [finalInput, setFinalInput] = useState('');
  /** Which of discount and final total was typed last, when both cannot be
      kept as typed: the other one is worked out from it. */
  const [lastEdited, setLastEdited] = useState<'discount' | 'final'>('discount');
  const [method, setMethod] = useState('cash');
  const [paid, setPaid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: number; invoiceNo: string; total: number } | null>(null);

  // The rate follows the date: looked up each time the date changes, and
  // overwritten only by a hand-typed figure.
  useEffect(() => {
    let live = true;
    setRateLoading(true);
    apiGet(`/settings/silver-rate/on?date=${date}`)
      .then((r: { ratePerGram: number | null; source: 'shop' | 'fenegosida' | null; day: string }) => {
        if (!live) return;
        setRate(r.ratePerGram ? String(r.ratePerGram) : '');
        setRateFrom(r.ratePerGram && r.source ? { source: r.source, day: r.day } : null);
      })
      .catch(() => { if (live) { setRate(''); setRateFrom(null); } })
      .finally(() => { if (live) setRateLoading(false); });
    return () => { live = false; };
  }, [date]);

  const rateValue = n(rate);

  // The levy rate the server will use. Only for showing the split; the
  // server works the figures out itself.
  const [levyRate, setLevyRate] = useState(0);
  useEffect(() => {
    apiGet('/settings')
      .then((st: { skillPromoRate?: number }) => setLevyRate(Number(st?.skillPromoRate ?? 0)))
      .catch(() => setLevyRate(0));
  }, []);

  const set = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  /*
   * The bill is worked out whichever way round it was written.
   *
   * Every line has its amount: the total of the lines is known, and the
   * discount or the final total -- whichever was typed last -- gives the other.
   *
   * Some lines have no amount, but the final total is typed: the lines must add
   * up to final + discount, so what is missing is shared between the blank
   * lines by weight (all of it, when only one is blank).
   */
  const typedSum = round2(lines.reduce((s, l) => s + (l.amount.trim() === '' ? 0 : n(l.amount)), 0));
  const blanks = lines.filter((l) => l.amount.trim() === '');
  const backTracking = blanks.length > 0 && finalInput.trim() !== '';

  const worked = new Map<number, number>();
  let shortfall = 0;
  if (backTracking) {
    shortfall = round2(n(finalInput) + n(discount) - typedSum);
    if (shortfall > 0) {
      const weights = blanks.map((l) => n(l.weightGrams));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let given = 0;
      blanks.forEach((l, i) => {
        const share = i === blanks.length - 1
          ? round2(shortfall - given)
          : round2(totalWeight > 0 ? (shortfall * weights[i]) / totalWeight : shortfall / blanks.length);
        given = round2(given + share);
        worked.set(l.key, share);
      });
    }
  }
  const amountOf = (l: Line) => (l.amount.trim() !== '' ? n(l.amount) : worked.get(l.key) ?? 0);

  const subtotal = round2(lines.reduce((s, l) => s + amountOf(l), 0));
  const finalLeads = !backTracking && lastEdited === 'final' && finalInput.trim() !== '';
  const discountValue = finalLeads ? round2(subtotal - n(finalInput)) : round2(n(discount));
  const final = backTracking ? round2(n(finalInput)) : finalLeads ? round2(n(finalInput)) : round2(subtotal - discountValue);

  // Profit on the lines whose cost is known, after their share of the
  // discount -- the same split the server makes.
  const costedLines = lines.filter((l) => n(l.cost) > 0);
  const totalCost = round2(costedLines.reduce((s, l) => s + n(l.cost), 0));
  const costedSales = costedLines.reduce((s, l) => s + amountOf(l), 0);
  const costedDiscount = subtotal > 0 ? (discountValue * costedSales) / subtotal : 0;
  // The levy inside the final total is owed onward, not earned.
  const goods = round2(final / (1 + levyRate / 100));
  const levy = round2(final - goods);
  const profit = round2((costedSales - costedDiscount) / (1 + levyRate / 100) - totalCost);

  const typeDiscount = (v: string) => {
    setDiscount(decimal(v));
    setLastEdited('discount');
    // Still wanted when back-tracking; otherwise the final total follows.
    if (!backTracking) setFinalInput('');
  };
  const typeFinal = (v: string) => {
    setFinalInput(decimal(v));
    setLastEdited('final');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (billNo.trim() === '') return setError('Enter the number on the paper bill.');
    for (const [i, l] of lines.entries()) {
      const label = l.name.trim() || `Line ${i + 1}`;
      if (l.name.trim() === '') return setError(`${label} needs a piece name.`);
      if (n(l.quantity) < 1) return setError(`${label} needs a quantity of at least 1.`);
      if (n(l.weightGrams) <= 0) return setError(`${label} needs its weight.`);
      if (amountOf(l) <= 0) {
        return setError(
          backTracking
            ? 'The final total and discount come to less than the amounts already typed.'
            : `${label} needs its amount — or type the final total and discount, and it is worked out.`,
        );
      }
    }
    if (discountValue < 0) return setError('The final total is more than the lines add up to.');
    if (discountValue > subtotal) return setError('The discount is larger than the bill.');

    setSaving(true);
    try {
      const invoice = await apiPost('/invoices/old', {
        billNo: billNo.trim(),
        date,
        customer: buyerName.trim() ? { name: buyerName.trim(), phone: buyerPhone.trim() || null } : undefined,
        location: location.trim() || null,
        silverRatePerGram: rateValue || null,
        paymentMethod: method,
        paid,
        discount: discountValue || undefined,
        items: lines.map((l) => ({
          name: l.name.trim(),
          category: l.category,
          quantity: Math.floor(n(l.quantity)),
          weightGrams: n(l.weightGrams),
          amount: amountOf(l),
          costAmount: n(l.cost) > 0 ? n(l.cost) : null,
        })),
      });
      setSaved({ id: invoice.id, invoiceNo: invoice.invoiceNo, total: invoice.totalAmount });
      // Ready for the next bill in the stack. The date stays: they run in order.
      setBillNo('');
      setBuyerName('');
      setBuyerPhone('');
      setLocation('');
      setLines([emptyLine(Date.now())]);
      setDiscount('');
      setFinalInput('');
      setLastEdited('discount');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this bill.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-[1100px] pb-28 md:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-neutral-500">
            <Link to="/admin/invoices" className="hover:underline">Sales</Link> / Old bills
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Log an old bill</h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            A sale from before this system, typed from the paper bill. It keeps the bill’s own number.
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <button type="button" onClick={() => navigate('/admin/invoices')} className={BUTTON.secondary}>Done</button>
          <button type="submit" disabled={saving} className={BUTTON.primary}>{saving ? 'Saving…' : 'Save old bill'}</button>
        </div>
      </header>

      {saved && (
        <div className="mb-5 px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800 flex flex-wrap items-center justify-between gap-2">
          <span>
            Saved <span className="font-mono font-semibold">{saved.invoiceNo}</span> · {money(saved.total)}. Ready for the next one.
          </span>
          <Link to={`/admin/invoices/${saved.id}`} className="underline underline-offset-2 font-medium">View it</Link>
        </div>
      )}
      {error && <div className="mb-5"><ErrorNote>{error}</ErrorNote></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHead title="The bill" />
            <div className="px-4 sm:px-5 py-4 grid grid-cols-2 gap-3 sm:gap-4">
              <label className="block">
                <span className="text-sm text-neutral-600">Bill number</span>
                <input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="0042" className={`${INPUT} font-mono`} />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Date</span>
                <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value || todayLocal())} className={INPUT} />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Buyer</span>
                <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="If written" className={INPUT} />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-600">Phone</span>
                <input inputMode="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="If written" className={INPUT} />
              </label>
              <label className="block col-span-2">
                <span className="text-sm text-neutral-600">Location</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Tole, city" className={INPUT} />
              </label>
              <p className="col-span-2 text-xs text-neutral-400 -mt-1">No buyer on the bill? It is saved under “Walk-in customer”.</p>
              <label className="block col-span-2 pt-3 border-t border-neutral-100">
                <span className="text-sm text-neutral-600">Silver rate that day (/g)</span>
                <input inputMode="decimal" value={rate} onChange={(e) => { setRate(decimal(e.target.value)); setRateFrom(null); }}
                  placeholder={rateLoading ? 'Looking it up…' : 'Type it in'} className={NUM} />
                <span className="text-xs text-neutral-400 mt-1 block">
                  {rateLoading
                    ? 'Looking up the rate for this date…'
                    : rateFrom?.source === 'shop'
                      ? 'Your own rate on this date.'
                      : rateFrom?.source === 'fenegosida'
                        ? rateFrom.day === date
                          ? 'FENEGOSIDA’s published rate for this date.'
                          : `No rate was published that day, so this is FENEGOSIDA’s rate from ${rateFrom.day}.`
                        : rate
                          ? 'Typed in by you.'
                          : 'No rate found for this date. Type it in if you know it — it is optional.'}
                </span>
              </label>
            </div>
          </Card>

          <Card>
            <CardHead
              title="What was sold"
              right={<span className="font-mono tabular-nums text-sm text-neutral-500">{lines.length} line{lines.length === 1 ? '' : 's'}</span>}
            />
            <ul className="divide-y divide-neutral-100">
              {lines.map((l, index) => (
                <li key={l.key} className="px-4 sm:px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Line {index + 1}</span>
                    {lines.length > 1 && (
                      <button type="button" onClick={() => setLines(lines.filter((x) => x.key !== l.key))}
                        className="text-sm text-neutral-500 underline underline-offset-2">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <label className="block col-span-2 sm:col-span-4">
                      <span className="text-sm text-neutral-600">Piece name</span>
                      <input value={l.name} onChange={(e) => set(l.key, { name: e.target.value })} placeholder="Moon Ring" className={INPUT} />
                    </label>
                    <label className="block col-span-2 sm:col-span-2">
                      <span className="text-sm text-neutral-600">Category</span>
                      <select value={l.category} onChange={(e) => set(l.key, { category: e.target.value })} className={`${INPUT} capitalize`}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="block sm:col-span-1">
                      <span className="text-sm text-neutral-600">Qty</span>
                      <input inputMode="numeric" value={l.quantity} onChange={(e) => set(l.key, { quantity: e.target.value.replace(/\D/g, '') })} className={NUM} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-sm text-neutral-600">Weight (g)</span>
                      <input inputMode="decimal" value={l.weightGrams} onChange={(e) => set(l.key, { weightGrams: decimal(e.target.value) })} className={NUM} />
                    </label>
                    <label className="block col-span-2 sm:col-span-3">
                      <span className="text-sm text-neutral-600">Amount</span>
                      <input inputMode="decimal" value={l.amount} onChange={(e) => set(l.key, { amount: decimal(e.target.value) })}
                        placeholder={worked.has(l.key) ? String(worked.get(l.key)) : 'As on the bill'}
                        className={`${NUM} ${worked.has(l.key) ? 'placeholder:text-emerald-700' : ''}`} />
                      {worked.has(l.key) && (
                        <span className="text-xs text-emerald-700 mt-1 block">
                          Worked out from the final total and discount{blanks.length > 1 ? ', shared by weight' : ''}. Type to change it.
                        </span>
                      )}
                      {rateValue > 0 && n(l.weightGrams) > 0 && (
                        <span className="text-xs text-neutral-400 mt-1 block">
                          Silver in it: {money(round2(n(l.weightGrams) * rateValue))} at {money(rateValue)}/g
                        </span>
                      )}
                    </label>
                    <label className="block col-span-2 sm:col-span-3">
                      <span className="text-sm text-neutral-600">What we paid <span className="text-neutral-400">(optional)</span></span>
                      <input inputMode="decimal" value={l.cost} onChange={(e) => set(l.key, { cost: decimal(e.target.value) })}
                        placeholder="Our cost for this" className={NUM} />
                      {n(l.cost) > 0 && amountOf(l) > 0 && (
                        <span className={`text-xs mt-1 block ${amountOf(l) - n(l.cost) < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                          Profit before discount: {money(round2(amountOf(l) - n(l.cost)))}
                        </span>
                      )}
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 sm:px-5 py-4 border-t border-neutral-100">
              <button type="button" onClick={() => setLines([...lines, emptyLine(Date.now())])} className={`${BUTTON.secondary} w-full sm:w-auto`}>
                + Add another line
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHead title="Total" />
            <div className="px-4 sm:px-5 py-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-600">Total of the lines</span>
                <span className="font-mono tabular-nums text-neutral-900">{money(subtotal)}</span>
              </div>
              <label className="flex items-center justify-between gap-3">
                <span className="text-neutral-600">Discount</span>
                <input inputMode="decimal" value={finalLeads ? String(discountValue) : discount} onChange={(e) => typeDiscount(e.target.value)} placeholder="0"
                  className="w-32 px-3 py-2 rounded-lg border border-neutral-200 text-base sm:text-sm text-right font-mono tabular-nums" />
              </label>
              <label className="block pt-3 border-t border-neutral-100">
                <span className="text-sm font-medium text-neutral-900">Final total paid</span>
                <input inputMode="decimal" value={backTracking || finalLeads ? finalInput : subtotal > 0 ? String(final) : ''} onChange={(e) => typeFinal(e.target.value)} placeholder="0"
                  className="mt-1 w-full px-3 py-3 rounded-lg border border-neutral-200 text-2xl font-semibold text-right font-mono tabular-nums" />
                <span className="text-xs text-neutral-400 mt-1 block">
                  Type the discount or the final total and the other works itself out. Leave a line’s amount empty and it is worked out from these two.
                </span>
              </label>
              {levyRate > 0 && final > 0 && (
                <div className="rounded-lg bg-neutral-50 px-3 py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-600">Jewellery</span>
                    <span className="font-mono tabular-nums text-neutral-900">{money(goods)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-600">Skill promotion levy ({levyRate}%)</span>
                    <span className="font-mono tabular-nums text-neutral-900">{money(levy)}</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Taken out of the final total, not added to it, so the total stays what the bill says.
                  </p>
                </div>
              )}
              {costedLines.length > 0 && (
                <div className="pt-3 border-t border-neutral-100 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-600">What we paid</span>
                    <span className="font-mono tabular-nums text-neutral-900">{money(totalCost)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-neutral-900">Our profit</span>
                    <span className={`font-mono tabular-nums font-semibold ${profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{money(profit)}</span>
                  </div>
                  {costedLines.length < lines.length && (
                    <p className="text-xs text-neutral-400">
                      Only the {costedLines.length} line{costedLines.length === 1 ? '' : 's'} with a cost. The others show no margin.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHead title="Payment" />
            <div className="px-4 sm:px-5 py-4 space-y-3">
              <label className="block">
                <span className="text-sm text-neutral-600">Paid by</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={INPUT}>
                  {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>
              <label className="flex items-start gap-2.5 text-sm text-neutral-700">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="mt-0.5 w-4 h-4" />
                <span>
                  Paid in full on the bill date
                  <span className="block text-xs text-neutral-400">Untick if the buyer still owes it.</span>
                </span>
              </label>
            </div>
          </Card>

          <Card>
            <CardHead title="On save" />
            <p className="px-4 sm:px-5 py-4 text-sm text-neutral-600">
              Each line is added to Jewellery as already sold, with what you paid as its cost price. A line with no cost
              is saved without one and shows no margin. The sale is saved under bill number <span className="font-mono">{billNo.trim() || '…'}</span>, with the payment on the same date.
            </p>
          </Card>
        </div>
      </div>

      <div className="md:hidden admin-phone-actions fixed inset-x-0 bottom-0 p-4 bg-neutral-50/95 backdrop-blur border-t border-neutral-200 flex gap-3">
        <button type="button" onClick={() => navigate('/admin/invoices')} className={BUTTON.secondary}>Done</button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-3.5 rounded-xl bg-neutral-900 text-white text-[15px] font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : `Save old bill · ${money(final)}`}
        </button>
      </div>
    </form>
  );
}
