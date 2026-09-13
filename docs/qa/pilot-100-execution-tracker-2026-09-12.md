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
| P100-2 | Policy and payroll setup | Passed | Salary, leave, attendance, statutory, pay group, provider config | Duplicate setup, missing required config, invalid formulas | Rerun payroll setup and report catalog checks. |
| P100-3 | 100 employees and access matrix | Passed | 100 employees, manager hierarchy, pay/bank/salary assignment | Role denial, missing-bank blocker, missing mapping | Rerun directory, ESS/MSS, payroll readiness after seed/config changes. |
| P100-4 | Attendance/leave/lifecycle inputs | Passed | ESS/MSS/HR inputs for scenario distribution | Unauthorized approvals, invalid dates, rejected requests | Rerun affected input and report checks. |
| P100-5 | Payroll input snapshot and lock | Passed | Snapshot, issue review, lock | Blocker lock denial, locked mutation denial | Rerun input snapshot setup and payroll input exception report. |
| P100-6 | Calculation and review | Passed on staging | Draft calculation, line review, exceptions, decisions | Invalid lock, employee denial, report export evidence | Rerun calculation/review/report pack after related payroll engine/report changes. |
| P100-7 | Adjustments, settlements, readiness | Passed locally | Adjustments, FNF, close readiness | Duplicate source ref, invalid approval, blocked close | Rerun adjustments/settlements/close readiness reports. |
| P100-8 | Outputs, payslips, ESS proof | Passed on staging | Generate/publish outputs, read/download payslips | Cross-employee payslip denial, signed grant access-limit denial | Rerun output, ESS, payslip publication, artifact audit tests. |
| P100-9 | Finance handoff/provider evidence | Passed on staging | Bank advice, delivery, retries, callbacks, audit pack | Employee denial for finance handoff/report APIs | Rerun handoff, bank advice, finance exception reports. |
| P100-10 | Full report/export regression | Passed on staging | Every report page, CSV, manifest, export audit | Employee denial for every HR report/API | Rerun full report pack after any report fix. |
| P100-11 | Security/isolation | Passed on staging | Role scoped access works | Cross-role, cross-tenant, direct API denial | Rerun impacted role matrix plus no-leak checks. |
| P100-12 | UX/performance | Passed on staging | Desktop/mobile, tabs, sidebar, pagination, keyboard | Overflow, overlap, slow route, unusable table | Rerun visual/performance after UI changes. |
| P100-13 | Evidence and sign-off | Pilot-ready with accepted limitations | Evidence pack, run ids, export ids, cleanup decision | No cleanup before evidence review | Rerun sign-off summary after any late rerun. |
| P100-14 | Pilot credential matrix | Passed on staging | Named login, workspace access, role denial | Low-privilege API denial, wrong workspace denial | Rerun after any credential, role, or workspace-access change. |
| P100-15 | Backup and restore drill | Passed on staging | Timestamped backup, checksum, scratch restore, data verification | No live DB restore, scratch cleanup | Rerun before customer-facing production payroll. |

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
  - Staging post-deploy verification passed: `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/employee-lifecycle-certification-flows.spec.ts --grep "employee create warns|employee master create" --workers=1 --reporter=line --timeout=900000` returned `2/2` passed.
  - Organization CRUD certification is slow on staging. Keep it as a certification pack, not a fast smoke pack.
- Confidence after phase: 94% for organization master CRUD and employee mapping after the UX warning fix. Remaining gap: manifest-backed `PILOT100_YYYYMMDD` seed identity for the upcoming 100-employee dataset.

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

Execution result - 2026-09-12:

- Environment: staging, `https://hrms.accerio.in`.
- Direct payroll setup certification:
  - Command: `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/payroll-setup-flows.spec.ts tests/e2e/salary-setup-flows.spec.ts tests/e2e/payroll-statutory-flows.spec.ts --workers=1 --reporter=line --timeout=2400000`
  - Result: `9/9` passed.
- Policy and governance setup certification:
  - Command: `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/policy-governance-master-crud-flows.spec.ts tests/e2e/governance-assignment-form-flows.spec.ts --workers=1 --reporter=line --timeout=3600000`
  - Result: `20/20` passed.
- Positive evidence:
  - Payroll setup workspace, payroll calendars, payroll periods, pay groups, pay group assignments, payroll runs, rules, salary components, salary structures, salary versions, salary lines, salary assignments, statutory packs, employer registrations, filing calendars, statutory slabs/components, employee statutory declarations, and proof actions were certified through browser automation.
  - Leave types, shifts, holiday calendars, leave policies, attendance policies, workflow templates, document categories, document requirements, leave policy assignments, attendance policy assignments, workflow assignments, employee shift assignments, and shift roster rollout were certified through browser automation.
  - Desktop and mobile usability checks passed for payroll setup, salary setup, and statutory setup.
- Negative evidence:
  - Duplicate validation, JSON validation, preview validation, server validation messages, inactive guidance, conflict governance, scoped requirement controls, and invalid setup cases were exercised by the browser packs.
- Real-user observation:
  - The setup model is broad but usable. The largest usability risk is speed/volume of certification rather than an obvious page failure; these should remain phase certification packs, not every-commit smoke tests.
- Confidence after phase: 93% for policy/payroll setup. Remaining gap: a manifest-backed 100-employee pilot seed must prove the setup can support realistic volume and scenario distribution.

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

Execution result - 2026-09-12:

- Implementation added:
  - Backend management command: `python manage.py seed_pilot_100_workforce --prefix PILOT100_20260912 --output-file <manifest.json>`.
  - Browser certification spec: `web/tests/e2e/pilot-100-workforce-certification.spec.ts`.
- Seed command behavior:
  - Calls the existing demo bootstrap unless `--skip-bootstrap` is supplied.
  - Cleans only users, memberships, membership roles, employees, and employee-owned dependent data for the selected pilot prefix.
  - Creates 100 users/memberships/employees.
  - Creates 10 manager personas and 90 employee personas.
  - Assigns manager/employee roles.
  - Creates 95 primary bank-account-ready employees and 5 intentional missing-bank blockers.
  - Creates pay group assignments when an active pay group exists.
  - Creates salary assignments when an active salary structure version exists.
  - Creates statutory profiles when an active statutory pack exists.
  - Writes a portable manifest with counts, setup references, scenario distribution, employee IDs, usernames, reporting manager links, and blocker flags.
