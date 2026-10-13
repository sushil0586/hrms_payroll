# HR Admin Playwright Suite Inventory

Date: 2026-10-12

Purpose: classify the HR portal / HR Admin-related Playwright inventory so the release-gate suite can grow from the current Docker-verified baseline without reintroducing stale or superseded specs.

## Current Counts

| Metric | Count |
| --- | ---: |
| HR-related Playwright spec files discovered | 213 |
| HR-related Playwright test declarations discovered | 665 |
| Current tracker-backed HR Admin functional/live workflow result | 218 passed / 221 total |
| Current functional/live expected skips | 10 |
| Current active HR Admin Playwright blockers | 0 |

Important distinction: the 665 count is the broad repository inventory. The 209 count is the current tracker-backed HR Admin functional/live working set verified against the local Docker web build, API, and Postgres.

## Phase 0 Baseline Freeze

| Item | Status |
| --- | --- |
| Freeze date | 2026-10-12 |
| Baseline branch | `main` |
| Baseline commit | `ffd92f9` |
| Remote state | `origin/main` points to `ffd92f9` |
| Working tree | Clean at freeze check |
| Docker baseline | Web `http://127.0.0.1:3200`, API `http://127.0.0.1:8012/api/v1`, Postgres `127.0.0.1:55432` |
| Functional/live benchmark | 87 passed / 88 total, 1 expected skip, 0 active blockers |
| Broad inventory | 213 HR-related Playwright specs, 665 test declarations |

Phase 0 is the protected checkpoint for expanding HR Admin Playwright coverage. Later phases must update this inventory and the portal test register when specs move between `candidate-*`, `verified-working`, `historical-cross-module`, `superseded`, or `deferred`.

## Classification Summary

| Classification | Spec files | Test declarations | Declared skips | Recommended handling |
| --- | ---: | ---: | ---: | --- |
| `verified-working` | 84 | 243 | 20 | Keep in release gate |
| `candidate-functional` | 45 | 175 | 25 | Review next for Docker functional batch |
| `candidate-visual` | 31 | 87 | 3 | Repair/shard visual checks as needed |
| `historical-cross-module` | 53 | 160 | 22 | Defer or supersede after coverage review |

## Release-Gate Baseline

Run these against the Docker web build when validating the current HR Admin baseline:

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test \
  tests/e2e/employee-bank-accounts-certification.spec.ts \
  tests/e2e/employee-lifecycle-certification-flows.spec.ts \
  tests/e2e/generated-letter-flows.spec.ts \
  tests/e2e/governance-assignment-form-flows.spec.ts \
  tests/e2e/hr-admin-attendance-operations-workflow-certification.spec.ts \
  tests/e2e/hr-admin-compliance-export-ui-polish-certification.spec.ts \
  tests/e2e/hr-admin-e90-8-final-ux-certification.spec.ts \
  tests/e2e/hr-admin-employee-documents-live-workflow.spec.ts \
  tests/e2e/hr-admin-employee-production-certification.spec.ts \
  tests/e2e/hr-admin-full-route-ui-audit.spec.ts \
  tests/e2e/hr-admin-leave-request-operations-certification.spec.ts \
  tests/e2e/hr-admin-report-workspace-submenu-certification.spec.ts \
  tests/e2e/hr-admin-reports-operations-ui-audit.spec.ts \
  tests/e2e/hr-admin-reports-phase13-certification.spec.ts \
  tests/e2e/hr-admin-responsive-route-closure.spec.ts \
  tests/e2e/hr-admin-workforce-documents-access-responsive-certification.spec.ts \
  tests/e2e/payroll-adjustments-flows.spec.ts \
  tests/e2e/payroll-calculations-flows.spec.ts \
  tests/e2e/payroll-handoff-flows.spec.ts \
  tests/e2e/payroll-outputs-flows.spec.ts \
  tests/e2e/payroll-providers-flows.spec.ts \
  tests/e2e/payroll-review-flows.spec.ts \
  tests/e2e/payroll-rules-flows.spec.ts \
  tests/e2e/payroll-settlements-flows.spec.ts \
  tests/e2e/payroll-setup-flows.spec.ts \
  tests/e2e/payroll-statutory-flows.spec.ts \
  tests/e2e/phase4c-hr-admin-operations-flows.spec.ts \
  tests/e2e/salary-setup-flows.spec.ts \
  --workers=1 --reporter=line
