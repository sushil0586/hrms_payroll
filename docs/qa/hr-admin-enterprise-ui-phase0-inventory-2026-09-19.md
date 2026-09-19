# HR Admin Enterprise UI Phase 0 Inventory

Date: 2026-09-19  
Parent plan: `docs/qa/hr-admin-enterprise-ui-phase-plan-2026-09-19.md`  
Approved design baseline: `docs/qa/hr-admin-enterprise-ui-prototype-2026-09-19.html`

## Phase 0 Result

Phase 0 has mapped the HR Admin surface into implementation groups and page templates. The surface is broad and should not be redesigned as one giant screen. It needs a controlled rollout by page family.

Current route scan found:

- 120+ HR Admin `page.tsx` routes.
- 7 current navigation buckets across Workspace, Operations, and Governance.
- Multiple dynamic create/edit/review routes that should become drawers/modals where practical.
- Several SaaS/platform-style pages currently exposed under HR Admin that need ownership review before visual investment.

## Approved Page Templates

| Template | Use For | HR Admin Examples |
| --- | --- | --- |
| Control Center | Summary, priorities, routing | `/hr-admin`, selected operational overview pages |
| Workbench | Search, filter, inspect, scoped action | Employees, attendance records, documents, imports, reports |
| Guided Flow | Step-based operating process | Payroll close, onboarding, launch remediation |
| Configuration | Focused setup CRUD | Policies, organization masters, payroll setup, statutory setup |
| Queue/Review | Review, approve, reject, return | Regularizations, employee documents, notifications, lifecycle approvals |
| Evidence/Report | Inspect, filter, export, trace | Audit, report pages, export audits, filing reports |

## Inventory By Product Area

### Command

| Route | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin` | Daily HR command center | Control Center | 2 | Approved prototype target: People Operations Control Center. |
| `/hr-admin/launch-remediation` | Launch readiness blockers and remediation actions | Guided Flow | 8 | Confirm whether this remains HR Admin-facing or internal-only. |

### Workforce

| Route Family | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin/employees` | Employee master search, filters, details, access handoff | Workbench | 3 | Approved prototype target: Employee Directory Workbench. |
| `/hr-admin/employees/new` | Add employee | Configuration/Drawer | 3 | Prefer drawer/modal from directory when safe. |
| `/hr-admin/employees/[employeeId]/edit` | Edit employee profile | Configuration/Drawer | 3 | Keep direct URL available. |
| `/hr-admin/employees/[employeeId]/access` | Manage employee login/access | Configuration/Drawer | 3 | Must be visibly separate from tenant-admin user governance. |
| `/hr-admin/employees/[employeeId]/bank-accounts` | Employee bank account readiness | Configuration | 3 | Payroll readiness dependency. |
| `/hr-admin/lifecycle` | Joiner/mover/exit queue and lifecycle status | Queue/Review | 5 | Should not duplicate Employee Directory. |
| `/hr-admin/onboardings` + new/edit | Employee onboarding records | Guided Flow/Configuration | 5 | Could be a tab/workspace under Lifecycle. |
| `/hr-admin/movements` + new/edit | Employee movements | Queue/Review/Configuration | 5 | Keep effective date and payroll impact visible. |
| `/hr-admin/exits` + new/edit | Exit and settlement queue | Queue/Review/Configuration | 5 | Should link to payroll settlement and F&F evidence. |
| `/hr-admin/probation-reviews` + new/edit | Probation review queue | Queue/Review | 5 | Good candidate for queue template. |

### Documents

