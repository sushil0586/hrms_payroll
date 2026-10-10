# HR Admin Screen Inventory

Date: 2026-10-09
Phase: Phase 1 static discovery only
Scope: HR Admin first

## Legend

- `Static verified`: route/component/navigation/API evidence exists in the repository.
- `Conditional`: rendered only under permission, data state, query parameter, or record state.
- `Runtime unknown`: needs browser/API execution.

## Command, Launch, Operations

| Screen ID | Route | Screen / child surface | Navigation | Permissions / guard evidence | Status |
| --- | --- | --- | --- | --- | --- |
| HRADM-SCR-CMD-001 | `/hr-admin` | HR Admin dashboard command center with summary lanes and operational links | Sidebar: Command / Dashboard | HR Admin layout permission gate | Static verified |
| HRADM-SCR-CMD-002 | `/hr-admin/launch-remediation` | Launch readiness remediation workspace with issue assignment and action controls | Sidebar: Command / Launch Readiness | HR Admin layout permission gate; route-level implementation | Static verified |
| HRADM-SCR-CMD-003 | `/hr-admin/saas-operations` | SaaS operations health workspace | Search destination / operations | HR Admin layout permission gate | Static verified |
| HRADM-SCR-CMD-004 | `/hr-admin/saas-resilience` | SaaS resilience workspace | Search destination / operations | HR Admin layout permission gate | Static verified |
| HRADM-SCR-CMD-005 | `/hr-admin/saas-sla` | SLA operations workspace | Search destination / operations | HR Admin layout permission gate | Static verified |
| HRADM-SCR-CMD-006 | `/hr-admin/saas-control-plane` | SaaS commercial/control-plane setup | Search destination / operations | HR Admin layout permission gate | Static verified |

## Workforce

| Screen ID | Route | Screen / child surface | Navigation | Permissions / guard evidence | Status |
| --- | --- | --- | --- | --- | --- |
| HRADM-SCR-WF-001 | `/hr-admin/employees` | Employee directory, filterable list, selected employee detail panel, in-page imports disclosure | Sidebar: Workforce / Employees | `hr_admin.employees.view`; conditional create/import/edit/access permissions | Static verified |
| HRADM-SCR-WF-002 | `/hr-admin/employees/new` | Employee create form | Link from employees | `hr_admin.employees.create` | Static verified |
| HRADM-SCR-WF-003 | `/hr-admin/employees/[employeeId]/edit` | Employee edit form | Employee detail action | `hr_admin.employees.edit` | Static verified |
| HRADM-SCR-WF-004 | `/hr-admin/employees/[employeeId]/access` | Employee workspace access create/update form | Employee detail action | `hr_admin.employees.access.manage` | Static verified |
| HRADM-SCR-WF-005 | `/hr-admin/employees/[employeeId]/bank-accounts` | Employee bank account manager | Employee detail action | employee edit/bank account management permission | Static verified |
| HRADM-SCR-WF-006 | `/hr-admin/lifecycle` | Lifecycle command workspace and queue entry points | Sidebar: Workforce / Lifecycle | lifecycle permissions through route components | Static verified |
| HRADM-SCR-WF-007 | `/hr-admin/onboardings` | Onboarding queue | Search destination | lifecycle/onboarding permissions | Static verified |
| HRADM-SCR-WF-008 | `/hr-admin/onboardings/new` | Onboarding create form | Queue action | lifecycle/onboarding create permission | Static verified |
| HRADM-SCR-WF-009 | `/hr-admin/onboardings/[itemId]/edit` | Onboarding edit form | Queue action | lifecycle/onboarding edit permission | Static verified |
| HRADM-SCR-WF-010 | `/hr-admin/probation-reviews` | Probation review queue | Search destination | lifecycle/probation permissions | Static verified |
| HRADM-SCR-WF-011 | `/hr-admin/probation-reviews/new` | Probation review create form | Queue action | lifecycle/probation create permission | Static verified |
| HRADM-SCR-WF-012 | `/hr-admin/probation-reviews/[itemId]/edit` | Probation review edit form | Queue action | lifecycle/probation edit permission | Static verified |
| HRADM-SCR-WF-013 | `/hr-admin/movements` | Employee movement queue | Search destination | lifecycle/movement permissions | Static verified |
| HRADM-SCR-WF-014 | `/hr-admin/movements/new` | Movement create form | Queue action | lifecycle/movement create permission | Static verified |
| HRADM-SCR-WF-015 | `/hr-admin/movements/[itemId]/edit` | Movement edit form | Queue action | lifecycle/movement edit permission | Static verified |
| HRADM-SCR-WF-016 | `/hr-admin/exits` | Exit queue | Search destination | lifecycle/exit permissions | Static verified |
| HRADM-SCR-WF-017 | `/hr-admin/exits/new` | Exit create form | Queue action | lifecycle/exit create permission | Static verified |
| HRADM-SCR-WF-018 | `/hr-admin/exits/[itemId]/edit` | Exit edit form | Queue action | lifecycle/exit edit permission | Static verified |

