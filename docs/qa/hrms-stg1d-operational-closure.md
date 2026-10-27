# HRMS STG-1D Operational Blocker Closure

Date: 2026-10-26\
Scope: non-destructive operational readiness for `STG-E2E-0101` through `STG-E2E-0106`\
Decision: **BLOCKED**

## Safety And Repository State

- Local branch is `main` at committed QA SHA `7a55b33e20bfc5ba34f2c15017edd271c2092664`, one commit ahead of `origin/main`.
- The parent application SHA remains `20d832996ef505f0b6c2df2673204e841e7b6a52`.
- The only working-tree modification is the pre-existing, unstaged `web/tests/e2e/db6-payroll-processing.spec.ts` repair. It was not modified.
- No push, deployment, migration, database-role change, worker restart, tenant creation, SES delivery, backup operation, cleanup, or staging scenario execution occurred.
- All 136 frozen staging scenarios remain `Not Run`.

## Fresh Safe Checks

| Check | Result | Evidence / limitation |
|---|---|---|
| Public HTTPS root | PASS | `https://hrms.accerio.in/` returned HTTP 200 on 2026-10-26; HSTS, `nosniff`, and strict referrer policy present |
| Backend health | PASS | `/health/` returned HTTP 200 and `{"status":"ok","service":"hrms-backend"}` |
| AWS API identity | BLOCKED | Current shell has no AWS credentials; `aws sts get-caller-identity` returned `NoCredentials` |
| SSH host inspection | BLOCKED | All three previously available keys were rejected by `ubuntu@65.0.231.86`; no host command ran |
| Running image/application provenance | NOT VERIFIED | Public health cannot prove Git SHA, image ID, migration leaves, restart count, or worker configuration |
| PostgreSQL evidence identity | BLOCKED | No authorized staging database endpoint or dedicated evidence role is available |
| Off-host backup and isolated restore | BLOCKED | No fresh object-store backup, immutable version, or staging-derived restore evidence is available |

Historical values remain historical only: application SHA `20d832996ef505f0b6c2df2673204e841e7b6a52`, backend image ID `sha256:e4fcf34a080973cf02bbf1341ab57251c5a827e9782dabd6b8eff169fc12337b`, web image ID `sha256:03bb370c78bf7097c3acdf364443523936084ec183e921580484dc047c061c7a`, and 128 applied migrations with none pending. STG-1D did not independently refresh them.

## Deployment Provenance Gate

The least-privilege AWS proposal is in `hrms-stg1d-iam-and-db-grants.md`. AWS inventory alone is insufficient for Docker Compose provenance; the infrastructure owner must also provide a working, host-scoped read-only SSH path or execute the supplied read-only command set and sign the output.

Required PASS evidence:

1. Lightsail instance identity, region, static IP, and port state.
2. Container name, immutable image ID/digest, health, restart count, and start time.
3. OCI revision label or a deployment manifest that cryptographically binds images to the application SHA.
4. PostgreSQL applied/pending migration count and leaf nodes.
5. `HRMS_ENVIRONMENT`, fingerprint presence, evidence-role setting presence, cleanup feature state, and Celery worker/beat identity without secret values.

## Fingerprint Contract

The manifest parser checks the runner-supplied fingerprint. Destructive cleanup additionally compares it to `settings.HRMS_STAGING_ENVIRONMENT_FINGERPRINT`, requires `HRMS_ENVIRONMENT=staging`, and requires an explicit cleanup feature gate.

Two deployment prerequisites are currently missing:

1. The committed QA/tooling SHA is not deployed. The historical application image cannot run the new management command.
2. `backend/config/settings/base.py` does not map `HRMS_STAGING_ENVIRONMENT_FINGERPRINT`, `HRMS_STAGING_EVIDENCE_DB_ROLE`, `HRMS_STAGING_SYNTHETIC_EMAIL_DOMAINS`, or `HRMS_STAGING_SYNTHETIC_CLEANUP_ENABLED` from environment variables. Merely adding container environment values would not populate Django settings.

Required future application/configuration change, under separate approval:

```python
HRMS_STAGING_ENVIRONMENT_FINGERPRINT = os.getenv("HRMS_STAGING_ENVIRONMENT_FINGERPRINT", "")
HRMS_STAGING_EVIDENCE_DB_ROLE = os.getenv("HRMS_STAGING_EVIDENCE_DB_ROLE", "")
HRMS_STAGING_SYNTHETIC_EMAIL_DOMAINS = tuple(
    item.strip().lower()
    for item in os.getenv("HRMS_STAGING_SYNTHETIC_EMAIL_DOMAINS", "").split(",")
    if item.strip()
)
HRMS_STAGING_SYNTHETIC_CLEANUP_ENABLED = env_bool("HRMS_STAGING_SYNTHETIC_CLEANUP_ENABLED", False)
```

Generate a random opaque fingerprint in the deployment secret/configuration system, bind it to the application SHA and image digests in the execution approval, and pass the same value to the runner through a separate authorized channel. Missing or unequal values must stop evidence collection and cleanup. Cleanup stays `false` until a separately approved cleanup window.

## Synthetic Identity And Notification Isolation

The Batch-1 tooling accepts `playwright.qa.invalid` by default and validates the owned tenant's primary email. This protects ownership classification but does **not** constrain all application email sends.

Current Django email services send via the configured backend without a global staging recipient allowlist. SES sandbox status or verified identities are operational controls, not a proof that every real verified recipient is impossible. Therefore the requirement “backend cannot deliver a staging notification to a real employee/customer” is **BLOCKED**.

Required before Batch 1:

- Approve one exact run ID and `pw-qa-stg1-<run>` tenant code.
- Approve dedicated Platform Admin and tenant-admin synthetic identities; do not put credentials in manifests or reports.
- Add a staging-only fail-closed mail backend or centralized pre-send policy that rejects recipients outside the approved domain/address list, including CC/BCC and direct IAM/password-reset email paths.
- Keep the notification processor disabled until the allowlist is proven.
- Restrict SES credentials to the staging sender/configuration set and retain CloudTrail/SES event evidence.
- Test one allowed synthetic address and one disallowed non-synthetic address using a non-delivering test backend first. Real delivery needs separate approval.

## Gate Summary

| Requirement | Status | Owner |
|---|---|---|
| QA baseline committed locally | PASS | Repository owner |
| Public HTTPS and health | PASS | Staging infrastructure owner |
| Fresh Lightsail/container provenance | BLOCKED | AWS/DevOps owner |
| Restricted PostgreSQL evidence role | BLOCKED | PostgreSQL security owner |
| Database-enforced tenant-limited evidence access | BLOCKED | Security/DBA/application owners |
| Fingerprint code/configuration/deployment | BLOCKED | Application and DevOps owners |
| Synthetic namespace and identities | APPROVAL REQUIRED | QA/release/security owners |
| Fail-closed email recipient isolation | BLOCKED | Application/messaging/security owners |
| Encrypted off-host backup | BLOCKED | Infrastructure/DBA owners |
| Isolated staging-derived restore | BLOCKED | Recovery owner |
| Execution and cleanup governance | APPROVAL REQUIRED | Release/infrastructure/QA owners |

## STG-1D Decision

**BLOCKED.** Planning is precise, but current access cannot establish fresh deployment provenance, and the database role, tenant-scoped evidence access, fingerprint settings, outbound-email isolation, off-host restore evidence, and named execution governance are not complete. No staging scenario is authorized.
