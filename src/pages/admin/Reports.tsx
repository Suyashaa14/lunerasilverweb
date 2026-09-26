import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiDownload, apiGet } from '../../api/client';
import { BUTTON, Card, CardHead, ErrorNote, Loading, PageHeader, StatusPill, TableWrap } from '../../components/admin/ui';
import { money, num } from '../../components/admin/format';

type ReportKey =
  | 'profit-and-loss' | 'balance-sheet' | 'trial-balance'
  | 'aged-receivables' | 'aged-payables' | 'stock-valuation'
  | 'sales-register' | 'purchase-register' | 'vat-return';

const REPORTS: { key: ReportKey; label: string; csv: boolean }[] = [
  { key: 'profit-and-loss', label: 'Profit and loss', csv: true },
  { key: 'balance-sheet', label: 'Balance sheet', csv: false },
  { key: 'trial-balance', label: 'Trial balance', csv: true },
  { key: 'aged-receivables', label: 'Who owes you', csv: true },
  { key: 'aged-payables', label: 'Who you owe', csv: false },
  { key: 'stock-valuation', label: 'Stock at cost', csv: true },
  { key: 'sales-register', label: 'Sales register', csv: true },
  { key: 'purchase-register', label: 'Purchase register', csv: true },
  { key: 'vat-return', label: 'VAT return', csv: false },
];

const Row = ({ label, value, bold, tone, indent }: {
  label: string; value: string; bold?: boolean; tone?: 'good' | 'bad'; indent?: boolean;
}) => (
  <div className={`flex justify-between gap-4 ${bold ? 'pt-2 border-t border-neutral-100 font-semibold text-base' : 'text-sm'}`}>
    <span className={bold ? '' : `text-neutral-${indent ? '500' : '600'} ${indent ? 'pl-4' : ''}`}>{label}</span>
    <span className={`font-mono tabular-nums ${tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : ''}`}>{value}</span>
  </div>
);

const BUCKETS: { key: string; label: string }[] = [
  { key: 'current', label: 'Current' },
  { key: 'd31_60', label: '31–60 days' },
  { key: 'd61_90', label: '61–90 days' },
  { key: 'over90', label: 'Over 90 days' },
];