## Documents

| Screen ID | Route | Screen / child surface | Navigation | Permissions / guard evidence | Status |
| --- | --- | --- | --- | --- | --- |
| HRADM-SCR-DOC-001 | `/hr-admin/employee-documents` | Employee document register, upload/review/reminder operations | Sidebar: Workforce / Documents | `hr_admin.documents.view/manage/verify/export` family | Static verified |
| HRADM-SCR-DOC-002 | `/hr-admin/employee-documents/new` | Employee document create/upload form | Register action | document manage permission | Static verified |
| HRADM-SCR-DOC-003 | `/hr-admin/employee-documents/[itemId]/review` | Employee document review page | Register action | document verify/review permission | Static verified |
| HRADM-SCR-DOC-004 | `/hr-admin/document-categories` | Document category setup | Search destination | document setup permission | Static verified |
| HRADM-SCR-DOC-005 | `/hr-admin/document-categories/new` | Document category create form | Setup action | document setup permission | Static verified |
| HRADM-SCR-DOC-006 | `/hr-admin/document-categories/[itemId]/edit` | Document category edit form | Setup action | document setup permission | Static verified |
| HRADM-SCR-DOC-007 | `/hr-admin/document-requirements` | Document requirement setup | Search destination | document setup permission | Static verified |
| HRADM-SCR-DOC-008 | `/hr-admin/document-requirements/new` | Document requirement create form | Setup action | document setup permission | Static verified |
| HRADM-SCR-DOC-009 | `/hr-admin/document-requirements/[itemId]/edit` | Document requirement edit form | Setup action | document setup permission | Static verified |
| HRADM-SCR-DOC-010 | `/hr-admin/generated-letters` | Generated letter workspace | Search destination | document/letter permission | Static verified |
| HRADM-SCR-DOC-011 | `/hr-admin/generated-letters/new` | Generated letter create form | Workspace action | document/letter manage permission | Static verified |

## Time, Leave, Attendance, Roster

