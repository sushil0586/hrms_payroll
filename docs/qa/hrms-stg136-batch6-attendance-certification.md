# HRMS STG-136 Batch 6 Attendance Certification

Date: 2026-10-27\
Runner revision: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus reviewed uncommitted campaign changes\
Environment: isolated PostgreSQL 16 (`hrms_ess2`), Redis 7, Django and production-built Next.js 15.5.28\
Decision: **PASS locally; shared staging remains Not Run**

## Frozen Results

`STG-E2E-0601` through `STG-E2E-0612`: **12 Passed, 0 Failed, 0 Blocked, 0 Not Run locally**.

The shared-staging register is unchanged at **0 Passed / 136 Not Run**. Local evidence is not staging evidence.

## Evidence

- Production build: passed. The build emitted the existing CSS `flex-end` compatibility warning only.
- Browser: eight ESS attendance tests passed across the complete run plus the focused three-test rerun after correcting authenticated proxy verification. Two connected configuration/close tests passed across final focused runs.
- PostgreSQL/API: `61 passed`, `345 deselected`, covering attendance derivation, roster rollout atomicity and replay, ESS contracts, close/reopen concurrency, tenant/RBAC denial, payroll snapshot linkage and closed-period protection.
- UI-created shifts: `B6-REG` (09:00-17:30, Sunday weekly off) and `B6-NIGHT` (22:00-06:00, overnight) were persisted in an owned disposable tenant.
- Calendar/policy: the tenant-owned synthetic holiday calendar and attendance-policy workbench were rendered through the authenticated HR Admin browser.
- Regularization: ESS submission, network failure/retry, canonical duplicate prevention, manager approval and rejection, original-value retention, UTC time persistence and cross-scope denial passed.
- Monthly close: browser reconciliation followed `reconciled -> submit -> approve -> close`; PostgreSQL independently confirmed a 64-character immutable snapshot hash and append-only lifecycle events. Duplicate close was unavailable after closure.
- Payable/LOP: nonzero reconciliation, blockers, closed-version immutability and payroll-input reference behavior passed in `test_db6_attendance_close_integrity.py`; the browser lifecycle fixture was not misrepresented as the arithmetic oracle.
- Roster: transactional rollback on audit failure and idempotent retry passed in `test_dd4_attendance_integrity.py`; the previously passed compact roster browser regression remains neighboring UI evidence for `0603`.

## Historical Reruns

The first production-browser attempt correctly failed closed because `HRMS_ENABLE_DEMO_DATA=true` is forbidden in production runtime. A later attempt exposed localhost/127.0.0.1 cookie-context drift in a test-only `page.request` assertion. The final test uses same-origin browser `fetch`, while retaining a separate unauthenticated context for the 401 assertion. No application business logic changed.

## Cleanup

Each Playwright workspace completed exact seed-reference cleanup. Closed synthetic snapshots were verified before teardown. Django and Next.js processes, PostgreSQL and Redis containers, and ports were removed after verification. No staging, production, Northstar or customer data was accessed.

## Files

- `web/tests/e2e/ess2-attendance-certification.spec.ts`
- `web/tests/e2e/stg136-batch6-attendance-close.spec.ts`
- `docs/qa/evidence/stg136-batch6-2026-10-27/`

Batch 7 (`STG-E2E-0701`-`0710`) is next, but requires the approved recipient allowlist and protected-storage limits recorded in the frozen dependencies. It was not started automatically.
