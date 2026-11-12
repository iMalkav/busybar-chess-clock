# Native screenshots

Captured from a physical BUSY Bar on 2026-11-12T12:43:01.817464+00:00.
Firmware: `r1059` (imihajlow/1094-promise-error); HTTP API: `27.15.0`.

- [Front display](../screenshots/front.png): native 72 x 16 PNG.
- [Rear display](../screenshots/back.png): native 160 x 80 PNG.

The screenshots show a five-minute game with sound disabled. The rear display
adds move counts and control hints. Additional native captures of gameplay
and checkmate are in `art/`.

The device framebuffer was read through `/api/screen` and encoded as PNG. No
image generation, resizing or retouching was used for the source PNGs.
Start, turn switching, checkmate, restart, time editing, Back and time-out were
checked on the connected device. Start left the system BUSY timer idle without
any snapshot override. App settings were restored after checking.
