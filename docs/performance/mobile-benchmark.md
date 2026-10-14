# Household mobile performance, 2026-10-14

Target: usable content within 1–2 seconds after a tap in Android Chrome.

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
