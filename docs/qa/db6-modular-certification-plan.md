# DB-6 Modular Browser-First Business Workflow Certification Plan

Date: 2026-10-17  
Scope: local production-built application, PostgreSQL 16, Redis/Celery where applicable  
Production readiness: out of scope

## Baseline and evidence policy

DB-6 preserves the frozen Phase 3 inventory of 963 unique Playwright IDs (957 passed and 6 justified skips) and the DB-1 through DB-5 evidence. Existing results are reused only where they prove the same invariant. Every DB-6 scenario has a new stable ID and one current status in `db6-workflow-execution-register.csv`; historical attempts remain append-only in workflow evidence.

A workflow can pass only when all applicable layers are evidenced:

1. A production-built browser initiates the user-facing operation.
2. An independently authenticated API read verifies the public contract and tenant scope.
3. PostgreSQL verifies persisted state, constraints, history, and bypass resistance.
4. Celery/Redis evidence verifies scheduled or durable work where applicable.
5. Cleanup proves that only DB-6-owned synthetic data was removed.

An existing Playwright result cannot substitute for a missing PostgreSQL concurrency test, and a backend test cannot substitute for a required browser journey. Interrupted, skipped, or unexecuted work is never counted as passed.

## Workflow dependency order

| Order | Workflow | Depends on | Certification boundary |
|---:|---|---|---|
| 1 | DB-6.1 Tenant Onboarding and Subscription | DB-1 to DB-5 controls | Disposable tenant, subscription, first admin, entitlements, audit and cleanup |
| 2 | DB-6.2 Organization and Legal Entity Setup | 6.1 | Tenant-owned legal entity and organization graph |
| 3 | DB-6.3 Fiscal Calendar and Accounting Periods | 6.1, 6.2, DB-2 | Effective fiscal years, periods, close/reopen and posting guards |
| 4 | DB-6.4 Leave and Year-End | 6.2, 6.3, DB-3/3A | Leave years, lots, ledger, rollover, expiry and corrections |
| 5 | DB-6.5 Attendance and Monthly Close | 6.2, 6.3 | Shift/roster precedence, attendance derivation and close |
| 6 | DB-6.6 Employee Lifecycle | 6.2 to 6.5, DB-5 | Effective-dated employment history and governed transitions |
| 7 | DB-6.7 Salary and Payroll Configuration | 6.2, 6.3, 6.6 | Pay group/calendar alignment, salary and statutory versions |
| 8 | DB-6.8 ESS Workflows | 6.4 to 6.7 | Employee-owned leave, attendance, documents, declarations and payslips |
| 9 | DB-6.9 MSS Workflows | 6.4 to 6.8 | Scoped queues and race-safe decisions |
| 10 | DB-6.10 Payroll Processing and Approval | 6.3, 6.5 to 6.9 | Inputs, calculation, review, lock and durable jobs |
| 11 | DB-6.11 Outputs, Payments and Finance | 6.10 | Artifacts, publication, handoff, callbacks and reconciliation |
| 12 | DB-6.12 Governance and Offboarding | 6.1 to 6.11, DB-4/4B | Retention, holds, exports, erasure governance and archival |
| 13 | DB-6.13 Connected Lifecycle | 6.1 to 6.12 | Cross-module causal consistency and rollback |
| 14 | DB-6.14 Multi-Year Integrity | all prior workflows | Multi-year reconciliation, migration and final integrity decision |

Execution stops after DB-6.1 for review. Later workflows remain `Not Run`; scenarios that require an unapproved business rule remain `Blocked` rather than receiving an invented default.

## Deterministic fixture design

Each workflow receives a unique `db6-<workflow>-<run>` ownership tag. Provisioning uses supported APIs or `manage_playwright_workspace`; mutable suites never use Northstar. IDs are resolved from create responses or exact ownership tags, never display-name searches or first-page option lists.

