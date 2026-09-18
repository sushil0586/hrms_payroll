# Platform Admin Tenant Isolation Certification Report

Date: 2026-09-18  
Role: Platform Admin  
Module: Platform Admin -> Tenants  
Spec: `web/tests/e2e/platform-admin-tenant-isolation-certification.spec.ts`

## Tenant QA Result

Status: Certified locally and on deployed stage.

Tested:
- Browser-created QA Tenant A and QA Tenant B with distinct names, legal names, domains, plans, seed packs, emails, phones, and sandbox flags.
- Save -> refresh/API verify -> search/filter -> reopen -> verify pattern for tenant creation and tenant-scoped setup data.
- Tenant list search, status filter, plan filter, combined filter behavior, selected tenant navigation, and tenant context links.
- Tenant-scoped Launch Readiness, Admin Access, Setup Templates, and Audit Logs pages.
- Direct tenant URL switching between A and B.
- Browser back/forward tenant context preservation.
- Responsive breakpoints: 1920x1080, 1440x900, 1366x768, 1024x768, 768x1024.
- Browser console errors and failed network requests during switching.

Automation added:
- `platform-admin-tenant-isolation-certification.spec.ts`

## Tenant Isolation Result

Result: Verified locally.

Modules checked:
- Tenants list and selected tenant row/context
- Launch Readiness onboarding metadata
- Admin Access admin contacts
- Setup Templates selected tenant context
- Audit Logs tenant event evidence
- Direct URL and browser back/forward context

Evidence:
- Local command passed:
  `HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-tenant-isolation-certification.spec.ts --project=chromium`
- Result: `1 passed`
- Deployed command passed:
  `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-tenant-isolation-certification.spec.ts --project=chromium`
- Result: `1 passed`

## Defects

| ID | Severity | Type | Module | Scenario | Steps | Expected | Actual | Evidence | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| None | - | - | Platform Admin Tenants | Two-tenant isolation | Create Tenant A/B, configure different onboarding/admin data, switch through tenant-scoped modules | Tenant A data never appears under Tenant B and vice versa | Passed locally | Playwright run passed | Keep in staging regression suite |

## UI/UX Improvements

| ID | Area | Suggestion | Priority |
| --- | --- | --- | --- |
| UX-TEN-001 | Tenant-scoped pages | The selected tenant is preserved in URL and the “Open selected tenant” action, but Setup Templates/Admin Access could show a small persistent selected-tenant badge with name/code near the page title to reduce operator anxiety. | Medium |
| UX-TEN-002 | Tenant list | Filters are usable, but a visible “selected tenant” marker in the list after direct URL entry would make context clearer when the selected row is not on the current page/filter. | Low |

## Technical Findings

- Console errors: none in local certification.
- Failed API/network requests: none in local certification.
- Stale request leakage after switching tenants: not observed.
- Duplicate mutation requests: not observed in this isolation run.
- Cross-tenant data exposure: not observed.

## Remaining Gaps

- Existing CRUD/negative specs remain the source for deeper field-level validation such as duplicate code/domain/email and invalid email browser validation.
- Setup template adoption/version comparison is covered by the dedicated setup-template lifecycle spec; this tenant isolation spec only verifies selected-tenant context on Setup Templates.

## Final Status

Certified with minor UX suggestions.
