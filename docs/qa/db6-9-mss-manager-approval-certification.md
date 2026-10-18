# DB-6.9 MSS Manager Approval Certification

Date: 2026-10-17  
Environment: isolated PostgreSQL 16 (`hrms_db69`), Django `127.0.0.1:8019`, production-built Next.js `127.0.0.1:3119`  
Decision: **CONDITIONAL**

## Frozen Scope Result

| Status | Count |
|---|---:|
| Passed | 6 |
| Failed | 0 |
| Blocked | 0 |
| Skipped | 0 |
| Not Run | 0 |

The frozen DB-6.9 scope passed. Certification remains conditional because the product has no approved rule for reassigning already-pending approvals when a reporting manager changes, and no approved manager delegation/escalation policy. Existing workflow assignments remain authoritative and were not silently rerouted.

## Scenario Evidence

| ID | Result | Browser / API / PostgreSQL result |
|---|---|---|
| DB6-09-001 | Passed | Production browser completed ESS submission and MSS approval for Managers A and B. PostgreSQL showed terminal approval and reservation, reservation-release, and consumption entries with exact 1.00-unit reconciliation. |
| DB6-09-002 | Passed | Browser approved and rejected attendance regularizations. The intended record alone changed after approval; rejection preserved the source record. |
| DB6-09-003 | Passed | Old Manager A and a manager from a second tenant received 404 for current Manager B's regularization detail and mutation. Manager B received 200 and completed the decision. Employee and non-manager browser probes failed closed. |
| DB6-09-004 | Passed | PostgreSQL approve-versus-reject race produced one success and one conflict. Same-action replay remained idempotent and conflicting replay was rejected. |
| DB6-09-005 | Passed | Assignment history resolved Manager A before 2026-10-17 and Manager B on 2026-10-17. The current employee projection matched B, and fresh browser approvals routed to B. |
| DB6-09-006 | Passed | Fault-injected HTTP 503 preserved the decision note and restored the button. Retry returned 200, closed the dialog, cleared the queue, and persisted one terminal approve action. |

## Findings And Repairs

1. **Disposable queue fixture integrity:** the shared fixture inserted a pending leave row directly, without reservation ledger or workflow state. Approval therefore returned HTTP 500 when governed code attempted to release zero reserved units. The fixture now calls `submit_leave_request`, preserving the real workflow, ledger, notification, and idempotency paths.
2. **Two-manager fixture:** disposable workspaces now contain `QA-MGR-001` and `QA-MGR-002` sharing the supported manager role. The target employee remains assigned to Manager A until an approved effective-dated movement changes the projection.
3. **Manager notification prerequisite:** the fixture now includes a deterministic manager-scoped in-app notification so notification UI and read-state behavior are testable without shared data.
4. **Notification locator drift:** the compact empty state introduced a second accessible `Clear filters` link. The test now scopes the filter-control assertion without weakening navigation checks.
5. **Shared query navigation defect:** same-path query reset could remain on the old URL with a permanent `Loading Clear filters` status. The shared wrapper now lets Next own `router.push` and clears pending state from the observed route key; the production browser rerun passed.
6. **Retry regression:** a focused browser case now verifies failed decision state preservation, successful real-backend retry, dialog completion, queue removal, and duplicate-click prevention.

No leave arithmetic, attendance derivation, payroll rule, RBAC rule, tenant boundary, or workflow decision rule changed.

## Manager History And Scope

- Employee: `dbebedc3-c554-4f94-a73b-695f422e93c8`
- Manager A: `72a46adc-c2b5-4da7-a858-c9536c5fed89`
- Manager B: `c9f67039-99a2-458f-8e30-88b6688b0d16`
- Effective movement: `44b5e93e-b0c1-4511-bee5-73810df5c456`
- Previous-date resolver: Manager A
- Effective-date/current resolver and projection: Manager B
- Current-scope API: A `404`, foreign tenant `404`, B `200`

