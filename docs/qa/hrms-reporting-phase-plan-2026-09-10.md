# HRMS Reporting Phase Plan

Date: 2026-09-10

Purpose:

Build reporting as a SaaS-ready reporting layer, not as hardcoded screens. Every report must be configurable by tenant, protected by role and entitlement, paginated for large data, exportable with audit evidence, and certified through browser-based Playwright tests.

## Reporting Principles

- No hardcoded report logic in page components.
- Every report must be declared in a report catalog with key, title, owner role, data source, filters, columns, export formats, retention, and permission requirements.
- Every report must enforce tenant isolation at API, query, export, and drilldown levels.
- Every long list must support pagination, sorting, filtering, loading, empty, error, and permission-denied states.
- Every export must record requested by, tenant, filters, generated at, row count, checksum when applicable, and source snapshot when money/compliance data is involved.
- Every compliance report must keep statutory rules configurable by country, state, legal entity, effective date, component mapping, and provider profile.
- Every report page touched must be browser-certified at element level: sidebar entry, tabs, filters, dropdowns, text inputs, date ranges, search, pagination, sort, row action, drilldown, export, empty state, error state, responsive layout, and role denial.

## Development And Playwright Operating Model

Every reporting phase is a build-and-certify phase. A report is not considered complete when the UI renders; it is complete only when the Playwright automation proves the report works from the browser for the intended persona and fails safely for unauthorized personas.

Required workflow for each report:

1. Define the report contract in the report catalog.
2. Implement backend/API query behavior with tenant and permission filtering.
3. Implement the UI page using the shared report shell.
4. Seed or create test data through supported setup flows.
5. Add Playwright browser tests for the full report surface.
6. Run local browser certification.
7. Record evidence in this plan or a phase evidence document.
8. Repeat on staging before release sign-off.

Required Playwright coverage for every report page:

| Surface | Required Browser Coverage |
|---|---|
| Navigation | Sidebar category, report menu item, active state, direct URL access |
| Access control | Allowed role success, denied role block, entitlement disabled state, support-session scope where applicable |
| Filters | Every dropdown, text box, date range, checkbox/toggle, reset action, dependent filter narrowing |
| Table | Column headers, row rendering, sort, search, pagination, page size, empty state, overflow behavior |
| Summary | Cards/totals match filtered table or API contract |
| Drilldown | Row action opens correct detail, breadcrumb/back navigation works |
| Export | CSV/XLSX/PDF buttons where enabled, disabled state where not configured, export audit record |
| Data integrity | CRUD/source-data change is reflected in report, locked payroll data remains immutable |
| Tenant isolation | Tenant A data never appears for Tenant B, including search and export |
| UX quality | Desktop and mobile layout, no overlap, no clipped labels, keyboard focus order |
| Failure states | API error, no data, no permission, export failure, loading state |

Automation naming convention:

- Report specs should live under `web/tests/e2e/`.
- Use `*-report-flows.spec.ts` for normal report behavior.
- Use `*-report-certification.spec.ts` for launch-grade coverage of all controls and role boundaries.
- Evidence docs should live under `docs/qa/phaseR*-*.md`.

Definition of done for a report:

- Backend check passes.
- TypeScript passes.
- Relevant Playwright spec passes locally.
- For launch-grade reports, staging Playwright pass is recorded.
- Report has pagination if the data can exceed one screen.
- Report has export audit if export is enabled.
- No placeholder or demo fallback is used unless explicitly enabled for demo-only testing.

## Standard Report Contract

Each report should define:

| Area | Required Contract |
|---|---|
| Identity | `report_key`, display name, category, description, version |
| Ownership | Primary persona, secondary personas, approver, support visibility |
| Access | Role permission, entitlement gate, tenant scope, support-session scope |
| Data | Source models, snapshot behavior, row-level filters, aggregation rules |
| Filters | Date range, legal entity, branch, department, cost center, employee, status, payroll period where relevant |
| Columns | Default columns, optional columns, formatting rules, totals, masking rules |
| UX | List/table view, summary cards, drilldown, saved view, pagination, export actions |
| Exports | CSV, XLSX, PDF where needed, async export for large result sets |
| Audit | View event, export event, download event, filter payload, actor, timestamp |
| Tests | Unit/contract tests, API tests, browser certification, visual/responsive checks |

## Personas

