# HRMS/Payroll Database Deep Audit

Date: 2026-10-17  
Scope: Django models, 76 migrations, constraints/indexes, services, APIs, jobs, frontend configuration, launch seeders, tests, and architecture/QA evidence  
Method: read-only source and Django model-metadata inspection; no code, migration, test, or data changes  
Decision: **NOT READY** for production customer data until P0 controls are remediated

## Executive findings

The platform has a broad enterprise domain and unusually strong payroll snapshots, artifacts, provider audit, and durable background jobs. It is not yet safe for production year-end operations because:

1. fiscal years/accounting periods and close/reopen controls are not persisted;
2. leave reservation/consumption uses unlocked mutable summaries and can lose concurrent updates;
3. leave year-end lacks durable carry-forward/expiry ledger events and idempotent close runs;
4. workflow resolution is unlocked and replayable;
5. terminal payroll immutability and many tenant/date/amount invariants rely on `full_clean()`, which bulk/update/raw paths bypass;
6. duplicate regular payroll runs for one period/pay group are not prohibited;
7. widespread CASCADE deletion and no concrete soft-delete adoption can remove statutory/history records.

These are confirmed architectural risks, not evidence that corruption has already occurred. Existing working payroll snapshots and leave behavior must be preserved while controls are introduced.

## Inventory

The audited core contains 111 models across the principal tenant, IAM, organization, employee, lifecycle, document, leave, attendance, payroll, workflow, and configuration apps. Only one core model declares `Meta.constraints`; eight declare explicit `Meta.indexes`; no core model declares a `CheckConstraint`. `unique_together` creates many useful uniqueness constraints but does not cover temporal overlap, tenant-correlated FKs, status transitions, date ordering, or nonnegative financial values.

| Domain | Actual persisted structures | Ownership and lifecycle summary |
| --- | --- | --- |
| Tenant/IAM | Tenant, TenantDomain, Role, RolePermission, TenantMembership, MembershipRole, MembershipScope | Tenant code/domain unique; memberships unique by tenant/user; scope identifiers largely strings/JSON |
| Organization | LegalEntity, Location, Branch, BusinessUnit, Department, CostCenter, Grade, Designation, EmploymentType | Tenant-owned codes; hierarchy/current masters; no effective history or DB tenant/cycle guard |
| Employee | Employee, addresses, emergency contacts, bank accounts | Current master with tenant employee-code uniqueness; current org/manager fields; historical children mostly CASCADE |
| Lifecycle | LifecycleEvent, Onboarding, ProbationReview, EmployeeMovement, EmployeeExit | Movement snapshots preserve before/after when services use them; exit is OneToOne; no employment spell |
| Fiscal/calendar | No fiscal calendar/year/period model | Launch input and JSON/text FY codes only |
| Leave | LeaveType, LeavePolicy, Assignment, Balance, BalanceTransaction, LeaveRequest | Policy-year math in config; mutable period summary; narrow transaction ledger |
| Attendance | Shift, HolidayCalendar/Holiday, AttendancePolicy/Assignment, ShiftAssignment, RosterTemplate/Rollout/Item, AttendanceRecord, Regularization | Daily uniqueness; row lock flag; no monthly close/reopen model |
| Payroll setup | PayrollCalendar/Period, PayGroup/Assignment, SalaryComponent/Structure/Version/Line/EmployeeAssignment | Effective dating and application overlap checks; payroll calendar is not fiscal calendar |
| Statutory/tax | StatutoryPack/Component/Slab/Registration/FilingCalendar, EmployeeStatutoryProfile/Declaration/Item | Strong snapshots/hashes; declaration FY is free-form code |
| Payroll execution | PayrollRun, InputSnapshot, RuleDefinition/Version/Evaluation, Calculation/Line, ValidationIssue, Adjustment, Settlement/Line | Strong run/input/calculation evidence; terminal checks mostly model-level |
| Review/output | RunReview, Exception, Approval, OutputBatch/Artifact, signed grants/access events | Final lock and published snapshots; protected artifacts and checksums |
| Finance/provider | FinanceHandoff, Delivery, CallbackEvent, RetryEvent, Connection, mapping/simulation/certification/job/rehearsal | Rich provider audit and idempotency; no internal accounting-period/payment instruction ledger |
| Jobs | PayrollBackgroundJob, PayrollProviderJob, Celery tasks | Tenant idempotency, bounded retries, row locking, stale recovery |
| Workflow | Template/Step/Assignment, Instance/StepInstance/Assignment/ActionLog | Reusable audit model; runtime action transition lacks transaction/lock/idempotency |
| Documents | Category, RequirementRule, Artifact, EmployeeDocument, VerificationLog, GeneratedLetter | Tenant/employee ownership and version links; physical/history delete semantics are unsafe |
| Configuration | Definition, SeedPackTemplate/Item, TenantConfiguration, ScopedOverride, ChangeLog | Publishable current values and audit JSON; no queryable immutable temporal version chain |

