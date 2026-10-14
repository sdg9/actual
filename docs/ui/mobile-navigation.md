# Mobile category navigation, 2026-10-14

Walkthrough on Android Chrome (Android 15 emulator, private replica of the
household budget) found these problems before the change:

- A category row had four unrelated tap targets: the name opened a centered
  notes/menu dialog with a nested "Actions" disclosure, Budgeted opened a
  second dialog, Spent navigated to a transaction screen, Balance opened a
  third dialog. Category information was split across a dialog and a screen.
- The category transaction screen labelled the month's activity as
  **Balance** (Tithing: "Balance −2,200.00" in red while its available balance
  was +5,152.50). That misrepresents the envelope's money.
- Dialogs were centered cards. Their sizing referenced
  `--visual-viewport-height`, which nothing set, so their height/centering
  rules were inert and they appeared at inconsistent heights.
- No interaction showed meaningful content within 2 seconds on a cold start
  of the large household budget (see [performance](../performance/mobile-benchmark.md)).

## Decisions

| Interaction                       | Where it belongs                            | Why                                                             |
| --------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Category name or Spent            | Dedicated category screen                   | Details and history need room, a back button, and a stable URL. |
| Budgeted amount                   | Bottom sheet with numeric keypad            | A quick, single-field edit; returns to the same place.          |
| Balance amount                    | Bottom sheet: move money, cover, rollover   | Short list of actions on the current envelope.                  |
| Rename, hide, delete, automations | "More" on the category screen               | Rare actions stay one step away, not on the row.                |
| Notes                             | Preview on the category screen; tap to edit | Notes were otherwise hidden behind a dialog.                    |

The category screen shows **Budgeted / Spent / Balance** for the month (Actual's
terms, matching the budget table), with the balance coloured by goal status.
Envelope income categories show **Received**. Tapping Budgeted or Balance on
the screen opens the same sheets as the budget table, so there is one way to
do each action. Deleting the category from its screen returns to the budget.

On phones, dialogs are bottom sheets: full width, rounded top corners, safe-area
padding, and positioned against the visual viewport so a focused amount field
sits directly above the Android keyboard. Desktop dialogs are unchanged apart
from now centering correctly. Stacked sheets no longer tilt.

No page transitions or longer animations were added. Existing 100 ms dialog
fades remain.

## Not changed

- Budget table layout, columns, colours and inline amount pills.
- Financial calculations, templates, sync and storage.
- Bare digits typed into an amount field are cents (`2700` → 27.00), as in
  YNAB's keypad; include the decimal point for whole amounts (`2700.00`).

## Verification

- New mobile E2E (envelope and tracking): category page summary, budget
  sheet, balance sheet and More menu; existing category-menu tests now reach
  the menu through the screen.
- Android emulator: assigning a new Tithing amount, then restoring 2,659.10,
  updated Budgeted and Balance immediately each time; the budget sheet docks
  above the numeric keyboard.
- Desktop: budget and the Add account dialog render and center normally.
