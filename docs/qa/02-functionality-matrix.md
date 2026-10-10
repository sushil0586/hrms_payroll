# HR Admin Functionality Matrix

Date: 2026-10-09
Phase: Phase 1 static discovery only
Scope: HR Admin first

## Legend

- `Static verified`: mapped from actual frontend/backend implementation.
- `Conditional`: depends on permission, selected rows, object state, lock state, or data availability.
- `Runtime unknown`: must be verified by browser/API execution.

## Workforce

| Function ID | Screens | Action / control | Frontend behavior | Backend/API mapping | Permissions/data dependencies | CRUD/state | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-FNC-WF-001 | HRADM-SCR-WF-001 | Employee filters: search, department, manager view, readiness, page size, apply/reset | Updates query/list state and reloads employee directory | `/api/hr-admin/employees` family | employee read permission; employee/org data | Read/filter/paginate | Static verified; runtime unknown |
| HRADM-FNC-WF-002 | HRADM-SCR-WF-001 | Employee selection/detail | Shows selected employee summary, readiness, employment, document, payroll, access, bank links | employee detail data from employees API/selectors | employee data, query/list selected ID | Read/detail | Static verified; runtime unknown |
| HRADM-FNC-WF-003 | HRADM-SCR-WF-002/003 | Create/edit employee | Form submit creates or updates employee | `/api/hr-admin/employees`, `/api/hr-admin/employees/{id}` | employee create/edit permission; org/manager/status options | Create/update | Static verified; validation runtime unknown |
| HRADM-FNC-WF-004 | HRADM-SCR-WF-004 | Create/update workspace access | Form writes role/access status; offboarding defaults supported | `/api/hr-admin/employees/{id}/access` | access manage permission; role/workspace state | Create/update/state | Static verified; runtime unknown |
| HRADM-FNC-WF-005 | HRADM-SCR-WF-005 | Create/update bank account | Select account, new account, save/reset | `/api/hr-admin/employees/{id}/bank-accounts` | employee bank data; edit/manage permission | Create/update/read | Static verified; runtime unknown |
| HRADM-FNC-WF-006 | HRADM-SCR-WF-001 | Employee CSV import | Load sample, copy/download template, preview, commit valid rows | `/api/hr-admin/employees` | create/import permission; org option dependencies | Bulk create | Static verified; import edge cases runtime unknown |
| HRADM-FNC-WF-007 | HRADM-SCR-WF-001 | Bank account CSV import | Preview and commit bank details | employee bank account API | employee matching; bank validation | Bulk create/update | Static verified; runtime unknown |
| HRADM-FNC-WF-008 | HRADM-SCR-WF-001 | Manager mapping CSV import | Preview and patch manager relationships | employee manager mapping API | valid employees/managers | Bulk update | Static verified; runtime unknown |
| HRADM-FNC-WF-009 | HRADM-SCR-WF-006..018 | Lifecycle queues and forms | Queue filter/detail/action links; create/edit onboarding, probation, movement, exit | `/api/hr-admin/onboardings`, probation, movements, exits family | employees, owners, workflow states, document readiness | CRUD/workflow | Static verified; runtime unknown |

## Documents

| Function ID | Screens | Action / control | Frontend behavior | Backend/API mapping | Permissions/data dependencies | CRUD/state | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-FNC-DOC-001 | HRADM-SCR-DOC-001..003 | Employee document list/upload/review | Register filters, new document, review page, status actions | `/api/hr-admin/employee-documents` family | employees, categories, requirements | CRUD/review | Static verified; runtime unknown |
| HRADM-FNC-DOC-002 | HRADM-SCR-DOC-004..009 | Document categories and requirements | Setup list/create/edit | `/api/hr-admin/document-categories`, `/api/hr-admin/document-requirements` | document setup permission | CRUD | Static verified; runtime unknown |
| HRADM-FNC-DOC-003 | HRADM-SCR-DOC-010..011 | Generated letters | List/create/download/preview style operations | `/api/hr-admin/generated-letters` family | employees/templates/document data | Create/read/export | Static verified; runtime unknown |

## Time, Leave, Attendance, Roster

