# Payroll Rules

Payroll Rules define formulas and calculation logic used during payroll calculation.

## Purpose

Use Payroll Rules to explain and control how payroll values are calculated.

## Main concepts

| Concept | Meaning |
| --- | --- |
| Rule definition | The logical rule, such as HRA calculation. |
| Rule version | Effective-dated version of the rule. |
| Dependency | Another value required by the rule. |
| Trace | Evidence of how a result was calculated. |

## When to create a rule

Create or update a rule when the system must calculate a value from conditions instead of storing a fixed amount.

Examples:

- HRA as a percentage of Basic.
- City-based allowance.
- Grade-based bonus.
- Statutory deduction using a slab.
- Proration based on payable days.
- Recovery limited by net pay.

If the value is a simple fixed amount for one employee, use salary assignment or adjustment instead.

## Tabs

| Tab | Purpose |
| --- | --- |
| Catalog | List of rule definitions. |
| Versions | Effective-dated rule versions. |
| Trace | Calculation trace and dependencies. |
| Actions | Create or update rule records. |


![Payroll Rules trace tab](../../assets/screenshots/payroll/payroll-rules-trace.png)

## Rule fields

| Field | Meaning |
| --- | --- |
| Code | Unique rule code. |
| Name | User-friendly rule name. |
| Component | Salary component affected by the rule. |
| Effective date | Date from which the rule version applies. |
| Expression | Formula or calculation logic. |
| Priority | Order in which the rule is applied. |
| Active | Whether the rule can be used. |

## Safe rule change workflow

1. Open Payroll Rules.
2. Find the rule in Catalog.
3. Review existing versions.
4. Create a new version instead of overwriting old logic.
5. Confirm effective date.
6. Review dependencies.
7. Run calculation in a controlled payroll run.
8. Open Trace and verify output.

## Trace review checklist

| Check | What to confirm |
| --- | --- |
| Employee context | Legal entity, city, grade, role, department, and pay group are correct. |
| Effective date | The selected rule version applies to the payroll period. |
| Inputs | Basic, CTC, payable days, leave, attendance, and statutory inputs are correct. |
| Dependencies | The rule did not use a missing or stale dependency. |
| Result | Amount matches policy expectation. |
| Audit note | Any exception is documented before review approval. |

## Common mistakes

- Changing a live rule without versioning.
- Not setting effective date.
- Creating circular dependencies.
- Forgetting statutory impact.
- Not checking trace after calculation.

## FAQ

### Why is rule trace important?

Trace explains how the system reached a payroll value. It helps answer employee, finance, and audit questions.

### Can formulas differ by role or city?

Yes. Conditions can be based on employee attributes such as city, location, legal entity, department, grade, role, or pay group.

### What if two rules affect the same component?

Check priority, effective dates, and conditions. Only the intended rule should apply for the selected employee and payroll period.
