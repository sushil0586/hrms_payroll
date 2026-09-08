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
- full-and-final settlement, production secret-manager/cloud storage policy wiring, real bank/accounting/statutory provider integrations, webhook callback verification, and broader locked output audit trails

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
- production secret-manager/cloud storage policy wiring, real bank/accounting/statutory provider integrations, webhook callback verification, and broader locked output audit trails

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
- production secret-manager/cloud storage policy wiring, real bank/accounting/statutory provider integrations, webhook callback verification, and broader locked output audit trails

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
- production secret-manager/cloud storage policy wiring, real bank/accounting/statutory provider integrations, webhook callback verification, and broader locked output audit trails

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

- production secret-manager/cloud storage policy wiring, real bank/accounting/statutory provider integrations, webhook callback verification, and broader locked output audit trails

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

- production secret-manager/cloud storage policy wiring, real bank/accounting/statutory provider integrations, webhook callback verification, and broader locked output audit trails

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

- production secret-manager/cloud storage policy wiring beyond the local/signed-url placeholder strategy
- employee self-service payslip download surface
- bank/accounting/statutory provider transmission integrations
- external provider callback endpoints and webhook signature verification
- broader locked output audit trail beyond current publish/transmit timestamps and checksums

## Payroll Phase 4G: Provider Acknowledgements And Reconciliation

Objective:

Track external delivery acknowledgement and reconciliation state for finance handoff artifacts so bank advice, accounting exports, and statutory packs can move beyond local file generation while staying tenant-scoped, auditable, and configuration-driven.

Completed:

- Added tenant-scoped `PayrollProviderDelivery` records linked to finance handoff, output artifact, output batch, payroll run, and final-locked review lineage.
- Added configurable delivery route references for provider, channel, retry policy, acknowledgement profile, request snapshot, response snapshot, reconciliation snapshot, and config snapshot.
- Finance handoff transmission now creates submitted provider delivery rows for every published finance artifact.
- Reconciliation service records acknowledged, reconciled, failed, and rejected provider outcomes without hardcoded provider behavior.
- Failed and rejected acknowledgements require explicit failure evidence.
- Reconciled delivery rows capture checksum/file metadata evidence and move the parent finance handoff to accepted.
- Finance handoff setup/action API payloads now expose provider deliveries, delivery summaries, and delivery status options.
- Added acknowledgement API at `/api/v1/hr-admin/payroll-finance-handoffs/<id>/acknowledge/`.
- `/hr-admin/payroll-handoff` now shows provider delivery ledger, reconciliation count, external references, provider/channel refs, retry policy, attempts, and selected-artifact acknowledgement details.
- Demo payroll handoff data now includes reconciled provider delivery rows matching the live API contract.
- Backend API tests cover transmit-created delivery rows, reconciled acknowledgement, failed acknowledgement evidence gating, and setup summaries.
- Playwright e2e and laptop/mobile visual baselines cover provider acknowledgement visibility.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_finance_handoff or payroll_outputs_generate_and_publish_locked_review"`
- `pnpm --dir web typecheck`
- `pnpm --dir web lint`
- `pnpm --dir web exec playwright test tests/e2e/payroll-handoff-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff" --update-snapshots`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"`

Still open:

- real bank/accounting/statutory provider adapters
- provider webhook callback endpoints, idempotency keys, and signature verification
- async retry worker and provider-specific failure taxonomy
- production secret-manager/cloud storage policy wiring beyond the local/signed-url placeholder strategy
- employee self-service payslip download surface
- broader locked output audit trail beyond current publish/transmit/delivery evidence

## Payroll Phase 4H: Object Storage Adapterization And Signed Download Strategy

Objective:

Move payroll artifact file storage and download behavior behind a configurable adapter contract so SaaS deployments can use local/dev storage today and plug in object storage plus signed URLs later without hardcoding payroll file behavior.

Completed:

- Added `apps.payroll.storage` with a payroll artifact storage adapter contract for store, read, and signed-url behavior.
- Preserved current local generated-payload behavior through `payroll.storage.local.generated.v1`.
- Added a signed-url-capable placeholder adapter, `payroll.storage.signed_url.placeholder.v1`, to exercise the SaaS contract before a real object-store provider is installed.
- `PayrollOutputArtifact` now records storage object version, download strategy ref, signed-url support flag, and signed-url expiry seconds.
- Artifact generation now stores payloads through `store_payroll_artifact_payload` instead of building DB payload metadata directly in payroll output services.
- HR admin downloads now read through `read_payroll_artifact_payload` with checksum verification and return storage provider, object version, download strategy, checksum, and retention headers.
- HR admin artifact payloads now expose `storage_object_version`, `download_strategy_ref`, `supports_signed_url`, `signed_url_expires_in_seconds`, `signed_download_url`, and `signed_download_expires_at`.
- Finance provider delivery request snapshots now include storage provider, object version, download strategy, and signed-url capability.
- `/hr-admin/payroll-outputs` and `/hr-admin/payroll-handoff` now show object version, download strategy, and signed URL readiness in the storage governance panel.
- Demo payroll outputs and finance handoff data now match the expanded storage contract.
- Backend tests cover local streaming strategy, checksum/download headers, configured signed-url placeholder metadata, and finance delivery storage evidence.
- Playwright e2e and laptop/mobile visual baselines cover the visible storage strategy fields.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_outputs or payroll_finance_handoff"`
- `pnpm --dir web typecheck`
- `pnpm --dir web lint`
- `pnpm --dir web exec playwright test tests/e2e/payroll-outputs-flows.spec.ts tests/e2e/payroll-handoff-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-(outputs|handoff)" --update-snapshots`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-(outputs|handoff)"`

Still open:

- production secret-manager/cloud storage policy wiring
- provider webhook callback endpoints, idempotency keys, and signature verification
- async retry worker and provider-specific failure taxonomy
- broader locked output audit trail beyond current publish/transmit/delivery/download evidence

## Payroll Phase 4I: Employee Self-Service Payslip Downloads

Objective:

Expose published payroll payslips to the signed-in employee through an employee-scoped API and modern ESS workspace, while preserving tenant isolation, storage strategy metadata, checksum governance, and published-only visibility.

Completed:

- Added `/api/v1/me/payroll-payslips/` for employee-scoped published payslip history.
- Added `/api/v1/me/payroll-payslips/<id>/download/` with tenant, employee, kind, publish-state, downloadable-state, storage-adapter, and checksum verification gates.
- Added employee payslip serializers with period, run, pay date, file metadata, storage provider, object version, download strategy, signed URL readiness, retention policy, totals, line snapshots, source hash, and publisher metadata.
- Added the Next.js proxy route `/api/me/payroll-payslips/[itemId]/download` so employee downloads use the same authenticated browser path as other ESS files.
- Added `/ess/payslips` as a compact employee workspace with metrics, filters, payslip register, download action, payment summary, storage governance, source hash, and calculation lines.
- Added ESS navigation and quick-link access for Payslips.
- Demo data now includes a deterministic published payslip for `EMP-0042`, matching the signed-in employee demo context.
- Backend tests cover employee list/download success, manager cross-employee denial, unpublished artifact hiding, storage headers, and checksum-backed download content.
- Playwright e2e and laptop/mobile visual baselines cover the ESS payslip workspace.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_payslip or payroll_outputs"`
- `pnpm --dir web typecheck`
- `pnpm --dir web lint`
- `pnpm --dir web exec playwright test tests/e2e/ess-payslip-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "ess/payslips" --update-snapshots`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "ess/payslips"`

Still open:

- employee payslip download audit events, read receipts, and revocation history
- payslip publish notifications and employee acknowledgement workflow
- production secret-manager/cloud storage policy wiring
- provider webhook callback endpoints, idempotency keys, and signature verification
- async retry worker and provider-specific failure taxonomy
- broader locked output audit trail beyond current publish/transmit/delivery/download evidence

## Payroll Phase 4J: Payslip Access Audit, Read Receipts, And Publish Notifications

Objective:

Close the employee payslip distribution trust loop by recording publish, notification, download, and read acknowledgement events with tenant, actor, channel, request, storage, and notification evidence.

Completed:

- Added `PayrollArtifactAccessEvent` as a tenant-scoped access ledger linked to payroll output artifacts, output batches, runs, reviews, employees, actors, memberships, and optional notifications.
- Added access event types for published, notified, downloaded, read acknowledged, and revoked outcomes with configurable event/source channel references and metadata snapshots.
- Publishing payroll output batches now records payslip published events and triggers payslip publish notifications through the notification engine.
- Employee payslip downloads now record download events with request id, IP address, user agent, storage provider, storage key, object version, download strategy, and checksum evidence.
- HR admin payroll output downloads now record the same access evidence through an HR admin source channel.
- Added `/api/v1/me/payroll-payslips/<id>/read/` so employees can acknowledge a published payslip and mark the linked in-app payslip notification as read.
- Employee and HR admin artifact payloads now expose access summaries and recent access events.
- `/ess/payslips` now shows access trail metrics, latest notification state, read receipt status, and recent access events beside storage governance and calculation-line evidence.
- Demo notification data now includes a payroll payslip publish notification and filter option so the ESS inbox mirrors the live publish path.
- Backend tests cover publish/notified events, employee download audit, read acknowledgement, notification read-state linkage, invalid year filtering, and manager denial.
- Playwright e2e and laptop/mobile visual baselines cover the ESS payslip access trail and read receipt surface.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_payslip or payroll_outputs"`
- `pnpm --dir web typecheck`
- `pnpm --dir web lint`
- `pnpm --dir web exec playwright test tests/e2e/ess-payslip-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "ess/payslips" --update-snapshots`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "ess/payslips"`

Still open:

- production secret-manager/cloud storage policy wiring
- provider webhook callback endpoints, idempotency keys, and signature verification
- async retry worker and provider-specific failure taxonomy
- real bank/accounting/statutory provider adapters and certification flows
- auditor-facing drilldowns and public audit pack packaging

## Payroll Phase 4K: Signed URL Permission Binding, Revocation, And Access Audit Export

Objective:

Make signed artifact access SaaS-ready by binding signed URLs to explicit grants, validating token/identity/expiry/access limits at download time, recording revocations, and exporting artifact access evidence.

Completed:

- Added `PayrollArtifactSignedAccessGrant` for tenant-scoped, artifact-scoped signed access grants.
- Grant records link output artifact, output batch, payroll run, review, employee, issuing actor, target user/membership, storage evidence, expiry, access counts, and revocation metadata.
- Added signed grant statuses for active, revoked, and expired.
- Added `signed_url_issued` access events and linked access events to optional signed access grants.
- Grant issue service stores SHA-256 token hashes and a token prefix while returning the raw token only in the issued signed URL response.
- Grant validation checks artifact, token hash, expiry, max access count, issued user, and issued membership before a signed URL download can proceed.
- Employee and HR admin download endpoints now mark signed grant usage and link download events to the grant when `grant_id` and `token` are present.
- Added HR admin signed grant issue endpoint: `/api/v1/hr-admin/payroll-output-artifacts/<id>/signed-access/`.
- Added ESS signed grant issue endpoint: `/api/v1/me/payroll-payslips/<id>/signed-access/`.
- Added HR admin signed grant revocation endpoint: `/api/v1/hr-admin/payroll-signed-access-grants/<id>/revoke/`.
- Added artifact access audit CSV export endpoint: `/api/v1/hr-admin/payroll-output-artifacts/<id>/access-audit-export/`.
- HR admin payroll output payloads and UI now expose signed issued count, active/revoked/expired grant counts, latest expiry, download count, and access audit export.
- Demo payroll output data now carries the expanded access-summary and event fields.
- Backend tests cover signed grant issue, token-bound download, access-limit enforcement, revocation, revocation event creation, and CSV audit export.
- Playwright e2e and laptop/mobile visual baselines cover the HR admin access-governance panel.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_payslip or payroll_outputs"`
- `pnpm --dir web typecheck`
- `pnpm --dir web lint`
- `pnpm --dir web exec playwright test tests/e2e/payroll-outputs-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/e2e/ess-payslip-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-outputs" --update-snapshots`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-outputs"`

Still open:

- production secret-manager/cloud storage policy wiring
- object-store policy verification for customer credential isolation
- provider webhook callback endpoints, idempotency keys, and signature verification
- async retry worker and provider-specific failure taxonomy
- real bank/accounting/statutory provider adapters and certification flows
- auditor-facing drilldown UX and public audit pack packaging

## Payroll Phase 4L: Object-Storage Profile Contract Hardening

Objective:

Make payroll artifact storage SaaS-ready at the contract layer by validating object-store profiles, rejecting raw credentials, storing sanitized profile snapshots, and proving S3/GCS/Azure signed URL metadata paths without hardcoded storage assumptions.

Completed:

- Added a normalized payroll artifact storage profile contract for local, placeholder signed URL, S3, GCS, and Azure provider families.
- Required object-store profiles to provide provider-specific metadata such as bucket/container/account/project, region where needed, and `credential_ref`.
- Rejected raw credential fields recursively from payroll storage configuration snapshots so secrets cannot be persisted in output artifacts.
- Stored sanitized `storage_profile` snapshots on generated payslip, payroll register, and finance handoff artifacts.
- Added explicit object-store contract adapters for S3/GCS/Azure profile validation and signed URL metadata generation.
- Kept object-store contract storage behind `contract_test_mode`; real runtime usage now fails clearly until an SDK-backed backend is installed.
- Stopped unknown storage provider refs from silently falling back to local generated storage.
- Generated provider-style signed URL metadata for S3, GCS, and Azure provider refs while preserving existing HR admin and ESS artifact API shapes.
- Backend tests cover missing required object-store metadata, S3 contract-profile generation/publish/download, sanitized credential refs, and raw credential rejection.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_payslip or payroll_outputs"`

Still open:

- SDK-backed S3/GCS/Azure upload, read, signed URL, checksum, and object-version implementations
- credential resolver and secret-manager integration for tenant-scoped `credential_ref` values
- customer-managed key/KMS integration, lifecycle retention enforcement, malware scanning, and multi-region durability policy checks
- provider webhook callback endpoints, idempotency keys, and signature verification
- async retry worker and provider-specific failure taxonomy
- real bank/accounting/statutory provider adapters and certification flows
- auditor-facing drilldown UX and public audit pack packaging

## Payroll Phase 4M: Credential Resolver And SDK-Backed Storage Runtime

Objective:

Make the payroll artifact storage adapter runnable in production-style deployments by resolving tenant-scoped credential references at runtime and using SDK-backed S3/GCS/Azure upload, read, and signed URL paths without storing secret material on payroll artifacts.

Completed:

- Added a runtime credential resolver for `credential_ref` values backed by `PAYROLL_ARTIFACT_STORAGE_CREDENTIALS` or `HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON`.
- Added sanitized credential descriptors so runtime resolution can be audited without exposing secret material.
- Added optional `PAYROLL_ARTIFACT_STORAGE_CLIENT_FACTORIES` hooks so deployments/tests can inject provider clients while keeping cloud SDK imports lazy.
- Added SDK-backed object-store adapter behavior for S3, GCS, and Azure provider families.
- S3 runtime storage now writes bytes through `put_object`, records provider object version evidence, reads through `get_object`, and signs downloads through `generate_presigned_url`.
- GCS and Azure runtime paths now have lazy SDK wiring for upload, read, and signed URL behavior where provider packages are installed.
- Object-store artifacts written through runtime storage keep `file_payload` blank while preserving checksum, size, storage key, provider ref, object version, download strategy, retention, and sanitized storage profile metadata.
- Missing, disabled, mismatched, or incomplete credential refs fail closed with explicit payroll storage errors.
- Backend tests cover unresolved credential refs and an injected S3 runtime store/read/signed URL path with no persisted secret fields.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_payslip or payroll_outputs"`

Still open:

- production secret-manager provider implementation for `credential_ref` resolution
- real deployment wiring for AWS/GCP/Azure identity, IAM policies, bucket/container policies, and key rotation
- KMS/customer-managed key enforcement, retention lifecycle checks, malware scanning, and multi-region durability policies
- provider webhook callback endpoints, idempotency keys, and signature verification
- async retry worker and provider-specific failure taxonomy
- real bank/accounting/statutory provider adapters and certification flows
- auditor-facing drilldown UX and public audit pack packaging

## Payroll Phase 4N: Production Storage Policy Hardening

Objective:

Make payroll artifact storage policy-driven at runtime so SaaS tenants can constrain where payroll files are stored, which credential refs can be used, which encryption/retention/lifecycle controls are required, and how signed URL/file-size limits are enforced without hardcoded customer logic.

Completed:

- Added configurable payroll artifact storage policies resolved from `PAYROLL_ARTIFACT_STORAGE_POLICIES` or `HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON`.
- Extended sanitized storage profile snapshots with `storage_policy_ref`, `lifecycle_policy_ref`, `malware_scan_profile_ref`, and `durability_policy_ref`.
- Added policy allowlists for provider families, provider refs, credential refs, bucket names, container names, retention policy refs, encryption refs, and endpoint hosts.
- Added policy gates for required encryption refs, required private endpoints, required runtime credential resolution, required storage-key prefixes, signed URL expiry bounds, max file size, lifecycle policy refs, malware-scan profile refs, and durability policy refs.
- Applied the same policy validation to local/dev storage, object-store contract mode, and SDK-backed runtime store/read/signed URL operations.
- Added empty deployment defaults in Django settings for payroll storage credentials, client factories, and storage policies.
- Backend tests cover missing explicit policy refs, strict encryption policy rejection, and strict S3 runtime policy success with lifecycle, malware-scan, durability, retention, encryption, bucket, credential, and file-size controls.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common config tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_payslip or payroll_outputs"`

Still open:

- production secret-manager provider implementation for `credential_ref` resolution
- provider-side IAM/bucket/container policy verification against AWS/GCP/Azure APIs
- actual KMS/customer-managed key verification and lifecycle retention enforcement
- malware scanning execution hooks and quarantine workflow
- multi-region durability verification against provider replication settings
- provider webhook callback endpoints, idempotency keys, and signature verification
- async retry worker and provider-specific failure taxonomy
- real bank/accounting/statutory provider adapters and certification flows
- auditor-facing drilldown UX and public audit pack packaging

## Payroll Phase 5A: India Statutory Configuration Backbone

Objective:

Create the first SaaS-ready India statutory backbone so PF, ESI, PT, LWF, TDS, gratuity, and similar country-pack behavior can be configured per tenant before statutory calculations consume it.

Completed:

