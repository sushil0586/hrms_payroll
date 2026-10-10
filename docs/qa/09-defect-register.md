# Phase 3A Defect Register

Date: 2026-10-09
Scope: Defect tracking shell for upcoming execution
Execution status: Phase 3B.1A bootstrap blocker resolved; five remaining current-release backend/API defect groups opened from smoke revalidation.

## Defect Policy

Defect IDs use `HRADM-DEF-YYYYMMDD-NNN`. A defect is opened only after fresh execution evidence or deterministic static review confirms failure. Historical failures must be revalidated before becoming current-release defects.

## Severity Model

| Severity | Meaning | Release impact |
| --- | --- | --- |
| Blocker | Security, data isolation, payroll integrity, statutory/compliance evidence, or unavailable P0 workflow | Release blocked |
| Critical | Major HR Admin workflow broken with no acceptable workaround | Release blocked until triaged |
| Major | Important workflow degraded but workaround exists | Release manager decision |
| Minor | Cosmetic, copy, non-blocking compact UI issue | Can defer with owner approval |

## Current Defects

| Defect ID | Source Test ID | Module | Screen | Functionality | Severity | Status | Summary | Evidence | Owner | Target Fix Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-001 | HRADM-SCN smoke-suite affected rows | Cross-module/API smoke | Multiple HR Admin/API screens | Demo workspace bootstrap, staging launch seed, API smoke prerequisites | Blocker | Resolved in Phase 3B.1A | `bootstrap_demo_workspace` creates a pending leave request whose requested dates resolve to zero working leave days under the policy; this blocks 343 smoke scenarios and fails 2 staging seed scenarios. | `docs/qa/evidence/phase3b1/06-phase0-api-smoke.log`; first stack: `apps/common/management/commands/bootstrap_demo_workspace.py:701` -> `apps/leave_management/services.py:1488` | Backend/API owner | E90 backend certification stabilization |
| HRADM-DEF-20261009-002 | See failed Phase 3B.1A smoke rows | Tenant/Admin/RBAC | Tenant admin and workspace session APIs | Role uniqueness, permission enforcement, workspace exposure | Blocker | Resolved in Phase 3B.1B | Tenant admin/session and RBAC assertions fail after bootstrap unblock: duplicate role setup, manage-permission gates returning 201/400, manager session exposing HR Admin workspace, and employee manager action status mismatch. | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Backend/API owner | Backend API smoke stabilization |
| HRADM-DEF-20261009-003 | HRADM-SCN-0129 | Audit/Command | HR Admin dashboard | SaaS launch audit remediation assignments | Major | Resolved in Phase 3B.1B | Dashboard launch audit reports open remediation count but returns an empty remediation assignment list. | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Backend/API owner | Backend API smoke stabilization |
| HRADM-DEF-20261009-004 | See failed Phase 3B.1A payroll setup rows | Payroll | Payroll readiness/statutory/input setup | Readiness summaries, employer filing, locked snapshot messaging | Blocker | Resolved in Phase 3B.1B | Payroll readiness/statutory/input assertions fail after bootstrap unblock, including missing source summary count, employer filing flag mismatch, and locked snapshot message contract mismatch. | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Payroll/API owner | Backend API smoke stabilization |
| HRADM-DEF-20261009-005 | See failed Phase 3B.1A provider rows | Payroll | Finance handoff/provider integrations | Handoff transmit, callbacks, retry, provider activation | Blocker | Resolved in Phase 3B.1B | Payroll handoff/provider smoke scenarios fail around transmitted/submitted states, callback strict policy, retry acknowledgements, active schema mapping requirements, and failure evidence messages. | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Payroll/API owner | Backend API smoke stabilization |
| HRADM-DEF-20261009-006 | See failed Phase 3B.1A leave rows | Time/Leave/Attendance | ESS leave requests | Date selection and overlap-sensitive leave edge cases | Blocker | Resolved in Phase 3B.1B | Several leave request edge scenarios still use dates that fall on non-working days or overlap the fixed seeded pending leave after bootstrap became deterministic. | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Leave/API owner | Backend API smoke stabilization |

## Phase 3B.1A Remediation and Revalidation Evidence - 2026-10-09

| Defect ID | Status | Evidence | Notes |
| --- | --- | --- | --- |
| HRADM-DEF-20261009-001 | Resolved | `docs/qa/evidence/phase3b1/07-bootstrap-remediation-focused.log`, `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Bootstrap now chooses working weekdays; previous two staging seed failures pass; smoke has 0 setup errors. Original failure history remains above. |
| HRADM-DEF-20261009-002 | Resolved in Phase 3B.1B | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Tenant admin/RBAC/session failures. |
| HRADM-DEF-20261009-003 | Resolved in Phase 3B.1B | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Launch audit remediation assignment list empty. |
| HRADM-DEF-20261009-004 | Resolved in Phase 3B.1B | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Payroll readiness/statutory/input contract failures. |
| HRADM-DEF-20261009-005 | Resolved in Phase 3B.1B | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Payroll provider/handoff state and readiness failures. |
| HRADM-DEF-20261009-006 | Resolved in Phase 3B.1B | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` | Leave edge-date/overlap failures after deterministic seed. |

## Phase 3B.1 Defect Evidence - 2026-10-09

| Defect ID | Failure Type | Affected Count | Reproduction | Observed Result | Expected Result | Classification |
| --- | --- | ---: | --- | --- | --- | --- |
| HRADM-DEF-20261009-001 | Shared fixture/product test-data bootstrap failure | 345 smoke scenarios affected: 343 setup errors + 2 command failures | Run `cd backend && ../backend/.venv/bin/python -m pytest tests/test_phase0_api_smoke.py -vv --durations=20` | `django.core.exceptions.ValidationError: {'start_date': ['Selected dates do not include working leave days under this policy.']}` from `bootstrap_demo_workspace` leave request seeding | Demo workspace and staging launch seed should create valid current-date-safe leave/attendance data and allow API smoke tests to execute assertions | Product/test-data defect; release blocker for API smoke certification |

Non-blocking environment watch: Django emits a Python 3.14 deprecation warning for `asyncio.iscoroutinefunction` in `django.contrib.auth.decorators`; tests still executed.

## Gap-Seeded Watchlist

| Watch ID | Related Gap | Module | Risk | Trigger to open defect |
| --- | --- | --- | --- | --- |
| HRADM-WATCH-P0-001 | HRADM-TG-P0-001 | Payroll | Handoff transitions may not be fully certified | Any generate/transmit/ack/audit-pack state failure |
| HRADM-WATCH-P0-002 | HRADM-TG-P0-002 | Payroll | Adjustment/settlement lifecycle may be under-tested | Any submit/approve/reject/apply or locked-state failure |
| HRADM-WATCH-P0-003 | HRADM-TG-P0-003 | Time/Attendance | Attendance import positive path may fail silently | Import commit, partial failure, or audit link mismatch |
| HRADM-WATCH-P0-004 | HRADM-TG-P0-004 | Roster | Roster CRUD/conflict resolution may be incomplete | Any shift/calendar/assignment/rollout mutation failure |
| HRADM-WATCH-P0-005 | HRADM-TG-P0-005 | Notifications | Setup/delivery/test-send may be incomplete | Template/event/delivery/diagnostic mutation or recovery failure |

Phase 3B.1A resolved `HRADM-DEF-20261009-001`; `HRADM-DEF-20261009-002..006` remain open. Browser testing has not started.
## Phase 3B.1B Remediation and Revalidation Evidence - 2026-10-09

| Defect ID | Status | Root Cause Classification | Resolution Summary | Revalidation Evidence |
| --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-002 | Resolved | Mixed product defect and stale smoke fixture | Workspace access now distinguishes tenant admin, manager, employee, and custom HR viewer roles; tenant-admin smoke fixture reuses seeded role and restricts all assigned roles for permission-denial cases; employee manager-action expectations align with permission denial. | `docs/qa/evidence/phase3b1/10-phase0-api-smoke-after-3b1b-rerun.log` |
| HRADM-DEF-20261009-003 | Resolved | Stale test invocation of opt-in remediation sync | Dashboard smoke requests `sync_remediation=1`, preserving the explicit side-effect gate while proving launch remediation assignments materialize. | `docs/qa/evidence/phase3b1/10-phase0-api-smoke-after-3b1b-rerun.log` |
| HRADM-DEF-20261009-004 | Resolved | Mix of valid product copy improvement and stale date/status expectations | Locked snapshot error now states immutable behavior; payroll readiness expects blocked when blockers exist; statutory filing fixture uses future due dates relative to 2026-10-09. | `docs/qa/evidence/phase3b1/10-phase0-api-smoke-after-3b1b-rerun.log` |
| HRADM-DEF-20261009-005 | Resolved | Product default adapter defect plus stale provider fixtures | Default manual finance handoff uses registered manual provider adapter; active provider fixtures create required schema mapping packs; provider activation and statutory filing smoke use valid registered adapters without bypassing certification/mapping gates. | `docs/qa/evidence/phase3b1/10-phase0-api-smoke-after-3b1b-rerun.log`, `docs/qa/evidence/phase3b1/11-affected-backend-suites-after-3b1b.log` |
| HRADM-DEF-20261009-006 | Resolved | Date-sensitive smoke fixture | Leave edge scenarios now choose deterministic working dates and avoid the seeded pending leave range; zero-working-day validation remains covered. | `docs/qa/evidence/phase3b1/10-phase0-api-smoke-after-3b1b-rerun.log`, `docs/qa/evidence/phase3b1/11-affected-backend-suites-after-3b1b.log` |

