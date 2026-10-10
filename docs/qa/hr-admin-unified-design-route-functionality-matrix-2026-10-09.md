# HR Admin Unified Design Route Functionality Matrix

Date: 2026-10-09  
Purpose: browser automation inventory for verifying every HR Admin screen against the unified compact UI/UX model.

## Pass Model

Every screen must pass:

- Shell: HR Admin chrome, topbar, page shell, and one visible H1.
- Responsibility: page does one primary job only.
- Compact UX: slim typography, compact controls, no oversized headings, low-scroll layout where practical.
- Controls: visible buttons/links have real targets, usable dimensions, no clipped text.
- Filters/pagination: queue/report/list screens expose filters and pagination or an explicit small/empty state.
- Modal/drawer: quick view/update uses modal/drawer where practical; create/edit/deep audit/report pages can remain full page.
- Responsive: no horizontal overflow on desktop and mobile representative widths.
- Evidence: browser QA result recorded as Pass, Fail, Blocked, or Not applicable.

## Automation

Primary spec:

- `web/tests/e2e/hr-admin-unified-design-full-route-certification.spec.ts`

This spec discovers static HR Admin routes from `web/src/app/hr-admin/**/page.tsx`, classifies each screen, audits browser UI basics, and checks route-type expectations. Dynamic routes with `[itemId]`, `[employeeId]`, or `[section]` are tracked as patterns and need seeded sample IDs in E90-9/E90-10.

Latest execution:

- `2026-10-09`: `PLAYWRIGHT_PORT=3101 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-unified-design-full-route-certification.spec.ts --workers=1`
- Result: `Pass`, 11/11 tests, 116 static HR Admin pages discovered and audited in route groups.
- Scope: static pages passed shell, H1, navigation target, no app-error, no horizontal-overflow, visible-control usability, disclosure usability, and route-type operational-surface checks.

Dynamic record-backed execution:

- `2026-10-09`: `PLAYWRIGHT_PORT=3102 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3102 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-dynamic-route-ui-audit.spec.ts --workers=1 --reporter=line`
- Result: `Pass`, 8/8 tests.
- Scope: dynamic action pages were discovered from real HR Admin list pages, reduced to one representative real URL per dynamic page pattern, then audited with the same shell, heading, overflow, control, disclosure, and link-validity checks.
- Remaining scope: future data-specific QA should still exercise save/review mutations per module; this pass certifies the dynamic page UI/UX rendering model, not every possible record state.

Mutation QA companion:

- See `docs/qa/hr-admin-mutation-qa-matrix-2026-10-09.md` for the first browser mutation evidence pass covering policy/setup validation, employee bank-account create/update, and notification setup CRUD.

## Static Route Functionality Matrix

| Area | Screen family | Primary functionality | Required UX checks | Current evidence |
| --- | --- | --- | --- | --- |
| Command | `/hr-admin` | HR Admin dashboard, action queue, launch readiness, workspace shortcuts | compact shell, action cards, links, no overflow | E90-8G pass |
| Command | `/hr-admin/launch-remediation` | Launch blocker remediation queue and modal actions | compact shell, modal open/close, links, no overflow | E90-8G pass |
| Workforce | `/hr-admin/employees` | Employee directory, filters, selection, profile actions | queue filters, pagination, detail drilldown, no overflow | Needs full-route pass |
| Workforce | `/hr-admin/employees/new` | Create employee | full-page form, validation, compact sections | Needs full-route pass |
| Workforce | lifecycle/onboarding/movements/probation/exits queues | Employee lifecycle operations | queue filters, status/action controls, pagination | Needs full-route pass |
| Documents | document categories/requirements/employee documents/generated letters | Document setup, verification, generated artifacts | setup forms, queues, review links, no overflow | Needs full-route pass |
| Time & Leave | attendance operations/records/regularizations | Attendance control, records, correction queue | filters, pagination, action modals/review, no overflow | E90-8B pass |
| Time & Leave | leave requests/balances | Leave request queue and balance ledger/import | filters, pagination, import preview, no overflow | E90-8B pass |
| Shift & Roster | shifts/assignments/roster templates | Shift setup, assignment coverage, roster rollout/history | filters, pagination, rollout panel, no overflow | E90-8C pass |
| Policy & Setup | leave/attendance policies, types, assignments | Policy setup and governance | compact forms, governance panels, import preview | E90-8F pass |
| Payroll | inputs/calculations/review/adjustments/outputs/handoff/readiness | Payroll operations and evidence | compact panels, tables, pagination, detail evidence | E90-8D pass |
| Payroll Setup | payroll setup/salary setup/rules/statutory/providers/settlements | Payroll configuration and setup operations | compact tabs, forms, tables, pagination | Needs full-route pass |
| Reports | report catalog and report family pages | Report discovery, filters, export evidence | compact filters, tables, pagination, export/manifest | E90-8E pass |
| Notifications | notifications admin, queue, delivery, diagnostics, templates/events | Notification operations and diagnostics | queues, filters, retry/actions, no overflow | Needs full-route pass |
| Organization | organization setup/workflows/workflow templates/assignments | Organization and workflow setup | setup forms, filters, validation, no overflow | Needs full-route pass |
| SaaS Ops | saas operations/control/resilience/SLA | Operational health and control plane | compact dashboards, evidence links, no overflow | Needs full-route pass |
| Audit/Imports | audit, import history | Audit trail and import evidence | filters, pagination, evidence detail | Needs full-route pass |

Static route family status after latest execution: all listed static screen families above are covered by the full-route certification and marked `Pass` for the unified design model. Keep the family rows as planning inventory; use the latest execution block as the source of truth for the full static-pass evidence.

## Dynamic Route Patterns

These cannot be honestly marked Pass without live sample IDs. E90-9/E90-10 should bind each pattern to real records from the browser/API and audit them with the same model.

| Pattern | Primary functionality | Required sample source | Status |
| --- | --- | --- | --- |
| `/hr-admin/*/[itemId]/edit` | Edit existing setup/workflow/lifecycle records | First real edit link discovered from corresponding list page | Pass |
| `/hr-admin/*/[itemId]/review` | Review queue item or document/notification evidence | First real review link discovered from corresponding queue page | Pass |
| `/hr-admin/employees/[employeeId]/edit` | Edit employee profile | Employee directory action link | Pass |
| `/hr-admin/employees/[employeeId]/access` | Manage employee access | Employee directory action link | Pass |
| `/hr-admin/employees/[employeeId]/bank-accounts` | Manage bank accounts | Employee directory action link | Pass |
| `/hr-admin/organization/[section]/new` | Create organization record by section | Organization section action link | Pass |
| `/hr-admin/organization/[section]/[itemId]/edit` | Edit organization record by section | Organization section edit action link | Pass |

## Marking Rule

- A screen is `Pass` only when the browser automation reaches the page and all unified model checks pass.
- A screen is `Fail` when the page renders but violates the model.
- A screen is `Blocked` when the page requires sample data or permission that the test could not obtain.
- E90-9 should first run the static full-route certification, then add sample-bound dynamic audits.
