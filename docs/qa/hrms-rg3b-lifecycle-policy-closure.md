# HRMS/Payroll RG-3B Lifecycle And Policy-Gate Closure

Date: 2026-10-18  
Decision: **CONDITIONAL**  
Production readiness: **NO-GO**

## Frozen Gate Reconciliation

RG-3 retains its 13 original gate IDs. No gate was renumbered or added.

| Gate | Priority | RG-3B status | Executed disposition |
|---|---:|---|---|
| `DDG-F-002` | P0 | Blocked | Cross-legal-entity movement fails inside the locked transaction; no resulting assignment or history mutation is left behind. Continuity policy remains unapproved. |
| `DDG-F-003` | P0 | Blocked | Fixed a fail-open path: completing rehire onboarding now returns an actionable 400 before employee status, joining date, or lifecycle history changes. |
| `DDG-F-007` | P1 | Verified | RG-3A closed this gate; closed attendance snapshots remain immutable after policy edits. |
| `DDG-F-008` | P1 | Blocked | Overtime evidence is not converted to payroll without approved eligibility, approval, rate, and conversion rules. |
| `DDG-F-013` | P1 | Partial | Sequential workflows remain serialized and idempotent. Parallel mode is now rejected by configuration and runtime guards. Quorum semantics remain unapproved. |
| `DDG-F-014` | P1 | Blocked | Delegation configuration and runtime actions now fail closed. Grant, validity, and revocation policy remains unapproved. |
| `DDG-F-015` | P1 | Blocked | Escalation configuration and runtime actions now fail closed. No Celery escalation is claimed without SLA/fallback policy. |
| `DDG-F-016` | P0 | Blocked | Immediate role revocation denies an already-open browser decision and direct retry. Pending-request ownership after manager movement remains unapproved. |
| `DDG-F-017` | P1 | Partial | Effective employee assignments resolve by business date; future assignments do not alter current projection. Temporal master rename/reparent is unsupported. |
| `DDG-F-018` | P1 | Partial | Current-state reports remain the only certified mode; historical naming/allocation semantics remain unapproved. |
| `DDG-F-019` | P1 | Partial | Tenant, hierarchy, import-concurrency, and referenced-record restrictions pass. Archive-versus-assignment winner remains unapproved. |
| `DDG-F-025` | P1 | Partial | Fixed a fail-open downgrade path: entitlement/limit-reducing plan changes are rejected before tenant or audit mutation. Governed downgrade remains unapproved. |
| `DDG-F-026` | P1 | Partial | Local concurrent launch replay remains unique and idempotent. External provider interruption/resume remains staging-dependent. |

Unique totals: **1 Verified, 6 Partial, 6 Blocked, 0 Not Started**.

## Confirmed Defects And Fixes

### Rehire continuity fail-open

An exited employee marked eligible for rehire could be completed through onboarding. The path reactivated the same employee and rewrote `date_of_joining` without a governed employment-spell continuity policy. Completion now fails before mutation. Existing eligibility/date validation is retained, and ordinary first-time onboarding is unchanged.

### Unsupported workflow authority exposure

The template API/UI exposed parallel, delegation, and escalation configuration while the runtime had no approved quorum, grant/revoke, or fallback-owner semantics. The generic resolver also accepted unsupported actions. The serializer, template UI, instance creation, and resolver now fail closed. Stored templates remain readable; supported sequential approval is unchanged.

### Subscription downgrade fail-open

The commercial API could immediately move a tenant to a plan that removed entitlements or reduced finite limits. It now compares the configured current and target plans and rejects a reducing change before saving the tenant, configuration, snapshots, or audit event. Upgrades and non-reducing changes remain available.

## Browser, API And PostgreSQL Evidence

- Production-built RG-3B Playwright: final strict non-persistence run **1 passed in 30.3 seconds**; the preceding corrected run also passed in 26.8 seconds.
- Historical first browser run: **1 failed** because the test used mutation-only Next proxy routes for GET verification; the three denial assertions had passed. The corrected run verified non-persistence with a valid same-code create and rendered before/after subscription state.
- Neighboring MSS approval/revocation Playwright: **2 passed in 35.5 seconds**.
- RG-3B focused API/PostgreSQL: **9 passed**.
- Integrated lifecycle/workflow/organization PostgreSQL: **18 passed**.
- Subscription and entitlement regression: **2 passed**.
- Earlier RG-3A focused regression retained: **13 passed**.

The executed browser evidence proves:

1. only sequential mode is offered for a new workflow template;
2. escalation and delegation controls are visibly disabled;
3. direct parallel, delegation, and escalation API submissions each return 400;
4. rejected submissions reserve no template identity;
5. a valid sequential template can subsequently use the same base identity;
6. an Enterprise-to-Starter downgrade returns 400 and the rendered plan remains unchanged;
7. failed manager decisions preserve notes and retry safely;
8. role revocation immediately blocks an already-open MSS decision and direct API retry.

## Policy Decision Package

