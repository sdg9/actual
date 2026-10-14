# Household mobile performance, 2026-10-14

Target: usable content within 1–2 seconds after a tap in Android Chrome.

## Root cause of the Android first-use delay (second pass)

The earlier desktop and CPU-throttled runs could not reproduce the ~17-second
first opening of Tithing. Real Android Chrome could: an Android 15 emulator
(Chrome 124, 4 cores, 2 GB) against a private replica of the Mini server
(latest backup data, exact production bundle `a6bcc9fc5`) took 18–21 s to show
the budget after a reload and 8–11 s for the first Tithing tap; the second tap
took 0.5 s.

CPU profiles of the page and both workers showed the main thread idle 88% of
the time. The loot-core worker spent ~21 s blocked inside SQLite reads waiting
for absurd-sql's IndexedDB helper: every uncached 4 KB page costs a synchronous
`Atomics.wait` handshake (about five cross-thread wake-ups) plus an IndexedDB
`get`. On cold start `loadSpreadsheet` reads the whole `kvcache` table (161,671
cells, ~25 MB of the 42 MB local file): 12.3 s. The first category screen then
spent 5.3 s in transaction queries and 2.0 s in other queries, mostly fetching
pages one by one. That is why the first visit after an update, or after Android
discards the tab, is slow and later visits are fast (SQLite's page cache is
warm). Desktop IndexedDB is fast enough to hide this.

A single IndexedDB `getAll` read the entire 42 MB file in ~0.3 s on the same
emulator, so the cost was the per-block protocol, not storage throughput.

## Fix

`openDatabase` now reads all of the budget file's blocks with one `getAll`
before SQLite opens it and serves each block to SQLite once
(`loot-core/src/platform/server/sqlite/blockPrefetch.ts`). Correctness rules:

- Block 0 (header) always comes from IndexedDB. If its change counter differs
  from the snapshot (another tab or connection wrote), the prefetch is dropped.
- Blocks written by this connection are evicted; truncation, page-size change
  and deletion drop everything; unused blocks are released after 5 minutes;
  files over 96 MB are not prefetched.
- The read transaction is committed and awaited before SQLite opens. Without
  that, the transaction stays open while the worker blocks synchronously and
  absurd-sql's first write lock deadlocks (found during testing: the app hung
  on "Loading…").

SQLite, sync, storage format and offline behaviour are unchanged.

## Results (Android emulator, interleaved A/B, 5 rounds)

| Measurement                                     |                        `a6bcc9fc5` median (range) | New build median (range) |
| ----------------------------------------------- | ------------------------------------------------: | -----------------------: |
| Cold launch, local budget, reload → budget      |                                15.1 s (11.5–20.2) |      **5.4 s** (5.1–5.8) |
| First Tithing tap after cold launch             |                                   7.5 s (4.4–8.9) |   **0.60 s** (0.53–0.81) |
| Warm repeat Tithing tap                         |                                0.58 s (0.53–0.76) |   **0.34 s** (0.31–0.47) |
| First launch after update (SW + caches cleared) | 20.7 s (14.9–21.1), 2 of 5 no budget within 400 s |     **8.4 s** (6.8–11.9) |

Raw nonfinancial timings: [android-results-20261014.json](android-results-20261014.json).
Profiles after the fix: the worker's IndexedDB wait fell from ~21 s to ~0.6 s;
the remaining cold launch is JS/wasm startup, the ~1 s bulk read and building
the 161k-cell spreadsheet.

Limits: an emulator on an M3 host is not Steven's phone. Absolute times differ
between sessions (earlier single runs: 18–21 s / 8–11 s before, 3.7–4.4 s /
0.6–0.8 s after). "Update" loads fetch every asset through the slow
`adb reverse` tunnel, not Cloudflare. The two stalled update loads on the old
build were not diagnosed. Cold launch (~5 s) still misses the 1–2 s target;
first-use and repeat taps meet it. Background bank sync was not active on the
replica (SimpleFIN was linked on the Mini later the same day).

Scripts: [`scripts/android-perf`](../../scripts/android-perf/README.md).
Architecture comparison: [architecture-options.md](architecture-options.md).

## Earlier follow-up: reported Android first-use delay

