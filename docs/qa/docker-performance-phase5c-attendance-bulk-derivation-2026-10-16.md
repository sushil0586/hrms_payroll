# Docker Performance Phase 5C: Attendance Bulk Derivation

**Date:** 2026-10-16  
**Decision:** **CONDITIONAL**  
**Production readiness:** Not certified

## Scope and baseline

Phase 5B remains the frozen comparison baseline. Its 25-row HR Admin attendance response executed 108 database queries and measured 112 ms p50 / 119 ms p95 in-process. The unchanged capacity gate is HTTP 5xx below 0.1% and aggregate p95 below 1,500 ms at 50 VUs.

## Root cause

The list view serialized each row through the single-record derivation service. Every row independently performed:

1. attendance-policy assignment lookup and policy/default-shift loading;
2. employee shift-assignment lookup;
3. rotation shift lookup when applicable;
4. holiday-calendar selection and holiday lookup; and
5. approved/partially-approved overlapping-leave lookup.

The repeated calls originated in `build_hr_admin_attendance_record_payload`, `build_attendance_derivation_summary`, and `resolve_employee_work_day`. Authorization and list pagination were not the source of the fan-out.

## Remediation

`AttendanceDerivationContext` now builds one request-scoped snapshot for the returned page:

- active policy assignments with default shifts and policy holiday calendars;
- date-overlapping employee shift assignments;
- the tenant shift map required by rotation sequences;
- active, scoped holiday calendars and holidays for the page years; and
- approved/partially-approved leave requests overlapping the page range.

The context applies the same policy specificity, priority, shift-kind precedence, primary flag, effective window, holiday specificity, rotation, weekly-off, overnight-shift, and leave-status rules as the existing resolver. Single-record create/update paths retain the original database-backed resolver. No global/user cache was introduced.

## Measured verification

| Check | Before | After | Result |
|---|---:|---:|---|
| Derivation queries for 25 rows | 108 API queries (Phase 5B) | no more than 8 queries for the bulk derivation phase | PASS |
| Output equivalence | legacy resolver | complete summary equality for the same row | PASS |
| Attendance backend tests | n/a | 24/24 passed | PASS |
| Common/payroll neighboring tests | n/a | 46/46 passed | PASS |
| TypeScript | n/a | passed | PASS |
| Backend production image | n/a | built | PASS |
| Web production image | n/a | built | PASS |

The bounded-query assertion includes 25 rows and guards against query growth proportional to row count. Existing tests cover regular/default shifts, assignment precedence, weekly rotation, roster off-days, approved leave collisions, holidays, overnight shifts, missing schedules, payroll-impact evidence, and tenant-scoped models.

## Capacity status

A fresh production-built disposable stack was not retained after Phase 5B, as required by fixture cleanup. The Phase 5C 25-VU and repeated 50-VU runs have **not** been executed in this evidence set. Historical Phase 5B results are preserved but are not relabeled as Phase 5C results. Therefore:

- 25-VU Phase 5C result: **not run**;
- 50-VU Phase 5C run 1: **not run**;
- 50-VU Phase 5C confirmation: **not run**;
- 100 VUs: **not eligible**.

The verified code remediation passes correctness and bounded-query gates, but Phase 5C cannot receive a full PASS until the fixed production-like stack is reprovisioned and the identical capacity workload is repeated. If repeated 50-VU p95 remains above 1,500 ms, the next action is a staging capacity experiment rather than further speculative local tuning.

## Files changed

- `backend/apps/attendance/services.py`
- `backend/apps/common/api_views.py`
- `backend/apps/attendance/tests.py`
- `docs/qa/docker-performance-phase5c-attendance-bulk-derivation-2026-10-16.md`
- `docs/qa/evidence/docker-performance-phase5c/`

## Commands executed

```bash
backend/.venv/bin/python backend/manage.py test \
  apps.attendance.tests --verbosity 1

backend/.venv/bin/python backend/manage.py test \
  apps.common.tests.HrAdminOptionMetadataTests apps.payroll.tests --verbosity 1

pnpm --dir web exec tsc --noEmit

docker build -f backend/Dockerfile -t hrms-phase5c-backend-check .
docker build -f web/Dockerfile -t hrms-phase5c-web-check .
```

## Evidence

- `docs/qa/evidence/docker-performance-phase5c/001-attendance-backend-regression.log`
- `docs/qa/evidence/docker-performance-phase5c/002-neighboring-backend-regression.log`
- `docs/qa/evidence/docker-performance-phase5c/003-typecheck.log`
- `docs/qa/evidence/docker-performance-phase5c/004-backend-production-build.log`
- `docs/qa/evidence/docker-performance-phase5c/005-web-production-build.log`

## Remaining gates

1. Reprovision an isolated 2,500-employee Enterprise workspace in the fixed four-worker Docker stack.
2. Capture API-level post-change p50/p95/p99, full request query count, SQL time, serialization time, payload, and memory.
3. Run 25 VUs and two independent 50-VU samples with the unchanged Phase 5B k6 script.
4. Run ESS/MSS attendance browser regressions and explicit API tenant-isolation/RBAC checks against that stack.
5. Verify payroll calculation/persistence and disposable fixture cleanup.

Phase 5C is **CONDITIONAL**: the source bottleneck is safely removed and correctness checks pass, while capacity and deployed-browser evidence remain open. Production readiness is not claimed.
