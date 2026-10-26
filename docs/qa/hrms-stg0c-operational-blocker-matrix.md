# STG-0C Operational Blocker Matrix

Date: 2026-10-26

| Item | Owner | Technical acceptance criteria | Required evidence | Risk | Remediation/status |
|---|---|---|---|---|---|
| Enterprise identity scope | Security/identity owner | `verified` or formally `not_in_scope`; strict preflight passes | Approved decision and redacted preflight | Undeclared authentication posture | Missing; document and inject approved value |
| Provider worker declaration | Payroll platform + DevOps | Supervised job/retry workers, health, bounded retry and queue monitoring | Process inventory, synthetic sandbox job and restart evidence | Accepted work may never execute | Missing; do not set flag before deployment proof |
| Provider credentials | Payroll integration owner | Secret-managed sandbox refs resolve; no secret persisted; adapter handshake succeeds | Secret-manager reference, redacted connection and denial evidence | Payment/provider misuse or data exposure | Blocked pending provider and sandbox approval |
| Artifact storage credentials | Storage/security owner | Private bucket/prefix, least privilege, encryption and signed access | Upload/read/deny/revoke and public-access-block evidence | Payslip/bank artifact exposure | Blocked pending protected storage |
| Storage security policies | Security/compliance owner | Strict verifier passes encryption, retention, lifecycle, scanner, durability and URL bounds | Policy approval and verifier output | Ungoverned sensitive artifacts | Blocked pending policy/external controls |
| Celery beat singleton/durability | SRE | Explicit scheduler/path, one active beat, durable state or justified static schedule, corruption alert and idempotent redelivery | Isolated abrupt-stop/restart and duplicate-effect query | Missed/duplicate scheduled work | Current ephemeral SQLite file is partial; maintenance test required |
| Encrypted off-host backups | SRE + security | Encrypted upload, restricted destination, retention/immutability and failure alert | Object metadata, checksum, access policy and backup logs | Irrecoverable host loss | Local dump only; blocked externally |
| Staging restore rehearsal | DBA/SRE | Restore to isolated DB/artifact prefix; migrations, invariants, RBAC and checksums pass within approved RTO | Rehearsal log and cleanup manifest | Undetected unusable backups | Local synthetic rehearsal passed; staging rehearsal pending |
| Monitoring/alert delivery | SRE + application on-call | Health, capacity, queues, jobs, storage and backups alert with owner/escalation | Controlled alert fire, delivery, acknowledgement and resolution | Silent outage or payroll failure | Rules partial; delivery unverified |
| Worker interruption window | Release manager + SRE | Approved window, rollback, synthetic-only queue and no shared payroll work | Change ticket, before/after queues and integrity queries | Disrupted staging jobs | Not approved; interruption scenarios blocked |

Global provider/storage blockers do not prevent tenant onboarding if Batch 0 confirms the application is healthy and provider-dependent features stay disabled. They do prevent later artifact/provider certification.