After deployment Steven observed roughly 17 seconds opening October 2026 Tithing, then much faster subsequent visits and other interactions. The original interaction sequence opened two menus before category transactions; it therefore did not establish first-use responsiveness. The Android target remains **unverified**.

The harness now opens a category as its first interaction after each reload, waits for transaction rows and payee lookup completion, and includes those samples in the 2-second threshold. Set `ACTUAL_PERF_REPEATS=0` to run only these reload/first-tap cases; `ACTUAL_PERF_CATEGORY` optionally chooses the category by its exact displayed name. `ACTUAL_PERF_NETWORK_KBPS` adds throughput throttling and 150 ms latency after the private import. This remains a serverless copy with service workers blocked, not a reproduction of live bank sync or a PWA update. Local static serving is uncompressed, unlike a potentially compressed production response.

Six exploratory local first-tap samples (warm/uncached assets respectively) measured 133/163 ms at 1×, 336/268 ms at 4×, and 443/467 ms at 6×. A separate live Mini reload via localhost automatically clicked Tithing as soon as its button appeared: click at 2,412 ms after navigation, two rows with loading indicator gone at 3,411 ms. Transaction and payee query completion took roughly 51/58 ms after starting. Those query timings include scheduling and transport, not just SQL. No financial data was edited. These results do not explain the phone's 17-second wait, and no speculative application change was deployed.

An exploratory 1.6 Mbps / 150 ms latency run at 4× CPU opened Tithing in under 0.4 seconds after the tap in both cache modes. The uncompressed local app reload itself took about 66 seconds. This distinguishes slow asset delivery before the budget appears from the reported delay after tapping; it is not a production-network measurement. The initial attempt exceeded the harness's old 20-second navigation timeout; reloads now allow 120 seconds and wait for DOM readiness, followed by budget readiness.

Final harness verification passed all 12 taps at 4× CPU (ten standard interactions plus two cold-first Tithing openings); Tithing measured 203/227 ms. Root typecheck and changed-file formatting/type-aware lint passed. No application source changed in this follow-up.

## Method

The opt-in `packages/desktop-client/e2e/household-performance.test.ts` imports a private Actual export into a new serverless browser context. The export contains 22,031 transactions, 102 accounts, and 136 months since 2015. It does not connect to the household server or change live financial records. Private exports, CPU profiles, and detailed result JSON stay outside git.

The reference environment is an Apple M3 Pro MacBook, Chromium, a 393×851 touch/mobile viewport, and 1× / 4× CPU throttling. The production bundle is served locally with the same cross-origin isolation headers required by Actual. Five samples cover each of ten interactions at each CPU rate. Playwright's test user agent is used, animations remain enabled, and service workers are blocked to make build comparisons reproducible.

Timing begins at the browser's captured click event. The harness waits for the target content, a changed month for month navigation, loaded transaction rows for transaction screens, then two animation frames. This is **automation click-to-settled latency**, including automation round trips, rather than INP or a measurement on Steven's Android phone. Query durations also include main-thread scheduling delays and cannot be interpreted as SQL execution times. CPU throttling does not fully reproduce a phone or guarantee equivalent worker slowdown.

Reload timing runs from navigation start to the rendered budget plus two frames. Both warm HTTP cache and disabled HTTP cache are tested, with the budget already stored on the device. These are not first-ever downloads from the Mini or measurements over mobile Internet. Login, first import, bank-provider authentication, and bank sync have external work outside the tap-to-content target.

## Diagnosis and architecture decision

Budget rendering dominates the measured slow interactions. The original 4× CPU results show roughly one second of main-thread work when returning to the budget and switching months; category transaction views are much faster. The CPU profile shows React rendering/commit work, collection construction, and financial formatting. No evidence from these measurements justifies replacing local-first storage with a server database: doing so would add network latency without eliminating the measured render work.

The changes preserve SQLite, synchronization, offline storage, and financial calculations:

- Downloaded responsive screen modules are reused synchronously instead of entering a loader on every visit. Only code is cached.
- International number formatters are reused by number format and precision in a bounded cache. Formatted amounts are not cached.
- Spreadsheet cells read already-prewarmed values during initial render and month changes, avoiding a blank/stale commit followed by synchronous correction. Existing worker reads, subscription updates and cleanup remain active.
  Automatic text sizing retains its existing remount behavior. A browser check showed that reusing nodes could leave smaller amounts at the shrunken font size after a large amount; that optimization was rejected before deployment.

