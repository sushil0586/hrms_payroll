# Horizontal module coverage tracker — UX-0

Implementation follow-up: ESS-1 has now been explicitly authorized. Its live status is maintained in the [single ESS coverage tracker](hrms-ess-coverage-tracker.md); the tables below preserve the UX-0 discovery baseline.

Date: 2026-10-18. Statuses below are discovery/design coverage, never launch certification. All implementation rows are **Planned; not started**. See the [plan](hrms-horizontal-experience-upgrade-plan.md) and [ESS specification](hrms-ess-dashboard-profile-specification.md).

## Coverage and implementation register

Owner labels indicate recommended accountability, not assigned people. M/L/XL estimates and phase dependencies are in the plan. Source references use repository paths; route inventory below gives page-level references and literal permission hints.

| Area / workspace | Existing behavior to preserve / source | Proposed horizontal improvement | API/dependency and acceptance focus | Phase / owner / size |
|---|---|---|---|---|
| ESS dashboard | `/ess`, getEssDashboard, MeDashboardView | Compact identity, truthful task ownership, one summary per signal | Existing profile/leave/attendance; count-to-filter parity; optional errors not zero | UX-1A / ESS / M |
| ESS My Profile | GET me/profile; no dedicated page | Read-only employee 360, section links, later governed field access | Field matrix is authoritative; no write rights inferred | UX-1A then UX-2 / ESS+HR policy / L–XL |
| ESS attendance | `/ess/attendance`, regularization form/history | Compact daily/month context and explicit correction outcome | Own records, eligible dates, approved correction tracks; no new punch action | UX-4 / Time / L |
| ESS leave | `/ess/leave`, balance/reservation and lifecycle actions | Consistent balances, filters, policy context and pending ownership | Preserve cancellation/withdrawal rules and overlap behavior | UX-4 / Leave / L |
| ESS documents | `/ess/documents`, employee-document-center | Requirement-led list, clear verify/reject/expiry/upload progress | Category upload policy and release exclusions; no CSS-only access | UX-3 / Documents / L |
| ESS payslips/tax | `/ess/payslips`, `/ess/statutory-declarations` | Concise published-period list and secure profile shortcuts | Publication, download, read receipt, declaration status; no pay recalculation | UX-1A links, UX-5 / Payroll / L |
| ESS inbox | `/ess/notifications`, notification center/detail | Actionable notification detail, unread semantics, contextual return | Own notifications/read state, secure deep links; not an announcement CMS | UX-3 / Operations / M |
| MSS dashboard | `/mss`, scoped team summary | Separate team decisions from personal work; remove unfiltered destination ambiguity | Permission-gated leave/attendance summary; real team context endpoint if needed | UX-3 / MSS / M |
| MSS approvals | `/mss/approvals`, decision panel/review | Consistent review drawer, dates/evidence/reason and decision feedback | Current workflow assignee/direct-report authority and idempotent decisions | UX-3 / MSS+Workflow / L |
| MSS inbox | `/mss/notifications` | Reuse notification/detail feedback contracts | Team/assignment scope; no non-direct employee leakage | UX-3 / MSS / M |
| HR dashboard/hubs | `/hr-admin`, module metadata | Compact priority/action hierarchy and consistent drill-through | Do not convert dashboard operational readiness into launch approval | UX-1B/4 / HR / M |
| HR employee directory | `/hr-admin/employees`, selection provider, imports | Unified filters/table, stable detail selection and contextual profile | employees.view/create/edit/import/access permissions remain distinct | UX-3 / People / L |
| HR employee detail/bank/access | Employee detail/access/bank subroutes | Reuse profile sections with HR-specific projection and clear ownership | Preserve employee-bank tests, access separation, no widening ESS DTO | UX-3 / People+IAM / L |
| HR organization | `/hr-admin/organization`, organization/history APIs | Consistent master list/detail/impact; explicit current versus effective context | Temporal history and policy-blocked restructuring remain governed | UX-4 / Core HR / L |
| HR lifecycle | Onboarding, probation, movement, exit, lifecycle queue | Consistent queue, aging, timeline and effective-date review | No invented rehire/transfer/FnF policy; preserve RG3 authority | UX-3/4 / Lifecycle / XL |
| HR attendance operations | Records, exceptions, derivation, imports, monthly close | Consistent filter/context/drawer and period locks | Closed snapshot immutability, row targeting and payroll references | UX-4 / Time / L |
| HR rosters/shifts/holidays | Shift, template, roster, assignment and calendar routes | Connected preview, assignment, rollout and conflict feedback | Effective assignment rules; employee holiday read needs separate scope | UX-4 / Time / L |
| HR leave policies/balances | Types/policies/assignments/requests/balance transactions | Standard policy preview, conflict/impact and ledger feedback | Preserve resolved policy and ledger; no new carry-forward/restoration rule | UX-4 / Leave / L |
| HR documents/letters | Categories, requirements, documents, generated letters | Consistent requirement context and preview/download feedback | Verify/export/manage rights; storage/quarantine/release gates | UX-3 / Documents / L |
| HR workflows | Templates, assignments, traces | Clear configuration versus runtime authority, consistent trace panels | Existing assignment semantics; delegation/escalation policies not assumed | UX-4 / Workflow / L |
| HR notifications | Channels, templates, events, diagnostics and delivery list | Shared filters/test preview/retry feedback | Provider state truth, no false delivery success | UX-4 / Operations / M |
| Payroll configuration | Structures/components/groups/statutory/provider configuration routes | Consistent effective dates, impact, validation and configuration context | Financial oracle and temporal-config tests; rates untouched | UX-5 / Payroll / XL |
| Payroll cycle/inputs | Runs/readiness/input snapshots/attendance close | Compact period context and explicit prerequisite links | Preserve closed inputs, workflow roles and job durability | UX-5 / Payroll / XL |
| Payroll review/adjustments/settlements | Review exceptions, approvals, adjustments, settlements | Traceable review drawers and state-aware actions | No automatic FnF/retro/arrears policy, no stale/duplicate approval | UX-5 / Payroll / XL |
| Payroll outputs/finance/providers | Payslips, bank advice, finance handoff, provider certification | Truthful generated/published/paid distinctions and durable download status | Payment integrity/provider gates remain external or conditional | UX-5 / Payroll+Finance / XL |
| HR reports/compliance | Report catalog, reports subroutes and export controls | Common filter/result/detail/export contract, retained submenu context | Per-family row counts/order/manifests/audit; no global certification inference | UX-5 / Reports / L |
| Tenant dashboard/setup | `/tenant-admin`, setup | Compact next action with real prerequisite links | tenant.dashboard.view/setup.view; readiness is not approval | UX-6 / Tenant / M |
| Tenant users/roles | users, roles, invites | Standard tables/drawers/status/confirmation and permission explanation | tenant.users/roles view/manage, privilege-escalation negatives | UX-6 / IAM / L |
| Tenant plan/settings/calendars | plan/settings/financial-calendars/leave-year | Consistent effective periods and governed change feedback | No unapproved downgrade, accounting or leave-year business policy | UX-6 / Tenant+Finance / L |
| Tenant trust/security/support/governance | trust-audit/security-readiness/support-access/data-governance | Consistent evidence/status and explicit scope/expiry | Retention/legal hold and support grant/revoke remain fail-closed | UX-6 / Security / L |
| Platform dashboard/tenants | renderer + tenants | Compact operator priorities and context-preserving tenant detail | Platform access separate from tenant employee permissions | UX-6 / Platform / L |
| Platform leads/onboarding/launch | leads/onboarding/launch | Standard state-transition review, recovery and evidence links | Stage prerequisites and signed launch exclusions remain authoritative | UX-6 / Platform / L |
| Platform admins/permissions/policies | admins/permissions/policy-packs | Consistent permission catalog, impact and governed edits | Admin authority/tenant-assignable boundaries; no capability inferred from menu | UX-6 / Platform+Security / L |
| Platform governance/audit | data-governance/audit-logs | Shared evidence tables, filters and secure artifact actions | Scope binding, retention, rejected access and export audit | UX-6 / Security / L |
| Shared shell/loading/forms | components/shell, components/patterns, lib/ui | Consolidate contracts in plan; preserve async architecture | Five-workspace keyboard/mobile/race/session failure regression | UX-1B onward / Design system / L |

## Workspace permission boundary review

| Persona/workspace | Existing access source | Required preservation |
|---|---|---|
| Employee / ESS | Session `workspace_access.ess`, active self employee context, endpoint/service checks | Own employee only. Current profile GET is not governed by a profile-edit permission; never grant HR employee-edit rights. |
| Manager / MSS | Session MSS eligibility, effective permissions, current workflow assignment or direct-report scope | `leave.requests.approve` and `attendance.regularization.review` alone do not authorize every employee object. Personal ESS remains separate. |
| HR Admin | Session HR workspace eligibility, HrAdminContextMixin and per-operation permission | Separate `employees.view/create/edit/import/access.manage`, organization, time, document, payroll, finance and report permissions; read access does not imply mutation/export. |
| Tenant Admin | Session tenant workspace, tenant operation keys | Users/roles/account/settings/support/governance are tenant-scoped. Tenant administration is not automatic access to all employee/payroll data. |
| Platform Admin | Platform-admin session and platform view-specific authorization | Preserve platform eligibility and explicit support grant scope. Platform navigation is not blanket access to tenant employee artifacts. |
| Custom/multi-role | Explicit RolePermission rows; catalog defaults only under existing resolver rules | Test actual effective permissions, module/plan entitlement and active membership, not role-name assumptions. |

The permission catalog is code-owned, while explicit role rows and tenant entitlements affect runtime access. No deployed policy was inspected. For each later changed action, record frontend visibility rule, browser proxy rule, Django permission, object scope, service transition and release capability in review evidence. The API census records literal checks only; it cannot prove every layered permission path.

## Existing regression anchors

These are existing suites/reports to select for the changed surface; their presence is not a new pass. Do not run mutation suites against shared Lightsail under this plan.

| Boundary | Existing anchors |
|---|---|
| ESS/MSS and self context | `web/tests/e2e/ess-control-center-certification.spec.ts`, `ess-mss-workflow-certification.spec.ts`, `dd6-ess-mss-domain-certification.spec.ts`, `mss-rbac-approver-certification.spec.ts`, `ess-real-user-demo-certification.spec.ts` |
| ESS modules | `ess-attendance-launch-certification.spec.ts`, `ess-leave-launch-certification.spec.ts`, `ess-leave-policy-resolution-certification.spec.ts`, `ess-documents-launch-certification.spec.ts`, `ess-payslips-launch-certification.spec.ts`, `ess-notifications-launch-certification.spec.ts` under `web/tests/e2e/` |
| Directory and lifecycle | `employee-directory-certification.spec.ts`, `employee-bank-accounts-certification.spec.ts`, `hr-admin-employee-production-certification.spec.ts`, `employee-lifecycle-certification-flows.spec.ts`, `rg3a-lifecycle-authority-certification.spec.ts` |
| Time/leave | `dd3-leave-correction-certification.spec.ts`, `dd4-attendance-domain-certification.spec.ts`, `hr-admin-time-leave-attendance-roster-p0-gap-certification.spec.ts` |
| Finance and artifacts | `payroll-lifecycle-rbac-certification.spec.ts`, `payroll-statutory-rbac-certification.spec.ts`, `payroll-output-artifact-certification.spec.ts`, report-family `*-report-certification.spec.ts` |
| Tenant/Platform | `tenant-admin-boundary-certification.spec.ts`, `tenant-admin-roles-certification.spec.ts`, `platform-admin-tenant-isolation-certification.spec.ts`, `platform-admin-negative-security-certification.spec.ts`, `platform-admin-rbac-permissions-certification.spec.ts` |
| Shared responsive/accessibility | `production-responsive-visual-gate.spec.ts`, `release-candidate-cross-workspace-ui-gate.spec.ts`, `platform-admin-visual-accessibility-certification.spec.ts`, `tenant-admin-visual-accessibility-certification.spec.ts`; loading report and 46-family CSV remain authoritative |
| Django/domain | `backend/apps/common/tests.py`, module tests in attendance/leave_management/documents/payroll; `backend/tests/test_db5_effective_employment_integrity.py`, `test_db6_attendance_close_integrity.py`, `test_dd7_workflow_integrity.py`, `test_lc1_temporal_payroll_integrity.py`, `test_rg3a_lifecycle_authority_integrity.py` |

## Component surface census and prior standard

The existing [interface tracker](hrms-interface-coverage-tracker.md) and [JSON component inventory](hrms-interface-inventory.json) provide the detailed historical form/dialog/drawer surface list and approved compact table-first standard. Current counts below include pages, layouts, loading/error boundaries and local TSX components; they do not include shared imports and do not certify every component behavior. Reuse the old component inventory as a starting point and reconcile additions in each implementation slice.

| Workspace | Current local TSX surfaces | Page entry points |
|---|---:|---:|
| ess | 18 | 7 |
| mss | 8 | 3 |
| hr-admin | 282 | 146 |
| tenant-admin | 20 | 12 |
| platform-admin | 17 | 10 |

## Route census

Automatically enumerated from current tracked workspace directories during UX-0. A page's literal guard hint is only a navigation/inspection aid: inherited layout guards, imported renderers, API checks and service-level object scope remain authoritative. “Inherited/delegated” does not mean public. API proxy handlers are counted separately below. No new profile route exists yet.

### ess: 7 page entry points

