import { useState } from 'react';
import { LuneraMark, Sparkle } from './shared';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subbed, setSubbed] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes('@')) setSubbed(true);
  };

  return (
    <footer id="contact" className="footer">
      {/* Newsletter */}
      <div className="wrap newsletter">
        <div className="newsletter-left">
          <div className="eyebrow">V · DEAR MOON</div>
          <h2 className="display newsletter-title">
            One letter a month.<br />
            <span className="italic-accent silver-text">Never on a full moon.</span>
          </h2>
          <p className="newsletter-sub">
            Studio dispatches, early access to new edits, and the occasional poem. No noise.
          </p>
        </div>
        <form className="newsletter-form" onSubmit={submit}>
          {!subbed ? (
            <>
              <input type="email" required
                     placeholder="your@email.com"
                     value={email}
                     onChange={e => setEmail(e.target.value)}
                     className="newsletter-input" />
              <button type="submit" className="btn btn-primary newsletter-btn">
                Subscribe<span className="arrow">→</span>
              </button>
            </>
          ) : (
            <div className="newsletter-thanks">
              <Sparkle size={14} style={{ opacity: 1, position: 'relative', animation: 'none' }} />
              <span>You're in. See you on the new moon.</span>
            </div>
          )}
        </form>
      </div>

      {/* Columns */}
      <div className="wrap footer-cols">
        <div className="footer-brand">
          <div className="footer-brand-row">
            <LuneraMark size={36} />
            <div>
              <div className="silver-text footer-wordmark">LUNERA</div>
              <div className="footer-wordmark-sub">SILVER · EST. 2019</div>
            </div>
          </div>
          <p className="footer-tag">
            Handmade pure silver jewellery, forged in a single Mumbai atelier
            and shipped worldwide.
          </p>
          <div className="footer-socials">
            {['IG', 'PIN', 'WA', 'YT'].map(s => (
              <a key={s} href="#" className="social-pill">{s}</a>
            ))}
          </div>
        </div>

        <FooterCol title="Shop" links={['Rings', 'Lockets', 'Chains', 'Bracelets', 'Earrings', 'Anklets', 'Gift cards']} />
        <FooterCol title="Atelier" links={['Our story', 'The craft', 'Founders', 'Sustainability', 'Hallmarking', 'Press']} />
        <FooterCol title="Care" links={['Bespoke FAQ', 'Sizing guide', 'Care & cleaning', 'Returns & repairs', 'Shipping', 'Contact us']} />
      </div>

      {/* Bottom bar */}
      <div className="wrap footer-bottom">
        <div>© 2026 Lunera Silver Atelier LLP · Mumbai, IN</div>
        <div className="footer-bottom-r">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">BIS Hallmark verification</a>
        </div>
      </div>

      {/* Marquee */}
      <div className="footer-marquee">
        <div className="marquee-track">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="footer-marquee-item display italic-accent">
              Lunera ✦ Silver ✦ Moonlit ✦ Handmade ✦ Mumbai ✦ Since 2019 ✦&nbsp;
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="footer-col">
      <div className="footer-col-title">{title}</div>
      <ul>
        {links.map(l => <li key={l}><a href="#">{l}</a></li>)}
      </ul>
    </div>
  );
}