## Reproduce

Run from the repository root, against a production static preview:

```sh
ACTUAL_PERF_FIXTURE=/private/path/to/actual-export.zip \
ACTUAL_PERF_OUTPUT=/tmp/actual-performance.json \
E2E_START_URL=http://localhost:3002 \
yarn workspace @actual-app/web e2e household-performance.test.ts --workers=1 --retries=0
```

Set `ACTUAL_PERF_PROFILE=/tmp/actual-month.cpuprofile` to collect the latest profiled 4× previous-month sample. Profile runs are diagnostic; use unprofiled runs for before/after latency comparisons. Do not run builds or other heavy tests concurrently with benchmarks.

## Results and verification

| Interaction            | Before, 4× median | After, 4× median | After, 6× maximum |
| ---------------------- | ----------------: | ---------------: | ----------------: |
| category-menu          |            209 ms |           215 ms |            356 ms |
| budget-menu            |            163 ms |           191 ms |            290 ms |
| category-transactions  |            166 ms |           158 ms |            260 ms |
| transaction-editor     |            124 ms |           129 ms |            261 ms |
| return-category-budget |           1003 ms |           773 ms |           1204 ms |
| previous-month         |           1157 ms |          1117 ms |           1812 ms |
| next-month             |           1064 ms |          1159 ms |           1827 ms |
| accounts               |            161 ms |           173 ms |            308 ms |
| all-transactions       |            184 ms |           193 ms |            336 ms |
| return-budget          |            950 ms |           765 ms |           1154 ms |
| warm-reload            |           2244 ms |          1927 ms |           2683 ms |
| uncached-assets-reload |           2246 ms |          2018 ms |           2695 ms |

All **150 in-app tap samples passed the 2,000 ms threshold**, including 50 at 6× CPU throttling. The slowest tap was 1,827 ms. Returning to the budget improved about 20–25% against the repeated baseline. Month switching remains around one second at 4× and did not improve consistently between runs; small differences in either direction should not be treated as reliable regressions or speedups with only five samples. An earlier original-build run measured 1,192/1,215 ms for previous/next month, illustrating that variation.

Reloads have one sample per cache condition per CPU rate and are exploratory. They are not included in the 2-second tap assertion: the heavier 6× run still needs about 2.7 seconds to start. The first-ever download and actual Android hardware remain unmeasured. This is evidence of a bounded improvement, not a guarantee for every phone/network.

Aggregate, nonfinancial evidence is retained in [mobile-results.json](mobile-results.json). Detailed private runs remain under `/tmp/actual-perf-*` locally. Use `ACTUAL_PERF_CPU_RATES=1,4,6 ACTUAL_PERF_MAX_CLICK_MS=2000` to repeat the delivery stress test.

Verification includes root typecheck, production build, type-aware lint of changed TypeScript, 38 core utility tests, and 7 loader/spreadsheet tests. The latter cover cached and uncached reads, zero balances, month transitions, fresh worker results, and older responses losing to newer change events. Mobile and desktop budget workflow verification and installed release are recorded in [STATUS.md](STATUS.md).

## Delivery

Deployed source `a6bcc9fc5` as `actual-household-ui:a6bcc9fc5` on the Mac Mini. A separate empty-data container passed health, index and release-metadata checks before deployment. The live data/Compose archive `actual-20261014T054942Z.tar.gz` was verified before changing the image; the previous image and `compose.pre-perf-a6bcc9fc5.yaml` remain available.

After deployment the browser activated the new service worker/bundle, rendered the live household's 85 category rows, switched September→October, and completed the normal sync command with no error. Health reports UP and release metadata reports the expected revision. Live verification used the local SSH-forwarded endpoint; unauthenticated public HTTPS still redirects to Cloudflare Access. No manual live transactions or assignments were changed.

The final source passed all 48 mobile/desktop budget workflow tests. The final local browser visual check confirmed that an extreme amount shrinks to fit and returning to a small amount restores the 12 px font. Existing PWA clients must activate **Update now** or reload; clearing browser storage is unnecessary.
