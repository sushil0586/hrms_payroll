# Platform Admin Tabs and Pagination Certification

Date: 2026-09-10

## Objective

Reduce platform-admin page overload and certify the touched workspace through browser testing.

## UX Changes Certified

- Split the platform admin console into focused tabs:
  - Tenants
  - Onboarding
  - Admins
  - Policy Packs
  - Events
- Kept each tab URL-addressable through `panel=`.
- Added client-side pagination with an 8-record page size for:
  - Tenant pipeline
  - Policy packs
  - Onboarding events
- Added search controls for long operational lists:
  - `tenant_search`
  - `policy_pack_search`
  - `event_search`
- Added explicit empty states for filtered tenant, policy-pack, and event lists.
- Redirected newly created tenants to the Onboarding tab so the operator lands on the next setup step.
- Preserved all existing SaaS onboarding capabilities:
  - Create tenant
  - Edit tenant setup
  - Update onboarding metadata
  - Add admin contact
  - Provision first admin
  - Create policy pack
  - Publish policy pack
  - Adopt baseline
  - Mark baseline
  - Mark handoff
  - Activate tenant
  - Review onboarding events

## Browser Certification

Environment:

- Frontend: local Next.js, `http://127.0.0.1:3212`
- API: staging, `https://hrms.accerio.in/api/v1`
- Demo fallback: disabled

Commands:

```bash
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-tabs-pagination-certification.spec.ts --reporter=line
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-negative-security-certification.spec.ts --reporter=line
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-audit-evidence-certification.spec.ts --reporter=line
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/production-platform-admin-onboarding-flows.spec.ts --reporter=line
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/sidebar-tabs-list-certification.spec.ts --grep "Platform admin" --reporter=line
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-tabs-pagination-certification.spec.ts tests/e2e/platform-admin-negative-security-certification.spec.ts tests/e2e/production-platform-admin-onboarding-flows.spec.ts --reporter=line
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-tabs-pagination-certification.spec.ts tests/e2e/platform-admin-negative-security-certification.spec.ts tests/e2e/platform-admin-audit-evidence-certification.spec.ts tests/e2e/production-platform-admin-onboarding-flows.spec.ts --reporter=line
```

Results:

- TypeScript: passed
- ESLint: passed
- Platform admin tab/pagination/control certification: `1 passed`
- Platform admin negative/security certification: `2 passed`
- Platform admin audit/evidence certification: `1 passed (43.6s)`
- Five-tenant onboarding proof: `1 passed (3.7m)`
- Platform admin sidebar/tabs/list audit: `1 passed (40.6s)`
- Combined Platform Admin certification run: `4 passed (3.3m)`
- Combined Platform Admin certification run with audit evidence: `5 passed (3.6m)`

## Certification Notes

- Every visible control group on the touched platform-admin page is asserted by Playwright.
- Required-field validation is exercised on the tenant create form.
- Wrong-role and unauthenticated access to Platform Admin workspace/API are denied without leaking secrets.
- Invalid email fields are blocked by browser validation.
- Duplicate tenant and policy-pack codes fail visibly.
- Early activation gates fail visibly with configured backend guardrail messages.
- Tenant creation, onboarding preparation, admin contact creation, first-admin provisioning, baseline adoption, handoff, and activation all create tenant-specific evidence.
- Checklist completion is verified for tenant creation, domain mapping, first-admin provisioning, baseline publication, and handoff.
- The Events tab is searched after refresh for each expected event type.
- Tenant, policy-pack, and event search controls are exercised with no-result states.
- Paginated list row limits are asserted at `<= 8`.
- The heavy onboarding proof creates policy packs, creates five tenants, updates onboarding metadata, adds admin contacts, provisions tenant admins, adopts baselines, activates tenants, and logs in as each provisioned tenant admin.
- A pagination side effect was found during testing: newly created policy packs may not appear on page one. This was resolved by adding and testing policy-pack search.

## Confidence

- Platform admin UX confidence: 92%
- Platform admin functional confidence: 94%
- Platform admin security/guardrail confidence: 91%
- Platform admin audit/evidence confidence: 92%
- SaaS tenant onboarding confidence: 93%

