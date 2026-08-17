import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface Jewelry {
  id: number;
  name: string;
  category: string;
  imageUrl: string | null;
  silverWeightGrams: number;
  makingCharge: number;
  status: 'available' | 'sold';
  price: number;
}

const CATEGORIES = ['all', 'rings', 'lockets', 'chains', 'bracelets', 'earrings', 'other'];

export function Shop() {
  const { user } = useAuth();
  const { items: cartItems, addToCart } = useCart();
  const navigate = useNavigate();
  const [jewelries, setJewelries] = useState<Jewelry[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('all');
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/jewelries?pageSize=200')
      .then((res) => setJewelries(res.data))
      .finally(() => setLoading(false));
  }, []);

  const cartJewelryIds = useMemo(() => new Set(cartItems.map((c) => c.jewelryId)), [cartItems]);

  const filtered = useMemo(
    () => (active === 'all' ? jewelries : jewelries.filter((j) => j.category === active)),
    [jewelries, active]
  );

  const handleAdd = async (jewelryId: number) => {
    if (!user) {
      navigate('/login', { state: { from: '/shop' } });
      return;
    }
    setError(null);
    setAddingId(jewelryId);
    try {
      await addToCart(jewelryId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add to bag');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="shop-page">
      <div className="landing-wrap">
        <div className="shop-head">
          <div className="sf-kicker">THE COLLECTION</div>
          <h1>Every piece we currently have.</h1>
          <p>Handcrafted pure silver jewellery — each piece is unique, so once it's gone, it's gone.</p>
        </div>

        <div className="shop-tabs">
          {CATEGORIES.map((c) => (
            <button key={c} className={`shop-tab ${active === c ? 'on' : ''}`} onClick={() => setActive(c)}>
              {c}
            </button>
          ))}
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 20 }}>{error}</div>}

        {loading ? (
          <div className="shop-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="shop-empty">No pieces in this category right now.</div>
        ) : (
          <div className="shop-grid">
            {filtered.map((j) => (
              <article className="shop-card" key={j.id}>
                <div className="shop-card-img">
                  {j.imageUrl ? (
                    <img src={j.imageUrl} alt={j.name} />
                  ) : (
                    <span className="shop-card-ph">{j.name.slice(0, 2).toUpperCase()}</span>
                  )}
                  {j.status === 'sold' && <div className="shop-card-soldout">Sold</div>}
                </div>
                <div className="shop-card-body">
                  <div className="shop-card-name">{j.name}</div>
                  <div className="shop-card-sub">{j.category} · {j.silverWeightGrams}g silver</div>
                  <div className="shop-card-row">
                    <span className="shop-card-price">Rs {j.price.toLocaleString()}</span>
                    <button
                      className="sf-btn sf-btn-primary shop-card-add"
                      disabled={j.status !== 'available' || cartJewelryIds.has(j.id) || addingId === j.id}
                      onClick={() => handleAdd(j.id)}
                    >
                      {cartJewelryIds.has(j.id) ? 'In bag' : j.status !== 'available' ? 'Sold' : addingId === j.id ? 'Adding…' : 'Add to bag'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
