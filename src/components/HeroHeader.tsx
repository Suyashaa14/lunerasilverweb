import { useState } from 'react';

export function HeroHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`simple-header ${isMenuOpen ? 'is-drawer-open' : ''}`}>
      <div className="simple-header-inner">
        <a
          href="#home"
          className="simple-header-brand"
          aria-label="Lunera Silver home"
          onClick={closeMenu}
        >
          <img src="/logo.png" alt="" />
          <span>LUNERA</span>
        </a>

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
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#about" onClick={closeMenu}>About</a>
          <a href="#collection" onClick={closeMenu}>Our Products</a>
          <a href="#gallery" onClick={closeMenu}>Gallery</a>
          <a href="#contact" onClick={closeMenu}>Contact</a>
        </nav>
      </div>
      <button
        type="button"
        className="simple-header-backdrop"
        aria-label="Close navigation"
        onClick={closeMenu}
      />
    </header>
  );
}