- Added tenant-scoped `PayrollStatutoryPack` records for country/jurisdiction-specific statutory configuration.
- Added `PayrollStatutoryComponent` records for PF, ESI, PT, LWF, TDS, gratuity, and other configurable statutory components.
- Added `PayrollStatutorySlab` records with effective dates, state codes, wage ceilings, percentage rates, fixed employee amounts, fixed employer amounts, and applicability refs.
- Added `EmployeeStatutoryProfile` records linked to employees and optional statutory packs for PAN, UAN, PF, ESI, PT/LWF states, tax regime, declaration status, previous employment income, previous tax deducted, source refs, and source hashes.
- Kept statutory behavior configuration-driven through wage-base refs, statutory-treatment refs, registration refs, applicability refs, rounding refs, formula refs, and JSON config snapshots.
- Added HR admin setup and CRUD APIs for statutory packs, statutory components, slabs, and employee statutory profiles.
- Added validation for effective-date ranges, tenant consistency, required treatment refs, formula-method refs, PAN/UAN shape, PF/UAN requirements, ESI number requirements, nonnegative statutory amounts/rates, and active employee statutory profile overlap.
- Backend tests cover India statutory setup creation, option payloads, employee profile source hashing, PF/UAN validation, and employee denial for HR-admin statutory APIs.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common config tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "statutory or salary or payroll_rules"`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -q`

Still open:

- richer TDS annualization and country-pack statutory depth
- employee statutory profile self-service edits and direct statutory proof upload UX
- statutory filing evidence and provider submission workflows
- challan, return, and filing output generation
- statutory provider integrations and certification flows

## Payroll Phase 5B: Statutory Calculation Consumption V1

Objective:

Make draft payroll calculation consume configured statutory packs, components, slabs, and employee statutory profiles so statutory lines are generated from tenant-owned configuration instead of formula hardcoding.

Completed:

- Added `statutory` as a first-class payroll calculation line source.
- Draft payroll calculation can select active effective-dated statutory packs and components through the run calculation profile.
- Statutory components can be filtered by pack code, statutory pack ref, component code, statutory type, and excluded component code.
- Employee statutory profiles are matched per locked payroll input snapshot and can be required by tenant calculation profile.
- Statutory wage bases resolve from configured component paths or calculation-profile wage-base mappings.
- Slab, percentage, and fixed-amount statutory methods can generate employee deduction, employer contribution, both-sided, or informational lines.
- Statutory slabs support effective-date selection, amount bands, wage ceilings, state-aware matching through configured employee-profile state paths, fixed amounts, and employee/employer rates.
- Generated statutory lines record component/slab/profile IDs, statutory treatment refs, wage-base evidence, source hashes, config snapshots, and trace snapshots.
- Payroll validation now treats statutory-generated component codes as produced components and raises statutory setup blockers for missing components, missing employee profiles, missing wage-base mappings, unavailable wage-base paths, and missing slabs.
- Backend tests cover configured PF employee/employer line generation from slabs and missing employee statutory profile blockers.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common config tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "statutory or payroll_draft_calculation"`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -q`

Still open:

- employee statutory profile self-service edits and direct statutory proof upload UX
- TDS annualization, investment/exemption sections, and tax regime comparison
- statutory filing evidence and provider submission workflows
- challan, return, and filing output generation
- statutory provider integrations and certification flows

## Payroll Phase 5C: Statutory Declaration And Proof Workflow Backbone

Objective:

Add the declaration/proof workflow backbone for employee statutory and tax declarations so declarations, proof items, HR verification decisions, lock state, and source hashes become first-class tenant-scoped records.

Completed:

- Added `EmployeeStatutoryDeclaration` for financial-year declaration packages linked to employee statutory profiles and optional statutory packs.
- Added `EmployeeStatutoryDeclarationItem` for section/component-level declarations, proof references, declared amounts, verified amounts, proof status, rejection reasons, and source hashes.
- Added configurable declaration statuses: draft, submitted, verified, rejected, and locked.
- Added configurable proof statuses: not required, pending, submitted, verified, and rejected.
- Added declaration item kinds for previous employment, investment, exemption, deduction, rental, and other declaration sections.
- Added HR-admin APIs to create/update declarations, create/update proof items, submit declarations, verify declarations, reject declarations, lock declarations, and verify/reject individual proof items.
- Declaration submission refreshes declared totals and moves the employee statutory profile into `proofs_pending`.
- Declaration verification refreshes verified totals, verifies submitted proof items with source-hash refresh, and moves the employee statutory profile into `verified`.
- Declaration locking freezes the declaration and moves the employee statutory profile into `locked`.
- Payroll statutory setup payload now includes declaration counts, declaration item counts, declaration records, proof item records, and declaration/proof option catalogs.
- Backend tests cover declaration creation, proof item creation, item verification, submission, declaration verification, locking, locked edit rejection, setup summaries, and rejection reason enforcement.

Validation:

- `cd backend && python3 -m compileall apps/payroll apps/common config tests/test_phase0_api_smoke.py`
- `cd backend && .venv/bin/python manage.py check`
- `cd backend && .venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -k "statutory_declaration or statutory_setup or employee_statutory_profile"`
- `cd backend && .venv/bin/pytest tests/test_phase0_api_smoke.py -q`

Still open:

- TDS annualization, tax regime comparison, and investment/exemption cap logic
- statutory filing evidence and provider submission workflows
- challan, return, and filing output generation
- statutory provider integrations and certification flows

## Payroll Phase 5D: Statutory Declaration UI And Browser Coverage

Objective:

Expose the statutory declaration/proof workflow through modern HR-admin and employee workspaces, with Playwright coverage proving the pages are usable and visually baselined.

Completed:

- Added employee-scoped statutory declaration API at `/api/v1/me/statutory-declarations/`.
- The ESS statutory payload returns only the logged-in employee's tax profile, declarations, proof items, summary totals, available financial years, and configurable status/tax-regime option catalogs.
- Added `/hr-admin/payroll-statutory` as the HR-admin statutory review workspace for packs, components, employee profiles, declarations, proof evidence, source hashes, and lock/verification state.
- Added `/ess/statutory-declarations` as the employee workspace for tax profile, declaration totals, proof document state, payroll consumption metadata, and source trail.
- Added deterministic statutory demo data covering India FY 2026 packs, PF/PT components, slabs, employee profiles, declaration proofs, and locked/submitted declaration states.
- Added HR and ESS navigation entries so the screens are reachable from the SaaS workspaces.
- Added focused Playwright e2e tests for HR-admin statutory review and ESS statutory declarations.
- Added the new routes to tier-one smoke coverage and operational laptop/mobile visual baselines.
- Added backend API smoke coverage proving employee statutory declarations are scoped to the current employee.

Validation:

- `.venv/bin/python -m compileall backend/apps/common backend/apps/payroll backend/tests/test_phase0_api_smoke.py`
- `.venv/bin/python backend/manage.py check`
- `.venv/bin/python backend/manage.py makemigrations --check --dry-run`
- `.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "statutory_declaration or payroll_statutory"`
- `pnpm --dir web typecheck`
- `pnpm --dir web exec playwright test tests/e2e/payroll-statutory-flows.spec.ts tests/e2e/ess-statutory-declarations-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots`
- `pnpm --dir web exec playwright test tests/e2e/tier-one-route-smoke.spec.ts`
- `git diff --check`

Still open:

- direct binary proof upload from the statutory screen, beyond linking existing document/artifact refs
- TDS annualization, tax regime comparison, and investment/exemption cap logic
- statutory filing evidence and provider submission workflows
- challan, return, and filing output generation
- statutory provider integrations and certification flows

## Payroll Phase 5E: Employee Statutory Submission

Objective:

Allow employees to create, revise, and submit their own statutory declaration packages from ESS while keeping HR verification, rejection, and locking under HR-admin control.

Completed:

- Added employee-scoped create/update APIs for `/api/v1/me/statutory-declarations/` and `/api/v1/me/statutory-declarations/<id>/`.
- Added employee-scoped proof item APIs for `/api/v1/me/statutory-declarations/<id>/items/` and `/api/v1/me/statutory-declaration-items/<id>/`.
- Added employee-scoped submit API at `/api/v1/me/statutory-declarations/<id>/submit/`.
- Employee writes are limited to the logged-in employee's own draft or rejected declarations.
- Employee proof status writes are limited to not required, pending, or submitted; HR-only verified/rejected states remain protected.
- Declaration submission refreshes declared totals, records the submitting user, and moves the linked employee statutory profile to proofs pending.
- ESS statutory page now includes a compact employee submission panel for declaration metadata, tax regime, proof item refs, and submit action.
- Next.js API proxy routes forward employee statutory mutation requests with token-scoped authentication.
- Backend and Playwright coverage now prove employee create/update/submit behavior, scope guards, locked declaration guards, and responsive UI availability.

Validation:

- `.venv/bin/python -m compileall backend/apps/common backend/apps/payroll backend/tests/test_phase0_api_smoke.py`
- `.venv/bin/python backend/manage.py check`
- `.venv/bin/python backend/manage.py makemigrations --check --dry-run`
- `.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "statutory_declaration or payroll_statutory"`
- `pnpm --dir web typecheck`
- `pnpm --dir web exec playwright test tests/e2e/payroll-statutory-flows.spec.ts tests/e2e/ess-statutory-declarations-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots`
- `pnpm --dir web exec playwright test tests/e2e/tier-one-route-smoke.spec.ts`
- `git diff --check`

Still open:

- employee statutory profile self-service edits
- TDS annualization, tax regime comparison, and investment/exemption cap logic
- statutory filing evidence and provider submission workflows
- challan, return, and filing output generation
- statutory provider integrations and certification flows

## Payroll Phase 5F: Direct Statutory Proof Upload

Objective:

Let employees upload statutory proof files directly from the ESS declaration workspace while storing files in the canonical employee document center and linking the resulting document/artifact evidence to declaration proof rows.

Completed:

- Added multipart employee API at `/api/v1/me/statutory-declarations/<id>/proof-upload/`.
- The proof upload workflow creates an `EmployeeDocument` through the existing self-service document service, preserving configured category, file validation, storage, notification, and verification behavior.
- The same request creates or updates the statutory declaration item with `proof_document_ref`, `proof_artifact_key`, submitted proof status, upload metadata, and refreshed source hashes.
- ESS statutory declaration payload now exposes tenant-configured proof upload categories, preferring tax/statutory-marked self-upload categories when configured.
- Added Next.js multipart proxy route for direct statutory proof uploads.
- ESS statutory declaration action panel now supports file attachment beside existing proof-reference entry.
- Backend coverage proves direct statutory upload creates the employee document and links the statutory proof item to the document/artifact evidence.
- Playwright coverage proves the upload controls render in the ESS statutory workspace without layout overflow.

Validation:

- `.venv/bin/python -m compileall backend/apps/common backend/apps/payroll backend/tests/test_phase0_api_smoke.py`
- `.venv/bin/python backend/manage.py check`
- `.venv/bin/python backend/manage.py makemigrations --check --dry-run`
- `.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "statutory_declaration or payroll_statutory"`
- `pnpm --dir web typecheck`
- `pnpm --dir web exec playwright test tests/e2e/payroll-statutory-flows.spec.ts tests/e2e/ess-statutory-declarations-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots`
- `pnpm --dir web exec playwright test tests/e2e/tier-one-route-smoke.spec.ts`
- `git diff --check`

Still open:

- employee statutory profile self-service edits
- tax regime comparison and advanced projection scenarios
- statutory filing evidence and provider submission workflows
- challan, return, and filing output generation
- statutory provider integrations and certification flows

## Payroll Phase 5G: TDS Annualization And Declaration Cap Engine

Objective:

Calculate Tax Deducted At Source as a configurable statutory component that can annualize payroll wage bases, consume verified employee declarations, apply tenant-defined caps, and emit a payroll calculation line with auditable trace evidence.

Completed:

- Added a TDS annualization path inside the existing statutory calculation pipeline instead of creating a separate hardcoded tax calculator.
- TDS behavior is driven by statutory component/profile config: financial year, annualization multiplier, remaining period count, output component mapping, tax method, declaration statuses, proof statuses, declaration profile refs, and cap rules.
- Verified or locked employee statutory declarations can now reduce taxable annual income through configurable cap rules matched by section code, component code, item kind, and tax regime.
- Annual tax can be calculated through configured progressive statutory slabs, with the resulting remaining tax spread across configured remaining payroll periods.
- Payroll calculation lines now carry annualization trace snapshots including annual wage, declaration adjustment, taxable annual income, slab trace, previous employment income/tax, period TDS, and consumed declaration cap evidence.
- Source hashes for annualized TDS lines include declaration/cap evidence so recalculation changes are traceable.
- HR payroll calculation workspace now shows a compact TDS annualization panel in the line trace drawer and demo data includes a statutory TDS line.
- Backend coverage proves configured TDS annualization consumes verified declaration caps and updates gross/deduction/net totals.
- Playwright coverage proves the calculation workspace exposes the TDS annualization detail without layout overflow.

Validation:

- `.venv/bin/python -m compileall backend/apps/payroll/services.py backend/tests/test_phase0_api_smoke.py`
- `.venv/bin/python backend/manage.py check`
- `.venv/bin/python backend/manage.py makemigrations --check --dry-run`
- `.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "tds or statutory or payroll_draft_calculation"`
- `pnpm --dir web typecheck`
- `pnpm --dir web exec playwright test tests/e2e/payroll-calculations-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/e2e/tier-one-route-smoke.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots`

Still open:

- employee statutory profile self-service edits
- challan, return, and filing output generation
- statutory provider integrations and certification flows

## Payroll Phase 5H: Tax Regime Comparison Projection

Objective:

Let payroll calculate side-by-side tax regime projections from the same configurable TDS annualization contract, so HR can review selected and alternative regime outcomes before final payroll lock.

Completed:

- Extended TDS annualization with configurable regime comparison keys: candidate regimes, selected regime override, comparison enablement, and selection mode.
- Declaration cap consumption and statutory slab tax calculation can now run per candidate tax regime without hardcoded old/new logic.
- Annualized TDS trace snapshots now include a `regime_comparisons` matrix with declaration adjustment, taxable annual amount, annual tax, remaining tax, per-period tax, selected flag, and delta from the chosen regime.
- Payroll line amount remains profile/config selected by default, with support for a configurable lowest-tax selection mode where tenants want automated regime choice.
- Backend coverage proves old/new candidate projections, regime-specific declaration cap behavior, selected-regime marking, and per-period delta evidence.
- HR payroll calculation workspace now shows a compact regime comparison list inside the TDS annualization trace panel.
- Demo payroll data and Playwright coverage now exercise the comparison UI and adjusted payroll totals.

Validation:

- `.venv/bin/python -m compileall backend/apps/payroll/services.py backend/tests/test_phase0_api_smoke.py`
- `.venv/bin/python backend/manage.py check`
- `.venv/bin/python backend/manage.py makemigrations --check --dry-run`
- `.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "tds or statutory or payroll_draft_calculation"`
- `pnpm --dir web typecheck`
- `pnpm --dir web exec playwright test tests/e2e/payroll-calculations-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/e2e/tier-one-route-smoke.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots`

Still open:

- employee statutory profile self-service edits
- challan, return, and filing output generation
- statutory provider integrations and certification flows

## Payroll Phase 5I: Employer Statutory Registrations And Filing Calendars

Objective:

Make employer statutory accounts and filing obligations configurable per tenant, legal entity, branch, location, statutory pack, component, authority, and provider before challan/return output generation is built.

Completed:

- Added tenant-scoped `PayrollStatutoryEmployerRegistration` records for statutory account numbers, employer identifiers, jurisdiction refs, filing authority refs, provider refs, effective dates, source refs, source hashes, and configuration snapshots.
- Added tenant-scoped `PayrollStatutoryFilingCalendar` records for filing type, frequency, period range, due dates, grace dates, filing windows, status, authority/provider refs, output profile refs, source refs, source hashes, and configuration snapshots.
- Employer registration validation enforces tenant ownership, statutory pack/component alignment, organization-scope tenant ownership, date consistency, and active effective-date overlap protection per registration type/number.
- Filing calendar validation enforces tenant ownership, pack/component/registration alignment, period date consistency, grace-date consistency, and filing-window consistency.
- HR-admin APIs can create, update, list, inspect, and aggregate employer registrations and filing calendars.
- Payroll statutory setup payload now exposes registration/filing summaries, records, legal entity/branch/location option catalogs, payroll frequencies, and filing statuses.
- `/hr-admin/payroll-statutory` now shows registration coverage and upcoming filing obligations alongside statutory packs, components, declarations, proof evidence, and source trails.
- Demo payroll statutory data and Playwright coverage now exercise employer registrations, provider/authority refs, filing due states, and output profile refs.
- Backend coverage proves API creation, tenant-scoped foreign-key resolution, source hashing, pack/component inheritance from employer registration, setup summaries, and option payloads.

Validation:

- `.venv/bin/python -m compileall backend/apps/payroll backend/apps/common`
- `.venv/bin/python backend/manage.py check`
- `.venv/bin/python backend/manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "payroll_statutory_setup_supports"`
- `pnpm --dir web typecheck`
- `pnpm --dir web exec playwright test tests/e2e/payroll-statutory-flows.spec.ts`

Still open:

- employee statutory profile self-service edits
- statutory provider integrations and certification flows

## Payroll Phase 5J: Statutory Challan And Return Artifact Generation

Objective:

Generate statutory return and challan output artifacts from tenant-configured employer registrations and filing calendars, without hardcoding jurisdiction logic into the payroll handoff flow.

Completed:

- Finance handoff generation now discovers eligible `PayrollStatutoryFilingCalendar` records from the configured statutory filing profile.
- Statutory filing selection supports configurable status, filing type, output profile, statutory pack code, and statutory component code filters.
- Generated statutory filing artifacts reuse `PayrollOutputArtifact` with `kind = statutory_report` and metadata-driven `artifact_subtype` values for `statutory_return` and `statutory_challan`.
- Return artifacts include employee/component statutory lines, filing calendar refs, employer registration numbers, authority/provider refs, source hashes, and totals.
- Challan artifacts include payable totals, filing authority/provider refs, employer identifiers, source row count, and source hashes.
- Filing calendars record latest generation evidence in `config_snapshot.latest_generation` with handoff, output batch, artifact IDs, totals, and generated timestamp.
- Finance handoff summaries now expose statutory filing artifact counts and filing calendar counts.
- `/hr-admin/payroll-handoff` now shows statutory filing files beside bank advice, accounting export, and statutory summary artifacts.
- Demo payroll handoff data now includes configurable Maharashtra PT return/challan artifacts and statutory provider routing refs.
- Backend and Playwright coverage prove statutory filing artifact generation, UI visibility, profile refs, provider refs, and delivery records.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "statutory_filing_artifacts or finance_handoff"`
- `pnpm --dir web typecheck`
- `pnpm --dir web exec playwright test tests/e2e/payroll-handoff-flows.spec.ts`

Still open:

- employee statutory profile self-service edits
- live statutory provider portal/API execution adapters
- provider webhook endpoints, retry/dead-letter execution contracts, background retry workers, and certification-flow automation

## Payroll Phase 5K: Provider Submission Adapter Contract

Objective:

Define a SaaS-ready provider submission contract for bank, accounting, statutory return, and statutory challan files so every delivery has adapter, schema, callback-verification, idempotency, and certification evidence refs before real provider execution is connected.

Completed:

- Provider route resolution now supports artifact-specific, output-profile, filing-type, artifact-kind, and statutory subtype keys such as `statutory_report:statutory_return`.
- Delivery request snapshots now include a normalized `submission_contract` with provider, channel, adapter, submission mode, submission profile, request schema, response schema, callback profile, callback verification, certification profile, certification requirement, and idempotency key.
- Statutory filing deliveries add statutory context to the submission contract, including filing calendar, filing type, authority, employer registration, and output profile refs.
- Delivery config snapshots now retain the selected provider route, submission contract, handoff profile, source output profile, and certification evidence state.
- Reconciliation records callback verification refs, response schema refs, certification profile refs, checksum evidence, and certification evidence refs when provider acknowledgement is recorded.
- Demo handoff data now uses subtype-specific Clear Statutory adapter contracts for PT return and challan artifacts.
- `/hr-admin/payroll-handoff` now shows adapter, submission profile, callback verification, certification profile, and certification evidence state in the artifact detail panel.
- Backend and Playwright coverage prove the adapter contract and certification evidence are present for statutory return delivery.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "statutory_filing_artifacts or finance_handoff"`
- `pnpm --dir web typecheck`
- `pnpm --dir web exec playwright test tests/e2e/payroll-handoff-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots -g "/hr-admin/payroll-handoff"`

