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

- Combined Fidelity brokerage contains the separately tracked money-market cash. Choose whether the combined account should be on-budget or off-budget before consolidation; both remain unlinked.

## Remaining

- Preserve historical budgeting when consolidating Fidelity; do not silently reparent historical on-budget transactions.
- Reconcile balances and verify duplicate-free repeat imports; recent sync timestamps alone do not prove these checks.
- HSA Bank, Optum, and Navia provider authorization remains unresolved; legacy Discover feeds intentionally skipped.
- Investment ledger balances may require market-value adjustments; no automatic reconciliation adjustments were made.

## Delivery evidence

- Actual household Bank Sync page visibly lists all 15 linked accounts with recent sync timestamps on 2026-10-14.
- Documentation-only change; required yarn typecheck attempted but yarn was unavailable in this shell.