Detailed fields, relationships, ownership, uniqueness, indexes, and delete behavior were inspected through Django `_meta` output (2,473 metadata lines) and model source. Representative source anchors are listed in the risk register rather than reproducing every field here.

## Domain assessment

### Fiscal and year-end

There is no durable fiscal-calendar aggregate. `PayrollCalendar` defines payroll cadence, not finance governance. India launch derives April 1, declarations store codes such as `FY2026-27`, and calculation profiles infer a code. No open/soft-close/hard-close/reopen state exists. See the dedicated calendar design.

### Leave integrity

Policy configuration supports useful enterprise options, but balance operations update summary columns. `submit_leave_request()` is atomic yet does not lock the balance; two transactions can read the same balance and overwrite each other. Approval has the same issue. Direct non-reviewed balance action is not atomic. Carry-forward is recomputed from the previous mutable closing balance and overwritten on refresh. There are no expiry lots or year-end close runs.

### Payroll integrity

Locked source snapshots, calculation attempts, final review lock, immutable published outputs, checksums, provider idempotency, and durable jobs are strong. Required improvements are database-level terminal guards, duplicate regular-run protection, fiscal/accounting mapping, payment instruction reconciliation, and daterange constraints.

### Employee and organization lifecycle

Movement snapshots capture transfers/promotions/reporting changes, but the employee row remains the only canonical organization assignment. Historical answers depend on movement completeness. One exit per employee prevents multiple employment spells. Cross-entity transfer does not atomically transition payroll, leave, attendance, statutory, and finance scope.

### Effective dating

Payroll versions/assignments/packs/slabs and workflow templates have effective ranges. Leave policies have effective dates, but leave/attendance policy assignments do not. Most overlap checks are Python queries and race-prone. Snapshots help historical payroll, but there is no universal temporal resolver that answers which employee assignment and policy applied on a date.

### Tenant integrity and deletion

Services and APIs generally filter by tenant, and payroll models commonly validate related tenant ownership. The physical database does not correlate the tenant FK with related tenant-owned rows. `bulk_create`, `update`, raw SQL, flawed imports, or future code can bypass `full_clean`. CASCADE from tenant/employee/policy is widespread; the provided SoftDeleteModel is unused by core audited models.

### Scale and operations

UUID PKs and targeted payroll-job indexes are sound. High-volume attendance, workflow logs, notification/audit, payroll lines, access events, and leave ledger growth need measured tenant/date/status indexes, partition/archival planning, and backup/restore rehearsal. Retention references are not an implemented retention system.

Celery currently schedules durable payroll background-job dispatch and pending notification processing. No leave year-end, carry-forward/expiry, fiscal close, attendance close, archival, or retention job was found in the configured beat schedule or domain task modules.

## Scenario validation

Status reflects inspected implementation, not intended design.

