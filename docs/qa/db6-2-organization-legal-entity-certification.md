# DB-6.2 Organization and Legal Entity Certification

Date: 2026-10-17  
Decision: **PASS** for the isolated local DB-6.2 scope  
Production readiness: not claimed

## Scope and isolation

DB-6.2 executed against PostgreSQL 16 and the current production Next.js build using the disposable `pw-qa-db6-org` Enterprise workspace. Browser actions used Tenant Admin, HR Admin, employee, and a generated least-privilege organization-viewer identity. Northstar, staging, production, and customer data were not accessed or changed.

The frozen DB-6.2 scope contains six scenarios. All six have actual browser/API/PostgreSQL evidence and now pass. DB-6.3 was not started.

## Route, API, and persistence map

| Surface | Browser route / API | Persisted model or guard |
|---|---|---|
| Legal entities and locations | `/hr-admin/organization`; `/api/hr-admin/organization/legal_entities|locations` | `LegalEntity`, `Location`, tenant code uniqueness |
| Branches and cost centers | same route; branch/cost-center mutation APIs | `Branch`, `CostCenter`, legal-entity/location ownership |
| Business units and departments | same route; business-unit/department mutation APIs | `BusinessUnit`, `Department`, parent ownership and cycle triggers |
| Grades, designations, employment types | same route; corresponding mutation APIs | `Grade`, `Designation`, `EmploymentType` |
| Employee structural mapping | `/hr-admin/employees/new`; employee mutation/options APIs | employee structure FKs and consistency validation |
| Read-only HR role | `/tenant-admin/roles`; `/hr-admin/organization` | `Role`, `RolePermission`, membership role and workspace access |
| CSV import | organization import disclosure; browser-orchestrated mutation APIs | tenant-scoped natural keys and relationship validation |

## Results

| Status | Count |
|---|---:|
| Passed | 6 |
| Failed | 0 |
| Blocked | 0 |
| Skipped | 0 |
| Not Run | 0 |

The master 92-scenario register now contains 20 `Passed`, 5 `Blocked` policy scenarios, and 67 `Not Run` scenarios. The five blocked entries predate DB-6.2 and remain explicit rather than being reclassified.

## Browser and persistence evidence

The first complete organization suite produced 11 passes and one RBAC fixture failure. All nine master catalogs passed browser create, duplicate validation, edit, reload, archive/deactivate, query-state, and compact-layout checks. Employee structural mapping validated legal entity to branch/cost center, branch to location, department to business unit, designation to grade, and employment type selection. CSV preview/commit created dependency-ordered rows and reported the invalid cost-center dependency.

The RBAC scenario passed after targeted remediation. Tenant Admin created the custom role, HR Admin created the scoped employee/access fixture, and the generated viewer used the production browser application. The viewer saw Organization but no employee/payroll navigation, create/edit controls, or import workbench. Same-tenant detail returned success; create and edit returned `403` with `organization.manage` requirements.

The import retry rerun reloaded the live snapshot and submitted the same CSV. Both previously created codes were reported as blocked, the commit action was disabled, and no duplicate mutation occurred.

Before cleanup, PostgreSQL contained browser-owned rows for every organization master, including exactly one inactive archive row per type. Branch/legal-entity, business-unit parent, and department parent tenant mismatch counts were zero. The browser-created tenant ID matched every counted record.

## Defects and remediation

### Indirect hierarchy cycles

**Root cause:** organization validation rejected only self-parent assignments. `A -> B -> A` remained possible through the API and `QuerySet.update`, allowing an invalid hierarchy.

**Fix:** `save_hr_admin_organization_item` now traverses the selected parent chain within the tenant and rejects indirect cycles. Additive migration `organizations.0002_db6_hierarchy_cycle_guards` installs tenant-aware PostgreSQL triggers for `BusinessUnit` and `Department`; these reject cross-tenant parents and recursive cycles from ORM bulk updates or raw SQL.

**Proof:** the deterministic before test failed all four API/database cases. The same four cases passed after remediation, and the focused PostgreSQL regression batch passed.

### Least-privilege HR workspace routing

**Root cause:** the backend correctly derived HR workspace access from an `hr-*` role with `organization.view`, but frontend primary-workspace routing additionally required the literal `hr-admin` role code. A valid custom HR viewer was redirected to ESS.

**Fix:** primary routing now honors server-derived `workspace_access.hr_admin`, after explicit platform/tenant/finance/manager/employee-primary precedence. The browser fixture uses the supported `hr-organization-viewer-*` role convention and separates Tenant Admin role creation from HR Admin organization/employee provisioning.

**Proof:** the final browser scenario passed with both UI restriction and backend denial assertions intact.

### Playwright authenticated request context

The initial RBAC run used `page.request`, whose trace showed no browser cookies. Setup and API denial probes now reuse `requestWithBrowserSession`; assertions and permissions were not weakened.

