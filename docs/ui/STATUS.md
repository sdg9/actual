---
project: Actual Household UI
state: active
milestone: YNAB-inspired budget and sidebar preview
updated: 2026-10-13
verify: yarn typecheck
---

## Implemented

- Blue light theme, rounded sidebar navigation, more legible account spacing.
- Full-width single-month summary; multi-month column alignment retained.
- Semantic category balance pills, clearer month typography, keyboard-focus visibility for summary controls.
- Existing calculations, labels, imports, bank sync, and storage remain unchanged.

## Verified

- Root typecheck passes; modified TypeScript files pass type-aware lint.
- Sidebar Account tests: 3 passed. Formatting and diff whitespace checks pass.
- Desktop light/dark and mobile demo visually inspected.
- Built-preview desktop budget E2E: 8 passed; mobile envelope/tracking editing and month navigation: 6 passed.
- Production browser build passes; two-month alignment visually checked.

## Delivered

- Isolated branch `feat/ynab-inspired-ui` in `/Users/steven/dev/actual-ynab-ui`.
- Local built preview: http://localhost:3002 (demo data only).
- Mac Mini production remains Actual 26.10.0; redesign not deployed.

## Next actions

- Review preview before a separate Mini deployment.

## Needs Steven

- none
