# Docker Performance Phase 5C.1: Attendance Concurrency Revalidation

**Date:** 2026-10-16  
**Decision:** **FAIL against consistent 50-VU latency certification**  
**Production readiness:** Not certified

## Environment

The Phase 5B comparison environment was recreated with production images and an isolated disposable Enterprise tenant:

- Apple Silicon host, 10 logical CPUs, 24 GiB RAM;
- Docker Desktop allocation: 10 CPUs and 7.75 GiB RAM;
- four synchronous Gunicorn workers;
- PostgreSQL 16, 100 connections, 128 MiB shared buffers, 4 MiB work memory, 4 GiB effective cache;
- `pg_stat_statements`, I/O timing, lock logging, and 200 ms slow-query logging;
- Redis 7 and Celery concurrency 2;
- exactly 2,500 synthetic employees;
- unchanged `tests/performance/hrms-read-load.js` role mix, endpoints, and think times.

No worker, database, timeout, threshold, or business-rule setting changed between measurements.

## Attendance API

The production-built API was measured in-process after warm-up against 25 returned rows.

| Metric | Phase 5B | Phase 5C.1 |
|---|---:|---:|
| Total request queries | 108 | 18 |
| Derivation queries | per-row fan-out | 5 bounded queries |
| Warm p50 | 112 ms | 34.9 ms |
| Warm p95 | 119 ms | 35.9 ms |
| Warm p99 | 119 ms | 35.9 ms |
| Average SQL time | 19.4 ms | 16.1 ms |
| Payload | 23,220 B baseline fixture | 36,129 B current complete fixture |
| Status | 200 | 200 |

The five derivation queries load policy assignments, shift assignments, holiday calendars/holidays, approved leave overlaps, and the tenant shift map. All 25 bulk summaries exactly matched the legacy resolver output.

## Concurrent results

The fixed overall acceptance gate was p95 below 1,500 ms with no security/integrity failures, 5xx responses, restarts, OOMs, lock waits, or connection exhaustion.

| Run | VUs | Overall p50 | p95 | p99 | Attendance p95 | RPS | Errors | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Smoke | 2 | 92 ms | 212 ms | 400 ms | 66 ms | 3.12 | 0% | PASS |
| Baseline | 10 | 57 ms | 196 ms | 214 ms | 63 ms | 13.43 | 0% | PASS |
| Normal | 25 | 145 ms | 624 ms | 815 ms | 500 ms | 28.27 | 0% | PASS |
| Growth A | 50 | 599 ms | 1,322 ms | 1,439 ms | 1,292 ms | 34.07 | 0% | contaminated, retained |
| Growth B | 50 | 570 ms | 1,420 ms | 2,180 ms | 1,608 ms | 34.34 | 0% | contaminated, retained |
| Clean A | 50 | 679 ms | 1,420 ms | 1,614 ms | 1,320 ms | 32.90 | 0% | PASS |
| Clean B | 50 | 541 ms | 1,258 ms | 1,432 ms | 1,219 ms | 35.10 | 0% | contaminated, retained |
| Clean C | 50 | 521 ms | 1,294 ms | 1,427 ms | 1,265 ms | 35.56 | 0% | minor contention, retained |
| Clean D | 50 | 646 ms | 1,685 ms | 1,993 ms | 1,575 ms | 33.68 | 0% | contaminated, FAIL |
| Clean E | 50 | 697 ms | 1,923 ms | 2,179 ms | 1,602 ms | 31.02 | 0% | light contention, FAIL |
| Capacity | 100 | 1,991 ms | 3,925 ms | 4,169 ms | 4,023 ms | 32.03 | 0% | FAIL |

The two initial 50-VU runs overlapped unrelated `edutech` migration/backend work at approximately 86-91% CPU. Later attempts also observed intermittent unrelated backend/web activity. Those processes were never stopped or modified. Clean A is a valid full pass, but 50-VU latency was not repeatably below 1,500 ms under the shared local Docker allocation. The 100-VU run demonstrated saturation without functional errors and was not repeated.

