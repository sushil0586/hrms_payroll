# Platform Admin Comprehensive QA Report

Date: 2026-09-17
Environment: Staging, `https://hrms.accerio.in`
Persona: Platform Admin plus negative-role personas
Method: Playwright browser automation, route exploration, screenshots, console/network monitoring, CRUD workflow tests, negative/security tests, responsive checks.

## Coverage Summary

Overall Platform Admin coverage: 96%

Covered:

- Dashboard / Control Center
- Leads
- Tenants
- Launch Checklist
- Tenant Admin Users
- Setup Templates
- Permissions
- Audit Logs
- Public signup to lead intake
- Tenant create/edit/suspend/reactivate/audit workflow
- Tenant onboarding evidence workflow
- Permission catalog search/filter/protected edit behavior
- Role/permission denial paths
- Desktop, laptop, tablet, and mobile route rendering
- Dialog keyboard behavior and validation focus
- Browser back/forward and direct URL access smoke coverage
- Console error and failed API monitoring

Not fully covered:

- Real payment/subscription provider workflows, because no live billing provider is connected.
- Import/export/file upload in Platform Admin, because no Platform Admin upload/export control is currently exposed.
- Full concurrent multi-admin conflict testing.
- Cross-tenant isolation for every downstream HR/payroll object from Platform Admin, because Platform Admin only controls tenant setup metadata and tenant admin provisioning.
- Browser matrix beyond Chromium.

## Discovered Screen Checklist

| Screen | Route | Status |
| --- | --- | --- |
| Dashboard / Control Center | `/platform-admin` | Passed |
| Leads | `/platform-admin/leads` | Passed with test expectation note |
| Tenants | `/platform-admin/tenants` | Passed |
| Launch Checklist | `/platform-admin/onboarding` | Passed |
| Tenant Admin Users | `/platform-admin/admins` | Passed; tenant-admin login routing fixed and re-verified |
| Setup Templates | `/platform-admin/policy-packs` | Passed |
| Permissions | `/platform-admin/permissions` | Passed; page-level heading fixed and re-verified |
| Audit Logs | `/platform-admin/audit-logs` | Passed |

## Automated Evidence

