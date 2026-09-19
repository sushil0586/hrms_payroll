# HR Admin Enterprise UI Phase Plan

Date: 2026-09-19  
Status: Phase 9 enterprise browser certification slice complete for redesigned primary HR Admin surfaces  
Approved design baseline: `docs/qa/hr-admin-enterprise-ui-prototype-2026-09-19.html`

## Objective

Make every HR Admin page feel premium, sleek, user-friendly, and production-grade while keeping each page focused on its intended responsibility.

This plan is intentionally phased so we do not redesign everything at once and create rework. Each phase must end with browser-based QA evidence before moving forward.

## Non-Negotiable Direction

- Keep existing routes unless a phase explicitly approves a route consolidation.
- Keep current APIs and workflows unless a defect requires correction.
- Keep RBAC, permission checks, tenant isolation, validations, audit evidence, and data persistence intact.
- Pages must not become overloaded. If a screen has too many jobs, split the workflow into tabs, drawers, drill-down pages, or linked workspaces.
- Use the approved prototype language: dark navy shell, light workspace, white cards, blue primary actions, calm badges, compact tables, and clear action hierarchy.
- Avoid decorative gradients, oversized cards, heavy shadows, and marketing-style layouts.
- Use drawers/modals for add/edit/review where the user should stay in context.
- Every disabled action must explain the prerequisite or missing permission.
- Every destructive/security/compliance-sensitive action must confirm before execution.

## Page Responsibility Model

| Page Type | Responsibility | Should Contain | Should Not Contain |
| --- | --- | --- | --- |
| Control center | Summarize, prioritize, route | KPIs, queues, blockers, readiness, shortcuts | Deep edit forms, long setup flows |
| Workbench | Search, filter, inspect, take scoped action | Tables, filters, detail panel, focused CTAs | Unrelated module setup |
| Guided flow | Move through a controlled process | Stepper, prerequisites, current action, evidence | Random side workflows |
| Configuration | Create/edit focused setup records | Compact forms, validation, audit state | Operational queues |
| Evidence/report | Inspect, filter, export, trace | Filters, table, details, export | Master-data mutation |

## Phase 0: Design Lock And Inventory

Goal: freeze the approved design language and map the full HR Admin surface before implementation.

Scope:

- Confirm approved prototype as baseline.
- Inventory every `/hr-admin` route, page type, primary action, secondary actions, and data dependencies.
- Mark pages that are overloaded or visually inconsistent.
- Decide which pages will use control center, workbench, guided flow, configuration, or evidence/report templates.

Deliverables:

- Updated HR Admin route inventory.
- Page-to-template mapping.
- List of pages requiring functional clarification before development.

Exit Criteria:

- No HR Admin page is redesigned without a known target template.
- Product questions are captured before implementation.

Status: Complete.

Evidence:

- `docs/qa/hr-admin-enterprise-ui-phase0-inventory-2026-09-19.md`

## Phase 1: Global Shell, Tokens, And Navigation

Goal: make the HR Admin shell cohesive before individual page redesign.

Scope:

- Refine HR Admin sidebar grouping:
  - Command
  - Workforce
  - Time & Leave
  - Payroll
  - Compliance
  - Insights
  - Operations
- Apply consistent page header pattern:
  - Small `HR ADMIN` context
  - Page title
  - Short description
  - One primary CTA
  - Secondary actions under More or compact buttons
- Standardize buttons, cards, badges, table density, filters, empty states, loading states, error states, and drawers.
- Ensure the shell works at 1440px, 1366px, tablet width, and mobile where supported.

Deliverables:

- Shared HR Admin layout standards.
- Global CSS/component refinements.
- Sidebar and header alignment.

Exit Criteria:

- Existing HR Admin pages inherit the same premium shell.
- No obvious sidebar/header misalignment or overflow.
- Browser screenshots pass desktop/tablet sanity checks.

Status: Code-level implementation complete; browser verification pending.

Evidence:

- `docs/qa/hr-admin-enterprise-ui-phase1-shell-progress-2026-09-19.md`

