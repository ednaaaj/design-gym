import { useRef, type CSSProperties } from 'react';
import type { Exercise, Flaw, Skill } from '../exercises/schema.ts';
import { applyFlaws, componentRegistry, exercises } from '../exercises/registry.ts';
import { SKILLS, type Attempt } from '../lib/storage.ts';
import { MIN_ATTEMPTS, skillAccuracy, weakestSkill } from '../lib/stats.ts';
import { SKILL_LABEL, pct } from './landingText.ts';
import { useCountUp, useDemoStep } from './landingMotion.ts';
import Blueprint from './Blueprint.tsx';
import { BP_SCHEDULE, BP_TIMING } from '../lib/blueprint.ts';
import dumbbell from '../assets/design-dumbbell.webp';

/* Landing previews. Each is built from the real specimens and arena vocabulary
   (.frame, .region, .mark), at a fixed design size; Landing.css zooms them to fit. */

const byId = (id: string) => exercises.find((e) => e.id === id) ?? exercises[0];
const PROFILE = byId('fm-profile-spacing');
const TOAST = byId('fm-toast-color');
const STATS = byId('wb-stat-typography');

/* A demo's first step rests until its blueprint has built and been read: the build, one
   row stagger, then a beat to take in the finished picture. Only the first visit waits on
   the build, but step 0 is the meaningful picture, so the wait is never empty. */
const SETTLE_MS = BP_SCHEDULE.end + BP_TIMING.stagger + 600;

const box = (r: Flaw['region']): CSSProperties => ({
  left: `${r.x}%`,
  top: `${r.y}%`,
  width: `${r.w}%`,
  height: `${r.h}%`,
});

function Specimen({ ex, flawed = true }: { ex: Exercise; flawed?: boolean }) {
  const C = componentRegistry[ex.component];
  return (
    <div className="specimen" inert>
      <C params={flawed ? applyFlaws(ex.base, ex.flaws) : ex.base} />
    </div>
  );
}

/* ---------- hero: one exercise, played through ----------
   Purpose: show the whole Eye Trainer loop before any reading. A flawed card, the flaws
   outlined one by one (found in green, missed in red), the verdict, then Reveal corrected.
   Step 0 is the verdict, so the static and reduced-motion picture is the feedback itself. */

/* Holds in ms. Step 0 rests on the verdict after the blueprint intro; the pass after it is
   4.6s (≤5s), with the prompt step held long enough to read. */
const HERO_HOLDS = [BP_SCHEDULE.end + 1600, 1900, 1400, 450, 450, 400] as const;

