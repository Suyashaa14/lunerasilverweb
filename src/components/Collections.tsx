import { useState, useMemo } from 'react';
import { COLLECTIONS, PRODUCTS, type Product } from '../data';

interface CollectionsProps {
  fmt: (price: number) => string;
  onAddCart: (p: Product) => void;
  onToggleWish: (id: string) => void;
  wishlist: string[];
}

export function Collections({ fmt, onAddCart, onToggleWish, wishlist }: CollectionsProps) {
  const [active, setActive] = useState('rings');
  const [sort, setSort] = useState('featured');

  const items = useMemo(() => {
    let list = PRODUCTS.filter(p => p.cat === active);
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [active, sort]);

  const activeCol = COLLECTIONS.find(c => c.id === active)!;

  return (
    <section id="collection" className="section section-collection">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">I · THE COLLECTION</div>
            <h2 className="display section-title">
              Pieces in <span className="italic-accent silver-text">stock,</span> ready
              <br />to take home.
            </h2>
          </div>
          <div className="section-head-right">
            <p className="section-blurb">
              Every piece is hand-finished in our Mumbai atelier from solid pure silver. Held in
              limited runs — once a piece goes, the next is the next.
            </p>
            <div className="sort-row">
              <span className="eyebrow">SORT</span>
              <select className="sort-sel" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="low">Price · low to high</option>
                <option value="high">Price · high to low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="cat-tabs">
          {COLLECTIONS.map(c => (
            <button key={c.id}
                    className={`cat-tab ${active === c.id ? 'on' : ''}`}
                    onClick={() => setActive(c.id)}>
              <span className="cat-num">{c.numeral}</span>
              <span className="cat-label">{c.label}</span>
              <span className="cat-count">{PRODUCTS.filter(p => p.cat === c.id).length}</span>
            </button>
          ))}
        </div>

        <div className="cat-blurb">
          <span className="divider-moon">· {activeCol.numeral} ·</span>
          <span className="italic-accent">{activeCol.blurb}</span>
        </div>

        <div className="product-grid">
          {items.map((p, i) => (
            <ProductCard key={p.id} p={p} idx={i} fmt={fmt}
                         onAddCart={onAddCart}
                         onToggleWish={onToggleWish}
                         wished={wishlist.includes(p.id)} />
          ))}
        </div>

        <div className="cat-foot">
          <button className="btn">
            View all {activeCol.label.toLowerCase()}
            <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

interface ProductCardProps {
  p: Product;
  idx: number;
  fmt: (price: number) => string;
  onAddCart: (p: Product) => void;
  onToggleWish: (id: string) => void;
  wished: boolean;
}

function ProductCard({ p, idx, fmt, onAddCart, onToggleWish, wished }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-ph ph">
        <div className="ph-label">PRODUCT · {p.name.toUpperCase()}</div>
        <button className={`heart ${wished ? 'on' : ''}`}
                onClick={() => onToggleWish(p.id)}
                aria-label="Add to wishlist">
          <svg width="14" height="14" viewBox="0 0 24 24"
               fill={wished ? 'currentColor' : 'none'}
               stroke="currentColor" strokeWidth="1.4">
            <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"/>
          </svg>
        </button>
        {p.tag && <span className={`tag tag-${p.tag.toLowerCase()}`}>{p.tag}</span>}
        <div className="product-overlay">
          <button className="btn btn-primary product-add" onClick={() => onAddCart(p)}>
            Add to bag
          </button>
          <button className="btn product-quick">Quick view</button>
        </div>
      </div>
      <div className="product-meta">
        <div className="product-meta-l">
          <div className="product-num">№ {String(idx + 1).padStart(2, '0')}</div>
          <div className="product-name">{p.name}</div>
          <div className="product-sub">{p.sub} · {p.weight}</div>
        </div>
        <div className="product-price silver-text">{fmt(p.price)}</div>
      </div>
    </article>
  );
}
