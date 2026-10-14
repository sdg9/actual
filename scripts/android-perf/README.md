# Android Chrome performance scripts

Drive real Android Chrome (emulator or USB phone) over the DevTools protocol
and time tap-to-usable-content inside the page. Used for the 2026-10-14
investigation in [docs/performance](../../docs/performance/architecture-options.md).

Use a **private replica**, never the live server: these scripts reload the
app, tap categories, and `freshsw.mjs` clears the service worker and caches.

## Setup

```sh
# Emulator (or a phone with USB debugging; then skip the emulator line)
~/Library/Android/sdk/emulator/emulator -avd <avd> -no-window -no-audio &
adb reverse tcp:5007 tcp:5007            # phone/emulator localhost -> replica
adb shell am start -n com.android.chrome/com.google.android.apps.chrome.Main -d http://localhost:5007/
adb forward tcp:9333 localabstract:chrome_devtools_remote
ACTUAL_PASSWORD_FILE=/path/to/password node login.mjs
```

`localhost` keeps the page a secure context, which Actual needs for
SharedArrayBuffer. Keep only one Chrome tab open; background tabs may be
discarded mid-run.

## Scripts

| Script                                             | Measures                                                                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `profile-cold.mjs [dir]`                           | Reload → budget visible, then first category tap → rows usable. CPU profiles for page and workers unless `NOPROF=1`. |
| `first-category.mjs [reload]`                      | One category tap (optionally after a reload).                                                                        |
| `freshsw.mjs`                                      | Unregisters the service worker, clears caches, reloads: first launch after an update.                                |
| `bench.sh`                                         | Interleaved A/B over builds in `$REPLICA/web-*` (symlink `web-current`).                                             |
| `analyze.mjs dir` / `callers.mjs profile split-ms` | Self/inclusive time; which callers of SQLite `runQuery` were blocked.                                                |
| `idbbulk.mjs`                                      | Read-only: one `getAll` of the budget's IndexedDB file vs individual reads.                                          |

Environment: `ACTUAL_URL` (default `http://localhost:5007`),
`ACTUAL_PERF_CATEGORY` (required: a category name as displayed, possibly
with an emoji), `ACTUAL_PASSWORD_FILE` (required for `login.mjs`), `CDP_URL`/`CDP_WS` (default port 9333), `OUT_DIR`.

Timing starts at the page's own `pointerdown` and ends two animation frames
after the transaction list has rows, no loading indicator and resolved payees.
Profiles and results can contain category names and amounts; keep them out
of git.