| Route Family | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin/documents` | Document control overview | Control Center/Workbench | 5 | Clarify whether it is summary or actual document workspace. |
| `/hr-admin/employee-documents` + new/review | Upload/review employee documents | Queue/Review | 5 | Review actions should stay queue-first. |
| `/hr-admin/document-categories` + new/edit | Document category master | Configuration | 5 | Setup page. |
| `/hr-admin/document-requirements` + new/edit | Required document rules | Configuration | 5 | Should show impacted employee groups. |
| `/hr-admin/generated-letters` | Generated letters workspace | Workbench/Evidence | 5 | Needs route purpose validation: generation vs audit/export. |

### Time And Attendance

| Route Family | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin/attendance-operations` | Attendance operational overview | Control Center/Workbench | 5 | Candidate for compact time operations dashboard. |
| `/hr-admin/attendance-records` + edit | Attendance record maintenance | Workbench/Configuration | 5 | Bulk manager should remain clear and permission-gated. |
| `/hr-admin/attendance-regularizations` + review | Regularization request review | Queue/Review | 5 | Review UX should be queue-first with detail drawer. |
| `/hr-admin/shifts` + new/edit | Shift master | Configuration | 5 | Setup page. |
| `/hr-admin/shift-roster-templates` + new/edit | Roster template setup/rollout | Configuration/Guided Flow | 5 | Rollout panel should expose affected population. |
| `/hr-admin/employee-shift-assignments` + new/edit | Assign shifts to employees | Configuration/Workbench | 5 | Assignment governance and effective dates are critical. |
| `/hr-admin/holiday-calendars` + new/edit | Holiday calendar setup | Configuration | 5 | Should show location/entity scope. |

### Leave

| Route Family | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin/leave-balances` | Balance operations and adjustments | Workbench | 5 | Needs clear separation between view, adjustment, and audit. |
| `/hr-admin/leave-types` + new/edit | Leave type master | Configuration | 5 | Setup page. |
| `/hr-admin/leave-policies` + new/edit | Leave policy setup | Configuration | 5 | Should show eligibility scope and effective dates. |
| `/hr-admin/leave-policy-assignments` + new/edit | Policy assignment | Configuration/Workbench | 5 | Assignment governance and impacted employees needed. |
| `/hr-admin/policies` | Policy hub | Control Center/Workbench | 5 | Could route to leave/attendance policies instead of doing too much. |
| `/hr-admin/policy-assignments` | Assignment hub | Workbench | 5 | Clarify overlap with specific assignment pages. |

### Organization And Workflow Setup

| Route Family | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin/organization` + dynamic new/edit | Organization masters | Configuration/Workbench | 5 | One master hub with focused detail drawers recommended. |
| `/hr-admin/workflows` | Workflow setup overview | Control Center/Workbench | 5 | Clarify if operational or setup-first. |
| `/hr-admin/workflow-templates` + new/edit | Workflow templates | Configuration | 5 | Setup page. |
| `/hr-admin/workflow-template-assignments` + new/edit | Workflow assignment | Configuration/Workbench | 5 | Should show module/entity scope. |

### Payroll

| Route | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin/payroll-readiness` | Source readiness and blocker closure | Guided Flow/Workbench | 4 | First payroll step. |
| `/hr-admin/payroll-inputs` | Payroll input ingestion/validation | Guided Flow/Workbench | 4 | Should share payroll journey rail. |
| `/hr-admin/payroll-calculations` | Calculation generation and status | Guided Flow | 4 | Must prevent out-of-order calculation. |
| `/hr-admin/payroll-review` | Exception review and approval | Queue/Review | 4 | Should expose exception owners and audit trail. |
| `/hr-admin/payroll-outputs` | Payslip/register outputs | Evidence/Report/Guided Flow | 4 | Output publication needs confirmation and RBAC. |
| `/hr-admin/payroll-handoff` | Finance handoff package | Guided Flow/Evidence | 4 | Must show handoff status and evidence. |
| `/hr-admin/payroll-adjustments` | Adjustment actions | Workbench/Configuration | 4 | Keep adjustment creation scoped and audited. |
| `/hr-admin/payroll-settlements` | Settlement actions | Queue/Review | 4 | Link to exit/F&F where relevant. |
| `/hr-admin/payroll-rules` | Payroll rules | Configuration | 4 | Setup page, not daily operations. |
| `/hr-admin/payroll-setup` | Payroll setup CRUD | Configuration | 4 | Consider moving deeper under setup. |
| `/hr-admin/salary-setup` | Salary setup CRUD | Configuration | 4 | Setup page. |

### Compliance, Statutory, Providers

| Route | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin/payroll-statutory` | Statutory setup and filing controls | Configuration/Evidence | 6 | May need split between setup and filing evidence. |
| `/hr-admin/payroll-providers` | Provider connection/certification/rehearsal | Guided Flow/Configuration | 6 | Provider state language must be very clear. |
| `/hr-admin/audit` | HR audit log | Evidence/Report | 6 | Should use structured detail, not raw JSON-first. |

### Reports And Insights