## Verification summary

| Check | Result | Evidence |
|---|---:|---|
| Full organization browser CRUD/mapping/import | 11 passed, 1 historical fixture failure | `db6-2/006-browser-org-crud.log` |
| Organization viewer final rerun | 1 passed | `db6-2/011-browser-rbac-final.log` |
| Import duplicate retry | 1 passed | `db6-2/016-browser-import-idempotency.log` |
| Focused organization/DB-4/DB-5 PostgreSQL regressions | 30 passed | `db6-2/013-backend-postgresql-regressions.log` |
| Hierarchy-cycle defect reproduction | 4 failed as expected before fix | `db6-2/003-cycle-tests-before.log` |
| Hierarchy-cycle targeted verification | 4 passed | `db6-2/005-cycle-tests-after.log` |
| Browser-created persistence and ownership scan | all types present; mismatch counts 0 | `db6-2/015-browser-persistence-state.log` |
| Migration rollback/reapply/drift/Django checks | passed | `db6-2/017-migration-check-rollback-reapply.log` |
| TypeScript and targeted ESLint | passed | `db6-2/018-typescript-eslint.log` |
| Production frontend build | passed; existing Autoprefixer warning only | `db6-2/009-production-build-after-routing-fix.log` |
| Managed fixture cleanup | `verified_absent=true` | `db6-2/019-fixture-cleanup.log`, `db6-2/020-fixture-cleanup-verification.log` |
| Isolated stack teardown | container absent; port closed | `db6-2/021-stack-teardown.log` |

Historical setup failures remain retained: `007` proves the unauthenticated `page.request` issue, `008` proves the Tenant Admin permission boundary, `010` proves the custom-role routing defect, and `012` records an incorrect local database environment invocation. None is counted as a passing execution.

## Exact commands

```bash
docker run --name hrms-db6-org-postgres --rm -d -e POSTGRES_DB=hrms_db6_org -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=db6-org-test -p 55439:5432 --tmpfs /var/lib/postgresql/data:rw,size=2g postgres:16-alpine
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55439 POSTGRES_DB=hrms_db6_org POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-org-test DJANGO_SETTINGS_MODULE=config.settings.base backend/.venv/bin/python backend/manage.py migrate --noinput
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55439 POSTGRES_DB=hrms_db6_org POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-org-test DJANGO_SETTINGS_MODULE=config.settings.base backend/.venv/bin/python backend/manage.py manage_playwright_workspace --seed-ref db6-org --password '***'
pnpm --dir web build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3107 HRMS_API_BASE_URL=http://127.0.0.1:8007/api/v1 pnpm --dir web exec playwright test tests/e2e/organization-master-crud-flows.spec.ts --project=chromium --workers=1 --trace=retain-on-failure
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3107 HRMS_API_BASE_URL=http://127.0.0.1:8007/api/v1 pnpm --dir web exec playwright test tests/e2e/organization-master-crud-flows.spec.ts --project=chromium --workers=1 --grep 'limited organization viewer' --trace=retain-on-failure
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3107 HRMS_API_BASE_URL=http://127.0.0.1:8007/api/v1 pnpm --dir web exec playwright test tests/e2e/organization-master-crud-flows.spec.ts --project=chromium --workers=1 --grep 'organization import workbench' --trace=retain-on-failure
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55439 POSTGRES_DB=hrms_db6_org POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-org-test DJANGO_SETTINGS_MODULE=config.settings.base .venv/bin/pytest -q backend/tests/test_db6_organization_integrity.py backend/tests/test_db4_tenant_integrity_retention.py backend/tests/test_db5_effective_employment_integrity.py [17 focused phase0 organization nodes]
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55439 POSTGRES_DB=hrms_db6_org POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-org-test DJANGO_SETTINGS_MODULE=config.settings.base backend/.venv/bin/python backend/manage.py migrate organizations 0001 --noinput
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55439 POSTGRES_DB=hrms_db6_org POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-org-test DJANGO_SETTINGS_MODULE=config.settings.base backend/.venv/bin/python backend/manage.py migrate organizations 0002 --noinput
pnpm --dir web typecheck
pnpm --dir web exec eslint src/lib/workspace-routing.ts tests/e2e/organization-master-crud-flows.spec.ts
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55439 POSTGRES_DB=hrms_db6_org POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-org-test DJANGO_SETTINGS_MODULE=config.settings.base backend/.venv/bin/python backend/manage.py manage_playwright_workspace --seed-ref db6-org --cleanup
docker rm -f hrms-db6-org-postgres
```

## Decision

DB-6.2 is **PASS** for local browser/API/PostgreSQL certification. All six frozen DB-6.2 scenarios passed, no DB-6.2 test is skipped or blocked, and no unresolved P0 organization security or integrity defect remains. This does not establish production readiness. Execution stops before DB-6.3 as requested.
