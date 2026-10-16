# Docker Performance Phase 5A: Capacity and Worker/Database Optimization

**Date:** 2026-10-16

**Environment:** Production-built isolated local Docker

**Decision:** **FAIL against the 50-VU latency acceptance target**

**Production readiness:** Not certified

## Result

Phase 4 evidence remains unchanged. Phase 5A repeated the same five-role workload, 2,500-employee synthetic tenant, think times, endpoint mix, hardware allocation, and k6 thresholds while comparing Gunicorn worker configurations.

All configurations completed with zero HTTP failures, unexpected 401/403 responses, 5xx responses, deadlocks, lock waits, OOM events, or container restarts. However, no configuration met the required overall p95 below 1,500 ms at 50 VUs. The best clean candidate was four synchronous workers after the MSS query fix: p95 1,547.73 ms, p99 2,227.82 ms, and 31.0 requests/sec. Because the target was missed, 100 VUs was not attempted.

The maximum fully threshold-compliant concurrency remains **25 VUs**.

## Environment and controls

- Host: Apple Silicon macOS, 10 logical CPUs, 24 GiB RAM.
- Docker Desktop: 10 CPUs, 7.75 GiB RAM.
- PostgreSQL 16: 100 connections, 128 MiB shared buffers, 4 MiB work memory, 4 GiB effective cache.
- Redis 7; Celery concurrency 2.
- Dataset: one disposable Enterprise tenant with exactly 2,500 employees.
- Workload: unchanged `tests/performance/hrms-read-load.js` role and endpoint mix.
- Each run: 30 seconds, identical 0.4-0.8 second workflow think times.
- SQL instrumentation: `pg_stat_statements`, `track_io_timing=on`, 200 ms slow-query logging, lock-wait logging.

An unrelated `edutech-phase3b9a` stack was detected and never stopped. Its initial 100-user run delayed HRMS measurement. Runs started only after three idle samples; every run also retained an all-container pre-state. One optimized rerun with pre-existing CPU activity is retained as contaminated evidence and excluded from the recommendation.

## Configuration matrix

| Configuration | VUs | RPS | p50 | p95 | p99 | Errors | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| 3 sync | 10 | 12.34 | 73 ms | 240 ms | 434 ms | 0% | PASS |
| 3 sync | 25 | 24.15 | 284 ms | 756 ms | 926 ms | 0% | PASS |
| 3 sync | 50 | 26.70 | 1,008 ms | 1,770 ms | 1,958 ms | 0% | FAIL |
| 4 sync | 10 | 11.89 | 72 ms | 227 ms | 522 ms | 0% | PASS |
| 4 sync | 25 | 25.18 | 249 ms | 682 ms | 1,121 ms | 0% | PASS |
| 4 sync | 50 | 29.13 | 868 ms | 1,760 ms | 1,970 ms | 0% | FAIL |
| 5 sync | 10 | 12.26 | 71 ms | 234 ms | 970 ms | 0% | PASS |
| 5 sync | 25 | 22.94 | 311 ms | 930 ms | 1,242 ms | 0% | PASS |
| 5 sync | 50 | 27.21 | 1,020 ms | 2,086 ms | 2,428 ms | 0% | FAIL |
| 3 gthread x 2 | 10 | 12.40 | 75 ms | 250 ms | 1,025 ms | 0% | PASS |
| 3 gthread x 2 | 25 | 23.96 | 263 ms | 969 ms | 1,137 ms | 0% | PASS |
| 3 gthread x 2 | 50 | 27.20 | 403 ms | 2,799 ms | 3,995 ms | 0% | FAIL |
| 4 sync + MSS fix | 50 | 31.00 | 830 ms | 1,548 ms | 2,228 ms | 0% | FAIL |
| 4 sync + MSS fix + 60s DB connections | 50 | 33.16 | 673 ms | 1,597 ms | 2,195 ms | 0% | FAIL |

The complete matrix, including backend/PostgreSQL CPU and memory, is `evidence/docker-performance-phase5a/020-full-configuration-matrix.csv`.

At 50 VUs, the clean four-worker optimized run averaged 151.5% Django CPU and 207.0% PostgreSQL CPU, with sampled maxima of 233.9% and 314.5%. Five workers increased backend memory from about 468 MiB to 580-592 MiB and worsened latency. Threads increased tail latency substantially. Persistent connections raised throughput but did not improve the p95 acceptance result; they held four idle backend connections and remained far below connection exhaustion.

## API bottlenecks

Best-candidate 50-VU workflow p95:

| Workflow | p95 |
|---|---:|
| Employee search | 2,250.88 ms |
| Attendance list | 2,213.32 ms |
| ESS attendance | 2,085.11 ms |
| Tenant security | 1,923.79 ms |
| Platform tenants | 1,877.12 ms |
| Employee directory | 1,601.71 ms |
| MSS dashboard | 1,492.93 ms |

The full workflow table is `028-best-candidate-workflow-latency.csv`.

## SQL findings

`pg_stat_statements` attributed most database execution time to employee list/search and their summary aggregates:

1. Employee page query: 80 calls, 6,200.81 ms total, 77.51 ms mean, 210.32 ms maximum.
2. Employee search/page query: 80 calls, 4,168.32 ms total, 52.10 ms mean.
3. Joined employee result count: 80 calls, 2,742.67 ms total, 34.28 ms mean.
4. Access/readiness aggregate: 160 calls, 1,419.52 ms total.
5. Repeated employment-status counts: 570 calls and 468.60 ms total.

