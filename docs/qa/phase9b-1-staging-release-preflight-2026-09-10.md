# Phase 9B-1 Staging Release Preflight

Date: 2026-09-10

Environment: `https://hrms.accerio.in`

Deployed release: `/var/www/hrms-payroll-saas/release-20260910025407`

Deployed commit: `44eefe293b4a99d9acd6e8a42ac14980156e3ff9`

## Deployment Evidence

Backend:

- Django system check: passed
- Migrations: no pending migrations
- Static collection: `163` files copied
- Service status after cutover: active

Frontend:

- Next production build: passed
- Generated static pages: `184/184`
- Service status after cutover: active

Gateway:

- Nginx config test: passed
- Nginx reload: passed
- Public HTTP check: `200 OK`

## Browser Preflight Evidence

Command:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/phase8a-workspace-shell-ux-accessibility.spec.ts tests/e2e/phase8d-performance-budget.spec.ts --project=chromium --workers=1
```

Result:

- `3 passed`
- Runtime: `3.7m`

Coverage:

- Workspace chooser loaded.
- HR admin workspace loaded.
- Employee list workspace path loaded.
- SaaS control plane loaded.
- Tenant admin console loaded.
- Platform admin loaded.
- ESS payslips loaded.
- MSS approvals loaded.
- Support console loaded.
- Desktop and mobile shell/accessibility checks passed.
- Launch-critical performance route set passed with demo fallback disabled.

## Performance Snapshot

Slowest page-ready samples:

| Route | Page Ready | Document | DOM Interactive | Load Complete |
|---|---:|---:|---:|---:|
| `/hr-admin` | `10674ms` | `1012ms` | `1031ms` | `1356ms` |
| `/hr-admin/payroll-outputs` | `8601ms` | `1323ms` | `1347ms` | `1678ms` |
| `/hr-admin/payroll-calculations` | `8151ms` | `615ms` | `639ms` | `967ms` |
| `/hr-admin/notifications?retry_state=retry_ready` | `7636ms` | `1100ms` | `1142ms` | `1496ms` |
| `/hr-admin/notification-delivery` | `7413ms` | `1050ms` | `1081ms` | `1462ms` |
| `/hr-admin/payroll-providers` | `7403ms` | `962ms` | `981ms` | `981ms` |
| `/hr-admin/payroll-review` | `7315ms` | `617ms` | `637ms` | `957ms` |
| `/hr-admin/payroll-inputs` | `7314ms` | `598ms` | `612ms` | `947ms` |

## Certification

Phase 9B-1 staging release preflight passed.

Residual before final release sign-off:

- `/hr-admin` remains the slowest page-ready route at `10674ms`; continue backend/dashboard selector optimization if targeting sub-`10000ms` public staging readiness.
- Run Phase 9B-2 full role and workflow rehearsal next.
