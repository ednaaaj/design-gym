import type { Skill } from '../exercises/schema.ts';
import { SKILLS, type Attempt } from './storage.ts';

export const WINDOW = 5; // rolling window per skill
export const MIN_ATTEMPTS = 3; // spec: below this, "not enough data"

export type SkillStat = {
  accuracy: number | null; // mean score of the last WINDOW attempts, 0..1
  recent: number; // attempts in the window (<= WINDOW)
  attempts: number; // all attempts for the skill
  enough: boolean;
};

/** Attempts are assumed oldest first (append order). */
export function skillAccuracy(attempts: Attempt[]): Record<Skill, SkillStat> {
  const out = {} as Record<Skill, SkillStat>;
  for (const skill of SKILLS) {
    const mine = attempts.filter((a) => a.skill === skill);
    const win = mine.slice(-WINDOW);
    out[skill] = {
      accuracy: win.length ? win.reduce((s, a) => s + a.score, 0) / win.length : null,
      recent: win.length,
      attempts: mine.length,
      enough: mine.length >= MIN_ATTEMPTS,
    };
  }
  return out;
}

/** Lowest accuracy among skills with enough data; ties go to the earlier skill in SKILLS. */
export function weakestSkill(attempts: Attempt[]): Skill | null {
  const stats = skillAccuracy(attempts);
  let weakest: Skill | null = null;
  for (const skill of SKILLS) {
    const s = stats[skill];
    if (s.enough && (weakest === null || s.accuracy! < stats[weakest].accuracy!)) weakest = skill;
  }
  return weakest;
}

export const completedExerciseIds = (attempts: Attempt[]): string[] => [
  ...new Set(attempts.map((a) => a.exerciseId)),
];

/** Where "Continue" resumes: the exercise after the last attempted one, wrapping; 0 if none. */
export function resumeIndex(attempts: Attempt[], ids: string[]): number {
  const last = attempts.at(-1);
  const i = last ? ids.indexOf(last.exerciseId) : -1;
  return i < 0 ? 0 : (i + 1) % ids.length;
}

/** Newest first. */
export const lastAttempts = (attempts: Attempt[], n: number): Attempt[] =>
  n > 0 ? attempts.slice(-n).reverse() : [];
