# DD-6A Durable ESS/MSS Mutation Idempotency Certification

Date: 2026-10-18  
Decision: **PASS**  
Frozen scenario updated: `DD-SS-008` from Partial to Verified

## Scope and architecture

DD-6A adds one shared mutation contract for ESS leave submission, ESS attendance regularization, and MSS leave/attendance approval or rejection. Existing clients without an `Idempotency-Key` remain compatible; current browser clients generate a UUID key, bind it to the normalized operation payload in `sessionStorage`, retain it after transport failure, and clear it only after a confirmed success.

`common.MutationIdempotencyRecord` persists the globally unique key, tenant, authenticated actor, action, SHA-256 request fingerprint, canonical HTTP response, resulting resource ID, status, attempts, completion time and expiry. PostgreSQL advisory transaction locks serialize concurrent use of one key. The record and business mutation commit atomically.

Every replay still performs endpoint authentication and permission checks. A key owned by another tenant, actor or action returns HTTP 409. Reuse with a changed payload returns HTTP 409. A completed successful operation returns its canonical response with `Idempotency-Replayed: true`. In-progress operations return HTTP 409 with `Retry-After`; retryable 5xx outcomes may execute again under the same lock. The default replay window is 24 hours (`MUTATION_IDEMPOTENCY_REPLAY_SECONDS`), after which the retained key is a non-reusable tombstone to prevent accidental duplicate execution.

## Before and after

Before DD-6A, the production browser could commit a leave request, lose the response, and create no duplicate, but its retry surfaced an overlap validation conflict. After DD-6A, the same deliberate response-loss sequence returns the original HTTP 201 response on retry, closes the dialog successfully, and retains exactly one leave request.

The same contract covers attendance regularization and MSS approve/reject actions. It does not bypass leave overlap validation, attendance constraints, manager scope, tenant permissions or workflow state rules; these remain the mutation operation's authority.

## Executed evidence

### PostgreSQL and API

Command (environment values abbreviated):

```bash
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55432 \
  ./.venv/bin/pytest \
  tests/test_phase0_api_smoke.py::test_employee_leave_idempotency_replays_canonical_success_and_rejects_mismatch \
  tests/test_phase0_api_smoke.py::test_manager_decision_idempotency_replays_after_workflow_completion \
  tests/test_phase0_api_smoke.py::test_concurrent_employee_leave_requests_with_one_key_create_one_mutation \
  tests/test_phase0_api_smoke.py::test_attendance_submission_and_manager_rejection_replay_canonical_results \
  tests/test_phase0_api_smoke.py::test_employee_cannot_use_manager_approval_actions -q
```

Result: **5 passed in 90.05s**. The concurrent case used two independent database connections; both responses were HTTP 201 with the same resource, exactly one was marked replayed, and one leave plus one idempotency record existed. Cross-actor key reuse, changed-payload reuse and unauthorized manager actions were rejected.

An initial local-settings attempt was retained as environment evidence and not counted: SQLite could not apply the existing PostgreSQL-only DB-4 trigger migration. All certification tests ran on PostgreSQL 16.

### Production-built browser

```bash
pnpm --dir web build
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110 \
  PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8001/api/v1 \
  pnpm --dir web exec playwright test \
  tests/e2e/dd6-ess-mss-domain-certification.spec.ts --workers=1
```

Result: **3 passed in 44.2s**. The focused lost-response case passed independently in 16.0s. One earlier attempt used an unrelated process already bound to port 3100 and failed fixture login before scenario execution; it was not counted. The isolated production build ran on port 3110.

### Static, migration and build checks

- Django check: passed.
- Migration drift: none; additive migration `common.0009_mutation_idempotency` applied successfully.
- TypeScript: passed.
- Focused ESLint: passed.
- Next.js optimized production build: passed. The existing `align-items: end` autoprefixer warning remains unrelated.

## Security and recovery outcomes

- Lost committed response: canonical success replayed, one business mutation.
- Concurrent duplicate submission: serialized safely, one result.
- Same key/different payload: HTTP 409, no second mutation.
- Cross-actor/tenant/action scope: HTTP 409; a key is not an authorization credential.
- Session expiry: unauthenticated request remains rejected; the browser key survives for retry after normal reauthentication.
- Manager decision replay: canonical result remains available after workflow completion, but current permission checks still execute.
- Attachments: file digest is included in the request fingerprint; artifact storage occurs inside the guarded mutation transaction.
- Failed/in-progress operations: no fabricated success; bounded retry semantics and actionable conflict responses are preserved.

## Cleanup and limitations

All disposable browser and manually provisioned workspaces were removed. PostgreSQL reported `0` tenants matching `pw-qa-%`. The isolated frontend/backend processes and PostgreSQL container were removed after evidence capture.

The 24-hour replay duration is an operational default and can be externally configured. Expired keys are deliberately not reused. This phase does not add idempotency to unrelated HR Admin mutations or background jobs that already have their own domain-specific contracts.

DD-6A is **PASS** and `DD-SS-008` is Verified. This is local certification only; production readiness is not claimed, and DD-7 was not started.
