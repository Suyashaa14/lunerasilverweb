import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, LabelList,
} from 'recharts';
import { apiGet } from '../../api/client';
import { AlertsBell } from './AlertsBell';

type PeriodKey = 'month' | 'quarter' | 'year';

interface Overview {
  business: { name: string };
  period: { key: PeriodKey; from: string; to: string; label: string; shortLabel: string };
  counter: {
    saleCount: number; expenseCount: number;
    revenue: number; cost: number; grossProfit: number; expenses: number; netProfit: number;
  };
  expensesByCategory: { category: string; amount: number }[];
  netProfitTrend: { month: string; netProfit: number }[];
  store: {
    orderRevenue: number; makingCharges: number; silverSoldGrams: number; totalOrders: number;
    silverInStockGrams: number; piecesListed: number; ordersByStatus: Record<string, number>;
  };
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'good';
  message: string;
  detail: string;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (month: string) => MONTH_SHORT[Number(month.split('-')[1]) - 1] ?? month;
const num = (v: number) => Math.round(v).toLocaleString();

// Severity drives the dot only; the text carries the meaning, so the colours
// stay muted rather than turning the panel into a traffic light.
const DOT: Record<Alert['severity'], string> = {
  critical: 'bg-red-600',
  warning: 'bg-amber-500',
  info: 'bg-neutral-400',
  good: 'bg-emerald-600',
};

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
];

