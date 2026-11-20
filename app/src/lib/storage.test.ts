import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { addAttempt, load, reset, type Attempt } from './storage.ts';

const KEY = 'designgym:v1';

function memoryStorage(seed: Record<string, string> = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}
const setStorage = (value: unknown) =>
  Object.defineProperty(globalThis, 'localStorage', { value, configurable: true, writable: true });

const good: Attempt = { exerciseId: 'e1', skill: 'spacing', verdict: 'correct', score: 1, hintsUsed: 0, at: 1 };
const entry = { exerciseId: 'e2', skill: 'color', verdict: 'wrong', score: 0, hintsUsed: 1 } as const;

beforeEach(() => {
  setStorage(memoryStorage());
  reset();
});

test('round trip: addAttempt persists, load reads it back', () => {
  const s = memoryStorage();
  setStorage(s);
  addAttempt(entry);
  const stored = JSON.parse(s.m.get(KEY)!);
  assert.equal(stored.version, 1);
  assert.equal(stored.attempts.length, 1);
  assert.equal(typeof stored.attempts[0].at, 'number');
  assert.equal(load()[0].exerciseId, 'e2');
});

test('existing data loads; malformed attempts are dropped', () => {
  const bad = [{ ...good, score: 2 }, { ...good, skill: 'motion' }, { ...good, hintsUsed: -1 }, null, 'x'];
  setStorage(memoryStorage({ [KEY]: JSON.stringify({ version: 1, attempts: [good, ...bad] }) }));
  assert.deepEqual(load(), [good]);
});

test('malformed JSON -> empty, no throw, and a new attempt overwrites it', () => {
  const s = memoryStorage({ [KEY]: '{not json' });
  setStorage(s);
  assert.deepEqual(load(), []);
  addAttempt(entry);
  assert.equal(JSON.parse(s.m.get(KEY)!).attempts.length, 1);
});

test('wrong version or shape -> empty', () => {
  for (const v of [{ version: 2, attempts: [good] }, { version: 1, attempts: 'nope' }, [good], 42]) {
    reset();
    setStorage(memoryStorage({ [KEY]: JSON.stringify(v) }));
    assert.deepEqual(load(), []);
  }
});

test('storage that throws on every call -> in-memory session store', () => {
  const boom = () => {
    throw new Error('SecurityError');
  };
  setStorage({ getItem: boom, setItem: boom, removeItem: boom });
  assert.deepEqual(load(), []);
  addAttempt(entry);
  addAttempt({ ...entry, exerciseId: 'e3' });
  assert.deepEqual(load().map((a) => a.exerciseId), ['e2', 'e3']);
  assert.doesNotThrow(() => reset());
  assert.deepEqual(load(), []);
});

test('accessing localStorage itself throws (blocked) -> in-memory', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('blocked');
    },
  });
  addAttempt(entry);
  assert.equal(load().length, 1);
});

test('storage unavailable (undefined) -> in-memory', () => {
  setStorage(undefined);
  addAttempt(entry);
  assert.equal(load().length, 1);
});

test('quota full: failed writes do not lose in-session attempts', () => {
  const s = memoryStorage();
  setStorage(s);
  addAttempt(entry);
  s.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  addAttempt(entry);
  addAttempt(entry);
  assert.equal(load().length, 3);
});
