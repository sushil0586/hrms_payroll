# Phase 5E Durable Payroll Background Jobs and Progress Certification

Date: 2026-10-16  
Environment: production-built isolated local Docker  
Decision: **PASS for Phase 5E local Docker scope**  
Production readiness: **not claimed**

## Scope and architecture

Phase 5E moved the long-running draft calculation, output generation, output publication, and finance-handoff generation paths behind the existing Celery infrastructure. Existing synchronous API behavior remains the default for compatibility. Clients opt in with `execution_mode: "async"` and receive HTTP 202 with a tenant-scoped job document and status/retry URLs.

`PayrollBackgroundJob` is the durable database outbox and execution ledger. It records operation, target records, requester, idempotency key, Celery task ID, queued/started/heartbeat/completed timestamps, attempts, stage, real item totals, result data, and categorized errors. Status values are `queued`, `running`, `succeeded`, and `failed`; retry eligibility is explicit and bounded.

The API commits a queued job without contacting Redis. Celery beat dispatches pending outbox records every two seconds. This prevents broker connection retries from blocking HTTP requests and permits recovery after broker interruption. Each payroll operation and its terminal job state commit in the same database transaction. Tasks use late acknowledgement, worker-loss rejection, bounded retries, soft/hard limits, row locking, stale-heartbeat recovery, and operation/target/client-key idempotency.

The compact UI persists active job metadata in browser storage, restores it after reload/navigation, polls the secure status endpoint, disables duplicate actions while active, announces state through live regions, displays only real stages/item counts, and offers retry only for failed retryable jobs.

## API contract

- Existing action endpoints remain synchronous unless `execution_mode: "async"` is supplied.
- Accepted asynchronous requests return HTTP 202 with `{ job, detail }`.
- `GET /api/v1/hr-admin/payroll-jobs/` lists only operations allowed by the caller's current tenant permissions.
- `GET /api/v1/hr-admin/payroll-jobs/<id>/` returns tenant-scoped durable state.
- `POST /api/v1/hr-admin/payroll-jobs/<id>/retry/` queues only failed, retryable jobs.
- `Idempotency-Key` is scoped to tenant, operation, and target. Repeated requests return the original job.

## Defects resolved

1. Django processes did not initialize the configured Celery app, causing shared tasks to target localhost Redis. `config.celery_app` is now loaded from `config.__init__`.
2. `SELECT FOR UPDATE` included nullable joins and PostgreSQL rejected execution. Locking now targets only the durable job row.
3. Direct producer dispatch blocked an accepted request for 19.4 seconds during broker loss. Database-outbox dispatch reduced broker-down acceptance to 150 ms.
4. Disposable workspace cleanup did not account for protected payroll job targets. Owned jobs are now deleted first after workspace ownership verification.
5. Browser job restoration initially failed the production React lint rule. Restoration is now effect-scheduled without suppressing lint.
6. Client idempotency keys could collide across operations. Keys now include operation and target identity.

## Volume results

| Employees | Complete lifecycle | Calculate worker | Generate worker | Publish worker | Handoff worker | Artifacts | Result |
|---:|---:|---:|---:|---:|---:|---:|---|
| 100 | 2.982 s | 0.708 s | 0.505 s | 1.183 s | 0.111 s | 104 | PASS |
| 500 | 12.521 s | 3.509 s | 2.468 s | 5.542 s | 0.352 s | 504 | PASS |
| 1,000 | 24.118 s | 6.615 s | 4.870 s | 10.956 s | 0.667 s | 1,004 | PASS |
| 2,500 | 63.944 s | 19.968 s | 12.435 s | 28.909 s | 1.463 s | 2,504 | PASS |

Normal healthy acceptance was 6-59 ms in the measured runs. The final broker-down outbox request returned HTTP 202 in 149.9 ms. Phase 5D's comparable 2,500-employee synchronous lifecycle was 81.32 seconds, including 41.18 seconds in publication; Phase 5E removes that wait from the request path and reduced measured end-to-end processing to 63.94 seconds on the same class of local Docker environment.

At every volume, employee counts, gross earnings, deductions, net pay, gross-minus-deductions reconciliation, payslip count, register count, three finance artifacts, publication state, regeneration protection, and handoff idempotency passed. The 2,500-employee result reconciled gross `125,000,000.00`, deductions `12,500,000.00`, and net `112,500,000.00`; artifact payload was 6,118,005 bytes.

