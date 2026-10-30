export type Player = 0 | 1;

export type ClockMode = "ready" | "editing" | "running" | "finished";
export type FinishReason = "timeout" | "checkmate";

export type ClockState = {
  mode: ClockMode;
  initialTimeMs: number;
  startingPlayer: Player;
  active: Player | null;
  winner: Player | null;
  finishReason: FinishReason | null;
  remainingMs: [number, number];
  moves: [number, number];
  turnStartedAt: number;
};

export const PLAYER_LEFT: Player = 0;
export const PLAYER_RIGHT: Player = 1;

export const DEFAULT_INITIAL_TIME_MS = 5 * 60_000;
export const MIN_INITIAL_TIME_MS = 60_000;
export const MAX_INITIAL_TIME_MS = 60 * 60_000;
export const EDIT_STEP_MS = 60_000;

function opponent(player: Player): Player {
  return player === PLAYER_LEFT ? PLAYER_RIGHT : PLAYER_LEFT;
}

export function clampInitialTime(milliseconds: number): number {
  return Math.min(MAX_INITIAL_TIME_MS, Math.max(MIN_INITIAL_TIME_MS, milliseconds));
}

export function createClock(
  initialTimeMs = DEFAULT_INITIAL_TIME_MS,
  startingPlayer: Player = PLAYER_LEFT,
): ClockState {
  const time = clampInitialTime(initialTimeMs);
  return {
    mode: "ready",
    initialTimeMs: time,
    startingPlayer,
    active: null,
    winner: null,
    finishReason: null,
    remainingMs: [time, time],
    moves: [0, 0],
    turnStartedAt: 0,
  };
}

export function syncClock(state: ClockState, now: number): ClockState {
  if (state.mode !== "running" || state.active === null) return state;

  // Date.now() is wall-clock time on the current runtime. Rebasing on a
  // backwards jump avoids freezing the clock until the old timestamp catches up.
  const elapsed = Math.max(0, now - state.turnStartedAt);
  const remaining: [number, number] = [...state.remainingMs];
  remaining[state.active] = Math.max(0, remaining[state.active] - elapsed);

  if (remaining[state.active] === 0) {
    return {
      ...state,
      mode: "finished",
      active: null,
      winner: opponent(state.active),
      finishReason: "timeout",
      remainingMs: remaining,
      turnStartedAt: now,
    };
  }

  return { ...state, remainingMs: remaining, turnStartedAt: now };
}

/** A short Start press starts the selected clock, then passes the turn. */
export function pressStart(state: ClockState, now: number): ClockState {
  if (state.mode === "ready") {
    return {
      ...state,
      mode: "running",
      active: state.startingPlayer,
      turnStartedAt: now,
    };
  }

  const synced = syncClock(state, now);
  if (synced.mode !== "running" || synced.active === null) return synced;

  const moves: [number, number] = [...synced.moves];
  moves[synced.active] += 1;

  return {
    ...synced,
    active: opponent(synced.active),
    moves,
    turnStartedAt: now,
  };
}

/** Long Start declares that the player whose clock is running delivered mate. */
export function finishByCheckmate(state: ClockState, now: number): ClockState {
  const synced = syncClock(state, now);
  if (synced.mode !== "running" || synced.active === null) return synced;

  return {
    ...synced,
    mode: "finished",
    active: null,
    winner: synced.active,
    finishReason: "checkmate",
    turnStartedAt: now,
  };
}

export function resetClock(state: ClockState): ClockState {
  return createClock(state.initialTimeMs, state.startingPlayer);
}

export function backToStart(state: ClockState): ClockState {
  if (state.mode === "ready") return state;
  return resetClock(state);
}

export function toggleEditing(state: ClockState): ClockState {
  if (state.mode === "ready") return { ...state, mode: "editing" };
  if (state.mode === "editing") return { ...state, mode: "ready" };
  return state;
}

export function adjustInitialTime(state: ClockState, delta: number): ClockState {
  if (state.mode !== "editing" || delta === 0) return state;

  const initialTimeMs = clampInitialTime(
    state.initialTimeMs + Math.sign(delta) * EDIT_STEP_MS,
  );
  if (initialTimeMs === state.initialTimeMs) return state;

  return {
    ...state,
    initialTimeMs,
    remainingMs: [initialTimeMs, initialTimeMs],
  };
}

export function selectStartingPlayer(state: ClockState, delta: number): ClockState {
  if (state.mode !== "ready" || delta === 0) return state;
  const startingPlayer = delta > 0 ? PLAYER_RIGHT : PLAYER_LEFT;
  return startingPlayer === state.startingPlayer ? state : { ...state, startingPlayer };
}

export function formatTime(milliseconds: number): string {
  const value = Math.max(0, milliseconds);

  if (value < 60_000) {
    const tenths = Math.ceil(value / 100);
    if (tenths >= 600) return "1:00";
    return `${Math.floor(tenths / 10)}.${tenths % 10}`;
  }

  const seconds = Math.ceil(value / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
