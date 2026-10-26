# HRMS/Payroll STG-0 Readiness Assessment

Date: 2026-10-26
Scope: safe, non-destructive staging readiness only
Decision: **CONDITIONAL**

## Executive Decision

The deployed synthetic staging environment is reachable, internally consistent, and suitable for controlled STG-1 functional execution after the QA candidate is frozen. It is not production-like in storage, backup/recovery, broker durability, provider integration, observability, or capacity. Real payroll and production remain NO-GO.

No STG-1 scenario was executed or promoted. The approved inventory remains **136 Not Run**.

## Repository And Provenance

| Item | Verified fact |
|---|---|
| Branch | `main`, aligned with `origin/main` |
| Local HEAD | `20d832996ef505f0b6c2df2673204e841e7b6a52` |
| Commit subject | `feat: complete admin and workflow experience modernization` |
| Deployed checkout | Same full commit SHA |
| Backend image | `hrms-backend:20d832996`; image ID `sha256:e4fcf34a...` |
| Web image | `hrms-web:20d832996`; image ID `sha256:03bb370c...` |
| Uncommitted tracked change | Four-line test-only repair in `web/tests/e2e/db6-payroll-processing.spec.ts` |
| Untracked requested artifacts | Complete E2E plan and 136-scenario grouped register |

The payroll test repair explicitly opens the existing Review and Output **Actions** tabs before locating controls. It was preserved unchanged during STG-0. It is not part of the deployed application image and must be reviewed/frozen before STG-1 execution.

The deployed checkout contains untracked host-only `.staging-secrets/`, `backups/`, and `qa/` directories. They are not application-source drift, but their ownership, retention and exclusion from image/build contexts must remain controlled.

## Safe Checks Executed

| Check | Result |
|---|---|
| Django system check | Passed, zero issues |
| Migration drift generation check | Passed, no changes detected |
| Frontend TypeScript | Passed |
| Focused ESLint | Passed |
| Staging configuration unit tests | 4 passed |
| Disposable-workspace unit test under default SQLite | 3 setup errors; PostgreSQL trigger migration is incompatible with SQLite, so no product assertion executed |
| Public HTTP to HTTPS | 308 redirect passed |
| Public health | HTTP 200, about 135 ms |
| TLS | Valid Let's Encrypt certificate through 2027-01-16 |
| Runtime migration compatibility | `migrate --check` passed; no migration applied |
| Runtime Django check | Passed |
| PostgreSQL | Accepting connections |
| Redis | `PONG` |
| Celery worker | One node returned `pong` |
| Containers | Seven running; health checks green where defined; zero restarts |
| Database backup files | Four gzip dumps passed gzip integrity |
| Bootstrap custom dump | `pg_restore --list` passed inside PostgreSQL container |

The SQLite failure is an environment-selection defect in the invocation, not evidence that the fixture command is broken. The command was recently exercised successfully against staging PostgreSQL with ownership-verified cleanup.

## Infrastructure Readiness

