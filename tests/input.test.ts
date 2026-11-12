import assert from "node:assert/strict";
import test from "node:test";
import { createInputHandler } from "../src/input.ts";

function fixture(): {
  events: string[];
  handle: ReturnType<typeof createInputHandler>;
} {
  const events: string[] = [];
  const handle = createInputHandler(
    {
      shortStart: () => events.push("start:short"),
      longStart: () => events.push("start:long"),
      toggleEditing: () => events.push("edit"),
      rotateEncoder: (delta) => events.push(`encoder:${delta}`),
      back: () => events.push("back"),
    },
  );
  return { events, handle };
}

test("a short Start press passes the turn", () => {
  const { events, handle } = fixture();
  handle({ key: "start", action: "press" });
  handle({ key: "start", action: "release" });
  handle({ key: "start", action: "short" });
  assert.deepEqual(events, ["start:short"]);
});

test("a long Start press declares checkmate", () => {
  const { events, handle } = fixture();
  handle({ key: "start", action: "press" });
  handle({ key: "start", action: "long" });
  handle({ key: "start", action: "release" });
  assert.deepEqual(events, ["start:long"]);
});

test("OK and Back react once to short presses; raw and long events are ignored", () => {
  const { events, handle } = fixture();
  handle({ key: "ok", action: "press" });
  handle({ key: "ok", action: "release" });
  handle({ key: "ok", action: "short" });
  handle({ key: "ok", action: "long" });
  handle({ key: "encoder", action: "clockwise", delta: 1 });
  handle({ key: "encoder", action: "counterclockwise", delta: -1 });
  handle({ key: "back", action: "press" });
  handle({ key: "back", action: "release" });
  handle({ key: "back", action: "short" });
  handle({ key: "back", action: "long" });
  assert.deepEqual(events, ["edit", "encoder:1", "encoder:-1", "back"]);
});

test("encoder ignores malformed events", () => {
  const { events, handle } = fixture();
  handle({ key: "encoder" });
  handle({ key: "encoder", delta: NaN });
  handle({ key: "encoder", delta: Infinity });
  handle({ key: "encoder", delta: 0 });
  assert.deepEqual(events, []);
});
