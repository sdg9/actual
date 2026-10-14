---
project: Actual household mobile performance
state: active
milestone: Android first-use stall fixed by database block prefetch; deployed
updated: 2026-10-14
verify: ssh mini 'curl -fsS http://127.0.0.1:5006/household-build.json'
---

## Implemented

- Prefetch the budget's IndexedDB blocks before SQLite opens (absurd-sql stall).
- Earlier: route-module reuse, bounded number formatters, prewarmed cells.

## Verified

- Root cause on Android Chrome (emulator, private replica): ~21 s worker wait on per-block IndexedDB reads.
- Interleaved A/B medians: cold launch 15.1 → 5.4 s; first Tithing tap 7.5 → 0.60 s; warm tap 0.58 → 0.34 s.
- Typecheck, lint, 7 prefetch unit tests, 1,293 core tests (2 unrelated charset failures pre-exist).
- Deadlock found and fixed during testing; desktop and Android loads verified after fix.

## Delivered

- Mini: `actual-household-ui:b4efb1327`, source `b4efb1327`, server 26.10.0.
- Backup `actual-20261014T151257Z.tar.gz`; rollback `compose.pre-ui-b4efb1327.yaml`.
- Details: [benchmark](mobile-benchmark.md), [options](architecture-options.md).

## Next actions

- Measure the real phone (USB `chrome://inspect` or `scripts/android-perf`).
- If cold launch is still slow there: profile wasm/JS startup and spreadsheet restore.

## Needs Steven

- none

## Limits

- Emulator on an M3 host, not the phone; cold launch ~5 s misses the 1–2 s target.
- Bank sync was not active on the replica; update loads used the adb tunnel.
