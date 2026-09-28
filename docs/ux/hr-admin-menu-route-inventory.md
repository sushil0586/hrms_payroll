# HR Admin Menu And Route Inventory

This document is the working inventory for the HR Admin typography and UX rollout. It records every visible menu entry, child route, major cross-link, expected user intent, and quality status so each phase can be reviewed without rediscovering the app structure.

Related documents:

- `docs/ux/typography-system.md`
- `docs/ux/payroll-readiness-redesign.md`
- `docs/qa/hr-admin-enterprise-ui-phase-plan-2026-09-19.md`

## Source Of Truth

The HR Admin navigation is defined in two places:

- Frontend fallback navigation: `web/src/lib/ui/navigation.ts`
- Backend DB-backed menu catalog: `backend/apps/iam/menu_catalog.py`

The shell that renders the menu and quick links is:

- `web/src/app/hr-admin/layout.tsx`
- `web/src/components/shell/hr-admin-chrome.tsx`
- `web/src/components/shell/workspace-chrome.tsx`

## Quality Status Legend

- `Pending`: route is inventoried but not yet reviewed in this typography rollout.
- `Pilot`: notification typography pilot has already touched the screen.
- `Needs QA`: visual or functional behavior must be checked in browser.
- `Passed`: desktop, mobile, link, button, typecheck, lint, and build passed for this phase.

## Global HR Admin Shell

| Area | Route/Component | Purpose | Typography Rule | QA Status |
| --- | --- | --- | --- | --- |
| Sidebar brand | `WorkspaceChrome` | Identify HRMS and HR Admin workspace | App Shell | Passed |
| Sidebar groups | `Command`, `Workforce`, `Time & Leave`, `Payroll`, `Compliance`, `Insights`, `Setup`, `Operations` | Organize dense workflow surface into collapsible groups | App Shell / Sidebar Labels | Passed |
| Top search placeholder | `WorkspaceChrome` | Future command/search affordance | App Shell / Top Search | Passed |
| Quick links | `/ess`, `/mss/approvals` | Switch from HR Admin to employee or manager view | Buttons / Top Quick Links | Passed |
| User chip | Current session user | Confirms signed-in identity and role | App Shell / User Chip | Passed |
| Sign out | `LogoutButton` | End session | Buttons | Passed |

## Top-Level Menu Inventory

| Group | Menu | Route | Intended Purpose | Permissions | Rollout Phase | QA Status |
| --- | --- | --- | --- | --- | --- | --- |
| Command | Dashboard | `/hr-admin` | Action queue, readiness posture, launch guardrails, and next actions | `employees.view`, `organization.view`, `payroll.review`, `reports.catalog.view` | Phase 2 | Passed |
| Command | Launch Readiness | `/hr-admin/launch-remediation` | Close launch blockers and capture release evidence | `organization.view`, `employees.view`, `payroll.review` | Phase 2 | Passed |
| Workforce | Employees | `/hr-admin/employees` | Employee directory, access readiness, structure review, employee imports | `employees.view`, `employees.create`, `employees.edit`, `employees.import`, `employees.access.manage` | Phase 3A | Passed |
| Workforce | Lifecycle | `/hr-admin/lifecycle` | Joiners, movements, probation, exits, lifecycle queue | `lifecycle.view`, `lifecycle.manage` | Phase 4 | Passed |
| Workforce | Documents | `/hr-admin/employee-documents` | Employee document upload, verification, review backlog, categories, requirements, and generated letters | `documents.view`, `documents.manage`, `documents.verify` | Phase 5A | Passed |
| Time & Leave | Attendance | `/hr-admin/attendance-operations` | Attendance records, shifts, rosters, holidays, regularization review | `attendance.view`, `attendance.records.manage`, `attendance.regularization.review` | Phase 5B | Passed |
| Time & Leave | Leave | `/hr-admin/leave-balances` | Leave balances and leave operations | `leave.view`, `leave.policies.manage` | Phase 5B | Passed |
| Time & Leave | Policies | `/hr-admin/policies` | Leave and attendance policy setup, assignments, and governance | `leave.policies.manage`, `attendance.policies.manage` | Phase 5B | Passed |
| Payroll | Payroll Control | `/hr-admin/payroll-readiness` | Payroll cockpit, source readiness, blockers, cycle workflow entry point | `payroll.inputs.view`, `payroll.review`, `payroll.outputs.view` | Phase 6C.0 | Passed |
| Payroll | Payroll Setup | `/hr-admin/payroll-setup` | Payroll periods, pay groups, calendars, and run setup | `payroll.setup.view`, `payroll.setup.manage` | Phase 6C.1 | Passed |
| Payroll | Salary Setup | `/hr-admin/salary-setup` | Salary structures, components, and employee salary configuration | `payroll.setup.view`, `payroll.setup.manage` | Phase 6C.2 | Passed |
| Payroll | Payroll Rules | `/hr-admin/payroll-rules` | Formula/rule versions, rule governance, and calculation policy | `payroll.setup.view`, `payroll.setup.manage` | Phase 6C.3 | Passed |
| Payroll | Statutory | `/hr-admin/payroll-statutory` | Statutory setup, filing readiness, contribution checks | `statutory.setup.view`, `statutory.filing.view` | Phase 6C.4 | Passed |
| Payroll | Providers | `/hr-admin/payroll-providers` | Payroll integrations, provider mapping, launch rehearsal | `payroll.setup.view`, `payroll.setup.manage` | Phase 6C.5 | Passed |
| Payroll | Adjustments & Settlements | `/hr-admin/payroll-adjustments` | Payroll exceptions, one-time adjustments, settlement preparation, and F&F flow | `payroll.review` | Phase 6C.6 | Passed |
| Compliance | Audit | `/hr-admin/audit` | HR/Admin activity evidence and audit trail | `audit.hr.view` | Phase 7A | Passed |
| Insights | Reports | `/hr-admin/reports` | Operational, payroll, workforce, and compliance report catalog | `reports.catalog.view`, `reports.hr.view`, `reports.payroll.view`, `reports.compliance.view` | Phase 7A | Passed |
| Setup | Organization | `/hr-admin/organization` | Legal entities, locations, branches, BU, departments, grades, cost centers | `organization.view`, `organization.manage` | Phase 3B | Passed |
| Setup | Workflows | `/hr-admin/workflows` | Approval templates and workflow assignments | `lifecycle.manage` | Phase 8 | Passed |
| Operations | Notifications | `/hr-admin/notifications-admin` | Notification templates, events, queues, delivery, diagnostics | `notifications.view`, `notifications.manage` | Phase 1 | Passed |
| Operations | Imports | `/hr-admin/import-history` | Batch import history and troubleshooting | `employees.import`, `organization.manage` | Phase 3D | Passed |
| Operations | Ops Health | `/hr-admin/saas-operations` | SaaS operational health, resilience, SLA, launch remediation links | `audit.hr.view`, `reports.hr.view` | Phase 8 | Passed |

