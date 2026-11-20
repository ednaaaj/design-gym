import type { Flaw, WhichBetterAnswer } from '../exercises/schema.ts';

export type Verdict = 'correct' | 'partial' | 'wrong';
export type Point = { x: number; y: number }; // % of preview

export type RegionResult = {
  verdict: Verdict;
  score: number; // 0..1
  found: string[]; // flaw ids hit by at least one mark
  falsePositives: number; // marks that hit no flaw
  markHits: (string | null)[]; // per mark: flaw id it hit, or null
};

export type ChoiceResult = {
  verdict: Verdict;
  score: number;
  pickCorrect: boolean;
  reasonCorrect: boolean;
};

const verdictFor = (score: number): Verdict =>
  score >= 1 ? 'correct' : score > 0 ? 'partial' : 'wrong';

export function inRegion(p: Point, r: Flaw['region']): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/** find-mistake and spot-diff: (flaws found - false positives) / total, clamped 0..1.
 *  Extra marks on an already-found flaw are neutral, not false positives. */
export function scoreRegions(flaws: Flaw[], marks: Point[]): RegionResult {
  const markHits = marks.map((m) => flaws.find((f) => inRegion(m, f.region))?.id ?? null);
  const found = flaws.filter((f) => markHits.includes(f.id)).map((f) => f.id);
  const falsePositives = markHits.filter((h) => h === null).length;
  const raw = flaws.length ? (found.length - falsePositives) / flaws.length : 0;
  const score = Math.min(1, Math.max(0, raw));
  return { verdict: verdictFor(score), score, found, falsePositives, markHits };
}

/** which-better: right pick + right reason = correct; right pick only = partial. */
export function scoreChoice(
  answer: WhichBetterAnswer,
  pick: 'A' | 'B' | null,
  reasonId: string | null,
): ChoiceResult {
  const pickCorrect = pick === answer.correct;
  const reasonCorrect = answer.reasons.some((r) => r.id === reasonId && r.correct);
  const score = pickCorrect ? (reasonCorrect ? 1 : 0.5) : 0;
  return { verdict: verdictFor(score), score, pickCorrect, reasonCorrect };
}