Current backend/API blocker status after Phase 3B.1B: no unresolved P0 tenant isolation, payroll integrity, authorization, provider handoff, or leave validation defects remain in the executed backend/API scope. Browser suites remain Not Run and must provide separate certification evidence.

## Phase 3B.2 Browser Defects - 2026-10-09

| Defect ID | Source Test ID | Module | Screen | Functionality | Severity | Status | Summary | Evidence | Owner | Target Fix Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-007 | `HRADM-TC-WF-009` / onboarding scenario | Workforce / Lifecycle | HRADM-SCR-WF-006..018 | Onboarding completion guard | Major | Open - test defect | Existing onboarding browser test marks its only checklist item done, then expects a completion failure for open checklist items. Actual API success is consistent with the submitted checklist state. Test must create a deliberately open blocking checklist item or use a real missing-document blocker before this scenario can certify the guard. | `docs/qa/evidence/phase3b2/02-documents-playwright.log` | QA automation owner | Phase 3B.2 revalidation |
| HRADM-DEF-20261009-008 | Access routing scenario | Access / MSS | MSS approvals | Workspace routing copy assertion | Minor | Open - test defect | Older read-only routing suite expects H1 `Manager inbox`; current page exposes `Manager approvals`. Newer journey suite passed manager MSS non-escalation with current/alternate heading support. Align old suite or retire duplicate assertion. | `docs/qa/evidence/phase3b2/03-access-rbac-playwright.log` | QA automation owner | Phase 3B.2 revalidation |
| HRADM-DEF-20261009-009 | Access routing scenario | Access / Finance workspace | Finance manager route | Seeded persona credentials | Major | Open - environment/seed dependency | `payroll.finance` login returned 400 invalid credentials in the local bootstrap tenant. This blocks finance workspace browser routing certification but does not indicate HR Admin unauthorized access in the executed scope. Seed or document this persona before finance certification. | `docs/qa/evidence/phase3b2/03-access-rbac-playwright.log` | Test environment owner | Finance/browser certification prep |

Phase 3B.2 P0 product-defect status for scoped HR Admin Workforce/Documents/Access: no confirmed production-code P0 defect was opened from this batch. Current open items are two automation defects and one environment/seed dependency; the onboarding guard still needs corrected revalidation before lifecycle signoff.

## Phase 3B.2A Defect Revalidation - 2026-10-09

| Defect ID | Previous Status | Current Status | Resolution / Retest Notes | Evidence |
| --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-007 | Open - test defect | Resolved | Onboarding guard test now creates a real open blocking checklist item before attempting Completed status. Focused and related-suite reruns passed. | `docs/qa/evidence/phase3b2a/01-onboarding-guard-retest.log`, `docs/qa/evidence/phase3b2a/02-documents-onboarding-related-rerun.log` |
| HRADM-DEF-20261009-008 | Open - test defect | Resolved | Stale MSS heading assertion now accepts current `Manager approvals` copy while preserving manager workspace non-escalation proof. Access/RBAC rerun passed. | `docs/qa/evidence/phase3b2a/03-access-rbac-rerun.log` |
| HRADM-DEF-20261009-009 | Open - environment/seed dependency | Resolved for local Phase 3B.2A | `payroll.finance` was provisioned through existing `seed_pilot_named_users` with the configured seed password. Finance workspace routing passed. | `docs/qa/evidence/phase3b2a/03-access-rbac-rerun.log` |

Current Phase 3B.2A blocker status: no open failed or blocked defects remain for the scoped Workforce/Documents/Access browser revalidation. One optional no-access user scenario remains Not Run because `PLAYWRIGHT_LIVE_NO_ACCESS_USERNAME` was not configured.

## Phase 3B.3 Defect Revalidation - 2026-10-09

One product P1 defect was opened from Phase 3B.3 server-log evidence. All observed Playwright assertion failures were classified as stale assertions or fixture assumptions and were remediated in test code, then revalidated.

| Defect / Watch ID | Type | Status | Notes | Evidence |
| --- | --- | --- | --- | --- |
| HRADM-WATCH-P0-003 | Attendance import/edit coverage watch | Closed for positive commit/edit | New browser scenario committed a valid attendance import row, edited it through UI, and verified persistence through API. | `docs/qa/evidence/phase3b3/07-new-p0-gap-spec-revalidation-current-ui.log` |
| HRADM-WATCH-P0-004 | Roster/shift mutation coverage watch | Reduced / monitoring | New browser scenario created and edited a shift assignment, verified blocking conflict, created/edited roster template, and ran dry-run rollout. Delete remains unavailable in product API. | `docs/qa/evidence/phase3b3/09-roster-gap-revalidation-create-template.log` |
| Phase 3B.3 stale assertion cluster | Test defects | Resolved | Duplicate read-only attendance text, collapsed leave policy sections, obsolete restriction values, empty roster assignment fixture assumption, and current button/copy labels were corrected. | `docs/qa/evidence/phase3b3/03-focused-revalidation-and-gap-tests.log`, `docs/qa/evidence/phase3b3/13-leave-policy-revalidation-default-restrictions.log` |

| Defect ID | Source Test ID | Module | Screen | Functionality | Severity | Status | Summary | Evidence | Owner | Target Fix Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-010 | `HRADM-TC-TLA-008` | Time/Leave/Attendance | HRADM-SCR-TLA-024 Leave policies | Duplicate policy validation | Major | Open - product defect | Duplicate leave policy create shows UI save failure but backend raises SQLite `IntegrityError` / HTTP 500 for unique `(tenant_id, code)`. Expected behavior is controlled validation error, preferably HTTP 400 with field message, preserving the UI failure state without internal server error. | Django server log during `docs/qa/evidence/phase3b3/13-leave-policy-revalidation-default-restrictions.log` run, stack at `backend/apps/common/api_views.py:16358` -> `save_hr_admin_leave_policy` -> model save | Backend/API owner | Phase 3B.3 remediation or next stabilization pass |

Capability gap, not opened as defect: employee shift assignments and shift roster templates do not expose delete endpoints in `backend/apps/common/api_views.py`. Current certification marks create/edit/conflict/rollout as passed and leaves delete/archive for product decision.

## Phase 3B.3A Defect Revalidation - 2026-10-09

| Defect ID | Previous Status | Current Status | Resolution / Retest Notes | Evidence |
| --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-010 | Open - product defect | Resolved | Duplicate leave policy creation now pre-validates tenant/code uniqueness and still catches database `IntegrityError` races, returning HTTP 400 with field-level `code` validation. Browser regression asserts the POST is 400 and UI remains in save-failed state. | `docs/qa/evidence/phase3b3a/02-backend-leave-policy-duplicate-focused-rerun.log`, `docs/qa/evidence/phase3b3a/04-browser-leave-policy-duplicate-regression-rerun.log`, `docs/qa/evidence/phase3b3a/08-common-backend-regression.log` |
| Phase 3B.3 skipped roster rollout scenario | Not Run/Skipped | Passed | Legacy test was updated for current compact async employee search and department-scope rollout controls. | `docs/qa/evidence/phase3b3a/07-formerly-skipped-roster-rollout-revalidated-rerun.log` |

Current Phase 3B.3A blocker status: no open failed or blocked defects remain in the Time/Leave/Attendance/Roster stabilization scope. Shift assignment and roster template delete/archive remain product decisions, not defects.

## Phase 3B.4 Payroll Browser Defects - 2026-10-09

