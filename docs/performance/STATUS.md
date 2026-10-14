---
project: Actual household mobile performance
state: active
milestone: Investigating reported 17-second Android first-use delay
updated: 2026-10-14
verify: ssh mini 'curl -fsS http://127.0.0.1:5006/household-build.json'
---

## Implemented

- Reuse downloaded route modules and bounded number formatters.
- Render prewarmed spreadsheet values immediately; retain worker refresh/subscriptions.

## Verified

- Earlier 150 warm-navigation taps pass 2 s; they missed the reported first-use delay.
- Cold-first-category benchmark added; six local samples 133–467 ms (1×/4×/6×).
- Live Mini reload/first Tithing tap ~999 ms in desktop preview; Android cause unresolved.
- Root typecheck, production build, changed-file lint and independent review pass.
- 48 mobile/desktop workflows + 38 utility + 7 loader/sheet tests pass.

## Delivered

- Mini: `actual-household-ui:a6bcc9fc5`, source `a6bcc9fc5`, server 26.10.0.
- Backup: `actual-20261014T054942Z.tar.gz`; rollback: `compose.pre-perf-a6bcc9fc5.yaml`.
- Branch `perf/mobile-household`; worktree `/Users/steven/dev/actual-ynab-ui`.

## Next actions

- Trace Android post-update first use, including asset loading, worker startup and sync.
- Do not treat desktop measurements as proof the reported 17-second wait is fixed.

## Needs Steven

- none

## Limits

- [Benchmark](mobile-benchmark.md) uses a private copy and CPU-throttled Chromium, not Android. Follow-up changes only the harness; no new app deployment.