## Command Routes

| Parent | Child Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- | --- |
| Dashboard | `/hr-admin` | Executive snapshot and action queue | Open readiness, review lifecycle, review documents, open attendance, open delivery, resolve launch, view assignments, download audit, reports | Passed |
| Launch Readiness | `/hr-admin/launch-remediation` | Launch blocker remediation queue | Review blocker, update remediation evidence, back to dashboard | Passed |
| Ops Health | `/hr-admin/saas-control-plane` | Commercial/tenant control signals | Back to dashboard, launch remediation | Passed |
| Ops Health | `/hr-admin/saas-operations` | Operational health hub | Control plane, resilience, SLA, launch remediation | Passed |
| Ops Health | `/hr-admin/saas-resilience` | Resilience checks and release safety | SaaS operations, control plane | Passed |
| Ops Health | `/hr-admin/saas-sla-operations` | SLA operational posture | SaaS operations, related remediation actions | Passed |

## Workforce Routes

### Employees

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/employees` | Employee directory, selected employee details, collapsed import workbenches, readiness filters | New employee, bulk imports disclosure, filter/search, readiness filter, selected employee query state, reset, access review, structure review | Passed |
| `/hr-admin/employees/new` | Create employee | Submit, validation, back to employee masters | Passed |
| `/hr-admin/employees/[employeeId]/edit` | Edit employee master profile | Save, validation, cancel/back | Passed |
| `/hr-admin/employees/[employeeId]/access` | Provision/manage employee workspace access | Save access, role assignment, back to employee | Passed |
| `/hr-admin/employees/[employeeId]/bank-accounts` | Manage employee bank accounts | Add/update primary bank account, validation, back to employee | Passed |

### Lifecycle

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/lifecycle` | Lifecycle hub and joiner-to-exit queue | Onboardings, movements, probation reviews, exits, clear filters | Passed |
| `/hr-admin/onboardings` | Onboarding queue | Create onboarding, edit onboarding, filter, pagination | Passed |
| `/hr-admin/onboardings/new` | Create onboarding item | Submit, validation, back to onboardings | Passed |
| `/hr-admin/onboardings/[itemId]/edit` | Edit onboarding item | Save, validation, back to onboardings | Passed |
| `/hr-admin/movements` | Transfer, promotion, reporting change queue | Create movement, select page, assign owner, set status, edit movement | Passed |
| `/hr-admin/movements/new` | Create movement | Submit, validation, back to movements | Passed |
| `/hr-admin/movements/[itemId]/edit` | Edit movement | Save, validation, back to movements | Passed |
| `/hr-admin/probation-reviews` | Probation review queue | Create review, edit, status update, back to lifecycle | Passed |
| `/hr-admin/probation-reviews/new` | Create probation review | Submit, validation, back to probation reviews | Passed |
| `/hr-admin/probation-reviews/[itemId]/edit` | Edit probation review | Save, validation, back to probation reviews | Passed |
| `/hr-admin/exits` | Exit queue | Create exit, edit exit, back to lifecycle | Passed |
| `/hr-admin/exits/new` | Create exit | Submit, validation, back to exits | Passed |
| `/hr-admin/exits/[itemId]/edit` | Edit exit | Save, validation, back to exits | Passed |