/** intro: build from the blueprint on load. hold: wait (the page intro is still on stage). */
export function HeroSpecimen({ intro, hold = false }: { intro: boolean; hold?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const step = useDemoStep(ref, HERO_HOLDS, hold);
  const phase = step === 0 ? 'feedback' : step === 1 ? 'corrected' : 'inspect';
  const outlined = step === 0 ? 3 : Math.max(0, step - 2);
  const missed = PROFILE.flaws[2];
  return (
    <figure className="lp-hero-figure" ref={ref} data-phase={phase}>
      <img
        className="lp-hero-bell"
        src={dumbbell}
        alt="A 3D dumbbell built from design tools: a plate tiled as a pixel-grid color wheel, a pen-tool handle with anchor and control points, and a tomato hex weight stamped Aa."
        width={1600}
        height={843}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <div className="frame" aria-hidden="true">
        <Specimen ex={PROFILE} />
        <div className="lp-hero-fixed">
          <Specimen ex={PROFILE} flawed={false} />
        </div>
        <span className="overlay">
          {PROFILE.flaws.map((f, i) => (
            <span
              key={f.id}
              className={`region ${i < 2 ? 'region-found' : 'region-missed'}`}
              style={box(f.region)}
              data-on={i < outlined || undefined}
            >
              <span className="region-num">{i + 1}</span>
            </span>
          ))}
        </span>
      </div>
      <figcaption className="lp-chip">
        <span className="lp-chip-pane" data-pane="feedback">
          <span className="lp-chip-verdict">Partly right, 67%</span>
          <span className="lp-chip-line">
            2 of 3 spacing flaws found, no stray marks. Missed: {missed.label.toLowerCase()}.
          </span>
          <span className="lp-chip-why">{missed.explanation}</span>
        </span>
        <span className="lp-chip-pane" data-pane="corrected" aria-hidden="true">
          <span className="lp-chip-verdict lp-chip-ok">Reveal corrected</span>
          <span className="lp-chip-line">The same card, all 3 flaws fixed.</span>
          <span className="lp-chip-why">24px padding both sides, 16px avatar to name, 12px between buttons.</span>
        </span>
        <span className="lp-chip-pane" data-pane="inspect" aria-hidden="true">
          <span className="lp-chip-verdict lp-chip-plain">Exercise 1 · Spacing</span>
          <span className="lp-chip-line">This card has 3 spacing flaws. Mark each one, then Submit.</span>
          <span className="lp-chip-why">After Submit, every flaw is outlined, found or missed.</span>
        </span>
      </figcaption>
      <Blueprint subjects=".frame, .lp-chip" skip={!intro} hold={hold} />
    </figure>
  );
}

/* ---------- feedback panel and corrected card (How a session works) ---------- */

export function FeedbackPanel() {
  return (
    <div className="lp-fb">
      <p className="lp-fb-verdict">Partly right</p>
      <p className="lp-fb-meta">2 of 3 flaws found · 0 stray marks · score 67%</p>
      <ol className="lp-fb-list">
        {PROFILE.flaws.map((f, i) => (
          <li key={f.id} data-state={i < 2 ? 'found' : 'missed'}>
            <span className="lp-fb-num" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <p className="lp-fb-label">
                {f.label} <span className="lp-fb-state">{i < 2 ? 'Found' : 'Missed'}</span>
              </p>
              <p className="lp-fb-why">{f.explanation}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CorrectedSpecimen() {
  return (
    <div className="lp-after">
      <div className="frame" aria-hidden="true">
        <Specimen ex={PROFILE} flawed={false} />
      </div>
    </div>
  );
}

/* ---------- tile 1: Visual Eye Trainer, mid-exercise ---------- */

/* Purpose: show what you actually do in the trainer. A crosshair travels to a flaw and drops
   a numbered mark, twice; the counter follows. Step 0 is the finished state with both marks. */
const EYE_HOLDS = [SETTLE_MS, 600, 800, 550, 800, 550] as const; // pass 3.3s
const AIM_REST = { x: 90, y: 93 }; // empty mat below the toast

export function EyePreview() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useDemoStep(ref, EYE_HOLDS);
  const targets = TOAST.flaws.slice(0, 2).map((f) => ({ x: f.region.x + f.region.w / 2, y: f.region.y + f.region.h / 2 }));
  const marks = step === 0 ? 2 : step >= 5 ? 2 : step >= 3 ? 1 : 0;
  const aim = step <= 1 ? AIM_REST : targets[step <= 3 ? 0 : 1];
  return (
    <div className="lp-canvas lp-eye" ref={ref} data-aiming={step > 0 || undefined}>
      <p className="lp-eye-meta">
        <span>
          Exercise {exercises.indexOf(TOAST) + 1} of {exercises.length}
        </span>
        <span>{SKILL_LABEL[TOAST.skill]}</span>
      </p>
      <div className="frame">
        <Specimen ex={TOAST} />
        <span className="overlay">
          {targets.map((t, i) => (
            <span key={i} className="mark" style={{ left: `${t.x}%`, top: `${t.y}%` }} data-on={i < marks || undefined}>
              {i + 1}
            </span>
          ))}
          {/* translate % is relative to this full-size layer, so x/y are the flaw's own percentages */}
          <span className="lp-eye-aim" style={{ transform: `translate(${aim.x}%, ${aim.y}%)` }}>
            <span className="lp-eye-cursor" />
          </span>
        </span>
      </div>
      <div className="lp-eye-prompt">
        <p>
          <b>Select the flaw.</b> {TOAST.objective.replace(' Click each one on the preview.', '')}
        </p>
        <span className="lp-eye-count">{marks} marked</span>
        <span className="lp-eye-submit">Submit answer</span>
      </div>
    </div>
  );
}

/* ---------- tile 2: Design System Playground, a token board ---------- */

const INK = 'var(--spec-ink)';
const BLUE = 'var(--spec-link)';
const SWATCHES = [
  ['ink-2', 'var(--spec-ink-2)'],
  ['line', 'var(--spec-line)'],
  ['link', BLUE],
  ['ok', 'var(--spec-ok-swatch)'],
  ['error', 'var(--spec-error)'],
] as const;

/* Purpose: the one idea the playground teaches, "change one value, everything updates".
   Radius goes 8 → 16 → 2 → 8, then primary goes ink → blue → ink, and the buttons, inputs
   and card switch together. Values switch instantly (no tweened color or radius); only the
   slider knob moves. Step 0 is the default system. */
const PG_STEPS = [
  { r: 8, primary: INK, edit: 'primary', hold: SETTLE_MS },
  { r: 16, primary: INK, edit: 'radius', hold: 1200 },
  { r: 2, primary: INK, edit: 'radius', hold: 1200 },
  { r: 8, primary: INK, edit: 'radius', hold: 1000 },
  { r: 8, primary: BLUE, edit: 'primary', hold: 1600 },
] as const; // pass 5s; the return to step 0 is an instant switch
const PG_HOLDS = PG_STEPS.map((s) => s.hold);
const R_MAX = 20;

export function PlaygroundPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useDemoStep(ref, PG_HOLDS);
  const t = PG_STEPS[step];
  const vars = { '--pg-r': `${t.r}px`, '--pg-primary': t.primary } as CSSProperties;
  return (
    <div className="lp-canvas lp-pg sp-pane" ref={ref} style={vars} data-edit={step > 0 ? t.edit : undefined}>
      <div className="lp-pg-tokens">
        <div className="lp-pg-group">
          <p className="lp-pg-head">Color</p>
          <div className="lp-pg-swatches">
            <span className="lp-pg-primary">
              <i style={{ background: t.primary }} />
              primary
            </span>
            {SWATCHES.map(([name, c]) => (
              <span key={name}>
                <i style={{ background: c }} />
                {name}
              </span>
            ))}
          </div>
        </div>
        <div className="lp-pg-group lp-pg-radius">
          <p className="lp-pg-head">
            Radius <b>{t.r}px</b>
          </p>
          <span className="lp-pg-slider">
            <span className="lp-pg-knob" style={{ transform: `translateX(${(t.r / R_MAX) * 100}%)` }}>
              <i />
            </span>
          </span>
        </div>
        <div className="lp-pg-group">
          <p className="lp-pg-head">Type scale · 1.2</p>
          <div className="lp-pg-type">
            {[14, 16, 20, 24].map((s) => (
              <span key={s}>
                <b style={{ fontSize: s }}>Aa</b>
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="lp-pg-group">
          <p className="lp-pg-head">Spacing · 8pt</p>
          <div className="lp-pg-space">
            {[4, 8, 16, 24, 32].map((s) => (
              <span key={s}>
                <i style={{ width: s * 2.5 }} />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="lp-pg-comp sp-card">
        <p className="lp-pg-head">Button</p>
        <div className="lp-pg-buttons">
          {['Default', 'Hover', 'Focus', 'Disabled'].map((s) => (
            <span key={s}>
              <span className={`sp-btn sp-btn-solid is-${s.toLowerCase()}`}>Save</span>
              {s}
            </span>
          ))}
        </div>
        <p className="lp-pg-head">Input</p>
        <div className="sp-input">mara@northwind.co</div>
        <div className="sp-input is-error">mara@northwind</div>
        <p className="lp-pg-error">Enter a full email address.</p>
        <p className="lp-pg-head">Checks</p>
        <ul className="lp-pg-checks">
          <li>
            Spacing on the 8pt scale <b>5 of 5</b>
          </li>
          <li>
            Focus ring contrast <b>7.5:1</b>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- tile 3: Motion Lab, one modal entrance three ways ----------
   Purpose: the judgment the lab trains. The same modal enters too slow, then abrupt, then
   polished; the curve beside it is the one in use and the dot rides it (x is time, y is the
   eased value). Step 0 is the settled polished modal, which is also the static picture. */

const EASES = [
  { id: 'slow', name: 'Too slow', spec: '900ms · ease-in', why: 'Starts late, feels laggy', ms: 900, fn: 'cubic-bezier(0.42, 0, 1, 1)', d: 'M0 72 C43.7 72 104 0 104 0' },
  { id: 'abrupt', name: 'Abrupt', spec: '60ms · linear', why: 'Pops in, no continuity', ms: 60, fn: 'linear', d: 'M0 72 L104 0' },
  { id: 'polished', name: 'Polished', spec: '240ms · ease-out', why: 'Instant response, soft landing', ms: 240, fn: 'cubic-bezier(0.23, 1, 0.32, 1)', d: 'M0 72 C23.9 0 33.3 0 104 0' },
] as const;
// [ease index, modal shown, hold]. Each entrance holds long enough to read its verdict.
const MO_STEPS = [
  [2, true, SETTLE_MS],
  [0, false, 400],
  [0, true, 1800],
  [1, false, 400],
  [1, true, 1800],
  [2, false, 360],
] as const; // pass 4.76s, plus the final 240ms polished entrance
const MO_HOLDS = MO_STEPS.map((s) => s[2]);

export function MotionPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useDemoStep(ref, MO_HOLDS);
  const [ei, shown] = MO_STEPS[step];
  const e = EASES[ei];
  const vars = { '--mo-ms': `${e.ms}ms`, '--mo-ease': e.fn } as CSSProperties;
  return (
    <div className="lp-canvas lp-mo" ref={ref} style={vars} data-shown={shown || undefined}>
      <div className="lp-mo-stage sp-pane">
        <div className="lp-mo-app">
          <Specimen ex={STATS} flawed={false} />
        </div>
        <div className="lp-mo-scrim" />
        <div className="lp-mo-modal sp-card">
          <b>Publish changes?</b>
          <span>Your edits go live for 3 teammates.</span>
          <span className="lp-mo-actions">
            <span className="sp-btn sp-btn-outline">Cancel</span>
            <span className="sp-btn sp-btn-solid">Publish</span>
          </span>
        </div>
      </div>
      <div className="lp-mo-panel">
        <ul className="lp-mo-list">
          {EASES.map((x, i) => (
            <li key={x.id} data-on={i === ei || undefined} data-verdict={x.id === 'polished' ? 'ok' : 'bad'}>
              <b>{x.name}</b>
              <span className="lp-mo-spec">{x.spec}</span>
              <span className="lp-mo-why">{x.why}</span>
            </li>
          ))}
        </ul>
        <div className="lp-mo-curve">
          <svg viewBox="0 0 104 72" width="104" height="72">
            <path className="lp-mo-axis" d="M0 72 H104 M0 72 V0" />
            <path className="lp-mo-ease" d={e.d} />
          </svg>
          <span className="lp-mo-dot-x">
            <span className="lp-mo-dot" />
          </span>
          <span className="lp-mo-axis-label lp-mo-t">time</span>
          <span className="lp-mo-axis-label lp-mo-v">value</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- tile 4: Progress, the user's own accuracy or labeled sample data ---------- */

const SAMPLE_ACC: Record<Skill, number> = {
  hierarchy: 0.8,
  spacing: 0.53,
  alignment: 0.73,
  typography: 0.67,
  color: 0.87,
};

/* Purpose: progress is the payoff. The bars fill (CSS, keyed to the tile's entrance in
   Landing.css) and the day 1 → day 3 score counts up once, so "measured improvement" reads
   as a change, not a static number. Both render final values if they never animate. */
export function ProgressPreview({ attempts }: { attempts: Attempt[] }) {
  const own = attempts.length > 0;
  const stats = skillAccuracy(attempts);
  const weakest = own ? weakestSkill(attempts) : 'spacing';
  const ref = useRef<HTMLParagraphElement>(null);
  const post = useCountUp(ref, 40, 90);
  return (
    <div className="lp-canvas lp-pr">
      <div className="lp-pr-card">
        <p className="lp-pr-head">
          <b>Accuracy per skill</b>
          <span>{own ? 'Your last 5 attempts' : 'Sample data'}</span>
        </p>
        <ul className="lp-pr-bars">
          {SKILLS.map((s) => {
            const st = stats[s];
            const acc = own ? (st.enough ? st.accuracy : null) : SAMPLE_ACC[s];
            return (
              <li key={s} data-weakest={s === weakest || undefined} style={{ '--b': SKILLS.indexOf(s) } as CSSProperties}>
                <span>{SKILL_LABEL[s]}</span>
                <span className="lp-pr-track">{acc !== null && <i style={{ width: pct(acc) }} />}</span>
                <span className="lp-pr-val">{acc !== null ? pct(acc) : `${st.attempts} of ${MIN_ATTEMPTS}`}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="lp-pr-row">
        <div className="lp-pr-card">
          <p className="lp-pr-label">Weakest skill</p>
          <p className="lp-pr-big">{weakest ? SKILL_LABEL[weakest] : 'Not enough data'}</p>
        </div>
        <div className="lp-pr-card">
          <p className="lp-pr-label">
            Day 1 vs day 3 <span className="lp-tag">Preview</span>
          </p>
          <p className="lp-pr-big" ref={ref}>
            40% <span className="lp-pr-to">to</span> {post}%
          </p>
        </div>
      </div>
    </div>
  );
}
