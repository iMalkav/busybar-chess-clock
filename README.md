# Chess Clock for BUSY Bar

<img src="src/appmeta/icon_front_8x8.png" width="64" height="64" alt="Chess Clock icon">

A two-player chess clock for [BUSY Bar](https://busy.bar), written in TypeScript
and installed as a JavaScript application.

- Both players' clocks on the front and rear displays.
- Selectable starting player and initial time from 1 to 60 minutes.
- One-button turn switching and move counts.
- Sound and color cues for turn changes, time pressure and game results.
- Initial time saved between launches.

## Install

Download the `.tgz` package from [Releases](../../releases) and follow
[INSTALL.md](INSTALL.md).

The minimum firmware HTTP API version is specified by `api_version` in
[src/appmeta/manifest.json](src/appmeta/manifest.json).

## Controls

| Input | Before the game | During the game | After the result |
| --- | --- | --- | --- |
| Short Start | Start the selected player's clock | Pass the turn | — |
| Hold Start for at least 1 second, then release | — | Declare checkmate; the active player wins | Reset with the same setup |
| OK | Enter or confirm time editing | — | — |
| Encoder | Select the first player; while editing, change both clocks by 1 minute | — | — |
| Back | Exit; while editing, return to the start screen | Reset and return to the start screen | Return to the start screen |

The initial time is set before play. Tenths of a second appear below one minute
on the front display and during the last ten seconds on the rear display.
Checkmate is declared by a player through the Start button.

## Development

Use the Node.js version in [.nvmrc](.nvmrc) and the pnpm version in
[package.json](package.json). With Node.js selected:

```sh
git clone https://github.com/iMalkav/busybar-chess-clock.git
cd busybar-chess-clock
corepack pnpm install --frozen-lockfile
corepack pnpm check
```

If the specified pnpm version is installed directly, the `corepack` prefix can
be omitted.

| Command | Result |
| --- | --- |
| `pnpm metadata` | Validate manifest and package versions |
| `pnpm typecheck` | Type-check app, helpers and tests |
| `pnpm test` | Run clock, input, visual-state and metadata tests |
| `pnpm build` | Build the application directory and `.tgz` package |
| `pnpm smoke` | Check the built package and startup/exit with a mocked API |
| `pnpm check` | Run validation, tests, build and smoke check |
| `pnpm release` | Prepare a versioned archive, checksum and release notes locally |
| `pnpm app:install` / `pnpm app:run` | Install the built package / launch it |
| `pnpm app:stop` / `pnpm app:uninstall` | Stop / uninstall the app |

The build uses `@busy-app/cli` to create `dist/app.busy.chess_clock/` and
`dist/app.busy.chess_clock.tgz`, including scripts, icons, sounds and licenses.
`pnpm build --no-minify` produces readable JavaScript for debugging.

The application calls its device's API through `localhost`. To select a device
for installation or control, pass `--addr <host>` to an `app:` command.

Timing uses `Date.now()` with a 250 ms update interval. Host tests use a mocked
device API; physical device checks are listed in the
[release guide](docs/RELEASING.md).

## Releases and contributing

CI runs on Windows and Linux for pull requests and pushes to `main`. A version
tag matching the package and manifest versions triggers a GitHub release with
`app.busy.chess_clock-<version>.tgz` and `SHA256SUMS`. Tags use the manifest
version without a `v` prefix.

See [CONTRIBUTING.md](CONTRIBUTING.md), [docs/RELEASING.md](docs/RELEASING.md)
and [CHANGELOG.md](CHANGELOG.md).

## License

Application code: [MIT](LICENSE). Sound effects retain CC-BY-SA-4.0 and font
metrics retain OFL-1.1. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