| Screen ID | Route | Screen / child surface | Navigation | Permissions / guard evidence | Status |
| --- | --- | --- | --- | --- | --- |
| HRADM-SCR-TLA-001 | `/hr-admin/time-to-payroll` | Time-to-payroll readiness cockpit | Sidebar: Time & Leave | time/payroll permissions | Static verified |
| HRADM-SCR-TLA-002 | `/hr-admin/attendance-operations` | Attendance operations hub | Sidebar: Time & Leave / Attendance | attendance permissions | Static verified |
| HRADM-SCR-TLA-003 | `/hr-admin/attendance-records` | Attendance records list, filters, bulk manager, import workbench | Search destination | `hr_admin.attendance.view`; manage for bulk/import | Static verified |
| HRADM-SCR-TLA-004 | `/hr-admin/attendance-records/[itemId]/edit` | Attendance record edit form | Record action | attendance records manage permission | Static verified |
| HRADM-SCR-TLA-005 | `/hr-admin/attendance-regularizations` | Regularization queue with inline approve/reject | Search destination | regularization review permission | Static verified |
| HRADM-SCR-TLA-006 | `/hr-admin/attendance-regularizations/[itemId]/review` | Regularization review page | Queue action | regularization review permission | Static verified |
| HRADM-SCR-TLA-007 | `/hr-admin/shifts` | Shift definitions list | Search destination | attendance setup permission | Static verified |
| HRADM-SCR-TLA-008 | `/hr-admin/shifts/new` | Shift create form | List action | attendance setup permission | Static verified |
| HRADM-SCR-TLA-009 | `/hr-admin/shifts/[itemId]/edit` | Shift edit form | List action | attendance setup permission | Static verified |
| HRADM-SCR-TLA-010 | `/hr-admin/holiday-calendars` | Holiday calendar list | Search destination | attendance setup permission | Static verified |
| HRADM-SCR-TLA-011 | `/hr-admin/holiday-calendars/new` | Holiday calendar create form | List action | attendance setup permission | Static verified |
| HRADM-SCR-TLA-012 | `/hr-admin/holiday-calendars/[itemId]/edit` | Holiday calendar edit form | List action | attendance setup permission | Static verified |
| HRADM-SCR-TLA-013 | `/hr-admin/employee-shift-assignments` | Employee shift assignment list and conflict handling | Search destination | attendance setup permission | Static verified |
| HRADM-SCR-TLA-014 | `/hr-admin/employee-shift-assignments/new` | Shift assignment create form | List action | attendance setup permission | Static verified |
| HRADM-SCR-TLA-015 | `/hr-admin/employee-shift-assignments/[itemId]/edit` | Shift assignment edit form | List action | attendance setup permission | Static verified |
| HRADM-SCR-TLA-016 | `/hr-admin/employee-shift-assignments/import` | Shift assignment import workbench | Search/action | attendance setup permission | Static verified |
| HRADM-SCR-TLA-017 | `/hr-admin/shift-roster-templates` | Roster template list | Search destination | roster setup permission | Static verified |
| HRADM-SCR-TLA-018 | `/hr-admin/shift-roster-templates/new` | Roster template create form | List action | roster setup permission | Static verified |
| HRADM-SCR-TLA-019 | `/hr-admin/shift-roster-templates/[itemId]/edit` | Roster template edit form | List action | roster setup permission | Static verified |
| HRADM-SCR-TLA-020 | `/hr-admin/shift-roster-templates/[itemId]/rollout` | Roster rollout wizard/action page | Template action | roster setup permission | Static verified |
| HRADM-SCR-TLA-021 | `/hr-admin/leave-requests` | Leave request operations | Search destination | leave view/manage permission | Static verified |
| HRADM-SCR-TLA-022 | `/hr-admin/leave-requests/import` | Leave request import workbench | Search/action | leave manage permission | Static verified |
| HRADM-SCR-TLA-023 | `/hr-admin/leave-balances` | Leave balance workspace and transaction review | Search destination | leave balances manage permission | Static verified |
| HRADM-SCR-TLA-024 | `/hr-admin/leave-types` | Leave type setup | Search destination | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-025 | `/hr-admin/leave-types/new` | Leave type create form | List action | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-026 | `/hr-admin/leave-types/[itemId]/edit` | Leave type edit form | List action | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-027 | `/hr-admin/leave-policies` | Leave policy setup | Sidebar: Time & Leave / Policies | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-028 | `/hr-admin/leave-policies/new` | Leave policy create form | List action | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-029 | `/hr-admin/leave-policies/[itemId]/edit` | Leave policy edit form | List action | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-030 | `/hr-admin/leave-policy-assignments` | Leave policy assignment list and conflicts | Search destination | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-031 | `/hr-admin/leave-policy-assignments/new` | Leave policy assignment create form | List action | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-032 | `/hr-admin/leave-policy-assignments/[itemId]/edit` | Leave policy assignment edit form | List action | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-033 | `/hr-admin/leave-policy-assignments/import` | Leave policy assignment import workbench | Search/action | leave policies manage permission | Static verified |
| HRADM-SCR-TLA-034 | `/hr-admin/attendance-policies` | Attendance policy setup | Search destination | attendance policies manage permission | Static verified |
| HRADM-SCR-TLA-035 | `/hr-admin/attendance-policies/new` | Attendance policy create form | List action | attendance policies manage permission | Static verified |
| HRADM-SCR-TLA-036 | `/hr-admin/attendance-policies/[itemId]/edit` | Attendance policy edit form | List action | attendance policies manage permission | Static verified |
| HRADM-SCR-TLA-037 | `/hr-admin/attendance-policy-assignments` | Attendance policy assignment list | Search destination | attendance policies manage permission | Static verified |
| HRADM-SCR-TLA-038 | `/hr-admin/attendance-policy-assignments/new` | Attendance policy assignment create form | List action | attendance policies manage permission | Static verified |
| HRADM-SCR-TLA-039 | `/hr-admin/attendance-policy-assignments/[itemId]/edit` | Attendance policy assignment edit form | List action | attendance policies manage permission | Static verified |