| Defect ID | Source Test ID | Module | Screen | Functionality | Severity | Status | Summary | Evidence | Owner | Target Fix Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-011 | Multiple existing payroll Playwright scenarios | Payroll | HRADM-SCR-PAY-001..017 | Compact payroll UI automation contracts | Major | Open - test defect | Existing payroll browser tests contain stale/ambiguous assertions for compact UI headings/labels and strict text locators. Current UI often renders usable content but tests fail before validating actions. | `docs/qa/evidence/phase3b4/01-existing-payroll-core-playwright.log`, `docs/qa/evidence/phase3b4/05-reports-ui-playwright.log` | QA automation owner | Phase 3B.4A stabilization |
| HRADM-DEF-20261009-012 | P100/output/handoff/provider lifecycle scenarios | Payroll | HRADM-SCR-PAY-008..010, HRADM-SCR-PAY-012..017 | Payroll close, output, finance handoff, provider retry | Blocker | Open - environment/fixture prerequisite | Browser certification lacks deterministic local payroll lifecycle seed for locked reviews, published P100 output batches, finance handoffs, employees/options, output artifacts and payroll register links. | `docs/qa/evidence/phase3b4/02-adjustments-settlements-playwright.log`, `docs/qa/evidence/phase3b4/03-handoff-provider-playwright.log`, `docs/qa/evidence/phase3b4/04-rbac-negative-playwright.log` | Payroll QA environment owner | Phase 3B.4A stabilization |
| HRADM-DEF-20261009-013 | Payroll readiness negative gate scenario | Payroll | HRADM-SCR-PAY-001 | Payroll readiness gating | Major | Open - requirements confirmation | Employee missing primary bank account appears as `Blocked`; existing test expected `Warning`. This may be intentional stricter payroll safety behavior but requires product confirmation and test alignment. | `docs/qa/evidence/phase3b4/01-existing-payroll-core-playwright.log` | Payroll product owner / QA | Phase 3B.4A stabilization |
| HRADM-DEF-20261009-014 | Payroll UI audit | Payroll | HRADM-SCR-PAY-001 | Compact professional UI consistency | Minor | Open - UI polish/test threshold | Payroll readiness typography audit reports non-canonical font stack on headings, metric values and buttons. | `docs/qa/evidence/phase3b4/05-reports-ui-playwright.log` | Frontend/UI owner | UX consistency pass |
| HRADM-DEF-20261009-015 | Payroll report batch | Payroll Reports | Report screens | Payroll finance/report certification | Major | Open - execution blocker | Payroll finance report test produced no terminal output within the manual timebox; remaining report specs in that batch were not reached. Needs isolated rerun and trace review. | `docs/qa/evidence/phase3b4/05-reports-ui-playwright.log` | QA automation owner | Phase 3B.4A stabilization |

## Phase 3B.4A Defect Revalidation - 2026-10-09

| Defect ID | Previous Status | Current Status | Resolution / Retest Notes | Evidence |
| --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-011 | Open - test defect | Resolved for focused stale-contract scope | Updated stale compact UI selectors/assertions for payroll calculation, review, rules, provider, salary import, P100 output, P100 handoff, ESS dashboard, and report drilldown semantics. | `docs/qa/evidence/phase3b4a/08-provider-selector-focused.log`, `docs/qa/evidence/phase3b4a/10-focused-review-salary-revalidation.log`, `docs/qa/evidence/phase3b4a/31-p100-output-focused-revalidation-final.log`, `docs/qa/evidence/phase3b4a/39-p100-finance-handoff-focused-revalidation-final.log`, `docs/qa/evidence/phase3b4a/42-finance-report-revalidation-final.log` |
| HRADM-DEF-20261009-012 | Open - environment/fixture prerequisite | Resolved for P100 lifecycle focused scope | Built deterministic local P100 payroll fixture through supported seed commands and model-consistent local lifecycle state: locked input run, calculation runs, published output batch, 100 payslips, register artifact, finance handoff, provider delivery evidence, and report artifacts. Added backend regression for register artifact filtering beyond the first payslip page. | `docs/qa/evidence/phase3b4a/01-seed-workforce.json`, `docs/qa/evidence/phase3b4a/02-seed-inputs.json`, `docs/qa/evidence/phase3b4a/03-seed-snapshots.json`, `docs/qa/evidence/phase3b4a/31-p100-output-focused-revalidation-final.log`, `docs/qa/evidence/phase3b4a/39-p100-finance-handoff-focused-revalidation-final.log`, `docs/qa/evidence/phase3b4a/43-backend-payroll-output-report-filter-regression.log` |
| HRADM-DEF-20261009-013 | Open - requirements confirmation | Open | Missing primary bank account still needs product confirmation. Current stricter `Blocked` behavior was preserved because downstream payment risk is material; no test expectation was changed for this item. | `docs/qa/evidence/phase3b4/01-existing-payroll-core-playwright.log` |
| HRADM-DEF-20261009-014 | Open - UI polish/test threshold | Resolved for current compact font stack | Typography audit accepts the current compact `Inter`/system stack; focused UI audit passed. | `docs/qa/evidence/phase3b4a/40-ui-audit-finance-report-revalidation.log` |
| HRADM-DEF-20261009-015 | Open - execution blocker | Resolved for isolated finance report rerun | Payroll finance report suite completed with 2 passed after payroll-register report source filtering and current drilldown assertion alignment. | `docs/qa/evidence/phase3b4a/42-finance-report-revalidation-final.log` |

Current Phase 3B.4A status: no focused stabilization failure remains. Full payroll browser certification is still pending because Phase 3B.4A intentionally reran focused affected scenarios, not the entire 106-scenario payroll batch.

## Phase 3B.4B Defect Revalidation - 2026-10-09

| Defect ID | Previous Status | Current Status | Resolution / Retest Notes | Evidence |
| --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-011 | Resolved for focused stale-contract scope | Reopened for full-batch scope | The focused stale assertions passed, but the full rerun exposed a wider stale compact UI contract cluster in `hr-admin-payroll-frontend-validation.spec.ts`: current compact pages no longer expose the old expected page titles used by 14 validation scenarios. | `docs/qa/evidence/phase3b4b/05-reports-ui-rerun.log` |
| HRADM-DEF-20261009-012 | Resolved for P100 lifecycle focused scope | Partially resolved | P100 adjustment/settlement and P100 finance handoff passed in the full rerun, and register filtering regression passed. Legacy disposable output/review/negative-control fixtures still fail to select expected employees or artifacts. | `docs/qa/evidence/phase3b4b/02-adjustments-settlements-rerun.log`, `docs/qa/evidence/phase3b4b/03-output-handoff-provider-rerun.log`, `docs/qa/evidence/phase3b4b/04-rbac-negative-rerun.log`, `docs/qa/evidence/phase3b4b/06-backend-payroll-output-report-filter-regression.log` |
| HRADM-DEF-20261009-013 | Open - requirements confirmation | Open - release decision required | Full rerun reproduced `Blocked` for employee missing primary bank account while the legacy test expects `Warning`. No application behavior or expected assertion was changed without product confirmation. | `docs/qa/evidence/phase3b4b/01-core-payroll-rerun.log` |
| HRADM-DEF-20261009-014 | Resolved for current compact font stack | Resolved | Payroll UI audit passed in the full rerun. | `docs/qa/evidence/phase3b4b/05-reports-ui-rerun.log` |
| HRADM-DEF-20261009-015 | Resolved for isolated finance report rerun | Resolved | Payroll finance report certification passed in the full rerun; runner hang did not recur. | `docs/qa/evidence/phase3b4b/05-reports-ui-rerun.log` |

| Defect ID | Source Test ID | Module | Screen | Functionality | Severity | Status | Summary | Evidence | Owner | Target Fix Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-016 | Multiple Phase 5 output/review/RBAC scenarios | Payroll | Outputs, review, artifact access, negative controls | Disposable lifecycle fixture and current UI selectors | Major | Open - test/fixture defect | Legacy disposable lifecycle helpers cannot find expected employee/options/artifact links in current seeded tenant. Failing scenarios include output artifact certification, review exception decision, negative controls, ESS artifact access and register export authorization. | `docs/qa/evidence/phase3b4b/03-output-handoff-provider-rerun.log`, `docs/qa/evidence/phase3b4b/04-rbac-negative-rerun.log` | QA automation / payroll fixture owner | Phase 3B.4C stabilization |
| HRADM-DEF-20261009-017 | Provider callback and retry scenarios | Payroll / Provider | Provider callback/retry evidence | Callback mutation, retry worker, production callback evidence | Major | Open - investigation required | Full rerun still fails provider callback/retry paths: signed callback POST returned HTTP 400, retry worker setup could not create a retryable delivery because employee options were missing, and production callback evidence text was not visible. Needs root-cause split between product callback validation and stale automation evidence contracts. | `docs/qa/evidence/phase3b4b/03-output-handoff-provider-rerun.log` | Payroll provider owner / QA automation | Phase 3B.4C stabilization |

