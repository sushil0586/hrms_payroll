# Payroll Calculations

Payroll Calculations generates draft payroll and shows calculation evidence.

## Purpose

Use this page to calculate payroll and inspect the result before review.

## What this page should answer

- Did the run calculate successfully?
- How many employees and lines were included?
- What are gross earnings, deductions, and net pay?
- Are there blockers or warnings?
- Can an amount be explained through trace?

## Page layout

| Section | Meaning |
| --- | --- |
| Calculation queue | Payroll runs available for calculation. |
| Calculation attempts | Latest calculation result summary. |
| Issue register | Validation issues found during calculation. |
| Line trace | Detailed source, input, rule, and output for one line. |


![Payroll Calculations line trace](../../assets/screenshots/payroll/payroll-calculations-line-trace.png)

## Summary values

| Value | Meaning |
| --- | --- |
| Gross earnings | Total earnings before deductions. |
| Deductions | Total employee deductions. |
| Net pay | Payable amount after deductions. |
| Employees | Employees included in calculation. |
| Lines | Calculation lines generated. |
| Validation | Warning or blocker count. |

## Buttons and actions

| Button | What it does |
| --- | --- |
| Calculate draft | Runs payroll calculation from locked inputs. |
| Open Review | Moves the run to review when calculation is acceptable. |
| Select line | Opens line trace for detailed investigation. |

## Workflow

1. Confirm inputs are locked.
2. Open Payroll Calculations.
3. Select the payroll run.
4. Run draft calculation.
5. Review gross, deductions, and net pay.
6. Open issue register.
7. Resolve blockers.
8. Inspect trace for unusual values.
9. Move to Payroll Review.

## Amount investigation path

When an amount looks wrong, check in this order:

1. Select the employee or line.
2. Open line trace.
3. Confirm locked input values.
4. Confirm rule version and dependencies.
5. Check approved adjustments.
6. Check statutory deductions.
7. Compare with previous period if needed.
8. Recalculate only after correcting the source issue.

## Common issues

| Issue | Likely cause |
| --- | --- |
| Calculation blocked | Inputs not locked or source blockers exist. |
| Zero net pay | Missing salary, unpaid leave, full deduction, or incorrect component rule. |
| Deduction too high | Rule configuration, statutory slab, loan/recovery, or adjustment issue. |
| Employee missing | Not in pay group, inactive, outside period, or missing salary assignment. |

## FAQ

### Why does the page show latest net pay but calculation is blocked?

The latest net pay may come from a previous completed run. Check selected run status and validation panel.

### Can I approve payroll from this page?

No. Use this page for calculation and investigation. Formal approval belongs in Payroll Review.
