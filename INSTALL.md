# Install Chess Clock

The device must support JavaScript applications and the HTTP API version
declared in [src/appmeta/manifest.json](src/appmeta/manifest.json). For the
commands below, use the Node.js version in [.nvmrc](.nvmrc) and pnpm from
[package.json](package.json).

## From a release

Download the `.tgz` package and `SHA256SUMS` from the same
[release](../../releases). Replace `<version>` in the commands below with the
downloaded release version.

On Linux, verify the download with `sha256sum --check SHA256SUMS`. In PowerShell,
compare the following output with the checksum in `SHA256SUMS`:

```powershell
Get-FileHash "./app.busy.chess_clock-<version>.tgz" -Algorithm SHA256
```

With the BUSY Bar connected over USB, run from the download directory:

```sh
pnpm dlx @busy-app/cli app install "./app.busy.chess_clock-<version>.tgz"
pnpm dlx @busy-app/cli app run app.busy.chess_clock
```

The installed app can also be launched from **Apps → Chess Clock**.

## From source

From the project directory:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm app:install
corepack pnpm app:run
```

These commands use the CLI version pinned in `package.json`. Installation reads
`dist/app.busy.chess_clock.tgz`; run the build or checks first.

## Connection options

USB defaults to `10.0.4.20`. Pass `--addr <host>` to use another address. Over
Wi-Fi, enable HTTP API access in the device settings. If password protection is
enabled, also pass `--password <password>`.

```sh
pnpm app:install --addr <host>
pnpm app:run --addr <host>
```

The `--addr` option on these commands selects the device for installation or
control. The installed application uses `localhost` for its API requests.

## Troubleshooting

For an API-version mismatch, compare the device's HTTP API version with
`api_version` in the manifest. If installation succeeds but the app is not
listed, close and reopen Apps.

When reporting a problem, include the app, firmware and HTTP API versions,
reproduction steps and relevant logs.
