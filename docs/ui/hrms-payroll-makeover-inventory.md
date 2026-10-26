# Payroll — screen and contract inventory

Prepared: 23 October 2026; updated 24 October 2026. Status: Phases 1–6 are complete within their linked records. [Phase 7 joined closure](hrms-payroll-phase7-joined-closure.md) is in progress under the [seven-phase makeover plan](hrms-payroll-makeover-plan.md).

## Scope rule

This family owns the HR Admin payroll journey from configuration through inputs, calculation, review, settlement, output publication, finance/provider delivery and payroll-specific reporting. It applies the established Leave/Attendance/Organization UI/UX patterns without changing pay formulas, statutory rules, accounting meaning, maker-checker policy, storage policy or release authority.

ESS payslips are an affected downstream consumer, not an owned makeover route. Finance Manager handoff pages, Tenant Admin financial calendars and Organization/Employee/Attendance/Leave sources are adjacent consumers or prerequisites. They receive focused regression and handoff checks where an owned payroll change can affect them; their entire screen families are not silently added to scope.

## Owning routes

| Slice | Route patterns | Primary work owned by the route | Phase |
| --- | --- | --- | ---: |
| Payroll configuration | `/hr-admin/payroll-setup` | Payroll calendars and periods, effective states and setup records | 2 |
| Salary configuration | `/hr-admin/salary-setup` | Components, structures, versions, component composition and employee assignments | 2 |
| Statutory configuration | `/hr-admin/payroll-statutory` | Packs, components, slabs, employer registrations and filing calendars | 2 |
| Rule configuration | `/hr-admin/payroll-rules` | Definitions, versions, effective dates and rule evaluation | 2 |
| Journey and readiness | `/hr-admin/time-to-payroll`; `/hr-admin/payroll-readiness` | Stage guidance, configuration/readiness signals and employee-level blockers | 3 |
| Inputs | `/hr-admin/payroll-inputs` | Runs, input snapshots, corrections, bulk import, reconciliation and input locking | 3 |
| Calculation | `/hr-admin/payroll-calculations` | Draft calculation, background job status, validation issues and recalculation | 3 |
| Review | `/hr-admin/payroll-review` | Review lifecycle, exceptions, decisions, submit, approve and lock | 4 |
| Adjustments | `/hr-admin/payroll-adjustments` | Create, submit, maker-checker approve/reject and apply | 4 |
| Settlements | `/hr-admin/payroll-settlements` | Settlement headers/lines, submit, maker-checker approve/reject and apply | 4 |
| Outputs | `/hr-admin/payroll-outputs` | Output generation, reconciliation, publication, downloads, signed access and audit | 5 |
| Finance handoff | `/hr-admin/payroll-handoff` | Handoff creation/transmission, acknowledgement, audit pack and provider delivery state | 5 |
| Providers | `/hr-admin/payroll-providers` | Connections, certification, schema packs, simulation, activation/archive, retries and launch rehearsal | 5 |
| Report hub | `/hr-admin/reports/payroll` | Payroll report entry points and current-cycle context | 6 |
| Core payroll reports | `/hr-admin/reports/payroll-register`; `/payroll-adjustments`; `/payroll-close-readiness`; `/payroll-input-exceptions`; `/payroll-review-exceptions`; `/payroll-settlements`; `/salary-variance` (all under `/hr-admin/reports`) | Complete population, operational filters, stable ordering, drill-down, CSV/manifest and print where supported | 6 |
| Output and finance reports | `/hr-admin/reports/bank-advice`; `/payslip-publication`; `/finance-handoff-exceptions`; `/provider-filing-receipts` | Publication/payment/delivery status, exception evidence and authorized export/download | 6 |
| Statutory reports | `/hr-admin/reports/compliance-summary`; `/challan-reconciliation`; `/pf-ecr-readiness`; `/esic-contribution-readiness`; `/professional-tax-readiness`; `/lwf-readiness`; `/tds-efile-readiness`; `/statutory-deductions`; `/statutory-filing-status` | Filing readiness, statutory totals, evidence packages, reconciliation and guarded exports | 6 |

Total: **35 route patterns** — 14 operational/configuration routes and 21 report routes. Dialogs, tabs, selected records, background-job states and report export formats are states of these routes rather than extra route patterns.

## Owned components and shared composition

The current operational surface is composed by route pages plus specialized clients including `payroll-setup-crud-console.tsx`, `salary-setup-crud-console.tsx`, `payroll-statutory-crud-console.tsx`, `payroll-rule-operations-panel.tsx`, `payroll-input-operations-panel.tsx`, `payroll-adjustment-actions-panel.tsx`, `payroll-review-exception-actions.tsx`, `payroll-settlement-actions-panel.tsx`, `payroll-close-actions-panel.tsx`, provider connection/certification/mapping/rehearsal clients, `payroll-cycle-journey.tsx` and `payroll-workflow-guide.tsx`.

The report routes generally pair a server page with a report workspace. Shared presentation should reuse the Accerio page intro, summaries, filter groups, named table regions, action menus, notices, dialogs and loading/error patterns already established by the earlier families. Domain-specific stages and consequences remain visible; a shared visual component must not flatten Setup, Locked, Review, Published, Transmitted and Filed into generic success states.

