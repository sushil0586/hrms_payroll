# HRMS STG-1A Tooling Implementation

Date: 2026-10-26
Scope: STG-E2E-0101 through STG-E2E-0106
Decision: PASS for local tooling implementation; staging execution remains unauthorized.

## Implemented Tools

- `web/tests/helpers/staging-run-manifest.ts` writes an append-only JSONL ownership journal with `fsync` after every event.
- `web/tests/e2e/stg0d-batch1-onboarding.spec.ts` records run, scenario, resource, result, candidate and deployment provenance while preserving all six frozen IDs.
- `backend/apps/common/staging_onboarding.py` parses the journal, validates exact UUID ownership, collects read-only PostgreSQL evidence, and plans or executes governed cleanup.
- `manage_staging_onboarding_run` exposes only `evidence` and `cleanup`; cleanup is dry-run unless `--execute` and all independent controls are present.
- `backend/tests/test_stg1a_staging_onboarding_tooling.py` verifies ownership, evidence, refusal, rollback, retry and idempotency behavior on PostgreSQL.

No product onboarding rule, API contract, migration, or staging deployment was changed. The pre-existing payroll Playwright repair remains separate and untouched.

## Identity Controls

Strict mode requires an approved platform-admin reference, `pw-qa-stg1-*` tenant namespace, synthetic recipient domain, SES delivery mode, secret-source reference, deployment SHA/digests, and environment fingerprint. Passwords, bearer tokens, cookies and session values are not written to the manifest or evidence output.

## Candidate Files

- `backend/apps/common/staging_onboarding.py`
- `backend/apps/common/management/commands/manage_staging_onboarding_run.py`
- `backend/tests/test_stg1a_staging_onboarding_tooling.py`
- `backend/tests/test_stg0d_batch1_onboarding_integrity.py`
- `web/tests/helpers/staging-run-manifest.ts`
- `web/tests/e2e/stg0d-batch1-onboarding.spec.ts`
- The four STG-1A reports and dashboard update

These files are uncommitted. Earlier approved STG documentation also remains untracked and must be handled through the exact candidate manifest review.
