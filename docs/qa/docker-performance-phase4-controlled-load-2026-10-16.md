# Docker Performance Phase 4: Controlled Concurrent-User Load Testing

**Date:** 2026-10-16

**Environment:** Production-built local Docker only

**Decision:** **CONDITIONAL PASS**

**Production readiness:** Not certified by this local benchmark

## Executive result

The highest concurrency level that met all predefined latency, correctness, and integrity gates was **25 virtual users**. The 50-user growth run completed with zero HTTP errors, authorization errors, server errors, deadlocks, restarts, or queue backlog, but exceeded the overall p95 target: 2,260.69 ms versus 1,500 ms. Testing stopped at that boundary, so 100 users was not executed.

The observed limit is a latency saturation point, not a correctness or security failure. The evidence points to queueing behind three synchronous Gunicorn workers and increasing PostgreSQL CPU cost. PostgreSQL connections, locks, Redis, Celery, memory, and container health remained stable.

## Environment envelope

| Item | Observed configuration |
|---|---|
| Host | Apple Silicon macOS, 10 logical CPUs, 24 GiB RAM |
| Docker Desktop | 10 CPUs, 7.75 GiB RAM |
| Application | Production Next.js and Django images |
| Django | Gunicorn, 3 synchronous workers, 60-second timeout |
| PostgreSQL | 16; 100 max connections; 128 MiB shared buffers; 4 MiB work memory; 4 GiB effective cache |
| Redis | 7.4.11 |
| Celery | Prefork concurrency 2; prefetch 8; worker plus beat |
| Container limits | No per-container CPU or memory limits; services shared the Docker VM allocation |
| Other containers | None running at baseline; measurements were not contaminated by unrelated Docker workloads |
| Synthetic data | Isolated authorized tenant with 2,500 employees; separate disposable payroll tenant |

Idle memory was approximately 352 MiB for Django, 264 MiB for Next.js, 203 MiB for the Celery worker, 130 MiB for beat, 43 MiB for PostgreSQL, and 12 MiB for Redis. Full inventory is in `evidence/docker-performance-phase4/006-runtime-inventory.txt` and `007-idle-baseline.txt`.

## Acceptance thresholds

Thresholds were frozen before load execution:

- HTTP failure rate below 1%.
- Overall p95 below 1,500 ms and p99 below 3,000 ms.
- Each workflow p95 below 2,000 ms.
- Zero unexpected 401/403 responses and zero 5xx responses.
- Zero lock waits, container restarts, OOM events, or persistent Celery backlog.
- Stop escalation on a critical latency, security, integrity, or infrastructure breach.

## Load results

| Level | VUs | Requests | RPS | p50 | p95 | p99 | Errors | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Smoke | 2 | 53 | 3.105 | 102.44 ms | 308.01 ms | 366.46 ms | 0% | PASS |
| Baseline | 10 | 430 | 12.716 | 71.92 ms | 270.91 ms | 359.53 ms | 0% | PASS |
| Normal | 25 | 631 | 18.110 | 575.32 ms | 1,470.53 ms | 1,673.04 ms | 0% | PASS |
| Growth | 50 | 941 | 26.252 | 916.02 ms | 2,260.69 ms | 2,550.51 ms | 0% | FAIL: latency |
| Capacity exploration | 100 | 0 | - | - | - | - | - | NOT RUN by stop rule |

At 50 VUs, workflow p95 exceeded 2 seconds for employee directory/search, attendance, leave approvals, MSS queues, tenant console, and platform tenant views. HR dashboard, payroll summary, ESS leave/payslips, MSS dashboard, and tenant security remained below the workflow threshold.

Resource sampling shows the scaling boundary clearly. At 25 VUs, average Django/PostgreSQL CPU was 97.8%/152.8%; at 50 VUs it was 97.8%/165.7%. Throughput increased only 45% from 25 to 50 VUs while p95 increased 54%. PostgreSQL reached a sampled 244% CPU and Django 157% CPU at 50 VUs. Next.js stayed near idle because k6 exercised authenticated APIs directly; browser rendering capacity is therefore outside this specific concurrency result.

## Workload coverage

The read-heavy mix used real authentication, role distribution, and 0.4-0.8 second think times:

- HR Admin: dashboard, paginated employee directory/search, attendance, leave queue, payroll review summary.
- ESS: dashboard, attendance, leave, payslips.
- MSS: team dashboard, leave review, attendance review.
- Tenant Admin: tenant console and security readiness.
- Platform Admin: platform summary and tenant list.

Controlled mutations were kept separate from everyday traffic. Leave approval returned HTTP 200 in 72 ms and persisted. Payroll calculation in the isolated payroll workspace returned HTTP 200 in 109 ms, persisted `calculated` status, one payroll line, employee count one, and net pay 50,000.00.

## Findings and remediation

1. **P1 - Three synchronous web workers saturate before 50 active users.** Request queueing is the primary suspected cause. This is a staging sizing and architecture experiment, not a reason to alter resources during this benchmark.
2. **P1 - Database CPU grows fastest on directory/search, attendance, and approval queues.** Enable `pg_stat_statements` and bounded slow-query logging in staging before tuning individual statements; slow-query logging was not enabled locally.
3. **P2 - Tenant and platform list views cross 2-second p95 at 50 VUs.** Profile their query plans at production-like cardinality.
4. **P2 - Next.js concurrency was not load-tested by direct API traffic.** Run a separate browser/SSR edge test in staging with TLS and the real reverse proxy.
5. **P2 - No per-service Docker limits exist.** The local shared-VM figures cannot be translated directly into production guarantees.
6. **Fixture defect fixed - payroll salary snapshot lacked `annual_ctc`.** The supported workspace provisioner now supplies both annual CTC and monthly gross. Application validation correctly rejected the incomplete snapshot and correctly prevented mutation after lock; no payroll rule was weakened.
7. **Harness defect fixed - shared k6 setup cookie jar caused CSRF failures across personas.** Each login now uses an isolated cookie jar. The failed/interrupted attempts remain retained as evidence and are not counted as application failures or passes.

