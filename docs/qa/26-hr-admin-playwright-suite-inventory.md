# HR Admin Playwright Suite Inventory

Date: 2026-10-12

Purpose: classify the HR portal / HR Admin-related Playwright inventory so the release-gate suite can grow from the current Docker-verified baseline without reintroducing stale or superseded specs.

## Current Counts

| Metric | Count |
| --- | ---: |
| HR-related Playwright spec files discovered | 213 |
| HR-related Playwright test declarations discovered | 665 |
| Current tracker-backed HR Admin functional/live workflow result | 87 passed / 88 total |
| Current functional/live expected skips | 1 |
| Current active HR Admin Playwright blockers | 0 |

Important distinction: the 665 count is the broad repository inventory. The 88 count is the current tracker-backed HR Admin functional/live working set verified against the local Docker web build, API, and Postgres.

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
| `verified-working` | 28 | 97 | 10 | Keep in release gate |
| `candidate-functional` | 101 | 321 | 35 | Review next for Docker functional batch |
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
  tests/e2e/salary-setup-flows.spec.ts
  --workers=1 --reporter=line
```

For the two broad route-closure specs, keep sharded/focused reruns when a single route group flakes under load. The tracker records the current Docker evidence and repaired focused reruns.

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
| `web/tests/e2e/attendance-derivation-exceptions-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/attendance-exceptions-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/attendance-records-slim-options-qa.spec.ts` | 2 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/attendance-register-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/authenticated-docs-access.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/bank-advice-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/challan-reconciliation-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/compliance-export-audit-history-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/compliance-report-export-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/compliance-report-hub-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/compliance-report-manifest-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/compliance-summary-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/configuration-form-flows.spec.ts` | 7 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/deployed-readonly-auth-routing.spec.ts` | 5 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/docs-screenshot-capture.spec.ts` | 6 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/document-compliance-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/employee-bank-accounts-certification.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/employee-directory-certification.spec.ts` | 6 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/employee-documents-onboarding-certification-flows.spec.ts` | 4 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/employee-fresh-access-visibility-certification-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/employee-lifecycle-certification-flows.spec.ts` | 3 | 1 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/employee-phase3f-closure-certification-flows.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/employee-probation-audit-role-certification-flows.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/employee-review-movement-exit-certification-flows.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/esic-contribution-readiness-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/ess-attendance-launch-certification.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/ess-leave-launch-certification.spec.ts` | 11 | 6 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/ess-mss-documentation-sync-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/ess-mss-visual-functional-audit.spec.ts` | 5 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/final-app-audit.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/finance-handoff-exceptions-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
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
| `web/tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/hr-admin-payroll-frontend-validation.spec.ts` | 14 | 0 | `candidate-functional` | `next-batch-review` |
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
| `web/tests/e2e/import-history-ledger-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/launch-remediation-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/leave-attendance-collisions-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/leave-balance-import-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/leave-balance-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/lifecycle-aging-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/lifecycle-queue-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/lwf-readiness-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/mss-control-center-certification.spec.ts` | 8 | 1 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/mss-rbac-approver-certification.spec.ts` | 5 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/notification-setup-crud-flows.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/operational-queue-flows.spec.ts` | 6 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/organization-master-crud-flows.spec.ts` | 5 | 1 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-adjustments-flows.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-adjustments-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-calculations-flows.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-close-readiness-guard-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-close-readiness-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-finance-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-handoff-flows.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-input-exceptions-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-inputs-flows.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-lifecycle-rbac-certification.spec.ts` | 7 | 4 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-output-artifact-certification.spec.ts` | 4 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-outputs-flows.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-providers-flows.spec.ts` | 7 | 2 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-readiness-bank-gate-certification.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-readiness-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-readiness-negative-gates-certification.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-review-exception-decision-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-review-exceptions-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-review-flows.spec.ts` | 3 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-rules-flows.spec.ts` | 2 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-settlements-flows.spec.ts` | 1 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-settlements-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-setup-flows.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-statutory-flows.spec.ts` | 4 | 0 | `verified-working` | `keep-release-gate` |
| `web/tests/e2e/payroll-statutory-rbac-certification.spec.ts` | 6 | 3 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payroll-warning-calculation-review-trace-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/payslip-publication-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/pf-ecr-readiness-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
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
| `web/tests/e2e/professional-tax-readiness-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/provider-certification-center-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/provider-filing-receipts-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
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
| `web/tests/e2e/salary-variance-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/sidebar-tabs-list-certification.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/stage-operational-email-workflows.spec.ts` | 6 | 3 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/statutory-deductions-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/statutory-filing-status-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tds-efile-package-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tds-efile-readiness-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tenant-admin-dashboard-phase2-polish.spec.ts` | 2 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/tenant-admin-documentation-sync-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tenant-admin-final-release-gate.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tenant-admin-governance-phase4-polish.spec.ts` | 4 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/tenant-admin-plan-setup-settings-phase3-polish.spec.ts` | 3 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/tenant-admin-roles-certification.spec.ts` | 6 | 2 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tenant-admin-usability-audit.spec.ts` | 4 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/tenant-admin-users-roles-phase1-polish.spec.ts` | 3 | 0 | `candidate-visual` | `repair-or-shard-if-needed` |
| `web/tests/e2e/tier-two-workflow-flows.spec.ts` | 6 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/time-to-payroll-control-certification.spec.ts` | 3 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/user-journey-phase1-access-routing.spec.ts` | 10 | 1 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/user-journey-phase2-workspace-usability.spec.ts` | 1 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/user-journey-phase3-hr-admin-operations.spec.ts` | 5 | 2 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/user-journey-phase5-payroll-close-workflow.spec.ts` | 2 | 0 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/user-journey-phase6-ess-mss-practical-workflow.spec.ts` | 12 | 7 | `historical-cross-module` | `defer-or-supersede-after-review` |
| `web/tests/e2e/workflow-trace-flows.spec.ts` | 1 | 0 | `candidate-functional` | `next-batch-review` |
| `web/tests/e2e/workforce-report-certification.spec.ts` | 2 | 0 | `candidate-functional` | `next-batch-review` |
