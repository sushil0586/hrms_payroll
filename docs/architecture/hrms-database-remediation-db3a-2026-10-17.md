# HRMS/Payroll Database Remediation DB-3A

Date: 2026-10-17  
Decision: **CONDITIONAL PASS**

## Executive result

DB-3A closes the operational activation gaps around the DB-3 governed leave-year engine. HR Admin and Tenant Admin now have permission-scoped APIs and compact workspaces for explicit leave-policy periods, entity precedence, dry-run rollover, typed close confirmation, durable close status, scheduling, and read-only historical classification.

No historical balance or ledger row was rewritten or automatically classified. Lifecycle behavior without an approved business rule remains blocked and visible rather than inferred.

## Risk disposition

| Risk | DB-3A disposition | Evidence |
| --- | --- | --- |
| DBR-003 immutable leave ledger | Partial, operationally activated | New governed periods use append-only movements and the classification report is read-only. The 1,186 historical balances and 240 transactions remain unclassified pending approval. |
| DBR-004 leave-year close | Substantially closed for approved governed periods | APIs/UI, preview, typed confirmation, Celery/beat dispatch, bounded retry, stale-worker recovery, durable status, idempotency, and browser recovery are implemented and tested. Pending lifecycle decisions prevent unconditional closure. |
| DBR-009 tenant integrity | Reduced for DB-3A surfaces | Every API filters by authenticated tenant; cross-tenant period IDs return 404; DB-3 PostgreSQL ownership triggers remain active. Wider schema inventory remains open. |
| DBR-011 cross-year requests | Remains resolved for governed periods | Existing DB-3 allocation behavior passed neighboring regression. |
| DBR-012 carry-forward provenance | Remains resolved for governed periods | Preview and committed item totals reconcile; retries produce one carry-forward credit. |
| DBR-013 lifecycle proration | Partial | Join behavior remains unchanged. Rehire, anniversary, and exit semantics require approved rules. |
| DBR-014 assignment temporal integrity | Open | DB-3A does not retrofit effective dates across all historical assignment records. |
| DBR-018 cross-entity transfer orchestration | Open | Entity precedence is implemented; preserve/convert/encash/forfeit remains an explicit decision gate. |

Database production readiness remains **NO-GO** while P0 historical activation and wider unresolved risks remain.

## Operational architecture

### API contracts

Both `/api/v1/hr-admin/leave-year/` and `/api/v1/tenant-admin/leave-year/` expose tenant-scoped endpoints:

- `periods/`: list and create explicit policy periods;
- `periods/{id}/transition/`: audited close/reopen transitions;
- `preview/`: exact no-write carry-forward, forfeiture, and expiry projection;
- `close-runs/`: list and accept durable close commands;
- `close-runs/{id}/`: refresh-safe job status;
- `historical-classification/`: read-only candidate and ambiguity report.

Permissions are separate and explicit:

- `leave.periods.view`
- `leave.periods.manage`
- `leave.periods.close`
- `leave.periods.reopen`

No permission is bypassed for Tenant Admin. Existing roles require controlled permission synchronization before rollout.

### UI behavior

New compact workspaces:

- `/hr-admin/leave-year`
- `/tenant-admin/leave-year`

The workbench shows policy, legal-entity scope, precedence, effective dates, current state, durable close history, and historical classification counts. Preview is visibly read-only. Commit requires typing `CLOSE <source-period-code>`. Queued/running jobs poll durable state and remain visible after reload. Local pending states prevent duplicate client submissions.

### Scheduling and recovery

`leave.dispatch_pending_year_close_runs` runs through the existing Celery beat configuration every 15 seconds.

- Future schedules are not dispatched early.
- A row lock and `dispatched_at` prevent duplicate normal dispatch.
- `leave.execute_year_close` uses late acknowledgement, worker-lost rejection, bounded retries, and hard/soft task limits.
- Running jobs older than `LEAVE_YEAR_CLOSE_STALE_SECONDS` are returned to queued state.
- Re-execution is safe because the DB-3 engine and per-employee ledger keys are idempotent.

## Preview and commit evidence

Synthetic source balance: `18.00` units.

```text
Preview available:   18.00
Preview carried:     10.00
Preview forfeited:    8.00
Preview expiring:     4.00
Committed carried:   10.00
Committed forfeited:  8.00
```

The preview created no ledger transaction. The committed run matched preview totals. Executing the same Celery task twice left exactly one carry-forward credit.

## Historical classification evidence

A copy of the 864 MB local historical QA database was migrated through `leave_management.0008`.

