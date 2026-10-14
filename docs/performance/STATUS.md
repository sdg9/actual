---
project: Actual household mobile performance
state: active
milestone: Android first-use stall fixed; first budget screen renders before the rest
updated: 2026-10-14
verify: ssh mini 'curl -fsS http://127.0.0.1:5006/household-build.json'
---

## Implemented

- Prefetch the budget's IndexedDB blocks before SQLite opens (absurd-sql stall).
- Mount the first screen of budget rows first, the rest in a transition.

## Verified

- Root cause on Android Chrome (emulator, private replica): ~21 s worker wait on per-block IndexedDB reads.
- Interleaved A/B medians: cold launch 15.1 → 5.4 s; first Tithing tap 7.5 → 0.60 s; warm tap 0.58 → 0.34 s.
- Typecheck, lint, 7 prefetch unit tests, 1,293 core tests (2 unrelated charset failures pre-exist).
- Progressive render, interleaved cold loads: first rows 6.4 → 5.2 s (host load 6–11).

## Delivered

- Mini: `actual-household-ui:215bd15af`, server 26.10.0.
- Backup `actual-20261014T191002Z.tar.gz`; rollback `compose.pre-ui-215bd15af.yaml`.
- Details: [benchmark](mobile-benchmark.md), [options](architecture-options.md).

## Next actions

- Measure the real phone (USB `chrome://inspect` or `scripts/android-perf`).
- Remaining cold path (~4 s before first paint): worker boot ~1.1 s, prefetch ~0.65 s,
  162k-cell spreadsheet restore + graph ~1.5 s. Next: lazy/partial spreadsheet restore.

## Needs Steven

- none

## Limits

- Emulator on an M3 host, not the phone; cold launch ~5 s misses the 1–2 s target.
- Bank sync was not active on the replica; update loads used the adb tunnel.
