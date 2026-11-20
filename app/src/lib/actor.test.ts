import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTRO,
  INTRO_END,
  INTRO_TRAVEL_AT,
  easeInOut,
  introPhase,
  introPose,
  nextIntroState,
  pose,
  poseAt,
  posesEqual,
  settleStops,
  shouldPlayIntro,
  stopIndex,
  type Stop,
} from './actor.ts';

const stage = { vw: 1440, vh: 900, gutterL: 60, gutterR: 1380, gutterW: 100 };
const stops = (): Stop[] => [
  { at: -Infinity, until: 0, pose: pose(1200, 150, 300) },
  { at: 300, until: 700, pose: pose(1000, 900, 280, 0, 1) },
  { at: 2000, until: 2600, pose: pose(300, 2800, 200), ride: true },
  { at: 3000, until: Infinity, pose: pose(1100, 3600, 400) },
];

test('easeInOut runs 0 to 1 with no overshoot', () => {
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
  assert.equal(easeInOut(0.5), 0.5);
  for (let t = -0.5; t <= 1.5; t += 0.05) {
    const v = easeInOut(t);
    assert.ok(v >= 0 && v <= 1);
  }
});

test('stopIndex: the last stop whose hold has started', () => {
  const s = stops();
  assert.equal(stopIndex(-50, s), 0);
  assert.equal(stopIndex(150, s), 0);
  assert.equal(stopIndex(300, s), 1);
  assert.equal(stopIndex(2500, s), 2);
  assert.equal(stopIndex(99999, s), 3);
});

test('poseAt holds a still stop in document space, so it scrolls with the page', () => {
  const out = pose();
  poseAt(out, 400, stops(), stage);
  assert.equal(out.x, 1000);
  assert.equal(out.y, 900 - 400);
  assert.equal(out.w, 280);
  poseAt(out, 600, stops(), stage);
  assert.equal(out.y, 300);
});

test('poseAt keeps a ride stop at one viewport height through its hold', () => {
  const out = pose();
  poseAt(out, 2000, stops(), stage);
  const y0 = out.y;
  poseAt(out, 2400, stops(), stage);
  assert.equal(out.y, y0);
  assert.equal(y0, 2800 - 2000);
});

test('poseAt travels continuously between holds and lands exactly', () => {
  const s = stops();
  const out = pose();
  const atEnd = pose();
  poseAt(atEnd, 700, s, stage);
  poseAt(out, 700.001, s, stage);
  assert.ok(Math.abs(out.x - atEnd.x) < 0.5 && Math.abs(out.y - atEnd.y) < 0.5);
  poseAt(out, 2000, s, stage);
  assert.ok(posesEqual(out, pose(300, 800, 200), 0.001));
});

test('a long same-side travel swings out to the gutter at gutter size', () => {
  const s: Stop[] = [
    { at: -Infinity, until: 0, pose: pose(1100, 400, 300) },
    { at: 2000, until: Infinity, pose: pose(1100, 3000, 300) },
  ];
  const out = pose();
  poseAt(out, 1000, s, stage);
  assert.ok(Math.abs(out.x - stage.gutterR) < 0.01);
  assert.ok(Math.abs(out.w - stage.gutterW) < 0.01);
});

test('a short same-side travel steps out to the margin without shrinking', () => {
  const s: Stop[] = [
    { at: -Infinity, until: 0, pose: pose(1100, 400, 300) },
    { at: 200, until: Infinity, pose: pose(1000, 900, 260) },
  ];
  const out = pose();
  poseAt(out, 100, s, stage);
  assert.ok(Math.abs(out.x - stage.gutterR) < 0.01);
  assert.ok(Math.abs(out.w - 280) < 0.01);
});

test('a cross-side travel shrinks at its middle instead', () => {
  const s: Stop[] = [
    { at: -Infinity, until: 0, pose: pose(1100, 400, 300) },
    { at: 2000, until: Infinity, pose: pose(300, 3000, 200) },
  ];
  const out = pose();
  poseAt(out, 1000, s, stage);
  assert.ok(Math.abs(out.w - 90) < 0.01);
  assert.ok(Math.abs(out.x - 700) < 0.01);
});

test('settleStops opens the ends and keeps a minimum travel between crowded holds', () => {
  const s: Stop[] = [
    { at: 0, until: 500, pose: pose() },
    { at: 450, until: 900, pose: pose() },
    { at: 5000, until: 5400, pose: pose() },
  ];
  settleStops(s, 200, 4800);
  assert.equal(s[0].at, -Infinity);
  assert.equal(s[2].until, Infinity);
  assert.ok(s[1].at - s[0].until >= 200 - 1e-9);
  assert.ok(s[2].at <= 4800 - 100);
});

test('intro phases: hold, spin, travel, done', () => {
  assert.equal(introPhase(0), 'hold');
  assert.equal(introPhase(INTRO.hold), 'spin');
  assert.equal(introPhase(INTRO_TRAVEL_AT), 'travel');
  assert.equal(introPhase(INTRO_END), 'done');
  assert.ok(INTRO_END <= 4000);
});

test('the spin is one full turn that ends where it began, then the flight lands on target', () => {
  const big = pose(720, 450, 860, 0, 0.3, 0);
  const hero = pose(1200, 140, 300, 0, 0.3, 0);
  const out = pose();
  introPose(out, INTRO.hold + INTRO.spin / 2, big, hero);
  assert.ok(Math.abs(out.ry - (0.3 + Math.PI)) < 1e-9);
  introPose(out, INTRO_TRAVEL_AT - 1e-6, big, hero);
  assert.ok(Math.abs(out.ry - (0.3 + Math.PI * 2)) < 1e-6);
  introPose(out, INTRO_TRAVEL_AT, big, hero, 40);
  assert.ok(posesEqual(out, big));
  introPose(out, INTRO_END, big, hero);
  assert.ok(posesEqual(out, hero));
});

test('shouldPlayIntro: first visit only, never under reduced motion or without WebGL', () => {
  const base = { reduced: false, returning: false, seen: false, webgl: true };
  assert.equal(shouldPlayIntro(base), true);
  assert.equal(shouldPlayIntro({ ...base, reduced: true }), false);
  assert.equal(shouldPlayIntro({ ...base, returning: true }), false);
  assert.equal(shouldPlayIntro({ ...base, seen: true }), false);
  assert.equal(shouldPlayIntro({ ...base, webgl: false }), false);
});

test('intro state: skip or failure ends it from anywhere, and nothing goes back', () => {
  assert.equal(nextIntroState('stage', 'travel'), 'travel');
  assert.equal(nextIntroState('travel', 'end'), 'off');
  assert.equal(nextIntroState('stage', 'skip'), 'off');
  assert.equal(nextIntroState('travel', 'fail'), 'off');
  assert.equal(nextIntroState('off', 'travel'), 'off');
  assert.equal(nextIntroState('travel', 'travel'), 'travel');
});