| Browser route | Source | Literal permission hints (not complete authorization) |
|---|---|---|
| `/ess/attendance` | [attendance page](../../web/src/app/ess/attendance/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/ess/documents` | [documents page](../../web/src/app/ess/documents/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/ess/leave` | [leave page](../../web/src/app/ess/leave/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/ess/notifications` | [notifications page](../../web/src/app/ess/notifications/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/ess` | [ess page](../../web/src/app/ess/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/ess/payslips` | [payslips page](../../web/src/app/ess/payslips/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/ess/statutory-declarations` | [statutory-declarations page](../../web/src/app/ess/statutory-declarations/page.tsx) | Inherited/delegated; inspect layout/renderer and API |

### mss: 3 page entry points

| Browser route | Source | Literal permission hints (not complete authorization) |
|---|---|---|
| `/mss/approvals` | [approvals page](../../web/src/app/mss/approvals/page.tsx) | `attendance.regularization.review`, `leave.requests.approve` |
| `/mss/notifications` | [notifications page](../../web/src/app/mss/notifications/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/mss` | [mss page](../../web/src/app/mss/page.tsx) | `attendance.regularization.review`, `leave.requests.approve` |

### hr-admin: 146 page entry points

| Browser route | Source | Literal permission hints (not complete authorization) |
|---|---|---|
| `/hr-admin/attendance-close` | [attendance-close page](../../web/src/app/hr-admin/attendance-close/page.tsx) | `attendance.close.approve`, `attendance.close.manage`, `attendance.view` |
| `/hr-admin/attendance-operations` | [attendance-operations page](../../web/src/app/hr-admin/attendance-operations/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/attendance-policies/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/attendance-policies/[itemId]/edit/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/attendance-policies/new` | [new page](../../web/src/app/hr-admin/attendance-policies/new/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/attendance-policies` | [attendance-policies page](../../web/src/app/hr-admin/attendance-policies/page.tsx) | `attendance.policies.manage`, `attendance.view` |
| `/hr-admin/attendance-policy-assignments/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/attendance-policy-assignments/[itemId]/edit/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/attendance-policy-assignments/new` | [new page](../../web/src/app/hr-admin/attendance-policy-assignments/new/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/attendance-policy-assignments` | [attendance-policy-assignments page](../../web/src/app/hr-admin/attendance-policy-assignments/page.tsx) | `attendance.policies.manage`, `attendance.view` |
| `/hr-admin/attendance-records/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/attendance-records/[itemId]/edit/page.tsx) | `attendance.records.manage` |
| `/hr-admin/attendance-records` | [attendance-records page](../../web/src/app/hr-admin/attendance-records/page.tsx) | `attendance.records.manage`, `attendance.view` |
| `/hr-admin/attendance-regularizations/[itemId]/review` | [review page](../../web/src/app/hr-admin/attendance-regularizations/[itemId]/review/page.tsx) | `attendance.regularization.review` |
| `/hr-admin/attendance-regularizations` | [attendance-regularizations page](../../web/src/app/hr-admin/attendance-regularizations/page.tsx) | `attendance.regularization.review`, `attendance.view` |
| `/hr-admin/audit` | [audit page](../../web/src/app/hr-admin/audit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/document-categories/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/document-categories/[itemId]/edit/page.tsx) | `documents.manage` |
| `/hr-admin/document-categories/new` | [new page](../../web/src/app/hr-admin/document-categories/new/page.tsx) | `documents.manage` |
| `/hr-admin/document-categories` | [document-categories page](../../web/src/app/hr-admin/document-categories/page.tsx) | `documents.manage`, `documents.view` |
| `/hr-admin/document-requirements/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/document-requirements/[itemId]/edit/page.tsx) | `documents.manage` |
| `/hr-admin/document-requirements/new` | [new page](../../web/src/app/hr-admin/document-requirements/new/page.tsx) | `documents.manage` |
| `/hr-admin/document-requirements` | [document-requirements page](../../web/src/app/hr-admin/document-requirements/page.tsx) | `documents.manage`, `documents.view` |
| `/hr-admin/documents` | [documents page](../../web/src/app/hr-admin/documents/page.tsx) | `documents.export`, `documents.manage`, `documents.verify`, `documents.view` |
| `/hr-admin/employee-documents/[itemId]/review` | [review page](../../web/src/app/hr-admin/employee-documents/[itemId]/review/page.tsx) | `documents.verify` |
| `/hr-admin/employee-documents/new` | [new page](../../web/src/app/hr-admin/employee-documents/new/page.tsx) | `documents.manage` |
| `/hr-admin/employee-documents` | [employee-documents page](../../web/src/app/hr-admin/employee-documents/page.tsx) | `documents.export`, `documents.manage`, `documents.verify`, `documents.view` |
| `/hr-admin/employee-shift-assignments/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/employee-shift-assignments/[itemId]/edit/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/employee-shift-assignments/new` | [new page](../../web/src/app/hr-admin/employee-shift-assignments/new/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/employee-shift-assignments` | [employee-shift-assignments page](../../web/src/app/hr-admin/employee-shift-assignments/page.tsx) | `attendance.policies.manage`, `attendance.view` |
| `/hr-admin/employees/[employeeId]/access` | [access page](../../web/src/app/hr-admin/employees/[employeeId]/access/page.tsx) | `employees.access.manage` |
| `/hr-admin/employees/[employeeId]/bank-accounts` | [bank-accounts page](../../web/src/app/hr-admin/employees/[employeeId]/bank-accounts/page.tsx) | `employees.edit` |
| `/hr-admin/employees/[employeeId]/edit` | [edit page](../../web/src/app/hr-admin/employees/[employeeId]/edit/page.tsx) | `employees.edit` |
| `/hr-admin/employees/new` | [new page](../../web/src/app/hr-admin/employees/new/page.tsx) | `employees.create` |
| `/hr-admin/employees` | [employees page](../../web/src/app/hr-admin/employees/page.tsx) | `employees.access.manage`, `employees.create`, `employees.edit`, `employees.import`, `employees.view` |
| `/hr-admin/exits/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/exits/[itemId]/edit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/exits/new` | [new page](../../web/src/app/hr-admin/exits/new/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/exits` | [exits page](../../web/src/app/hr-admin/exits/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/generated-letters` | [generated-letters page](../../web/src/app/hr-admin/generated-letters/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/holiday-calendars/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/holiday-calendars/[itemId]/edit/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/holiday-calendars/new` | [new page](../../web/src/app/hr-admin/holiday-calendars/new/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/holiday-calendars` | [holiday-calendars page](../../web/src/app/hr-admin/holiday-calendars/page.tsx) | `attendance.policies.manage`, `attendance.view` |
| `/hr-admin/import-history` | [import-history page](../../web/src/app/hr-admin/import-history/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/launch-remediation` | [launch-remediation page](../../web/src/app/hr-admin/launch-remediation/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/leave-balances` | [leave-balances page](../../web/src/app/hr-admin/leave-balances/page.tsx) | `leave.balances.manage`, `leave.view` |
| `/hr-admin/leave-policies/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/leave-policies/[itemId]/edit/page.tsx) | `leave.policies.manage` |
| `/hr-admin/leave-policies/new` | [new page](../../web/src/app/hr-admin/leave-policies/new/page.tsx) | `leave.policies.manage` |
| `/hr-admin/leave-policies` | [leave-policies page](../../web/src/app/hr-admin/leave-policies/page.tsx) | `leave.policies.manage`, `leave.view` |
| `/hr-admin/leave-policy-assignments/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/leave-policy-assignments/[itemId]/edit/page.tsx) | `leave.policies.manage` |
| `/hr-admin/leave-policy-assignments/new` | [new page](../../web/src/app/hr-admin/leave-policy-assignments/new/page.tsx) | `leave.policies.manage` |
| `/hr-admin/leave-policy-assignments` | [leave-policy-assignments page](../../web/src/app/hr-admin/leave-policy-assignments/page.tsx) | `leave.policies.manage`, `leave.view` |
| `/hr-admin/leave-requests` | [leave-requests page](../../web/src/app/hr-admin/leave-requests/page.tsx) | `leave.requests.approve`, `leave.view` |
| `/hr-admin/leave-types/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/leave-types/[itemId]/edit/page.tsx) | `leave.policies.manage` |
| `/hr-admin/leave-types/new` | [new page](../../web/src/app/hr-admin/leave-types/new/page.tsx) | `leave.policies.manage` |
| `/hr-admin/leave-types` | [leave-types page](../../web/src/app/hr-admin/leave-types/page.tsx) | `leave.policies.manage`, `leave.view` |
| `/hr-admin/leave-year` | [leave-year page](../../web/src/app/hr-admin/leave-year/page.tsx) | `leave.periods.close`, `leave.periods.manage`, `leave.periods.reopen`, `leave.periods.view` |
| `/hr-admin/lifecycle` | [lifecycle page](../../web/src/app/hr-admin/lifecycle/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/movements/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/movements/[itemId]/edit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/movements/new` | [new page](../../web/src/app/hr-admin/movements/new/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/movements` | [movements page](../../web/src/app/hr-admin/movements/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notification-delivery` | [notification-delivery page](../../web/src/app/hr-admin/notification-delivery/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notification-diagnostics` | [notification-diagnostics page](../../web/src/app/hr-admin/notification-diagnostics/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notification-events/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/notification-events/[itemId]/edit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notification-events/new` | [new page](../../web/src/app/hr-admin/notification-events/new/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notification-events` | [notification-events page](../../web/src/app/hr-admin/notification-events/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notification-templates/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/notification-templates/[itemId]/edit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notification-templates/new` | [new page](../../web/src/app/hr-admin/notification-templates/new/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notification-templates` | [notification-templates page](../../web/src/app/hr-admin/notification-templates/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notifications/[itemId]/review` | [review page](../../web/src/app/hr-admin/notifications/[itemId]/review/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notifications` | [notifications page](../../web/src/app/hr-admin/notifications/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/notifications-admin` | [notifications-admin page](../../web/src/app/hr-admin/notifications-admin/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/onboardings/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/onboardings/[itemId]/edit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/onboardings/new` | [new page](../../web/src/app/hr-admin/onboardings/new/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/onboardings` | [onboardings page](../../web/src/app/hr-admin/onboardings/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/organization/[section]/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/organization/[section]/[itemId]/edit/page.tsx) | `organization.manage` |
| `/hr-admin/organization/[section]/new` | [new page](../../web/src/app/hr-admin/organization/[section]/new/page.tsx) | `organization.manage` |
| `/hr-admin/organization` | [organization page](../../web/src/app/hr-admin/organization/page.tsx) | `employees.view`, `organization.manage`, `organization.view` |
| `/hr-admin` | [hr-admin page](../../web/src/app/hr-admin/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/payroll-adjustments` | [payroll-adjustments page](../../web/src/app/hr-admin/payroll-adjustments/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/payroll-calculations` | [payroll-calculations page](../../web/src/app/hr-admin/payroll-calculations/page.tsx) | `payroll.calculate`, `payroll.review` |
| `/hr-admin/payroll-handoff` | [payroll-handoff page](../../web/src/app/hr-admin/payroll-handoff/page.tsx) | `finance.bank_advice.export`, `finance.handoff.acknowledge`, `finance.handoff.create`, `finance.handoff.transmit`, `finance.handoff.view`, `payroll.provider_queue.runtime.pending` |
| `/hr-admin/payroll-inputs` | [payroll-inputs page](../../web/src/app/hr-admin/payroll-inputs/page.tsx) | `payroll.inputs.manage`, `payroll.inputs.view`, `payroll.lock` |
| `/hr-admin/payroll-outputs` | [payroll-outputs page](../../web/src/app/hr-admin/payroll-outputs/page.tsx) | `finance.handoff.create`, `payroll.outputs.view`, `payroll.publish` |
| `/hr-admin/payroll-providers` | [payroll-providers page](../../web/src/app/hr-admin/payroll-providers/page.tsx) | `failure.none`, `provider.callback.rejected`, `provider.delivery.failure`, `provider.job.worker`, `provider.retry.queue`, `retry.none` |
| `/hr-admin/payroll-readiness` | [payroll-readiness page](../../web/src/app/hr-admin/payroll-readiness/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/payroll-review` | [payroll-review page](../../web/src/app/hr-admin/payroll-review/page.tsx) | `payroll.approve`, `payroll.lock`, `payroll.publish`, `payroll.review` |
| `/hr-admin/payroll-rules` | [payroll-rules page](../../web/src/app/hr-admin/payroll-rules/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/payroll-settlements` | [payroll-settlements page](../../web/src/app/hr-admin/payroll-settlements/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/payroll-setup` | [payroll-setup page](../../web/src/app/hr-admin/payroll-setup/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/payroll-statutory` | [payroll-statutory page](../../web/src/app/hr-admin/payroll-statutory/page.tsx) | `statutory.declarations.manage`, `statutory.declarations.view`, `statutory.setup.manage`, `statutory.setup.view`, `tds.challan.mapping.pending`, `tds.fvu.validation.profile.pending`, `tds.provider.route.pending` |
| `/hr-admin/policies` | [policies page](../../web/src/app/hr-admin/policies/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/policy-assignments` | [policy-assignments page](../../web/src/app/hr-admin/policy-assignments/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/probation-reviews/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/probation-reviews/[itemId]/edit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/probation-reviews/new` | [new page](../../web/src/app/hr-admin/probation-reviews/new/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/probation-reviews` | [probation-reviews page](../../web/src/app/hr-admin/probation-reviews/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/attendance` | [attendance page](../../web/src/app/hr-admin/reports/attendance/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/attendance-derivation-exceptions` | [attendance-derivation-exceptions page](../../web/src/app/hr-admin/reports/attendance-derivation-exceptions/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/attendance-exceptions` | [attendance-exceptions page](../../web/src/app/hr-admin/reports/attendance-exceptions/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/attendance-register` | [attendance-register page](../../web/src/app/hr-admin/reports/attendance-register/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/bank-advice` | [bank-advice page](../../web/src/app/hr-admin/reports/bank-advice/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/challan-reconciliation` | [challan-reconciliation page](../../web/src/app/hr-admin/reports/challan-reconciliation/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/compliance` | [compliance page](../../web/src/app/hr-admin/reports/compliance/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/compliance-summary` | [compliance-summary page](../../web/src/app/hr-admin/reports/compliance-summary/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/document-compliance` | [document-compliance page](../../web/src/app/hr-admin/reports/document-compliance/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/esic-contribution-readiness` | [esic-contribution-readiness page](../../web/src/app/hr-admin/reports/esic-contribution-readiness/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/export-audits` | [export-audits page](../../web/src/app/hr-admin/reports/export-audits/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/finance-handoff-exceptions` | [finance-handoff-exceptions page](../../web/src/app/hr-admin/reports/finance-handoff-exceptions/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/hr-core` | [hr-core page](../../web/src/app/hr-admin/reports/hr-core/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/leave-attendance-collisions` | [leave-attendance-collisions page](../../web/src/app/hr-admin/reports/leave-attendance-collisions/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/leave-balance` | [leave-balance page](../../web/src/app/hr-admin/reports/leave-balance/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/lifecycle-aging` | [lifecycle-aging page](../../web/src/app/hr-admin/reports/lifecycle-aging/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/lifecycle-queue` | [lifecycle-queue page](../../web/src/app/hr-admin/reports/lifecycle-queue/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/lwf-readiness` | [lwf-readiness page](../../web/src/app/hr-admin/reports/lwf-readiness/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports` | [reports page](../../web/src/app/hr-admin/reports/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/payroll` | [payroll page](../../web/src/app/hr-admin/reports/payroll/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/payroll-adjustments` | [payroll-adjustments page](../../web/src/app/hr-admin/reports/payroll-adjustments/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/payroll-close-readiness` | [payroll-close-readiness page](../../web/src/app/hr-admin/reports/payroll-close-readiness/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/payroll-input-exceptions` | [payroll-input-exceptions page](../../web/src/app/hr-admin/reports/payroll-input-exceptions/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/payroll-register` | [payroll-register page](../../web/src/app/hr-admin/reports/payroll-register/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/payroll-review-exceptions` | [payroll-review-exceptions page](../../web/src/app/hr-admin/reports/payroll-review-exceptions/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/payroll-settlements` | [payroll-settlements page](../../web/src/app/hr-admin/reports/payroll-settlements/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/payslip-publication` | [payslip-publication page](../../web/src/app/hr-admin/reports/payslip-publication/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/pf-ecr-readiness` | [pf-ecr-readiness page](../../web/src/app/hr-admin/reports/pf-ecr-readiness/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/professional-tax-readiness` | [professional-tax-readiness page](../../web/src/app/hr-admin/reports/professional-tax-readiness/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/provider-filing-receipts` | [provider-filing-receipts page](../../web/src/app/hr-admin/reports/provider-filing-receipts/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/roster-rollout-audit` | [roster-rollout-audit page](../../web/src/app/hr-admin/reports/roster-rollout-audit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/salary-variance` | [salary-variance page](../../web/src/app/hr-admin/reports/salary-variance/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/statutory-deductions` | [statutory-deductions page](../../web/src/app/hr-admin/reports/statutory-deductions/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/statutory-filing-status` | [statutory-filing-status page](../../web/src/app/hr-admin/reports/statutory-filing-status/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/tds-efile-readiness` | [tds-efile-readiness page](../../web/src/app/hr-admin/reports/tds-efile-readiness/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/reports/workforce` | [workforce page](../../web/src/app/hr-admin/reports/workforce/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/saas-control-plane` | [saas-control-plane page](../../web/src/app/hr-admin/saas-control-plane/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/saas-operations` | [saas-operations page](../../web/src/app/hr-admin/saas-operations/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/saas-resilience` | [saas-resilience page](../../web/src/app/hr-admin/saas-resilience/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/saas-sla-operations` | [saas-sla-operations page](../../web/src/app/hr-admin/saas-sla-operations/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/salary-setup` | [salary-setup page](../../web/src/app/hr-admin/salary-setup/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/shift-roster-templates/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/shift-roster-templates/[itemId]/edit/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/shift-roster-templates/new` | [new page](../../web/src/app/hr-admin/shift-roster-templates/new/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/shift-roster-templates` | [shift-roster-templates page](../../web/src/app/hr-admin/shift-roster-templates/page.tsx) | `attendance.policies.manage`, `attendance.view` |
| `/hr-admin/shifts/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/shifts/[itemId]/edit/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/shifts/new` | [new page](../../web/src/app/hr-admin/shifts/new/page.tsx) | `attendance.policies.manage` |
| `/hr-admin/shifts` | [shifts page](../../web/src/app/hr-admin/shifts/page.tsx) | `attendance.policies.manage`, `attendance.view` |
| `/hr-admin/time-to-payroll` | [time-to-payroll page](../../web/src/app/hr-admin/time-to-payroll/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/workflow-template-assignments/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/workflow-template-assignments/[itemId]/edit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/workflow-template-assignments/new` | [new page](../../web/src/app/hr-admin/workflow-template-assignments/new/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/workflow-template-assignments` | [workflow-template-assignments page](../../web/src/app/hr-admin/workflow-template-assignments/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/workflow-templates/[itemId]/edit` | [edit page](../../web/src/app/hr-admin/workflow-templates/[itemId]/edit/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/workflow-templates/new` | [new page](../../web/src/app/hr-admin/workflow-templates/new/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/workflow-templates` | [workflow-templates page](../../web/src/app/hr-admin/workflow-templates/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/hr-admin/workflows` | [workflows page](../../web/src/app/hr-admin/workflows/page.tsx) | Inherited/delegated; inspect layout/renderer and API |

### tenant-admin: 12 page entry points

| Browser route | Source | Literal permission hints (not complete authorization) |
|---|---|---|
| `/tenant-admin/data-governance` | [data-governance page](../../web/src/app/tenant-admin/data-governance/page.tsx) | `tenant.retention.view` |
| `/tenant-admin/financial-calendars` | [financial-calendars page](../../web/src/app/tenant-admin/financial-calendars/page.tsx) | `finance.periods.close`, `finance.periods.reopen`, `tenant.settings.manage`, `tenant.settings.view` |
| `/tenant-admin/leave-year` | [leave-year page](../../web/src/app/tenant-admin/leave-year/page.tsx) | `leave.periods.close`, `leave.periods.manage`, `leave.periods.reopen`, `leave.periods.view` |
| `/tenant-admin` | [tenant-admin page](../../web/src/app/tenant-admin/page.tsx) | `tenant.audit.export`, `tenant.audit.view`, `tenant.change_requests.manage`, `tenant.dashboard.view`, `tenant.plan.view`, `tenant.roles.manage`, `tenant.roles.view`, `tenant.security.view`, `tenant.settings.view`, `tenant.setup.view`, `tenant.support_access.approve`, `tenant.support_access.request`, `tenant.support_access.view`, `tenant.users.manage`, `tenant.users.view` |
| `/tenant-admin/plan` | [plan page](../../web/src/app/tenant-admin/plan/page.tsx) | `tenant.audit.export`, `tenant.change_requests.manage`, `tenant.plan.view` |
| `/tenant-admin/roles` | [roles page](../../web/src/app/tenant-admin/roles/page.tsx) | `tenant.roles.manage`, `tenant.roles.view` |
| `/tenant-admin/security-readiness` | [security-readiness page](../../web/src/app/tenant-admin/security-readiness/page.tsx) | `tenant.security.view` |
| `/tenant-admin/settings` | [settings page](../../web/src/app/tenant-admin/settings/page.tsx) | `tenant.change_requests.manage`, `tenant.settings.view` |
| `/tenant-admin/setup` | [setup page](../../web/src/app/tenant-admin/setup/page.tsx) | `tenant.setup.view` |
| `/tenant-admin/support-access` | [support-access page](../../web/src/app/tenant-admin/support-access/page.tsx) | `tenant.support_access.approve`, `tenant.support_access.request` |
| `/tenant-admin/trust-audit` | [trust-audit page](../../web/src/app/tenant-admin/trust-audit/page.tsx) | `tenant.audit.export`, `tenant.audit.view` |
| `/tenant-admin/users` | [users page](../../web/src/app/tenant-admin/users/page.tsx) | `tenant.users.manage`, `tenant.users.view` |

### platform-admin: 10 page entry points

| Browser route | Source | Literal permission hints (not complete authorization) |
|---|---|---|
| `/platform-admin/admins` | [admins page](../../web/src/app/platform-admin/admins/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/platform-admin/audit-logs` | [audit-logs page](../../web/src/app/platform-admin/audit-logs/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/platform-admin/data-governance` | [data-governance page](../../web/src/app/platform-admin/data-governance/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/platform-admin/launch` | [launch page](../../web/src/app/platform-admin/launch/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/platform-admin/leads` | [leads page](../../web/src/app/platform-admin/leads/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/platform-admin/onboarding` | [onboarding page](../../web/src/app/platform-admin/onboarding/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/platform-admin` | [platform-admin page](../../web/src/app/platform-admin/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/platform-admin/permissions` | [permissions page](../../web/src/app/platform-admin/permissions/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/platform-admin/policy-packs` | [policy-packs page](../../web/src/app/platform-admin/policy-packs/page.tsx) | Inherited/delegated; inspect layout/renderer and API |
| `/platform-admin/tenants` | [tenants page](../../web/src/app/platform-admin/tenants/page.tsx) | Inherited/delegated; inspect layout/renderer and API |

Current browser proxy inventory: 266 `web/src/app/api/**/route.ts` handlers. These mediate browser actions; Django URL paths below remain the backend route census. Existing API method support must be inspected before using a proxy for a read.

## API route and view inventory

Paths below are literal registrations, not advertised capabilities. Methods and permission strings are extracted from the registered view class when local source is found. Inherited guards and service/selector policy are not expanded by the extractor; absence of a literal permission is never evidence of unrestricted access. `MeEmployeeDocumentListCreateView`, for example, is POST-only despite its name. Prefix `/api/v1/` applies to common routes; auth/platform/policy prefixes follow `backend/config/urls.py`.

### [backend/apps/common/api_urls.py](../../backend/apps/common/api_urls.py) — 324 registrations

| API path | View / source | Own methods; literal permission hints |
|---|---|---|
| `/api/v1/hr-admin/attendance-closes/` | [HrAdminAttendanceCloseListCreateView](../../backend/apps/common/attendance_close_api.py#L34) | GET, POST; `attendance.close.manage`, `attendance.view` |
| `/api/v1/hr-admin/attendance-closes/<uuid:item_id>/` | [HrAdminAttendanceCloseDetailView](../../backend/apps/common/attendance_close_api.py#L66) | GET; `attendance.view` |
| `/api/v1/hr-admin/attendance-closes/<uuid:item_id>/<str:action>/` | [HrAdminAttendanceCloseTransitionView](../../backend/apps/common/attendance_close_api.py#L78) | POST; `attendance.close.approve`, `attendance.close.manage` |
| `/api/v1/tenant-admin/financial-calendars/` | [FiscalWorkspaceView](../../backend/apps/common/fiscal_api.py#L126) | GET; context/service guards; inspect source |
| `/api/v1/tenant-admin/financial-calendars/calendars/` | [FiscalCalendarListCreateView](../../backend/apps/common/fiscal_api.py#L142) | POST; `tenant.settings.manage` |
| `/api/v1/tenant-admin/financial-calendars/calendars/<uuid:item_id>/` | [FiscalCalendarDetailView](../../backend/apps/common/fiscal_api.py#L161) | PATCH; `tenant.settings.manage` |
| `/api/v1/tenant-admin/financial-calendars/years/` | [FiscalYearListCreateView](../../backend/apps/common/fiscal_api.py#L188) | POST; `tenant.settings.manage` |
| `/api/v1/tenant-admin/financial-calendars/years/<uuid:item_id>/transition/` | [FiscalYearTransitionView](../../backend/apps/common/fiscal_api.py#L248) | POST; context/service guards; inspect source |
| `/api/v1/tenant-admin/financial-calendars/periods/` | [AccountingPeriodListCreateView](../../backend/apps/common/fiscal_api.py#L207) | POST; `tenant.settings.manage` |
| `/api/v1/tenant-admin/financial-calendars/periods/<uuid:item_id>/transition/` | [AccountingPeriodTransitionView](../../backend/apps/common/fiscal_api.py#L231) | POST; context/service guards; inspect source |
| `/api/v1/tenant-admin/data-governance/` | [TenantRetentionWorkspaceView](../../backend/apps/common/retention_api.py#L84) | GET; context/service guards; inspect source |
| `/api/v1/tenant-admin/data-governance/requests/` | [TenantGovernanceRequestView](../../backend/apps/common/retention_api.py#L96) | POST; `tenant.data_erasure.request`, `tenant.data_export.request` |
| `/api/v1/hr-admin/leave-year/periods/` | [HrAdminLeavePolicyPeriodListCreateView](../../backend/apps/common/leave_year_api.py#L249) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/leave-year/periods/<uuid:item_id>/transition/` | [HrAdminLeavePolicyPeriodTransitionView](../../backend/apps/common/leave_year_api.py#L258) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/leave-year/preview/` | [HrAdminLeaveYearPreviewView](../../backend/apps/common/leave_year_api.py#L252) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/leave-year/close-runs/` | [HrAdminLeaveYearCloseRunListCreateView](../../backend/apps/common/leave_year_api.py#L254) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/leave-year/close-runs/<uuid:item_id>/` | [HrAdminLeaveYearCloseRunDetailView](../../backend/apps/common/leave_year_api.py#L256) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/leave-year/historical-classification/` | [HrAdminLeaveHistoricalClassificationView](../../backend/apps/common/leave_year_api.py#L260) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/tenant-admin/leave-year/periods/` | [TenantAdminLeavePolicyPeriodListCreateView](../../backend/apps/common/leave_year_api.py#L250) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/tenant-admin/leave-year/options/` | [TenantAdminLeaveYearOptionsView](../../backend/apps/common/leave_year_api.py#L251) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/tenant-admin/leave-year/periods/<uuid:item_id>/transition/` | [TenantAdminLeavePolicyPeriodTransitionView](../../backend/apps/common/leave_year_api.py#L259) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/tenant-admin/leave-year/preview/` | [TenantAdminLeaveYearPreviewView](../../backend/apps/common/leave_year_api.py#L253) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/tenant-admin/leave-year/close-runs/` | [TenantAdminLeaveYearCloseRunListCreateView](../../backend/apps/common/leave_year_api.py#L255) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/tenant-admin/leave-year/close-runs/<uuid:item_id>/` | [TenantAdminLeaveYearCloseRunDetailView](../../backend/apps/common/leave_year_api.py#L257) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/tenant-admin/leave-year/historical-classification/` | [TenantAdminLeaveHistoricalClassificationView](../../backend/apps/common/leave_year_api.py#L261) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/support/tenant-console/` | [SupportSessionTenantConsoleView](../../backend/apps/common/api_views.py#L8315) | GET; context/service guards; inspect source |
| `/api/v1/support/domain-snapshot/` | [SupportSessionDomainSnapshotView](../../backend/apps/common/api_views.py#L8344) | GET; context/service guards; inspect source |
| `/api/v1/tenant-admin/console/` | [TenantAdminConsoleView](../../backend/apps/common/api_views.py#L8083) | GET; context/service guards; inspect source |
| `/api/v1/tenant-admin/trust-audit/` | [TenantAdminTrustAuditReviewView](../../backend/apps/common/api_views.py#L8114) | GET; `tenant.audit.view` |
| `/api/v1/tenant-admin/security-readiness/` | [TenantAdminEnterpriseSecurityReadinessView](../../backend/apps/common/api_views.py#L8135) | GET; `tenant.security.view` |
| `/api/v1/tenant-admin/commercial-support-audit/download/` | [TenantAdminCommercialSupportAuditPackDownloadView](../../backend/apps/common/api_views.py#L8092) | GET; `tenant.audit.export` |
| `/api/v1/tenant-admin/memberships/` | [TenantAdminMembershipListCreateView](../../backend/apps/common/api_views.py#L8145) | POST; `tenant.users.manage` |
| `/api/v1/tenant-admin/memberships/<uuid:membership_id>/` | [TenantAdminMembershipDetailView](../../backend/apps/common/api_views.py#L8165) | PATCH; `tenant.users.manage` |
| `/api/v1/tenant-admin/roles/` | [TenantAdminRoleListCreateView](../../backend/apps/common/api_views.py#L8186) | POST; `tenant.roles.manage` |
| `/api/v1/tenant-admin/roles/<uuid:role_id>/` | [TenantAdminRoleDetailView](../../backend/apps/common/api_views.py#L8206) | PATCH; `tenant.roles.manage` |
| `/api/v1/tenant-admin/change-requests/` | [TenantAdminChangeRequestListCreateView](../../backend/apps/common/api_views.py#L8233) | POST; `tenant.change_requests.manage` |
| `/api/v1/tenant-admin/change-requests/<uuid:item_id>/` | [TenantAdminChangeRequestDetailView](../../backend/apps/common/api_views.py#L8253) | PATCH; `tenant.change_requests.manage` |
| `/api/v1/tenant-admin/support-access-grants/` | [TenantAdminSupportAccessGrantListCreateView](../../backend/apps/common/api_views.py#L8274) | POST; `tenant.support_access.request` |
| `/api/v1/tenant-admin/support-access-grants/<uuid:item_id>/` | [TenantAdminSupportAccessGrantDetailView](../../backend/apps/common/api_views.py#L8294) | PATCH; `tenant.support_access.approve` |
| `/api/v1/hr-admin/dashboard/` | [HrAdminDashboardView](../../backend/apps/common/api_views.py#L7918) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/saas-launch-audit/download/` | [HrAdminSaasLaunchAuditPackDownloadView](../../backend/apps/common/api_views.py#L7945) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/saas-control-plane/` | [HrAdminSaasCommercialControlView](../../backend/apps/common/api_views.py#L8027) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/saas-operational-health/` | [HrAdminSaasOperationalHealthView](../../backend/apps/common/api_views.py#L8056) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/saas-resilience/` | [HrAdminSaasResilienceReadinessView](../../backend/apps/common/api_views.py#L8065) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/saas-sla-operations/` | [HrAdminSaasSlaOperationsView](../../backend/apps/common/api_views.py#L8074) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/launch-remediations/` | [HrAdminLaunchRemediationListView](../../backend/apps/common/api_views.py#L7973) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/launch-remediations/<uuid:item_id>/` | [HrAdminLaunchRemediationDetailView](../../backend/apps/common/api_views.py#L7993) | PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-readiness/` | [HrAdminPayrollReadinessView](../../backend/apps/common/api_views.py#L8377) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-setup/` | [HrAdminPayrollSetupView](../../backend/apps/common/api_views.py#L8639) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-calculation-setup/` | [HrAdminPayrollCalculationSetupView](../../backend/apps/common/api_views.py#L11915) | GET; `payroll.review` |
| `/api/v1/hr-admin/payroll-review-setup/` | [HrAdminPayrollReviewSetupView](../../backend/apps/common/api_views.py#L12173) | GET; `payroll.review` |
| `/api/v1/hr-admin/payroll-output-setup/` | [HrAdminPayrollOutputSetupView](../../backend/apps/common/api_views.py#L12519) | GET; `payroll.outputs.view` |
| `/api/v1/hr-admin/payroll-finance-handoff-setup/` | [HrAdminPayrollFinanceHandoffSetupView](../../backend/apps/common/api_views.py#L13558) | GET; `finance.handoff.create`, `finance.handoff.view`, `payroll.setup.view` |
| `/api/v1/hr-admin/payroll-provider-connection-setup/` | [HrAdminPayrollProviderConnectionSetupView](../../backend/apps/common/api_views.py#L13567) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-launch-rehearsals/run/` | [HrAdminPayrollProviderLaunchRehearsalRunView](../../backend/apps/common/api_views.py#L13575) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-adjustment-setup/` | [HrAdminPayrollAdjustmentSetupView](../../backend/apps/common/api_views.py#L10413) | GET; `payroll.review` |
| `/api/v1/hr-admin/payroll-settlement-setup/` | [HrAdminPayrollSettlementSetupView](../../backend/apps/common/api_views.py#L10694) | GET; `payroll.review` |
| `/api/v1/hr-admin/payroll-statutory-setup/` | [HrAdminPayrollStatutorySetupView](../../backend/apps/common/api_views.py#L14200) | GET; `statutory.declarations.manage`, `statutory.declarations.view`, `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-input-snapshot-setup/` | [HrAdminPayrollInputSnapshotSetupView](../../backend/apps/common/api_views.py#L11061) | GET; `payroll.inputs.view` |
| `/api/v1/hr-admin/payroll-runs/` | [HrAdminPayrollRunListCreateView](../../backend/apps/common/api_views.py#L11070) | GET, POST; `payroll.inputs.manage`, `payroll.inputs.view` |
| `/api/v1/hr-admin/payroll-runs/<uuid:item_id>/lock-inputs/` | [HrAdminPayrollRunLockInputsView](../../backend/apps/common/api_views.py#L11137) | POST; `payroll.lock` |
| `/api/v1/hr-admin/payroll-runs/<uuid:item_id>/calculate-draft/` | [HrAdminPayrollRunDraftCalculateView](../../backend/apps/common/api_views.py#L11940) | POST; `payroll.calculate` |
| `/api/v1/hr-admin/payroll-jobs/` | [HrAdminPayrollBackgroundJobListView](../../backend/apps/common/api_views.py#L13956) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-jobs/<uuid:item_id>/` | [HrAdminPayrollBackgroundJobDetailView](../../backend/apps/common/api_views.py#L13973) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-jobs/<uuid:item_id>/retry/` | [HrAdminPayrollBackgroundJobRetryView](../../backend/apps/common/api_views.py#L13991) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-runs/<uuid:item_id>/open-review/` | [HrAdminPayrollRunOpenReviewView](../../backend/apps/common/api_views.py#L12182) | POST; `payroll.review` |
| `/api/v1/hr-admin/payroll-reviews/<uuid:item_id>/submit/` | [HrAdminPayrollReviewSubmitView](../../backend/apps/common/api_views.py#L12216) | POST; `payroll.review` |
| `/api/v1/hr-admin/payroll-reviews/<uuid:item_id>/approve/` | [HrAdminPayrollReviewApproveView](../../backend/apps/common/api_views.py#L12232) | POST; `payroll.approve` |
| `/api/v1/hr-admin/payroll-reviews/<uuid:item_id>/reject/` | [HrAdminPayrollReviewRejectView](../../backend/apps/common/api_views.py#L12256) | POST; `payroll.approve` |
| `/api/v1/hr-admin/payroll-reviews/<uuid:item_id>/lock/` | [HrAdminPayrollReviewLockView](../../backend/apps/common/api_views.py#L12280) | POST; `payroll.lock` |
| `/api/v1/hr-admin/payroll-reviews/<uuid:item_id>/generate-outputs/` | [HrAdminPayrollReviewGenerateOutputsView](../../backend/apps/common/api_views.py#L12528) | POST; `payroll.publish` |
| `/api/v1/hr-admin/payroll-reviews/<uuid:item_id>/exceptions/` | [HrAdminPayrollReviewExceptionListCreateView](../../backend/apps/common/api_views.py#L12296) | POST; `payroll.review` |
| `/api/v1/hr-admin/payroll-review-exceptions/<uuid:item_id>/decision/` | [HrAdminPayrollReviewExceptionDecisionView](../../backend/apps/common/api_views.py#L12329) | POST; `payroll.review` |
| `/api/v1/hr-admin/payroll-output-batches/<uuid:item_id>/publish/` | [HrAdminPayrollOutputBatchPublishView](../../backend/apps/common/api_views.py#L12562) | POST; `payroll.publish` |
| `/api/v1/hr-admin/payroll-output-artifacts/<uuid:item_id>/download/` | [HrAdminPayrollOutputArtifactDownloadView](../../backend/apps/common/api_views.py#L12725) | GET; `payroll.outputs.download` |
| `/api/v1/hr-admin/payroll-output-artifacts/<uuid:item_id>/signed-access/` | [HrAdminPayrollOutputArtifactSignedAccessIssueView](../../backend/apps/common/api_views.py#L12592) | POST; `payroll.outputs.download` |
| `/api/v1/hr-admin/payroll-output-artifacts/<uuid:item_id>/access-audit-export/` | [HrAdminPayrollOutputArtifactAccessAuditExportView](../../backend/apps/common/api_views.py#L12675) | GET; `payroll.outputs.download` |
| `/api/v1/hr-admin/payroll-signed-access-grants/<uuid:item_id>/revoke/` | [HrAdminPayrollArtifactSignedAccessGrantRevokeView](../../backend/apps/common/api_views.py#L12639) | POST; `payroll.outputs.download` |
| `/api/v1/hr-admin/payroll-output-batches/<uuid:item_id>/generate-finance-handoff/` | [HrAdminPayrollOutputBatchGenerateFinanceHandoffView](../../backend/apps/common/api_views.py#L13907) | POST; `finance.handoff.create` |
| `/api/v1/hr-admin/payroll-finance-handoffs/<uuid:item_id>/transmit/` | [HrAdminPayrollFinanceHandoffTransmitView](../../backend/apps/common/api_views.py#L14006) | POST; `finance.handoff.create`, `finance.handoff.transmit` |
| `/api/v1/hr-admin/payroll-finance-handoffs/<uuid:item_id>/generate-audit-pack/` | [HrAdminPayrollFinanceHandoffGenerateAuditPackView](../../backend/apps/common/api_views.py#L14030) | POST; `finance.bank_advice.export`, `finance.handoff.create` |
| `/api/v1/hr-admin/payroll-finance-handoffs/<uuid:item_id>/acknowledge/` | [HrAdminPayrollFinanceHandoffAcknowledgeView](../../backend/apps/common/api_views.py#L14067) | POST; `finance.handoff.acknowledge`, `finance.handoff.create` |
| `/api/v1/hr-admin/payroll-provider-connections/` | [HrAdminPayrollProviderConnectionListCreateView](../../backend/apps/common/api_views.py#L13596) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-connections/<uuid:item_id>/` | [HrAdminPayrollProviderConnectionDetailView](../../backend/apps/common/api_views.py#L13627) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-connections/<uuid:item_id>/certify/` | [HrAdminPayrollProviderConnectionCertifyView](../../backend/apps/common/api_views.py#L13662) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-connections/<uuid:item_id>/run-certification/` | [HrAdminPayrollProviderConnectionRunCertificationView](../../backend/apps/common/api_views.py#L13688) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-schema-mapping-packs/` | [HrAdminPayrollProviderSchemaMappingPackListCreateView](../../backend/apps/common/api_views.py#L13716) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-schema-mapping-packs/import/` | [HrAdminPayrollProviderSchemaMappingPackImportView](../../backend/apps/common/api_views.py#L13743) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-schema-mapping-packs/<uuid:item_id>/` | [HrAdminPayrollProviderSchemaMappingPackDetailView](../../backend/apps/common/api_views.py#L13762) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-schema-mapping-packs/<uuid:item_id>/clone/` | [HrAdminPayrollProviderSchemaMappingPackCloneView](../../backend/apps/common/api_views.py#L13789) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-schema-mapping-packs/<uuid:item_id>/activate/` | [HrAdminPayrollProviderSchemaMappingPackActivateView](../../backend/apps/common/api_views.py#L13811) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-schema-mapping-packs/<uuid:item_id>/archive/` | [HrAdminPayrollProviderSchemaMappingPackArchiveView](../../backend/apps/common/api_views.py#L13839) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-schema-mapping-packs/<uuid:item_id>/simulate/` | [HrAdminPayrollProviderSchemaMappingPackSimulateView](../../backend/apps/common/api_views.py#L13861) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-schema-mapping-packs/<uuid:item_id>/export/` | [HrAdminPayrollProviderSchemaMappingPackExportView](../../backend/apps/common/api_views.py#L13891) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-provider-deliveries/<uuid:item_id>/schedule-retry/` | [HrAdminPayrollProviderDeliveryScheduleRetryView](../../backend/apps/common/api_views.py#L14138) | POST; `finance.handoff.create`, `finance.handoff.transmit` |
| `/api/v1/hr-admin/payroll-provider-deliveries/<uuid:item_id>/requeue/` | [HrAdminPayrollProviderDeliveryRequeueView](../../backend/apps/common/api_views.py#L14167) | POST; `finance.handoff.create`, `finance.handoff.transmit` |
| `/api/v1/payroll-provider-callbacks/` | [PayrollProviderCallbackView](../../backend/apps/common/api_views.py#L14101) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-runs/<uuid:item_id>/` | [HrAdminPayrollRunDetailView](../../backend/apps/common/api_views.py#L11101) | GET, PATCH; `payroll.inputs.manage`, `payroll.inputs.view` |
| `/api/v1/hr-admin/payroll-adjustments/` | [HrAdminPayrollAdjustmentListCreateView](../../backend/apps/common/api_views.py#L10422) | GET, POST; `payroll.review` |
| `/api/v1/hr-admin/payroll-adjustments/<uuid:item_id>/submit/` | [HrAdminPayrollAdjustmentSubmitView](../../backend/apps/common/api_views.py#L10489) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-adjustments/<uuid:item_id>/approve/` | [HrAdminPayrollAdjustmentApproveView](../../backend/apps/common/api_views.py#L10493) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-adjustments/<uuid:item_id>/reject/` | [HrAdminPayrollAdjustmentRejectView](../../backend/apps/common/api_views.py#L10497) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-adjustments/<uuid:item_id>/apply/` | [HrAdminPayrollAdjustmentApplyView](../../backend/apps/common/api_views.py#L10501) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-settlements/` | [HrAdminPayrollSettlementListCreateView](../../backend/apps/common/api_views.py#L10703) | GET, POST; `payroll.review` |
| `/api/v1/hr-admin/payroll-settlements/<uuid:item_id>/lines/` | [HrAdminPayrollSettlementLineListCreateView](../../backend/apps/common/api_views.py#L10726) | POST; `payroll.review` |
| `/api/v1/hr-admin/payroll-settlements/<uuid:item_id>/submit/` | [HrAdminPayrollSettlementSubmitView](../../backend/apps/common/api_views.py#L10788) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-settlements/<uuid:item_id>/approve/` | [HrAdminPayrollSettlementApproveView](../../backend/apps/common/api_views.py#L10792) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-settlements/<uuid:item_id>/reject/` | [HrAdminPayrollSettlementRejectView](../../backend/apps/common/api_views.py#L10796) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-settlements/<uuid:item_id>/apply/` | [HrAdminPayrollSettlementApplyView](../../backend/apps/common/api_views.py#L10800) | Inherited/delegated; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-statutory-packs/` | [HrAdminPayrollStatutoryPackListCreateView](../../backend/apps/common/api_views.py#L14209) | GET, POST; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-statutory-packs/<uuid:item_id>/` | [HrAdminPayrollStatutoryPackDetailView](../../backend/apps/common/api_views.py#L14232) | GET, PATCH; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-statutory-components/` | [HrAdminPayrollStatutoryComponentListCreateView](../../backend/apps/common/api_views.py#L14260) | GET, POST; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-statutory-components/<uuid:item_id>/` | [HrAdminPayrollStatutoryComponentDetailView](../../backend/apps/common/api_views.py#L14287) | GET, PATCH; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-statutory-slabs/` | [HrAdminPayrollStatutorySlabListCreateView](../../backend/apps/common/api_views.py#L14317) | GET, POST; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-statutory-slabs/<uuid:item_id>/` | [HrAdminPayrollStatutorySlabDetailView](../../backend/apps/common/api_views.py#L14344) | GET, PATCH; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-statutory-employer-registrations/` | [HrAdminPayrollStatutoryEmployerRegistrationListCreateView](../../backend/apps/common/api_views.py#L14374) | GET, POST; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-statutory-employer-registrations/<uuid:item_id>/` | [HrAdminPayrollStatutoryEmployerRegistrationDetailView](../../backend/apps/common/api_views.py#L14411) | GET, PATCH; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-statutory-filing-calendars/` | [HrAdminPayrollStatutoryFilingCalendarListCreateView](../../backend/apps/common/api_views.py#L14444) | GET, POST; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/payroll-statutory-filing-calendars/<uuid:item_id>/` | [HrAdminPayrollStatutoryFilingCalendarDetailView](../../backend/apps/common/api_views.py#L14481) | GET, PATCH; `statutory.setup.manage`, `statutory.setup.view` |
| `/api/v1/hr-admin/employee-statutory-profiles/` | [HrAdminEmployeeStatutoryProfileListCreateView](../../backend/apps/common/api_views.py#L14514) | GET, POST; `statutory.declarations.manage`, `statutory.declarations.view` |
| `/api/v1/hr-admin/employee-statutory-profiles/<uuid:item_id>/` | [HrAdminEmployeeStatutoryProfileDetailView](../../backend/apps/common/api_views.py#L14541) | GET, PATCH; `statutory.declarations.manage`, `statutory.declarations.view` |
| `/api/v1/hr-admin/employee-statutory-declarations/` | [HrAdminEmployeeStatutoryDeclarationListCreateView](../../backend/apps/common/api_views.py#L14571) | GET, POST; `statutory.declarations.manage`, `statutory.declarations.view` |
| `/api/v1/hr-admin/employee-statutory-declarations/<uuid:item_id>/` | [HrAdminEmployeeStatutoryDeclarationDetailView](../../backend/apps/common/api_views.py#L14598) | GET, PATCH; `statutory.declarations.manage`, `statutory.declarations.view` |
| `/api/v1/hr-admin/employee-statutory-declarations/<uuid:item_id>/items/` | [HrAdminEmployeeStatutoryDeclarationItemListCreateView](../../backend/apps/common/api_views.py#L14704) | GET, POST; `statutory.declarations.manage`, `statutory.declarations.view` |
| `/api/v1/hr-admin/employee-statutory-declarations/<uuid:item_id>/submit/` | [HrAdminEmployeeStatutoryDeclarationSubmitView](../../backend/apps/common/api_views.py#L14630) | POST; `statutory.declarations.manage` |
| `/api/v1/hr-admin/employee-statutory-declarations/<uuid:item_id>/verify/` | [HrAdminEmployeeStatutoryDeclarationVerifyView](../../backend/apps/common/api_views.py#L14648) | POST; `statutory.declarations.manage` |
| `/api/v1/hr-admin/employee-statutory-declarations/<uuid:item_id>/reject/` | [HrAdminEmployeeStatutoryDeclarationRejectView](../../backend/apps/common/api_views.py#L14666) | POST; `statutory.declarations.manage` |
| `/api/v1/hr-admin/employee-statutory-declarations/<uuid:item_id>/lock/` | [HrAdminEmployeeStatutoryDeclarationLockView](../../backend/apps/common/api_views.py#L14686) | POST; `statutory.declarations.manage` |
| `/api/v1/hr-admin/employee-statutory-declaration-items/<uuid:item_id>/` | [HrAdminEmployeeStatutoryDeclarationItemDetailView](../../backend/apps/common/api_views.py#L14737) | GET, PATCH; `statutory.declarations.manage`, `statutory.declarations.view` |
| `/api/v1/hr-admin/employee-statutory-declaration-items/<uuid:item_id>/verify/` | [HrAdminEmployeeStatutoryDeclarationItemVerifyView](../../backend/apps/common/api_views.py#L14769) | POST; `statutory.declarations.manage` |
| `/api/v1/hr-admin/payroll-input-snapshots/` | [HrAdminPayrollInputSnapshotListCreateView](../../backend/apps/common/api_views.py#L11186) | GET, POST; `payroll.inputs.manage`, `payroll.inputs.view` |
| `/api/v1/hr-admin/payroll-input-snapshots/bulk-import/` | [HrAdminPayrollInputSnapshotBulkImportView](../../backend/apps/common/api_views.py#L11225) | POST; `payroll.inputs.manage` |
| `/api/v1/hr-admin/payroll-input-snapshots/<uuid:item_id>/` | [HrAdminPayrollInputSnapshotDetailView](../../backend/apps/common/api_views.py#L11323) | GET, PATCH; `payroll.inputs.manage`, `payroll.inputs.view` |
| `/api/v1/hr-admin/payroll-rules-setup/` | [HrAdminPayrollRulesSetupView](../../backend/apps/common/api_views.py#L11511) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-rule-definitions/` | [HrAdminPayrollRuleDefinitionListCreateView](../../backend/apps/common/api_views.py#L11519) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-rule-definitions/<uuid:item_id>/` | [HrAdminPayrollRuleDefinitionDetailView](../../backend/apps/common/api_views.py#L11542) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-rule-versions/` | [HrAdminPayrollRuleVersionListCreateView](../../backend/apps/common/api_views.py#L11570) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-rule-versions/<uuid:item_id>/evaluate/` | [HrAdminPayrollRuleVersionEvaluateView](../../backend/apps/common/api_views.py#L11623) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-rule-versions/<uuid:item_id>/` | [HrAdminPayrollRuleVersionDetailView](../../backend/apps/common/api_views.py#L11594) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-calendars/` | [HrAdminPayrollCalendarListCreateView](../../backend/apps/common/api_views.py#L8647) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-calendars/<uuid:item_id>/` | [HrAdminPayrollCalendarDetailView](../../backend/apps/common/api_views.py#L8668) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-periods/` | [HrAdminPayrollPeriodListCreateView](../../backend/apps/common/api_views.py#L8694) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/payroll-periods/<uuid:item_id>/` | [HrAdminPayrollPeriodDetailView](../../backend/apps/common/api_views.py#L8716) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/pay-groups/` | [HrAdminPayGroupListCreateView](../../backend/apps/common/api_views.py#L8743) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/pay-groups/<uuid:item_id>/` | [HrAdminPayGroupDetailView](../../backend/apps/common/api_views.py#L8765) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/pay-group-assignments/` | [HrAdminPayGroupAssignmentListCreateView](../../backend/apps/common/api_views.py#L8792) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/pay-group-assignments/<uuid:item_id>/` | [HrAdminPayGroupAssignmentDetailView](../../backend/apps/common/api_views.py#L8814) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/salary-setup/` | [HrAdminSalarySetupView](../../backend/apps/common/api_views.py#L14791) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/salary-components/` | [HrAdminSalaryComponentListCreateView](../../backend/apps/common/api_views.py#L14799) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/salary-components/<uuid:item_id>/` | [HrAdminSalaryComponentDetailView](../../backend/apps/common/api_views.py#L14820) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/salary-structures/` | [HrAdminSalaryStructureListCreateView](../../backend/apps/common/api_views.py#L14846) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/salary-structures/<uuid:item_id>/` | [HrAdminSalaryStructureDetailView](../../backend/apps/common/api_views.py#L14868) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/salary-structure-versions/` | [HrAdminSalaryStructureVersionListCreateView](../../backend/apps/common/api_views.py#L14895) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/salary-structure-versions/<uuid:item_id>/` | [HrAdminSalaryStructureVersionDetailView](../../backend/apps/common/api_views.py#L14917) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/salary-structure-components/` | [HrAdminSalaryStructureComponentListCreateView](../../backend/apps/common/api_views.py#L14944) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/salary-structure-components/<uuid:item_id>/` | [HrAdminSalaryStructureComponentDetailView](../../backend/apps/common/api_views.py#L14966) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/employee-salary-assignments/` | [HrAdminEmployeeSalaryAssignmentListCreateView](../../backend/apps/common/api_views.py#L14993) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/employee-salary-assignments/<uuid:item_id>/` | [HrAdminEmployeeSalaryAssignmentDetailView](../../backend/apps/common/api_views.py#L15015) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/reports/exports/<slug:report_key>/` | [HrAdminReportExportView](../../backend/apps/common/api_views.py#L15042) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/reports/export-audits/` | [HrAdminReportExportAuditListCreateView](../../backend/apps/common/api_views.py#L15166) | GET, POST; `reports.compliance.view` |
| `/api/v1/hr-admin/import-batches/` | [HrAdminImportBatchAuditListCreateView](../../backend/apps/common/api_views.py#L15267) | GET, POST; `attendance.policies.manage`, `attendance.records.manage`, `employees.import`, `leave.policies.manage`, `leave.requests.approve`, `organization.manage` |
| `/api/v1/hr-admin/attendance-operations/options/` | [HrAdminAttendanceOperationOptionsView](../../backend/apps/common/api_views.py#L15855) | GET; `attendance.view` |
| `/api/v1/hr-admin/attendance-operations/workbench-options/` | [HrAdminAttendanceWorkbenchOptionsView](../../backend/apps/common/api_views.py#L15875) | GET; `attendance.view` |
| `/api/v1/hr-admin/shifts/` | [HrAdminShiftListCreateView](../../backend/apps/common/api_views.py#L15907) | GET, POST; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/shifts/<uuid:item_id>/detach/` | [HrAdminShiftDetachView](../../backend/apps/common/api_views.py#L15980) | POST; `attendance.policies.manage` |
| `/api/v1/hr-admin/shifts/<uuid:item_id>/` | [HrAdminShiftDetailView](../../backend/apps/common/api_views.py#L15939) | GET, PATCH; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/holiday-calendars/` | [HrAdminHolidayCalendarListCreateView](../../backend/apps/common/api_views.py#L15996) | GET, POST; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/holiday-calendars/<uuid:item_id>/detach/` | [HrAdminHolidayCalendarDetachView](../../backend/apps/common/api_views.py#L16044) | POST; `attendance.policies.manage` |
| `/api/v1/hr-admin/holiday-calendars/<uuid:item_id>/` | [HrAdminHolidayCalendarDetailView](../../backend/apps/common/api_views.py#L16018) | GET, PATCH; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/attendance-records/` | [HrAdminAttendanceRecordListView](../../backend/apps/common/api_views.py#L16061) | GET, POST; `attendance.records.manage`, `attendance.view` |
| `/api/v1/hr-admin/attendance-records/bulk-actions/` | [HrAdminAttendanceRecordBulkActionView](../../backend/apps/common/api_views.py#L16172) | POST; `attendance.records.manage` |
| `/api/v1/hr-admin/employee-shift-assignments/` | [HrAdminEmployeeShiftAssignmentListCreateView](../../backend/apps/common/api_views.py#L17882) | GET, POST; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/employee-shift-assignments/conflicts/` | [HrAdminEmployeeShiftAssignmentConflictView](../../backend/apps/common/api_views.py#L17964) | POST; `attendance.policies.manage` |
| `/api/v1/hr-admin/employee-shift-assignments/resolve/` | [HrAdminEmployeeShiftAssignmentResolutionView](../../backend/apps/common/api_views.py#L17991) | POST; `attendance.view` |
| `/api/v1/hr-admin/employee-shift-assignments/<uuid:item_id>/` | [HrAdminEmployeeShiftAssignmentDetailView](../../backend/apps/common/api_views.py#L17936) | GET, PATCH; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/work-schedule-preview/` | [HrAdminWorkSchedulePreviewView](../../backend/apps/common/api_views.py#L18010) | GET; `attendance.view` |
| `/api/v1/hr-admin/shift-roster-templates/` | [HrAdminShiftRosterTemplateListCreateView](../../backend/apps/common/api_views.py#L18029) | GET, POST; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/shift-roster-rollouts/` | [HrAdminShiftRosterRolloutListView](../../backend/apps/common/api_views.py#L18155) | GET; `attendance.view` |
| `/api/v1/hr-admin/shift-roster-templates/rollout/` | [HrAdminShiftRosterTemplateRolloutView](../../backend/apps/common/api_views.py#L18106) | POST; `attendance.policies.manage` |
| `/api/v1/hr-admin/shift-roster-templates/<uuid:item_id>/` | [HrAdminShiftRosterTemplateDetailView](../../backend/apps/common/api_views.py#L18080) | GET, PATCH; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/lifecycle-owner-bulk-actions/` | [HrAdminLifecycleOwnerBulkActionView](../../backend/apps/common/api_views.py#L16199) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/lifecycle-status-bulk-actions/` | [HrAdminLifecycleStatusBulkActionView](../../backend/apps/common/api_views.py#L16235) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/attendance-records/<uuid:item_id>/` | [HrAdminAttendanceRecordDetailView](../../backend/apps/common/api_views.py#L16268) | GET, PATCH; `attendance.records.manage`, `attendance.view` |
| `/api/v1/hr-admin/attendance-regularizations/` | [HrAdminAttendanceRegularizationListView](../../backend/apps/common/api_views.py#L16317) | GET; `attendance.view` |
| `/api/v1/hr-admin/attendance-regularizations/<uuid:item_id>/` | [HrAdminAttendanceRegularizationDetailView](../../backend/apps/common/api_views.py#L16386) | GET; `attendance.view` |
| `/api/v1/hr-admin/attendance-regularizations/<uuid:item_id>/approve/` | [HrAdminAttendanceRegularizationApproveView](../../backend/apps/common/api_views.py#L16402) | POST; `attendance.regularization.review` |
| `/api/v1/hr-admin/attendance-regularizations/<uuid:item_id>/reject/` | [HrAdminAttendanceRegularizationRejectView](../../backend/apps/common/api_views.py#L16427) | POST; `attendance.regularization.review` |
| `/api/v1/hr-admin/policy-options/` | [HrAdminPolicyOptionsView](../../backend/apps/common/api_views.py#L15733) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/policy-workbench-options/` | [HrAdminPolicyWorkbenchOptionsView](../../backend/apps/common/api_views.py#L15769) | GET; `attendance.view`, `leave.view` |
| `/api/v1/hr-admin/leave-types/` | [HrAdminLeaveTypeListCreateView](../../backend/apps/common/api_views.py#L16683) | GET, POST; `leave.policies.manage`, `leave.view` |
| `/api/v1/hr-admin/leave-types/<uuid:item_id>/impact/` | [HrAdminLeaveTypeImpactView](../../backend/apps/common/api_views.py#L16775) | GET; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-types/<uuid:item_id>/deactivate/` | [HrAdminLeaveTypeDeactivateView](../../backend/apps/common/api_views.py#L16787) | POST; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-types/<uuid:item_id>/delete/` | [HrAdminLeaveTypeDeleteView](../../backend/apps/common/api_views.py#L16820) | DELETE; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-types/<uuid:item_id>/detach/` | [HrAdminLeaveTypeDetachView](../../backend/apps/common/api_views.py#L16850) | POST; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-types/<uuid:item_id>/` | [HrAdminLeaveTypeDetailView](../../backend/apps/common/api_views.py#L16706) | GET, PATCH; `leave.policies.manage`, `leave.view` |
| `/api/v1/hr-admin/leave-policies/` | [HrAdminLeavePolicyListCreateView](../../backend/apps/common/api_views.py#L17003) | GET, POST; `leave.policies.manage`, `leave.view` |
| `/api/v1/hr-admin/leave-policies/<uuid:item_id>/impact/` | [HrAdminLeavePolicyImpactView](../../backend/apps/common/api_views.py#L17144) | GET; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-policies/<uuid:item_id>/archive/` | [HrAdminLeavePolicyArchiveView](../../backend/apps/common/api_views.py#L17156) | POST; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-policies/<uuid:item_id>/delete/` | [HrAdminLeavePolicyDeleteView](../../backend/apps/common/api_views.py#L17192) | DELETE; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-policies/<uuid:item_id>/detach/` | [HrAdminLeavePolicyDetachView](../../backend/apps/common/api_views.py#L17128) | POST; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-policies/<uuid:item_id>/` | [HrAdminLeavePolicyDetailView](../../backend/apps/common/api_views.py#L17039) | GET, PATCH; `leave.policies.manage`, `leave.view` |
| `/api/v1/hr-admin/leave-policies/preview/` | [HrAdminLeavePolicyPreviewView](../../backend/apps/common/api_views.py#L17223) | POST; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-policy-assignments/conflicts/` | [HrAdminLeavePolicyAssignmentConflictView](../../backend/apps/common/api_views.py#L17248) | POST; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-policy-assignments/resolve/` | [HrAdminLeavePolicyAssignmentResolutionView](../../backend/apps/common/api_views.py#L17280) | POST; `leave.view` |
| `/api/v1/hr-admin/leave-policy-assignments/bulk-import/` | [HrAdminLeavePolicyAssignmentBulkImportView](../../backend/apps/common/api_views.py#L17423) | POST; `leave.policies.manage` |
| `/api/v1/hr-admin/leave-policy-assignments/` | [HrAdminLeavePolicyAssignmentListCreateView](../../backend/apps/common/api_views.py#L17307) | GET, POST; `leave.policies.manage`, `leave.view` |
| `/api/v1/hr-admin/leave-policy-assignments/<uuid:item_id>/` | [HrAdminLeavePolicyAssignmentDetailView](../../backend/apps/common/api_views.py#L17474) | GET, DELETE, PATCH; `leave.policies.manage`, `leave.view` |
| `/api/v1/hr-admin/leave-requests/` | [HrAdminLeaveRequestListView](../../backend/apps/common/api_views.py#L16452) | GET, POST; `leave.view` |
| `/api/v1/hr-admin/leave-requests/bulk-import/` | [HrAdminLeaveRequestBulkImportView](../../backend/apps/common/api_views.py#L16571) | POST; `leave.view` |
| `/api/v1/hr-admin/leave-requests/<uuid:item_id>/approve/` | [HrAdminLeaveRequestApproveView](../../backend/apps/common/api_views.py#L16633) | POST; `leave.requests.approve` |
| `/api/v1/hr-admin/leave-requests/<uuid:item_id>/reject/` | [HrAdminLeaveRequestRejectView](../../backend/apps/common/api_views.py#L16658) | POST; `leave.requests.approve` |
| `/api/v1/hr-admin/leave-requests/<uuid:item_id>/` | [HrAdminLeaveRequestDetailView](../../backend/apps/common/api_views.py#L16617) | GET; `leave.view` |
| `/api/v1/hr-admin/leave-balances/` | [HrAdminLeaveBalanceListView](../../backend/apps/common/api_views.py#L17550) | GET; `leave.view` |
| `/api/v1/hr-admin/leave-balances/actions/` | [HrAdminLeaveBalanceActionView](../../backend/apps/common/api_views.py#L17643) | POST; `leave.balances.manage` |
| `/api/v1/hr-admin/leave-balances/transactions/` | [HrAdminLeaveBalanceTransactionListView](../../backend/apps/common/api_views.py#L17594) | GET; `leave.view` |
| `/api/v1/hr-admin/leave-balances/transactions/<uuid:item_id>/review/` | [HrAdminLeaveBalanceTransactionReviewView](../../backend/apps/common/api_views.py#L17707) | POST; `leave.balances.manage` |
| `/api/v1/hr-admin/attendance-policies/` | [HrAdminAttendancePolicyListCreateView](../../backend/apps/common/api_views.py#L16866) | GET, POST; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/attendance-policies/<uuid:item_id>/detach/` | [HrAdminAttendancePolicyDetachView](../../backend/apps/common/api_views.py#L16942) | POST; `attendance.policies.manage` |
| `/api/v1/hr-admin/attendance-policies/<uuid:item_id>/` | [HrAdminAttendancePolicyDetailView](../../backend/apps/common/api_views.py#L16901) | GET, PATCH; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/attendance-policies/preview/` | [HrAdminAttendancePolicyPreviewView](../../backend/apps/common/api_views.py#L16958) | POST; `attendance.policies.manage` |
| `/api/v1/hr-admin/attendance-policy-assignments/conflicts/` | [HrAdminAttendancePolicyAssignmentConflictView](../../backend/apps/common/api_views.py#L17834) | POST; `attendance.policies.manage` |
| `/api/v1/hr-admin/attendance-policy-assignments/resolve/` | [HrAdminAttendancePolicyAssignmentResolutionView](../../backend/apps/common/api_views.py#L17867) | POST; `attendance.view` |
| `/api/v1/hr-admin/attendance-policy-assignments/` | [HrAdminAttendancePolicyAssignmentListCreateView](../../backend/apps/common/api_views.py#L17764) | GET, POST; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/attendance-policy-assignments/<uuid:item_id>/` | [HrAdminAttendancePolicyAssignmentDetailView](../../backend/apps/common/api_views.py#L17798) | GET, PATCH; `attendance.policies.manage`, `attendance.view` |
| `/api/v1/hr-admin/workflow-options/` | [HrAdminWorkflowOptionsView](../../backend/apps/common/api_views.py#L18172) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/workflow-traces/` | [HrAdminWorkflowTraceListView](../../backend/apps/common/api_views.py#L18203) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/workflow-traces/<uuid:item_id>/` | [HrAdminWorkflowTraceDetailView](../../backend/apps/common/api_views.py#L18258) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/workflow-templates/` | [HrAdminWorkflowTemplateListCreateView](../../backend/apps/common/api_views.py#L18274) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/workflow-templates/<uuid:item_id>/` | [HrAdminWorkflowTemplateDetailView](../../backend/apps/common/api_views.py#L18294) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/workflow-template-assignments/` | [HrAdminWorkflowTemplateAssignmentListCreateView](../../backend/apps/common/api_views.py#L18318) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/workflow-template-assignments/<uuid:item_id>/` | [HrAdminWorkflowTemplateAssignmentDetailView](../../backend/apps/common/api_views.py#L18340) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/document-options/` | [HrAdminDocumentOptionsView](../../backend/apps/common/api_views.py#L18366) | GET; `documents.view` |
| `/api/v1/hr-admin/document-categories/` | [HrAdminDocumentCategoryListCreateView](../../backend/apps/common/api_views.py#L18389) | GET, POST; `documents.manage`, `documents.view` |
| `/api/v1/hr-admin/document-categories/<uuid:item_id>/` | [HrAdminDocumentCategoryDetailView](../../backend/apps/common/api_views.py#L18410) | GET, PATCH; `documents.manage`, `documents.view` |
| `/api/v1/hr-admin/document-requirements/` | [HrAdminDocumentRequirementRuleListCreateView](../../backend/apps/common/api_views.py#L18435) | GET, POST; `documents.manage`, `documents.view` |
| `/api/v1/hr-admin/document-requirements/<uuid:item_id>/` | [HrAdminDocumentRequirementRuleDetailView](../../backend/apps/common/api_views.py#L18459) | GET, PATCH; `documents.manage`, `documents.view` |
| `/api/v1/hr-admin/employee-documents/` | [HrAdminEmployeeDocumentListView](../../backend/apps/common/api_views.py#L18487) | GET, POST; `documents.manage`, `documents.view` |
| `/api/v1/hr-admin/employee-documents/reminders/` | [HrAdminEmployeeDocumentReminderActionView](../../backend/apps/common/api_views.py#L18620) | POST; `documents.manage` |
| `/api/v1/hr-admin/employee-documents/<uuid:item_id>/download/` | [HrAdminEmployeeDocumentDownloadView](../../backend/apps/common/api_views.py#L18599) | GET; `documents.export` |
| `/api/v1/hr-admin/employee-documents/<uuid:item_id>/` | [HrAdminEmployeeDocumentDetailView](../../backend/apps/common/api_views.py#L18573) | GET, PATCH; `documents.verify`, `documents.view` |
| `/api/v1/hr-admin/generated-letters/preview/` | [HrAdminGeneratedLetterPreviewView](../../backend/apps/common/api_views.py#L18648) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/generated-letters/` | [HrAdminGeneratedLetterListCreateView](../../backend/apps/common/api_views.py#L18659) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/generated-letters/<uuid:item_id>/download/` | [HrAdminGeneratedLetterDownloadView](../../backend/apps/common/api_views.py#L18729) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/generated-letters/<uuid:item_id>/` | [HrAdminGeneratedLetterDetailView](../../backend/apps/common/api_views.py#L18718) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/lifecycle-options/` | [HrAdminLifecycleOptionsView](../../backend/apps/common/api_views.py#L18747) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/lifecycle-queue/` | [HrAdminLifecycleQueueView](../../backend/apps/common/api_views.py#L18799) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/onboardings/` | [HrAdminOnboardingListCreateView](../../backend/apps/common/api_views.py#L18964) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/onboardings/<uuid:item_id>/` | [HrAdminOnboardingDetailView](../../backend/apps/common/api_views.py#L19027) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/probation-reviews/` | [HrAdminProbationReviewListCreateView](../../backend/apps/common/api_views.py#L19051) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/probation-reviews/<uuid:item_id>/` | [HrAdminProbationReviewDetailView](../../backend/apps/common/api_views.py#L19113) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/movements/` | [HrAdminMovementListCreateView](../../backend/apps/common/api_views.py#L19145) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/employment-history/classification/` | [HrAdminEmploymentHistoryClassificationView](../../backend/apps/common/api_views.py#L19137) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/movements/<uuid:item_id>/` | [HrAdminMovementDetailView](../../backend/apps/common/api_views.py#L19242) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/exits/` | [HrAdminExitListCreateView](../../backend/apps/common/api_views.py#L19288) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/exits/<uuid:item_id>/` | [HrAdminExitDetailView](../../backend/apps/common/api_views.py#L19350) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-options/` | [HrAdminNotificationOptionsView](../../backend/apps/common/api_views.py#L19374) | GET; `attendance.regularization.decision_ready`, `attendance.regularization.submitted`, `documents.employee.expiry_attention`, `documents.employee.reupload_requested`, `documents.employee.upload_submitted`, `leave.request.decision_ready`, `leave.request.submitted`, `lifecycle.exit.clearance_pending`, `lifecycle.onboarding.attention_required` |
| `/api/v1/hr-admin/notification-channel-configs/` | [HrAdminNotificationChannelConfigurationListCreateView](../../backend/apps/common/api_views.py#L19814) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-channel-configs/<uuid:item_id>/` | [HrAdminNotificationChannelConfigurationDetailView](../../backend/apps/common/api_views.py#L19841) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-templates/preview/` | [HrAdminNotificationTemplatePreviewView](../../backend/apps/common/api_views.py#L19914) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-templates/test-send/` | [HrAdminNotificationTemplateTestSendView](../../backend/apps/common/api_views.py#L19940) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-templates/` | [HrAdminNotificationTemplateListCreateView](../../backend/apps/common/api_views.py#L19872) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-templates/<uuid:item_id>/` | [HrAdminNotificationTemplateDetailView](../../backend/apps/common/api_views.py#L19891) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-events/preview/` | [HrAdminNotificationEventPreviewView](../../backend/apps/common/api_views.py#L20000) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-events/test-send/` | [HrAdminNotificationEventTestSendView](../../backend/apps/common/api_views.py#L20015) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-events/` | [HrAdminNotificationEventDefinitionListCreateView](../../backend/apps/common/api_views.py#L19980) | GET, POST; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-diagnostics/` | [HrAdminNotificationDiagnosticsView](../../backend/apps/common/api_views.py#L20065) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/notification-events/<uuid:item_id>/` | [HrAdminNotificationEventDefinitionDetailView](../../backend/apps/common/api_views.py#L20041) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/notifications/` | [HrAdminNotificationListView](../../backend/apps/common/api_views.py#L20246) | GET; context/service guards; inspect source |
| `/api/v1/hr-admin/notifications/bulk-retry/` | [HrAdminNotificationBulkRetryView](../../backend/apps/common/api_views.py#L20366) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/notifications/<uuid:item_id>/` | [HrAdminNotificationDetailView](../../backend/apps/common/api_views.py#L20320) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/hr-admin/notifications/<uuid:item_id>/retry/` | [HrAdminNotificationRetryView](../../backend/apps/common/api_views.py#L20344) | POST; context/service guards; inspect source |
| `/api/v1/hr-admin/employees/access/options/` | [HrAdminEmployeeAccessOptionsView](../../backend/apps/common/api_views.py#L15569) | GET; `employees.access.manage` |
| `/api/v1/hr-admin/employees/options/` | [HrAdminEmployeeFormOptionsView](../../backend/apps/common/api_views.py#L15559) | GET; `employees.view` |
| `/api/v1/hr-admin/employees/option-search/` | [HrAdminEmployeeOptionSearchView](../../backend/apps/common/api_views.py#L15418) | GET; `attendance.view`, `employees.view`, `leave.view` |
| `/api/v1/hr-admin/employees/` | [HrAdminEmployeeListView](../../backend/apps/common/api_views.py#L15375) | GET, POST; `employees.create`, `employees.view` |
| `/api/v1/hr-admin/employees/<uuid:employee_id>/access/` | [HrAdminEmployeeAccessDetailView](../../backend/apps/common/api_views.py#L15579) | GET, POST, PATCH; `employees.access.manage` |
| `/api/v1/hr-admin/employees/<uuid:employee_id>/bank-accounts/` | [HrAdminEmployeeBankAccountListCreateView](../../backend/apps/common/api_views.py#L15492) | GET, POST; `employees.edit`, `employees.view` |
| `/api/v1/hr-admin/employees/<uuid:employee_id>/bank-accounts/<uuid:item_id>/` | [HrAdminEmployeeBankAccountDetailView](../../backend/apps/common/api_views.py#L15530) | PATCH; `employees.edit` |
| `/api/v1/hr-admin/employees/<uuid:employee_id>/` | [HrAdminEmployeeDetailView](../../backend/apps/common/api_views.py#L15449) | GET, PATCH; `employees.edit`, `employees.view` |
| `/api/v1/hr-admin/organization/options/` | [HrAdminOrganizationFormOptionsView](../../backend/apps/common/api_views.py#L15638) | GET; `organization.view` |
| `/api/v1/hr-admin/organization/import/` | [HrAdminOrganizationImportView](../../backend/apps/common/api_views.py#L15661) | POST; `organization.manage` |
| `/api/v1/hr-admin/organization/<slug:section>/` | [HrAdminOrganizationSectionListCreateView](../../backend/apps/common/api_views.py#L15648) | POST; `organization.manage` |
| `/api/v1/hr-admin/organization/<slug:section>/<uuid:item_id>/` | [HrAdminOrganizationSectionDetailView](../../backend/apps/common/api_views.py#L15673) | GET, PATCH; `organization.manage`, `organization.view` |
| `/api/v1/hr-admin/organization/` | [HrAdminOrganizationSnapshotView](../../backend/apps/common/api_views.py#L15628) | GET; `organization.view` |
| `/api/v1/me/profile/` | [MeProfileView](../../backend/apps/common/api_views.py#L6736) | GET; context/service guards; inspect source |
| `/api/v1/me/leave-summary/` | [MeLeaveSummaryView](../../backend/apps/common/api_views.py#L6823) | GET; context/service guards; inspect source |
| `/api/v1/me/leave-types/` | [MeLeaveTypeListView](../../backend/apps/common/api_views.py#L6832) | GET; context/service guards; inspect source |
| `/api/v1/me/attendance-summary/` | [MeAttendanceSummaryView](../../backend/apps/common/api_views.py#L6866) | GET; context/service guards; inspect source |
| `/api/v1/me/attendance-records/` | [MeAttendanceRecordListView](../../backend/apps/common/api_views.py#L6875) | GET; context/service guards; inspect source |
| `/api/v1/me/dashboard/` | [MeDashboardView](../../backend/apps/common/api_views.py#L6904) | GET; context/service guards; inspect source |
| `/api/v1/me/document-center/` | [MeDocumentCenterView](../../backend/apps/common/api_views.py#L6998) | GET; context/service guards; inspect source |
| `/api/v1/me/notifications/` | [MeNotificationListView](../../backend/apps/common/api_views.py#L20395) | GET; context/service guards; inspect source |
| `/api/v1/me/notifications/<uuid:item_id>/` | [MeNotificationDetailView](../../backend/apps/common/api_views.py#L20416) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/me/employee-documents/` | [MeEmployeeDocumentListCreateView](../../backend/apps/common/api_views.py#L7007) | POST; context/service guards; inspect source |
| `/api/v1/me/employee-documents/<uuid:item_id>/download/` | [MeEmployeeDocumentDownloadView](../../backend/apps/common/api_views.py#L7024) | GET; context/service guards; inspect source |
| `/api/v1/me/statutory-declarations/` | [MeStatutoryDeclarationListView](../../backend/apps/common/api_views.py#L7475) | GET, POST; context/service guards; inspect source |
| `/api/v1/me/statutory-declarations/<uuid:item_id>/` | [MeStatutoryDeclarationDetailView](../../backend/apps/common/api_views.py#L7500) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/me/statutory-declarations/<uuid:item_id>/items/` | [MeStatutoryDeclarationItemListCreateView](../../backend/apps/common/api_views.py#L7583) | GET, POST; context/service guards; inspect source |
| `/api/v1/me/statutory-declarations/<uuid:item_id>/proof-upload/` | [MeStatutoryDeclarationProofUploadView](../../backend/apps/common/api_views.py#L7553) | POST; context/service guards; inspect source |
| `/api/v1/me/statutory-declarations/<uuid:item_id>/submit/` | [MeStatutoryDeclarationSubmitView](../../backend/apps/common/api_views.py#L7534) | POST; context/service guards; inspect source |
| `/api/v1/me/statutory-declaration-items/<uuid:item_id>/` | [MeStatutoryDeclarationItemDetailView](../../backend/apps/common/api_views.py#L7614) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/me/payroll-payslips/` | [MePayrollPayslipListView](../../backend/apps/common/api_views.py#L7749) | GET; context/service guards; inspect source |
| `/api/v1/me/payroll-payslips/<uuid:item_id>/download/` | [MePayrollPayslipDownloadView](../../backend/apps/common/api_views.py#L7758) | GET; context/service guards; inspect source |
| `/api/v1/me/payroll-payslips/<uuid:item_id>/read/` | [MePayrollPayslipReadView](../../backend/apps/common/api_views.py#L7815) | POST; context/service guards; inspect source |
| `/api/v1/me/payroll-payslips/<uuid:item_id>/signed-access/` | [MePayrollPayslipSignedAccessIssueView](../../backend/apps/common/api_views.py#L7863) | POST; context/service guards; inspect source |
| `/api/v1/me/leave-requests/` | [MeLeaveRequestListCreateView](../../backend/apps/common/api_views.py#L20487) | GET, POST; context/service guards; inspect source |
| `/api/v1/me/leave-requests/<uuid:request_id>/` | [MeLeaveRequestDetailView](../../backend/apps/common/api_views.py#L20561) | GET; context/service guards; inspect source |
| `/api/v1/me/leave-requests/<uuid:request_id>/attachments/<uuid:artifact_id>/download/` | [MeLeaveRequestAttachmentDownloadView](../../backend/apps/common/api_views.py#L20733) | GET; context/service guards; inspect source |
| `/api/v1/me/leave-requests/<uuid:request_id>/withdraw/` | [MeLeaveRequestWithdrawView](../../backend/apps/common/api_views.py#L20572) | POST; context/service guards; inspect source |
| `/api/v1/me/leave-requests/<uuid:request_id>/cancel/` | [MeLeaveRequestCancelView](../../backend/apps/common/api_views.py#L20612) | POST; context/service guards; inspect source |
| `/api/v1/me/attendance-regularizations/` | [MeAttendanceRegularizationListCreateView](../../backend/apps/common/api_views.py#L20750) | GET, POST; context/service guards; inspect source |
| `/api/v1/me/attendance-regularizations/<uuid:regularization_id>/` | [MeAttendanceRegularizationDetailView](../../backend/apps/common/api_views.py#L20809) | GET; context/service guards; inspect source |
| `/api/v1/manager/team-summary/` | [ManagerTeamSummaryView](../../backend/apps/common/api_views.py#L7909) | GET; context/service guards; inspect source |
| `/api/v1/manager/notifications/` | [ManagerNotificationListView](../../backend/apps/common/api_views.py#L20441) | GET; context/service guards; inspect source |
| `/api/v1/manager/notifications/<uuid:item_id>/` | [ManagerNotificationDetailView](../../backend/apps/common/api_views.py#L20462) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/manager/leave-requests/pending/` | [ManagerPendingLeaveRequestListView](../../backend/apps/common/api_views.py#L20862) | GET; `leave.view` |
| `/api/v1/manager/leave-requests/<uuid:request_id>/` | [ManagerLeaveRequestDetailView](../../backend/apps/common/api_views.py#L20874) | GET; `leave.view` |
| `/api/v1/manager/leave-requests/<uuid:request_id>/attachments/<uuid:artifact_id>/download/` | [ManagerLeaveRequestAttachmentDownloadView](../../backend/apps/common/api_views.py#L20886) | GET; `leave.view` |
| `/api/v1/manager/leave-requests/<uuid:request_id>/approve/` | [ManagerLeaveRequestApproveView](../../backend/apps/common/api_views.py#L20908) | POST; `leave.requests.approve` |
| `/api/v1/manager/leave-requests/<uuid:request_id>/reject/` | [ManagerLeaveRequestRejectView](../../backend/apps/common/api_views.py#L20929) | POST; `leave.requests.approve` |
| `/api/v1/manager/attendance-regularizations/pending/` | [ManagerPendingAttendanceRegularizationListView](../../backend/apps/common/api_views.py#L20971) | GET; `attendance.view` |
| `/api/v1/manager/attendance-regularizations/<uuid:regularization_id>/` | [ManagerAttendanceRegularizationDetailView](../../backend/apps/common/api_views.py#L20983) | GET; `attendance.view` |
| `/api/v1/manager/attendance-regularizations/<uuid:regularization_id>/approve/` | [ManagerAttendanceRegularizationApproveView](../../backend/apps/common/api_views.py#L20950) | POST; `attendance.regularization.review` |
| `/api/v1/manager/attendance-regularizations/<uuid:regularization_id>/reject/` | [ManagerAttendanceRegularizationRejectView](../../backend/apps/common/api_views.py#L20995) | POST; `attendance.regularization.review` |

### [backend/apps/iam/api_urls.py](../../backend/apps/iam/api_urls.py) — 6 registrations

| API path | View / source | Own methods; literal permission hints |
|---|---|---|
| `/api/v1/auth/login/` | [LoginView](../../backend/apps/iam/api_views.py#L23) | POST; context/service guards; inspect source |
| `/api/v1/auth/password-reset/request/` | [PasswordResetRequestView](../../backend/apps/iam/api_views.py#L41) | POST; context/service guards; inspect source |
| `/api/v1/auth/password-reset/confirm/` | [PasswordResetConfirmView](../../backend/apps/iam/api_views.py#L57) | POST; context/service guards; inspect source |
| `/api/v1/auth/menu-catalog/` | [MenuCatalogView](../../backend/apps/iam/api_views.py#L85) | GET; context/service guards; inspect source |
| `/api/v1/auth/session/` | [SessionView](../../backend/apps/iam/api_views.py#L77) | GET; context/service guards; inspect source |
| `/api/v1/auth/logout/` | [LogoutView](../../backend/apps/iam/api_views.py#L115) | POST; context/service guards; inspect source |

### [backend/apps/tenant_onboarding/api_urls.py](../../backend/apps/tenant_onboarding/api_urls.py) — 33 registrations

| API path | View / source | Own methods; literal permission hints |
|---|---|---|
| `/api/v1/platform/data-governance/` | [PlatformRetentionWorkspaceView](../../backend/apps/common/retention_api.py#L115) | GET, POST; context/service guards; inspect source |
| `/api/v1/platform/data-governance/preview/` | [PlatformRetentionPreviewView](../../backend/apps/common/retention_api.py#L221) | POST; context/service guards; inspect source |
| `/api/v1/platform/data-governance/legal-holds/` | [PlatformLegalHoldView](../../backend/apps/common/retention_api.py#L160) | POST; context/service guards; inspect source |
| `/api/v1/platform/data-governance/legal-holds/<uuid:item_id>/release/` | [PlatformLegalHoldReleaseView](../../backend/apps/common/retention_api.py#L180) | POST; context/service guards; inspect source |
| `/api/v1/platform/data-governance/requests/<uuid:item_id>/actions/` | [PlatformGovernanceRequestActionView](../../backend/apps/common/retention_api.py#L195) | POST; context/service guards; inspect source |
| `/api/v1/platform/public-leads/` | [PublicTenantLeadCreateView](../../backend/apps/tenant_onboarding/api_views.py#L1606) | POST; context/service guards; inspect source |
| `/api/v1/platform/permission-catalog/` | [PlatformPermissionCatalogListView](../../backend/apps/tenant_onboarding/api_views.py#L1498) | GET; context/service guards; inspect source |
| `/api/v1/platform/permission-catalog/<str:permission_key>/` | [PlatformPermissionCatalogDetailView](../../backend/apps/tenant_onboarding/api_views.py#L1574) | PATCH; context/service guards; inspect source |
| `/api/v1/platform/launch-blueprints/` | [PlatformLaunchBlueprintListView](../../backend/apps/tenant_onboarding/api_views.py#L1515) | GET; context/service guards; inspect source |
| `/api/v1/platform/launch-blueprints/<str:blueprint_ref>/` | [PlatformLaunchBlueprintDetailView](../../backend/apps/tenant_onboarding/api_views.py#L1535) | GET; context/service guards; inspect source |
| `/api/v1/platform/summary/` | [PlatformSummaryView](../../backend/apps/tenant_onboarding/api_views.py#L1853) | GET; context/service guards; inspect source |
| `/api/v1/platform/leads/` | [PlatformPublicLeadListView](../../backend/apps/tenant_onboarding/api_views.py#L1631) | GET; context/service guards; inspect source |
| `/api/v1/platform/leads/<uuid:item_id>/` | [PlatformPublicLeadDetailView](../../backend/apps/tenant_onboarding/api_views.py#L1643) | PATCH; context/service guards; inspect source |
| `/api/v1/platform/leads/<uuid:item_id>/convert/` | [PlatformPublicLeadConvertView](../../backend/apps/tenant_onboarding/api_views.py#L1658) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/` | [PlatformTenantListCreateView](../../backend/apps/tenant_onboarding/api_views.py#L1789) | GET, POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/` | [PlatformTenantDetailView](../../backend/apps/tenant_onboarding/api_views.py#L1916) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/onboarding/` | [PlatformTenantOnboardingDetailView](../../backend/apps/tenant_onboarding/api_views.py#L1980) | GET, PATCH; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-runs/` | [PlatformTenantLaunchRunListView](../../backend/apps/tenant_onboarding/api_views.py#L2010) | GET; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-certification-report/` | [PlatformTenantLaunchCertificationReportView](../../backend/apps/tenant_onboarding/api_views.py#L2020) | GET; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-preview/` | [PlatformTenantLaunchPreviewView](../../backend/apps/tenant_onboarding/api_views.py#L2029) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-apply/` | [PlatformTenantLaunchApplyView](../../backend/apps/tenant_onboarding/api_views.py#L2150) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-drift-check/` | [PlatformTenantLaunchDriftCheckView](../../backend/apps/tenant_onboarding/api_views.py#L2379) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-repair-preview/` | [PlatformTenantLaunchRepairPreviewView](../../backend/apps/tenant_onboarding/api_views.py#L2471) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-repair-apply/` | [PlatformTenantLaunchRepairApplyView](../../backend/apps/tenant_onboarding/api_views.py#L2556) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-upgrade-compare/` | [PlatformTenantLaunchUpgradeCompareView](../../backend/apps/tenant_onboarding/api_views.py#L2768) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-upgrade-apply/` | [PlatformTenantLaunchUpgradeApplyView](../../backend/apps/tenant_onboarding/api_views.py#L2859) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/launch-handoff/` | [PlatformTenantLaunchHandoffView](../../backend/apps/tenant_onboarding/api_views.py#L3102) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/admin-contacts/` | [PlatformTenantAdminContactCreateView](../../backend/apps/tenant_onboarding/api_views.py#L3160) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/onboarding/mark-baseline-published/` | [PlatformTenantMarkBaselinePublishedView](../../backend/apps/tenant_onboarding/api_views.py#L3249) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/onboarding/mark-handoff-ready/` | [PlatformTenantMarkHandoffReadyView](../../backend/apps/tenant_onboarding/api_views.py#L3276) | POST; context/service guards; inspect source |
| `/api/v1/platform/tenants/<uuid:item_id>/onboarding/activate/` | [PlatformTenantActivateView](../../backend/apps/tenant_onboarding/api_views.py#L3320) | POST; context/service guards; inspect source |
| `/api/v1/platform/admin-contacts/<uuid:contact_id>/` | [PlatformAdminContactDetailView](../../backend/apps/tenant_onboarding/api_views.py#L3190) | PATCH; context/service guards; inspect source |
| `/api/v1/platform/admin-contacts/<uuid:contact_id>/provision-user/` | [PlatformAdminContactProvisionView](../../backend/apps/tenant_onboarding/api_views.py#L3216) | POST; context/service guards; inspect source |

### [backend/apps/platform_policies/api_urls.py](../../backend/apps/platform_policies/api_urls.py) — 9 registrations

| API path | View / source | Own methods; literal permission hints |
|---|---|---|
| `/api/v1/platform-policy-packs/` | [PlatformPolicyPackListCreateView](../../backend/apps/platform_policies/api_views.py#L98) | GET, POST; context/service guards; inspect source |
| `/api/v1/platform-policy-packs/<uuid:item_id>/items/` | [PlatformPolicyPackItemCreateView](../../backend/apps/platform_policies/api_views.py#L147) | POST; context/service guards; inspect source |
| `/api/v1/platform-policy-packs/<uuid:item_id>/items/<uuid:policy_item_id>/` | [PlatformPolicyPackItemDetailView](../../backend/apps/platform_policies/api_views.py#L164) | PATCH, DELETE; context/service guards; inspect source |
| `/api/v1/platform-policy-packs/<uuid:item_id>/clone-version/` | [PlatformPolicyPackCloneVersionView](../../backend/apps/platform_policies/api_views.py#L133) | POST; context/service guards; inspect source |
| `/api/v1/platform-policy-packs/<uuid:item_id>/adoption-preview/` | [PlatformPolicyPackAdoptionPreviewView](../../backend/apps/platform_policies/api_views.py#L228) | POST; context/service guards; inspect source |
| `/api/v1/platform-policy-packs/<uuid:item_id>/upgrade-compare/` | [PlatformPolicyPackUpgradeCompareView](../../backend/apps/platform_policies/api_views.py#L244) | POST; context/service guards; inspect source |
| `/api/v1/platform-policy-packs/<uuid:item_id>/upgrade-apply/` | [PlatformPolicyPackUpgradeApplyView](../../backend/apps/platform_policies/api_views.py#L257) | POST; context/service guards; inspect source |
| `/api/v1/platform-policy-packs/<uuid:item_id>/publish/` | [PlatformPolicyPackPublishView](../../backend/apps/platform_policies/api_views.py#L117) | POST; context/service guards; inspect source |
| `/api/v1/platform-policy-packs/<uuid:item_id>/adopt-for-tenant/` | [PlatformPolicyPackAdoptForTenantView](../../backend/apps/platform_policies/api_views.py#L194) | POST; context/service guards; inspect source |

## Reusable component and permission sources

- Shells: `web/src/components/shell/workspace-chrome.tsx`, `hr-admin-chrome.tsx`, `workspace-navigation-feedback.tsx`.
- Patterns: `workspace-standard.tsx` (header/panel/filter/table/badge/footer), `page-intro.tsx`, `form-section.tsx`, `pagination-bar.tsx`, `action-menu.tsx`, `hr-admin-action-modal.tsx`, `employee-search-select.tsx`, `async-action-button.tsx`, `async-download-button.tsx`, `workspace-loading.tsx`, `workspace-error-state.tsx`, `action-toast.tsx`, `upload-progress.tsx`, notification patterns.
- Mutation/navigation helpers: `web/src/lib/ui/json-mutation.ts`, `mutation-idempotency.ts`, `navigation.ts`, `validation.ts`, `use-refresh-after-mutation.ts`, upload/import helpers.
- Tenant RBAC catalog: `backend/apps/iam/permission_catalog.py`; explicit role permissions and default fallback resolution: `permission_checks.py`; workspace eligibility: `api_serializers.py` and session view. Catalog defaults are not a live tenant policy snapshot.
- Frontend access: `web/src/lib/workspace-access.ts`, `api-route-permissions.ts`, `ui/menu-catalog.ts`; backend: `EmployeeContextMixin`, `HrAdminContextMixin`, manager decision scope in `backend/apps/common/api_views.py`, and platform/tenant view-specific guards.

## Open decisions and completion rules

| Decision | Required owner/evidence | Treatment until resolved |
|---|---|---|
| Which profile fields may be self-disclosed/edited/requested? | HR product, tenant policy and security field register | Current GET projection only; no master-field write or request button. |
| Which document operations are enabled for the target release? | Signed launch manifest and protected-storage evidence | Keep exclusion enforced; UI presence in source is not approval. |
| Holiday applicability and completeness requirements | Time policy owner; approved effective selector / required-field register | Omit new holiday/completeness outputs. |
| Employee-facing skills, directory, announcements | Product scope, privacy and actual APIs | Absent initially; no synthetic cards. |
| How will profile changes be reviewed/applied? | Approved field routing, effective-date and conflict rules; reviewed schema | No request workflow implementation in UX-0 or automatic next phase. |
| Are current whitespace/contrast/device issues reproducible? | Local authenticated viewport evidence using synthetic fixtures | Source-level findings stay provisional until measured. |

A module moves from Planned to Implemented only after code review, and to Verified only with scoped browser/API/RBAC evidence. Record commit, fixtures, tested routes, excluded cases and evidence links. No module-level UI status can change a frozen launch-gate decision. UX-0 is complete as a design/documentation deliverable; all implementation remains pending an explicit request.
