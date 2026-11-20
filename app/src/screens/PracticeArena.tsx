import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { Exercise, Flaw } from '../exercises/schema.ts';
import { applyFlaws, componentRegistry } from '../exercises/registry.ts';
import {
  scoreChoice,
  scoreRegions,
  type ChoiceResult,
  type Point,
  type RegionResult,
  type Verdict,
} from '../lib/scoring.ts';
import { MIN_ATTEMPTS, type SkillStat } from '../lib/stats.ts';
import './PracticeArena.css';

type Params = Record<string, unknown>;
type Side = 'A' | 'B';
type Result = ({ kind: 'regions' } & RegionResult) | ({ kind: 'choice' } & ChoiceResult);

const TYPE_LABEL: Record<Exercise['type'], string> = {
  'find-mistake': 'Find the mistake',
  'which-better': 'Which is better',
  'spot-diff': 'Spot the difference',
};
const SKILL_LABEL: Record<Exercise['skill'], string> = {
  hierarchy: 'Hierarchy',
  spacing: 'Spacing',
  alignment: 'Alignment',
  typography: 'Typography',
  color: 'Color',
};
const VERDICT_LABEL: Record<Verdict, string> = {
  correct: 'Correct',
  partial: 'Partly right',
  wrong: 'Not quite',
};

// Authoring aid: append ?regions to the URL to outline every flaw's click target.
const SHOW_REGIONS = new URLSearchParams(window.location.search).has('regions');

// Stable identity, so React calls it once on mount rather than on every render.
const focusOnMount = (el: HTMLElement | null) => el?.focus();

const clamp = (n: number) => Math.min(100, Math.max(0, n));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

type Completion = { verdict: Verdict; score: number; hintsUsed: number };
type Props = {
  exercise: Exercise;
  index: number;
  total: number;
  onNext: () => void;
  onBack?: () => void;
  onComplete?: (r: Completion) => void;
  skillStat?: SkillStat; // accuracy for exercise.skill, shown after submit
};