Pending workflow ownership intentionally remains attached to its persisted workflow assignment. A business decision is required before any migration, delegation, or reassignment behavior is introduced for work already pending on the movement date.

## Verification Summary

- Production-built browser, live leave/attendance approve and reject: **4 passed**.
- Manager B current-scope live approvals: **2 passed**.
- MSS dashboard, queues, compact dialog, mutation feedback, RBAC: **5 passed**, one historical automation failure retained and repaired.
- Manager notification query reset after shared fix: **1 passed**.
- Decision failure/retry: **1 passed** after fixture remediation; original 500 retained.
- Backend manager/RBAC/notification selection: **5 passed**.
- PostgreSQL workflow race/replay: **2 passed**.
- PostgreSQL effective assignment/history: **2 passed**.
- TypeScript: passed.
- Focused ESLint: passed.
- Django checks: passed.
- Migration drift: none.
- Production frontend build: passed with the pre-existing `globals.css` autoprefixer warning.
- Row-level tenant cleanup was rejected by DB-3/DB-4 protected ledger relationships, as designed. Both tenants were confined to `hrms_db69`; the backend/frontend were stopped and the complete PostgreSQL container and volume were removed. Ports `55449`, `8019`, and `3119` and the container name verified absent.

## Modified Files

- `backend/apps/common/management/commands/manage_playwright_workspace.py`
- `web/src/components/shell/workspace-navigation-feedback.tsx`
- `web/tests/e2e/mss-control-center-certification.spec.ts`
- `docs/qa/db6-master-workflow-certification-matrix.csv`
- `docs/qa/db6-workflow-execution-register.csv`
- `docs/qa/db6-9-mss-manager-approval-certification.md`

## Evidence

Evidence root: `docs/qa/evidence/db6-2026-10-17/db6-9/`

Key evidence:

- `005-browser-baseline-live-workflows.log`
- `008-browser-mss-control-center.log`
- `010-manager-history-fixture.json`
- `012-browser-manager-b-current-approvals.log`
- `014-postgresql-workflow-reconciliation.json`
- `015-backend-workflow-rbac-history.log`
- `017-browser-navigation-fix-regression.log`
- `018-postgresql-workflow-concurrency.log`
- `019-postgresql-manager-history.log`
- `020`, `021`, `022`, and `024`: retained retry/fixture failures
- `028-manager-scope-api.log`
- `030-browser-decision-retry-final-green.log`
- `035-retry-database-reconciliation.json`
- `036` through `040`: protected cleanup result and full isolated environment teardown

## Commands

```bash
python manage.py manage_playwright_workspace --seed-ref db69 --password '***'
pnpm exec playwright test tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts --project=chromium --workers=1 --grep '<DB-6.9 live workflows>'
pnpm exec playwright test tests/e2e/mss-control-center-certification.spec.ts --project=chromium --workers=1 --grep '<dashboard|queues|compact|notifications|RBAC|retry>'
pytest -q tests/test_phase0_api_smoke.py -k '<manager approval/RBAC/notification selection>'
pytest -q tests/test_db1_write_integrity.py -k 'workflow_resolution_is_idempotent or concurrent_approve_reject'
pytest -q tests/test_db5_effective_employment_integrity.py -k 'effective_movement_preserves_historical_department or overlapping_assignments_and_cross_tenant_scope'
pnpm typecheck
pnpm exec eslint src/components/shell/workspace-navigation-feedback.tsx tests/e2e/mss-control-center-certification.spec.ts
python manage.py check
python manage.py makemigrations --check --dry-run
pnpm build
```

## Decision

Frozen DB-6.9 scenarios: **PASS (6/6)**.  
DB-6.9 workflow certification: **CONDITIONAL** pending approved rules for already-pending approval reassignment and manager delegation/escalation. The global frozen register is now 59 Passed, 5 Blocked, and 28 Not Run across 92 scenarios. Production readiness is not claimed. Stop before DB-6.10.
