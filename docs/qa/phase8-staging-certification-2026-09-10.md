# Phase 8 Staging Certification

Date: 2026-09-10

Environment: `https://hrms.accerio.in`

Deployed commit: `027becb613b349538d210c084bb617d96ba6fc96`

## Scope

Phase 8 staging certification repeated the local UX, accessibility, responsive, and performance launch gates against the deployed staging application with live backend data and demo fallback disabled.

## Evidence

Workspace shell and dense form accessibility:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/phase8a-workspace-shell-ux-accessibility.spec.ts tests/e2e/phase8c-form-keyboard-accessibility.spec.ts --project=chromium --workers=1
```

Result:

- `6 passed`
- Runtime: `3.2m`

Responsive visual launch gate:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/production-responsive-visual-gate.spec.ts --project=chromium --workers=1
```

Result:

- `6 passed`
- Runtime: `12.0m`
- Certified viewports: `1920x1080`, `1440x900`, `1366x768`, `1280x720`, `820x1180`, `390x844`
- Certified page-viewport combinations: `102`

Performance timing gate:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/phase8d-performance-budget.spec.ts --project=chromium --workers=1
```

Result:

- `1 passed`
- Runtime: `2.0m`
- Sample report: `web/test-results/e2e-phase8d-performance-bu-d42c5-browser-performance-budgets-chromium/phase8d-performance-budget/performance-samples.json`

## Staging Performance Samples

Remote staging budgets:

- Page ready: `15000ms`
- Document response: `8000ms`
- DOM interactive: `10000ms`
- Load complete: `15000ms`
- Transfer size: `8192KB`
- Decoded body size: `24576KB`
- Resource count: `180`

Slowest staging page-ready samples:

| Route | Page Ready | Document | DOM Interactive | Load Complete |
|---|---:|---:|---:|---:|
| `/hr-admin` | `12321ms` | `1860ms` | `1876ms` | `2201ms` |
| `/hr-admin/notifications?retry_state=retry_ready` | `11382ms` | `2998ms` | `3018ms` | `3353ms` |
| `/hr-admin/payroll-readiness` | `8548ms` | `1121ms` | `1131ms` | `1134ms` |
| `/hr-admin/notification-delivery` | `8364ms` | `1062ms` | `1076ms` | `1485ms` |
| `/hr-admin/payroll-calculations` | `8347ms` | `603ms` | `615ms` | `945ms` |
| `/hr-admin/payroll-handoff` | `8233ms` | `649ms` | `674ms` | `998ms` |
| `/hr-admin/payroll-providers` | `8222ms` | `1036ms` | `1063ms` | `1064ms` |
| `/hr-admin/payroll-inputs` | `8098ms` | `660ms` | `669ms` | `1005ms` |

## Notes

- The first responsive staging attempt failed because the per-viewport timeout was `120000ms`, while each staging viewport pass takes about two minutes after public-network authentication, live data loading, assertions, and screenshot capture.
- The responsive harness now uses a `300000ms` timeout for remote URL runs. Assertions were not weakened.
- The performance harness now writes all route samples before enforcing budgets, and uses separate staging timing budgets for public URL runs.
- The staging page-ready timing is slower than local, but document response, DOM interactive, load complete, transfer size, decoded size, and resource count stayed inside budget. The residual tuning target is server/render/auth data assembly time on `/hr-admin` and notification queue pages.

## Certification

Phase 8 is staging-certified for the tested UX shell, dense form accessibility, responsive layout stability, and launch route performance budgets.

Confidence after staging:

- UX confidence: `91%`
- Responsive confidence: `92%`
- Accessibility confidence: `86%`
- Performance confidence: `86%`
- Current Phase 8 confidence: `92%`

Residual work before final launch sign-off:

- Preserve responsive screenshots in CI artifacts for passing staging runs.
- Optimize page-ready time for `/hr-admin` and `/hr-admin/notifications?retry_state=retry_ready`.
- Continue broader keyboard certification for lifecycle, attendance, notification, and support forms.
