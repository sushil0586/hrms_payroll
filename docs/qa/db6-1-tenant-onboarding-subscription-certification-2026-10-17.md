# DB-6.1 Tenant Onboarding and Subscription Certification

Date: 2026-10-17  
Decision: **PASS** for the isolated local DB-6.1 scope  
Production readiness: not claimed

## Scope and isolation

DB-6.1 executed against a newly migrated PostgreSQL 16 tmpfs database and the current production Next.js build. The run used one Playwright worker, a `pw-qa-db6-control` ownership-tagged control workspace, and browser-created sandbox tenants. Northstar, staging, production and customer data were not accessed or changed.

The master plan contains 92 unique scenarios across DB-6.1 through DB-6.14. DB-6.1 contains 14 scenarios; all 14 passed. Later workflows remain 73 `Not Run` and five explicit policy `Blocked` scenarios. DB-6.2 was not started.

## Route, API and model mapping

| Surface | Routes and APIs | Persisted roots |
|---|---|---|
| Platform tenant creation | `/platform-admin/tenants`; `POST /api/platform/tenants` | `Tenant`, `TenantDomain`, `TenantOnboarding`, checklist |
| Launch setup | `/platform-admin/launch`; preview/apply/handoff and launch-run APIs | `TenantLaunchRun`, seeded-item evidence, onboarding snapshots |
| Admin provisioning | `/platform-admin/admins`; contact/provision APIs | `TenantOnboardingAdminContact`, `User`, `TenantMembership`, role assignments |
| Subscription enforcement | tenant detail/context and payroll setup APIs | tenant subscription plan and server-side entitlement decisions |
| Public acquisition | `/`; platform lead review/conversion | `PublicTenantLead`, converted tenant/onboarding/admin links |
| Authorization | platform and tenant-scoped APIs | platform staff boundary, membership tenant scope, permission catalog |

## Results

| Status | Count |
|---|---:|
| Passed | 14 |
| Failed | 0 |
| Blocked | 0 |
| Skipped | 0 |
| Not Run | 0 |

Positive browser evidence covered tenant creation, launch preview and apply, handoff, first-admin provisioning, employee access, ESS seeded leave/attendance, and public lead conversion. Negative evidence covered invalid fields, duplicate tenant identity, unauthenticated/non-platform access, incomplete activation gates, and unavailable Starter payroll entitlement.

Independent API reads returned `200` for the exact tenant and two launch runs, while an unauthenticated read returned `401`. The created tenant's HR Admin received `403` from the platform API and `200` from its own employee API. PostgreSQL showed exact tenant/domain identities, successful preview/apply runs, memberships and contacts. A two-connection duplicate-create race produced one successful create, one `IntegrityError`, one tenant row and one onboarding row.

## Defects and remediation

No application business defect was found.

1. `platform-admin-tenant-create-browser-certification.spec.ts` used `page.request` for an authenticated evidence read. Trace evidence showed that request had no browser cookies and returned `401`, while the simultaneous backend request returned `200`. It now reuses `requestWithBrowserSession`; the full 2-minute composite journey passed.
2. `platform-admin-negative-security-certification.spec.ts` had the same cookie-context problem for three transition-gate probes. Those probes now use the shared browser-session helper. Its first run also lacked isolated employee/manager persona environment variables; deterministic fixture credentials resolved that environment issue. Both tests passed.
3. `public-signup-to-tenant-provisioning.spec.ts` expected pre-compaction semantics: heading `Tenant Admin Console` and the company name as a heading. The current accessible UI exposes level-one `Account Control Center` and the exact company name as tenant-status text. Assertions were updated without reducing the business checks; the end-to-end journey passed.

Historical failed attempts and traces remain in evidence and were not overwritten.

## Verification

| Check | Result | Evidence |
|---|---:|---|
| Tenant onboarding model/API/launch suite on PostgreSQL | 59 passed | `004-backend-onboarding.log` |
| Full production-built tenant create/launch/admin/ESS browser journey | 1 passed, 2.0 min | `009-browser-onboarding-rerun.log` |
| Platform negative/security browser suite | 2 passed, 34.3 s | `017-browser-negative-security-rerun.log` |
| Public signup-to-provisioning browser journey | 1 passed, 14.8 s | `020-browser-public-signup-final.log` |
| PostgreSQL concurrent duplicate creation | one created, one rejected | `015-concurrent-create.log` |
| Independent API/RBAC/entitlement checks | expected 200/401/403 | `013-api-statuses.log`, `014-rbac-entitlement-statuses.log` |
| Current production frontend build | passed; known Autoprefixer warning only | `007-production-build.log` |
| TypeScript | passed | `021-typecheck.log` |
| Managed workspace cleanup | verified absent | `023-control-cleanup.log`, `024-post-control-cleanup.json` |
| Isolated database disposal | container absent; port closed | `025-database-disposal.log`, `026-disposal-verification.log` |

## Exact commands

```bash
docker run --name hrms-db6-postgres --rm -d -e POSTGRES_DB=hrms_db6 -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=db6-test -p 55438:5432 --tmpfs /var/lib/postgresql/data:rw,size=2g postgres:16-alpine
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db6 POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55438 backend/.venv/bin/python backend/manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db6 POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55438 backend/.venv/bin/pytest -q -c backend/pytest.ini --ds=config.settings.base backend/tests/test_tenant_onboarding_models.py backend/tests/test_tenant_onboarding_api.py backend/apps/tenant_onboarding/tests.py
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db6 POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55438 backend/.venv/bin/python backend/manage.py manage_playwright_workspace --seed-ref db6-control --password '***'
pnpm --dir web build
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3106 HRMS_API_BASE_URL=http://127.0.0.1:8006/api/v1 pnpm --dir web exec playwright test tests/e2e/platform-admin-tenant-create-browser-certification.spec.ts --workers=1 --trace=retain-on-failure
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3106 HRMS_API_BASE_URL=http://127.0.0.1:8006/api/v1 pnpm --dir web exec playwright test tests/e2e/platform-admin-negative-security-certification.spec.ts --workers=1 --trace=retain-on-failure
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3106 HRMS_API_BASE_URL=http://127.0.0.1:8006/api/v1 pnpm --dir web exec playwright test tests/e2e/public-signup-to-tenant-provisioning.spec.ts --workers=1 --trace=retain-on-failure
pnpm --dir web typecheck
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db6 POSTGRES_USER=hrms POSTGRES_PASSWORD=db6-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55438 backend/.venv/bin/python backend/manage.py manage_playwright_workspace --seed-ref db6-control --cleanup
docker rm -f hrms-db6-postgres
```

## Decision

DB-6.1 is **PASS** for local browser/API/PostgreSQL certification. There are no unresolved DB-6.1 P0 integrity or security defects. The decision does not certify production readiness and does not authorize DB-6.2 automatically; execution stops here as requested.