The original MSS dashboard also materialized and sorted all 2,498 direct-report UUIDs on every request. In the pre-fix 4-worker run this query returned 174,860 rows across 70 calls. It was replaced with database-side relationship filters and `COUNT`, eliminating that row transfer while preserving all summary values.

No new index was added. The dominant employee search is a broad joined multi-field `icontains` query, and the list query is dominated by annotations and aggregate counts. A conventional B-tree index would not address that pattern. Any trigram/search-document or summary-cache design must be tested separately for authorization freshness, update behavior, and write cost.

The slow-query log retained 200 statements at or above the 200 ms threshold. Per-run normalized SQL is in each `*-top-sql.csv` file.

## Changes

- `backend/apps/common/selectors.py`: stopped materializing all manager direct-report IDs; related leave and attendance counts now remain in SQL.
- `backend/apps/common/tests.py`: added deterministic regression proving correct team totals without the direct-report ID-list query.
- `backend/config/settings/base.py`: added optional `DJANGO_DB_CONN_MAX_AGE` and `DJANGO_DB_CONN_HEALTH_CHECKS`; defaults remain `0` and `false`, preserving current behavior.
- `tests/performance/run-docker-capacity-experiment.sh`: repeatable per-configuration load execution, pre-state capture, resources, SQL, locks, queues, restarts, and OOM evidence.
- `docs/qa/docker-performance-phase5a-capacity-optimization-2026-10-16.md`: this report.

Temporary secret and compose override files were removed after teardown. The production Dockerfile remains at three workers; no unverified local setting was silently promoted to production.

## Correctness verification

- Backend workspace, HR option, MSS query, and payroll tests: **49 passed**.
- Controlled payroll calculation: HTTP 200 in 126 ms; completed status, one persisted line, net pay 50,000.00, correct tenant.
- Playwright: **4 passed** covering MSS dashboard, cross-role fail-closed behavior, workforce report/export, and employee denial.
- TypeScript: passed.
- Docker production build: passed.
- Final state: zero lock waiters, deadlocks, temp files, Redis/Celery backlog, restarts, OOM events, or matched application error logs.
- Cleanup: synthetic tenant and users verified absent; benchmark containers, network, and volumes removed.

## Commands

Principal commands were:

```bash
docker compose --env-file .env.production -p hrms-perf-p5a \
  -f docker-compose.production.yml -f docker-compose.performance-phase5a.yml up -d --build

docker compose ... exec -T postgres psql ... \
  -c 'create extension if not exists pg_stat_statements;'

GUNICORN_WORKERS=3 GUNICORN_WORKER_CLASS=sync GUNICORN_THREADS=1 docker compose ... up -d --force-recreate backend
tests/performance/run-docker-capacity-experiment.sh sync3 10 30s
tests/performance/run-docker-capacity-experiment.sh sync3 25 30s
tests/performance/run-docker-capacity-experiment.sh sync3 50 30s
```

The same commands were repeated for `sync4`, `sync5`, and `gthread3x2`. Focused verification used:

```bash
docker compose ... exec -T backend python manage.py test \
  apps.common.test_playwright_workspace \
  apps.common.tests.HrAdminOptionMetadataTests \
  apps.payroll.tests --keepdb --noinput

pnpm --dir web exec tsc --noEmit
pnpm --dir web exec playwright test \
  tests/e2e/phase7a-role-access-boundaries.spec.ts \
  tests/e2e/workforce-report-certification.spec.ts \
  tests/e2e/mss-control-center-certification.spec.ts \
  --project=chromium --workers=1 --trace=retain-on-failure \
  -g 'role-scoped pages fail closed|HR admin can certify workforce|employee cannot access workforce|shows team queues'
```

## Recommendation

For staging evaluation, use **four synchronous Gunicorn workers per instance**. This was the best stable local configuration, but it is not a production-approved change and still misses the 50-VU target. Do not use five synchronous workers or the tested 3x2 threaded configuration. Keep database persistent connections disabled by default until staging repeats demonstrate a latency and operational benefit.

Initial staging experiment sizing:

- Two Django instances with four synchronous workers each.
- Approximately 4 vCPU total for the Django tier as a starting point.
- PostgreSQL starting at 4 vCPU and 8-16 GiB RAM, with `pg_stat_statements` and bounded slow-query logging.
- Dedicated Redis and Celery resources.
- Connection budget calculated from all Django replicas, Celery processes, administrative access, and failover headroom; do not simply raise `max_connections`.

Before another 50/100-VU escalation:

1. Redesign employee search/list summary work so broad search and expensive access/readiness aggregates are not recomputed for every page request.
2. Profile attendance list and ESS attendance query paths with the same SQL attribution.
3. Investigate tenant-security and platform-tenant tail latency.
4. Repeat on staging behind the real TLS proxy/load balancer with isolated resources.
5. Require 50 VUs to pass all latency, security, integrity, restart, and connection gates before attempting 100.

**Phase 5A decision: FAIL against its explicit capacity target.** The system remains functionally stable and secure in these local runs, but verified latency-compliant capacity is still 25 concurrent users. This is not a production-readiness certification.
