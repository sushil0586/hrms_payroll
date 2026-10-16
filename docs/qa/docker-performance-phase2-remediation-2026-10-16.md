# Docker Performance Phase 2 Remediation

Date: 2026-10-16  
Decision: **CONDITIONAL PASS**  
Scope: production-built local Docker, isolated synthetic tenant, sequential requests

## Executive result

Both Phase 1 critical defects were reproduced and fixed:

1. The employee Next.js proxy discarded all query parameters, while Django always evaluated and serialized the complete tenant employee queryset. A request for `page_size=50` therefore returned all 2,500 employees.
2. Workforce CSV generation completed, but the non-root Next.js process raised `EACCES` while creating `/app/.hrms-data` for export audit evidence. This caused an empty HTTP 500 response after the report data had been built.

At 2,500 employees, the identical employee request changed from **1,497,492 bytes / 1,943 ms** to **30,295 bytes / 259 ms** in the direct before/after probe. The workforce request changed from **HTTP 500** to **HTTP 200**, returned the complete 670,375-byte CSV, and persisted both backend and local audit evidence.

## Code changes

- `web/src/app/api/hr-admin/employees/route.ts`: forwards the complete query string to Django.
- `backend/apps/common/api_views.py`: enables opt-in server pagination whenever employee query parameters are supplied; invalid pagination returns HTTP 400.
- `backend/apps/common/selectors.py`: adds bounded pagination, total/page metadata, search, status, department, manager/readiness filters, allow-listed sorting, tenant scoping, aggregate summary metadata, and a shared serializer payload builder.
- `backend/apps/common/selectors.py`: adds `cost_center` to `select_related`, removing the observed one-query-per-row N+1.
- `web/src/lib/api.ts` and `web/src/lib/types.ts`: add the typed paginated employee client contract while retaining the unparameterized legacy array contract.
- `web/Dockerfile`: creates `/app/.hrms-data` with ownership for the non-root `node` runtime user.
- `backend/apps/common/tests.py`: covers compatibility, boundaries, filtering, sorting, invalid inputs, tenant isolation, and constant selector query count.

The corrected employee contract is:

- `GET /api/hr-admin/employees` with no query parameters: legacy array, retained for existing report/import consumers.
- `GET /api/hr-admin/employees?page=1&page_size=50...`: `{items,total_count,page,page_size,total_pages,has_next,has_previous,summary}`.
- `page_size` is validated and bounded to 1-100. It is not silently ignored or used as an arbitrary total-result cap.

## Comparable benchmark

Each warm group contains 12 sequential samples. p99 is the sample maximum.

| Employees | Employee API p50/p95/p99 | Payload | Workforce export p50/p95/p99 | Payload | Errors |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 181/308/308 ms | 30,286 B | 371/539/539 ms | 27,173 B | 0 |
| 500 | 185/200/200 ms | 30,289 B | 469/535/535 ms | 134,374 B | 0 |
| 1,000 | 207/545/545 ms | 30,293 B | 634/729/729 ms | 268,374 B | 0 |
| 2,500 | 285/342/342 ms | 30,295 B | 1,077/2,614/2,614 ms | 670,375 B | 0 |

Employee payload growth is now **9 bytes** from 100 to 2,500 employees. Phase 1 grew from 59 KB to 1.49 MB and p50 from 141 ms to 1,727 ms. The new 2,500 p50 is 83.5% lower.

Cold employee probes were 197-283 ms. Cold workforce probes were 495-1,007 ms. Workforce export size intentionally grows with exported row count; no report rows are truncated.

## Query and resource evidence

- The paginated selector uses five queries in the isolated regression test, independent of a 50-row page size. One query is lazy tenant resolution; four perform summary, department facets, total count, and page retrieval.
- Full request capture remained 56 queries at 100, 500, 1,000, and 2,500 employees. This includes the existing HR-admin context, permission, entitlement, and operational-readiness checks. It does not grow with page rows.
- Before adding `cost_center` to `select_related`, a 50-row page executed 106 request queries. Afterward it executed 56, eliminating 50 related-object queries.
- At final database sampling: one connection, one active sampling connection, and zero lock waits.
- Backend memory ranged from 351 MiB at 100 employees to 436 MiB at 2,500. Web memory ranged from 295 MiB to 372 MiB. PostgreSQL remained 176-178 MiB.

