# Pilot 100 Execution Tracker

Generated: 2026-09-12  
Plan source: `docs/qa/full-realistic-payroll-run-100-employees-phase-plan-2026-09-12.md`  
Execution model: real-user browser run, phase by phase, with positive and negative scenarios in every touched area.

## Execution Rule

Do not move to the next phase until the current phase is green or has a documented accepted limitation.

If a phase fails:

1. Stop phase progression.
2. Capture screenshot, video, API response, console/page errors, and exact data ids.
3. Classify the failure:
   - Product defect.
   - Test automation defect.
   - Seed/data defect.
   - Environment/deployment defect.
   - Accepted business limitation.
4. Fix the issue in the smallest responsible layer.
5. Rerun the failed scenario.
6. Rerun the phase smoke for impacted pages.
7. Update this tracker with result and confidence.

## Test Personas

| Persona | Positive Role | Negative Checks |
|---|---|---|
| Platform admin | Tenant and plan readiness, entitlement checks | Must not access employee payslips/payroll artifacts unless explicitly allowed. |
| HR admin | Full HR/payroll setup and operation | Must not cross tenant boundary. |
| Payroll finance manager | Payroll reports, handoff, bank advice, statutory reports | Must not mutate HR-only master data if role forbids it. |
| Manager | Direct-report leave/attendance approvals | Must not see non-reporting employees. |
| Employee | ESS payslip, documents, leave, statutory declarations | Must not see other employee data or HR admin reports. |
| Unauthenticated user | Login redirect only | Must not access app/API data. |

## Phase Gate Summary

| Phase | Name | Status | Positive Scope | Negative Scope | Rerun Rule |
|---|---|---|---|---|---|
| P100-0 | Safety and data strategy | Passed - seed manifest pending | Tenant, services, route health, manifest strategy | No accidental mutation of canonical data | Rerun route/auth smoke after any environment change. |
| P100-1 | Organization masters | Passed with observations | Create/search/edit/deactivate masters | Required fields, duplicates, inactive dropdown exclusion | Rerun employee create dropdown checks after master fix. |
| P100-2 | Policy and payroll setup | Not started | Salary, leave, attendance, statutory, pay group, provider config | Duplicate setup, missing required config, invalid formulas | Rerun payroll setup and report catalog checks. |
| P100-3 | 100 employees and access matrix | Not started | 100 employees, manager hierarchy, pay/bank/statutory assignment | Role denial, invalid bank, missing mapping | Rerun directory, employee detail, manager/ESS access checks. |
| P100-4 | Attendance/leave/lifecycle inputs | Not started | ESS/MSS/HR inputs for scenario distribution | Unauthorized approvals, invalid dates, rejected requests | Rerun affected input and report checks. |
| P100-5 | Payroll input snapshot and lock | Not started | Snapshot, issue review, lock | Blocker lock denial, locked mutation denial | Rerun input snapshot setup and payroll input exception report. |
| P100-6 | Calculation and review | Not started | Draft calculation, line review, exceptions, decisions | Invalid lock, unauthorized decision, stale calculation | Rerun calculation/review/report pack. |
| P100-7 | Adjustments, settlements, readiness | Not started | Adjustments, FNF, close readiness | Duplicate source ref, invalid approval, blocked close | Rerun adjustments/settlements/close readiness reports. |
| P100-8 | Outputs, payslips, ESS proof | Not started | Generate/publish outputs, read/download payslips | Cross-employee payslip denial, revoked/expired grants | Rerun output, ESS, payslip publication, artifact audit tests. |
| P100-9 | Finance handoff/provider evidence | Not started | Bank advice, delivery, retries, callbacks, audit pack | Failed provider/retry/dead-letter visibility | Rerun handoff, bank advice, finance exception reports. |
| P100-10 | Full report/export regression | Not started | Every report page, CSV, manifest, export audit | Employee denial for every HR report/API | Rerun full report pack after any report fix. |
| P100-11 | Security/isolation | Not started | Role scoped access works | Cross-role, cross-tenant, direct API denial | Rerun impacted role matrix plus no-leak checks. |
| P100-12 | UX/performance | Not started | Desktop/mobile, tabs, sidebar, pagination, keyboard | Overflow, overlap, slow route, unusable table | Rerun visual/performance after UI changes. |
| P100-13 | Evidence and sign-off | Not started | Evidence pack, run ids, export ids, cleanup decision | No cleanup before evidence review | Rerun sign-off summary after any late rerun. |

## Phase P100-0: Safety And Data Strategy

Real-user intent:

An implementation lead wants confidence that the test will not corrupt existing tenant data and that the app is ready for a long payroll rehearsal.

Positive scenarios:

- Platform admin can locate or create the pilot rehearsal tenant.
- HR admin can open all major workspaces.
- Reports catalog opens and shows payroll reports.
- Staging/local services are active.
- Seed manifest location is writable.
- Data prefix is agreed: `PILOT100_YYYYMMDD`.

Negative scenarios:

- Unauthenticated user is redirected to login for HR admin pages.
- Employee cannot open HR admin pages.
- Missing seed manifest blocks mutation-heavy phases.
- Missing entitlements block the run before employee creation.

Observations to record:

- Tenant code.
- Data prefix.
- Environment.
- Service health.
- Any route or sidebar confusion a real admin would hit.

Exit gate:

- Go for seed-manifest implementation before mutation-heavy testing.

Execution result - 2026-09-12:

- Environment: staging, `https://hrms.accerio.in`.
- Deployed commit certified: `7e8f7c1ceaba05c891aea93e8302e087776dc395`.
- Service health: `hrms-payroll-web.service` active, `hrms-payroll-backend.service` active.
- Browser automation: passed `6/6`.
- Command:
  - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/reporting-foundation-certification.spec.ts tests/e2e/phase7a-role-access-boundaries.spec.ts --workers=1 --reporter=line --timeout=720000`
- Positive evidence:
  - HR admin report catalog filters, tabs, pagination, drilldown, and CSV export work.
  - Protected workspaces redirect unauthenticated users to login.
  - Low-privilege workspace chooser hides privileged access.
  - Sensitive payroll artifact and support routes deny wrong or missing sessions.
- Negative evidence:
  - Employee cannot directly access HR admin report catalog or report exports.
  - Cross-role pages fail closed for employee, manager, HR admin, and platform admin combinations.
- Real-user observation:
  - The safety/auth/report foundation is usable enough to continue, but a real pilot run must not start by manually creating 100 employees without a manifest and cleanup strategy. The next phase should create a repeatable `PILOT100_YYYYMMDD` seed manifest with tenant, employee, manager, role, payroll period, and scenario identifiers.
- Confidence after phase: 92% for safety gate, 0% for mutation-heavy pilot data until P100 seed manifest exists.

## Phase P100-1: Organization Masters

Real-user intent:

An HR admin configures the company structure before onboarding employees.

Positive scenarios:

- Create legal entity, locations, branches, business units, departments, cost centers, grades, designations, employment types.
- Search each created record.
- Edit a non-critical field.
- Validate dependent dropdowns.
- Validate pagination after list grows.

Negative scenarios:

- Required fields blank.
- Duplicate code.
- Invalid mapping, such as department without business unit if the app requires one.
- Deactivated master should not appear in active employee creation.

Observations to record:

- Dropdown label clarity.
- Whether the admin can understand mapping order.
- Any long-page or pagination friction.

Exit gate:

- Employee creation structural dropdowns show correct master values.

Execution result - 2026-09-12:

- Environment: staging, `https://hrms.accerio.in`.
- Main browser certification:
  - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/organization-master-crud-flows.spec.ts --workers=1 --reporter=line --timeout=1800000`
  - Initial result: `9/10` passed.
  - Failure: employee structural mapping scenario exceeded its 5 minute test timeout after successfully reaching the organization catalog with created master data.
  - Classification: test automation timeout/design issue for a heavy staging browser flow.
- Fix and rerun:
  - Increased only the heavy employee structural mapping scenario timeout from 5 minutes to 15 minutes.
  - Focused rerun passed: `1/1`.
- Exit-gate browser smoke:
  - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/employee-lifecycle-certification-flows.spec.ts --grep "employee master create" --workers=1 --reporter=line --timeout=900000`
  - Initial result: failed because the test selected the first legal entity, which had no branch/cost-center mappings.
  - Classification: test data-selection defect with a real-user UX observation.
  - Fix: employee onboarding certification now selects a legal entity that has both branch and cost-center mappings before validating dependent dropdowns.
  - Rerun result: `1/1` passed.
- Positive evidence:
  - Legal entities, locations, branches, business units, departments, cost centers, grades, designations, and employment types support browser create, required-field validation, duplicate-code rejection, edit, deactivate, active/inactive list filtering, and detail review.
  - Employee create structural mapping consumes the organization masters and aligns branch/location, department/business unit, designation/grade, cost center, and employment type.
- Negative evidence:
  - Required code/name fields are blocked by native validation.
  - Duplicate master codes show `This code is already in use.`
  - Invalid grade level shows `Level must be 1 or higher.`
  - Inactive records disappear from active review.