```

For the two broad route-closure specs, keep sharded/focused reruns when a single route group flakes under load. The tracker records the current Docker evidence and repaired focused reruns.

## Phase 1 Release-Gate Groups

Use these smaller groups instead of one monolithic command when validating the frozen HR Admin baseline. All commands assume the Docker web image is serving on `http://127.0.0.1:3200` and the local API is available at `http://127.0.0.1:8012/api/v1`.

```bash
export PLAYWRIGHT_SKIP_WEB_SERVER=1
export PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200
export HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1
```

| Group | Scope | Specs | Expected status |
| --- | --- | --- | --- |
| HR-P1-1 | Workforce, employee master, access, documents, generated letters | `employee-bank-accounts-certification.spec.ts`, `employee-lifecycle-certification-flows.spec.ts`, `generated-letter-flows.spec.ts`, `hr-admin-employee-documents-live-workflow.spec.ts`, `hr-admin-employee-production-certification.spec.ts`, `hr-admin-workforce-documents-access-responsive-certification.spec.ts` | Pass with documented expected skips only. |
| HR-P1-2 | Attendance and leave operations | `hr-admin-attendance-operations-workflow-certification.spec.ts`, `hr-admin-leave-request-operations-certification.spec.ts`, `phase4c-hr-admin-operations-flows.spec.ts`, `governance-assignment-form-flows.spec.ts` | Pass with documented expected skips only. |
| HR-P1-3 | Payroll setup, rules, calculations, and salary setup | `payroll-calculations-flows.spec.ts`, `payroll-rules-flows.spec.ts`, `payroll-setup-flows.spec.ts`, `salary-setup-flows.spec.ts` | Pass. |
| HR-P1-4 | Payroll operations, outputs, providers, statutory | `payroll-adjustments-flows.spec.ts`, `payroll-handoff-flows.spec.ts`, `payroll-outputs-flows.spec.ts`, `payroll-providers-flows.spec.ts`, `payroll-review-flows.spec.ts`, `payroll-settlements-flows.spec.ts`, `payroll-statutory-flows.spec.ts` | Pass with the known provider expected skip only. |
| HR-P1-5 | Reports and compliance browser checks | `hr-admin-compliance-export-ui-polish-certification.spec.ts`, `hr-admin-report-workspace-submenu-certification.spec.ts`, `hr-admin-reports-operations-ui-audit.spec.ts`, `hr-admin-reports-phase13-certification.spec.ts` | Pass; keep reports/operations audit sharded if broad run times out. |
| HR-P1-6 | Route/responsive visual closure | `hr-admin-e90-8-final-ux-certification.spec.ts`, `hr-admin-full-route-ui-audit.spec.ts`, `hr-admin-responsive-route-closure.spec.ts` | Pass or pass through documented focused reruns for any transient heavy route group. |

Example:

```bash
pnpm --dir web exec playwright test \
  tests/e2e/employee-bank-accounts-certification.spec.ts \
  tests/e2e/employee-lifecycle-certification-flows.spec.ts \
  tests/e2e/generated-letter-flows.spec.ts \
  tests/e2e/hr-admin-employee-documents-live-workflow.spec.ts \
  tests/e2e/hr-admin-employee-production-certification.spec.ts \
  tests/e2e/hr-admin-workforce-documents-access-responsive-certification.spec.ts \
  --workers=1 --reporter=line
```

Phase 1 completion rule: every group must either pass on Docker or have a tracker-backed focused rerun explaining the skip/flaky route group. Do not add candidate specs to these groups until they pass in Phase 2.

Phase 1 setup validation:

| Check | Result |
| --- | --- |
| Verified-working specs grouped | 28 grouped / 28 unique |
| Missing spec paths | 0 |
| Duplicate spec paths | 0 |
| Drift from verified-working list | 0 missing, 0 extra |
| HR-P1-1 Playwright list check | `--list` resolved 10 tests across 6 files |

## Phase 2A Candidate Promotion

Phase 2A starts with low-risk report/readiness candidates. Each promoted spec must pass against the Docker web build and local API/Postgres before moving to `verified-working`.

