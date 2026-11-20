/* Pure helpers behind the landing page's motion. No DOM here, so they are testable. */

/** Strong ease-out, the same curve as --ease-out in index.css, so a counted number settles like the bars. */
export const easeOut = (t: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** The integer a count-up shows at progress t (0..1). Lands exactly on `to`. */
export const countAt = (t: number, from: number, to: number): number =>
  Math.round(from + (to - from) * easeOut(t));

/** Entrance stagger: 60ms per item, capped at the 4th item so a long list never feels slow. */
export const STAGGER_MS = 60;
export const staggerDelay = (i: number): number => Math.min(Math.max(0, i), 3) * STAGGER_MS;

/** Line number of each word in a wrapped heading, from each word box's top edge in reading
    order. A word starts a new line when its top sits clearly below the previous word's. */
export function lineIndexes(tops: readonly number[]): number[] {
  let line = 0;
  return tops.map((top, i) => (i > 0 && top > tops[i - 1] + 2 ? ++line : line));
}

/** Index of the section the reader is in: the last one whose top has crossed the reading
    line (px from the viewport top). -1 while still above the first. */
export function currentSection(tops: readonly number[], line: number): number {
  let current = -1;
  tops.forEach((top, i) => {
    if (top <= line) current = i;
  });
  return current;
}

/** A demo plays one pass per visit: step 0 is the resting picture, the pass is every hold
    after it. Keeping a pass (plus its last ≤320ms transition) within 5s means nothing on the
    page moves for more than 5s on its own, so it needs no pause control (WCAG 2.2.2). */
export const PASS_MAX_MS = 5000;
export const passMs = (holds: readonly number[]): number => holds.slice(1).reduce((a, b) => a + b, 0);