| Persona | Reporting Responsibilities |
|---|---|
| HR Admin | Employee, lifecycle, attendance, leave, documents, organization, policy, and people compliance reports |
| Payroll Finance Manager | Payroll register, salary variance, statutory deductions, bank advice, accounting journal, finance handoff, TDS and filing readiness |
| Tenant Admin | Tenant-level usage, roles, configuration readiness, launch audit, and security readiness |
| Platform Admin | Cross-tenant operational health, onboarding status, subscription/usage, support access, backups, incidents, provider health |
| Manager | Team attendance, leave, approvals, employee lifecycle status, payroll visibility only if explicitly entitled |
| Employee | Own payslips, tax declarations, reimbursements, leave balances, attendance summary |
| Support User | Time-bound scoped views only through approved support session |

## Phase R0: Reporting Foundation

Goal:

Create the reporting architecture used by every later report.

Build scope:

- Report catalog and category model.
- Report permission and entitlement mapping.
- Shared report table shell with pagination, sorting, search, filters, column visibility, empty state, loading state, and error state.
- Shared export request contract for CSV/XLSX/PDF.
- Saved filters and default views per role.
- Audit events for view, filter, export, and download.
- Async export pattern for large reports.
- Data dictionary for report fields and masking rules.

Development deliverables:

- Shared report registry/data contract.
- Shared report API route pattern.
- Shared report table and filter components.
- Shared export request/audit helper.
- Shared Playwright helper for login, report navigation, filter assertions, pagination assertions, and export assertions.

Certification:

- Browser test the report catalog page and one sample report end to end.
- Verify role denial and tenant isolation.
- Verify pagination does not break layout on desktop and mobile.
- Add `reporting-foundation-certification.spec.ts`.

Confidence target: 80%.

Current Phase R0 progress:

- Phase R0-A report catalog foundation: done locally on 2026-09-10.
- Development evidence: added a typed report catalog, HR admin report catalog workspace, category tabs, owner/status/search filters, paginated report table, export links, and drilldown/open actions.
- API evidence: report export API now returns controlled live API failure statuses when demo fallback is disabled, instead of falling through into local/demo export generation after an authorization failure.
- Browser evidence: `reporting-foundation-certification.spec.ts` passed locally against local frontend plus staging API, `2/2`.
- Regression evidence: `sidebar-tabs-list-certification.spec.ts` passed locally against local frontend plus staging API, `5/5`.
- Phase R0 confidence: 82%.

## Phase R1: HR Admin Core Reports

Goal:

Give HR Admin launch-grade reports for employee and organization operations.

Reports:

- Employee master report.
- New joiner report.
- Exit and full-and-final input readiness report.
- Employee movement report.
- Probation and confirmation report.
- Organization structure report.
- Legal entity, branch, location, department, designation, grade, cost center master reports.
- Employee document compliance report.
- Workflow approval aging report.
- HR audit trail report.

Development deliverables:

- HR reports category and tabs.
- Report pages built on the shared shell.
- Source-data reflection from employee, organization, document, workflow, and audit modules.
- Paginated list behavior for every long HR report.

Certification:

- Test all HR report sidebar entries and category tabs.
- Test create/update source data and confirm report reflects it.
- Test every dropdown, text filter, date filter, sort, pagination, drilldown, export, empty state, and permission state.
- Add `hr-admin-core-report-certification.spec.ts`.

Confidence target: 86%.

## Phase R2: Attendance And Leave Reports

Goal:

Cover daily workforce operations and approval risk.

Reports:

- Daily attendance register.
- Missing punch report.
- Late arrival and early exit report.
- Absence report.
- Attendance regularization report.
- Shift and roster coverage report.
- Leave balance report.
- Leave utilization report.
- Leave liability report.
- Pending leave approvals report.
- Holiday calendar coverage report.

Development deliverables:

- Attendance and leave reports category and tabs.
- Date-driven report filters with tenant calendars and shift policies.
- Manager scope and HR admin scope handling.
- Pagination for employee/day-level rows.

Certification:

- Test report updates after attendance and leave CRUD operations.
- Test date-range behavior and branch/department narrowing.
- Test manager-scoped visibility versus HR admin visibility.
- Test pagination for high employee volume.
- Add `attendance-leave-report-certification.spec.ts`.

Confidence target: 88%.

## Phase R3: Payroll Finance Core Reports

Goal:

Make payroll finance operations reviewable, reconcilable, and export-ready.

Reports:

- Payroll register.
- Salary variance report.
- Payroll input reconciliation report.
- Payroll run status report.
- Payroll exception report.
- Employee payout summary.
- Department and cost center payroll cost report.
- Bank account readiness report.
- Bank advice report.
- Bank validation exception report.
- Accounting journal report.
- Full-and-final settlement report.
- Payroll approval and lock audit report.

Development deliverables:

- Payroll finance reports category and tabs.
- Payroll snapshot-backed report queries.
- Finance-manager role access.
- Export audit for payroll register, salary variance, bank advice, and accounting journal.
- Pagination and async export for large payroll runs.

Certification:

- Test draft, review, locked, and published payroll states.
- Test report immutability after final lock.
- Test payroll exports include audit metadata and correct role enforcement.
- Test finance-manager access separately from HR admin access.
- Test large payroll runs with pagination and async export.
- Add `payroll-finance-report-certification.spec.ts`.

Confidence target: 90%.

Current Phase R3 progress:

- Phase R3-A payroll register report: done locally on 2026-09-10.
- Development evidence: added `/hr-admin/reports/payroll-register` as a dedicated finance report backed by locked payroll output register artifacts.
- Report UI evidence: includes summary totals, search, batch-status filter, artifact-status filter, sort control, paginated table, lock/publish state, output profile, storage provider, source hash evidence, export links, and output-artifact drilldown.
- API evidence: register exports use the payroll output artifact download route with checksum headers and tenant-scoped authorization.
- Browser evidence: `payroll-finance-report-certification.spec.ts` passed locally against local frontend plus staging API, `2/2`.
- Regression evidence: `reporting-foundation-certification.spec.ts` and `payroll-finance-report-certification.spec.ts` passed together, `4/4`; `sidebar-tabs-list-certification.spec.ts` passed, `5/5`.
- Phase R3-A confidence: 86%.
- Phase R3-B salary variance report: done locally on 2026-09-10.
- Development evidence: added `/hr-admin/reports/salary-variance` as a dedicated finance report backed by payroll review calculation lines and configurable prior-period baseline fields.
- Report UI evidence: includes employee-level summary totals, search, variance-band filter, sort control, paginated table, gross/deduction/current-net/baseline-net columns, variance amount and percentage, source-hash evidence, and drilldown to payroll review.
- Baseline behavior: when no configured prior-period baseline exists, the report marks rows as `Baseline pending` instead of inventing variance data.
- Browser evidence: `salary-variance-report-certification.spec.ts` passed locally against local frontend plus staging API, `2/2`.
- Regression evidence: reporting foundation, payroll register, and salary variance specs passed together, `6/6`.
- Phase R3-B confidence: 84%.

## Phase R4: Statutory And TDS Compliance Reports

Goal:

Make compliance readiness visible before filing, while keeping rules and provider behavior configurable.

Reports:

- Statutory deduction summary.
- Employee statutory profile coverage.
- Missing statutory identifier report.
- Provident fund contribution report.
- ESI contribution report.
- Professional tax report.
- Labour welfare fund report.
- TDS deduction report.
- TDS e-file readiness report.
- Form 24Q readiness report.
- Challan mapping report.
- Compliance filing calendar report.
- Filing status and acknowledgement report.

Development deliverables:

- Statutory and TDS reports category and tabs.
- Configurable statutory rule/report mappings by jurisdiction and legal entity.
- TDS readiness report backed by configured components, declaration state, challan mapping, and provider profile.
- Filing calendar/status report with provider route readiness and acknowledgement fields.

Certification:

- Test rule effective dates, legal entity filters, payroll-period filters, and provider-profile filters.
- Test missing PAN, missing tax regime, unlocked declaration, missing challan, and blocked production filing states.
- Test that real e-file submission remains disabled unless a production provider route and approval gate are configured.
- Test CSV/XLSX/PDF exports and audit events.
- Add `statutory-tds-report-certification.spec.ts`.

Confidence target: 88% for readiness reports, 60% for real filing until provider certification is complete.

Current Phase R4 progress:

- Phase R4-A statutory deduction summary report: done locally on 2026-09-10.
- Development evidence: added `/hr-admin/reports/statutory-deductions` as a dedicated compliance report backed by payroll finance handoff statutory artifacts and enriched with statutory components, employer registrations, filing calendars, provider refs, authority refs, output profiles, and source hashes when artifact rows exist.
- Report UI evidence: includes summary totals, search, statutory-type filter, provider-route filter, sort control, paginated table, registration/provider/evidence columns, empty state, export action for populated statutory artifacts, and drilldown to Payroll Statutory.
- Live data note: staging currently returned zero statutory deduction source rows for this report, so the browser certification validates the empty-data path, filters, pagination, role denial, and drilldown; artifact export/source-hash assertions execute when statutory artifact rows exist.
- Browser evidence: `statutory-deductions-report-certification.spec.ts` passed locally against local frontend plus staging API, `2/2`.
- Regression evidence: reporting foundation, payroll register, salary variance, and statutory deductions specs passed together, `8/8`.
- Phase R4-A confidence: 78% until staging has populated statutory deduction artifact rows; page/function controls are certified.

## Phase R5: Payroll Outputs, Handoff, And Audit Packs

Goal:

Prove every payroll output can be traced from source to publication to downstream handoff.

Reports:

- Payslip publication report.
- Payslip access and download audit.
- Payroll output artifact inventory.
- Output checksum and storage status report.
- Finance handoff delivery report.
- Provider callback and retry report.
- Notification delivery report.
- Payroll audit pack report.

Development deliverables:

- Payroll output and handoff reports category and tabs.
- Artifact inventory query with storage strategy, checksum, grant, publish, revoke, and download state.
- Finance handoff report backed by delivery and acknowledgement events.
- Provider callback and notification retry report.

Certification:

- Test output generation, publish, revoke, download, and read receipt flows.
- Test tenant-scoped artifact access and signed download behavior.
- Test retry states and callback mutations without exposing secrets.
- Add `payroll-output-handoff-report-certification.spec.ts`.

Confidence target: 92%.

## Phase R6: SaaS, Platform, And Operations Reports

Goal:

Give platform operations the reports needed to run HRMS as a multi-tenant SaaS product.

Reports:

- Tenant onboarding status report.
- Tenant launch readiness report.
- Tenant usage and subscription report.
- Entitlement and feature-gate report.
- Role and permission assignment report.
- Support session report.
- Cross-tenant isolation audit report.
- Provider health report.
- Backup and restore readiness report.
- SLA incident and breach report.
- Security readiness report.
- Data retention and export audit report.

Development deliverables:

- Platform reports category and tabs.
- Tenant onboarding, launch readiness, usage, entitlement, support, provider, security, and SLA report pages.
- Five-tenant browser test dataset.
- Cross-tenant pagination and search behavior.

Certification:

- Onboard five tenants through browser and verify report updates.
- Test platform admin, tenant admin, support, HR admin, finance manager, manager, and employee role boundaries.
- Test pagination and search across tenant-heavy data.
- Add `saas-platform-report-certification.spec.ts`.

Confidence target: 92%.

## Phase R7: Analytics, Scheduling, And Saved Reports

Goal:

Turn reports into reusable operating views.

Build scope:

- Dashboard widgets backed by report definitions.
- Saved views per user and tenant.
- Scheduled report delivery.
- Export queue and download center.
- Report subscriptions and notification preferences.
- Trend analytics for headcount, attrition, payroll cost, attendance, leave, statutory risk, and SaaS usage.

Development deliverables:

- Saved report views.
- Scheduled report UI and delivery history.
- Export queue and download center.
- Dashboard widgets backed by report definitions.

Certification:

- Test saved views create/update/delete.
- Test scheduled report creation, pause, resume, and delivery history.
- Test notification preferences and export queue states.
- Add `analytics-scheduled-report-certification.spec.ts`.

Confidence target: 90%.

## Phase R8: Reporting Launch Certification

Goal:

Certify reporting end to end before launch.

Certification pack:

- Browser smoke for every report route.
- Element-level Playwright coverage for every touched report page.
- CRUD-to-report reflection tests for source modules.
- Role and entitlement matrix tests.
- Cross-tenant isolation tests.
- Export authorization tests.
- Pagination and large-data tests.
- Responsive desktop/tablet/mobile visual review.
- Accessibility checks for keyboard navigation, focus order, labels, and contrast.
- Performance budget for initial load, filter apply, page change, and export request.

Launch criteria:

- No critical or high defects open.
- Money and compliance reports have snapshot or audit evidence.
- Every report has clear empty/error/loading states.
- Every long report has pagination.
- Every export is audited.
- Every role boundary is tested in browser.

Confidence target: 95% for launch-grade reporting.

## Priority Build Order

1. Reporting foundation and catalog.
2. Payroll register.
3. Salary variance report.
4. Statutory deduction summary.
5. TDS e-file readiness and challan mapping.
6. Bank advice and bank validation exceptions.
7. Accounting journal report.
8. Employee master and document compliance reports.
9. Attendance and leave operational reports.
10. SaaS/platform operations reports.
11. Saved views, scheduled reports, and dashboard widgets.
12. Full reporting launch certification.

## Confidence Ramp

| Milestone | Expected Confidence |
|---|---:|
| R0 complete | 80% |
| R1 complete | 86% |
| R2 complete | 88% |
| R3 complete | 90% |
| R4 readiness complete | 88% |
| R5 complete | 92% |
| R6 complete | 92% |
| R7 complete | 90% |
| R8 complete | 95% |

## Immediate Next Slice

Start with Phase R0 plus the first Phase R3 report.

Recommended implementation slice:

- Add report catalog definitions for payroll finance and HR admin.
- Create the shared report page shell.
- Implement payroll register as the first certified report.
- Add browser certification for filters, pagination, sorting, drilldown, export authorization, role denial, tenant isolation, responsive layout, and empty/error states.