export function Reports() {
  const [report, setReport] = useState<ReportKey>('profit-and-loss');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p.toString() ? `?${p}` : '';
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/reports/${report}${query()}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this report.'))
      .finally(() => setLoading(false));
  }, [report, query]);

  const download = async () => {
    const separator = query() ? '&' : '?';
    try {
      await apiDownload(`/reports/${report}${query()}${separator}format=csv`, `${report}.csv`);
    } catch {
      setError('Could not download the file.');
    }
  };

  const current = REPORTS.find((r) => r.key === report)!;

  return (
    <div className="max-w-[1100px]">
      <PageHeader
        title="Reports"
        subtitle="Every figure is read from the ledger, so no two reports can disagree."
        actions={current.csv ? <button onClick={download} className={BUTTON.secondary}>Download CSV</button> : undefined}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap gap-2 mb-4">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setReport(r.key)}
            className={`px-3.5 py-2 rounded-lg border text-sm transition ${
              report === r.key ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <label className="block">
          <span className="text-xs text-neutral-500">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 block px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm" />
        </label>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }} className="text-sm text-neutral-500 underline underline-offset-2 pb-2">
            Clear — show everything
          </button>
        )}
      </div>

      {loading || !data ? <Loading /> : (
        <>
          {report === 'profit-and-loss' && (
            <Card>
              <CardHead title="Profit and loss" right={<span className="text-xs text-neutral-400">Gross margin {data.grossMarginPercent}%</span>} />
              <div className="px-5 py-4 space-y-2">
                {data.income.map((l: any) => <Row key={l.code} label={l.name} value={money(l.amount)} indent />)}
                <Row label="Total income" value={money(data.totalIncome)} />
                {data.costOfSales.map((l: any) => <Row key={l.code} label={l.name} value={`−${money(l.amount)}`} indent />)}
                <Row label="Gross profit" value={money(data.grossProfit)} bold />
                <div className="pt-3" />
                {data.expenses.map((l: any) => <Row key={l.code} label={l.name} value={`−${money(l.amount)}`} indent />)}
                <Row label="Net profit" value={money(data.netProfit)} bold tone={data.netProfit >= 0 ? 'good' : 'bad'} />
              </div>
            </Card>
          )}

          {report === 'balance-sheet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <CardHead title="What you have" />
                <div className="px-5 py-4 space-y-2">
                  {data.assets.map((l: any) => <Row key={l.code} label={l.name} value={money(l.amount)} indent />)}
                  <Row label="Total assets" value={money(data.totalAssets)} bold />
                </div>
              </Card>
              <Card>
                <CardHead
                  title="Where it came from"
                  right={data.balances
                    ? <StatusPill status="balances" />
                    : <span className="text-xs text-red-700">off by {money(data.difference)}</span>}
                />
                <div className="px-5 py-4 space-y-2">
                  {data.liabilities.map((l: any) => <Row key={l.code} label={l.name} value={money(l.amount)} indent />)}
                  {data.equity.map((l: any) => <Row key={l.code} label={l.name} value={money(l.amount)} indent />)}
                  <Row label="Profit for the period" value={money(data.profitForPeriod)} indent />
                  <Row label="Total" value={money(data.totalFunding)} bold />
                </div>
              </Card>
            </div>
          )}

          {report === 'trial-balance' && (
            <Card>
              <CardHead
                title="Trial balance"
                right={data.balances
                  ? <span className="text-xs text-emerald-700">debits equal credits</span>
                  : <span className="text-xs text-red-700">out by {money(data.totalDebit - data.totalCredit)}</span>}
              />
              <TableWrap minWidth={640}>
<table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                    <th className="text-left font-medium px-5 py-3">Account</th>
                    <th className="text-right font-medium px-5 py-3">Debit</th>
                    <th className="text-right font-medium px-5 py-3">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.rows.map((r: any) => (
                    <tr key={r.code}>
                      <td className="px-5 py-2.5"><span className="font-mono tabular-nums text-neutral-400 mr-2">{r.code}</span>{r.name}</td>
                      <td className="px-5 py-2.5 text-right font-mono tabular-nums">{r.debit ? money(r.debit) : '—'}</td>
                      <td className="px-5 py-2.5 text-right font-mono tabular-nums">{r.credit ? money(r.credit) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-neutral-50">
                    <td className="px-5 py-3">Total</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{money(data.totalDebit)}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{money(data.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
</TableWrap>
            </Card>
          )}

          {(report === 'aged-receivables' || report === 'aged-payables') && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                {BUCKETS.map((b) => (
                  <Card key={b.key} className={`px-4 py-3.5 ${b.key === 'over90' && data.buckets[b.key] > 0 ? 'bg-red-50/50' : ''}`}>
                    <div className="text-xs text-neutral-500">{b.label}</div>
                    <div className={`font-mono tabular-nums text-xl font-semibold mt-1 ${b.key === 'over90' && data.buckets[b.key] > 0 ? 'text-red-700' : ''}`}>
                      {num(data.buckets[b.key])}
                    </div>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHead title={report === 'aged-receivables' ? 'Unpaid invoices' : 'Unpaid supplier bills'}
                  right={<span className="font-mono tabular-nums text-sm">{num(data.total)} total</span>} />
                {data.items.length === 0 ? (
                  <div className="px-5 py-10 text-sm text-neutral-400 text-center">Nothing outstanding.</div>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {data.items.map((i: any) => (
                      <li key={i.invoiceId ?? i.purchaseId} className="flex items-center justify-between gap-4 px-5 py-3">
                        <div>
                          <span className="font-mono tabular-nums">{i.invoiceNo ?? i.billNo}</span>
                          <span className="text-neutral-500 ml-2 text-sm">{i.customer ?? i.supplier}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-neutral-400 font-mono tabular-nums">{i.daysOutstanding}d</span>
                          <span className="font-mono tabular-nums font-semibold">{num(i.outstanding)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {report === 'stock-valuation' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <Card className="px-4 py-3.5"><div className="text-xs text-neutral-500">Pieces</div><div className="font-mono tabular-nums text-xl font-semibold mt-1">{data.pieces}</div></Card>
                <Card className="px-4 py-3.5"><div className="text-xs text-neutral-500">Silver</div><div className="font-mono tabular-nums text-xl font-semibold mt-1">{data.silverGrams} g</div></Card>
                <Card className="px-4 py-3.5"><div className="text-xs text-neutral-500">At cost</div><div className="font-mono tabular-nums text-xl font-semibold mt-1">{num(data.totalCost)}</div></Card>
                <Card className={`px-4 py-3.5 ${data.piecesWithoutCost > 0 ? 'bg-amber-50/60' : ''}`}>
                  <div className="text-xs text-neutral-500">No cost price</div>
                  <div className={`font-mono tabular-nums text-xl font-semibold mt-1 ${data.piecesWithoutCost > 0 ? 'text-amber-700' : ''}`}>{data.piecesWithoutCost}</div>
                </Card>
              </div>
              {data.piecesWithoutCost > 0 && (
                <p className="text-sm text-neutral-500 mb-5">
                  {data.piecesWithoutCost} piece{data.piecesWithoutCost === 1 ? '' : 's'} arrived without a purchase bill, so
                  {data.piecesWithoutCost === 1 ? ' it is' : ' they are'} not counted in the figure above. The real stock is worth more than it says.
                </p>
              )}
              <Card>
                <CardHead title="By category" />
                <ul className="divide-y divide-neutral-100">
                  {data.byCategory.map((c: any) => (
                    <li key={c.category} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                      <span className="capitalize">{c.category}</span>
                      <span className="flex gap-6 font-mono tabular-nums">
                        <span className="text-neutral-500">{c.pieces} pcs</span>
                        <span className="text-neutral-500">{c.grams} g</span>
                        <span className="font-semibold">{num(c.cost)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}

          {(report === 'sales-register' || report === 'purchase-register') && (
            <Card>
              <CardHead title={current.label}
                right={<span className="font-mono tabular-nums text-sm">{num(data.total)} total</span>} />
              {data.rows.length === 0 ? (
                <div className="px-5 py-10 text-sm text-neutral-400 text-center">Nothing in this period.</div>
              ) : (
                <TableWrap minWidth={640}>
<table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                      <th className="text-left font-medium px-5 py-3">{report === 'sales-register' ? 'Invoice' : 'Bill'}</th>
                      <th className="text-left font-medium px-5 py-3">Date (BS)</th>
                      <th className="text-left font-medium px-5 py-3">{report === 'sales-register' ? 'Buyer' : 'Supplier'}</th>
                      <th className="text-right font-medium px-5 py-3">Taxable</th>
                      <th className="text-right font-medium px-5 py-3">VAT</th>
                      <th className="text-right font-medium px-5 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.rows.map((r: any, i: number) => (
                      <tr key={i} className={r.isVoid ? 'text-neutral-400' : ''}>
                        <td className="px-5 py-2.5 font-mono tabular-nums">{r.invoiceNo ?? r.billNo}{r.isVoid && ' (void)'}</td>
                        <td className="px-5 py-2.5 font-mono tabular-nums text-neutral-600">{r.dateBs}</td>
                        <td className="px-5 py-2.5">{r.buyer ?? r.supplier}</td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums">{money(r.taxable)}</td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums text-neutral-500">{money(r.vat)}</td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums font-semibold">{money(r.total)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-neutral-50">
                      <td className="px-5 py-3" colSpan={3}>Total</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">{money(data.totalTaxable)}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">{money(data.totalVat)}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">{money(data.total)}</td>
                    </tr>
                  </tbody>
                </table>
</TableWrap>
              )}
            </Card>
          )}

          {report === 'vat-return' && (
            <Card>
              <CardHead title="VAT return" right={<StatusPill status={data.isVatRegistered ? 'registered' : 'PAN only'} />} />
              {data.note && <p className="px-5 py-3 text-sm text-neutral-600 border-b border-neutral-100">{data.note}</p>}
              <div className="px-5 py-4 space-y-2">
                <Row label="VAT charged on sales" value={money(data.outputVat)} indent />
                <Row label="VAT reclaimable on purchases" value={money(data.inputVat)} indent />
                <Row label={data.netPayable >= 0 ? 'Owed to the tax office' : 'Reclaimable'} value={money(Math.abs(data.netPayable))} bold />
                {!data.isVatRegistered && data.vatPaidNotReclaimable > 0 && (
                  <p className="text-sm text-neutral-500 pt-3">
                    You paid <span className="font-mono tabular-nums">{money(data.vatPaidNotReclaimable)}</span> of VAT to suppliers
                    this period. On PAN registration none of it comes back — it is recorded as part of what the stock cost you.
                  </p>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
