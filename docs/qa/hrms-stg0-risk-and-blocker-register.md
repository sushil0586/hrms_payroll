# HRMS/Payroll STG-0 Risk And Blocker Register

Date: 2026-10-26

| ID | Severity | Class | Finding | Impact | Required disposition | STG-1 treatment |
|---|---|---|---|---|---|---|
| STG0-R001 | P0 | External storage | Payroll/document artifacts remain on local Docker volume; no scanner/private object-store proof | Protected artifact production gate cannot pass | Deploy approved private encrypted storage and scanner | Block storage-level scenarios; local synthetic files only |
| STG0-R002 | P0 | Recovery | No encrypted off-host backup or isolated restore rehearsal | Host loss could lose staging state/evidence | Configure backup, checksum, restore and approved RPO/RTO | Functional batches may proceed with disposable data; no recovery certification |
| STG0-R003 | P0 | Provider | Payroll provider worker/credentials are absent | Real payment/filing behavior cannot be certified | Approved sandbox, secrets and callback contract | Keep all real provider actions disabled |
| STG0-R004 | P0 | Policy | Statutory, FnF, overtime, transfer, rehire and post-expiry policies remain unapproved | Incorrect financial/legal behavior if inferred | Named business/legal approval and effective-dated oracle | Block affected scenarios; never invent defaults |
| STG0-R005 | P0 | Security | Three historical full environment copies exist under host backup directory | Additional secret copies increase exposure and rotation burden | Approved secure deletion/retention decision and credential rotation assessment | Do not copy these files into evidence or off-host backup |
| STG0-R006 | P1 | Scheduler | Celery beat schedule database is corrupt after recreation and is deleted/rebuilt | Brief scheduler discontinuity; restart recovery not durable | Persist/replace schedule safely and run restart proof | Observe only; no deliberate restart without approval |
| STG0-R007 | P1 | Observability | No fresh evidence of centralized logs, host alerts or Lightsail alarms | Failures may not page an owner | Reauthenticate AWS, inspect, then provision only after approval | Record application logs locally; do not mark monitoring passed |
| STG0-R008 | P1 | Capacity | 4 GB/2-vCPU host has active swap and limited burst headroom | Broad parallel tests can contaminate results or destabilize host | One worker, small batches, resource stop thresholds | Enforced by plan |
| STG0-R009 | P1 | Identity | Enterprise identity status is undeclared | Strict production preflight fails | Approve `not_in_scope` or deploy/verify identity controls | Functional local identities allowed; enterprise identity blocked |
| STG0-R010 | P1 | Provenance | Runtime uses local image tags, not external registry digests | Recreate/rollback provenance is weaker | Publish immutable digest or archive image with checksum | Record current image IDs for every batch |
| STG0-R011 | P1 | Test provenance | Payroll Actions-tab repair and staging artifacts are uncommitted | Different operators may run different automation | Review and create QA-only commit | Must be frozen before STG-1 |
| STG0-R012 | P1 | Mapping | 136 IDs exist as grouped ranges; no direct ID-to-test mapping | Pass/fail could be assigned ambiguously | Expand to immutable 136-row mapping without changing IDs/count | Mandatory before execution |
| STG0-R013 | P1 | Database testing | Default SQLite cannot execute PostgreSQL trigger migrations | Integrity suite gives setup errors, not useful evidence | Explicit PostgreSQL 16 test DSN/container | No SQLite integrity certification |
| STG0-R014 | P1 | Email lifecycle | SES bounce/complaint is not reconciled to notification rows | UI can retain optimistic delivered status after later failure | Implement event consumer and deterministic tests | Record as partial; synthetic send acceptance only |
| STG0-R015 | P2 | HTTP hardening | HSTS preload disabled, no CSP observed, Next.js header disclosed | Defense-in-depth is incomplete | Security owner defines staging/production header policy | Track; not a synthetic functional blocker |
| STG0-R016 | P2 | Backup tooling | `pg_restore` absent on host but available in PostgreSQL container | Host runbook command can fail if context is wrong | Document containerized restore tooling | Updated command used successfully |

## Stop Conditions For STG-1

Stop immediately and preserve evidence when any of the following occurs:

- Cross-tenant read/write succeeds.
- Employee or manager obtains HR/payroll authority unexpectedly.
- Leave ledger does not reconcile exactly.
- Closed attendance evidence changes without governed reopen/correction.
- Locked/final payroll changes through API, ORM, bulk or raw SQL.
- Duplicate payroll output, finance handoff or business mutation is created.
- Payslip, bank advice and finance totals diverge.
- Cleanup cannot prove the owned tenant absent.
- Container restart, OOM, sustained 5xx or resource saturation compromises evidence.

## Classification Boundary

`STG0-R001`–`R016` are readiness risks, not replacements for the frozen `STG-E2E-*`, DB, DD or release-gate IDs. No existing test or release status was changed.
