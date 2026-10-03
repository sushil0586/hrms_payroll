# Payroll Overview

Payroll is the end-to-end process of preparing source data, locking inputs, calculating salaries, reviewing exceptions, publishing outputs, and handing final files to finance or payroll providers.

## On This Page

- [Payroll quick start](#payroll-quick-start)
- [Payroll phase drilldown](#payroll-phase-drilldown)
- [Who uses payroll pages](#who-uses-payroll-pages)
- [Payroll lifecycle](#payroll-lifecycle)
- [Which page should I open first?](#which-page-should-i-open-first)
- [Practical examples](#practical-examples)
- [Negative scenarios](#negative-scenarios)
- [Troubleshooting](#troubleshooting)
- [Payroll signoff checklist](#payroll-signoff-checklist)

## Payroll Quick Start

Use this if you are in a live payroll cycle and need the next page quickly.

| Current situation | Open | Expected next action |
| --- | --- | --- |
| Payroll setup is not complete | [Payroll Setup](payroll-setup.md) | Create calendar, period, pay group, and employee assignments. |
| Salary or CTC is missing | [Salary Setup](salary-setup.md) | Add component, structure, salary version, or employee assignment. |
| Formula/rule result is unclear | [Payroll Rules](payroll-rules.md) | Check active rule version and trace. |
| Payroll is blocked or not ready | [Payroll Control](payroll-control.md) | Clear source blockers before locking inputs. |
| Source data is ready | [Payroll Inputs](payroll-inputs.md) | Collect and lock immutable snapshots. |
| Draft payroll needs calculation | [Payroll Calculations](payroll-calculations.md) | Calculate and inspect employee line trace. |
| Exceptions need approval | [Payroll Review](payroll-review.md) | Approve, reject, or hold payroll with evidence. |
| Payslips/registers are required | [Payroll Outputs](payroll-outputs.md) | Generate and publish approved artifacts. |
| Finance/provider files are required | [Payroll Handoff](payroll-handoff.md) | Deliver files and record acknowledgement. |

## Payroll Phase Drilldown

Follow this as the payroll operator's map.

| Phase | Page | Primary user | Do not move ahead until |
| --- | --- | --- | --- |
| 0. Setup | [Payroll Setup](payroll-setup.md) | Payroll Admin | Periods, pay groups, and assignments are correct. |
| 0. Setup | [Salary Setup](salary-setup.md) | Payroll Admin / HR Admin | Salary components, structures, and CTC assignments are active. |
| 0. Setup | [Payroll Rules](payroll-rules.md) | Payroll Admin | Formula versions and trace are valid. |
| 0. Setup | [Statutory Payroll](statutory-payroll.md) | Payroll Admin / Compliance | PF, ESIC, PT, LWF, TDS, declarations, and proof rules are configured. |
| 0. Setup | [Payroll Providers](payroll-providers.md) | Payroll Admin / Integration Owner | Provider routing and delivery expectations are clear. |
| 1. Readiness | [Payroll Control](payroll-control.md) | HR Admin / Payroll Admin | Blockers are zero or formally accepted. |
| 2. Inputs | [Payroll Inputs](payroll-inputs.md) | Payroll Admin | Snapshot is complete and locked. |
| 3. Calculation | [Payroll Calculations](payroll-calculations.md) | Payroll Admin | Draft totals and line traces are explainable. |
| 4. Review | [Payroll Review](payroll-review.md) | Approver / Finance | Exceptions are resolved or documented. |
| 5. Outputs | [Payroll Outputs](payroll-outputs.md) | Payroll Admin | Payslips/registers are generated from approved payroll. |
| 6. Handoff | [Payroll Handoff](payroll-handoff.md) | Finance / Payroll Admin | Finance/provider acknowledgement is recorded. |
| Any phase | [Adjustments & Settlements](adjustments-settlements.md) | Payroll Admin / Finance | Arrears, bonus, deductions, F&F, and exceptions are traceable. |

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

## End-to-end workflow

Run payroll as a controlled sequence.

1. Open **Payroll Setup** and confirm calendars, periods, pay groups, and assignments.
2. Open **Salary Setup** and confirm salary components, structures, CTC, and assignments.
3. Open **Payroll Rules** and confirm formula versions are active and traceable.
4. Open **Statutory** and confirm PF, ESIC, PT, LWF, TDS, and employer compliance settings.
5. Open **Payroll Control** and resolve source blockers.
6. Open **Payroll Inputs** and lock the period snapshot.
7. Open **Payroll Calculations** and calculate draft payroll.
8. Open **Payroll Review** and approve or hold exceptions.
9. Open **Payroll Outputs** and generate payslips/registers.
10. Open **Payroll Handoff** and deliver finance/provider files with evidence.

Expected result:

- Every payroll run is explainable from setup through handoff.
- Locked input data is traceable.
- Finance receives final artifacts only after review approval.

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

## Practical examples

### Example 1: First monthly payroll for a new tenant

1. Configure payroll calendar and September 2026 period.
2. Create pay groups such as monthly employees and contractors.
3. Assign employees to the correct pay group.
4. Create salary structures and CTC assignments.
5. Configure statutory defaults and provider settings.
6. Open Payroll Control and clear blockers before locking inputs.

Expected result: payroll starts with clean setup rather than corrections during calculation.

### Example 2: Net pay changed unexpectedly

1. Open **Payroll Calculations**.
2. Select the affected run and employee line.
3. Review earnings, deductions, taxable values, and net pay.
4. Open **Payroll Rules** trace if the line result depends on a formula.
5. Check **Adjustments & Settlements** for arrears, bonus, deduction, or F&F entries.

Expected result: the user can explain the net pay change without guessing.

### Example 3: Payslips are ready to publish

1. Confirm Payroll Review status is approved.
2. Open Payroll Outputs.
3. Generate payslips and statutory/register artifacts.
4. Check failed outputs before publishing.
5. Open Payroll Handoff and record delivery evidence.

Expected result: employee-facing payroll output is published only after review and artifact checks.

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

## Negative scenarios

| Issue | Impact | Correct action |
| --- | --- | --- |
| Inputs are locked before employee blockers are fixed. | Payroll may calculate with missing bank, salary, or statutory data. | Fix Payroll Control blockers first. |
| Salary structure changes after calculation. | Draft payroll may not match latest setup. | Rerun calculation from a controlled snapshot. |
| Manual payout is made before review approval. | Finance may pay an unapproved payroll. | Require Payroll Review approval before handoff. |
| Provider file is generated without checking bank coverage. | Bank advice may miss employees. | Review bank blockers and output exceptions first. |
| Statutory rules are incomplete. | Compliance reports may be wrong. | Complete Statutory setup and run validation. |

## Troubleshooting

| Problem | Likely reason | Fix |
| --- | --- | --- |
| Payroll Control shows blocked | Source data or setup is incomplete. | Open the blocker category and correct the owning record. |
| Calculation button is unavailable | Inputs are not locked or run status is not calculable. | Open Payroll Inputs and confirm snapshot lock. |
| Net pay does not match expectation | Salary setup, rule version, attendance/leave input, or adjustment differs. | Use line trace and compare locked inputs. |
| Payslip generation fails | Review is not approved, artifact job failed, or employee line is blocked. | Open Payroll Outputs issue register and retry after fixing. |
| Handoff cannot complete | Required output file or delivery evidence is missing. | Generate artifacts first and attach acknowledgement evidence. |

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

## Payroll signoff checklist

Before final payroll handoff:

| Check | Expected result |
| --- | --- |
| Setup is complete. | Calendars, periods, pay groups, assignments, salary structures, rules, statutory, and providers are active. |
| Readiness blockers are resolved. | Bank, salary, statutory, attendance, leave, and organization blockers are zero or documented. |
| Inputs are locked. | Payroll snapshot is immutable for the period. |
| Calculation is complete. | Earnings, deductions, employer cost, and net pay totals are visible. |
| Exceptions are approved. | Payroll Review shows approval or deliberate hold. |
| Outputs are generated. | Payslips, registers, and required reports are available. |
| Handoff evidence is stored. | Finance/provider delivery, acknowledgement, and audit proof are recorded. |

## Questions users commonly ask

| Question | Best place to answer it |
| --- | --- |
| Why is this employee not in payroll? | Payroll Control employees tab, Payroll Inputs snapshot, pay group assignment. |
| Why did net pay change? | Payroll Calculations line trace, Payroll Rules trace, adjustment register. |
| Why is payroll blocked? | Payroll Control top action list and setup health. |
| Can I publish payslips now? | Payroll Review approval status and Payroll Outputs artifact status. |
| What did finance receive? | Payroll Handoff and Finance Manager control center. |
