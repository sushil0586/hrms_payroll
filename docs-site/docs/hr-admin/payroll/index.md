# Payroll Overview

Payroll is the end-to-end process of preparing source data, locking inputs, calculating salaries, reviewing exceptions, publishing outputs, and handing final files to finance or payroll providers.

## Who uses payroll pages

| User | Main responsibility |
| --- | --- |
| HR admin | Employee data, payroll readiness, corrections, approvals, payslip publication. |
| Payroll admin | Payroll setup, salary setup, rules, inputs, calculations, review, outputs. |
| Finance manager | Bank advice, finance handoff, payout evidence, statutory reports. |
| Tenant admin | Ensures correct users and roles exist before payroll is operated. |

## Payroll lifecycle

1. **Setup**: calendars, periods, pay groups, salary structures, rules, statutory setup, providers.
2. **Readiness**: check source data, employees, bank, attendance, leave, organization, and statutory blockers.
3. **Inputs**: lock a snapshot of all payroll inputs for the period.
4. **Calculation**: calculate draft payroll and inspect line-level results.
5. **Review**: resolve exceptions and approve payroll.
6. **Outputs**: generate payslips, registers, and artifacts.
7. **Handoff**: deliver final files to finance or providers and store audit evidence.

## Which page should I open first?

| Situation | Start here | Why |
| --- | --- | --- |
| Payroll has not been configured for the tenant | Payroll Setup | Calendars, periods, pay groups, and assignments must exist first. |
| Employee salary is missing or wrong | Salary Setup | Salary structures, CTC, and assignments drive earnings. |
| A formula result is wrong | Payroll Rules | Rules and traces explain calculation logic. |
| Monthly payroll is about to start | Payroll Control | This shows blockers, warnings, and readiness decisions. |
| Source data is ready and stable | Payroll Inputs | Lock the snapshot before calculation. |
| Net pay or deductions look wrong | Payroll Calculations | Use line trace to explain the amount. |
| Exceptions need approval | Payroll Review | Review is the formal decision point. |
| Payslips or registers are needed | Payroll Outputs | Outputs are generated only after review is approved. |
| Finance needs bank advice or provider files | Payroll Handoff | Handoff stores delivery and acknowledgement evidence. |

## Safe operating rule

Payroll should move in this order:

**Setup -> Readiness -> Inputs -> Calculation -> Review -> Outputs -> Handoff**

If you go backward after locking inputs, document why. If the change affects pay, create a controlled rerun or adjustment instead of silently changing source records.

## Payroll menu map

| Menu | Use it for | Typical next page |
| --- | --- | --- |
| Payroll Control | Check whether payroll can move ahead. | Payroll Inputs or Employees |
| Payroll Setup | Calendars, periods, pay groups, assignments. | Payroll Inputs |
| Salary Setup | Components, structures, CTC and salary assignments. | Payroll Rules |
| Payroll Rules | Formulas, versions, dependencies, traces. | Payroll Calculations |
| Statutory | PF, ESIC, PT, LWF, TDS and compliance setup. | Reports |
| Providers | External payroll/bank/provider integrations. | Payroll Handoff |
| Adjustments & Settlements | Arrears, bonus, deductions, F&F, exception payouts. | Payroll Review |

## Common statuses

| Status | Meaning | What to do |
| --- | --- | --- |
| Ready | This section can proceed. | Continue to the next step. |
| Warning | Payroll can continue, but review is recommended. | Review before final approval. |
| Blocked | Payroll should not continue. | Fix the blocker first. |
| Locked | Inputs or review are frozen. | Do not expect later source edits to affect this run. |
| Published | Output has been released. | Verify access and handoff evidence. |

## Support-reduction checklist

Before asking support for payroll help, check:

- Payroll Control top action list.
- Employee master warnings.
- Bank account coverage.
- Attendance and leave approval status.
- Salary assignment coverage.
- Payroll run status.
- Calculation validation panel.
- Review exception register.
- Output artifact status.
- Handoff provider delivery status.

!!! tip
    If a payroll number looks wrong, do not start from the final net pay. Start from the calculation line trace, then walk backward to salary setup, rules, and locked inputs.

## Questions users commonly ask

| Question | Best place to answer it |
| --- | --- |
| Why is this employee not in payroll? | Payroll Control employees tab, Payroll Inputs snapshot, pay group assignment. |
| Why did net pay change? | Payroll Calculations line trace, Payroll Rules trace, adjustment register. |
| Why is payroll blocked? | Payroll Control top action list and setup health. |
| Can I publish payslips now? | Payroll Review approval status and Payroll Outputs artifact status. |
| What did finance receive? | Payroll Handoff and Finance Manager control center. |
