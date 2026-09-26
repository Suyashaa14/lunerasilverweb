import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { Loading, StatusPill, TableWrap } from '../../components/admin/ui';
import { money as num } from '../../components/admin/format';

interface Movement {
  id: number; type: string; direction: 'in' | 'out';
  referenceType: string; referenceId: number | null;
  costAmount: number | null; note: string | null; createdAt: string;
}
interface Detail {
  id: number; sku: string; name: string; category: string; status: string;
  material: string; purity: string | null;
  silverWeightGrams: number; makingCharge: number;
  stoneWeightGrams: number | null; stonePrice: number | null;
  costPrice: number | null; priceToday: number | null;
  margin: number | null; marginPercent: number | null;
  daysInStock: number | null; staleDays: number;
  imageUrl: string | null;
  silverRate: { perGram: number; effectiveFrom: string | null };
  source: { supplierName: string; billNo: string; billDateBs: string; landedCost: number } | null;
  whereItAppears: { storefront: boolean; inCarts: number; openOrders: number; invoiced: number };
  movements: Movement[];
}


function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl">
      <div className="flex items-baseline justify-between gap-4 px-5 py-4 border-b border-neutral-100">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

export function JewelryDetail() {
  const { id } = useParams();
  const [p, setP] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();

  const load = useCallback(() => {
    apiGet(`/jewelries/${id}/detail`).then(setP).catch(() => setError('Could not load this piece.'));
  }, [id]);
  useEffect(load, [load]);

  const retire = async (status: string) => {
    const answer = await dialog.ask({
      title: `Mark this piece ${status}`,
      description: 'The piece stays for the history. One row is written to the stock ledger so the count still adds up.',
      confirmLabel: 'Confirm',
      tone: 'danger',
      fields: [{ name: 'reason', label: 'Reason', type: 'textarea', help: 'Kept in the stock history.' }],
    });
    if (!answer) return;
    try { await apiPost(`/jewelries/${id}/retire`, { status, reason: answer.reason }); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'That did not work.'); }
  };

  if (error) return <div className="text-red-700">{error}</div>;
  if (!p) return <Loading />;

  const onShelf = ['available', 'reserved'].includes(p.status);
  const silverValue = p.silverWeightGrams * p.silverRate.perGram;

  return (
    <div className="max-w-[1300px]">
      <Dialog request={dialog.request} onSettle={dialog.settle} />
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-neutral-500">
            <Link to="/admin/jewelries" className="hover:underline">Jewellery</Link> / {p.sku}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
            <StatusPill status={p.status} className="text-sm" />
            <span className="font-mono tabular-nums text-neutral-400">{p.sku}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onShelf && (
            <button onClick={() => retire('damaged')} className="px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium">Mark damaged</button>
          )}
          <Link to={`/admin/jewelries/${p.id}/edit`} className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold">Edit</Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-5">
        <div className="space-y-5">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <div className="aspect-square rounded-lg bg-neutral-100 overflow-hidden">
              {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />}
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              One photo per piece. Invoices store their own copy at the time of sale.
            </p>
          </div>

          <Card title="Source">
            {p.source ? (
              <dl className="px-5 py-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Supplier</dt><dd className="text-right">{p.source.supplierName}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Bill</dt><dd className="font-mono tabular-nums text-right">{p.source.billNo}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Bill date</dt><dd className="font-mono tabular-nums text-right">{p.source.billDateBs}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Landed cost</dt><dd className="font-mono tabular-nums text-right">{num(p.source.landedCost)}</dd></div>
              </dl>
            ) : (
              <div className="px-5 py-5 text-sm text-neutral-500">
                Not linked to a purchase bill, so it has no landed cost and its margin cannot be worked out.
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Specification">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-100">
              {[
                ['Category', <span className="capitalize">{p.category}</span>],
                ['Purity', p.purity ?? '—'],
                ['Silver weight', <span className="font-mono tabular-nums">{p.silverWeightGrams.toFixed(3)} g</span>],
                ['Stone', p.stonePrice ? <span className="font-mono tabular-nums">{num(p.stonePrice)}</span> : <span className="text-neutral-400">None</span>],
              ].map(([label, value], i) => (
                <div key={i} className="px-5 py-4">
                  <div className="text-xs text-neutral-400 mb-1">{label}</div>
                  <div className="text-[15px] text-neutral-900">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Price today"
            right={
              <span className="text-xs text-neutral-400">
                Silver rate {p.silverRate.perGram.toFixed(2)} /g
                {p.silverRate.effectiveFrom && `, since ${new Date(p.silverRate.effectiveFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
              <div className="px-5 py-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Silver, {p.silverWeightGrams.toFixed(3)} g × {p.silverRate.perGram.toFixed(2)}</span><span className="font-mono tabular-nums">{num(silverValue)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Making charge</span><span className="font-mono tabular-nums">{num(p.makingCharge)}</span></div>
                {p.stonePrice ? <div className="flex justify-between"><span className="text-neutral-500">Stone</span><span className="font-mono tabular-nums">{num(p.stonePrice)}</span></div> : null}
                <div className="flex justify-between pt-2 border-t border-neutral-100 text-base font-semibold">
                  <span>{onShelf ? 'Sells for' : 'Would sell for'}</span>
                  <span className="font-mono tabular-nums">{num(p.priceToday ?? (silverValue + p.makingCharge + (p.stonePrice ?? 0)))}</span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Cost</span><span className={`font-mono tabular-nums ${p.costPrice === null ? 'text-red-600' : ''}`}>{p.costPrice === null ? 'not set' : num(p.costPrice)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Margin</span><span className={`font-mono tabular-nums ${p.margin !== null && p.margin >= 0 ? 'text-emerald-700' : p.margin !== null ? 'text-red-700' : 'text-neutral-400'}`}>{p.margin === null ? '—' : num(p.margin)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Margin %</span><span className={`font-mono tabular-nums ${p.marginPercent !== null && p.marginPercent >= 0 ? 'text-emerald-700' : 'text-neutral-400'}`}>{p.marginPercent === null ? '—' : `${p.marginPercent}%`}</span></div>
                <p className="text-xs text-neutral-400 pt-2">Staff only. Never shown on the storefront.</p>
              </div>
            </div>
          </Card>

          <Card title="Movement" right={<span className="text-xs text-neutral-400">From the stock ledger — append only</span>}>
            {p.movements.length === 0 ? (
              <div className="px-5 py-8 text-sm text-neutral-400 text-center">
                No ledger rows. This piece pre-dates the stock ledger.
              </div>
            ) : (
              <TableWrap minWidth={560}>
<table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                    <th className="text-left font-medium px-5 py-3">Date</th>
                    <th className="text-left font-medium px-5 py-3">Type</th>
                    <th className="text-left font-medium px-5 py-3">Direction</th>
                    <th className="text-left font-medium px-5 py-3">Reference</th>
                    <th className="text-right font-medium px-5 py-3">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {p.movements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-3 whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-5 py-3"><span className="px-2 py-1 rounded-md border border-neutral-200 text-xs font-mono">{m.type}</span></td>
                      <td className={`px-5 py-3 ${m.direction === 'in' ? 'text-emerald-700' : 'text-neutral-600'}`}>{m.direction === 'in' ? 'In' : 'Out'}</td>
                      <td className="px-5 py-3 text-neutral-600">{m.note ?? `${m.referenceType}${m.referenceId ? ` #${m.referenceId}` : ''}`}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-neutral-500">{m.costAmount === null ? '—' : num(m.costAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
</TableWrap>
            )}
            <p className="px-5 py-3 border-t border-neutral-100 text-xs text-neutral-500">
              Editing weight or making charge only changes future sales. Issued invoices keep their own
              snapshot of both, so past bills stay untouched.
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="In stock">
            <div className="px-5 py-5">
              <div className="font-mono tabular-nums text-4xl font-semibold tracking-tight">{p.daysInStock ?? '—'}</div>
              <p className="text-sm text-neutral-500 mt-1">
                {p.daysInStock === null ? 'No longer on the shelf.' : `days since it came in. Flagged as stale at ${p.staleDays}.`}
              </p>
            </div>
          </Card>

          <Card title="Where it appears">
            <dl className="px-5 py-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">Storefront</dt><dd>{p.whereItAppears.storefront ? 'Listed' : 'Not listed'}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">In carts</dt><dd className="font-mono tabular-nums">{p.whereItAppears.inCarts}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Open orders</dt><dd className="font-mono tabular-nums">{p.whereItAppears.openOrders}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Invoiced</dt><dd className="font-mono tabular-nums">{p.whereItAppears.invoiced}</dd></div>
            </dl>
          </Card>

          <Card title="Cannot be deleted">
            <p className="px-5 py-4 text-sm text-neutral-600">
              A piece with ledger rows or invoice lines is kept for audit. Use a status change —
              damaged, lost or voided — which writes an out row instead.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