## Payroll

| Screen ID | Route | Screen / child surface | Navigation | Permissions / guard evidence | Status |
| --- | --- | --- | --- | --- | --- |
| HRADM-SCR-PAY-001 | `/hr-admin/payroll-readiness` | Payroll readiness overview, issues, employees, setup, evidence tabs | Search destination | payroll readiness permissions | Static verified |
| HRADM-SCR-PAY-002 | `/hr-admin/payroll-setup` | Payroll setup tabs: overview, calendars, pay groups, assignments, actions | Sidebar: Payroll / Payroll Setup | payroll setup view/manage | Static verified |
| HRADM-SCR-PAY-003 | `/hr-admin/salary-setup` | Salary setup tabs: components, structures, versions, assignments, actions | Sidebar: Payroll / Salary Setup | salary setup view/manage | Static verified |
| HRADM-SCR-PAY-004 | `/hr-admin/payroll-rules` | Payroll rules tabs: overview, rules, versions, trace, actions | Sidebar: Payroll / Payroll Rules | payroll rule view/manage | Static verified |
| HRADM-SCR-PAY-005 | `/hr-admin/payroll-statutory` | Statutory tabs: setup, components, registrations, filings, profiles, declarations | Sidebar: Payroll / Statutory | statutory setup/declaration permissions | Static verified |
| HRADM-SCR-PAY-006 | `/hr-admin/payroll-inputs` | Payroll input snapshots, import/lock controls, reconciliation | Search destination | payroll inputs view/manage | Static verified |
| HRADM-SCR-PAY-007 | `/hr-admin/payroll-calculations` | Calculation control, draft run, open review | Search destination | payroll calculate/review permissions | Static verified |
| HRADM-SCR-PAY-008 | `/hr-admin/payroll-review` | Payroll review queue, exception decisions, approvals and locks | Search destination | payroll review/approve/lock permissions | Static verified |
| HRADM-SCR-PAY-009 | `/hr-admin/payroll-outputs` | Output batches, artifacts, payslip/register/tax sheet, publish, grants | Search destination | payroll outputs view/publish permissions | Static verified |
| HRADM-SCR-PAY-010 | `/hr-admin/payroll-handoff` | Finance handoff, provider lanes, statutory filings, audit packs, retries | Search destination | finance handoff/provider permissions | Static verified |
| HRADM-SCR-PAY-011 | `/hr-admin/payroll-providers` | Provider connections, mapping, certification, simulation, export | Sidebar: Payroll / Providers | provider setup/manage permissions | Static verified |
| HRADM-SCR-PAY-012 | `/hr-admin/payroll-adjustments` | Payroll adjustments list/workflow | Sidebar: Payroll / Adjustments & Settlements | payroll adjustment permissions | Static verified |
| HRADM-SCR-PAY-013 | `/hr-admin/payroll-adjustments/new` | Payroll adjustment create form | Workspace action | payroll adjustment create permission | Static verified |
| HRADM-SCR-PAY-014 | `/hr-admin/payroll-adjustments/[itemId]/edit` | Payroll adjustment edit form | Workspace action | payroll adjustment edit permission | Static verified |
| HRADM-SCR-PAY-015 | `/hr-admin/payroll-settlements` | Payroll settlements list/workflow | Sidebar: Payroll / Adjustments & Settlements | payroll settlement permissions | Static verified |
| HRADM-SCR-PAY-016 | `/hr-admin/payroll-settlements/new` | Payroll settlement create form | Workspace action | payroll settlement create permission | Static verified |
| HRADM-SCR-PAY-017 | `/hr-admin/payroll-settlements/[itemId]/edit` | Payroll settlement edit form | Workspace action | payroll settlement edit permission | Static verified |

## Reports

