# HRMS STG-136 Batch 13 Recovery And Security Certification

Date: 2026-10-27\
Runner revision: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus reviewed uncommitted campaign changes\
Environment: isolated PostgreSQL 16, Redis 7, Django, Celery worker/beat and production-built Next.js 15.5.28\
Decision: **PASS locally**

## Frozen Results

| ID | Result | Executed evidence |
|---|---|---|
| STG-E2E-1301 | Passed | Browser preserved the leave draft across an expired session and completed only after real reauthentication. |
| STG-E2E-1302 | Passed | Logout invalidated the protected mutation; the stale session received HTTP 401. |
| STG-E2E-1303 | Passed | ESS was redirected from HR Admin and privileged API access failed closed. |
| STG-E2E-1304 | Passed | A second owned tenant's employee ID returned scoped denial and never appeared as the actor's profile. |
| STG-E2E-1305 | Passed | Duplicate mutation replay returned the canonical resource and retained one business effect. |
| STG-E2E-1306 | Passed | A committed leave request with a deliberately lost response replayed HTTP 201 with one persisted request. |
| STG-E2E-1307 | Passed | Browser-created payroll job survived reload and completed through Celery worker/beat with the same durable job ID. |
| STG-E2E-1308 | Passed | PostgreSQL regressions proved bounded retry, transaction rollback and no duplicate payroll, leave, attendance, import or governance effects. |
| STG-E2E-1309 | Passed locally | Isolated stale-worker and lost-heartbeat recovery requeued the same job; retry completed without duplicate financial mutation. This is not staging interruption evidence. |
| STG-E2E-1310 | Passed | Actor/tenant/action/outcome audit assertions passed; backend/worker log scan found zero password, authorization-header, token-cookie or database-secret matches. |

Totals: **10 Passed, 0 Failed, 0 Blocked, 0 Not Run locally**. Shared staging remains **0 Passed / 136 Not Run**.

## Execution Evidence

- Production-built Playwright composite: **5/5 passed** in 1.1 minutes with one worker.
- PostgreSQL/API/security/concurrency selection: **21/21 passed** in 98.64 seconds.
- Durable payroll job: browser HTTP 202 acceptance, reload restoration, terminal `succeeded`, and exact completed/total count reconciliation.
- Celery: worker and beat used the isolated Redis broker; outbox dispatch required beat and did not fabricate completion while dispatch was unavailable.
- Recovery: stale execution, stale worker lease, retryable failure, partial-mutation rollback, concurrent leave replay, approve/reject race and duplicate payroll run protection passed.
- Security: cross-role UI denial, cross-tenant API denial, session invalidation, permission revocation and nested tenant-scope database guards passed.
- Static gates: TypeScript, focused ESLint, Django checks, migration drift, `git diff --check` and production frontend build passed.

Two initial attempts are retained as non-passing environment evidence: the first had no persistent frontend process; the second lacked a correctly rooted Celery worker and then Celery beat. Neither was counted. The final stack included PostgreSQL, Redis, Django, worker, beat and the production frontend.

## Changes

- Added `web/tests/e2e/stg136-batch13-recovery-security.spec.ts` for frozen cross-role/cross-tenant and durable-job browser evidence.
- No application business logic, migration, payroll calculation, authorization rule or retry policy changed.
- The protected payroll Playwright diff remained unchanged at `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`.

## Cleanup

Every browser workspace used ownership markers and exact-ID teardown. Final checks found zero `pw-qa-%` tenants, zero owned users, zero payroll background jobs, zero payroll artifacts and Redis queue length zero. Task processes and containers were removed after evidence capture.

This local PASS does not certify shared staging interruption, provider recovery or production readiness.
