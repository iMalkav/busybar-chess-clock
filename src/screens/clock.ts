import type { DisplayDrawParams } from "@busy-app/busy-lib";
import { generateXpm2, scaleGrid } from "../../shared/xpm2.ts";
import {
  formatTime,
  PLAYER_LEFT,
  PLAYER_RIGHT,
  type ClockState,
  type Player,
} from "../clock.ts";
import {
  effectProgress,
  INTRO_DURATION_MS,
  KING_FALL_DURATION_MS,
  pulseOn,
  timePressure,
  TURN_EFFECT_DURATION_MS,
  type ClockVisualState,
} from "../visuals.ts";

type Elements = NonNullable<DisplayDrawParams["elements"]>;
type Element = Elements[number];
type Display = "front" | "back";

const BLACK = "#000000FF";
const TRANSPARENT = "#00000000";
const WHITE = "#FFFFFFFF";
const DIM = "#4B5360FF";
const AMBER = "#FFC247FF";
const RED = "#FF304BFF";
const GREEN = "#55FF88FF";
const ACCENT = ["#28D7FFFF", "#FF4FD8FF"] as const;
const ACCENT_DARK = ["#062632FF", "#2B0828FF"] as const;
const PANEL_X = [0, 37] as const;
const PANEL_CENTER = [17, 54] as const;

const CROWN = ["X.X.X.X", "XXXXXXX", ".XXXXX.", "..XXX..", ".XXXXX."];
const KING = [".X.X.", "XXXXX", ".XXX.", "..X..", ".XXX.", "XX.XX", "XXXXX"];
const FLAG = ["X....", "XXXX.", "XXXX.", "X....", "X....", "X...."];
const BOLT = ["..X", ".XX", ".X.", "XX.", ".X.", "X.."];

const CROWN_2 = scaleGrid(CROWN, 2);
const CROWN_3 = scaleGrid(CROWN, 3);
const KING_3 = scaleGrid(KING, 3);
const FLAG_2 = scaleGrid(FLAG, 2);
const BOLT_2 = scaleGrid(BOLT, 2);
const spriteCache = new Map<string, string>();

