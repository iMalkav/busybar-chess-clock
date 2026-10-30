export type DeviceInputEvent = {
  key?: "start" | "ok" | "back" | "encoder" | string;
  action?: "press" | "release" | "clockwise" | "counterclockwise" | string;
  delta?: number;
};

export type InputActions = {
  shortStart(): void;
  longStart(): void;
  toggleEditing(): void;
  rotateEncoder(delta: number): void;
  back(): void;
};

export type InputHandlerOptions = {
  now?: () => number;
  longPressMs?: number;
};

export const DEFAULT_LONG_PRESS_MS = 1_000;

/**
 * Start is the single game button: a short press passes the turn, while a long
 * press declares checkmate. OK toggles time editing. The encoder selects the
 * starting player on the ready screen and changes time while editing.
 */
export function createInputHandler(
  actions: InputActions,
  options: InputHandlerOptions = {},
): (event: DeviceInputEvent) => void {
  const now = options.now ?? Date.now;
  const longPressMs = options.longPressMs ?? DEFAULT_LONG_PRESS_MS;
  let startPressedAt: number | null = null;

  return (event: DeviceInputEvent): void => {
    if (event.key === "back") {
      if (event.action === "press") actions.back();
      return;
    }

    if (event.key === "encoder") {
      const delta = event.delta ?? (event.action === "clockwise" ? 1 : -1);
      if (delta !== 0) actions.rotateEncoder(delta);
      return;
    }

    if (event.key === "ok") {
      if (event.action === "release") actions.toggleEditing();
      return;
    }

    if (event.key !== "start") return;

    if (event.action === "press") {
      if (startPressedAt === null) startPressedAt = now();
      return;
    }

    if (event.action !== "release" || startPressedAt === null) return;

    const heldFor = Math.max(0, now() - startPressedAt);
    startPressedAt = null;
    if (heldFor >= longPressMs) actions.longStart();
    else actions.shortStart();
  };
}
