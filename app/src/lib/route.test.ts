import assert from 'node:assert/strict';
import { test } from 'node:test';
import { route } from './route.ts';

test('route: stops sit in order along the path and the last one ends it', () => {
  const { d, at } = route({ x: 24, y: 0 }, [
    { x: 24, y: 40 },
    { x: 72, y: 300 },
    { x: 24, y: 560 },
  ]);
  assert.match(d, /^M24 0 C/);
  assert.equal(at.length, 3);
  assert.ok(at[0] > 0 && at[0] < at[1] && at[1] < at[2]);
  assert.equal(at[2], 1);
  // A straight vertical lead-in of 40 inside a longer route is a small fraction of it.
  assert.ok(at[0] < 0.1);
});

test('route: a straight line measures exactly', () => {
  const { at } = route({ x: 0, y: 0 }, [
    { x: 0, y: 25 },
    { x: 0, y: 100 },
  ]);
  assert.ok(Math.abs(at[0] - 0.25) < 1e-9);
});
