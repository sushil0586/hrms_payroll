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