### Documents

Phase 5A certification covers the document hub, all direct document routes, and representative dynamic child routes opened through visible row actions. Dynamic coverage includes employee document review, document category edit, and document requirement edit.

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/documents` | Document control hub | Categories, requirements, employee documents, generated letters, back to dashboard | Passed |
| `/hr-admin/employee-documents` | Employee document queue | Upload document, review document, filters, open reports | Passed |
| `/hr-admin/employee-documents/new` | Upload employee document | Upload/save, validation, back to employee documents | Passed |
| `/hr-admin/employee-documents/[itemId]/review` | Review uploaded employee document | Approve/reject/request changes, download document, back to queue | Passed |
| `/hr-admin/document-categories` | Document category masters | Create, edit, back to documents | Passed |
| `/hr-admin/document-categories/new` | Create category | Submit, validation, back to categories | Passed |
| `/hr-admin/document-categories/[itemId]/edit` | Edit category | Save, validation, back to categories | Passed |
| `/hr-admin/document-requirements` | Document requirement masters | Create, edit, back to documents | Passed |
| `/hr-admin/document-requirements/new` | Create requirement | Submit, validation, back to requirements | Passed |
| `/hr-admin/document-requirements/[itemId]/edit` | Edit requirement | Save, validation, back to requirements | Passed |
| `/hr-admin/generated-letters` | Generated HR letters workspace | Open document control, employee documents, download/inspect letters | Passed |

## Time And Leave Routes

### Attendance

Phase 5B certification covers attendance operations, all direct attendance setup/review pages, and representative dynamic child routes opened through visible row actions. Dynamic coverage includes attendance record edit, attendance regularization review, shift edit, employee shift assignment edit, roster template edit, holiday calendar edit, attendance policy edit, and attendance assignment edit.

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/attendance-operations` | Attendance operations hub | Shifts, assignments, roster templates, holiday calendars, attendance records, regularizations | Passed |
| `/hr-admin/shifts` | Shift masters | Create shift, edit shift, back to attendance operations | Passed |
| `/hr-admin/shifts/new` | Create shift | Submit, validation, back to shifts | Passed |
| `/hr-admin/shifts/[itemId]/edit` | Edit shift | Save, validation, back to shifts | Passed |
| `/hr-admin/employee-shift-assignments` | Employee shift assignments | Create assignment, edit assignment, governance panel, back to attendance operations | Passed |
| `/hr-admin/employee-shift-assignments/new` | Create shift assignment | Submit, validation, back to assignments | Passed |
| `/hr-admin/employee-shift-assignments/[itemId]/edit` | Edit shift assignment | Save, validation, back to assignments | Passed |
| `/hr-admin/shift-roster-templates` | Roster template catalog | Create template, edit template, rollout panel, back to attendance operations | Passed |
| `/hr-admin/shift-roster-templates/new` | Create roster template | Submit, validation, back to templates | Passed |
| `/hr-admin/shift-roster-templates/[itemId]/edit` | Edit roster template | Save, validation, back to templates | Passed |
| `/hr-admin/holiday-calendars` | Holiday calendar catalog | Create calendar, edit calendar, back to attendance operations | Passed |
| `/hr-admin/holiday-calendars/new` | Create holiday calendar | Submit, validation, back to calendars | Passed |
| `/hr-admin/holiday-calendars/[itemId]/edit` | Edit holiday calendar | Save, validation, back to calendars | Passed |
| `/hr-admin/attendance-records` | Attendance record workbench | Filter, bulk actions, edit record, back to attendance operations | Passed |
| `/hr-admin/attendance-records/[itemId]/edit` | Edit attendance record | Save, validation, back to records | Passed |
| `/hr-admin/attendance-regularizations` | Attendance regularization review queue | Review regularization, inline decision, back to attendance operations | Passed |
| `/hr-admin/attendance-regularizations/[itemId]/review` | Review attendance regularization | Approve/reject, validation, back to regularizations | Passed |

### Leave And Policies

