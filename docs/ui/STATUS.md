---
project: Actual Household UI
state: active
milestone: YNAB-style mobile visual pass (light and dark) deployed
updated: 2026-10-14
verify: yarn typecheck
---

## Implemented

- Category name/Spent open a category screen: Budgeted/Spent/Balance, notes, transactions, More.
- Phone dialogs are bottom sheets above the keyboard; viewport CSS variables now set.
- Budget Summary sheet lists Move / Hold for next month / Cover / Reset hold.
- Visual pass: navy dark theme, balance-only pills, To Budget card, compact banners.
- Account groups on mobile (headers + subtotals); account menu → Account group….

## Verified

- Mobile + desktop E2E: 58 + 21 + 40 runs pass; new category-screen and summary-actions tests.
- Android emulator (private replica): assign/restore, hold $6,102.27 for November, and
  `#template 10% of previous Take-home pay` → November Tithing $610.23 (10% of October).
- Desktop budget and dialogs render; [decisions](mobile-navigation.md).
- Live: 8 account groups replace 9 closed "===" dividers (backup 20261014T200334Z).

## Delivered

- Mini: `actual-household-ui:215bd15af`, 2026-10-14.

## Next actions

- Late October: November → Tithing → Budgeted → Actions → Overwrite with template.

## Needs Steven

- none (live tithing setup approved and applied 2026-10-14)

## Limits

- Bare digits in amount fields are cents (`2700` → 27.00), as in YNAB.
- Real-phone usability not observed directly; emulator only.
