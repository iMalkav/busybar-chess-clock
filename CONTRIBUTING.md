# Contributing

Use the Node.js version in [.nvmrc](.nvmrc) and the pnpm version declared in
[package.json](package.json):

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm check
```

CI runs the same checks on Windows and Linux. Add regression tests for changes
to game rules, input or packaging. Host tests use a mocked device API; record
the firmware version when testing on a device.

## Code layout

- `src/clock.ts`: clock rules and state transitions.
- `src/input.ts`: button, encoder and long-press mapping.
- `src/settings.ts`: validation of the firmware settings document.
- `src/appmeta/settings.json`: settings shown by the firmware UI.
- `src/visuals.ts`: animation timing and time-pressure state.
- `src/screens/clock.ts`: display composition.
- `src/main.ts`: lifecycle, persistence and display updates.
- `shared/`: HTTP client, font metrics and layout helpers.
- `scripts/`: resource preparation, metadata validation and release packaging.

Commit `pnpm-lock.yaml` with dependency changes. Generated builds, installed
dependencies and local settings are excluded by `.gitignore`.

The app reads its settings through `GET /api/apps/settings` with its own app ID.
Schema defaults are shared with the parser. If loading fails, the app uses the
legacy locally saved time and default player/sound settings. In-app setup
shortcuts are temporary when firmware settings are available.

For asset changes, update [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) with
the source and license. Original WAV files are in `art/sounds/`; regenerate the
committed device sounds with `python scripts/convert_sounds.py`. Python is only
needed for this conversion.

See [docs/RELEASING.md](docs/RELEASING.md) for the release process.