## Phase 2: People Operations Control Center

Goal: redesign `/hr-admin` as the daily command center.

Scope:

- Workforce summary cards.
- Payroll readiness signal.
- Action queue.
- Risk/exception panel.
- Launch or readiness blockers.
- Recent activity/recent employee changes.
- Quick links to Employees, Attendance, Payroll, Reports.

Rules:

- No deep edit forms.
- No large operational tables.
- No unrelated SaaS/platform operations unless explicitly approved for HR Admin.

Deliverables:

- Redesigned HR Admin dashboard.
- Dashboard browser certification.

Exit Criteria:

- Dashboard answers: “What needs my attention today?”
- Every card/action links to the correct working page.
- Data survives refresh and browser back/forward.

Status: Code-level implementation complete; browser verification pending.

Evidence:

- `docs/qa/hr-admin-enterprise-ui-phase2-dashboard-progress-2026-09-19.md`

## Phase 3: Employee Directory Workbench

Goal: redesign Employees into a focused employee master workspace.

Scope:

- Search and filters: role/status/security/payroll readiness/document readiness.
- Employee table with consistent columns.
- Right-side detail drawer/panel.
- Add Employee, Import, Export, Manage Access.
- Employee status, login/access state, manager, bank readiness, statutory readiness, document readiness.
- Inline validation and clear error states.

Rules:

- Employee page manages employee records and employee access handoff only.
- Payroll run processing stays in payroll pages.
- Policy editing stays in setup/policy pages.

Deliverables:

- Redesigned employee directory.
- Add/edit/detail/access/import/export workflow QA.

Exit Criteria:

- CRUD and workflow actions are verified by refresh, search, and reopening the record.
- Large data set remains usable at 1366px.
- RBAC-limited users see correct disabled/hidden actions.

Status: Code-level implementation complete; browser verification pending.

Evidence:

- `docs/qa/hr-admin-enterprise-ui-phase3-employee-workbench-progress-2026-09-19.md`

## Phase 4: Payroll Cycle Control

Goal: give payroll pages one cohesive operating journey.

Scope:

- Shared payroll stepper:
  - Readiness
  - Inputs
  - Calculation
  - Review
  - Outputs
  - Handoff
- Current run selector.
- Exception counts.
- Step-specific primary action.
- Evidence and audit links.
- Clear prerequisites for locked/disabled steps.

Decision Needed:

- Option A: create one consolidated `/hr-admin/payroll-control` page.
- Option B: keep existing payroll routes and add a shared journey rail/stepper across them.

Recommended:

- Start with Option B to reduce workflow risk and avoid route churn.

Deliverables:

- Shared payroll journey component.
- Redesigned payroll readiness/inputs/calculation/review/output/handoff surfaces.
- Payroll RBAC regression suite update.

Exit Criteria:

- User always knows current payroll step, blockers, and next action.
- No step allows unsafe out-of-order action.
- Existing payroll certification tests pass.

Status: Code-level implementation complete; browser verification pending.

Evidence:

- `docs/qa/hr-admin-enterprise-ui-phase4-payroll-cycle-progress-2026-09-19.md`

## Phase 5: Time, Leave, Attendance, And Policies

Goal: make time and leave pages operationally clear without mixing too many responsibilities.

Scope:

- Attendance workbench.
- Leave requests and approvals.
- Leave policy assignments.
- Shift assignments.
- Policy setup pages.

Rules:

- Request/approval queues should be queue-first.
- Policy setup should be configuration-first.
- Assignment pages should show effective dates, impacted employees, and audit state.

Deliverables:

- Time/leave UI refinements.
- Request, policy, and assignment workflow QA.

Exit Criteria:

- User can distinguish requests, policies, and assignments immediately.
- Validations are visible and precise.
- Approval/reject workflows preserve audit evidence.

Status: Shared operations and form polish pattern complete; Phase 12 demo-safe browser certification complete for hub, records, regularizations, policy setup, assignments, shifts, and leave balances.

Evidence:

- `docs/qa/hr-admin-enterprise-ui-phase5-time-leave-progress-2026-09-19.md`
- `docs/qa/hr-admin-time-leave-phase12-certification-report-2026-09-19.md`

## Phase 6: Compliance, Statutory, Providers, And Evidence

Goal: make compliance pages trustworthy and audit-ready.

Scope:

- Payroll statutory setup.
- Statutory filing status.
- Payroll providers.
- Export audits and evidence packs.
- Finance handoff evidence.

Rules:

- Evidence pages should not expose raw JSON as the primary experience.
- Provider setup must distinguish sandbox, certified, live, and blocked states.
- Compliance-sensitive actions require confirmation.

Deliverables:

- Compliance/evidence template.
- Provider and filing workflow certification.

Exit Criteria:

- Status, owner, date, evidence, and next action are clear on every compliance page.
- Export/download workflows are verified.
- RBAC denies unsafe actions.

Status: Shared compliance evidence pattern complete; browser verification and page-specific workflow refinements pending.

Evidence:

- `docs/qa/hr-admin-enterprise-ui-phase6-compliance-evidence-progress-2026-09-19.md`

## Phase 7: Reports And Insights Standardization

Goal: make reports consistent, scannable, and export-ready.

Scope:

- Report catalog and all HR Admin report pages.
- Filter bar.
- KPI strip.
- Results table.
- Export/download states.
- Empty/error/loading states.

Rules:

- Reports inspect and export; they do not mutate master data.
- Every report should link back to the source workflow where practical.

Deliverables:

- Reusable report workspace standard.
- Report QA matrix.

Exit Criteria:

- Filters, combined filters, sorting, pagination, export, and direct URL access are verified.
- Report pages are visually consistent.

Status: Shared report insights pattern complete; Phase 13 demo-safe browser certification complete for catalog, representative report workspaces, export links, manifests, audit history, and tablet responsiveness.

Evidence:

- `web/tests/e2e/hr-admin-reports-phase13-certification.spec.ts`
- `docs/qa/hr-admin-reports-phase13-certification-report-2026-09-19.md`

## Phase 8: Operations Pages

Goal: clarify internal/operational HR Admin pages and avoid customer confusion.

Scope:

- Notifications.
- Imports.
- SaaS Ops pages currently under HR Admin.
- Launch remediation/readiness pages.

Decision Needed:

- Which SaaS/platform-style pages should remain visible to HR Admin?
- Which should move to Platform Admin, Tenant Admin, or internal-only access?

Deliverables:

- Operations page ownership matrix.
- UI/UX cleanup for approved HR-facing operations pages.

Exit Criteria:

- No page appears in HR Admin unless it has a clear HR Admin use case.
- Internal-only pages are gated or removed from default navigation.

Status: Operations governance pattern applied; Phase 14 demo-safe browser certification complete for operations ownership, navigation, launch remediation filters, import history evidence shell, and responsive behavior.

Evidence:

- `web/tests/e2e/hr-admin-operations-phase14-certification.spec.ts`
- `docs/qa/hr-admin-operations-phase14-certification-report-2026-09-19.md`

## Phase 9: Enterprise Browser QA And Sign-Off

Goal: certify the finished HR Admin experience like Platform Admin and Tenant Admin.

Scope:

- Browser discovery inventory.
- Route-by-route Playwright certification.
- Positive/negative validation.
- CRUD verification by refresh/search/reopen.
- RBAC and direct URL access.
- Tenant isolation.
- Responsive checks at 1440px, 1366px, tablet, and mobile where supported.
- Console/API failures.
- Performance observations.

Deliverables:

- HR Admin enterprise browser QA report.
- Updated Playwright specs.
- Screenshot evidence.
- Final confidence score.

Exit Criteria:

- No critical or high launch blockers remain.
- Medium issues are documented with owner/phase.
- Confidence target: 95%+ for UI/UX, workflow clarity, RBAC, and launch readiness.

Status: Browser certification slice complete for redesigned primary HR Admin surfaces at 1440px, 1366px, and tablet width.

Evidence:

- `docs/qa/hr-admin-enterprise-ui-phase9-browser-qa-report-2026-09-19.md`

