# Phase 5F Final Local Docker Performance and Reliability Certification

Date: 2026-10-16  
Environment: production-built isolated local Docker  
Decision: **CONDITIONAL**  
Staging entry: **GO with entry controls**  
Production release: **NO-GO**

## Executive result

The current production images include the employee pagination, workforce export, HR Admin context, attendance bulk derivation, and durable payroll background-job changes. Focused current-source and production-container checks passed without a correctness, authorization, tenant-isolation, migration, build, or cleanup failure.

Local functional and reliability certification passes. Local capacity certification remains limited to **25 concurrent users**: 50 users did not repeatedly remain below the fixed 1,500 ms overall p95 threshold. A single compliant 50-user run does not supersede the later 1,685 ms and 1,923 ms results. This limitation is retained as a failed higher-concurrency target, not relabeled as a pass.

## Consolidated scorecard

| Area | Before | Best verified current result | Decision |
| --- | --- | --- | --- |
| Employee list at 2,500 employees | 1.49 MB; p50 1,727 ms | 30.3 KB; direct p50 about 285 ms; bounded server pagination | PASS |
| Workforce export | HTTP 500 | HTTP 200; 2,500-row p50/p95/p99 257/308/317 ms | PASS |
| HR Admin context | 57 database queries | 15 queries; employee-specific path 16 to 6 | PASS |
| Attendance, 25 rows | 108 queries | 18 total queries, including 5 derivation queries; exact legacy-result match | PASS |
| Attendance warm API | Not bounded | p50 34.9 ms; p95/p99 35.9 ms; 36,129-byte payload | PASS |
| Local concurrent load | 50 VUs p95 2,261 ms in Phase 4 | 25 VUs p95 624 ms; 50 VUs 1,420/1,685/1,923 ms across clean/comparable runs | 25 PASS; 50 FAIL |
| Synchronous payroll, 2,500 employees | 81.32 s end to end; publication 41.18 s | Durable async request acceptance 6-59 ms normally; 149.9 ms with broker down | PASS |
| Async payroll, 2,500 employees | No durable browser-restorable job | 63.944 s end to end; 19.968 s calculation; 28.909 s publication | PASS |
| Payroll financial integrity | Required | Gross 125,000,000.00; deductions 12,500,000.00; net 112,500,000.00; exact reconciliation | PASS |
| Durable recovery | Missing | Worker-loss recovery, broker-loss outbox dispatch, bounded retry, and idempotency verified | PASS |

No measured run reported an unexpected 5xx, authorization leak, OOM, container restart, deadlock, lock wait, duplicate payroll output, duplicate artifact, or duplicate finance handoff.

## Optimization implementation map

- Employee pagination and bounded serialization: `backend/apps/common/api_views.py`, `selectors.py`, `tests.py`; `web/src/app/api/hr-admin/employees/route.ts`.
- Workforce export correctness/performance: `backend/apps/common/api_views.py`, `tests.py`; `web/src/app/api/hr-admin/reports/[reportKey]/route.ts`.
- Request-scoped HR context/RBAC reuse: `backend/apps/common/api_views.py`, `apps/iam/permission_checks.py`.
- Attendance bulk derivation: `backend/apps/attendance/services.py`, `tests.py`; `apps/leave_management/services.py`, `tests.py`; HR Admin attendance proxy.
- Durable payroll jobs: payroll model and migration `0034`, `background_jobs.py`, `tasks.py`, services/admin/tests, common job APIs, Celery initialization/settings, payroll UI panels/pages, job API proxy, and browser recovery test.
- Disposable fixture ownership and cleanup: `backend/apps/common/management/commands/manage_playwright_workspace.py` and its tests.

The production image/source probes and targeted tests above cover these implementation areas. No Phase 5F business-rule change was made.

## Verified limits

- Employee directory and workforce export volume: **2,500 synthetic employees**.
- Payroll calculation, generation, publication, and handoff: **2,500 synthetic employees** and 2,504 generated artifacts.
- Stable local interactive concurrency under the fixed target: **25 VUs**.
- 50 VUs: functionally error-free in the retained runs, but **not latency-certified**.
- 100 VUs: p95 3,925 ms overall and 4,023 ms for attendance; not accepted.
- Volumes above 2,500 employees and stable concurrency above 25 VUs remain unverified.

