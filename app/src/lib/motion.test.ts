import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PASS_MAX_MS, countAt, currentSection, easeOut, lineIndexes, passMs, staggerDelay } from './motion.ts';

test('passMs counts every hold after the resting step', () => {
  assert.equal(passMs([2000, 2200, 1100, 450, 450, 400]), 4600);
  assert.equal(passMs([1600]), 0);
  assert.ok(passMs([1600, 1200, 1200, 1000, 1600]) <= PASS_MAX_MS);
});

test('countAt starts at from, lands exactly on to, and clamps outside 0..1', () => {
  assert.equal(countAt(0, 40, 90), 40);
  assert.equal(countAt(1, 40, 90), 90);
  assert.equal(countAt(-1, 40, 90), 40);
  assert.equal(countAt(2, 40, 90), 90);
});

test('countAt is ease-out: past the halfway value at half time, never decreasing', () => {
  assert.ok(countAt(0.5, 0, 100) > 50);
  let prev = -1;
  for (let i = 0; i <= 20; i++) {
    const v = countAt(i / 20, 0, 100);
    assert.ok(v >= prev);
    prev = v;
  }
  assert.equal(easeOut(1), 1);
});

test('staggerDelay caps at the 4th item', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9].map(staggerDelay), [0, 60, 120, 180, 180, 180]);
});

test('lineIndexes groups words by line, tolerating sub-pixel jitter', () => {
  assert.deepEqual(lineIndexes([10, 10.4, 11, 80, 80, 150]), [0, 0, 0, 1, 1, 2]);
  assert.deepEqual(lineIndexes([]), []);
});

test('currentSection is the last section above the reading line', () => {
  assert.equal(currentSection([500, 1500, 2500], 400), -1);
  assert.equal(currentSection([300, 1500, 2500], 400), 0);
  assert.equal(currentSection([-900, 200, 1200], 400), 1);
  assert.equal(currentSection([-3000, -2000, -10], 400), 2);
});
