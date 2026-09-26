import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiError } from '../../api/client';
import { money } from '../../components/admin/format';
import { EmptyState, ErrorNote, Loading } from '../../components/admin/ui';
import { Modal } from '../../components/admin/Modal';
import { Pagination } from './Pagination';

interface OrderItem {
  id: number;
  jewelryId: number | null;
  name: string;
  unitPrice: number;
}

interface Order {
  id: number;
  orderNo: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentMethod: 'cod' | 'esewa_qr';
  paymentStatus: 'unpaid' | 'awaiting_verification' | 'paid';
  totalAmount: number;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  customerName?: string;
  createdAt: string;
  placedAtBs: string | null;
  source: 'web' | 'counter';
  invoice: { id: number; invoiceNo: string } | null;
  items: OrderItem[];
}

/**
 * The job an order goes through. The words are the shop's, not the database's:
 * `confirmed` means the piece is with the buyer, and `completed` means it has
 * been invoiced and is a sale.
 */
const STAGE: Record<Order['status'], { label: string; badge: string; step: number }> = {
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 border-amber-200', step: 1 },
  confirmed: { label: 'Delivered', badge: 'bg-blue-50 text-blue-700 border-blue-200', step: 2 },
  completed: { label: 'Sold', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', step: 3 },
  cancelled: { label: 'Cancelled', badge: 'bg-neutral-100 text-neutral-500 border-neutral-200', step: 0 },
};

const PAYMENT_BADGE: Record<Order['paymentStatus'], string> = {
  unpaid: 'bg-red-50 text-red-700 border-red-200',
  awaiting_verification: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const TABS = [
  { key: 'all', label: 'All orders', query: '' },
  { key: 'open', label: 'Pending', query: 'open' },
  { key: 'completed', label: 'Completed', query: 'completed' },
] as const;

const PAGE_SIZE = 20;

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}>
      {children}
    </span>
  );
}

interface Piece { id: number; name: string; category: string; silverWeightGrams: number; price: number }