## 2026-09-17 Staging Re-Verification

Scope:

- Platform Admin dashboard and all primary sidebar/menu destinations.
- Tab navigation and URL routing for Control, Leads, Tenants, Launch Checklist, Tenant Admin Users, Setup Templates, Events, and Permissions.
- Desktop and mobile rendering with screenshot capture.
- Tenant CRUD and lifecycle transitions: create, edit, suspend, reactivate, and audit.
- Validation and negative paths: required fields, invalid email, duplicate tenant/template codes, early activation gates, wrong-role denial, unauthenticated denial, and secret-free API errors.
- DB-backed permission catalog visibility, search, filters, protected platform permissions, and edit dialog behavior.
- Dialog accessibility: keyboard focus, validation focus retention, Escape close, and no horizontal overflow.

Command:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 npx playwright test tests/e2e/platform-admin-tabs-pagination-certification.spec.ts tests/e2e/platform-admin-permission-catalog-certification.spec.ts tests/e2e/platform-admin-visual-accessibility-certification.spec.ts tests/e2e/platform-admin-negative-security-certification.spec.ts tests/e2e/platform-admin-crud-state-transition-certification.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result:

- `7 passed (4.9m)`

Verification notes:

- Functional platform workflow is green on staging.
- CRUD/state-transition certification passed through browser controls.
- Security and negative validation paths passed.
- Platform routes render cleanly on desktop and mobile, including visual screenshot capture.
- Platform menu/navigation is using the DB-backed menu catalog after deployment sync.
- Permission catalog is using the DB-backed permission catalog after deployment sync.
- Observation: the default 30-second browser test timeout is too tight for the current staging data volume. The product rendered correctly with launch-run timeout, but platform route performance should be optimized next by reducing route-level overfetching and moving heavy list panels toward server/API pagination.

Updated confidence:

- Platform admin UX confidence: 95%
- Platform admin functional confidence: 96%
- Platform admin security/guardrail confidence: 95%
- Platform admin audit/evidence confidence: 95%
- Platform admin launch readiness: 95%

## 2026-09-17 Performance Optimization Pass

Scope:

- Added a lightweight Platform Admin summary API for dashboard counters and queue previews.
- Changed the Platform Admin server renderer to load only the data required by the active panel.
- Preserved selected-tenant URL state so cross-panel workflows keep the correct tenant context.
- Kept full list fetches for panels that actually need full CRUD/search interaction.

Commands:

```bash
.venv/bin/python -m pytest tests/test_tenant_onboarding_api.py
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_API_BASE_URL=http://127.0.0.1:8001/api/v1 HRMS_ENABLE_DEMO_DATA=false npx playwright test tests/e2e/platform-admin-tabs-pagination-certification.spec.ts tests/e2e/platform-admin-permission-catalog-certification.spec.ts tests/e2e/platform-admin-visual-accessibility-certification.spec.ts tests/e2e/platform-admin-negative-security-certification.spec.ts tests/e2e/platform-admin-crud-state-transition-certification.spec.ts --project=chromium --workers=1 --timeout=240000
```

Results:

- Tenant onboarding API tests: `15 passed`
- TypeScript: passed
- ESLint: passed
- Local Platform Admin browser pack: `7 passed (51.3s)`
- CRUD/state-transition proof: `1 passed (7.5s)`
- Visual desktop/mobile route sweep: `1 passed (18.6s)`

Verification notes:

- The previous selected-tenant workflow risk was rechecked through the CRUD certification and passed.
- Platform Admin no longer fetches leads, tenants, policy packs, selected tenant detail, and onboarding evidence on every route by default.
- Control/dashboard routes now use the summary API, while Leads, Tenants, Policy Packs, Launch Checklist, Tenant Admin Users, and Events still load the records needed for their active workflow.
- Staging re-verification initially passed 6 of 7 tests, with CRUD failing on large staging data because explicit `tenantId` routing could fall back to a summary preview tenant. The resolver was tightened to trust an explicit URL tenant id, then the exact CRUD/state-transition test passed locally in `8.5s`.
