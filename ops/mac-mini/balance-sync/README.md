# Investment balance-only sync

The Mini's `~/services/actual/balance-sync` job uses the pinned API from the
existing MCP installation. It requests SimpleFIN balances through the existing
Actual server authorization; it does not copy the SimpleFIN credential.

The private `config.json` contains the household budget ID and exactly nine
Actual-to-SimpleFIN account mappings. Fidelity's split cash/investment account
and the mortgage are excluded. Three Vanguard accounts explicitly allow the
provider's blank currency field; other mappings require USD.

For each eligible open off-budget account, the job disconnects native transaction
sync and adds a cleared, dated `Investment balance adjustment` only when the
ledger differs from the provider's total. Existing transactions are preserved.
Adjustments include the provider timestamp in their notes and are booked on the
run date in America/Chicago; they are not investment income/return calculations.
A repeated run with unchanged balances adds nothing. Normal browser Bank Sync
no longer imports transactions for these nine accounts. They appear unlinked in
the app because the separate job owns balance updates. Do not relink them.

Missing/ambiguous feeds, balances older than 72 hours, future timestamps, unexpected
currencies/links, closed accounts and on-budget accounts stop the run before any
writes. A directory lock prevents two copies of this job running simultaneously.
It does not lock out human edits: the job syncs and rechecks the ledger before each
adjustment, but avoid editing these accounts while it runs. Failed or partial runs
are visible in `last-run.json` and the private log. Sync errors stop the job;
a replica with potentially unsynced writes is retained at the report's
`retainedCache` path for recovery. Inspect it before retrying if writes were partial. Never bypass errors by inserting
zero balances. Inspect/remove `.running` only after confirming its PID is dead.

## Operations

- Preview: `ssh mini '/opt/homebrew/bin/node ~/services/actual/balance-sync/run.cjs'`
- Apply: `ssh mini '/bin/sh ~/services/actual/balance-sync/run.sh'`
- Status: `ssh mini 'cat ~/services/actual/balance-sync/last-run.json'` (private balances)
- Schedule: LaunchAgent `com.steven.actual.balance-sync`, daily 07:15 Mini local time.
- Stop schedule: `launchctl bootout gui/$(id -u)/com.steven.actual.balance-sync` on Mini.
- Tests: `node --test ops/mac-mini/balance-sync/plan.test.cjs`.

The schedule requires the macOS user session and Docker to be running. Reports,
config and logs remain outside git with restricted permissions. The scheduled log
is overwritten each run. Back up the private config separately when moving machines.
To revert, stop the job, review/remove only its dated adjustment transactions as
appropriate, then relink the original feeds in Actual. Do not delete history.
