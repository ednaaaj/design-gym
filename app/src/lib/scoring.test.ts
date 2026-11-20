// Run: npm test  (node:test + native TS type stripping, no extra deps)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Flaw, WhichBetterAnswer } from '../exercises/schema.ts';
import { scoreChoice, scoreRegions } from './scoring.ts';

const flaw = (id: string, x: number, y: number): Flaw => ({
  id,
  label: id,
  region: { x, y, w: 10, h: 10 },
  param: id,
  badValue: 0,
  explanation: '',
});
const flaws = [flaw('a', 0, 0), flaw('b', 50, 50), flaw('c', 80, 0)];

test('regions: all found, no misses -> correct', () => {
  const r = scoreRegions(flaws, [{ x: 5, y: 5 }, { x: 55, y: 55 }, { x: 85, y: 5 }]);
  assert.equal(r.verdict, 'correct');
  assert.equal(r.score, 1);
  assert.deepEqual(r.found, ['a', 'b', 'c']);
});

test('regions: some found -> partial', () => {
  const r = scoreRegions(flaws, [{ x: 5, y: 5 }]);
  assert.equal(r.verdict, 'partial');
  assert.ok(Math.abs(r.score - 1 / 3) < 1e-9);
});

test('regions: nothing found -> wrong', () => {
  assert.equal(scoreRegions(flaws, []).verdict, 'wrong');
  assert.equal(scoreRegions(flaws, [{ x: 30, y: 30 }]).verdict, 'wrong');
});

test('regions: false positives subtract and clamp at 0', () => {
  const allPlusMiss = scoreRegions(flaws, [{ x: 5, y: 5 }, { x: 55, y: 55 }, { x: 85, y: 5 }, { x: 30, y: 90 }]);
  assert.equal(allPlusMiss.verdict, 'partial');
  assert.equal(allPlusMiss.falsePositives, 1);
  assert.ok(Math.abs(allPlusMiss.score - 2 / 3) < 1e-9);
  assert.deepEqual(allPlusMiss.markHits, ['a', 'b', 'c', null]);

  const carpet = scoreRegions(flaws, [{ x: 5, y: 5 }, { x: 30, y: 30 }, { x: 40, y: 90 }]);
  assert.equal(carpet.score, 0);
  assert.equal(carpet.verdict, 'wrong');
});

test('regions: duplicate marks on one flaw are neutral', () => {
  const r = scoreRegions(flaws, [{ x: 1, y: 1 }, { x: 9, y: 9 }]);
  assert.equal(r.falsePositives, 0);
  assert.deepEqual(r.found, ['a']);
});

const answer: WhichBetterAnswer = {
  correct: 'A',
  reasons: [
    { id: 'r1', label: 'right', correct: true },
    { id: 'r2', label: 'wrong', correct: false },
  ],
};

test('choice: right pick + right reason -> correct', () => {
  assert.equal(scoreChoice(answer, 'A', 'r1').verdict, 'correct');
});
test('choice: right pick, wrong reason -> partial', () => {
  assert.equal(scoreChoice(answer, 'A', 'r2').verdict, 'partial');
});
test('choice: wrong pick -> wrong, even with the right reason', () => {
  assert.equal(scoreChoice(answer, 'B', 'r1').verdict, 'wrong');
  assert.equal(scoreChoice(answer, null, null).verdict, 'wrong');
});