Still open:

- employee statutory profile self-service edits
- live bank/accounting/statutory provider SDK or portal automation adapters
- external provider webhook hardening for production secret rotation and IP allowlisting
- retry/dead-letter execution contracts, background retry-worker runtime, and provider-specific queue integrations
- automated statutory certification lifecycle beyond recorded evidence refs

## Payroll Phase 5L: Provider Callback Webhook Ingestion

Objective:

Add a durable provider callback ingestion contract so external bank, accounting, and statutory systems can report delivery outcomes through signed, idempotent webhook events.

Completed:

- Added tenant-scoped `PayrollProviderCallbackEvent` records linked to provider delivery, finance handoff, and output artifact lineage.
- Callback events store provider refs, external refs, external event IDs, idempotency keys, callback profile refs, verification refs, provider status, payload checksums, signatures, verification snapshots, payload snapshots, processing snapshots, received/processed timestamps, and failure evidence.
- Added public callback endpoint at `/api/v1/payroll-provider-callbacks/`.
- Callback ingestion resolves delivery by provider ref plus delivery ID or external reference.
- Deterministic contract signatures verify provider callbacks against delivery submission contracts, callback verification refs, payload checksums, and original artifact checksums.
- Provider/idempotency uniqueness prevents duplicate callback event creation on replay.
- Valid callbacks update the matching delivery, response snapshot, reconciliation snapshot, certification evidence, handoff summary, and accepted/failed handoff state when applicable.
- Rejected callbacks are retained with verification failure evidence without mutating the delivery.
- HR-admin handoff setup payload now includes recent callback events and callback status counts.
- `/hr-admin/payroll-handoff` now exposes provider callback events beside delivery acknowledgements.
- Backend coverage proves signed callback processing, idempotent replay behavior, rejected-signature retention, and setup callback counts.
- Playwright coverage proves callback events and verification refs are visible in the handoff workspace.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_callback_endpoint or statutory_filing_artifacts or finance_handoff"`
- `pnpm --dir web typecheck`
- `pnpm --dir web exec playwright test tests/e2e/payroll-handoff-flows.spec.ts`
- `pnpm --dir web exec playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots -g "/hr-admin/payroll-handoff"`

Still open:

- employee statutory profile self-service edits
- live bank/accounting/statutory provider SDK or portal automation adapters
- production webhook hardening: secret rotation, provider IP allowlists, provider-specific signature algorithms, and rate limits
- background retry-worker runtime and provider-specific queue integrations
- automated statutory certification lifecycle beyond recorded evidence refs

## Payroll Phase 5M: Provider Retry and Dead-Letter Contract

Objective:

Add the SaaS-ready retry/dead-letter execution contract for failed provider deliveries so bank, accounting, statutory return, and statutory challan transmissions can be recovered without hardcoded provider behavior.

Completed:

- Added tenant-scoped `PayrollProviderRetryEvent` records linked to provider delivery, finance handoff, output artifact, output batch, payroll run, and final-locked review lineage.
- Retry events store scheduled/executed/dead-letter/skipped state, retry policy refs, failure taxonomy/category refs, retry reasons, attempt numbers, scheduled/executed timestamps, request/decision/response snapshots, and failure evidence.
- Provider routes now retain nested `retry_policy` config in delivery snapshots, including max attempts, backoff seconds, taxonomy refs, and provider-specific failure category mappings.
- Finance handoff profile resolution now composes run-level defaults with batch-level overrides, keeping SaaS tenant/run configuration from being accidentally masked.
- Added HR-admin APIs to schedule provider delivery retries and requeue scheduled retry events.
- Retry scheduling blocks already reconciled deliveries, classifies failures through the configured taxonomy, and creates dead-letter records once max attempts are exhausted.
- Requeue execution increments attempts, clears stale acknowledgement/reconciliation fields, records retry context, returns delivery state to submitted, and updates handoff summaries.
- HR-admin handoff setup payload now includes retry events, retry status options, and scheduled/executed/dead-letter counts.
- `/hr-admin/payroll-handoff` now exposes retry metrics, provider retry ledger cards, failed delivery retry state, and schedule/requeue command surfaces.
- Demo handoff data includes a failed statutory challan delivery with a scheduled retry so browser coverage exercises the recovery path.
- Backend coverage proves scheduling, configured failure taxonomy mapping, requeue execution, setup counts, and dead-letter transition at max attempts.
- Playwright coverage proves retry policy, failure category, scheduled attempt, and failed-delivery command controls are visible in the handoff workspace.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_delivery_retry or provider_callback_endpoint or statutory_filing_artifacts or finance_handoff"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts --grep "/hr-admin/payroll-handoff"` from `web`

Still open:

- employee statutory profile self-service edits
- live bank/accounting/statutory provider SDK or portal automation adapters
- production queue integration and provider-specific execution adapters
- production webhook hardening: secret rotation, provider IP allowlists, provider-specific signature algorithms, and rate limits
- automated statutory certification lifecycle beyond recorded evidence refs

## Payroll Phase 5N: Provider Retry Worker Runtime Shell

Objective:

Add a provider-agnostic retry worker runtime shell so scheduled retry events can be processed by command/scheduler infrastructure without binding payroll to a specific cloud queue or external provider SDK.

Completed:

- Added `process_due_payroll_provider_retries` to select due scheduled retry events by tenant, due time, and processing limit.
- Added `execute_payroll_provider_retry_event` to execute one due retry through a configurable adapter shell.
- Added route-level `execution_adapter` snapshot support with worker profile, adapter ref, execution mode, execution strategy, dispatch mode, schema refs, callback refs, and idempotency key evidence.
- Added stale-event safety: scheduled retries are skipped with failure evidence when the provider delivery has already reconciled or is no longer failed/rejected.
- Adapter shell currently supports the safe manual-requeue execution path: delivery returns to submitted state, retry context is recorded, and the existing callback/acknowledgement flow remains responsible for final reconciliation.
- Added Django management command `process_payroll_provider_retries` with tenant and limit filters.
- HR-admin handoff demo data and UI now expose retry worker profile refs for failed delivery recovery.
- Backend coverage proves due retry processing, adapter execution metadata, delivery requeue state, command output, and stale retry skip behavior.
- Playwright coverage proves the retry worker profile is visible in the handoff workspace.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_retry_worker or provider_delivery_retry or provider_callback_endpoint or statutory_filing_artifacts or finance_handoff"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts --grep "/hr-admin/payroll-handoff"` from `web`

Still open:

- employee statutory profile self-service edits
- provider-specific bank/accounting/statutory SDK or portal automation adapters
- production queue integration for recurring retry workers
- production webhook hardening: secret rotation, provider IP allowlists, provider-specific signature algorithms, and rate limits
- automated statutory certification lifecycle beyond recorded evidence refs

## Payroll Phase 5O: Provider Adapter Boundary

Objective:

Define the live-provider adapter boundary for bank, accounting, and statutory submissions so tenant-specific provider integrations can be added without hardcoding credentials, schemas, request formats, or provider behavior into payroll core.

Completed:

- Added `backend/apps/payroll/providers.py` with provider adapter protocol, normalized submission request/result dataclasses, runtime credential resolver, raw-secret validation, manual adapter, sandbox adapter, and configurable adapter registry hook.
- Provider credentials now resolve from `PAYROLL_PROVIDER_CREDENTIALS` or `HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON` by `credential_ref`; snapshots store sanitized descriptors only.
- Provider routes reject raw credential keys recursively before route snapshots are persisted.
- Provider route snapshots now retain credential refs, credential profile refs, credential-required flags, sandbox responses, retry policies, and execution adapter config.
- Finance handoff transmission now submits each newly created provider delivery through the adapter boundary and records normalized adapter request/result evidence.
- Adapter results can move deliveries to submitted, acknowledged, reconciled, rejected, or failed states while preserving checksums, schema refs, callback refs, certification evidence refs, and provider batch refs.
- Retry-worker execution now reuses the same provider submission boundary after requeue, so initial submit and retry submit share one contract.
- Added explicit `PAYROLL_PROVIDER_CREDENTIALS` and `PAYROLL_PROVIDER_ADAPTERS` settings for environment-owned provider integrations.
- HR-admin handoff demo/UI now exposes credential refs and credential profile refs for failed delivery recovery without revealing secret material.
- Backend coverage proves sandbox credential resolution, sanitized snapshots, raw-secret rejection, adapter response normalization, and backwards-compatible handoff/retry/callback flows.
- Playwright coverage proves provider credential refs are visible in the handoff workspace when configured.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_adapter_boundary or provider_retry_worker or provider_delivery_retry or provider_callback_endpoint or statutory_filing_artifacts or finance_handoff"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts --grep "/hr-admin/payroll-handoff"` from `web`

Still open:

- employee statutory profile self-service edits
- production bank/accounting/statutory SDK or portal automation adapters
- production queue integration for recurring retry workers
- production webhook hardening: secret rotation, provider IP allowlists, provider-specific signature algorithms, and rate limits
- automated statutory certification lifecycle beyond recorded evidence refs

## Payroll Phase 5P: Provider-Specific Sandbox Adapter Scaffolds

Objective:

Add provider-specific adapter scaffolds for bank, accounting, and statutory delivery domains so future live SDK/portal implementations plug into explicit domain contracts instead of a single generic adapter path.

Completed:

- Added bank, accounting, and statutory sandbox adapter classes behind the existing provider adapter protocol.
- Each scaffold validates supported artifact kinds before submission, preventing a bank adapter from processing accounting or statutory artifacts by configuration mistake.
- Bank adapter responses stamp `payroll.provider_contract.bank_payment_instruction.v1` evidence with payment file name and checksum.
- Accounting adapter responses stamp `payroll.provider_contract.accounting_journal_import.v1` evidence with ledger file name and checksum.
- Statutory adapter responses stamp `payroll.provider_contract.statutory_filing_upload.v1` evidence with filing file name, checksum, and filing context.
- Adapter registry now resolves `payroll.provider_adapter.bank.sandbox.v1`, `payroll.provider_adapter.accounting.sandbox.v1`, and `payroll.provider_adapter.statutory.sandbox.v1`.
- Backend coverage proves all three provider-specific sandbox adapters submit through finance handoff delivery, record domain contract evidence, and preserve certification evidence for statutory reconciliation.
- HR-admin handoff demo now uses the statutory sandbox adapter ref for failed challan recovery.
- Playwright coverage proves the statutory sandbox adapter ref is visible in the handoff detail workflow.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_specific_sandbox_adapters or provider_adapter_boundary or provider_retry_worker or provider_delivery_retry or provider_callback_endpoint or statutory_filing_artifacts or finance_handoff"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts --grep "/hr-admin/payroll-handoff"` from `web`

Still open:

- employee statutory profile self-service edits
- production bank/accounting/statutory SDK or portal automation adapters
- production queue integration for recurring retry workers
- production webhook hardening: secret rotation, provider IP allowlists, provider-specific signature algorithms, and rate limits
- automated statutory certification lifecycle beyond recorded evidence refs

## Payroll Phase 5Q: Provider Onboarding And Certification Workspace

Objective:

Add the SaaS provider onboarding layer before production provider execution, so each tenant can configure, certify, and activate bank, accounting, and statutory provider connections through refs and evidence instead of hardcoded route assumptions.

Completed:

- Added tenant-scoped `PayrollProviderConnection` records for provider refs, provider kind, environment, adapter refs, channel refs, credential refs, callback refs, retry policy refs, certification profile refs, readiness snapshots, certification snapshots, and lifecycle status.
- Added model validation that rejects raw credential keys in provider config/evidence snapshots and blocks active provider connections until required refs and passed certification are present.
- Added deterministic readiness gates for adapter, channel, credential ref, callback contract, retry policy, and certification.
- Added default bank, accounting, and statutory provider connection blueprints with credential-ref-only SaaS setup metadata.
- Added HR-admin provider connection setup, list/create, detail/update, and certify APIs.
- Added `/hr-admin/payroll-providers` with provider catalog, launch-control metrics, readiness gate cards, vertical coverage register, credential boundary, runtime refs, and certification evidence.
- Added browser e2e and laptop/mobile visual coverage for the provider onboarding workspace.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_connection or provider_specific_sandbox_adapters or provider_adapter_boundary or provider_retry_worker or provider_delivery_retry or provider_callback_endpoint"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- production bank/accounting/statutory SDK or portal automation adapters
- production queue integration for recurring retry workers
- production webhook hardening: secret rotation, provider IP allowlists, provider-specific signature algorithms, and rate limits
- automatic certification test execution against real provider sandboxes

## Payroll Phase 5R: Certified Provider Connection Route Gating

Objective:

Connect finance handoff provider route selection to tenant-owned provider connection readiness so bank, accounting, and statutory submissions can require certified or active provider connections before transmission.

Completed:

- Added configurable provider connection policy enforcement modes for finance handoff routes: `disabled`, `warn`, `certified`, and `active`.
- Provider routes can now resolve adapter refs, channel refs, credential refs, credential profile refs, callback refs, retry policy refs, and certification refs from the matching `PayrollProviderConnection`.
- Strict `certified` and `active` modes block finance handoff transmission when the provider connection is missing, uncertified, inactive, not launch-ready, or mismatched with explicit route refs.
- Delivery route snapshots and submission contracts now carry `provider_connection_gate` evidence with policy ref, enforcement mode, matched connection, status, certification status, readiness counts, blockers, and mismatch refs.
- `/hr-admin/payroll-handoff` now displays provider connection gate status and blockers in the provider acknowledgement detail panel.
- Demo handoff data now shows the statutory challan path with certified-connection enforcement and a pending certification blocker.
- Backend and Playwright coverage prove blocked uncertified routing, active connection ref resolution, handoff visibility, and visual stability.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_connection or provider_specific_sandbox_adapters or provider_adapter_boundary or provider_retry_worker or provider_delivery_retry or provider_callback_endpoint"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff|payroll-providers"` from `web`

Still open:

- production bank/accounting/statutory SDK or portal automation adapters
- production queue integration for recurring retry workers
- production webhook hardening: secret rotation, provider IP allowlists, provider-specific signature algorithms, and rate limits
- automatic certification test execution against real provider sandboxes is started through Phase 5S deterministic sandbox certification runs; the remaining gap is real external sandbox execution.

## Payroll Phase 5S: Automated Provider Sandbox Certification Execution

Objective:

Execute provider certification scenarios from tenant/provider configuration, persist scenario evidence, and update provider connection certification state without relying only on manual evidence recording.

Completed:

- Added tenant-scoped `PayrollProviderCertificationRun` records linked to provider connections.
- Added certification run statuses, scenario/pass/fail/blocker counts, run/profile refs, request snapshots, response snapshots, evidence snapshots, error snapshots, source hashes, requested-by, and executed-by lineage.
- Added configurable certification scenario resolution through connection `config_snapshot.certification_scenarios`, with provider-kind defaults for bank, accounting, and statutory sandbox certification.
- Added automated sandbox execution that builds provider submission requests, calls the configured sandbox adapter, verifies expected provider statuses, records scenario evidence refs, and stores failure reasons.
- Successful runs update `PayrollProviderConnection.certification_status` to passed and move launch-ready connections to certified; failed runs update certification state to failed and block the connection.
- Added HR-admin run-certification API at `/api/v1/hr-admin/payroll-provider-connections/<id>/run-certification/`.
- Provider setup payload now includes recent certification runs and run summary counts.
- `/hr-admin/payroll-providers` now exposes the run-certification action, latest run evidence, scenario results, and certification run ledger.
- Backend and Playwright coverage prove successful automated certification, failed scenario blocking, provider-page visibility, and no-horizontal-overflow stability.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_connection"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- real bank/accounting/statutory SDK or portal automation adapters
- production queue integration for recurring certification and retry workers
- production webhook hardening: secret rotation, provider IP allowlists, provider-specific signature algorithms, and rate limits
- automatic certification execution against real external provider sandboxes instead of deterministic local sandbox adapters

## Payroll Phase 5T: Production Provider Adapter Contract Hardening

Objective:

Make provider adapter requests and results enforceable through configurable production contracts so bank, accounting, and statutory providers cannot silently accept incomplete schemas, missing idempotency evidence, or mismatched adapter refs.

Completed:

- Added reusable provider adapter request/result contract validators in the provider boundary.
- Adapter contracts now support configurable `disabled`, `warn`, and `strict` enforcement modes.
- Request validation checks required request fields, provider refs, adapter refs, idempotency keys, checksums, schema refs, and optional credential-resolution evidence.
- Result validation checks required result fields, allowed provider statuses, and required response snapshot fields such as `domain_contract_ref`.
- Finance handoff route snapshots now carry `adapter_contract` evidence, and submission contracts persist the selected adapter contract profile.
- Provider delivery submission now stamps request/result contract validation into adapter submission evidence.
- Strict contract failures turn the provider delivery into a failed delivery with deterministic failure codes and preserved request-validation evidence.
- Automated certification scenarios now run through the same strict adapter contract validation path.
- Default provider connection blueprints and demo data expose adapter contract refs without raw credentials.
- `/hr-admin/payroll-providers` now shows adapter contract profile, enforcement mode, expected adapter, and latest request/result validation status.
- Backend and Playwright coverage prove successful contract evidence and strict contract failure behavior.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_adapter_boundary or provider_specific_sandbox_adapters or provider_connection or provider_retry_worker or provider_delivery_retry or provider_callback_endpoint"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- production bank/accounting/statutory SDK or portal automation adapters
- production queue integration for recurring certification and retry workers
- provider-specific signature algorithm implementations beyond the standard deterministic SHA-256 contract
- provider-specific schema transformation/mapping packs for real external provider payloads

## Payroll Phase 5U: Production Webhook Security Hardening

Objective:

Make provider callbacks SaaS-ready through configurable webhook security policy evidence so tenants can enforce replay windows, source policy, rate limits, signature refs, and secret rotation refs without hardcoded provider rules.

Completed:

- Finance handoff route resolution now includes a configurable `callback_security_policy` block in provider delivery submission contracts.
- Callback security policies carry policy refs, enforcement mode, signature algorithm refs, secret rotation refs, replay windows, timestamp/source requirements, provider IP allowlist refs, and rate-limit refs.
- Public provider callback ingestion accepts optional event timestamp and source IP metadata, with request-source fallback for audit evidence.
- Callback verification snapshots now include gate-level webhook security evidence for signature match, secret rotation ref, replay window, source policy, rate limit, and idempotency replay guard.
- Strict policy mode rejects callbacks with deterministic `callback_security_policy_failed` evidence while leaving the delivery state unchanged.
- Existing signed callback behavior remains compatible in warn mode, preserving current provider callback flows while surfacing production readiness evidence.
- Default provider connection blueprints and demo handoff data expose callback security refs without embedding provider secrets or unchangeable IP assumptions.
- `/hr-admin/payroll-handoff` now shows webhook security policy and gate evidence inside provider callback cards.
- Backend and Playwright coverage prove successful security evidence, strict policy rejection, and visible gate refs.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_callback_endpoint or provider_adapter_boundary or provider_specific_sandbox_adapters or provider_connection or provider_retry_worker or provider_delivery_retry"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"` from `web`