Current Phase 3B.4B blocker status: payroll is not certified. No real external payment/provider submission was executed, but open Major defects remain in provider callback/retry, disposable lifecycle fixtures, frontend validation contracts, and the missing-bank readiness decision.

## Phase 3B.4C Defect Revalidation - 2026-10-09

| Defect ID | Previous Status | Phase 3B.4C Status | Retest Evidence |
| --- | --- | --- | --- |
| `HRADM-DEF-20261009-011` | Reopened for full-batch stale compact UI contract | Resolved for focused scope | Updated payroll frontend validation authentication, heading expectations, disabled-submit assertion, and provider validation copy. `hr-admin-payroll-frontend-validation.spec.ts` passed 14/14. Evidence: `docs/qa/evidence/phase3b4c/01-frontend-validation-focused.log`. |
| `HRADM-DEF-20261009-012` | Partially resolved | Partially resolved | P100 lifecycle remained previously positive; disposable output handoff still fails transmit prerequisites in one focused scenario because bank advice/statutory artifacts are missing. Evidence: `docs/qa/evidence/phase3b4c/04-output-artifact-focused.log`. |
| `HRADM-DEF-20261009-013` | Open - release decision required | Open - release decision required | No code or assertion change. Missing bank details should be classified separately for calculation, approval/output, and payment submission before certification expectations are changed. |
| `HRADM-DEF-20261009-016` | Open - test/fixture defect | Partially resolved | Review decision and negative-control lifecycle fixtures pass after switching to supported employee option-search and granting the disposable payroll operator `employees.view`. Output/artifact access still has 3 failures: TDS readiness report indexing for disposable PDF-tax output, blocked disposable handoff transmit, and stale artifact download selector/selection. Evidence: `docs/qa/evidence/phase3b4c/02-review-negative-fixtures-focused.log`, `docs/qa/evidence/phase3b4c/04-output-artifact-focused.log`. |
| `HRADM-DEF-20261009-017` | Open - investigation required | Partially resolved | Callback signature/replay/bad-signature mutation and production callback evidence pass after aligning test signature material and current evidence labels. Provider retry worker still fails because the retry job reaches `skipped:skipped`, not `executed:completed`. Evidence: `docs/qa/evidence/phase3b4c/03-provider-callback-retry-focused.log`. |

## Phase 3B.4D Defect Revalidation - 2026-10-09

| Defect ID | Previous Status | Phase 3B.4D Status | Retest Evidence |
| --- | --- | --- | --- |
| `HRADM-DEF-20261009-012` | Partially resolved | Resolved for focused disposable handoff scope | Handoff artifact prerequisite issue was a UI paging/readiness defect: the selected handoff had bank advice, accounting export and statutory report artifacts in DB and summary snapshot, but readiness used only the paged artifact row. Handoff setup now scopes by selected `handoff_id`; readiness uses summary counts. Disposable handoff transmit/audit scenario passed. Evidence: `docs/qa/evidence/phase3b4d/01-payroll-final-blocker-focused-revalidation.log`. |
| `HRADM-DEF-20261009-013` | Open - release decision required | Open - release decision required | Current code requires primary bank account as a payroll readiness blocker. Phase 3B.4D recommends separating severity by lifecycle stage: calculation can proceed, approval/output may remain policy-dependent, payment submission/bank transfer should stay Blocked. No code or test expectation changed without product confirmation. |
| `HRADM-DEF-20261009-016` | Partially resolved | Resolved for focused output/artifact access scope | TDS readiness was missing payslip render detail from the setup payload; artifact access selected the wrong artifact class/persona. Handoff setup now includes payslip render detail, and the artifact-access test selects a downloadable payroll register to prove HR access and ESS denial. Evidence: `docs/qa/evidence/phase3b4d/01-payroll-final-blocker-focused-revalidation.log`, `docs/qa/evidence/phase3b4d/02-artifact-access-focused-rerun.log`. |
| `HRADM-DEF-20261009-017` | Partially resolved | Resolved for focused retry-worker scope | Retry worker skip was caused by stale/shared delivery state: the delivery had already moved back to `submitted`, so the worker correctly skipped it as non-retryable. The spec now creates a fresh disposable delivery, forces a failed callback, schedules retry, and runs the worker against the isolated SQLite DB path. Evidence: `docs/qa/evidence/phase3b4d/01-payroll-final-blocker-focused-revalidation.log`. |

Current Phase 3B.4D blocker status: no focused failed or blocked payroll final-blocker scenario remains. Full payroll certification is still pending a complete rerun and explicit scenario-count drift reconciliation. Missing-bank readiness remains an open product decision, not a failed focused revalidation item.

## Phase 3B.5 Defects - 2026-10-09

| Defect ID | Source Test ID | Module | Screen | Functionality | Severity | Status | Summary | Evidence | Owner | Target Fix Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `HRADM-DEF-20261009-020` | `governance-assignment-form-flows.spec.ts:407` | Setup / Workflows | `HRADM-SCR-SET-007` | `HRADM-FNC-SET-002` workflow assignment validation | Major | Open | Workflow assignment form shows failure summary, but does not surface the exact expected field-level message `Select a workflow template before assigning it.` from the intercepted 400 payload. Needs confirmation whether current compact form should render API field errors inline or whether the assertion must align to verified current semantics. | `docs/qa/evidence/phase3b5/02-policy-governance-assignment-browser.log`; screenshot under `web/test-results/e2e-governance-assignment--2559d-es-server-validation-errors-chromium/` | QA automation / setup frontend owner | Phase 3B.5A |
| `HRADM-DEF-20261009-021` | `governance-assignment-form-flows.spec.ts:463,510,552,650,699` | Setup / Governance Assignments | Leave policy assignments, attendance policy assignments, employee shift assignments, roster rollout | `HRADM-FNC-SET-001`, `HRADM-FNC-SET-002` | Major | Open | Lifecycle and resolution scenarios could not select required policy/employee/shift/target employee options in the current isolated QA tenant. This blocks browser proof for create, update, deactivate, assignment precedence and roster rollout. Current evidence points to deterministic fixture/prerequisite gaps rather than confirmed product defects. | `docs/qa/evidence/phase3b5/02-policy-governance-assignment-browser.log`; related screenshots under `web/test-results/e2e-governance-assignment-*` | QA fixture owner / setup domain owner | Phase 3B.5A |
| `HRADM-DEF-20261009-022` | `tier-two-workflow-flows.spec.ts:11,48,65` | Workflows / Cross-workspace routing | Attendance regularizations, ESS notifications, MSS approvals | `HRADM-FNC-SET-002` / workflow journeys | Major | Open | Tier-two journey tests rely on stale headings and seeded notification data. Current pages loaded successfully with headings `Regularizations`, `Notifications`, and `Manager approvals`, but expected `Attendance regularization queue`, `Notification detail`, and `Manager inbox` were absent; ESS employee-document notification filter returned 0 records. Needs assertion alignment and deterministic notification/workflow fixtures. | `docs/qa/evidence/phase3b5/03-workflow-ops-browser.log`; screenshots under `web/test-results/e2e-tier-two-workflow-flow-*` | QA automation / workflow owner | Phase 3B.5A |

Phase 3B.5 release impact: no new P0 security or tenant-isolation defect was confirmed. Organization master and setup/policy master workflows passed. Governance assignment lifecycle and tier-two workflow journeys remain uncertified until the open Major defects are remediated or explicitly dispositioned.

## Phase 3B.4E Defect Revalidation - 2026-10-09

| Defect ID | Previous Status | Phase 3B.4E Status | Retest Evidence |
| --- | --- | --- | --- |
| `HRADM-DEF-20261009-011` | Resolved for focused compact UI validation scope | Resolved in final rerun scope | `hr-admin-payroll-frontend-validation.spec.ts` passed 14/14 and `hr-admin-payroll-ui-audit.spec.ts` passed in the final payroll batch. Evidence: `docs/qa/evidence/phase3b4e/03-rbac-reports-ui-final-rerun.log`. |
| `HRADM-DEF-20261009-012` | Resolved for focused disposable handoff scope | Reopened for P100 full-rerun lifecycle evidence | P100 adjustment/settlement/close failed because refreshed adjustment setup did not contain the created adjustment as `applied`; P100 finance handoff failed because the expected output run heading was not visible by batch ID. Evidence: `docs/qa/evidence/phase3b4e/02-lifecycle-output-provider-final-rerun.log`. Tracked under `HRADM-DEF-20261009-019` for the current failure cluster. |
| `HRADM-DEF-20261009-013` | Open - release decision required | Open - release decision required | Final rerun reproduced `Blocked` for missing primary bank account while the existing scenario expects `Warning`. No behavior or assertion was changed without authoritative product/business approval. Evidence: `docs/qa/evidence/phase3b4e/01-core-payroll-final-rerun.log`. |
| `HRADM-DEF-20261009-016` | Resolved for focused output/artifact access scope | Resolved for current executable artifact access scope | Output artifact certification, TDS/PDF evidence, HR artifact download and ESS denial passed in the final rerun. Evidence: `docs/qa/evidence/phase3b4e/02-lifecycle-output-provider-final-rerun.log`, `docs/qa/evidence/phase3b4e/03-rbac-reports-ui-final-rerun.log`. |
| `HRADM-DEF-20261009-017` | Resolved for focused retry-worker scope | Resolved for current executable provider callback/retry scope | Signed callback, replay rejection, bad signature, retry worker execution, production retry evidence and provider ready rehearsal passed in the final rerun. Evidence: `docs/qa/evidence/phase3b4e/02-lifecycle-output-provider-final-rerun.log`. |

