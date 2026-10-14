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