Phase 5B certification also covers leave balances, policy hubs, leave/attendance policy catalogs, assignment pages, and representative dynamic edit routes opened through visible row actions.

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/leave-balances` | Leave balance operations | Leave policies, policy hub, filters, adjustment actions | Passed |
| `/hr-admin/policies` | Policy hub | Leave types, leave policies, leave balances, attendance policies, policy assignments | Passed |
| `/hr-admin/policy-assignments` | Policy assignment hub | Leave assignments, attendance assignments, back to policies | Passed |
| `/hr-admin/leave-types` | Leave type catalog | Create, edit, back to policies | Passed |
| `/hr-admin/leave-types/new` | Create leave type | Submit, validation, back to leave types | Passed |
| `/hr-admin/leave-types/[itemId]/edit` | Edit leave type | Save, validation, back to leave types | Passed |
| `/hr-admin/leave-policies` | Leave policy catalog | Create, edit, back to policies | Passed |
| `/hr-admin/leave-policies/new` | Create leave policy | Submit, validation, back to leave policies | Passed |
| `/hr-admin/leave-policies/[itemId]/edit` | Edit leave policy | Save, validation, back to leave policies | Passed |
| `/hr-admin/leave-policy-assignments` | Leave policy assignments | Create, edit, governance panel, back to policy assignments | Passed |
| `/hr-admin/leave-policy-assignments/new` | Create leave assignment | Submit, validation, back to leave assignments | Passed |
| `/hr-admin/leave-policy-assignments/[itemId]/edit` | Edit leave assignment | Save, validation, back to leave assignments | Passed |
| `/hr-admin/attendance-policies` | Attendance policy catalog | Create, edit, back to policies | Passed |
| `/hr-admin/attendance-policies/new` | Create attendance policy | Submit, validation, back to attendance policies | Passed |
| `/hr-admin/attendance-policies/[itemId]/edit` | Edit attendance policy | Save, validation, back to attendance policies | Passed |
| `/hr-admin/attendance-policy-assignments` | Attendance policy assignments | Create, edit, governance panel, back to policy assignments | Passed |
| `/hr-admin/attendance-policy-assignments/new` | Create attendance assignment | Submit, validation, back to attendance assignments | Passed |
| `/hr-admin/attendance-policy-assignments/[itemId]/edit` | Edit attendance assignment | Save, validation, back to attendance assignments | Passed |

## Payroll Routes

Phase 6A certification covers the Payroll Readiness command center as the first payroll reference screen. Phase 6B extends the same compact cycle typography to Inputs, Calculation, Review, Outputs, and Handoff, including compact headings, wrapped run cards/chips, right-aligned page actions on desktop, hidden duplicate next-action panels, and no horizontal overflow.

Phase 6C.0 changes the Payroll sidebar from cycle-step navigation to seven user-friendly payroll submenus. The payroll cycle pages remain active workflow child pages under Payroll Control, and `/hr-admin/payroll-settlements` is treated as a child page under Adjustments & Settlements. This keeps the left navigation compact while preserving every operational workflow.

Phase 6C.1 converts Payroll Setup into a tabbed setup workspace: Overview, Calendars & Periods, Pay Groups, Assignments, and Setup Actions. Review tabs now own long grids with pagination, while the create/edit forms live in Setup Actions so day-to-day users are not overloaded by all maintenance forms on first load.

Phase 6C.2 applies the same review-first setup pattern to Salary Setup. Salary components, structure/version/line review, and employee assignment coverage are separated from maintenance controls, with long grids paginated and create/import forms grouped under Setup Actions.

Phase 6C.3 applies the same review-first setup pattern to Payroll Rules. Rule definitions, effective-dated versions, locked input snapshots, and evaluation traces are separated into focused tabs, while definition/version forms live under Setup Actions.

Phase 6C.4 applies the same review-first setup pattern to Statutory. Statutory readiness, proof declarations, compliance filings, component catalog, and maintenance controls are separated into focused tabs; proof/register/catalog grids now paginate, and all pack/component/slab/registration/filing/profile/declaration forms live under Setup Actions with stable anchors.

Phase 6C.5 applies the same focused workspace pattern to Providers. Overview owns launch rehearsal and certification gates, Connections owns provider selection/detail/certification actions, Mapping owns schema packs and simulations, Delivery owns callbacks/retries/failure evidence, and Registry owns adapters, clients, packages, and storage policy readiness.

Phase 6C.6 applies the same focused workspace pattern to Adjustments & Settlements. Overview owns run posture and next actions, Register owns long exception/package lists, Detail owns selected record inspection and line evidence, and Actions owns create/submit/approve/apply controls.

Phase 6C.7 hardens the setup-action consoles inside Payroll Setup, Salary Setup, Payroll Rules, and Statutory. Setup Actions now use second-level tabs so users can manage one maintenance responsibility at a time instead of seeing every create/edit form on one page. This keeps direct anchors stable while making each setup page easier to operate.

Phase 6C.8 certifies the payroll cycle child pages after setup-action hardening. Inputs, Calculations, Review, Outputs, and Handoff passed operational browser flows; the only update required was the Payroll Inputs helper opening the Periods action tab before creating a period.

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/payroll-readiness` | Payroll control room, source readiness, and cycle workflow launcher | Open setup, open inputs, calculation, review, outputs, handoff, resolve blockers | Passed |
| `/hr-admin/payroll-setup` | Payroll setup configuration | Overview, calendars & periods, pay groups, assignments, setup actions, action tabs for calendars/periods/pay groups/assignments, pagination, CRUD anchors | Passed |
| `/hr-admin/salary-setup` | Salary component and structure setup | Overview, components, structures, assignments, setup actions, action tabs for import/components/structures/versions/lines/assignments, pagination, import/CRUD anchors | Passed |
| `/hr-admin/payroll-rules` | Payroll rule operations | Overview, rules, versions, trace, setup actions, action tabs for definitions/versions, pagination, rule/version CRUD anchors | Passed |
| `/hr-admin/payroll-inputs` | Payroll input operations child route under Payroll Control | Readiness, setup, salary setup, rules, calculations, lock/input actions | Passed |
| `/hr-admin/payroll-adjustments` | Payroll adjustment workbench | Overview, register, detail, actions, create adjustment, submit/approve/apply lifecycle, report link | Passed |
| `/hr-admin/payroll-settlements` | Settlement child route under Adjustments & Settlements | Overview, register, detail, actions, create settlement, submit/approve/apply lifecycle, generated adjustment evidence | Passed |
| `/hr-admin/payroll-calculations` | Calculation queue and validation child route under Payroll Control | Open review, select run, trace lines, calculation validation | Passed |
| `/hr-admin/payroll-review` | Payroll exception and approval review child route under Payroll Control | Calculations, inputs, rules, setup, outputs, approve/resolve exceptions | Passed |
| `/hr-admin/payroll-outputs` | Output generation and payslip/register publication child route under Payroll Control | Review, handoff, calculations, rules, setup | Passed |
| `/hr-admin/payroll-handoff` | Finance handoff and artifact delivery child route under Payroll Control | Outputs, review, calculations, providers, delivery actions | Passed |
| `/hr-admin/payroll-statutory` | Statutory setup and filing readiness | Overview, declarations, compliance, catalog, setup actions, action tabs for import/catalog/compliance/profiles/declarations, pagination, import/CRUD anchors | Passed |
| `/hr-admin/payroll-providers` | Provider integration and certification | Overview, connections, mapping, delivery, registry tabs; certification actions, launch rehearsal, evidence export | Passed |