## Phase 10: Employee Directory Workflow Certification

Goal: certify the redesigned Employee Directory workbench beyond page load.

Scope:

- Directory search/filter controls.
- Status tabs.
- Selection and detail panel.
- Permission-aware mutation actions.
- Empty state and reset behavior.
- Import workbench affordances where authorized.
- Responsive checks at 1366px and tablet width.

Deliverables:

- Employee workbench browser certification spec.
- Employee workbench QA report.

Exit Criteria:

- Read-only sessions show a complete inspectable directory and hide mutation controls cleanly.
- Authorized sessions continue to rely on the existing live mutation spec for add/edit/access/import commits.
- No horizontal overflow at desktop/tablet widths.

Status: Demo-safe browser certification complete; live CRUD/import mutation spec remains the production data-path authority.

Evidence:

- `web/tests/e2e/hr-admin-employee-workbench-phase10-certification.spec.ts`
- `docs/qa/hr-admin-employee-workbench-phase10-certification-report-2026-09-19.md`

## Phase 11: Payroll Cycle Workflow Certification

Goal: certify the redesigned payroll journey beyond simple page load.

Scope:

- Payroll Readiness.
- Payroll Inputs.
- Payroll Calculations.
- Payroll Review.
- Payroll Outputs.
- Payroll Handoff.
- Shared payroll cycle journey links and current-step state.
- Step-specific tables, evidence panels, action panels, and disabled/permission-safe controls.
- Responsive checks at 1440px, 1366px, and tablet width.

Deliverables:

- Payroll cycle browser certification spec.
- Payroll cycle QA report.

Exit Criteria:

- Every payroll step communicates current phase, next action, and owning workflow.
- The shared journey links correctly across all six steps.
- Action panels are present or permission-safe and do not allow unsafe out-of-order behavior in the UI.
- No horizontal overflow across certified widths.

Status: Demo-safe browser certification complete; live close-flow mutation suite remains the production data-path authority.

Evidence:

- `web/tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts`
- `docs/qa/hr-admin-payroll-cycle-phase11-certification-report-2026-09-19.md`

## Phase 12: Time, Leave, Attendance Workflow Certification

Goal: certify the redesigned time, leave, attendance, policy, and assignment surfaces beyond simple page load.

Scope:

- Attendance Operations hub.
- Attendance Records workbench.
- Attendance Regularization queue.
- Leave Balances ledger.
- Leave Policies, Attendance Policies, Leave Types.
- Shifts, Shift Roster Templates, Employee Shift Assignments.
- Leave Policy Assignments and Attendance Policy Assignments.
- Shared `TimeLeaveOperationsStrip` navigation and route context.
- Search/filter empty states and permission-safe bulk/review controls.
- Responsive checks at 1440px, 1366px, and tablet width.

Deliverables:

- Time/leave browser certification spec.
- Time/leave QA report.

Exit Criteria:

- User can distinguish requests, policies, assignments, balances, shifts, and records immediately.
- Records and regularizations expose working filters and clear empty states.
- Configuration/assignment pages use the shared enterprise pattern and avoid horizontal overflow.
- Live mutation suites remain the production data-path authority for create/edit/approve/deactivate flows.

Status: Demo-safe browser certification complete.

Evidence:

- `web/tests/e2e/hr-admin-time-leave-phase12-certification.spec.ts`
- `docs/qa/hr-admin-time-leave-phase12-certification-report-2026-09-19.md`

## Phase 13: Reports, Export, And Evidence Certification

Goal: certify redesigned report catalog, representative report workspaces, export links, manifest proof, export audit history, and responsive behavior.

Scope:

- Reports catalog.
- Workforce report.
- Attendance register report.
- Leave balance report.
- Payroll register report.
- Export Audit History.
- Report category tabs, search, filters, pagination, export links, manifest links, and empty states.
- Manifest API proof for representative live local report endpoints.
- Responsive checks at 1440px, 1366px, and tablet width.

Deliverables:

- Reports browser certification spec.
- Reports certification report.

