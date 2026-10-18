# RG-2A Financial Integrity Evidence

Date: 2026-10-18  
Environment: isolated PostgreSQL 16 on port 55465, production-built Next.js, local Django API, synthetic disposable tenants only.

## Before state

The original API test used one authenticated HR admin to create, submit, approve and apply a payroll adjustment. It passed against PostgreSQL (**1 passed in 59.90s**), proving that possession of both permissions bypassed maker/checker separation.

## Remediation verification

```bash
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 \
POSTGRES_PORT=55465 POSTGRES_DB=hrms_rg2a POSTGRES_USER=hrms \
POSTGRES_PASSWORD=rg2a-test backend/.venv/bin/pytest -q --ds=config.settings.base \
  backend/tests/test_dd5_payroll_adjustment_integrity.py \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_adjustment_create_approve_and_apply \
  backend/tests/test_phase0_api_smoke.py::test_payroll_reviewer_cannot_approve_adjustment_without_approve_permission \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_draft_calculation_consumes_applied_adjustments
```

Result: **5 passed**. The maker receives HTTP 400, the adjustment stays submitted, a distinct authorized checker succeeds, and direct queryset mutation to the maker ID is rejected by PostgreSQL.

The expanded statutory/adjustment/settlement/provider/finance command covered 15 tests and returned **15 passed in 154.05s**. Additional durable-job, protected-download, and concurrent-history tests returned **3 passed**.

Production browser:

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3117 \
HRMS_API_BASE_URL=http://127.0.0.1:8017/api/v1 HRMS_ENABLE_DEMO_DATA=false \
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 \
POSTGRES_PORT=55465 POSTGRES_DB=hrms_rg2a POSTGRES_USER=hrms \
POSTGRES_PASSWORD=rg2a-test pnpm --dir web exec playwright test \
  tests/e2e/dd5-payroll-adjustment-integrity.spec.ts \
  --project=chromium --workers=1 --reporter=list --trace=retain-on-failure
```

The first run was not counted: fixture provisioning found that only the payroll migration branch had been applied during rollback testing. After `python backend/manage.py migrate --noinput` applied the complete graph, the unchanged composite browser scenario passed: **1 passed in 39.5s**.

## Reconciliation

- PF configured oracle: INR 30,000 basic, INR 15,000 ceiling, 12% employee/employer = **INR 1,800 each**.
- TDS configured oracle: INR 240,000 annualized, INR 50,000 allowed declaration cap, INR 190,000 configured taxable basis, INR 4,000 annual tax over eight periods = **INR 500**.
- FnF configured lines: INR 15,000 earned + INR 5,000 encashment - INR 2,500 recovery = **INR 17,500**.
- Payroll with settlement lines: INR 50,000 gross - INR 4,300 employee deductions = **INR 45,700 net**.

These prove only explicit repository configuration, not statutory law or approval of automatic FnF/arrears policy.

## Other checks

- Migration `0042` forward/rollback/reapply: passed.
- Django checks: passed.
- Migration drift: none.
- TypeScript and ESLint: passed.
- Next.js production build: passed with the existing CSS autoprefixer warning.
- Backend production Docker build: passed.
- Disposable Playwright tenants after run: `[]`.
- RG-2A application services stopped; PostgreSQL container and temporary backend image removed.

No Northstar, staging, production, customer, real payment, email, or provider transaction was accessed.