## Setup Routes

### Organization

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/organization` | Organization master-data catalog with collapsed setup/import workflows | Create records by section, open guided setup, open CSV import, filter catalog, open employees | Passed |
| `/hr-admin/organization/[section]/new` | Create organization master record | Submit, validation, back to section | Passed |
| `/hr-admin/organization/[section]/[itemId]/edit` | Edit organization master record | Save, validation, back to section | Passed |

Organization sections to verify:

- Legal entities
- Locations
- Branches
- Business units
- Departments
- Cost centers
- Grades
- Designations
- Employee types

### Workflows

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/workflows` | Workflow hub and assignment overview | Open templates, assignments, audit, clear filters | Passed |
| `/hr-admin/workflow-templates` | Approval workflow template catalog | Create template, edit template when seeded | Passed |
| `/hr-admin/workflow-templates/new` | Create workflow template | Submit, validation, back to templates | Passed |
| `/hr-admin/workflow-templates/[itemId]/edit` | Edit workflow template | Save, validation, back to templates | Passed |
| `/hr-admin/workflow-template-assignments` | Workflow assignment catalog | Create assignment, edit assignment when seeded | Passed |
| `/hr-admin/workflow-template-assignments/new` | Create workflow assignment | Submit, validation, back to assignments | Passed |
| `/hr-admin/workflow-template-assignments/[itemId]/edit` | Edit workflow assignment | Save, validation, back to assignments | Passed |

## Notifications Routes

These pages completed the Phase 1 typography and UX certification pass.

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/notifications-admin` | Notification admin hub | Queue, failed queue, delivery health, templates, events, diagnostics | Passed |
| `/hr-admin/notifications` | Notification queue | Search/filter, select, bulk retry, quick review, open review, details disclosure | Passed |
| `/hr-admin/notifications/[itemId]/review` | Single notification review | Retry, inspect payload, inspect delivery logs, back to queue | Passed |
| `/hr-admin/notification-delivery` | Channel health and delivery management | Open queue, failed only, retry ready by channel | Passed |
| `/hr-admin/notification-diagnostics` | Notification observability and hygiene | Failed queue, retry-ready, retry-capped, inactive templates, active events | Passed |
| `/hr-admin/notification-templates` | Notification template catalog | New template, edit template, filters, reset | Passed |
| `/hr-admin/notification-templates/new` | Create notification template | Submit, preview/test panel if available, back to templates | Passed |
| `/hr-admin/notification-templates/[itemId]/edit` | Edit notification template | Save, preview/test, back to templates | Passed |
| `/hr-admin/notification-events` | Notification event catalog | New event, edit event, filters, reset | Passed |
| `/hr-admin/notification-events/new` | Create notification event | Submit, validation, back to events | Passed |
| `/hr-admin/notification-events/[itemId]/edit` | Edit notification event | Save, validation, back to events | Passed |

## Imports Route

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/import-history` | Import run history and troubleshooting | Filter, inspect batch outcome cards, open related module if linked, reset filters, paginate results | Passed |