Still open:

- provider-specific signature algorithm adapters for real provider payload formats
- production queue integration for callback/retry/certification workers
- production bank/accounting/statutory SDK or portal automation adapters
- provider-specific schema transformation/mapping packs for real external provider payloads

## Payroll Phase 5V: Provider Job Queue Orchestration

Objective:

Add a portable tenant-scoped provider job ledger so provider submissions, retries, certification runs, and callback reconciliation can be scheduled, leased, executed, audited, and retried without binding the payroll core to a specific cloud queue service.

Completed:

- Added `PayrollProviderJobKind` and `PayrollProviderJobStatus` enums for provider submission, provider retry, provider certification, and callback reconciliation jobs.
- Added `PayrollProviderJob` with tenant isolation, idempotency key uniqueness, queue policy refs, worker profile refs, lease metadata, attempt counts, max attempts, related delivery/retry/callback/connection/certification links, request/lease/response snapshots, and failure evidence.
- Provider jobs validate same-tenant related objects and reject raw credential keys inside queue evidence snapshots.
- Retry scheduling now automatically creates an idempotent provider retry job when a retry event is scheduled.
- Added enqueue helpers for provider submissions, retries, certification jobs, and callback reconciliation jobs.
- Added a generic provider job executor and due-job worker that leases work, calls the existing submission/retry/certification/callback seams, records completion/skipped/dead-letter evidence, and reschedules nonterminal failures with configurable backoff.
- Added `process_payroll_provider_jobs` management command as the portable worker entrypoint with tenant and lease-owner filtering.
- Admin now exposes provider jobs for operational inspection.
- HR-admin finance handoff API payloads now include provider job summaries, options, and job ledgers beside deliveries, retries, and callbacks.
- `/hr-admin/payroll-handoff` now shows provider queue jobs with queue policy refs, worker profile refs, lease owner, scheduled date, and attempt counts.
- Demo data and Playwright coverage now include submission, retry, and callback reconciliation job examples.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_retry_worker or provider_delivery_retry or provider_callback_endpoint or provider_connection or provider_adapter_boundary or provider_specific_sandbox_adapters"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"` from `web`

Still open:

- replacing local DB polling with the chosen production queue runtime while preserving this ledger
- provider-specific signature algorithm adapters for real provider payload formats
- production bank/accounting/statutory SDK or portal automation adapters
- provider-specific schema transformation/mapping packs for real external provider payloads

## Payroll Phase 5W: Provider-Specific Schema Mapping Packs

Objective:

Make real provider payload formats configurable through tenant-owned schema mapping packs so bank, accounting, and statutory integrations can transform internal payroll artifacts into provider-specific payloads without hardcoded field mappings.

Completed:

- Added `PayrollProviderSchemaMappingPackStatus` and `PayrollProviderSchemaMappingPack` for tenant/provider/artifact-specific mapping versions.
- Mapping packs store provider refs, provider kind, environment, artifact kind, mapping profile refs, source/target schema refs, transform/validation profile refs, enforcement mode, transform rules, validation rules, samples, evidence snapshots, and source hash.
- Mapping pack snapshots use the existing raw-credential guard so schema configuration cannot store provider secrets.
- Default seeded bank, accounting, and statutory provider connections now receive active schema mapping packs.
- Provider route resolution now selects an active mapping pack by explicit mapping profile, provider connection, or provider/artifact fallback.
- Provider submission contracts now carry `schema_mapping` evidence.
- Provider submission normalization includes artifact title, output profile, totals, line snapshots, and config snapshots for configurable mapping rules.
- Added safe path-based mapping application with target path assignment, required gates, simple type formatting, validation gates, warn/disabled/strict enforcement, and mapped `provider_payload` evidence.
- Strict mapping failures now fail delivery submission with `provider_schema_mapping_failed` and retain blocked mapping gates.
- Manual and sandbox adapters stamp mapped provider payload and mapping validation into response snapshots.
- HR-admin provider setup APIs now expose schema mapping pack counts, status options, and mapping pack ledgers.
- `/hr-admin/payroll-providers` shows mapping pack profile, source/target schema, enforcement mode, version, and transform/gate counts.
- `/hr-admin/payroll-handoff` shows delivery-level schema mapping evidence beside submission contracts.
- Backend and Playwright coverage prove mapping pack seeding, successful payload mapping, strict mapping failure behavior, and visible mapping evidence.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_schema_mapping or provider_adapter_boundary or provider_specific_sandbox_adapters or provider_connection or provider_retry_worker or provider_delivery_retry or provider_callback_endpoint"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-(providers|handoff)"` from `web`

Still open:

- provider-specific signature algorithm adapters for real provider payload formats
- production bank/accounting/statutory SDK or portal automation adapters
- rule simulation against sample request snapshots before activation
- deeper array/line-item transforms for provider file formats that require grouped or nested row expansion

## Payroll Phase 5X: Mapping Pack Lifecycle Management

Objective:

Make provider schema mapping packs governable across tenants with explicit draft/edit, clone, activation, supersession, archive, export, and import workflows before real provider adapters depend on them.

Completed:

- Added provider schema mapping pack lifecycle services for tenant-scoped create/update, clone-as-draft, activate, archive, export, and import.
- Active mapping packs are protected from direct edits; admins must clone a draft version before changing provider payload rules.
- Activating a mapping pack supersedes older active versions for the same mapping profile by moving them to inactive.
- Lifecycle evidence is stored in mapping pack `evidence_snapshot` with action, actor, reason, timestamp, approval snapshot, source version, and superseded pack ids.
- Export payloads use `payroll.provider_schema_mapping_pack.export.v1` and omit secret material while preserving configurable source/target schema refs and rule snapshots.
- Import creates the next draft version for the tenant/profile so imported packs cannot overwrite active production mapping behavior.
- Added HR-admin mapping pack APIs for list/create, detail/update, import, clone, activate, archive, and export.
- `/hr-admin/payroll-providers` now shows draft/active mapping counts, mapping lifecycle actions, latest lifecycle action, actor evidence, and audit rows.
- Demo provider setup includes an active v1 and draft v2 mapping pack so browser coverage exercises version governance.
- Backend and Playwright coverage prove lifecycle API behavior, active-version supersession, import/export evidence, and visible mapping controls.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_schema_mapping_pack_lifecycle or provider_schema_mapping"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- persisted simulation evidence comparison across versions
- provider-specific signature algorithm adapters for real provider callback/payload formats
- production bank/accounting/statutory SDK or portal automation adapters
- deeper array/line-item transforms for provider file formats that require grouped or nested row expansion

## Payroll Phase 5Y: Visual Mapping Rule Builder UX

Objective:

Make tenant-managed provider schema mappings editable through a modern HR-admin UI so payroll admins can update draft transform and validation rules without raw JSON editing.

Completed:

- Added a client-side mapping rule builder drawer in `/hr-admin/payroll-providers`.
- Draft mapping packs can edit target schema ref, enforcement mode, source paths, target paths, value types, defaults, required flags, transform gate refs, validation payload paths, and validation gate refs.
- Active and archived mapping versions render as locked in the builder, reinforcing the clone-before-edit lifecycle from Phase 5X.
- Added add/remove controls for transform rules and validation gates with incomplete-rule blocking before save.
- Added a Next API proxy for mapping pack `PATCH` updates so browser actions can save to the existing HR-admin backend endpoint.
- Integrated the builder beside mapping lifecycle controls in both the selected provider detail card and mapping pack ledger table.
- Added responsive drawer styling with stable desktop grids and single-column mobile rule editing.
- Browser coverage now opens the rule builder and asserts target schema, enforcement mode, source path, target path, and save controls.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_schema_mapping_pack_lifecycle or provider_schema_mapping"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- persisted simulation evidence comparison across versions
- provider-specific signature algorithm adapters for real provider callback/payload formats
- production bank/accounting/statutory SDK or portal automation adapters
- deeper array/line-item transforms for provider file formats that require grouped or nested row expansion

## Payroll Phase 5Z: Mapping Simulation Preview

Objective:

Let admins simulate draft provider schema mapping packs against sample payroll request snapshots before activation, with visible mapped payload and failed gate evidence.

Completed:

- Added `simulate_payroll_provider_schema_mapping_pack_for_actor` using the same safe mapping engine as provider submissions.
- Added simulation profile evidence with mapping pack id, mapping profile, version, provider/artifact refs, target schema, enforcement mode, gate counts, blockers, mapped provider payload, source request snapshot, and source hash.
- Simulation rejects raw provider credential keys in request snapshots through the existing credential-ref-only route guard.
- Added HR-admin simulation request/result serializers and `/hr-admin/payroll-provider-schema-mapping-packs/<id>/simulate/`.
- Simulation supports temporary mapping contract overrides so live previews can run against unsaved drawer edits.
- Added a Next API proxy for simulation preview.
- The visual rule builder now includes a sample request JSON editor, `Run preview`, mapped provider payload output, gate pass/block chips, blocker counts, and local demo fallback.
- Demo provider mapping packs now include realistic sample request/output snapshots and file-size mapping parity with backend defaults.
- Backend tests prove passed simulation payloads and blocked-gate evidence; Playwright opens the drawer and verifies preview output.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_schema_mapping_pack_lifecycle or provider_schema_mapping"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- persisted simulation evidence comparison across versions
- provider-specific signature algorithm adapters for real provider callback/payload formats
- production bank/accounting/statutory SDK or portal automation adapters
- deeper array/line-item transforms for provider file formats that require grouped or nested row expansion

## Payroll Phase 6A: Provider Signature Adapter Framework

Objective:

Make provider callback signature verification adapter-driven so bank, accounting, and statutory integrations can select deterministic hash or keyed signature behavior from tenant/provider configuration instead of hardcoded callback rules.

Completed:

- Added callback signature framework refs, deterministic SHA-256 adapter refs, and HMAC-SHA256-ref adapter refs.
- Callback security policies now carry configurable signature adapter refs, material fields, delimiters, digest format, and signature key refs.
- Existing callback signatures remain backward-compatible through the deterministic SHA-256 adapter and the previous default material order.
- Added adapter-backed `verify_provider_callback_signature` and kept `expected_provider_callback_signature` as a compatibility helper.
- Callback event verification snapshots now include signature adapter evidence, material field refs, material hashes, digest/compare mode, expected/received signatures, and validation status.
- Callback security gates now expose signature adapter refs and material evidence alongside policy refs.
- Default provider connection blueprints expose signature adapter and key refs without raw provider secrets.
- `/hr-admin/payroll-handoff` now shows signature adapter evidence inside provider callback cards.
- Demo handoff data and Playwright coverage expose the signature adapter contract.
- Backend coverage proves the standard deterministic path, strict security rejection, and a configured HMAC-ref adapter callback path.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_callback_endpoint"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"` from `web`

Still open:

- secret-manager-backed runtime key resolution for production HMAC/RSA provider signatures
- persisted simulation evidence comparison across mapping versions
- production bank/accounting/statutory SDK or portal automation adapters
- deeper array/line-item transforms for provider file formats that require grouped or nested row expansion

## Payroll Phase 6B: Runtime Signature Key Resolution

Objective:

Allow production provider callback signature adapters to resolve signing keys from the runtime credential resolver while preserving credential-ref-only delivery, callback, and audit snapshots.

Completed:

- Reused the existing payroll provider credential resolver for callback signature key refs.
- Added configurable `signature_key_resolution_mode`, `signature_key_material_field`, and `require_runtime_signature_key` policy fields.
- The HMAC-SHA256-ref signature adapter now supports runtime secret resolution in addition to reference-derived sandbox mode.
- Runtime signing key material is used only in memory; callback verification snapshots persist only sanitized credential metadata and material field refs.
- Signature adapter evidence now records runtime key mode, credential source refs, credential metadata, selected material field, and resolution status without raw secret values.
- Backward-compatible deterministic SHA-256 and reference-derived HMAC behavior remains available for demo, sandbox, and existing tests.
- Backend coverage proves a runtime-resolved signing secret can verify a provider callback and does not leak into delivery or callback snapshots.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_callback_endpoint or callback_signature_adapter"`
- `npm run typecheck` from `web`

Still open:

- RSA/public-key callback signature adapters for providers that sign with asymmetric keys
- persisted simulation evidence comparison across mapping versions
- production bank/accounting/statutory SDK or portal automation adapters
- deeper array/line-item transforms for provider file formats that require grouped or nested row expansion

## Payroll Phase 6C: Asymmetric Callback Signature Adapters

Objective:

Verify provider callbacks signed with RSA-SHA256 public-key contracts so production integrations can support asymmetric webhook signatures without storing provider private keys or hardcoded verification rules.

Completed:

- Added `cryptography` as a backend dependency for real RSA public-key verification.
- Added RSA-SHA256 callback algorithm and public-key signature adapter refs.
- Callback policy config now supports provider signature encoding, with RSA demo and tests using base64 signatures.
- The signature adapter resolver now auto-selects the RSA public-key adapter when `payroll.callback.signature.rsa_sha256.v1` is configured.
- RSA verification loads PEM public keys from the runtime provider credential resolver and verifies received signatures with PKCS#1 v1.5 plus SHA-256.
- RSA callback verification does not generate or persist an expected signature because public-key verification validates the received signature directly.
- Callback signature storage and API validation now allow provider-sized signatures up to 1024 characters.
- Added migration `0028_alter_payrollprovidercallbackevent_signature`.
- Demo provider callback evidence now shows the RSA public-key signature adapter in `/hr-admin/payroll-handoff`.
- Backend tests generate an RSA keypair, sign callback material, verify through the public-key adapter, and prove private-key material is not persisted.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_callback_endpoint or callback_signature_adapter"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"` from `web`

## Payroll Phase 6D: Production HTTP Provider Adapter Foundation

Objective:

Submit payroll handoff artifacts to production-style provider HTTP APIs through configurable route metadata, runtime credentials, pluggable transports, and sanitized evidence instead of hardcoded provider dispatch.

Completed:

- Added `payroll.provider_adapter.http_json.v1` as a generic HTTP JSON provider submission adapter.
- Delivery routes now carry `http_adapter` configuration snapshots through handoff package generation.
- HTTP adapter config supports endpoint URL, method, timeout, transport ref, auth scheme, API-key header name, static headers, response extraction paths, and domain contract refs.
- HTTPS endpoint enforcement is enabled by default, with an explicit non-production override for insecure HTTP testing.
- Runtime provider credentials now support bearer/API-key material for outbound provider dispatch without persisting raw secrets in delivery snapshots.
- HTTP transport is pluggable through `PAYROLL_PROVIDER_HTTP_TRANSPORTS`, with a default urllib JSON transport and test transport injection.
- Provider responses can extract status, external reference, provider batch ref, failure code/reason, and certification evidence refs from configured JSON paths.
- Response evidence records sanitized request metadata, redacted headers, response status/header/body checksum, parsed JSON, mapped provider payload, and schema mapping evidence.
- Demo bank advice routes now use the HTTP JSON adapter and expose adapter profile, method, transport, and auth scheme in `/hr-admin/payroll-handoff`.
- Backend tests cover runtime credential dispatch, strict adapter contract validation, acknowledgement extraction, and raw-secret redaction.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_http_json_adapter or provider_adapter_boundary or provider_adapter_strict_contract or provider_specific_sandbox_adapters"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"` from `web`

## Payroll Phase 6E: Persisted Mapping Simulation Comparison

Objective:

Persist provider schema mapping simulation runs and compare candidate mapping payloads against the active provider mapping baseline, so tenant admins can approve mapping changes with auditable field-level evidence.

Completed:

- Added `PayrollProviderSchemaMappingSimulation` as a tenant-scoped simulation and comparison ledger.
- Each simulation records mapping pack version, active baseline version, request snapshot, candidate provider payload, baseline provider payload, gate evidence, blocker refs, comparison evidence, actor metadata, and source hash.
- Simulation comparison now flattens provider payload paths and stores changed, added, removed, unchanged counts plus a compact diff sample.
- The simulation API returns both the preview result and the persisted simulation run.
- Payroll provider setup payloads now include simulation summary counts and latest simulation ledger rows.
- `/hr-admin/payroll-providers` now exposes simulation totals, active comparison evidence, latest diff details, and a simulation ledger table.
- The mapping rule builder drawer now shows comparison status and changed/added/removed counts after preview.
- Demo data now includes a persisted active-vs-draft bank mapping simulation for browser and visual coverage.
- Backend tests prove simulation runs are persisted, compared to the active baseline, source-hashed, and returned through setup APIs.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common/api_serializers.py apps/common/api_views.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "schema_mapping_pack_lifecycle or provider_connection_setup_certification"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

## Payroll Phase 6F: Advanced Provider File Mapping Transforms

Objective:

Support nested provider file and API payload layouts through configurable row expansion, grouping, and aggregate transforms, so bank, accounting, and statutory providers can receive real-world line-item structures without provider-specific hardcoding.

Completed:

- Extended the provider mapping engine with `expand_rows` and `group_rows` transform modes while keeping `copy` as the default behavior.
- `expand_rows` maps source arrays into nested provider payload arrays through configurable row mappings.
- `group_rows` groups source arrays by a configured source path, writes group keys, emits nested row arrays, and applies aggregate rules.
- Added configurable aggregate operations for `sum` and `count`, with existing value formatting support.
- Row mappings now emit row-level gates, so required employee/amount fields can block strict mapping simulations.
- Persisted mapping simulation comparison now captures advanced array-path diffs such as `payment.employee_rows[0].employee.code`.
- The mapping rule builder preserves advanced transform config, exposes transform mode selection, and shows row mapping/aggregate summaries.
- Demo provider mapping data now includes nested employee payout rows and grouped cost-center totals.
- Backend tests prove nested row expansion, grouped aggregate output, comparison diffs, and persisted simulation snapshots.
- Browser tests verify the provider workspace exposes advanced transform modes and preview output.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "schema_mapping_pack"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

## Payroll Phase 6G: Production Queue Runtime Integration

Objective:

Make the payroll provider queue safer for SaaS production operations by adding configurable heartbeat, stale-lease recovery, and dead-letter recovery controls while preserving the local database-backed worker ledger.

Completed:

- Added heartbeat timestamps, heartbeat counts, recovery counts, and latest recovery timestamps to provider jobs.
- Added worker heartbeat support for leased/running jobs with lease extension and runtime evidence snapshots.
- Added stale leased/running job recovery before due-job processing.
- Added configurable recovery limits and stale-recovery backoff, with exhausted jobs moved to dead-letter status.
- Queue worker results and the `process_payroll_provider_jobs` command now report recovered job counts.
- HR-admin finance handoff setup APIs now expose recovered, heartbeat, and stale provider job counts.
- Provider job API payloads now include heartbeat and recovery runtime fields.
- `/hr-admin/payroll-handoff` now shows heartbeat count, recovery count, last heartbeat/recovery timestamps, and queue runtime profile refs.
- Demo data now includes provider queue runtime examples for completed, queued/recovered, and callback jobs.
- Browser coverage verifies the finance handoff workspace surfaces runtime heartbeat and recovery evidence.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common/api_serializers.py apps/common/api_views.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_job or retry_worker_processes_due_events"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"` from `web`

## Payroll Phase 6H: Auditor Drilldown UX

Objective:

Give HR/payroll auditors a URL-addressable evidence drilldown in the finance handoff workspace so provider mapping, delivery, retry, callback, queue runtime, and reconciliation evidence can be inspected from the same SaaS operations surface.

Completed:

- Added URL-backed evidence selection with `delivery`, `retry`, `job`, and `callback` drilldown types.
- Converted provider delivery, retry, queue job, and callback cards into selectable evidence links while preserving handoff/artifact context.
- Added delivery evidence panels for provider routing, adapter contract, schema mapping, connection gate, certification evidence, checksums, linked jobs/retries/callbacks, reconciliation, and failures.
- Added retry evidence panels for retry policy, failure taxonomy, scheduling decision, attempt/backoff controls, and linked queue recovery state.
- Added queue runtime evidence panels for queue policy, worker profile, lease/heartbeat/recovery controls, idempotency, runtime profile, and runtime event history.
- Added callback evidence panels for webhook identity, callback verification, signature adapter, runtime credential-resolution evidence, webhook security policy, and security gates.
- Preserved the existing artifact detail panel when no evidence item is selected.
- Updated handoff UI styling for selected ledger cards, compact audit blocks, gate chips, and runtime event rows.
- Extended handoff E2E coverage to click delivery, retry, queue-job, and callback evidence drilldowns.
- Refreshed and verified payroll handoff visual baselines.

Validation:

- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"` from `web`

## Payroll Phase 6I: Locked Provider Audit Pack Packaging

Objective:

Generate a locked, downloadable provider audit pack for terminal finance handoffs so SaaS tenants can preserve the complete provider evidence chain with deterministic checksums, redacted snapshots, retention metadata, and existing artifact access governance.

Completed:

- Added `provider_audit_pack` as a payroll output artifact kind.
- Added provider audit pack constants for profile, schema, lock, and 10-year retention posture.
- Added deterministic audit-pack snapshot generation across handoff, payroll run, output batch, finance artifacts, provider deliveries, callbacks, retries, and queue jobs.
- Added recursive redaction for raw-looking credential, token, authorization, secret, and private-key fields before evidence hashing and storage.
- Added locked published JSON artifact generation for accepted or failed finance handoffs with terminal provider delivery evidence.
- Added evidence checksum metadata to audit-pack totals/config snapshots and JSON payloads.
- Reused the existing payroll artifact storage, download, signed-access, immutability, and access-audit contracts for generated audit packs.
- Added an HR-admin finance handoff action endpoint to generate or reuse the audit pack without mutating accepted handoff snapshots.
- Updated handoff setup APIs to include provider audit pack counts and audit-pack artifacts.
- Updated `/hr-admin/payroll-handoff` with audit-pack metrics, generation action, locked pack cards, retention/checksum details, and artifact download visibility.
- Demo data now includes a provider audit pack for browser and visual coverage.
- Backend tests prove pack generation, idempotent reuse, evidence counts, redaction posture, downloads, checksums, and setup summaries.
- Browser tests verify audit-pack visibility and detail navigation.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common/api_serializers.py apps/common/api_views.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "finance_handoff_generate_and_transmit"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"` from `web`

Still open:

- provider-specific live SDK/portal automation implementations behind the production adapter-pack contracts
- provider-side storage/IAM policy verification against production provider APIs

## Payroll Phase 6J: Production Provider Adapter Packs

Objective:

Add configurable production adapter-pack scaffolds for bank, accounting, and statutory provider delivery so SaaS tenants can move from generic/manual adapter refs to explicit production transport, contract, credential, certification, and evidence controls without hardcoded provider logic.

Completed:

- Added production adapter refs for bank, accounting, and statutory delivery domains.
- Added `production_adapter` route validation, including required config for production-pack adapters, supported transport modes, HTTPS endpoint checks, and existing recursive raw-secret rejection.
- Added configurable production pack adapters that stamp adapter pack/profile refs, environment, transport mode/ref, operation ref, domain contract ref, evidence profile ref, idempotency/checksum/callback/storage controls, provider connection evidence, credential-resolution evidence, schema mapping evidence, and provider artifact metadata.
- Registered bank, accounting, and statutory production pack adapters in the provider adapter resolver while preserving custom `PAYROLL_PROVIDER_ADAPTERS` override support for live SDK implementations.
- Threaded `production_adapter` through provider delivery route and submission contract snapshots.
- Hardened finance handoff transmission by pre-creating all provider deliveries before adapter submission so immediate `reconciled` production responses cannot prematurely lock the handoff before later deliveries exist.
- Updated `/hr-admin/payroll-handoff` demo data to show production-pack routes for bank, accounting, and statutory delivery.
- Updated the handoff artifact detail and audit drilldown panels with production pack, transport, operation, and evidence metadata.
- Added backend smoke coverage for all three production pack domains, strict adapter contract gates, credential-ref resolution, unsupported transport rejection, certification evidence preservation, and raw-secret non-persistence.
- Extended Playwright handoff coverage and refreshed visual baselines for the production-pack UI.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common/api_views.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "production_adapter_packs"`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_adapter_boundary_resolves_sandbox_credentials or provider_http_json_adapter_submits_with_runtime_credentials or provider_adapter_strict_contract_blocks_invalid_result or provider_specific_sandbox_adapters_stamp_domain_contracts or finance_handoff_generate_and_transmit"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff"` from `web`

Still open:

- live bank/accounting/statutory SDK or portal automation implementations plugged into `PAYROLL_PROVIDER_ADAPTERS`
- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance

## Payroll Phase 6K: Live Adapter Registry Readiness

Objective:

Make live payroll provider adapter registration inspectable before tenants switch production handoffs to real bank SDKs, accounting SDKs, or statutory portal automations.

Completed:

- Added a deployment-derived provider adapter registry readiness snapshot through `describe_payroll_provider_adapter_registry`.
- Registry readiness now covers built-in adapters, configured `PAYROLL_PROVIDER_ADAPTERS` entries, and adapter refs required by tenant provider connections.
- Custom adapter refs can be loaded from `module:attribute`, class, or object settings values; invalid imports are reported as blocked entries instead of breaking provider setup.
- Missing required connection adapter refs are reported with `adapter_ref_not_registered` instead of being hidden by the manual fallback path.
- Registry entries expose source ref, loader ref, ready/blocked status, required-by-connection flag, blocking refs, adapter family, supported artifact kinds, HTTP/manual/sandbox/production-pack classification, and route-config requirement.
- Provider setup API payloads now include `adapter_registry` plus summary counts for total, ready, blocked, configured, and production-pack adapters.
- `/hr-admin/payroll-providers` now shows adapter registry metrics and a live adapter readiness table beside provider onboarding, certification, mapping, and simulation evidence.
- Demo data includes built-in adapters, production-pack adapters, and a configured live SDK-style adapter entry for browser and visual coverage.
- Backend tests cover registry readiness directly and through the provider setup endpoint, including configured custom and broken adapter refs.
- Browser tests cover registry visibility, production pack entries, HTTP JSON classification, and configured adapter source evidence.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common/api_serializers.py apps/common/api_views.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "adapter_registry_readiness"`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_connection_setup_certification_and_activation or production_adapter_packs"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- live accounting/statutory SDK or portal automation adapter implementations behind the registered refs
- production-grade bank SDK client implementation behind the live bank payout adapter contract
- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance

## Payroll Phase 6L: Bank Live Payout Adapter Contract

Objective:

Make bank payout delivery runnable through a configurable live-adapter contract so SaaS tenants can plug in a bank SDK/client without hardcoded request fields, credentials, debit accounts, response paths, or evidence handling.

Completed:

- Added built-in `payroll.provider_adapter.bank.live_payout.v1` with bank-advice-only artifact support.
- Added route validation for nested `bank_payout_adapter` config and preserved recursive raw-secret rejection for all payout route settings.
- Added runtime client resolution through `PAYROLL_BANK_PAYOUT_CLIENTS`, keeping concrete bank SDK clients outside payroll core.
- Built live payout request gates for credential refs, client refs, debit account refs, payment date, operation refs, mapped totals, mapped employee rows, checksums, and idempotency.
- The adapter now submits mapped provider payload rows to an injected bank client and stores sanitized acknowledgement evidence including payout profile, operation, debit account ref, totals, row counts, UTR refs, transaction refs, evidence refs, failure taxonomy, policy refs, credential snapshot, and redacted provider response.
- Hardened adapter contract required-field checks so nested list/object response evidence can be required by tenant contracts.
- Threaded `bank_payout_adapter` through provider delivery route and submission contract snapshots.
- `/hr-admin/payroll-handoff` demo data now uses the live bank payout adapter for bank advice and surfaces live payout details in artifact detail and audit drilldown views.
- `/hr-admin/payroll-providers` registry data now includes the built-in live bank payout adapter and classifies it as bank payout readiness.
- Added backend coverage proving injected-client execution, runtime credential usage, mapped row payloads, UTR/evidence persistence, strict result-contract validation, and raw-secret non-persistence.
- Updated Playwright handoff/provider coverage and refreshed visual baselines for live payout evidence.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common/api_serializers.py apps/common/api_views.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "bank_live_payout_adapter or production_adapter_packs or adapter_registry_readiness"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff|payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff|payroll-providers"` from `web`

Still open:

- provider-specific bank SDK client package and certification fixtures for real external bank sandboxes
- live accounting SDK adapter implementation
- live statutory portal/API adapter implementation
- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance

## Payroll Phase 6M: Accounting Live Journal Adapter Contract

Objective:

Make accounting export delivery runnable through a configurable live journal adapter so SaaS tenants can plug in an accounting/ERP SDK client without hardcoded ledger schemas, company refs, posting dates, credentials, response paths, or voucher evidence handling.

Completed:

- Added built-in `payroll.provider_adapter.accounting.live_journal.v1` with accounting-export-only artifact support.
- Added `accounting_journal_adapter` route validation and kept recursive raw-secret rejection across nested accounting route settings.
- Added runtime client resolution through `PAYROLL_ACCOUNTING_JOURNAL_CLIENTS`, keeping ERP/accounting SDK code outside payroll core.
- Built live journal request gates for credential refs, client refs, company refs, posting date, journal operation refs, mapped totals, mapped journal rows, checksums, and idempotency.
- The adapter submits mapped provider payload rows to an injected accounting client and stores sanitized acknowledgement evidence including ledger/posting profile refs, operation, company/books refs, totals, row counts, voucher refs, document refs, evidence refs, failure taxonomy, balancing/idempotency/checksum/secret-material policy refs, credential snapshot, and redacted provider response.
- Reused nested response-field contract validation so tenant contracts can require evidence such as `accounting_journal.voucher_refs`.
- Threaded `accounting_journal_adapter` through provider delivery route and submission contract snapshots.
- `/hr-admin/payroll-handoff` demo data now uses the live accounting journal adapter for accounting exports and surfaces live journal details in artifact detail and audit drilldown views.
- `/hr-admin/payroll-providers` registry data now includes the built-in live accounting journal adapter and classifies it as accounting journal readiness.
- Added backend coverage proving injected-client execution, runtime credential usage, mapped journal row payloads, voucher/document/evidence persistence, strict result-contract validation, and raw-secret non-persistence.
- Updated Playwright handoff/provider coverage and refreshed visual baselines for live accounting journal evidence.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common/api_serializers.py apps/common/api_views.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "accounting_live_journal_adapter or bank_live_payout_adapter or production_adapter_packs or adapter_registry_readiness"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff|payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff|payroll-providers"` from `web`

Still open:

- provider-specific bank and accounting SDK client packages/certification fixtures for real external sandboxes
- provider-specific statutory portal/API client package and certification fixtures for real external sandboxes
- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance

## Payroll Phase 6N: Statutory Live Filing Adapter Contract

Objective:

Make statutory report delivery runnable through a configurable live filing adapter so SaaS tenants can plug in statutory portal/API clients without hardcoded authority refs, employer registrations, filing types, receipt paths, credentials, or provider evidence handling.

Completed:

- Added built-in `payroll.provider_adapter.statutory.live_filing.v1` with statutory-report-only artifact support.
- Added `statutory_filing_adapter` route validation and preserved recursive raw-secret rejection across nested statutory route settings.
- Added runtime client resolution through `PAYROLL_STATUTORY_FILING_CLIENTS`, keeping provider portal/API client code outside payroll core.
- Built live filing request gates for credential refs, client refs, authority refs, employer registration refs, filing type refs, filing operation refs, mapped totals, mapped filing rows, checksums, and idempotency.
- The adapter submits mapped provider payload rows to an injected statutory client and stores sanitized acknowledgement evidence including filing profile, operation, filing type, authority, registration, calendar, due date, totals, row counts, receipt refs, challan refs, acknowledgement refs, evidence refs, failure taxonomy, receipt/idempotency/checksum/secret-material policy refs, credential snapshot, and redacted provider response.
- Certification evidence now carries statutory receipt/challan/acknowledgement refs returned by the live adapter.
- Threaded `statutory_filing_adapter` through provider delivery route and submission contract snapshots.
- `/hr-admin/payroll-handoff` demo data now uses the live statutory filing adapter for statutory summary delivery and surfaces live filing details in artifact detail and audit drilldown views.
- `/hr-admin/payroll-providers` registry data now includes the built-in live statutory filing adapter and classifies it as statutory filing readiness.
- Added backend coverage proving injected-client execution, runtime credential usage, mapped filing row payloads, receipt/challan/evidence persistence, strict result-contract validation, and raw-secret non-persistence.
- Updated Playwright handoff/provider coverage and refreshed visual baselines for live statutory filing evidence.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll apps/common/api_serializers.py apps/common/api_views.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "statutory_live_filing_adapter or accounting_live_journal_adapter or bank_live_payout_adapter or production_adapter_packs or adapter_registry_readiness"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-handoff-flows.spec.ts tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff|payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-handoff|payroll-providers"` from `web`

Still open:

- real vendor bank/accounting/statutory SDK or portal client packages for external sandboxes
- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance

## Payroll Phase 6O: Provider Client Registry And Certification Fixtures

Objective:

Make live payroll provider adapters executable through registry-visible client refs, with deterministic certification fixtures that prove the bank/accounting/statutory client boundary without hardcoded secrets or vendor SDK coupling in payroll core.

Completed:

- Added built-in `payroll.provider_client.bank.fixture.v1`, `payroll.provider_client.accounting.fixture.v1`, and `payroll.provider_client.statutory.fixture.v1` clients.
- Live bank/accounting/statutory adapters now resolve deployment-configured clients first, then built-in fixture clients by ref.
- Added a provider client registry descriptor that classifies built-in, configured, fixture, live, blocked, and required client refs across `PAYROLL_BANK_PAYOUT_CLIENTS`, `PAYROLL_ACCOUNTING_JOURNAL_CLIENTS`, and `PAYROLL_STATUTORY_FILING_CLIENTS`.
- Registry readiness validates executable family-specific client methods such as `submit_payout`, `post_journal`, `submit_journal`, `submit_filing`, and `upload_filing`.
- Setup APIs now return `client_registry` with summary counts for ready, blocked, configured, and fixture clients.
- `/hr-admin/payroll-providers` now shows provider client readiness beside adapter readiness, including source refs, methods, fixture mode, and blockers.
- Demo setup data mirrors the live payload shape with fixture clients and a configured tenant bank client.
- Backend and Playwright coverage proves fixture/configured/missing client classification and provider setup UI visibility.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py apps/common/api_views.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `npm run typecheck` from `web`

Still open:

- real vendor bank/accounting/statutory SDK or portal client packages for external sandboxes
- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance

## Payroll Phase 6P: Provider Package Manifest Registry

Objective:

Make provider integrations packageable through manifest metadata so SaaS deployments can declare adapter refs, client refs, fixture refs, route config requirements, certification scenarios, evidence paths, and secret policy without hardcoding vendor behavior in payroll core.

Completed:

- Added built-in bank/accounting/statutory package manifests behind `payroll.provider_package.bank.fixture.v1`, `payroll.provider_package.accounting.fixture.v1`, and `payroll.provider_package.statutory.fixture.v1`.
- Added `PAYROLL_PROVIDER_PACKAGES` registry support for deployment-specific package manifests.
- Package readiness now validates provider kind, adapter registration, client registration, optional certification fixture client registration, supported artifact kinds, required route config refs, certification scenarios, evidence paths, and reference-only secret policy.
- Route validation accepts a string `provider_package_ref` and rejects non-reference objects.
- Setup APIs now return `package_registry` with summary counts for ready, blocked, configured, and fixture package manifests.
- `/hr-admin/payroll-providers` now shows package manifest readiness alongside adapter and client readiness.
- Demo setup data mirrors package manifests with built-in fixture packages and a configured tenant bank SDK package.
- Backend and Playwright coverage proves configured, fixture, missing, and unsafe package-manifest classification.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py apps/common/api_views.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_package_registry_readiness or live_adapters_can_execute_builtin_fixture_clients or provider_client_registry_readiness or adapter_registry_readiness or statutory_live_filing_adapter or accounting_live_journal_adapter or bank_live_payout_adapter or production_adapter_packs"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- real vendor bank/accounting/statutory SDK or portal package implementations for external sandboxes
- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance

## Payroll Phase 6Q: Bank SDK HTTP Package Skeleton

Objective:

Create the first real-provider package skeleton for bank payouts so a SaaS deployment can wire a bank SDK/API transport through configuration while payroll core keeps using the same live bank adapter contract.

Completed:

- Added `payroll.provider_client.bank.sdk_http.v1` as a built-in bank payout client skeleton.
- Added `payroll.provider_package.bank.sdk_http.v1` as a built-in package manifest with endpoint, transport, auth, debit account, payment date, route config, scenario, and evidence-path declarations.
- Extended `bank_payout_adapter` route config normalization to carry `provider_package_ref`, `endpoint_url`, `transport_ref`, `timeout_seconds`, `auth_scheme`, `api_key_header_name`, `static_headers`, and `allow_insecure_http`.
- The bank SDK HTTP client delegates network execution to `PAYROLL_PROVIDER_HTTP_TRANSPORTS`, allowing tests and deployments to inject transport implementations.
- The client supports reference-resolved bearer/API-key auth and returns normalized bank payout acknowledgement fields to the existing live bank adapter.
- Evidence includes package/client refs, transport ref, endpoint URL, timeout, auth scheme, header names, response status, and response checksum without persisting runtime credential material.
- Provider client and package registries now classify the bank SDK HTTP skeleton as a built-in live package, separate from certification fixtures.
- Demo setup data and `/hr-admin/payroll-providers` browser coverage now expose the bank SDK HTTP client and package refs.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py apps/common/api_views.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "bank_sdk_http_package_skeleton or provider_package_registry_readiness or live_adapters_can_execute_builtin_fixture_clients or provider_client_registry_readiness or adapter_registry_readiness or statutory_live_filing_adapter or accounting_live_journal_adapter or bank_live_payout_adapter or production_adapter_packs"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- accounting SDK HTTP/package skeleton
- statutory API/portal package skeleton
- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance

## Payroll Phase 6R: Accounting SDK HTTP Package Skeleton

Objective:

Create the accounting journal SDK/API package skeleton so SaaS deployments can post payroll journals through a configured transport while payroll core keeps using the same live accounting adapter contract.

Completed:

- Added `payroll.provider_client.accounting.sdk_http.v1` as a built-in accounting journal client skeleton.
- Added `payroll.provider_package.accounting.sdk_http.v1` as a built-in package manifest with endpoint, transport, auth, company/books, posting date, route config, scenario, and evidence-path declarations.
- Extended `accounting_journal_adapter` route config normalization to carry `provider_package_ref`, `endpoint_url`, `transport_ref`, `timeout_seconds`, `auth_scheme`, `api_key_header_name`, `static_headers`, and `allow_insecure_http`.
- The accounting SDK HTTP client delegates network execution to `PAYROLL_PROVIDER_HTTP_TRANSPORTS`, allowing tests and deployments to inject accounting SDK/API transport implementations.
- The client supports reference-resolved bearer/API-key auth and returns normalized accounting journal acknowledgement fields to the existing live accounting adapter.
- Evidence includes package/client refs, transport ref, endpoint URL, timeout, auth scheme, header names, response status, and response checksum without persisting runtime credential material.
- Provider client and package registries now classify the accounting SDK HTTP skeleton as a built-in live package, separate from certification fixtures.
- Demo setup data and `/hr-admin/payroll-providers` browser coverage now expose the accounting SDK HTTP client and package refs.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py apps/common/api_views.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "accounting_sdk_http_package_skeleton or bank_sdk_http_package_skeleton or provider_package_registry_readiness or live_adapters_can_execute_builtin_fixture_clients or provider_client_registry_readiness or adapter_registry_readiness or statutory_live_filing_adapter or accounting_live_journal_adapter or bank_live_payout_adapter or production_adapter_packs"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- statutory API/portal package skeleton
- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance

## Payroll Phase 6S: Statutory SDK HTTP Package Skeleton

Objective:

Create the statutory filing SDK/API package skeleton so SaaS deployments can submit statutory reports through a configured transport while payroll core keeps using the same live statutory adapter contract.

Completed:

- Added `payroll.provider_client.statutory.sdk_http.v1` as a built-in statutory filing client skeleton.
- Added `payroll.provider_package.statutory.sdk_http.v1` as a built-in package manifest with endpoint, transport, auth, authority, registration, filing type, filing calendar, due date, route config, scenario, and evidence-path declarations.
- Extended `statutory_filing_adapter` route config normalization to carry `provider_package_ref`, `endpoint_url`, `transport_ref`, `timeout_seconds`, `auth_scheme`, `api_key_header_name`, `static_headers`, and `allow_insecure_http`.
- The statutory SDK HTTP client delegates network execution to `PAYROLL_PROVIDER_HTTP_TRANSPORTS`, allowing tests and deployments to inject statutory SDK/API or portal automation transport implementations.
- The client supports reference-resolved bearer/API-key auth and returns normalized statutory filing acknowledgement fields to the existing live statutory adapter.
- Evidence includes package/client refs, transport ref, endpoint URL, timeout, auth scheme, header names, response status, and response checksum without persisting runtime credential material.
- Provider client and package registries now classify the statutory SDK HTTP skeleton as a built-in live package, separate from certification fixtures.
- Demo setup data and `/hr-admin/payroll-providers` browser coverage now expose the statutory SDK HTTP client and package refs.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py apps/common/api_views.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "statutory_sdk_http_package_skeleton or accounting_sdk_http_package_skeleton or bank_sdk_http_package_skeleton or provider_package_registry_readiness or live_adapters_can_execute_builtin_fixture_clients or provider_client_registry_readiness or adapter_registry_readiness or statutory_live_filing_adapter or accounting_live_journal_adapter or bank_live_payout_adapter or production_adapter_packs"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`

Still open:

- provider-side storage/IAM policy verification against production provider APIs
- lifecycle/KMS/scanning service integration for generated artifact governance
- real vendor package modules behind the SDK HTTP skeleton refs

## Payroll Phase 6T: Provider Storage/IAM Policy Readiness

Objective:

Expose artifact storage and IAM policy readiness as part of provider launch control so SaaS deployments can prove package-level storage governance before production payroll handoff is activated.

Completed:

- Added `payroll.storage_policy_registry.readiness.v1` through `describe_payroll_artifact_storage_policy_registry`.
- Provider package manifests now declare `storage_policy_refs`, keeping storage governance explicit and package-owned instead of hidden in runtime code.
- Package readiness blocks missing, omitted, disabled, or otherwise blocked storage policy refs through `storage_policy_ref_blocked` and `storage_policy_refs_required` gates.
- Storage policy registry entries classify builtin, configured, required, ready, missing, and blocked policies.
- Registry capabilities expose policy controls for provider family scope, credential scope, bucket/container scope, retention scope, encryption, private endpoints, runtime credentials, lifecycle policy, malware scanning, durability policy, endpoint host allowlists, and max file size.
- Readiness evidence recursively redacts secret-shaped metadata keys before returning policy snapshots to the API/UI.
- HR admin provider setup API now includes storage policy registry counts and policy rows.
- `/hr-admin/payroll-providers` now shows an artifact policy readiness table alongside provider package/client/adapter readiness.
- Demo setup data and browser coverage now include default, strict runtime, and blocked storage policy examples.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/storage.py apps/payroll/providers.py apps/common/api_views.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "storage_policy_registry or provider_package_registry_readiness or statutory_sdk_http_package_skeleton or accounting_sdk_http_package_skeleton or bank_sdk_http_package_skeleton or provider_client_registry_readiness or adapter_registry_readiness"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- lifecycle/KMS/scanning service verification against real cloud/provider control planes
- real vendor package modules behind the SDK HTTP skeleton refs
- production deployment runbooks for rotating storage/provider credentials per tenant

## Payroll Phase 6U: Storage Control Verification Hooks

Objective:

Move storage/IAM readiness from declaration-only policy checks toward service-backed verification evidence while keeping the implementation cloud-neutral and deployment-configurable.

Completed:

- Added `PayrollArtifactStorageControlVerification` snapshots for individual storage controls.
- Added `verify_payroll_artifact_storage_policy_controls` to evaluate KMS/encryption, lifecycle, malware scan, durability, and IAM control refs from a storage policy.
- Added `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFIERS` support so deployments can inject verifier callbacks by control ref, control kind, or wildcard.
- Added configurable `declaration` and `strict` verification modes through policy metadata or `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE`.
- Strict mode blocks readiness when a required control verifier is missing, raises, or returns a blocked result.
- Declaration mode keeps local/default policies non-breaking while still surfacing declared controls as evidence.
- Control verification evidence is recursively redacted for secret-shaped keys before API/UI exposure.
- Storage policy registry rows now include `control_verification` snapshots and verified/blocked control counts.
- `/hr-admin/payroll-providers` now shows verified/blocked storage control counts inside the artifact policy readiness table.
- Browser demo data includes strict verified controls and a blocked malware-scan control example.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/storage.py apps/payroll/providers.py apps/common/api_views.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "storage_control_verifiers or storage_control_verification_blocks or storage_policy_registry or provider_package_registry_readiness or statutory_sdk_http_package_skeleton or accounting_sdk_http_package_skeleton or bank_sdk_http_package_skeleton"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- real vendor package modules behind the SDK HTTP skeleton refs
- production runbooks and environment templates for tenant-specific verifier wiring
- optional periodic re-verification jobs for storage controls after launch

## Payroll Phase 6V: Bank Vendor Package Module

Objective:

Start real-provider verticalization by adding a named bank payout package module behind the configurable live bank adapter while keeping tenant endpoints, credentials, headers, response paths, and storage policies configurable.

Completed:

- Added `payroll.provider_client.bank.razorpayx_http.v1` as the first named bank payout package client module.
- Added `payroll.provider_package.bank.razorpayx_http.v1` as a built-in provider package manifest.
- The package manifest declares package module, vendor profile, provider contract, adapter, client, fixture client, route config, certification scenarios, evidence paths, schema mapping profile, credential profile, failure taxonomy, secret policy, and storage policy refs.
- The package client reuses the live bank payout adapter and injected `PAYROLL_PROVIDER_HTTP_TRANSPORTS` execution model.
- RazorpayX-compatible response-path defaults map `status`, `id`, `batch_id`, accepted/rejected counts, UTR refs, transaction refs, evidence refs, and error fields into the existing bank payout response contract.
- Tenant deployments can still override endpoint URL, auth scheme, static headers, transport ref, timeout, debit account, payment date, operation refs, and response paths through route config.
- Provider response evidence now includes package module, vendor profile, provider contract, response path profile, response checksum, and redacted credential/header evidence.
- Provider client and package registries expose the named bank package module separately from the generic SDK HTTP skeleton.
- `/hr-admin/payroll-providers` demo data and Playwright coverage now include the named bank module refs.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "bank_razorpayx_http_package_module or provider_client_registry_readiness or provider_package_registry_readiness or bank_sdk_http_package_skeleton"`
- `cd backend && ../.venv/bin/python -m compileall apps/payroll/storage.py apps/payroll/providers.py apps/common/api_views.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "bank_razorpayx_http_package_module or provider_client_registry_readiness or provider_package_registry_readiness or bank_sdk_http_package_skeleton or storage_control_verifiers or storage_policy_registry"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- accounting vendor package module
- statutory vendor package module
- production deployment runbooks and environment templates for bank provider credentials/transports

## Payroll Phase 6W: Accounting Vendor Package Module

Objective:

Continue real-provider verticalization by adding a named accounting journal package module behind the configurable live accounting adapter while keeping tenant endpoints, credentials, company/books refs, posting behavior, headers, response paths, and storage policies configurable.

Completed:

- Added `payroll.provider_client.accounting.tallyprime_http.v1` as the first named accounting journal package client module.
- Added `payroll.provider_package.accounting.tallyprime_http.v1` as a built-in provider package manifest.
- The package manifest declares package module, vendor profile, provider contract, adapter, client, fixture client, route config, certification scenarios, evidence paths, schema mapping profile, credential profile, failure taxonomy, secret policy, and storage policy refs.
- The package client reuses the live accounting journal adapter and injected `PAYROLL_PROVIDER_HTTP_TRANSPORTS` execution model.
- TallyPrime-compatible response-path defaults map `result.status`, `result.guid`, `result.import_id`, posted/rejected counts, voucher refs, document refs, audit evidence refs, and error fields into the existing accounting journal response contract.
- Tenant deployments can still override endpoint URL, auth scheme, static headers, transport ref, timeout, company ref, books ref, posting date, operation refs, and response paths through route config.
- Provider response evidence now includes package module, vendor profile, provider contract, response path profile, response checksum, and redacted credential/header evidence.
- Provider client and package registries expose the named accounting package module separately from the generic SDK HTTP skeleton.
- `/hr-admin/payroll-providers` demo data and Playwright coverage now include the named accounting module refs.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "accounting_tallyprime_http_package_module or provider_client_registry_readiness or provider_package_registry_readiness or accounting_sdk_http_package_skeleton"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- statutory vendor package module
- production deployment runbooks and environment templates for provider credentials/transports

## Payroll Phase 6X: Statutory Vendor Package Module

Objective:

Complete the first real-provider package verticalization set by adding a named statutory filing package module behind the configurable live statutory adapter while keeping tenant endpoints, credentials, authority refs, employer registrations, filing types, headers, response paths, and storage policies configurable.

Completed:

- Added `payroll.provider_client.statutory.epfo_ecr_http.v1` as the first named statutory filing package client module.
- Added `payroll.provider_package.statutory.epfo_ecr_http.v1` as a built-in provider package manifest.
- The package manifest declares package module, vendor profile, provider contract, adapter, client, fixture client, route config, certification scenarios, evidence paths, schema mapping profile, credential profile, failure taxonomy, secret policy, and storage policy refs.
- The package client reuses the live statutory filing adapter and injected `PAYROLL_PROVIDER_HTTP_TRANSPORTS` execution model.
- EPFO ECR-compatible response-path defaults map `filing.status`, `filing.trrn`, `filing.ecr_id`, accepted/rejected counts, receipt refs, challan refs, acknowledgement refs, audit evidence refs, and error fields into the existing statutory filing response contract.
- Tenant deployments can still override endpoint URL, auth scheme, static headers, transport ref, timeout, authority ref, registration ref, filing type, filing calendar, due date, operation refs, and response paths through route config.
- Provider response evidence now includes package module, vendor profile, provider contract, response path profile, response checksum, and redacted credential/header evidence.
- Provider client and package registries expose the named statutory package module separately from the generic SDK HTTP skeleton.
- `/hr-admin/payroll-providers` demo data and Playwright coverage now include the named statutory module refs.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "statutory_epfo_ecr_http_package_module or provider_client_registry_readiness or provider_package_registry_readiness or statutory_sdk_http_package_skeleton"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- production deployment runbooks and environment templates for provider credentials/transports

## Payroll Phase 6Y: Production Provider Readiness Runbook

Objective:

Make the completed provider package architecture operable for SaaS production launch by documenting tenant configuration, runtime settings, launch gates, storage verifiers, certification flow, and support triage without hardcoding provider or cloud behavior.

Completed:

- Added `docs/payroll-production-readiness-runbook.md` with the provider launch principle, runtime settings, built-in package refs, tenant connection checklist, route configuration checklist, storage policy checklist, certification flow, pre-launch command gate, support triage, and production change-control rules.
- Added `docs/payroll-production-env-template.md` with sanitized provider credential resolver examples, callable transport registry shape, custom package manifest shape, bank/accounting/statutory route snapshots, storage credential examples, storage policy examples, and storage verifier callback shape.
- Added explicit backend setting defaults for `PAYROLL_PROVIDER_HTTP_TRANSPORTS`, `PAYROLL_PROVIDER_PACKAGES`, `PAYROLL_BANK_PAYOUT_CLIENTS`, `PAYROLL_ACCOUNTING_JOURNAL_CLIENTS`, `PAYROLL_STATUTORY_FILING_CLIENTS`, `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFIERS`, and `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE`.
- Updated `backend/.env.example` with pointers to the production payroll provider docs while keeping real secret material out of committed env files.
- Linked the provider production readiness runbook and environment template from `docs/hrms-pilot-setup-notes.md`.
- Updated high-level and payroll SaaS architecture plans to mark provider package verticalization and production launch documentation as complete.

Validation:

- `cd backend && ../.venv/bin/python -m compileall config/settings/base.py apps/payroll/providers.py apps/payroll/storage.py`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_client_registry_readiness or provider_package_registry_readiness or storage_policy_registry or storage_control_verifiers or bank_razorpayx_http_package_module or accounting_tallyprime_http_package_module or statutory_epfo_ecr_http_package_module"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- production launch rehearsal against tenant-specific configuration
- full release hardening and non-provider module completion review

## Payroll Phase 6Z: Provider Launch Rehearsal Snapshot

Objective:

Turn the production readiness runbook into an executable setup snapshot that rehearses launch readiness across bank, accounting, statutory, provider package, client, storage policy, certification, and finance handoff enforcement gates.

Completed:

- Added `describe_payroll_provider_launch_rehearsal` with the `payroll.provider_launch_rehearsal.v1` profile.
- The rehearsal aggregates provider connections, tenant route snapshots, adapter registry readiness, client registry readiness, package registry readiness, and storage policy readiness.
- Each bank/accounting/statutory lane reports connection count, launch-ready connection count, route count, adapter ref, client ref, package ref, storage policy refs, blocked storage refs, package module ref, vendor profile ref, provider contract ref, handoff enforcement mode, gates, and blockers.
- Launch readiness now requires a connection, certified/active readiness, route presence, ready adapter, ready package, ready client, ready storage policy refs, and `certified` or `active` finance handoff enforcement.
- `/api/v1/hr-admin/payroll-provider-connection-setup/` now includes `launch_rehearsal` and rehearsal summary counts.
- `/hr-admin/payroll-providers` now displays a production dry-run launch rehearsal panel with per-lane status, package/client refs, storage policy coverage, handoff gate, and blockers.
- Demo provider setup data includes a blocked rehearsal snapshot so local UI review shows the launch readiness concept without real deployment configuration.
- Backend coverage proves a ready three-lane production rehearsal using tenant package refs and strict storage verifier evidence with redaction.
- Browser coverage verifies the launch rehearsal panel and profile ref are visible.
- Production runbook now names the setup API rehearsal snapshot as part of the certification flow.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py apps/common/api_views.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "provider_launch_rehearsal or provider_package_registry_readiness or provider_client_registry_readiness or storage_control_verifiers"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- tenant-specific launch rehearsal against real runtime settings
- full release hardening and non-provider module completion review

## Payroll Phase 7A: Tenant Launch Readiness Command Gate

Objective:

Turn the provider launch rehearsal snapshot into an executable tenant go-live gate that can be run from CI, release checklists, or operator workflows without binding the product to a cloud provider.

Completed:

- Added `describe_payroll_provider_launch_readiness_audit_pack` with the `payroll.provider_launch_readiness.audit_pack.v1` profile.
- The audit pack captures tenant snapshot, summary counts, required provider kinds, lane ledger, connection refs, registry evidence, release gates, blockers, the full launch rehearsal, and an evidence checksum.
- Registry and rehearsal evidence is sanitized through the provider redaction path so verifier secrets and credential-shaped fields are not persisted in launch evidence.
- Added `manage.py rehearse_payroll_provider_launch --tenant-code <tenant-code>` as the tenant-specific launch command gate.
- The command writes the audit pack to `--output-file`, prints readiness counts and checksum, exits nonzero for blocked launches, and supports `--allow-blocked` for diagnostic export.
- Refactored provider setup assembly so the admin API and launch command share the same tenant evidence path.
- Updated the production readiness runbook with the command gate and audit-pack behavior.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/providers.py apps/payroll/management/commands/rehearse_payroll_provider_launch.py apps/common/api_views.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "rehearse_payroll_provider_launch or provider_launch_rehearsal or provider_package_registry_readiness or provider_client_registry_readiness or storage_control_verifiers"`

