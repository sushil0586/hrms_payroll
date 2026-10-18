# Phase L4 Execution Evidence

Date: 2026-10-16

## Browser Evidence

```text
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3161 \
  HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 \
  pnpm --dir web exec playwright test tests/e2e/long-running-loading-feedback.spec.ts \
  --workers=1 --reporter=line

Focused outcomes against the production build:
- report export delayed 2,000 ms failure plus 750 ms retry: passed; acknowledgement 158 ms; attempts 2
- multipart document upload delayed 2,000 ms failure: passed; acknowledgement 164 ms; attempts 1
- desktop and 390x844 compact overflow checks: passed
```

Result: 2 passed (30.0s). The report case preserved the original `href`, surfaced the 503, restored an explicit Retry link, emitted a browser download only after HTTP 200, and blocked duplicate activation. The upload case retained title and selected file after the 503 and returned the action to an enabled state.

```text
PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME=pw_l4_payroll_job_hr_admin \
  PLAYWRIGHT_PAYROLL_BACKGROUND_RUN_ID=20a01c56-5bc8-4e93-a4ba-32133eef3332 \
  pnpm --dir web exec playwright test tests/e2e/payroll-background-job-recovery.spec.ts \
  --workers=1 --reporter=line --trace=retain-on-failure
Result: 1 passed (9.0s)
```

This used a disposable Enterprise workspace, Redis, a real Celery worker, and Celery beat. The browser received HTTP 202, observed durable queued/running/completed state, reloaded, restored the job from persisted state, and verified completed items through the secure status API.

An earlier run remained queued because the worker was running without the required outbox dispatcher/beat. It is classified as an environment configuration failure and retained at `/tmp/l4-payroll-job-results`; the passing full-stack rerun is at `/tmp/l4-payroll-job-results-2`.

## Regression Evidence

```text
pytest -q backend/apps/payroll/tests.py::PayrollScheduleSpineCalculationTests \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_async_calculation_is_durable_idempotent_and_permission_scoped \
  backend/tests/test_phase0_api_smoke.py::test_payroll_provider_job_runtime_heartbeat_and_stale_recovery \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_can_upload_and_download_employee_document_artifact \
  backend/tests/test_phase0_api_smoke.py::test_report_exports_require_category_export_permissions
Result: 9 passed

pnpm --dir web exec playwright test tests/e2e/workforce-report-certification.spec.ts --workers=1
Result: 2 passed

pnpm --dir web typecheck
pnpm --dir web exec eslint <L4 changed source and test files>
pnpm --dir web build
Result: passed; existing Autoprefixer `end` warning only
```

The ESS documents neighboring suite produced one fixture-limited failure because the disposable employee had zero assigned document requirements; the upload action was therefore correctly disabled. That run is not counted as a product failure. The focused authorized HR document upload covered the transfer behavior with deterministic employee/category fixtures.

## Cleanup

- `manage_playwright_workspace --seed-ref l4-payroll-job --cleanup`: `verified_absent=true`.
- Independent tenant query for `pw-qa-l4*`: empty.
- Temporary `hrms-l4-redis` container removed.
- Local Celery worker, beat, backend, and frontend processes stopped.
- Generated `backend/celerybeat-schedule` removed.
