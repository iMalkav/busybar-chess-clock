# Changelog

## 0.4.0

- Calmer front and rear layouts, visible control hints and matching clock precision.
- Original shaded rook menu icons with a monochrome rear icon.
- Use busy-lib HTTP and layout helpers; remove unused scaffold copies and animations.
- Short Start resets a finished game; buttons use native short/long-press events.
- Keep the JS runtime alive until display cleanup completes on exit.
- Remove the legacy system BUSY timer override.
- Patch busy-lib's disabled HTTP time-outs to preserve native clock intervals.
- Changed the application ID to `ru.malk-it.chess_clock`.

## 0.3.0

- Native app settings for initial time, starting player and sound.
- In-app setup shortcuts apply to the current launch; saved settings load at startup.
- Corrected the minimum HTTP API requirement to match the endpoints used.

## 0.2.0

- Two-player clock with selectable starting player and 1–60 minute initial time.
- Turn switching, move counts, declared checkmate and time-out.
- Front and rear display layouts with sound and color cues.
- Saved initial time between launches.
- Application packaging, automated checks and tag-based releases.