export default function PracticeArena({ exercise, index, total, onNext, onBack, onComplete, skillStat }: Props) {
  const [marks, setMarks] = useState<Point[]>([]);
  const [pick, setPick] = useState<Side | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [view, setView] = useState<'before' | 'after' | null>(null); // null until revealed
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [zoom, setZoom] = useState<'fit' | 'actual'>('fit');
  const [fit, setFit] = useState<{ scale: number; w: number; h: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageHelpId = useId();

  const Component = componentRegistry[exercise.component];
  const isChoice = exercise.type === 'which-better';
  const hints = exercise.hints.filter((h): h is string => Boolean(h));
  const locked = result !== null;
  const showCorrected = view === 'after';

  const flawed = applyFlaws(exercise.base, exercise.flaws);
  const sideParams: Record<Side, Params> = {
    A: exercise.base,
    B: { ...exercise.base, ...exercise.variantB },
  };
  const paneCount = exercise.type === 'find-mistake' ? 1 : 2;
  const scale = zoom === 'fit' && fit ? fit.scale : 1;
  const panesStyle = fit
    ? ({ '--scale': scale, '--nw': fit.w, '--nh': fit.h } as CSSProperties)
    : undefined;

  // Fit: scale specimens (not chrome) to the canvas, so pixel differences are big
  // enough to see. Click maths uses % of the frame, so regions align at any scale.
  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const CROP = 24; // crop marks sit 12px outside each frame edge
    const GAP = 32;
    const CAPTION = 40;
    const measure = () => {
      const sp = el.querySelector<HTMLElement>('.sp-pane');
      if (!sp) return;
      const w = sp.offsetWidth; // transforms don't affect offset sizes
      const h = sp.offsetHeight;
      const availW = (el.clientWidth - CROP - (paneCount - 1) * GAP) / paneCount;
      const availH = el.clientHeight - CROP - CAPTION;
      const s = Math.min(2, availW / w, availH / h);
      setFit({ scale: Math.max(0.5, Math.floor(s * 20) / 20), w, h }); // 5% steps
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paneCount]);

  // Report once per exercise; the result never changes after Submit (answer locks).
  const reported = useRef(false);
  useEffect(() => {
    if (!result || reported.current) return;
    reported.current = true;
    onComplete?.({ verdict: result.verdict, score: result.score, hintsUsed });
  }, [result, hintsUsed, onComplete]);

  const better = exercise.answer?.correct ?? 'A';
  const worse: Side = better === 'A' ? 'B' : 'A';

  function addMark(p: Point) {
    setMarks((m) => [...m, p]);
    setError('');
    setAnnouncement(`Mark ${marks.length + 1} placed.`);
  }
  function removeMark(i: number) {
    setMarks((m) => m.filter((_, j) => j !== i));
    setAnnouncement(`Mark ${i + 1} removed.`);
  }

  function submit() {
    if (isChoice) {
      if (!pick || !reason) {
        setError(!pick ? 'Choose card A or B in the preview first.' : 'Choose a reason first.');
        return;
      }
      setResult({ kind: 'choice', ...scoreChoice(exercise.answer, pick, reason) });
    } else {
      if (marks.length === 0) {
        setError('Place at least one mark on the preview first.');
        return;
      }
      setResult({ kind: 'regions', ...scoreRegions(exercise.flaws, marks) });
    }
    setError('');
  }

  // After view is the clean corrected render: no outlines, no marks.
  const shownMarks = showCorrected ? [] : marks;
  const regionStatus = (f: Flaw): RegionState => {
    if (showCorrected) return 'hidden';
    if (!result) return SHOW_REGIONS ? 'debug' : 'hidden';
    if (result.kind === 'regions') return result.found.includes(f.id) ? 'found' : 'missed';
    return 'note';
  };

  return (
    <div className="arena">
      <header className="topbar">
        <div className="topbar-start">
          <span className="wordmark" translate="no">
            DesignGym
          </span>
          {onBack && (
            <button type="button" className="topbar-back" onClick={onBack}>
              Back to overview
            </button>
          )}
        </div>
        <p className="topbar-meta">
          <span>{TYPE_LABEL[exercise.type]}</span>
          <span aria-hidden="true">·</span>
          <span>{SKILL_LABEL[exercise.skill]}</span>
        </p>
        <p className="progress">
          <span className="visually-hidden">Exercise </span>
          <span className="progress-count">
            {index + 1} of {total}
          </span>
          <span className="progress-ticks" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={i <= index ? 'is-done' : undefined} />
            ))}
          </span>
        </p>
      </header>

      <div className="workspace">
        <main className="stage" aria-label="Preview">
          <div className="stage-bar">
            {view ? (
              <fieldset className="segmented">
                <legend className="visually-hidden">Preview version</legend>
                {(['before', 'after'] as const).map((v) => (
                  <label key={v}>
                    <input
                      type="radio"
                      name="version"
                      checked={view === v}
                      onChange={() => setView(v)}
                    />
                    <span>{v === 'before' ? 'Before' : 'After'}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <p id={stageHelpId} className="stage-help">
                {isChoice
                  ? 'Choose the stronger card.'
                  : locked
                    ? 'Answer locked. Numbered outlines show every problem.'
                    : 'Click a problem area to mark it. Click a mark to remove it.'}
              </p>
            )}
            <div className="zoom">
              <p className="zoom-value">{Math.round(scale * 100)}%</p>
              <fieldset className="segmented">
                <legend className="visually-hidden">Preview zoom</legend>
                {(
                  [
                    ['fit', 'Fit'],
                    ['actual', '1:1'],
                  ] as const
                ).map(([v, label]) => (
                  <label key={v}>
                    <input
                      type="radio"
                      name="zoom"
                      checked={zoom === v}
                      onChange={() => setZoom(v)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          </div>

          <div className="canvas" ref={canvasRef}>

          {exercise.type === 'find-mistake' && (
            <div className="panes" style={panesStyle} data-measured={fit ? '' : undefined}>
              <MarkPane
                Component={Component}
                params={showCorrected ? exercise.base : flawed}
                caption={showCorrected ? 'Corrected' : 'Preview'}
                flaws={exercise.flaws}
                regionStatus={regionStatus}
                marks={shownMarks}
                markHits={result?.kind === 'regions' ? result.markHits : null}
                locked={locked}
                onAdd={addMark}
                onRemove={removeMark}
                describedBy={stageHelpId}
              />
            </div>
          )}

          {exercise.type === 'spot-diff' && (
            <div className="panes" style={panesStyle} data-measured={fit ? '' : undefined}>
              <Pane caption="Reference">
                <Specimen Component={Component} params={exercise.base} />
              </Pane>
              <MarkPane
                Component={Component}
                params={showCorrected ? exercise.base : flawed}
                caption={showCorrected ? 'Corrected' : 'Changed'}
                flaws={exercise.flaws}
                regionStatus={regionStatus}
                marks={shownMarks}
                markHits={result?.kind === 'regions' ? result.markHits : null}
                locked={locked}
                onAdd={addMark}
                onRemove={removeMark}
                describedBy={stageHelpId}
              />
            </div>
          )}

          {isChoice && (
            <fieldset
              className="panes choice"
              style={panesStyle}
              data-measured={fit ? '' : undefined}
              disabled={locked}
            >
              <legend className="visually-hidden">Which card is stronger?</legend>
              {(['A', 'B'] as const).map((side) => {
                const params = showCorrected && side === worse ? sideParams[better] : sideParams[side];
                const verdict = result && side === better ? 'is-better' : '';
                return (
                  <label key={side} className={`choice-option ${verdict}`}>
                    <span className="pane-caption">
                      <input
                        type="radio"
                        name="pick"
                        value={side}
                        aria-label={`Card ${side}`}
                        checked={pick === side}
                        onChange={() => {
                          setPick(side);
                          setError('');
                        }}
                      />
                      <span className="choice-letter">{side}</span>
                      {result && side === better && <span className="choice-tag">Stronger</span>}
                      {showCorrected && side === worse && <span className="choice-tag">Corrected</span>}
                    </span>
                    <span className="frame">
                      <Specimen Component={Component} params={params} />
                      {side === worse && (
                        <Regions flaws={exercise.flaws} status={regionStatus} />
                      )}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          </div>

          <p className="visually-hidden" aria-live="polite">
            {announcement}
          </p>
        </main>

        <aside className="panel" aria-label="Exercise">
          <div className="panel-body">
          <div className="brief">
            <h1 tabIndex={-1} ref={focusOnMount}>
              {exercise.title}
            </h1>
            <p className="objective">{exercise.objective}</p>
          </div>

          {isChoice ? (
            <fieldset className="reasons" disabled={locked}>
              <legend>Why is it stronger?</legend>
              {exercise.answer.reasons.map((r) => (
                <label key={r.id} className="reason">
                  <input
                    type="radio"
                    name="reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => {
                      setReason(r.id);
                      setError('');
                    }}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            !locked && (
              <div className="marks-row">
                <p className="marks-count">
                  {marks.length === 0 ? 'No marks yet' : `${plural(marks.length, 'mark')} placed`}
                </p>
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    setMarks([]);
                    setAnnouncement('All marks cleared.');
                  }}
                  disabled={marks.length === 0}
                >
                  Clear all
                </button>
                <p className="keys">
                  Keyboard: focus the preview, move with arrow keys (Shift for bigger steps), press
                  Enter to mark.
                </p>
              </div>
            )
          )}

          {hintsUsed > 0 && (
            <section className="hints" aria-label="Hints">
              <ul>
                {hints.slice(0, hintsUsed).map((h, i) => (
                  <li key={i}>
                    <span className="hint-label">Hint {i + 1}</span>
                    {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result && (
            <Feedback
              exercise={exercise}
              result={result}
              pick={pick}
              reason={reason}
              hintsUsed={hintsUsed}
            />
          )}
          {result && skillStat && (
            <p className="skill-stat">
              {SKILL_LABEL[exercise.skill]}:{' '}
              {skillStat.enough
                ? `${Math.round(skillStat.accuracy! * 100)}% over last ${skillStat.recent}`
                : `not enough data (${skillStat.attempts} of ${MIN_ATTEMPTS})`}
            </p>
          )}
          </div>

          <div className="panel-footer">
          {locked ? (
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={onNext}>
                {index + 1 < total ? 'Next exercise' : 'Start again'}
              </button>
              {view === null && (
                <button type="button" className="btn btn-secondary" onClick={() => setView('after')}>
                  Reveal corrected
                </button>
              )}
            </div>
          ) : (
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={submit}>
                Submit answer
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setHintsUsed((n) => Math.min(hints.length, n + 1))}
                disabled={hintsUsed >= hints.length}
              >
                {hintsUsed >= hints.length
                  ? 'No hints left'
                  : `Show hint (${hints.length - hintsUsed} left)`}
              </button>
              <p className="form-error" role="alert">
                {error}
              </p>
            </div>
          )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- preview pieces ---------- */

type SpecimenComponent = ComponentType<{ params: Params }>;
type RegionState = 'hidden' | 'debug' | 'found' | 'missed' | 'note';

function Specimen({ Component, params }: { Component: SpecimenComponent; params: Params }) {
  // inert: specimens look interactive but are pictures of UI, never focus targets.
  return (
    <div className="specimen" inert>
      <Component params={params} />
    </div>
  );
}

function Pane({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="pane">
      <p className="pane-caption">{caption}</p>
      <div className="frame">{children}</div>
    </div>
  );
}

function Regions({ flaws, status }: { flaws: Flaw[]; status: (f: Flaw) => RegionState }) {
  return (
    <span className="overlay" aria-hidden="true">
      {flaws.map((f, i) => {
        const s = status(f);
        if (s === 'hidden') return null;
        const { x, y, w, h } = f.region;
        return (
          <span
            key={f.id}
            className={`region region-${s}`}
            style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
          >
            <span className="region-num">{i + 1}</span>
          </span>
        );
      })}
    </span>
  );
}

type MarkPaneProps = {
  Component: SpecimenComponent;
  params: Params;
  caption: string;
  flaws: Flaw[];
  regionStatus: (f: Flaw) => RegionState;
  marks: Point[];
  markHits: (string | null)[] | null;
  locked: boolean;
  onAdd: (p: Point) => void;
  onRemove: (i: number) => void;
  describedBy: string;
};

function MarkPane(props: MarkPaneProps) {
  const { Component, params, caption, flaws, regionStatus, marks, markHits, locked, onAdd, onRemove } =
    props;
  const [cursor, setCursor] = useState<Point>({ x: 50, y: 50 });

  function onClick(e: MouseEvent<HTMLDivElement>) {
    if (locked) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = {
      x: clamp(((e.clientX - r.left) / r.width) * 100),
      y: clamp(((e.clientY - r.top) / r.height) * 100),
    };
    setCursor(p);
    onAdd(p);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (locked || e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setCursor((c) => ({ x: clamp(c.x + dx), y: clamp(c.y + dy) }));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAdd(cursor);
    }
  }

  return (
    <div className="pane">
      <p className="pane-caption">{caption}</p>
      <div
        className={`frame frame-mark ${locked ? 'is-locked' : ''}`}
        role="application"
        aria-roledescription="markable preview"
        aria-label={`${caption}. ${plural(marks.length, 'mark')} placed.`}
        aria-describedby={props.describedBy}
        tabIndex={locked ? -1 : 0}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <Specimen Component={Component} params={params} />
        <Regions flaws={flaws} status={regionStatus} />
        {!locked && (
          <span
            className="kbd-cursor"
            aria-hidden="true"
            style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
          />
        )}
        {marks.map((m, i) => {
          const pos = { left: `${m.x}%`, top: `${m.y}%` };
          if (markHits) {
            // Locked: a plain dot. Region numbers carry the meaning now.
            return (
              <span
                key={i}
                className={`mark mark-${markHits[i] ? 'hit' : 'miss'}`}
                style={pos}
                aria-hidden="true"
              />
            );
          }
          return (
            <button
              key={i}
              type="button"
              className="mark mark-open"
              style={pos}
              tabIndex={-1}
              aria-label={`Remove mark ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
            >
              <span aria-hidden="true">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- feedback ---------- */

type FeedbackProps = {
  exercise: Exercise;
  result: Result;
  pick: Side | null;
  reason: string | null;
  hintsUsed: number;
};

function Feedback(props: FeedbackProps) {
  const { exercise, result, pick, reason, hintsUsed } = props;
  const total = exercise.flaws.length;
  const answer = exercise.answer;
  const chosenReason = answer?.reasons.find((r) => r.id === reason);
  const rightReason = answer?.reasons.find((r) => r.correct);

  const summary =
    result.kind === 'regions'
      ? [
          `${result.found.length} of ${total} found`,
          result.falsePositives > 0 ? plural(result.falsePositives, 'mark') + ' off target' : null,
        ]
      : [result.pickCorrect ? `You picked ${pick}` : `You picked ${pick}; ${answer?.correct} is stronger`];
  const meta = [...summary, hintsUsed ? plural(hintsUsed, 'hint') + ' used' : null].filter(Boolean);

  return (
    <section className="feedback" aria-labelledby="feedback-verdict">
      <div>
        <div className={`verdict verdict-${result.verdict}`}>
        <VerdictIcon verdict={result.verdict} />
        <h2 id="feedback-verdict" tabIndex={-1} ref={focusOnMount}>
          {VERDICT_LABEL[result.verdict]}
        </h2>
        </div>
        <p className="verdict-meta">{meta.join(' · ')}</p>
      </div>

      {result.kind === 'choice' && (
        <div className="reason-check">
          <p>
            <span className="label">Your reason</span>
            {chosenReason?.label}
          </p>
          {!result.reasonCorrect && (
            <p>
              <span className="label">Main reason</span>
              {rightReason?.label}
            </p>
          )}
        </div>
      )}

      <div className="fb-block">
        <h3>{result.kind === 'choice' ? `What ${answer?.correct === 'A' ? 'B' : 'A'} gets wrong` : 'Problems'}</h3>
        <ol className="flaw-list">
          {exercise.flaws.map((f, i) => {
            const found = result.kind === 'regions' && result.found.includes(f.id);
            const state = result.kind === 'choice' ? 'info' : found ? 'found' : 'missed';
            return (
              <li key={f.id} className={`flaw flaw-${state}`}>
                <span className="flaw-num" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <p className="flaw-label">
                    {f.label}
                    {state !== 'info' && (
                      <span className="flaw-state">{found ? 'Found' : 'Missed'}</span>
                    )}
                  </p>
                  <p className="flaw-why">{f.explanation}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="fb-block">
        <h3>Principle</h3>
        <p>{exercise.principle}</p>
      </div>
      {exercise.tradeoffs && (
        <div className="fb-block">
          <h3>Trade-offs</h3>
          <p>{exercise.tradeoffs}</p>
        </div>
      )}

</section>
  );
}

function VerdictIcon({ verdict }: { verdict: Verdict }) {
  const d = {
    correct: 'M6 10.5l2.5 2.5L14 7.5',
    partial: 'M6.5 10h7',
    wrong: 'M7 7l6 6M13 7l-6 6',
  }[verdict];
  return (
    <svg className="verdict-icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8.25" />
      <path d={d} />
    </svg>
  );
}
