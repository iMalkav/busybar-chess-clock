import assert from "node:assert/strict";
import test from "node:test";
import { registerFontMaps, textInk, textWidth } from "@busy-app/busy-lib";
import { bold, extra_large, small, tiny } from "@busy-app/busy-lib/fonts";
import {
  createClock, finishByCheckmate, pressStart, syncClock, toggleEditing,
} from "../src/clock.ts";
import { clockElements } from "../src/screens/clock.ts";

for (const map of [bold, extra_large, small, tiny]) registerFontMaps(map);

const running = pressStart(createClock(), 0);
const states = [
  createClock(), createClock(60 * 60_000, 1), toggleEditing(createClock()),
  running, pressStart(running, 1_000),
  { ...running, remainingMs: [59_900, 300_000] as [number, number] },
  { ...running, remainingMs: [9_900, 300_000] as [number, number] },
  finishByCheckmate(running, 1_000), syncClock(running, 300_000),
];

test("all screen states fit visible margins and leave the rear navigation bar free", () => {
  for (const state of states) {
    const elements = clockElements(state);
    assert.equal(new Set(elements.map((element) => element.id)).size, elements.length);
    for (const element of elements) {
      assert.ok(typeof element.x === "number" && typeof element.y === "number");
      const width = element.display === "front" ? 72 : 140;
      const height = element.display === "front" ? 16 : 80;
      if (element.type === "text") {
        const ink = textInk(element.text, element.font ?? "normal");
        assert.ok(element.x >= 1, element.id);
        assert.ok(element.x + textWidth(element.text, element.font ?? "normal") <= width - 1, element.id);
        assert.ok(element.y + ink.top >= 1, element.id);
        assert.ok(element.y + ink.top + ink.height <= height - 1, element.id);
      } else if (element.type === "rectangle") {
        assert.ok(element.x >= 1 && element.y >= 1, element.id);
        assert.ok(element.x + element.width <= width - 1, element.id);
        assert.ok(element.y + element.height <= height - 1, element.id);
      }
    }
  }
});

test("both screens show the same time, even below one minute", () => {
  for (const state of states) {
    const elements = clockElements(state);
    for (const player of [0, 1]) {
      const front = elements.find((element) => element.id === `front-p${player}-time`);
      const back = elements.find((element) => element.id === `back-p${player}-time`);
      assert.ok(front?.type === "text" && back?.type === "text");
      assert.equal(front.text, back.text);
    }
  }
});

test("state changes retain element IDs and both clocks", () => {
  const ids = clockElements(states[0]!).map((element) => element.id).sort();
  for (const state of states) assert.deepEqual(clockElements(state).map((element) => element.id).sort(), ids);
});

test("ready and edit states explain the next action; results identify the winner", () => {
  const hint = (state: typeof running) =>
    clockElements(state).find((element) => element.id === "front-hint");
  assert.deepEqual(hint(createClock())?.type, "text");
  const ready = hint(createClock());
  const editing = hint(toggleEditing(createClock()));
  const won = hint(finishByCheckmate(running, 1_000));
  assert.ok(ready?.type === "text" && ready.text.includes("START"));
  assert.ok(editing?.type === "text" && editing.text.includes("OK"));
  assert.ok(won?.type === "text" && won.text === "LEFT WINS");
});
