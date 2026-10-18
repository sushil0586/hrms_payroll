# HRMS/Payroll RG-1A Security and Recovery Certification

Date: 2026-10-18  
Decision: **CONDITIONAL**  
Production readiness: **NO-GO**

## Scope reconciliation

RG-1 contains 12 frozen gates. This first high-risk local batch addressed `DDG-F-027` and the locally actionable portion of `DDG-F-024`; IDs and dependencies remain unchanged.

| Gate | Outcome | Finding |
|---|---|---|
| `DDG-F-027` | Verified locally / conditional overall | Immediate server-side expiry/revocation, concurrent transition safety, tenant/agent/scope enforcement, and audit evidence passed. Deployed TLS and centralized security-log evidence still depend on `STG-001` and `STG-006`. |
| `DDG-F-024` | Partial | Signed payroll-artifact grants now serialize validation, use counting, expiry, and revocation. External object-store enforcement/logs and approved signed-access lifetime remain dependent on `STG-004`. |
| `DDG-F-004` | Not Started | Malware scanning, quarantine, external storage, and approved retention controls require the protected-storage workstream. Uploads remain a pilot exclusion. |
| `DDG-F-028` | Blocked | No approved jurisdiction retention, legal-hold, backup, or irreversible-erasure policy. Erasure remains disabled. |
| `DDG-F-029` | Blocked | Ambiguous legacy records require owner-approved deterministic classification; none were changed. |
| `DDG-F-032` | Blocked | Archive/restore certification depends on approved retention and external protected storage/recovery. |
| `STG-001` | Blocked externally | Real TLS, proxy, HSTS, secure-cookie, CSRF, and host behavior require deployed staging. |
| `STG-002` | Blocked externally | Managed database backup/restore and approved RPO/RTO require staging infrastructure. |
| `STG-003` | Blocked externally | Managed broker interruption and stale-worker recovery require staging infrastructure. |
| `STG-004` | Blocked externally | Private encrypted object storage, scanner, signed URL enforcement, and restore evidence are unavailable locally. |
| `STG-006` | Blocked externally | Central dashboards, alerts, retention, and incident drill require deployed observability. |
| `STG-007` | Blocked externally | Rolling deployment and rollback rehearsal require staging. |

Totals across all 12 RG-1 gates: **1 Verified locally, 1 Partial, 9 Blocked, 1 Not Started**.

## Root causes and remediation

### Support-session race

Grant transitions previously read an unlocked row. A concurrent start could act on stale approved state while revocation was being committed. `update_support_access_grant` now obtains a PostgreSQL `SELECT FOR UPDATE` lock. Privileged support reads lock and evaluate the same row inside one transaction through payload construction, establishing a clear order between a read and revocation.

### Signed-artifact race

Signed-grant validation and access-count increment were separate unlocked writes, while revocation accepted a potentially stale model instance. Validation/use now serialize on the grant row, and revocation reloads and locks the canonical row. Expiry errors are raised after the atomic block so the denied request still commits the durable `expired` state.

No payroll calculation, retention rule, permission, tenant scope, API response schema, or UI business behavior changed.

## Verification

- PostgreSQL focused backend: **12 passed**, including concurrent support transition, expiry, scope, wrong-agent denial, permission denial, signed-access limits, stale revoke replay, and audit export.
- Production-built Playwright: **1 passed** support lifecycle; **3 passed** neighboring authentication/RBAC boundaries.
- TypeScript: passed.
- ESLint: passed.
- Django checks: passed.
- Migration drift: none.
- Production frontend build: passed with one pre-existing autoprefixer warning.
- Synthetic environment cleanup: passed.

Detailed commands and before/after evidence: `docs/qa/evidence/rg1a-2026-10-18/001-rg1a-execution-evidence.md`.

## Modified files

- `backend/apps/common/selectors.py`
- `backend/apps/common/api_views.py`
- `backend/apps/payroll/services.py`
- `backend/tests/test_phase0_api_smoke.py`
- `web/tests/e2e/phase7f-support-session-lifecycle.spec.ts`
- `docs/qa/hrms-release-gate-execution-tracker.csv`
- This report and its evidence record.

## Residual risk and decision

`DDG-F-027` is closed for local application behavior but cannot be called deployed security-certified without real TLS and centralized security logs. `DDG-F-024` remains Partial until protected object storage proves that a revoked grant cannot be used directly against the storage provider. Legal retention, erasure, legacy classification, backup/restore, broker, monitoring, and deployment gates remain blocked exactly as planned.

RG-1A is **CONDITIONAL**. The selected local controls pass, but RG-1 as a whole is not complete and real-payroll production readiness remains **NO-GO**.
