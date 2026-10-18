# DD-5A execution evidence

Date: 2026-10-18  
Environment: isolated PostgreSQL 16 (`hrms_dd5a`), local Django service, production-built Next.js service, synthetic disposable workspaces only.

## Historical reproduction retained

The first PostgreSQL run added a correctly signed, newly keyed `FAILED` callback after a successful `RECONCILED` callback. It failed with:

```text
django.core.exceptions.ValidationError:
{'status': ['Reconciled payroll provider deliveries are immutable.']}
Internal Server Error: /api/v1/payroll-provider-callbacks/
```

This established an application error-handling and callback-ordering defect, not fixture drift. The database immutability guard prevented the terminal row from being changed.

## Commands

```bash
docker run -d --name hrms-dd5a-postgres \
  -e POSTGRES_DB=hrms_dd5a -e POSTGRES_USER=hrms \
  -e POSTGRES_PASSWORD=dd5a-test -p 55458:5432 postgres:16-alpine

DJANGO_SETTINGS_MODULE=config.settings.base \
DJANGO_DB_ENGINE=django.db.backends.postgresql \
POSTGRES_DB=hrms_dd5a POSTGRES_USER=hrms POSTGRES_PASSWORD=dd5a-test \
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55458 \
backend/.venv/bin/python backend/manage.py migrate --noinput

backend/.venv/bin/pytest -q --reuse-db \
  backend/tests/test_dd5_payroll_adjustment_integrity.py \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_draft_calculation_consumes_configured_statutory_components \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_adjustment_create_approve_and_apply \
  backend/tests/test_phase0_api_smoke.py::test_payroll_reviewer_cannot_approve_adjustment_without_approve_permission \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_draft_calculation_consumes_applied_adjustments \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_settlement_lifecycle_applies_to_calculation \
  backend/tests/test_phase0_api_smoke.py::test_payroll_provider_callback_endpoint_verifies_idempotent_delivery_updates \
  backend/tests/test_phase0_api_smoke.py::test_payroll_provider_callback_endpoint_enforces_strict_security_policy \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_provider_delivery_retry_and_dead_letter_contract \
  backend/tests/test_phase0_api_smoke.py::test_payroll_provider_retry_worker_processes_due_events \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_finance_handoff_generate_and_transmit
```

Result: **11 passed**. A final callback-only run after lock-order normalization also passed.

Browser command:

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3115 \
HRMS_API_BASE_URL=http://127.0.0.1:8015/api/v1 \
DJANGO_SETTINGS_MODULE=config.settings.base \
DJANGO_DB_ENGINE=django.db.backends.postgresql \
POSTGRES_DB=hrms_dd5a POSTGRES_USER=hrms POSTGRES_PASSWORD=dd5a-test \
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55458 \
pnpm --dir web exec playwright test \
  tests/e2e/dd5-payroll-adjustment-integrity.spec.ts \
  --project=chromium --workers=1 --reporter=list
```

The first browser attempt used a frontend API base without `/api/v1` and failed login with backend `/auth/login` HTTP 404. The second used `HRMS_ENABLE_DEMO_DATA=true`, which the production runtime correctly rejects, and rendered HTTP 500 before the workflow. Both were classified as local environment configuration failures. With `/api/v1` and `HRMS_ENABLE_DEMO_DATA=false`, the unchanged test passed: **1 passed in 29.2 seconds**.

Checks:

```bash
pnpm --dir web typecheck
pnpm --dir web exec eslint tests/e2e/dd5-payroll-adjustment-integrity.spec.ts
DJANGO_SETTINGS_MODULE=config.settings.base backend/.venv/bin/python backend/manage.py check
DJANGO_SETTINGS_MODULE=config.settings.base backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run
pnpm --dir web build
```

## Persisted-state assertions

- Late callback event: processed, authenticated, unique idempotency key retained.
- Processing evidence: received status `failed`; mutation skipped because reconciled deliveries are immutable.
- Provider delivery: remained `reconciled`.
- Finance handoff: status before and after the late callback matched.
- Bad signature: rejected without mutation.
- Exact replay: one callback event and replay response.
- Adjustment race: one terminal decision succeeds and one stale competing decision is rejected.
- FnF settlement line identity: settlement ID and line ID persist into applied adjustment provenance and calculation consumption.

No real provider transaction, payment, email or customer record was used.

Cleanup verification returned `remaining_playwright_tenants=[]`; Django and Next services were stopped and the `hrms-dd5a-postgres` container was removed.
