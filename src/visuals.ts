import type { ClockState, Player } from "./clock.ts";

export type TimePressure = "calm" | "warning" | "critical";

export type TurnEffect = {
  to: Player;
  startedAt: number;
};

export type ClockVisualState = {
  now: number;
  launchedAt: number;
  turnEffect: TurnEffect | null;
};

export const INTRO_DURATION_MS = 900;
export const TURN_EFFECT_DURATION_MS = 450;
export const KING_FALL_DURATION_MS = 700;

export function timePressure(remainingMs: number): TimePressure {
  if (remainingMs <= 10_000) return "critical";
  if (remainingMs <= 60_000) return "warning";
  return "calm";
}

export function pulseOn(now: number, periodMs = 250): boolean {
  return Math.floor(now / periodMs) % 2 === 0;
}

export function effectProgress(now: number, startedAt: number, durationMs: number): number {
  return Math.min(1, Math.max(0, (now - startedAt) / durationMs));
}

/**
 * Compact description of everything that can visibly change on a timer tick.
 * Keeping this cheaper than building and serializing the full display tree lets
 * static screens sleep while still preserving every time-based animation.
 */
export function visualFrameKey(state: ClockState, visual: ClockVisualState): string {
  const parts: Array<string | number | null> = [
    state.mode,
    state.startingPlayer,
    state.active,
    state.winner,
    state.finishReason,
    timePressure(state.remainingMs[0]),
    timePressure(state.remainingMs[1]),
    state.moves[0],
    state.moves[1],
  ];

  const introElapsed = visual.now - visual.launchedAt;
  if (state.mode === "ready" && introElapsed < INTRO_DURATION_MS) {
    parts.push("intro", Math.floor(Math.max(0, introElapsed) / 150));
  }

  if (visual.turnEffect !== null) {
    const elapsed = visual.now - visual.turnEffect.startedAt;
    if (elapsed < TURN_EFFECT_DURATION_MS) {
      const progress = effectProgress(
        visual.now,
        visual.turnEffect.startedAt,
        TURN_EFFECT_DURATION_MS,
      );
      parts.push(
        "turn",
        visual.turnEffect.to,
        Math.round(progress * 26),
        Math.round(progress * 58),
        pulseOn(visual.now, 200) ? 1 : 0,
      );
    }
  }

  if (
    state.mode === "running" &&
    state.active !== null &&
    timePressure(state.remainingMs[state.active]) === "critical"
  ) {
    parts.push("critical", pulseOn(visual.now, 200) ? 1 : 0);
  }

  if (state.mode === "finished") {
    const finishElapsed = visual.now - state.turnStartedAt;
    parts.push("victory-front", Math.floor(visual.now / 250));
    if (finishElapsed < KING_FALL_DURATION_MS) {
      parts.push(
        "king-fall",
        Math.round(
          effectProgress(visual.now, state.turnStartedAt, KING_FALL_DURATION_MS) * 53,
        ),
      );
    } else {
      parts.push("victory-back", Math.floor(visual.now / 500));
    }
  }

  return parts.join("|");
}
