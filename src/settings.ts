import schema from "./appmeta/settings.json" with { type: "json" };
import {
  MAX_INITIAL_TIME_MS,
  MIN_INITIAL_TIME_MS,
  PLAYER_LEFT,
  PLAYER_RIGHT,
  type Player,
} from "./clock.ts";

export type ClockSettings = {
  initialTimeMs: number;
  startingPlayer: Player;
  isSoundEnabled: boolean;
};

const MINUTE_MS = 60_000;

export const DEFAULT_SETTINGS: Readonly<ClockSettings> = {
  initialTimeMs: schema.fields.initial_minutes.default * MINUTE_MS,
  startingPlayer: schema.fields.starting_player.default === "right" ? PLAYER_RIGHT : PLAYER_LEFT,
  isSoundEnabled: schema.fields.sound.default,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads the firmware settings document; missing or invalid fields use schema defaults. */
export function parseSettings(document: unknown): ClockSettings {
  if (!isRecord(document) || !isRecord(document.values)) {
    throw new Error("Invalid settings document");
  }
  if (document.version !== schema.version) {
    throw new Error(`Unsupported settings schema version: ${String(document.version)}`);
  }

  const values = document.values;
  const minutes = values.initial_minutes;
  const initialTimeMs = typeof minutes === "number" ? minutes * MINUTE_MS : NaN;
  const hasValidTime =
    Number.isInteger(minutes) &&
    initialTimeMs >= MIN_INITIAL_TIME_MS &&
    initialTimeMs <= MAX_INITIAL_TIME_MS;

  return {
    initialTimeMs: hasValidTime ? initialTimeMs : DEFAULT_SETTINGS.initialTimeMs,
    startingPlayer:
      values.starting_player === "right"
        ? PLAYER_RIGHT
        : values.starting_player === "left"
          ? PLAYER_LEFT
          : DEFAULT_SETTINGS.startingPlayer,
    isSoundEnabled: typeof values.sound === "boolean" ? values.sound : DEFAULT_SETTINGS.isSoundEnabled,
  };
}
