# Payroll Release Test Manifest - Phase 3B.4F

Date: 2026-10-09

Scope: HR Admin Payroll browser certification baseline. This manifest freezes the auditable payroll release inventory after Phase 3B.4F stabilization. It reconciles the original 106 scenario baseline, the Phase 3B.4B 90-scenario executable set, and the Phase 3B.4E 83-scenario executable set.

Environment: isolated local QA database `backend/db.phase3b2_browser.sqlite3`, local Django API `http://127.0.0.1:8011/api/v1`, local Next.js app `http://127.0.0.1:3214`, Playwright Chromium, sandboxed provider/payment flows only.

## Frozen Inventory

| Inventory Group | Count | Applicability | Execution Method | Status |
| --- | ---: | --- | --- | --- |
| Current Phase 3B.4E payroll browser manifest | 83 | Mandatory current payroll browser certification set | Playwright file-set under `docs/qa/evidence/phase3b4e/00-current-payroll-inventory-list.log` | Frozen as `PAY-FRZ-001..083` |
| Restored baseline scenarios from original 106 | 23 | Mandatory P0/P1 where not formally descoped | Playwright adjacent/restored file-set under `docs/qa/evidence/phase3b4e/06-adjacent-payroll-inventory-candidates.log` | Frozen as `PAY-FRZ-084..106` |
| Total frozen payroll release baseline | 106 | Original certification baseline reconciled | Current + restored manifest | Ready for final full certification rerun after open gates close |

## Current 83 Scenario Source Files

These files define `PAY-FRZ-001..083` in Playwright `--list` order. Source evidence: `docs/qa/evidence/phase3b4e/00-current-payroll-inventory-list.log`.

| File | Scenario Count | Priority | Expected Behavior |
| --- | ---: | --- | --- |
| `hr-admin-payroll-frontend-validation.spec.ts` | 14 | P1 | Browser-side payroll form validation blocks invalid data before API mutation. |
| `hr-admin-payroll-ui-audit.spec.ts` | 1 | P1 | Compact payroll UI layout, controls and internal links remain professional and usable. |
| `payroll-adjustments-flows.spec.ts` | 1 | P1 | Adjustment workspace exposes inputs, approval state, profile refs and source hashes. |
| `payroll-adjustments-report-certification.spec.ts` | 2 | P1 | Adjustment reports filter/export/drill down and deny employee access. |
| `payroll-calculations-flows.spec.ts` | 3 | P0 | Calculation workspace exposes attempts, lines, totals, traces, refresh and mobile behavior. |
| `payroll-close-readiness-report-certification.spec.ts` | 2 | P1 | Close-readiness report filters/export/drilldown and denies employee access. |
| `payroll-finance-report-certification.spec.ts` | 2 | P0 | Payroll register report filters/export/drilldown and denies employee access. |
| `payroll-handoff-flows.spec.ts` | 2 | P0 | Finance handoff workspace exposes artifacts, provider evidence and responsive history. |
| `payroll-input-exceptions-report-certification.spec.ts` | 2 | P1 | Input exception reports filter/export/drill down and deny employee access. |
| `payroll-inputs-flows.spec.ts` | 2 | P0 | Input snapshot workspace exposes run locks, source snapshots and pay-group filtering. |
| `payroll-lifecycle-rbac-certification.spec.ts` | 3 | P0 | Payroll input/reviewer roles cannot perform forbidden lifecycle mutations. |
| `payroll-output-artifact-certification.spec.ts` | 3 | P0 | Outputs, payslips, TDS/PDF evidence, artifact pagination and ESS scope are certified. |
| `payroll-outputs-flows.spec.ts` | 4 | P0 | Output workspace exposes artifacts, selection persistence, error recovery and mobile usability. |
| `payroll-providers-flows.spec.ts` | 5 | P0/P1 | Provider workspace readiness, setup validation, mapping editor and mobile tabs behave correctly. |
| `payroll-readiness-flows.spec.ts` | 1 | P0 | Readiness filters and live row detail stay URL-driven. |
| `payroll-readiness-negative-gates-certification.spec.ts` | 1 | P0 | Missing primary bank-account readiness classification is verified; currently gated by product decision. |
| `payroll-review-flows.spec.ts` | 3 | P0 | Review exceptions, approvals, final lock controls, error recovery and mobile history are stable. |
| `payroll-rules-flows.spec.ts` | 2 | P1 | Rule engine formulas, locked snapshot options and CRUD actions work. |
| `payroll-settlements-flows.spec.ts` | 1 | P1 | Settlement workspace exposes F&F packages, totals and trace detail. |
| `payroll-setup-flows.spec.ts` | 4 | P1 | Payroll setup sections, CRUD, validation and mobile behavior work. |
| `payroll-statutory-flows.spec.ts` | 4 | P1 | Statutory import, packs, profiles, filings, proof review and mobile controls work. |
| `payroll-statutory-rbac-certification.spec.ts` | 3 | P0 | Statutory/output/handoff viewer roles are read-only and API-denied for forbidden mutations. |
| `phase5g-payroll-negative-controls.spec.ts` | 1 | P0 | Blocked snapshots stop close actions and locked snapshots reject edits. |
| `phase5h-payroll-artifact-access-isolation.spec.ts` | 1 | P0 | HR artifacts download through same-origin proxy while ESS stays scoped. |
| `phase5i-payroll-register-export-authorization.spec.ts` | 1 | P0 | HR can export register evidence while employees cannot access register artifacts. |
| `phase6b-provider-callback-mutation.spec.ts` | 1 | P0 | Signed callbacks, replay guard, bad signatures and ledger evidence work. |
| `phase6d-provider-retry-worker.spec.ts` | 1 | P0 | Failed provider delivery retry executes and exposes queue evidence. |
| `phase9e-provider-ready-rehearsal.spec.ts` | 1 | P0 | Provider lanes can be certified into a ready launch rehearsal. |
| `pilot-100-adjustments-settlements-close-certification.spec.ts` | 1 | P0 | P100 adjustment, settlement and close report lifecycle is certified. |
| `pilot-100-finance-handoff-compliance-certification.spec.ts` | 1 | P0 | P100 finance handoff, provider evidence and finance reports are certified. |
| `production-provider-callback-flows.spec.ts` | 3 | P0 | Production callback, retry and audit-pack evidence remain safe and locked. |
| `provider-certification-center-certification.spec.ts` | 2 | P0 | Provider certification center and employee denial are certified. |
| `salary-setup-flows.spec.ts` | 5 | P1 | Salary setup actions, import, CRUD and mobile behavior work. |