```text
Balances before/after:                 1186 / 1186
Transactions before/after:              240 / 240
Automatically classified balances:        0
Automatically classified transactions:    0
Periods synthesized:                       0
Close runs synthesized:                    0
Read-only unclassified balances:        1186
Read-only unclassified transactions:     240
Unambiguous candidates without periods:    0
```

The temporary database copy was removed. This report deliberately does not treat an integer `period_year` as proof of a policy period or legal-entity scope.

## Pending policy decisions

Implementation stops at these boundaries because no approved rule exists:

1. Cross-entity transfer: preserve units, convert to the target policy, encash, or forfeit.
2. Rehire/anniversary/exit: period ownership and proration semantics.
3. Cancellation after entitlement expiry: re-expire, restore, or append an authorized correction.

Current safe behavior for item 3 is to reject automatic restoration and require a compensating, auditable movement. Historical ledger rows are never rewritten.

## Verification results

```text
Focused DB-3 + DB-3A on PostgreSQL 16: 17 passed
Integrated leave + DB-1/2/3/3A + focused APIs: 71 passed
Focused Playwright desktop/mobile/admin surfaces: 3 passed
Django system check: passed
Migration drift: none
Migration 0008 rollback/reapply: passed
TypeScript: passed
ESLint: passed
Next.js production build: passed (pre-existing CSS autoprefixer warning only)
```

Browser evidence verified:

- actual 18/10/8 preview totals;
- explicit confirmation before acceptance;
- duplicate click produces one durable close command;
- queued status survives reload;
- compact 390x844 layout has no document-level horizontal overflow;
- Tenant Admin sees the same tenant-scoped periods.

The browser fixture used a disposable PostgreSQL database. The application processes and database container were stopped and removed after verification.

## Files added or changed by DB-3A

- `backend/apps/common/leave_year_api.py`
- `backend/apps/common/api_urls.py`
- `backend/apps/iam/permission_catalog.py`
- `backend/apps/leave_management/models.py`
- `backend/apps/leave_management/year_end_services.py`
- `backend/apps/leave_management/tasks.py`
- `backend/apps/leave_management/migrations/0008_leave_year_close_scheduling.py`
- `backend/config/settings/base.py`
- `backend/tests/test_db3a_leave_year_operations.py`
- `web/src/lib/api.ts`
- `web/src/lib/types.ts`
- `web/src/app/api/hr-admin/leave-year/[...path]/route.ts`
- `web/src/app/api/tenant-admin/leave-year/[...path]/route.ts`
- `web/src/app/hr-admin/leave-year/page.tsx`
- `web/src/app/hr-admin/leave-year/leave-year-workbench.tsx`
- `web/src/app/tenant-admin/leave-year/page.tsx`
- `web/src/app/hr-admin/policies/page.tsx`
- `web/tests/e2e/db3a-leave-year-operations.spec.ts`

DB-1, DB-2, DB-3, and loading-state files already present in the dirty worktree were preserved.

## Principal commands

```bash
DJANGO_SETTINGS_MODULE=config.settings.base DJANGO_DB_ENGINE=django.db.backends.postgresql POSTGRES_DB=hrms_db3a POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55434 ./.venv/bin/pytest -q tests/test_db3_leave_year_integrity.py tests/test_db3a_leave_year_operations.py

DJANGO_SETTINGS_MODULE=config.settings.base DJANGO_DB_ENGINE=django.db.backends.postgresql POSTGRES_DB=hrms_db3a POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55434 ./.venv/bin/pytest -q apps/leave_management/tests.py tests/test_db1_write_integrity.py tests/test_db2_fiscal_integrity.py tests/test_db3_leave_year_integrity.py tests/test_db3a_leave_year_operations.py tests/test_phase0_api_smoke.py::test_employee_can_submit_leave_request tests/test_phase0_api_smoke.py::test_employee_can_withdraw_pending_leave_request tests/test_phase0_api_smoke.py::test_employee_can_cancel_approved_leave_directly_when_policy_allows_it tests/test_phase0_api_smoke.py::test_manager_can_approve_pending_leave_and_regularization

pnpm --dir web typecheck
pnpm --dir web lint
pnpm --dir web build

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3011 PLAYWRIGHT_SKIP_WEB_SERVER=1 DB3A_ACCESS_TOKEN=<redacted> pnpm --dir web exec playwright test tests/e2e/db3a-leave-year-operations.spec.ts --workers=1 --reporter=line
```

## Decision

**DB-3A is CONDITIONALLY PASSED.** The governed operational path is implemented and verified with PostgreSQL, API, Celery, browser, migration, and historical no-write evidence. DBR-004 is operationally closed for explicitly configured periods whose lifecycle policy is approved. DBR-003 remains partial until historical records are classified and authorized. DBR-013, DBR-014, and DBR-018 retain the stated decision gates.

No production readiness claim is made.