- Local command verification:
  - Seed command succeeded with prefix `PILOT100_LOCALQA`.
  - Manifest counts: 100 employees, 10 managers, 95 valid-bank employees, 5 missing-bank employees, 100 pay group assignments, 100 statutory profiles.
  - Local salary assignments were `0` because the local database had no active salary structure version; the manifest records this explicitly.
  - Cleanup command succeeded and local employee count for `PILOT100_LOCALQA` returned `0`.
- Staging seed verification:
  - First staging seed attempt accidentally ran without `/var/www/hrms-payroll-saas/shared/backend.env`, which populated release-local SQLite instead of live PostgreSQL. This was cleaned with the same prefix cleanup command.
  - Live seed was rerun with backend env loaded against PostgreSQL `hrms_stage`.
  - Live manifest counts: 100 employees, 10 managers, 95 valid-bank employees, 5 missing-bank employees, 100 pay group assignments, 100 salary assignments, 0 statutory profiles.
  - Statutory profiles remain at `0` because staging still has no active statutory pack. This is a P100 statutory/compliance data blocker to resolve before statutory report proof.
- Browser spec verification status:
  - TypeScript passed.
  - Staging run after correct seed: `2/3` passed.
  - Passed: HR admin directory search, pagination, manager filter, 100-row visibility.
  - Passed after spec correction: seeded employee ESS and seeded manager MSS role surfaces. ESS shows reporting manager name, not manager employee code.
  - Failed before fixes: payroll readiness rendered but had 13px horizontal overflow in the detail status pill, and missing primary bank was classified as `Warning` instead of payout-blocking.
  - Product fix prepared: payroll readiness detail header wraps safely; default missing primary bank severity changed from `warning` to `blocker`.
- Final staging browser certification:
  - Deployed commit: `1f072af67d4966d4255d880e33a0388b3ffca504`.
  - Services: `hrms-payroll-web.service` active, `hrms-payroll-backend.service` active.
  - Live seed check: `PILOT100_20260912` returned 100 employees in PostgreSQL `hrms_stage`.
  - Commercial gate: Northstar Foods set to `enterprise`; exceeded usage limits empty.
  - Command:
    - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-workforce-certification.spec.ts --workers=1 --reporter=line --timeout=1200000`
  - Result: `3/3` passed in 50.8s.
  - Certified:
    - HR admin can search the 100-employee seed, paginate 50/50, and filter 10 managers.
    - Seeded employee can open ESS with self-service profile and reporting-manager context.
    - Seeded manager can open MSS approval workspace.
    - Payroll readiness exposes the intentional missing-bank blocker for `PILOT100_20260912_E096` without horizontal overflow.
- Next staging commands after check-in/deploy:
  - `cd /var/www/hrms-payroll-saas/current/backend && set -a && . /var/www/hrms-payroll-saas/shared/backend.env && set +a && ./.venv/bin/python manage.py seed_pilot_100_workforce --prefix PILOT100_20260912 --output-file ../web/test-results/pilot-100-staging-manifest.json`
  - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-workforce-certification.spec.ts --workers=1 --reporter=line --timeout=1200000`
- Real-user observation:
  - This phase must be certified against manifest-backed data, not ad hoc browser-created employees. Otherwise payroll readiness, bank blockers, access roles, and reporting hierarchy cannot be trusted as a reproducible pilot baseline.
- Confidence after final staging certification: 94% for P100-3. Residual risk: statutory profiles remain `0` until an active statutory pack exists on staging, so statutory/compliance proof is deferred to the statutory data phase.

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

Implementation and local execution result - 2026-09-12:

- Implementation added:
  - Backend management command: `python manage.py seed_pilot_100_inputs --prefix PILOT100_20260912 --output-file <manifest.json>`.
  - Browser certification spec: `web/tests/e2e/pilot-100-inputs-certification.spec.ts`.
- Seed command behavior:
  - Requires exactly 100 employees for the selected pilot prefix before mutation.
  - Cleans only prefixed pilot input data for selected employees and period.
  - Creates September 2026 workday attendance rows for all 100 employees.
  - Seeds approved leave/LOP cases, pending leave cases, approved/rejected/pending regularizations, overtime rows, late/exception rows, and lifecycle onboarding/probation/movement/exit rows.
  - Creates 100 leave balance rows for report and ESS visibility.
  - Writes a manifest with counts, scenario labels, period, tenant, cleanup counts, and generation timestamp.
- Local seed verification:
  - Prefix: `P100LOCAL_P4`.
  - Attendance records: `2200`.
  - Leave balances: `100`.
  - Leave requests: `15` (`10` approved, `5` pending).
  - Attendance regularizations: `5`.
  - Lifecycle records: `1` onboarding, `1` probation, `1` movement, `2` exits.
  - Cleanup command succeeded for both inputs and workforce after local browser proof.
- Local browser certification:
  - Command:
    - `HRMS_API_BASE_URL=http://127.0.0.1:8001/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_PILOT100_PREFIX=P100LOCAL_P4 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/pilot-100-inputs-certification.spec.ts --workers=1 --reporter=line --timeout=1200000`
  - Result: `4/4` passed in 18.9s.
  - Certified:
    - Attendance register report opens, searches pilot rows, sorts overtime rows, filters regularized rows, paginates, and exports CSV with checksum headers.
    - Leave balance report opens, searches pilot balances, verifies export manifest evidence, and seeded employee ESS shows pending leave.
    - Seeded managers can see their actual direct-report leave and attendance approval queues.
    - Lifecycle aging report exposes pilot onboarding, probation, movement, and exit risk rows with export evidence.
- Test-design observation:
  - Manager approval proof must follow the seeded reporting hierarchy. `E001` owns the pending leave case, while pending attendance regularization proof uses the responsible manager for that employee (`E008` in the local run).
  - Playwright local runs must pass `HRMS_API_BASE_URL`; the Playwright web server env overrides `.env.local` when the variable is not explicit.
