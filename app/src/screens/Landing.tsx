import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Skill } from '../exercises/schema.ts';
import { exercises } from '../exercises/registry.ts';
import { SKILLS, type Attempt } from '../lib/storage.ts';
import { MIN_ATTEMPTS, WINDOW, resumeIndex, skillAccuracy, weakestSkill } from '../lib/stats.ts';
import { BP_TIMING, bpCssVars } from '../lib/blueprint.ts';
import { nextIntroState, shouldPlayIntro, type IntroEvent, type IntroState } from '../lib/actor.ts';
import DumbbellActor from './DumbbellActor.tsx';
import Blueprint from './Blueprint.tsx';
import RevealText from './RevealText.tsx';
import RouteMap from './RouteMap.tsx';
import { canWebGL, introSeen, reduced, useScrollProgress, useScrollSpy, useSectionReveal } from './landingMotion.ts';
import {
  CorrectedSpecimen,
  EyePreview,
  FeedbackPanel,
  HeroSpecimen,
  MotionPreview,
  PlaygroundPreview,
  ProgressPreview,
} from './LandingPreviews.tsx';
import { SKILL_LABEL, pct } from './landingText.ts';
import './PracticeArena.css'; // shared .btn, .frame, .region and .mark vocabulary
import './Landing.css';

/* What exists today. Flip a value when that part ships; every label on the page follows. */
type Status = 'ready' | 'next' | 'planned';
const BUILD_STATUS = {
  eyeExercises: 'ready',
  skillAccuracy: 'ready',
  baselineTest: 'next',
  playground: 'next',
  motionLab: 'next',
  postTest: 'next',
  designBriefs: 'planned',
} as const satisfies Record<string, Status>;

const STATUS_LABEL: Record<Status, string> = {
  ready: 'Playable now',
  next: 'Coming next',
  planned: 'Planned',
};

const SECTIONS = [
  ['train', 'Four ways to train'],
  ['how', 'How it works'],
  ['exams', 'Exams'],
  ['roadmap', 'Roadmap'],
  ['improve', 'Skills'],
] as const;
const SECTION_IDS = SECTIONS.map(([id]) => id);
const BP_VARS = bpCssVars() as CSSProperties;

const LOOP: [string, string][] = [
  ['Observe', 'A live component, in real HTML and CSS.'],
  ['Decide', 'Mark each flaw, or pick the stronger card.'],
  ['Experiment', 'Mark freely. Nothing counts until Submit.'],
  ['Feedback', 'Every flaw outlined, in real numbers.'],
  ['Improve', 'The same component, corrected.'],
  ['Repeat', `Next one: ${exercises.length} across ${SKILLS.length} skills.`],
];

const SKILL_GAIN: Record<Skill, string> = {
  hierarchy: 'See what reads first, and when size, weight and color fight.',
  spacing: 'Catch unequal padding and gaps, down to a few pixels.',
  alignment: 'Notice edges that almost line up.',
  typography: 'Spot off-scale sizes, tight leading and too many styles.',
  color: 'Judge text against 4.5:1, and color used without meaning.',
};

const focusOnMount = (el: HTMLElement | null) => el?.focus();

type Props = {
  attempts: Attempt[];
  onStart: (index: number) => void;
  focusTitle?: boolean; // true when coming back from the arena; first load keeps browser focus order
};

