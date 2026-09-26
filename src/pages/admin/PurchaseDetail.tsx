import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { Card, CardHead, ErrorNote, Loading, TableWrap } from '../../components/admin/ui';
import { Documents } from '../../components/admin/Documents';
import { money } from '../../components/admin/format';

interface Item {
  id: number; jewelryId: number | null; description: string;
  weightGrams: number | null; unitCost: number; vatAmount: number; lineTotal: number;
}
interface Purchase {
  id: number; supplierName: string | null; billNo: string; billDateBs: string; fiscalYear: string;
  subtotal: number; discount: number; taxableAmount: number; vatAmount: number;
  tdsAmount: number; totalAmount: number; paymentStatus: string; notes: string | null; items: Item[];
}

export function PurchaseDetail() {
  const { id } = useParams();
  const [p, setP] = useState<Purchase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet(`/purchases/${id}`).then(setP).catch(() => setError('Could not load this bill.'));
  }, [id]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!p) return <Loading />;

  const booked = p.items.filter((i) => i.jewelryId !== null).length;

  return (
    <div className="max-w-[1000px]">
      <header className="mb-6">
        <div className="text-sm text-neutral-500">
          <Link to="/admin/purchases" className="hover:underline">Purchases</Link> / {p.billNo}
        </div>
        <h1 className="font-mono tabular-nums text-3xl font-semibold tracking-tight mt-1">{p.billNo}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {p.supplierName} · <span className="font-mono tabular-nums">{p.billDateBs}</span> · fiscal year <span className="font-mono tabular-nums">{p.fiscalYear}</span>
        </p>
      </header>

      <Card className="mb-5">
        <CardHead
          title="Lines"
          right={<span className="text-xs text-neutral-400">
            {booked === 0 ? 'Nothing booked into stock' : `${booked} piece${booked === 1 ? '' : 's'} booked into stock`}
          </span>}
        />
        <TableWrap minWidth={560}>
<table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
              <th className="text-left font-medium px-5 py-3">Description</th>
              <th className="text-right font-medium px-5 py-3 hidden sm:table-cell">Weight</th>
              <th className="text-right font-medium px-5 py-3">Cost</th>
              <th className="text-right font-medium px-5 py-3 hidden sm:table-cell">VAT</th>
              <th className="text-right font-medium px-5 py-3">In stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {p.items.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-3 text-neutral-900">{i.description}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-neutral-600 hidden sm:table-cell">
                  {i.weightGrams ? `${i.weightGrams} g` : '—'}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{money(i.unitCost)}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-neutral-500 hidden sm:table-cell">{money(i.vatAmount)}</td>
                <td className="px-5 py-3 text-right">
                  {i.jewelryId ? (
                    <Link to={`/admin/jewelries/${i.jewelryId}`} className="text-sm text-neutral-700 underline underline-offset-2">View piece</Link>
                  ) : (
                    <span className="text-sm text-neutral-400">not stock</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
</TableWrap>

        <div className="px-5 py-4 border-t border-neutral-100 flex justify-end">
          <div className="w-full sm:w-64 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Goods</span><span className="font-mono tabular-nums">{money(p.taxableAmount)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">VAT</span><span className="font-mono tabular-nums">{money(p.vatAmount)}</span></div>
            {p.tdsAmount > 0 && (
              <div className="flex justify-between"><span className="text-neutral-500">TDS withheld</span><span className="font-mono tabular-nums">−{money(p.tdsAmount)}</span></div>
            )}
            <div className="flex justify-between pt-2 border-t border-neutral-100 text-base font-semibold">
              <span>Total</span><span className="font-mono tabular-nums">{money(p.totalAmount)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHead title="The paper bill" />
          <div className="px-5 py-4">
            <Documents referenceType="purchase" referenceId={p.id} documentType="purchase_bill" label="bill" />
          </div>
        </Card>

        {p.notes && (
          <Card>
            <CardHead title="Note" />
            <p className="px-5 py-4 text-sm text-neutral-600">{p.notes}</p>
          </Card>
        )}
      </div>

      <p className="text-xs text-neutral-400 mt-5">
        A supplier bill is evidence and cannot be edited or deleted. Correct it with a further bill or a note from the supplier.
      </p>
    </div>
  );
}
