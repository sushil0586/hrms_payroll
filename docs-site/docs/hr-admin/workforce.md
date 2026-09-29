# HR Admin Workforce

Workforce pages manage employee records and employee lifecycle operations.

## Employees

### Purpose

Use **Employees** to create, search, review, and maintain employee master records.

### Use this page when

- A new employee joins.
- Employee personal, work, manager, bank, or access information changes.
- Payroll readiness shows employee master warnings.
- You need to check whether an employee has login access.

### What you can do

- Search employee records.
- Filter by department, manager review, readiness, and page size.
- Open employee details.
- Create a new employee.
- Import employee data in bulk.
- Review access readiness and manager chain readiness.

### Important fields

| Field | Meaning |
| --- | --- |
| Employee code | Unique employee identifier. |
| Department | Employee's department for reporting and payroll grouping. |
| Designation | Employee's role title. |
| Manager | Reporting manager used for MSS and approvals. |
| Employment status | Active, inactive, notice, or exited. |
| Access status | Whether the employee has login access. |

### Checks before saving

- Employee code is unique.
- Work email is correct.
- Department, branch, location, and manager are mapped.
- Bank and statutory details are available if payroll is required.

## Lifecycle

### Purpose

Use **Lifecycle** to manage onboarding, movement, probation, and exit queues.

### What you can do

- Review joiner tasks.
- Track employee movements.
- Manage probation reviews.
- Process exits.
- Review owners and due dates.

### Good practice

Use lifecycle queues instead of editing employee data directly when the change requires approval or evidence.

## Organization

### Purpose

Use **Organization** to maintain the structural masters used by employees and payroll.

### Common masters

- Legal entities
- Locations
- Branches
- Business units
- Departments
- Cost centers
- Grades
- Designations
- Employee types

### Good practice

Create organization masters before bulk employee import. This prevents missing department, branch, location, and payroll grouping errors.

## Workforce operating sequence

For a new tenant or a large employee update, use this order:

1. Create or validate Organization masters.
2. Create or import Employees.
3. Review structure, access, and manager readiness.
4. Complete salary, bank, and statutory setup for payroll employees.
5. Use Lifecycle workflows for joiners, movements, exits, and probation.
6. Return to Payroll Control to confirm blockers reduced.

This sequence avoids repeated maintenance because employee records depend on organization masters, and payroll readiness depends on both.
