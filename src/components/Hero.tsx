import { cloudinaryImages } from '../lib/cloudinaryImages';

interface HeroProps {
  fmt: (price: number) => string;
  onOpenBespoke: () => void;
}

export function Hero({ fmt, onOpenBespoke }: HeroProps) {
  const scrollToCollection = () => {
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
  };

  void fmt;
  void onOpenBespoke;

  return (
    <section id="home" className="hero hero-lunera-reference hero-exact">
      <div className="hero-ref-frame">
        <h1 className="hero-ref-wordmark">LUNERA SILVER</h1>

        <div className="hero-ref-canvas">
          <img
            src={cloudinaryImages.heroMain}
            alt="Lunera hero"
            className="hero-ref-main-image"
          />

          <div className="hero-ref-copy-left">
            <p>
              Timeless silver jewellery,
              <br />
              thoughtfully crafted for
              <br />
              every story you wear.
              <br />
              Simple. Meaningful. Yours.
            </p>
            <button className="hero-ref-link" onClick={scrollToCollection}>
              <span className="hero-ref-arrow">&rarr;</span> Explore Collection
            </button>
          </div>

          {/* <div className="hero-ref-since">{'{ Since 2017 }'}</div> */}

          <div className="hero-ref-card hero-ref-card-left">
            <div className="hero-ref-card-title">LUNERA COLLECTION</div>
            <div className="hero-ref-card-sub">Summer Edit '26</div>
            <img
              src={cloudinaryImages.halfImage}
              alt="Lunera Collection"
              className="hero-ref-product-image hero-ref-collection-image"
            />
            <div className="hero-ref-card-corner">&#8599;</div>
          </div>

          <div className="hero-ref-card hero-ref-card-mid">
            <img
              src={cloudinaryImages.luneraRing}
              alt="Lunera Ring"
              className="hero-ref-product-image hero-ref-ring-image"
            />
            <div className="hero-ref-image-caption">Lunera Silver</div>
          </div>

          <div className="hero-ref-card hero-ref-card-right">
            <img
              src={cloudinaryImages.pearlEarring}
              alt="Silver Ring"
              className="hero-ref-product-image hero-ref-pearl-ring-image"
            />
            <div className="hero-ref-image-caption">Pearl Drop Earrings</div>
          </div>
        </div>
      </div>
    </section>
  );
}
