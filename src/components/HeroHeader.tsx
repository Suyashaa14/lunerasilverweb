export function HeroHeader() {
  return (
    <header className="simple-header">
      <div className="simple-header-inner">
        <a href="#home" className="simple-header-brand" aria-label="Lunera Silver home">
          <img src="/logo.png" alt="" />
          <span>LUNERA</span>
        </a>
        <nav className="simple-header-nav">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#collection">Our Products</a>
          <a href="#gallery">Gallery</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}