| Screen ID | Route | Screen / child surface | Navigation | Permissions / guard evidence | Status |
| --- | --- | --- | --- | --- | --- |
| HRADM-SCR-REP-001 | `/hr-admin/reports` | Report catalog | Sidebar: Insights / Reports | `requireWorkspaceAccess` HR admin role observed on report pages | Static verified |
| HRADM-SCR-REP-002 | `/hr-admin/reports/hr-core` | HR core report family | Sidebar/search | HR admin workspace role | Static verified |
| HRADM-SCR-REP-003 | `/hr-admin/reports/attendance` | Attendance report family | Sidebar/search | HR admin workspace role | Static verified |
| HRADM-SCR-REP-004 | `/hr-admin/reports/payroll` | Payroll report family | Sidebar/search | HR admin workspace role | Static verified |
| HRADM-SCR-REP-005 | `/hr-admin/reports/compliance` | Compliance report family | Sidebar/search | HR admin workspace role | Static verified |
| HRADM-SCR-REP-006 | `/hr-admin/reports/workforce` | Workforce report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-007 | `/hr-admin/reports/lifecycle-aging` | Lifecycle aging report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-008 | `/hr-admin/reports/document-compliance` | Document compliance report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-009 | `/hr-admin/reports/attendance-register` | Attendance register report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-010 | `/hr-admin/reports/attendance-derivation-exceptions` | Attendance derivation exceptions report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-011 | `/hr-admin/reports/leave-balance` | Leave balance report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-012 | `/hr-admin/reports/leave-attendance-collisions` | Leave/attendance collision report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-013 | `/hr-admin/reports/payroll-close` | Payroll close report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-014 | `/hr-admin/reports/payroll-readiness` | Payroll readiness report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-015 | `/hr-admin/reports/payroll-input-exceptions` | Payroll input exceptions report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-016 | `/hr-admin/reports/payroll-review-exceptions` | Payroll review exceptions report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-017 | `/hr-admin/reports/payroll-register` | Payroll register report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-018 | `/hr-admin/reports/payroll-adjustments` | Payroll adjustment report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-019 | `/hr-admin/reports/payroll-settlements` | Payroll settlement report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-020 | `/hr-admin/reports/payslip-publication` | Payslip publication report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-021 | `/hr-admin/reports/bank-advice` | Bank advice report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-022 | `/hr-admin/reports/statutory-deductions` | Statutory deductions report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-023 | `/hr-admin/reports/statutory-filing` | Statutory filing report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-024 | `/hr-admin/reports/provider-receipts` | Provider receipts report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-025 | `/hr-admin/reports/challan-reconciliation` | Challan reconciliation report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-026 | `/hr-admin/reports/pf-ecr` | PF ECR report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-027 | `/hr-admin/reports/esic` | ESIC report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-028 | `/hr-admin/reports/professional-tax` | Professional tax report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-029 | `/hr-admin/reports/tds` | TDS report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-030 | `/hr-admin/reports/lwf` | LWF report | Search destination | HR admin workspace role | Static verified |
| HRADM-SCR-REP-031 | `/hr-admin/reports/export-audits` | Export audit report | Sidebar/search | HR admin workspace role | Static verified |

## Notifications

| Screen ID | Route | Screen / child surface | Navigation | Permissions / guard evidence | Status |
| --- | --- | --- | --- | --- | --- |
| HRADM-SCR-NOTIF-001 | `/hr-admin/notifications-admin` | Notification admin hub | Sidebar: Operations / Notifications | notification permissions | Static verified |
| HRADM-SCR-NOTIF-002 | `/hr-admin/notification-templates` | Notification template list | Search destination | notification template permission | Static verified |
| HRADM-SCR-NOTIF-003 | `/hr-admin/notification-templates/new` | Notification template create form with preview/test-send panel | List action | notification template manage permission | Static verified |
| HRADM-SCR-NOTIF-004 | `/hr-admin/notification-templates/[itemId]/edit` | Notification template edit form with preview/test-send panel | List action | notification template manage permission | Static verified |
| HRADM-SCR-NOTIF-005 | `/hr-admin/notification-events` | Notification event list | Search destination | notification event permission | Static verified |
| HRADM-SCR-NOTIF-006 | `/hr-admin/notification-events/new` | Notification event create form | List action | notification event manage permission | Static verified |
| HRADM-SCR-NOTIF-007 | `/hr-admin/notification-events/[itemId]/edit` | Notification event edit form | List action | notification event manage permission | Static verified |
| HRADM-SCR-NOTIF-008 | `/hr-admin/notification-delivery` | Delivery configuration | Search destination | notification delivery permission | Static verified |
| HRADM-SCR-NOTIF-009 | `/hr-admin/notification-diagnostics` | Diagnostics workspace | Search destination | notification diagnostic permission | Static verified |
| HRADM-SCR-NOTIF-010 | `/hr-admin/notifications` | Notification queue, filters, bulk retry, inline details/review disclosure | Search destination | notification queue/retry permissions | Static verified |
| HRADM-SCR-NOTIF-011 | `/hr-admin/notifications/[itemId]/review` | Notification review page with payload/provider response disclosures | Queue action | notification review permission | Static verified |

