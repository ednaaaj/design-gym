export type Pt = { x: number; y: number };

const r1 = (n: number) => Math.round(n * 10) / 10;

/* Arc length of one cubic, by sampling. 32 chords is well under a pixel of error at route sizes. */
function cubicLength(a: Pt, b: Pt, c: Pt, d: Pt) {
  let len = 0;
  let prev = a;
  for (let i = 1; i <= 32; i++) {
    const t = i / 32;
    const u = 1 - t;
    const p = {
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    };
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

/**
 * A winding route from `start` through each stop. Every leg leaves and arrives vertically,
 * so a change of x between stops becomes one smooth S-bend with no corners.
 * `at[i]` is how far along the whole route (0–1) stop i sits.
 */
export function route(start: Pt, stops: Pt[]): { d: string; at: number[] } {
  let d = `M${r1(start.x)} ${r1(start.y)}`;
  let prev = start;
  let total = 0;
  const lengths: number[] = [];
  for (const p of stops) {
    const k = (p.y - prev.y) / 2;
    const c1 = { x: prev.x, y: prev.y + k };
    const c2 = { x: p.x, y: p.y - k };
    d += ` C${r1(c1.x)} ${r1(c1.y)} ${r1(c2.x)} ${r1(c2.y)} ${r1(p.x)} ${r1(p.y)}`;
    total += cubicLength(prev, c1, c2, p);
    lengths.push(total);
    prev = p;
  }
  return { d, at: lengths.map((l) => (total ? l / total : 1)) };
}
