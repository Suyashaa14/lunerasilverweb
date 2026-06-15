import { useState, useEffect } from 'react';
import { LuneraMark } from './shared';
import { type Currency } from '../data';

interface NavProps {
  onCart: () => void;
  cartCount: number;
  wishCount: number;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  onOpenBespoke: () => void;
}

export function Nav({ onCart, cartCount, wishCount, currency, setCurrency, onOpenBespoke }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections = ['home', 'collection', 'phases', 'bespoke', 'craft'];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 120 && r.bottom >= 200) { setActiveSection(id); break; }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { id: 'home',       label: 'Home' },
    { id: 'collection', label: 'Collection' },
    { id: 'phases',     label: 'Phases' },
    { id: 'bespoke',    label: 'Bespoke' },
    { id: 'craft',      label: 'The Craft' },
  ];

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-inner">
        <a href="#home" onClick={go('home')} className="nav-brand">
          <LuneraMark size={30} />
          <span className="nav-brand-text silver-text">LUNERA</span>
          <span className="nav-brand-sub">SILVER</span>
        </a>

        <nav className="nav-links">
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`} onClick={go(l.id)}
               className={`nav-link ${activeSection === l.id ? 'active' : ''}`}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <div className="currency">
            {(['INR', 'USD', 'GBP'] as Currency[]).map(c => (
              <button key={c}
                      className={`currency-opt ${currency === c ? 'on' : ''}`}
                      onClick={() => setCurrency(c)}>
                {c}
              </button>
            ))}
          </div>

          <button className="icon-btn" aria-label="Wishlist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"/>
            </svg>
            {wishCount > 0 && <span className="badge">{wishCount}</span>}
          </button>

          <button className="icon-btn" aria-label="Cart" onClick={onCart}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M6 7h12l-1.5 11.5a2 2 0 0 1-2 1.5H9.5a2 2 0 0 1-2-1.5L6 7z"/>
              <path d="M9 7V5a3 3 0 0 1 6 0v2"/>
            </svg>
            {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </button>

          <button className="btn btn-primary" onClick={onOpenBespoke}>
            Commission
            <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </header>
  );
}