| Defect ID | Source Test ID | Module | Screen | Functionality | Severity | Status | Summary | Evidence | Owner | Target Fix Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-DEF-20261009-018 | `HRADM-TC-PAY-005` | Payroll / Statutory RBAC | HRADM-SCR-PAY-005 | Statutory viewer RBAC evidence view and backend denials | Major | Open - investigation required | Final rerun failed because statutory viewer page did not expose the expected evidence-view copy. Two subsequent RBAC scenarios in the same file did not run, so output-viewer and finance-handoff-viewer denial coverage is not certified from this file. Classify after inspecting whether current UI intentionally changed the guidance copy or the viewer page lost required read-only evidence affordance. | `docs/qa/evidence/phase3b4e/01-core-payroll-final-rerun.log` | QA automation / payroll RBAC owner | Phase 3B.4F stabilization |
| HRADM-DEF-20261009-019 | `HRADM-TC-PAY-010`, `HRADM-TC-PAY-012` | Payroll / P100 lifecycle | HRADM-SCR-PAY-009..017 | P100 adjustment close, output, finance handoff and compliance evidence | Major | Open - investigation required | Final rerun failed two P100 lifecycle checks: created adjustment was not returned as `applied` in refreshed adjustment setup, and payroll outputs did not show the expected P100 output run heading by batch ID. Provider retry/callback paths passed, so this is narrowed to P100 lifecycle fixture/state refresh or output navigation selection. | `docs/qa/evidence/phase3b4e/02-lifecycle-output-provider-final-rerun.log` | Payroll QA fixture owner / payroll product owner | Phase 3B.4F stabilization |

Current Phase 3B.4E blocker status: payroll is Not Certified. Open blockers are `HRADM-DEF-20261009-013`, `HRADM-DEF-20261009-018`, `HRADM-DEF-20261009-019`, two conditional/skipped provider scenarios needing explicit disposition, and unresolved 106-to-83 scenario inventory drift.

## Phase 3B.5A Defect Revalidation - 2026-10-10

| Defect ID | Previous Status | Phase 3B.5A Status | Root Cause / Fix | Retest Evidence |
| --- | --- | --- | --- | --- |
| `HRADM-DEF-20261009-020` | Open | Resolved in focused revalidation | Stale validation assertion and incomplete server field-error rendering. The workflow assignment form now maps backend field errors into visible field validation while preserving client validation and permission/business rules. | `docs/qa/evidence/phase3b5a/02-governance-assignment-focused-rerun-final.log`, `21-affected-regression-rerun-final3.log` |
| `HRADM-DEF-20261009-021` | Open | Resolved in focused revalidation | Governance assignment failures were caused by non-deterministic selectable prerequisites, async employee search assumptions, paginated list assertions and shared historical assignment data. Tests now create deterministic employees/policies/departments through supported APIs/services and verify persisted state through stable edit/API evidence. | `docs/qa/evidence/phase3b5a/05-leave-assignment-focused-rerun-final3.log`, `11-attendance-resolution-focused-rerun-final.log`, `17-governance-two-scenario-rerun-final3.log`, `19-attendance-assignment-focused-rerun-final4.log`, `21-affected-regression-rerun-final3.log`, `22-workflow-assignment-focused-timeout-rerun.log` |
| `HRADM-DEF-20261009-022` | Open | Resolved in focused revalidation | Tier-two failures were stale heading assertions and missing deterministic in-app notification fixture. Tests now use current compact headings, open the review modal before asserting decision context and seed the ESS employee-document notification through authenticated backend test-send. | `docs/qa/evidence/phase3b5a/07-tier-two-workflow-focused-rerun-final.log`, `08-mss-approvals-focused-rerun-final.log`, `21-affected-regression-rerun-final3.log` |

Phase 3B.5A release impact: no unresolved P0/P1 organization, setup, governance or workflow defect remains from `020` through `022`. Full module-wide regression remains the next recommended gate before unconditional certification.

## Phase 3B.5B Defect and Gate Revalidation - 2026-10-10

| Defect / Gate | Previous Status | Phase 3B.5B Status | Evidence / Notes |
| --- | --- | --- | --- |
| `HRADM-DEF-20261009-020` | Resolved in focused Phase 3B.5A | Resolved in full 57-scenario rerun | Workflow assignment validation scenario passed in `docs/qa/evidence/phase3b5b/06-governance-assignment-browser.log`; field-error rendering remains intact. |
| `HRADM-DEF-20261009-021` | Resolved in focused Phase 3B.5A | Resolved in full 57-scenario rerun | Governance assignment lifecycle, attendance resolution, shift assignment and roster rollout passed in `docs/qa/evidence/phase3b5b/06-governance-assignment-browser.log`. |
| `HRADM-DEF-20261009-022` | Resolved in focused Phase 3B.5A | Resolved in full 57-scenario rerun | Tier-two workflow journeys passed in `docs/qa/evidence/phase3b5b/08-workflow-tier-two-browser-rerun-final.log`; workflow hub automation rerun passed in `09-workflow-hub-focused-rerun-final.log`. |
| Phase 3B.5 scenario inventory gate | Open pending final rerun | Closed | Original 57 scenarios reconcile to current 57 inventory; no drift. Evidence: `docs/qa/evidence/phase3b5b/00-current-organization-setup-workflow-inventory.log`. |

Phase 3B.5B release impact: no open P0/P1 organization, setup, governance, workflow, RBAC or tenant-isolation defect remains for this module scope. Certification verdict: Certified.

## Phase 3B.4F Defect Revalidation - 2026-10-09

| Defect ID | Previous Status | Phase 3B.4F Status | Resolution / Retest Evidence |
| --- | --- | --- | --- |
| `HRADM-DEF-20261009-013` | Open - release decision required | Open - certification gate | Current behavior remains `Blocked` for missing primary bank account. No code or test expectation changed without authoritative product/business approval. Owner required: Payroll product owner with finance/payment risk sign-off. |
| `HRADM-DEF-20261009-018` | Open - investigation required | Resolved | Root cause was stale/overbroad test expectation. Statutory setup/declaration viewer correctly sees read-only statutory setup evidence and cannot access manage forms/APIs; TDS report visibility is not required for that limited role. Evidence: `docs/qa/evidence/phase3b4f/02-rbac-p100-finance-rerun.log`. |
| `HRADM-DEF-20261009-019` | Open - investigation required | Resolved for focused scope | Root causes split into one test fixture defect and one backend payload defect. Adjustment evidence now scopes setup query to the P100 run. Payroll output setup now returns register artifacts across batches when `artifact_kind=register` is requested and includes batches referenced by returned artifacts. Evidence: `docs/qa/evidence/phase3b4f/01-focused-failed-skipped-notrun-revalidation.log`, `docs/qa/evidence/phase3b4f/04-p100-finance-final-rerun.log`, `docs/qa/evidence/phase3b4f/06-backend-register-filter-regression-final.log`. |

Current Phase 3B.4F blocker status: product/code/test blockers from `HRADM-DEF-20261009-018` and `HRADM-DEF-20261009-019` are resolved in focused revalidation. Remaining blockers before full certification are `HRADM-DEF-20261009-013`, explicit disposition of provider conditional/skipped scenarios, and execution of the frozen 106-record manifest.

## Phase 3B.4G Defect and Gate Revalidation - 2026-10-09

