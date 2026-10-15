---
project: Actual household reports
state: waiting-on-steven
milestone: Refine and deploy the household report dashboard
updated: 2026-10-14
verify: ssh mini 'curl -fsS http://127.0.0.1:5006/health && curl -fsS http://127.0.0.1:5006/household-build.json'
---

## Implemented

- Based on household revision `4e79d94a6`, preserving mobile UI and account groups.
- Summary amounts capped at 36px, consistently weighted and left aligned; container sizing still accommodates long amounts.
- Stronger date labels, 16px grid gaps, theme-aware borders and 6px corners.
- No report data, saved widget layout, calculations, or server changes.

## Verified

- Original household dashboard inspected in signed-in Chrome.
- Root typecheck: all 10 packages passed. Four focused report tests passed.
- Browser build and formatting passed; lint had no errors and one pre-existing assertion warning.
- Independent review found no actionable issues; design layout scan clean.
- Separate container health and release marker passed; live container healthy, serving `db9676813`.
- Local demo failed during browser storage initialization. MacBook had about 130 MB free; build ran on Mini.

## Delivered

- Mini image `actual-household-ui:db9676813`, deployed 2026-10-14 (2026-10-15 UTC).
- Backup: `~/services/actual/backups/actual-20261015T014941Z.tar.gz`.
- Rollback on Mini: `cd ~/services/actual && cp compose.pre-ui-db9676813.yaml compose.yaml && /usr/local/bin/docker compose up -d actual`.
- Mini source: `~/services/actual/report-ui-source`; image context: `ui-releases/db9676813`.

## Needs Steven

- Reconnect personal Chrome profile: it disconnected before post-deploy visual checks; connected work profile requires Cloudflare login.

## Next actions

- Finish desktop/mobile visual verification in signed-in profile. Light/dark/midnight rendering not yet verified after deployment.
