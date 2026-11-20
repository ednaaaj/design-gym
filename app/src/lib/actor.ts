/* Pure pose math for the landing's 3D dumbbell (screens/DumbbellActor.tsx). No DOM, no three.

   A pose is the box the dumbbell's poster image would fill: its center (x, y) and width w in
   CSS px, plus the model's rotation in radians. Stops are in document px (y includes scroll),
   so a resting dumbbell scrolls with its section like any other content; poseAt turns them
   into viewport px for one scroll position. Everything writes into an `out` object, so the
   scroll path allocates nothing per frame. */

export type Pose = { x: number; y: number; w: number; rx: number; ry: number; rz: number };

/** One waypoint. It holds while scrollY is within [at, until]. A ride stop stays at the same
    viewport height through its hold (its document y advances with scroll), so it travels
    down beside its section instead of scrolling away. drift turns it slightly about its
    vertical axis across the hold, so it never sits dead still while the page moves. */
export type Stop = { at: number; until: number; pose: Pose; ride?: boolean; drift?: number };

/** Viewport facts the travel between stops needs. gutterR / gutterL: x of each side margin's
    center; gutterW: the widest the dumbbell can be to fit a margin. */
export type Stage = { vw: number; vh: number; gutterL: number; gutterR: number; gutterW: number };

export const pose = (x = 0, y = 0, w = 0, rx = 0, ry = 0, rz = 0): Pose => ({ x, y, w, rx, ry, rz });

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Cubic ease-in-out: no overshoot, symmetric. Used for spins and travel between stops. */
export const easeInOut = (t: number): number => {
  const u = clamp01(t);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};
/** Quartic ease-out: fast start, long settle. Used for the intro's flight to the hero. */
export const easeOutQuart = (t: number): number => 1 - Math.pow(1 - clamp01(t), 4);

export function copyPose(out: Pose, p: Pose): Pose {
  out.x = p.x;
  out.y = p.y;
  out.w = p.w;
  out.rx = p.rx;
  out.ry = p.ry;
  out.rz = p.rz;
  return out;
}

export function lerpPose(out: Pose, a: Pose, b: Pose, t: number): Pose {
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.w = lerp(a.w, b.w, t);
  out.rx = lerp(a.rx, b.rx, t);
  out.ry = lerp(a.ry, b.ry, t);
  out.rz = lerp(a.rz, b.rz, t);
  return out;
}

export const posesEqual = (a: Pose, b: Pose, eps = 0.01): boolean =>
  Math.abs(a.x - b.x) < eps &&
  Math.abs(a.y - b.y) < eps &&
  Math.abs(a.w - b.w) < eps &&
  Math.abs(a.rx - b.rx) < 1e-4 &&
  Math.abs(a.ry - b.ry) < 1e-4 &&
  Math.abs(a.rz - b.rz) < 1e-4;

/** Index of the stop the scroll position belongs to: the last one whose hold has started.
    Before the first stop's hold, 0. */
export function stopIndex(scroll: number, stops: readonly Stop[]): number {
  let i = 0;
  for (let k = 1; k < stops.length; k++) if (scroll >= stops[k].at) i = k;
  return i;
}

/** The document pose of a stop at a scroll position inside (or clamped to) its hold. */
export function holdPose(out: Pose, stop: Stop, scroll: number): Pose {
  copyPose(out, stop.pose);
  const s = Math.min(Math.max(scroll, stop.at), stop.until);
  if (stop.ride) out.y += s - stop.at;
  const span = stop.until - stop.at;
  if (stop.drift && Number.isFinite(span) && span > 0) out.ry += stop.drift * ((s - stop.at) / span - 0.5);
  return out;
}

const scratchA = pose();
const scratchB = pose();

/** Viewport pose at a scroll position. Inside a hold: the stop. Between two holds: an eased
    travel. Between stops on the same side it steps out to that side's margin, clear of the
    content column, and on a long trip (over 0.6 of a viewport) it also shrinks to margin size.
    A long trip across sides shrinks as it crosses instead. */
