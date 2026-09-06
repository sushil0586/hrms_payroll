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
- automatic certification test execution against real provider sandboxes

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