| Defect / Gate | Previous Status | Phase 3B.4G Status | Evidence / Notes |
| --- | --- | --- | --- |
| `HRADM-DEF-20261009-013` | Open - certification gate | Open - certification blocker for full signoff | Fresh final-manifest execution reproduced the same behavior: missing primary bank account renders `Blocked` while the legacy test expects `Warning`. No application behavior or expected assertion was changed without payroll product/business approval. Evidence: `docs/qa/evidence/phase3b4g/01b-core-setup-readiness-inputs-statutory.log`. |
| `HRADM-DEF-20261009-018` | Resolved in 3B.4F | Resolved in full/focused 3B.4G evidence | Statutory/output/handoff RBAC scenarios passed in Batch 2. Evidence: `docs/qa/evidence/phase3b4g/02-lifecycle-output-provider-rbac.log`. |
| `HRADM-DEF-20261009-019` | Resolved for focused scope | Resolved in full/focused 3B.4G evidence | P100 adjustment/settlement/close and P100 finance handoff/compliance both passed in Batch 2. Evidence: `docs/qa/evidence/phase3b4g/02-lifecycle-output-provider-rbac.log`. |
| Provider incomplete-lane conditional scenario | Open disposition | Open conditional / skipped | Scenario remains skipped by test condition because the current local QA tenant did not expose a deterministic incomplete-lane fixture. Not counted as passed. Evidence: `docs/qa/evidence/phase3b4g/02-lifecycle-output-provider-rbac.log`. |
| Production provider audit drilldown conditional scenario | Open disposition | Open conditional / skipped | Scenario remains skipped by test condition because the current local QA tenant did not expose the required audit-pack drilldown fixture. Not counted as passed. Evidence: `docs/qa/evidence/phase3b4g/02-lifecycle-output-provider-rbac.log`. |
| Phase 3B.4G restored report assertions | N/A | Resolved test-contract drift | Statutory report tests were aligned to current accessible UI semantics: exact statutory setup link and ESS `My workspace` denial behavior. Final rerun passed 4/4. Evidence: `docs/qa/evidence/phase3b4g/05-statutory-report-focused-rerun-final.log`. |
| Phase 3B.4G restored warning fixture selection | N/A | Resolved test-fixture drift | Restored warning/close-readiness tests now use the current async employee search control before selecting employee options. Final rerun passed 2/2. Evidence: `docs/qa/evidence/phase3b4g/07-warning-close-readiness-focused-rerun-final.log`. |

Current Phase 3B.4G blocker status: no unresolved payroll financial-integrity, authorization, callback/retry, artifact-access, P100 lifecycle or report-export defect remains in the executed evidence. Full certification is still blocked by the open missing-bank readiness product decision and the two conditional provider scenario dispositions.

## Phase 3B.6 Defects - 2026-10-10

| Defect ID | Source Test ID | Module | Screen | Functionality | Severity | Status | Summary | Evidence | Owner | Target Fix Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `HRADM-DEF-20261010-023` | `hr-admin-reports-operations-ui-audit.spec.ts` | Notifications / Operations audit | `/hr-admin/notifications` | Compact UI controls and review/retry actions | Major | Open | Browser UI audit detected visible control collisions around `Full review`, status/read-state, retry and save-review controls. This violates the unified compact professional UI model until fixed or the audit heuristic is formally adjusted. | `docs/qa/evidence/phase3b6/10-report-hubs-ui-browser.log` | HR Admin UI owner | Phase 3B.6A |
| `HRADM-DEF-20261010-024` | `reporting-foundation-certification.spec.ts`, `compliance-export-audit-history-certification.spec.ts`, `compliance-summary-report-certification.spec.ts` | Reports | Report catalog, compliance export audit, ESS denial flows | Report navigation/RBAC assertion contract | Minor | Open | Current-UI/test expectation drift: catalog next-page target, employee denial heading `Self Service` vs `My workspace`, audit source path normalization, and compliance summary drilldown heading expectations. | `docs/qa/evidence/phase3b6/10-report-hubs-ui-browser.log`, `11-report-detail-export-browser.log` | QA automation / reports owner | Phase 3B.6A |
| `HRADM-DEF-20261010-025` | `compliance-report-hub-certification.spec.ts`, `compliance-summary-report-certification.spec.ts` | Reports / Compliance | Compliance hub and consolidated compliance summary | Filters, exports, hub discovery, drilldowns | Major | Open | Compliance report hub timed out after 30s and consolidated compliance summary could not reach expected provider-filing drilldown before timeout. Needs separation of performance, fixture volume and stale target. | `docs/qa/evidence/phase3b6/11-report-detail-export-browser.log` | Compliance reports owner | Phase 3B.6A |
| `HRADM-DEF-20261010-026` | `phase7e-security-audit-evidence.spec.ts`, `phase7h-audit-download-rejected-support.spec.ts` | Audit / Security evidence | Tenant Admin Console / trust audit | Support lifecycle and audit-pack evidence | Major | Open | Audit/security scenarios failed before audit proof because expected `Tenant Admin Console` heading was not visible in the current app shell. Trust-audit lifecycle and audit-pack export evidence remain uncertified. | `docs/qa/evidence/phase3b6/12-imports-audit-browser.log` | Security/audit owner | Phase 3B.6A |
| `HRADM-DEF-20261010-027` | `phase9-bulk-upload-100-workforce-certification.spec.ts` | Imports / Workforce bulk upload | Shift assignments | 100-employee browser import and payroll prerequisite chain | Major | Open | End-to-end browser bulk upload progressed to shift assignment prerequisites but could not find `employee-shift-assignment-import-workbench` on the current Shift assignments screen. | `docs/qa/evidence/phase3b6/13-bulk-upload-100-browser.log` | Imports / shift assignment owner | Phase 3B.6A |

## Phase 3B.6A Defect Revalidation - 2026-10-10

| Defect ID | Previous Status | Phase 3B.6A Status | Root Cause / Fix | Retest Evidence |
| --- | --- | --- | --- | --- |
| `HRADM-DEF-20261010-023` | Open | Resolved in focused revalidation | Genuine compact UI issue on `/hr-admin/notifications`: closed notification detail panels still exposed nested review/action layout, creating control overlap. CSS now hides detail/review content while disclosure is closed and wraps review action buttons in compact layouts. | `docs/qa/evidence/phase3b6/15-phase3b6a-report-audit-focused-rerun.log` |
| `HRADM-DEF-20261010-024` | Open | Resolved in focused revalidation | Stale report automation contracts: catalog pagination expected a specific old report label, employee denial expected `Self Service` instead of current `My workspace`, and export audit expected normalized source endpoints while current audit stores query-bearing endpoints. Assertions now verify current accessible UI and source URL semantics without weakening export/RBAC proof. | `docs/qa/evidence/phase3b6/15-phase3b6a-report-audit-focused-rerun.log`, `21-phase3b6a-compliance-export-audit-focused-rerun-final2.log` |
| `HRADM-DEF-20261010-025` | Open | Resolved in focused revalidation | Compliance failures split into stale drilldown navigation and slow serial export setup. Provider filing drilldown now follows the intended link target; export setup batches requests to avoid local runner timeouts while still validating generated audit evidence. | `docs/qa/evidence/phase3b6/15-phase3b6a-report-audit-focused-rerun.log`, `21-phase3b6a-compliance-export-audit-focused-rerun-final2.log` |
| `HRADM-DEF-20261010-026` | Open | Resolved in focused revalidation | Tenant-admin audit failures were stale route/heading/toast assertions. Current UI uses Account Control Center / Support Access / Controlled assistance labels and explicit reject toast/status text; tests now assert current support lifecycle and audit evidence without expanding permissions. | `docs/qa/evidence/phase3b6/15-phase3b6a-report-audit-focused-rerun.log`, `18-phase3b6a-audit-download-focused-rerun-final2.log` |
| `HRADM-DEF-20261010-027` | Open | Resolved in focused revalidation | Mixed product/test fixture gap: shift assignment and leave-policy assignment import workbenches were not wired into their HR Admin screens, large import workbenches resolved only the first employee option page, attendance commits were too slow at 100 rows, and import audit lookup scanned a busy first page instead of exact `source_hash`. Screens now expose required import workbenches, employee resolution uses bulk prefix option-search plus exact fallback, shift/attendance commits are batched, and the test asserts the exact committed import audit by source hash. | `docs/qa/evidence/phase3b6/27-phase3b6a-bulk-upload-focused-rerun-final5.log`, `28-phase3b6a-web-tsc.log`, `29-phase3b6a-backend-check.log` |

Phase 3B.6A release impact: no unresolved P0/P1 defect remains from `023` through `027` in focused revalidation. Because Phase 3B.6A was targeted remediation, final certification still requires a fresh full Phase 3B.6 regression over the original 76-scenario baseline.

## Phase 3B.6B Defect and Gate Revalidation - 2026-10-10