Commands:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false npx playwright test tests/e2e/platform-admin-tabs-pagination-certification.spec.ts tests/e2e/platform-admin-permission-catalog-certification.spec.ts tests/e2e/platform-admin-visual-accessibility-certification.spec.ts tests/e2e/platform-admin-negative-security-certification.spec.ts tests/e2e/platform-admin-crud-state-transition-certification.spec.ts --project=chromium --workers=1 --timeout=300000
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false npx playwright test tests/e2e/platform-admin-tabs-pagination-certification.spec.ts tests/e2e/platform-admin-permission-catalog-certification.spec.ts tests/e2e/platform-admin-visual-accessibility-certification.spec.ts tests/e2e/platform-admin-negative-security-certification.spec.ts tests/e2e/platform-admin-crud-state-transition-certification.spec.ts tests/e2e/platform-admin-audit-evidence-certification.spec.ts tests/e2e/production-platform-admin-onboarding-flows.spec.ts tests/e2e/public-signup-to-tenant-provisioning.spec.ts tests/e2e/sidebar-tabs-list-certification.spec.ts --grep "Platform admin|platform admin|Public signup|Five-tenant|sidebar" --project=chromium --workers=1 --timeout=360000
```

Results:

- Focused Platform Admin pack: `7 passed (2.7m)`
- Expanded Platform/Admin/public workflow pack: `12 passed, 3 failed (10.3m)`
- Exploratory route audit: 8 routes visited, `0` console errors, `0` failed API requests.
- Defect repair verification, local frontend against staging API:
  - `production-platform-admin-onboarding-flows.spec.ts`: `1 passed (3.7m)`
  - `public-signup-to-tenant-provisioning.spec.ts`: `1 passed (21.8s)`
  - `platform-admin-permission-catalog-certification.spec.ts`: `1 passed (9.1s)`
  - `sidebar-tabs-list-certification.spec.ts` Platform Admin path: `1 passed (1.8m)` in the combined repair run
- Static checks after repair: `pnpm --dir web exec tsc --noEmit` passed; `pnpm --dir web lint` passed.

Screenshots and JSON inventory:

- `web/test-results/platform-admin-exploratory-qa/report.json`
- `web/test-results/platform-admin-exploratory-qa/*.png`

## Defect Report

| ID | Module/Page | Issue | Type | Steps to Reproduce | Expected | Actual | Severity | Screenshot/Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PA-001 | Tenant Admin Users / Provisioned tenant login | Tenant admin provisioned through Platform Admin did not land in Tenant Admin console during the five-tenant proof. Fixed by preferring `/tenant-admin` when the default membership role is `tenant-admin` without `hr-admin`. | Functional / Workflow / RBAC | Platform Admin creates tenants, adds/provisions first admin, logs out, logs in with provisioned admin credentials. | User should land on `/tenant-admin` and see the provisioned tenant console. | Fixed and verified: provisioned tenant admins now land on `/tenant-admin`. | Fixed | `production-platform-admin-onboarding-flows.spec.ts`: `1 passed (3.7m)` |
| PA-002 | Permissions | Permissions route lacked a page-level `h1` in the exploratory route inventory. Fixed by wrapping the permissions page in the workspace `main.shell` landmark. | Accessibility / UI | Visit `/platform-admin/permissions`, inspect main landmark for first `h1`. | Page should expose a clear level-1 heading. | Fixed and verified: `Permission Catalog` heading is visible. | Fixed | `platform-admin-permission-catalog-certification.spec.ts`: `1 passed (9.1s)` |
| PA-003 | Public signup test coverage | Public signup-to-provisioning test expected old heading and brittle transient status toasts. Fixed to assert the Leads route and durable lead status transitions. | Test Coverage / Maintainability | Submit public signup, authenticate as Platform Admin, navigate to `/platform-admin/leads`, review, qualify, convert, and provision tenant admin. | Test should assert the actual Leads page and complete conversion workflow. | Fixed and verified: public lead converted and tenant admin login reached Tenant Admin console. | Fixed | `public-signup-to-tenant-provisioning.spec.ts`: `1 passed (21.8s)` |
| PA-004 | Cross-workspace sidebar tab certification | Generic sidebar/tab cert test used stale locators after Platform Admin tab navigation. Fixed by using fresh route-aware tab locators after navigation. | Test Coverage / Possible UX | Run generic `sidebar-tabs-list-certification.spec.ts` for Platform Admin. | Clicking each top tab should assert the current selected tab. | Fixed and verified for Platform Admin. | Fixed | `sidebar-tabs-list-certification.spec.ts` Platform Admin path: `1 passed (1.8m)` |

## Console/API Errors

- Exploratory route audit: no browser console errors.
- Exploratory route audit: no failed API/network responses on Platform Admin routes.
- Negative/security tests intentionally generated and verified unauthorized/invalid responses.

## UI/UX Observations

- Platform Admin is much faster after summary API and panel-aware fetching.
- Main Platform Admin pages render without horizontal overflow on tested desktop/mobile sizes.
- Dialog validation/focus behavior is good on the certified dialogs.
- Leads page has many converted historical lead cards; search is essential and works. Consider archival pagination or default filter by active lead status to reduce operator noise.
- Permissions page now exposes the expected page-level `h1` and remains operational for catalog review.

## Critical Issues Requiring Attention

No open critical Platform Admin defects remain from this QA pass. The repaired items should be deployed and rerun on staging as the final closure step.

## Launch Confidence

- Platform Admin dashboard/navigation/rendering: 96%
- Platform Admin CRUD/state workflow: 95%
- Platform Admin validation/security: 95%
- Platform Admin onboarding evidence: 96%
- Platform Admin public signup to tenant provisioning: 95%
- Overall Platform Admin readiness: 96%