Still open:

- broader release hardening and non-provider module completion review
- operator-facing launch history/audit archive if we want persisted launch rehearsals in-app

## Payroll Phase 7B: Persisted Launch Rehearsal History

Objective:

Persist provider launch rehearsal runs so SaaS tenant go-live checks have durable history, searchable status fields, actor evidence, blocker refs, and checksums in addition to command-exported JSON.

Completed:

- Added `PayrollProviderLaunchRehearsal` and `PayrollProviderLaunchRehearsalStatus`.
- Added migration `0032_payrollproviderlaunchrehearsal`.
- Persisted rows store the launch rehearsal profile, audit-pack profile, generated-by ref, ready/blocked status, launch flag, lane counts, blocker counts, release blocker refs, sanitized audit-pack snapshot, evidence checksum, generated timestamp, generated-by user, and source hash.
- Added model validation and save-time synchronization so summary fields stay aligned with the audit pack.
- Added `record_payroll_provider_launch_rehearsal` as the shared persistence service.
- Updated `manage.py rehearse_payroll_provider_launch` so command runs also create launch rehearsal history rows.
- Added HR-admin setup API history fields, recent launch rehearsal rows, status options, and latest checksum/status summary.
- Added `/api/v1/hr-admin/payroll-provider-launch-rehearsals/run/` to record a launch rehearsal from the admin workspace.
- Added Django admin visibility for launch rehearsal rows.
- Updated `/hr-admin/payroll-providers` with a run action, launch history metric, and recorded rehearsal table.
- Updated demo data and Playwright coverage for launch history and audit-pack refs.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/payroll/models.py apps/payroll/services.py apps/payroll/management/commands/rehearse_payroll_provider_launch.py apps/common/api_views.py apps/common/api_serializers.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "launch_rehearsal or rehearse_payroll_provider_launch or provider_package_registry_readiness or provider_client_registry_readiness or storage_control_verifiers"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/payroll-providers-flows.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"` from `web`

Still open:

- broader release hardening and non-provider module completion review
- launch rehearsal detail/download screen if operators need in-app audit-pack inspection beyond admin/API

## Payroll Phase 7C: HRMS SaaS Launch Audit

Objective:

Expose a dashboard-level SaaS launch audit that covers the non-provider HRMS surface plus payroll core and provider launch evidence, so launch readiness is visible from the HR admin control center.

Completed:

- Added `hrms.saas_launch_audit.v1` to the HR admin dashboard selector.
- The audit evaluates tenant foundation, IAM workspace access, organization master, employee master, ESS/MSS, leave governance, attendance governance, lifecycle workflows, document compliance, notification delivery, payroll core, and provider launch history.
- Each module returns gate counts, passed counts, blocker counts, warning counts, status, failed refs, and evidence refs.
- Payroll core gates check active payroll calendars, pay groups, salary components, salary structure versions, and payroll rule versions.
- Provider history gates read the latest persisted `PayrollProviderLaunchRehearsal` and keep provider readiness as warning evidence inside the broader HRMS launch audit.
- `/api/v1/hr-admin/dashboard/` now returns `launch_audit` as part of the dashboard contract.
- `/hr-admin` now shows launch audit status, gate progress, blockers, warnings, module rows, and evidence refs.
- Demo data, TypeScript types, route smoke, and laptop/mobile visual snapshots were updated.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/selectors.py apps/common/api_serializers.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "dashboard_returns_saas_launch_audit or employee_cannot_access_hr_admin_dashboard"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/route-smoke.spec.ts` from `web`
- `npx playwright test tests/visual/first-baseline.visual.spec.ts -g "/hr-admin matches" --update-snapshots` from `web`
- `npx playwright test tests/visual/first-baseline.visual.spec.ts -g "/hr-admin matches"` from `web`

Still open:

- owner/action workflows for failed launch gates
- exportable full HRMS release audit packs
- deeper SaaS control-plane readiness for billing, entitlements, support, and tenant lifecycle

## Payroll Phase 7D: Actionable And Exportable HRMS Launch Audit

Objective:

Turn the HRMS SaaS launch audit from a status rollup into an operator-ready release tool with owner/action metadata, configurable remediation routing, and an exportable tenant audit pack.

Completed:

- Added `hrms.saas_launch_audit_profile.v1` as the tenant-resolvable launch audit profile key.
- Default profile metadata now maps each launch module to owner role refs, workspace action routes, action labels, and SLA day targets.
- Gate-level overrides can change action route, action label, owner role, SLA, and severity without changing product code.
- Failed gates now emit `release_actions` with module, owner, route, label, value, severity, status, SLA, and evidence ref.
- `/hr-admin` now shows the first actionable launch remediation items with owner and route buttons.
- Added `describe_hrms_saas_launch_audit_pack` and `hrms.saas_launch_audit_pack.v1`.
- Added `manage.py rehearse_hrms_saas_launch --tenant-code <tenant-code>` with JSON export, deterministic checksum, blocker failure behavior, `--allow-blocked`, and `--strict-warnings`.
- Backend API tests now assert owner/action metadata and command-exported audit packs.
- Route smoke now asserts the control center launch action list.
- `/hr-admin` laptop/mobile visual baselines were refreshed.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/selectors.py apps/common/management/commands/rehearse_hrms_saas_launch.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "dashboard_returns_saas_launch_audit or rehearse_hrms_saas_launch"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/route-smoke.spec.ts` from `web`
- `npx playwright test tests/visual/first-baseline.visual.spec.ts -g "/hr-admin matches" --update-snapshots` from `web`
- `npx playwright test tests/visual/first-baseline.visual.spec.ts -g "/hr-admin matches"` from `web`

Still open:

- persisted owner assignment and remediation-state workflow records if launch actions need assignee lifecycle tracking
- downloadable in-app launch audit pack from the HR admin UI
- deeper SaaS control-plane readiness for billing, entitlements, support, and tenant lifecycle

## Payroll Phase 7E: Persisted Launch Remediation Ledger And In-App Audit Download

Objective:

Persist launch remediation assignments and let HR admins download the current tenant HRMS launch audit pack directly from the control center.

Completed:

- Added `HrmsLaunchRemediationAssignment` and `HrmsLaunchRemediationStatus`.
- Added migration `common/0001_initial.py`.
- Remediation assignments are tenant-owned and unique by gate ref, with module, label, severity, status, owner role ref, action route, action label, SLA days, current value, evidence ref, timestamps, assignment snapshot, and source hash.
- Added Django admin visibility for launch remediation assignments.
- Added `sync_hrms_saas_launch_remediation_assignments` to materialize failed gate actions, keep open assignments current, and close rows when gates pass.
- `/api/v1/hr-admin/dashboard/` now syncs remediation assignments and returns assignment rows plus open/opened/updated/closed counts inside `launch_audit`.
- `manage.py rehearse_hrms_saas_launch` now syncs remediation assignments and exports audit packs with remediation assignment summary included in the checksum.
- Added `/api/v1/hr-admin/saas-launch-audit/download/` for authorized HR admin JSON audit-pack download.
- Added Next proxy route `/api/hr-admin/saas-launch-audit/download`.
- `/hr-admin` now shows open assignment count and a “Download audit” action in the launch audit panel.
- Demo data, TypeScript types, Playwright route smoke, and `/hr-admin` visual baselines were updated.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/models.py apps/common/selectors.py apps/common/api_views.py apps/common/api_urls.py apps/common/management/commands/rehearse_hrms_saas_launch.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "dashboard_returns_saas_launch_audit or rehearse_hrms_saas_launch or download_hrms_saas_launch_audit_pack or employee_cannot_access_hr_admin_dashboard"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/route-smoke.spec.ts` from `web`
- `npx playwright test tests/visual/first-baseline.visual.spec.ts -g "/hr-admin matches" --update-snapshots` from `web`
- `npx playwright test tests/visual/first-baseline.visual.spec.ts -g "/hr-admin matches"` from `web`

## Phase 7F: Launch Remediation Workspace

Objective:

Make launch audit failures operational by giving HR admins a tenant-scoped release-manager desk for filtering, assigning, acknowledging, and accepting launch remediation decisions.

Completed:

- Extended `HrmsLaunchRemediationAssignment` with assignee, acknowledgement, ignore, resolution note, and bounded action-history fields.
- Updated launch remediation sync to preserve ignored assignments and operator edits while still refreshing gate evidence from the latest SaaS launch audit.
- Added `/api/v1/hr-admin/launch-remediations/` with status, severity, owner, module, search, and pagination filters.
- Added `/api/v1/hr-admin/launch-remediations/<id>/` lifecycle actions for acknowledge, assign, ignore, resolve, and reopen with actor attribution.
- Added the `/hr-admin/launch-remediation` workspace with launch-risk metrics, dense filters, assignment rows, action controls, and direct links to owning setup surfaces.
- Added the Launch nav item under HR admin Operations and linked the control center launch audit panel to the assignment workspace.
- Updated demo data, TypeScript API/types, backend smoke tests, Playwright e2e flow, tier-one route smoke, and operational visual baselines.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/models.py apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "launch_remediation or dashboard_returns_saas_launch_audit or download_hrms_saas_launch_audit_pack"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/launch-remediation-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "launch-remediation"` from `web`
- `npx playwright test tests/e2e/route-smoke.spec.ts` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "launch-remediation" --update-snapshots` from `web`

## Phase 7G: Launch Remediation SLA Automation

Objective:

Add due-date, reminder, and escalation mechanics to the launch remediation ledger so pilot readiness can be actively managed instead of manually watched.

Completed:

- Added `due_at`, `due_source_ref`, reminder metadata, escalation metadata, and escalation owner refs to `HrmsLaunchRemediationAssignment`.
- Launch remediation sync now assigns due dates from configurable SLA days for new/open assignments while preserving manual due-date overrides.
- Launch remediation list payloads now expose `due_state`, `days_until_due`, overdue/due-soon flags, overdue/due-soon/unscheduled/escalated summary counts, and due-state filtering.
- Added lifecycle actions for `set_due_date`, `send_reminder`, and `escalate`.
- Reminder and escalation actions use `trigger_notification_event` with module `saas_operations` and tenant-configurable trigger keys, falling back to in-app notifications when no tenant event is configured.
- Added `manage.py process_hrms_launch_remediations` for scheduled due-soon reminders and overdue escalations across one tenant or all tenants.
- Updated `/hr-admin/launch-remediation` with due-state filters, due/reminder/escalation metrics, due-date controls, reminder and escalation actions, and refreshed operational visual baselines.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/models.py apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py apps/common/management/commands/process_hrms_launch_remediations.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "launch_remediation or dashboard_returns_saas_launch_audit or download_hrms_saas_launch_audit_pack"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/launch-remediation-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "launch-remediation"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "launch-remediation" --update-snapshots` from `web`

Still open:

- SaaS commercial control-plane readiness for billing-provider integration, subscription mutation, support, and tenant lifecycle

## Phase 8A: SaaS Commercial Control Plane Foundation

Objective:

Add the first configuration-first commercial control plane so SaaS launch readiness can evaluate tenant plan, subscription status, entitlements, and usage limits without hardcoded product packaging.

Completed:

- Added `saas.commercial_profile.v1` as the default commercial profile for plans, module entitlements, subscription active statuses, required launch entitlements, and launch-blocking usage meters.
- Added `describe_saas_commercial_control` to resolve tenant commercial state from configuration, tenant metadata, current HR dashboard counts, payroll run counts, and provider connection counts.
- Added `/api/v1/hr-admin/saas-control-plane/` for HR admin visibility into profile source, plan, subscription, entitlements, usage limits, and launch-blocking commercial issues.
- Added `saas_commercial_control` to the launch audit with gates for profile resolution, active subscription status, configured plan, required entitlements, and usage-limit readiness.
- Added `/hr-admin/saas-control-plane` with modern metric, entitlement, tenant-state, and usage-limit panels, plus navigation and Playwright coverage.
- Added demo-data support and type contracts for commercial control-plane browser tests.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "saas_control_plane or commercial_profile_override or dashboard_returns_saas_launch_audit"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/saas-control-plane-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "saas-control-plane"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "saas-control-plane"` from `web`

Still open:

- Billing-provider integration, tenant-admin mutation workflows, support tooling, observability, backups, SLAs, and production deployment runbooks

## Phase 8B: Commercial Enforcement and Subscription Lifecycle

Objective:

Move the SaaS commercial control plane from visibility into enforceable product access, while keeping plan/status changes provider-neutral and configuration-first.

Completed:

- Extended `saas.commercial_profile.v1` with configurable enforcement scopes for API path prefixes, HTTP methods, required entitlements, and blocking usage meters.
- Added commercial access evaluation that resolves tenant subscription, plan, entitlements, usage limits, and matching enforcement scopes before allowing protected HR admin operations.
- Added commercial enforcement to the HR admin context layer so payroll and payroll-provider admin APIs are denied when the configured commercial policy blocks them.
- Added provider-neutral subscription lifecycle updates on `/api/v1/hr-admin/saas-control-plane/` for plan, status, billing provider ref, billing account ref, and current period end.
- Added available plan and subscription status options to the commercial control-plane payload from configuration, avoiding hardcoded UI options.
- Updated `/hr-admin/saas-control-plane` with an enforcement-scope panel and lifecycle editor for plan/status/provider references.
- Added backend coverage proving a starter plan blocks payroll access and browser coverage for the enforcement/lifecycle UI.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "saas_control_plane or commercial_profile_override or saas_commercial_subscription_update or dashboard_returns_saas_launch_audit"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/saas-control-plane-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "saas-control-plane"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "saas-control-plane" --update-snapshots` from `web`

Still open:

- Billing-provider webhooks/sync, tenant-admin mutation workflows, support impersonation controls, observability, backups, SLAs, and production deployment runbooks

## Phase 8C: Usage Meter Ledger and Commercial Audit History

Objective:

Persist commercial control-plane evidence so tenant usage, subscription changes, and enforcement posture can be reviewed after the fact instead of only computed live.

Completed:

- Added `SaasUsageMeterSnapshot` for point-in-time usage meter evidence with plan ref, subscription status, limit values, remaining headroom, source ref, actor identifier, evidence snapshot, and source hash.
- Added `SaasCommercialAuditEvent` for commercial lifecycle and scheduled snapshot audit history with previous/new commercial state, usage snapshot, enforcement snapshot, event metadata, and source hash.
- Subscription lifecycle updates now record usage meter snapshots and a `subscription_updated` audit event.
- Added `snapshot_saas_commercial_usage` management command for scheduled or manual usage-meter capture across one tenant or all tenants.
- `/api/v1/hr-admin/saas-control-plane/` now returns recent usage snapshots and recent commercial audit events.
- `/hr-admin/saas-control-plane` now shows recent meter evidence and lifecycle audit history alongside current plan, entitlement, enforcement, and usage state.
- Added backend coverage for lifecycle-generated history and command-generated usage snapshots, plus browser coverage for the new history panels.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/models.py apps/common/admin.py apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/management/commands/snapshot_saas_commercial_usage.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "saas_commercial or saas_control_plane or commercial_profile_override or dashboard_returns_saas_launch_audit"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/saas-control-plane-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "saas-control-plane"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "saas-control-plane" --update-snapshots` from `web`

Still open:

- Billing-provider webhooks/sync, tenant-admin mutation workflows, support impersonation controls, commercial audit export, observability, backups, SLAs, and production deployment runbooks

## Phase 8D: Tenant Admin Self-Service Console

Objective:

Give tenant owners a SaaS account console for commercial posture, seats, configuration health, and evidence review without exposing HR-admin-only operations.

Completed:

- Extended session workspace access with `tenant_admin`, granted to `tenant-admin` and `hr-admin` role holders.
- Added `TenantAdminContextMixin` and `/api/v1/tenant-admin/console/` with tenant-admin or HR-admin access, while normal employees remain denied.
- Added `get_tenant_admin_console_payload` to aggregate tenant account posture, commercial readiness, seat usage, membership status counts, role coverage, configuration health, governance checks, and recent commercial evidence.
- Added `/tenant-admin` workspace chrome and a tenant-admin console page with account, governance, role, configuration, usage evidence, and commercial audit panels.
- Added root workspace chooser discovery for the tenant-admin console.
- Added backend session/API permission coverage and Playwright e2e, route-smoke, and operational visual coverage.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/iam/api_serializers.py apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "tenant_admin or saas_commercial or saas_control_plane"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/tenant-admin-console-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/route-smoke.spec.ts -g "tenant-admin"` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "tenant-admin"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "tenant-admin" --update-snapshots` from `web`

Still open:

- Billing-provider webhooks/sync, tenant-admin mutation workflows, support impersonation controls, commercial audit export, observability, backups, SLAs, and production deployment runbooks

## Phase 8E: Tenant Admin Membership Mutation Workflows

Objective:

Move the tenant-admin console from read-only posture into safe account administration for tenant-owned user access, while preserving configurable commercial limits and audit evidence.

Completed:

- Extended the tenant-admin console payload with membership-management metadata: status options, role options, recent memberships, and available action labels from backend data.
- Added `/api/v1/tenant-admin/memberships/` for tenant-admin or HR-admin membership invites without requiring an employee record.
- Added `/api/v1/tenant-admin/memberships/<id>/` for activate, suspend, revoke, and role-update actions.
- Enforced active-seat capacity from `saas.commercial_profile.v1` before a membership can be activated.
- Guarded last active `tenant-admin` removal so a tenant cannot orphan its own account administration path.
- Recorded invite, activate, suspend, revoke, and role-update actions as `SaasCommercialAuditEvent` rows with actor, source ref, membership snapshots, commercial state, and source hash.
- Added Next proxy routes and a `/tenant-admin` member mutation panel for invite, role change, suspend, activate, and revoke controls.
- Added backend mutation/denial/seat-limit coverage and Playwright assertions for the member mutation panel.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "tenant_admin"`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/tenant-admin-console-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/route-smoke.spec.ts -g "tenant-admin"` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "tenant-admin"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "tenant-admin" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "tenant-admin"` from `web`