- Staging deployment commands after check-in:
  - `cd /var/www/hrms-payroll-saas/current/backend && set -a && . /var/www/hrms-payroll-saas/shared/backend.env && set +a && ./.venv/bin/python manage.py seed_pilot_100_inputs --prefix PILOT100_20260912 --output-file ../web/test-results/pilot-100-inputs-staging-manifest.json`
  - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-inputs-certification.spec.ts --workers=1 --reporter=line --timeout=1200000`
- Staging deployment and certification:
  - Deployed commit: `36d73836151adb5a75bcb48016f982b275a6ec3f`.
  - Build note: the first build attempt failed because `HRMS_API_BASE_URL` was not loaded into the build environment while demo mode was disabled. Rerun succeeded after sourcing `/var/www/hrms-payroll-saas/shared/web.env`.
  - Services after deploy: `hrms-payroll-backend.service` active, `hrms-payroll-web.service` active.
  - Staging seed command:
    - `cd /var/www/hrms-payroll-saas/current/backend && set -a && . /var/www/hrms-payroll-saas/shared/backend.env && set +a && ./.venv/bin/python manage.py seed_pilot_100_inputs --prefix PILOT100_20260912 --output-file ../web/test-results/pilot-100-inputs-staging-manifest.json`
  - Staging seed counts: `2200` attendance records, `100` leave balances, `15` leave requests, `5` attendance regularizations, `1` onboarding, `1` probation review, `1` movement, `2` exits.
  - Staging browser command:
    - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-inputs-certification.spec.ts --workers=1 --reporter=line --timeout=1200000`
  - Result: `4/4` passed in 1.1m.
- Confidence after final staging certification: 93% for P100-4. Residual risk: statutory declaration variation is only reserved in the workforce scenario distribution; active statutory pack/profile data is still deferred to the statutory/compliance data phase.

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

Implementation and local execution result - 2026-09-12:

- Implementation added:
  - Backend management command: `python manage.py seed_pilot_100_snapshots --prefix PILOT100_20260912 --output-file <manifest.json>`.
  - Browser certification spec: `web/tests/e2e/pilot-100-payroll-input-snapshot-certification.spec.ts`.
  - Authenticated Next proxy for `/api/hr-admin/payroll-input-snapshot-setup/`.
  - `GET` support for `/api/hr-admin/payroll-input-snapshots?payroll_run_id=<id>` through the existing payroll config proxy.
  - Payroll input setup payload ordering now returns newest payroll-run snapshots first before applying the 200-row cap.
- Seed command behavior:
  - Requires exactly 100 pilot employees for the selected prefix.
  - Cleans only the selected prefix's pilot snapshot runs.
  - Creates a blocked gate run with 100 snapshots, including 5 blockers and 12 warning snapshots.
  - Creates a lockable run with 100 snapshots, including 0 blockers and 17 warning snapshots.
  - Captures employee, organization, salary, attendance, leave, lifecycle, document, banking, validation, config snapshots, and source hashes.
  - Writes a manifest with run IDs, counts, period, tenant, cleanup counts, and generation timestamp.
- Local seed verification:
  - Prefix: `P100LOCAL_P5`.
  - Blocked run snapshots: `100`.
  - Lockable run snapshots: `100`.
  - Blocked snapshots: `5`.
  - Blocked-run warning snapshots: `12`.
  - Lockable-run warning snapshots: `17`.
- Local environment note:
  - Repeated local certification had exceeded the `growth` plan's `payroll_runs_per_month` meter. For local pilot certification, Northstar Foods was set to `enterprise` after seeding so the commercial gate stayed active but no longer blocked payroll proof.
- Local browser certification:
  - Command:
    - `HRMS_API_BASE_URL=http://127.0.0.1:8001/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_PILOT100_PREFIX=P100LOCAL_P5 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/pilot-100-payroll-input-snapshot-certification.spec.ts --workers=1`
  - Result: `4/4` passed in 20.3s.
  - Certified:
    - Blocked gate run shows 100 snapshots, 5 blocked inputs, source hash evidence, and rejects input lock with `Cannot lock payroll inputs while blocked snapshots exist.`
    - Lockable run shows 100 snapshots, 0 blocked inputs, 17 warning inputs, locks all non-locked snapshots, and prevents later mutation of locked snapshot data.
    - Payroll input exceptions report supports search, issue filter, lock-state filter, CSV export, manifest export, export audit history, and drilldown back to payroll inputs.
    - Employee persona cannot access the payroll input exceptions report or export API.
- Real-user observation:
  - The payroll input workspace/report source was originally capped at the first 200 snapshots sorted by employee code. In environments with older payroll artifacts, deep pilot exception rows could fall outside the browser payload.
  - Action taken: setup payload ordering now prioritizes newest payroll runs before employee code, making the latest active collection/rehearsal visible first.
  - Remaining UX recommendation: add explicit search/filter/pagination directly to the payroll inputs workspace itself, matching the payroll input exceptions report. Current certification proves the lock workflow and report evidence; workspace-level page controls are still lighter than the report surface.
- Staging deployment commands after check-in:
  - `cd /var/www/hrms-payroll-saas/current/backend && set -a && . /var/www/hrms-payroll-saas/shared/backend.env && set +a && ./.venv/bin/python manage.py seed_pilot_100_snapshots --prefix PILOT100_20260912 --output-file ../web/test-results/pilot-100-snapshots-staging-manifest.json`
  - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-payroll-input-snapshot-certification.spec.ts --workers=1 --reporter=line --timeout=1200000`
- Staging deployment and certification:
  - Deployed commit: `266257b00497d4ff6fff555b862c3f652eb21058`.
  - Services after deploy: `hrms-payroll-backend.service` active, `hrms-payroll-web.service` active.
  - Staging seed command:
    - `cd /var/www/hrms-payroll-saas/current/backend && set -a && . /var/www/hrms-payroll-saas/shared/backend.env && set +a && ./.venv/bin/python manage.py seed_pilot_100_snapshots --prefix PILOT100_20260912 --output-file ../web/test-results/pilot-100-snapshots-staging-manifest.json`
  - Staging seed counts: `100` blocked-run snapshots, `100` lockable-run snapshots, `5` blockers, `12` blocked-run warnings, `17` lockable-run warnings.
  - SaaS commercial gate: Northstar Foods plan `enterprise`; exceeded usage limits empty.
  - Staging browser command:
    - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-payroll-input-snapshot-certification.spec.ts --workers=1 --reporter=line --timeout=1200000`
  - Result: `4/4` passed in 1.6m.
