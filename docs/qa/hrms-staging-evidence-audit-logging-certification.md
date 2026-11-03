# HRMS Staging Evidence API Audit Logging Certification

Date: 2026-10-27
Staging: `https://hrms.accerio.in`
Deployed backend SHA: `a5353b4f2a564abb8ca245135669dec75a9457b8`
Decision: **CONDITIONAL PASS**

## Scope And Safety

This phase diagnosed the logger, implemented and tested the correction, committed and deployed the authorized backend-only patch, and established a centralized CloudWatch Logs path. It did not push Git, run payroll, send email, create a tenant, or execute a frozen staging scenario. Two bounded evidence-API security probes used the existing synthetic grant: one intentional denial and one authorized read-only request.

## Root Cause

The deployed process reported this effective logger state:

```text
logger level=NOTSET (0)
effective level=WARNING (30)
propagate=true
logger handlers=0
root level=WARNING (30)
root handlers=0
```

`apps.common.staging_evidence_api._audit()` emits `INFO`. The records were therefore filtered by the inherited `WARNING` threshold before Gunicorn or Docker could receive them. This is confirmed rather than inferred:

- a staging denied probe returned `403`;
- a staging authorized scoped GET returned `200`;
- both supplied unique correlation IDs;
- Docker logs contained zero matching correlation/event records.

Docker uses the bounded `json-file` driver with `max-size=10m` and `max-file=5`; its stdout/stderr path exists and application access logs are otherwise available. The event was not misrouted or delayed at Docker: it was never emitted by Python logging.

## Central Retention Result

The approved central path is now active:

- CloudWatch log group: `/accerio/hrms/staging/security-audit` in `ap-south-1`;
- encryption: CloudWatch Logs service-side encryption at rest using the AWS-managed service key;
- retention: **90 days**;
- collector: Amazon CloudWatch Agent `1.300074.0b1920`, enabled and active on `saas-staging-01`;
- source filter: only Docker JSON records containing `staging_evidence_access`;
- stream: `saas-staging-01/i-03f6588ec0afb56df`;
- writer: dedicated IAM user `hrms-staging-audit-writer` with only create-stream, describe-stream, and put-events rights for this log group;
- negative permissions: writer read and delete attempts both returned `AccessDenied`.

The access key is root-readable only on the host; the downloaded transfer copy was removed. Unrelated application and payroll logs are not forwarded by this collector configuration.

## Local Remediation

The minimal application patch is:

| File | Purpose |
|---|---|
| `backend/apps/common/security_logging.py` | Allowlisted JSON formatter for security audit records |
| `backend/config/settings/base.py` | Dedicated stdout handler at `INFO` for only `hrms.security.staging_evidence` |
| `backend/apps/common/staging_evidence_api.py` | Correlation ID, environment, authorization reference, and pseudonymous actor/tenant references |
| `backend/tests/test_stg1f_staging_evidence_api.py` | Handler, structured emission, outcome, correlation, and redaction regression tests |

The handler has `propagate=false`, so it does not increase global Django/Gunicorn verbosity. No migration or model change is required. Production behavior outside this named logger is unchanged.

### Event contract

Each JSON line contains only:

- UTC timestamp, level, logger, and event category;
- allowed/denied outcome and reason category;
- SHA-256-derived 24-character actor and tenant references;
- authorization reference where an applicable grant exists;
- run ID and scenario ID where available;
- environment identity;
- validated client correlation ID or a server-generated UUID.

The formatter does not serialize arbitrary `LogRecord` extras. Passwords, cookies, authorization headers, access tokens, employee/payroll payloads, email addresses, and raw tenant/user identifiers are excluded.

## Local Verification

| Check | Result |
|---|---|
| PostgreSQL evidence API/security suite | **21 passed** in 90.87 seconds |
| Allowed event emitted to structured handler | Passed |
| Denied event emitted to structured handler | Passed |
| Correlation IDs retained | Passed |
| Actor/tenant pseudonymization | Passed |
| Sensitive-field and email redaction | Passed |
| Effective logger | `INFO`, dedicated `StreamHandler`, `propagate=false` |
| Django system check | Passed, zero issues |
| Migration drift | None |
| Python compilation | Passed |
| Git whitespace check | Passed |
| Task-owned PostgreSQL cleanup | Complete |

