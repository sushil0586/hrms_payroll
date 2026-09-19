# HR Admin Enterprise UI Direction

Date: 2026-09-19  
Status: Approved as the HR Admin enterprise UI baseline  
Goal: define a premium, sleek, user-friendly HR Admin experience before development begins.

## Approved Baseline

The approved design baseline is:

`docs/qa/hr-admin-enterprise-ui-prototype-2026-09-19.html`

All HR Admin redesign work should follow this prototype unless a later product decision explicitly changes the direction.

Baseline expectations:

- Premium enterprise SaaS look and feel.
- Sleek, compact, calm operational surfaces.
- Single-responsibility pages, not overloaded all-in-one screens.
- Clear work queues, tables, detail panels, drawers, and guided workflows.
- Existing routes, APIs, RBAC, validations, tenant isolation, and business rules must remain intact unless a phase explicitly changes them.

## Design Principle

HR Admin should feel like a focused people-operations command system, not a collection of admin pages. Each page must have one clear responsibility, one primary action, and a small number of supporting actions.

## Global Direction

- Dark navy sidebar, light workspace, white operational panels.
- Compact enterprise layout with dense but readable information.
- Blue primary action, neutral secondary actions, red only for destructive actions.
- No decorative gradients, oversized cards, or marketing-style hero sections.
- 8px radius maximum for cards/buttons unless already defined by system.
- Tables and queues should be the default for operational work.
- Drawers/modals should be used for add/edit/review where the user should not lose context.
- Every page must show: page context, page title, short description, one primary CTA, and clear status/ownership cues.
- Every disabled action must explain the required permission or prerequisite.
- Every destructive or compliance-sensitive action must confirm before submission.
- Every page must be usable at 1366px, 1440px, tablet width, and mobile where supported.

## Sidebar Information Architecture

Recommended groups:

| Group | Menus | Purpose |
| --- | --- | --- |
| Command | Dashboard, Launch Readiness | Daily HR command center and release blockers. |
| Workforce | Employees, Lifecycle, Documents | Employee master, onboarding, movement, exit, document queues. |
| Time & Leave | Attendance, Leave, Policies | Attendance operations, regularization, leave policy and balances. |
| Payroll | Payroll Control, Inputs, Calculation, Review, Outputs, Handoff | End-to-end payroll operating flow. |
| Compliance | Statutory, Providers, Audit | India statutory, payroll provider setup, audit evidence. |
| Insights | Reports | Report catalog and analytics workspaces. |
| Operations | Notifications, Imports, SaaS Ops | Delivery, import history, operational health. |

## Page Responsibility Rules

- Dashboard: summarize and route only. No complex editing.
- Employees: directory, employee detail, import, invite/access handoff, edit employee.
- Payroll Control: one stepper journey from readiness to handoff. No unrelated HR master edits.
- Reports: filter, inspect, export, open source workflow. No master-data mutation.
- Configuration pages: create/edit focused records only.
- Review queues: approve/reject/return/request-info only.
- Evidence pages: filter, export, trace source, open related workflow.

## Prototype Screens

Prototype file:

`docs/qa/hr-admin-enterprise-ui-prototype-2026-09-19.html`

It contains three proposed screens:

1. People Operations Control Center
2. Employee Directory Workbench
3. Payroll Cycle Control

These are not implementation files. They are design targets for discussion and alignment.

## Screen 1: People Operations Control Center

Intent:

- Daily command center for HR Admin.
- Should answer: what needs my attention today?

Must include:

- Workforce status cards.
- Payroll readiness signal.
- Action queue.
- Risk/exception panel.
- Launch blockers.
- Recently touched employees.
- Shortcuts to Employees, Attendance, Payroll, Reports.

Must not include:

- Employee edit forms.
- Payroll calculation details.
- Large report tables.

## Screen 2: Employee Directory Workbench

Intent:

- Search, filter, inspect, and manage employee records.
- Should be the HR Admin’s primary employee master workspace.

Must include:

- Search and filters.
- Employee table.
- Right-side detail drawer/panel.
- Status, access, manager, payroll readiness, document readiness.
- Primary action: Add Employee.
- Secondary actions: Import, Export, Manage Access.

Must not include:

- Full payroll run details.
- Large policy editors.
- Multiple unrelated setup forms.

## Screen 3: Payroll Cycle Control

Intent:

- Guide HR Admin through payroll close.
- Should make payroll status obvious and prevent wrong-step actions.

Must include:

- Payroll stepper: Readiness -> Inputs -> Calculation -> Review -> Outputs -> Handoff.
- Current run selector.
- Exception counts.
- Action queue.
- Selected run evidence.
- Primary action based on current step.

Must not include:

- Employee master editing.
- Provider setup editing unless linked out.
- Long report tables unrelated to the selected run.

## Initial Gap Assessment

| Area | Current Gap | Recommendation |
| --- | --- | --- |
| Dashboard | Good control-center foundation but needs cleaner hierarchy and less mixed visual weight. | Redesign as People Operations Control Center. |
| Employees | Strong functionality, but page is dense and can feel heavy. | Keep table/detail pattern, refine spacing, filters, right panel, and action hierarchy. |
| Payroll | Powerful but spread across many routes. | Add consistent payroll journey rail/stepper across payroll pages. |
| Reports | Feature-rich but visually dense. | Standard report workspace template with filter bar, KPI strip, table, export. |
| Forms | Mixed full-page patterns. | Use modal/drawer for common add/edit; keep full-page only for complex setup. |
| Permissions | Some disabled actions explain why; consistency needed. | Standard disabled-action help text. |

## Development Sequence

1. Approve visual direction from prototype.
2. Implement global HR Admin shell/sidebar refinements.
3. Redesign Dashboard.
4. Redesign Employees page.
5. Redesign Payroll Control pages.
6. Create reusable report workspace standard.
7. Apply standards page-by-page.
8. Run browser QA after each phase.

## Open Product Questions

- Should HR Admin dashboard include SaaS Ops cards, or should SaaS Ops remain Platform/Admin-only?
- Should Employee Access be managed from HR Admin Employees, Tenant Admin Users, or both with clear ownership?
- Should payroll flow have a single `/hr-admin/payroll-control` page, or should existing pages keep separate routes with a shared journey rail?
- Which reports require export in v1 versus only browser table review?
- Which actions must be hidden versus disabled for limited HR roles?
