---
project: Actual household hosting
state: waiting-on-steven
milestone: Mac Mini deployment, private MCP, and bank-sync trial
updated: 2026-10-13
verify: ssh mini 'curl -fsS http://127.0.0.1:5006/health'
---

## Implemented and verified
- Actual 26.10.0 in Docker, localhost port 5006, persistent data, pinned image.
- Login-time Docker startup and 04:15 local backups with 14-day retention.
- Browser login and empty Bank Sync Trial budget loaded.
- Public HTTPS login verified; Actual shows Server online and Bank Sync Trial.
- Cloudflare application and household policy sessions set to one month.
- Private MCP 0.22.31 over Tailscale SSH: reads/writes and read-only profile verified.

## Delivered
- Running on Mac Mini at `~/services/actual`; app available through local SSH forwarding.
- Setup and client configuration: [deployment runbook](../../ops/mac-mini/README.md).
- Public URL https://budget.stevengoff.dev protected by saved two-email Access policy.
- Mini tunnel running (four QUIC connections); unauthenticated HTTPS redirects to Access.

## Needs Steven
- SimpleFIN subscription/bank authorization and one-use setup token entered in Actual.

## Next actions
1. Connect SimpleFIN in Bank Sync Trial.
2. Verify real bank imports and next-day refresh; then migrate household budget if desired.
3. Add off-device backups; connect receipts database and schedule review job separately.

## Limits
- No live bank sync, receipt integration, or scheduled AI job yet.
- Startup requires macOS user login; reboot behavior not tested.
- Backups currently share the Mini's disk. No product patches made.
