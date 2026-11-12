import manifest from "./appmeta/manifest.json";
import { device } from "./device.ts";
import {
  adjustInitialTime, backToStart, clampInitialTime, createClock,
  finishByCheckmate, formatTime, pressStart, resetClock, selectStartingPlayer,
  syncClock, toggleEditing,
} from "./clock.ts";
import { createInputHandler } from "./input.ts";
import { clockElements } from "./screens/clock.ts";
import { DEFAULT_SETTINGS, parseSettings } from "./settings.ts";

const APP = manifest.id;
const TICK_MS = 100;
const TIME_KEY = "initial-time-ms";
const MOVE_SOUND = "sounds/countdown_tick.snd";
const TIMEOUT_SOUND = "sounds/countdown_finish.snd";
const CHECKMATE_SOUND = "sounds/session_completed.snd";

let settings = DEFAULT_SETTINGS;
let hasDeviceSettings = false;
let state = createClock();
let stopped = false;
let started = false;
let lastCriticalSecond: number | null = null;
let unsubscribeInput: (() => void) | null = null;
let tickHandle: ReturnType<typeof setInterval> | null = null;
let drawn = new Map<string, string>();
let drawRequested = false;
let forceRedraw = false;
let drawPromise: Promise<void> | null = null;
let audioPromise: Promise<unknown> = Promise.resolve();

function report(error: unknown): void {
  console.error(`${APP}: ${error instanceof Error ? error.message : String(error)}`);
}

function loadInitialTime(): number {
  const stored = localStorage.getItem(TIME_KEY);
  const parsed = stored === null ? NaN : Number(stored);
  return Number.isFinite(parsed) ? clampInitialTime(parsed) : DEFAULT_SETTINGS.initialTimeMs;
}

function playSound(path: string): void {
  if (!settings.isSoundEnabled) return;
  audioPromise = device.AudioPlay({ application_name: APP, path }).catch(() => {});
}

async function draw(): Promise<void> {
  const elements = clockElements(state);
  const next = new Map(elements.map((element) => [element.id, JSON.stringify(element)]));
  const changed = elements.filter((element) => forceRedraw || drawn.get(element.id) !== next.get(element.id));
  forceRedraw = false;
  if (changed.length > 0) {
    await device.DisplayDraw({
      application_name: APP, priority: 50,
      elements: changed,
    });
  }
  drawn = next;
}

function requestDraw(force = false): void {
  if (stopped) return;
  drawRequested = true;
  forceRedraw ||= force;
  if (drawPromise !== null) return;
  drawPromise = (async () => {
    while (drawRequested && !stopped) {
      drawRequested = false;
      await draw();
    }
  })().catch((error: unknown) => {
    drawn.clear();
    report(error);
  }).finally(() => {
    drawPromise = null;
    if (drawRequested && !stopped) requestDraw();
  });
}

async function finishShutdown(): Promise<void> {
  try {
    if (drawPromise !== null) await drawPromise;
    await audioPromise;
    await device.DisplayClear({ application_name: APP });
  } catch (error) {
    report(error);
  } finally {
    // Native promises alone do not retain the JS runner during HTTP cleanup.
    if (tickHandle !== null) clearInterval(tickHandle);
    tickHandle = null;
    unsubscribeInput?.();
    unsubscribeInput = null;
  }
}

function shutdown(): void {
  if (stopped) return;
  stopped = true;
  void finishShutdown();
}

const handleInput = createInputHandler({
  shortStart() {
    const previous = state;
    state = state.mode === "finished" ? resetClock(state) : pressStart(state, Date.now());
    if (state === previous) return;
    lastCriticalSecond = null;
    playSound(MOVE_SOUND);
    requestDraw();
  },
  longStart() {
    const previous = state;
    state = finishByCheckmate(state, Date.now());
    if (state === previous) return;
    playSound(CHECKMATE_SOUND);
    requestDraw();
  },
  toggleEditing() {
    const previous = state;
    state = toggleEditing(state);
    if (state !== previous) requestDraw();
  },
  rotateEncoder(delta) {
    const previous = state;
    state = state.mode === "editing" ? adjustInitialTime(state, delta) : selectStartingPlayer(state, delta);
    if (state === previous) return;
    if (state.mode === "editing" && !hasDeviceSettings) {
      localStorage.setItem(TIME_KEY, String(state.initialTimeMs));
    }
    requestDraw();
  },
  back() {
    if (state.mode === "ready") return shutdown();
    state = backToStart(state);
    lastCriticalSecond = null;
    requestDraw();
  },
});

function tick(): void {
  if (stopped || !started) return;
  const previousMode = state.mode;
  const previousTime = state.active === null ? null : formatTime(state.remainingMs[state.active]);
  state = syncClock(state, Date.now());
  if (previousMode === "running" && state.mode === "finished") {
    playSound(TIMEOUT_SOUND);
  } else if (state.mode === "running" && state.active !== null) {
    const remaining = state.remainingMs[state.active];
    const second = Math.ceil(remaining / 1_000);
    if (remaining <= 5_000 && second > 0 && second !== lastCriticalSecond) playSound(MOVE_SOUND);
    lastCriticalSecond = remaining <= 5_000 ? second : null;
  }
  const currentTime = state.active === null ? null : formatTime(state.remainingMs[state.active]);
  if (previousTime !== currentTime || previousMode !== state.mode) requestDraw();
}

async function run(): Promise<void> {
  // Keep native promise jobs moving during busy-lib's initial API negotiation.
  tickHandle = setInterval(tick, TICK_MS);
  try {
    settings = parseSettings(await device.AppsSettingsGet({ app_id: APP }));
    hasDeviceSettings = true;
  } catch (error) {
    report(error);
    settings = { ...DEFAULT_SETTINGS, initialTimeMs: loadInitialTime() };
  }
  state = createClock(settings.initialTimeMs, settings.startingPlayer);
  unsubscribeInput = listen("input", handleInput);
  started = true;
  // Clear only at launch; state changes update stable element IDs in place.
  try {
    await device.DisplayClear({ application_name: APP });
  } catch (error) {
    report(error);
  }
  requestDraw();
  console.info(`${APP}: started with ${formatTime(state.initialTimeMs)}`);
}

void run().catch(report);