| Area | State | Verified fact / missing evidence |
|---|---|---|
| Environment separation | Partial | Dedicated Compose network and synthetic-only tenant policy exist; PostgreSQL/Redis are host-local containers, not managed isolated services. |
| HTTPS/reverse proxy | Verified for functional staging | Caddy redirects HTTP and serves valid TLS. HSTS is one year with subdomains but not preload-enabled. CSP was not observed on `/login`; `X-Powered-By` remains exposed. |
| Django production posture | Partial | Debug/demo/basic-auth/cookies/hosts/PostgreSQL/email checks pass. Strict preflight fails five gates. |
| PostgreSQL | Verified for functional staging | PostgreSQL 16 container healthy; migration check passes. PITR, managed HA and isolated restore are absent. |
| Redis/Celery | Partial | Redis AOF/noeviction and worker connectivity pass. Worker concurrency is one. Beat discards a corrupt local schedule database on restart, then resumes dispatch. |
| SES | Verified with limitation | SMTP, password reset, invitation and synthetic delivery passed previously. Bounce/complaint notification reaches operations, but application reconciliation back into notification rows is missing. |
| Documents/artifacts | Blocked for production-like certification | Local Docker `media-data` volume is used. No private external object store, scanner, signed-access enforcement, storage restore or durability evidence. |
| Secrets | Partial | Runtime env and QA password are mode `0600`. Three historical full environment copies exist in `backups/`; these contain secret-bearing configuration and are an avoidable exposure/rotation concern. |
| Backups | Partial | Local dumps are structurally readable. No encrypted off-host backup, automatic snapshot, timed restore, RPO/RTO or artifact restore evidence. |
| Logging/monitoring | Blocked | No fresh AWS credential session was available for reinspection. Prior evidence records no Lightsail alarms or centralized logging; no newer executed evidence supersedes it. |
| Build provenance | Partial | Commit-to-running tags/images is known. Images are local tags rather than registry digests, and rollback has not been rehearsed for this candidate. |
| Capacity | Conditional | 3.7 GiB RAM, 1.4 GiB available including cache, 548 MiB swap occupied, 60% disk. Suitable for one-worker functional QA only. |

### Strict Preflight Failures

The deployed backend strict preflight passed core Django, cookie, host, database, Redis, SMTP and notification gates. It failed exactly five blockers:

1. Enterprise identity scope not declared `verified` or `not_in_scope`.
2. Payroll provider worker deployment not declared.
3. Payroll provider runtime credentials absent.
4. Payroll artifact storage credentials absent.
5. Payroll artifact storage policies absent.

These do not block synthetic workflows that explicitly exclude external payment/provider and protected-storage certification. They block production-like and real-payroll claims.

## Financial And Business Integrity Readiness

| Invariant | Existing control | Independent STG-1 proof required |
|---|---|---|
| Employee/pay-group ownership | Tenant-scoped models, fixture calendar-match check and cross-tenant guards | Same employee, pay group, calendar and period IDs; reject cross-tenant and mismatched-calendar writes. |
| Effective compensation | Effective-dated assignments and temporal overlap protections | As-of resolution before/after revision; concurrent overlap rejection; historical snapshot unchanged. |
| Period eligibility | Payroll calendar/period/pay-group validation and fiscal-period links | Earning, payment, statutory and posting dates independently reconciled. |
| Leave reconciliation | Append-only movements, lots, idempotency keys and row locking | Opening + earned + adjustments + carried - used - expired = closing for the selected period. |
| Attendance/payroll consistency | Governed close, immutable close events and locked payroll snapshots | Closed attendance payable/LOP totals equal payroll snapshot inputs. |
| Salary/statutory setup | Versioned components/structures/statutory packs | Only approved synthetic rules; decimal/rounding oracle; no inferred legal rate. |
| Payroll immutability | Service locks plus PostgreSQL terminal-row triggers | ORM/API/raw-write mutation attempts rejected after final lock. |
| Payslip reconciliation | Output snapshots/checksums and protected relationships | Calculation net = payslip net = bank advice = finance handoff. |
| Duplicate prevention | Business uniqueness, idempotent background jobs and provider keys | Concurrent duplicate create/dispatch/retry produces one business effect. |
| Concurrency | `select_for_update`, conditional transitions and database constraints | PostgreSQL races for leave approval, workflow decision, payroll creation/approval and close/posting. |
| Tenant isolation | API scopes plus DB-4 tenant-reference triggers | Browser/API denial and PostgreSQL cross-tenant bypass rejection. |

No new financial calculation was executed in STG-0.

## Automation Coverage Mapping

Existing automation provides reusable building blocks, not fresh staging outcomes:

| STG batch | Strong reusable assets | Missing prerequisite/assertion |
|---|---|---|
| 0 | staging validator, deployed smoke, configuration tests | Per-ID evidence adapter; current AWS alarm/snapshot credentials |
| 1 | `db6-connected-tenant-onboarding.spec.ts`, tenant onboarding API tests | Fresh browser-created tenant with exact STG manifest |
| 2 | organization CRUD/production specs, DB6 organization integrity | Connected same-tenant ID reconciliation |
| 3 | fiscal browser/API tests, DB2/DB3 integrity suites | Combined fiscal/leave/payroll date oracle on staging |
| 4 | employee lifecycle and effective-history specs | First-login provisioning and same-record identity continuity |
| 5 | DB3A, ESS/MSS leave and ledger concurrency suites | Fresh staging carry/cancel/retry evidence; policy blockers retained |
| 6 | attendance close, DD4 and regularization suites | Same closed period flowing into the later payroll snapshot |
| 7 | document lifecycle, notification and SES specs | External storage/scanner/signed URL unavailable; synthetic recipient allowlist |
| 8 | DB6 payroll configuration and temporal integrity suites | Approved synthetic statutory oracle manifest |
| 9 | `db6-payroll-processing.spec.ts`, DB1/payroll job tests | Freeze the uncommitted Actions-tab repair; maker/checker identity separation |
| 10 | payroll processing/output and finance report suites | Provider payment excluded; same-run checksum reconciliation |
| 11 | report/export/import suites | Signed enabled-report/import catalogue and per-module outcome contract |
| 12 | DB6 lifecycle and DD8 history suites | Policy-dependent transfer/rehire/FnF remain blocked |
| 13 | security/isolation/idempotency suites | Approved worker-interruption window and central-log evidence |
| 14 | fixture command and retention teardown tests | PostgreSQL-only harness and baseline tenant fingerprint |

No test currently emits the new `STG-E2E-*` identifiers. Before execution, each of the 136 IDs needs an immutable row-level mapping to test title, prerequisite, expected result and reconciliation query. This is a mapping prerequisite, not a scenario-count change.

## Existing Defects And Limitations Affecting Certification

- Celery beat schedule persistence is not durable and logs corruption/rebuild after recreation.
- Strict provider, artifact-storage and enterprise-identity preflight gates are open.
- Local protected object storage, malware scanning and storage-level access denial are unavailable.
- Off-host encrypted backup, restore rehearsal, RPO/RTO and rollback evidence are missing.
- Central logging, host memory/disk/swap monitoring and current AWS alarms are not evidenced.
- HSTS preload is disabled; CSP is absent from observed login response; framework disclosure header remains.
- SES asynchronous bounce/complaint events are not reconciled into notification records.
- SQLite cannot execute PostgreSQL trigger migrations; database-integrity tests must explicitly target PostgreSQL 16.
- Several business-policy features remain intentionally blocked: overtime conversion, cross-entity transfer, rehire continuity, post-expiry leave restoration, FnF/statutory treatment, delegation/escalation semantics and irreversible erasure.

## STG-1 Entry Criteria

1. Review and freeze the exact QA commit containing the payroll test repair and requested staging documents.
2. Expand the grouped register into a one-to-one 136-ID execution mapping without renumbering or changing scope.
3. Approve the enabled-feature/exclusion manifest and synthetic statutory oracle.
4. Approve one disposable tenant seed, persona matrix, recipient allowlist and cleanup owner.
5. Capture baseline fingerprints for shared tenants and confirm no owned tenant already exists.
6. Define a PostgreSQL 16 test connection for integrity checks; prohibit SQLite for DB guard certification.
7. Accept that external provider/storage/recovery scenarios remain Blocked, or provision their approved staging dependencies.
8. Confirm host resource threshold and stop rules; retain one Playwright worker.

## STG-0 Decision

**CONDITIONAL.** Core staging services and code/migration compatibility are ready for controlled synthetic E2E preparation. STG-1 must not start until the QA candidate and 136-ID row-level mapping are frozen. Production-like infrastructure, provider and recovery certification remains blocked.

## Single Recommended Next Action

Approve and create one reviewable **QA-only commit** containing the preserved payroll test repair, the staging plan/register and these STG-0 deliverables; use that immutable commit to generate the one-to-one 136-ID mapping before authorizing STG-1 Batch 0.
