# HRMS Evidence API Security Patch Release

Date: 2026-10-27
Target: `https://hrms.accerio.in`
Parent revision: `c14b668e0e8eb641e4c4670e5eefeb7cf308cf59`
Candidate status: **reviewed locally; commit and deployment approval required**

## Candidate Inventory

The exact candidate is the 13 unique paths in `hrms-evidence-api-security-patch-manifest.txt`. All paths exist, are unique and sorted. Manifest SHA-256: `235edda62f8ef8f05fbcf5f82e7f6203ec1ce01a6cbba5705c0c2c47a7e13fea`.

| Class | Files |
|---|---:|
| Backend authorization/model | 2 |
| Additive migration | 1 |
| PostgreSQL security tests | 1 |
| Playwright/helper integration | 3 |
| QA reports and manifest | 6 |
| **Total** | **13** |

Excluded from the candidate:

- `web/tests/e2e/db6-payroll-processing.spec.ts`, preserved at diff SHA-256 `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`.
- Untracked `docs/qa/evidence/stg136-batch*` directories.
- Build output, test output, local databases, environment files, credentials and runtime manifests.

## Migration Review

`common.0011_staging_evidence_authorization`:

- Depends on `common.0010_leave_import_source_identity` and the swappable user model.
- Creates one empty authorization table; it does not inspect, classify, rewrite or delete existing rows.
- Adds indexes for run/tenant/expiry and principal/revocation/expiry lookups.
- Adds uniqueness for principal plus run ID.
- Stores scenario scope, fingerprint SHA-256, authorization reference, authorizer identifier, authorization/expiry timestamps and revocation timestamp/reason.
- Creates only `common.view_staging_evidence`; it grants that permission to no user or group.
- Does not create an evidence user, token, grant, superuser authorization or default active run.

Ordering is safe: deploy database-compatible backend image, apply `common.0011`, provision the restricted identity and run grant, verify denials, then enable the endpoint. Current `c14b668e` code does not reference the new table, so migration-first deployment is compatible.

Rollback sequence: disable the endpoint, revoke active authorizations, roll back application images, and normally retain `common.0011`. Reverse the migration only after proving no audit/recovery need for its authorization records; reversal drops that table and is therefore destructive to authorization history.

## Executed Regression

All tests used task-owned PostgreSQL 16 and local processes.

| Check | Result |
|---|---|
| Evidence API PostgreSQL security suite | **20 passed** in 257.69 seconds |
| Production-built Playwright `0101`-`0106` | **6 passed** in 22.5 seconds |
| Independent evidence assertions | **6 passed** |
| Ownership manifest | 19 events; 6 passed completions; 6 exact resources |
| TypeScript | Passed |
| Focused ESLint | Passed |
| Django system check | Passed, 0 issues |
| Migration drift | None |
| Next.js 15.5.28 production build | Passed; existing autoprefixer warning retained |
| Diff whitespace and targeted secret scan | Passed |

The tests cover direct permission, non-staff identity, superuser and Tenant Admin denial, revoked/expired grants, forged run, tenant/resource isolation, fingerprint mismatch, disabled/production behavior, mutation denial, audit events and sensitive-field redaction.

These are local results, not staging certification. Shared staging remains `0 Passed / 0 Failed / 136 Not Run`.

## Image And Restart Impact

- Backend image changes for the model, authorization logic and migration.
- Web image has no product-runtime source change, but rebuilding is recommended so immutable backend/web release provenance uses one patch revision; the changed Playwright files are not runtime routes.
- Celery worker/beat code is unaffected. Restart only backend and web after migration. Worker/beat restart is unnecessary for this patch.
- Do not enable the endpoint during image replacement or migration.

## Recovery Gate

The checksummed predeployment dump is host-local. No verified encrypted off-host PostgreSQL/artifact backup, retention enforcement, isolated staging-derived restore, measured recovery result or named recovery owner was found. This remains a blocker for deployment authorization and tenant creation; a local dump does not cover host loss.

## Commit Boundary

No Git staging or commit is authorized by this task. Proposed message after owner approval of the exact manifest:

`fix(security): enforce least-privilege staging evidence access`

Use pathspec input from the reviewed manifest, verify the staged name set exactly, run `git diff --cached --check`, rescan staged content, and confirm the protected payroll file is not staged. Do not use broad Git add operations.

## Decision

The code candidate is **PASS for owner review**. Deployment entry remains **BLOCKED** by commit/image approval and the recovery gate. Batch 1 remains blocked by operational authorization and all 136 scenarios remain Not Run.
