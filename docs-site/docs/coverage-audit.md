# Documentation coverage audit

This audit proves that the user guide covers each workspace menu, child screen family, and end-to-end operating workflow. Update it whenever a new menu item, tab, drilldown, or workflow is added.

## Current result

Status: **Covered**

- Menu catalog checked: 69 links.
- Sidebar pages checked: 52 links.
- Quick links checked: 17 links.
- Screenshot references checked: 52 screenshots.
- App route pages inventoried: 169.
- Child and utility route candidates checked: 83.
- Dynamic child route families checked: 0 uncovered.
- Build gate: `mkdocs build --strict`.

## Coverage rules

- Every sidebar menu item needs a named documentation page.
- Every quick link needs either a page guide or a troubleshooting/access guide.
- Every dynamic child page is covered by its parent feature guide unless the child has a distinct user workflow.
- Every major cross-module task needs an end-to-end workflow guide.
- Screenshots are optional, but when included they must be referenced from at least one guide.

## Workspace menu coverage

| Workspace | Menu area | Documentation |
| --- | --- | --- |
| Shared language | Statuses, workflow terms, workspaces, payroll phases, and common actions | Glossary and Status Guide |
| Platform Admin | Dashboard, leads, tenants, launch readiness, admin access, setup templates, permissions, audit logs | Platform Admin pages and task recipes |
| Tenant Admin | Dashboard, users, roles, plan, setup guide, support access, trust audit, settings, security | Tenant Admin pages, weekly checklist, access troubleshooting |
| HR Admin | Dashboard, launch readiness, employees, lifecycle, documents, attendance, leave, policies, reports, audit, workflows | HR Admin pages, daily checklist, workflow guides |
| Payroll | Payroll Control, Setup, Salary Setup, Rules, Inputs, Calculations, Review, Outputs, Handoff, Adjustments, Statutory, Providers | Payroll pages, monthly checklist, first payroll run, close-to-finance workflow |
| ESS | Overview, payslips, documents, tax declarations, notifications | ESS pages and task recipes |
| MSS | Control center, approvals, notifications, self service | MSS pages and task recipes |
| Finance Manager | Control center, payments, compliance, audit | Finance Manager pages and payroll-day checklist |

## Quick link coverage

| Quick link type | Covered by |
| --- | --- |
| Home and dashboard links | Workspace overview pages |
| ESS and MSS switch links | ESS/MSS overview and task recipes |
| Payroll and report shortcuts | Payroll Control, Reports, and Finance Manager guides |
| Login and switch-user links | Access troubleshooting and workspace roles guide |

## Child route coverage

| Child route family | Covered by |
| --- | --- |
| Employee create, edit, access, bank accounts | Employees guide, employee-to-payroll workflow, access troubleshooting |
| Organization create and edit drilldowns | Organization guide, employee-to-payroll workflow |
| Lifecycle onboarding, movement, exit, probation, letters | Lifecycle guide, HR Admin daily checklist |
| Leave types, leave policies, policy assignments, balances | Leave guide, Policies guide, leave-and-attendance workflow |
| Attendance policies, shifts, rosters, records, regularizations | Attendance guide, Policies guide, leave-and-attendance workflow |
| Document categories, requirements, uploads, reviews | Documents guide, documents-to-verification workflow, document troubleshooting |
| Notification admin, delivery, diagnostics, events, templates, review pages | Notifications guide, notification recovery workflow, notification troubleshooting |
| Workflow templates and assignments | Workflows guide |
| Payroll setup actions and tabs | Payroll Setup, Salary Setup, Payroll Rules, Statutory, Providers, Adjustments guides |
| Payroll run phases: readiness, inputs, calculations, review, outputs, handoff | Payroll module pages, first payroll run, monthly checklist, payroll close workflow |
| Reports drilldowns | Reports guide, Payroll guides, Finance Manager guides |
| SaaS operations, control plane, resilience, SLA pages | Ops Health guide, launch guides |
| Password reset and workspace access utility pages | Access troubleshooting |
| Support utility pages | Admin handoff and troubleshooting guides |

## End-to-end workflow coverage

| Workflow | User question answered |
| --- | --- |
| Practical Scenario Coverage | Are positive and negative real-world scenarios documented for new users? |
| Employee to Payroll | How does a new employee become payroll-ready? |
| Leave and Attendance to Payroll | How do time inputs affect payroll readiness? |
| Documents to Verification | How are employee documents reviewed and cleared? |
| Notification Failure to Recovery | How does HR recover failed email or in-app delivery? |
| Payroll Close to Finance Handoff | How does payroll move from readiness to payment evidence? |
| First Payroll Run | What should a new customer do for the first live payroll? |
| Admin Handoff | What should be completed before customer ownership? |
| Go-Live Checklist | What must be true before public launch? |

## Quality gate

Run this before marking documentation complete:

```bash
cd docs-site
../.venv/bin/python -m mkdocs build --strict
```

Then verify:

- No document is missing from navigation.
- No navigation target is missing.
- No screenshot reference is broken.
- No secret or credential appears in documentation.
- Every new menu route is mapped to a guide or workflow.