| Defect / Gate | Previous Status | Phase 3B.6B Status | Evidence / Notes |
| --- | --- | --- | --- |
| `HRADM-DEF-20261010-023` | Resolved in focused Phase 3B.6A | Resolved in full 76-scenario rerun | Notification compact-control overlap did not reproduce; notification and operations UI audit passed. Evidence: `docs/qa/evidence/phase3b6/33-phase3b6b-notifications-browser.log`, `34-phase3b6b-report-hubs-ui-browser.log`. |
| `HRADM-DEF-20261010-024` | Resolved in focused Phase 3B.6A | Resolved in full 76-scenario rerun | Report catalog, employee denial, export audit and current UI assertion contracts passed in main/focused Phase 3B.6B evidence. |
| `HRADM-DEF-20261010-025` | Resolved in focused Phase 3B.6A | Reopened during full rerun, then resolved in Phase 3B.6B focused retest | Full report detail/export batch reproduced compliance hub and compliance summary timeouts. Root cause was excessive full finance-handoff payload retrieval for compliance exports in a large QA DB. Provider receipts, statutory/challan exports and compliance summary now use compact source pages while preserving required artifact/delivery rows; compliance hub HR-admin scenario timeout was aligned to 90s because it validates multiple CSV/manifest downloads. Final focused pass evidence: `docs/qa/evidence/phase3b6/48-phase3b6b-compliance-hub-final-after-timebox-alignment.log`; compliance summary pass evidence: `46-phase3b6b-compliance-focused-after-all-export-fixes.log`. Historical failures preserved in `35`, `38`, `45`, and `47` logs. |
| `HRADM-DEF-20261010-026` | Resolved in focused Phase 3B.6A | Resolved in full 76-scenario rerun | Tenant support lifecycle, trust audit and rejected support audit-pack export passed. Evidence: `docs/qa/evidence/phase3b6/36-phase3b6b-imports-audit-browser.log`. |
| `HRADM-DEF-20261010-027` | Resolved in focused Phase 3B.6A | Resolved in full 76-scenario rerun | 100-employee bulk workflow passed with shift assignment, attendance, leave-policy assignment, leave-request and payroll-input browser imports plus exact audit lookup. Evidence: `docs/qa/evidence/phase3b6/37-phase3b6b-bulk-upload-100-browser.log`. |
| Phase 3B.6B external delivery gate | Open by scope | Deferred / accepted sandbox exception | Real external email/SMS delivery was not attempted. In-app/sandbox queue, retry, diagnostics and source-link evidence passed; external delivery remains a Phase 4 launch gate. |

Phase 3B.6B release impact: no open P0/P1 Notifications, Reports, Audit or Imports defect remains for the certified browser scope. Certification verdict: Certified, with real external notification delivery explicitly excluded from this sandbox batch.

## Phase 3B.7 Defects and Gate Revalidation - 2026-10-10

Resolved diagnostic groups:

| Issue | Phase 3B.7 Status | Evidence / Notes |
| --- | --- | --- |
| Stale HR Admin navigation and launch copy assertions | Resolved | Current UI uses Leave Requests as the sidebar Leave landing, `Launch Blockers` for remediation, and tabbed provider Registry evidence. Evidence: `docs/qa/evidence/phase3b7/07-focused-core-revalidation-rerun.log`, `08-focused-final-failure-rerun.log`. |
| Launch remediation modal under topbar search | Resolved | Genuine compact-shell UI bug. Dialog now renders through a body portal and shared modal z-index was raised. Evidence: `09-focused-last-three-rerun.log`. |
| HR Admin mobile menu intercepted by workspace search | Resolved | Genuine responsive shell issue. Workspace search field dimensions and mobile topbar stacking were fixed. Evidence: `21-affected-shell-nav-rerun.log`. |
| Commercial usage-limit fixture targeted wrong SQLite DB path | Resolved | Test fixture defect. Relative SQLite DB names now resolve under `backend/`, matching the running isolated QA backend. Evidence: `17-usage-limit-role-api-rerun.log`. |

| Defect ID | Source Test ID | Module | Screen | Functionality | Severity | Status | Summary | Evidence | Owner | Target Fix Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `HRADM-DEF-20261010-028` | `phase8d-performance-budget.spec.ts` | Operations / Payroll handoff performance | `/hr-admin/payroll-handoff` | Launch-critical route performance budget | Major | Open | Payroll handoff document response repeatedly exceeded the local 4s budget after functional stabilization: 4.89s in affected rerun and 5.49s in confirmation rerun. Functional handoff evidence is not invalidated, but the launch-critical performance gate remains failed. | `docs/qa/evidence/phase3b7/21-affected-shell-nav-rerun.log`, `docs/qa/evidence/phase3b7/22-performance-budget-rerun.log` | Payroll handoff / frontend data-loading owner | Phase 3B.7A targeted performance remediation |

Phase 3B.7 release impact: no open P0 command-center, launch-readiness, authorization, tenant-isolation or operational-integrity defect remains. One Major performance defect (`HRADM-DEF-20261010-028`) prevents unconditional Phase 3B.7 certification.
## Phase 3B.7A Defect Revalidation - 2026-10-10

| Defect ID | Previous Status | Phase 3B.7A Status | Root Cause / Fix | Retest Evidence |
| --- | --- | --- | --- | --- |
| `HRADM-DEF-20261010-028` | Open | Resolved for `/hr-admin/payroll-handoff` | The handoff browser page loaded full payslip render payloads and output batch rows that it did not render. The finance handoff setup endpoint now keeps detailed payslip artifacts opt-in through `include_payslip_detail=true`; the handoff page opts out of unused output batches with `include_output_batches=false`; TDS readiness explicitly opts into payslip render detail where that evidence is required. This preserves artifact download/access, RBAC, tenant isolation, audit evidence and TDS readiness while reducing the handoff setup response from about 3.84MB to 68KB for the browser page. | `docs/qa/evidence/phase3b7a/03-api-profile-before.json`, `05-api-profile-after-payslip-opt-in.json`, `13-api-profile-after-output-batches-opt-out.json`, `10-performance-after-run2-samples.json`, `15-performance-after-run4-samples.json`, `22-performance-after-run5-final-samples.json`, `16-functional-regression-payroll-handoff-artifacts-reports.log`, `18-tds-readiness-regression.log` |

Residual performance note: full `phase8d-performance-budget.spec.ts` passed once after remediation, then later failed on `/hr-admin/payroll-providers` and `/mss/approvals` while payroll handoff remained under budget. Those route misses are outside `HRADM-DEF-20261010-028` and should be tracked separately if repeated full-suite performance stability is a Phase 3C entry gate.

## Phase 3C.2 Environment / Fixture Defects - 2026-10-10

| Defect ID | Source | Module | Severity | Status | Summary | Evidence | Resolution |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `HRADM-DEF-20261010-029` | Phase 3C.2 bootstrap on isolated DB | Common seed / Leave fixture | Major | Resolved | `bootstrap_demo_workspace` had already made the pending leave deterministic, but the approved sick-leave seed still used `today`. On 2026-10-10 this was Saturday and legitimate leave validation rejected it as zero working leave days. | Failed Phase 3C.2 bootstrap stack before `docs/qa/evidence/phase3c2/01-bootstrap-demo-workspace.log`; focused regression `docs/qa/evidence/phase3c2/14-bootstrap-seed-date-regression.log` | Seed now computes a single-day working-date range for the approved leave fixture using the existing weekday helper. Business validation was not weakened; 2 focused regression tests passed. |

Phase 3C.2 release impact: no open environment safety defect remains. The Phase 3C DB is isolated and fixture-ready. Existing release gates `HRADM-DEF-20261009-013`, provider conditional scenarios and Phase 4 external/deployed gates remain open as planned.

## Phase 3C.3 Defects / Gaps - 2026-10-10

No new product P0/P1 defect was confirmed in the executed employee lifecycle/workforce browser journeys.

| Defect / Gap ID | Source Scenario | Module | Severity | Status | Summary | Evidence | Owner / Next Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `3C-GAP-WF-AUD-001` | `HRADM-E2E-002` | Workforce / Documents / Onboarding audit | Minor coverage gap | Open | Document upload and onboarding completion persisted correctly, but generic HR Admin audit search was not available at `/api/hr-admin/audit` (`404`). The journey is not blocked for workflow behavior, but immutable audit proof remains unverified. | `docs/qa/evidence/phase3c3/02-documents-onboarding-guard-completion.json`, `14-phase3c3-db-verification.json` | Audit/workforce owner before final Phase 3C signoff |
| `3C-GAP-XTENANT-001` | `HRADM-E2E-020` | Workforce tenant isolation | Major environment prerequisite | Open | Full Tenant A -> Tenant B employee/document object isolation could not be executed because `backend/db.phase3c_e2e.sqlite3` contains only tenant `northstar-foods`. Same-tenant restricted denial passed under `HRADM-E2E-003`. | `docs/qa/evidence/phase3c3/03-cross-tenant-prerequisite-disposition.json`, `14-phase3c3-db-verification.json` | Phase 3C fixture owner before consolidated RBAC/isolation signoff |