## Phase 5F current-build verification

### Production Docker and migrations

- Backend, web, Celery worker, beat, and provider production images built successfully.
- A new PostgreSQL volume migrated from zero through `payroll.0034_payrollbackgroundjob` successfully.
- Backend, web, PostgreSQL, and Redis health checks passed; worker and beat remained running.
- Django `check` and migration-drift checks passed. The developer database still reports `payroll.0034` unapplied; this does not affect the clean Docker proof and must not be used without migration.
- TypeScript passed. The production Next.js build passed with only the pre-existing Autoprefixer mixed-support warning for `end`.

### Targeted regression

- Backend: **34 passed**, covering employee pagination/filter/sort/tenant scope, bounded employee query count, request-fresh permission context, attendance bulk/legacy equivalence, payroll lifecycle/jobs, workspace cleanup, export authorization, async job idempotency, and employee denial.
- Production Docker API probes: employee pagination 200, workforce export 200, HR Admin context 200, and attendance pagination 200. Returned employee ordering/count metadata and workforce row/header values were correct.
- Durable payroll API: initial and duplicate submissions both returned 202 and the same job ID; the job reached `succeeded` with completed items equal to total items.
- Security: the owning HR Admin could access the job; the employee received 403. Prior Phase 5E cross-tenant status access returned 404.
- Browser: durable payroll submit/reload/completion flow passed twice; retained evidence is the clean second run, **1 passed in 8.3 s**, with trace.
- Celery: production worker registered execution, outbox-dispatch, and stale-recovery tasks. The persisted job completed once and retained its Celery task identity and timestamps.

## Frozen functional baseline reconciliation

The frozen registers contain exactly **963 unique IDs**, no duplicates:

| Priority | Passed | Skipped | Failed | Blocked | Not run | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| P0 | 477 | 2 | 0 | 0 | 0 | 479 |
| P1 | 147 | 4 | 0 | 0 | 0 | 151 |
| P2 | 333 | 0 | 0 | 0 | 0 | 333 |
| **Total** | **957** | **6** | **0** | **0** | **0** | **963** |

The historical register was not rewritten and the full suite was not unnecessarily rerun. Post-baseline changes requiring focused recertification were employee pagination/export, HR context authorization, attendance derivation, and durable payroll processing. Those deltas are covered by the Phase 5F backend/API/browser checks and by the retained Phase 2-5E evidence. This is targeted delta recertification, not a claim that all 963 cases were freshly executed.

The six skips remain open acceptance items: `P3-0578`, `P3-0890`, `P3-0342`, `P3-0343`, `P3-0344`, and `P3-0976`. None is counted as passed. They require the documented provider, last-admin, mock organization, and active/no-workspace fixtures before final release sign-off, or named risk acceptance with an owner and expiry.

## Durable job controls

- Job state is tenant-scoped and persisted as queued, running, succeeded, or failed.
- Outbox dispatch separates HTTP acceptance from broker availability.
- Beat dispatches queued jobs; stale-heartbeat recovery redispatches abandoned work.
- Celery late acknowledgement, worker-loss rejection, soft/hard limits, bounded retries, row locking, and operation/target/client-key idempotency are present in the built image.
- Browser storage restores active-job visibility after refresh/navigation and displays real stages/item counts rather than invented percentages.
- Phase 5E proved worker interruption and Redis interruption recovery. Phase 5F reconfirmed task registration, persisted state, duplicate request identity, browser restoration, and unauthorized denial in the current build.

## Data cleanup

The Phase 5F tenant `pw-qa-perf-p5f-final` was created through the supported workspace command. Cleanup returned `verified_absent: true`; direct database verification found zero tenant rows and zero related payroll jobs. The Docker project was removed with volumes: zero project containers and zero project volumes remain. Northstar/customer records were not used or modified.

## Residual risks

1. Local Docker cannot demonstrate stable 50-VU latency below 1,500 ms. PostgreSQL CPU and synchronous request queueing remain the observed boundary.
2. Managed broker high availability, network partitions, and multi-worker rolling deployment behavior are not proven locally.
3. External protected object storage, real TLS/proxy behavior, email delivery, and finance-provider sandbox integration remain deployment gates.
4. Backup/PITR restoration and rollback-compatible migration procedures require staging infrastructure.
5. The six frozen fixture-conditioned skips remain release-signoff obligations.