| Function ID | Screens | Action / control | Frontend behavior | Backend/API mapping | Permissions/data dependencies | CRUD/state | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-FNC-TLA-001 | HRADM-SCR-TLA-001 | Time-to-payroll readiness | Shows readiness and exception links across attendance/leave/payroll | `/api/hr-admin/time-to-payroll` family | attendance, leave, payroll data | Read/cross-module | Static verified; runtime unknown |
| HRADM-FNC-TLA-002 | HRADM-SCR-TLA-003 | Attendance filters/pagination | Search by employee/status/source/shift/lock/regularized/date/page size | `/api/hr-admin/attendance-records` | attendance records and shift data | Read/filter/paginate | Static verified; runtime unknown |
| HRADM-FNC-TLA-003 | HRADM-SCR-TLA-003 | Attendance bulk lock/unlock/status/regularized | Select rows and send bulk action | `/api/hr-admin/attendance-records/bulk-actions` | selected rows; lock/status permissions | Bulk state transition | Static verified; runtime unknown |
| HRADM-FNC-TLA-004 | HRADM-SCR-TLA-003/004 | Attendance create/edit/import | Edit record; CSV sample/copy/download/preview/commit | `/api/hr-admin/attendance-records`, record detail API | employees, shifts, date/status validations | Create/update/import | Static verified; runtime unknown |
| HRADM-FNC-TLA-005 | HRADM-SCR-TLA-005/006 | Regularization review | Inline approve/reject and full review page | `/api/hr-admin/attendance-regularizations/{id}/approve`, `/reject` | regularization status; reviewer permission | Approval workflow | Static verified; runtime unknown |
| HRADM-FNC-TLA-006 | HRADM-SCR-TLA-007..020 | Shift, calendar, assignment, roster setup | List/create/edit/import/conflict resolve/rollout | shifts, holiday calendars, assignments, roster templates API families | employees, shifts, calendars, date ranges | CRUD/import/rollout | Static verified; runtime unknown |
| HRADM-FNC-TLA-007 | HRADM-SCR-TLA-021..023 | Leave requests and balances | Request list/import; balance actions and transaction review | leave requests/balances API families | employees, leave types, policies, balances | Read/import/adjust/review | Static verified; runtime unknown |
| HRADM-FNC-TLA-008 | HRADM-SCR-TLA-024..039 | Leave and attendance policies | Types/policies/assignments create/edit/import/impact/archive/delete/detach/conflict resolve | leave type, leave policy, assignment, attendance policy API families | employees, policies, effective dates | CRUD/state/conflict | Static verified; runtime unknown |

## Payroll

