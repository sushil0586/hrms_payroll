# DD-6 ESS and MSS Deep Domain Certification

Date: 2026-10-18  
Environment: isolated PostgreSQL 16, Django production settings, production-built Next.js 15  
Decision: **CONDITIONAL**

## Frozen Scope

The original 81-scenario matrix defines DD-6 as **ESS and MSS gaps**. Its frozen IDs are `DD-SS-001` through `DD-SS-008`; no IDs were added, renamed or renumbered.

| ID | Outcome | Evidence |
| --- | --- | --- |
| DD-SS-001 | Verified | Retained DB-6.8/6.9/6.13 leave submission, manager decision and ledger evidence. |
| DD-SS-002 | Verified | Retained regularization routing, intended-row update and attendance/payroll evidence. |
| DD-SS-003 | Verified | Retained tenant, employee and effective manager visibility evidence. |
| DD-SS-004 | Verified | Retained payslip, statutory, document and notification self-service history evidence. |
| DD-SS-005 | Verified | Real logout produced 401 while the open leave draft remained intact; browser re-login restored authorization and retry persisted exactly one request. |
| DD-SS-006 | Verified | Mobile 390x844 reduced-motion flow opened the compact manager dialog by keyboard, exposed its accessible name and controls, restored focus on Escape, and had no horizontal overflow. |
| DD-SS-007 | Verified | A manager with employee context had tenant-scoped ESS and MSS access, no HR/Tenant Admin access, personal ESS navigation and the correct direct-report approval queue. |
| DD-SS-008 | Partial | Offline-before-commit retry and duplicate activation are safe. A committed request whose response is lost remains single, but retry returns an overlap conflict instead of replaying the original success. |

Counts: **7 Verified, 1 Partial, 0 Missing, 0 Blocked, 0 Failed, 0 Not Run**.

## Route And Integrity Mapping

- Browser routes: `/login`, `/workspace-access`, `/ess`, `/ess/leave`, `/mss/approvals`.
- Browser mutation: `POST /api/me/leave-requests`.
- Independent APIs: `GET /api/v1/auth/session/`, `GET /api/v1/me/leave-requests/`, `GET /api/v1/manager/leave-requests/pending/`.
- Services/models: session workspace resolution, `TenantMembership`, `MembershipRole`, employee context, leave submission, workflow assignments, manager-scope selectors, leave balance reservations and immutable ledger movements.
- Downstream controls: active-request overlap protection, manager workflow routing, tenant ownership, duplicate workflow-decision guards and attendance/payroll evidence retained from DB-6.
- Celery: not applicable to these synchronous ESS/MSS mutations. No Celery evidence is claimed.

## Executed Browser Evidence

The final batch ran three tests with one Playwright worker against the production build:

1. Connection reset before server commit preserved all form input. Actual logout then produced `Not authenticated`; the same open form retained its dates and reason. Login through the browser in the same context restored the session. A rapid double activation produced one successful request.
2. The lost-response boundary executed the real POST to completion and then severed the browser response. PostgreSQL/API retained exactly one leave request. Replay was rejected by the active-overlap guard, proving integrity but also proving the absence of transparent idempotent recovery.
3. The manager session resolved to the disposable tenant with `ess=true`, `mss=true`, `hr_admin=false`, and `tenant_admin=false`. Both workspaces loaded. The owned employee's pending leave appeared in the manager queue; compact keyboard/dialog and reduced-motion checks passed.

Final Playwright result: **3 passed in 27.7 seconds**. Initial locator and verification-URL failures are retained in logs `005` and `006` and are not counted as product failures or passes.

## PostgreSQL And API Regression

Nine focused tests passed on PostgreSQL:

- anonymous ESS/HR/MSS reads rejected;
- manager session exposes ESS and MSS only;
- assigned workflow approver receives scoped MSS access;
- exact/range duplicate leave requests rejected;
- multi-level leave routing remains ordered;
- ESS/MSS attendance regularization approval-track tests;
- workflow decision replay is idempotent;
- concurrent approve-versus-reject permits exactly one outcome.

No cross-tenant access, duplicate leave, duplicate workflow action, ledger duplication or authorization widening was observed.

## Confirmed Defects And Changes

No new application defect required source remediation. The initial browser failures were stale test assumptions about the current shared dialog name and mutation-only Next.js proxy methods. The certification test was corrected to use the established accessible dialog locator and Django's authenticated APIs for independent reads.

Added:

- `web/tests/e2e/dd6-ess-mss-domain-certification.spec.ts`

Updated:

- `docs/qa/hrms-deep-domain-scenario-matrix.csv`
- `docs/qa/hrms-deep-domain-gap-register.csv`

## Verification Summary

```text
Production-built Playwright:  3 passed
Focused PostgreSQL/API tests: 9 passed
TypeScript:                   passed
Focused ESLint:               passed
Django checks:                passed
Migration drift:              none
Production frontend build:    passed (existing autoprefixer warning only)
```

## Remaining Technical Decision

`DD-SS-008` requires a cross-workflow idempotency contract for ordinary ESS/MSS mutations: client-generated keys, tenant/actor/operation scoping, persisted response replay, bounded retention, payload mismatch rejection and audit treatment. Implementing that contract is an architectural decision and was not improvised during certification. Existing overlap and workflow guards continue to prevent duplicate business effects.

DD-6 is **CONDITIONAL**. Integrity and authorization remained intact, but seamless recovery after a committed mutation with a lost response is not yet certified. Production readiness is not claimed.
