# STG-0B Backup And Restore Readiness

Date: 2026-10-26
Status: **LOCAL REHEARSAL PASSED; STAGING RECOVERY BLOCKED**

## Current Tooling

- `ops/backup_postgres.sh` creates a PostgreSQL custom-format dump and SHA-256 sidecar.
- `ops/restore_postgres.sh` verifies the sidecar when present and performs a clean restore.
- `ops/backup_restore_rehearsal.sh` dumps a source, restores to a separately supplied database, verifies public tables exist, and writes JSON evidence.
- Scripts require explicit database URLs and do not contain credentials.

## Executed Isolated Rehearsal

Two disposable PostgreSQL 16 containers were created with synthetic-only data. One source table and marker row were dumped and restored into the second database.

Result:

```json
{"checksum_recorded": true, "probe_rows": 1, "restored_public_table_count": 1, "status": "passed"}
```

Both containers were stopped and removed. Evidence is retained outside the repository under `/tmp/hrms-stg0b-restore-evidence-success/`. The initial attempt reached PostgreSQL during container initialization and failed before backup; it was retained as an environment-timing diagnostic and both containers were removed before the successful retry.

## Gaps

- Dumps are not encrypted by these scripts.
- No off-host upload, retention lifecycle, immutability or access-log implementation is proven.
- No application artifact backup/restore is included.
- No staging database restore rehearsal has been executed.
- RPO and RTO are not formally approved. A proposed synthetic-staging target is daily full backup with RPO <=24 hours and rehearsal RTO <=4 hours; this is a proposal, not an approved SLA.
- Integrity validation currently proves restore mechanics and table presence, not full tenant, migration, ledger, artifact and application checks.

## Required Staging Rehearsal

Use a fresh isolated database and private artifact prefix. Verify encrypted backup checksum, PostgreSQL version, migrations, tenant counts, financial/leave invariants, protected artifact checksums, application health, RBAC, and cleanup. Never restore over the running staging database.

## Decision

Local script mechanics are verified. Off-host encrypted recovery and artifact restoration remain externally blocked, so backup-dependent frozen scenarios cannot be marked executed or passed.
