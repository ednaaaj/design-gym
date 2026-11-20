import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BP_TIMING, blueprintGeometry, bpCssVars, bpSchedule, dimInset } from './blueprint.ts';

const texts = (g: ReturnType<typeof blueprintGeometry>) => g.labels.map((l) => l.text);

test('outline mode labels the host itself, rounded to whole px', () => {
  const g = blueprintGeometry(587.6, 412.2, 'outline', []);
  assert.deepEqual(texts(g), ['588', '412']);
  assert.equal(g.outlines.length, 1);
  assert.equal(g.guides.length, 0);
});

test('full mode measures the first subject and the gap to the second', () => {
  // A 540x300 card with a 16px gap above a 56px bar, inside a 588x440 host.
  const g = blueprintGeometry(588, 440, 'full', [
    { x: 24, y: 20, w: 540, h: 300 },
    { x: 24, y: 336, w: 540, h: 56 },
  ]);
  assert.deepEqual(texts(g), ['540', '300', '16']);
  assert.equal(g.outlines.length, 2);
  assert.equal(g.guides.length, 4);
});

test('a side-by-side gap is measured horizontally', () => {
  const g = blueprintGeometry(600, 400, 'full', [
    { x: 40, y: 40, w: 220, h: 300 },
    { x: 284, y: 40, w: 280, h: 300 },
  ]);
  assert.equal(texts(g).at(-1), '24');
  assert.equal(g.labels.at(-1)?.vertical, undefined);
});

test('dimension lines sit 14px out with room, centered in a tight margin, outside with none', () => {
  assert.equal(dimInset(60), 14);
  assert.equal(dimInset(20), 10);
  assert.equal(dimInset(0), 24);
});

test('the build runs in order, holds readable labels, and lands within 2.2-3s', () => {
  const s = bpSchedule();
  assert.ok(0 < s.dimsAt && s.dimsAt < s.labelsAt && s.labelsAt < s.contentAt && s.contentAt < s.residualAt && s.residualAt < s.end);
  // labels are fully in for at least 400ms before content starts building
  assert.ok(s.contentAt - (s.labelsAt + BP_TIMING.labelIn) >= 400);
  assert.ok(s.end >= 2200 && s.end <= 3000);
  assert.equal(bpSchedule({ ...BP_TIMING, labelHold: 0 }).contentAt, s.contentAt - BP_TIMING.labelHold);
});

test('bpCssVars mirrors the schedule in ms', () => {
  const v = bpCssVars();
  assert.equal(v['--bp-content-at'], `${bpSchedule().contentAt}ms`);
  assert.equal(v['--bp-outline'], `${BP_TIMING.outline}ms`);
  assert.equal(v['--bp-rest'], String(BP_TIMING.rest));
});
