# HRMS Staging Evidence API Audit Logging Certification

Date: 2026-10-27  
Staging: `https://hrms.accerio.in`  
Deployed SHA: `c2703e810208179a94e8cc15615bb78c27c51104`  
Decision: **BLOCKED pending patch deployment and centralized retention**

## Scope And Safety

This phase diagnosed staging read-only, implemented and tested a local logging correction, and reassessed Batch 1 entry. It did not commit, push, deploy, restart staging, mutate a database, send email, process payroll, create a tenant, or execute a frozen staging scenario.

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

## Central Retention Finding

No active CloudWatch Agent, Fluent Bit, Vector, Promtail, Filebeat, or Logstash service exists on the Lightsail host. Docker logs are host-local rotating files, not centralized retention. The current AWS operator also lacks `logs:DescribeLogGroups`, so no external CloudWatch Logs group, KMS setting, retention period, resource policy, or searchable stream could be independently verified.

Consequently:

- container visibility is not a substitute for centralized retention;
- retention duration and security-team read access are not verified;
- search by correlation ID in a central destination is not verified;
- central audit certification remains blocked even after the local formatter/handler fix.

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

Current deployed code remains `c2703e8...` without this local logging patch.

| Probe | HTTP result | Container audit event |
|---|---:|---:|
| Wrong fingerprint, correlation `audit-closure-denied-20261027` | 403 | Missing |
| Authorized scoped GET, correlation `audit-closure-allowed-20261027` | 200 | Missing |
| Previously revoked grant | 403 | Previously functionally verified; logging absent |

The revoked state was not recreated in this phase because database mutation was prohibited. No staging event can be claimed centrally retained.

## Release Impact

Application patch manifest before documentation reconciliation: **4 files**, listed above. The complete uncommitted certification change also includes this report and `docs/qa/hrms-staging-certification-dashboard.md`.

- Commit recommendation: `fix(security): emit structured staging evidence audit logs`
- Runtime impact: rebuild the backend image and recreate backend only; worker/beat do not serve this API, though synchronized image rollout may follow normal provenance policy.
- Database impact: none.
- Configuration impact: none for emission; the centralized collector requires separately approved infrastructure configuration.
- Rollback: restore the previous backend image. No schema or data rollback is necessary.

No commit or deployment is authorized by this phase.

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
| Central audit retention | BLOCKED | No deployed logging fix or verified central collector |

All 136 shared-staging scenarios remain **Not Run**.

## Verdict

**BLOCKED.** The application root cause is fixed and verified locally, but the fix is uncommitted/undeployed and no approved centralized log-retention path is installed or evidenced. Batch 1 cannot yet be authorized.

Exact next action: security and infrastructure owners must approve the six-file candidate and a central collector/log-group design with retention and access controls; then commit, deploy the backend patch, and prove denied/allowed correlation-ID search in that destination before issuing Batch 1 execution authorization.