Still open:

- Billing-provider webhooks/sync, tenant-admin billing/configuration change requests, support impersonation controls, commercial audit export, observability, backups, SLAs, and production deployment runbooks

## Phase 8F: Tenant Admin Billing and Configuration Change Requests

Objective:

Give tenant owners a governed request workflow for plan, billing contact, and configuration changes without hardcoding billing-provider behavior into the tenant console.

Completed:

- Added `SaasTenantChangeRequest` as a durable tenant-scoped request ledger with request type, status, title, target ref, requested payload, current snapshot, decision/application fields, action history, source ref, and source hash.
- Extended `saas.commercial_profile.v1` with configurable tenant-admin change-request metadata: enabled flag, request type labels/descriptions, target-ref rules, allowed payload fields, and action labels.
- Added tenant-admin selectors for request type/status/action options and recent change requests inside `/api/v1/tenant-admin/console/`.
- Added `/api/v1/tenant-admin/change-requests/` for submitted plan, billing contact, and configuration change requests.
- Added `/api/v1/tenant-admin/change-requests/<id>/` for approve, reject, cancel, and mark-applied lifecycle actions with decision notes.
- Recorded request submission and lifecycle decisions as `SaasCommercialAuditEvent` rows with actor, source ref, current/requested snapshots, and source hash.
- Added Next proxy routes and a `/tenant-admin` billing/configuration request queue with JSON payload validation, configured field hints, and lifecycle action controls.
- Added backend coverage for submit/approve/apply, unconfigured payload blocking, and employee denial, plus Playwright assertions and updated laptop/mobile visual baselines.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/models.py apps/common/admin.py apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "tenant_admin"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/tenant-admin-console-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/route-smoke.spec.ts -g "tenant-admin"` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "tenant-admin"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "tenant-admin" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "tenant-admin"` from `web`

Still open:

- Billing-provider webhooks/sync, runtime support-session enforcement hooks, commercial/support audit export, observability, backups, SLAs, and production deployment runbooks

## Phase 8G: Tenant Admin Governed Support Access

Objective:

Give tenant owners a configurable support-access approval path before any runtime impersonation is enabled, with time-boxed grants, scoped permissions, session refs, source hashes, and commercial audit evidence.

Completed:

- Added `SaasSupportAccessGrant` as a tenant-scoped support access ledger with requested, approved, active, ended, revoked, rejected, and expired lifecycle states.
- Extended `saas.commercial_profile.v1` with configurable support access metadata: enabled flag, max duration, allowed scope refs, scope labels/descriptions, and action labels.
- Added tenant-admin selectors for support scope/status/action options and recent grant history inside `/api/v1/tenant-admin/console/`.
- Added `/api/v1/tenant-admin/support-access-grants/` for requesting scoped support access.
- Added `/api/v1/tenant-admin/support-access-grants/<id>/` for approve, reject, start-session, end-session, and revoke actions with decision notes and session refs.
- Recorded request, approval, rejection, session start/end, and revocation actions as `SaasCommercialAuditEvent` rows with actor, source ref, grant snapshots, and source hash.
- Added Next proxy routes and a `/tenant-admin` support access panel with scope selection, duration control, request creation, and grant lifecycle action controls.
- Added backend coverage for grant lifecycle, configured duration/scope enforcement, and employee denial, plus Playwright assertions for the support access panel.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/models.py apps/common/admin.py apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py apps/common/migrations/0004_saas_support_access_grant.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "tenant_admin"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/tenant-admin-console-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/route-smoke.spec.ts -g "tenant-admin"` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "tenant-admin"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "tenant-admin" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "tenant-admin"` from `web`

Still open:

- Billing-provider webhooks/sync, runtime support-session enforcement hooks, commercial/support audit export, observability, backups, SLAs, and production deployment runbooks

## Phase 8H: Runtime Support Session Enforcement

Objective:

Turn tenant-approved support access grants into a runtime-enforced read-only support path, so support users can inspect only approved tenant posture scopes during an active time-boxed session.

Completed:

- Added selector-level support-session evaluation for active grant state, authenticated support-agent identity, session ref, expiry window, requested support scope, and read-only HTTP method enforcement.
- Added automatic expiry handling for stale approved/active grants encountered at runtime, including grant status update, action history, and commercial audit evidence.
- Added `support_access_session_checked`, `support_access_session_denied`, and `support_access_session_expired` audit events through the existing `SaasCommercialAuditEvent` ledger.
- Added `/api/v1/support/tenant-console/` as a read-only scoped support endpoint that accepts tenant code, support session ref, and requested scope ref.
- Returned only granted account, configuration health, commercial evidence, and payroll support sections from the support console payload.
- Added Next proxy route `/api/support/tenant-console` for live browser access.
- Added `/support` as a modern browser-tested scoped support console with runtime gate, account posture, configuration health, and hidden-scope states.
- Added backend coverage for allowed support access, ungranted scope denial, wrong-agent denial, and stale-session expiry.
- Added Playwright e2e, route-smoke, and laptop/mobile visual coverage for the support console.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "support_session or support_access or tenant_admin"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/support-console-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "support"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "support" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "support"` from `web`

Still open:

- Billing-provider webhooks/sync, deeper support-session enforcement across domain APIs, commercial/support audit export, observability, backups, SLAs, and production deployment runbooks

## Phase 8I: Commercial And Support Audit Export

Objective:

Give tenant owners and launch reviewers a portable SaaS commercial/support evidence pack, with tenant-scoped authorization, source hashes, and deterministic checksum verification.

Completed:

- Added `saas.commercial_support_audit_pack.v1` as the commercial/support evidence pack ref.
- Added `describe_saas_commercial_support_audit_pack` to package tenant profile state, commercial control posture, usage-meter snapshots, commercial audit events, support-access grant history, status/type summaries, and source-hash counts.
- Added `recompute_saas_commercial_support_audit_pack_checksum` for deterministic JSON checksum verification.
- Added `/api/v1/tenant-admin/commercial-support-audit/download/` as an authorized tenant-admin JSON download with checksum and pack-ref response headers.
- Added Next proxy route `/api/tenant-admin/commercial-support-audit/download`.
- Added “Download audit” to `/tenant-admin`.
- Added backend tests for tenant-admin download, checksum verification, evidence presence, and employee denial.
- Added Playwright coverage for tenant-admin audit-download visibility.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/selectors.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "commercial_support_audit_pack"`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "commercial_support_audit_pack or support_session or support_access or tenant_admin"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/tenant-admin-console-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "tenant-admin"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "tenant-admin" --update-snapshots` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "tenant-admin"` from `web`
- `git diff --check`

Still open:

- Billing-provider webhooks/sync, deeper support-session enforcement across domain APIs, backups, SLAs, and production deployment runbooks

## Phase 8J: SaaS Operational Health

Objective:

Give HR admins one tenant-scoped operations cockpit for launch health, commercial posture, notification delivery, payroll provider queue health, support activity, tenant-owned changes, and remediation SLA risk.

Completed:

- Added `saas.operational_health.v1` as the SaaS operations health profile ref.
- Added `get_hr_admin_saas_operational_health` to aggregate launch audit blockers/warnings, commercial control readiness, notification delivery counts, provider job/retry counts, stale/dead-lettered queue posture, active/expired support sessions, tenant change requests, remediation SLA state, recent commercial events, and recent usage snapshots.
- Added `/api/v1/hr-admin/saas-operational-health/` as an HR-admin authorized health endpoint.
- Added Next proxy route `/api/hr-admin/saas-operational-health`.
- Added `/hr-admin/saas-operations` with modern metric tiles, health-signal triage, launch posture, delivery health, tenant-owned operations, commercial audit, and usage evidence panels.
- Added “Ops Health” to the HR-admin operations navigation.
- Added browser route/e2e coverage and refreshed visual baselines for the shared HR-admin shell.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "saas_operational_health"`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "saas_operational_health or commercial_support_audit_pack or support_session or support_access or tenant_admin"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/saas-operations-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "saas-operations"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots` from `web`
- `npx playwright test tests/visual/first-baseline.visual.spec.ts tests/visual/configuration-form-baseline.visual.spec.ts tests/visual/governance-assignment-baseline.visual.spec.ts tests/visual/generated-letter-baseline.visual.spec.ts tests/visual/workflow-trace-baseline.visual.spec.ts --update-snapshots` from `web`
- `npx playwright test tests/visual` from `web`

Still open:

- Billing-provider webhooks/sync, deeper support-session enforcement across domain APIs, backup/restore provider execution, SLAs, and production deployment runbooks

## Phase 8K: SaaS Resilience Readiness

Objective:

Give HR admins one cloud-neutral tenant resilience posture for backup cadence, restore testing, retention policy, and evidence readiness without hardcoded infrastructure assumptions.

Completed:

- Added `saas.resilience_profile.v1` as the configurable tenant resilience profile for backup cadence, RPO, encryption/offsite requirements, restore-test interval, retention windows, deletion/legal-hold refs, and evidence refs.
- Added `saas.resilience_readiness.v1` through `get_hr_admin_saas_resilience_readiness`, summarizing ready/warning/blocked checks across backup, restore, retention, and evidence posture.
- Added `/api/v1/hr-admin/saas-resilience/` as an HR-admin authorized resilience endpoint.
- Added resilience posture into `saas.operational_health.v1` as a first-class health signal.
- Added Next proxy route `/api/hr-admin/saas-resilience`.
- Added `/hr-admin/saas-resilience` with modern metric tiles, resilience gate review, backup/restore controls, retention windows, evidence refs, and grouped check panels.
- Added “Resilience” to the HR-admin operations navigation and linked it from `/hr-admin/saas-operations`.
- Added backend API tests for default missing-evidence blockers, tenant-published ready profile overrides, and employee denial.
- Added browser route/e2e coverage and refreshed laptop/mobile visual baselines for the shared HR-admin shell and new resilience page.

Validation:

- `cd backend && ../.venv/bin/python -m compileall apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "saas_resilience or saas_operational_health"`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "saas_resilience or saas_operational_health or commercial_support_audit_pack or support_session or support_access or tenant_admin"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/saas-resilience-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/saas-operations-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "saas-resilience"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots` from `web`
- `npx playwright test tests/visual/first-baseline.visual.spec.ts tests/visual/configuration-form-baseline.visual.spec.ts tests/visual/governance-assignment-baseline.visual.spec.ts tests/visual/generated-letter-baseline.visual.spec.ts tests/visual/workflow-trace-baseline.visual.spec.ts --update-snapshots` from `web`
- `npx playwright test tests/visual` from `web`

Still open:

- Billing-provider webhooks/sync, live backup/restore provider execution, incident provider automation, deeper support-session enforcement across domain APIs, and production deployment runbooks

## Phase 8L: SaaS SLA And Incident Operations

Objective:

Give HR admins one tenant-scoped SLA operations cockpit for service-impact incidents, response/resolution breach posture, operational thresholds, and escalation ownership.

Completed:

- Added `SaasIncidentRecord` with tenant-scoped incident refs, title/description, severity/status choices, impact refs, owner role refs, response/resolution targets, breach timestamps, action history, incident snapshots, and deterministic source hashes.
- Added `saas.sla_profile.v1` as the configurable SLA policy for severity-based response/resolution targets, open/resolved statuses, impact labels, and operational thresholds.
- Added `saas.sla_operations.v1` through `get_hr_admin_saas_sla_operations`, aggregating incident breach/at-risk posture plus failed notification, stale provider job, expired support grant, and overdue remediation threshold signals.
- Added `/api/v1/hr-admin/saas-sla-operations/` as an HR-admin authorized SLA operations endpoint.
- Added SLA posture into `saas.operational_health.v1` as a first-class health signal.
- Added Next proxy route `/api/hr-admin/saas-sla-operations`.
- Added `/hr-admin/saas-sla-operations` with modern metric tiles, incident queue, SLA triage signals, response/resolution target matrix, impacted surface counts, timeline evidence, and configured threshold panels.
- Added “SLA Ops” to the HR-admin operations navigation and linked it from `/hr-admin/saas-operations`.
- Added backend API tests for breached incident posture, tenant-configured SLA target overrides, and employee denial.
- Added browser route/e2e coverage and refreshed laptop/mobile visual baselines for the shared HR-admin shell and new SLA Ops page.

Validation:

- `cd backend && ../.venv/bin/python manage.py makemigrations common`
- `cd backend && ../.venv/bin/python -m compileall apps/common/models.py apps/common/admin.py apps/common/selectors.py apps/common/api_serializers.py apps/common/api_views.py apps/common/api_urls.py tests/test_phase0_api_smoke.py`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "saas_sla_operations or saas_operational_health"`
- `cd backend && ../.venv/bin/pytest tests/test_phase0_api_smoke.py -k "saas_sla_operations or saas_resilience or saas_operational_health or commercial_support_audit_pack or support_session or support_access or tenant_admin"`
- `cd backend && ../.venv/bin/python manage.py check`
- `cd backend && ../.venv/bin/python manage.py makemigrations --check --dry-run`
- `npm run typecheck` from `web`
- `npx playwright test tests/e2e/saas-sla-operations-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/saas-operations-flows.spec.ts` from `web`
- `npx playwright test tests/e2e/tier-one-route-smoke.spec.ts -g "saas-sla-operations"` from `web`
- `npx playwright test tests/visual/operational-baseline.visual.spec.ts --update-snapshots` from `web`
- `npx playwright test tests/visual/first-baseline.visual.spec.ts tests/visual/configuration-form-baseline.visual.spec.ts tests/visual/governance-assignment-baseline.visual.spec.ts tests/visual/generated-letter-baseline.visual.spec.ts tests/visual/workflow-trace-baseline.visual.spec.ts --update-snapshots` from `web`
- `npx playwright test tests/visual` from `web`

Still open:

- Billing-provider webhooks/sync, live backup/restore provider execution, incident provider automation, deeper support-session enforcement across domain APIs, and production deployment runbooks

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

## Phase 8M Completion Summary

Status:

- Completed on: 2026-09-07

Objective achieved:

- added deeper SaaS support-session enforcement through configurable, read-only domain snapshots rather than broad support access to HR-admin APIs

High-level backend changes:

- added configurable support-domain snapshot mappings under `saas.commercial_profile.v1`
- added `/api/v1/support/domain-snapshot/` with tenant-code, support-session, expiry, read-only method, support-agent identity, and required-scope validation
- added sanitized aggregate snapshots for tenant account, commercial control/audit, configuration health, SLA operations, resilience readiness, payroll readiness, payroll outputs, payroll handoff, and payroll providers
- added focused backend tests for allowed payroll-support diagnostics, ungranted scope denial, and tenant-configured domain removal

High-level frontend changes:

- added `/support/domain-snapshot` as a modern support diagnostics workspace
- added domain-switch links, scope chips, runtime gate evidence, summary metrics, and status-count panels
- added Next proxy, demo data, route smoke coverage, E2E flow coverage, and visual route coverage

Open items carried forward:

- field-level redaction policy for any future detailed support snapshots
- customer-facing support-session audit review filters
- enterprise support roles, break-glass approval chains, and immutable audit export packs

Docs updated:

- `docs/high-level-plan.md`
- `docs/payroll-saas-architecture-plan.md`
- `docs/hrms-module-wise-vertical-coverage.md`
- `docs/hrms-phase-delivery-tracker.md`

---

## Phase 8N Completion Summary

Status:

- Completed on: 2026-09-07

Objective achieved:

- added customer-visible tenant trust-audit review so commercial, tenant-admin, and support-access evidence can be filtered in-app before export

High-level backend changes:

- added configurable `trust_audit` groups, source refs, default page size, and max page size under `saas.commercial_profile.v1`
- added `/api/v1/tenant-admin/trust-audit/` for tenant admins and HR admins
- added filters for event group, event type, actor, source ref, support session ref, date window, page, and page size
- added event payload enrichment with group refs and extracted support-session refs
- added backend coverage for support-session filtering, configured group/page-size behavior, and employee denial

High-level frontend changes:

- added `/tenant-admin/trust-audit` as a modern tenant-admin evidence review workspace
- added group chips, active filter chips, event taxonomy, support-session filters, audit ledger rows, hash previews, and audit-pack download access
- added Next proxy route, demo data, route smoke coverage, E2E flow coverage, and visual route coverage

Open items carried forward:

- enterprise MFA/SSO/SCIM controls
- immutable audit export retention automation
- production billing-provider sync and webhook audit ingestion

Docs updated:

- `docs/high-level-plan.md`
- `docs/hrms-module-wise-vertical-coverage.md`
- `docs/hrms-phase-delivery-tracker.md`

---

## Phase 8O Completion Summary

Status:

- Completed on: 2026-09-07

Objective achieved:

- added customer-visible enterprise security readiness so tenant admins can review MFA, SSO, SCIM, session, audit, and data-protection launch posture from configuration

High-level backend changes:

- added configurable `saas.enterprise_security_profile.v1` with MFA, SSO, SCIM, session, audit, data-protection, owner, and action metadata
- added `/api/v1/tenant-admin/security-readiness/` for tenant admins and HR admins
- added readiness checks, warning/blocker status, launch blocker refs, and grouped readiness summary without hardcoding IdP or cloud-provider assumptions
- added backend coverage for default blocked posture, tenant-published ready posture, and employee denial

High-level frontend changes:

- added `/tenant-admin/security-readiness` as a modern tenant-admin enterprise security readiness workspace
- added security-domain posture chips, MFA/SSO panels, SCIM/session panels, audit/data-protection panels, launch blocker review, and tenant console navigation
- added Next proxy route, demo data, route smoke coverage, E2E flow coverage, and visual route coverage

Open items carried forward:

- runtime SSO/MFA/SCIM integrations with real identity providers
- field-level security and auditor personas
- immutable audit export retention automation
- customer-managed key and residency verification hooks

Docs updated:

- `docs/high-level-plan.md`
- `docs/hrms-module-wise-vertical-coverage.md`
- `docs/hrms-phase-delivery-tracker.md`

---

## 9. Suggested Working Habit

The simplest good rhythm is:

1. start a phase
2. implement the work
3. verify what actually changed
4. write the phase completion summary
5. update the linked docs before moving to the next phase

This keeps product understanding, technical understanding, and repo documentation aligned as the system evolves.
