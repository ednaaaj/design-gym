// Run: npm test. Authoring guard for exercise data.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Flaw } from './schema.ts';
import { exercises } from './exercises.ts';

const overlaps = (a: Flaw['region'], b: Flaw['region']) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('exercise ids are unique', () => {
  const ids = exercises.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every exercise has 2 hints', () => {
  for (const e of exercises) assert.equal(e.hints.filter(Boolean).length, 2, e.id);
});

test('which-better has an answer with at least one correct reason', () => {
  for (const e of exercises) {
    if (e.type !== 'which-better') continue;
    assert.ok(e.answer?.reasons.some((r) => r.correct), e.id);
  }
});

test('click regions sit inside the preview and never intersect', () => {
  for (const e of exercises) {
    if (e.type === 'which-better') continue;
    for (const { id, region: r } of e.flaws) {
      const inside = r.w > 0 && r.h > 0 && r.x >= 0 && r.y >= 0 && r.x + r.w <= 100 && r.y + r.h <= 100;
      assert.ok(inside, `${e.id}/${id} out of bounds`);
    }
    e.flaws.forEach((a, i) =>
      e.flaws.slice(i + 1).forEach((b) => assert.ok(!overlaps(a.region, b.region), `${e.id}: ${a.id} ∩ ${b.id}`)),
    );
  }
});
