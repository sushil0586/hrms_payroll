# HRMS Staging Evidence API Least-Privilege Remediation

Date: 2026-10-27
Source parent: `c14b668e0e8eb641e4c4670e5eefeb7cf308cf59`
Scope: local remediation and Batch 1 entry reassessment only
Decision: **CONDITIONAL PASS**

## Root Cause

`IsConfiguredStagingEvidenceActor` required `is_superuser` and an actor allowlist entry. The permission catalogue key `platform.qa_evidence.view` was descriptive only. A validly shaped, caller-supplied run ID was sufficient because no durable server-side run authorization existed. The endpoint's existing staging enablement, fingerprint comparison, exact tenant/resource filters, read-only transaction, response bounds, redaction and audit events were retained.

## Remediation

- Added direct Django permission `common.view_staging_evidence`; implicit superuser permission resolution is deliberately not accepted.
- The evidence principal must be active, non-staff, non-superuser, explicitly allowlisted and directly assigned that permission.
- Added `StagingEvidenceAuthorization`, binding principal, run ID, derived tenant namespace, frozen scenario subset, environment-fingerprint hash, authorization reference, approver identity, expiry and revocation state.
- Requests require a current server-side authorization before tenant lookup. Forged, expired, revoked, wrong-scenario and wrong-environment grants fail closed.
- The endpoint remains staging-only, disabled by default, token-authenticated, GET/HEAD-only, bounded, redacted and exact-ID scoped.
- Batch 1 Playwright evidence assertions now authenticate independently as `STG_EVIDENCE_API_USERNAME`; Platform Admin remains limited to browser business actions.
- Scenario `0103` now derives duplicate-contact ownership from the exact browser POST response instead of a presentation label after UI refresh.

No normal Platform Admin, Tenant Admin, ESS or MSS permission rule changed.

## PostgreSQL Security Evidence

Command used isolated PostgreSQL 16 with `config.settings.base`: focused suite result **20 passed** in 85.24 seconds.

| Required assertion | Result |
|---|---|
| Authorized non-superuser with direct permission and active grant | Passed |
| Superuser, Tenant Admin and unconfigured authenticated actor denied | Passed |
| Foreign tenant/resource, forged run and unsupported scenario denied | Passed |
| Missing/mismatched fingerprint and disabled/production configuration denied | Passed |
| Expired and revoked authorization denied | Passed |
| POST, PUT, PATCH and DELETE denied; persisted counts unchanged | Passed |
| Six bounded schemas exclude email, password and employee/payroll detail | Passed |
| Allowed and denied access emits structured security audit events | Passed |

The database principal used by the application was PostgreSQL-backed. The bounded API does not require a separate generic database evidence role.

## Browser And API Evidence

The optimized Next.js 15.5.28 build served the real UI against isolated PostgreSQL. One Playwright worker executed `STG-E2E-0101` through `STG-E2E-0106`.

- First pass: `2 passed / 1 failed / 3 not run`. `0103` timed out locating a refreshed option by display text after the duplicate contact had already been committed. No evidence authorization failure occurred.
- Targeted automation correction: capture the exact contact ID from the browser-initiated `201` response and wait for that ID in the selector.
- Final pass: **6 passed in 21.4 seconds**.
- Ownership manifest: 19 events, 6 passed scenario completions and 6 exact resource registrations.
- PostgreSQL reconciliation: one authorized run, one owned sandbox tenant, and evidence principal flags `is_staff=false`, `is_superuser=false`.

These are local results only. Shared staging remains **0 Passed / 0 Failed / 136 Not Run**.

## Static And Build Checks

| Check | Result |
|---|---|
| TypeScript | Passed |
| Focused ESLint | Passed |
| Django system check | Passed |
| Migration drift | None |
| Production frontend build | Passed with the existing CSS autoprefixer warning |

## Patch Manifest

Application and schema:

- `backend/apps/common/models.py`
- `backend/apps/common/staging_evidence_api.py`
- `backend/apps/common/migrations/0011_staging_evidence_authorization.py`

Focused verification and browser harness:

- `backend/tests/test_stg1f_staging_evidence_api.py`
- `web/tests/e2e/stg0d-batch1-onboarding.spec.ts`
- `web/tests/helpers/staging-auth.ts`
- `web/tests/helpers/staging-run-manifest.ts`

Evidence documents:

- `docs/qa/hrms-staging-evidence-api-least-privilege-remediation.md`
- `docs/qa/hrms-staging-batch1-entry-closure.md`
- `docs/qa/hrms-staging-certification-dashboard.md`

The separate `web/tests/e2e/db6-payroll-processing.spec.ts` repair and prior generated evidence directories are excluded.

## Migration And Deployment Impact

- Additive migration `common.0011` creates one authorization table, two indexes, one unique constraint and the custom permission. It does not rewrite historical business data.
- The backend image and database migration must be deployed before enabling the endpoint. Backend and web containers must restart; worker/beat changes are not required by this patch.
- Required secret-sourced runner settings are `STG_EVIDENCE_API_USERNAME` and password. Runtime settings remain `HRMS_STAGING_EVIDENCE_API_ENABLED`, exact actor allowlist and exact non-secret fingerprint.
- Create a dedicated active non-staff/non-superuser user, grant only `common.view_staging_evidence`, issue a time-bounded run authorization, and rotate any credential previously shared with a privileged account.
- Rollback must first disable the endpoint. Code rollback is compatible while `common.0011` remains applied; reversing the migration is safe only after grants are no longer needed.

## Batch 1 Gate

The local authorization defect is closed, but Batch 1 is not GO. The patch is uncommitted and undeployed. Required staging evidence remains:

1. Approved immutable patch revision and images with `common.0011` applied.
2. Approved fingerprint and time-bounded run/tenant namespace.
3. Dedicated evidence identity provisioned without staff, superuser or tenant roles.
4. Execution owner, cleanup/quarantine owner, recovery owner and bounded window.
5. Exact synthetic recipient decision; SES may remain fail-closed when email is outside Batch 1 scope.
6. Encrypted off-host backup and isolated restore evidence, or an explicit owner-approved Batch 1 recovery exception.
7. Enabled audit collection and approved exact-ID cleanup/quarantine procedure.

**Decision: CONDITIONAL PASS.** Least-privilege implementation and local integration pass. Staging execution remains blocked pending release and operational authorization.

Exact next action: review and authorize the minimal patch manifest for commit and immutable staging build; do not enable the endpoint until the run authorization and Batch 1 owner record are approved.
