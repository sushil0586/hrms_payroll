# HRMS Staging Batch 1 Entry Closure

Date: 2026-10-27
Target: `https://hrms.accerio.in`
Frozen scope: `STG-E2E-0101` through `STG-E2E-0106`
Decision: **BLOCKED AT RELEASE/OPERATIONAL AUTHORIZATION GATE; no staging scenario executed**

## Fresh Runtime Evidence

| Control | Verified result |
|---|---|
| Source revision | `c14b668e0e8eb641e4c4670e5eefeb7cf308cf59` |
| Backend image | `sha256:c166e384607fd8203ed5a3733cc433c952e12fb68ed3b2ac0cda3150a2661035` |
| Web image | `sha256:a28657f4457d5d76b807717898bab4fa61f4370d7b7df099c085219bf2a78cb9` |
| Runtime environment | `HRMS_ENVIRONMENT=staging` |
| Services | Backend, web, PostgreSQL and Redis healthy; worker and beat responsive; zero restarts; Redis queue depth zero |
| Database | PostgreSQL ready; `common.0010` and `organizations.0003` applied; no pending migrations |
| HTTPS | Health and login returned HTTP 200; TLS and HSTS active |
| Secret-log scan | Zero credential-pattern matches in recent backend, worker, beat and web logs |
| Staging result register | `0 Passed / 0 Failed / 136 Not Run` |

The local AWS profile authenticates as `lightsail-staging-operator` in account `227022022984`, but fresh Lightsail inventory, alarm and snapshot calls are denied by IAM. Host evidence was collected through the approved SSH key without printing secrets.

## Fingerprint Contract

The implementation accepts any non-empty exact string and compares the runner header byte-for-byte with `HRMS_STAGING_ENVIRONMENT_FINGERPRINT`. Responses expose only its SHA-256. Missing and mismatched values fail closed; the ownership manifest and destructive cleanup repeat the environment check.

Proposed deployment-bound, non-secret identifier, pending infrastructure-owner approval:

`hrms-stg-ap-south-1-saas-staging-01-c14b668e`

Expected SHA-256: `be2b0b988eda03f2c59e2d84b598885dc267f3f9f19bb237a020caddd88e2939`.

The runtime fingerprint is currently unset. Evidence API and destructive cleanup remain disabled. No runtime configuration was changed. Local PostgreSQL tests already prove correct, missing and mismatched fingerprint behavior; staging acceptance cannot be executed until an approved value is injected into both runtime and the authorized runner.

## Evidence Identity

The deployed endpoint is bounded to six frozen IDs, exact run/tenant/resource identifiers, sandbox tenants, GET/HEAD/OPTIONS, a read-only PostgreSQL transaction, bounded responses and structured allow/deny auditing. It exposes no SQL, employee detail, payroll detail or general table access.

A separate PostgreSQL evidence identity is **not required** for Batch 1 when this API is used. `HRMS_STAGING_EVIDENCE_DB_ROLE` applies to the separate server-side management-command collector, not the API path.

The deployed API permission implementation is not least privilege: it requires an active allowlisted Django superuser. A local additive patch now replaces that design with a direct `common.view_staging_evidence` permission for a non-staff/non-superuser principal and a durable, expiring server-side authorization binding actor, run, tenant namespace, scenario subset and fingerprint. PostgreSQL security tests passed 20/20 and the final production-built browser run passed 6/6. The patch is uncommitted and undeployed, so staging must remain disabled until the reviewed migration and images are released.

## Synthetic Identities And SES

| Requirement | Status | Evidence / missing action |
|---|---|---|
| Run namespace | **APPROVAL REQUIRED** | No approved `stg1-...` run ID or `pw-qa-stg1-...` tenant code exists |
| Platform actor | **BLOCKED IN STAGING** | Dedicated least-privilege identity is locally proven; it is not provisioned or approved on staging |
| Tenant/HR/ESS/MSS/payroll personas | **NOT CREATED** | Batch 1 needs Platform Admin and first Tenant Admin only; later personas must not be pre-created without their batch authorization |
| SES isolation | **PASS, fail-closed** | Exact-recipient allowlist is empty, so the staging backend rejects every outbound recipient |
| Allowed-recipient delivery | **NOT VERIFIED** | No recipient was approved and no email was sent |
| Denied-recipient behavior | **VERIFIED LOCALLY** | Focused email tests prove fail-closed denial; no live staging email was attempted |