export function poseAt(out: Pose, scroll: number, stops: readonly Stop[], stage: Stage): Pose {
  if (stops.length === 0) return copyPose(out, pose());
  const i = stopIndex(scroll, stops);
  const a = stops[i];
  const b = stops[i + 1];
  if (!b || scroll <= a.until) {
    holdPose(out, a, scroll);
  } else {
    holdPose(scratchA, a, a.until);
    holdPose(scratchB, b, b.at);
    const span = b.at - a.until;
    const e = easeInOut(span > 0 ? (scroll - a.until) / span : 1);
    lerpPose(out, scratchA, scratchB, e);
    const bump = Math.sin(Math.PI * e);
    const mid = (scratchA.w + scratchB.w) / 2;
    const long = span > stage.vh * 0.6;
    const right = scratchA.x > stage.vw / 2;
    if (right === scratchB.x > stage.vw / 2) {
      out.x += ((right ? stage.gutterR : stage.gutterL) - (scratchA.x + scratchB.x) / 2) * bump;
      if (long) out.w += (Math.min(stage.gutterW, mid) - mid) * bump;
    } else if (long) {
      out.w += (Math.min(scratchA.w, scratchB.w) * 0.45 - mid) * bump;
    }
  }
  out.y -= scroll;
  return out;
}

/** Makes holds usable, given stops in page order: never overlapping, with at least
    `minTravel` px of scroll between neighbours (shrinking both holds evenly when they crowd),
    the first open-ended above and the last reachable before `maxScroll` and open-ended below.
    Mutates and returns the array. */
export function settleStops(stops: Stop[], minTravel: number, maxScroll: number): Stop[] {
  const last = stops.at(-1);
  if (last) {
    last.at = Math.min(last.at, Math.max(0, maxScroll - minTravel / 2));
    last.until = Infinity;
  }
  if (stops[0]) stops[0].at = -Infinity;
  for (let k = 0; k + 1 < stops.length; k++) {
    const a = stops[k];
    const b = stops[k + 1];
    if (b.at - a.until >= minTravel) continue;
    const mid = (a.until + b.at) / 2;
    a.until = Math.max(Number.isFinite(a.at) ? a.at : -Infinity, mid - minTravel / 2);
    b.at = mid + minTravel / 2;
    if (b.until < b.at) b.until = b.at;
  }
  return stops;
}

/* ---------- intro ---------- */

/** The first-visit intro, in ms: hold big and still, one full turn, then the flight to the
    page. The page content starts its own entrance the moment the flight begins. */
export const INTRO = { hold: 600, spin: 1800, travel: 900 } as const;
export const INTRO_TRAVEL_AT = INTRO.hold + INTRO.spin;
export const INTRO_END = INTRO_TRAVEL_AT + INTRO.travel;

export type IntroPhase = 'hold' | 'spin' | 'travel' | 'done';

export const introPhase = (ms: number): IntroPhase =>
  ms < INTRO.hold ? 'hold' : ms < INTRO_TRAVEL_AT ? 'spin' : ms < INTRO_END ? 'travel' : 'done';

/** Intro pose at `ms`: `stage` is big and centered, `target` the pose it lands in (viewport
    px). The spin is one 360° turn about the vertical axis, so it ends where it began. The
    flight arcs up by `arc` px at its middle. */
export function introPose(out: Pose, ms: number, stage: Pose, target: Pose, arc = 0): Pose {
  const phase = introPhase(ms);
  if (phase === 'hold') return copyPose(out, stage);
  if (phase === 'spin') {
    copyPose(out, stage);
    out.ry += Math.PI * 2 * easeInOut((ms - INTRO.hold) / INTRO.spin);
    return out;
  }
  if (phase === 'done') return copyPose(out, target);
  const e = easeOutQuart((ms - INTRO_TRAVEL_AT) / INTRO.travel);
  lerpPose(out, stage, target, e);
  out.y -= arc * Math.sin(Math.PI * e);
  return out;
}

/** Whether this page load gets the intro: not under reduced motion, not when coming back
    from an exercise, not twice in one browser session, and only when WebGL can draw it. */
export const shouldPlayIntro = (f: { reduced: boolean; returning: boolean; seen: boolean; webgl: boolean }): boolean =>
  !f.reduced && !f.returning && !f.seen && f.webgl;

/** Intro state for the page: 'stage' holds the content back, 'travel' lets it enter, 'off'
    is the normal page. A skip (any key, click, wheel, touch) or a load failure goes straight
    to 'off', from any state; nothing ever goes back. */
export type IntroState = 'stage' | 'travel' | 'off';
export type IntroEvent = 'travel' | 'end' | 'skip' | 'fail';

export function nextIntroState(s: IntroState, e: IntroEvent): IntroState {
  if (s === 'off') return 'off';
  if (e === 'travel') return s === 'stage' ? 'travel' : s;
  return 'off';
}