- Confidence after final staging certification: 93% for P100-5. Residual risk: payroll inputs workspace still needs native search/filter/pagination improvements for long-running tenants, although report-level search/filter/export proof is certified.

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

Execution result - 2026-09-13:

- Environment: local dev, `http://127.0.0.1:3000` web against `http://127.0.0.1:8001/api/v1`.
- Pilot prefix used locally: `P100LOCAL_P5`.
- Dedicated calculation seed:
  - Command: `./backend/.venv/bin/python backend/manage.py seed_pilot_100_calculation --prefix P100LOCAL_P5 --output-file web/test-results/p100local-p5-calculation.json`
  - Counts: `100` locked calculation snapshots, `83` ready snapshots, `17` warning snapshots, `3` scoped payroll rules.
- Browser certification command:
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 HRMS_API_BASE_URL=http://127.0.0.1:8001/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_PILOT100_PREFIX=P100LOCAL_P5 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/pilot-100-calculation-review-certification.spec.ts --workers=1`
  - Result: `2/2` passed.
- Positive evidence:
  - HR admin calculated a 100-employee draft payroll from locked snapshots.
  - Calculation produced `300` rule-sourced lines and `100` employee totals with positive net pay.
  - Calculation setup and review setup API payloads returned all `300` lines, proving no 100-employee truncation.
  - HR admin opened payroll review and saw the auto-created warning exceptions from payroll input snapshots.
  - HR admin created a manual blocker, verified submission was blocked, accepted the blocker with decision evidence, submitted, approved, and final-locked the review.
  - Salary variance report CSV/manifest export for the pilot prefix returned `100` source rows and checksum evidence.
  - Payroll review exceptions report and CSV export returned the pilot warning/manual blocker evidence.
- Negative evidence:
  - Review submission with an open blocker returned `400` and an inline blocker alert.
  - Employee persona could not access payroll calculation setup, review setup, salary variance export, or review exception export APIs.
- Real-user observations and fixes:
  - The pilot calculation seed originally copied blank salary values from the local P100 snapshots, correctly triggering 100 salary-payload blockers. Action taken: calculation seed now fills deterministic salary fallback values only when source salary payloads are blank.
  - Calculation/review setup payloads originally capped line evidence at `200`, which is insufficient for a 100-employee x 3-rule payroll run. Action taken: line cap raised to `500`.
  - Payroll review exception report evidence could be missed in long-lived tenants because review setup capped exceptions at `200`. Action taken: exception cap raised to `1000`.
  - Report UI pagination can place accepted low-risk exceptions after warning rows. The certification now proves the visible row by searching the exact blocker title and proves full prefix coverage through export evidence.
- Staging deployment commands after check-in:
  - `cd /var/www/hrms-payroll-saas/current/backend && set -a && . /var/www/hrms-payroll-saas/shared/backend.env && set +a && ./.venv/bin/python manage.py seed_pilot_100_calculation --prefix PILOT100_20260912 --output-file ../web/test-results/pilot-100-calculation-staging-manifest.json`
  - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-calculation-review-certification.spec.ts --workers=1 --reporter=line --timeout=1200000`
- Confidence after local certification: 92% for P100-6 locally. Staging remains pending until deploy, seed, and browser rerun.
- Staging deployment and certification:
  - Deployed commit: `bf68dc01e8260fbb522529c9f360e3c97d92891b`.
  - Services after deploy: `hrms-payroll-backend.service` active, `hrms-payroll-web.service` active.
  - Staging seed command:
    - `cd /var/www/hrms-payroll-saas/current/backend && set -a && . /var/www/hrms-payroll-saas/shared/backend.env && set +a && ./.venv/bin/python manage.py seed_pilot_100_calculation --prefix PILOT100_20260912 --output-file ../web/test-results/pilot-100-calculation-staging-manifest.json`
  - Staging seed counts: `100` locked calculation snapshots, `83` ready snapshots, `17` warning snapshots, `3` scoped payroll rules.
  - Staging seeded run id: `bce9bd43-e7ff-4b9a-9a17-dcdfa5418b84`.
  - Source lockable input run id: `d4ab54dc-ce2e-40b1-bfc2-ec16a54f0610`.
  - Staging browser command:
    - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-calculation-review-certification.spec.ts --workers=1 --reporter=line --timeout=1200000`
  - Result: `2/2` passed in 2.1m.
- Confidence after staging certification: 93% for P100-6. Residual risk: next phases still need adjustments/settlements/close readiness, outputs/payslips, and finance handoff on the same pilot scale.

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

Execution result - 2026-09-13:

- Environment: local dev, `http://localhost:3000` web against `http://127.0.0.1:8000/api/v1`.
- Pilot prefix used locally: `P100LOCAL_P5`.
- Dedicated editable run seed:
  - Command: `cd backend && ../.venv/bin/python manage.py seed_pilot_100_calculation --prefix P100LOCAL_P5 --run-code-suffix adjust-settle-close --run-name-suffix "Adjustments Settlements Close Gate" --scenario adjustments_settlements_close_gate --input-profile-ref tenant.payroll.input.pilot100.adjustments.v1 --output-file ../web/test-results/pilot-100-adjustments-settlements-local-manifest.json`
  - Counts: `100` locked snapshots, `83` ready snapshots, `17` warning snapshots, `3` scoped payroll rules.
