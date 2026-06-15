import { useState } from 'react';
import { TESTIMONIALS, PRESS } from '../data';

export function Craft() {
  return (
    <section id="craft" className="section section-craft">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">IV · THE CRAFT</div>
            <h2 className="display section-title">
              Two pairs of hands.<br />
              <span className="italic-accent silver-text">One small atelier.</span>
            </h2>
          </div>
          <p className="section-blurb section-blurb-right">
            Lunera began at a kitchen table in 2019. We still make every piece ourselves — slowly,
            from solid pure silver, with the lights low and the music on.
          </p>
        </div>

        <div className="craft-grid">
          <div className="craft-photo ph craft-photo-l">
            <div className="ph-label">ATELIER · workbench, hammer, files</div>
          </div>
          <div className="craft-text">
            <div className="eyebrow">01 · MELT</div>
            <p className="craft-p">
              Each piece starts as a single 999 fine-silver granule. We melt it down to pure
              over a torch — alloyed with copper for strength, never plated.
            </p>
            <div className="craft-stat">
              <strong className="display">99.9%</strong>
              <span>Recycled silver source</span>
            </div>
          </div>

          <div className="craft-text craft-text-r">
            <div className="eyebrow">02 · FORM</div>
            <p className="craft-p">
              Sheet is rolled, wire is drawn. Every curve is filed by hand. The hammer marks
              on a Phase Bangle? Each one is intentional, and slightly different from the next.
            </p>
            <div className="craft-stat">
              <strong className="display">14 hrs</strong>
              <span>Avg. time per piece</span>
            </div>
          </div>
          <div className="craft-photo ph craft-photo-r">
            <div className="ph-label">DETAIL · hammered surface texture</div>
          </div>

          <div className="craft-photo ph craft-photo-l">
            <div className="ph-label">FINISHING · polish, patina, hallmark</div>
          </div>
          <div className="craft-text">
            <div className="eyebrow">03 · FINISH</div>
            <p className="craft-p">
              Polished to a mirror, brushed to a satin, or oxidised to inky black. Every piece is
              hallmarked at the Bureau of Indian Standards before it leaves the atelier.
            </p>
            <div className="craft-stat">
              <strong className="display">BIS</strong>
              <span>Hallmarked & certified</span>
            </div>
          </div>
        </div>

        {/* Founders */}
        <div className="founders">
          <div className="founder card">
            <div className="founder-ph ph"><div className="ph-label">PORTRAIT · M</div></div>
            <div className="founder-meta">
              <div className="eyebrow">FOUNDER · METALSMITH</div>
              <div className="founder-name">Meera Iyer</div>
              <div className="founder-sub">12 years on the bench. Design lead.</div>
            </div>
          </div>
          <div className="founder card">
            <div className="founder-ph ph"><div className="ph-label">PORTRAIT · A</div></div>
            <div className="founder-meta">
              <div className="eyebrow">FOUNDER · POLISH</div>
              <div className="founder-name">Aarav Iyer</div>
              <div className="founder-sub">Finishing, hallmarking, packing.</div>
            </div>
          </div>
        </div>

        <TestimonialBlock />
        <PressBar />
      </div>
    </section>
  );
}

function TestimonialBlock() {
  const [i, setI] = useState(0);
  const t = TESTIMONIALS[i];

  return (
    <div className="testimonial-block">
      <div className="testimonial-marker">✦ ✦ ✦ ✦ ✦</div>
      <blockquote className="display testimonial-q">
        <span className="quote-mark">"</span>
        {t.q}
        <span className="quote-mark">"</span>
      </blockquote>
      <div className="testimonial-author">
        <strong>— {t.a}</strong>
        <span>{t.m}</span>
      </div>
      <div className="testimonial-dots">
        {TESTIMONIALS.map((_, idx) => (
          <button key={idx}
                  className={`t-dot ${idx === i ? 'on' : ''}`}
                  onClick={() => setI(idx)}
                  aria-label={`Testimonial ${idx + 1}`} />
        ))}
      </div>
    </div>
  );
}

function PressBar() {
  return (
    <div className="press-bar">
      <span className="eyebrow press-label">AS SEEN IN</span>
      <div className="press-row">
        {PRESS.map((p, i) => (
          <span key={i} className="press-item italic-accent">{p}</span>
        ))}
      </div>
    </div>
  );
}
