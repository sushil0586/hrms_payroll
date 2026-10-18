# DD-7 Approvals and Delegation Domain Certification

Date: 2026-10-18  
Decision: **CONDITIONAL**  
Environment: isolated PostgreSQL 16, production-built Next.js, local Django API

## Frozen scope

DD-7 is the frozen **Approvals and delegation** domain. Its in-scope IDs are `DD-WF-001`, `DD-WF-002`, `DD-WF-003`, `DD-WF-004`, `DD-WF-005`, `DD-WF-006`, and `DD-WF-008`. `DD-WF-007` exists in the matrix but belongs to `DD-Policy`; its pending-request reassignment policy remains blocked and was not renumbered or counted in DD-7.

| Status | Count |
| --- | ---: |
| Verified | 4 |
| Partial | 1 |
| Blocked | 2 |
| Missing | 0 |
| Failed | 0 |
| Not Run | 0 |

## Scenario outcomes

| ID | Result | Executed evidence and disposition |
| --- | --- | --- |
| `DD-WF-001` | Verified | PostgreSQL row locks allowed one terminal result in concurrent approve/reject at the second workflow step. Same-action replay remained idempotent and conflicting replay was rejected. Existing DB-1 and DB-6.9 evidence was retained. |
| `DD-WF-002` | Verified | Existing DB-5 effective manager history and DB-6.9 browser/API/PostgreSQL evidence already prove current authority and preserved historical audit. No duplicate scenario was created or unnecessarily rerun. |
| `DD-WF-003` | Partial | PostgreSQL verified ordered two-level sequential approval and immutable action logs. A deterministic two-assignee `parallel` diagnostic showed that one approval closes the entire step and workflow. Parallel quorum/mixed-mode release semantics are therefore unsupported and were not represented as passing. |
| `DD-WF-004` | Verified | Production browser received an injected HTTP 503, retained the decision note and pending step, refreshed, retried, received HTTP 200, and confirmed the request no longer appeared in the pending queue. Duplicate click protection and DD-6A mutation idempotency remained active. |
| `DD-WF-005` | Blocked | `WorkflowAssignment` contains snapshot flags (`is_delegated`, `delegated_from_identifier`) but no validity window, active/revoked lifecycle, governed grant/revoke service, browser operation, or approved authority policy. |
| `DD-WF-006` | Blocked | Template timing metadata exists, but there is no fallback ownership model, escalation dispatcher, Celery task, duplicate-active-assignee guard, or approved SLA/escalation policy. No progress was fabricated. |
| `DD-WF-008` | Verified | Tenant Admin removed `leave.requests.approve` in the browser while the Manager's review dialog remained open. The stale browser decision and a separate authenticated backend request both returned HTTP 403; the note remained actionable and the request remained pending. PostgreSQL regression verified immediate permission re-resolution and the `tenant_role_updated` audit event with the removed key. |

## Architecture mapping

- Browser: `/tenant-admin/roles`, `/mss/approvals`, `/hr-admin/workflow-templates`, `/hr-admin/movements`.
- APIs: tenant role PATCH; manager leave pending/detail/approve/reject; manager attendance decision APIs.
- Services: `create_workflow_instance`, `resolve_workflow_action`, tenant role update and request-time tenant permission resolution.
- PostgreSQL: `WorkflowInstance`, `WorkflowStepInstance`, `WorkflowAssignment`, append-protected `WorkflowActionLog`, IAM role/permission/membership rows, SaaS commercial audit events, DB-1 row locks, and DB-4 historical deletion guards.
- Client safety: DD-6A idempotency keys remain scoped by tenant, actor, action, and payload; manager buttons guard duplicate pending submissions.
- Celery: no workflow escalation/delegation task is registered. This is evidence for `DD-WF-006` being Blocked, not a successful background-job result.

## Defects and remediation

