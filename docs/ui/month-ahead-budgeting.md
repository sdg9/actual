# Month-ahead budgeting and tithing

Actual supports this workflow with existing envelope budgeting and percentage
templates. The household fork clarifies the controls without changing the engine.

## October income funds November

1. Categorize net paycheck deposits as an income category such as **Take-home pay**.
   Use the amount deposited after payroll deductions; do not count transfers
   between your own accounts as income.
2. In October, open the **To Budget** amount and choose **Hold for next month**.
   Set aside the available income intended for November. This changes budget
   availability, not bank-account balances. Hold additional income as it arrives.
3. Open November to allocate those funds. You can do this before November starts.
   Any still-needed October spending must remain funded in October.

## Tithing: 10% of last month's take-home pay

On the Tithing category, configure a percentage template:

| Setting       | Value         |
| ------------- | ------------- |
| Income source | Take-home pay |
| Percentage    | 10            |
| Income month  | Last month    |

The equivalent text template is `#template 10% of previous Take-home pay`.
November reads October's recorded income for that category. For example, $8,000
of October deposits yields an $800 November assignment. Multiple paycheck
sources can share this category; other sources can have their own categories.

Apply the template when preparing the month. If late income transactions change
October's total, review the result and use the overwrite/reapply action as
appropriate to update November's already assigned amount. Normal template
application can preserve existing assignments; it is not a background rule that
continuously rewrites them after bank sync. Do not use **All income** unless all
income categories should count toward tithing.

The rule assigns this month's tithe amount independently of any unspent balance
carried from earlier months. No payment or bank transfer is initiated.

## Verification

- Engine `runPercentage` selects the previous month's sheet and resolves the
  selected income category by ID or name.
- Existing category-template-context suite verifies percentage calculations,
  category sources, previous-month selection, and template validation.
- Actual 26.10.0 production household configuration has not been changed here.

## Household check, 2026-10-14 (private replica)

The live household budget is **not yet** set up for this:

- Goal templates are an experimental feature and are off. Enable them in
  Settings → Experimental features → Goal templates (mobile: Settings →
  Experimental) before "Overwrite with template" appears.
- The imported **Income** category mixes paychecks (Marqeta payroll, Ethos
  Veterinary, Nordstrom) with YNAB reconciliation adjustments and balance
  corrections. October to date: net Income $1,798.43, paychecks $6,102.27.
  `10% of previous Income` would therefore tithe on adjustments.

Verified on a private copy of the server, in Android Chrome:

1. Created income category **Take-home pay** and moved September–October
   payroll, Ethos Veterinary and Nordstrom deposits into it (September total
   $26,591.66, whose 10% — $2,659.17 — matches October's manual $2,659.10).
2. Added `#template 10% of previous Take-home pay` to Tithing's notes.
3. November → Tithing → Budgeted → Actions → Overwrite with template set
   **$610.23** (10% of October's $6,102.27 so far).
4. October → To Budget → Budget Summary → **Hold for next month** $6,102.27:
   October's To Budget fell from $6,517.40 to $415.13 and "For next month"
   showed −6,102.27, reserving that income for November.

For the live budget, a payee rule (Marqeta payroll / Ethos Veterinary /
Nordstrom deposits → Take-home pay) keeps future bank-synced paychecks in the
right category. Re-apply the template after late paychecks arrive.
