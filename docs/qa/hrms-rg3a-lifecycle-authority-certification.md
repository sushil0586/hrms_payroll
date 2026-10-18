# HRMS/Payroll RG-3A Lifecycle And Authority Certification

Date: 2026-10-18  
Decision: **CONDITIONAL**  
Production readiness: **NO-GO**

## Frozen Gate Reconciliation

| Gate | Priority | RG-3A outcome | Disposition |
|---|---:|---|---|
| `DDG-F-002` | P0 | Blocked | Cross-legal-entity transfer remains fail-closed pending approved service, leave, tax, payroll and fiscal continuity rules. |
| `DDG-F-003` | P0 | Blocked | Rehire remains blocked pending identity, service and benefit-continuity policy. |
| `DDG-F-007` | P1 | **Verified** | Connected browser policy edit left the closed attendance snapshot hash and payload unchanged; close/reopen and payroll-reference guards passed. |
| `DDG-F-008` | P1 | Blocked | Overtime-to-payroll remains disabled pending eligibility, approval, rate and conversion rules. |
| `DDG-F-013` | P1 | Partial | Sequential workflow races remain protected; parallel quorum semantics are unapproved. |
| `DDG-F-014` | P1 | Blocked | Delegation remains disabled pending scope, duration, grant and revocation policy. |
| `DDG-F-015` | P1 | Blocked | Automated escalation remains disabled pending SLA and fallback ownership. |
| `DDG-F-016` | P0 | Blocked | Pending-request manager reassignment remains fail-closed/manual pending approved ownership rules. |
| `DDG-F-017` | P1 | Partial | Effective-dated employee assignments resolve correctly; temporal master rename/reparent semantics remain unapproved. |
| `DDG-F-018` | P1 | Partial | As-of employee assignments exist; historical naming and allocation report semantics remain unapproved. |
| `DDG-F-019` | P1 | Partial | Tenant and hierarchy constraints plus active-reference deactivation checks remain sound; concurrent archive-versus-assignment outcome remains unapproved. |
| `DDG-F-025` | P1 | Partial | Plan downgrade remains excluded pending commercial enforcement policy and connected evidence. |
| `DDG-F-026` | P1 | Partial, defect fixed | Concurrent launch retries now create one run. Real external failure/resume remains dependent on approved staging provider contracts. |

Current unique totals: **1 Verified, 6 Partial, 6 Blocked, 0 Not Started**.

## Confirmed Defects And Remediation

### Concurrent tenant launch replay

`TenantLaunchRun` had a non-unique idempotency index and launch apply performed a lookup followed by create. Concurrent requests with the same key could both pass the lookup.

Remediation:

- added conditional PostgreSQL uniqueness for `(tenant, run_type, idempotency_key)` when the key is nonblank;
- added a migration preflight that stops on ambiguous existing duplicates rather than deleting or merging them;
- locked the tenant onboarding row before replay detection and run creation;
- retained canonical response replay for an already completed key;
- added a real PostgreSQL concurrent-creation regression.

### Synthetic attendance-history teardown

The ownership-verified disposable workspace teardown did not account for protected attendance-close events. Browser behavior passed, but cleanup failed and therefore the run was not counted.

Remediation:

- explicitly removes attendance-close events and close rows in dependency order inside the existing authorized synthetic teardown capability;
- permits event deletion only when PostgreSQL session state is `hrms.synthetic_tenant_teardown = authorized`;
- leaves ordinary update/delete attempts append-only and rejected.

No employee, attendance, payroll, leave, manager-authority or organization business rule changed.

## Browser, API And PostgreSQL Evidence

### DDG-F-007 connected history

The production-built browser:

1. provisioned an isolated Enterprise workspace;
2. imported one employee attendance row;
3. reconciled, submitted, approved and closed March 2029 attendance;
4. captured the close ID, status, snapshot hash and reconciliation payload;
5. edited the governing attendance policy through the HR Admin UI;
6. fetched the close through the authenticated API and proved status, hash and payload were unchanged;
7. removed the disposable tenant through ownership-verified teardown.

Result: **1 Playwright test passed in 33.4 seconds**. Earlier runs with an incorrect local API base and the pre-remediation teardown failure remain historical failed evidence and are not counted.

