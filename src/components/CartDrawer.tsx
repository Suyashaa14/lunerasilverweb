import { useEffect } from 'react';
import { type CartItem } from '../data';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  fmt: (price: number) => string;
  onRemove: (id: string) => void;
}

export function CartDrawer({ open, onClose, items, fmt, onRemove }: CartDrawerProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);

  return (
    <>
      <div className={`drawer-backdrop ${open ? 'on' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'on' : ''}`} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="eyebrow">YOUR BAG</div>
            <div className="drawer-title">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="drawer-empty">
              <div className="display drawer-empty-t">Nothing here yet.</div>
              <div className="drawer-empty-sub">Add a piece from the collection — or commission something new.</div>
            </div>
          ) : items.map(it => (
            <div key={it.id} className="drawer-row">
              <div className="ph drawer-ph"><span className="ph-label sm">{it.name.slice(0, 2).toUpperCase()}</span></div>
              <div className="drawer-meta">
                <div className="drawer-name">{it.name}</div>
                <div className="drawer-sub">{it.sub} · qty {it.qty}</div>
              </div>
              <div className="drawer-r">
                <div className="silver-text drawer-price">{fmt(it.price * it.qty)}</div>
                <button className="drawer-remove" onClick={() => onRemove(it.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <footer className="drawer-foot">
          <div className="drawer-totals">
            <span className="eyebrow">SUBTOTAL</span>
            <span className="display silver-text drawer-subtotal">{fmt(subtotal)}</span>
          </div>
          <div className="drawer-note">Shipping & taxes calculated at checkout.</div>
          <button className="btn btn-primary drawer-checkout" disabled={items.length === 0}>
            Proceed to checkout
            <span className="arrow">→</span>
          </button>
          <button className="drawer-cont" onClick={onClose}>Continue shopping</button>
        </footer>
      </aside>
    </>
  );
}
