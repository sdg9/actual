---
project: Actual Household UI
state: active
milestone: YNAB-inspired household UI deployed to Mini
updated: 2026-10-14
verify: yarn typecheck
---

## Implemented

- Blue light theme, rounded sidebar navigation, more legible account spacing.
- Full-width single-month summary; multi-month column alignment retained.
- Semantic category balance pills, clearer month typography, keyboard-focus visibility for summary controls.
- Month-ahead and take-home-income guidance in percentage templates and hold controls.
- Keyboard-accessible summary actions with Enter/Space regression coverage.
- Existing financial calculations, imports, bank sync, and storage remain unchanged.

## Verified

- Root typecheck passes; modified TypeScript files pass type-aware lint.
- Sidebar Account tests: 3 passed. Formatting and diff whitespace checks pass.
- Desktop light/dark and mobile demo visually inspected.
- Final desktop budget + mobile automation E2E: 10 passed; template engine: 86 passed.
- Offscreen month controls inert; focus no longer scrolls the summary strip.
- Prior mobile envelope/tracking editing and month navigation: 6 passed.
- Production build passes; two-month alignment checked; live S&S Household downloaded/rendered and sync returned HTTP 200.

## Delivered

- Isolated branch `feat/ynab-inspired-ui` in `/Users/steven/dev/actual-ynab-ui`.
- Local built preview: http://localhost:3002 (demo data only).
- Mini: `actual-household-ui:dce00af72`, server 26.10.0, deployed 2026-10-14.
- Verified backup `actual-20261014T051148Z.tar.gz`; previous compose retained.

## Next actions

- Use live UI at https://budget.stevengoff.dev; reload/update existing PWA.
- Configure household Take-home pay and Tithing categories using [the workflow](month-ahead-budgeting.md).

## Needs Steven

- none
