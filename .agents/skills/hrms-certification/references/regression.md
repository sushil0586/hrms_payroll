# Regression selection

Select by affected contract and dependency, not filename counts. Inspect test fixtures/configs before running; confirm real API versus demo/mock behavior, destination ports, settings, database vendor, namespace, workers, and artifact paths. Collection can execute hooks; it is not automatically read-only.

| Change/scope | Existing starting points; inspect assertions before selection |
| --- | --- |
| Shift/roster setup | `web/tests/attendance-setup-actions/shift-roster-lifecycle.spec.ts`, `web/playwright.attendance-setup-actions.config.ts` |
| Assignments | `web/tests/employee-shift-actions/employee-shift-lifecycle.spec.ts`, `web/playwright.employee-shift-actions.config.ts` |
| Visual core | `web/tests/shift-roster-visual/core-screens.spec.ts`, `web/playwright.shift-roster-visual.config.ts` |
| Attendance integrity | `backend/apps/attendance/tests.py`, `backend/tests/test_dd4_attendance_integrity.py`, `backend/tests/test_db6_attendance_close_integrity.py` |
| Attendance UI | `web/tests/attendance-family`, `web/playwright.attendance-family.config.ts` |
| ESS and role boundaries | `backend/tests/test_ess2_attendance_contract.py`, relevant existing ESS/MSS and RBAC browser contracts |
| Leave/payroll effects | Existing leave/attendance collision and payroll-input tests selected by actual service/model dependencies |

The current shift/roster visual suite covers three core lists, includes roster scope, omits 320px, and uses fixed evidence output paths. It is a starting point, not the complete Shift pilot. Prepare authorized campaign-specific output/configuration before execution without overwriting historical results. Filter combined shift/roster action suites to authorized shift tests; review whether shared setup still mutates roster fixtures.

For each selected test, record scenario IDs, relevant assertions, environment requirements, side effects, and why included. For changed shared UI include affected HR Admin/ESS/MSS consumers. For authorized source changes use appropriate lint/typecheck/build and Django checks in addition to domain tests; these commands may write caches/build outputs and require suitable stage authorization. No such application checks are needed to claim this documentation-only framework passed application QA.

Retain command/config/browser versions, exit codes, test-level failed/skipped/flaky counts, logs, JSON, traces, screenshots, and database reconciliation. Rerun defects plus affected regression after fixes; keep original failures. Distinguish local certification from deployed candidate validation and independent review.
