import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiGet } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface OrderItem {
  id: number;
  name: string;
  unitPrice: number;
}

interface Order {
  id: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentMethod: 'cod' | 'esewa_qr';
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

export function Account() {
  const { user, loading: authLoading, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiGet('/orders/mine').then(setOrders).finally(() => setLoading(false));
  }, [user]);

  if (!authLoading && !user) {
    return <Navigate to="/login" state={{ from: '/account' }} replace />;
  }

  return (
    <div className="account-page">
      <div className="landing-wrap">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1>My orders</h1>
          <button className="sf-btn" onClick={() => logout()}>Sign out</button>
        </div>

        {loading ? (
          <div className="account-empty">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="account-empty">You haven't placed any orders yet.</div>
        ) : (
          orders.map((o) => (
            <div className="account-order" key={o.id}>
              <div className="account-order-head">
                <span className="account-order-id">Order #{o.id}</span>
                <span className={`account-status ${o.status}`}>{o.status}</span>
              </div>
              <div className="account-order-items">
                {o.items.map((it) => (
                  <div key={it.id}>{it.name} — Rs {it.unitPrice.toLocaleString()}</div>
                ))}
              </div>
              <div className="account-order-total">
                Total: Rs {o.totalAmount.toLocaleString()} · {o.paymentMethod === 'cod' ? 'Cash on delivery' : 'eSewa QR'} · {o.paymentStatus.replace('_', ' ')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
