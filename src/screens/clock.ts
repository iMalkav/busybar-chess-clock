import { column, render, row, type DisplayDrawParams, type Node } from "@busy-app/busy-lib";
import { formatTime, type ClockState, type Player } from "../clock.ts";

type Elements = NonNullable<DisplayDrawParams["elements"]>;

const WHITE = "#FFFFFFFF";
const DIM = "#888888FF";
const BLUE = "#60C8FFFF";
const AMBER = "#FFD166FF";
const RED = "#FF5364FF";
const GREEN = "#7CE6A0FF";
const CLEAR = "#000000FF";
const PLAYERS = [0, 1] as const;
const NAMES = ["Left", "Right"] as const;

function selectedPlayer(state: ClockState): Player | null {
  if (state.mode === "ready") return state.startingPlayer;
  if (state.mode === "running") return state.active;
  if (state.mode === "finished") return state.winner;
  return null;
}

function indicatorColor(state: ClockState, player: Player): string {
  if (state.mode === "editing") return AMBER;
  if (selectedPlayer(state) !== player) return CLEAR;
  if (state.mode === "finished") return GREEN;
  if (state.mode !== "running") return BLUE;
  const remaining = state.remainingMs[player];
  return remaining <= 10_000 ? RED : remaining <= 60_000 ? AMBER : BLUE;
}

function status(state: ClockState, player: Player): string {
  if (state.mode === "editing") return "SET TIME";
  if (state.mode === "finished") return state.winner === player ? "WINNER" : state.finishReason === "timeout" ? "TIME OUT" : "MATE";
  if (state.mode === "running") return state.active === player ? "THINKING" : "WAITING";
  return state.startingPlayer === player ? "FIRST MOVE" : "READY";
}

function frontHint(state: ClockState): string {
  if (state.mode === "editing") return "OK TO SAVE";
  if (state.mode === "ready") return "START TO PLAY";
  if (state.mode === "finished") return `${NAMES[state.winner ?? 0]} wins`.toUpperCase();
  return `${NAMES[state.active ?? 0]} turn`.toUpperCase();
}

function backHint(state: ClockState): string {
  if (state.mode === "editing") return "Wheel: time  OK: save";
  if (state.mode === "ready") return "Start: play  OK: time";
  if (state.mode === "finished") return "Start: new game";
  return "Hold Start: mate";
}

function frontElements(state: ClockState): Elements {
  const clocks = row({ width: 70, height: 7, gap: 4 }, PLAYERS.map((player) =>
    column({ width: 33, height: 7, align: "center" }, [{
      type: "text", id: `front-p${player}-time`,
      text: formatTime(state.remainingMs[player]), font: "bold", color: WHITE,
    }]),
  ));
  const layout = column({
    width: 72, height: 16, padding: 1, gap: 3, align: "center",
  }, [
    clocks,
    { type: "text", id: "front-hint", text: frontHint(state), font: "tiny", color: WHITE },
  ]);
  return [
    ...render(layout),
    ...PLAYERS.map((player) => ({
      type: "rectangle" as const, id: `front-p${player}-indicator`, display: "front" as const,
      x: player === 0 ? 6 : 43, y: 9, width: 23, height: 1,
      fill: "solid" as const, fill_colors: [indicatorColor(state, player)], border_width: 0, z_index: 1,
    })),
  ];
}

function backPanel(state: ClockState, player: Player): Node {
  return column({ width: 64, height: 54, align: "center", justify: "between" }, [
    { type: "text", id: `back-p${player}-name`, text: NAMES[player].toUpperCase(), font: "small", color: DIM },
    { type: "text", id: `back-p${player}-time`, text: formatTime(state.remainingMs[player]), font: "extra_large", color: WHITE },
    { type: "text", id: `back-p${player}-status`, text: status(state, player), font: "small", color: WHITE },
    { type: "text", id: `back-p${player}-moves`, text: `MOVES ${state.moves[player]}`, font: "small", color: DIM },
  ]);
}

function backElements(state: ClockState): Elements {
  // The firmware's navigation bar occupies the rightmost 18 pixels.
  const layout = column({
    width: 140, height: 80, padding: 4, justify: "between", align: "center",
  }, [
    row({ width: 132, height: 54, gap: 4 }, PLAYERS.map((player) => backPanel(state, player))),
    { type: "text", id: "back-hint", text: backHint(state), font: "small", color: WHITE },
  ]);
  return [
    ...render(layout, { display: "back" }),
    ...PLAYERS.map((player) => ({
      type: "rectangle" as const, id: `back-p${player}-indicator`, display: "back" as const,
      x: player === 0 ? 4 : 72, y: 62, width: 64, height: 2,
      fill: "solid" as const, fill_colors: [indicatorColor(state, player)], border_width: 0, z_index: 1,
    })),
  ];
}

export function clockElements(state: ClockState): Elements {
  return [...frontElements(state), ...backElements(state)].map((element) => ({
    ...element, z_index: element.z_index ?? 0,
  }));
}