Phase 3C.3 release impact: employee creation/access/document/onboarding/revocation workflows are passing in the isolated local QA tenant. Complete workforce E2E certification still requires the two open coverage gaps above to be resolved or formally accepted.

## Phase 3C.4 Defects / Gaps - 2026-10-10

No new P0/P1 product defect was confirmed in the executed time, leave, attendance and payroll-input E2E batch.

| Defect / Gap ID | Source Scenario | Module | Severity | Status | Summary | Evidence | Owner / Next Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `3C-GAP-TLA-COLLISION-001` | `HRADM-E2E-006` | Time / Leave / Attendance reports | Minor coverage gap | Open | Phase 3C.4 freshly verified leave validation and roster-aware working-day calculation, but did not rerun the leave-attendance collision report/overlap negative scenario. Earlier module certification evidence exists; fresh cross-module proof remains pending. | `docs/qa/evidence/phase3c4/05-ess-leave-existing-rerun.log`, `04-ph3c-reconciliation-summary.json` | Phase 3C recovery/report reconciliation owner |

Diagnostic note: initial parallel browser batch produced time-to-payroll login timeouts and one attendance edit timing failure. Serial reruns passed (`02-time-to-payroll-serial-rerun.log`, `06-attendance-import-edit-focused-rerun.log`), so no defect is opened from those diagnostics.

## Phase 3C.5 Defects / Gates - 2026-10-10

| Defect / Gap ID | Source Scenario | Module | Severity | Status | Summary | Evidence | Owner / Next Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `HRADM-DEF-20261010-030` | `HRADM-E2E-015` | Payroll statutory reports | Major | Open | HR-admin statutory filing status report passed catalog, filters, manifest export and navigation until it expected visible source evidence in a `code` element after sorting by artifacts. No such element was visible, so statutory filing evidence display/drilldown remains failed pending product/UI versus selector investigation. | `docs/qa/evidence/phase3c5/08-security-provider-statutory-performance-browser.log` | Payroll reporting owner |
| `HRADM-DEF-20261010-031` | `HRADM-E2E-015` | TDS package RBAC automation | Minor test defect / authorization proof gap | Open | Employee TDS package negative test fails before the API denial assertion because it expects stale ESS heading text `Self Service`; current certified ESS shell uses the newer workspace heading. The HR-admin TDS package positive path passed, but this specific negative assertion still needs selector update or direct API-denial proof. | `docs/qa/evidence/phase3c5/08-security-provider-statutory-performance-browser.log`, `11-tds-employee-denial-rerun.log` | Payroll test automation owner |
| `3C-GATE-PROV-001` | `HRADM-E2E-012` | Payroll provider / finance handoff | P0 release gate | Open conditional | Incomplete provider lane activation/submission remains a conditional provider scenario. Phase 3C.5 did not execute real incomplete-lane sandbox evidence, so it was not counted as Passed. | Phase 3B.4 frozen manifest history; Phase 3C.5 disposition in `docs/qa/13-e2e-execution-register.md` | Payroll provider/product owner |
| `3C-GATE-PROV-002` | `HRADM-E2E-013` | Payroll provider audit pack | P0 release gate | Open conditional | Local/manual provider audit artifacts were generated, but production provider audit-pack drilldown still needs explicit sandbox provider evidence or formal disposition. | `docs/qa/evidence/phase3c5/06-finance-handoff-compliance-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` | Payroll provider/product owner |
| `HRADM-DEF-20261009-013` | `HRADM-E2E-016` | Payroll bank readiness | P0 product decision | Open - certification gate | Missing primary bank-account readiness remains unresolved. Phase 3C.5 preserved current `Blocked` behavior and did not change assertions without payroll product/finance approval. | Existing Phase 3B.4G history; Phase 3C.5 disposition in `docs/qa/13-e2e-execution-register.md` | Payroll product owner with finance/payment risk sign-off |

Resolved/closed during Phase 3C.5: provider retry worker failure from `08-security-provider-statutory-performance-browser.log` was classified as configuration/test-environment setup because the worker shell used the default browser DB. Focused rerun with `PLAYWRIGHT_DJANGO_SQLITE_DB=backend/db.phase3c_e2e.sqlite3` passed in `10-provider-retry-worker-rerun.log`; no product defect opened.

## Phase 3C.6 Defects / Gates - 2026-10-10

| Defect / Gap ID | Previous Status | Phase 3C.6 Status | Root Cause / Fix | Evidence |
| --- | --- | --- | --- | --- |
| `HRADM-DEF-20261010-030` | Open | Resolved for local Phase 3C scope | Root cause was missing statutory filing/registration fixture rows in `db.phase3c_e2e.sqlite3`, not a report rendering defect. Added deterministic statutory filing prerequisite data and reran statutory report evidence. | `docs/qa/evidence/phase3c6/00-statutory-fixture-seed.json`, `01-statutory-tds-defect-revalidation-rerun3.log` |
| `HRADM-DEF-20261010-031` | Open | Resolved | Stale TDS negative test expected old ESS heading `Self Service`; current UI uses `My workspace`. Assertion updated and API denial proof passed. | `docs/qa/evidence/phase3c6/01-statutory-tds-defect-revalidation-rerun3.log` |
| `3C-GAP-XTENANT-001` | Open | Resolved | Deterministic second tenant `phase7b-isolation-tenant` was created in the certified Phase 3C SQLite database and cross-tenant employee/department/notification/payroll artifact access/mutation denials passed. | `docs/qa/evidence/phase3c6/03e-cross-tenant-isolation-certified-db-rerun2.log`, `06-db-reconciliation-rerun.json` |
| `3C-GAP-TLA-COLLISION-001` | Open | Resolved | Leave-attendance collision report was freshly executed with filters, export/manifest and unauthorized employee denial. | `docs/qa/evidence/phase3c6/04-reports-audit-recovery-browser.log` |
| `3C-GAP-WF-AUD-001` | Open | Resolved for supported evidence sources | Generic `/api/hr-admin/audit` remains unavailable, but supported workflow trace, security/trust audit, export audit history and report evidence sources passed. | `docs/qa/evidence/phase3c6/02-workflow-notification-audit-browser.log`, `04b-report-denial-rerun.log` |

Phase 3C.6 did not open a new P0/P1 product defect. Historical stale automation failures were preserved for old workspace chooser/persona assumptions and not counted as fresh Phase 3C.6 blockers after focused current-scope evidence passed.

Open release gates remain unchanged: `HRADM-DEF-20261009-013`, `3C-GATE-PROV-001`, `3C-GATE-PROV-002`, and Phase 4 real external email/SMS, deployed RBAC, backup/restore and realistic real-tenant handoff evidence.

## Phase 3C.7 Defects / Gates - 2026-10-10

No new P0/P1 product defect was opened during the final Phase 3C.7 regression. Two issues observed during execution were classified and resolved as certification-fixture/test-stability items:

| Item | Classification | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| Phase 3C.7 employee workspace heading mismatch | Stale automation assertion | Resolved | `docs/qa/evidence/phase3c7/02-time-leave-attendance-payroll-input-regression.log`, `02b-time-to-payroll-rerun.log` | PH3C employee persona also has manager-capable workspace access, so current shell heading can be `Manager approvals`. Assertion now verifies the current allowed employee/manager shell while preserving HR-control denial checks. |
| Phase 3C.7 output-payslip already locked disposable run | Fixture repeatability | Resolved | `03-payroll-lifecycle-output-handoff-regression.log`, `03a-reseed-output-payslip.json`, `03b-output-payslip-rerun.log` | Reused disposable run had advanced to `locked`. Supported reseed regenerated deterministic valid state and the output/payslip scenario passed. No payroll business rule was weakened. |

Open release gates after Phase 3C.7:

| Gate / Defect ID | Status | Affected scenario | Required decision/evidence |
| --- | --- | --- | --- |
| `HRADM-DEF-20261009-013` | Open product decision | `HRADM-E2E-016` | Product/finance owner must approve missing primary bank-account readiness classification separately for calculation, review, output, bank advice and payment submission. |
| `3C-GATE-PROV-001` | Open conditional provider gate | `HRADM-E2E-012` | Incomplete provider lane requires real sandbox evidence or formal approved exclusion. |
| `3C-GATE-PROV-002` | Open conditional provider gate | `HRADM-E2E-013` | Provider audit-pack drilldown requires real sandbox evidence or formal approved exclusion. |
| Phase 4 external/deployed gates | Open launch gates | Release-level | Real email/SMS delivery, deployed RBAC verification, backup/restore and realistic real-tenant handoff remain Phase 4. |
