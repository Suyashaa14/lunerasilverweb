import { useState } from 'react';

const products = [
  {
    name: 'Turtle Silver Ring',
    description: 'A playful turtle-inspired ring with a polished silver finish.',
    image: '/turtle ring.png',
    alt: 'Turtle silver ring by Lunera Silver',
  },
  {
    name: 'Pearl Silver Top',
    description: 'A graceful pearl silver top designed for soft everyday elegance.',
    image: '/pearlsilvertop.png',
    alt: 'Pearl silver top by Lunera Silver',
  },
  {
    name: 'Square Silver Ring',
    description: 'A clean square ring with bold lines and a refined silver shine.',
    image: '/squarering.png',
    alt: 'Square silver ring by Lunera Silver',
  },
];

const values = [
  {
    title: 'Statement Rings',
    description: 'Polished silver rings made to add a clean shine to every look.',
    image: '/ring2.png',
    alt: 'Polished silver ring by Lunera Silver',
  },
  {
    title: 'Everyday Shine',
    description: 'Elegant ring details that feel simple, refined, and easy to wear.',
    image: '/ring1.png',
    alt: 'Elegant silver ring by Lunera Silver',
  },
  {
    title: 'Devotional Details',
    description: 'Ganesh lockets crafted with a graceful finish for meaningful gifting.',
    image: '/ganeshlocket.png',
    alt: 'Ganesh locket by Lunera Silver',
  },
];

const galleryItems = [
  {
    name: 'Turtle Silver Ring',
    image: '/turtle ring.png',
    alt: 'Turtle silver ring by Lunera Silver',
  },
  {
    name: 'Stone Silver Ring',
    image: '/stonering.png',
    alt: 'Stone silver ring by Lunera Silver',
  },
  {
    name: 'Square Silver Ring',
    image: '/squarering.png',
    alt: 'Square silver ring by Lunera Silver',
  },
  {
    name: 'Lunera Ring',
    image: '/luneraring.jpeg',
    alt: 'Lunera silver ring',
  },
  {
    name: 'Pearl Ring',
    image: '/pearl ring.jpeg',
    alt: 'Pearl ring by Lunera Silver',
  },
  {
    name: 'Pearl Earrings',
    image: '/pearlearring.jpeg',
    alt: 'Pearl earrings by Lunera Silver',
  },
  {
    name: 'Statement Ring',
    image: '/ring2.png',
    alt: 'Statement silver ring by Lunera Silver',
  },
  {
    name: 'Everyday Ring',
    image: '/ring1.png',
    alt: 'Everyday silver ring by Lunera Silver',
  },
  {
    name: 'Ganesh Locket',
    image: '/ganeshlocket.png',
    alt: 'Ganesh locket by Lunera Silver',
  },
  {
    name: 'Pearl Bracelet',
    image: '/pearlbracelet.png',
    alt: 'Pearl bracelet by Lunera Silver',
  },
  {
    name: 'Pearl Silver Top',
    image: '/pearlsilvertop.png',
    alt: 'Pearl silver top by Lunera Silver',
  },
];

