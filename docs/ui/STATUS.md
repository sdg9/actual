---
project: Actual Household UI
state: waiting-on-steven
milestone: Mobile category screen, bottom sheets and visible month-ahead actions deployed
updated: 2026-10-14
verify: yarn typecheck
---

## Implemented

- Category name/Spent open a category screen: Budgeted/Spent/Balance, notes, transactions, More.
- Phone dialogs are bottom sheets above the keyboard; viewport CSS variables now set.
- Budget Summary sheet lists Move / Hold for next month / Cover / Reset hold.

## Verified

- Mobile + desktop E2E: 58 + 21 + 40 runs pass; new category-screen and summary-actions tests.
- Android emulator (private replica): assign/restore, hold $6,102.27 for November, and
  `#template 10% of previous Take-home pay` → November Tithing $610.23 (10% of October).
- Desktop budget and dialogs render; [decisions](mobile-navigation.md).

## Delivered

- Mini: `actual-household-ui:b4efb1327` (with storage prefetch), 2026-10-14.

## Next actions

- After Steven's decision below, configure the live budget per [the workflow](month-ahead-budgeting.md).
- Optional: close YNAB divider pseudo-accounts ("===…===") that clutter Accounts and Bank Sync.

## Needs Steven

- Approve live-budget tithing setup: enable Goal templates; add a Take-home pay income
  category; move payroll/Ethos/Nordstrom deposits there; add the Tithing template.
  "Income" currently mixes paychecks with reconciliation adjustments (Oct net $1,798 vs $6,102 pay).

## Limits

- Bare digits in amount fields are cents (`2700` → 27.00), as in YNAB.
- Real-phone usability not observed directly; emulator only.
