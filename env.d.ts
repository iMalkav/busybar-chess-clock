/** Set by busy-cli; release packages connect to the BUSY Bar itself. */
declare const __BUSY_ADDR__: string;

type BusyInputEvent = {
  key: "encoder" | "start" | "ok" | "back";
  action: "clockwise" | "counterclockwise" | "press" | "release";
  delta?: number;
};

/** Registers the single native input listener and returns its unbind function. */
declare function listen(type: "input", handler: (event: BusyInputEvent) => void): () => void;

declare module "*.anim" {
  const src: string;
  export default src;
}

declare module "virtual:font-maps" {
  export const MAPS: { fonts: Record<string, unknown> }[];
}
