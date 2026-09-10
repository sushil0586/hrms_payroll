# Phase 7I Payroll Artifact Access CSV Certification

Date: 2026-09-09

Environment: local dev

## Scope

Phase 7I certifies payroll artifact access-audit CSV export content and authorization boundaries.

## Browser Coverage

- HR admin opens `/hr-admin/payroll-outputs`.
- Artifact register and first `Download file` link are visible.
- HR admin downloads a payroll artifact to create access evidence.
- `Export access audit` link points to the same artifact ID.
- HR admin clicks `Export access audit` through the browser.
- Downloaded CSV filename ends with `-access-audit.csv`.
- ESS payslip page does not expose `Export access audit`.
- HR admin payroll output page and ESS page pass horizontal overflow checks.

## CSV Evidence

- CSV header exactly matches the export contract:
  - `row_type`
  - `artifact_id`
  - `artifact_key`
  - `event_or_grant_id`
  - `event_type`
  - `status`
  - `source_channel_ref`
  - `actor_identifier`
  - `request_identifier`
  - `signed_access_grant_id`
  - `notification_id`
  - `storage_provider_ref`
  - `storage_object_version`
  - `download_strategy_ref`
  - `checksum_sha256`
  - `occurred_at`
  - `expires_at`
  - `revoked_at`
  - `access_count`
  - `metadata_snapshot`
- Parsed rows are artifact-scoped to the selected artifact ID.
- Parsed rows include a `downloaded` access event.
- Parsed rows include 64-character checksum evidence.
- Parsed rows include payroll download strategy refs.

## Authorization Evidence

- HR admin CSV API returns `200`, `text/csv`, attachment disposition, artifact checksum header, and positive row-count header.
- Anonymous session is denied and does not receive CSV content.
- Employee session is denied and does not receive CSV content.

## Suite

- `web/tests/e2e/phase7i-payroll-artifact-access-csv.spec.ts`

Result:

- `1 passed`

## Residual Risks

- Meter-specific payroll run and provider connection usage-limit slices remain pending.
- Entitlement-aware disabled navigation states remain pending.
