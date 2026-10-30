import type { BusySnapshotState, DisplayDrawParams } from "@busy-app/busy-lib";
import { device } from "../shared/device.ts";
import manifest from "./appmeta/manifest.json";
import {
  adjustInitialTime,
  backToStart,
  clampInitialTime,
  createClock,
  DEFAULT_INITIAL_TIME_MS,
  finishByCheckmate,
  formatTime,
  pressStart,
  resetClock,
  selectStartingPlayer,
  syncClock,
  toggleEditing,
  type ClockState,
  type Player,
} from "./clock.ts";
import { createInputHandler, type DeviceInputEvent } from "./input.ts";
import { clockElements, clockTimeElements } from "./screens/clock.ts";
import {
  pulseOn,
  timePressure,
  TURN_EFFECT_DURATION_MS,
  visualFrameKey,
  type TurnEffect,
} from "./visuals.ts";

type Elements = NonNullable<DisplayDrawParams["elements"]>;

const APP = manifest.id;
const TICK_MS = 250;
const VICTORY_FRAME_MS = 500;
const DRAW_BATCH_SIZE = 8;
const TIME_KEY = "initial-time-ms";
const MOVE_SOUND = "sounds/countdown_tick.snd";
const TIMEOUT_SOUND = "sounds/countdown_finish.snd";
const CHECKMATE_SOUND = "sounds/session_completed.snd";

function loadInitialTime(): number {
  const stored = localStorage.getItem(TIME_KEY);
  if (stored === null) return DEFAULT_INITIAL_TIME_MS;
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? clampInitialTime(parsed) : DEFAULT_INITIAL_TIME_MS;
}

let state: ClockState = createClock(loadInitialTime());
let launchedAt = Date.now();
let turnEffect: TurnEffect | null = null;
let lastCriticalSecond: number | null = null;
let unsubscribeInput: (() => void) | null = null;
let tickHandle: ReturnType<typeof setInterval> | null = null;
let stopped = false;
let idleBusySnapshot: BusySnapshotState | null = null;

let drawn = new Map<string, string>();
let drawPending = false;
let timeDrawPending = 0;
let drawPromise: Promise<void> | null = null;
let fullRedrawRequested = false;
let clearBeforeNextDraw = false;
let lastVisualFrameKey = "";

function report(error: unknown): void {
  let detail = error instanceof Error ? error.message : String(error);
  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") detail += ` ${serialized}`;
  } catch {
    // Best-effort diagnostics only.
  }
  console.error(`${APP}: ${detail}`);
}

function playSound(path: string): void {
  void device.AudioPlay({ application_name: APP, path }).catch(() => {
    // Audio is decorative. A muted/busy audio service must never stop the clock.
  });
}

function suppressSystemStart(): void {
  if (idleBusySnapshot === null) return;

  // Start is global on current firmware, so the built-in BUSY timer sees the
  // same press as the JS app. Restore the idle snapshot after native handlers
  // have run, then repaint anything rejected during the brief priority lock.
  setTimeout(() => {
    if (stopped || idleBusySnapshot === null) return;
    void device
      .BusySnapshotSet({
        snapshot: idleBusySnapshot,
        snapshot_timestamp_ms: Date.now(),
      })
      .then(() => {
        fullRedrawRequested = true;
        requestDraw();

        // The native BUSY scene reacts to the snapshot asynchronously and can
        // clear its canvas after the HTTP response. Repaint once more after it
        // has settled so unchanged elements (the opponent's time) return too.
        setTimeout(() => {
          if (stopped) return;
          fullRedrawRequested = true;
          requestDraw();
        }, 450);
      }, () => {
        // Compatibility guard only; the chess clock remains usable if the
        // snapshot endpoint is unavailable on an older firmware.
      });
  }, 100);
}

