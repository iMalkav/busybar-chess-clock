import { BusyBar } from "@busy-app/busy-lib";

// The native runtime has no abort support; HTTP calls stay on the device.
export const device = new BusyBar({ addr: __BUSY_ADDR__, timeout: 0 });