## Organization, Workflows, Audit

| Screen ID | Route | Screen / child surface | Navigation | Permissions / guard evidence | Status |
| --- | --- | --- | --- | --- | --- |
| HRADM-SCR-SET-001 | `/hr-admin/organization` | Organization guided setup and section list | Sidebar: Setup / Organization | organization view/manage permissions | Static verified |
| HRADM-SCR-SET-002 | `/hr-admin/organization/[section]/new` | Organization section create form | Section action | organization manage permission | Static verified |
| HRADM-SCR-SET-003 | `/hr-admin/organization/[section]/[itemId]/edit` | Organization section edit form | Section action | organization manage permission | Static verified |
| HRADM-SCR-SET-004 | `/hr-admin/workflows` | Workflow template and assignment overview | Sidebar: Setup / Workflows | workflow view/manage permissions | Static verified |
| HRADM-SCR-SET-005 | `/hr-admin/workflow-templates/new` | Workflow template create form | Workflow action | workflow manage permission | Static verified |
| HRADM-SCR-SET-006 | `/hr-admin/workflow-templates/[templateId]/edit` | Workflow template edit form | Workflow action | workflow manage permission | Static verified |
| HRADM-SCR-SET-007 | `/hr-admin/workflow-template-assignments/new` | Workflow assignment create form | Workflow action | workflow manage permission | Static verified |
| HRADM-SCR-SET-008 | `/hr-admin/workflow-template-assignments/[assignmentId]/edit` | Workflow assignment edit form | Workflow action | workflow manage permission | Static verified |
| HRADM-SCR-AUD-001 | `/hr-admin/audit` | Audit log workspace | Sidebar: Compliance / Audit | audit permission | Static verified |
| HRADM-SCR-AUD-002 | `/hr-admin/import-history` | Import history workspace | Sidebar: Operations / Imports | import/audit permission | Static verified |

## Conditional Child Surfaces

| Child surface ID | Parent screens | Surface type | Static evidence | Phase 2 need |
| --- | --- | --- | --- | --- |
| HRADM-SCR-WF-C01 | HRADM-SCR-WF-001 | Employee detail panel selected by query/list state | Employee directory renders selected employee profile, sections, action menu | Verify keyboard, compact layout, edit/access/bank links |
| HRADM-SCR-WF-C02 | HRADM-SCR-WF-001 | Employee import disclosure | `details` disclosure wraps employee, bank, manager import workbenches | Verify compact disclosure, CSV validation, partial failures |
| HRADM-SCR-TLA-C01 | HRADM-SCR-TLA-003 | Attendance bulk manager | Client component with selected rows and bulk operation controls | Verify disabled states and row selection |
| HRADM-SCR-TLA-C02 | HRADM-SCR-TLA-003 | Attendance import workbench | CSV textarea, sample, copy, download, preview, commit | Verify import behavior |
| HRADM-SCR-NOTIF-C01 | HRADM-SCR-NOTIF-010 | Notification details disclosure | `details` quick review per notification | Verify inline review/retry |
| HRADM-SCR-PAY-C01 | HRADM-SCR-PAY-009 | Payroll artifact access panel | output artifacts, signed grants, revoke/download controls | Verify generated links and authorization |
| HRADM-SCR-PAY-C02 | HRADM-SCR-PAY-010 | Handoff evidence/provider lanes | selected handoff and provider lane detail panels | Verify state-specific actions |
| HRADM-SCR-PAY-C03 | HRADM-SCR-PAY-005 | Statutory declaration item review panels | declaration and item state transition actions | Verify declaration locks and proof review |
| HRADM-SCR-REP-C01 | HRADM-SCR-REP-* | Report tables | search/filter/sort/page/export/deep-link surfaces | Verify every report with seeded data |

## Discovery Coverage

Static route/component coverage for HR Admin is broad. At shallow depth, 238 HR Admin TSX files were discovered. Route inventory, navigation inventory, search destinations, permissions, and API route patterns were mapped for HR Admin.

Runtime-discovered screens may still exist behind data-specific links, object IDs, query strings, feature entitlements, and role-specific rendering. These remain open until Phase 2.
