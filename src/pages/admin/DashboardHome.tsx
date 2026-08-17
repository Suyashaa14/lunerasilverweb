import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { apiGet } from '../../api/client';

interface Stats {
  totalProfit: number;
  totalRevenue: number;
  silverInStockGrams: number;
  silverSoldGrams: number;
  ordersByStatus: Record<string, number>;
  jewelriesByStatus: Record<string, number>;
  totalOrders: number;
}

interface SalesSummary {
  count: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

interface ExpensesSummary {
  count: number;
  totalAmount: number;
}

interface SalesMonthlyPoint {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface ExpensesMonthlyPoint {
  month: string;
  amount: number;
}

interface ExpensesCategoryPoint {
  category: string;
  amount: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatMonth = (month: string) => {
  const [y, m] = month.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
};

// Validated categorical palette (dataviz skill) — fixed hue order, never cycled/reassigned by value.
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const OTHER_COLOR = '#898781';

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-neutral-900';
  const bgClass = tone === 'good' ? 'bg-emerald-50' : tone === 'bad' ? 'bg-red-50' : 'bg-neutral-50';
  return (
    <div className={`px-3 py-2.5 rounded-md ${bgClass}`}>
      <div className="text-xs text-neutral-400 uppercase tracking-wide">{label}</div>
      <div className={`text-base font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

export function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);

  const [allTimeSales, setAllTimeSales] = useState<SalesSummary | null>(null);
  const [allTimeExpenses, setAllTimeExpenses] = useState<ExpensesSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<ExpensesCategoryPoint[] | null>(null);

  const [trend, setTrend] = useState<{ month: string; netProfit: number }[] | null>(null);

  useEffect(() => {
    apiGet('/dashboard/stats').then(setStats);
    apiGet('/sales/summary').then(setAllTimeSales);
    apiGet('/expenses/summary').then(setAllTimeExpenses);
    apiGet('/expenses/by-category').then(setCategoryBreakdown);

    Promise.all([apiGet('/sales/monthly'), apiGet('/expenses/monthly')]).then(
      ([salesMonthly, expensesMonthly]: [SalesMonthlyPoint[], ExpensesMonthlyPoint[]]) => {
        const byMonth = new Map<string, { profit: number; expenses: number }>();
        salesMonthly.forEach((p) => byMonth.set(p.month, { profit: p.profit, expenses: 0 }));
        expensesMonthly.forEach((p) => {
          const existing = byMonth.get(p.month) ?? { profit: 0, expenses: 0 };
          existing.expenses = p.amount;
          byMonth.set(p.month, existing);
        });
        const points = Array.from(byMonth.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, v]) => ({ month, netProfit: v.profit - v.expenses }));
        setTrend(points);
      },
    );
  }, []);

  if (!stats) return <div className="text-neutral-500">Loading…</div>;

  const cards = [
    { label: 'Total profit (making charges)', value: `Rs ${stats.totalProfit.toLocaleString()}` },
    { label: 'Total revenue (completed orders)', value: `Rs ${stats.totalRevenue.toLocaleString()}` },
    { label: 'Silver in stock', value: `${stats.silverInStockGrams.toLocaleString()} g` },
    { label: 'Silver sold (completed)', value: `${stats.silverSoldGrams.toLocaleString()} g` },
    { label: 'Total orders', value: stats.totalOrders },
    { label: 'Jewelries available', value: stats.jewelriesByStatus.available ?? 0 },
  ];

  const allTimeNetProfit = allTimeSales && allTimeExpenses
    ? allTimeSales.totalProfit - allTimeExpenses.totalAmount
    : null;

  const pieData = (() => {
    if (!categoryBreakdown || categoryBreakdown.length === 0) return [];
    const sorted = [...categoryBreakdown].sort((a, b) => b.amount - a.amount);
    const top = sorted.slice(0, 7);
    const rest = sorted.slice(7);
    const otherTotal = rest.reduce((sum, c) => sum + c.amount, 0);
    const colorOrder = [...categoryBreakdown].map((c) => c.category).sort();
    const slices = top.map((c) => ({
      category: c.category,
      amount: c.amount,
      color: CATEGORY_COLORS[colorOrder.indexOf(c.category) % CATEGORY_COLORS.length],
    }));
    if (otherTotal > 0) slices.push({ category: 'Other', amount: otherTotal, color: OTHER_COLOR });
    return slices;
  })();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="bg-white border border-neutral-200 rounded-lg p-5 mb-8">
        <div className="text-sm font-semibold mb-4">Total profit till now</div>
        {allTimeSales && allTimeExpenses ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatTile label="Revenue" value={`Rs ${allTimeSales.totalRevenue.toLocaleString()}`} />
            <StatTile label="Cost of goods" value={`Rs ${allTimeSales.totalCost.toLocaleString()}`} />
            <StatTile label="Gross profit" value={`Rs ${allTimeSales.totalProfit.toLocaleString()}`} />
            <StatTile label="Expenses" value={`Rs ${allTimeExpenses.totalAmount.toLocaleString()}`} />
            <StatTile
              label="Net profit"
              value={`Rs ${(allTimeNetProfit ?? 0).toLocaleString()}`}
              tone={(allTimeNetProfit ?? 0) >= 0 ? 'good' : 'bad'}
            />
          </div>
        ) : (
          <div className="text-neutral-400 text-sm">Loading…</div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-neutral-200 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2">{c.label}</div>
            <div className="text-2xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="text-sm font-semibold mb-1">Net profit trend</div>
          <div className="text-xs text-neutral-400 mb-4">By month, all time</div>
          {trend === null ? (
            <div className="text-neutral-400 text-sm">Loading…</div>
          ) : trend.length === 0 ? (
            <div className="text-neutral-400 text-sm">No sales recorded yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend.map((p) => ({ ...p, label: formatMonth(p.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#898781', fontSize: 12 }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                <YAxis
                  tick={{ fill: '#898781', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(v: number) => `${v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <ReferenceLine y={0} stroke="#c3c2b7" strokeDasharray="3 3" />
                <Tooltip
                  formatter={((value: any) => [`Rs ${Number(value ?? 0).toLocaleString()}`, 'Net profit']) as any}
                  contentStyle={{ fontSize: 12, borderColor: '#e1e0d9' }}
                  labelStyle={{ color: '#0b0b0b' }}
                />
                <Line type="monotone" dataKey="netProfit" name="Net profit" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3, fill: '#2a78d6' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="text-sm font-semibold mb-1">Expense breakdown</div>
          <div className="text-xs text-neutral-400 mb-4">By category, all time</div>
          {categoryBreakdown === null ? (
            <div className="text-neutral-400 text-sm">Loading…</div>
          ) : pieData.length === 0 ? (
            <div className="text-neutral-400 text-sm">No expenses recorded yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="#fcfcfb" strokeWidth={2}>
                  {pieData.map((entry) => <Cell key={entry.category} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={((value: any, name: any) => [`Rs ${Number(value ?? 0).toLocaleString()}`, name]) as any} contentStyle={{ fontSize: 12, borderColor: '#e1e0d9' }} />
                <Legend
                  verticalAlign="bottom"
                  height={48}
                  formatter={(value: string) => <span style={{ color: '#52514e', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-5">
        <div className="text-sm font-semibold mb-3">Orders by status</div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.ordersByStatus).map(([status, count]) => (
            <div key={status} className="px-3 py-2 rounded-md bg-neutral-100 text-sm">
              <span className="capitalize">{status}</span>: <strong>{count}</strong>
            </div>
          ))}
          {Object.keys(stats.ordersByStatus).length === 0 && <span className="text-neutral-400 text-sm">No orders yet</span>}
        </div>
      </div>
    </div>
  );
}
