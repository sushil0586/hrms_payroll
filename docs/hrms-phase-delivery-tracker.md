# HRMS Phase Delivery Tracker

## 1. Purpose

This document divides HRMS completion into execution phases and defines how documentation should be updated after each phase.

The goal is simple:

- complete HRMS in ordered phases
- close each phase with a documented summary
- capture what changed in backend, models, frontend, and product behavior
- keep the repository docs aligned with the real implementation state

This document should be treated as the operating tracker for phase completion.

---

## 2. How We Will Work

We will execute HRMS in phases.

At the end of each phase, we will update documentation in a structured way.

For every completed phase, we will record:

- phase objective
- major backend changes
- model changes
- API or workflow changes
- high-level frontend changes
- mobile changes if relevant
- test and quality changes
- what is now complete
- what remains open

This keeps the docs useful for:

- engineering continuity
- product planning
- future payroll readiness
- onboarding new contributors

---

## 3. Phase Breakdown

## Phase 0: Platform Hardening

Objective:

Make the current codebase safe to evolve and safe to trust.

Scope:

- lint setup
- CI setup
- backend test foundation
- permission review
- live versus demo behavior cleanup
- high-risk backend refactoring where needed

Expected outcome:

- the project has a reliable engineering baseline

Completion signals:

- lint works
- CI runs core checks
- first meaningful backend tests exist
- critical permission gaps are closed or explicitly tracked

## Payroll Phase 0: Source-Data Readiness

Objective:

Start payroll safely by validating HRMS source data before any payroll calculation, statutory logic, payslip, or payment file is introduced.

Scope:

- tenant-scoped payroll readiness API
- configurable readiness profile lookup through `payroll.readiness_profile.v1`
- employee/org/source-data blockers and warnings
- compact HR admin readiness workspace
- Playwright e2e and visual coverage

Current implementation progress:

- `/api/v1/hr-admin/payroll-readiness/` returns period metadata, resolved configuration, summary counts, status counts, row-level blockers/warnings, and source counts.
- `/hr-admin/payroll-readiness` provides a modern table-first workspace with search, period filters, status tabs, compact metrics, and a right-side employee trace panel.
- Backend tests prove HR admin access, employee denial, and tenant configuration override behavior.
- Browser coverage includes route smoke, focused payroll-readiness e2e flow, and laptop/mobile visual baselines.

Remaining scope:

- salary structures and component configuration
- immutable payroll input snapshots
- calculation engine and explainable traces
- statutory packs, payslips, registers, bank files, and finance handoff

## Payroll Phase 1A: Calendars And Pay Groups

Objective:

Create the configurable SaaS foundation that decides which employees belong to which payroll calendar, run period, and pay group before salary inputs or calculations are introduced.

Scope completed:

- tenant-scoped `PayrollCalendar`, `PayrollPeriod`, `PayGroup`, and `PayGroupAssignment` models
- HR admin aggregate setup API at `/api/v1/hr-admin/payroll-setup/`
- create/update APIs for payroll calendars, payroll periods, pay groups, and pay group assignments
- model/API protection against overlapping periods in the same calendar
- model/API protection against overlapping active employee pay group assignments
- modern HR admin setup workspace at `/hr-admin/payroll-setup`
- Playwright route/flow coverage and laptop/mobile visual baselines

Remaining payroll foundation scope:

- calculation engine and explainable traces
- statutory packs, payslips, registers, bank files, and finance handoff

## Payroll Phase 1B: Salary Components And Structures

Objective:

Create the configurable compensation foundation that can later feed payroll input snapshots and calculation runs without hardcoding salary logic.

Scope completed:

- tenant-scoped `SalaryComponent`, `SalaryStructure`, `SalaryStructureVersion`, `SalaryStructureComponent`, and `EmployeeSalaryAssignment` models
- component catalog fields for type, value type, formula reference, applicability rule reference, rounding rule reference, accounting mapping reference, statutory treatment reference, payslip visibility, and config snapshots
- effective-dated salary structure versions with active overlap protection
- effective-dated employee salary assignments with active overlap protection
- HR admin aggregate salary setup API at `/api/v1/hr-admin/salary-setup/`
- create/update APIs for salary components, salary structures, structure versions, structure component lines, and employee salary assignments
- modern HR admin salary setup workspace at `/hr-admin/salary-setup`
- Playwright route/flow coverage and laptop/mobile visual baselines

Remaining payroll foundation scope:

- formula/rule evaluation engine
- calculation engine and explainable traces
- statutory packs, payslips, registers, bank files, and finance handoff

## Payroll Phase 1C: Input Snapshots And Locking

Objective:

Create the immutable input-freeze foundation that future payroll calculations can consume without recalculating from mutable live HRMS data.

Scope completed:

- tenant-scoped `PayrollRun` and `PayrollInputSnapshot` models
- payroll runs scoped to periods and optionally pay groups
- configurable run references for input profile, snapshot schema, and collection config
- employee input snapshots covering employee, organization, salary, attendance, leave, lifecycle, document, banking, validation, and config source families
- source hashing for snapshot traceability
- model/API immutability once an input snapshot is locked
- HR admin aggregate input snapshot API at `/api/v1/hr-admin/payroll-input-snapshot-setup/`
- create/update APIs for payroll runs and payroll input snapshots
- lock API at `/api/v1/hr-admin/payroll-runs/<id>/lock-inputs/` with blocked-snapshot protection
- modern HR admin input review workspace at `/hr-admin/payroll-inputs`
- Playwright route/flow coverage and laptop/mobile visual baselines

Remaining payroll foundation scope:

- automated source collection from finalized HRMS modules
- formula/rule evaluation engine
- calculation engine and explainable traces
- statutory packs, payslips, registers, bank files, and finance handoff

## Payroll Phase 2A: Formula And Rule Engine Foundation

Objective:

Create the configurable, tenant-scoped formula/rule foundation that payroll calculations can later consume without hardcoded salary, statutory, proration, rounding, or applicability logic.

Scope completed:

- tenant-scoped `PayrollRuleDefinition`, `PayrollRuleVersion`, and `PayrollRuleEvaluation` models
- rule classification for formula, applicability, rounding, proration, validation, statutory, and accounting behavior
- effective-dated rule versions with draft/active/retired status and active-overlap protection
- safe `safe_expr_v1` evaluator with whitelist AST parsing, approved functions, decimal arithmetic, dependency capture, and trace output
- preview evaluation against manual context or locked payroll input snapshots
- persisted preview traces for audit and explainability review
- HR admin aggregate rule setup API at `/api/v1/hr-admin/payroll-rules-setup/`
- create/update APIs for payroll rule definitions and versions
- preview API at `/api/v1/hr-admin/payroll-rule-versions/<id>/evaluate/`
- modern HR admin rule workspace at `/hr-admin/payroll-rules`
- Playwright route/flow coverage and laptop/mobile visual baselines

Remaining payroll foundation scope:

- draft payroll run calculation that consumes locked snapshots and active rule versions
- calculation lines linked to components, rule versions, source snapshots, and intermediate traces
- automated source collection from finalized HRMS modules
- statutory packs, payslips, registers, bank files, and finance handoff

## Payroll Phase 2B: Draft Payroll Calculation Engine

Objective:

Create the first draft payroll calculation engine that consumes locked input snapshots and active configurable rule versions without publishing payroll outputs or hardcoding tenant salary logic.

Scope completed:

- tenant-scoped `PayrollRunCalculation` and `PayrollCalculationLine` models
- draft calculation attempts with attempt numbers, statuses, calculation profile references, selected rule snapshots, totals, and errors
- calculation lines linked to payroll run, locked input snapshot, employee, rule version, component code/name, expression, amount, source hash, result snapshot, context snapshot, and trace snapshot
- configured rule ordering, line type, component identity, output context path, and calculation profile behavior through config snapshots
- safe formula chaining so earlier calculated outputs can feed later active rule versions
- rerun behavior that preserves history by marking prior draft/completed attempts as superseded
- HR admin aggregate calculation API at `/api/v1/hr-admin/payroll-calculation-setup/`
- draft calculation trigger at `/api/v1/hr-admin/payroll-runs/<id>/calculate-draft/`
- modern HR admin calculation workspace at `/hr-admin/payroll-calculations`
- Playwright route/flow coverage and laptop/mobile visual baselines

Remaining payroll foundation scope:

- richer calculation validation catalog for component prerequisites, missing outputs, and statutory profile blockers
- payslips, registers, statutory packs, bank files, accounting exports, and finance handoff

## Payroll Phase 3A: Review, Exceptions, Approval, And Final Lock

Objective:

Create the configurable close-control layer between draft calculation and payroll outputs so tenants can review exceptions, approve payroll, and final-lock a run without hardcoded business rules.

Scope completed:

- tenant-scoped `PayrollRunReview`, `PayrollRunException`, and `PayrollRunApproval` models
- final-lock metadata on `PayrollRun` with model/API immutability after lock
- configurable references for review profiles, approval profiles, exception policies, and final-lock behavior
- review opening from completed calculations with exception snapshots and totals snapshots
- manual exception creation plus accepted/resolved/rejected decision workflow
- submit, approve, reject, and final-lock service/API operations
- HR admin aggregate review API at `/api/v1/hr-admin/payroll-review-setup/`
- action APIs for opening, submitting, approving, rejecting, locking, creating exceptions, and deciding exceptions
- modern HR admin review workspace at `/hr-admin/payroll-review`
- backend API tests for happy-path approval/final lock, blocker exception gating, and review setup payloads
- Playwright route/flow coverage for final lock, exception detail, approval trail, and no-horizontal-overflow checks

Remaining payroll foundation scope:

- richer calculation validation catalog for component prerequisites, missing outputs, and statutory profile blockers
- statutory packs, bank files, accounting exports, and finance handoff

## Payroll Phase 3B: Output Publishing, Payslips, And Registers

Objective:

Generate controlled payroll output artifacts from final-locked payroll reviews so payslips and registers can be published without mutating calculations or hardcoding output templates.

Scope completed:

- tenant-scoped `PayrollOutputBatch` and `PayrollOutputArtifact` models
- generated and published output-batch statuses plus output artifact kinds for payslip, register, bank advice, accounting export, and statutory report
- configurable output profile references, artifact template references, and output config snapshots
- generated payslip artifacts per employee using locked calculation lines, source hashes, and employee totals
- generated run-level payroll register artifact using employee summary rows and review totals
- publish operation that stamps batch/artifact publish actor and timestamp
- published output-batch and artifact immutability for output-critical fields
- HR admin aggregate output API at `/api/v1/hr-admin/payroll-output-setup/`
- action APIs for generating outputs from a locked review and publishing an output batch
- modern HR admin output workspace at `/hr-admin/payroll-outputs`
- backend API tests for generate/publish and final-locked review gating
- Playwright route/flow coverage plus laptop/mobile visual baselines for published outputs

Remaining payroll foundation scope:

- richer calculation validation catalog for component prerequisites, missing outputs, and statutory profile blockers
- full-and-final settlement, output download/storage hardening, external finance integrations, and broader locked output audit trails

## Payroll Phase 3C: Finance Handoff, Bank Advice, Accounting Export, And Statutory Summary

Objective:

Create the configurable finance handoff layer after payroll outputs are published so bank advice, accounting export, and statutory summary artifacts can be generated and transmitted without mutating locked payroll calculations or published payslip/register output batches.

Scope completed:

- tenant-scoped `PayrollFinanceHandoff` model with generated, transmitted, accepted, and failed statuses
- finance handoff links to published `PayrollOutputBatch`, final-locked review, and final-locked payroll run
- configurable references for handoff profile, bank file profile, accounting export profile, statutory pack, artifact key prefix, and transmission/config metadata
- generated bank advice artifact using published payslip totals, banking snapshots, source artifact ids, and source hashes
- generated accounting export artifact using published payslip gross, deduction, and net-pay summary rows
- generated statutory summary artifact using deduction, tax, and employer-contribution lines with statutory treatment references
- transmit operation that publishes finance artifacts and stamps transmission actor/timestamp metadata
- model/API gating so finance handoff requires a published payroll output batch
- HR admin aggregate finance handoff API at `/api/v1/hr-admin/payroll-finance-handoff-setup/`
- action APIs for generating handoff from an output batch and transmitting a handoff package
- modern HR admin finance handoff workspace at `/hr-admin/payroll-handoff`
- backend API tests for generate/transmit and published-output-batch gating
- Playwright route/flow coverage plus laptop/mobile visual baselines for finance handoff

Remaining payroll foundation scope:

- richer calculation validation catalog for component prerequisites, missing outputs, and statutory profile blockers
- full-and-final settlement, durable file storage/downloads, real bank/accounting/statutory provider integrations, acknowledgement callbacks, and broader locked output audit trails

## Payroll Phase 4A: One-Time Adjustments, Arrears, Reimbursements, Loans, And Corrections

Objective:

Create the configurable one-time payroll input register that can support arrears, bonuses, incentives, reimbursements, loans, advances, deductions, corrections, and future full-and-final settlement without hardcoded tenant payroll behavior.

Scope completed:

- tenant-scoped `PayrollAdjustment` model
- configurable adjustment kind, direction, component code/name, salary-component link, profile refs, approval profile ref, source ref, reason, source periods, and config snapshots
- source hashing for adjustment traceability
- status lifecycle for draft, submitted, approved, rejected, applied, and voided adjustments
- service/API operations for create, submit, approve, reject, and apply
- model/API safeguards preventing new pending adjustments after payroll review starts
- immutable applied/voided adjustment records
- HR admin aggregate adjustment API at `/api/v1/hr-admin/payroll-adjustment-setup/`
- create/action APIs at `/api/v1/hr-admin/payroll-adjustments/`
- modern HR admin adjustment workspace at `/hr-admin/payroll-adjustments`
- backend API tests for create-submit-approve-apply and review-start gating
- Playwright route/flow coverage plus laptop/mobile visual baselines for payroll adjustments

Remaining payroll foundation scope:

- full-and-final settlement orchestration that composes adjustments, leave encashment, recoveries, and final dues
- richer calculation validation catalog for component prerequisites, missing outputs, and statutory profile blockers
- durable file storage/downloads, real bank/accounting/statutory provider integrations, acknowledgement callbacks, and broader locked output audit trails

## Payroll Phase 4B: Applied Adjustment Consumption In Draft Calculation

Objective:

Consume applied one-time payroll adjustments inside draft calculation attempts as source-traced calculation lines without hardcoding adjustment kinds, components, or formulas.

Scope completed:

- `PayrollCalculationLine` now supports rule-sourced and adjustment-sourced lines through configurable `line_source` metadata
- adjustment-sourced lines link back to `PayrollAdjustment` while preserving locked input snapshot, employee, component, amount, source hash, trace snapshot, and config snapshot evidence
- draft calculation consumes only applied adjustments for the same tenant and payroll run
- applied adjustments require a locked input snapshot before calculation consumption
- calculation totals include earning, deduction, reimbursement, employer-contribution, tax, and informational behavior using the existing line-type total rules
- calculation selection/error snapshots record applied adjustment consumption counts and source metadata
- HR admin calculation API exposes `line_source`, `line_source_label`, and `adjustment_id`
- `/hr-admin/payroll-calculations` shows rule-sourced and adjustment-sourced lines, updated totals, source detail, dependencies, and hash evidence
- backend API tests cover create-submit-approve-apply followed by draft calculation consumption
- Playwright calculation flow and laptop/mobile visual baselines cover the adjustment-sourced browser trace

Remaining payroll foundation scope:

- richer calculation validation catalog for component prerequisites, missing outputs, and statutory profile blockers
- durable file storage/downloads, real bank/accounting/statutory provider integrations, acknowledgement callbacks, and broader locked output audit trails

## Payroll Phase 4C: Full-And-Final Settlement Orchestration

Objective:

Create configurable full-and-final settlement packages that compose exit data, earned salary, leave encashment, recoveries, statutory placeholders, approvals, and applied payroll inputs without hardcoded tenant behavior.

Scope completed:

- tenant-scoped `PayrollSettlement` and `PayrollSettlementLine` models
- settlement packages link payroll run, employee, optional lifecycle exit record, optional locked input snapshot, profile refs, approval profile refs, calculation profile refs, source refs, totals snapshots, source hashes, and config snapshots
- settlement lines support configurable kinds for salary proration, leave encashment, notice recovery, loan recovery, advance recovery, bonus, arrear, gratuity, statutory, and other components
- service/API lifecycle for draft, submitted, approved, rejected, applied, and voided settlement packages
- model/API safeguards preventing pending settlements after payroll review starts
- applied/voided settlement package and line immutability
- apply operation generates applied payroll adjustments per settlement line so Phase 4B draft calculation consumption remains the single source-input path
- HR admin aggregate settlement API at `/api/v1/hr-admin/payroll-settlement-setup/`
- create/action APIs at `/api/v1/hr-admin/payroll-settlements/`
- modern HR admin settlement workspace at `/hr-admin/payroll-settlements`
- backend API tests for settlement create, line composition, submit/approve/apply, generated adjustments, and draft calculation consumption
- Playwright route/flow coverage plus laptop/mobile visual baselines for payroll settlements

Remaining payroll foundation scope:

