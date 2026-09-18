# Platform Admin Dashboard Certification Report

Date: 2026-09-18  
Environment: local live API and deployed staging/prod URL `https://hrms.accerio.in`  
Role: Platform Admin  
Source inventory: `docs/qa/platform-admin-discovery-inventory-2026-09-18.md`

## Dashboard QA Result

Status: Certified

Automation added:
- `web/tests/e2e/platform-admin-dashboard-certification.spec.ts`

Scenarios certified:
- Dashboard page load as Platform Admin.
- Platform Summary API cross-check for visible dashboard metrics.
- Metric tiles: open control actions, tenants, active tenants, onboarding tenants, public leads, published setup templates.
- Mission queue empty/non-empty behavior against live lead queue.
- Tenant pipeline detail rows against live summary counts.
- Risk radar labels, actions, and resolve links.
- Activation blockers list, selected tenant review navigation, browser back/forward behavior.
- Command shortcuts and expected destinations.
- Evidence trail navigation to Audit Logs.
- Refresh behavior on dashboard and destination pages.
- Console/page error monitoring.
- Platform/API request failure monitoring, excluding expected Next.js aborted RSC navigation prefetches.
- Keyboard focus and Enter activation for dashboard shortcut.
- Responsive layout screenshots and no-horizontal-overflow checks at 1920x1080, 1440x900, 1366x768, 1024x768, and 768x1024.

## Execution Evidence

Local live API:

```bash
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-dashboard-certification.spec.ts --project=chromium
```

Result: 2 passed.

Deployed URL:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-dashboard-certification.spec.ts --project=chromium
```

Result: 2 passed.

Static and hygiene checks:

```bash
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
git diff --check
```

Result: all passed.

## Defects

No dashboard defects found in this pass.

## UI/UX Findings

Actual defects:
- None found.

Recommended improvements:
- Add explicit tooltip/help text for dashboard metric calculation rules so operators know why `Open control actions` equals active leads plus onboarding tenants.
- Add a small timestamp such as `Last refreshed` to reinforce freshness for operators during launch-day monitoring.
- Consider a dedicated empty-state action on Mission queue, such as `View all leads`, even when no active leads exist.

## Technical Findings

Console errors:
- None observed.

Network/API failures:
- None observed for live API requests.
- Expected Next.js `ERR_ABORTED` RSC navigation requests were ignored because they are produced by normal route changes/prefetch cancellation, not API failures.

Performance concerns:
- No slow dashboard interaction was observed during this focused pass.

## Remaining Gaps

- This report certifies the Dashboard only. Other Platform Admin modules remain covered by their dedicated specs and should be included in the broader Platform Admin regression pack before final public launch signoff.
- Error-state injection was not forced on the deployed environment to avoid disturbing live staging services.
