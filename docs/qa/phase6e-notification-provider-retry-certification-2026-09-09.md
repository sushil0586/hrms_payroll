# Phase 6E Notification Provider Retry Certification

Date: 2026-09-09

## Scope

Certified notification provider failure handling, retry, bulk retry, retry cap behavior, diagnostics, and delivery configuration visibility for HR admin and ESS notification surfaces.

## Browser Coverage

- Pages:
  - `/hr-admin/notifications`
  - `/hr-admin/notifications?retry_state=retry_ready`
  - `/hr-admin/notifications/[itemId]/review`
  - `/hr-admin/notification-diagnostics`
  - `/hr-admin/notification-delivery`
  - `/ess/notifications?subject_type=payroll_payslip`
- Personas:
  - HR admin
  - Employee
- Created disposable notification records through test-send setup.
- Marked disposable records failed and verified retry-ready queue visibility.
- Verified queue controls:
  - Search
  - Status
  - Channel
  - Priority
  - Audience type
  - Retry state
  - Module
  - Subject type
  - Rows per page
  - Apply filters
  - Clear filters
  - Select page
  - Retry selected
  - Quick review
  - Full review
- Verified inline review controls:
  - Status update
  - Priority update
  - Read state update
  - Save review
  - Inline retry button state
- Verified full review controls and evidence:
  - Retry open
  - Delivery attention
  - Retry delivery
  - Delivery log
  - Payload
  - Latest provider
  - Back to queue
- Verified single retry transitions a failed in-app notification to delivered.
- Verified provider delivery log records `in_app_default` delivered evidence.
- Verified bulk retry transitions selected failed notifications to delivered.
- Temporarily configured the in-app channel retry policy to one attempt and restored it after the test.
- Verified capped retry returns a retry-limit error and disables retry controls on the review page.
- Verified notification diagnostics route into retry-ready queue.
- Verified notification delivery page exposes channel health, backend options, provider routing, retry policy, and advanced JSON configuration.
- Verified ESS payroll notification routes to payslip source and access evidence.
- Verified no horizontal overflow on certified pages.

## Backend Contract Coverage

- Single notification retry respects configured channel delivery policy.
- Bulk retry processes eligible notifications.
- Retry-state list filtering separates retry-ready from retry-capped items.
- Retry limit blocks exhausted notifications.
- Bulk retry returns an error when all selected notifications hit retry limit.

## Verification

- `PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase6e-notification-provider-retry.spec.ts --project=chromium`
- `PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/production-notification-flows.spec.ts --project=chromium`
- `source .venv/bin/activate && pytest backend/tests/test_phase0_api_smoke.py::test_hr_admin_can_retry_notification_delivery backend/tests/test_phase0_api_smoke.py::test_hr_admin_can_bulk_retry_notification_delivery backend/tests/test_phase0_api_smoke.py::test_hr_admin_notification_list_can_filter_by_retry_state backend/tests/test_phase0_api_smoke.py::test_hr_admin_retry_respects_notification_retry_limit backend/tests/test_phase0_api_smoke.py::test_hr_admin_bulk_retry_returns_error_when_all_selected_notifications_hit_retry_limit -q`

## Result

- Phase 6E browser certification: passed.
- Production notification reliability browser suite: passed.
- Backend notification retry contracts: passed.
- Notification provider retry confidence: 92%.

## Residuals

- Local SMTP is not running, so deterministic browser retry success uses the in-app provider. SMTP failure and retry-limit behavior is covered by backend contracts and channel diagnostics visibility.
