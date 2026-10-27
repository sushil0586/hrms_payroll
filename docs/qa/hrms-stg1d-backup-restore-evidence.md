# HRMS STG-1D Backup And Restore Evidence

Date: 2026-10-26\
Decision: **BLOCKED - no staging-derived off-host recovery evidence**

## Evidence Reconciliation

| Item | Status | Evidence |
|---|---|---|
| Local PostgreSQL dump mechanics | PASS (historical/local) | Custom-format dump, checksum, and catalog validation previously succeeded |
| Disposable local restore mechanics | PASS (historical/local) | Synthetic marker restored into a separate PostgreSQL 16 container |
| Staging database backup | NOT VERIFIED | Host SSH and AWS API access unavailable in STG-1D |
| Encrypted off-host object | BLOCKED | No bucket/key/version/checksum evidence available |
| Protected artifact backup | BLOCKED | No off-host artifact manifest or object checksum evidence available |
| Isolated restore from staging backup | BLOCKED | No authorized restore rehearsal or recovery reference |
| RPO/RTO approval | APPROVAL REQUIRED | Proposed synthetic-only RPO 24h/RTO 4h remains unapproved |

The earlier host-local dump must not be treated as off-host disaster recovery. STG-1D did not create, modify, download, upload, or restore a backup.

## Required Backup Set

1. PostgreSQL 16 custom-format dump made from a consistent staging snapshot.
2. Protected document/artifact archive with relative paths, size, and SHA-256 per object.
3. Metadata manifest: environment fingerprint, application SHA, backend/web image digests, migration leaves, database version, backup timestamp, synthetic-data classification, and backup job ID.
4. SHA-256 sidecars and an immutable manifest hash.
5. Private `ap-south-1` object storage with public access blocked, TLS-only access, versioning, server-side encryption using the approved KMS policy, least-privilege backup/restore roles, and access logging.
6. Approved retention and lifecycle policy. No customer/statutory retention period is inferred from this synthetic-staging proposal.

## Isolated Restore Procedure

1. Record owner approval, source object versions, manifest hash, recovery owner, and target disposable environment.
2. Create an isolated private network, new PostgreSQL 16 database/volume, separate artifact volume, and outbound-provider-denied application configuration.
3. Verify object metadata and checksums before restore.
4. Run `pg_restore --clean --if-exists --exit-on-error` against the disposable database only.
5. Restore artifacts into the disposable volume and verify every listed checksum and count.
6. Start images pinned to the backup manifest digests; never point recovered services at live staging Redis, database, SES, or provider credentials.
7. Verify migration leaves, tenant counts, critical uniqueness/immutability constraints, onboarding/audit relationships, artifact access controls, Django checks, and health endpoints.
8. Run only the approved read-only smoke suite. Do not execute Batch 1 mutations as part of recovery proof.
9. Record start/end times, achieved RPO/RTO, row/count reconciliation, checksum results, exceptions, and a durable recovery reference.
10. Delete only the exact disposable resources after evidence retention and owner confirmation.

PASS requires zero restore errors, matching hashes/counts, expected migration state, no cross-tenant exposure, healthy services, and signed recovery-owner acknowledgement.

## Required Approvals

- Infrastructure owner: bucket, encryption key, lifecycle, and cost.
- Security owner: IAM and KMS policies, public-access block, logging, and secret handling.
- DBA/recovery owner: backup consistency, restore command, reconciliation, RPO/RTO result.
- Application owner: image/migration compatibility and smoke result.
- Cleanup owner: exact disposable resource teardown.

No recovery reference can be entered in the Batch-1 approval record until this rehearsal passes.
