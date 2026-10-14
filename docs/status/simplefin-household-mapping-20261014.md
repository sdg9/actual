---
project: Actual household bank sync
state: waiting-on-steven
milestone: Connect SimpleFIN feeds to imported household accounts
updated: 2026-10-14
verify: Browser Bank Sync page shows 15 linked accounts with recent sync timestamps
---

## Implemented and verified
- Configured SimpleFIN in the existing household budget, separate from the trial.
- Created a Mini backup before linking (20261014T145442Z).
- Mapped 15 feeds onto existing accounts: four Chase, one Capital One, one Schwab HSA, five Fidelity, three Vanguard, one U.S. Bank mortgage.
- Used the Capital One feed for the migrated Discover card; did not link the duplicate Discover feed.
- Initial individual imports reported failures; server logs included an upstream socket termination. Subsequent batch sync completed, with recent timestamps for all 15 accounts in the browser.
- Mini health endpoint returned UP. No app source or deployment changes in this task.

## Needs Steven
- Fidelity decision resolved: retain on-budget money market and off-budget investments; combined feed remains unlinked.
- Awaiting choice of balance-only tracking for nine other investment/HSA accounts, because imported trading activity distorts total-value ledgers.

## Remaining
- Preserve Fidelity split; no consolidation planned.
- Repeat API sync verified: transaction count unchanged at 22,065, zero new IDs. Account count remains 102.
- All 34 post-migration additions screened against existing same-account/same-amount transactions within seven days: no matches. Nine reused import-ID pairs predate this sync (2018); untouched.
- Three Chase credit-card cleared balances match provider values. Checking, migrated Capital One card, mortgage, and investment discrepancies require review; no forced adjustments.
- No unattended sync LaunchAgent or cron job found. Schedule remains pending investment policy; next-day refresh not yet verified.
- MCP default changed from trial to household; verified through read-only MCP account list with household account IDs.
- HSA Bank, Optum, and Navia provider authorization remains unresolved; legacy Discover feeds intentionally skipped.
- Investment ledger balances may require market-value adjustments; no automatic reconciliation adjustments were made.

## Delivery evidence
- Actual household Bank Sync page visibly lists all 15 linked accounts with recent sync timestamps on 2026-10-14.
- Documentation-only change; required yarn typecheck attempted but yarn was unavailable in this shell.
