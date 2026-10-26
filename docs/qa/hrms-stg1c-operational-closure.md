# HRMS STG-1C Operational Closure

No staging infrastructure mutation was performed. The following is the implementation plan requiring infrastructure-owner approval.

## Restricted Evidence Role

Create a dedicated login role through the approved secret mechanism with `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`, `default_transaction_read_only=on`, database `CONNECT`, schema `USAGE`, and `SELECT` only on the exact tenant, domain, membership, onboarding-record and onboarding-event tables used by the collector. Do not grant table creation, sequence use, blanket schema privileges, role membership or write privileges.

Required verification:

1. Connect using the dedicated secret and confirm `current_user` equals configured `HRMS_STAGING_EVIDENCE_DB_ROLE`.
2. Confirm `transaction_read_only=on` and no elevated role memberships.
3. Run the exact-ID evidence command successfully.
4. Prove `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, DDL, `SET ROLE`, and access to unrelated payroll/employee tables are denied.
5. Retain secret-safe grant and negative-test evidence.

Exact tenant filtering remains enforced by the collector and manifest. The proposed role is not a substitute for application tenant assertions and must not receive `BYPASSRLS`.

## Deployment Fingerprint

On a separately authorized candidate deployment, configure a unique opaque staging fingerprint and the restricted evidence-role name. Keep `HRMS_STAGING_SYNTHETIC_CLEANUP_ENABLED=false`. Capture running commit, immutable backend/web digests, migration leaf nodes, environment identity and container health before authorizing Batch 1.

## Synthetic Notifications

Approve one exact `pw-qa-stg1-*` tenant namespace and one run-owned administrator recipient. Default tooling permits only `playwright.qa.invalid`; any SES-verified alternative must be explicitly allowlisted. Configure SES sandbox/recipient routing so no real employee receives mail. Verify accepted, suppressed and disallowed-recipient behavior without logging credentials.

## Backup And Recovery

Before mutation authorization, produce an encrypted off-host database backup and protected-artifact backup, checksums, retention record and recovery reference. Restore both into an isolated disposable environment and verify migrations, tenant counts, critical constraints, artifact checksums and application health. Do not restore over staging. The existing local rehearsal does not satisfy this gate.

## Cleanup Governance

Name a platform cleanup actor, cleanup owner and rollback owner. Record authorization and recovery references. Run cleanup dry-run first and independently review exact IDs and protected counts. Keep destructive execution disabled unless the review passes and the separate cleanup window is approved. Any legal entity, payroll, leave, attendance, document, unowned employee or foreign membership must stop deletion.