## Staging Evidence

Commit `a5353b4f2a564abb8ca245135669dec75a9457b8` was deployed as backend image `sha256:e37ececcb376cfa17f5908fe1ffa9a8f71cdb3e437db78fe48d4917c651eaf26`. Django checks and `migrate --check` passed; the backend remained healthy with zero restarts.

| Probe | HTTP result | Container audit event |
|---|---:|---:|
| Wrong fingerprint, correlation `audit-central-denied-20261027` | 403 | Present in Docker and CloudWatch; `denied/fingerprint` |
| Authorized scoped GET, correlation `audit-central-allowed-20261027` | 200 | Present in Docker and CloudWatch; `allowed/evidence_collected` |
| Previously revoked grant | 403 | Functional denial remains previously verified; no new mutation was needed |

Both retained records contain the expected pseudonymous references and omit authorization headers, tokens, cookies, passwords, email addresses, employee/payroll data, and request payloads. Each record was independently retrieved from CloudWatch by its correlation ID.

## Release Impact

The six-file application/certification patch was committed as `a5353b4f2a564abb8ca245135669dec75a9457b8` with parent `c2703e810208179a94e8cc15615bb78c27c51104`.

- Commit: `fix(security): emit structured staging evidence audit logs`
- Runtime impact executed: backend-only immutable rebuild and recreate; worker/beat/web were unchanged.
- Database impact: none.
- Configuration impact: none for emission; the centralized collector requires separately approved infrastructure configuration.
- Rollback: restore the previous backend image. No schema or data rollback is necessary.

Rollback remains the previous backend image; no schema or data rollback is required.

## Central Collector Acceptance Criteria

The infrastructure owner must select an approved destination and provide:

1. A collector that reads the backend container JSON log or an approved Docker logging driver.
2. TLS-protected delivery with bounded local buffering and retry.
3. A dedicated log group/index encrypted with the approved KMS key.
4. An approved retention period and deletion policy.
5. Least-privilege writer identity and security/audit read roles.
6. Alerting for collector failure, dropped records, and denied evidence-access bursts.
7. Search evidence for one denied and one allowed event by correlation ID.
8. Proof that tokens, headers, cookies, employee data, and payloads are absent.

## Batch 1 Entry Reassessment

| Requirement | Status | Evidence or gap |
|---|---|---|
| Environment fingerprint | PASS | Opaque staging fingerprint configured and previously verified |
| Dedicated evidence identity | PASS | Non-staff, non-superuser, one direct permission, zero memberships |
| Expiring/revocable run grant | PASS | Expiry/revocation/activation behavior verified |
| Synthetic tenant namespace | PASS | `pw-qa-stg1-*` enforcement exists; no new tenant created here |
| SES recipient isolation | PASS for denial | Fail-closed backend, zero allowed recipients; approved synthetic recipient list still needed for delivery scenarios |
| Governed cleanup or quarantine | APPROVAL REQUIRED | Named method and owner are absent |
| Recovery reference | PASS | Versioned SSE-KMS set `20261027T131553Z` with isolated restore evidence |
| Execution owner | APPROVAL REQUIRED | Not named for Batch 1 |
| Cleanup owner | APPROVAL REQUIRED | Not named |
| Recovery/rollback owner | APPROVAL REQUIRED | Not named for the execution window |
| Execution window | APPROVAL REQUIRED | No Batch 1 window authorized |
| Central audit retention | PASS | Denied and allowed events searchable in encrypted CloudWatch Logs; 90-day retention; writer cannot read/delete |

All 136 shared-staging scenarios remain **Not Run**.

## Verdict

**CONDITIONAL PASS.** The logging defect, container visibility, centralized delivery, retention, redaction, and writer isolation are verified. The remaining Batch 1 gaps are governance approvals: named execution, cleanup, and rollback owners; an execution window; a governed cleanup/quarantine method; and an approved synthetic SES recipient list if delivery scenarios are included.

Exact next action: issue the explicit Batch 1 authorization naming scenarios `STG-E2E-0101` through `STG-E2E-0106`, the run namespace/window, execution/cleanup/rollback owners, and the cleanup or quarantine method. All 136 shared-staging scenarios remain Not Run.