- deeper statutory/component validation catalog for country packs and missing derived outputs
- durable file storage/downloads, real bank/accounting/statutory provider integrations, acknowledgement callbacks, and broader locked output audit trails

## Payroll Phase 4D: Calculation Validation Hardening

Objective:

Create the persisted validation layer that checks payroll runs before draft calculation so SaaS tenants can configure warning/blocker gates without hardcoded business rules.

Scope completed:

- tenant-scoped `PayrollValidationIssue` model
- configurable validation severity, category, and issue status enums
- validation issue links to payroll run, calculation, input snapshot, employee, and calculation line where applicable
- validation profile refs, source refs, source hashes, context snapshots, and config snapshots for audit-friendly issue evidence
- pre-calculation validation service that refreshes open run-level issues before every draft calculation attempt
- blockers for missing salary payloads, unlocked snapshots, source-data blockers, missing active payroll rules, and applied adjustments without locked snapshots
- warnings for source-data warnings, duplicate component-rule targets, pending adjustments, and pending settlements
- successful calculations attach warning/info issues to the generated calculation attempt and include validation counts in calculation snapshots
- blocker validation issues persist without creating a calculation attempt
- HR admin calculation setup API exposes validation summary counts, issue rows, and enum options
- `/hr-admin/payroll-calculations` now includes a validation issue register above calculation attempts
- backend API tests cover successful warning persistence and blocker gating
- Playwright calculation flow covers the validation register in the browser

Remaining payroll foundation scope:

- durable file storage/downloads, real bank/accounting/statutory provider integrations, acknowledgement callbacks, and broader locked output audit trails

## Payroll Phase 4E: Statutory And Component Validation Catalogs

Objective:

Expand the calculation validation layer with configurable component, output-path, dependency, line-type, and statutory profile catalogs so tenants can enforce country-pack and close-readiness checks without hardcoded payroll rules.

Scope completed:

- validation profile support for required component codes and required output paths
- validation profile support for duplicate output-path warnings
- validation profile support for allowed calculation line types
- validation profile support for required statutory pack, statutory treatment, and tax profile references
- validation profile support for required statutory mapping by line type
- static safe-expression dependency inspection before calculation
- dependency-order validation that blocks formulas depending on later rule outputs
- missing dependency validation that warns when a rule dependency is neither in locked source data nor prior rule outputs
- API-visible validation issues for missing required components, missing output paths, duplicate output paths, invalid line types, missing statutory profiles, missing statutory mappings, dependency order, and unresolved dependencies
- `/hr-admin/payroll-calculations` validation register now includes category summary chips for source-data, rule setup, statutory setup, adjustment, settlement, and other validation categories
- demo payroll calculation data includes source-data and statutory validation examples
- backend API tests cover missing required component, missing statutory profile, and dependency-order blockers
- Playwright calculation flow covers validation category grouping and statutory issue visibility

Remaining payroll foundation scope:

- durable file storage/downloads, real bank/accounting/statutory provider integrations, acknowledgement callbacks, and broader locked output audit trails

## Payroll Phase 4F: Durable Payroll Files And Download Governance

Objective:

Create durable, tenant-scoped payroll file metadata and guarded HR admin downloads for generated payroll artifacts without hardcoding customer-specific file formats or storage policy.

Completed:

- `PayrollOutputArtifact` now records storage provider reference, storage key, MIME type, file size, SHA-256 checksum, downloadable flag, retention policy reference, and generated local payload.
- Payslip artifacts now generate HTML file payloads by default while preserving configurable output profile and template references.
- Payroll register, bank advice, accounting export, and statutory summary artifacts now generate CSV payloads by default for finance portability.
- Artifact MIME types, storage provider refs, storage key prefixes, and retention policy refs resolve from output/finance profiles with platform defaults.
- Published output artifact immutability now covers file metadata and payload fields.
- HR admin output artifact payloads expose storage/download metadata and return download URLs only after artifacts are published.
- Added guarded download API at `/api/v1/hr-admin/payroll-output-artifacts/<id>/download/` with tenant isolation, publish-state gating, payload availability checks, and checksum verification.
- `/hr-admin/payroll-outputs` and `/hr-admin/payroll-handoff` now show file readiness, MIME type, size, storage key, provider ref, retention ref, and download action state.
- Demo payroll output and handoff data now includes durable file metadata matching the live API contract.
- Backend API tests cover generated metadata, blocked pre-publish downloads, published payslip downloads, transmitted finance artifact downloads, and checksum headers.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_outputs_generate_and_publish_locked_review or payroll_finance_handoff_generate_and_transmit"`
- `pnpm --dir web typecheck`
- `pnpm --dir web lint`

Still open:

- external object storage adapter and signed URL strategy
- employee self-service payslip download surface
- bank/accounting/statutory provider transmission integrations
- external acknowledgement callbacks and reconciliation statuses
- broader locked output audit trail beyond current publish/transmit timestamps and checksums

## Phase 1: HR Admin Backbone

Objective:

Make HR admin truly usable for employee and organization operations.

Scope:

- employee create, edit, detail, and access flows
- manager assignment flows
- organization masters CRUD completion
- search and filters
- validation and admin UX polish

Expected outcome:

- HR teams can operate the people-data core without engineering support

Completion signals:

- employee and organization administration works end-to-end
- access and manager assignment are usable
- admin flows have reliable UX states

Current implementation progress:

- employee master validation now blocks duplicate employee codes and self-manager assignment
- employee access provisioning now requires at least one role and prevents empty-access saves
- employee directory and employee detail now expose access state, membership state, and assigned-role counts for read-first admin review
- employee status and access provisioning now stay aligned through backend rules that block inactive or exited employees from keeping live access states
- employee access form now warns and blocks save attempts when HR tries to keep active access for an inactive or exited employee
- employee master saves now enforce structural consistency across branch/legal entity, branch/location, cost center/legal entity, department/business unit, and designation/grade mappings
- employee form options now expose relation metadata and dynamically narrow dependent selects so invalid structural combinations are discouraged before submit
- employee master validation now also enforces date-of-birth, joining-date, probation, and confirmation-date consistency rules
- employee access flow now offers offboarding-safe defaults for suspended or revoked access recovery during employee status changes
- employee review surfaces now expose structural completeness warnings and access-readiness warnings directly in the directory and detail view
- organization master saves now block duplicate codes inside a tenant and reject self-parent hierarchy assignments for business units and departments
- organization edit forms now avoid offering the current business unit or department as its own parent, keeping basic hierarchy maintenance safer
- organization review now supports search, active-state filtering, selected-record inspection, and richer dependency detail so structure audits can happen from one screen
- organization selected-record detail now exposes dependency counts such as linked employees, child hierarchy usage, and related structural mappings before an HR admin edits the master
- organization deactivation is now guarded so structural records cannot be inactivated while they still have linked employees or unresolved hierarchy dependencies
- organization review surfaces now expose list-level warning states and edit-impact messaging so risky master records are easier to identify before structural edits are attempted
- organization API snapshots now expose broader dependency counts directly in catalog data so frontend review screens can explain downstream impact without extra per-record lookups
- organization edit forms now guide HR toward cleanup actions before inactivation by surfacing dependency-aware review shortcuts for linked employees and structural records
- employee review now exposes direct-report counts, manager-only filtering, reassignment-risk visibility, and manager access warnings so reporting-line cleanup is easier during employee administration

## Phase 2: Policy Execution

Objective:

Make leave and attendance configuration behave correctly at runtime.

Scope:

- leave rule enforcement
- attendance rule enforcement
- policy assignment clarity
- workflow template maturity for policy-driven actions

Expected outcome:

- policies are not just stored; they actually drive business behavior

Completion signals:

- major leave and attendance rules are enforced in real flows
- approvals and policy effects are consistent

Current implementation progress:

- attendance regularization now blocks locked attendance records, duplicate pending requests, and invalid requested punch ordering
- leave denial-path coverage now proves backdated, notice-period, attachment-required, probation-ineligible, and insufficient-balance rejections through the ESS API
- platform-side tenant onboarding foundation now exists with tenant onboarding records, first-admin provisioning, onboarding checklists, and activation flow
- platform policy-pack foundation now exists with policy packs, delegation rules, tenant adoption records, and platform staff APIs
- platform policy adoption now creates real tenant runtime leave and attendance records instead of storing adoption as metadata only
- tenant runtime leave and attendance records now carry baseline source metadata, platform-governed lock metadata, and delegation state
- HR admin leave and attendance policy edits now enforce lock, approval-required, and clone-first governance rules for platform-managed runtime policies
- HR admin can now detach clone-only leave and attendance policies into tenant-owned editable clones without breaking current references
- cloned leave types, shifts, and holiday calendars now also carry delegation metadata and enforce baseline governance rules in HR admin APIs
- cloned leave types, shifts, and holiday calendars can now also be detached into tenant-owned editable clones without breaking current references
- HR admin APIs now expose normalized governance-state and lineage-summary fields so frontend surfaces can render lock, detach, and baseline-ownership state directly
- HR admin frontend list and edit screens now render governance badges, lineage notices, detach actions, and direct-edit gating for leave, attendance, shift, and holiday master records
- HR admin edit forms now disable governed platform-locked controls across leave, attendance, shift, and holiday master surfaces instead of relying only on save-time rejection
- backend smoke coverage now proves leave policy assignment resolution across all currently supported leave assignment scopes including employee, legal entity, branch, department, grade, and employment type, with manual priority kept as the HR override, equal-priority matches falling back to the more granular scope, combined matching scopes outranking broader single scopes when priority is equal, ambiguous active overlaps at the same priority and same granularity blocked at save time, plus a leave submission outcome controlled by the winning leave policy assignment
- backend smoke coverage now also proves leave lifecycle runtime behavior for employee withdrawal of pending leave, policy-blocked withdrawal, withdrawal notice-window blocking, direct cancellation of approved leave, cancellation notice-window blocking, attachment-required cancellation blocking, cancellation requests that require reapproval before final cancellation, and rejection of cancellation reapproval that restores the approved leave state
- backend smoke coverage now proves attendance preview derivation for holiday, half-day, late, and overtime outcomes, proves holiday-versus-weekly-off precedence, and proves that regularization approval rewrites the attendance record from runtime policy evaluation including missing-punch `absent` derivation
- backend smoke coverage now also proves attendance policy assignment resolution across all currently supported attendance assignment scopes including employee, legal entity, branch, location, department, grade, and employment type, with manual priority kept as the HR override, equal-priority matches falling back to the more granular scope, combined matching scopes outranking broader single scopes when priority is equal, ambiguous active overlaps at the same priority and same granularity blocked at save time, plus employee shift assignment resolution, longer weekly-rotation sequence resolution, temporary-override-versus-rotation precedence, and regularization outcomes controlled by the winning attendance policy and shift assignments

## Phase 3: Lifecycle Completion

Objective:

Complete employee journey operations from joining through exit.

Scope:

- onboarding checklist depth
- confirmation flow
- movement maturity
- exit clearance depth
- rehire readiness
- workflow and document linkage

Expected outcome:

- lifecycle feels like a true product area, not only a model scaffold

Completion signals:

- onboarding through exit flows work end-to-end
- major lifecycle states are visible and operable

Current implementation progress:

