import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { apiGet } from '../../api/client';

interface SalesSummary {
  count: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
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

interface SalesCategoryPoint {
  category: string;
  count: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface SalesProductPoint {
  name: string;
  count: number;
  revenue: number;
  profit: number;
  avgPrice: number;
}

interface Jewelry {
  status: 'available' | 'sold';
  price: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatMonth = (month: string) => {
  const [y, m] = month.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5">
      <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ProductTable({ title, rows, metric }: { title: string; rows: SalesProductPoint[]; metric: 'count' | 'profit' }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5">
      <div className="text-sm font-semibold mb-4">{title}</div>
      {rows.length === 0 ? (
        <div className="text-neutral-400 text-sm">No sales recorded yet.</div>
      ) : (
        <div className="space-y-1">
          {rows.map((p, i) => (
            <div key={p.name} className="flex items-center justify-between py-2 border-t border-neutral-100 first:border-t-0 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-neutral-400 w-4 shrink-0">{i + 1}</span>
                <span className="font-medium truncate">{p.name}</span>
              </div>
              <div className="text-right shrink-0 pl-3">
                {metric === 'count' ? (
                  <span className="text-neutral-700">{p.count} sold</span>
                ) : (
                  <span className={p.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}>Rs {p.profit.toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [monthly, setMonthly] = useState<{ label: string; revenue: number; expenses: number; profit: number }[] | null>(null);
  const [byCategory, setByCategory] = useState<SalesCategoryPoint[] | null>(null);
  const [byProduct, setByProduct] = useState<SalesProductPoint[] | null>(null);
  const [inventoryValue, setInventoryValue] = useState<number | null>(null);

  useEffect(() => {
    apiGet('/sales/summary').then(setSalesSummary);
    apiGet('/sales/by-category').then(setByCategory);
    apiGet('/sales/by-product').then(setByProduct);
    apiGet('/jewelries?status=available&pageSize=200').then((res: { data: Jewelry[] }) => {
      setInventoryValue(res.data.reduce((sum, j) => sum + j.price, 0));
    });

    Promise.all([apiGet('/sales/monthly'), apiGet('/expenses/monthly')]).then(
      ([salesMonthly, expensesMonthly]: [SalesMonthlyPoint[], ExpensesMonthlyPoint[]]) => {
        const byMonth = new Map<string, { revenue: number; cost: number; profit: number; expenses: number }>();
        salesMonthly.forEach((p) => byMonth.set(p.month, { revenue: p.revenue, cost: p.cost, profit: p.profit, expenses: 0 }));
        expensesMonthly.forEach((p) => {
          const existing = byMonth.get(p.month) ?? { revenue: 0, cost: 0, profit: 0, expenses: 0 };
          existing.expenses = p.amount;
          byMonth.set(p.month, existing);
        });
        const points = Array.from(byMonth.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, v]) => ({
            label: formatMonth(month),
            revenue: v.revenue,
            expenses: v.expenses,
            profit: v.profit - v.expenses,
          }));
        setMonthly(points);
      },
    );
  }, []);

  const avgSellingPrice = salesSummary && salesSummary.count > 0 ? salesSummary.totalRevenue / salesSummary.count : 0;
  const profitMargin = salesSummary && salesSummary.totalRevenue > 0 ? (salesSummary.totalProfit / salesSummary.totalRevenue) * 100 : 0;

  const bestSelling = byProduct ? [...byProduct].sort((a, b) => b.count - a.count).slice(0, 5) : [];
  const mostProfitable = byProduct ? [...byProduct].sort((a, b) => b.profit - a.profit).slice(0, 5) : [];

  const categoryChartData = byCategory
    ? byCategory.map((c) => ({ ...c, label: c.category.charAt(0).toUpperCase() + c.category.slice(1) }))
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Analytics</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatTile label="Average selling price" value={salesSummary ? `Rs ${Math.round(avgSellingPrice).toLocaleString()}` : '—'} />
        <StatTile label="Profit margin" value={salesSummary ? `${profitMargin.toFixed(1)}%` : '—'} />
        <StatTile label="Inventory value" value={inventoryValue !== null ? `Rs ${inventoryValue.toLocaleString()}` : '—'} />
        <StatTile label="Items sold" value={salesSummary ? String(salesSummary.count) : '—'} />
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-5 mb-8">
        <div className="text-sm font-semibold mb-1">Sales, expenses &amp; profit</div>
        <div className="text-xs text-neutral-400 mb-4">By month, all time</div>
        {monthly === null ? (
          <div className="text-neutral-400 text-sm">Loading…</div>
        ) : monthly.length === 0 ? (
          <div className="text-neutral-400 text-sm">No data recorded yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e1e0d9" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#898781', fontSize: 12 }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
              <YAxis
                tick={{ fill: '#898781', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(v: number) => `${v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                formatter={((value: any, name: any) => [`Rs ${Number(value ?? 0).toLocaleString()}`, name]) as any}
                contentStyle={{ fontSize: 12, borderColor: '#e1e0d9' }}
              />
              <Legend formatter={(value: string) => <span style={{ color: '#52514e', fontSize: 12 }}>{value}</span>} />
              <Bar dataKey="revenue" name="Sales" fill="#2a78d6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#eb6834" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#1baf7a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-5 mb-8">
        <div className="text-sm font-semibold mb-1">Sales by category</div>
        <div className="text-xs text-neutral-400 mb-4">All time</div>
        {byCategory === null ? (
          <div className="text-neutral-400 text-sm">Loading…</div>
        ) : byCategory.length === 0 ? (
          <div className="text-neutral-400 text-sm">No sales recorded yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryChartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#e1e0d9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#898781', fontSize: 12 }}
                axisLine={{ stroke: '#c3c2b7' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <YAxis dataKey="label" type="category" tick={{ fill: '#52514e', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                formatter={((value: any) => [`Rs ${Number(value ?? 0).toLocaleString()}`, 'Revenue']) as any}
                contentStyle={{ fontSize: 12, borderColor: '#e1e0d9' }}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#2a78d6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProductTable title="Best-selling products" rows={bestSelling} metric="count" />
        <ProductTable title="Most profitable products" rows={mostProfitable} metric="profit" />
      </div>
    </div>
  );
}