export default function Landing({ attempts, onStart, focusTitle }: Props) {
  const returning = attempts.length > 0;
  const next = returning ? resumeIndex(attempts, exercises.map((e) => e.id)) : 0;
  const nextExercise = exercises[next];
  const ctaLabel = returning ? 'Continue practicing' : 'Start practicing';
  const start = () => onStart(next);
  const root = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  useSectionReveal(root);
  useScrollProgress(sheet);
  const current = useScrollSpy(SECTION_IDS);

  // The 3D dumbbell runs wherever motion is welcome and WebGL draws; otherwise the hero
  // keeps its WebP. Its intro plays on the first landing of a browser session only.
  const [actor] = useState(() => !reduced() && canWebGL());
  const [intro, setIntro] = useState<IntroState>(() =>
    shouldPlayIntro({ reduced: !actor, returning: !!focusTitle, seen: introSeen(), webgl: actor }) ? 'stage' : 'off',
  );
  const [skipped, setSkipped] = useState(false);
  const onIntro = (e: IntroEvent) => {
    if (e === 'skip') setSkipped(true);
    setIntro((s) => nextIntroState(s, e));
  };

  return (
    <div
      className="lp"
      ref={root}
      data-return={focusTitle || undefined}
      data-intro={intro === 'off' ? undefined : intro}
      data-skipped={skipped || undefined}
      style={BP_VARS}
    >
      {/* A construction line in the left margin that draws down the page as you read. */}
      <div className="lp-sheet" ref={sheet} aria-hidden="true">
        <i />
      </div>
      {actor && <DumbbellActor intro={intro !== 'off'} onIntro={onIntro} />}
      <a className="lp-skip" href="#lp-title">
        Skip to content
      </a>
      <header className="lp-header">
        <span className="wordmark" translate="no">
          DesignGym
        </span>
        <nav aria-label="On this page">
          <ul className="lp-nav">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} aria-current={current === id ? 'true' : undefined}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main>
        {/* ---------- 1. hero ---------- */}
        <section className="lp-hero" aria-labelledby="lp-title">
          <div className="lp-hero-text">
            <RevealText
              as="h1"
              id="lp-title"
              tabIndex={-1}
              ref={focusTitle ? focusOnMount : undefined}
              text="Train your eye for interface details."
              split="words"
            />
            <p className="lp-lead">
              Mark what’s off in live components. Get feedback in real pixels and contrast ratios.
            </p>
            <div className="lp-cta">
              <button type="button" className="btn btn-primary btn-lg" onClick={start}>
                {ctaLabel}
                <Arrow />
              </button>
              {returning && (
                <p className="lp-next">
                  Next up: exercise {next + 1} of {exercises.length}, {nextExercise.title.toLowerCase()}
                </p>
              )}
            </div>
            <ul className="lp-facts">
              <li>About 10 min a day</li>
              <li>3 days</li>
              <li>No signup</li>
              <li>Saved in this browser</li>
            </ul>
          </div>
          <HeroSpecimen intro={!focusTitle && !skipped} hold={intro === 'stage'} />
        </section>

        {returning && <ProgressStrip attempts={attempts} />}

        {/* ---------- 2. four ways to train ---------- */}
        <section className="lp-section" id="train" aria-labelledby="train-title">
          <SectionHead id="train" title="Four ways to train">
            Every preview is built from the real components. Labels show what’s playable today.
          </SectionHead>
          <div className="lp-tiles">
            <Tile
              title="Visual Eye Trainer"
              desc="Find the flaw in a live component. Every miss is explained in pixels."
              ground="dark"
              preview={<EyePreview />}
              measure=".lp-eye .frame, .lp-eye-prompt"
              onOpen={start}
              index={0}
              status={
                <>
                  <StatusLabel status={BUILD_STATUS.eyeExercises} />
                  <span>{exercises.length} exercises</span>
                </>
              }
            />
            <Tile
              title="Design System Playground"
              desc="Change one token; every button, input and card follows."
              ground="light"
              preview={<PlaygroundPreview />}
              measure=".lp-pg-tokens, .lp-pg-comp"
              built={BUILD_STATUS.playground}
              index={1}
              status={<StatusLabel status={BUILD_STATUS.playground} />}
            />
            <Tile
              title="Motion Lab"
              desc="Tune duration and easing on real components, slowed to 0.25x."
              ground="light"
              preview={<MotionPreview />}
              measure=".lp-mo-stage, .lp-mo-panel"
              built={BUILD_STATUS.motionLab}
              index={0}
              status={<StatusLabel status={BUILD_STATUS.motionLab} />}
            />
            <Tile
              title="Progress"
              desc="Accuracy per skill, updated after every attempt."
              ground="dark"
              preview={<ProgressPreview attempts={attempts} />}
              measure=".lp-pr-card"
              index={1}
              status={
                <>
                  <StatusLabel status={BUILD_STATUS.skillAccuracy} prefix="Accuracy" />
                  <StatusLabel status={BUILD_STATUS.postTest} prefix="Day 1 vs day 3" />
                </>
              }
            />
          </div>
        </section>

        {/* ---------- 3. how a session works ---------- */}
        <section className="lp-section" id="how" aria-labelledby="how-title">
          <SectionHead id="how" title="How a session works">
            Every exercise runs the same loop. Below: real feedback from exercise 1.
          </SectionHead>
          <ol className="lp-loop" data-reveal="0">
            {LOOP.map(([term, text], i) => (
              <li key={term} style={{ '--i': i } as CSSProperties}>
                <span className="lp-loop-dot" aria-hidden="true">
                  {i + 1}
                </span>
                <p className="lp-loop-term">{term}</p>
                <p className="lp-loop-text">{text}</p>
              </li>
            ))}
          </ol>
          <div className="lp-loop-back" aria-hidden="true" data-reveal="0" />
          <div className="lp-how-pair">
            <figure className="lp-panel">
              <figcaption className="lp-panel-cap">
                <b>Feedback</b> after Submit
              </figcaption>
              <FeedbackPanel />
              <Blueprint mode="outline" />
            </figure>
            <figure className="lp-panel" style={stagger(1)}>
              <figcaption className="lp-panel-cap">
                <b>Improve</b> the same card, 3 flaws fixed
              </figcaption>
              <CorrectedSpecimen />
              <Blueprint mode="outline" />
            </figure>
          </div>
        </section>

        {/* ---------- 4. exams and scoring ---------- */}
        <section className="lp-section" id="exams" aria-labelledby="exams-title">
          <div className="lp-exams">
            <div>
              <SectionHead id="exams" title="The exams">
                The same 5 questions on day 1 and day 3. The difference is your measured improvement.
              </SectionHead>
              <dl className="lp-exam-list" data-reveal="1">
                <div>
                  <dt>Baseline test</dt>
                  <dd>Day 1, before practice.</dd>
                  <dd>
                    <StatusLabel status={BUILD_STATUS.baselineTest} />
                  </dd>
                </div>
                <div>
                  <dt>Post test</dt>
                  <dd>Day 3, the same 5 questions.</dd>
                  <dd>
                    <StatusLabel status={BUILD_STATUS.postTest} />
                  </dd>
                </div>
              </dl>
            </div>
            <ScoreCompare />
          </div>

          <RevealText as="h3" className="lp-subhead rt-host" data-reveal="0" text="How answers are scored" />
          <dl className="lp-rules" data-reveal="0">
            <div>
              <dt>Each exercise</dt>
              <dd>Correct, partly right or not quite. Hints never lower it.</dd>
            </div>
            <div className="lp-rule-wide">
              <dt>Finding flaws</dt>
              <dd>
                Flaws found minus stray marks, over all flaws.
                <span className="lp-formula" aria-hidden="true">
                  <span>
                    (<b>2</b> found − <b>0</b> stray) ÷ <b>3</b> = <b className="lp-ok">67%</b>
                  </span>
                  <span>
                    (<b>2</b> found − <b>1</b> stray) ÷ <b>3</b> = <b className="lp-bad">33%</b>
                  </span>
                </span>
                <span className="visually-hidden">
                  Find 2 of 3 with no stray marks and you score 67%; add one stray mark and it drops to 33%.
                </span>
              </dd>
            </div>
            <div>
              <dt>Comparisons</dt>
              <dd>Right card, main reason: 100%. Right card, other reason: 50%.</dd>
            </div>
            <div>
              <dt>Accuracy per skill</dt>
              <dd>Your last {WINDOW} attempts, averaged. Early mistakes drop out.</dd>
            </div>
            <div>
              <dt>Minimum data</dt>
              <dd>A skill counts after {MIN_ATTEMPTS} attempts.</dd>
            </div>
            <div>
              <dt>Who scores</dt>
              <dd>Fixed rules, never AI. Same answer, same score.</dd>
            </div>
          </dl>
        </section>

        {/* ---------- 5. roadmap ---------- */}
        <section className="lp-section lp-roadmap" id="roadmap" aria-labelledby="roadmap-title">
          <div className="lp-roadmap-head">
            <SectionHead id="roadmap" title="Roadmap">
              3 days, about 10 minutes each. Only the eye exercises are built so far.
            </SectionHead>
          </div>
          <RouteMap>
            <ol className="rm-days">
              <Day n={1} name="Eye" outcome="a baseline score and your weakest skill.">
                <Part status={BUILD_STATUS.baselineTest}>Baseline test, 5 questions</Part>
                <Part status={BUILD_STATUS.eyeExercises}>Hierarchy and spacing exercises</Part>
              </Day>
              <Day n={2} name="Systems" outcome="your own mini design system.">
                <Part status={BUILD_STATUS.playground}>Design system playground: edit tokens, watch components follow</Part>
                <Part status={BUILD_STATUS.playground}>3 challenges: 8-point spacing, one type scale, visible states</Part>
              </Day>
              <Day n={3} name="Motion" outcome="timing you can defend, and your day 1 vs day 3 score.">
                <Part status={BUILD_STATUS.motionLab}>3 motion exercises: button press, modal, tab indicator</Part>
                <Part status={BUILD_STATUS.postTest}>Post test, the same 5 questions</Part>
              </Day>
            </ol>
            <div className="rm-stop rm-goal" data-stop>
              <h3 className="rm-head" data-waypoint>
                <span className="rm-label">
                  Goal
                  <span className="visually-hidden">:</span>
                </span>
                <span className="rm-name">Your score, before and after</span>
              </h3>
              <div className="rm-stop-body lp-desc lp-desc-status">
                <p>Day 1 and day 3, side by side for each skill.</p>
                <StatusLabel status={BUILD_STATUS.postTest} />
              </div>
            </div>
          </RouteMap>
        </section>

        {/* ---------- 6. what you'll improve ---------- */}
        <section className="lp-section" id="improve" aria-labelledby="improve-title">
          <SectionHead id="improve" title="What you’ll improve">
            Each exercise trains one of {SKILLS.length} skills, until you catch these problems unprompted.
          </SectionHead>
          <ul className="lp-skills">
            {SKILLS.map((s, i) => (
              <li key={s} data-reveal={i}>
                <SkillDiagram skill={s} />
                <h3>{SKILL_LABEL[s]}</h3>
                <p>{SKILL_GAIN[s]}</p>
              </li>
            ))}
          </ul>
          <ul className="lp-skills lp-skills-later" data-reveal="0">
            <li>
              <span className="lp-dia lp-dia-scale" aria-hidden="true">
                {[4, 8, 16, 24, 32].map((n) => (
                  <i key={n} style={{ width: n * 2.5 }} />
                ))}
              </span>
              <div>
                <h3>Systems</h3>
                <p>Consistency from tokens, not one-off values.</p>
              </div>
            </li>
            <li>
              <span className="lp-dia lp-dia-ease" aria-hidden="true">
                <svg viewBox="0 0 104 64" width="104" height="64">
                  <path d="M0 64 C23.9 0 33.3 0 104 0" />
                </svg>
              </span>
              <div>
                <h3>Motion</h3>
                <p>Timing with a purpose, and a reduced-motion version of every animation.</p>
              </div>
            </li>
          </ul>

          <div className="lp-finish">
            <Blueprint mode="outline" />
            <RevealText as="h3" className="lp-subhead rt-host" text="After you finish" />
            <ul className="lp-finish-list">
              <li>
                <b>Day 1 vs day 3</b> Both scores, per skill.
              </li>
              <li>
                <b>Your weakest skill</b> So you know what to repeat.
              </li>
              <li>
                <b>Your mini design system</b> Your tokens, saved in this browser.
              </li>
            </ul>
            <p className="lp-note">
              These arrive with the parts marked “Coming next”.
            </p>
            <div className="lp-later">
              <p>
                <b>Later:</b> design briefs: redesign a screen, compare before and after.
              </p>
              <StatusLabel status={BUILD_STATUS.designBriefs} />
            </div>
          </div>
        </section>

        {/* ---------- 7. closing ---------- */}
        <section className="lp-end" aria-labelledby="lp-end-title">
          <h2 id="lp-end-title" className="visually-hidden">
            {returning ? 'Pick up where you left off' : 'Where to start'}
          </h2>
          <p className="lp-end-statement" data-reveal="0">
            <b>Start with the Visual Eye Trainer.</b> It’s playable today, and everything after it
            assumes you can already see a 4px gap.
          </p>
          <div className="lp-cta">
            <button type="button" className="btn btn-primary btn-lg" onClick={start}>
              {ctaLabel}
              <Arrow />
            </button>
            <p className="lp-next">
              {returning ? `Exercise ${next + 1} of ${exercises.length}` : 'Exercise 1'}:{' '}
              {nextExercise.title.toLowerCase()}, about 2 minutes
            </p>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <p>
          <span translate="no">DesignGym</span> v0.1 runs entirely in your browser. Nothing you do is sent
          anywhere.
        </p>
      </footer>
    </div>
  );
}

