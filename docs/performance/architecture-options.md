# Web, native shell or native client? 2026-10-14

## What the app is built with

| Layer         | Implementation                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI            | React 19 function components, Emotion CSS, react-aria components; Vite bundle with lazy route chunks                                                                                       |
| Routing       | react-router 8 (`BrowserRouter`); mobile/desktop variants via `NarrowAlternate`                                                                                                            |
| State         | Redux Toolkit (app, modal stack, prefs) plus TanStack Query (queries, mutations)                                                                                                           |
| Data          | loot-core "backend" in a dedicated Web Worker (plain Worker on Android/iOS, SharedWorker leader/follower on desktop)                                                                       |
| Database      | sql.js (SQLite compiled to WebAssembly) over absurd-sql, which stores 4 KB file blocks in IndexedDB and fetches misses through a synchronous `Atomics.wait` handshake with a helper worker |
| Budget engine | In-memory spreadsheet of cells, restored from a `kvcache` table on launch (161,671 cells for the household budget)                                                                         |
| Sync          | CRDT messages to the self-hosted sync server; client-driven sync shortly after load and on visibility change                                                                               |
| PWA           | vite-plugin-pwa (Workbox `generateSW`): ~151 precached files (~17.6 MB uncompressed), `registerType: prompt`, "Update now" applies the waiting worker                                      |

## What the measurements say

On Android Chrome (emulator) the reported slowness was **not** React, layout,
animation or network. The backend worker spent ~21 s of a 26 s cold launch
plus first category tap blocked in absurd-sql IndexedDB block reads, while the
main thread was idle 88% of the time. React render work was ~1.7 s in total.
Asset download was not involved in the first-category delay. See
[mobile-benchmark.md](mobile-benchmark.md).

That is an **implementation problem in the storage adapter**, not a limit of
the web platform: a single IndexedDB `getAll` reads the entire 42 MB file in
~0.3 s on the same emulator. Prefetching blocks (implemented) removes most of
it while keeping SQLite, sync and offline behaviour intact.

## Options

| Option                                                                                                         | Solves                                                                   | Does not solve                                                                                                        | Sharing                                                                           | Cost / risk                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Improve the existing PWA** (chosen)                                                                          | The measured storage stall; targeted UI/navigation problems              | Startup CPU for JS/wasm parse and the 161k-cell spreadsheet restore (~2–4 s cold on the emulator)                     | 100%                                                                              | Small, reversible patches; rebase onto upstream releases                                                                              |
| **Targeted replacement of data access**: official SQLite wasm with OPFS (`opfs-sahpool`) instead of absurd-sql | Removes the per-block IndexedDB handshake entirely; faster writes        | Spreadsheet restore and JS startup; needs a one-time data migration in every browser                                  | Same loot-core                                                                    | Medium: storage migration, Safari/iOS differences, upstream divergence. Worth revisiting if prefetch proves insufficient on the phone |
| **Native shell** (Capacitor/TWA/Electron-style WebView)                                                        | Home-screen presence, Android back button integration, no browser chrome | The stall (same WebView + same storage code); WebView storage can be _worse_ than Chrome's                            | 100% web code                                                                     | Low-medium; adds app packaging/signing and a second update channel                                                                    |
| **React Native / native client** sharing loot-core                                                             | Native SQLite file I/O, native navigation and gestures                   | Nothing measured that the PWA can't fix; would need loot-core's platform layer, spreadsheet and sync ported/validated | Business logic partially (loot-core is TypeScript but assumes web workers/sql.js) | High: months of work, a separate UI codebase, financial-correctness re-verification, and permanent divergence from upstream Actual    |

## Recommendation

Keep the web/PWA implementation. The evidence points to one storage
bottleneck (fixed) and a handful of navigation problems (fixed), not to the
framework. Do not start a rewrite.

Next steps in order, each only if the phone still shows a problem:

1. Capture one trace from the real phone (below). If cold launch is still
   above ~3 s, profile whether it is JS/wasm parse or spreadsheet restore.
2. Reduce spreadsheet restore cost (e.g. load only months near the viewed
   month) — engine work that needs careful correctness tests.
3. Evaluate OPFS-backed SQLite as a targeted data-layer replacement.

A native shell is only worth it for packaging/integration reasons; it would
not make budget data faster.

## Capturing a trace from the Android phone

1. Phone: Settings → About phone → tap Build number 7× → Developer options →
   USB debugging on. Connect by USB and accept the prompt.
2. Mac: Chrome → `chrome://inspect/#devices` → the budget tab → **inspect**.
3. In DevTools Performance, leave "Screenshots" off (they would show
   balances), record, then on the phone reload the app and tap a category.
   Stop and save the trace locally; share timings, not the file.
4. Alternatively, with the phone visible in `adb devices`, the scripts in
   [`scripts/android-perf`](../../scripts/android-perf/README.md) measure cold
   launch and first category taps the same way as on the emulator.