No new application-code defect was changed in DD-7. Two test defects in the initial browser run were corrected: an ambiguous success live-region locator, and an unauthenticated direct-API probe that returned 401 instead of exercising the authenticated 403 boundary. The historical failing log is retained.

The diagnostic found a real capability gap: the UI/model allow `parallel`, delegation, and escalation metadata, while runtime support is incomplete. Implementing these features requires approved quorum, ownership, timing, fallback, reassignment, and audit policies. DD-7 did not invent those rules or alter current business behavior.

## Verification results

- Focused PostgreSQL workflow/RBAC regression: **5 passed in 67.05s**.
- New DD-7 PostgreSQL suite: **3 passed in 60.83s**.
- Production-built Playwright final: **2 passed in 36.4s**, one worker.
- TypeScript: passed.
- Focused ESLint: passed.
- Django checks: passed.
- Migration drift: none.
- Production frontend build: passed with the pre-existing `align-items: end` autoprefixer warning.
- Initial SQLite attempt: environment mismatch retained and not counted.
- Initial browser attempt: 0 counted passes; both automation-evidence failures retained. Intermediate rerun: `DD-WF-008` passed while `DD-WF-004` exposed a manager-detail endpoint scope assumption. Final full run: 2 passed.

## Commands

Environment secrets are omitted; all database commands targeted disposable PostgreSQL port `55458`.

```bash
docker run --name hrms-dd7-postgres --rm -d \
  -e POSTGRES_DB=hrms_dd7 -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=... \
  -p 55458:5432 --tmpfs /var/lib/postgresql/data:rw,size=2g postgres:16-alpine

DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55458 \
  .venv/bin/python -m pytest backend/tests/test_dd7_workflow_integrity.py -q

DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55458 \
  .venv/bin/python backend/manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55458 \
  .venv/bin/python backend/manage.py sync_permission_catalog

HRMS_API_BASE_URL=http://127.0.0.1:8019/api/v1 pnpm --dir web build
NEXT_DIST_DIR=.next/build HRMS_API_BASE_URL=http://127.0.0.1:8019/api/v1 \
  pnpm --dir web exec next start -H 127.0.0.1 -p 3119

PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3119 \
PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8019/api/v1 \
  pnpm --dir web exec playwright test \
  tests/e2e/dd7-approval-delegation-certification.spec.ts --workers=1 --reporter=line

DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55458 \
  .venv/bin/python -m pytest \
  backend/tests/test_db1_write_integrity.py::test_workflow_resolution_is_idempotent_and_conflicting_replay_is_rejected \
  backend/tests/test_db1_write_integrity.py::test_concurrent_approve_reject_only_one_workflow_decision_succeeds \
  backend/tests/test_dd7_workflow_integrity.py -q

pnpm --dir web typecheck
pnpm --dir web exec eslint tests/e2e/dd7-approval-delegation-certification.spec.ts
.venv/bin/python backend/manage.py check
.venv/bin/python backend/manage.py makemigrations --check --dry-run
```

## Evidence and cleanup

Evidence is under `docs/qa/evidence/dd7-2026-10-18/`. Logs `001`, `010`, and `011` preserve the environment mismatch and historical browser failures. Final counted evidence is in `004`, `013`, `014` through `020`, plus Playwright attachments.

Every Playwright workspace independently reported successful cleanup and the certification database reported zero sandbox tenants before the parallel diagnostic. The diagnostic then intentionally created an append-protected workflow action log; ordinary deletion was correctly rejected by the DB-4 guard. The entire disposable PostgreSQL container/database was removed after evidence capture, which is the approved cleanup path for protected synthetic history. No Northstar, staging, production, or customer records were accessed.

## Decision

DD-7 is **CONDITIONAL**: all supported critical concurrency, retry, historical authority, and immediate revocation assertions are verified. Full PASS requires approved and implemented parallel quorum, time-bounded delegation, SLA escalation, and the separately frozen `DD-WF-007` pending-request reassignment policy. Production readiness remains **NO-GO**, and DD-8 was not started.