/* ---------- pieces ---------- */

/* Blueprint stagger within a row; Blueprint.tsx and Landing.css both read --bp-delay. */
const stagger = (i: number) => ({ '--bp-delay': `${i * BP_TIMING.stagger}ms` }) as CSSProperties;

/* The forward arrow on real actions only; it nudges on hover. */
function Arrow() {
  return (
    <svg className="lp-arrow" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M3 8h9.5M8.5 4l4 4-4 4" />
    </svg>
  );
}

function SectionHead({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="lp-head" data-reveal="0">
      <RevealText as="h2" id={`${id}-title`} text={title} />
      <p>{children}</p>
    </div>
  );
}

function StatusLabel({ status, prefix }: { status: Status; prefix?: string }) {
  return (
    <span className="lp-status" data-status={status}>
      {prefix && <span className="lp-status-pre">{prefix}:</span>}
      {STATUS_LABEL[status]}
    </span>
  );
}

function Tile(props: {
  title: string;
  desc: string;
  ground: 'dark' | 'light';
  preview: ReactNode;
  measure: string; // the boxes inside the preview its blueprint dimensions
  status: ReactNode;
  built?: Status; // anything not built yet gets a visible "Preview" tag on its picture
  onOpen?: () => void;
  index: number; // entrance stagger within its row
}) {
  return (
    <article className="lp-tile" data-interactive={props.onOpen ? '' : undefined} style={stagger(props.index)}>
      <div className="lp-tile-preview" data-ground={props.ground} aria-hidden="true">
        {props.preview}
        {props.built && props.built !== 'ready' && <span className="lp-tag lp-tile-tag">Preview</span>}
        <Blueprint subjects={props.measure} />
      </div>
      <h3 className="lp-tile-title">
        {props.onOpen ? (
          <button type="button" className="lp-tile-link" onClick={props.onOpen}>
            {props.title}
            <Arrow />
          </button>
        ) : (
          props.title
        )}
      </h3>
      <p className="lp-tile-desc">{props.desc}</p>
      <p className="lp-tile-status">{props.status}</p>
    </article>
  );
}