| # | Scenario | Expected persisted behavior | Actual implementation | Status | Risk / correction / required test |
| ---: | --- | --- | --- | --- | --- |
| 1 | India FY rollover | Explicit Apr-Mar FY and periods; close/open events | Launch defaults Apr 1; no FY rows | FAIL | DBR-001; create fiscal spine; rollover test |
| 2 | Calendar-year tenant | Jan-Dec fiscal calendar | Payroll cadence configurable; no FY | PARTIAL | Persist calendar/year; international test |
| 3 | Legal-entity FY override | Entity calendar version and period mapping | Entity has no fiscal link | FAIL | DBR-001; override precedence test |
| 4 | Duplicate fiscal periods | DB exclusion prevents overlap | No fiscal period model | FAIL | Exclusion constraint race test |
| 5 | Close period | Audited state blocks posting | No internal close | FAIL | DBR-001/008; close matrix |
| 6 | Reopen period | Authorized reason/approval event | No reopen | FAIL | Dual-control test |
| 7 | March payroll paid April | Expense FY and cash period both persisted | Period/pay_date separate; FY inferred | PARTIAL | DBR-020; boundary reconciliation |
| 8 | Change calendar after history | New future version; old immutable | JSON/config can change | FAIL | Versioning test |
| 9 | Historical FY reporting | FK-based stable period grouping | Date/code-based reporting possible | PARTIAL | Backfill and compare reports |
| 10 | Tax year differs from pay period | Explicit tax-year relationship | Free-form FY code | PARTIAL | Tax-year mapping test |
| 11 | Carry 18 capped at 10 | Forfeit 8, carry transaction 10 | Recomputed summary cap | PARTIAL | DBR-003/004; ledger test |
| 12 | Four carried days expire in 90 days | Expiring lot and expiry transaction | No expiry model | FAIL | Worked-example test |
| 13 | Leave used before expiry | Earliest-expiry lot consumption | Aggregate closing balance only | FAIL | Lot allocation test |
| 14 | Rerun leave close | Same idempotency key, no duplicate credit | No close run | FAIL | Scheduler replay test |
| 15 | Failed leave close resumes | Durable per-employee items | No job | FAIL | Worker crash/retry test |
| 16 | Concurrent leave submissions | Locked balance prevents overspend | Atomic request, unlocked balance | FAIL | DBR-002 concurrency test |
| 17 | Concurrent approvals | One transition/consumption | Request/workflow/balance unlocked | FAIL | DBR-002/005 test |
| 18 | Leave approval cancellation | Exact allocation restored | Aggregate consumed amount reduced | PARTIAL | Add allocation/reversal test |
| 19 | Retro approval after year close | Controlled prior-period correction | No close state | FAIL | Closed-period correction test |
| 20 | Cross-year leave | Segments across policy periods | End after policy expiry blocked/start period used | FAIL | DBR-011 test |
| 21 | Mid-year leave policy change | Versioned future assignment | Policy dates; assignment not dated | PARTIAL | DBR-014 temporal test |
| 22 | Anniversary leave year | Employee-specific persisted period | Month/day config only; no anniversary mode | FAIL | DBR-013 test |
| 23 | Join/exit proration | Exact date strategy | Join-month only; no exit proration | PARTIAL | Daily proration test |
| 24 | Negative/advance leave | Bounded debt ledger | Leave type allows negative; aggregate balance | PARTIAL | Limit and reversal test |
| 25 | Leave encashment | Approval and immutable transaction | Supported adjustment transaction | PASS | Existing tests; add concurrent review |
| 26 | Attendance corrected before payroll lock | Correction captured in snapshot | Supported | PASS | Snapshot correctness regression |
| 27 | Attendance corrected after payroll lock | Payroll immutable; correction/close evidence | Snapshot protects payroll; no attendance close | PARTIAL | DBR-015 divergence test |
| 28 | Overnight shift/DST | Tenant-zone instants and dated shift | Runtime supports overnight; timezone discipline | PARTIAL | DST test not verified |
| 29 | Overlapping shift assignment | DB blocks conflicting primary windows | Service previews; no DB constraint | FAIL | Concurrent overlap test |
| 30 | Retro salary increment | Effective version plus arrears adjustment | Versions/adjustments exist | PARTIAL | End-to-end arrears test |
| 31 | Duplicate regular payroll run | DB blocks same period/pay group | Only code unique | FAIL | DBR-007 race test |
| 32 | Off-cycle payroll | Explicit run kind permits controlled duplicate scope | No run-kind field | PARTIAL | Add classification tests |
| 33 | Recalculate locked inputs | New attempt reads same snapshot | Supported | PASS | Hash/reconciliation regression |
| 34 | Edit salary config after approval | Historical output unchanged | Snapshots/artifacts protect result | PASS | Bulk-update bypass test required |
| 35 | Bulk update published artifact | DB rejects mutation | Model clean only | FAIL | DBR-006 bypass test |
| 36 | Full-and-final settlement | Immutable settlement and lines | Supported | PASS | Link to employment spell missing |
| 37 | Duplicate Celery payroll task | Idempotent durable job | Tenant/idempotency unique and locked | PASS | Existing job tests |
| 38 | Worker crash/retry | Stale recovery, bounded attempts | Supported | PASS | Existing tests; monitor in staging |
| 39 | Duplicate provider callback | One callback effect | Provider/idempotency unique | PASS | Existing replay tests |
| 40 | Closed accounting provider response | Local state blocks/records correction | Provider recognizes failure; no local period | PARTIAL | DBR-008 test |
| 41 | Partial bank rejection | Employee payment statuses and reissue | Delivery-level evidence only | PARTIAL | DBR-021 payment ledger test |
| 42 | Corrective finance journal | Linked reversal in open period | No explicit reversal relationship | FAIL | Reversal test |
| 43 | Employee transfer department | Effective historical assignment | Movement snapshot/current row | PARTIAL | DBR-016 temporal test |
| 44 | Employee cross-entity transfer | Atomic dependent transitions | Movement model only | FAIL | DBR-018 orchestration test |
| 45 | Employee rehire | New employment spell | Event exists; exit OneToOne | FAIL | DBR-017 rehire test |
| 46 | Manager change historical approval | Approval keeps actor/scope evidence | Identifier/action log; partial snapshots | PARTIAL | DBR-024 audit test |
| 47 | Simultaneous workflow approve/reject | One terminal decision | No lock/idempotency | FAIL | DBR-005 test |
| 48 | Cross-tenant related FK insertion | Database rejects | Mostly model validation only | FAIL | DBR-009 raw/bulk test |
| 49 | Delete employee with payroll history | Protected/archive behavior | Some payroll FKs PROTECT; many CASCADE | PARTIAL | DBR-010 delete graph test |
| 50 | Ten-year data growth | Indexed/partitioned archive and restore | Limited explicit indexes; no archive lifecycle | NOT VERIFIED | DBR-025/026 volume test |

