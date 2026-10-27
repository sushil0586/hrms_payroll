# HRMS STG-1E Security Remediation

Date: 2026-10-26\
Decision: **LOCAL CONTROLS IMPLEMENTED; DEPLOYMENT APPROVAL REQUIRED**

## Environment Fingerprint

The established environment conventions now map these values from deployment environment variables:

- `HRMS_STAGING_ENVIRONMENT_FINGERPRINT`
- `HRMS_STAGING_EVIDENCE_DB_ROLE`
- `HRMS_STAGING_SYNTHETIC_EMAIL_DOMAINS`
- `HRMS_STAGING_SYNTHETIC_CLEANUP_ENABLED`, default `false`
- `HRMS_STAGING_EMAIL_ALLOWED_RECIPIENTS`

Evidence collection now fails closed when `HRMS_ENVIRONMENT=staging` and the deployment fingerprint is missing or differs from the ownership manifest. Existing cleanup fingerprint, feature-gate, superuser, authorization-reference, recovery-reference, advisory-lock, and protected-history checks remain unchanged.

The Lightsail topology uses `config.settings.production` with `HRMS_ENVIRONMENT=staging`. Production settings now preserve that explicit environment value. Genuine production still defaults to `production` and is not routed through the staging mail protection.

## Outbound Email Isolation

`apps.common.email_backends.StagingRecipientAllowlistEmailBackend` is a single Django mail-backend boundary used by direct `EmailMessage` sends and notification/Celery delivery because both resolve Django's configured backend.

Controls:

- Active only when `HRMS_ENVIRONMENT=staging`.
- Requires a distinct `EMAIL_TRANSPORT_BACKEND`; recursive/missing transport configuration is rejected.
- Requires exact normalized email addresses in `HRMS_STAGING_EMAIL_ALLOWED_RECIPIENTS`.
- Empty lists, domains, and wildcard-like values fail closed.
- Every To, CC, and BCC recipient must be explicitly listed before any message is delegated.
- Mixed allowed/denied messages are rejected as a whole.
- `fail_silently=True` returns zero and still sends nothing.
- Denials emit `staging_email_recipient_denied` to `hrms.security.email`, containing SHA-256 recipient identifiers rather than addresses.
- The backend refuses use in a non-staging environment.

The sanitized Lightsail and generic staging examples now distinguish `DJANGO_EMAIL_TRANSPORT_BACKEND` from the enforced wrapper and include all required staging controls. No actual recipient, credential, or fingerprint is committed.

The denial audit is a structured application security log. Operational certification still requires a deployed central log sink, retention, alerting, and proof that the event is received without personal data.

## PostgreSQL Evidence Isolation

Base-table grants remain rejected because the five collector tables do not have RLS and would expose other tenants to the evidence role.

Selected design: **narrowly authorized Django evidence API**.

Required follow-up implementation contract:

1. Staging-only endpoint disabled in all other environments.
2. Dedicated permission and authenticated Platform QA service identity; no reusable Platform Admin browser session.
3. Accept one run manifest whose fingerprint, run ID, six frozen scenario IDs, tenant UUID/code/email ownership markers, and checksum are validated.
4. Execute the existing exact-ID collector in a read-only PostgreSQL transaction.
5. Reject foreign memberships, denied-operation persistence, non-sandbox tenants, unapproved recipients, missing audits, and fingerprint mismatch.
6. Return only the existing minimized evidence payload, never user secrets or unrestricted rows.
7. Record actor, run ID, manifest hash, tenant ID, decision, and timestamp in the security audit stream.
8. Rate-limit and bind the identity to the approved execution window/source network.
9. Revoke all direct evidence-role base-table grants; the runner calls only the API.

This design uses the application tenant boundary and avoids introducing broad RLS changes into operational tables. It is not implemented in STG-1E because a new privileged API requires separate security approval. PostgreSQL-backed tests nevertheless reconfirmed current exact-ID and cross-tenant failure behavior.

## Recovery Remediation

The current scripts provide custom-format `pg_dump`, checksum verification, and isolated restore mechanics. Minimal staging closure still requires:

1. Private `ap-south-1` object storage with public access blocked, versioning, TLS-only policy, approved SSE-KMS encryption, and access logging.
2. Separate least-privilege backup writer and restore-reader identities; neither may administer the running database.
3. Database dump, artifact archive, and configuration/provenance manifest with SHA-256 checksums and immutable object versions.
4. Approved synthetic-staging retention, proposed RPO, and proposed RTO.
5. Upload/head verification and a stale-or-failed-backup alert.
6. Restore into a new isolated PostgreSQL 16 database and private artifact volume, using provider-disabled synthetic settings.
7. Migration, table/count, tenant ownership, financial/leave guard, artifact checksum, health, and read-only browser reconciliation.
8. Recorded elapsed recovery time, data age, recovery reference, owner acknowledgement, and exact disposable cleanup.

No staging backup was accessed, copied, uploaded, modified, or restored in STG-1E.

## Modified Source

- `backend/config/settings/base.py`
- `backend/config/settings/production.py`
- `backend/config/settings/staging.py`
- `backend/apps/common/staging_onboarding.py`
- `backend/apps/common/email_backends.py`
- `backend/tests/test_stg1a_staging_onboarding_tooling.py`
- `backend/tests/test_staging_email_isolation.py`
- `infrastructure/lightsail/hrms.env.example`
- `ops/staging/staging.env.example`

No migration was added and no staging configuration was deployed.
