# Docker Performance Phase 3A Certification

Date: 2026-10-16  
Decision: **PASS** for Phase 3A scope  
Environment: production-built local Docker, sequential requests, isolated synthetic Enterprise tenant

## Executive result

The fixed HR Admin request overhead fell from 57 authenticated SQL statements to 15. The principal defect was the commercial entitlement evaluator building the complete HR dashboard solely to obtain active employee and membership usage counts. Request handling also reloaded the same membership, roles, permissions, and employee context multiple times.

At 2,500 employees, complete workforce CSV generation improved from 1,042 ms p50 / 1,468 ms p95 to 263 ms p50 / 349 ms p95 in the direct like-for-like probe. The final scale sweep measured 257 ms p50 / 308 ms p95 / 317 ms p99. All 96 scale samples returned HTTP 200, and the export retained all 2,500 unique rows, its complete column contract, checksum, tenant scope, and audit event.

## Root causes and fixes

1. `describe_saas_commercial_control()` invoked `get_hr_admin_dashboard_for_tenant()`. This performed employee, organization, leave, attendance, lifecycle, document, workflow, and notification catalog queries that were unrelated to the four commercial usage meters. It now performs four direct tenant-scoped counts when a dashboard was not already supplied.
2. HR Admin context independently loaded membership, workspace roles, effective permissions, and employee context. Permission checks later repeated that work. The mixin now keeps one membership, permission set, and employee snapshot on the view instance for the current request only.
3. Prefetched role permissions were ignored by `get_role_permission_keys()`. The resolver now consumes the prefetched permission objects and retains the existing catalog-default fallback.
4. Complete employee-list generation hydrated 2,500 model instances and all related models. The legacy response contract is unchanged, but projection now selects only required scalar values and computes the same payload fields.

No global user/tenant permission cache was introduced. A regression changes explicit role permissions between requests and confirms the next request immediately observes the change.

## Query attribution

Authenticated `GET /api/v1/hr-admin/employees/?page=1&page_size=50` was captured through DRF token authentication.

| Area | Before | After |
| --- | ---: | ---: |
| Token authentication | 1 | 1 |
| Tenant membership | 5 | 2 |
| Membership roles / roles / permissions | 10 | 3 |
| Employee queries, including commercial dashboard counts | 16 | 6 |
| Subscription configuration | 1 | 1 |
| Payroll usage meters | 2 | 2 |
| Setup catalogs, leave, attendance, lifecycle, documents, workflows, notifications | 22 | 0 |
| **Total** | **57** | **15** |

The cold SQL timing recorded by Django was 255 ms before and 195 ms after. Warm HTTP latency at 2,500 employees improved from 238 ms p50 / 803 ms p95 in the untouched Phase 3A baseline to 201 ms p50 / 216 ms p95 in the final scale sweep. Query count is independent of employee-list page size.

## Workforce export benchmark

The Phase 2 baseline and Phase 3A result used the same local Docker resource envelope and 12 sequential warm samples per size.

| Employees | Before p50/p95/p99 | After p50/p95/p99 | Payload | Errors |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 371/539/539 ms | 152/171/181 ms | 26.1 KB | 0 |
| 500 | 469/535/535 ms | 169/191/247 ms | 129.7 KB | 0 |
| 1,000 | 634/729/729 ms | 183/283/296 ms | 259.2 KB | 0 |
| 2,500 | 1,077/2,614/2,614 ms | 257/308/317 ms | 650.7 KB | 0 |

Payload grows intentionally with complete exported row count; no cap or truncation was added.

### Stage and memory profile

At 2,500 employees, the projected backend selector took 174 ms with two SQL statements (one was lazy tenant resolution), JSON encoding took 158 ms, and Python CSV generation took 53 ms. Traced peak allocation was 6.56 MB. Idle post-run container memory was 399 MiB backend, 348 MiB web, and 78 MiB PostgreSQL under the 7.75 GiB Docker allocation.

The current Next.js CSV route still receives the complete legacy JSON array and constructs the final response in memory. This is bounded and acceptable at the certified 2,500-row fixture, but a direct streaming export endpoint with incremental checksum/audit finalization remains the preferred design before materially larger tenants or concurrency certification.

## Correctness and security verification

