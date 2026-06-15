import { useState } from 'react';
import { Sparkle } from './shared';

const PIECE_TYPES = [
  { id: 'ring',     label: 'Ring',     icon: '◯' },
  { id: 'locket',   label: 'Locket',   icon: '◌' },
  { id: 'chain',    label: 'Chain',    icon: '~' },
  { id: 'bracelet', label: 'Bracelet', icon: '⌒' },
  { id: 'earring',  label: 'Earrings', icon: '∷' },
  { id: 'other',    label: 'Other',    icon: '✦' },
];
const FINISHES = ['Mirror polish', 'Brushed satin', 'Hammered', 'Oxidised', 'Antique patina'];
const STONES   = ['No stone', 'White topaz', 'Moonstone', 'Black onyx', 'Sapphire', 'Customer-supplied'];

interface BespokeProps {
  fmt: (price: number) => string;
}

export function Bespoke({ fmt }: BespokeProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    piece: 'ring',
    finish: 'Mirror polish',
    stone: 'Moonstone',
    budget: 18000,
    name: '',
    contact: '',
    notes: '',
  });

  const set = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) =>
    setData(d => ({ ...d, [k]: v }));

  const next = () => setStep(s => Math.min(s + 1, 4));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  return (
    <section id="bespoke" className="section section-bespoke">
      <div className="bespoke-bg">
        <div className="moon-glow" />
      </div>

      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">III · BESPOKE</div>
            <h2 className="display section-title">
              From sketch to<br />
              <span className="italic-accent silver-text">finished piece —</span> 21 days.
            </h2>
          </div>
          <p className="section-blurb section-blurb-right">
            Every commission begins with a conversation. Tell us what you have in mind,
            we sketch within a week, then forge it by hand.
          </p>
        </div>

        <div className="bespoke-grid">

          {/* Left — Stepper form */}
          <div className="card bespoke-form">
            <div className="bespoke-stepper">
              {[1,2,3,4].map(n => (
                <div key={n} className={`step-pill ${step >= n ? 'on' : ''} ${step === n ? 'active' : ''}`}>
                  <span className="step-n">{String(n).padStart(2,'0')}</span>
                  <span className="step-l">
                    {n === 1 && 'Piece'}
                    {n === 2 && 'Style'}
                    {n === 3 && 'Budget'}
                    {n === 4 && 'You'}
                  </span>
                </div>
              ))}
            </div>

            <div className="bespoke-step-body">
              {step === 1 && (
                <div className="bs-pane">
                  <div className="eyebrow">STEP 01 · WHAT ARE WE MAKING?</div>
                  <h3 className="display bs-q">Choose your piece</h3>
                  <div className="piece-grid">
                    {PIECE_TYPES.map(t => (
                      <button key={t.id}
                              className={`piece-opt ${data.piece === t.id ? 'on' : ''}`}
                              onClick={() => set('piece', t.id)}>
                        <span className="piece-icon">{t.icon}</span>
                        <span className="piece-label">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="bs-pane">
                  <div className="eyebrow">STEP 02 · LOOK & FEEL</div>
                  <h3 className="display bs-q">Pick a finish and stone</h3>
                  <div className="bs-field">
                    <label className="eyebrow">FINISH</label>
                    <div className="chip-row">
                      {FINISHES.map(f => (
                        <button key={f}
                                className={`chip ${data.finish === f ? 'on' : ''}`}
                                onClick={() => set('finish', f)}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bs-field">
                    <label className="eyebrow">CENTRE STONE</label>
                    <div className="chip-row">
                      {STONES.map(s => (
                        <button key={s}
                                className={`chip ${data.stone === s ? 'on' : ''}`}
                                onClick={() => set('stone', s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="bs-pane">
                  <div className="eyebrow">STEP 03 · BUDGET</div>
                  <h3 className="display bs-q">What's your budget?</h3>
                  <p className="bs-help">Move the slider — we'll design within it. Final quote shared after sketch.</p>
                  <div className="budget-display silver-text">{fmt(data.budget)}</div>
                  <input type="range" min="4000" max="80000" step="500"
                         value={data.budget}
                         onChange={e => set('budget', +e.target.value)}
                         className="budget-slider" />
                  <div className="budget-scale">
                    <span>{fmt(4000)}</span>
                    <span>{fmt(80000)}+</span>
                  </div>
                  <div className="bs-field">
                    <label className="eyebrow">NOTES (optional)</label>
                    <textarea className="bs-textarea" rows={3}
                              placeholder="An anecdote, a memory, dimensions, anything we should know…"
                              value={data.notes}
                              onChange={e => set('notes', e.target.value)} />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="bs-pane">
                  <div className="eyebrow">STEP 04 · YOU</div>
                  <h3 className="display bs-q">Where do we send the sketch?</h3>
                  <div className="bs-field">
                    <label className="eyebrow">YOUR NAME</label>
                    <input className="bs-input" placeholder="e.g. Ananya"
                           value={data.name}
                           onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className="bs-field">
                    <label className="eyebrow">EMAIL OR WHATSAPP</label>
                    <input className="bs-input" placeholder="ananya@example.com"
                           value={data.contact}
                           onChange={e => set('contact', e.target.value)} />
                  </div>
                  <div className="bs-confirm">
                    <Sparkle size={12} style={{ opacity: 1, position: 'relative', animation: 'none' }} />
                    <span>We'll reply within 24 hours with a sketch timeline.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bs-foot">
              <button className="btn bs-back" onClick={prev} disabled={step === 1}>
                ← Back
              </button>
              <div className="bs-progress">
                <span>{step} / 4</span>
                <div className="bs-progress-bar"><div style={{ width: `${(step / 4) * 100}%` }} /></div>
              </div>
              {step < 4
                ? <button className="btn btn-primary" onClick={next}>Continue<span className="arrow">→</span></button>
                : <button className="btn btn-primary" onClick={() => alert('Commission request received ✦')}>
                    Submit commission<span className="arrow">✦</span>
                  </button>}
            </div>
          </div>

          {/* Right — Live summary */}
          <div className="bespoke-side">
            <div className="card bespoke-summary">
              <div className="ph bespoke-sketch">
                <div className="ph-stack">
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.6" style={{ color: 'var(--silver-3)' }}>
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="9" r="1.2" />
                  </svg>
                  <div className="ph-label">SKETCH PREVIEW</div>
                  <div className="ph-spec">your bespoke piece, illustrated</div>
                </div>
              </div>
              <div className="summary-rows">
                <div><span className="eyebrow">PIECE</span><strong>{PIECE_TYPES.find(p => p.id === data.piece)?.label}</strong></div>
                <div><span className="eyebrow">FINISH</span><strong>{data.finish}</strong></div>
                <div><span className="eyebrow">STONE</span><strong>{data.stone}</strong></div>
                <div><span className="eyebrow">BUDGET</span><strong className="silver-text">{fmt(data.budget)}</strong></div>
              </div>
            </div>

            <div className="card timeline-card">
              <div className="eyebrow">TYPICAL TIMELINE</div>
              <div className="tl">
                <div className="tl-row"><span className="tl-d">D 01</span><span className="tl-l">Brief & conversation</span></div>
                <div className="tl-row"><span className="tl-d">D 04</span><span className="tl-l">Sketches delivered</span></div>
                <div className="tl-row"><span className="tl-d">D 08</span><span className="tl-l">Wax model · 50% deposit</span></div>
                <div className="tl-row"><span className="tl-d">D 17</span><span className="tl-l">Casting & finishing</span></div>
                <div className="tl-row tl-row-final"><span className="tl-d">D 21</span><span className="tl-l">Hallmarked · shipped</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