## Reconciled 23 Baseline Drift Scenarios

Source evidence: `docs/qa/evidence/phase3b4e/06-adjacent-payroll-inventory-candidates.log`.

| Frozen ID | Scenario | Source Path | Classification | Priority | Applicability |
| --- | --- | --- | --- | --- | --- |
| PAY-FRZ-084 | Calculation page close action controls | `phase5b-payroll-close-action-controls.spec.ts` | Excluded from 4E file set; restored to frozen baseline | P0 | Mandatory lifecycle control coverage |
| PAY-FRZ-085 | Review page submit/approve/lock/output controls | `phase5b-payroll-close-action-controls.spec.ts` | Excluded from 4E file set; restored | P0 | Mandatory lifecycle control coverage |
| PAY-FRZ-086 | Outputs page publish/handoff controls | `phase5b-payroll-close-action-controls.spec.ts` | Excluded from 4E file set; restored | P0 | Mandatory output control coverage |
| PAY-FRZ-087 | Handoff transmit/ack/audit controls | `phase5b-payroll-close-action-controls.spec.ts` | Excluded from 4E file set; restored | P0 | Mandatory finance handoff control coverage |
| PAY-FRZ-088 | Review exception decision lifecycle | `payroll-review-exception-decision-certification.spec.ts` | Excluded from 4E file set; restored | P0 | Mandatory review exception state transition |
| PAY-FRZ-089 | Payroll report hub polish | `hr-admin-payroll-report-ui-polish-certification.spec.ts` | Excluded from 4E file set; restored | P1 | UX consistency/report navigation |
| PAY-FRZ-090 | Payroll register report polish | `hr-admin-payroll-report-ui-polish-certification.spec.ts` | Excluded from 4E file set; restored | P1 | UX consistency/report controls |
| PAY-FRZ-091 | Payroll input exceptions report polish | `hr-admin-payroll-report-ui-polish-certification.spec.ts` | Excluded from 4E file set; restored | P1 | UX consistency/report controls |
| PAY-FRZ-092 | Bank advice report polish | `hr-admin-payroll-report-ui-polish-certification.spec.ts` | Excluded from 4E file set; restored | P1 | Finance report UX |
| PAY-FRZ-093 | Payroll review exceptions report admin path | `payroll-review-exceptions-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | Mandatory report evidence |
| PAY-FRZ-094 | Payroll review exceptions employee denial | `payroll-review-exceptions-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | RBAC report denial |
| PAY-FRZ-095 | Payroll settlements report admin path | `payroll-settlements-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | Mandatory settlement report evidence |
| PAY-FRZ-096 | Payroll settlements employee denial | `payroll-settlements-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | RBAC report denial |
| PAY-FRZ-097 | Close readiness guard | `payroll-close-readiness-guard-certification.spec.ts` | Excluded from 4E file set; restored | P0 | Mandatory close gate/warning behavior |
| PAY-FRZ-098 | Bank account coverage gate | `payroll-readiness-bank-gate-certification.spec.ts` | Excluded from 4E file set; restored | P0 | Bank readiness decision support |
| PAY-FRZ-099 | Warning calculation/review trace | `payroll-warning-calculation-review-trace-certification.spec.ts` | Excluded from 4E file set; restored | P0 | Warning propagation through calculation/review |
| PAY-FRZ-100 | Payslip publication report admin path | `payslip-publication-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | Mandatory payslip report evidence |
| PAY-FRZ-101 | Payslip publication employee denial | `payslip-publication-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | RBAC report denial |
| PAY-FRZ-102 | Salary variance report admin path | `salary-variance-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | Payroll finance report coverage |
| PAY-FRZ-103 | Salary variance employee denial | `salary-variance-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | RBAC report denial |
| PAY-FRZ-104 | Statutory deductions report admin path | `statutory-deductions-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | Statutory payroll report coverage |
| PAY-FRZ-105 | Statutory deductions employee denial | `statutory-deductions-report-certification.spec.ts` | Report/UI drift from original baseline; restored | P1 | RBAC report denial |
| PAY-FRZ-106 | Statutory filing status report admin/denial pair | `statutory-filing-status-report-certification.spec.ts` | Merged frozen record for two related P1 report scenarios; execute both tests before certification | P1 | Statutory filing report coverage |

## Adjacent Candidates Not Counted In Original 106

The following payroll-adjacent scenarios exist and may be useful, but are not counted in the frozen 106 unless product/QA explicitly expands the baseline: `tds-efile-readiness-report-certification.spec.ts`, `tds-efile-package-certification.spec.ts`, `provider-filing-receipts-report-certification.spec.ts`, broader Pilot 100 workforce/input/calculation/security/performance suites, ESS payslip/statutory declaration suites, and production payroll close/user journey suites.

## Inventory Guard

Future payroll certification must start with:

```bash
pnpm --dir web exec playwright test <frozen file set> --project=chromium --list
```

The run may proceed only when the list reconciles to 106 frozen records or when a product/QA owner records an explicit rename, merge, deletion or descoping decision. Missing scenarios are never counted as Passed.

## Open Certification Gate

`HRADM-DEF-20261009-013` remains open. Current behavior classifies missing primary bank account as `Blocked`. Product/business must approve stage-specific behavior for calculation, review/output, payslip publication and payment submission before the affected readiness scenario can be certified.

## Phase 3B.4G Execution Reconciliation

Fresh execution date: 2026-10-09.

Final inventory command evidence: `docs/qa/evidence/phase3b4g/08-frozen-manifest-playwright-list-final.log`.

| Item | Count | Phase 3B.4G disposition |
| --- | ---: | --- |
| Frozen manifest records | 106 | Immutable baseline retained. |
| Raw Playwright tests listed | 107 | Expected because `PAY-FRZ-106` maps to two raw statutory filing status tests. |
| Records with fresh pass evidence | 103 | Passed across batch and focused rerun evidence. |
| Records with fresh failure evidence | 1 | Missing primary bank account readiness expectation remains failed/open under `HRADM-DEF-20261009-013`. |
| Conditional/skipped records | 2 | Provider incomplete-lane activation and production provider audit drilldown skipped by test condition; not counted as passed. |
| Not run | 0 | No frozen record remained unattempted. |
| Formally retired | 0 | No record retired in Phase 3B.4G. |

Certification verdict: Conditionally Certified, not Fully Certified. The executed payroll lifecycle, financial, authorization, report/export, artifact, callback/retry and P100 scopes have fresh passing evidence. Full certification remains gated by the missing-bank product decision and provider conditional-scenario disposition.
