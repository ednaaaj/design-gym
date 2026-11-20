/* Pure geometry for the landing's blueprint overlay (screens/Blueprint.tsx). No DOM here.
   Every coordinate is in rendered CSS px from the host's top-left corner, so the number on a
   label is exactly what a ruler on screen would read. */

export type Rect = { x: number; y: number; w: number; h: number };

/** 'full': construction guides, subject outlines, width/height dimensions, the gap between
    the first two subjects, registration crosses in the host corners.
    'outline': the host itself as one box, with crop marks and its width/height outside. */
export type BlueprintMode = 'full' | 'outline';

export type Label = { x: number; y: number; text: string; anchor: 'start' | 'middle'; vertical?: boolean };

export type Geometry = {
  w: number;
  h: number;
  guides: string[]; // long construction lines across the host, one path each so each can draw
  outlines: string[]; // one closed path per subject
  dims: string[]; // dimension half-lines, each drawn outward from its label
  ticks: string; // the end ticks of every dimension, one path
  marks: string; // registration crosses or crop marks, one path
  labels: Label[];
};

/** Every blueprint build timing, in ms. This is the one place to tune the reveal: Landing
    hands it to CSS as --bp-* variables, Blueprint.tsx and the demos read the schedule. */
export const BP_TIMING = {
  outline: 500, // a. subject boxes and construction lines draw (linear)
  dims: 500, // b. dimension lines draw out to their end ticks (linear)
  labelIn: 200, // c. px labels fade in...
  labelHold: 500, // ...and hold, fully readable, before the content starts to build
  content: 600, // d. surface and real content build in under the drawing (ease-out)
  residual: 400, // e. the drawing fades to a faint residual
  stagger: 200, // between tiles in a row
  rest: 0.2, // opacity of the residual drawing (labels hide; hover brings it all back)
} as const;

export type BpTiming = { [K in keyof typeof BP_TIMING]: number };
export type BpSchedule = { dimsAt: number; labelsAt: number; contentAt: number; residualAt: number; end: number };

/** Phase start times from the moment a build starts, before any stagger. */
export function bpSchedule(t: BpTiming = BP_TIMING): BpSchedule {
  const dimsAt = t.outline;
  const labelsAt = dimsAt + t.dims;
  const contentAt = labelsAt + t.labelIn + t.labelHold;
  const residualAt = contentAt + t.content;
  return { dimsAt, labelsAt, contentAt, residualAt, end: residualAt + t.residual };
}

export const BP_SCHEDULE = bpSchedule();

/** The same timings as CSS custom properties, set once on the landing root. */
export function bpCssVars(t: BpTiming = BP_TIMING): Record<string, string> {
  const s = bpSchedule(t);
  const ms = (n: number) => `${n}ms`;
  return {
    '--bp-outline': ms(t.outline),
    '--bp-dims-at': ms(s.dimsAt),
    '--bp-dims': ms(t.dims),
    '--bp-labels-at': ms(s.labelsAt),
    '--bp-label-in': ms(t.labelIn),
    '--bp-content-at': ms(s.contentAt),
    '--bp-content': ms(t.content),
    '--bp-residual-at': ms(s.residualAt),
    '--bp-residual': ms(t.residual),
    '--bp-rest': String(t.rest),
  };
}

export const LABEL_PX = 11;
const CHAR = LABEL_PX * 0.62; // tabular digit advance, near enough to size the gap in a line
const TICK = 4; // half length of a dimension end tick

const px = (n: number): string => String(Math.round(n));
/** Centers a 1px stroke on the pixel grid. */
const hair = (v: number): number => Math.round(v) + 0.5;

/** How far a dimension line sits outside an edge, given `room` px of free space between that
    edge and the host's edge: 14px when there is space, centered in a tight margin, and 24px
    outside the host when there is no margin at all. */
export const dimInset = (room: number): number => (room >= 28 ? 14 : room >= 16 ? room / 2 : 24);

function box(r: Rect): string {
  const x1 = hair(r.x);
  const y1 = hair(r.y);
  const x2 = hair(r.x + r.w) - 1;
  const y2 = hair(r.y + r.h) - 1;
  return `M${x1} ${y1}H${x2}V${y2}H${x1}Z`;
}

