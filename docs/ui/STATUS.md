---
project: Actual Household UI
state: active
milestone: YNAB-inspired budget and sidebar preview
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
- Latest desktop budget E2E: 9 passed; percentage-template engine suite: 86 passed.
- Prior mobile envelope/tracking editing and month navigation: 6 passed.
- Production browser build passes; two-month alignment visually checked.

## Delivered

- Isolated branch `feat/ynab-inspired-ui` in `/Users/steven/dev/actual-ynab-ui`.
- Local built preview: http://localhost:3002 (demo data only).
- Mac Mini production remains Actual 26.10.0; redesign not deployed.

## Next actions

- Review preview before a separate Mini deployment.
- Configure household Take-home pay and Tithing categories using [the workflow](month-ahead-budgeting.md).

## Needs Steven

- none
