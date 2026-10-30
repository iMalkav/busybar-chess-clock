import assert from "node:assert/strict";
import test from "node:test";
import { createInputHandler } from "../src/input.ts";

function fixture(): {
  events: string[];
  setNow(value: number): void;
  handle: ReturnType<typeof createInputHandler>;
} {
  const events: string[] = [];
  let now = 0;
  const handle = createInputHandler(
    {
      shortStart: () => events.push("start:short"),
      longStart: () => events.push("start:long"),
      toggleEditing: () => events.push("edit"),
      rotateEncoder: (delta) => events.push(`encoder:${delta}`),
      back: () => events.push("back"),
    },
    { now: () => now, longPressMs: 1_000 },
  );
  return { events, setNow: (value) => (now = value), handle };
}

test("a short Start press passes the turn", () => {
  const { events, setNow, handle } = fixture();
  setNow(100);
  handle({ key: "start", action: "press" });
  setNow(500);
  handle({ key: "start", action: "release" });
  assert.deepEqual(events, ["start:short"]);
});

test("a long Start press declares checkmate", () => {
  const { events, setNow, handle } = fixture();
  setNow(100);
  handle({ key: "start", action: "press" });
  setNow(1_100);
  handle({ key: "start", action: "release" });
  assert.deepEqual(events, ["start:long"]);
});

test("OK toggles editing on release; encoder rotates; Back fires on press", () => {
  const { events, handle } = fixture();
  handle({ key: "ok", action: "press" });
  handle({ key: "ok", action: "release" });
  handle({ key: "encoder", action: "clockwise", delta: 1 });
  handle({ key: "encoder", action: "counterclockwise", delta: -1 });
  handle({ key: "back", action: "press" });
  handle({ key: "back", action: "release" });
  assert.deepEqual(events, ["edit", "encoder:1", "encoder:-1", "back"]);
});
