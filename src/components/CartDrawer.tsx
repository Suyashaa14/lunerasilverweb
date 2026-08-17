import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, subtotal, removeFromCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const checkout = () => {
    onClose();
    navigate('/checkout');
  };

  return createPortal(
    <>
      <div className={`cart-backdrop ${open ? 'on' : ''}`} onClick={onClose} />
      <aside className={`cart-drawer ${open ? 'on' : ''}`} aria-hidden={!open}>
        <header className="cart-drawer-head">
          <div>
            <div className="sf-kicker">YOUR BAG</div>
            <div className="cart-drawer-title">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</div>
          </div>
          <button className="header-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="cart-drawer-body">
          {items.length === 0 ? (
            <div className="cart-drawer-empty">
              Nothing here yet. Add a piece from the shop.
            </div>
          ) : items.map((it) => (
            <div key={it.cartItemId} className="cart-drawer-row">
              <div className="cart-drawer-img">
                {it.imageUrl ? <img src={it.imageUrl} alt={it.name} /> : <span>{it.name.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="cart-drawer-meta">
                <div className="cart-drawer-name">{it.name}</div>
                <div className="cart-drawer-sub">{it.category} · {it.silverWeightGrams}g</div>
              </div>
              <div className="cart-drawer-r">
                <div className="cart-drawer-price">Rs {it.price.toLocaleString()}</div>
                <button className="cart-drawer-remove" onClick={() => removeFromCart(it.jewelryId)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <footer className="cart-drawer-foot">
          <div className="cart-drawer-totals">
            <span className="sf-kicker" style={{ margin: 0 }}>SUBTOTAL</span>
            <span className="cart-drawer-subtotal">Rs {subtotal.toLocaleString()}</span>
          </div>
          <div className="cart-drawer-note">Shipping calculated at checkout.</div>
          <button className="sf-btn sf-btn-primary cart-drawer-checkout" disabled={items.length === 0} onClick={checkout}>
            Proceed to checkout
          </button>
          <button className="cart-drawer-cont" onClick={onClose}>Continue shopping</button>
        </footer>
      </aside>
    </>,
    document.body,
  );
}
