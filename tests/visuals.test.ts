import assert from "node:assert/strict";
import test from "node:test";
import { createClock, pressStart } from "../src/clock.ts";
import {
  effectProgress,
  pulseOn,
  timePressure,
  visualFrameKey,
} from "../src/visuals.ts";

test("time pressure changes at one minute and ten seconds", () => {
  assert.equal(timePressure(60_001), "calm");
  assert.equal(timePressure(60_000), "warning");
  assert.equal(timePressure(10_001), "warning");
  assert.equal(timePressure(10_000), "critical");
});

test("animation progress is clamped", () => {
  assert.equal(effectProgress(500, 1_000, 500), 0);
  assert.equal(effectProgress(1_250, 1_000, 500), 0.5);
  assert.equal(effectProgress(2_000, 1_000, 500), 1);
});

test("pulse alternates on period boundaries", () => {
  assert.equal(pulseOn(0, 250), true);
  assert.equal(pulseOn(249, 250), true);
  assert.equal(pulseOn(250, 250), false);
  assert.equal(pulseOn(500, 250), true);
});

test("static ready screen keeps the same visual frame key after the intro", () => {
  const state = createClock();
  const first = visualFrameKey(state, { now: 1_000, launchedAt: 0, turnEffect: null });
  const later = visualFrameKey(state, { now: 10_000, launchedAt: 0, turnEffect: null });
  assert.equal(first, later);
});

test("running frame key stays stable inside one visual pressure tier", () => {
  const state = pressStart(createClock(), 0);
  const first = visualFrameKey(state, { now: 100, launchedAt: 0, turnEffect: null });
  const sameSecond = visualFrameKey(state, { now: 500, launchedAt: 0, turnEffect: null });
  const nextSecond = visualFrameKey(
    { ...state, remainingMs: [299_000, 300_000] },
    { now: 1_000, launchedAt: 0, turnEffect: null },
  );
  assert.equal(first, sameSecond);
  assert.equal(first, nextSecond);
});