| Capability | Existing safe behavior | Approval required | Owners | Post-approval implementation/evidence | Pilot treatment |
|---|---|---|---|---|---|
| Cross-entity transfer | Transaction rejects before assignment mutation | Service continuity, leave balances, tax jurisdiction, payroll/fiscal cutover | HR, Payroll, Tax, Legal | Multi-module transfer transaction, effective-date UI, PostgreSQL concurrency/history, payroll/leave reconciliation | Exclude |
| Rehire | Completion rejected; exited identity/history preserved | Identity reuse, new spell, service/benefit continuity, access restoration | HR, Payroll, Security | New-spell model/service, onboarding UI, ESS access, leave/payroll history tests | Exclude |
| Overtime payroll | No automatic payroll conversion | Eligibility, approval chain, rate/effective date, statutory treatment | HR, Payroll, Legal | Approved rule tables, maker/checker workflow, immutable payroll input, exact oracle | Exclude |
| Parallel approval | Sequential only; parallel rejected | Quorum, mixed approve/reject, cancellation and completion semantics | Business process owners, Security | Assignment-level decisions, quorum constraints, multi-actor browser/PostgreSQL races | Exclude |
| Delegation | Configure/execute rejected | Scope, duration, grantor, revocation, conflict and audit rules | HR governance, Security | Time-bounded grants, immediate revocation, queue/API authorization tests | Exclude |
| Escalation | Configure/execute rejected; no background dispatch | SLA clock, fallback owner, reassignment and duplicate-dispatch rules | HR operations, Security | Durable Celery dispatch, uniqueness, retry/recovery, browser queue evidence | Exclude |
| Pending approval reassignment | Existing authority revocation is immediate; ownership is not auto-moved | Old/new manager authority by request/business date and manual disposition | HR governance, Security | Explicit reassignment transaction, immutable audit, manager-switch browser and race tests | Exclude; manual disposition only |
| Temporal organization masters | Employee movements are effective-dated; master restructure disabled | Versioned name/reparent semantics and payroll/report resolution | HR architecture, Finance analytics | Temporal master schema, overlap guards, boundary-date UI/API/report tests | Exclude future restructure |
| Historical reporting | Current-state reports only | As-of naming, allocation and restatement semantics | HR analytics, Finance | As-of API/export contract and independent historical totals | Exclude as-of claims |
| Archive versus assignment | Referenced archive is restricted | Required winner/retry contract under concurrency | HR architecture | Locked service transition and PostgreSQL race/browser recovery | Serialize administration |
| Subscription downgrade | Reducing plan changes rejected before mutation | Over-limit handling, grace periods, workflow continuity, restoration | Commercial, Tenant operations, Security | Governed change request, preview, audit, concurrent workflow/browser tests | No downgrade |
| External onboarding recovery | Local replay is unique/idempotent | Provider contracts, timeout/retry and compensating-action ownership | Platform operations, Security | Staging provider fault injection, durable recovery, role/seed count evidence | Supervised onboarding |

## Verification Commands

```bash
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55467 \
POSTGRES_DB=hrms_rg3b POSTGRES_USER=hrms POSTGRES_PASSWORD=rg3b-test \
.venv/bin/pytest -q backend/tests/test_rg3b_lifecycle_policy_closure.py \
  backend/tests/test_rg3a_lifecycle_authority_integrity.py \
  backend/tests/test_dd7_workflow_integrity.py \
  backend/tests/test_dd8_organization_history_integrity.py \
  backend/tests/test_db5_effective_employment_integrity.py::test_cross_entity_transfer_fails_closed_without_policy_decisions

PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3121 \
PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8018/api/v1 \
pnpm --dir web exec playwright test \
  tests/e2e/rg3b-lifecycle-policy-closure.spec.ts \
  --workers=1 --trace=retain-on-failure --reporter=line

PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3121 \
PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8018/api/v1 \
pnpm --dir web exec playwright test \
  tests/e2e/dd7-approval-delegation-certification.spec.ts \
  --workers=1 --trace=retain-on-failure --reporter=line

pnpm --dir web typecheck
pnpm --dir web exec eslint \
  src/app/hr-admin/workflow-templates/form-values.ts \
  src/app/hr-admin/workflow-templates/workflow-template-form.tsx \
  tests/e2e/rg3b-lifecycle-policy-closure.spec.ts
.venv/bin/python backend/manage.py check
.venv/bin/python backend/manage.py makemigrations --check --dry-run
HRMS_API_BASE_URL=http://127.0.0.1:8018/api/v1 pnpm --dir web build
docker build -f backend/Dockerfile -t hrms-rg3b-backend-check .
```

## Modified Files

- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `backend/apps/common/selectors.py`
- `backend/apps/workflows/services.py`
- `backend/tests/test_phase0_api_smoke.py`
- `backend/tests/test_rg3b_lifecycle_policy_closure.py`
- `web/src/app/hr-admin/workflow-templates/form-values.ts`
- `web/src/app/hr-admin/workflow-templates/workflow-template-form.tsx`
- `web/tests/e2e/rg3b-lifecycle-policy-closure.spec.ts`
- `docs/qa/hrms-release-gate-execution-tracker.csv`
- this report and its evidence index.

## Decision

RG-3B is **CONDITIONAL**. All locally actionable fail-open behavior found in this pass is closed and supported sequential/history controls remain green. The frozen status totals do not improve because the remaining acceptance criteria require explicit business policy or staging-provider evidence, neither of which was invented. Restricted synthetic/shadow use may retain the documented exclusions. Real-payroll production readiness remains **NO-GO**. RG-4 was not started.