Peak sampled CPU during the volume batch was Celery 80.02% and PostgreSQL 36.63%. No OOM, container restart, database deadlock, duplicate output, duplicate handoff, or failed terminal job was observed.

## Retry, recovery, and security

- A real Celery worker was killed during a 1,000-employee publication. Stale-heartbeat recovery redispatched the durable job; attempt two succeeded with exactly 1,004 artifacts and one published batch.
- Redis was stopped before submission. The API durably accepted the job in 150 ms; after Redis recovery, beat dispatched it and it succeeded once.
- Every volume operation was submitted twice. Both submissions resolved to the same job ID.
- Owning HR Admin status access returned 200; another tenant's HR Admin received 404; an employee received 403.
- Before cleanup, 26 jobs were all `succeeded`, with zero failed jobs. Operations comprised 11 calculations and five each of output generation, publication, and handoff.
- Both synthetic Enterprise tenants were removed through the supported cleanup command and reported `verified_absent: true`. A database check returned no remaining `pw-qa-perf-p5e*` tenant codes. Containers, volumes, and network were removed.

## UI evidence

The production-built browser test submitted an asynchronous 1,000-employee calculation, observed the durable status region, reloaded the browser, restored job visibility, reached `Completed`, verified completed items equal total items, and confirmed the action returned to enabled state. Final result: 1 passed in 21.9 seconds. Trace: `docs/qa/evidence/docker-performance-phase5e/051-playwright-browser-recovery-trace.zip`.

## Verification results

- Focused payroll/job backend gate: 22 passed.
- Full payroll plus disposable-workspace tests: 24 passed.
- Playwright durable reload/recovery flow: 1 passed.
- TypeScript: passed.
- Django checks and migration drift: passed; no changes detected.
- Production Docker frontend build: passed after the restoration lint correction.
- Production Docker backend/Celery images: built and executed successfully.
- Historical Phase 3 frozen inventory remains preserved; the 963-case suite was not broadly rerun.

## Files changed

- `backend/apps/payroll/models.py`, migration `0034_payrollbackgroundjob.py`
- `backend/apps/payroll/background_jobs.py`, `tasks.py`, `admin.py`, `tests.py`
- `backend/apps/common/api_views.py`, `api_urls.py`
- `backend/config/__init__.py`, `config/settings/base.py`
- `backend/apps/common/management/commands/manage_playwright_workspace.py`
- `backend/tests/test_phase0_api_smoke.py`
- `web/src/app/api/hr-admin/payroll-jobs/**`, `payroll-config-proxy.ts`
- `web/src/app/hr-admin/payroll-close-actions-panel.tsx`
- Payroll calculation, review, and output pages
- `web/tests/e2e/payroll-background-job-recovery.spec.ts`
- `tests/performance/certify_payroll_volume.py`

## Evidence and commands

Primary evidence is in `docs/qa/evidence/docker-performance-phase5e/`. Key records are volume logs `021` and `023`, worker recovery `026` and `028`, browser trace/logs `047` and `051`, tenant/RBAC probe `037`, broker recovery `044`-`046`, final tests `048`-`053`, cleanup `054`-`058`, and production build logs `004`-`005`.

Command families executed:

```text
docker compose --project-name hrms-perf-p5e --env-file .env.production \
  -f docker-compose.production.yml -f docker-compose.performance-phase5e.yml build|up|exec|down ...
docker compose ... --profile release run --rm migrate
docker compose ... exec -T backend python manage.py manage_playwright_workspace ...
docker compose ... exec -T backend sh -c 'python manage.py shell < /tmp/certify_payroll_volume.py'
pnpm --dir web exec playwright test tests/e2e/payroll-background-job-recovery.spec.ts \
  --project=chromium --workers=1 --trace=on
backend/.venv/bin/pytest -q apps/payroll/tests.py tests/test_phase0_api_smoke.py ...
backend/.venv/bin/pytest -q apps/payroll/tests.py apps/common/test_playwright_workspace.py
pnpm --dir web typecheck
python manage.py makemigrations --check --dry-run
python manage.py check
```

## Decision and remaining gates

**PASS** for Phase 5E's local Docker durability, correctness, recovery, authorization, and UI continuity scope. Maximum verified payroll volume is 2,500 employees.

Remaining release gates are deployment-specific: repeat worker-loss and broker-loss tests on isolated staging infrastructure, verify managed broker visibility/HA settings, establish production queue monitoring and alerting, validate external artifact storage and finance-provider behavior, and execute staging backup/restore and rolling-deployment recovery. This report does not establish production readiness.
