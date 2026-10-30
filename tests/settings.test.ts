import assert from "node:assert/strict";
import test from "node:test";
import schema from "../src/appmeta/settings.json" with { type: "json" };
import {
  DEFAULT_INITIAL_TIME_MS,
  MAX_INITIAL_TIME_MS,
  MIN_INITIAL_TIME_MS,
  PLAYER_LEFT,
  PLAYER_RIGHT,
} from "../src/clock.ts";
import { DEFAULT_SETTINGS, parseSettings } from "../src/settings.ts";

const document = (values: Record<string, unknown>) => ({ version: schema.version, values });

test("native settings schema agrees with clock defaults and bounds", () => {
  const time = schema.fields.initial_minutes;
  assert.equal(schema.format_version, 1);
  assert.ok(Number.isInteger(schema.version) && schema.version > 0);
  assert.equal(time.type, "integer");
  assert.equal(time.default * 60_000, DEFAULT_INITIAL_TIME_MS);
  assert.equal(time.min * 60_000, MIN_INITIAL_TIME_MS);
  assert.equal(time.max * 60_000, MAX_INITIAL_TIME_MS);
  assert.equal(time.step, 1);
  assert.deepEqual(schema.fields.starting_player.options.map((option) => option.value), ["left", "right"]);
  assert.deepEqual(parseSettings(document({})), DEFAULT_SETTINGS);
});

test("loads time, first player and mute from native settings", () => {
  assert.deepEqual(parseSettings(document({ initial_minutes: 12, starting_player: "right", sound: false })), {
    initialTimeMs: 12 * 60_000,
    startingPlayer: PLAYER_RIGHT,
    isSoundEnabled: false,
  });
  for (const minutes of [1, 60]) {
    assert.equal(parseSettings(document({ initial_minutes: minutes })).initialTimeMs, minutes * 60_000);
  }
  assert.equal(parseSettings(document({ starting_player: "left" })).startingPlayer, PLAYER_LEFT);
});

test("invalid field values fall back independently without coercion", () => {
  for (const minutes of [undefined, null, "12", true, 0, -1, 61, 1.5, NaN, Infinity, {}]) {
    assert.deepEqual(parseSettings(document({ initial_minutes: minutes, starting_player: "right", sound: false })), {
      initialTimeMs: DEFAULT_SETTINGS.initialTimeMs,
      startingPlayer: PLAYER_RIGHT,
      isSoundEnabled: false,
    });
  }
  for (const player of [undefined, null, "white", "RIGHT", 0, 1, true, {}]) {
    assert.equal(parseSettings(document({ starting_player: player })).startingPlayer, DEFAULT_SETTINGS.startingPlayer);
  }
  for (const sound of [undefined, null, "false", "true", 0, 1, {}]) {
    assert.equal(parseSettings(document({ sound })).isSoundEnabled, DEFAULT_SETTINGS.isSoundEnabled);
  }
});

test("rejects malformed documents and mismatched schema versions", () => {
  for (const invalid of [null, [], true, "{}", {}, { version: schema.version },
    { version: schema.version, values: null }, { version: schema.version, values: [] }]) {
    assert.throws(() => parseSettings(invalid), /Invalid settings document/);
  }
  for (const version of [undefined, null, String(schema.version), schema.version + 1, 0]) {
    assert.throws(() => parseSettings({ version, values: {} }), /Unsupported settings schema version/);
  }
});