| Route Family | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin/reports` | Report catalog | Workbench | 7 | Good candidate for report catalog standard. |
| `/hr-admin/reports/workforce` | Workforce report | Evidence/Report | 7 | Standard report workspace. |
| `/hr-admin/reports/attendance-register` | Attendance register | Evidence/Report | 7 | Standard report workspace. |
| `/hr-admin/reports/attendance-exceptions` | Attendance exceptions | Evidence/Report | 7 | Link to regularization workflow. |
| `/hr-admin/reports/leave-balance` | Leave balance report | Evidence/Report | 7 | Link to leave balance operations. |
| `/hr-admin/reports/document-compliance` | Document compliance | Evidence/Report | 7 | Link to document review queue. |
| `/hr-admin/reports/lifecycle-queue` | Lifecycle queue report | Evidence/Report | 7 | Link to lifecycle queue. |
| `/hr-admin/reports/lifecycle-aging` | Lifecycle aging report | Evidence/Report | 7 | Standard report workspace. |
| `/hr-admin/reports/payroll-register` | Payroll register | Evidence/Report | 7 | Link to payroll outputs. |
| `/hr-admin/reports/salary-variance` | Salary variance | Evidence/Report | 7 | Link to payroll review. |
| `/hr-admin/reports/bank-advice` | Bank advice | Evidence/Report | 7 | Link to handoff/output evidence. |
| `/hr-admin/reports/statutory-deductions` | Statutory deductions | Evidence/Report | 7 | Link to statutory setup/filing. |
| `/hr-admin/reports/compliance` | Compliance report | Evidence/Report | 7 | Clarify overlap with compliance summary. |
| `/hr-admin/reports/compliance-summary` | Compliance summary | Evidence/Report | 7 | Standard report workspace. |
| `/hr-admin/reports/payroll-close-readiness` | Payroll close readiness | Evidence/Report | 7 | Link to payroll readiness. |
| `/hr-admin/reports/payroll-input-exceptions` | Payroll input exceptions | Evidence/Report | 7 | Link to payroll inputs. |
| `/hr-admin/reports/payroll-review-exceptions` | Payroll review exceptions | Evidence/Report | 7 | Link to payroll review. |
| `/hr-admin/reports/payroll-adjustments` | Payroll adjustments report | Evidence/Report | 7 | Link to payroll adjustments. |
| `/hr-admin/reports/payroll-settlements` | Payroll settlements report | Evidence/Report | 7 | Link to settlements. |
| `/hr-admin/reports/payslip-publication` | Payslip publication | Evidence/Report | 7 | Link to payroll outputs. |
| `/hr-admin/reports/finance-handoff-exceptions` | Finance handoff exceptions | Evidence/Report | 7 | Link to handoff. |
| `/hr-admin/reports/export-audits` | Export audit evidence | Evidence/Report | 7 | Security-sensitive export proof. |
| `/hr-admin/reports/pf-ecr-readiness` | PF readiness | Evidence/Report | 7 | Compliance evidence. |
| `/hr-admin/reports/esic-contribution-readiness` | ESIC readiness | Evidence/Report | 7 | Compliance evidence. |
| `/hr-admin/reports/professional-tax-readiness` | PT readiness | Evidence/Report | 7 | Compliance evidence. |
| `/hr-admin/reports/lwf-readiness` | LWF readiness | Evidence/Report | 7 | Compliance evidence. |
| `/hr-admin/reports/tds-efile-readiness` | TDS e-file readiness | Evidence/Report | 7 | Compliance evidence. |
| `/hr-admin/reports/challan-reconciliation` | Challan reconciliation | Evidence/Report | 7 | Compliance evidence. |
| `/hr-admin/reports/statutory-filing-status` | Filing status | Evidence/Report | 7 | Compliance evidence. |
| `/hr-admin/reports/provider-filing-receipts` | Provider receipts | Evidence/Report | 7 | Provider evidence. |

### Notifications And Imports

| Route Family | Intended Function | Template | Phase | Notes |
| --- | --- | --- | --- | --- |
| `/hr-admin/notifications-admin` | Notification administration overview | Control Center/Workbench | 8 | Clarify whether HR Admin owns templates/events. |
| `/hr-admin/notifications` + review | Notification queue/retry/review | Queue/Review | 8 | Delivery troubleshooting should be scoped. |
| `/hr-admin/notification-delivery` | Delivery management | Workbench/Evidence | 8 | Operational page; keep concise. |
| `/hr-admin/notification-diagnostics` | Diagnostics | Evidence/Report | 8 | Internal-facing language may be needed. |
| `/hr-admin/notification-events` + new/edit | Notification events | Configuration | 8 | Likely tenant/platform setup. Confirm HR ownership. |
| `/hr-admin/notification-templates` + new/edit | Notification templates | Configuration | 8 | HR-owned templates should be clearly scoped. |
| `/hr-admin/import-history` | Import batches and audit | Evidence/Report | 8 | Should link to Employee/Organization import workflows. |

### SaaS/Platform-Like Operations Under HR Admin

| Route | Current Concern | Recommendation | Phase |
| --- | --- | --- | --- |
| `/hr-admin/saas-control-plane` | Looks more Tenant/Platform Admin than HR Admin. | Confirm ownership before redesign. | 8 |
| `/hr-admin/saas-operations` | Operational health may be internal/admin-only. | Gate or move if not HR Admin-facing. | 8 |
| `/hr-admin/saas-resilience` | Backup/retention is likely platform/tenant admin. | Confirm visibility. | 8 |
| `/hr-admin/saas-sla-operations` | SLA incident posture may be platform/internal. | Confirm visibility. | 8 |

## Current Navigation Gap

Current navigation exposes:

- Overview
- People
- Lifecycle
- Documents
- Reports
- Payroll
- Statutory
- Providers
- Attendance
- Notifications
- Launch
- SaaS
- Ops Health
- Resilience
- SLA Ops
- Organization
- Policies
- Workflows

Recommended navigation should become:

- Command
  - Dashboard
  - Launch Readiness
- Workforce
  - Employees
  - Lifecycle
  - Documents
- Time & Leave
  - Attendance
  - Leave
  - Policies
- Payroll
  - Payroll Control
  - Inputs
  - Calculation
  - Review
  - Outputs
  - Handoff
- Compliance
  - Statutory
  - Providers
  - Audit
- Insights
  - Reports
- Operations
  - Notifications
  - Imports
  - Approved HR-facing operational health pages only

## Pages Requiring Product Clarification

| Area | Question | Suggested Default |
| --- | --- | --- |
| SaaS control pages | Should HR Admin see tenant plan/SLA/resilience controls? | Hide or move unless HR Admin has a real task. |
| Employee access | Should access be managed by HR Admin, Tenant Admin, or both? | HR Admin can request/manage employee access; Tenant Admin owns tenant admin/admin roles. |
| Payroll routes | One consolidated payroll control route or shared stepper across existing routes? | Keep existing routes; add shared journey stepper. |
| Notifications | Are templates/events HR-owned or platform-owned? | HR owns employee-facing templates only; platform owns system-level templates. |
| Documents | Is `/documents` a summary page or the primary document workspace? | Make it a summary hub linking to employee documents and setup. |
| Policies | Should `/policies` edit policies or route to policy families? | Make it a hub; detailed setup stays in leave/attendance pages. |
| Reports | Which reports require export/download for launch? | Standardize export where already supported; document gaps. |

## Overloaded Or High-Risk Areas

| Area | Risk | Phase Handling |
| --- | --- | --- |
| Employees | Directory, import, access, bank readiness, edit workflows are dense. | Phase 3, workbench plus drawers. |
| Payroll | Many routes represent one journey but can feel disconnected. | Phase 4, shared payroll stepper. |
| Reports | Many reports with likely inconsistent density and filter behavior. | Phase 7, report standard. |
| Policies/Assignments | Multiple setup and assignment pages can confuse users. | Phase 5, setup vs assignment separation. |
| SaaS Ops under HR Admin | Ownership mismatch risk. | Phase 8, product decision before redesign. |

## Phase 0 Decisions

- The approved prototype is now the source of truth for HR Admin visual direction.
- Phase 1 should start with shell/navigation/tokens before page redesign.
- Phase 2 and Phase 3 should be implemented before payroll because they anchor the design language.
- Payroll should use a shared journey component across existing routes unless a later decision approves route consolidation.
- SaaS/platform-like HR Admin pages should not be visually polished until ownership is confirmed.

## Phase 0 Status

Status: Complete for planning.

Next phase: Phase 1 - Global Shell, Tokens, And Navigation.

