# Phase 6D Provider Retry Worker Certification

Date: 2026-09-09

## Scope

Certified provider retry and queue execution behavior for the HR admin Payroll Handoff workspace.

## Browser Coverage

- Page: `/hr-admin/payroll-handoff`
- Persona: HR admin
- Created or reused a bank advice provider delivery.
- Forced a retryable transient provider failure through the signed callback endpoint.
- Verified visible Handoff controls:
  - Retry commands
  - Schedule retry
  - Requeue delivery
  - Retry state
  - Worker
  - Submission contract
- Scheduled a due retry through the authenticated same-origin route.
- Opened retry evidence drilldown and verified:
  - Retry Evidence
  - Decision snapshot
  - Backoff seconds
- Ran the local provider job worker.
- Reopened queue job evidence and verified:
  - Queue Runtime Evidence
  - Runtime policy
  - Heartbeat seconds
  - Attempt
- Verified no horizontal overflow on the certified workspace.

## Backend Contract Coverage

- Retry scheduling creates a scheduled retry event and queued provider retry job.
- Requeue transitions the delivery back to submitted and records retry context.
- Worker command executes due retry events and completes the provider job.
- Retry budget exhaustion creates a dead-lettered retry event.
- Stale running jobs recover once and dead-letter after recovery limits are exhausted.

## Verification

- `PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase6d-provider-retry-worker.spec.ts --project=chromium`
- `source .venv/bin/activate && pytest backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_provider_delivery_retry_and_dead_letter_contract backend/tests/test_phase0_api_smoke.py::test_payroll_provider_retry_worker_processes_due_events backend/tests/test_phase0_api_smoke.py::test_payroll_provider_job_runtime_heartbeat_and_stale_recovery -q`

## Result

- Browser retry-worker certification: passed.
- Backend retry/dead-letter contract tests: passed.
- Phase 6 retry/dead-letter confidence: 91%.

## Residuals

- Notification provider failure and retry evidence remains the next Phase 6 item.