function ScoreCompare() {
  // Per-question scores, 0..1. Illustrative only; labeled as sample on the page.
  const rows = [
    ['Day 1 baseline', [1, 0.5, 0, 0, 0.5]],
    ['Day 3 post test', [1, 1, 0.5, 1, 1]],
  ] as const;
  const total = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
  const state = (x: number) => (x === 1 ? 'correct' : x > 0 ? 'partial' : 'wrong');
  return (
    <figure className="lp-score" style={stagger(1)}>
      <div className="lp-score-rows">
        {rows.map(([label, xs]) => (
          <div key={label} className="lp-score-row">
            <span className="lp-score-label">{label}</span>
            <span className="lp-score-cells">
              {xs.map((x, i) => (
                <span key={i} className="lp-cell" data-state={state(x)}>
                  <span className="visually-hidden">
                    Question {i + 1}: {state(x)}.
                  </span>
                  <span aria-hidden="true">Q{i + 1}</span>
                </span>
              ))}
            </span>
            <span className="lp-score-total">{total(xs)} / 5</span>
          </div>
        ))}
      </div>
      <p className="lp-score-delta">
        <b>+2.5</b> measured improvement
      </p>
      <figcaption>
        Sample scores. Yours appear once both tests are built.
        <span className="lp-legend" aria-hidden="true">
          <span data-state="correct">Correct</span>
          <span data-state="partial">Partly right</span>
          <span data-state="wrong">Not quite</span>
        </span>
      </figcaption>
      <Blueprint mode="outline" />
    </figure>
  );
}