## Staging entry checklist

- TLS termination, trusted proxy headers, `DEBUG=False`, secure cookies, CSRF origins, HTTPS redirect, and HSTS verified from an external client.
- Externally injected unique secrets; no repository/default secrets; rotation and rollback procedure tested.
- Protected object storage with encryption, tenant-scoped keys, short-lived download authorization, malware/content controls, retention, and deletion evidence.
- Managed PostgreSQL sized initially at approximately 4 vCPU and 8-16 GB RAM, with `pg_stat_statements`, connection/lock/slow-query alerts, backups, PITR, and an executed restore drill.
- Separate web and Celery capacity. Start from the verified four synchronous web workers only after sizing to staging CPU; run at least two worker processes/instances with queue-age, retry, stale-job, and dead-letter alerts.
- Managed Redis/broker persistence and HA/failover tested; broker-loss acceptance and outbox recovery repeated.
- Email sandbox and finance-provider sandbox configured with outbound payment/email delivery disabled until explicitly approved.
- Central logs, traces, p50/p95/p99 dashboards, 4xx/5xx rates, database CPU/connections, queue age, job-state age, artifact failures, and container restart/OOM alerts.
- Rolling deployment rehearsal covers worker drain, old/new task compatibility, migration ordering, browser refresh restoration, and rollback.
- Repeat 25 and 50 VU workloads on uncontended staging-grade resources. Require two comparable 50-VU runs below 1,500 ms p95 before raising the certified capacity. Attempt 100 VUs only after that gate passes.
- Execute the six skipped functional cases with deterministic staging fixtures and repeat focused payroll, attendance, employee, RBAC, tenant-isolation, and artifact-access checks.

## Commands and evidence

Primary Phase 5F evidence is under `docs/qa/evidence/docker-performance-phase5f/`:

- `001-targeted-backend-regression.log`, `002-typecheck.log`, `003-django-migrations-check.log`
- `004-host-docker-preflight.txt`, `005-production-build.log`
- `007-clean-migration.log`, `008-stack-start.log`, `009-stack-health.txt`
- `010-workspace.json`, `011-integrated-api-timings.txt`, `012-integrated-api-contracts.json`
- `013`-`018` payroll acceptance, persistence, idempotency, and security probes
- `019-payroll-job-playwright.log`, `019-payroll-job-trace.zip`
- `020-celery-current-build.txt`, `022-frozen-register-reconciliation.txt`
- `023-pre-cleanup-audit.txt`, `024-cleanup.log`, `025-cleanup-verification.json`
- `026-stack-teardown.log`, `027-stack-teardown-verification.txt`

Executed command families:

```text
backend/.venv/bin/pytest -q <34 focused employee/context/attendance/payroll/security tests>
pnpm --dir web typecheck
python manage.py makemigrations --check --dry-run
python manage.py check
docker compose --project-name hrms-perf-p5f --env-file .env.production \
  -f docker-compose.production.yml -f docker-compose.performance-phase5f.yml build|up|exec|logs|down -v
docker compose ... --profile release run --rm migrate
docker compose ... exec -T backend python manage.py manage_playwright_workspace \
  --seed-ref perf-p5f-final [--audit|--cleanup]
pnpm --dir web exec playwright test tests/e2e/payroll-background-job-recovery.spec.ts \
  --workers=1 --trace=on
```

Historical inputs remain in the Phase 1, 2, 3A, 4, 5A, 5B, 5C, 5C.1, 5D, and 5E reports and their evidence directories.

## Decision

**Phase 5F: CONDITIONAL.** Correctness, durability, security boundaries, production build, migrations, and the verified 2,500-employee workload pass locally. The higher-concurrency target does not pass consistently.

- **Staging GO:** yes, for controlled deployment and certification after every staging-entry control above is met. This is authorization to proceed with a staging plan, not an automatic deployment action.
- **Production GO:** **NO-GO**. Production requires successful staging evidence, closure or explicit ownership of the six skips, infrastructure recovery drills, protected integrations, and accepted capacity results.

Local Docker evidence does not establish production readiness.
