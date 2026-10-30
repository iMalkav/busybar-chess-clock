# Third-party notices

The Chess Clock application code is licensed under [MIT](LICENSE). Third-party
material retains the licenses below; the MIT license does not replace them.
The build includes these notices and license texts in the installable package.

## BUSY App development tooling and scaffolding

The project uses the JavaScript application conventions and shared platform
helpers from [BUSY App tooling](https://github.com/busy-app/busy-tools).
Copyright (c) 2026 BUSY App. MIT; see [LICENSES/BUSY-App-MIT.txt](LICENSES/BUSY-App-MIT.txt).
The npm dependencies retain their own package licenses and are recorded in
`pnpm-lock.yaml`. The application uses `@busy-app/busy-lib` for TypeScript types;
its HTTP client is not bundled into the application.

## Device font metrics

`shared/fontMaps/*.json` contains metrics derived from the BUSY Bar device fonts,
not bundled font images. The BUSY font family derives from Ark Pixel Font:
copyright 2021 TakWolf (https://ark-pixel-font.takwolf.com/) and 2024–2026 Flipper
FZCO. `global.json` describes LanaPixel: copyright 2020–2023 eishiya
(https://mastodon.art/@eishiya).

These files retain OFL-1.1; see [LICENSES/OFL-1.1.txt](LICENSES/OFL-1.1.txt).
The firmware supplies the actual fonts at runtime.

## Sound effects

The original files in `art/sounds/` come from
[`assets/sounds/busy/` in BUSY Bar firmware](https://github.com/busy-app/busybar-firmware/tree/dev/assets/sounds/busy):
`countdown_tick.wav`, `countdown_finish.wav`, and `session_completed.wav`.
Copyright 2024–2026 Flipper FZCO. The firmware's `REUSE.toml` assigns
CC-BY-SA-4.0 to `assets/sounds/**`.

`src/sounds/*.snd` contains the same audio samples, extracted from the WAV
containers as mono signed 16-bit little-endian PCM at 44100 Hz. No artistic
changes were made. Both original and converted audio retain CC-BY-SA-4.0;
see [LICENSES/CC-BY-SA-4.0.txt](LICENSES/CC-BY-SA-4.0.txt).

The license attribution follows the firmware's explicit per-file rules in
[`REUSE.toml`](https://github.com/busy-app/busybar-firmware/blob/dev/REUSE.toml).