- lifecycle saves are no longer passive side records only; onboarding, probation, movement, and exit actions now drive key employee-master state changes where appropriate
- completed onboarding now requires actual joining readiness and synchronizes employee joining date plus draft-to-active activation into the employee master
- completed onboarding now also evaluates tenant document requirement rules and blocks lifecycle completion while due mandatory documents are missing or still unverified
- onboarding checklist payloads now normalize item shape, expose checklist progress counts, and distinguish blocking checklist items from non-blocking ones
- onboarding checklist payloads now also expose owner, due-date, overdue-count, and escalation-due-count signals for operational review
- onboarding checklist payloads now also expose item-level action history and last-action metadata when owners, due dates, or completion states change
- onboarding checklist items can now trigger in-app overdue and escalation notifications to the configured owner, and those system actions are captured in item history
- onboarding checklist items can now route escalations to a separate fallback owner through `escalation_owner`
- onboarding checklist items can now also auto-reassign the live owner to that fallback escalation owner through `auto_reassign_on_escalation`
- onboarding payloads and list surfaces now also expose normalized attention state, urgency rank, next due date, next escalation date, and a queue-ready attention summary
- confirmed and extended probation reviews now synchronize employee probation-end and confirmation dates into the employee master
- completed movements now require at least one real target change, validate structure consistency against employee master rules, and apply target org/reporting changes back to the employee record
- exit approval and completion now enforce stronger date sequencing, prevent completion while employee access is still live, and synchronize employee status to `on_notice` or `exited`
- exit clearance payloads now normalize item shape, expose clearance progress counts, and block final exit completion while required blocking clearance items remain open
- exit clearance payloads now also expose owner, due-date, overdue-count, and escalation-due-count signals for offboarding review
- exit clearance payloads now also expose item-level action history and last-action metadata when owners, due dates, or completion states change
- exit clearance items can now trigger in-app overdue and escalation notifications to the configured owner, and those system actions are captured in item history
- exit clearance items can now route escalations to a separate fallback owner through `escalation_owner`
- exit clearance items can now also auto-reassign the live owner to that fallback escalation owner through `auto_reassign_on_escalation`
- exit payloads and list surfaces now also expose normalized attention state, urgency rank, next due date, next escalation date, and a queue-ready attention summary
- rehire-ready onboarding now exists for exited employees, using exit eligibility and post-exit joining-date rules before reactivating the employee master and logging a rehire lifecycle event
- onboarding payloads now expose rehire context plus required-document and missing-document counts so frontend review surfaces can explain readiness before completion
- onboarding creation can now automatically seed a real lifecycle workflow instance when the onboarding template code matches an active workflow template trigger
- onboarding creation can now also seed checklist items directly from the active lifecycle workflow template steps, preserving source-template metadata and first owner hints
- onboarding template-seeded checklist items can now also derive due dates from workflow-step anchor rules and refresh those due dates when the onboarding milestone date changes later
- lifecycle workflow template editing now also supports fallback anchor candidates for those due-date rules and rejects invalid lifecycle anchors at save time
- lifecycle workflow template editing now also supports `business_days` offsets, and runtime derivation can skip weekends plus matching tenant holiday-calendar dates for seeded lifecycle items
- template-derived lifecycle items now also preserve custom non-working weekday definitions in their stored SLA metadata so refreshed due dates continue using the same rule semantics
- HR admin workflow options now also expose frontend-ready lifecycle SLA authoring metadata including supported rule fields, offset-unit choices, non-working weekday values, and trigger-specific due-anchor presets so clients do not need to hardcode those rule contracts
- exit clearance can now automatically seed a lifecycle workflow instance when the clearance snapshot carries a matching active workflow template trigger code
- exit clearance can now also seed clearance items directly from the active lifecycle workflow template steps, preserving source-template metadata and first owner hints
- exit template-seeded clearance items can now also derive due dates from workflow-step anchor rules and refresh those due dates when the exit milestone date changes later
- the same workflow-template rule validation now protects exit clearance SLA rules too, so fallback anchor authoring is safer before runtime records are created
- the same workflow-template SLA engine now also applies holiday-aware business-day offsets for exit clearance when templates opt into working-day-based due rules
- backend smoke coverage now proves onboarding completion sync, document-gated onboarding blocking, probation confirmation sync, movement application, blocked exit completion with live access, completed exit status synchronization, eligible rehire completion, and blocked ineligible rehire attempts
- backend smoke coverage now also proves onboarding checklist normalization/progress, template-driven checklist seeding, and onboarding workflow-instance creation from template code
- backend smoke coverage now also proves blocking-clearance gating on exit completion, template-driven clearance seeding, and workflow-instance creation for exit clearance

## Phase 4: Documents and Letters Completion

Objective:

Move documents into a real operational workflow.

Scope:

- document upload lifecycle
- verification and rejection loop
- re-upload handling
- storage integration
- expiry tracking
- generated letters

Expected outcome:

- employee records and documents are system-managed

Completion signals:

- document workflows are usable in actual HR operations
- generated letters are available where expected

Current implementation progress:

- employee document records are now backed by real artifact handling in the current HR admin and ESS flows instead of behaving only as shallow metadata rows
- HR admin document review now supports verification, rejection, and re-upload-oriented operational loops from the employee-document queue
- onboarding readiness now exposes document attention state, missing-document counts, and document-derived blockers directly in lifecycle operations
- lifecycle queue payloads now also expose document-attention summaries including missing required, future due, expired, and expiring document counts
- HR admins can now trigger manual expiry reminders for selected employee-document records through a dedicated reminder endpoint
- the backend now also provides a scheduled document expiry reminder command so recurring scans can emit reminder events without a manual queue action
- document notifications now cover onboarding attention required, employee upload submitted, employee re-upload requested, and expiry attention flows
- notification configuration seed data now includes document event definitions and templates in the demo bootstrap so the notification stack is testable from a fresh local setup
- generated HR letters and broader artifact-governance depth remain the main open items before this phase can be treated as fully closed

## Phase 5: Trust Layers

Objective:

Add the operational visibility needed for real HR teams.

Scope:

- notifications delivery maturity
- notification center
- workflow timelines
- audit viewers
- reports and exports
- operational dashboards

