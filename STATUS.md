---
project: Actual Budget household fork
state: active
milestone: Self-hosted household budget with private AI access
updated: 2026-10-13
verify: ssh mini 'curl -fsS http://127.0.0.1:5006/health'
---

## Scope
- Upstream Actual Budget clone; application source remains unmodified.
- [Mac Mini hosting and MCP status](docs/hosting/STATUS.md)
- [Deployment runbook](ops/mac-mini/README.md)

## Next actions
1. Complete protected remote access and validate bank sync.
2. Evaluate real household workflows before making product patches.

## Builds
| Where | Build | Date |
|---|---|---|
| Mac Mini | Actual 26.10.0 stable Docker image, pinned digest | 2026-10-13 |
