# HRMS STG-1F Deployment Impact

Date: 2026-10-26\
Source baseline SHA: `7a55b33e20bfc5ba34f2c15017edd271c2092664`\
Decision: **NEW APPLICATION BUILD REQUIRED; NO DEPLOYMENT AUTHORIZED**

## Why A Deployment Is Required

The tenant-safe evidence endpoint, deployment-fingerprint mapping, fail-closed staging mail backend and Playwright evidence integration are source changes after the local QA baseline. Staging cannot use or certify them until a reviewed commit is pushed, immutable backend/web images are built, their digests are recorded and the approved release is deployed.

There is no immutable application SHA for the current uncommitted candidate. `7a55b33e...` is the parent baseline, not a claim that the working-tree changes are contained in that commit. The unrelated `web/tests/e2e/db6-payroll-processing.spec.ts` repair remains excluded and untouched.

## Candidate Manifest

Runtime/configuration files:

- `backend/apps/common/email_backends.py`
- `backend/apps/common/staging_evidence_api.py`
- `backend/apps/common/staging_onboarding.py`
- `backend/apps/iam/permission_catalog.py`
- `backend/apps/tenant_onboarding/api_urls.py`
- `backend/config/settings/base.py`
- `backend/config/settings/production.py`
- `backend/config/settings/staging.py`
- `infrastructure/lightsail/hrms.env.example`
- `ops/staging/staging.env.example`

QA files:

- `backend/tests/test_staging_email_isolation.py`
- `backend/tests/test_stg1a_staging_onboarding_tooling.py`
- `backend/tests/test_stg1f_staging_evidence_api.py`
- `web/tests/helpers/staging-run-manifest.ts`
- `web/tests/e2e/stg0d-batch1-onboarding.spec.ts`
- `web/src/app/api/platform/[...path]/route.ts`
- the four STG-1F reports and dashboard reconciliation

STG-1D/STG-1E uncommitted reports remain separate review inputs and must be deliberately included or excluded by the release owner. No secret-bearing environment file or runtime artifact belongs in the candidate.

## Configuration Required At Deployment

The values must come from the approved secret/configuration channel, not Git:

- `HRMS_ENVIRONMENT=staging`
- `HRMS_STAGING_ENVIRONMENT_FINGERPRINT=<opaque approved value>`
- `HRMS_STAGING_EVIDENCE_API_ENABLED=false` initially
- `HRMS_STAGING_EVIDENCE_API_ACTORS=<dedicated QA username>`
- `HRMS_STAGING_EMAIL_ALLOWED_RECIPIENTS=<exact synthetic addresses>`
- `DJANGO_EMAIL_TRANSPORT_BACKEND=<approved SES SMTP backend>`

Enable the evidence API only for the approved execution window after the image, actor, fingerprint, reverse proxy and audit sink have been verified. Playwright additionally requires `STG_EVIDENCE_API_REQUIRED=1` and the same fingerprint reference.

## Migration And Rollback

- Database migration: **none**; `makemigrations --check --dry-run` reports no drift.
- Roll forward: build immutable images from the future reviewed commit, record OCI revision/digests, deploy with API disabled, run Django checks and health/provenance probes, then obtain execution authorization.
- Rollback: disable the evidence API first, revoke the QA token/actor allowlist, restore the previous pinned backend/web image digests and verify health. No schema rollback is required.
- Mail fail-closed rollback requires security-owner approval; do not bypass it merely to restore delivery. Revert to the prior image/config only after outbound delivery remains safely disabled or equivalently protected.

Required approvals: repository/release owner for commit/push/build; infrastructure owner for configuration/deployment/restart; security owner for identity, fingerprint, mail and audit controls; QA owner for the six-scenario window. This task granted none of them.
