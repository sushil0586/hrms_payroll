# Phase 3D Final Integrated QA Certification

Date: 2026-10-16  
Scope: local HRMS/Payroll integrated QA certification  
Decision: **CONDITIONAL**

## Executive decision

The frozen Phase 3 manifest is fully reconciled: 963 unique cases, 957 passed, 6 justified fixture-conditioned skips, and no failed, blocked, or not-run cases. Evidence references exist for every row. Focused Phase 3D browser, API, backend, migration, typecheck, and production-build checks found no unresolved P0/P1 functional, payroll-integrity, tenant-isolation, or security defect.

Certification is conditional because the six skipped scenarios still require explicit fixture-backed execution or release-owner risk acceptance, and production configuration controls cannot be validated from the local environment. This is not production-readiness approval.

## Frozen outcomes

| Priority | Passed | Skipped | Failed | Blocked | Not run | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| P0 | 477 | 2 | 0 | 0 | 0 | 479 |
| P1 | 147 | 4 | 0 | 0 | 0 | 151 |
| P2 | 333 | 0 | 0 | 0 | 0 | 333 |
| **Total** | **957** | **6** | **0** | **0** | **0** | **963** |

## Skip disposition

| ID | Risk disposition | Required action |
| --- | --- | --- |
| P3-0578 | Incomplete payroll-provider activation bypass was not exercised because no incomplete provider lane existed. Financial control risk remains fixture-dependent. | Execute in staging with an authorized disposable incomplete provider connection before release sign-off. |
| P3-0890 | Browser last-admin lockout fixture was unavailable. Server-side last-admin protection passed in Phase 3D backend regression. | Accept backend mitigation for local certification; execute browser proof in staging with two controlled admins. |
| P3-0342 | Organization master library test is intentionally restricted to the local mock API configuration. | Run the mock-backed UI contract job in CI or replace it with an isolated supported workspace proof. |
| P3-0343 | Guided organization setup dependency-order proof requires the mock API configuration. | Run the mock-backed contract job in CI before final release certification. |
| P3-0344 | Single-record organization creation proof requires the mock API configuration. | Run the mock-backed contract job in CI before final release certification. |
| P3-0976 | No active account without workspace access existed in the local fixture. | Provision a disposable active/no-workspace account and execute in staging. |

No skip is treated as a pass. Release-owner acceptance must name an owner and expiry if any remains unexecuted at final sign-off.

## Defect reconciliation

Confirmed product defects fixed during Phase 3 and revalidated include:

- Payroll input lock eligibility now uses authoritative run-level blocked/warning/locked counts instead of a paginated visible subset.
- Bank-advice/finance handoff evidence retrieval no longer omits the selected run beyond the first 50 records.
- Attendance-policy submission no longer remains disabled after a successful create because of the redundant push/refresh race.
- Attendance assignment refresh scopes old/new affected assignments rather than recalculating the full tenant population.
- Manager leave detail authorization normalizes workflow UUIDs while retaining server-side scope enforcement.
- Payroll exception creation uses validated bulk creation without weakening locks, tenant scope, or audit controls.

Fixture and automation corrections, including deterministic IDs, paginated resolution, isolated workspace lifecycle, compact UI locators, and leave-balance period selection, remain distinct from product defects in the historical evidence.

## Integrated verification

- Browser: 22 passed assertions in focused Phase 3D batches, 1 existing conditional fixture skip, and 2 setup failures that failed closed to ESS and were cleaned up. The frozen register was not changed by these probes.
- Backend: 87 tests passed across payroll, attendance, leave, workspace cleanup, authentication, RBAC, subscription, payroll lock, finance handoff, and employee/document permissions.
- Database: migrations are fully applied and model state has no pending migration.
- Frontend: TypeScript and the optimized production build passed. The build retains one low-risk Autoprefixer compatibility warning.
- Data integrity: Northstar remains at 2,377 employees and 2,274 active employees; no disposable QA tenant or Phase 3D-owned record remains.

Detailed command and outcome evidence: `docs/qa/evidence/phase3-post-compaction/678-phase3d-integrated-certification.md`.

## Release gates

### Staging-only

1. Deploy the exact reviewed commit/artifact and apply migrations with rollback evidence.
2. Pass strict production preflight using staging secrets, secure cookies, TLS redirect/HSTS policy, live email, enabled notification processing, and strict payroll artifact storage verification.
3. Execute all six skipped cases with controlled fixtures or record signed, time-bounded risk acceptance.
4. Run critical browser smoke for login/session, payroll lock/calculate/review/output/handoff, leave/attendance approval, employee lifecycle, Tenant Admin, Platform Admin, and cross-tenant object/download isolation.
5. Validate queue workers, scheduled jobs, object storage signed URLs, provider callbacks, email delivery, audit retention, and observability alerts.
6. Verify backup restoration, migration rollback, and disposable fixture cleanup in the staging data plane.
7. Run realistic-volume performance checks for Northstar-scale employee/options/report paths.

### Production-only

1. Confirm production secrets, domains, TLS/HSTS, cookies, CORS/CSRF origins, database credentials, storage controls, and provider credentials through change control.
2. Take and verify a pre-deployment backup; approve rollback owner and decision window.
3. Apply migrations once, verify health/readiness and worker/queue health, then run read-only post-deploy smoke.
4. Validate monitoring, alert routing, payroll/audit log ingestion, email/provider delivery, and error budgets.
5. Require business-owner sign-off for payroll, HR operations, finance handoff, security, privacy, support, and data retention.
6. Keep destructive certification tests disabled in production; use approved read-only probes and designated synthetic accounts only.

## Phase 4 entry criteria

Phase 4 staging execution may start when the candidate artifact is immutable, staging matches production topology/configuration, migrations and rollback are rehearsed, authorized synthetic personas and all six missing fixture states are provisioned, external integrations are configured, observability is active, and backup/restore evidence is current.

Phase 4 exits only after all staging gates pass, every skip is executed or formally accepted, no unresolved P0/P1 or security/financial-integrity defect remains, fixture cleanup is verified, and release stakeholders sign the final evidence pack.

## Recommendation

**GO to Phase 4 staging certification with conditions. NO-GO for production release at this point.**