Expected outcome:

- users can understand what happened, what is pending, and what changed

Completion signals:

- trust layers exist across critical HRMS flows
- reporting and notification behavior is operationally useful

Current implementation progress:

- tenant-scoped notification channel configurations now exist for in-app, email, SMS, push, and WhatsApp delivery paths
- the backend now exposes an extensible notification delivery backend registry so later provider integrations can plug in without reshaping the core notification models
- pending notifications can now be processed through a dedicated management command, allowing queue records to move through real delivery handling instead of staying as queue-only state
- seeded demo workspaces now also carry default notification channel configurations so local environments can exercise multi-channel delivery behavior consistently

## Phase 6: HRMS Release Readiness

Objective:

Prepare HRMS as the stable platform base for payroll.

Scope:

- regression coverage improvement
- release-readiness review
- staging and supportability baseline
- unresolved gap review

Expected outcome:

- HRMS is complete enough for a serious pilot and stable enough for payroll foundation work

Completion signals:

- major HRMS areas meet release bar
- no major dependency remains on placeholder or demo-only behavior

Current implementation progress:

- first HRMS release-readiness gate is green across Django check, backend pytest, Python dependency check, web lint/typecheck/build, mobile typecheck, Playwright browser behavior, Playwright visual regression, and live-backend browser workflow checks
- critical JavaScript production audit findings have been cleared through the Next.js patch upgrade and root transitive dependency overrides
- one high-severity mobile Metro `image-size` audit advisory remains because the package audit feed currently reports no patched version
- pilot setup notes, pilot candidate release notes, known limitations, and the release-risk register are now documented for release-owner review

---

## 4. Documentation Update Rule After Every Phase

After each phase, update these docs:

1. `docs/hrms-execution-plan.md`
   Update current status, completed items, and next priority area.
2. `docs/hrms-first-completion-plan.md`
   Mark the completed phase and adjust remaining scope if priorities changed.
3. `docs/model-structure-and-relationships.md`
   Update when any important backend model or relationship changes.
4. `docs/nexora-target-gap-analysis.md`
   Update only if the phase materially changes our estimated distance from the final target.
5. This document
   Mark the phase as completed and add a phase summary entry.

---

## 5. Phase Completion Entry Template

Use this template at the end of each phase.

```md
## Phase X Completion Summary

Status:
- Completed on: YYYY-MM-DD

Objective achieved:
- Short summary of what this phase was meant to accomplish

High-level backend changes:
- Key service, API, workflow, permission, or processing changes

Model changes:
- New models added
- Existing models updated
- Relationship changes
- Migration-level impact summary

High-level frontend changes:
- New web modules, screens, or flows
- Major UX or interaction changes
- Admin, ESS, or MSS changes

Mobile changes:
- New mobile flows or improvements
- Session, offline, or native capability changes

Testing and quality changes:
- Tests added
- CI/lint/build changes
- Validation and reliability improvements

What is now complete:
- List of capabilities now considered done

Open items carried forward:
- What was intentionally left for the next phase

Docs updated:
- List of docs updated for this phase
```

---

## 6. Tracker Table

| Phase | Name | Status | Primary Outcome | Docs Updated |
|---|---|---|---|---|
| 0 | Platform Hardening | Completed | Safe engineering baseline | Yes |
| 1 | HR Admin Backbone | Completed | Usable employee and org operations | Yes |
| 2 | Policy Execution | Completed | Enforced leave and attendance behavior | Yes |
| 3 | Lifecycle Completion | Active | End-to-end employee journey operations | Yes |
| 4 | Documents and Letters Completion | Planned | Real document and record workflows | Pending |
| 5 | Trust Layers | Planned | Reports, notifications, audit, visibility | Pending |
| 6 | HRMS Release Readiness | Planned | Stable HRMS base for payroll | Pending |

---

## 7. Phase Closeout

## Phase 2: Policy Execution Closeout

Status:

- Complete
- Start date: 2026-06-18
- Last updated: 2026-06-18

Execution goal:

- move from HR admin backbone completion into real leave and attendance policy execution

Completed before this phase:

- Phase 0 platform hardening is complete
- Phase 1 HR admin backbone is complete
- employee master, employee access, organization master, review, and operability flows now pass the Phase 1 closeout bar

- leave rule enforcement now covers the main agreed submission, denial, lifecycle, and assignment-driven runtime branches
- attendance rule enforcement now covers derivation, regularization, assignment resolution, rotation behavior, override precedence, and holiday-versus-weekly-off runtime branches
- policy assignment outcomes are now deterministic, explainable, and protected from ambiguous same-priority same-granularity active overlaps
- the backend smoke suite now provides regression confidence on the core policy-execution paths that define this phase

Phase 2 closeout result:

- leave and attendance configuration now affects real operational outcomes instead of acting as passive setup only
- policy assignment resolution is now trustworthy across supported scopes, overrides, granularity fallback, and multi-scope competition
- platform-governed baseline policies can be adopted, detached, and operated safely without breaking tenant runtime behavior
- the agreed backend policy-execution scope for HRMS is complete and ready to hand off into Phase 3 lifecycle depth

## Phase 3: Lifecycle Progress

Status:

- `Effectively Complete For Agreed Scope`

What moved in this pass:

- lifecycle save paths now update employee master state instead of acting only as isolated operational rows
- lifecycle bulk status actions now reuse the same guarded save logic as direct record edits, keeping queue actions and detail edits consistent
- lifecycle validation depth now covers onboarding completion readiness, probation extension and confirmation rules, movement target validity, exit date sequencing, and access-safe exit completion
- lifecycle onboarding readiness now also includes due mandatory document compliance based on tenant document requirement rules
- lifecycle now supports a first rehire path by reactivating exited employees only when their exit record marks them as eligible and the new joining date is later than the previous exit date
- lifecycle onboarding now has a stronger data contract through normalized checklist snapshots and first real workflow instantiation from onboarding template codes
- lifecycle onboarding now also auto-syncs mandatory document rules into document-derived checklist items with due-date, blocking, and compliance state
- lifecycle exit handling now has a stronger data contract through normalized clearance snapshots, structured completion gating, and first real workflow instantiation from exit clearance template codes
- lifecycle work items can now surface aging operational debt through overdue and escalation-due counters instead of only raw open-item counts
- lifecycle work items now also retain embedded audit history so operational changes are no longer invisible between edits
- lifecycle work items can now produce first real operational follow-through through owner-targeted in-app reminder and escalation notifications
- lifecycle work items now support a first escalation handoff path by separating primary owner from fallback escalation owner
- lifecycle work items now also support a first escalation action path by optionally transferring ownership during escalation
- lifecycle work items now also persist explicit escalation state with timestamped first-escalation markers, preventing duplicate first-time escalation behavior on later saves
- lifecycle list and queue surfaces now also order onboarding and exit records by urgency rank using shared attention-state logic instead of falling back to creation time only
- HR admin workflow-template editing now consumes backend lifecycle SLA authoring metadata so the frontend no longer hardcodes lifecycle rule contracts
- HR admin onboarding and exit authoring now supports structured lifecycle item editing and workflow-template trigger selection instead of relying only on raw JSON-style payloads
- lifecycle onboarding and exit review surfaces now expose stronger progress, attention, next-due, escalation, and document-blocker context for operations teams

Remaining optional Phase 3 extension work:

- broader lifecycle-template execution beyond the now-working onboarding and exit bootstrap if more lifecycle milestones should become template-driven later
- richer lifecycle analytics and SLA intelligence beyond the current anchor, fallback-anchor, business-day, attention-state, next-due, and urgency-ordering baseline
- additional frontend polish, analytics, and reporting depth around lifecycle operations if the product wants a denser operational cockpit before payroll begins
- policy-driven denials and approvals are trustworthy
- Phase 1 stability remains intact while runtime enforcement deepens

---

## 8. Phase Completion Log

## Phase 0 Completion Summary

Status:

- Completed on: 2026-06-18

Objective achieved:

- established a trustworthy engineering and access-control baseline before deeper HR admin completion work

High-level backend changes:

- added backend smoke coverage for auth, ESS, MSS, HR admin denial, unauthenticated denial, and manager-scope denial
- enforced workspace-level HR admin role gating in backend APIs
- expanded session payload to expose default-membership role codes and workspace-access hints for frontend gating

Model changes:

- no core model or relationship changes were required
- no database migrations were introduced in this phase

High-level frontend changes:

- configured non-interactive linting and verified typecheck baseline
- added workspace-level gating for HR admin, ESS, and MSS entry points
- made demo mode explicit through environment control
- added operator-facing workspace error states for live-load failures

Mobile changes:

- no direct mobile code changes in this phase
- mobile remained part of the CI baseline and live-vs-demo review

Testing and quality changes:

- added first CI workflow across web, mobile, and backend checks
- added first backend smoke suite and expanded deny-path coverage
- documented release-quality baseline for later phases

What is now complete:

- engineering baseline checks
- first access-control hardening pass
- explicit demo-mode discipline for the web data layer
- initial trustable workspace behavior for ESS, MSS, and HR admin
- documented backend decomposition targets for the next phase

Open items carried forward:

- broader regression coverage beyond smoke tests
- actual backend view decomposition work during Phase 1

Docs updated:

- `docs/hrms-execution-plan.md`
- `docs/hrms-first-completion-plan.md`
- `docs/hrms-phase-delivery-tracker.md`
- `docs/phase0-permission-and-demo-review.md`
- `docs/permission-workspace-matrix.md`
- `docs/phase0-backend-decomposition-targets.md`
- `docs/phase0-release-quality-baseline.md`

## Phase 1 Completion Summary

Status:

- Completed on: 2026-06-18

Objective achieved:

- made HR admin employee and organization operations dependable enough for real usage before moving into policy execution

High-level backend changes:

- strengthened employee-master validation, lifecycle date validation, access-status discipline, and organization change-control rules
- expanded HR admin selectors and payloads with access state, dependency counts, direct-report visibility, and review-oriented warning signals
- added guided cleanup support around organization deactivation and strengthened manager/access operability signals

Model changes:

- no new HRMS models were introduced
- no relationship changes or database migrations were required for the Phase 1 backbone closeout

High-level frontend changes:

- completed employee directory, detail, access, and structural review usability improvements
- completed organization catalog review, edit-impact visibility, and deactivation cleanup guidance
- improved employee, access, and organization forms with recovery guidance and field-specific validation feedback

Mobile changes:

- no direct mobile code changes were required in this phase
- mobile remains downstream of the now-stabilized HR admin backbone

Testing and quality changes:

- backend smoke coverage expanded across employee, access, manager, and organization backbone behavior
- final Phase 1 regression pass completed with backend smoke tests, Django checks, web lint, and web typecheck all green

What is now complete:

- employee master administration backbone
- employee access provisioning and status discipline
- organization master validation, review, and change-control backbone
- manager assignment review visibility and core admin UX reliability for HR backbone flows

Open items carried forward:

- deeper leave and attendance runtime enforcement
- broader release-readiness expansion beyond backbone smoke coverage

Docs updated:

- `docs/hrms-execution-plan.md`
- `docs/hrms-first-completion-plan.md`
- `docs/hrms-phase-delivery-tracker.md`
- `docs/phase1-hr-admin-backbone-matrix.md`

---

## 9. Suggested Working Habit

The simplest good rhythm is:

1. start a phase
2. implement the work
3. verify what actually changed
4. write the phase completion summary
5. update the linked docs before moving to the next phase

This keeps product understanding, technical understanding, and repo documentation aligned as the system evolves.
