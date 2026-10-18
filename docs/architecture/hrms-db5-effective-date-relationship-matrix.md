# DB-5 Effective-Date Relationship Matrix

Date: 2026-10-17

| Domain | Effective owner | Range | Resolution date | Overlap protection | Historical evidence | DB-5 disposition |
|---|---|---|---|---|---|---|
| Employee identity | `Employee` | Persistent identity | N/A | Tenant employee code uniqueness | Existing employee/audit records | Retained as current projection and stable identity |
| Employment contract | `EmploymentSpell` | `started_on` to `ended_on` | Employment business date | PostgreSQL employee-key lock and overlap trigger | Source, approver, approval time, evidence snapshot | Implemented; legacy rows remain unclassified |
| Organization/manager | `EmploymentAssignment` | `effective_from` to `effective_to` | Leave, attendance, lifecycle/report date | PostgreSQL employee-key lock, overlap and tenant-scope triggers | Movement link, source, approver, correction link, snapshot | Implemented for classified/new employees |
| Leave policy scope | `LeavePolicyAssignment` | Nullable legacy range; governed rows use explicit dates | Leave request/accrual business date | Date check plus tenant-scoped advisory lock and exact-scope/equal-priority trigger | `resolution_snapshot`; policy-period/ledger evidence remains authoritative | Implemented; legacy NULL dates require classification |
| Attendance policy scope | `AttendancePolicyAssignment` | Nullable legacy range; governed rows use explicit dates | Attendance work date | Date check plus tenant-scoped advisory lock and exact-scope/equal-priority trigger | `resolution_snapshot`; attendance evidence retained | Implemented; legacy NULL dates require classification |
| Salary | `EmployeeSalaryAssignment` | Existing explicit range | Payroll earning date | DB-5 employee-key overlap trigger for active rows | Payroll input/calculation snapshots | Hardened; payroll snapshots remain immutable |
| Pay group/calendar | `PayGroupAssignment` | Existing explicit range | Payroll period/earning date | DB-5 employee-key overlap trigger for active rows | Payroll run/input snapshots | Hardened |
| Statutory profile | `EmployeeStatutoryProfile` | Existing explicit range | Statutory/payroll business date | DB-5 employee-key overlap trigger for active rows | Source hash and payroll snapshots | Hardened |
| Shift/roster | Existing dated shift and roster assignments | Existing ranges | Attendance work date | Existing conflict services/constraints | Attendance derivation evidence | Reused; no duplicate model introduced |
| Payroll/finance history | Payroll input, calculation, payslip and handoff snapshots | Immutable run/period association | Original run dates | DB-1/DB-2 write barriers | Hashes, artifacts, audit events | Unchanged and regression verified |

All date ranges are inclusive. Adjacent transitions therefore close the old row on the day before the new row begins. A corrected row is linked through `correction_of`; approved historical evidence is not overwritten.