### Focused PostgreSQL regression

- tenant launch canonical replay and new lifecycle/history tests;
- monthly attendance close, stale reconciliation, tenant scope and payroll snapshot linkage;
- atomic organization import, rollback, cross-tenant denial and concurrent duplicate-code protection.

Result: **12 passed**. The initial focused run before the onboarding replay addition was **11 passed** and is retained as supporting history.

Verified outcomes include:

- one concurrent launch run per nonblank tenant/run-type/idempotency identity;
- future assignment does not alter the employee's current projection prematurely;
- business-date resolution returns the correct current and future department;
- cross-tenant employment assignment is rejected by PostgreSQL;
- closed attendance is immutable until governed reopen;
- a reopened close cannot silently continue as a payroll input source;
- organization import failure rolls back its dependency graph.

## Migration And Build Verification

- `tenant_onboarding.0004` forward, rollback to `0003`, and reapply: passed.
- `attendance.0012` forward, rollback to `0011`, and reapply: passed.
- Django system check: passed.
- Migration drift: none.
- TypeScript: passed.
- ESLint: passed.
- Production frontend build: passed with the pre-existing `globals.css` autoprefixer warning.
- Production backend Docker image build: passed; temporary validation image removed.

A neighboring legacy DB-6 browser case was not counted because it targets the unavailable shared `nisha.rao` fixture. Its disposable tenant was cleaned successfully. Equivalent close/reopen service coverage passed in PostgreSQL and the new isolated RG-3A browser flow passed.

## Modified Files

- `backend/apps/tenant_onboarding/models.py`
- `backend/apps/tenant_onboarding/api_views.py`
- `backend/apps/tenant_onboarding/migrations/0004_tenantlaunchrun_idempotency.py`
- `backend/apps/attendance/migrations/0012_allow_owned_synthetic_close_teardown.py`
- `backend/apps/common/management/commands/manage_playwright_workspace.py`
- `backend/tests/test_rg3a_lifecycle_authority_integrity.py`
- `web/tests/e2e/rg3a-lifecycle-authority-certification.spec.ts`
- `docs/qa/hrms-release-gate-execution-tracker.csv`
- this report and RG-3A execution evidence.

## Remaining Decisions

The following behavior was not implemented because no approved rule exists:

- cross-legal-entity transfer and rehire continuity;
- overtime eligibility/rate/payroll conversion;
- parallel approval quorum;
- delegation grant, scope, duration and immediate revocation contract;
- escalation SLA and fallback owner;
- pending approval ownership after manager movement;
- temporal organization-master rename/reparent and historical naming semantics;
- archive-versus-assignment winner under concurrency;
- subscription downgrade behavior;
- provider-backed onboarding failure/resume.

These operations retain their documented disabled, sequential-only, current-state-only, supervised, or fail-closed pilot treatment.

## Exact Commands

```bash
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55466 \
POSTGRES_DB=hrms_rg3a POSTGRES_USER=hrms POSTGRES_PASSWORD=rg3a-test \
.venv/bin/pytest -q \
  backend/apps/tenant_onboarding/tests.py::PlatformLaunchBlueprintApiTests::test_launch_apply_runs_only_certified_safe_seeders \
  backend/tests/test_rg3a_lifecycle_authority_integrity.py \
  backend/tests/test_db6_attendance_close_integrity.py \
  backend/tests/test_dd8_organization_history_integrity.py

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 DJANGO_SETTINGS_MODULE=config.settings.base \
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55466 POSTGRES_DB=hrms_rg3a \
POSTGRES_USER=hrms POSTGRES_PASSWORD=rg3a-test \
pnpm --dir web exec playwright test \
  tests/e2e/rg3a-lifecycle-authority-certification.spec.ts \
  --workers=1 --trace=retain-on-failure

pnpm --dir web typecheck
pnpm --dir web lint
HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web build
```

## Decision

RG-3A is **CONDITIONAL**. The attendance-history verification gap is closed and a real onboarding replay race is fixed, but six policy-dependent gates remain blocked and six gates remain partial. RG-3B and RG-4 were not started. Real-payroll production readiness remains **NO-GO**.
