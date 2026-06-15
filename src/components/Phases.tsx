import { useState } from 'react';

const PHASES = [
  {
    phase: 'New Moon',  numeral: '01', glyph: '●',
    title: 'Onyx & Silver',
    body:  'Blackened pure silver with brushed inlays — the night-sky edit.',
    pieces: ['Eclipse Band', 'Penumbra Heart', 'Cosmos Cuff'],
  },
  {
    phase: 'Waxing',    numeral: '02', glyph: '◑',
    title: 'Soft Sheen',
    body:  'High-polish silver layered with delicate chain — for everyday.',
    pieces: ['Stardust Cable', 'Orbit Link', 'Selene Halo'],
  },
  {
    phase: 'Full Moon', numeral: '03', glyph: '○',
    title: 'Mirror Finish',
    body:  'Show-stopping cocktail pieces with sculptural presence.',
    pieces: ['Astra Three-Stone', 'Crescent Solitaire', 'Nebula Herringbone'],
  },
  {
    phase: 'Waning',    numeral: '04', glyph: '◐',
    title: 'Patinaed',
    body:  'Antiqued, hand-rubbed finishes that age beautifully over years.',
    pieces: ['Constellation Disk', 'Phase Bangle', 'Twilight Box'],
  },
];

export function Phases() {
  const [i, setI] = useState(0);
  const p = PHASES[i];

  return (
    <section id="phases" className="section section-phases">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">II · PHASES OF THE MOON</div>
            <h2 className="display section-title">
              Four edits. Four<br />
              <span className="italic-accent silver-text">moods of silver.</span>
            </h2>
          </div>
          <p className="section-blurb section-blurb-right">
            Our pieces are curated against the lunar calendar — each phase a different finish,
            metal temper, and styling story.
          </p>
        </div>

        <div className="phases-wrap">
          {/* Left rail */}
          <div className="phases-rail">
            {PHASES.map((ph, idx) => (
              <button key={ph.phase}
                      className={`phase-item ${idx === i ? 'on' : ''}`}
                      onClick={() => setI(idx)}>
                <span className="phase-num">{ph.numeral}</span>
                <span className="phase-glyph">{ph.glyph}</span>
                <span className="phase-name">{ph.phase}</span>
                <span className="phase-arrow">{idx === i ? '→' : ''}</span>
              </button>
            ))}
          </div>

          {/* Center — Big image */}
          <div className="phases-stage">
            <div className="phases-stage-ph ph">
              <div className="ph-stack">
                <div className="phase-large-glyph">{p.glyph}</div>
                <div className="ph-label">EDITORIAL · {p.title.toUpperCase()}</div>
                <div className="ph-spec">2400 × 3000 · {p.phase.toLowerCase()} edit</div>
              </div>
              <div className="phase-corner">{p.numeral} / 04</div>
            </div>
          </div>

          {/* Right — details */}
          <div className="phases-detail">
            <div className="eyebrow">EDIT {p.numeral} · {p.phase.toUpperCase()}</div>
            <h3 className="display phase-detail-title">{p.title}</h3>
            <p className="phase-body">{p.body}</p>

            <div className="phase-pieces">
              <div className="eyebrow">FEATURED PIECES</div>
              {p.pieces.map((piece, idx) => (
                <div key={idx} className="phase-piece">
                  <span className="phase-piece-num">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="phase-piece-name">{piece}</span>
                  <span className="phase-piece-dots" />
                  <span className="phase-piece-arrow">↗</span>
                </div>
              ))}
            </div>

            <button className="btn">
              Shop the {p.phase} edit
              <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
