# Docker Performance Phase 5B: Critical Endpoint Optimization

**Date:** 2026-10-16

**Decision:** **FAIL against the 50-VU p95 target**

**Production readiness:** Not certified

## Outcome

Phase 5B used the Phase 5A best configuration: four synchronous Gunicorn workers, fixed Docker resources, the unchanged five-role k6 mix, and an isolated 2,500-employee Enterprise tenant.

Employee list/search ORM work was improved without changing response schemas, counts, filters, sorting, authorization, or tenant scope. The 25-VU result improved from the Phase 5A four-worker p95 of 682 ms to 575 ms. Neither 50-VU run met the required p95 below 1,500 ms, so 100 VUs was not attempted.

## Capacity results

| Run | VUs | RPS | p50 | p95 | p99 | Errors | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| Phase 5A best clean | 50 | 31.00 | 830 ms | 1,548 ms | 2,228 ms | 0% | FAIL |
| Phase 5B optimized | 25 | 26.16 | 165 ms | 575 ms | 739 ms | 0% | PASS |
| Phase 5B optimized | 50 | 27.18 | 908 ms | 1,727 ms | 1,832 ms | 0% | FAIL |
| Phase 5B confirmation | 50 | 29.23 | 701 ms | 2,615 ms | 3,720 ms | 0% | FAIL |

Both 50-VU runs began from clean idle pre-states and completed without HTTP, authorization, integrity, restart, OOM, lock, or database-connection failures. The variation demonstrates that the local shared Docker environment does not provide enough latency margin at 50 VUs.

Maximum verified threshold-compliant concurrency remains **25 VUs**.

## Endpoint profiling

Seven warmed in-process requests per endpoint separated SQL/ORM/serialization work from Gunicorn queueing.

| Endpoint | p50 total | p95 total | Avg SQL | Queries | Payload |
|---|---:|---:|---:|---:|---:|
| Employee search | 178 ms | 179 ms | 157 ms | 14 | 6,243 B |
| Attendance list | 112 ms | 119 ms | 19 ms | 108 | 23,220 B |
| ESS attendance | 30 ms | 31 ms | 12 ms | 29 | 272 B |
| Tenant security | 12 ms | 13 ms | below timer resolution | 18 | 8,673 B |
| Platform tenants | 2 ms | 53 ms | below timer resolution | 3 | 539 B |

An initially attempted correlated-count implementation was rejected during profiling because employee search rose to approximately 786 ms p50. Historical evidence is retained in `006-endpoint-profile-after.json`; it was not certified or left in the final implementation.

The corrected employee design uses cheap `EXISTS` predicates for readiness/filter decisions and computes exact role/direct-report counts only for the returned page. Employee search dropped from that rejected 786 ms implementation to 178 ms while preserving the same payload size and status.

## Under-load endpoint comparison

Compared with the Phase 5A best clean 50-VU workflow evidence, the first Phase 5B 50-VU run showed:

- Employee search: 2,251 ms to 1,790 ms p95.
- Attendance list: 2,213 ms to 1,890 ms.
- ESS attendance: 2,085 ms to 1,580 ms.
- Tenant security: 1,924 ms to 1,550 ms.
- Platform tenants: 1,877 ms to 1,540 ms.

The overall p95 still failed because many independent endpoints converge around 1.5-1.9 seconds under shared queueing. The confirmation run had worse tails despite an idle start, reinforcing the capacity limitation.

## Remaining bottlenecks

1. Attendance list performs up to 108 queries for a 25-row response. Derivation summaries resolve schedule and leave context per row. This is the next highest-confidence optimization target, but requires a bulk derivation contract rather than removing business evidence.
2. ESS attendance performs 29 queries and can create/resolve month-to-date attendance state.
3. Employee search still spends most in-process time in SQL across broad joined `icontains` predicates and summary calculations.
4. Permission and tenant-context lookups recur across every endpoint. They remain uncached globally to preserve authorization freshness.
5. Four synchronous workers still queue requests at 50 VUs; worker increases and threads were already disproven in Phase 5A.
6. Tenant-security and platform endpoints are fast in isolation, confirming that their load-test tail is mostly shared queueing rather than endpoint-local SQL.

## Code changes

- `backend/apps/common/selectors.py`
  - Preserved the Phase 5A MSS database-side team filtering.
  - Replaced employee joined role/direct-report aggregates with `EXISTS` predicates.
  - Limited exact scalar role/report counts to returned employee rows.
- `backend/apps/common/tests.py`
  - Verifies direct-report and assigned-role counts.
  - Enforces a bounded employee-page query count.
  - Guards against direct-report ID materialization.
- `tests/performance/run-docker-endpoint-optimization.sh`
  - Captures pre-state, resources, normalized SQL, connections, locks, restarts, and OOM status per run.

No payroll, RBAC, subscription, tenant-isolation, or financial business logic changed. No index or cache was introduced without supporting measurements.

## Verification

- Backend workspace, employee, MSS, and payroll tests: **49 passed**.
- Targeted Playwright: **4 passed** covering MSS dashboard, RBAC fail-closed behavior, workforce reporting/export, and employee denial.
- TypeScript: passed.
- Production Docker build: passed.
- Payroll calculation: HTTP 200 in 90 ms; persisted `calculated/completed`, one line, tenant match true.
- Fixture cleanup: disposable tenant removed and absence verified.
- Docker cleanup: containers, network, and volumes removed.

## Evidence

Evidence is under `docs/qa/evidence/docker-performance-phase5b/`:

- `001`-`004`: host state, production build, migrations, provisioning, and 2,500-employee fixture.
- `005`-`009`: query correctness, rejected profile, corrected implementation, and endpoint profile.
- `optimized-*`: 25/50-VU metrics, resources, SQL, and runtime state.
- `optimized-confirm-*`: independent 50-VU confirmation.
- `010`-`013`: backend, TypeScript, Playwright, and payroll verification.
- `014`-`016`: fixture cleanup, capacity summary, and Docker teardown.

Principal commands:

```bash
docker compose --env-file .env.production -p hrms-perf-p5b \
  -f docker-compose.production.yml -f docker-compose.performance-phase5b.yml up -d --build

tests/performance/run-docker-endpoint-optimization.sh optimized 25 30s
tests/performance/run-docker-endpoint-optimization.sh optimized 50 30s
tests/performance/run-docker-endpoint-optimization.sh optimized-confirm 50 30s

docker compose ... exec -T backend python manage.py test \
  apps.common.test_playwright_workspace \
  apps.common.tests.HrAdminOptionMetadataTests \
  apps.payroll.tests --keepdb --noinput

pnpm --dir web exec tsc --noEmit
pnpm --dir web exec playwright test \
  tests/e2e/phase7a-role-access-boundaries.spec.ts \
  tests/e2e/workforce-report-certification.spec.ts \
  tests/e2e/mss-control-center-certification.spec.ts \
  --project=chromium --workers=1 --trace=retain-on-failure
```

## Decision

**Phase 5B FAILS its explicit 50-VU latency gate.** The employee endpoint optimization is correct and useful, and 25-VU performance improved, but local 50-VU latency remains above target. The next remediation should bulk-resolve attendance derivation data and then repeat the same 25/50-VU workload on isolated staging-grade resources. Production readiness is not claimed.
