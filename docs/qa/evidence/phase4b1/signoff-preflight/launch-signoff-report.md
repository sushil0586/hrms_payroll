# HRMS Payroll SaaS Launch Sign-Off

Generated: 2026-10-10T11:30:07Z
Mode: `staging`
Tenant: `northstar-foods`
Preflight only: `true`
Decision: `STAGING PREFLIGHT BLOCKED`

## Command Results

| Step | Status | Exit | Log |
|---|---|---:|---|
| No commands executed | `preflight_only` | 0 |  |

## Environment Posture

| Key | Status | Required | Expected | Purpose |
|---|---|---|---|---|
| `HRMS_API_BASE_URL` | `missing` | yes | `` | Live backend API target for browser proxy routes. |
| `HRMS_API_BEARER_TOKEN` | `not_required_for_mode` | no | `` | Optional API bearer token for non-cookie automation. |
| `PLAYWRIGHT_LIVE_SEED_PASSWORD` | `missing` | yes | `` | Seeded operator password for staging browser runs. |
| `PLAYWRIGHT_LIVE_MUTATIONS` | `not_required_for_mode` | no | `true` | Opt-in flag for disposable live mutation execution. |
| `PLAYWRIGHT_LIVE_RETRY_NOTIFICATION_ID` | `not_required_for_mode` | no | `` | Disposable failed notification id for live mutation opt-in. |
| `PLAYWRIGHT_LIVE_EMPLOYEE_NOTIFICATION_ID` | `not_required_for_mode` | no | `` | Disposable employee notification id for live mutation opt-in. |
| `PLAYWRIGHT_LIVE_PAYSLIP_ID` | `not_required_for_mode` | no | `` | Disposable payslip id for live read-receipt opt-in. |
| `HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON` | `not_required_for_mode` | no | `` | Runtime payroll provider credential refs loaded from a secret manager. |
| `HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON` | `not_required_for_mode` | no | `` | Runtime payroll artifact storage credential refs. |
| `HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON` | `not_required_for_mode` | no | `` | Tenant payroll artifact storage policy registry. |
| `HRMS_PAYROLL_PROVIDER_WORKER_ENABLED` | `missing` | yes | `true` | Confirms a payroll provider worker process/timer is deployed. |
| `HRMS_NOTIFICATION_PROCESSOR_ENABLED` | `not_required_for_mode` | no | `true` | Enables Celery Beat notification scheduling when Celery Beat is the scheduler. |
| `HRMS_NOTIFICATION_WORKER_ENABLED` | `missing` | yes | `true` | Confirms a notification worker process/timer is deployed. |
| `HRMS_ENTERPRISE_IDENTITY_STATUS` | `missing` | yes | `` | MFA/SSO/SCIM launch posture; set to verified or not_in_scope. |
| `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE` | `not_required_for_mode` | no | `strict` | Strict storage/IAM/KMS/lifecycle/malware/durability verification mode. |

## Seed Manifest

- Status: `not_requested`

## Production Exceptions

- Real payroll provider credentials/transports must be validated with official sandbox or production runbooks.
- Real SSO/MFA/SCIM identity-provider execution must be validated for enabled enterprise tenants.
- Real email/SMS/notification provider delivery must be validated outside local demo mode.
- Object storage IAM, KMS, lifecycle, malware scan, durability, and signed URL behavior must be verified in the target environment.
- Backup/restore, monitoring, alerting, and incident-response runbooks must be executed in the target environment.

## Artifact Files

- JSON report: `docs/qa/evidence/phase4b1/signoff-preflight/launch-signoff-report.json`
- Markdown report: `docs/qa/evidence/phase4b1/signoff-preflight/launch-signoff-report.md`
- Command logs: `docs/qa/evidence/phase4b1/signoff-preflight/logs`
- Management command outputs: `docs/qa/evidence/phase4b1/signoff-preflight/management-outputs`
