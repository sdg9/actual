---
project: Actual Budget household fork
state: active
milestone: Self-hosted household budget with private AI access
updated: 2026-10-14
verify: ssh mini 'curl -fsS http://127.0.0.1:5006/health'
---

## Scope

- Upstream Actual Budget fork with household UI and performance patches.
- [UI status](docs/ui/STATUS.md) · [performance status](docs/performance/STATUS.md)
- [Mac Mini hosting and MCP status](docs/hosting/STATUS.md)
- [Deployment runbook](ops/mac-mini/README.md)

## Next actions

1. Complete protected remote access and validate bank sync.
2. Evaluate real household workflows before making product patches.

## Builds

| Where    | Build                                                                    | Date       |
| -------- | ------------------------------------------------------------------------ | ---------- |
| Mac Mini | `actual-household-ui:0fa3b3c8f` on Actual 26.10.0 server (pinned digest) | 2026-10-14 |