## Readiness scorecard

| Domain | Score / 5 | Decision |
| --- | ---: | --- |
| Tenant/RBAC isolation | 3.5 | Conditional; API strong, DB relational tenant guards incomplete |
| Organization/employee lifecycle | 2.5 | Not ready for complex history/rehire/transfers |
| Fiscal calendar/year-end | 1.0 | Not ready |
| Leave policy/accrual | 3.0 | Functional but year-end/concurrency unsafe |
| Attendance | 3.0 | Functional; close/history controls incomplete |
| Payroll calculation/snapshots | 4.2 | Strong |
| Payroll review/output/artifacts | 4.1 | Strong with DB immutability caveat |
| Finance/payment/year-end | 2.2 | Not ready for controlled fiscal posting/payment lifecycle |
| Workflow/audit | 2.8 | Audit present; concurrency/authorization evidence incomplete |
| Background jobs/idempotency | 4.3 | Strong |
| Data retention/archival | 1.8 | Not ready |
| Database constraints/concurrency | 2.0 | Not ready |

Overall architecture readiness: **2.8 / 5 — NOT READY** for production customer data. This decision is driven by P0 integrity controls, not feature breadth.

## Priority action

Freeze production onboarding until DBR-001 through DBR-010 are either remediated and independently tested or explicitly risk-accepted by finance, security, and product owners. The phased implementation sequence is in `hrms-database-remediation-roadmap.md`.