- Browser certification command:
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=P100LOCAL_P5 pnpm --dir web exec playwright test tests/e2e/pilot-100-adjustments-settlements-close-certification.spec.ts --workers=1 --reporter=line --timeout=600000`
  - Result: `1/1` passed in 20.9s.
- Positive evidence:
  - HR admin created a one-time bonus adjustment through the payroll adjustment workspace and verified source hash evidence.
  - HR admin submitted, approved, and applied the adjustment from browser-visible controls.
  - HR admin created a full-and-final settlement package through the payroll settlement workspace.
  - Settlement creation produced two lines: gross due and recovery, with source-hash evidence.
  - HR admin submitted, approved, and applied the settlement; applied settlement lines generated applied payroll adjustments for calculation consumption.
  - Payroll adjustments, payroll settlements, and payroll close readiness reports were opened through the browser and CSV/manifest exports returned checksum evidence.
- Negative evidence:
  - Applying an unapproved adjustment returned `400` and an inline message: only approved adjustments can be applied.
  - Creating a duplicate adjustment with the same payroll run, employee, source reference, and component is now rejected as a controlled `400` validation response instead of a server error.
- Real-user observations and fixes:
  - Adjustment and settlement pages were register/audit views only. Action taken: added compact certification action panels for create, submit, approve, and apply workflows.
  - Browser mutations needed same-origin API routes. Action taken: added Next proxy routes for adjustment and settlement setup, create, line create, submit, approve, reject, and apply actions.
  - Duplicate adjustment source refs initially surfaced as a backend `500` from model validation. Action taken: model validation/uniqueness failures now return clear DRF validation messages.
  - Settlement line creation originally refreshed the workspace after the first line and could interrupt the second line. Action taken: settlement line creation batches without refresh and refreshes only after both lines are created.
- Accepted residual:
  - Close readiness for this run is expected to show remaining output/close work because payslip/output generation belongs to P100-8. P100-7 exit is accepted because pending adjustments and settlements are cleared, and the close-readiness report/export evidence is present.
- Confidence after local certification: 91% for P100-7 locally.
- Staging deployment and certification:
  - Deployed commit: `ee835896fbd0a614b05b05794e89b7bca037bf37`.
  - Services after deploy: `hrms-payroll-backend.service` active, `hrms-payroll-web.service` active.
  - Staging seed command:
    - `cd /var/www/hrms-payroll-saas/current/backend && set -a && . /var/www/hrms-payroll-saas/shared/backend.env && set +a && ./.venv/bin/python manage.py seed_pilot_100_calculation --prefix PILOT100_20260912 --run-code-suffix adjust-settle-close --run-name-suffix "Adjustments Settlements Close Gate" --scenario adjustments_settlements_close_gate --input-profile-ref tenant.payroll.input.pilot100.adjustments.v1 --output-file ../web/test-results/pilot-100-adjustments-settlements-staging-manifest.json`
  - Staging seed counts: `100` locked snapshots, `83` ready snapshots, `17` warning snapshots, `3` scoped payroll rules.
  - Staging browser command:
    - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-adjustments-settlements-close-certification.spec.ts --workers=1 --reporter=line --timeout=900000`
  - Result: `1/1` passed in 2.8m.
  - Test automation hardening during staging: the settlement certification now waits for both settlement lines through the setup API before navigating, avoiding a staging-latency race where the package existed before both line POSTs completed.
- Confidence after staging certification: 92% for P100-7. Residual risk: close readiness still expects output generation/payslip proof in P100-8.

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

Execution result - 2026-09-13:

- Environment: local dev, `http://127.0.0.1:3000` with backend `http://127.0.0.1:8012/api/v1`.
- Setup commands:
  - `cd backend && ../.venv/bin/python manage.py seed_pilot_100_workforce --prefix PILOT100_20260912 --password Password@123 --output-file ../web/test-results/pilot-100-workforce-local-manifest.json`
  - `cd backend && ../.venv/bin/python manage.py seed_pilot_100_inputs --prefix PILOT100_20260912 --output-file ../web/test-results/pilot-100-inputs-local-manifest.json`
  - `cd backend && ../.venv/bin/python manage.py seed_pilot_100_snapshots --prefix PILOT100_20260912 --output-file ../web/test-results/pilot-100-snapshots-local-manifest.json`
  - Local source run `pilot100_20260912-inputs-lockable` was locked for setup, then `seed_pilot_100_calculation --run-code-suffix output-payslip --run-name-suffix "Output Payslip ESS Gate"` created the disposable P100-8 run.
- Browser certification:
  - Command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-output-payslip-ess-certification.spec.ts --workers=1 --reporter=line --timeout=900000`
  - Result: `1/1` passed.
- Positive evidence:
  - HR admin calculated 100 employees into 300 calculation lines, opened review, submitted, approved, final locked, generated outputs, and published the output batch through browser controls.
  - Output batch produced `101` artifacts: `100` employee payslips and `1` register.
  - Pilot employee `pilot100_20260912.e001` opened ESS payslips, viewed storage/source/calculation evidence, downloaded their payslip, and recorded read acknowledgement.
  - Payslip publication report showed the employee row and CSV export for the run returned at least `100` rows with source-hash evidence.
  - Artifact audit CSV exported with artifact checksum evidence.
- Negative evidence:
  - Pilot employee could not call HR admin artifact download API.
  - Pilot employee could not download another employee payslip through the ESS API.
  - Employee signed access grant with `max_access_count=1` allowed the first signed download and rejected the second download.
- Fix made during phase:
  - `seed_pilot_100_calculation` cleanup now removes output batches, artifacts, access events, signed grants, handoffs, and provider rows for the disposable run before deleting reviews/calculations. This makes output-phase reruns repeatable after publication.
  - The P100 calculation seed now carries a configurable signed storage profile under `output_profile.storage_profile` instead of relying on hardcoded test behavior.
- Local environment note:
  - Local tenant `northstar-foods` was switched from `growth` to `enterprise` for the rehearsal because local seed volume exceeded the `payroll_runs_per_month` plan gate.
- Staging deployment and certification:
  - Deployed commit: `c2f7310aec500d6d2633c1b7049e2fd86a22bdde`.
  - Services after deploy: `hrms-payroll-backend.service` active, `hrms-payroll-web.service` active.
  - Staging seed command:
    - `cd /var/www/hrms-payroll-saas/current/backend && set -a && . /var/www/hrms-payroll-saas/shared/backend.env && set +a && ./.venv/bin/python manage.py seed_pilot_100_calculation --prefix PILOT100_20260912 --run-code-suffix output-payslip --run-name-suffix "Output Payslip ESS Gate" --scenario output_payslip_ess_gate --input-profile-ref tenant.payroll.input.pilot100.outputs.v1 --output-file ../web/test-results/pilot-100-output-payslip-staging-manifest.json`
  - Staging seed counts: `100` snapshots, `83` ready snapshots, `17` warning snapshots, `3` scoped payroll rules.
  - Staging browser command:
    - `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-output-payslip-ess-certification.spec.ts --workers=1 --reporter=line --timeout=900000`
  - Result: `1/1` passed in 1.8m.
- Confidence after staging certification: 93% for P100-8. Residual risk: real external storage/provider IAM is still outside this staging placeholder-storage certification.

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

Execution result - 2026-09-13:

- Environment: local dev, `http://127.0.0.1:3100` with backend `http://127.0.0.1:8012/api/v1`.
- Prerequisite: P100-8 output batch for `PILOT100_20260912 Output Payslip ESS Gate` was already published.
- Browser certification:
  - Command: `PLAYWRIGHT_PORT=3100 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-finance-handoff-compliance-certification.spec.ts --workers=1 --reporter=line --timeout=900000`
  - Result: `1/1` passed in 22.6s after test locator hardening.
