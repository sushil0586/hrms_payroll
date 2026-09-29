# Salary Setup

Salary Setup defines salary components, salary structures, structure versions, and employee salary assignments.

## Purpose

Use Salary Setup to decide what an employee is paid and how that amount is split into components.

## Main concepts

| Concept | Meaning |
| --- | --- |
| Component | A salary part such as Basic, HRA, Conveyance, PF, TDS, Bonus. |
| Structure | A reusable salary design for a role or employee group. |
| Version | A dated version of a salary structure. |
| Assignment | Mapping of an employee to salary structure and CTC. |

## Decide where the change belongs

| Need | Use |
| --- | --- |
| Add a new pay head such as Basic, HRA, or Bonus | Component |
| Define how a role or group is paid | Structure |
| Change formula or component split from a date | Version |
| Give an employee a CTC or salary structure | Assignment |
| Add one-time bonus, arrears, or recovery | Adjustments and Settlements |

Do not use one-time adjustments for permanent salary changes. Do not edit historical structure versions when the change is effective from a new date.

## Tabs

| Tab | Purpose |
| --- | --- |
| Components | Maintain earnings, deductions, benefits, reimbursements, and employer contributions. |
| Structures | Maintain reusable salary structures. |
| Versions | Maintain effective-dated versions and rules. |
| Assignments | Assign salary structures and CTC to employees. |


![Salary Setup components tab](../../assets/screenshots/payroll/salary-setup-components.png)

## Component fields

| Field | Meaning |
| --- | --- |
| Code | Unique component code. |
| Name | User-facing component name. |
| Component type | Earning, deduction, benefit, employer contribution, reimbursement. |
| Taxable | Whether the component is taxable. |
| Payslip visible | Whether employees see it on payslip. |
| Active | Whether the component can be used in structures. |

## Real-world salary examples

| Scenario | Setup approach |
| --- | --- |
| HRA is 40% of Basic for non-metro cities. | Create HRA rule with city condition. |
| HRA is 50% of Basic for metro cities. | Add location or city-based condition. |
| One organization uses fixed conveyance. | Add fixed amount component in structure version. |
| Another organization uses role-based allowance. | Add grade or designation condition. |
| Monthly bonus | Add earning component with monthly frequency. |
| Quarterly bonus | Add earning component and pay in specific periods. |
| Annual bonus | Add one-time adjustment or annual component. |

## Salary setup workflow for a new tenant

1. Create base components first.
2. Mark whether each component is taxable, payslip visible, and earning/deduction/employer contribution.
3. Create structures for each salary design.
4. Create a version with effective date.
5. Add component split or formula references.
6. Assign salary to employees.
7. Confirm Payroll Control no longer shows salary assignment blockers.
8. Run a small calculation test and inspect line trace.

## Buttons and actions

| Button | What it does |
| --- | --- |
| New | Start creating a new salary record. |
| Create component | Adds a salary component. |
| Create structure | Adds a reusable structure. |
| Create version | Adds a dated structure version. |
| Assign salary | Maps employee to salary structure and CTC. |
| Save / Update | Saves selected item changes. |

## Recommended workflow

1. Create components first.
2. Create salary structures.
3. Create structure versions with effective dates.
4. Assign salary to employees.
5. Open Payroll Control and confirm salary blockers are reduced.
6. Open Payroll Rules if calculation logic is required.

## Common mistakes

- Assigning salary without effective date.
- Editing a structure instead of creating a new version.
- Using the same component for different meanings.
- Making a component hidden when payroll users need to verify it.
- Forgetting employer contribution components.

## FAQ

### Can two organizations have different HRA rules?

Yes. Use different structures, versions, or conditional rules based on legal entity, city, branch, grade, or role.

### Should bonus be part of salary structure or adjustment?

Use salary structure for predictable recurring bonus. Use adjustments for one-time, exceptional, or period-specific bonus.

### Why is CTC not matching net pay?

CTC includes employer-side costs and gross components. Net pay is calculated after employee deductions, tax, leave impact, and approved adjustments.
