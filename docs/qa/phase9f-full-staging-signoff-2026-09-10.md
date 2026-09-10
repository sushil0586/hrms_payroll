# Phase 9F Full Staging Sign-Off

Date: 2026-09-10

## Purpose

Run the full staging launch sign-off pack after Phase 9E closed the final browser-visible launch warnings.

## Staging Deployment

- URL: `https://hrms.accerio.in`
- Release: `/var/www/hrms-payroll-saas/release-20260910052149`
- Commit: `c447c6c3a65331ad76cc5e8e5e9aa105a243ae2b`
- Tenant: `northstar-foods`

## Full Sign-Off Command

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
HRMS_ENABLE_DEMO_DATA=false \
pnpm qa:launch-signoff:staging
```

## Result

- Decision: `PILOT READY - STAGING CONTRACT PASS`
- Report: `web/qa-artifacts/production-launch-signoff-20260910T060244Z/launch-signoff-report.md`

Command results:

- Django check: passed
- Django migration dry run: passed
- HRMS launch audit command: passed
- Payroll provider launch rehearsal command: passed
- SaaS commercial usage snapshot command: passed
- Backend launch rehearsal tests: passed
- Web typecheck: passed
- Web lint: passed
- Playwright production suites A-I: passed

Browser result:

- `32 passed`
- `3 skipped`
- Runtime: `17.9m`

Skipped browser tests:

- Production provider callback ledger evidence.
- Production provider retry and queue recovery evidence.
- Production provider delivery drilldown and provider audit pack evidence.

These remain skipped because real provider callback/live ingress handles are not enabled for the staging contract run.

## Live Staging Audit

Because the full sign-off script runs Django management commands against the local configured Django database, a separate live staging audit was run over SSH on the deployed server.

Provider rehearsal:

- `status`: `ready`
- `can_launch`: `true`
- `ready_lane_count`: `3`
- `blocked_lane_count`: `0`
- `launch_blocker_count`: `0`
- `evidence_checksum_sha256`: `985de4d64b8d492e6aa7385518513962bb96708f1f866e45c47ddc274ddbee59`

HRMS launch audit:

- `status`: `ready`
- `can_launch`: `true`
- `passed_gate_count`: `51`
- `gate_count`: `51`
- `blocker_count`: `0`
- `warning_count`: `0`
- `release_action_count`: `0`
- `release_blocker_refs`: `[]`
- `release_warning_refs`: `[]`
- `evidence_checksum_sha256`: `00c40fae8a726b9d17da014089bd38eb2fc48daf7ccfda9ffca44b0214b0a19f`

## Fixes During Sign-Off

Two Playwright expectations were corrected after the first full sign-off attempt:

- Launch remediation now accepts the valid zero-risk empty state instead of requiring a stale `Primary bank coverage` remediation row.
- Live mutation visibility test timeout increased to `90s` because it intentionally navigates multiple staging workspaces.

Targeted rerun:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
HRMS_ENABLE_DEMO_DATA=false \
pnpm --dir web exec playwright test \
  tests/e2e/production-live-mutation-readiness.spec.ts \
  tests/e2e/production-launch-release-gate.spec.ts \
  --project=chromium \
  --workers=1
```

Result:

- `8 passed`
- Runtime: `2.2m`

## Residual Production Exceptions

- Real payroll provider credentials/transports must be validated with official sandbox or production runbooks.
- Real SSO/MFA/SCIM identity-provider execution must be validated for enabled enterprise tenants.
- Real email/SMS/notification provider delivery must be validated outside local demo mode.
- Object storage IAM, KMS, lifecycle, malware scan, durability, and signed URL behavior must be verified in the target environment.
- Backup/restore, monitoring, alerting, and incident-response runbooks must be executed in the target environment.

## Decision

The staging contract is passed for pilot readiness. Production launch still requires the listed real-provider and operations runbook evidence.