function Figure({ value, unit, tone }: { value: string; unit?: string; tone?: 'good' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-neutral-900';
  return (
    <div className={`font-mono tabular-nums text-3xl font-medium tracking-tight ${toneClass}`}>
      {value}
      {unit && <span className="text-xl text-neutral-400 ml-1">{unit}</span>}
    </div>
  );
}

function StatCell({ label, value, note, unit, tone, tinted }: {
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

function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-[15px] text-neutral-600">{label}</span>
      <span className="font-mono tabular-nums text-[15px] font-semibold text-neutral-900">{value}</span>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-neutral-200 rounded-xl ${className}`}>{children}</div>;
}

function CardHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-6 py-4 border-b border-neutral-100">
      <h2 className="text-[15px] font-semibold text-neutral-900">{title}</h2>
      {right}
    </div>
  );
}

export function DashboardHome() {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    apiGet(`/dashboard/overview?period=${period}`).then(setOverview);
  }, [period]);

  useEffect(() => {
    apiGet('/dashboard/alerts').then(setAlerts).catch(() => setAlerts([]));
  }, []);

  if (!overview) return <div className="text-neutral-500">Loading…</div>;

  const { counter, store, expensesByCategory, netProfitTrend } = overview;
  const costShare = counter.revenue > 0 ? Math.round((counter.cost / counter.revenue) * 100) : 0;
  const topCategories = expensesByCategory.map((c) => c.category).slice(0, 2).join(', ');
  const expensesTotal = expensesByCategory.reduce((sum, c) => sum + c.amount, 0);

  const trend = netProfitTrend.map((p) => ({ ...p, label: monthLabel(p.month) }));
  const last = trend[trend.length - 1];
  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 4);

  const completedOrders = store.ordersByStatus.completed ?? 0;

  return (
    <div className="max-w-[1400px]">
      {/* ---------- mobile ---------- */}
      <div className="md:hidden pb-24">
        <header className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Dashboard</h1>
            <p className="text-[15px] text-neutral-500 mt-1">{overview.period.shortLabel}</p>
          </div>
          <AlertsBell variant="boxed" />
        </header>

        <Card className="px-5 py-5 mb-4">
          <div className="text-[15px] text-neutral-500">Net profit, this month</div>
          <div
            className={`font-mono tabular-nums text-[52px] leading-[1.1] font-semibold tracking-tight my-1 ${
              counter.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {num(counter.netProfit)}
          </div>
          <div className="text-[15px] text-neutral-500">
            {num(counter.grossProfit)} gross profit – {num(counter.expenses)} expenses
          </div>
        </Card>

        <Card className="mb-4 divide-y divide-neutral-100">
          <LedgerRow label="Revenue" value={num(counter.revenue)} />
          <LedgerRow label="Cost of silver" value={num(counter.cost)} />
          <LedgerRow label="Expenses" value={num(counter.expenses)} />
          <LedgerRow label="Sales recorded" value={String(counter.saleCount)} />
        </Card>

        <Card className="mb-4">
          <div className="flex items-baseline justify-between gap-4 px-5 py-4 border-b border-neutral-100">
            <h2 className="text-[15px] font-semibold">Needs attention</h2>
            {alerts.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllAlerts((v) => !v)}
                className="text-sm text-neutral-500 underline underline-offset-2"
              >
                {showAllAlerts ? 'Fewer' : `All ${alerts.length}`}
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="px-5 py-6 text-sm text-neutral-400 text-center">Nothing to flag right now.</div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {(showAllAlerts ? alerts : alerts.slice(0, 3)).map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-4">
                  <span className={`mt-[7px] w-2 h-2 rounded-full shrink-0 ${DOT[a.severity]}`} />
                  <span className="text-[15px] text-neutral-900 leading-snug">{a.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex items-center justify-between gap-4 px-5 py-4">
          <h2 className="text-[15px] font-semibold">Online store</h2>
          <span className="text-[15px] text-neutral-500 text-right">
            {completedOrders === 0
              ? 'No completed orders yet'
              : `${num(store.orderRevenue)} from ${completedOrders} order${completedOrders === 1 ? '' : 's'}`}
          </span>
        </Card>

        {/* Kept in reach of the thumb rather than at the end of the scroll. */}
        <div className="fixed inset-x-0 bottom-0 p-4 bg-neutral-50/95 backdrop-blur border-t border-neutral-200">
          <Link
            to="/admin/sales/new"
            className="block w-full text-center px-4 py-4 rounded-xl bg-neutral-900 text-white text-[17px] font-semibold"
          >
            Record a sale
          </Link>
        </div>
      </div>

      {/* ---------- desktop ---------- */}
      <div className="hidden md:block">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            {overview.business.name} · {overview.period.label}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`px-5 py-2 text-sm font-medium rounded-md transition ${
                  period === p.key ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Desktop only: the mobile top bar already carries a bell. */}
          <div className="hidden md:block">
            <AlertsBell />
          </div>
        </div>
      </header>

      <Card className="mb-5">
        <CardHead
          title="Shop counter"
          right={
            <span className="text-xs text-neutral-400 text-right">
              Recorded sales and expenses · {counter.saleCount} sale{counter.saleCount === 1 ? '' : 's'},{' '}
              {counter.expenseCount} expense{counter.expenseCount === 1 ? '' : 's'}
            </span>
          }
        />
        <div className="flex flex-wrap divide-x divide-neutral-100">
          <StatCell label="Revenue" value={num(counter.revenue)} note="Rupees" />
          <StatCell label="Cost of silver" value={num(counter.cost)} note={`${costShare}% of revenue`} />
          <StatCell label="Gross profit" value={num(counter.grossProfit)} note="Before expenses" />
          <StatCell label="Expenses" value={num(counter.expenses)} note={topCategories || 'None recorded'} />
          <StatCell
            label="Net profit"
            value={num(counter.netProfit)}
            note="Gross profit – expenses"
            tone={counter.netProfit >= 0 ? 'good' : 'bad'}
            tinted
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card className="lg:col-span-2">
          <CardHead
            title="Net profit by month"
            right={
              last && last.netProfit < 0 ? (
                <span className="text-sm text-red-600">{monthLabel(last.month)} is running at a loss</span>
              ) : undefined
            }
          />
          <div className="px-3 py-5">
            {trend.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-neutral-400">
                No sales or expenses recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trend} margin={{ top: 28, right: 32, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke="#f0efec" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#898781', fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fill: '#898781', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <ReferenceLine y={0} stroke="#d6d5cf" />
                  <Line
                    type="linear"
                    dataKey="netProfit"
                    stroke="#1c1c1a"
                    strokeWidth={1.75}
                    isAnimationActive={false}
                    dot={(props: any) => {
                      const negative = props.payload.netProfit < 0;
                      return (
                        <circle
                          key={props.payload.month}
                          cx={props.cx}
                          cy={props.cy}
                          r={4.5}
                          fill={negative ? '#c0392b' : '#1c1c1a'}
                        />
                      );
                    }}
                  >
                    <LabelList
                      dataKey="netProfit"
                      position="top"
                      offset={12}
                      formatter={((v: number) => num(v)) as any}
                      style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
                      fill="#1c1c1a"
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHead
            title="Needs attention"
            right={
              alerts.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setShowAllAlerts((v) => !v)}
                  className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
                >
                  {showAllAlerts ? 'Show less' : `View all ${alerts.length}`}
                </button>
              ) : undefined
            }
          />
          {visibleAlerts.length === 0 ? (
            <div className="px-6 py-10 text-sm text-neutral-400 text-center">Nothing to flag right now.</div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {visibleAlerts.map((a) => (
                <li key={a.id} className="flex gap-3 px-6 py-4">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${DOT[a.severity]}`} />
                  <div>
                    <div className="text-[15px] font-medium text-neutral-900 leading-snug">{a.message}</div>
                    <div className="text-sm text-neutral-500 mt-0.5">{a.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="flex flex-col">
          <CardHead
            title="Expenses"
            right={<span className="font-mono tabular-nums text-sm text-neutral-600">{num(counter.expenses)}</span>}
          />
          <div className="px-6 py-5 flex-1 space-y-4">
            {expensesByCategory.length === 0 ? (
              <div className="text-sm text-neutral-400">No expenses recorded in this period.</div>
            ) : (
              expensesByCategory.map((c, i) => {
                const share = expensesTotal > 0 ? (c.amount / expensesTotal) * 100 : 0;
                return (
                  <div key={c.category}>
                    <div className="flex items-baseline justify-between text-sm mb-1.5">
                      <span className="capitalize text-neutral-800">{c.category}</span>
                      <span className="font-mono tabular-nums text-neutral-600">
                        {num(c.amount)} · {Math.round(share)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${i === 0 ? 'bg-neutral-900' : 'bg-neutral-400'}`}
                        style={{ width: `${Math.max(share, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-6 pb-6 pt-2">
            <Link
              to="/admin/expenses/new"
              className="block w-full text-center px-4 py-2.5 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Record an expense
            </Link>
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          <CardHead
            title="Online store"
            right={<span className="text-xs text-neutral-400">Website orders, counted separately from counter sales</span>}
          />
          <div className="flex flex-wrap divide-x divide-neutral-100 border-b border-neutral-100">
            <StatCell label="Order revenue" value={num(store.orderRevenue)} />
            <StatCell label="Making charges" value={num(store.makingCharges)} />
            <StatCell label="Silver sold" value={num(store.silverSoldGrams)} unit="g" />
            <StatCell label="Orders" value={num(store.totalOrders)} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex gap-6 text-sm text-neutral-600">
              <span>
                Silver in stock{' '}
                <strong className="font-mono tabular-nums font-medium text-neutral-900">
                  {num(store.silverInStockGrams)}
                </strong>{' '}
                <span className="text-neutral-400">g</span>
              </span>
              <span>
                Pieces listed{' '}
                <strong className="font-mono tabular-nums font-medium text-neutral-900">{store.piecesListed}</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['pending', 'processing', 'completed', 'cancelled'].map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 rounded-md border border-neutral-200 text-sm text-neutral-600 capitalize"
                >
                  {s} <span className="font-mono tabular-nums text-neutral-900">{store.ordersByStatus[s] ?? 0}</span>
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}