| Fixture | Deterministic definition |
|---|---|
| Tenant | sandbox Enterprise tenant, unique code/domain, Asia/Kolkata, country IN |
| Identities | one Platform Admin control identity plus tenant-scoped Tenant Admin, HR Admin, MSS and ESS identities with explicit roles |
| Organization | one legal entity, branch, department, grade, designation and cost center, all tenant-owned |
| Calendar | explicit calendar-year and April-March fixtures; periods use fixed dates and matching calendar IDs |
| Employees | stable codes per scenario; no reliance on paginated option endpoints |
| Leave/attendance | explicit policy period, effective date, assignment scope, shift and roster ownership |
| Payroll | Enterprise entitlement, deterministic pay group/calendar/period, salary/statutory assignments and isolated run |
| Governance | synthetic records only; irreversible erasure disabled; legal policy decisions remain blocked |

Cleanup is ownership-based and verified by PostgreSQL counts for tenant, membership, artifacts and jobs. Ambiguous historical records are never mutated.

## Existing coverage map

The matrix references the exact source tests and frozen IDs. Principal reusable evidence includes:

- DB-6.1: P3-0710, P3-0714, P3-0720, P3-0743, P3-0773, P3-0880 through P3-0885; platform tenant creation, public signup, negative security and onboarding backend suites.
- DB-6.2: organization CRUD/setup/import specs and DB-4 tenant-integrity tests.
- DB-6.3: DB-2 PostgreSQL tests plus payroll calendar/period browser and API cases.
- DB-6.4: DB-3/3A PostgreSQL/API/browser tests plus leave workflow suites.
- DB-6.5: attendance policy, roster, shift, derivation, regularization and close suites.
- DB-6.6: employee lifecycle/workforce suites and DB-5 effective-date tests.
- DB-6.7: payroll setup, salary structure, assignment, statutory and policy specs.
- DB-6.8/6.9: ESS and MSS workflow, permissions and responsive suites.
- DB-6.10/6.11: payroll input-lock, calculation, review, publication, finance, provider and durable-job suites.
- DB-6.12: DB-4/4A/4B PostgreSQL/API/browser governance suites.
- DB-6.13/6.14: connected payroll scenario, tenant-isolation, multi-year DB remediation and frozen regression evidence.

The frozen manifest remains the test-level inventory; the DB-6 matrix is the deduplicated business-scenario layer above it.

## Evidence and status rules

- `Passed`: every required evidence layer completed and expected persisted outcome matched.
- `Failed`: an executed assertion or invariant did not hold.
- `Blocked`: execution cannot proceed without an approved policy, safe environment, or external dependency.
- `Skipped`: only an explicitly justified, pre-existing exclusion; DB-6 does not create convenience skips.
- `Not Run`: no qualifying execution evidence yet.

Failures are classified as product defect, automation drift, fixture/environment, or unresolved policy. P0 security, financial integrity, cross-tenant, or irreversible-history failures stop broader execution immediately.

## Known policy blockers retained

1. Cross-entity transfer treatment for leave, payroll, statutory jurisdiction and service continuity.
2. Rehire continuity and linkage of historical exits to employment spells.
3. Post-expiry leave cancellation treatment where restoration would recreate expired entitlement.
4. Ambiguous historical fiscal, leave-year and effective-date classification.
5. Jurisdiction-approved retention durations, protected export storage, backup legal-hold propagation and irreversible erasure authorization.

These are represented explicitly in the matrix and cannot be converted to passes by fixture assumptions.

## DB-6.1 execution gate

DB-6.1 requires: browser-created tenant, subscription and onboarding state; first-admin access; server-side entitlement and RBAC denials; duplicate/concurrent create behavior; persisted audit evidence; same-tenant access; cross-tenant denial; and verified cleanup. The run uses one Playwright worker and a disposable PostgreSQL database. No DB-6.2 action begins until DB-6.1 is reported.