function formatArenaTime(milliseconds: number): string {
  if (milliseconds <= 10_000) return formatTime(milliseconds);
  const seconds = Math.ceil(milliseconds / 1_000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function rectangle(
  display: Display,
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fill?: "none" | "solid" | "gradient_h" | "gradient_v";
    colors?: string[];
    borderWidth?: number;
    borderColor?: string;
    z?: number;
  } = {},
): Element {
  return {
    type: "rectangle",
    id: `${display}-${id}`,
    display,
    x,
    y,
    width,
    height,
    fill: options.fill ?? "solid",
    fill_colors: options.colors ?? [TRANSPARENT],
    border_width: options.borderWidth ?? 0,
    border_color: options.borderColor ?? TRANSPARENT,
    z_index: options.z ?? 0,
  };
}

function text(
  display: Display,
  id: string,
  value: string,
  x: number,
  y: number,
  fontName: "tiny" | "small" | "normal" | "large" | "extra_large",
  color: string,
  z = 3,
): Element {
  const base = {
    type: "text",
    id: `${display}-${id}`,
    display,
    x,
    y,
    align: "center",
    text: value,
    color,
    z_index: z,
  } as const;

  // The build plugin discovers font maps statically, so every font value must
  // appear as a literal even though the layout helper receives a union.
  switch (fontName) {
    case "tiny":
      return { ...base, font: "tiny" };
    case "small":
      return { ...base, font: "small" };
    case "normal":
      return { ...base, font: "normal" };
    case "large":
      return { ...base, font: "large" };
    default:
      return { ...base, font: "extra_large" };
  }
}

function sprite(
  display: Display,
  id: string,
  grid: string[],
  color: string,
  x: number,
  y: number,
  z = 4,
  opacity = 100,
): Element {
  const cacheKey = `${color}\n${grid.join("\n")}`;
  let data = spriteCache.get(cacheKey);
  if (data === undefined) {
    data = generateXpm2({
      palette: {
        ".": { c: "none", g4: "none", m: "none" },
        X: { c: color, g4: color === DIM ? "gray" : "white", m: "white" },
      },
      grid,
    });
    spriteCache.set(cacheKey, data);
  }

  return {
    type: "xpmbitmap",
    id: `${display}-${id}`,
    display,
    x,
    y,
    data,
    opacity,
    z_index: z,
  };
}

function playerTone(state: ClockState, player: Player): string {
  if (state.mode === "editing") return AMBER;
  if (state.mode === "ready") {
    if (state.startingPlayer !== player) return DIM;
    return ACCENT[player];
  }
  if (state.mode === "finished") return state.winner === player ? GREEN : RED;
  if (state.active !== player) return DIM;

  const pressure = timePressure(state.remainingMs[player]);
  if (pressure === "critical") return RED;
  if (pressure === "warning") return AMBER;
  return ACCENT[player];
}

function panelFill(state: ClockState, player: Player, now: number): [string, string] {
  let edge = "#080A0DFF";
  const selected = state.mode === "ready" && state.startingPlayer === player;
  const active = state.mode === "running" && state.active === player;

  if (state.mode === "editing") edge = "#2A1B04FF";
  else if (selected) edge = ACCENT_DARK[player];
  else if (active) {
    const pressure = timePressure(state.remainingMs[player]);
    if (pressure === "critical") edge = pulseOn(now, 200) ? "#42020AFF" : "#180104FF";
    else if (pressure === "warning") edge = "#302004FF";
    else edge = ACCENT_DARK[player];
  }

  return player === PLAYER_LEFT ? [edge, BLACK] : [BLACK, edge];
}

function playerPanel(
  state: ClockState,
  player: Player,
  display: Display,
  visual: ClockVisualState,
): Elements {
  const x = PANEL_X[player];
  const tone = playerTone(state, player);
  const selected = state.mode === "ready" && state.startingPlayer === player;
  const active = state.mode === "running" && state.active === player;
  const highlighted = selected || active || state.mode === "editing";
  const time = formatTime(state.remainingMs[player]);
  const font = time.length > 4 ? "normal" : "large";
  const animating =
    state.mode === "running" &&
    visual.turnEffect !== null &&
    visual.now - visual.turnEffect.startedAt < TURN_EFFECT_DURATION_MS;
  const pulseWidth = animating && pulseOn(visual.now, 200) ? 29 : 26;
  const barX = player === PLAYER_LEFT ? x + 3 : x + 32 - pulseWidth;
  const out: Elements = [
    rectangle(display, `p${player}-bg`, x, 0, 35, 16, {
      fill: "gradient_h",
      colors: panelFill(state, player, visual.now),
      z: 0,
    }),
    text(display, `p${player}-time`, time, PANEL_CENTER[player], 8, font, tone, 3),
  ];

  if (highlighted) {
    out.push(
      rectangle(display, `p${player}-energy`, barX, 14, pulseWidth, 2, {
        colors: [tone],
        z: 4,
      }),
    );
  }

  return out;
}

/** Minimal update used by the running clock when only one displayed time changed. */
export function clockTimeElements(state: ClockState, player: Player): Elements {
  const time = formatTime(state.remainingMs[player]);
  const frontFont = time.length > 4 ? "normal" : "large";
  const arenaTime = formatArenaTime(state.remainingMs[player]);
  const tone = playerTone(state, player);
  const center = player === PLAYER_LEFT ? 35 : 107;

  return [
    text("front", `p${player}-time`, time, PANEL_CENTER[player], 8, frontFont, tone, 3),
    text("back", `arena-p${player}-time-shadow`, arenaTime, center + 1, 35, "extra_large", BLACK, 2),
    text("back", `arena-p${player}-time`, arenaTime, center, 34, "extra_large", tone, 3),
  ];
}

function centerElements(
  state: ClockState,
  display: Display,
  visual: ClockVisualState,
): Elements {
  const centerTone =
    state.mode === "editing"
      ? AMBER
      : state.mode === "running" && state.active !== null
        ? playerTone(state, state.active)
        : ACCENT[state.startingPlayer];
  const out: Elements = [
    rectangle(display, "divider", 35, 2, 2, 12, {
      fill: "gradient_v",
      colors: [DIM, centerTone],
      z: 1,
    }),
  ];

  const effect = visual.turnEffect;
  if (effect !== null) {
    const progress = effectProgress(visual.now, effect.startedAt, TURN_EFFECT_DURATION_MS);
    if (progress < 1) {
      const beamX =
        effect.to === PLAYER_LEFT
          ? 30 - Math.round(progress * 26)
          : 36 + Math.round(progress * 26);
      out.push(
        rectangle(display, "turn-beam", beamX, 14, 6, 2, {
          colors: [ACCENT[effect.to]],
          z: 6,
        }),
      );
    }
  }

  return out;
}

function victoryElements(
  state: ClockState,
  display: Display,
  visual: ClockVisualState,
): Elements {
  if (state.winner === null) return [];
  const winner = state.winner;
  const loser: Player = winner === PLAYER_LEFT ? PLAYER_RIGHT : PLAYER_LEFT;
  const phase = Math.floor(visual.now / 250);
  const flash = phase % 2 === 0;
  const winnerName = winner === PLAYER_LEFT ? "LEFT WINS" : "RIGHT WINS";
  const reason = state.finishReason === "checkmate" ? "CHECKMATE" : "TIME OUT";
  const subtitle = phase % 4 < 2 ? winnerName : reason;
  const strong = flash ? ACCENT[winner] : WHITE;
  const out: Elements = [
    rectangle(display, "victory-bg", 0, 0, 72, 16, {
      fill: "gradient_h",
      colors:
        winner === PLAYER_LEFT
          ? [flash ? ACCENT_DARK[winner] : "#103824FF", BLACK]
          : [BLACK, flash ? ACCENT_DARK[winner] : "#103824FF"],
      z: 20,
    }),
    rectangle(display, "victory-frame", 0, 0, 72, 16, {
      fill: "none",
      borderWidth: 1,
      borderColor: strong,
      z: 21,
    }),
    sprite(display, "victory-crown", CROWN, strong, winner === PLAYER_LEFT ? 3 : 62, 2, 23),
    sprite(display, "victory-flag", FLAG, RED, loser === PLAYER_LEFT ? 3 : 64, 7, 23),
    text(display, "victory-title", "WIN", 36, 6, "large", strong, 24),
    text(display, "victory-subtitle", subtitle, 36, 13, "tiny", WHITE, 24),
  ];

  const confetti = [
    [11, 2], [18, 11], [26, 1], [32, 12], [43, 2], [49, 11], [56, 4], [69, 1],
  ];
  for (let index = 0; index < confetti.length; index += 1) {
    const [baseX, baseY] = confetti[index];
    out.push(
      rectangle(display, `confetti-${index}`, baseX, (baseY + phase + index) % 14, 1, 1, {
        colors: [index % 2 === 0 ? ACCENT[winner] : AMBER],
        z: 22,
      }),
    );
  }
  return out;
}

function frontElements(
  state: ClockState,
  visual: ClockVisualState,
): Elements {
  const display: Display = "front";
  if (state.mode === "finished") {
    return victoryElements(state, display, visual);
  }

  return [
    ...playerPanel(state, PLAYER_LEFT, display, visual),
    ...playerPanel(state, PLAYER_RIGHT, display, visual),
    ...centerElements(state, display, visual),
  ];
}

function backPlayerPanel(
  state: ClockState,
  player: Player,
  visual: ClockVisualState,
): Elements {
  const display: Display = "back";
  const x = player === PLAYER_LEFT ? 0 : 72;
  const center = player === PLAYER_LEFT ? 35 : 107;
  const tone = playerTone(state, player);
  const selected = state.mode === "ready" && state.startingPlayer === player;
  const active = state.mode === "running" && state.active === player;
  const highlighted = selected || active || state.mode === "editing";
  const formatted = formatArenaTime(state.remainingMs[player]);
  const animating =
    state.mode === "running" &&
    visual.turnEffect !== null &&
    visual.now - visual.turnEffect.startedAt < TURN_EFFECT_DURATION_MS;
  const energyWidth = animating && pulseOn(visual.now, 200) ? 62 : 55;
  const energyX = player === PLAYER_LEFT ? x + 4 : x + 66 - energyWidth;
  const status =
    state.mode === "editing"
      ? "SET TIME"
      : selected
        ? "FIRST MOVE"
        : active
          ? "THINKING"
          : `MOVES ${state.moves[player]}`;
  const out: Elements = [
    rectangle(display, `arena-p${player}-bg`, x, 0, 70, 80, {
      fill: "gradient_h",
      colors: panelFill(state, player, visual.now),
      z: 0,
    }),
    rectangle(display, `arena-p${player}-frame`, x, 0, 70, 80, {
      fill: "none",
      borderWidth: highlighted ? 2 : 1,
      borderColor: highlighted ? tone : "#22252AFF",
      z: 2,
    }),
    text(
      display,
      `arena-p${player}-name`,
      player === PLAYER_LEFT ? "LEFT" : "RIGHT",
      center,
      9,
      "normal",
      tone,
      3,
    ),
    text(display, `arena-p${player}-time-shadow`, formatted, center + 1, 35, "extra_large", BLACK, 2),
    text(display, `arena-p${player}-time`, formatted, center, 34, "extra_large", tone, 3),
    text(display, `arena-p${player}-status`, status, center, 65, "normal", tone, 3),
  ];
  if (highlighted) {
    out.push(
      rectangle(display, `arena-p${player}-energy`, energyX, 53, energyWidth, 4, {
        colors: [tone],
        z: 3,
      }),
    );
  }
  if (selected) {
    out.push(
      sprite(
        display,
        `arena-p${player}-crown`,
        CROWN_2,
        tone,
        player === PLAYER_LEFT ? 3 : 125,
        3,
        4,
      ),
    );
  }
  return out;
}

function backCenterElements(state: ClockState, visual: ClockVisualState): Elements {
  const display: Display = "back";
  const player = state.active ?? state.startingPlayer;
  const tone = playerTone(state, player);
  const out: Elements = [
    rectangle(display, "arena-divider", 70, 0, 2, 80, {
      fill: "gradient_v",
      colors: [TRANSPARENT, tone],
      z: 2,
    }),
    sprite(display, "arena-bolt", BOLT_2, tone, 68, 34, 5),
  ];

  const effect = visual.turnEffect;
  if (effect !== null) {
    const progress = effectProgress(visual.now, effect.startedAt, TURN_EFFECT_DURATION_MS);
    if (progress < 1) {
      const beamX = effect.to === PLAYER_LEFT
        ? 62 - Math.round(progress * 58)
        : 73 + Math.round(progress * 58);
      out.push(
        rectangle(display, "arena-turn-beam", beamX, 29, 12, 10, {
          fill: "gradient_h",
          colors: [WHITE, ACCENT[effect.to]],
          z: 7,
        }),
      );
    }
  }
  return out;
}

function backIntroElements(state: ClockState, visual: ClockVisualState): Elements {
  if (state.mode !== "ready" || visual.now - visual.launchedAt >= INTRO_DURATION_MS) return [];
  return [
    rectangle("back", "arena-intro-shade", 50, 20, 44, 39, {
      fill: "gradient_h",
      colors: ["#04141BEE", "#23051FEE"],
      borderWidth: 1,
      borderColor: pulseOn(visual.now, 150) ? WHITE : AMBER,
      z: 8,
    }),
    text("back", "arena-intro-vs", "VS", 72, 39, "extra_large", AMBER, 9),
  ];
}

function backFallingKingElements(state: ClockState, visual: ClockVisualState): Elements {
  if (state.winner === null) return [];
  const winner = state.winner;
  const loser: Player = winner === PLAYER_LEFT ? PLAYER_RIGHT : PLAYER_LEFT;
  const progress = effectProgress(visual.now, state.turnStartedAt, KING_FALL_DURATION_MS);
  return [
    sprite(
      "back",
      "arena-falling-king",
      KING_3,
      RED,
      loser === PLAYER_LEFT ? 5 : 122,
      3 + Math.round(progress * 53),
      7,
    ),
    sprite(
      "back",
      "arena-winner-crown",
      CROWN_3,
      GREEN,
      winner === PLAYER_LEFT ? 4 : 117,
      3,
      7,
    ),
  ];
}

function backVictoryElements(state: ClockState, visual: ClockVisualState): Elements {
  if (state.winner === null) return [];
  const winner = state.winner;
  const loser: Player = winner === PLAYER_LEFT ? PLAYER_RIGHT : PLAYER_LEFT;
  const phase = Math.floor(visual.now / 500);
  const flash = phase % 2 === 0;
  const strong = flash ? ACCENT[winner] : WHITE;
  const artTone = ACCENT[winner];
  const winnerName = winner === PLAYER_LEFT ? "LEFT PLAYER WINS" : "RIGHT PLAYER WINS";
  const reason = state.finishReason === "checkmate" ? "CHECKMATE" : "TIME OUT";
  const out: Elements = [
    rectangle("back", "arena-victory-bg", 0, 0, 142, 80, {
      fill: "gradient_h",
      colors:
        winner === PLAYER_LEFT
          ? [flash ? ACCENT_DARK[winner] : "#103824FF", BLACK]
          : [BLACK, flash ? ACCENT_DARK[winner] : "#103824FF"],
      z: 20,
    }),
    rectangle("back", "arena-victory-frame", 0, 0, 142, 80, {
      fill: "none",
      borderWidth: 2,
      borderColor: strong,
      z: 21,
    }),
    text("back", "arena-victory-win-shadow", "WIN", 72, 27, "extra_large", BLACK, 23),
    text("back", "arena-victory-win", "WIN", 71, 26, "extra_large", artTone, 24),
    sprite(
      "back",
      "arena-victory-crown",
      CROWN_3,
      artTone,
      winner === PLAYER_LEFT ? 5 : 116,
      5,
      23,
    ),
    sprite(
      "back",
      "arena-victory-flag",
      FLAG_2,
      RED,
      loser === PLAYER_LEFT ? 6 : 126,
      52,
      23,
    ),
    text("back", "arena-victory-player", winnerName, 71, 55, "normal", WHITE, 24),
    text("back", "arena-victory-reason", reason, 71, 69, "large", strong, 24),
  ];

  const confetti = [
    [18, 8], [27, 61], [49, 3], [61, 70], [82, 5], [96, 65], [112, 11], [136, 56],
  ];
  for (let index = 0; index < confetti.length; index += 1) {
    const [baseX, baseY] = confetti[index];
    out.push(
      rectangle("back", `arena-confetti-${index}`, baseX, (baseY + phase * 2 + index) % 76, 2, 2, {
        colors: [index % 2 === 0 ? strong : AMBER],
        z: 22,
      }),
    );
  }
  return out;
}

function backElements(state: ClockState, visual: ClockVisualState): Elements {
  if (state.mode === "finished") {
    if (visual.now - state.turnStartedAt >= KING_FALL_DURATION_MS) {
      return backVictoryElements(state, visual);
    }
    return [
      ...backPlayerPanel(state, PLAYER_LEFT, visual),
      ...backPlayerPanel(state, PLAYER_RIGHT, visual),
      ...backCenterElements(state, visual),
      ...backFallingKingElements(state, visual),
    ];
  }

  const out: Elements = [
    ...backPlayerPanel(state, PLAYER_LEFT, visual),
    ...backPlayerPanel(state, PLAYER_RIGHT, visual),
    ...backCenterElements(state, visual),
  ];
  if (state.mode === "ready") out.push(...backIntroElements(state, visual));
  return out;
}

export function clockElements(state: ClockState, visual: ClockVisualState): Elements {
  return [
    ...frontElements(state, visual),
    ...backElements(state, visual),
  ];
}