Exit Criteria:

- Report catalog makes report ownership, filters, exports, evidence, status, and actions clear.
- Representative report workspaces render the shared evidence pattern and do not overflow.
- Export and manifest affordances are visible and stable.
- Existing live report suites remain the authority for full CSV, manifest, audit, and unauthorized access behavior.

Status: Demo-safe browser certification complete.

Evidence:

- `web/tests/e2e/hr-admin-reports-phase13-certification.spec.ts`
- `docs/qa/hr-admin-reports-phase13-certification-report-2026-09-19.md`

## Phase 14: Operations Ownership And Internal Workflow Certification

Goal: certify HR Admin operations pages as clear, HR-facing control surfaces rather than confusing platform-operator screens.

Scope:

- SaaS Operations.
- SaaS Control Plane.
- SaaS Resilience.
- SaaS SLA Operations.
- Notifications Admin.
- Launch Remediation.
- Import History.
- Shared operations governance strip, active navigation, direct URL filter state, evidence shells, and responsive behavior.

Deliverables:

- Operations browser certification spec.
- Operations certification report.

Exit Criteria:

- Every operations route has a clear HR Admin purpose and visible cross-navigation.
- Operations pages avoid horizontal overflow at 1440px, 1366px, and tablet width.
- Launch remediation filter URL state and import history evidence shell are verified.
- Existing live action suites remain the production data-path authority for mutation workflows.

Status: Demo-safe browser certification complete.

Evidence:

- `web/tests/e2e/hr-admin-operations-phase14-certification.spec.ts`
- `docs/qa/hr-admin-operations-phase14-certification-report-2026-09-19.md`

## Tracking Board

| Phase | Name | Status | Target Confidence |
| --- | --- | --- | --- |
| 0 | Design lock and inventory | Complete | 85% |
| 1 | Global shell/tokens/navigation | Certified in Phase 9 primary route slice | 92% |
| 2 | People Operations Control Center | Certified in Phase 9 primary route slice | 93% |
| 3 | Employee Directory Workbench | Phase 10 workbench behavior certified; live mutation suite remains | 94% |
| 4 | Payroll Cycle Control | Phase 11 journey and workflow surfaces certified; live close-flow suite remains | 94% |
| 5 | Time, Leave, Attendance, Policies | Phase 12 hub, records, regularizations, policy, assignment, shift, and balance surfaces certified; live mutation suites remain | 94% |
| 6 | Compliance, Statutory, Providers, Evidence | Certified in Phase 9 primary route slice | 94% |
| 7 | Reports and Insights | Phase 13 catalog, representative workspace, export evidence, and responsive behavior certified | 94% |
| 8 | Operations pages | Phase 14 operations ownership, navigation, filter state, evidence shell, and responsive behavior certified | 94% |
| 9 | Enterprise browser QA and sign-off | Primary route browser certification complete; deep CRUD/RBAC sweep remains | 94% |
| 10 | Employee Directory Workflow Certification | Demo-safe workbench behavior certified | 94% |
| 11 | Payroll Cycle Workflow Certification | Demo-safe journey and control surfaces certified | 94% |
| 12 | Time, Leave, Attendance Workflow Certification | Demo-safe route, filter, empty-state, and responsive behavior certified | 94% |
| 13 | Reports, Export, And Evidence Certification | Demo-safe catalog, representative reports, export links, manifest proof, and audit history certified | 94% |
| 14 | Operations Ownership And Internal Workflow Certification | Demo-safe ownership, navigation, filter state, evidence shell, and responsive behavior certified | 94% |

## Immediate Next Step

Complete the remaining deep workflow certification:

1. Run employee live mutation suite on stage for add/edit/access/import/export final proof.
2. Run payroll live close-flow suite on stage for mutation proof.
3. Run time/leave live approval and policy assignment mutation suites on stage for final data-path proof.
4. Run full live report export/download suites on stage, including payroll-register manifest verification.
5. Run operations launch/release gate suites on stage for live mutation and recovery proof.
6. Run `sync_menu_catalog` after deployment for DB-backed menu rows.