No application production behavior was changed in this phase.

## Correctness and regression

- Workspace fixture and HR option tests: **31 passed**.
- Payroll backend tests: **17 passed**.
- Playwright cross-role fail-closed check: **1 passed**.
- Playwright workforce report correctness and authorization: **2 passed**.
- TypeScript validation: **passed**.
- Production Docker images: **built successfully**.
- Final runtime integrity: one active database connection, zero lock waiters, zero deadlocks, zero temp files, Redis queue length zero, zero restarts, zero OOM events, and no matched traceback/500/critical error log entries.
- Cleanup: both synthetic tenants deleted; verification found zero matching tenants and zero owned users.

## Changed files

- `tests/performance/hrms-read-load.js`: authenticated five-role k6 workload, workflow metrics, thresholds, and isolated login cookie jars.
- `tests/performance/run-docker-load-level.sh`: repeatable level execution, resource sampling, and post-run integrity capture.
- `backend/apps/common/management/commands/manage_playwright_workspace.py`: deterministic payroll fixture now includes required annual CTC.
- `docs/qa/docker-performance-phase4-controlled-load-2026-10-16.md`: this report.

The temporary local compose override and secret-bearing environment file were removed after teardown.

## Commands executed

Representative exact commands are retained in the logs. The principal commands were:

```bash
docker compose --env-file .env.production -p hrms-perf-p4 \
  -f docker-compose.production.yml -f docker-compose.performance-phase4.yml up -d --build

docker compose --env-file .env.production -p hrms-perf-p4 \
  -f docker-compose.production.yml -f docker-compose.performance-phase4.yml exec -T backend \
  python manage.py manage_playwright_workspace --seed-ref perf-p4

tests/performance/run-docker-load-level.sh smoke 2 15
tests/performance/run-docker-load-level.sh baseline 10 30
tests/performance/run-docker-load-level.sh normal 25 30
tests/performance/run-docker-load-level.sh growth 50 30

docker compose --env-file .env.production -p hrms-perf-p4 \
  -f docker-compose.production.yml -f docker-compose.performance-phase4.yml exec -T backend \
  python manage.py test apps.common.test_playwright_workspace \
  apps.common.tests.HrAdminOptionMetadataTests --keepdb --noinput

docker compose --env-file .env.production -p hrms-perf-p4 \
  -f docker-compose.production.yml -f docker-compose.performance-phase4.yml exec -T backend \
  python manage.py test apps.payroll.tests --keepdb --noinput

pnpm --dir web exec tsc --noEmit
pnpm --dir web exec playwright test tests/e2e/phase7a-role-access-boundaries.spec.ts \
  --project=chromium --workers=1 --trace=retain-on-failure -g 'role-scoped pages fail closed'
pnpm --dir web exec playwright test tests/e2e/workforce-report-certification.spec.ts \
  --project=chromium --workers=1 --trace=retain-on-failure
```

## Evidence

All evidence is under `docs/qa/evidence/docker-performance-phase4/`:

- `001`-`007`: host, build, migrations, fixture, runtime, and idle baseline.
- `008`-`012`: initial harness diagnosis and final passing smoke run.
- `013`-`015`: per-level k6 logs, JSON summaries, resource samples, and post-state.
- `016`-`017`: resource summary and saturation diagnostics.
- `018`-`025`: controlled payroll/leave mutation and payroll fixture correction.
- `026`-`030`: backend, TypeScript, role-boundary, and workforce-report regressions.
- `031-load-level-summary.csv`: reconciled level metrics.
- `032-final-runtime-integrity.txt`: final database, Redis, log, and container checks.
- `033-fixture-cleanup.txt`: supported teardown and absence verification.
- `034-stack-teardown.log`: container, network, and volume removal.
- `035-harness-static-validation.txt`: k6 inspection and shell syntax validation.

## Sizing recommendation and gates

For the first staging experiment, use a dedicated application tier with at least two Django instances (three workers each), approximately 4 vCPU total for Django, a PostgreSQL tier starting at 4 vCPU and 8-16 GiB RAM, a separate Redis allocation, and at least two Celery worker processes. These are **initial hypotheses, not verified production sizes**. Until staging proves otherwise, budget no more than 25 concurrently active API users per three-worker Django instance under this workload.

Required next gates:

1. Repeat identical levels in staging behind the real TLS reverse proxy and load balancer.
2. Enable `pg_stat_statements` and bounded slow-query evidence; optimize the highest-cost directory, attendance, leave, and tenant queries.
3. Compare worker/replica and database sizing as separately documented experiments.
4. Add frontend/SSR and browser-render concurrency measurements.
5. Exercise controlled writes and payroll processing under dedicated, integrity-safe concurrency scenarios.
6. Validate email, protected object storage, external finance integrations, monitoring, alerting, backup/restore, and disaster recovery in staging.

**Phase 4 decision: CONDITIONAL PASS.** Local Docker verifies stable correctness through 50 VUs and threshold-compliant performance through 25 VUs. It does not establish production capacity or production readiness.
