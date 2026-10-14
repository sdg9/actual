---
project: Actual household mobile performance
state: active
milestone: Android Chrome interaction latency at 2015–present household scale
updated: 2026-10-14
verify: yarn typecheck
---

## Implemented

- Reproducible isolated-copy benchmark of mobile budget/account/transaction flows.
- Reuse downloaded route modules and number formatters.
- Render prewarmed spreadsheet values immediately; retain worker refresh/subscriptions.

## Verified

- Original production baseline: 100 interaction samples, plus reload measurements.
- Final 150-tap stress test passes 2 s threshold at 1×, 4× and 6× CPU; maximum 1.827 s.
- Return to budget ~20–25% faster; 4× reload ~1.9–2.0 s; 6× reload ~2.7 s.
- Root typecheck and production build pass; formatter, loader and sheet regression tests pass.
- 48 mobile/desktop budget workflows pass; 38 formatter/utility + 7 loader/sheet tests pass.
- Changed-file type-aware lint and independent code review pass.

## Delivered

- Not deployed yet. Mini still runs `actual-household-ui:dce00af72`.
- Branch `perf/mobile-household`, worktree `/Users/steven/dev/actual-ynab-ui`.

## Next actions

1. Back up Mini, deploy verified bundle, verify live health/version and read-only UI.
2. Record installed build in this scope.

## Needs Steven

- none

## Limits

- Desktop Chromium at mobile viewport with CPU throttling is a proxy, not an Android hardware measurement.
- Benchmark uses a serverless private export copy; live financial records are untouched.
