# HRMS Evidence API Staging Configuration

This runbook prepares the least-privilege evidence API. It is not deployment or execution authorization.

## Preconditions

1. Approved patch commit and immutable backend/web image digests.
2. Encrypted off-host database and protected-artifact backup with successful isolated restore evidence.
3. Approved Batch 1 record naming target, scenarios `STG-E2E-0101`-`0106`, execution window, run ID, tenant namespace, execution owner, cleanup/quarantine owner and recovery owner.
4. Secret manager entries for a new dedicated evidence account; never reuse Platform Admin or superuser credentials.

## Runtime Configuration

Keep the endpoint disabled initially.

```text
HRMS_ENVIRONMENT=staging
HRMS_STAGING_EVIDENCE_API_ENABLED=false
HRMS_STAGING_EVIDENCE_API_ACTORS=<dedicated-evidence-username>
HRMS_STAGING_ENVIRONMENT_FINGERPRINT=<approved-non-secret-exact-value>
```

Runner secrets/configuration:

```text
STG_EVIDENCE_API_USERNAME=<same-dedicated-username>
STG_EVIDENCE_API_PASSWORD=<secret-reference>
STG_ENVIRONMENT_FINGERPRINT=<same-exact-value>
STG_RUN_ID=stg1-<approved-run>
STG_TENANT_NAMESPACE=pw-qa-stg1-<approved-run>
```

Do not store passwords or tokens in Git, Compose files, shell history or reports.

## Controlled Deployment Order

1. Record current source SHA, image digests, migrations and container health.
2. Confirm encrypted off-host backup and isolated restore reference.
3. Pull/build immutable images from the approved patch commit and verify digests.
4. Leave `HRMS_STAGING_EVIDENCE_API_ENABLED=false`.
5. Apply `python manage.py migrate --noinput`; verify `common.0011` is applied and no migrations are pending.
6. Restart backend and web only; verify health and ordinary login. Do not restart worker/beat for this patch.
7. Create a dedicated active Django user with `is_staff=false`, `is_superuser=false`, no memberships and no application roles.
8. Assign only the direct Django permission `common.view_staging_evidence`.
9. Create one `StagingEvidenceAuthorization` with the approved principal, exact run ID, derived tenant code, only `0101`-`0106`, SHA-256 of the exact runtime fingerprint, approval reference, approving owner, and bounded expiry.
10. Perform negative smoke tests while the endpoint is disabled.
11. Enable the endpoint and restart backend only after identity and grant inspection passes.
12. Perform the bounded smoke matrix below. Do not create a tenant or run Batch 1 without separate execution approval.

Use a reviewed, secret-safe management shell or one-time operational command for steps 7-9. Capture IDs and flags, not credentials or tokens.

## Smoke Matrix

| Test | Expected |
|---|---|
| No token | `401` |
| Platform superuser token, even allowlisted | `403` |
| Tenant Admin/ESS/MSS token | `403` |
| Dedicated principal without direct permission | `403` |
| Dedicated principal with forged/expired/revoked run | `403` |
| Wrong fingerprint or foreign tenant/resource IDs | `403` |
| Endpoint disabled or production environment | `404` |
| POST/PUT/PATCH/DELETE | `405` |
| Authorized exact request for an owned sandbox resource | `200`, bounded/redacted response |

Verify central audit entries for both allowed and denied outcomes include actor, run, scenario, tenant identifier, reason and request path. Confirm response bodies contain no email, password, token, employee details or payroll details.

## Revocation

1. Set `revoked_at` and a non-empty `revocation_reason` on the exact run authorization.
2. Verify the same token/request immediately returns `403`.
3. Remove the user's direct permission and deactivate the identity when the campaign ends.
4. Disable the endpoint and remove the actor allowlist entry after evidence collection.
5. Rotate the evidence credential and token according to the approved staging secret policy.

Revocation does not delete the authorization row or access audit history.

## Rollback

1. Set `HRMS_STAGING_EVIDENCE_API_ENABLED=false` and restart backend.
2. Revoke the active run and deactivate the evidence identity.
3. Restore prior backend/web images and verify health.
4. Retain `common.0011` unless a separately approved rollback explicitly accepts deletion of authorization history.
5. If migration reversal is approved, verify no active grants remain, back up the authorization table, reverse to `common.0010`, and rerun migration/health checks.

## Current Gate

Configuration is prepared, not applied. Identity creation, permission assignment, run authorization, environment changes, migration, restart and smoke execution all require separate staging authorization.
