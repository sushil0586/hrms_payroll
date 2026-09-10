# Sidebar, Tabs, Lists, and Pagination Certification

Date: 2026-09-10

## Objective

Certify that role workspaces are usable through the browser at navigation level, tab level, and long-list level.

## Coverage

- Platform admin sidebar.
- HR admin sidebar.
- ESS sidebar.
- MSS sidebar.
- Tenant admin sidebar.
- Every visible sidebar link on each workspace.
- Every visible `role=tab` on each visited page.
- Long-list pagination checks for:
  - Tenant-style directory rows.
  - Shared operational list rows.
  - Large table bodies.
- Horizontal overflow checks after page load and tab interaction.

## Product Fixes From Certification

- Platform admin was split into focused tabs and long-list pagination/search was added.
- HR admin Organization previously rendered 20 structural master records without pagination.
- Organization now supports query-string pagination and page-size control.

## Commands

```bash
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/sidebar-tabs-list-certification.spec.ts --reporter=line
```

## Results

- TypeScript: passed
- ESLint: passed
- Sidebar/tabs/list certification: `5 passed`

## Confidence

- Sidebar navigation confidence: 92%
- Tab navigation confidence: 90%
- Long-list pagination confidence: 88%
- Overall browser certification confidence: 87%

## Remaining Certification Direction

- Continue running mutation suites module by module for full CRUD certification.
- Any page touched for UX or pagination must keep this suite green.
- Any long page found by this suite should be fixed before launch sign-off.
