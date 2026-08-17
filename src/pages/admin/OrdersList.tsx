import { useEffect, useState } from 'react';
import { ChevronDown, MapPin, Phone } from 'lucide-react';
import { apiGet, apiPatch, ApiError } from '../../api/client';
import { Pagination } from './Pagination';

interface OrderItem {
  id: number;
  name: string;
  unitPrice: number;
}

interface Order {
  id: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentMethod: 'cod' | 'esewa_qr';
  paymentStatus: 'unpaid' | 'awaiting_verification' | 'paid';
  totalAmount: number;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUSES: Order['status'][] = ['pending', 'confirmed', 'completed', 'cancelled'];
const PAYMENT_STATUSES: Order['paymentStatus'][] = ['unpaid', 'awaiting_verification', 'paid'];

const STATUS_BADGE: Record<Order['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const PAYMENT_BADGE: Record<Order['paymentStatus'], string> = {
  unpaid: 'bg-red-50 text-red-700 border-red-200',
  awaiting_verification: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${className}`}>
      {children}
    </span>
  );
}

function FieldSelect<T extends string>({
  label,
  value,
  options,
  disabled,
  format,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  disabled?: boolean;
  format?: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-neutral-500 mb-1.5">{label}</span>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none px-3 py-2.5 pr-9 border border-neutral-300 rounded-lg text-sm font-medium bg-white capitalize cursor-pointer disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-500"
        >
          {options.map((o) => (
            <option key={o} value={o}>{format ? format(o) : o}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
      </div>
    </label>
  );
}

const PAGE_SIZE = 20;

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    apiGet(`/orders?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((res) => {
        setOrders(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const updateStatus = async (id: number, patch: Partial<Pick<Order, 'status' | 'paymentStatus'>>, key: string) => {
    setSavingKey(key);
    setErrors((prev) => ({ ...prev, [id]: '' }));
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    try {
      const updated = await apiPatch(`/orders/${id}/status`, patch);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch (err) {
      setOrders(previous);
      setErrors((prev) => ({ ...prev, [id]: err instanceof ApiError ? err.message : 'Could not update order' }));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <div className="text-neutral-500">Loading…</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Orders</h1>

      {orders.length === 0 ? (
        <div className="text-neutral-400">No orders yet.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">Order #{o.id}</span>
                    <Badge className={STATUS_BADGE[o.status]}>{o.status}</Badge>
                  </div>
                  <div className="text-sm text-neutral-700 mt-1 truncate">{o.customerName}</div>
                  <div className="text-xs text-neutral-400 truncate">{o.customerEmail} · {new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-semibold">Rs {o.totalAmount.toLocaleString()}</div>
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

              <div className="mt-4 pt-4 border-t border-neutral-100 space-y-1.5 text-sm">
                {o.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3">
                    <span className="text-neutral-700">{it.name}</span>
                    <span className="font-medium text-neutral-900">Rs {it.unitPrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {errors[o.id] && (
                <div className="mt-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                  {errors[o.id]}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldSelect
                  label="Order status"
                  value={o.status}
                  options={STATUSES}
                  disabled={savingKey === `${o.id}-status`}
                  onChange={(v) => updateStatus(o.id, { status: v }, `${o.id}-status`)}
                />
                <FieldSelect
                  label={`Payment (${o.paymentMethod === 'cod' ? 'COD' : 'eSewa'})`}
                  value={o.paymentStatus}
                  options={PAYMENT_STATUSES}
                  format={(v) => v.replace('_', ' ')}
                  disabled={savingKey === `${o.id}-payment`}
                  onChange={(v) => updateStatus(o.id, { paymentStatus: v }, `${o.id}-payment`)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-4 bg-white border border-neutral-200 rounded-lg">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