function notificationColor(): string {
  const now = Date.now();
  if (state.mode === "finished") return pulseOn(now, VICTORY_FRAME_MS) ? "#55FF55FF" : "#00000000";
  if (turnEffect !== null && now - turnEffect.startedAt < TURN_EFFECT_DURATION_MS) {
    return turnEffect.to === 0 ? "#28D7FFFF" : "#FF4FD8FF";
  }
  if (
    state.mode === "running" &&
    state.active !== null &&
    timePressure(state.remainingMs[state.active]) === "critical"
  ) {
    return pulseOn(now, 200) ? "#FF304BFF" : "#00000000";
  }
  return "#00000000";
}

async function draw(): Promise<void> {
  if (clearBeforeNextDraw) {
    clearBeforeNextDraw = false;
    await device.DisplayClear({ application_name: APP });
    drawn = new Map();
    fullRedrawRequested = true;
  }

  const forceAll = fullRedrawRequested;
  fullRedrawRequested = false;
  const elements: Elements = clockElements(state, {
    now: Date.now(),
    launchedAt,
    turnEffect,
  });
  const next = new Map(elements.map((element) => [element.id, JSON.stringify(element)]));
  const changed = elements.filter(
    (element) => forceAll || drawn.get(element.id) !== next.get(element.id),
  );

  for (let index = 0; index < changed.length; index += DRAW_BATCH_SIZE) {
    await device.DisplayDraw({
      application_name: APP,
      priority: 50,
      led_notification_color: notificationColor(),
      elements: changed.slice(index, index + DRAW_BATCH_SIZE),
    });
  }

  const stale = [...drawn.keys()].filter((id) => !next.has(id));
  if (stale.length > 0) {
    await device.DisplayClear({ application_name: APP, element_ids: stale });
  }

  drawn = next;
}

async function drawTimes(mask: number): Promise<void> {
  const elements: Elements = [];
  if ((mask & 1) !== 0) elements.push(...clockTimeElements(state, 0));
  if ((mask & 2) !== 0) elements.push(...clockTimeElements(state, 1));
  if (elements.length === 0) return;

  await device.DisplayDraw({
    application_name: APP,
    priority: 50,
    led_notification_color: notificationColor(),
    elements,
  });

  for (const element of elements) drawn.set(element.id, JSON.stringify(element));
}

async function drainDraws(): Promise<void> {
  while ((drawPending || timeDrawPending !== 0) && !stopped) {
    if (drawPending) {
      drawPending = false;
      timeDrawPending = 0;
      await draw();
    } else {
      const mask = timeDrawPending;
      timeDrawPending = 0;
      await drawTimes(mask);
    }
  }
}

function scheduleDraws(): void {
  if (drawPromise !== null) return;

  drawPromise = drainDraws().then(
    () => {
      drawPromise = null;
      if ((drawPending || timeDrawPending !== 0) && !stopped) scheduleDraws();
    },
    (error: unknown) => {
      drawPromise = null;
      report(error);
      if ((drawPending || timeDrawPending !== 0) && !stopped) scheduleDraws();
    },
  );
}

function requestDraw(): void {
  if (stopped) return;
  drawPending = true;
  scheduleDraws();
}

function requestTimeDraw(player: Player): void {
  if (stopped) return;
  timeDrawPending |= 1 << player;
  scheduleDraws();
}

async function finishShutdown(): Promise<void> {
  try {
    const activeDraw = drawPromise;
    if (activeDraw) await activeDraw;
    await device.DisplayClear({ application_name: APP });
  } catch (error) {
    report(error);
  }
  console.info(`${APP}: stopped`);
}