export function LandingContent() {
  const [showAllGalleryItems, setShowAllGalleryItems] = useState(false);

  return (
    <main className="landing-main">
      <section id="about" className="landing-about-showcase" aria-label="About Lunera">
        <div className="about-simple-wrap">
          <div className="about-simple-copy">
            <p className="landing-kicker">About Lunera</p>
            <h2>Silver stories, handcrafted for everyday elegance.</h2>
            <p>
              Lunera Silver creates timeless jewellery designed to feel personal, simple, and
              meaningful. Each piece is made to complement your daily style with quiet luxury.
            </p>
          </div>

          <figure className="about-simple-image">
            <img
              src="/pearl ring.jpeg"
              alt="Pearl ring styled by Lunera Silver"
            />
            <figcaption>Pearl ring by Lunera Silver</figcaption>
          </figure>
        </div>
      </section>

      <section id="collection" className="landing-section landing-products">
        <div className="landing-wrap">
          <div className="landing-products-head">
            <p className="landing-kicker">Our Products</p>
            <h2>Essential silver pieces, made for daily shine.</h2>
            <p>
              A small edit of rings, earrings, and layered pieces with clean shapes and a timeless
              finish.
            </p>
          </div>

          <div className="landing-grid">
            {products.map((product) => (
              <article className="landing-product-card" key={product.name}>
                <img src={product.image} alt={product.alt} />
                <div className="landing-product-card-copy">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="landing-section landing-gallery" aria-label="Lunera product gallery">
        <div className="landing-wrap">
          <div className="landing-gallery-head">
            <div>
              <p className="landing-kicker">Product Gallery</p>
              <h2>A closer look at Lunera favourites.</h2>
              <p>
                Rings, pearl pieces, lockets, and everyday silver details styled together in one
                soft-moving showcase.
              </p>
            </div>
            <button
              className="landing-gallery-toggle"
              type="button"
              onClick={() => setShowAllGalleryItems((current) => !current)}
            >
              {showAllGalleryItems ? 'Show animated gallery' : 'View all images'}
            </button>
          </div>
        </div>

        {showAllGalleryItems ? (
          <div className="landing-wrap">
            <div className="landing-gallery-grid">
              {galleryItems.map((item) => (
                <figure className="landing-gallery-card" key={item.name}>
                  <img src={item.image} alt={item.alt} />
                  <figcaption>{item.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : (
          <div className="landing-gallery-stage">
            <div className="landing-gallery-track">
              {[...galleryItems, ...galleryItems].map((item, index) => (
                <figure className="landing-gallery-card" key={`${item.name}-${index}`}>
                  <img src={item.image} alt={item.alt} />
                  <figcaption>{item.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="landing-section landing-values">
        <div className="landing-wrap">
          <div className="landing-values-head">
            <p className="landing-kicker">Why Lunera</p>
            <h2>Small details, lasting shine.</h2>
          </div>

          <div className="landing-values-grid">
            {values.map((value, index) => (
              <article className="landing-value-card" key={value.title}>
                <img src={value.image} alt={value.alt} />
                <div>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="landing-section landing-contact">
        <div className="landing-wrap landing-contact-wrap">
          <div className="landing-contact-copy">
            <p className="landing-kicker">Contact</p>
            <h2>Need help choosing something beautiful?</h2>
            <p className="landing-lead">
              Message Lunera for styling advice, gifting help, product details, or custom silver
              requests. We will help you find the piece that feels right.
            </p>
            <div className="landing-contact-links">
              <a className="landing-contact-link" href="mailto:lunerasilver@gmail.com">
                <span>Email</span>
                <strong>lunerasilver@gmail.com</strong>
              </a>
              <a className="landing-contact-link" href="tel:+9779861926919">
                <span>Call / WhatsApp</span>
                <strong>9861926919</strong>
              </a>
              <a
                className="landing-contact-link"
                href="https://www.instagram.com/lunera_silver/"
                target="_blank"
                rel="noreferrer"
              >
                <span>Instagram</span>
                <strong>@lunera_silver</strong>
              </a>
            </div>
            <p className="landing-contact-note">Available for orders, gifts, and simple custom pieces.</p>
          </div>

          <figure className="landing-contact-image">
            <img
              src="/pearlbracelet.png"
              alt="Pearl bracelet by Lunera Silver"
            />
            <figcaption>Pearl bracelets, gifting help, and custom requests</figcaption>
          </figure>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-wrap landing-footer-wrap">
          <div>
            <a className="landing-footer-brand" href="#top" aria-label="Lunera Silver home">
              <img src="/logo.png" alt="" />
              <span>Lunera Silver</span>
            </a>
            <p>Timeless silver jewellery for everyday elegance.</p>
          </div>

          <nav className="landing-footer-links" aria-label="Footer navigation">
            <a href="#about">About</a>
            <a href="#collection">Products</a>
            <a href="#gallery">Gallery</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="landing-footer-contact">
            <a href="mailto:lunerasilver@gmail.com">lunerasilver@gmail.com</a>
            <a href="tel:+9779861926919">9861926919</a>
            <a href="https://www.instagram.com/lunera_silver/" target="_blank" rel="noreferrer">
              @lunera_silver
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
