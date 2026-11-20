import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Skill } from '../exercises/schema.ts';
import type { Attempt } from './storage.ts';
import { completedExerciseIds, lastAttempts, resumeIndex, skillAccuracy, weakestSkill } from './stats.ts';

let t = 0;
const att = (skill: Skill, score: number, exerciseId = `${skill}-${t}`): Attempt => ({
  exerciseId,
  skill,
  verdict: score >= 1 ? 'correct' : score > 0 ? 'partial' : 'wrong',
  score,
  hintsUsed: 0,
  at: ++t,
});

test('rolling window uses only the last 5 attempts per skill', () => {
  const list = [0, 0, 1, 1, 1, 1, 1].map((s) => att('spacing', s));
  const s = skillAccuracy(list).spacing;
  assert.equal(s.accuracy, 1);
  assert.equal(s.recent, 5);
  assert.equal(s.attempts, 7);
  assert.equal(s.enough, true);
});

test('fewer than 3 attempts -> not enough data; other skills empty', () => {
  const stats = skillAccuracy([att('color', 1), att('color', 0)]);
  assert.equal(stats.color.enough, false);
  assert.equal(stats.color.accuracy, 0.5);
  assert.deepEqual(stats.hierarchy, { accuracy: null, recent: 0, attempts: 0, enough: false });
  assert.equal(weakestSkill([att('color', 0), att('color', 0)]), null);
});

test('weakest: lowest among skills with enough data', () => {
  const list = [
    ...[1, 1, 1].map((s) => att('spacing', s)),
    ...[0.5, 0.5, 0.5].map((s) => att('typography', s)),
    ...[0, 0].map((s) => att('color', s)), // weaker, but not enough data
  ];
  assert.equal(weakestSkill(list), 'typography');
});

test('weakest: ties go to the earlier skill; none -> null', () => {
  const list = [...[0.5, 0.5, 0.5].map((s) => att('color', s)), ...[0.5, 0.5, 0.5].map((s) => att('hierarchy', s))];
  assert.equal(weakestSkill(list), 'hierarchy');
  assert.equal(weakestSkill([]), null);
});

test('completed ids are unique; lastAttempts is newest first', () => {
  const a = att('spacing', 1, 'x');
  const b = att('spacing', 0, 'x');
  const c = att('color', 1, 'y');
  assert.deepEqual(completedExerciseIds([a, b, c]), ['x', 'y']);
  assert.deepEqual(lastAttempts([a, b, c], 2), [c, b]);
  assert.deepEqual(lastAttempts([a], 0), []);
});

test('resume: after the last attempted exercise, wraps, 0 when none or unknown', () => {
  const ids = ['x', 'y', 'z'];
  assert.equal(resumeIndex([], ids), 0);
  assert.equal(resumeIndex([att('color', 1, 'z'), att('color', 1, 'x')], ids), 1);
  assert.equal(resumeIndex([att('color', 1, 'z')], ids), 0);
  assert.equal(resumeIndex([att('color', 1, 'gone')], ids), 0);
});