| Function ID | Screens | Action / control | Frontend behavior | Backend/API mapping | Permissions/data dependencies | CRUD/state | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-FNC-PAY-001 | HRADM-SCR-PAY-001 | Payroll readiness tabs | Readiness summary, issues, employee/setup/evidence views | `/api/hr-admin/payroll-readiness` family | employee, salary, statutory, attendance data | Read/evidence | Static verified; runtime unknown |
| HRADM-FNC-PAY-002 | HRADM-SCR-PAY-002 | Payroll calendars, pay groups, assignments | Setup tabs and actions | `/api/hr-admin/payroll-setup` family | organization/payroll setup data | CRUD/setup | Static verified; runtime unknown |
| HRADM-FNC-PAY-003 | HRADM-SCR-PAY-003 | Salary components, structures, versions, assignments | Setup tabs and action forms | `/api/hr-admin/salary-setup` family | employees, structures, components | CRUD/effective dating | Static verified; runtime unknown |
| HRADM-FNC-PAY-004 | HRADM-SCR-PAY-004 | Payroll rules and evaluations | Rule/version management, trace/evaluation | `/api/hr-admin/payroll-rules` family | salary/payroll input snapshots | CRUD/evaluate | Static verified; runtime unknown |
| HRADM-FNC-PAY-005 | HRADM-SCR-PAY-005 | Statutory setup/declarations | Packs, components, registrations, filings, profiles, declarations, proof item review | statutory setup/declaration API family | employees, statutory packs, proofs | CRUD/submit/verify/reject/lock | Static verified; runtime unknown |
| HRADM-FNC-PAY-006 | HRADM-SCR-PAY-006 | Payroll inputs | Input snapshots, import, lock, reconciliation | `/api/hr-admin/payroll-inputs`, lock endpoints | attendance/leave/salary/statutory source data | Import/lock/read | Static verified; runtime unknown |
| HRADM-FNC-PAY-007 | HRADM-SCR-PAY-007 | Payroll calculation | Calculate draft and open review | calculation API endpoints | locked inputs, rules, salary data | State transition | Static verified; runtime unknown |
| HRADM-FNC-PAY-008 | HRADM-SCR-PAY-008 | Payroll review | Submit/approve/reject/lock review; exception decisions; generate outputs | review API endpoints | calculation batch, approver permissions | Approval workflow/state | Static verified; runtime unknown |
| HRADM-FNC-PAY-009 | HRADM-SCR-PAY-009 | Payroll outputs | Publish output batch, signed access, revoke, audit/export links, generate handoff | output API endpoints | locked review/output artifacts | Publish/revoke/export | Static verified; runtime unknown |
| HRADM-FNC-PAY-010 | HRADM-SCR-PAY-010 | Finance handoff/provider lanes | Generate/transmit/acknowledge handoff, audit pack, retry/requeue provider deliveries | handoff/provider delivery API endpoints | published outputs, provider setup, finance permission | State transition/retry | Static verified; runtime unknown |
| HRADM-FNC-PAY-011 | HRADM-SCR-PAY-011 | Provider setup | Certify provider, clone/activate/archive/simulate/export mappings | provider API endpoints | provider config/mapping data | CRUD/certification | Static verified; runtime unknown |
| HRADM-FNC-PAY-012 | HRADM-SCR-PAY-012..017 | Adjustments and settlements | Create/edit/submit/approve/reject/apply adjustments and settlements | adjustment/settlement API endpoints | employees, payroll periods, approver permission | CRUD/approval/apply | Static verified; runtime unknown |

## Reports

| Function ID | Screens | Action / control | Frontend behavior | Backend/API mapping | Permissions/data dependencies | CRUD/state | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-FNC-REP-001 | HRADM-SCR-REP-001..005 | Report catalog/family navigation | Opens report families and individual reports | report catalog routes/API selectors | HR admin role access | Read/navigation | Static verified; runtime unknown |
| HRADM-FNC-REP-002 | HRADM-SCR-REP-006..031 | Report search/filter/sort/page | Client/server filtering, summaries, table pagination | `/api/hr-admin/reports/**` | source module data | Read/filter/paginate | Static verified; runtime unknown |
| HRADM-FNC-REP-003 | HRADM-SCR-REP-006..031 | Export filtered CSV / manifests | Export buttons and manifest/evidence links where present | report export/audit API endpoints | export permission and report data | Export/audit | Static verified; authorization runtime unknown |
| HRADM-FNC-REP-004 | HRADM-SCR-REP-006..031 | Operational deep links | Links from report rows to HR Admin operational screens | route links with object IDs/query strings | source object existence | Navigation/cross-module | Static verified; runtime unknown |

## Notifications

| Function ID | Screens | Action / control | Frontend behavior | Backend/API mapping | Permissions/data dependencies | CRUD/state | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-FNC-NOTIF-001 | HRADM-SCR-NOTIF-002..004 | Template list/create/edit | Template form, preview panel, test-send where implemented | notification templates API family | templates, channels, event metadata | CRUD/preview/test | Static verified; runtime unknown |
| HRADM-FNC-NOTIF-002 | HRADM-SCR-NOTIF-005..007 | Event list/create/edit | Event form and routing preview/test surfaces | notification events API family | templates/channels/audience | CRUD/preview/test | Static verified; runtime unknown |
| HRADM-FNC-NOTIF-003 | HRADM-SCR-NOTIF-008 | Delivery configuration | Save delivery settings | notification delivery API | provider/channel settings | Update | Static verified; runtime unknown |
| HRADM-FNC-NOTIF-004 | HRADM-SCR-NOTIF-009 | Diagnostics | Diagnostic checks and status display | notification diagnostics API | provider configuration | Read/diagnose | Static verified; runtime unknown |
| HRADM-FNC-NOTIF-005 | HRADM-SCR-NOTIF-010/011 | Queue retry/review | Filters, row selection, bulk retry, inline review, full review, retry single notification | `/api/hr-admin/notifications`, bulk retry, item retry/detail API | notification status/channel/priority | Retry/review/state | Static verified; runtime unknown |

