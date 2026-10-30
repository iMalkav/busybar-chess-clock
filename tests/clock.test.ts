import assert from "node:assert/strict";
import test from "node:test";
import {
  adjustInitialTime,
  backToStart,
  createClock,
  finishByCheckmate,
  formatTime,
  pressStart,
  resetClock,
  selectStartingPlayer,
  syncClock,
  toggleEditing,
} from "../src/clock.ts";

test("one Start button starts the selected clock and then passes the turn", () => {
  let state = createClock(300_000);
  state = selectStartingPlayer(state, 1);
  state = pressStart(state, 1_000);
  assert.equal(state.active, 1);

  state = pressStart(state, 3_000);
  assert.equal(state.remainingMs[1], 298_000);
  assert.equal(state.moves[1], 1);
  assert.equal(state.active, 0);

  state = syncClock(state, 4_000);
  assert.equal(state.remainingMs[0], 299_000);
});

test("encoder selects the first player only on the ready screen", () => {
  let state = createClock(300_000);
  state = selectStartingPlayer(state, 1);
  assert.equal(state.startingPlayer, 1);
  state = selectStartingPlayer(state, -1);
  assert.equal(state.startingPlayer, 0);

  state = toggleEditing(state);
  assert.equal(selectStartingPlayer(state, 1), state);
  state = toggleEditing(state);
  state = pressStart(state, 1_000);
  assert.equal(selectStartingPlayer(state, 1), state);
});

test("Back returns an active game to ready and preserves its setup", () => {
  let state = selectStartingPlayer(createClock(300_000), 1);
  state = pressStart(state, 1_000);
  state = syncClock(state, 3_000);
  state = backToStart(state);

  assert.equal(state.mode, "ready");
  assert.equal(state.startingPlayer, 1);
  assert.deepEqual(state.remainingMs, [300_000, 300_000]);
  assert.equal(backToStart(state), state);
});

test("clock flags at zero and names the other player as winner", () => {
  let state = pressStart(createClock(60_000), 10_000);
  state = syncClock(state, 70_000);
  assert.equal(state.mode, "finished");
  assert.equal(state.winner, 1);
  assert.equal(state.finishReason, "timeout");
  assert.equal(state.remainingMs[0], 0);
});

test("OK editing and encoder adjustment work only before the game", () => {
  let state = createClock(300_000);
  const unchanged = adjustInitialTime(state, 1);
  assert.equal(unchanged, state);

  state = toggleEditing(state);
  state = adjustInitialTime(state, 1);
  assert.equal(state.initialTimeMs, 360_000);
  assert.deepEqual(state.remainingMs, [360_000, 360_000]);

  state = toggleEditing(state);
  state = pressStart(state, 1_000);
  const running = adjustInitialTime(state, -1);
  assert.equal(running, state);
  assert.equal(toggleEditing(state), state);
});

test("long Start stops both clocks and awards a checkmate win to the active player", () => {
  let state = pressStart(createClock(300_000), 1_000);
  state = finishByCheckmate(state, 2_500);
  assert.equal(state.mode, "finished");
  assert.equal(state.winner, 0);
  assert.equal(state.finishReason, "checkmate");
  assert.equal(state.remainingMs[0], 298_500);
  assert.equal(syncClock(state, 20_000), state);

  state = resetClock(state);
  assert.equal(state.mode, "ready");
  assert.deepEqual(state.remainingMs, [300_000, 300_000]);
});

test("time formatting uses minutes, then tenths below one minute", () => {
  assert.equal(formatTime(300_000), "5:00");
  assert.equal(formatTime(59_900), "59.9");
  assert.equal(formatTime(9_001), "9.1");
  assert.equal(formatTime(0), "0.0");
});