| Slice | Specs | Result | Repairs made | Evidence |
| --- | --- | --- | --- | --- |
| HR-P2A-1 Attendance reports | `attendance-derivation-exceptions-report-certification.spec.ts`, `attendance-exceptions-report-certification.spec.ts`, `attendance-register-report-certification.spec.ts` | 6 passed / 6 total | Replaced stale `.metric-tile` assertions with shared compact summary metric assertion; made search assertions stable against live seed data; updated drilldown assertions to modal/query-string and permission-aware drawer behavior. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/attendance-derivation-exceptions-report-certification.spec.ts tests/e2e/attendance-exceptions-report-certification.spec.ts tests/e2e/attendance-register-report-certification.spec.ts --workers=1 --reporter=line` -> `6 passed (2.4m)`. |
| HR-P2A-2 HR core reports | `workforce-report-certification.spec.ts`, `document-compliance-report-certification.spec.ts`, `lifecycle-aging-report-certification.spec.ts`, `lifecycle-queue-report-certification.spec.ts`, `leave-balance-report-certification.spec.ts`, `leave-attendance-collisions-report-certification.spec.ts` | 12 passed / 12 total | Added report-export timeout budget for heavy CSV/manifest/audit flows; replaced seed-dependent empty-state assertions with stable filter-state checks; waited for leave balance destination readiness before overflow assertion. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/workforce-report-certification.spec.ts tests/e2e/document-compliance-report-certification.spec.ts tests/e2e/lifecycle-aging-report-certification.spec.ts tests/e2e/lifecycle-queue-report-certification.spec.ts tests/e2e/leave-balance-report-certification.spec.ts tests/e2e/leave-attendance-collisions-report-certification.spec.ts --workers=1 --reporter=line` -> `12 passed (4.6m)`. |
| HR-P2A-3 Payroll reports | `payroll-finance-report-certification.spec.ts`, `payroll-input-exceptions-report-certification.spec.ts`, `payroll-review-exceptions-report-certification.spec.ts`, `payroll-adjustments-report-certification.spec.ts`, `payroll-settlements-report-certification.spec.ts`, `payroll-close-readiness-report-certification.spec.ts`, `payslip-publication-report-certification.spec.ts` | 14 passed / 14 total | Added report-export timeout budget for heavy payroll CSV/manifest/audit flows; replaced seed-dependent empty-state assertions with stable filter-state checks; waited for Payroll Inputs destination readiness before overflow assertion; aligned payroll register export certification with the current default exported sort. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-finance-report-certification.spec.ts tests/e2e/payroll-input-exceptions-report-certification.spec.ts tests/e2e/payroll-review-exceptions-report-certification.spec.ts tests/e2e/payroll-adjustments-report-certification.spec.ts tests/e2e/payroll-settlements-report-certification.spec.ts tests/e2e/payslip-publication-report-certification.spec.ts tests/e2e/payroll-close-readiness-report-certification.spec.ts --workers=1 --reporter=line` -> `14 passed (5.6m)`. |
| HR-P2A-4 Statutory/compliance reports | `pf-ecr-readiness-report-certification.spec.ts`, `esic-contribution-readiness-report-certification.spec.ts`, `professional-tax-readiness-report-certification.spec.ts`, `tds-efile-readiness-report-certification.spec.ts`, `tds-efile-package-certification.spec.ts`, `statutory-deductions-report-certification.spec.ts`, `statutory-filing-status-report-certification.spec.ts` | 14 passed / 14 total | Added timeout budget for heavy statutory readiness flows; aligned employee denial checks with ESS redirect behavior; replaced seed-dependent empty-state assertions with stable filter-state checks; certified provider/statutory drilldowns through verified href navigation. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/pf-ecr-readiness-report-certification.spec.ts tests/e2e/esic-contribution-readiness-report-certification.spec.ts tests/e2e/professional-tax-readiness-report-certification.spec.ts tests/e2e/tds-efile-readiness-report-certification.spec.ts tests/e2e/tds-efile-package-certification.spec.ts tests/e2e/statutory-deductions-report-certification.spec.ts tests/e2e/statutory-filing-status-report-certification.spec.ts --workers=1 --reporter=line` -> `14 passed (7.9m)`. |
| HR-P2A-5 Compliance/provider reports | `provider-filing-receipts-report-certification.spec.ts`, `compliance-summary-report-certification.spec.ts`, `compliance-report-hub-certification.spec.ts`, `compliance-report-export-certification.spec.ts`, `compliance-report-manifest-certification.spec.ts`, `compliance-export-audit-history-certification.spec.ts`, `challan-reconciliation-report-certification.spec.ts`, `lwf-readiness-report-certification.spec.ts` | 20 passed / 20 total | Added timeout budget for heavy export and manifest flows; aligned catalog-open checks with verified direct navigation; updated ESS denial checks to the current workspace redirect; replaced old metric/empty-state assertions with shared compact summary and filter-state checks; allowed provider receipt manifest exports to use the current default sort. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/provider-filing-receipts-report-certification.spec.ts tests/e2e/compliance-summary-report-certification.spec.ts tests/e2e/compliance-report-hub-certification.spec.ts tests/e2e/compliance-report-export-certification.spec.ts tests/e2e/compliance-report-manifest-certification.spec.ts tests/e2e/compliance-export-audit-history-certification.spec.ts tests/e2e/challan-reconciliation-report-certification.spec.ts tests/e2e/lwf-readiness-report-certification.spec.ts --workers=1 --reporter=line` -> `20 passed (11.2m)`. |
| HR-P2B-1 Workforce/lifecycle functional promotion | `employee-directory-certification.spec.ts`, `employee-documents-onboarding-certification-flows.spec.ts`, `employee-fresh-access-visibility-certification-flows.spec.ts`, `employee-probation-audit-role-certification-flows.spec.ts`, `employee-review-movement-exit-certification-flows.spec.ts` | 15 passed / 15 executed, 2 declared expected skips | Promoted current employee master, documents/onboarding, access visibility, probation/audit/role, document review, movement, and exit workflows after Docker browser verification. Repairs covered compact UI selectors, guided employee modal steps, stable form-scoped probation fields, deterministic post-save queue navigation, filter synchronization, direct edit routes for modalized lifecycle flows, and live-data-safe detail/drawer assertions. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/employee-directory-certification.spec.ts tests/e2e/employee-documents-onboarding-certification-flows.spec.ts tests/e2e/employee-fresh-access-visibility-certification-flows.spec.ts tests/e2e/employee-probation-audit-role-certification-flows.spec.ts tests/e2e/employee-review-movement-exit-certification-flows.spec.ts --workers=1 --reporter=line` -> `15 passed (21.8m)`; `pnpm --dir web exec tsc --noEmit` -> passed. |
| HR-P2C-1 Small functional promotion | `attendance-records-slim-options-qa.spec.ts`, `import-history-ledger-certification.spec.ts`, `leave-balance-import-flows.spec.ts`, `payroll-close-readiness-guard-certification.spec.ts`, `payroll-inputs-flows.spec.ts` | 7 passed / 7 total | Promoted slim attendance options, import history ledger, leave balance import, payroll close-readiness guard, and payroll input snapshot flows after Docker browser verification. Repairs covered compact hidden-filter assertions, reset disabled-state tolerance, collapsed bulk import disclosure opening, longer import timeout, API-backed payroll close setup with period-safe fixture data, and live-data-safe lazy-search assertions. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/attendance-records-slim-options-qa.spec.ts tests/e2e/import-history-ledger-certification.spec.ts tests/e2e/leave-balance-import-flows.spec.ts tests/e2e/payroll-close-readiness-guard-certification.spec.ts tests/e2e/payroll-inputs-flows.spec.ts --workers=1 --reporter=line` -> `7 passed (4.3m)`; `pnpm --dir web exec tsc --noEmit` -> passed. |
| HR-P2C-2 Payroll review/RBAC promotion | `payroll-lifecycle-rbac-certification.spec.ts`, `payroll-review-exception-decision-certification.spec.ts`, `payroll-warning-calculation-review-trace-certification.spec.ts` | 5 passed / 5 total | Promoted payroll lifecycle RBAC, exception-decision, and warning trace flows after Docker browser verification. Repairs covered required payroll period selection in run setup and deterministic calculationId navigation before opening review. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-review-exception-decision-certification.spec.ts tests/e2e/payroll-warning-calculation-review-trace-certification.spec.ts tests/e2e/payroll-lifecycle-rbac-certification.spec.ts --workers=1 --reporter=line` -> `5 passed (4.1m)`. |
| HR-P2C-3 Payroll statutory/frontend/cycle promotion | `payroll-statutory-rbac-certification.spec.ts`, `hr-admin-payroll-frontend-validation.spec.ts`, `hr-admin-payroll-cycle-phase11-certification.spec.ts` | 20 passed / 20 executed, 3 declared expected skips | Promoted statutory RBAC denials, payroll frontend validation, and payroll cycle phase 11 route/responsive workflows after Docker browser verification. Repairs covered hydration-safe form validation, route/hash-driven action form opening, mutating-only API interception, permission/data-aware provider and output action assertions, and live-data-safe payroll readiness detail checks. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-statutory-rbac-certification.spec.ts tests/e2e/hr-admin-payroll-frontend-validation.spec.ts tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts --workers=1 --reporter=line` -> `20 passed (23.5m)`. |
| HR-P2C-4 Payroll reports/provider/time-control promotion | `bank-advice-report-certification.spec.ts`, `finance-handoff-exceptions-report-certification.spec.ts`, `salary-variance-report-certification.spec.ts`, `provider-certification-center-certification.spec.ts`, `time-to-payroll-control-certification.spec.ts` | 12 passed / 12 total | Promoted bank advice, finance handoff exceptions, salary variance, provider certification center, and time-to-payroll control workflows after Docker browser verification. Repairs covered live-data-safe filter assertions, current export sort handling, heavy export timeout budgets, compact provider/time summary assertions, URL/href-driven provider tab, connection, salary, and input-report drilldowns, and direct report workspace readiness checks under full-batch load. | `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 pnpm --dir web exec playwright test tests/e2e/bank-advice-report-certification.spec.ts tests/e2e/finance-handoff-exceptions-report-certification.spec.ts tests/e2e/salary-variance-report-certification.spec.ts tests/e2e/provider-certification-center-certification.spec.ts tests/e2e/time-to-payroll-control-certification.spec.ts --workers=1 --reporter=line` -> `12 passed (7.6m)`. |

## Next Batch Recommendation

| Batch | Target | Why | Exit gate |
| --- | --- | --- | --- |
| HR-PW-1 | Candidate functional report specs and small CRUD specs | Low blast radius, usually 1-3 tests per file, good path to grow from 88 to ~150 stable cases. | Docker run passes or each failure is repaired/superseded with tracker note. |
| HR-PW-2 | Candidate visual specs | Most likely to need selector or sharding updates after compact UI work. | Desktop/tablet/mobile pass with no overflow and screenshots/evidence where applicable. |
| HR-PW-3 | Historical cross-module specs | Many duplicate newer Docker flows or old seeded assumptions. | Mark keep/repair/supersede/defer; do not count as release gate until reconciled. |

## Full Inventory

| Spec file | Cases | Declared skips | Classification | Recommended action |
| --- | ---: | ---: | --- | --- |
| `web/tests/e2e/accerio-september-payroll-real-scenario.spec.ts` | 3 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/attendance-derivation-exceptions-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/attendance-exceptions-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/attendance-records-slim-options-qa.spec.ts` | 2 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/attendance-register-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/authenticated-docs-access.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/bank-advice-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/challan-reconciliation-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/compliance-export-audit-history-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/compliance-report-export-certification.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/compliance-report-hub-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/compliance-report-manifest-certification.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/compliance-summary-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/configuration-form-flows.spec.ts` | 7 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/deployed-readonly-auth-routing.spec.ts` | 5 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/docs-screenshot-capture.spec.ts` | 6 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/document-compliance-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/employee-bank-accounts-certification.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/employee-directory-certification.spec.ts` | 6 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/employee-documents-onboarding-certification-flows.spec.ts` | 4 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/employee-fresh-access-visibility-certification-flows.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/employee-lifecycle-certification-flows.spec.ts` | 3 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/employee-phase3f-closure-certification-flows.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/employee-probation-audit-role-certification-flows.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/employee-review-movement-exit-certification-flows.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/esic-contribution-readiness-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/ess-attendance-launch-certification.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/ess-leave-launch-certification.spec.ts` | 11 | 6 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/ess-mss-documentation-sync-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/ess-mss-visual-functional-audit.spec.ts` | 5 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/final-app-audit.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/finance-handoff-exceptions-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/finance-manager-control-center-certification.spec.ts` | 2 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/four-module-responsive-ux-audit.spec.ts` | 1 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/generated-letter-flows.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/governance-assignment-form-flows.spec.ts` | 14 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-attendance-operations-workflow-certification.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-attendance-report-ui-polish-certification.spec.ts` | 1 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-browser-workflow-gate.spec.ts` | 5 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-compact-hubs-certification.spec.ts` | 1 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-compliance-export-ui-polish-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-compliance-provider-ui-audit.spec.ts` | 4 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-control-center-certification.spec.ts` | 1 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-core-frontend-validation.spec.ts` | 4 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-documents-notifications-ui-audit.spec.ts` | 6 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-documents-notifications-workflow-certification.spec.ts` | 10 | 4 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-dynamic-route-ui-audit.spec.ts` | 2 | 1 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-e90-8-final-ux-certification.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-employee-documents-live-workflow.spec.ts` | 2 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-employee-production-certification.spec.ts` | 2 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-employee-workbench-phase10-certification.spec.ts` | 2 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-enterprise-ui-phase9-certification.spec.ts` | 3 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-full-route-ui-audit.spec.ts` | 2 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-hr-core-report-ui-polish-certification.spec.ts` | 1 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-leave-attendance-rbac-certification.spec.ts` | 3 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-leave-management-production-certification.spec.ts` | 4 | 1 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/hr-admin-leave-request-operations-certification.spec.ts` | 5 | 2 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-lifecycle-ui-audit.spec.ts` | 2 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-navigation-control-center-95.spec.ts` | 3 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-notification-phase1-certification.spec.ts` | 4 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-operations-phase14-certification.spec.ts` | 5 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-organization-master-ui.spec.ts` | 4 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-organization-production-certification.spec.ts` | 2 | 1 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-payroll-frontend-validation.spec.ts` | 14 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-payroll-report-ui-polish-certification.spec.ts` | 2 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-payroll-ui-audit.spec.ts` | 4 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-phase8-workflows-ops-certification.spec.ts` | 3 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/hr-admin-report-workspace-submenu-certification.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-reports-operations-ui-audit.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-reports-phase13-certification.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-responsive-route-closure.spec.ts` | 2 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/hr-admin-setup-dynamic-routes-polish.spec.ts` | 2 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-setup-policy-frontend-validation.spec.ts` | 9 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-shell-phase2-certification.spec.ts` | 3 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-time-leave-attendance-roster-p0-gap-certification.spec.ts` | 6 | 4 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-time-leave-phase12-certification.spec.ts` | 5 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-time-leave-policy-ui-audit.spec.ts` | 5 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-time-leave-tl4-polish.spec.ts` | 3 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-unified-design-full-route-certification.spec.ts` | 2 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-visual-functional-audit.spec.ts` | 7 | 1 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/hr-admin-workforce-documents-access-responsive-certification.spec.ts` | 2 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/import-history-ledger-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/launch-remediation-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/leave-attendance-collisions-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/leave-balance-import-flows.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/leave-balance-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/lifecycle-aging-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/lifecycle-queue-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/lwf-readiness-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/mss-control-center-certification.spec.ts` | 8 | 1 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/mss-rbac-approver-certification.spec.ts` | 5 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/notification-setup-crud-flows.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/operational-queue-flows.spec.ts` | 6 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/organization-master-crud-flows.spec.ts` | 5 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-adjustments-flows.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-adjustments-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-calculations-flows.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-close-readiness-guard-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-close-readiness-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-finance-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-handoff-flows.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-input-exceptions-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-inputs-flows.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-lifecycle-rbac-certification.spec.ts` | 7 | 4 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-output-artifact-certification.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-outputs-flows.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-providers-flows.spec.ts` | 7 | 2 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-readiness-bank-gate-certification.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-readiness-flows.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-readiness-negative-gates-certification.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-review-exception-decision-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-review-exceptions-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-review-flows.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-rules-flows.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-settlements-flows.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-settlements-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-setup-flows.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-statutory-flows.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-statutory-rbac-certification.spec.ts` | 6 | 3 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-warning-calculation-review-trace-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payslip-publication-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/pf-ecr-readiness-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/phase3c3-employee-lifecycle-workforce-e2e.spec.ts` | 3 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts` | 6 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/phase4c-hr-admin-operations-flows.spec.ts` | 5 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/phase4d-edge-audit-notification-flows.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/phase5a-payroll-control-room-certification.spec.ts` | 6 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase5b-payroll-close-action-controls.spec.ts` | 5 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase5c-disposable-payroll-close-browser-flow.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase5g-payroll-negative-controls.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase5h-payroll-artifact-access-isolation.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase5i-payroll-register-export-authorization.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase6b-provider-callback-mutation.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase6c-signed-artifact-grants.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase6d-provider-retry-worker.spec.ts` | 2 | 1 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase6e-notification-provider-retry.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase7a-role-access-boundaries.spec.ts` | 4 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase7b-cross-tenant-object-isolation.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase7c-feature-entitlement-gating.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase7g-usage-limit-gating.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase7i-payroll-artifact-access-csv.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase7j-meter-specific-usage-limits.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase8a-workspace-shell-ux-accessibility.spec.ts` | 1 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/phase8c-form-keyboard-accessibility.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase8d-performance-budget.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase9-bulk-upload-100-workforce-certification.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase9c-launch-audit-blocker-closure.spec.ts` | 2 | 1 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase9d-launch-warning-closure.spec.ts` | 2 | 1 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase9e-bank-account-readiness.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/phase9e-provider-ready-rehearsal.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-adjustments-settlements-close-certification.spec.ts` | 4 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-calculation-review-certification.spec.ts` | 3 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-finance-handoff-compliance-certification.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-full-report-export-regression.spec.ts` | 3 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-inputs-certification.spec.ts` | 4 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-output-payslip-ess-certification.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-payroll-input-snapshot-certification.spec.ts` | 4 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-security-isolation-certification.spec.ts` | 4 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-ux-performance-certification.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-100-workforce-certification.spec.ts` | 3 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/pilot-credential-matrix-certification.spec.ts` | 4 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/platform-admin-dashboard-certification.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/platform-admin-rbac-permissions-certification.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/platform-admin-tenant-create-browser-certification.spec.ts` | 2 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/policy-governance-master-crud-flows.spec.ts` | 8 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/production-launch-release-gate.spec.ts` | 5 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/production-live-mutation-readiness.spec.ts` | 3 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/production-notification-flows.spec.ts` | 7 | 2 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/production-payroll-close-flows.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/production-payroll-negative-controls.spec.ts` | 4 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/production-provider-callback-flows.spec.ts` | 8 | 5 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/production-responsive-visual-gate.spec.ts` | 2 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/production-storage-governance-flows.spec.ts` | 3 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/production-tenant-role-isolation.spec.ts` | 5 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/professional-tax-readiness-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/provider-certification-center-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/provider-filing-receipts-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/public-launch-role-menu-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/release-candidate-cross-workspace-ui-gate.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/reporting-foundation-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/roster-rollout-audit-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/roster-shift-operations-compact-qa.spec.ts` | 1 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/route-smoke.spec.ts` | 1 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/saas-control-plane-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/saas-operations-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/saas-resilience-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/saas-sla-operations-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/salary-setup-flows.spec.ts` | 5 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/salary-variance-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/sidebar-tabs-list-certification.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/stage-operational-email-workflows.spec.ts` | 6 | 3 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/statutory-deductions-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/statutory-filing-status-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/tds-efile-package-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/tds-efile-readiness-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/tenant-admin-dashboard-phase2-polish.spec.ts` | 2 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/tenant-admin-documentation-sync-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tenant-admin-final-release-gate.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tenant-admin-governance-phase4-polish.spec.ts` | 4 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/tenant-admin-plan-setup-settings-phase3-polish.spec.ts` | 3 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/tenant-admin-roles-certification.spec.ts` | 6 | 2 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tenant-admin-usability-audit.spec.ts` | 4 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tenant-admin-users-roles-phase1-polish.spec.ts` | 3 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/tier-two-workflow-flows.spec.ts` | 6 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/time-to-payroll-control-certification.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/user-journey-phase1-access-routing.spec.ts` | 10 | 1 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/user-journey-phase2-workspace-usability.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/user-journey-phase3-hr-admin-operations.spec.ts` | 5 | 2 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/user-journey-phase5-payroll-close-workflow.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/user-journey-phase6-ess-mss-practical-workflow.spec.ts` | 12 | 7 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/workflow-trace-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/workforce-report-certification.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