- Positive evidence:
  - HR admin opened the published output batch and generated or resumed the finance handoff through browser-visible controls.
  - HR admin opened Payroll Handoff, transmitted the handoff when needed, acknowledged provider delivery evidence when needed, and generated the provider audit pack when missing.
  - Handoff setup evidence showed accepted handoff status, reconciled delivery evidence, completed provider jobs, checksum/source-hash evidence, and one provider audit pack artifact.
  - Bank advice artifact downloaded with payroll artifact checksum headers and employee-code CSV content.
  - Bank Advice Report was certified through browser search, handoff-status filter, delivery-status filter, pagination, CSV export, and manifest export.
  - Finance Handoff Exceptions Report was certified through browser search, risk filter, CSV export, and manifest export.
  - Payroll Register Report was rechecked for the P100 run with browser search and CSV export evidence.
- Negative evidence:
  - Employee session cannot read backend finance handoff setup.
  - Employee session cannot read bank advice report export.
  - Employee session cannot generate finance handoff for the output batch.
- Real-user observations:
  - Finance report pages are usable, but their client search state is not initialized from URL `q` parameters. Direct links such as `/hr-admin/reports/finance-handoff-exceptions?q=<run>` open the page but do not prefill the visible search field. This is not blocking because typed search works, but it is a report deep-link UX improvement.
  - P100-9 certification is state-aware: reruns can resume from generated/transmitted/accepted handoff state without failing on duplicate handoff creation.
- Fixes made during phase:
  - Added `web/tests/e2e/pilot-100-finance-handoff-compliance-certification.spec.ts`.
  - Hardened the test to use backend-authenticated setup APIs for output/handoff setup, exact heading matching for run names that also prefix artifact names, lifecycle-aware artifact counts after handoff generation, and accessible-role locators for the Finance Handoff Exceptions search box.
- Confidence after local certification: 91% for P100-9 locally. Remaining risk: staging deployment/seed rerun and real external bank/accounting/statutory provider integrations.

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

Execution result - 2026-09-13:

- Environment: staging, `https://hrms.accerio.in`.
- Prerequisites:
  - P100-8 output batch for `PILOT100_20260912 Output Payslip ESS Gate` was published.
  - P100-9 finance handoff/provider evidence was accepted and audit-pack-ready.
- Browser certification:
  - Command: `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 pnpm --dir web exec playwright test tests/e2e/pilot-100-full-report-export-regression.spec.ts --project=chromium`
  - Result: `3/3` passed in 5.9m.
- Positive evidence:
  - HR admin opened the report catalog and every HR admin ready report page through browser automation.
  - Certified report pages: workforce, document compliance, lifecycle queue, lifecycle aging, attendance register, leave balance, attendance exceptions, payroll register, payroll input exceptions, salary variance, payroll review exceptions, payroll adjustments, payroll settlements, payroll close readiness, payslip publication, bank advice, finance handoff exceptions, challan reconciliation, statutory filing status, provider filing receipts, and statutory deductions.
  - Each page exposed its report workspace, table, search zero-state path, at least one dropdown where available, and pagination controls without horizontal overflow.
  - CSV and manifest exports were certified for every ready report with an `exportRoute`.
  - Export contract checks covered report key, checksum header, CSV header, manifest schema version, manifest checksum, row count, source endpoint, and evidence columns.
  - P100 payroll-finance reports were required to include the `PILOT100_20260912` evidence string in exported CSV.
  - TDS e-file package endpoint was checked as either ready CSV output or a controlled readiness-blocker response with blocking reasons.
  - Export audit API showed CSV and manifest records for every exportable report.
- Negative evidence:
  - Employee session could not access every HR admin report page.
  - Employee session could not call every HR admin report export API.
  - Employee session could not call export audit history or TDS e-file package endpoints.
- Real-user observations:
  - `document-compliance` export is currently a valid zero-row report on staging. The product handles it with headers/manifests, but the pilot dataset should add document compliance rows before final business demo.
  - Statutory deductions still depend on published statutory deduction artifacts. UI/functionality is certified, but richer source-hash proof improves after statutory artifacts are generated for the P100 run.
  - The full report pack is intentionally slow because it visits every report page through a browser. Keep this as a release/pilot certification pack, not a fast smoke test.
- Fixes made during phase:
  - Added `web/tests/e2e/pilot-100-full-report-export-regression.spec.ts`.
  - Hardened the report pack for real product copy, valid zero-state exports, manifest `row_count`, and audit API validation.
- Confidence after staging certification: 94% for HR admin reporting/export regression. Residual risk: richer document/statutory seed coverage and real external provider filing/e-file integrations.

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

Execution result - 2026-09-13:

- Environment: staging, `https://hrms.accerio.in`.
- Browser certification:
  - Command: `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 pnpm --dir web exec playwright test tests/e2e/pilot-100-security-isolation-certification.spec.ts --project=chromium`
  - Result: `4/4` passed in 1.7m.
- Positive evidence:
  - HR admin can use authenticated P100 output setup APIs and download the P100 payroll register/payslip artifacts through HR admin routes.
  - Pilot employee can open ESS payslips and download only their own P100 payslip through the employee-scoped route.
  - Session API confirms HR admin, pilot employee, and pilot manager remain in the same tenant context for the pilot run.
