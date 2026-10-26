# STG-1 Batch-1 Entry Gate

Date: 2026-10-26
Target: `https://hrms.accerio.in`
Frozen IDs: `STG-E2E-0101` through `STG-E2E-0106`
Verdict: **BLOCKED; no staging scenario executed**

## Read-only Deployment Provenance

| Control | Verified state |
|---|---|
| DNS/TLS | `hrms.accerio.in` resolves to `65.0.231.86`; valid Let's Encrypt certificate, 2026-10-18 through 2027-01-16 |
| Public health | HTTP 200; `{"status":"ok","service":"hrms-backend"}` |
| Security headers | HSTS, frame denial, content-type protection and strict referrer policy present |
| Host/Compose | `saas-staging-01`; seven `hrms-staging` services running |
| Deployed Git SHA | `20d832996ef505f0b6c2df2673204e841e7b6a52` |
| Backend image | `hrms-backend@sha256:e4fcf34a080973cf02bbf1341ab57251c5a827e9782dabd6b8eff169fc12337b` |
| Web image | `hrms-web@sha256:03bb370c78bf7097c3acdf364443523936084ec183e921580484dc047c061c7a` |
| Image creation | Backend 2026-10-26T16:11:44Z; web 2026-10-26T16:17:49Z |
| Django/schema | Check passed; 128 applied migrations; 0 unapplied |
| Celery | Worker and beat running from the backend digest; Celery 5.4.0; no restart count |
| Container health | Backend, web, PostgreSQL and Redis healthy; all seven restart counts are zero |
| Platform identity | Two active platform superusers exist; actual credential usability was not tested |
| Synthetic tenant posture | Two sandbox tenants exist; no new tenant was created in this review |
| Evidence access | QA directory mode 0700; secret directory 0700; backup files 0600 |
| Rollback | Prior backend/web images remain locally available, but rollback was not rehearsed |
| Backup | Only a host-local PostgreSQL dump dated 2026-10-18 was found; no automated HRMS backup timer was found |
| Off-host recovery | Not verified. Current AWS operator can authenticate but is denied snapshot/alarm inventory calls |

The older `sha256:279457...` web hotfix is no longer the running release. It remains available as an older local image but must not be cited as current staging provenance.

## Shared Prerequisite Assessment

| Prerequisite | Status | Evidence or blocker |
|---|---|---|
| Exact committed QA candidate | **BLOCKED** | New tests/docs are untracked; no approved child revision exists |
| Deployed application provenance | **PASS** | Commit and backend/web image digests independently read from the host |
| Complete browser automation | **PASS** | Six frozen titles implemented and locally passed with one worker |
| Independent API coverage | **PASS** | Dedicated API tests locally passed on PostgreSQL |
| Staging-safe PostgreSQL evidence | **BLOCKED** | Pytest creates an isolated test database and cannot be pointed at staging; a read-only exact-ID query/collector is not yet packaged |
| Run ownership manifest | **BLOCKED** | Playwright retains IDs only in process and does not emit a durable tenant/user/contact/audit manifest |
| Deterministic cleanup | **BLOCKED** | No reviewed exact-ID cleanup command consumes such a manifest; deleting by guessed code is prohibited |
| Usable Platform Admin credentials | **NOT VERIFIED** | Active identities exist, but credential authentication was intentionally not attempted |
| Synthetic administrator delivery | **NOT VERIFIED** | SES history exists, but the recipient, credential channel and send suppression/allowlist for this run are not approved |
| Tenant namespace | **BLOCKED** | No approved namespace/run ID supplied in an execution authorization |
| Evidence storage | **PASS** | Host QA directory is restricted to mode 0700; final evidence naming/index still requires run authorization |
| Reversibility | **BLOCKED** | Local images permit application rollback, but data cleanup and backup/restore evidence are incomplete |
| Cross-tenant stop controls | **PASS by design** | `0106` asserts 403 and no write; execution stop rule remains mandatory |
| Worker dependency | **PASS / not applicable** | These six onboarding cases require no Celery task completion |
| External protected artifact storage | **Accepted as irrelevant only for this batch** | No employee/payroll document is created; this is not a waiver for later batches |
| Payroll/provider integration | **Accepted as irrelevant only for this batch** | No payroll or payment operation is permitted |
| Monitoring/off-host restore | **REQUIRES OWNER ACCEPTANCE** | Operational risk remains; it does not change onboarding assertions but affects recovery from host failure |

## Per-Scenario Gate

| ID | Automation | API/PostgreSQL assertion | Configuration | Cleanup/reversal | Entry result |
|---|---|---|---|---|---|
| `STG-E2E-0101` | PASS | API PASS; staging DB collector missing | Platform credential and namespace not verified | Ownership manifest/cleanup missing | **BLOCKED** |
| `STG-E2E-0102` | PASS | Duplicate/no-partial-row assertions implemented | Depends on `0101` | Same manifest dependency | **BLOCKED** |
| `STG-E2E-0103` | PASS | Identity/membership absence assertions implemented | Synthetic recipient not approved | Contact/user cleanup missing | **BLOCKED** |
| `STG-E2E-0104` | PASS | Active Enterprise state and audit assertions implemented | Depends on `0101` | Tenant rollback missing | **BLOCKED** |
| `STG-E2E-0105` | PASS | Membership/role/login assertions implemented | Credentials/delivery not approved | User/membership cleanup missing | **BLOCKED** |
| `STG-E2E-0106` | PASS | 403/no-write assertions implemented | Depends on `0105` identity | No mutation expected; suite dependency remains | **BLOCKED** |

## Authorization Boundary

This prompt explicitly states that it is not staging-mutation authorization. A valid execution approval must name:

1. `https://hrms.accerio.in` and the immutable backend/web digests above.
2. Exactly `STG-E2E-0101` through `STG-E2E-0106`.
3. The committed QA candidate SHA.
4. The disposable tenant namespace and synthetic administrator identity.
5. The authorized execution window.
6. Cleanup and rollback owners.
7. Acceptance of the batch-specific operational risk or evidence that backup/restore protection has been closed.

## Reconciliation

- Executed on staging: 0
- Passed/Failed/Blocked/Skipped on the frozen staging register: 0/0/0/0
- Not Run: 136
- No scenario status was changed.
- No staging data, service, container, migration, configuration or infrastructure was modified.

## Required Next Action

Add a secret-safe run-manifest writer plus reviewed read-only PostgreSQL evidence and exact-ID cleanup tooling to the QA candidate, rerun locally, then obtain owner approval for the exact committed revision and execution window.