Batch 1 can provision credentials through the browser without depending on live SES, but any notification assertion remains unavailable until exact synthetic recipients are approved, injected and tested. `STG-E2E-0710` remains blocked for provider/private-storage certification.

## Recovery And Cleanup

The exact predeployment dump is `backups/predeploy-c14b668e-20261027T115655Z.sql.gz`, size 208,608 bytes, SHA-256 `bc1449c56141f1e58511de872b0f3c11bbd021828cf785cb7aa8231c918ff836`. Checksum and gzip integrity pass. It is host-local and is not disaster-recovery certification.

Encrypted off-host storage, retention, backup alerting and an isolated staging-derived restore remain unverified. No approved recovery reference or named recovery owner exists. Cleanup tooling is exact-ID, dry-run by default and rejects protected downstream history, but destructive cleanup is disabled. Tenant quarantine/deactivation is the safe interim end state if execution is later authorized without destructive cleanup.

## Monitoring And Capacity

| Signal | Fresh result |
|---|---|
| Root filesystem | 53 GB / 77 GB, **69%** used; 25 GB available |
| Memory | 3.7 GiB total; 1.6 GiB available |
| Swap | 609 MiB / 4 GiB used |
| Docker images | 18.03 GB; 12.36 GB reported reclaimable |
| Build cache | 32.58 GB; 29.45 GB private/reclaimable |
| PostgreSQL/Redis/Celery | Healthy; queue depth zero; worker ping passed |
| Alerts and backup monitoring | **NOT VERIFIED**; AWS alarm/snapshot reads are IAM-denied and no delivered-alert evidence exists |

No cache or image was removed. A separately approved cleanup may prune only unused build cache after recording active image IDs and confirming adequate rollback images remain; broad `docker system prune` is prohibited.

## Batch 1 Entry Gate

| ID | Workflow support | Evidence readiness | Entry result |
|---|---|---|---|
| `STG-E2E-0101` | Browser tenant creation implemented | Actor, fingerprint, namespace, recovery and ownership approval absent | **BLOCKED** |
| `STG-E2E-0102` | Duplicate tenant rejection implemented | Depends on owned `0101` tenant and evidence actor | **BLOCKED** |
| `STG-E2E-0103` | Duplicate admin rejection implemented | Exact synthetic identity/recipient approval absent | **BLOCKED** |
| `STG-E2E-0104` | Subscription activation implemented | Depends on approved run-owned tenant | **BLOCKED** |
| `STG-E2E-0105` | First Tenant Admin and routing implemented | Approved credentials and cleanup/quarantine ownership absent | **BLOCKED** |
| `STG-E2E-0106` | Cross-role tenant denial implemented | Depends on the authorized `0105` identity | **BLOCKED** |

External document storage, statutory policy, payroll provider and payroll finalization gates are not Batch 1 dependencies. They remain mandatory for their later workflows and are not waived.

## Required Authorization

Before tenant creation, one approval record must identify:

1. `STG-E2E-0101` through `STG-E2E-0106` on `https://hrms.accerio.in`.
2. Revision `c14b668e...` and the backend/web image IDs above.
3. Execution, cleanup/quarantine and recovery owners.
4. A bounded execution window and one `stg1-...` run ID / `pw-qa-stg1-...` tenant namespace.
5. Approved synthetic identities and exact SES recipients, if email is in scope.
6. The approved fingerprint and secret-safe runner delivery mechanism.
7. A recovery reference and the approved non-destructive quarantine or separately authorized cleanup method.

The evidence authorization defect is fixed and verified locally but not released. Batch 1 remains **BLOCKED** until the patch, `common.0011`, dedicated identity, run authorization and operational owner record are approved and deployed. All 136 staging scenarios remain **Not Run**.

## Local Least-Privilege Remediation Update

- PostgreSQL security suite: **20 passed**.
- Production-built Playwright: first pass `2 passed / 1 automation-drift failure / 3 not run`; final pass **6 passed in 21.4 seconds** after exact-response-ID synchronization.
- Evidence principal: active, direct custom permission, `is_staff=false`, `is_superuser=false`.
- Ownership proof: 19 manifest events, six passed scenario completions and six exact resource registrations.
- TypeScript, focused ESLint, Django checks, migration drift and production build passed.
- No staging data, infrastructure, runtime configuration or scenario status changed.

Full evidence: `hrms-staging-evidence-api-least-privilege-remediation.md`.
