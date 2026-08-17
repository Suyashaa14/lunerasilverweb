import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface OrderResult {
  id: number;
  paymentMethod: 'cod' | 'esewa_qr';
  totalAmount: number;
}

export function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const { items, loading: cartLoading, subtotal, refresh } = useCart();
  const navigate = useNavigate();

  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'esewa_qr'>('cod');
  const [esewaQrUrl, setEsewaQrUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<OrderResult | null>(null);

  useEffect(() => {
    if (user) setRecipientName(user.name);
  }, [user]);

  useEffect(() => {
    apiGet('/settings').then((s) => setEsewaQrUrl(s.esewaQrUrl)).catch(() => {});
  }, []);

  if (!authLoading && !user) {
    return <Navigate to="/login" state={{ from: '/checkout' }} replace />;
  }

  if (placedOrder) {
    return (
      <div className="checkout-page">
        <div className="landing-wrap checkout-confirm">
          <h1>{placedOrder.paymentMethod === 'esewa_qr' ? 'Thank you — payment received' : 'Order placed'}</h1>
          <p>
            Order #{placedOrder.id} for Rs {placedOrder.totalAmount.toLocaleString()} is confirmed.
            {placedOrder.paymentMethod === 'cod'
              ? ' Pay in cash when your order is delivered.'
              : " We'll verify your eSewa payment shortly and start preparing your order."}
          </p>
          <Link to="/account" className="sf-btn sf-btn-primary" style={{ marginTop: 24 }}>View my orders</Link>
        </div>
      </div>
    );
  }

  if (!authLoading && !cartLoading && items.length === 0) {
    return <Navigate to="/shop" replace />;
  }

  if (authLoading || cartLoading) {
    return <div className="checkout-page"><div className="landing-wrap" style={{ padding: '56px 0' }}>Loading…</div></div>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const order = await apiPost('/orders', { recipientName, phone, addressLine, city, notes, paymentMethod });
      await refresh();
      setPlacedOrder(order);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place order');
      if (err instanceof ApiError && err.status === 409) {
        setTimeout(() => navigate('/shop'), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="landing-wrap checkout-wrap">
        <form className="checkout-form" onSubmit={submit}>
          <h1>Checkout</h1>
          {error && <div className="auth-error">{error}</div>}

          <label className="checkout-field">
            <span>Full name</span>
            <input required value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </label>
          <div className="checkout-row">
            <label className="checkout-field">
              <span>Phone</span>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="checkout-field">
              <span>City</span>
              <input required value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
          </div>
          <label className="checkout-field">
            <span>Delivery address</span>
            <textarea required rows={3} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
          </label>
          <label className="checkout-field">
            <span>Notes (optional)</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="sf-kicker" style={{ marginTop: 8 }}>PAYMENT METHOD</div>
          <div className="payment-options">
            <label className={`payment-option ${paymentMethod === 'cod' ? 'on' : ''}`}>
              <input type="radio" name="pm" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
              Cash on delivery
            </label>
            <label className={`payment-option ${paymentMethod === 'esewa_qr' ? 'on' : ''}`}>
              <input type="radio" name="pm" checked={paymentMethod === 'esewa_qr'} onChange={() => setPaymentMethod('esewa_qr')} />
              Pay by eSewa QR
            </label>
          </div>

          {paymentMethod === 'esewa_qr' && (
            <div className="esewa-qr-box">
              {esewaQrUrl ? <img src={esewaQrUrl} alt="eSewa QR code" /> : <p>QR code not set up yet — please choose cash on delivery.</p>}
              <p>Scan and pay with eSewa, then place your order below. We'll verify and confirm shortly.</p>
            </div>
          )}

          <button
            className="sf-btn sf-btn-primary"
            type="submit"
            disabled={submitting || (paymentMethod === 'esewa_qr' && !esewaQrUrl)}
            style={{ width: '100%', marginTop: 12, padding: 14 }}
          >
            {submitting ? 'Placing order…' : paymentMethod === 'esewa_qr' ? "I've paid — place order" : 'Place order'}
          </button>
        </form>

        <aside className="checkout-summary">
          <h2>Order summary</h2>
          {items.map((it) => (
            <div className="checkout-summary-row" key={it.cartItemId}>
              <span>{it.name}</span>
              <span>Rs {it.price.toLocaleString()}</span>
            </div>
          ))}
          <div className="checkout-summary-total">
            <span>Total</span>
            <span>Rs {subtotal.toLocaleString()}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