Verified threshold-compliant concurrency remains **25 VUs**. A single clean 50-VU pass demonstrates improvement and staging potential, but does not establish stable local capacity.

## Resource and safety observations

- 25 VUs: backend peak 154% CPU, PostgreSQL peak 281% CPU.
- clean 50-VU samples: backend approximately 185-191% peak CPU, PostgreSQL approximately 301-305% peak CPU.
- 100 VUs: backend 206% peak CPU, PostgreSQL 304% peak CPU.
- backend memory remained approximately 470-508 MiB; PostgreSQL approximately 138-220 MiB.
- zero HTTP failures, unexpected 401/403 responses, or 5xx responses in every run;
- zero restarts, OOM events, deadlocks, lock waiters, or Celery backlog;
- no backend traceback/500 log matches after load.

PostgreSQL CPU and synchronous request queueing remain the capacity boundary. No further speculative local tuning is recommended.

## Correctness and regression

- Attendance/common/payroll backend tests: **44 passed**.
- Focused ESS, MSS, and HR attendance Playwright: initial 3 failures were fixture-username mismatches; corrected deterministic persona run: **3 passed**.
- TypeScript: passed.
- HR attendance API: HR Admin 200; employee persona 403.
- Attendance records remained tenant-consistent; zero employee/record tenant mismatches.
- All sampled derivation summaries retained payroll-impact evidence.
- Payroll fixture remained `inputs_locked` with one locked input snapshot.
- Production backend and frontend images were used.

The load mix caused the expected ESS month-to-date placeholder creation, increasing attendance rows from 26 to 41 within the disposable tenant only. This is supported application behavior, not shared-data leakage.

## Evidence

Evidence is under `docs/qa/evidence/docker-performance-phase5c1/`:

- `001`-`007`: host state, production build, migrations, fixture provisioning, health, and API profile;
- `008`: complete capacity matrix;
- per-run `*-summary.json`, logs, resource samples, pre/post state, and SQL profiles;
- `011`-`017`: integrity, backend, Playwright, TypeScript, runtime, and error-log checks;
- `018`: clean resource summary;
- cleanup and teardown evidence.

## Commands

```bash
docker compose -p hrms-perf-p5c1 --env-file .env.production \
  -f docker-compose.production.yml -f docker-compose.performance-phase5c1.yml up -d --build

docker compose ... exec -T backend python manage.py manage_playwright_workspace \
  --seed-ref perf-p5c1 --password Password@123

tests/performance/run-docker-attendance-revalidation.sh smoke 2 20s
tests/performance/run-docker-attendance-revalidation.sh baseline 10 30s
tests/performance/run-docker-attendance-revalidation.sh normal 25 30s
tests/performance/run-docker-attendance-revalidation.sh growth-clean-a 50 30s
tests/performance/run-docker-attendance-revalidation.sh growth-clean-c 50 30s
tests/performance/run-docker-attendance-revalidation.sh capacity 100 30s

docker compose ... exec -T backend python manage.py test \
  apps.attendance.tests apps.common.test_playwright_workspace apps.payroll.tests \
  --keepdb --noinput

pnpm --dir web exec playwright test \
  tests/e2e/ess-attendance-launch-certification.spec.ts \
  tests/e2e/mss-control-center-certification.spec.ts \
  tests/e2e/hr-admin-attendance-operations-workflow-certification.spec.ts \
  --project=chromium --workers=1 --trace=retain-on-failure

pnpm --dir web exec tsc --noEmit
```

## Decision

Phase 5C.1 **FAILS stable 50-VU local latency certification**. The attendance optimization itself is verified: query count, isolated latency, correctness, authorization, and browser regressions pass. The shared local Docker host cannot establish repeatable aggregate p95 below 1,500 ms at 50 VUs, and 100 VUs is clearly saturated.

Repeat capacity evaluation on isolated staging-grade resources with the same script, four-worker application configuration, and PostgreSQL instrumentation. Do not continue speculative local tuning and do not infer production readiness from these results.