- Backend focused suite: 28 passed, including pagination, tenant scope, request-to-request RBAC freshness, direct commercial usage counts, and legacy response compatibility.
- Workforce Playwright: 2 passed, covering filters, pagination, complete CSV, manifest, checksum, audit history, drilldown, and employee denial.
- Employee directory Playwright: 1 passed against 2,500 employees.
- Role-boundary Playwright: 1 passed across employee, manager, HR Admin, and Platform Admin.
- Export evidence: 2,500 source rows, 2,500 unique employee codes, 4 authorized fixture employees plus 2,496 synthetic employees, and zero records from another tenant.
- TypeScript: passed.
- Django system and migration drift checks: passed; no migrations generated.
- Production Docker backend and frontend builds: passed.
- Post-run backend/web error scan: no traceback, deadlock, permission error, `EACCES`, or unhandled server error.
- Cleanup: owned tenant removed, owned employee count zero, dedicated containers, volumes, and network removed.

Two initial Playwright executions failed because invocation-specific persona/API environment variables were missing. They are retained as environment evidence (`018` and `021`) and passed unchanged with the correct disposable-workspace configuration (`019` and `022`). A one-off export probe similarly used an invalidated cookie (`027`) and passed after a fresh authorized login (`028`). None reproduced as an application failure.

## Modified files

- `backend/apps/common/api_views.py`: request-scoped membership, permission, and employee reuse in HR Admin context.
- `backend/apps/common/selectors.py`: direct commercial usage counts, prefetched membership context, and projected complete-list serialization.
- `backend/apps/iam/permission_checks.py`: prefetched permission resolution and membership-based helper.
- `backend/apps/common/tests.py`: authorization freshness and commercial-query regression coverage.

## Commands executed

```text
docker compose --project-name hrms-perf-p3a --env-file .env.production -f docker-compose.production.yml -f docker-compose.performance-phase3a.yml up -d --build postgres redis backend web celery-worker celery-beat
docker compose ... run --rm migrate
docker compose ... exec -T backend python manage.py manage_playwright_workspace --seed-ref perf-p3a
curl ... /api/hr-admin/employees?page_size=50
curl ... /api/hr-admin/reports/workforce?page_size=50
docker compose ... exec -T backend python manage.py shell -c <query and stage profiling>
.venv/bin/python backend/manage.py test apps.common.tests.HrAdminOptionMetadataTests --keepdb --noinput
pnpm --dir web exec playwright test tests/e2e/workforce-report-certification.spec.ts --project=chromium --workers=1
pnpm --dir web exec playwright test tests/e2e/employee-directory-certification.spec.ts --project=chromium --workers=1 -g 'directory controls, pagination, selection, detail, actions, and empty state'
pnpm --dir web exec playwright test tests/e2e/phase7a-role-access-boundaries.spec.ts --project=chromium --workers=1 -g 'role-scoped pages fail closed'
pnpm --dir web typecheck
.venv/bin/python backend/manage.py check
.venv/bin/python backend/manage.py makemigrations --check --dry-run
docker compose ... build backend web
docker compose ... exec -T backend python manage.py manage_playwright_workspace --seed-ref perf-p3a --cleanup
docker compose ... down -v --remove-orphans
```

## Evidence

Evidence is stored in `docs/qa/evidence/docker-performance-phase3a/`:

- `005`-`009`: untouched HTTP baseline and before/after SQL captures.
- `010`-`017`: optimized HTTP samples, scale percentiles, stage profile, counts, and container resources.
- `018`-`022`: historical browser environment failures and successful configured reruns.
- `023`-`026`: TypeScript, Django, migration, and production build results.
- `027`-`031`: historical authorization probe, successful export correctness, row uniqueness, process state, and error scan.
- `032`-`034`: fixture and Docker cleanup evidence.

## Decision and remaining gates

**PASS** for Phase 3A. The critical fixed-query context overhead and synchronous 2,500-row workforce export bottleneck are remediated without changing API contracts, RBAC, tenant isolation, entitlement enforcement, export completeness, or audits.

This result permits a controlled next-phase concurrency baseline, but it is not production certification. Remaining gates are:

1. Establish concurrency, saturation, and back-pressure behavior on an uncontended production-like host.
2. Define an asynchronous or streaming export threshold for tenant sizes materially above 2,500 employees.
3. Migrate complete-list browser workbenches to server-driven facets where client memory becomes a measured constraint.
4. Repeat capacity and storage/audit retention tests in staging with production observability.
