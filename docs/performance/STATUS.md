---
project: Actual household mobile performance
state: active
milestone: Measured mobile responsiveness improvements deployed to Mini
updated: 2026-10-14
verify: ssh mini 'curl -fsS http://127.0.0.1:5006/household-build.json'
---

## Implemented

- Reuse downloaded route modules and bounded number formatters.
- Render prewarmed spreadsheet values immediately; retain worker refresh/subscriptions.

## Verified

- 150 tap samples pass 2 s threshold at 1×, 4× and 6× CPU; maximum 1.827 s.
- Return to budget ~20–25% faster; 4× reload ~1.9–2.0 s; 6× reload ~2.7 s.
- Root typecheck, production build, changed-file lint and independent review pass.
- 48 mobile/desktop workflows + 38 utility + 7 loader/sheet tests pass.
- Mini health, web revision, live household render, month navigation and sync verified.

## Delivered

- Mini: `actual-household-ui:a6bcc9fc5`, source `a6bcc9fc5`, server 26.10.0.
- Backup: `actual-20261014T054942Z.tar.gz`; rollback: `compose.pre-perf-a6bcc9fc5.yaml`.
- Branch `perf/mobile-household`; worktree `/Users/steven/dev/actual-ynab-ui`.

## Next actions

- Existing browser/PWA: use **Update now** or reload to activate the new bundle.
- Further work should profile actual Android hardware and slower startup, if needed.

## Needs Steven

- none

## Limits

- [Benchmark](mobile-benchmark.md) uses a private copy and CPU-throttled Chromium, not actual Android hardware.