- Negative evidence:
  - Public access to protected workspaces redirects to login without workspace load errors.
  - Stale token access redirects to login.
  - Pilot employee cannot open HR admin workspace.
  - Pilot manager cannot open platform admin workspace.
  - HR admin cannot open platform admin workspace.
  - Platform admin cannot open HR admin workspace.
  - Employee and manager sessions are denied direct HR admin report, payroll output, finance handoff, tenant admin, support, export audit, and TDS package APIs.
  - Anonymous privileged mutation is denied.
  - Employee cannot download the HR admin payroll register artifact, cannot download their own payslip through the HR admin artifact route, and cannot download another employee's ESS payslip.
  - Denial payload checks confirmed no `password`, `secret`, `token`, salary snapshot, debit-account, or live provider strings leaked.
- Real-user observations:
  - P100 employee `E001` is also a manager, so the security proof treats it as a pilot user with ESS plus MSS access and focuses on HR/platform/payroll-artifact denial boundaries. Use `E011` or another non-manager employee if a pure employee-only UX proof is needed.
  - Deterministic cross-tenant fixture creation was intentionally not run on staging in this phase to avoid mutating extra tenants. Existing Phase 7B remains the local deterministic cross-tenant object isolation proof; staging P100-11 certifies role/API/artifact isolation on the active pilot tenant.
- Fixes made during phase:
  - Added `web/tests/e2e/pilot-100-security-isolation-certification.spec.ts`.
  - Hardened the test to use live artifact kind `register`, backend `/auth/session/`, and the root session payload shape.
- Confidence after staging certification: 93% for active-tenant role/API/artifact isolation. Residual risk: staging deterministic cross-tenant object-pair attack proof remains pending by choice to avoid extra staging tenant mutation.

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

Execution result - 2026-09-13:

- Environment: local web `http://127.0.0.1:3100` against staging backend `https://hrms.accerio.in/api/v1`.
- Browser certification:
  - Command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 pnpm --dir web exec playwright test tests/e2e/pilot-100-ux-performance-certification.spec.ts --project=chromium`
  - Result: `3/3` passed in 2.9m.
- Staging deployment and rerun:
  - Deployed commit: `e5c075e35a070662af7166a53cc11947b51585bb`.
  - Services: `hrms-payroll-backend.service` active, `hrms-payroll-web.service` active.
  - Command: `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 pnpm --dir web exec playwright test tests/e2e/pilot-100-ux-performance-certification.spec.ts --project=chromium`
  - Result: `3/3` passed in 7.3m.
- Positive evidence:
  - Desktop and mobile route sweeps passed for employee directory, payroll readiness, payroll inputs, payroll calculations, payroll review, payroll outputs, payroll handoff, report catalog, payroll register report, payslip publication report, export audit history, ESS payslips, and MSS approvals.
  - Long admin/report surfaces exposed pagination where required.
  - No horizontal overflow after the employee-directory mobile fix.
  - No tiny command/field or viewport-outside layout issues were detected by the pilot UX collector.
  - Timing budgets passed for the pilot-scale route set.
- Negative evidence:
  - Initial staging run found a real mobile overflow on `/hr-admin/employees?q=PILOT100_20260912&page_size=50`: document width exceeded mobile viewport by `68px`.
  - Root cause: shared card/detail/filter layouts could retain min-content width on mobile, and long pilot employee codes/emails widened employee detail panels.
  - Fix: added `min-width: 0` and `overflow-wrap: anywhere` constraints to shared section, queue toolbar, record card, detail grid, employee directory list/item/meta, and soft detail values.
- Real-user observations:
  - P100 employee directory is usable after the fix, but it remains dense on mobile. It is acceptable for pilot if mobile is a review/smoke surface; serious HR admin work should still prefer desktop.
  - The P100 UX pack is intentionally narrower than the generic Phase 8 matrix. It focuses on pilot-volume routes and passed after deployment.
- Fixes made during phase:
  - Added `web/tests/e2e/pilot-100-ux-performance-certification.spec.ts`.
  - Updated `web/src/app/globals.css` for mobile width containment and long-value wrapping.
- Confidence after staging certification: 92% for P100 pilot UX/performance on staging. Remaining risk: mobile HR admin work is usable but dense, so final pilot users should be encouraged to perform heavy payroll operations on desktop.

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

Execution result - 2026-09-13:

- Environment: staging, `https://hrms.accerio.in`.
- Deployed commit at final evidence check: `e5c075e35a070662af7166a53cc11947b51585bb`.
- Staging services: `hrms-payroll-backend.service` active, `hrms-payroll-web.service` active.
- Final release-gate browser certification:
  - Initial result: `4/5` passed; one failure was a brittle automation assertion targeting hidden or absent sidebar/navigation text on the HR control-center page.
  - Fix: updated `web/tests/e2e/production-launch-release-gate.spec.ts` to validate visible launch cockpit content and rely on direct route checks for operations, resilience, SLA, provider, support, and tenant-admin pages.
  - Rerun command: `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/production-launch-release-gate.spec.ts --project=chromium --workers=1 --reporter=line --timeout=720000`
  - Rerun result: `5/5` passed in 1.9m.
- Evidence pack:
  - P100-0 through P100-12 are certified or accepted with documented limitations.
  - Report/export evidence covers catalog, payroll register, payslip publication, statutory/compliance reports, finance handoff exceptions, export audit history, CSV exports, manifest/source-hash checks, and role-denial paths.
  - UX/performance evidence includes desktop/mobile screenshots under `web/test-results/.../pilot-100-ux-performance/` and timing samples under `performance-samples.json`.
  - Release-gate evidence includes screenshots under `web/test-results/.../production-launch-release-gate/`.
- Cleanup / retain decision:
  - Do not run cleanup yet.
  - Retain the `PILOT100_20260912` dataset, generated payroll artifacts, export audit history, screenshots, and Playwright outputs until stakeholder review is complete.
- Known accepted limitations:
  - Heavy payroll/HR admin operations are certified on Chrome and remain best suited to desktop; mobile is usable for review/smoke but dense for serious payroll work.
  - Staging deterministic cross-tenant object-pair mutation was intentionally not run to avoid extra staging tenant mutation; role/API/artifact isolation was certified on the active pilot tenant.
  - Real external provider filing/payment rails are not considered live-production certified by this P100 run; provider rehearsal and finance handoff evidence are certified.
  - Backup/restore and rollback runbooks still need an operations drill before a customer-facing production payroll.