## Data, query and selection contracts

The source exposes separate setup projections for readiness, payroll setup, salary setup, input snapshots, adjustments, settlements, rules, calculation, review, outputs, finance handoff and provider connections. Each page must declare whether filtering and paging happen on the backend response, a complete bounded collection or the currently loaded array. A count derived from a page-sized response must be labelled as the current page and must not be presented as the complete matching population.

Every list/report implementation must inventory its actual query keys before editing. At minimum assess search, status/stage, payroll run/period, employee, legal entity, pay group, provider, exception/risk type, filing jurisdiction, date/as-of range, sort, page and page size where supported. Draft filter controls must remain separate from committed URL scope. Apply/Enter, Clear, copied URLs, reload, Back/Forward and pagination/export must use the committed scope consistently.

Selected records must be resolved through an authorized independent detail read where one exists. An off-page, off-filter, stale or foreign-tenant identifier must produce deliberate unavailable/denied feedback. It must not silently select the first loaded row. Cancel, successful actions and report handoffs must retain a safe, local return destination and the committed filters.

Report screens and CSV/manifest/print outputs must use one declared bounded collection and selector contract. Acceptance requires more records than the backend page cap, stable identity and tie-breaking, exact filter/sort parity, fail-closed behavior for missing/overlapping/changing pages, and no audit entry for an export that was not successfully assembled.

## Workflow and integrity boundaries

| Boundary | Required preservation |
| --- | --- |
| Effective configuration | Calendar/period, salary structure/version, statutory pack/slab/registration/calendar and rule version dates remain authoritative; visual grouping must not alter resolution order or overlap rules. |
| Input locking | Edits/imports before lock, reconciliation evidence, lock consequences and post-lock impacts remain distinct. A UI retry must not duplicate snapshots or bypass the existing lock. |
| Calculation | Draft calculation and background execution retain idempotency, job identity, validation issues and recalculation rules. Unknown transport outcomes must not be announced as completed. |
| Maker-checker | Adjustment and settlement creator/approver separation, eligible transitions and rejection rationale remain enforced at API and UI boundaries. |
| Review and close | Exception decisions, submit/approve/lock order and close blockers remain visible. Actions must report persisted current state after partial or repeated requests. |
| Outputs | Generate, reconcile, publish, download and signed-access grants remain separate authorities. Unpublished artifacts and revoked/expired grants must remain inaccessible. |
| Finance/provider delivery | Transmit, retry/requeue, callback and acknowledgement evidence retain provider identity, attempt history and safe retry semantics. UI changes must not imply settlement or bank acceptance before authoritative acknowledgement. |
| Statutory evidence | Readiness and generated packages are evidence for existing calculations. The makeover must not invent liability, filing success, challan payment or jurisdiction rules. |
| Audit and retention | Actor, event, version, export and artifact-access records stay append-only according to their existing services and retention policy. |

## Authorization and affected consumers

Inventory the permission catalog and the endpoint guard for every read and write. Page visibility is not evidence that a direct mutation is allowed. Test HR Admin read/manage boundaries, maker-checker separation, foreign-tenant IDs and signed artifact access. Provider secrets, bank data, statutory identifiers, salary components and employee-level calculations require masked/minimal presentation where the current contract calls for it.

Focused consumer checks must include:

- ESS published payslip list/detail/download and revoked or unpublished access;
- Finance Manager handoff/acknowledgement scope where the existing workspace supports it;
- Tenant financial-period/calendar locks that gate payroll periods;
- Attendance close, Leave inputs and employee/salary assignments consumed by payroll readiness or calculation;
- Organization/legal-entity/pay-group/provider identifiers used by filtering and exports;
- report export audit records and secure artifact downloads.

## Current evidence baseline

The HR Admin coverage tracker marks these routes as open: some have only a desktop render observation, while most workflow and report routes are unexecuted in the current UI/UX program. Existing backend smoke and pilot suites exercise substantial payroll behavior, including setup CRUD, input locking, calculation, adjustments, settlements, review, outputs, handoff, providers and reports. Those tests are valuable domain baselines; they do not establish current visual, responsive, filter/history, dialog or accessibility parity.

Phase 1 must reconcile existing payroll-focused browser suites and certifications before adding cases. Historical evidence may be reused as design and domain knowledge, but only source-matched executions can enter the new phase totals.

## Inventory completion gate

Phase 1 completed the following entry gate before Phase 2 implementation:

1. a machine-readable 35-route inventory with role, page kind, source component, query/filter controls, owned actions and phase;
2. current production-build captures at 1440, 1024, 768, 390 and 320 pixels for every route, plus short-height and expanded-dialog states where applicable;
3. populated, genuine-empty, filtered-no-match, loading, unavailable, permission-denied and stale-selection examples;
4. an endpoint/permission/action map and a state-transition map for every write;
5. a filter/export matrix for all 21 reports;
6. concrete defect findings separated from visual preference;
7. source/build provenance and an isolated fixture/cleanup record.

No payroll rule, statutory calculation or production-release claim follows from completing this documentation inventory.
