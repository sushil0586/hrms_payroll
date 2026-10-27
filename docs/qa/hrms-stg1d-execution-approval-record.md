# HRMS STG-1D Batch-1 Execution Approval Record

Status: **NOT AUTHORIZED - TEMPLATE REQUIRES NAMED OWNER APPROVALS**

No names, dates, credentials, or approvals are inferred by this document.

| Field | Required value | Current status |
|---|---|---|
| Target environment | `https://hrms.accerio.in` plus verified Lightsail instance identity | URL PASS; instance NOT VERIFIED |
| Environment fingerprint | Opaque deployment-configured value, recorded by reference rather than secret disclosure | BLOCKED |
| Scenario IDs | `STG-E2E-0101` through `STG-E2E-0106` only | Scope PASS |
| QA candidate SHA | `7a55b33e20bfc5ba34f2c15017edd271c2092664` | Local commit PASS; not pushed/deployed |
| Application SHA | Fresh running value | NOT VERIFIED |
| Backend image digest | Fresh immutable running value | NOT VERIFIED |
| Web image digest | Fresh immutable running value | NOT VERIFIED |
| Migration leaves | Fresh applied and pending state | NOT VERIFIED |
| Synthetic run ID | Must match `stg1-[a-z0-9][a-z0-9-]{5,55}` | APPROVAL REQUIRED |
| Tenant namespace | Exact `pw-qa-stg1-<run>` value | APPROVAL REQUIRED |
| Synthetic administrator identities | Approved address references; no passwords in this record | APPROVAL REQUIRED |
| Notification policy | Enforced synthetic-recipient-only route | BLOCKED |
| Execution window | UTC/IST start and end | APPROVAL REQUIRED |
| Execution owner | Named authorized operator | APPROVAL REQUIRED |
| Cleanup owner | Named independent exact-ID reviewer/operator | APPROVAL REQUIRED |
| Rollback owner | Named deployment rollback authority | APPROVAL REQUIRED |
| Recovery owner | Named restore authority | APPROVAL REQUIRED |
| Recovery reference | Successful staging-derived isolated restore evidence ID | BLOCKED |
| Evidence location | Restricted path/bucket prefix and retention | APPROVAL REQUIRED |
| Cleanup authorization reference | Separate approval after dry-run review | APPROVAL REQUIRED |

## Mandatory Stop Conditions

Stop immediately on cross-tenant visibility or mutation, unauthorized administrator creation, entitlement bypass, unexpected non-synthetic recipient, duplicate/corrupt tenant state, protected historical/financial side effect, environment fingerprint mismatch, provenance mismatch, migration drift, unhealthy service, failed evidence collection, or ownership-manifest ambiguity.

## Required Sign-Offs

| Authority | Approval statement required | Status |
|---|---|---|
| Release owner | Approves exact environment, six IDs, candidate/application provenance, and execution window | APPROVAL REQUIRED |
| Infrastructure owner | Confirms capacity, health, rollback path, and no conflicting maintenance | APPROVAL REQUIRED |
| Security owner | Approves identities, email isolation, evidence access, and tenant-control design | APPROVAL REQUIRED |
| DBA/recovery owner | Confirms backup/restore reference and read-only evidence role | APPROVAL REQUIRED |
| QA execution owner | Accepts one-worker execution, evidence, stop conditions, and no scope expansion | APPROVAL REQUIRED |
| Cleanup owner | Accepts dry-run review, exact-ID cleanup, protected-record refusal, and final absence proof | APPROVAL REQUIRED |

This task is not authorization to execute or clean up. Batch 1 remains blocked until every mandatory field has an evidenced value and every authority signs the same immutable approval record.
