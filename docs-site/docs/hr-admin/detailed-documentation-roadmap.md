# HR Admin Detailed Documentation Roadmap

Use this roadmap to build practical, example-led HR Admin documentation. Each phase must explain the real workflow, exact user action, expected result, negative cases, and downstream impact.

## On This Page

- [Roadmap Quick Navigation](#roadmap-quick-navigation)
- [Status flags](#status-flags)
- [Documentation standard](#documentation-standard)
- [Phase plan](#phase-plan)
- [Completed HR Admin Documentation Audit](#completed-hr-admin-documentation-audit)
- [Phase 9-15: Payroll](#phase-9-15-payroll)
- [Phase 16: Reports and Audit](#phase-16-reports-and-audit)
- [Phase 17: Launch Readiness and Ops Health](#phase-17-launch-readiness-and-ops-health)
- [Phase 18: End-to-End Recipes](#phase-18-end-to-end-recipes)
- [Update protocol](#update-protocol)

## Roadmap Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Understand documentation quality bar | [Documentation standard](#documentation-standard) | [Status flags](#status-flags) |
| See current phase status | [Phase plan](#phase-plan) | [Completed HR Admin Documentation Audit](#completed-hr-admin-documentation-audit) |
| Review payroll documentation scope | [Phase 9-15: Payroll](#phase-9-15-payroll) | [Phase 13: Payroll Inputs and Calculations](#phase-13-payroll-inputs-and-calculations) |
| Review evidence and launch docs scope | [Phase 16: Reports and Audit](#phase-16-reports-and-audit) | [Phase 17: Launch Readiness and Ops Health](#phase-17-launch-readiness-and-ops-health) |
| Update docs after product changes | [Update protocol](#update-protocol) | [Documentation standard](#documentation-standard) |

## Status flags

| Flag | Meaning |
| --- | --- |
| PLANNED | Section is identified but detailed writing has not started. |
| DRAFTING | Detailed content is being written or expanded. |
| EXAMPLE READY | Real examples, field values, and workflow steps are documented. |
| QA READY | The section is ready for docs QA and product walkthrough review. |
| COMPLETE | The section has passed docs QA and covers positive and negative scenarios. |

## Documentation standard

Every detailed HR Admin guide must include:

- Clear purpose: who uses the feature and when.
- Real-world example: use realistic Indian HR/payroll examples where relevant.
- Exact navigation: where the user starts and which menu to open.
- Field-by-field guidance: what each important field means and recommended values.
- Button behavior: what each action does and what should happen next.
- Positive scenario: a successful end-to-end workflow.
- Negative scenario: missing setup, invalid data, access issue, failed notification, or blocked payroll case.
- Troubleshooting: error message, reason, and corrective action.
- Downstream impact: ESS, MSS, payroll, notifications, documents, reports, and audit impact.
- Screenshot requirement: screenshot only when it reduces user confusion.

## Phase plan

| Phase | Area | Primary user question | Status |
| --- | --- | --- | --- |
| 0 | Roadmap and writing standard | How will HR Admin documentation be organized and tracked? | COMPLETE |
| 1 | Leave Management | How do I set up leave correctly and make employee leave requests work? | COMPLETE |
| 2 | Attendance | How do I manage attendance exceptions, regularization, and payroll impact? | COMPLETE |
| 3 | Employee Master | How do I create, correct, and make employees payroll-ready? | COMPLETE |
| 4 | Organization Setup | How do I configure legal entities, branches, departments, grades, and reporting structure? | COMPLETE |
| 5 | Lifecycle | How do I manage joining, probation, movement, resignation, and exit? | COMPLETE |
| 6 | Documents | How do employees upload documents and how does HR verify or reject them? | COMPLETE |
| 7 | Policies and Workflows | How do I configure rules, approvals, effective dates, and conflicts? | COMPLETE |
| 8 | Notifications | Which events send email or in-app alerts, and how do I recover failed delivery? | COMPLETE |
| 9 | Payroll Control | How do I move payroll from readiness to inputs without missing blockers? | COMPLETE |
| 10 | Payroll Setup | How do I configure calendars, periods, pay groups, and assignments? | COMPLETE |
| 11 | Salary Setup | How do I configure salary components, structures, HRA, bonus, and revisions? | COMPLETE |
| 12 | Payroll Rules | How do formulas, versions, and traces work? | COMPLETE |
| 13 | Payroll Inputs and Calculations | How do locked inputs become calculated payroll lines? | COMPLETE |
| 14 | Payroll Review, Outputs, and Handoff | How do I review, publish, export, and hand off payroll? | COMPLETE |
| 15 | Statutory Payroll | How do PF, ESI, PT, TDS, declarations, and proofs work for India? | COMPLETE |
| 16 | Reports and Audit | How do I find evidence, export reports, and verify sensitive changes? | COMPLETE |
| 17 | Launch Readiness and Ops Health | How do I clear blockers before go-live? | COMPLETE |
| 18 | End-to-End Recipes | How do I complete practical business scenarios from start to finish? | COMPLETE |

## Phase 1: Leave Management

Status: COMPLETE

### Scope

Create detailed documentation for:

- Leave types.
- Leave policies.
- Earned Leave setup.
- Casual Leave setup.
- Sick Leave setup.
- Leave policy assignment.
- Leave balances and opening balance.
- Accrual, carry forward, encashment, and negative balance behavior.
- Employee leave request from ESS.
- Manager approval from MSS.
- Leave cancellation and correction.
- Attachment requirements.
- Leave impact on payroll.
- Leave errors and fixes.

### Example-led sections to write

| Section | Example to document | Status |
| --- | --- | --- |
| Leave type setup | Create `Earned Leave` with code `EL` and unit `Days`. | COMPLETE |
| Earned Leave policy | 18 days/year, monthly accrual, carry forward cap, approval required. | COMPLETE |
| Casual Leave policy | 12 days/year, no carry forward, approval required. | COMPLETE |
| Sick Leave policy | 6 days/year, attachment required after configured duration. | COMPLETE |
| Policy assignment | Assign Earned Leave to all employees in one legal entity. | COMPLETE |
| Opening balance | Add 6 days opening Earned Leave for migrated employee. | COMPLETE |
| Employee request | Employee applies one day Earned Leave from ESS. | COMPLETE |
| Manager approval | Manager approves or rejects from MSS. | COMPLETE |
| Attachment case | Employee submits medical certificate for Sick Leave. | COMPLETE |
| Missing policy error | Fix "No active leave policy is assigned to this employee." | COMPLETE |
| Payroll impact | Approved leave becomes payroll input; pending leave remains a readiness warning. | COMPLETE |

### Phase 1 quality gate

Mark Phase 1 COMPLETE only when:

- HR Admin Leave guide contains the full Earned Leave example.
- ESS leave request and MSS approval are linked from the guide.
- Missing leave policy, missing balance, invalid date, attachment missing, and approval route missing cases are documented.
- Leave-to-payroll impact is explained.
- `pnpm qa:docs` passes.

## Phase 2: Attendance

Status: COMPLETE

### Example-led sections to write

| Section | Example to document | Status |
| --- | --- | --- |
| Attendance records | Review daily attendance for a branch. | COMPLETE |
| Missed punch | Employee raises missed punch regularization. | COMPLETE |
| Late coming | HR reviews late-coming exception. | COMPLETE |
| Manager approval | Manager approves attendance correction from MSS. | COMPLETE |
| Shift and weekly off dependency | Explain why attendance can be wrong if shift is missing. | COMPLETE |
| Payroll impact | Attendance exceptions block payroll readiness. | COMPLETE |

### Phase 2 quality gate

Phase 2 is COMPLETE because:

- HR Admin Attendance guide explains daily review and payroll-period review.
- Missed punch, late coming, missing shift, holiday conflict, and after-cutoff cases are documented.
- ESS attendance request and MSS approval are linked from the guide.
- Attendance-to-payroll impact is explained.
- Troubleshooting includes setup, workflow, and payroll lock failures.
- `pnpm qa:docs` passes.

## Phase 3: Employee Master

Status: COMPLETE

### Example-led sections to write

| Section | Example to document | Status |
| --- | --- | --- |
| Create employee | Create a Bengaluru employee with department, manager, and work email. | COMPLETE |
| Employee access | Send invite and confirm workspace access. | COMPLETE |
| Manager mapping | Assign reporting manager and verify MSS visibility. | COMPLETE |
| Bank details | Add primary bank account for payroll. | COMPLETE |
| Payroll readiness | Fix missing legal entity, branch, department, bank, and salary issues. | COMPLETE |
| Import correction | Resolve duplicate employee code or missing mandatory column. | COMPLETE |

### Phase 3 quality gate

Phase 3 is COMPLETE because:

- HR Admin Employees guide explains what Employee Master owns and what belongs to Organization, Lifecycle, Salary Setup, Leave, Attendance, Documents, and Tenant Admin.
- Field-by-field guidance covers identity, employment status, organization structure, manager chain, access, and payroll readiness.
- Bengaluru employee creation, ESS access, manager readiness, payroll readiness, and import correction examples are documented.
- Positive and negative scenarios cover Workspace Access, missing manager, missing structure, leave policy failure, attendance setup failure, salary blocker, bank blocker, statutory blocker, and failed invite email.
- Employee-to-payroll downstream impact is explained.
- `pnpm qa:docs` passes.

## Phase 4: Organization Setup

Status: COMPLETE

### Example-led sections to write

| Section | Example to document | Status |
| --- | --- | --- |
| Legal entity | Create Accerio India Pvt Ltd legal entity. | COMPLETE |
| Location and branch | Create Bengaluru location and Bengaluru HO branch. | COMPLETE |
| Department | Create People Operations and Engineering departments. | COMPLETE |
| Grade and designation | Create grade, level, and designation masters. | COMPLETE |
| Reporting structure | Explain how organization data affects employee and payroll readiness. | COMPLETE |

### Phase 4 quality gate

Phase 4 is COMPLETE because:

- HR Admin Organization guide explains each master: legal entity, location, branch, business unit, department, cost center, grade, designation, and employee type.
- Setup order, dependency rules, browser form flow, CSV import flow, and safe edit rules are documented.
- Accerio India Bengaluru setup, Mumbai branch setup, and missing department import correction examples are documented.
- Negative scenarios cover missing branch, missing legal entity, wrong leave scope, attendance holiday mismatch, wrong cost center, duplicate masters, and changed codes.
- Organization-to-employee, payroll, leave, attendance, salary, statutory, reports, and finance impact is explained.
- `pnpm qa:docs` passes.

## Phase 5: Lifecycle

Status: COMPLETE

### Example-led sections to write

| Section | Example to document | Status |
| --- | --- | --- |
| Joining | Move a candidate/new hire into active employee state. | COMPLETE |
| Probation | Confirm employee after probation date. | COMPLETE |
| Transfer | Transfer employee from one branch to another. | COMPLETE |
| Promotion | Update designation, grade, and compensation effective date. | COMPLETE |
| Exit | Start resignation, complete exit checklist, and trigger final settlement. | COMPLETE |

### Phase 5 quality gate

Phase 5 is COMPLETE because:

- HR Admin Lifecycle guide explains when to use Lifecycle instead of direct Employee Master edits.
- Joiner, transfer, promotion, manager change, probation, resignation, and exit examples are documented.
- Owner, due date, effective date, approval, evidence, bulk action, and status behavior are documented.
- Payroll impact covers joining, movement, manager, probation, exit, leave encashment, attendance, salary, access, and F&F.
- Negative scenarios cover ineffective movement, old manager routing, overdue probation, exit access, missing F&F, and incorrect bulk status changes.
- `pnpm qa:docs` passes.

## Phase 6: Documents

Status: COMPLETE

### Example-led sections to write

| Section | Example to document | Status |
| --- | --- | --- |
| Required document | Mark PAN and bank proof as required documents for India payroll employees. | COMPLETE |
| Employee upload | Employee uploads PAN from ESS. | COMPLETE |
| HR verification | HR accepts PAN document after checking name and readable PAN number. | COMPLETE |
| Rejection | HR rejects unclear bank proof and employee resubmits. | COMPLETE |
| Expiry | Track expiring passport, visa, contract, or certification documents. | COMPLETE |
| Requirement visibility | Fix employee cannot see a document request in ESS. | COMPLETE |
| Payroll blocker | Clear payroll readiness blocker after verifying bank or PAN proof. | COMPLETE |

### Phase 6 quality gate

Phase 6 is COMPLETE because:

- HR Admin Documents guide explains categories, requirements, employee upload, HR review, rejection, expiry, evidence trail, and payroll/launch impact.
- PAN, bank proof, previous employment proof, and passport/visa examples are documented with practical field values.
- Positive and negative scenarios cover missing request visibility, wrong category, name mismatch, expired proof, duplicate requirements, and payroll blocker remaining after verification.
- ESS document upload, workflow guide, troubleshooting guide, Employee Master, Payroll Control, and Reports/Audit links are included.
- `pnpm qa:docs` passes.

## Phase 7: Policies and Workflows

Status: COMPLETE

### Example-led sections to write

| Section | Example to document | Status |
| --- | --- | --- |
| Approval route | Create leave approval workflow manager first, HR fallback second. | COMPLETE |
| Attendance route | Regularization routes to manager and escalates to HR/Time Office. | COMPLETE |
| Lifecycle route | Transfer, promotion, manager change, probation, and exit use owner, approver, effective date, and evidence. | COMPLETE |
| Payroll review route | Payroll review requires approval before output and finance handoff. | COMPLETE |
| Policy priority | Company-wide default versus department-specific override. | COMPLETE |
| Effective dating | Change policy from next month without affecting past requests or closed payroll. | COMPLETE |
| Conflict handling | Resolve overlapping policy assignment and duplicate entitlement behavior. | COMPLETE |
| Stuck approvals | Fix missing manager, inactive approver, missing MSS access, and missing fallback. | COMPLETE |

### Phase 7 quality gate

Phase 7 is COMPLETE because:

- Policies guide explains the difference between policies and workflows, setup order, field guidance, scope, priority, effective dates, rollout, and conflict resolution.
- Workflows guide explains templates, steps, owners, approvers, fallback, escalation, versioning, evidence, and stuck request handling.
- Earned Leave, Sick Leave, department override, future-dated change, attendance regularization, manager-first approval, lifecycle movement, payroll review, and document rejection examples are documented.
- Negative scenarios cover no active policy, manager cannot approve, policy change breaks payroll, approval stuck with manager, workflow template missing, missing rejection reason, old manager routing, and too many approval levels.
- `pnpm qa:docs` passes.

## Phase 8: Notifications

Status: COMPLETE

### Example-led sections to write

| Section | Example to document | Status |
| --- | --- | --- |
| Invite email | New user receives account setup email and lands in correct workspace. | COMPLETE |
| Password reset | User requests reset email from login and can set a new password. | COMPLETE |
| Leave notification | Employee and manager receive leave request and decision updates. | COMPLETE |
| Attendance notification | Employee and manager receive regularization request and decision updates. | COMPLETE |
| Document rejection | Employee receives correction reason for rejected proof. | COMPLETE |
| Tax declaration rejection | Employee receives correction reason for rejected proof. | COMPLETE |
| Payslip notification | Employee receives payslip published notification when enabled. | COMPLETE |
| Payroll review/handoff | Payroll and finance users receive review and handoff alerts. | COMPLETE |
| Failed delivery | HR opens failed queue, checks channel health, and retries only after root cause is fixed. | COMPLETE |
| Template behavior | Explain event, recipient, channel, variables, links, and role-aware template behavior. | COMPLETE |

### Phase 8 quality gate

Phase 8 is COMPLETE because:

- HR Admin Notifications guide includes a must-test notification matrix for invites, password reset, leave, attendance, documents, tax declarations, payslips, payroll review, handoff, and launch blockers.
- Queue review, Notification Delivery channel health, template standards, event setup, retry decisions, and evidence capture are documented.
- Positive examples cover invite, password reset, leave, attendance, document rejection, payslip publish, payroll review, and finance handoff.
- Negative scenarios cover missing invite, direct SMTP works but app email does not, retry cap, wrong workspace link, and wrong recipient.
- `pnpm qa:docs` passes.

## Completed HR Admin Documentation Audit

Status: PASSED on 2 Oct 2026 before starting payroll documentation.

Completed modules audited:

| Module | Practical examples | Negative paths | FAQ/troubleshooting | Status |
| --- | ---: | ---: | --- | --- |
| Leave Management | 15 | 4 | Troubleshooting and FAQ included. | PASS |
| Attendance | 7 | 5 | Troubleshooting and quality checks included. | PASS |
| Employee Master | 4 | 2 | FAQ and readiness checks included. | PASS |
| Organization Setup | 3 | 2 | FAQ and setup dependency checks included. | PASS |
| Lifecycle | 6 | 2 | FAQ, evidence, and payroll impact included. | PASS |
| Documents | 8 | 7 | FAQ, rejection, expiry, and payroll blocker handling included. | PASS |
| Policies and Workflows | 15 combined | 10 combined | Policy conflicts, approval routes, escalation, and FAQ included. | PASS |
| Notifications | 8 | 10 | Trigger matrix, retry recovery, evidence, and FAQ included. | PASS |
| Onboarding Prerequisites | 8 | 4 | Tenant access, manager chain, documents, imports, and setup sequence included. | PASS |
| Imports | 5 | 5 | Preview, validation, duplicate detection, missing organization codes, and bad-data recovery included. | PASS |
| Launch Readiness | 4 | 3 | Blocker ownership, source-page correction, accepted risk, and close criteria included. | PASS |
| Ops Health | 4 | 3 | Notification health, provider queue, support access, API/public URL, and escalation evidence included. | PASS |
| Reports and Audit | 5 | 3 | Pre-payroll evidence pack, workforce readiness, leave/attendance evidence, and audit investigation included. | PASS |

Audit criteria:

- Each completed module explains the business purpose and user responsibility.
- Each completed module includes practical examples instead of only field descriptions.
- Negative cases are documented for missing setup, invalid data, approval failure, access issue, or delivery failure.
- Scenario coverage points to positive and negative paths.
- Onboarding prerequisites show the correct setup order before employee onboarding.
- Documentation QA passes with strict MkDocs build.

Verification command:

```bash
pnpm qa:docs
```

## Phase 9-15: Payroll

Status: PHASES 9-15 COMPLETE

Payroll documentation must remain split into single-responsibility guides:

- Payroll Control: readiness and phase movement.
- Payroll Setup: calendars, periods, pay groups, assignments.
- Salary Setup: salary components, structures, and employee salary.
- Payroll Rules: formula versions and trace.
- Payroll Inputs: source snapshots and input lock.
- Payroll Calculations: calculations and line trace.
- Payroll Review: blockers, exceptions, approval.
- Payroll Outputs: payslips, registers, exports.
- Payroll Handoff: finance/provider handoff.
- Statutory Payroll: PF, ESI, PT, TDS, declarations, proofs.
- Adjustments and Settlements: bonus, arrears, reimbursement, F&F.

Each payroll guide must include at least one real monthly payroll example and one blocked-case example.

## Phase 9: Payroll Control

Status: COMPLETE

### Example-led sections completed

| Section | Example to document | Status |
| --- | --- | --- |
| Payroll readiness decision | September 2026 Accerio India readiness with employees in scope, ready, warnings, blocked, and pending approvals. | COMPLETE |
| Bank blocker | Fix missing primary bank account before input lock. | COMPLETE |
| Pending approval blocker | Resolve pending leave approval before payroll. | COMPLETE |
| Warning acceptance | Accept non-critical document warning with owner and evidence. | COMPLETE |
| Ready percentage confusion | Explain why high readiness percentage can still be blocked. | COMPLETE |
| Locked snapshot behavior | Explain why source edits after input lock do not update payroll automatically. | COMPLETE |
| Missing employee from scope | Diagnose pay group, joining, exit, legal entity, branch, and salary effective-date issues. | COMPLETE |
| Evidence checklist | Payroll Control summary, issues, employee readiness, leave/attendance, audit, and warning notes. | COMPLETE |

### Phase 9 quality gate

Phase 9 is COMPLETE because:

- Payroll Control explains owner responsibilities for HR Admin, Payroll Admin, Finance Manager, and Tenant Admin.
- The page documents decision rules for ready, warning, blocked, pending approval, and locked states.
- The guide includes realistic monthly payroll examples and source-page correction paths.
- Negative scenarios cover blocked readiness despite high percentage, post-lock source edits, and missing employee scope.
- Pre-input lock checks and evidence requirements are documented.
- `pnpm qa:docs` passes.

## Phase 10: Payroll Setup

Status: COMPLETE

### Example-led sections completed

| Section | Example to document | Status |
| --- | --- | --- |
| Calendar setup | Create India monthly payroll calendar with INR and Asia/Kolkata. | COMPLETE |
| Duplicate calendar risk | Explain why multiple similar active calendars confuse payroll. | COMPLETE |
| Period setup | Create September 2026 payroll period under the correct calendar. | COMPLETE |
| Overlapping period risk | Explain how overlapping dates can corrupt payroll scope. | COMPLETE |
| Pay group setup | Create Monthly Staff, Contract Staff, and Hold Payroll groups. | COMPLETE |
| Wrong pay group risk | Explain employee assigned to contract group by mistake. | COMPLETE |
| Assignment setup | Assign pilot employees to Monthly Staff for September payroll. | COMPLETE |
| Late effective date risk | Explain missing employee due to assignment starting after period. | COMPLETE |
| Long-list handling | Pagination, filters, search, and bulk assignment expectations. | COMPLETE |
| Setup evidence | Calendar, period, pay group, assignment export, and audit trail. | COMPLETE |

### Phase 10 quality gate

Phase 10 is COMPLETE because:

- Payroll Setup explains each setup object and owner responsibility.
- India monthly calendar, September payroll period, pay group, and assignment examples are documented.
- Negative scenarios cover duplicate calendars, overlapping periods, wrong pay group, and late assignment effective date.
- Pagination/search expectations are documented for customer-scale tenants.
- Pre-payroll setup checklist and evidence requirements are documented.
- `pnpm qa:docs` passes.

## Phase 11: Salary Setup

Status: COMPLETE

### Example-led sections completed

| Section | Example to document | Status |
| --- | --- | --- |
| Component design | Create Basic and HRA components with taxable and payslip-visible settings. | COMPLETE |
| Indian HRA setup | HRA 40% for Bengaluru/non-metro and 50% for Delhi/metro. | COMPLETE |
| Bonus frequency | Monthly, quarterly, annual, joining, and retention bonus setup approach. | COMPLETE |
| Annual bonus risk | Explain annual bonus incorrectly added as monthly component. | COMPLETE |
| Salary structure | Create India Staff salary structure. | COMPLETE |
| Effective-dated version | Create salary version effective 01 Sep 2026. | COMPLETE |
| Historical version risk | Explain why old versions should not be edited after payroll. | COMPLETE |
| Employee assignment | Assign Aditi Gupta annual CTC of `₹9,60,000`. | COMPLETE |
| Promotion revision | Salary revision after promotion effective 01 Oct 2026. | COMPLETE |
| Effective date risk | Explain salary assigned after payroll period causing blocker. | COMPLETE |
| Evidence | Components, structure versions, assignments, approvals, traces, and audit. | COMPLETE |

### Phase 11 quality gate

Phase 11 is COMPLETE because:

- Salary Setup explains component, structure, version, and assignment responsibilities.
- Indian salary examples include Basic, HRA, CTC, city-based rules, and bonus frequency.
- Negative scenarios cover recurring annual bonus mistakes, historical version edits, and wrong effective dates.
- Safe change workflow explains permanent, effective-dated, and one-time salary changes.
- Pre-calculation checklist and evidence requirements are documented.
- `pnpm qa:docs` passes.

## Phase 12: Payroll Rules

Status: COMPLETE

### Example-led sections completed

| Section | Example to document | Status |
| --- | --- | --- |
| Rule design standard | One business purpose, explicit dependencies, effective-dated versions, trace review. | COMPLETE |
| HRA rule | HRA 50% for metro and 40% for non-metro cities. | COMPLETE |
| Proration rule | Monthly salary prorated by payable days for mid-month joiner. | COMPLETE |
| Quarterly bonus rule | Bonus paid only in June, September, December, and March. | COMPLETE |
| Versioning workflow | Create new versions instead of editing historical payroll logic. | COMPLETE |
| Future HRA change | Change Bengaluru HRA from 40% to 45% from next month. | COMPLETE |
| Missing dependency | HRA wrong because Basic, city, version, or priority is missing. | COMPLETE |
| Trace review | How to inspect employee, component, rule version, dependencies, and result. | COMPLETE |
| Duplicate component rules | Resolve two rules affecting the same component. | COMPLETE |
| Evidence | Catalog, versions, dependencies, trace, approval note, and audit trail. | COMPLETE |

### Phase 12 quality gate

Phase 12 is COMPLETE because:

- Payroll Rules explains when to use rules versus salary assignment or adjustments.
- Real examples cover HRA, proration, quarterly bonus, and future rule changes.
- Negative scenarios cover no versioning, missing dependencies, circular/duplicate logic, and old rule traces.
- Trace reading is documented as the routine way to explain a payroll amount.
- Pre-activation checklist and evidence requirements are documented.
- `pnpm qa:docs` passes.

## Phase 13: Payroll Inputs and Calculations

Status: COMPLETE

### Example-led sections completed

| Section | Example to document | Status |
| --- | --- | --- |
| Input ownership | Explain employee, organization, salary, attendance, leave, bank, statutory, documents, adjustments, and rules as source families. | COMPLETE |
| September input snapshot | Create and review September 2026 payroll input snapshot. | COMPLETE |
| Employee snapshot review | Review Aditi Gupta source families before input lock. | COMPLETE |
| Input lock | Lock September payroll inputs after readiness evidence is complete. | COMPLETE |
| Lock blocker | Resolve missing bank account blocker before lock. | COMPLETE |
| Post-lock source change | Explain why source edits after lock do not automatically update the payroll run. | COMPLETE |
| Wrong run risk | Detect and avoid locking a test or wrong-period payroll run. | COMPLETE |
| Calculation run | Calculate September 2026 draft payroll from locked inputs. | COMPLETE |
| HRA trace | Investigate HRA amount using locked input and rule trace. | COMPLETE |
| Zero net pay | Separate valid zero net pay from missing salary or wrong deduction. | COMPLETE |
| Calculation blockers | Resolve inputs-not-locked and missing employee calculation failures. | COMPLETE |
| Rerun governance | Document when recalculation is allowed and what evidence must be kept. | COMPLETE |

### Phase 13 quality gate

Phase 13 is COMPLETE because:

- Payroll Inputs explains source ownership, snapshot states, input lock, warning acceptance, and post-lock behavior.
- Payroll Calculations explains draft calculation, validation, line trace, rerun behavior, and payroll amount investigation.
- Real examples cover September payroll inputs, employee snapshot review, input lock, HRA trace, and zero net pay investigation.
- Negative scenarios cover blocked input lock, wrong run selected, post-lock source edits, inputs-not-locked calculation failure, stale latest net pay, and missing employees.
- Evidence requirements are documented for both input lock and calculation signoff.
- `pnpm qa:docs` passes.

## Phase 14: Payroll Review, Outputs, and Handoff

Status: COMPLETE

### Example-led sections completed

| Section | Example to document | Status |
| --- | --- | --- |
| Review ownership | Explain Payroll Admin, HR Admin, Finance Manager, approver, and auditor responsibilities. | COMPLETE |
| Exception decision | Approve, reject, mark reviewed, or defer exceptions with notes. | COMPLETE |
| September review approval | Approve September 2026 payroll after warnings are reviewed. | COMPLETE |
| Warning acceptance | Accept a pending document proof warning with owner, due date, and pay-impact note. | COMPLETE |
| Payroll rejection | Reject payroll when salary effective date causes zero net pay. | COMPLETE |
| Early final lock risk | Explain why final lock should wait until finance review is complete. | COMPLETE |
| Output generation | Generate September payroll outputs after approval. | COMPLETE |
| Payslip publication | Publish payslips to ESS only after finance confirms final payroll. | COMPLETE |
| Payroll register export | Export official register for finance without manual editing. | COMPLETE |
| Output mismatch | Troubleshoot payslip count mismatch and wrong-run output. | COMPLETE |
| Finance handoff | Generate, transmit, acknowledge, and audit September finance handoff. | COMPLETE |
| Provider recovery | Handle finance rejection, provider retry cap, and missing acknowledgement. | COMPLETE |

### Phase 14 quality gate

Phase 14 is COMPLETE because:

- Payroll Review explains exception severity, decision notes, approval trail, final lock, rejection, and reopen risks.
- Payroll Outputs explains artifact types, publish rules, payslip visibility, sensitive downloads, regeneration, and access evidence.
- Payroll Handoff explains finance/provider delivery, acknowledgement, retry, manual acceptance, and audit pack evidence.
- Real examples cover September payroll review, warning acceptance, payroll rejection, output generation, payslip publication, finance export, and handoff.
- Negative scenarios cover approving blockers, early final lock, approver access failure, payslip mismatch, wrong output run, finance rejection, retry cap, and missing acknowledgement.
- `pnpm qa:docs` passes.

## Phase 15: Statutory Payroll

Status: COMPLETE

### Example-led sections completed

| Section | Example to document | Status |
| --- | --- | --- |
| India statutory areas | PF, ESIC, Professional Tax, LWF, TDS, PAN, and UAN responsibilities. | COMPLETE |
| Statutory pack | Configure Accerio India statutory pack effective 01 Sep 2026. | COMPLETE |
| Employer registrations | Configure PF, ESIC, PT, TAN, legal entity, and effective date references. | COMPLETE |
| PF setup | Map employee PF, employer PF, Basic salary, UAN, and reporting checks. | COMPLETE |
| ESIC setup | Configure ESIC applicability, wage threshold checks, and employer contribution mapping. | COMPLETE |
| Professional Tax | Apply state-specific PT for Karnataka, Maharashtra, and non-applicable states. | COMPLETE |
| TDS declaration | Use ESS declaration, proof status, PAN, regime, and accepted values for payroll. | COMPLETE |
| Proof rejection | Reject unreadable tax proof and guide employee correction before cutoff. | COMPLETE |
| Missing PAN | Resolve missing PAN statutory blocker or document exception. | COMPLETE |
| Outdated slab | Create effective-dated slab version instead of editing historical setup. | COMPLETE |
| Wrong PT state | Correct branch/lifecycle state before recalculation. | COMPLETE |
| Late proof | Explain proof accepted after payroll lock and controlled recalculation. | COMPLETE |
| Statutory reports | PF, ESIC, PT, LWF, TDS, proof report, and exception evidence. | COMPLETE |

### Phase 15 quality gate

Phase 15 is COMPLETE because:

- Statutory Payroll explains India statutory setup across employer registration, employee profile, slabs, components, declarations, proof verification, calculation, output, and evidence.
- Real examples cover India statutory pack, employer registrations, PF, ESIC, Professional Tax, TDS declarations, and proof rejection.
- Negative scenarios cover missing PAN, outdated slabs, wrong PT state, proof after input lock, and incorrect ESIC applicability.
- Payroll calculation and report sampling are documented for practical audit readiness.
- Onboarding prerequisites now link to launch-grade statutory guidance.
- `pnpm qa:docs` passes.

## Phase 16: Reports and Audit

Status: COMPLETE

### Example-led sections completed

| Section | Example to document | Status |
| --- | --- | --- |
| Employee report | Export active employee list. | COMPLETE |
| Payroll report | Export payroll register after close. | COMPLETE |
| Audit log | Find who changed employee structure before payroll. | COMPLETE |
| Evidence | Build pre-payroll evidence pack for HR signoff. | COMPLETE |
| Payroll evidence | Attach audit evidence to payroll signoff. | COMPLETE |

### Phase 16 quality gate

Phase 16 is COMPLETE because:

- Reports and Audit explains operational reports, report controls, drilldowns, audit filters, and export discipline.
- Pre-payroll evidence covers workforce, organization, manager, bank, statutory, leave, attendance, document, launch, and audit checks.
- Payroll close evidence covers payroll register, bank advice, payslip publication, statutory reports, approval, artifact manifest, finance receipt, and export trail.
- Real examples cover workforce readiness, leave and attendance evidence, payroll register export, audit evidence attachment, and employee record investigation.
- Negative scenarios cover report/source mismatch, wrong period export, draft register sent to finance, and missing audit evidence.
- `pnpm qa:docs` passes.

## Phase 17: Launch Readiness and Ops Health

Status: COMPLETE

### Example-led sections completed

| Section | Example to document | Status |
| --- | --- | --- |
| Launch blocker | Assign and resolve missing employee role blocker. | COMPLETE |
| Organization blocker | Resolve missing legal entity, branch, or department blocker. | COMPLETE |
| Ops health | Check API base URL, email health, public app URL, and provider queue. | COMPLETE |
| Go-live handoff | Complete evidence before activation. | COMPLETE |

### Phase 17 quality gate

Phase 17 is COMPLETE because:

- Launch Readiness explains blocker routing, owner assignment, source-page fixes, ignored risk notes, and close discipline.
- Ops Health explains API, public URL, notification, provider queue, support access, resilience, and SLA health checks.
- Real examples cover employee access blockers, organization blockers, owner/due-date assignment, go-live handoff evidence, notification failure review, support access review, API/public URL health, and pre-activation Ops Health review.
- Negative scenarios cover closing blockers while source issues remain, ignoring risk without evidence, stale provider queues, and support access without a ticket.
- `pnpm qa:docs` passes.

## Phase 18: End-to-End Recipes

Status: COMPLETE

### Recipes completed

| Recipe | End result | Status |
| --- | --- | --- |
| New employee to first payroll | Employee is created, invited, payroll-ready, and included in payroll. | COMPLETE |
| Earned Leave setup to approval | Earned Leave policy is created, assigned, requested, approved, and reflected in payroll. | COMPLETE |
| Attendance correction to payroll | Missed punch is regularized, approved, and included in payroll inputs. | COMPLETE |
| Document rejection to resubmission | Employee document is rejected, resubmitted, accepted, and cleared. | COMPLETE |
| Salary revision to payroll | Salary revision is effective-dated and visible in payroll calculation. | COMPLETE |
| Employee exit to final settlement | Exit is completed and final settlement is prepared. | COMPLETE |

### Phase 18 quality gate

Phase 18 is COMPLETE because:

- HR Admin Task Recipes includes complete operational recipes that connect Organization, Employees, ESS, MSS, Leave, Attendance, Documents, Salary Setup, Payroll Control, Payroll Inputs, Payroll Calculations, Adjustments, and Handoff.
- Recipes include expected results so users know when the workflow is actually complete.
- Negative support-reduction paths remain linked through the detailed module guides and troubleshooting guides.
- `pnpm qa:docs` passes.

## Update protocol

After completing each phase:

1. Update the phase status in this roadmap.
2. Update the granular section statuses for that phase.
3. Add or update screenshots only if they clarify the workflow.
4. Add the completed page to navigation if it is a new guide.
5. Run:

```bash
pnpm qa:docs
```

6. Mark the phase COMPLETE only if docs QA passes and the guide covers both successful and failed scenarios.
