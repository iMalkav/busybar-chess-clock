export type DeviceInputEvent = {
  key?: string;
  action?: string;
  delta?: number;
};

export type InputActions = {
  shortStart(): void;
  longStart(): void;
  toggleEditing(): void;
  rotateEncoder(delta: number): void;
  back(): void;
};

/** Use the firmware's button gestures; raw events must not trigger a second action. */
export function createInputHandler(actions: InputActions): (event: DeviceInputEvent) => void {
  return (event): void => {
    if (event.key === "encoder") {
      const delta = event.delta ?? (event.action === "clockwise" ? 1 : event.action === "counterclockwise" ? -1 : 0);
      if (Number.isFinite(delta) && delta !== 0) actions.rotateEncoder(delta);
    } else if (event.key === "start") {
      if (event.action === "short") actions.shortStart();
      else if (event.action === "long") actions.longStart();
    } else if (event.action === "short") {
      if (event.key === "ok") actions.toggleEditing();
      else if (event.key === "back") actions.back();
    }
  };
}