/** Horizontal dimension from x=a to x=b at height y. Short spans put the label above the line. */
function hDim(g: Geometry, a: number, b: number, y: number): void {
  const text = px(b - a);
  const Y = hair(y);
  const mid = (a + b) / 2;
  const half = (text.length * CHAR) / 2 + 5;
  if (b - a > half * 2 + 12) {
    g.dims.push(`M${mid - half} ${Y}H${a}`, `M${mid + half} ${Y}H${b}`);
    g.labels.push({ x: mid, y: Y, text, anchor: 'middle' });
  } else {
    g.dims.push(`M${a} ${Y}H${b}`);
    g.labels.push({ x: mid, y: Y - 9, text, anchor: 'middle' });
  }
  g.ticks += `M${a} ${Y - TICK}V${Y + TICK}M${b} ${Y - TICK}V${Y + TICK}`;
}

/** Vertical dimension from y=a to y=b at x. Long spans read rotated in a gap; short ones beside. */
function vDim(g: Geometry, a: number, b: number, x: number): void {
  const text = px(b - a);
  const X = hair(x);
  const mid = (a + b) / 2;
  const half = (text.length * CHAR) / 2 + 5;
  if (b - a > half * 2 + 12) {
    g.dims.push(`M${X} ${mid - half}V${a}`, `M${X} ${mid + half}V${b}`);
    g.labels.push({ x: X, y: mid, text, anchor: 'middle', vertical: true });
  } else {
    g.dims.push(`M${X} ${a}V${b}`);
    g.labels.push({ x: X + 6, y: mid, text, anchor: 'start' });
  }
  g.ticks += `M${X - TICK} ${a}H${X + TICK}M${X - TICK} ${b}H${X + TICK}`;
}

const cross = (x: number, y: number): string => `M${x - 4} ${y}H${x + 4}M${x} ${y - 4}V${y + 4}`;

/** Crop marks just outside each corner of r, like the arena's .frame. */
function cropMarks(r: Rect): string {
  const [l, t, rt, b] = [hair(r.x) - 1, hair(r.y) - 1, hair(r.x + r.w), hair(r.y + r.h)];
  return [
    `M${l - 4} ${t}H${l - 12}M${l} ${t - 4}V${t - 12}`,
    `M${rt + 4} ${t}H${rt + 12}M${rt} ${t - 4}V${t - 12}`,
    `M${l - 4} ${b}H${l - 12}M${l} ${b + 4}V${b + 12}`,
    `M${rt + 4} ${b}H${rt + 12}M${rt} ${b + 4}V${b + 12}`,
  ].join('');
}

export function blueprintGeometry(w: number, h: number, mode: BlueprintMode, subjects: readonly Rect[]): Geometry {
  const g: Geometry = { w, h, guides: [], outlines: [], dims: [], ticks: '', marks: '', labels: [] };

  if (mode === 'outline' || subjects.length === 0) {
    const r = { x: 0, y: 0, w, h };
    g.outlines.push(box(r));
    g.marks = cropMarks(r);
    hDim(g, 0, w, -14);
    vDim(g, 0, h, -14);
    return g;
  }

  const [s0, s1] = subjects;
  const right = s0.x + s0.w;
  const bottom = s0.y + s0.h;

  // Construction lines: the first subject's edges, extended across the whole host.
  g.guides.push(
    `M0 ${hair(s0.y)}H${w}`,
    `M0 ${hair(bottom) - 1}H${w}`,
    `M${hair(s0.x)} 0V${h}`,
    `M${hair(right) - 1} 0V${h}`,
  );
  for (const s of subjects) g.outlines.push(box(s));
  // Registration crosses in the host corners, only where there is margin to hold them.
  if (Math.min(s0.x, s0.y) >= 16) {
    g.marks = [cross(10, 10), cross(w - 10, 10), cross(10, h - 10), cross(w - 10, h - 10)].join('');
  }

  hDim(g, s0.x, right, s0.y - dimInset(s0.y));
  vDim(g, s0.y, bottom, s0.x - dimInset(s0.x));

  // The spacing between the first two subjects, stacked or side by side.
  if (s1) {
    if (s1.y >= bottom - 0.5 && s1.y - bottom >= 4) {
      vDim(g, bottom, s1.y, Math.min(right, s1.x + s1.w) - 24);
    } else if (s1.x >= right - 0.5 && s1.x - right >= 4) {
      hDim(g, right, s1.x, Math.max(s0.y, s1.y) + 24);
    }
  }
  return g;
}
