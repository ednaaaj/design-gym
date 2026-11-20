import type { Skill } from '../exercises/schema.ts';

export const SKILLS: readonly Skill[] = ['hierarchy', 'spacing', 'alignment', 'typography', 'color'];

export type Attempt = {
  exerciseId: string;
  skill: Skill;
  verdict: 'correct' | 'partial' | 'wrong';
  score: number; // 0..1
  hintsUsed: number;
  at: number; // epoch ms
};

type Store = { version: 1; attempts: Attempt[] };

const KEY = 'designgym:v1';
const VERDICTS = ['correct', 'partial', 'wrong'];

// Session copy: the source of truth when storage is blocked, full, or corrupt.
let mem: Attempt[] = [];
let loaded = false; // storage is read once; after that mem is authoritative

const isAttempt = (a: unknown): a is Attempt => {
  if (typeof a !== 'object' || a === null) return false;
  const o = a as Record<string, unknown>;
  return (
    typeof o.exerciseId === 'string' &&
    SKILLS.includes(o.skill as Skill) &&
    VERDICTS.includes(o.verdict as string) &&
    typeof o.score === 'number' && o.score >= 0 && o.score <= 1 &&
    Number.isInteger(o.hintsUsed) && (o.hintsUsed as number) >= 0 &&
    typeof o.at === 'number' && Number.isFinite(o.at)
  );
};

/** Parsed attempts, or null when storage is unreadable, empty, or not a v1 store. */
function read(): Attempt[] | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    const s = data as Partial<Store> | null;
    if (!s || s.version !== 1 || !Array.isArray(s.attempts)) return null;
    return s.attempts.filter(isAttempt);
  } catch {
    return null;
  }
}

function write() {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ version: 1, attempts: mem } satisfies Store));
  } catch {
    // Blocked or full: keep the in-memory copy for this session.
  }
}

export function load(): Attempt[] {
  if (!loaded) {
    const stored = read();
    if (stored) mem = stored;
    loaded = true;
  }
  return [...mem];
}

export function addAttempt(a: Omit<Attempt, 'at'> & { at?: number }): Attempt[] {
  load(); // first call hydrates from storage; later calls keep mem, the only complete copy if writes fail
  mem = [...mem,{ ...a, at: a.at ?? Date.now() }];
  write();
  return [...mem];
}

export function reset(): void {
  mem = [];
  loaded = false;
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // ignore
  }
}