function shutdown(): void {
  if (stopped) return;
  stopped = true;

  // Keeps the runner alive until the cleanup request is started.
  setTimeout(() => void finishShutdown(), 10);

  if (tickHandle !== null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
  if (unsubscribeInput !== null) {
    unsubscribeInput();
    unsubscribeInput = null;
  }
}

const handleInput = createInputHandler({
  shortStart() {
    suppressSystemStart();
    const now = Date.now();
    const previous = state;
    state = pressStart(state, now);
    if (state !== previous && state.mode === "running" && state.active !== null) {
      turnEffect = { to: state.active, startedAt: now };
      lastCriticalSecond = null;
      playSound(MOVE_SOUND);
      requestDraw();
    }
  },
  longStart() {
    const previous = state;
    if (state.mode === "running") {
      state = finishByCheckmate(state, Date.now());
      if (state !== previous) {
        turnEffect = null;
        playSound(CHECKMATE_SOUND);
        console.info(`${APP}: checkmate, winner ${state.winner}`);
      }
    } else if (state.mode === "finished") {
      state = resetClock(state);
      launchedAt = Date.now();
    }
    if (state !== previous) requestDraw();
  },
  toggleEditing() {
    const previous = state;
    state = toggleEditing(state);
    if (state !== previous) {
      playSound(MOVE_SOUND);
      requestDraw();
    }
  },
  rotateEncoder(delta) {
    const previous = state;
    state =
      state.mode === "editing"
        ? adjustInitialTime(state, delta)
        : selectStartingPlayer(state, delta);
    if (state !== previous) {
      if (state.mode === "editing") {
        localStorage.setItem(TIME_KEY, String(state.initialTimeMs));
        console.info(`${APP}: time ${formatTime(state.initialTimeMs)}`);
      } else {
        console.info(`${APP}: starting player ${state.startingPlayer}`);
      }
      playSound(MOVE_SOUND);
      requestDraw();
    }
  },
  back() {
    if (state.mode === "ready") {
      shutdown();
    } else {
      state = backToStart(state);
      turnEffect = null;
      lastCriticalSecond = null;
      launchedAt = Date.now();
      clearBeforeNextDraw = true;
      requestDraw();
    }
  },
});

function tick(): void {
  const now = Date.now();
  const previousMode = state.mode;
  const previousTimes = [formatTime(state.remainingMs[0]), formatTime(state.remainingMs[1])];
  state = syncClock(state, now);
  if (previousMode === "running" && state.mode === "finished") {
    turnEffect = null;
    lastCriticalSecond = null;
    playSound(TIMEOUT_SOUND);
  } else if (state.mode === "running" && state.active !== null) {
    const remaining = state.remainingMs[state.active];
    if (remaining <= 5_000) {
      const second = Math.ceil(remaining / 1_000);
      if (second !== lastCriticalSecond) {
        lastCriticalSecond = second;
        if (second > 0) playSound(MOVE_SOUND);
      }
    } else {
      lastCriticalSecond = null;
    }
  }

  if (turnEffect !== null && now - turnEffect.startedAt >= TURN_EFFECT_DURATION_MS) {
    turnEffect = null;
  }

  const frameKey = visualFrameKey(state, { now, launchedAt, turnEffect });
  if (frameKey !== lastVisualFrameKey) {
    lastVisualFrameKey = frameKey;
    requestDraw();
  } else if (state.mode === "running") {
    if (formatTime(state.remainingMs[0]) !== previousTimes[0]) requestTimeDraw(0);
    if (formatTime(state.remainingMs[1]) !== previousTimes[1]) requestTimeDraw(1);
  }
}

function run(): void {
  unsubscribeInput = listen("input", (event: DeviceInputEvent) => handleInput(event));
  tickHandle = setInterval(tick, TICK_MS);
  lastVisualFrameKey = visualFrameKey(state, {
    now: Date.now(),
    launchedAt,
    turnEffect,
  });
  void device.BusySnapshotGet().then(
    (snapshot) => {
      if (snapshot.snapshot.type === "NOT_STARTED") idleBusySnapshot = snapshot.snapshot;
    },
    () => {
      // Older firmware may not expose BUSY snapshots; drawing still works.
    },
  );
  // A forced launcher stop cannot execute our shutdown hook, so remove any
  // orphaned elements from the previous process before drawing the first frame.
  void device.DisplayClear({ application_name: APP }).then(requestDraw, (error: unknown) => {
    // Clearing is defensive startup cleanup. A lost response must not leave the
    // app on a black screen: repaint the complete frame anyway.
    report(error);
    drawn = new Map();
    fullRedrawRequested = true;
    requestDraw();
  });
  console.info(`${APP}: started with ${formatTime(state.initialTimeMs)}`);
}

run();
