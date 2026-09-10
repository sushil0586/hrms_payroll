# Phase 9A HR Admin Performance Optimization

Date: 2026-09-10

## Scope

Phase 9A targeted the two slowest Phase 8 staging page-ready samples:

- `/hr-admin`
- `/hr-admin/notifications?retry_state=retry_ready`

## Finding

The `/hr-admin` landing page waited for nine independent live API calls before rendering:

- Dashboard
- Employees
- Organization snapshot
- Leave types
- Attendance policies
- Workflow templates
- Document categories
- Onboardings
- Notification templates

Most visible landing-card metrics were already available in the dashboard payload, so the extra fetches were redundant for the first viewport.

## Change

`/hr-admin` now renders from the consolidated HR admin dashboard payload only.

The visible card metrics now use aggregate dashboard fields:

- Total and active employees
- Departments and branches
- Active memberships
- Active leave and attendance policies
- Workflow template count
- Document category count
- Pending onboardings
- Active notification template count

## Evidence

TypeScript:

```bash
pnpm --dir web exec tsc --noEmit
```

Result:

- Passed

Browser UX/accessibility smoke with local optimized frontend and staging backend:

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm --dir web exec playwright test tests/e2e/phase8a-workspace-shell-ux-accessibility.spec.ts --project=chromium --workers=1
```

Result:

- `2 passed`
- Runtime: `1.1m`

Performance timing with local optimized frontend and staging backend:

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm --dir web exec playwright test tests/e2e/phase8d-performance-budget.spec.ts --project=chromium --workers=1
```

Result:

- `1 passed`
- Runtime: `56.3s`

Key samples:

| Route | Page Ready | Document | DOM Interactive | Load Complete |
|---|---:|---:|---:|---:|
| `/hr-admin` | `6396ms` | `2431ms` | `2446ms` | `2655ms` |
| `/hr-admin/notifications?retry_state=retry_ready` | `3668ms` | `2952ms` | `2959ms` | `3212ms` |

## Certification

Phase 9A local optimized-frontend validation passed.

Next verification step:

- Commit these changes.
- Deploy to staging.
- Rerun Phase 8D against `https://hrms.accerio.in` to confirm the public staging page-ready improvement.
