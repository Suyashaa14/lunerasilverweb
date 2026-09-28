import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiGet, apiPatch, apiPost } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Dialog, useDialog } from '../../components/admin/Dialog';
import { BUTTON, Card, CardHead, ErrorNote, Loading, StatusPill, TableWrap } from '../../components/admin/ui';
import { Documents } from '../../components/admin/Documents';
import { money } from '../../components/admin/format';

interface Item {
  id: number; jewelryId: number | null; description: string;
  weightGrams: number | null; unitCost: number; vatAmount: number; lineTotal: number;
}
interface Purchase {
  id: number; supplierName: string | null; billNo: string; billDateBs: string; fiscalYear: string;
  subtotal: number; discount: number; taxableAmount: number; vatAmount: number;
  tdsAmount: number; totalAmount: number; paymentStatus: string; paymentMethod: string | null;
  notes: string | null; isVoid: boolean; voidReason: string | null; items: Item[];
}

const PAYMENT_STATUS = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Part paid' },
  { value: 'paid', label: 'Paid' },
];
const PAYMENT_METHOD = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'esewa_qr', label: 'eSewa' },
  { value: 'card', label: 'Card' },
];
const statusLabel = (s: string) => (s === 'partial' ? 'part paid' : s);

export function PurchaseDetail() {
  const { id } = useParams();
  const [p, setP] = useState<Purchase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { user } = useAuth();
  const dialog = useDialog();

  useEffect(() => {
    apiGet(`/purchases/${id}`).then(setP).catch(() => setError('Could not load this bill.'));
  }, [id]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!p) return <Loading />;

  const booked = p.items.filter((i) => i.jewelryId !== null).length;

  // Only what carries no money. A wrong figure is fixed by voiding and
  // entering the bill again, so stock, piece costs and books stay in step.
  const editDetails = async () => {
    const answer = await dialog.ask({
      title: 'Edit bill details',
      description: 'Change the payment and the note. To fix a weight, rate or amount, void this bill and enter it again.',
      confirmLabel: 'Save',
      fields: [
        { name: 'paymentStatus', label: 'Payment', type: 'select', options: PAYMENT_STATUS, defaultValue: p.paymentStatus },
        { name: 'paymentMethod', label: 'Paid by', type: 'select', options: PAYMENT_METHOD, defaultValue: p.paymentMethod ?? '', required: false },
        { name: 'notes', label: 'Note', type: 'textarea', defaultValue: p.notes ?? '', required: false },
      ],
    });
    if (!answer) return;
    try {
      setActionError(null);
      setP(await apiPatch(`/purchases/${p.id}`, {
        paymentStatus: answer.paymentStatus,
        paymentMethod: answer.paymentMethod || null,
        notes: answer.notes || null,
      }));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not save the changes.');
    }
  };

  const voidBill = async () => {
    const answer = await dialog.ask({
      title: 'Void this bill',
      description: (
        <>
          The bill stays on record, marked void. Its amounts come back out of your books, and
          {booked > 0 ? ` its ${booked} piece${booked === 1 ? '' : 's'} come${booked === 1 ? 's' : ''} off the shelf.` : ' nothing was booked into stock.'}
          {' '}You can then enter the correct bill, with the same bill number if you need to.
        </>
      ),
      confirmLabel: 'Void bill',
      tone: 'danger',
      fields: [{ name: 'reason', label: 'Reason', type: 'textarea', placeholder: 'Wrong weight typed' }],
    });
    if (!answer) return;
    try {
      setActionError(null);
      setP(await apiPost(`/purchases/${p.id}/void`, { reason: answer.reason }));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not void this bill.');
    }
  };

  return (
    <div className="max-w-[1000px]">
      <header className="mb-6">
        <div className="text-sm text-neutral-500">
          <Link to="/admin/purchases" className="hover:underline">Purchases</Link> / {p.billNo}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-1">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono tabular-nums text-3xl font-semibold tracking-tight">{p.billNo}</h1>
              <StatusPill status={p.isVoid ? 'void' : statusLabel(p.paymentStatus)} />
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              {p.supplierName} · <span className="font-mono tabular-nums">{p.billDateBs}</span> · fiscal year <span className="font-mono tabular-nums">{p.fiscalYear}</span>
            </p>
          </div>
          {!p.isVoid && (
            <div className="flex gap-2">
              {user?.role === 'admin' && (
                <button type="button" onClick={voidBill} className={BUTTON.danger}>Void bill</button>
              )}
              <button type="button" onClick={editDetails} className={BUTTON.secondary}>Edit details</button>
            </div>
          )}
        </div>
      </header>

      {actionError && <div className="mb-5"><ErrorNote>{actionError}</ErrorNote></div>}

      {p.isVoid && (
        <div className="mb-5 px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-100 text-sm text-neutral-700">
          <span className="font-semibold">This bill is void.</span> It no longer counts in your books or stock.
          {p.voidReason && <> Reason: {p.voidReason}</>}
        </div>
      )}

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
        A supplier bill is never deleted. The payment and note can be changed; a wrong amount is fixed by voiding the bill and entering it again.
      </p>

      <Dialog request={dialog.request} onSettle={dialog.settle} />
    </div>
  );
}