## Audit And Reports Routes

### Audit

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/audit` | HR Admin audit evidence center | Open reports, open notifications, filter, inspect event evidence | Passed |

### Reports Catalog And Child Reports

| Route | Purpose | Major Links/Actions To Verify | QA Status |
| --- | --- | --- | --- |
| `/hr-admin/reports` | Report catalog | Open each report, search/filter catalog, export/audit links | Passed |
| `/hr-admin/reports/workforce` | Workforce report | Employees, new employee, export | Passed |
| `/hr-admin/reports/lifecycle-queue` | Lifecycle queue report | Lifecycle, create onboarding, export | Passed |
| `/hr-admin/reports/lifecycle-aging` | Lifecycle aging report | Lifecycle, export | Passed |
| `/hr-admin/reports/document-compliance` | Document compliance report | Documents, employee documents, export | Passed |
| `/hr-admin/reports/attendance-register` | Attendance register report | Attendance operations, export | Passed |
| `/hr-admin/reports/attendance-exceptions` | Attendance exceptions report | Attendance register, regularizations, export | Passed |
| `/hr-admin/reports/leave-balance` | Leave balance report | Leave balances, export | Passed |
| `/hr-admin/reports/payroll-register` | Payroll register report | Payroll outputs, handoff, export | Passed |
| `/hr-admin/reports/payroll-input-exceptions` | Payroll input exceptions report | Readiness, inputs, export | Passed |
| `/hr-admin/reports/payroll-review-exceptions` | Payroll review exceptions report | Payroll review, export | Passed |
| `/hr-admin/reports/payroll-close-readiness` | Payroll close readiness report | Payroll readiness, calculations, export | Passed |
| `/hr-admin/reports/payroll-adjustments` | Payroll adjustments report | Adjustments, review, export | Passed |
| `/hr-admin/reports/payroll-settlements` | Payroll settlements report | Settlements, handoff, export | Passed |
| `/hr-admin/reports/payslip-publication` | Payslip publication report | Outputs, handoff, export | Passed |
| `/hr-admin/reports/bank-advice` | Bank advice report | Handoff, artifact manifest/export | Passed |
| `/hr-admin/reports/finance-handoff-exceptions` | Finance handoff exception report | Handoff, providers, export | Passed |
| `/hr-admin/reports/compliance` | Compliance report hub | Statutory setup, handoff, export audits | Passed |
| `/hr-admin/reports/statutory-deductions` | Statutory deductions report | Statutory setup, handoff, export | Passed |
| `/hr-admin/reports/statutory-filing-status` | Statutory filing status report | Statutory setup, handoff, export | Passed |
| `/hr-admin/reports/challan-reconciliation` | Challan reconciliation report | Statutory setup, handoff, export | Passed |
| `/hr-admin/reports/provider-filing-receipts` | Provider filing receipt report | Handoff, statutory, export | Passed |
| `/hr-admin/reports/pf-ecr-readiness` | PF ECR readiness report | Compliance hub, statutory setup, statutory deductions | Passed |
| `/hr-admin/reports/esic-contribution-readiness` | ESIC contribution readiness report | Compliance hub, statutory setup, filing status | Passed |
| `/hr-admin/reports/professional-tax-readiness` | Professional tax readiness report | Compliance hub, statutory setup, challan reconciliation | Passed |
| `/hr-admin/reports/lwf-readiness` | LWF readiness report | Compliance hub, statutory setup, export | Passed |
| `/hr-admin/reports/tds-efile-readiness` | TDS e-file readiness report | Compliance hub, statutory setup, filing status | Passed |
| `/hr-admin/reports/compliance-summary` | Compliance summary report | Compliance hub, export | Passed |
| `/hr-admin/reports/export-audits` | Report export audit trail | Compliance hub, report catalog | Passed |
| `/hr-admin/reports/salary-variance` | Salary variance report | Payroll review/output context, export | Passed |

## Typography Rollout Phases

| Phase | Scope | Deliverable | QA Gate |
| --- | --- | --- | --- |
| Phase 1 | Notifications pilot | Completed notification route typography and interaction polish | Passed: desktop/mobile screenshots, all child links, typecheck/lint/build |
| Phase 2 | Shell, dashboard, launch readiness | Completed shell typography, compact dashboard headings, launch-remediation modal workflow, and mobile menu affordance | Passed: desktop/mobile screenshots, visible links, modal controls, typecheck/lint/build |
| Phase 3A | Employees index | Reduced default density, kept one primary creation path, collapsed bulk import tools, and certified directory/detail alignment | Passed: employee browser certification, responsive geometry, collapsed import guardrail |
| Phase 3B | Organization index | Kept master catalog as primary view; collapsed guided setup and CSV import until explicitly opened | Passed: organization browser certification, setup workflow, collapsed import guardrail |
| Phase 3C | Employee child screens | Create, edit, access, and bank account detail forms compacted with shorter headers, tighter field grouping, and shared child-form typography | Passed: lifecycle/access and bank-account browser certification, typecheck/lint/build |
| Phase 3D | Import history | Replaced dense evidence table with compact import cards, right-aligned module links, resettable filters, and responsive row/hash/error/rollback facts | Passed: import-history browser certification, typecheck/lint/build |
| Phase 3E | Employee directory detail polish | Compacted employee directory rows, grouped selected employee detail into Profile, Structure, and Access/date sections, fixed readiness copy spacing, and surfaced direct Edit/Access/Bank actions | Passed: employee browser certification, responsive geometry, typecheck/lint/build |
| Phase 4 | Lifecycle queues and workflow records | Compacted lifecycle queue rows, standardized owner/status bulk controls, shortened queue page headers, and aligned onboarding/movement/probation/exit create/edit forms | Passed: lifecycle UI audit, operational queue flows, lifecycle create/edit certification, typecheck/lint/build |
| Phase 5A | Documents | Document control hub, employee document verification queue, category/requirement masters, generated letters | Passed: document/notification/import UI audit, employee document workflow certification, typecheck/lint/build |
| Phase 5B | Attendance, leave, policies | Attendance workbenches, leave operations, policy catalogs, assignment forms, ESS/MSS decision flows, custom approver RBAC, report/export boundaries, and real-user visual polish | Passed: TL-1/2/3 browser certification pack plus TL-4 screenshot polish, responsive UI audit, dynamic child routes, policy CRUD, reports/imports, MSS/ESS workflows |
| Phase 6 | Payroll and statutory | Payroll control, setup, inputs, calculation, review, outputs, handoff, providers | End-to-end September payroll path and finance handoff |
| Phase 7A | Reports and audit foundation | Report catalog, audit center, export audit history, and representative report pages | Reports phase 13 certification, operational audit filter flow, typecheck/lint/build |
| Phase 7B | Remaining report detail pages | Payroll, compliance, lifecycle, document, and provider report-specific screens | Passed: full report/export regression and compliance/provider drilldown pack |
| Phase 8 | Full HR Admin certification | Run complete visual and functional browser pass | No broken route, no overflow, no clipped text, no wrong permission redirect |

## Per-Page QA Checklist

For each page in this inventory, verify:

- Sidebar active state matches current route.
- Topbar quick links load correct workspaces.
- Page title, section titles, body copy, chips, buttons, and tables follow `docs/ux/typography-system.md`.
- Primary and secondary actions are visually distinct.
- Page, toolbar, row, card, and form actions are right-aligned on desktop and stack cleanly on mobile.
- Buttons fit text and remain inline at desktop widths.
- Cards and grids align at desktop and stack cleanly on mobile.
- Detail grids keep labels and values visually separated, with long values wrapping inside their own cell.
- All visible links navigate to the intended route.
- Dynamic route pages have correct back links.
- Empty states and error states are useful, not noisy.
- Forms show clear validation and return to the correct parent route.
- Tables and queues preserve readable row hierarchy.
- Query-string filters update the page and can be reset.
- No horizontal overflow at desktop, tablet, or mobile widths.

## Current Status

- Inventory created: `2026-09-26`
- Typography contract created: `docs/ux/typography-system.md`
- Notification typography pilot: Passed on `2026-09-26`
- Phase 1 certification spec: `web/tests/e2e/hr-admin-notification-phase1-certification.spec.ts`
- Phase 1 screenshots: `web/test-results/hr-admin-notification-phase1/`
- Phase 1 hardening: shared `record-card__details` label/value spacing fixed and covered by Playwright geometry assertions.
- Phase 1 validation: Playwright notification certification, typecheck, lint, and build passed.
- Phase 2 shell/dashboard/launch readiness: Passed on `2026-09-26`
- Phase 2 certification spec: `web/tests/e2e/hr-admin-shell-phase2-certification.spec.ts`
- Phase 2 screenshots: `web/test-results/hr-admin-shell-phase2/`
- Phase 2 modal decision: launch-remediation row actions use a focused `Manage blocker` modal so owner, due date, escalation, and decision notes do not overcrowd the card; card action buttons are right-aligned and covered by browser geometry checks.
- Phase 3A density decision: employee bulk import workbenches stay collapsed by default under a `Bulk imports` disclosure. The employee index should open with directory, metrics, and selected profile only; CSV tools should be opt-in so the page does not feel like several screens at once.
- Phase 3B density decision: organization guided setup and CSV import stay collapsed by default. The organization page should open around the master-data library and catalog; setup/import tools are intentional workflows opened only when needed.
- Phase 3C density decision: employee create, edit, access, and bank-account forms should stay task-focused and compact. Keep all required fields visible for HR accuracy, but avoid oversized page copy, repeated explanations, and loose card spacing. Browser certification passed after updating specs for the new compact access heading and inline structure warnings.
- Phase 3D density decision: import history should read like an evidence ledger, not a spreadsheet. Batch rows now use cards with compact facts for rows, hashes, errors, and rollback; module actions stay right-aligned on desktop and stack on mobile. Browser certification passed after fixing the Playwright web server env so it no longer overrides `web/.env.local` with an empty API base URL.
- Phase 3E density decision: employee directory cards should scan like operational rows, not profile cards. Keep selected employee detail in grouped sections so users can inspect the current record without reading every field at the same visual weight; keep access/date facts open by default because they are payroll and launch critical.
- Phase 4 density decision: lifecycle queues should behave like compact operations inboxes. Keep filters and bulk actions visually separated, right-align action buttons, make record detail grids quiet, and show confirmation feedback after live bulk updates. Lifecycle create/edit forms use the shared compact child-form rhythm; the separate Setup > Workflows catalog remains pending.
- Phase 5A density decision: document pages should split responsibilities by intent. The control hub stays navigational, the employee document page behaves like a compact verification inbox, category and requirement screens behave like master catalogs, and upload/review/generated-letter forms use the same compact child-form action pattern. Inline quick-review controls stay available but must not crowd the row or float over fields.
- Phase 5B density decision: Time & Leave pages should behave like focused operations workspaces. Attendance, leave, and policy catalogs keep short page titles, contained toolbars, right-aligned desktop actions, compact queue rows, and calm child forms; ESS/MSS approval pages preserve the same hierarchy so employees and managers can complete decisions without learning a second visual language.
- Phase 2 validation: Playwright shell certification, typecheck, lint, and build passed.
- Phase 4 validation: Playwright lifecycle UI audit, onboarding/movement/exit certification flows, operational queue flows, typecheck, lint, and build passed.
- Phase 5A validation: Playwright document/notification/import UI audit, employee document upload/review workflow certification, typecheck, lint, and build passed.
- Phase 5B validation: TL-1/2/3 browser certification passed on `2026-09-28`: 35/35 tests green across HR Admin attendance/leave/policy pages, dynamic create/edit/review routes, policy CRUD, leave balance import, attendance/leave reports, employee export denials, ESS-to-MSS leave and attendance decisions, MSS control center, custom MSS approver RBAC, and HR Admin leave/attendance RBAC. Typecheck passed. Direct test setup now uses `HRMS_API_BASE_URL` with trailing slashes for mutable Django endpoints.
- Phase 5B TL-4 validation: screenshot-based real-user polish passed on `2026-09-28`: 3/3 tests green across desktop Time & Leave routes and high-use tablet/mobile routes. The shared Time & Leave strip now wraps long labels cleanly, and Leave Balances separates balance and transaction ledgers with pagination. Screenshot evidence lives in `web/test-results/hr-admin-time-leave-tl4/`.
- Phase 7A density decision: reports should open as a searchable catalog first, not a second dashboard. Keep export controls and audit shortcuts visible, move evidence review to the export audit history and audit center, and keep detailed report pages as focused workspaces with their own filters, manifests, and downloads.
- Phase 7A validation: Reports phase 13 certification, audit filter flow, typecheck, lint, build, and Django system check passed.
- Phase 7B density decision: report detail pages should behave like focused workspaces with one contained toolbar, clear pagination, right-aligned row/export actions, and wrapped evidence hashes so long codes never distort the grid.
- Phase 7B validation: full report/export regression passed, compliance/provider UI audit passed, compliance hub/summary/statutory readiness certifications passed, employee-denial expectations updated to the current `/hr-admin` fallback behavior, typecheck/lint/build and Django system check passed.
- Phase 8 density decision: workflow screens should behave like a compact operations workbench. Keep trace filters contained, make template and assignment catalogs readable even when empty, and use the same right-aligned action rule as the rest of HR Admin. Ops Health routes keep the shared governance strip as the primary cross-navigation pattern.
- Phase 8 validation: `hr-admin-phase8-workflows-ops-certification.spec.ts` passed, typecheck/lint/build passed, and Django system check passed.
- Phase 8 dynamic child validation: `hr-admin-setup-dynamic-routes-polish.spec.ts` passed on `2026-09-28` for organization create/edit, workflow template edit, and workflow assignment edit routes. The audit seeds live records, checks visible links/buttons, verifies right-aligned form actions, captures desktop/mobile screenshots, and confirms no horizontal overflow.
- Phase 6C.7 density decision: setup actions should never show every maintenance form at once. Payroll Setup, Salary Setup, Payroll Rules, and Statutory now use second-level action tabs; focused setup/action browser certification passed 13/13 with typecheck and lint.
- Phase 6C.8 validation: payroll core UI audit passed 1/1; payroll cycle operational flow pack passed 6/6; typecheck, lint, and build passed.
- Next recommended execution: continue the same screenshot-led polish pattern on Tenant Admin, ESS, and MSS dynamic child routes after HR Admin setup routes.