## Functional and security verification

- Backend pagination regressions: 3 passed.
- Workforce Playwright certification: 2 passed, including filters, pagination, complete CSV, manifest, audit history, drilldown, and employee denial.
- Employee directory Playwright regression: 1 passed.
- ESS employee direct requests: employee list HTTP 403; workforce export HTTP 403.
- Search located an employee beyond the former first-page boundary by deterministic code.
- Page 50 returned the correct 50 records and retained `total_count=2500`.
- TypeScript: passed.
- Django system check: passed.
- Production Next.js Docker build: passed; one pre-existing Autoprefixer warning remains.
- No post-fix `EACCES`, traceback, or HTTP 500 appeared in the captured backend/web logs.

The employee directory and workforce report continue to use the legacy complete-list contract internally because their import and client-side report workbenches require complete data. Their focused browser regressions passed. Migrating those workbenches to server-driven facets and deterministic batch ID resolution is a separate optimization; the corrected paginated API is available without breaking them.

## Commands executed

```text
docker compose --project-name hrms-perf-p2 --env-file .env.production -f docker-compose.production.yml -f docker-compose.performance-phase2.yml up -d --build postgres redis backend web celery-worker celery-beat
docker compose ... run --rm migrate
docker compose ... exec -T backend python manage.py manage_playwright_workspace --seed-ref perf-p2
curl ... /api/hr-admin/employees?page_size=50
curl ... /api/hr-admin/reports/workforce?page_size=50
.venv/bin/python backend/manage.py test <three focused employee pagination tests>
pnpm --dir web typecheck
docker compose ... up -d --build backend web celery-worker celery-beat
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_SKIP_WEB_SERVER=1 ... pnpm --dir web exec playwright test tests/e2e/workforce-report-certification.spec.ts --project=chromium --workers=1
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_SKIP_WEB_SERVER=1 ... pnpm --dir web exec playwright test tests/e2e/employee-directory-certification.spec.ts --project=chromium --workers=1 -g 'directory controls, pagination, selection, detail, actions, and empty state'
docker compose ... exec -T backend python manage.py manage_playwright_workspace --seed-ref perf-p2 --cleanup
docker compose ... down -v --remove-orphans
```

## Evidence

Evidence is under `docs/qa/evidence/docker-performance-phase2/`:

- `005`-`008`: login, exact pre-fix responses, and the production `EACCES` traceback.
- `009`-`012`: exact post-fix contracts, payloads, local audit persistence, and logs.
- `013`-`014`: before/after N+1 query captures.
- `015`-`020`: raw/cold benchmarks, percentiles, utilization, dataset sizes, and query count by scale.
- `021`-`022`: Playwright workforce and employee-directory regressions.
- `023`-`024`: historical failed query-budget assertion and successful corrected rerun.
- `025`-`032`: authorization, audit persistence, TypeScript, Django, image, process, PostgreSQL, and post-fix error evidence.
- `033`-`035`: fixture and Docker cleanup evidence.

## Decision and remaining gates

**CONDITIONAL PASS** for Phase 2 remediation. The employee API is bounded and the workforce 500 is resolved without weakening RBAC, tenant isolation, report completeness, or audits.

Do not start high-concurrency certification yet. Remaining performance gates are:

1. Profile and reduce the fixed 56-query HR-admin context/entitlement path without weakening subscription enforcement.
2. Establish a separate asynchronous/export acceptance target for complete workforce exports; its 2,500-row p95 outlier was 2.61 seconds.
3. Migrate full-list employee directory/import and workforce display consumers to server-driven data access before treating their browser memory footprint as scale-certified.
4. Repeat concurrency and capacity testing on an uncontended Docker host.

This local Docker result does not establish production readiness.