function SkillDiagram({ skill }: { skill: Skill }) {
  switch (skill) {
    case 'hierarchy':
      return (
        <span className="lp-dia lp-dia-hier" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      );
    case 'spacing':
      return (
        <span className="lp-dia lp-dia-space" aria-hidden="true">
          <span className="lp-dia-box">
            <i />
          </span>
          <b className="l">12</b>
          <b className="r">24</b>
        </span>
      );
    case 'alignment':
      return (
        <span className="lp-dia lp-dia-align" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      );
    case 'typography':
      return (
        <span className="lp-dia lp-dia-type" aria-hidden="true">
          <span>
            Aa<b>16</b>
          </span>
          <span className="off">
            Aa<b>17</b>
          </span>
          <span>
            Aa<b>20</b>
          </span>
        </span>
      );
    case 'color':
      return (
        <span className="lp-dia lp-dia-color" aria-hidden="true">
          <span className="fail">
            <i>Aa</i>
            <b>2.0:1</b>
          </span>
          <span className="pass">
            <i>Aa</i>
            <b>6.8:1</b>
          </span>
        </span>
      );
  }
}

function Day(props: { n: number; name: string; outcome: string; children: ReactNode }) {
  return (
    <li className="rm-stop" data-stop>
      <h3 className="rm-head" data-waypoint>
        <span className="rm-label">
          Day {props.n}
          <span className="visually-hidden">:</span>
        </span>
        <span className="rm-name">{props.name}</span>
      </h3>
      <div className="rm-stop-body lp-desc">
        <ul className="lp-parts">{props.children}</ul>
        <p className="lp-outcome">
          <strong>You walk away with</strong> {props.outcome}
        </p>
      </div>
    </li>
  );
}

