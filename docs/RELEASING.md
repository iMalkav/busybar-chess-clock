# Releasing

## Prepare a version

1. Set the same `version` in `package.json` and `src/appmeta/manifest.json`.
2. Update `CHANGELOG.md` with a version entry for the changes being released.
3. Review the manifest's `api_version` against the firmware used for device
   testing, particularly when adding API calls.
4. Run `corepack pnpm release`.

The command creates the application directory, the unversioned install package,
`dist/app.busy.chess_clock-<version>.tgz`, `dist/SHA256SUMS` and
`dist/RELEASE_NOTES.md`. It does not publish them.

## Device checks

Record the app, firmware and HTTP API versions with the results.

- Install the versioned archive and launch the app from Apps.
- Check the icons, both displays, time editing and starting-player selection.
- Pass turns, check move counts and compare elapsed time with another clock.
- Check time-pressure cues, sound, time-out and declared-checkmate results.
- Check reset, Back, saved initial time, force-exit and relaunch.

## Publish

Commit and push the release changes, then wait for CI on that commit. Create
an annotated tag using the manifest version, without a `v` prefix. In PowerShell:

```powershell
$version = (Get-Content -Raw src/appmeta/manifest.json | ConvertFrom-Json).version
git tag -a $version -m "Chess Clock $version"
git push origin $version
```

The release workflow checks out the tag, validates the versions, installs from
the frozen lockfile and runs `pnpm release`. A separate job verifies the checksum
and publishes the archive and `SHA256SUMS` to GitHub Releases.

To retry an existing tag, use **Actions → Release → Run workflow** and enter
the tag. A retry replaces the package and checksum assets while preserving
existing release notes. Keep published tags on their original commits.