## Organization, Workflows, Audit

| Function ID | Screens | Action / control | Frontend behavior | Backend/API mapping | Permissions/data dependencies | CRUD/state | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-FNC-SET-001 | HRADM-SCR-SET-001..003 | Organization setup | Guided setup and section create/edit | `/api/hr-admin/organization/**` | organization manage permission | CRUD/setup | Static verified; runtime unknown |
| HRADM-FNC-SET-002 | HRADM-SCR-SET-004..008 | Workflows | Template/assignment create/edit and workflow traces | workflow templates/assignments API family | workflow permissions; module triggers | CRUD/assignment | Static verified; runtime unknown |
| HRADM-FNC-AUD-001 | HRADM-SCR-AUD-001 | Audit log | Filter/read audit records | `/api/hr-admin/audit` family | audit permission | Read/filter/export where present | Static verified; runtime unknown |
| HRADM-FNC-AUD-002 | HRADM-SCR-AUD-002 | Import history | Filter/page import batches and inspect result summaries | `/api/hr-admin/import-batches` family | import history/audit permission | Read/filter/paginate | Static verified; runtime unknown |

## Potential Gaps and Runtime Questions

| Gap ID | Area | Observation | Required Phase 2 confirmation |
| --- | --- | --- | --- |
| HRADM-GAP-001 | All | Static scan found many conditionally disabled controls. Most appear tied to permissions, row selection, status, locks, or data readiness. | Verify disabled states are explained, accessible, and recoverable. |
| HRADM-GAP-002 | Payroll | Payroll state transitions depend heavily on locked inputs, review status, published outputs, provider state, and statutory declaration state. | Execute complete close-cycle data paths and negative locked-state checks. |
| HRADM-GAP-003 | Imports | Import workbenches expose sample/copy/download/preview/commit behavior. | Verify duplicate rows, invalid rows, partial success, audit history, and user-facing error copy. |
| HRADM-GAP-004 | Reports | Report exports and manifest/evidence links are statically present. | Verify every export generates correct CSV, audit record, permission denial, and compact table layout. |
| HRADM-GAP-005 | Modals/drawers | HR Admin uses several inline detail panels, query-selected panels, `details` disclosures, and review pages. A single modal/drawer pattern is not universal. | Decide final unified UI model and verify every detail/update operation follows the approved compact pattern. |
| HRADM-GAP-006 | Hidden/role-specific screens | Permission metadata is present, but exact visibility requires real sessions. | Run role matrix with HR admin, payroll, finance, manager, employee, tenant admin, and restricted users. |
| HRADM-GAP-007 | Placeholders | No broad `coming soon` pattern was found in HR Admin static discovery. Governance-disabled edit text appears intentional. | Confirm no empty-action buttons, unreachable search destinations, or dead links in browser. |

## Module-Wise Discovery Coverage

| Module | Screen coverage | Functionality coverage | Remaining unknowns |
| --- | --- | --- | --- |
| Workforce | High | High | role visibility, import edge cases, form validation |
| Documents | High | Medium | upload/download/review runtime behavior |
| Time/Leave/Roster | High | High | conflict resolution, rollout side effects, attendance derivation results |
| Payroll | High | High | full close-cycle state transitions and authorization |
| Reports | High | Medium | export correctness, evidence manifests, large data pagination |
| Notifications | High | High | provider diagnostics, retry outcomes, preview/test sends |
| Organization/Workflow | High | Medium | workflow trigger behavior and assignment conflicts |
| Audit/Imports | High | Medium | audit completeness and import batch traceability |

Phase 2 is not started by this matrix.
