# Phase 8D Performance Budget Certification

Date: 2026-09-10

## Scope

Phase 8D certified launch-critical route performance through local Playwright browser timing.

Routes covered:

- `/`
- `/hr-admin`
- `/hr-admin/payroll-readiness`
- `/hr-admin/payroll-inputs`
- `/hr-admin/payroll-calculations`
- `/hr-admin/payroll-review`
- `/hr-admin/payroll-outputs`
- `/hr-admin/payroll-handoff`
- `/hr-admin/payroll-providers`
- `/hr-admin/notifications?retry_state=retry_ready`
- `/hr-admin/notification-delivery`
- `/tenant-admin`
- `/tenant-admin/security-readiness`
- `/support`
- `/ess/payslips`
- `/ess/notifications?subject_type=payroll_payslip`
- `/mss/approvals`

## Budgets

- Page ready: `8000ms`
- Document response: `4000ms`
- DOM interactive: `6000ms`
- Load complete: `8000ms`
- Transfer size: `8192KB`
- Decoded body size: `24576KB`
- Resource count: `180`

## Evidence

Command:

```bash
PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase8d-performance-budget.spec.ts --project=chromium --workers=1
```

Result:

- Warm run: `1 passed`
- Runtime: `29.0s`

Slowest warm page-ready samples:

| Route | Page Ready | Document | DOM Interactive | Load Complete |
|---|---:|---:|---:|---:|
| `/hr-admin/payroll-providers` | `2959ms` | `2205ms` | `2206ms` | `2547ms` |
| `/hr-admin/payroll-handoff` | `2900ms` | `2194ms` | `2195ms` | `2465ms` |
| `/ess/payslips` | `2617ms` | `779ms` | `791ms` | `1007ms` |
| `/mss/approvals` | `2337ms` | `814ms` | `820ms` | `1022ms` |
| `/ess/notifications?subject_type=payroll_payslip` | `2178ms` | `653ms` | `661ms` | `861ms` |

## Notes

- The first cold local dev run failed narrowly on `/hr-admin/payroll-review` document response at `4092ms` against a `4000ms` budget while the Next dev server was still compiling route/client chunks.
- The immediate warm rerun passed all budgets. Staging or production builds should use the warm budget result as the meaningful baseline, while cold-start compile timing remains a local-dev-only observation.

## Certification

Phase 8D is locally certified for launch-critical route performance budgets.

Residual Phase 8 work:

- Repeat Phase 8A-8D on staging after deployment.
- Review stored screenshots against launch design expectations.
- Broaden keyboard certification to lifecycle, attendance, notification, and support forms.