function Part({ status, children }: { status: Status; children: ReactNode }) {
  return (
    <li>
      <span>{children}</span>
      <StatusLabel status={status} />
    </li>
  );
}

function ProgressStrip({ attempts }: { attempts: Attempt[] }) {
  const stats = skillAccuracy(attempts);
  const weakest = weakestSkill(attempts);
  return (
    <section className="lp-strip" aria-labelledby="progress-title">
      <div className="lp-strip-head">
        <h2 id="progress-title">Your progress</h2>
        <p>
          {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'} saved
          {weakest && (
            <>
              {' · '}
              <span className="lp-strip-weak">Repeat {SKILL_LABEL[weakest].toLowerCase()}</span>
            </>
          )}
        </p>
      </div>
      <ul className="lp-strip-skills" aria-label={`Accuracy per skill, last ${WINDOW} attempts`}>
        {SKILLS.map((s) => {
          const st = stats[s];
          const score = st.enough ? st.accuracy! : null;
          return (
            <li key={s} data-weakest={s === weakest || undefined} data-empty={score === null || undefined}>
              <Ring value={score} />
              <span className="lp-strip-name">{SKILL_LABEL[s]}</span>
              {score !== null ? (
                <span className="lp-strip-val">{pct(score)}</span>
              ) : (
                <span className="lp-strip-dots">
                  <span aria-hidden="true">
                    {Array.from({ length: MIN_ATTEMPTS }, (_, i) => (
                      <i key={i} data-on={i < st.attempts || undefined} />
                    ))}
                  </span>
                  {Math.min(st.attempts, MIN_ATTEMPTS)}/{MIN_ATTEMPTS}
                  <span className="visually-hidden"> attempts, no score yet</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* A skill meter: the share of the ring filled is the accuracy. No score yet draws a dashed
   ring, so an empty meter never reads as 0%. */
function Ring({ value }: { value: number | null }) {
  return (
    <svg className="lp-ring" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">
      <circle className="lp-ring-track" cx="20" cy="20" r="17" />
      {value !== null && <circle className="lp-ring-fill" cx="20" cy="20" r="17" pathLength={100} strokeDasharray={`${value * 100} 100`} />}
    </svg>
  );
}
