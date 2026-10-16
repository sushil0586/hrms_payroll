# Docker Performance Phase 1 Baseline

Date: 2026-10-16  
Decision: **CONDITIONAL**  
Scope: production-built local Docker, synthetic disposable data only

## Environment

- Host: Apple `Mac16,13`, 10 ARM64 cores, 24 GiB RAM.
- Docker Desktop: 10 CPUs, 7.75 GiB RAM.
- Stack: PostgreSQL 16, Redis 7, Django/Gunicorn, Next.js production build, Celery worker (concurrency 1), Celery beat, provider job and retry workers.
- Constraint: unrelated containers remained active and intermittently consumed 60-100% CPU. They were recorded but not modified. Absolute throughput is therefore indicative, not a clean capacity limit.

## Method

One owned Enterprise tenant was grown incrementally to 100, 500, 1,000, and 2,500 employees. Nine cross-portal operations received 12 sequential warm samples per size. The p99 value is the sample maximum because each group has 12 observations. Browser timing covered 17 launch-critical routes at 2,500 employees. No concurrent stress was applied.

## API and page baseline

| Workflow | 100 employees p50/p95 | 500 p50/p95 | 1,000 p50/p95 | 2,500 p50/p95 |
| --- | ---: | ---: | ---: | ---: |
| Employee API | 141/188 ms | 453/606 ms | 730/833 ms | 1,727/1,907 ms |
| Employee search | 74/85 ms | 72/102 ms | 77/121 ms | 79/109 ms |
| HR dashboard | 141/272 ms | 173/1,012 ms | 235/322 ms | 156/221 ms |
| ESS dashboard | 108/168 ms | 93/182 ms | 82/113 ms | 86/116 ms |
| ESS leave | 236/305 ms | 281/362 ms | 252/405 ms | 320/406 ms |
| MSS approvals | 92/117 ms | 99/134 ms | 105/142 ms | 156/186 ms |
| Tenant Admin | 125/220 ms | 116/125 ms | 123/162 ms | 129/160 ms |
| Platform Admin | 37/45 ms | 38/70 ms | 35/42 ms | 35/55 ms |

All listed successful workflows had 0% HTTP errors. The workforce report probe returned HTTP 500 at every size and is excluded from successful latency certification; it is a route/configuration defect requiring separate functional investigation.

The employee response expanded from 59 KB at 100 employees to 1.49 MB at 2,500. Search remained stable at approximately 4.1 KB and 72-79 ms p50. This strongly indicates that the employee list endpoint ignores or defeats the requested page size.

## Browser findings

All 17 routes passed the existing local budgets. Document response was generally 137-237 ms, except Payroll Readiness at 1,412 ms. Decoded transfer footprint was approximately 4.3 MB on many authenticated routes with 71-76 resources. End-to-end `pageReadyMs` reached 6.3-7.7 seconds because the audit helper logs out and authenticates for each route; browser `loadCompleteMs` was generally 161-1,396 ms, with Payroll Readiness at 3,087 ms.

Long-task and CLS distributions were not captured by the existing budget test, so those objectives remain open for the next isolated run. Earlier loading-feedback evidence showed zero action-button layout shift but is not a substitute for route-level CLS.

## Database, Redis, and workers

- Indexed first-page employee SQL: 0.103 ms execution, five shared-buffer hits. The 1.7-second API result is above the database layer.
- PostgreSQL connections during idle sampling: 1 total, 1 active; no observed lock wait.
- Employee table statistics: 2,500 live rows, 6,448 sequential scans and 7,783 index scans after the probe.
- `iam_rolepermission`: 2,268 sequential scans for only 81 rows, suggesting repeated permission-catalog access.
- Redis dataset: 1.66 MiB; no memory pressure.
- Celery periodic empty notification jobs completed in 11-56 ms. No realistic queued workload or retries were generated, so queue-latency capacity remains unverified.
- HRMS backend memory rose from about 370 MiB at 100 employees to 446 MiB at 2,500; web ranged approximately 329-414 MiB.

## Top bottlenecks

1. Employee list returns the full tenant dataset despite `page_size=50`, causing linear payload and serialization growth.
2. Employee API p50 grows 12.2x from 100 to 2,500 employees while indexed SQL remains 0.1 ms.
3. Workforce report endpoint returned HTTP 500 in all 48 samples.
4. Authenticated browser routes decode roughly 4.3 MB and load 71-76 resources.
5. Payroll Readiness document response reached 1.41 seconds and load completion 3.09 seconds.
6. Re-authentication in the browser audit adds several seconds to route-ready measurements and obscures in-session navigation cost.
7. Repeated `iam_rolepermission` sequential scans suggest redundant authorization lookup work.
8. Employee-table sequential scan count is high relative to the synthetic read workload.
9. Backend memory increased about 76 MiB between 100 and 2,500 employees.
10. Celery/provider capacity is uncharacterized because only empty periodic jobs ran.

## Recommended acceptance targets

- Read APIs: p50 <= 250 ms, p95 <= 750 ms, p99 <= 1,500 ms, error rate < 0.1%.
- Search/filter: p95 <= 500 ms with response size <= 250 KB.
- Paginated list payload: <= 500 KB and invariant with total tenant size.
- In-session route response: p95 <= 1,000 ms; usable UI <= 2,500 ms.
- CLS <= 0.1; no long task above 200 ms during primary interaction.
- Queue pickup p95 <= 2 seconds; retry state visible within 2 seconds; task runtime tracked by task type.
- No sustained container memory growth across repeated warm runs.

## Evidence

Raw evidence is under `docs/qa/evidence/docker-performance-phase1/`:

- `001`-`003`: host, Docker limits, and pre-existing load.
- `005`-`007`: 432 raw HTTP samples and percentile summaries.
- `008`-`010`: PostgreSQL, Redis, and Celery evidence.
- `011`-`012`: browser run and timing samples.
- `013`: employee query `EXPLAIN ANALYZE`.
- `014`-`015`: utilization and worker logs.
- `016`: verified fixture cleanup.

## Decision

**CONDITIONAL**. The baseline identifies a proven high-impact employee-list scaling bottleneck and a repeatable report failure, while core portal pages remained responsive in sequential use. Clean throughput, route-level long tasks/CLS, query counts per endpoint, and realistic Celery queue latency require a dedicated run without unrelated container contention. This local evidence is not production readiness certification.
