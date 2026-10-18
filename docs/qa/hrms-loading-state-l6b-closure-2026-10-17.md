# HRMS/Payroll Phase L6B Loading-State Gap Closure

Date: 2026-10-17  
Decision: **CONDITIONAL**

## Reconciled status

The 46-family tracker was reviewed entry by entry. No family was promoted to Verified without all applicable executed acceptance evidence.

| Status | Count | IDs |
|---|---:|---|
| Verified | 9 | LS-001, LS-002, LS-003, LS-005, LS-024, LS-033, LS-034, LS-036, LS-042 |
| Covered | 1 | LS-043 |
| Partial | 23 | LS-006, LS-011, LS-013, LS-014, LS-015, LS-017, LS-018, LS-019, LS-020, LS-021, LS-023, LS-025, LS-026, LS-029, LS-031, LS-035, LS-038, LS-039, LS-040, LS-041, LS-044, LS-045, LS-046 |
| Open | 13 | LS-004, LS-007, LS-008, LS-009, LS-010, LS-012, LS-016, LS-022, LS-027, LS-028, LS-030, LS-032, LS-037 |

L6B moved LS-023 and LS-026 from Open to Partial. The total unresolved scope remains 36 families because neither has the complete required browser matrix yet.

## Classification of the remaining scope

| Shared root cause | IDs | Classification and remaining evidence |
|---|---|---|
| Server-backed query/modal opening | LS-004, LS-007, LS-008, LS-009, LS-010, LS-016, LS-018, LS-028, LS-030, LS-032 | Missing localized remote-open skeleton or complete delay/failure/latest-selection evidence. Pure local modal opens were explicitly treated as synchronous and do not need loaders. |
| Bulk/import/dependent lookup | LS-006, LS-012 | Commit recovery is implemented; preview lookup cancellation/latest-request handling and guided-setup partial recovery remain implementation gaps. |
| Mutation reconciliation and persistence | LS-011, LS-013, LS-014, LS-015, LS-019, LS-021, LS-023, LS-025, LS-026, LS-029, LS-031, LS-039, LS-040 | Priority shared mutations are improved; operation-specific success persistence, opposite actions, and remaining lower-risk forms need browser evidence. |
| Server dashboard/list partial failure | LS-020, LS-022, LS-027, LS-041 | Initial loading exists. Panel-level partial failure, table-local refresh, or broad delayed/error route evidence remains. |
| Authentication/access transitions | LS-035, LS-037 | Navigation failure injection and a distinct server-side access-check state remain unverified. Authorization behavior itself was not weakened. |
| Durable payroll operations | LS-038 | Durable job behavior is already strongly covered; tenant-keyed browser restoration and the complete four-operation UI matrix remain. |
| Cross-cutting errors/accessibility/timeouts | LS-044, LS-045, LS-046 | Shared patterns cover priority workflows, but the full native-fetch taxonomy, modal focus matrix, and operation-specific timeout inventory remain incomplete. |
| Reference implementation | LS-043 | Correctly functioning cancellable import-history list; left Covered rather than modified merely to increase the count. |

## Changes completed

### Reconciled post-mutation refresh

Added `useRefreshAfterMutation`, which binds refresh feedback to React's actual router transition rather than an arbitrary 900 ms timer. It is now used by:

- ESS leave withdrawal/cancellation;
- MSS leave and attendance decisions;
- notification read/unread, retry, and inline review.

These controls use `AsyncActionButton`, retain stable dimensions, announce the active API or refresh stage, and remain duplicate-guarded while reconciliation is pending.

### Tenant Admin transport recovery

Added a shared typed JSON mutation boundary. Tenant support-access and change-request create/decision operations now convert connection failures into actionable errors instead of leaving a rejected promise and locked control. Create actions use accessible operation-specific pending labels and synchronous duplicate guards. Existing RBAC and API contracts are unchanged.

## Browser evidence

Final isolated Tenant Admin test:

- support request delayed 2,000 ms, then aborted;
- change request delayed 750 ms, then aborted;
- support pending acknowledgment: **154 ms**;
- one POST per operation after forced duplicate clicks;
- support agent, reason, and change title retained;
- controls restored after failure;
- reduced-motion spinner computed `animation-name: none`;
- no horizontal overflow at 390 x 844;
- disposable workspace cleanup verified.

Neighboring four-portal mutation regression passed:

| Workflow | Pending acknowledgment |
|---|---:|
| HR Admin employee create | 90 ms |
| ESS leave submit | 60 ms |
| MSS approval | 97 ms |
| Tenant Admin membership invite | 62 ms |

The first combined run is retained as contaminated evidence: it reused a stale local frontend while an unrelated day-old Playwright process and several dev servers were active. It timed out before mutation execution. Clean isolated ports subsequently passed and are the authoritative results.

## Verification results

| Check | Result |
|---|---|
| L6B Tenant support/change delayed failure and duplicate protection | 1 passed |
| Neighboring HR Admin/ESS/MSS/Tenant Admin mutation regression | 1 passed |
| TypeScript | Passed |
| Focused ESLint | Passed |
| Production Next.js build | Passed; existing autoprefixer warning retained |
| Focused backend payroll/RBAC/report authorization | 2 passed |
| Django system check | Passed |
| Fixture cleanup | Passed through verified disposable-workspace cleanup hooks |

No backend or payroll business logic changed. The frozen 963-case certification evidence was preserved; a full rerun was intentionally not performed.

## Commands

```text
PLAYWRIGHT_PORT=3173 NEXT_DIST_DIR=.next/playwright-l6b-final \
HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 \
pnpm --dir web exec playwright test \
  tests/e2e/loading-state-l6b-shared-mutations.spec.ts \
  --workers=1 --reporter=line --trace=retain-on-failure

PLAYWRIGHT_PORT=3171 NEXT_DIST_DIR=.next/playwright-l6b-neighbor \
HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 \
pnpm --dir web exec playwright test tests/e2e/mutation-loading-feedback.spec.ts \
  --grep 'HR Admin, ESS, MSS, and Tenant Admin' \
  --workers=1 --reporter=line --trace=retain-on-failure

pnpm --dir web typecheck
pnpm --dir web exec eslint <L6B focused files>
pnpm --dir web build

./.venv/bin/pytest -q \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_async_calculation_is_durable_idempotent_and_permission_scoped \
  backend/tests/test_phase0_api_smoke.py::test_report_exports_require_category_export_permissions

./.venv/bin/python backend/manage.py check
```

## Evidence

Evidence is stored under `docs/qa/evidence/loading-state-l6b/`.

- `001-shared-mutations.log` and `001-timeout-artifacts/`: retained contaminated run.
- `002-tenant-support-isolated.log`: first clean support pass.
- `003-neighboring-mutations.log`: four-portal neighboring pass.
- `004-typecheck.log`, `005-eslint.log`: static checks.
- `006-tenant-support-mobile-reduced-motion.log`: mobile and reduced-motion pass.
- `007-production-build.log`: production build.
- `008-backend-focused.log`, `009-django-check.log`: backend checks.
- `010-tenant-mutations-final.log`: authoritative support/change pass.

## Decision and blockers

Phase L6B is **CONDITIONAL**. It resolves two shared high-risk patterns and adds executed evidence without changing financial, payroll, RBAC, or tenant-isolation behavior. However, 36 families remain Partial/Open, primarily because route-specific remote dialogs, dependent lookup races, persistence matrices, and the complete accessibility/error/timeout inventory have not all been independently executed.

Application-wide loading-state certification and production readiness are not claimed.
