import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CartDrawer } from './CartDrawer';

export function HeroHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { user } = useAuth();
  const { items } = useCart();

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`simple-header ${isMenuOpen ? 'is-drawer-open' : ''}`}>
      <div className="simple-header-inner">
        <Link
          to="/"
          className="simple-header-brand"
          aria-label="Lunera Silver home"
          onClick={closeMenu}
        >
          <img src="/logo.png" alt="" />
          <span>LUNERA</span>
        </Link>

        <button
          type="button"
          className="simple-header-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="simple-header-nav"
          aria-label="Toggle navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="simple-header-nav"
          className={`simple-header-nav ${isMenuOpen ? 'is-open' : ''}`}
        >
          <Link to="/#home" onClick={closeMenu}>Home</Link>
          <Link to="/#about" onClick={closeMenu}>About</Link>
          <Link to="/shop" onClick={closeMenu}>Shop</Link>
          <Link to="/#gallery" onClick={closeMenu}>Gallery</Link>
          <Link to="/#contact" onClick={closeMenu}>Contact</Link>
        </nav>

        <div className="header-actions">
          {user && (
            <button className="header-icon-btn" aria-label="Cart" onClick={() => setCartOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 7h12l-1.5 11.5a2 2 0 0 1-2 1.5H9.5a2 2 0 0 1-2-1.5L6 7z"/>
                <path d="M9 7V5a3 3 0 0 1 6 0v2"/>
              </svg>
              {items.length > 0 && <span className="header-cart-badge">{items.length}</span>}
            </button>
          )}

          {user && (
            <Link to={user.role === 'admin' ? '/admin' : '/account'} className="header-account-link" onClick={closeMenu}>
              {user.role === 'admin' ? 'Admin' : user.name.split(' ')[0]}
            </Link>
          )}
        </div>
      </div>
      <button
        type="button"
        className="simple-header-backdrop"
        aria-label="Close navigation"
        onClick={closeMenu}
      />

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