- Real-user observation:
  - If an HR admin selects a legal entity with no active branch or cost-center mappings, employee onboarding becomes blocked by empty dependent dropdowns.
  - Action taken: employee onboarding now shows a `Structure review needed.` notice when the selected legal entity has no active branches or no active cost centers.
  - Local browser verification against live backend data passed: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/employee-lifecycle-certification-flows.spec.ts --grep "employee create warns" --workers=1 --reporter=line --timeout=300000`.
  - Staging warning verification is pending deployment. The same test failed on staging before deploy because the patch was not deployed yet; the normal employee create flow still passed on staging.
  - Organization CRUD certification is slow on staging. Keep it as a certification pack, not a fast smoke pack.
- Confidence after phase: 92% for organization master CRUD and employee mapping after the UX warning fix. Remaining gaps: staging deploy/rerun for the warning and manifest-backed `PILOT100_YYYYMMDD` seed identity for the upcoming 100-employee dataset.

## Phase P100-2: Policy And Payroll Setup

Real-user intent:

Payroll admin configures policy and salary rules without hardcoding.

Positive scenarios:

- Create leave/attendance policies and shifts.
- Create salary components and structures.
- Create payroll calendar, period, pay groups.
- Create statutory setup and provider/handoff profiles.
- Preview rules where supported.

Negative scenarios:

- Duplicate salary component code.
- Invalid percentage/amount.
- Missing statutory registration.
- Pay group without calendar.
- Provider profile missing required fields.

Observations to record:

- Formula clarity.
- Whether payroll admin can tell which config is active.
- Whether error messages explain correction.

Exit gate:

- Payroll run can be opened for the target period.

## Phase P100-3: 100 Employees And Access Matrix

Real-user intent:

HR admin onboards a realistic workforce and validates access by role.

Positive scenarios:

- Create/seed 100 employees.
- Assign departments, managers, pay groups, salary structures.
- Add valid bank accounts for 95 employees.
- Add intentionally invalid/missing bank data for 5 employees.
- Add statutory and document data for relevant scenarios.
- Verify employee directory pagination and search.

Negative scenarios:

- Invalid email/phone/date.
- Duplicate employee code.
- Missing mandatory structure.
- Employee cannot access HR admin directory.
- Manager cannot see non-direct report.

Observations to record:

- Employee creation speed and friction.
- Bulk data visibility.
- Whether filters help find problem employees.

Exit gate:

- 100 employees visible and scenario distribution matches plan.

## Phase P100-4: Attendance, Leave, Lifecycle, And Inputs

Real-user intent:

Employees and managers create the monthly reality that payroll must process.

Positive scenarios:

- Employees submit leave and statutory declarations.
- Managers approve/reject requests.
- HR admin records attendance exceptions, LOP, overtime, lifecycle/exits.
- Reports reflect leave, attendance, lifecycle aging.

Negative scenarios:

- Employee cannot approve own request.
- Manager cannot approve non-report.
- Invalid leave date/range rejected.
- Locked/closed period cannot accept unsupported mutation.

Observations to record:

- ESS usability.
- MSS approval clarity.
- HR ability to find and fix exceptions.

Exit gate:

- Payroll source data exists for all 100 employees.

## Phase P100-5: Payroll Input Snapshot And Lock

Real-user intent:

Payroll admin gathers inputs, fixes blockers, and locks the payroll source.

Positive scenarios:

- Generate/collect input snapshots.
- Review blocker/warning counts.
- Search/filter by issue, pay group, employee.
- Lock eligible inputs.
- Payroll input exceptions report exports correctly.

Negative scenarios:

- Lock blocked while critical blockers remain.
- Locked snapshot cannot be edited silently.
- Employee/manager cannot access input setup.

Observations to record:

- Whether blocker copy explains next action.
- Whether page handles 100 employees without scanning pain.

Exit gate:

- Inputs are locked or residual blockers are explicitly documented.

## Phase P100-6: Calculation And Review

Real-user intent:

Payroll admin calculates payroll and review approvers resolve exceptions.

Positive scenarios:

- Run draft calculation.
- Validate 100-employee totals.
- Inspect representative employees from each scenario.
- Resolve/waive review exceptions.
- Submit/approve/lock review.
- Salary variance and review exception reports export.

Negative scenarios:

- Cannot approve with unresolved critical exceptions unless configured.
- Employee cannot access review page/API.
- Unauthorized decision API is denied.

Observations to record:

- Are variances understandable?
- Can reviewer trace numbers to inputs?
- Is decision history clear?

Exit gate:

- Payroll review is approved/locked or blockers are documented.

## Phase P100-7: Adjustments, Settlements, Close Readiness

Real-user intent:

Payroll finance resolves final payroll deltas before close.

Positive scenarios:

- Create/apply one-time adjustments.
- Create/apply FNF settlements.
- Open close readiness report.
- Drill from report to operational pages.

Negative scenarios:

- Duplicate adjustment source reference rejected.
- Unapproved adjustment cannot apply.
- Close readiness remains blocked when required evidence is missing.

Observations to record:

- Can finance distinguish warning vs blocker?
- Are next actions obvious?

Exit gate:

- Close readiness is green or accepted residual warnings are recorded.

## Phase P100-8: Outputs, Payslips, ESS Proof

Real-user intent:

Payroll admin publishes payslips and employees verify they can safely access only their own documents.

Positive scenarios:

- Generate output batch.
- Publish payslips.
- Employee reads payslip.
- Employee downloads payslip.
- HR admin views payslip publication report.
- Artifact access audit CSV exports.

Negative scenarios:

- Employee cannot see another employee payslip.
- Unpublished payslip hidden from ESS.
- Revoked/expired signed URL cannot be used.
- Employee cannot call HR admin artifact export API.

Observations to record:

- Employee payslip UX clarity.
- HR traceability for who read/downloaded.

Exit gate:

- Payslip publication report proves publication/read/download/access evidence.

## Phase P100-9: Finance Handoff And Provider Evidence

Real-user intent:

Finance generates payout and provider evidence and can identify handoff failures.

Positive scenarios:

- Generate finance handoff.
- Open bank advice.
- Review provider deliveries.
- Generate/review audit pack if available.
- Finance handoff exception report exports.

Negative scenarios:

- Invalid/missing bank data appears as blocker.
- Failed provider delivery appears as high risk.
- Retry/queued/dead-letter states appear in exception report.
- Employee cannot access finance handoff.

Observations to record:

- Can finance act without developer help?
- Are provider statuses understandable?

Exit gate:

- Handoff and expected exception states are visible and auditable.

## Phase P100-10: Full Report And Export Regression

Real-user intent:

Leadership, HR, payroll, and compliance users can trust all report outputs after the full run.

Positive scenarios:

- Every report opens.
- Every filter/dropdown/sort/pagination works.
- CSV and manifest exports work.
- Export audit history records every export.

Negative scenarios:

- Employee denial for every HR/admin report and export route.
- Invalid report key fails without sensitive leakage.
- Empty/filtered states are meaningful.

Observations to record:

- Report naming clarity.
- Export field usefulness.
- Any slow/awkward report with 100 employees.

Exit gate:

- Full report pack passes.

## Phase P100-11: Security And Isolation

Real-user intent:

The system protects payroll and employee data under role pressure.

Positive scenarios:

- Each role sees correct workspace.
- Support/platform users see only allowed operational information.

Negative scenarios:

- Cross-tenant object access denied.
- Cross-employee payslip denied.
- Manager non-report access denied.
- Direct API denial has no token/password/secret leakage.

Observations to record:

- Error page language.
- Any confusing redirect vs denial.

Exit gate:

- No sensitive-data leakage.

## Phase P100-12: UX And Performance

Real-user intent:

The product remains usable at pilot data volume.

Positive scenarios:

- Desktop and mobile viewport smoke.
- Keyboard navigation.
- Sidebar/category menus.
- Long tables paginate.
- Core pages meet timing budget.

Negative scenarios:

- No horizontal overflow.
- No overlapping text/actions.
- No infinite loading.
- No unbounded long page where pagination is expected.

Observations to record:

- Real admin scanability.
- Pages needing tabs/pagination.
- Slowest routes.

Exit gate:

- UX/performance residuals classified and accepted or fixed.

## Phase P100-13: Evidence, Cleanup, Sign-Off

Real-user intent:

Delivery lead can decide whether to pilot with evidence, not optimism.

Positive scenarios:

- Evidence pack generated.
- Manifest ids recorded.
- Export audit ids recorded.
- Known limitations listed.
- Cleanup/retain decision captured.

Negative scenarios:

- Cleanup cannot run before evidence is confirmed.
- Missing evidence blocks sign-off.

Observations to record:

- Pilot readiness decision.
- Customer-facing limitations.

Exit gate:

- Final status is one of:
  - Pilot-ready.
  - Pilot-ready with accepted limitations.
  - Blocked.