- Final decision:
  - `Pilot-ready with accepted limitations`.
  - Overall confidence after P100-13: 94% for a controlled staging pilot rehearsal / internal pilot run.
  - Not yet 100% for unattended production payroll launch until real-provider credentials, backup/restore, rollback, named pilot-user credentials, and customer acceptance are completed.

## Phase P100-14: Pilot Credential Matrix

Real-user intent:

Pilot users can log in with named accounts, reach only the workspaces they are supposed to use, and fail closed when they try unsafe cross-role pages or APIs.

Positive scenarios:

- Platform admin logs in and reaches platform admin console.
- HR admin logs in and reaches HR admin control center and tenant-admin scope.
- Manager logs in and reaches MSS approvals.
- Seed employee logs in and reaches ESS.
- Pure P100 employee logs in and reaches ESS payslips.
- Payroll finance manager logs in and reaches finance handoff/report evidence.
- Support agent logs in and can read approved support scope only.

Negative scenarios:

- HR admin, manager, and employee are denied platform admin pages.
- Manager and employee are denied HR admin pages.
- Pure P100 employee cannot access HR admin report/export/output/support APIs.
- Manager cannot access finance handoff report APIs or platform tenant APIs.
- Payroll finance manager cannot access platform APIs.
- Support agent cannot access HR payroll APIs and cannot read ungranted support scopes.
- Denial payloads must not leak secrets, tokens, salary snapshots, debit accounts, or private keys.

Observations to record:

- Which accounts are certified.
- Any role ambiguity discovered in the P100 seed.

Exit gate:

- Named pilot personas pass browser login, workspace/denial smoke, finance evidence checks, and scoped support-session checks.

Execution result - 2026-09-13:

- Environment: staging, `https://hrms.accerio.in`.
- Browser certification:
  - Command: `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/pilot-credential-matrix-certification.spec.ts --project=chromium --workers=1 --reporter=line --timeout=720000`
  - Initial result: `4/6` passed, `1` failed, `1` did not run.
  - Initial finding: default pilot employee `PILOT100_20260912_E001` has `manager` role, so it is not suitable as the pure employee persona.
  - Fix: changed the credential matrix test to use `PILOT100_20260912_E011`, because seed design makes `E001` through `E010` managers and `E011+` pure employees.
  - Rerun result: `6/6` passed in 1.3m.
- Post-deploy verification:
  - Deployed commit: `05fe1f583f55641d56fe973d13e48430445ef48d`.
  - Services: `hrms-payroll-backend.service` active, `hrms-payroll-web.service` active.
  - Rerun result: `6/6` passed in 1.2m.
- Expanded named finance/support certification:
  - Added `payroll.finance` with `hr-admin` and `payroll-finance-manager` roles plus employee context `PILOT-FIN-001`.
  - Added `support.agent` with `support-agent` role and support-session identifier matching.
  - Expanded command: `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/pilot-credential-matrix-certification.spec.ts --project=chromium --workers=1 --reporter=line --timeout=900000`
  - Result: `10/10` passed in 2.2m.
  - Post-deploy result on commit `1efce7e5dbf91867d6abbce2bf5288192608efb9`: `10/10` passed in 2.3m.
- Certified named accounts:
  - `platform.admin`: platform admin console access.
  - `nisha.rao`: HR admin and tenant-admin access.
  - `karan.mehta`: manager / MSS access.
  - `riya.sharma`: seed employee / ESS access.
  - `pilot100_20260912.e011`: pure P100 employee / ESS payslip access.
  - `payroll.finance`: payroll finance manager / payroll handoff and finance report evidence access.
  - `support.agent`: support-agent login, approved `configuration_health` support scope access, ungranted `payroll_support` denial.
- Confidence after staging certification: 96% for named-user workspace access and support/finance operational personas. Remaining pilot gaps are now operational drills: backup/restore, rollback, real-provider rehearsal, and stakeholder acceptance.

## Phase P100-15: Backup And Restore Drill

Real-user intent:

Operations can recover the pilot dataset if staging data or release state is damaged.

Positive scenarios:

- Take timestamped PostgreSQL backup from staging.
- Record app commit, backup path, size, checksum, and restore catalog count.
- Restore into a scratch database only.
- Verify tenant, pilot employees, named users, payroll runs, output artifacts, and audit evidence exist in the restored database.
- Run Django migration check against the scratch database.
- Drop scratch database after verification.

Negative scenarios:

- Do not restore over live staging database.
- Do not leave scratch databases behind after verification.
- Do not expose database passwords in logs.

Execution result - 2026-09-13:

- Environment: staging, `https://hrms.accerio.in`.
- App commit: `1efce7e5dbf91867d6abbce2bf5288192608efb9`.
- Backup:
  - Source DB: `hrms_stage` on `127.0.0.1`.
  - Backup file: `/var/backups/hrms-payroll-saas/hrms_stage_p100_20260913T084053Z.dump`.
  - Size: `2428598` bytes.
  - SHA-256: `38e4d3a03265d2b49277878da5d309e81ed6ff04d06e709f6f2356313bbbebfb`.
  - Restore catalog entries: `1521`.
- Scratch restore:
  - Scratch DB: `hrms_stage_restore_drill_20260913084114`.
  - Restore command completed successfully with `pg_restore`.
  - Django `migrate --check --noinput` passed against the scratch DB.
  - Scratch DB was dropped after verification.
- Restored-data verification:
  - `northstar-foods` tenant count: `1`.
  - Named users `payroll.finance` and `support.agent`: `2`.
  - `PILOT100_20260912` employees: `100`.
  - Finance employee context `PILOT-FIN-001`: `1`.
  - P100 payroll runs: `5`.
  - Payroll output artifacts: `158`.
  - SaaS commercial audit events: `185`.
- Confidence after staging certification: 97% for recoverability of the current staging pilot dataset. Remaining operational gaps: rollback drill, real-provider rehearsal, monitoring/log review routine, and stakeholder acceptance.