/** Taking an order: which pieces, who for, and where it is going. */
function CounterOrderForm({ onTaken, onCancel }: { onTaken: () => void; onCancel: () => void }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Piece[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'esewa_qr'>('cod');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/jewelries?status=available&pageSize=200')
      .then((res: { data: Piece[] }) => setPieces(res.data))
      .catch(() => setPieces([]));
  }, []);

  const available = pieces.filter(
    (p) => !picked.some((s) => s.id === p.id) && p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const total = picked.reduce((sum, p) => sum + p.price, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (picked.length === 0) return setError('Add at least one piece to the order.');
    if (name.trim() === '') return setError('Enter who the order is for.');
    if (phone.trim() === '') return setError('Enter a phone number.');
    if (address.trim() === '' || city.trim() === '') return setError('Enter where it is going.');

    setSaving(true);
    try {
      await apiPost('/orders/counter', {
        recipientName: name.trim(),
        phone: phone.trim(),
        addressLine: address.trim(),
        city: city.trim(),
        notes: notes.trim() || undefined,
        paymentMethod,
        items: picked.map((p) => ({ jewelryId: p.id })),
      });
      onTaken();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not take the order.');
      setSaving(false);
    }
  };

  const field = 'mt-1 w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm';

  return (
    <form onSubmit={submit}>
      <div className="px-5 sm:px-6 pt-5 space-y-5">
        {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

        <div className="bg-white border border-neutral-200 rounded-xl">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-4">
            <h3 className="text-[15px] font-semibold">Pieces</h3>
            <span className="font-mono tabular-nums text-sm text-neutral-500">{picked.length} on this order</span>
          </div>

          {picked.length > 0 && (
            <ul className="divide-y divide-neutral-100">
              {picked.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="text-[15px] text-neutral-900 truncate">{p.name}</div>
                    <div className="text-xs text-neutral-500 capitalize">{p.category} · {p.silverWeightGrams} g</div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-mono tabular-nums text-[15px]">{money(p.price)}</span>
                    <button type="button" onClick={() => setPicked(picked.filter((x) => x.id !== p.id))} className="text-sm text-neutral-500 underline underline-offset-2">
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="px-5 py-4 border-t border-neutral-100">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search available pieces" className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm" />
            <div className="mt-3 max-h-56 overflow-y-auto divide-y divide-neutral-100">
              {available.length === 0 ? (
                <div className="py-6 text-sm text-neutral-400 text-center">Nothing available to add.</div>
              ) : (
                available.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPicked([...picked, p])} className="w-full flex items-center justify-between gap-4 py-2.5 text-left hover:bg-neutral-50">
                    <span className="text-sm text-neutral-800 truncate">{p.name}</span>
                    <span className="font-mono tabular-nums text-sm text-neutral-600">{money(p.price)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h3 className="text-[15px] font-semibold">Who it is for</h3>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-neutral-600">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="text-sm text-neutral-600">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
              <span className="text-xs text-neutral-400 mt-1 block">A returning buyer is matched on this.</span>
            </label>
            <label className="block">
              <span className="text-sm text-neutral-600">Address</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Tole, ward" className={field} />
            </label>
            <label className="block">
              <span className="text-sm text-neutral-600">City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="text-sm text-neutral-600">Paying by</span>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cod' | 'esewa_qr')} className={`${field} bg-white`}>
                <option value="cod">Cash on delivery</option>
                <option value="esewa_qr">eSewa</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-neutral-600">Notes</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={field} />
            </label>
          </div>
        </div>

        <div className="px-1 pb-1 text-sm text-neutral-500">
          The pieces are held for this buyer. Nothing is sold and no money is recorded until you make the invoice.
        </div>
      </div>

      <div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-neutral-200 bg-white/95 backdrop-blur">
        <div className="text-sm text-neutral-500">
          {picked.length} piece{picked.length === 1 ? '' : 's'} · <span className="font-mono tabular-nums text-neutral-900 font-semibold">{money(total)}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium">Cancel</button>
          <button type="submit" disabled={saving} className="admin-primary-action px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Take order'}
          </button>
        </div>
      </div>
    </form>
  );
}

export function OrdersList() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [taking, setTaking] = useState(false);

  const query = TABS.find((t) => t.key === tab)!.query;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (query) params.set('status', query);

    apiGet(`/orders?${params}`)
      .then((res) => { setOrders(res.data); setTotal(res.total); setLoadError(null); })
      .catch(() => setLoadError('Could not load orders. Check the connection and try again.'))
      .finally(() => setLoading(false));
  }, [page, query]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [tab]);

  const setStatus = async (id: number, status: Order['status']) => {
    setBusyId(id);
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const updated = await apiPatch(`/orders/${id}/status`, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [id]: err instanceof ApiError ? err.message : 'Could not update the order.' }));
    } finally {
      setBusyId(null);
    }
  };

  const makeInvoice = async (id: number) => {
    setBusyId(id);
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await apiPost(`/orders/${id}/invoice`, {});
      navigate(`/admin/invoices/${res.invoice.id}`);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [id]: err instanceof ApiError ? err.message : 'Could not make the invoice.' }));
      setBusyId(null);
    }
  };

  const openCount = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;

  return (
    <div className="max-w-[1100px]">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            Pieces promised to a buyer. An order is not a sale until you make its invoice.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTaking(true)}
          className="admin-primary-action px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
        >
          Take new order
        </button>
      </header>

      <div className="flex gap-1.5 mb-5 overflow-x-auto -mx-1 px-1 pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition ${
              tab === t.key
                ? 'border-neutral-900 bg-neutral-900 text-white admin-primary-action'
                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {t.label}
            {t.key === 'open' && tab !== 'open' && openCount > 0 && (
              <span className="ml-1.5 text-amber-700">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      {loading ? (
        <Loading />
      ) : orders.length === 0 ? (
        <EmptyState
          title={tab === 'completed' ? 'No completed orders' : tab === 'open' ? 'Nothing waiting' : 'No orders yet'}
          detail={
            tab === 'all'
              ? 'Take an order for a piece a buyer wants held, then invoice it when they pay.'
              : tab === 'open'
                ? 'Every order has been invoiced or cancelled.'
                : 'An order appears here once you have made its invoice.'
          }
          action={
            tab === 'all' && (
              <button type="button" onClick={() => setTaking(true)} className="admin-primary-action px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold">
                Take new order
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const stage = STAGE[o.status];
            const open = o.status === 'pending' || o.status === 'confirmed';
            return (
              <div key={o.id} className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono tabular-nums font-semibold">{o.orderNo ?? `Order #${o.id}`}</span>
                      <Badge className={stage.badge}>{stage.label}</Badge>
                      <span className="text-xs text-neutral-400 capitalize">{o.source}</span>
                    </div>
                    <div className="text-sm text-neutral-700 mt-1 truncate">{o.customerName ?? o.recipientName}</div>
                    <div className="text-xs text-neutral-400 font-mono tabular-nums">
                      {o.placedAtBs ?? new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono tabular-nums text-lg font-semibold">{money(o.totalAmount)}</div>
                    <div className="mt-1">
                      <Badge className={PAYMENT_BADGE[o.paymentStatus]}>{o.paymentStatus.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-100 text-sm text-neutral-600 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{o.recipientName} · {o.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{o.addressLine}, {o.city}</span>
                  </div>
                </div>

                {/* The jewellery on this order, each piece linked to its own record. */}
                <div className="mt-4 pt-4 border-t border-neutral-100 space-y-1.5 text-sm">
                  {o.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-3">
                      {it.jewelryId ? (
                        <Link to={`/admin/jewelries/${it.jewelryId}`} className="text-neutral-700 hover:underline underline-offset-2 truncate">
                          {it.name}
                        </Link>
                      ) : (
                        <span className="text-neutral-700 truncate">{it.name}</span>
                      )}
                      <span className="font-mono tabular-nums text-neutral-900">{money(it.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                {errors[o.id] && (
                  <div className="mt-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                    {errors[o.id]}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap items-center gap-2">
                  {o.invoice ? (
                    <Link
                      to={`/admin/invoices/${o.invoice.id}`}
                      className="px-4 py-2 rounded-lg border border-neutral-200 bg-white text-sm font-medium"
                    >
                      Sold on {o.invoice.invoiceNo} →
                    </Link>
                  ) : open ? (
                    <>
                      {o.status === 'pending' && (
                        <button
                          type="button"
                          disabled={busyId === o.id}
                          onClick={() => setStatus(o.id, 'confirmed')}
                          className="px-4 py-2 rounded-lg border border-neutral-200 bg-white text-sm font-medium disabled:opacity-50"
                        >
                          Mark delivered
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => makeInvoice(o.id)}
                        className="admin-primary-action px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        {busyId === o.id ? 'Working…' : 'Make invoice'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => setStatus(o.id, 'cancelled')}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
                      >
                        Cancel order
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-neutral-400">
                      {o.status === 'cancelled' ? 'Cancelled — the pieces went back on the shelf.' : 'Invoiced.'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="mt-4 bg-white border border-neutral-200 rounded-lg">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}

      {taking && (
        <Modal
          title="Take an order"
          subtitle="Hold pieces for a buyer. Invoice it when they pay."
          onClose={() => setTaking(false)}
        >
          <CounterOrderForm onTaken={() => { setTaking(false); setTab('all'); load(); }} onCancel={() => setTaking(false)} />
        </Modal>
      )}
    </div>
  );
}
