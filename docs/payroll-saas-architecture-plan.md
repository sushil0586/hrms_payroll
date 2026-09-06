# Payroll SaaS Architecture Plan

## 1. Purpose

This document defines the architecture direction for payroll after the HRMS web-first pilot baseline.

The payroll module must be:

- SaaS-ready
- tenant-scoped
- configuration-first
- snapshot-based
- audit-friendly
- explainable
- country-pack driven
- safe to localize beyond India later

Non-negotiable principle:

- Do not hardcode client-specific payroll behavior into application logic.

Every payroll rule should come from:

- tenant configuration
- effective-dated salary structures
- payroll calendars
- pay groups
- formula/rule definitions
- country or state compliance packs
- workflow approvals
- locked input snapshots

---

## 2. Architecture Position

Payroll is a separate domain that consumes trusted HRMS data.

It should not be added as a few salary fields on employee records.

Recommended boundary:

```text
HRMS source data
  -> payroll input contract
  -> payroll input snapshots
  -> payroll calculation engine
  -> payroll run review and approval
  -> locked payroll outputs
```

Payroll can read HRMS data, but payroll calculations must be based on immutable run snapshots.

---

## 3. Payroll Bounded Contexts

| Context | Responsibility |
|---|---|
| Payroll Configuration | Tenant payroll settings, calendars, pay groups, periods, rounding, proration, and lock rules. |
| Component Library | Earnings, deductions, employer contributions, reimbursements, taxes, and non-pay informational components. |
| Formula And Rule Engine | Safe evaluation of configurable formulas, conditions, caps, slabs, and applicability rules. |
| Employee Compensation | Effective-dated salary structures, salary revisions, assignments, and compensation history. |
| Payroll Inputs | Attendance, leave, overtime, arrears, incentives, deductions, reimbursements, loans, and one-time adjustments. |
| Payroll Run Management | Draft, validate, calculate, review, approve, lock, publish, reopen, and adjustment-run lifecycle. |
| Compliance Packs | Country/state statutory rules such as India PF, ESI, PT, LWF, TDS, gratuity, and bonus. |
| Outputs And Distribution | Payslips, payroll registers, bank files, accounting exports, statutory reports, and employee publishing. |
| Audit And Explainability | Calculation traces, source snapshots, approval history, input changes, overrides, and lock history. |

---

## 4. Tenant-Scoped Model Candidates

Every model below must include `tenant`.

Configuration:

- `PayrollCalendar`
- `PayrollPeriod`
- `PayGroup`
- `PayGroupAssignment`
- `PayrollSetting`
- `PayrollRoundingRule`
- `PayrollProrationRule`
- `PayrollLockPolicy`

Phase 1A implementation status:

- `PayrollCalendar`, `PayrollPeriod`, `PayGroup`, and `PayGroupAssignment` now exist as tenant-scoped payroll configuration models.
- HR admin APIs expose aggregate setup review plus create/update endpoints for calendars, periods, pay groups, and assignments.
- Period overlap and active employee assignment overlap are blocked at the model/API layer.
- Configuration stays in explicit fields and `config_snapshot`; tenant-specific payroll behavior is not embedded in application code.
- `/hr-admin/payroll-setup` provides a browser-tested setup workspace with Playwright visual baselines.

Components and formulas:

- `SalaryComponent`
- `SalaryComponentVersion`
- `SalaryComponentFormula`
- `SalaryComponentApplicabilityRule`
- `SalaryComponentAccountingMapping`
- `SalaryComponentTaxRule`

Phase 1B implementation status:

- `SalaryComponent`, `SalaryStructure`, `SalaryStructureVersion`, `SalaryStructureComponent`, and `EmployeeSalaryAssignment` now exist as tenant-scoped payroll compensation foundation models.
- Component behavior is expressed as `component_type`, `value_type`, formula/rule/accounting/statutory references, and `config_snapshot`.
- Structure versions and employee salary assignments are effective-dated, with active overlap protection.
- HR admin APIs expose aggregate salary setup review plus create/update endpoints for components, structures, versions, structure lines, and employee salary assignments.
- `/hr-admin/salary-setup` provides a browser-tested workspace for component catalog, version matrix, structure composition, and employee salary coverage.
- This phase still does not calculate payroll; it prepares versioned configuration for the future calculation engine.

Phase 1C implementation status:

- `PayrollRun` and `PayrollInputSnapshot` now exist as tenant-scoped payroll run and input-freeze models.
- Payroll runs are period-scoped, optionally pay-group scoped, and store `input_profile_ref`, `snapshot_schema_ref`, and `config_snapshot` so source collection behavior remains configurable.
- Employee input snapshots freeze employee, organization, salary, attendance, leave, lifecycle, document, banking, validation, and config source families.
- Locked input snapshots are immutable at the model/API layer.
- HR admin APIs expose aggregate input snapshot review plus create/update endpoints for runs and employee snapshots.
- `/api/v1/hr-admin/payroll-runs/<id>/lock-inputs/` locks all non-blocked snapshots and moves the run to `inputs_locked`.
- `/hr-admin/payroll-inputs` provides a browser-tested workspace for run selection, snapshot review, source hashes, validation issues, and source-family inspection.
- This phase still does not calculate payroll; it prepares immutable source inputs for the future calculation engine.

Phase 2A implementation status:

- `PayrollRuleDefinition`, `PayrollRuleVersion`, and `PayrollRuleEvaluation` now exist as tenant-scoped formula/rule engine foundation models.
- Rule definitions classify behavior by type such as formula, statutory, proration, applicability, rounding, validation, and accounting.
- Rule versions are effective-dated, status-driven, and use `safe_expr_v1` expressions with input/output schema metadata and configurable references.
- Active overlapping rule versions for the same rule are blocked before activation.
- Safe expression evaluation uses a whitelist AST, approved functions, decimal-aware arithmetic, dependency capture, and trace output; arbitrary code execution is not allowed.
- Rule previews can evaluate against manual context or locked payroll input snapshots.
- HR admin APIs expose rule setup, create/update endpoints, and preview evaluation with optional persisted trace records.
- `/hr-admin/payroll-rules` provides a browser-tested workspace for the rule catalog, version matrix, locked snapshot options, safe expression detail, dependencies, and stored preview traces.
- This phase still does not calculate a payroll run; it proves configurable, traceable formula evaluation before the draft calculation engine consumes it.

Phase 2B implementation status:

- `PayrollRunCalculation` and `PayrollCalculationLine` now exist as tenant-scoped draft calculation models.
- Draft calculation consumes locked `PayrollInputSnapshot` records, active effective-dated `PayrollRuleVersion` records, and applied payroll adjustments for the same run.
- Rule selection, calculation ordering, line type, component identity, output context paths, and profile references are driven from run/rule/version configuration snapshots.
- Prior completed or draft calculation attempts are marked `superseded` when a new attempt is generated.
- Calculation lines store employee, component, source type, rule version or adjustment linkage, expression/source detail, source hash, amount, context snapshot, result snapshot, and trace snapshot.
- Calculation totals summarize gross earnings, employee deductions, employer contributions, net pay, employee count, line count, and error count.
- HR admin APIs expose aggregate calculation review plus draft calculation trigger at `/api/v1/hr-admin/payroll-runs/<id>/calculate-draft/`.
- `/hr-admin/payroll-calculations` provides a browser-tested workspace for runs, calculation attempts, draft totals, rule-sourced formula lines, adjustment-sourced input lines, dependencies, source hashes, and configuration metadata.
- This phase still does not approve, lock, publish, pay, file, or export payroll outputs.

Compensation:

- `SalaryStructure`
- `SalaryStructureVersion`
- `SalaryStructureComponent`
- `EmployeeSalaryAssignment`
- `EmployeeSalaryRevision`

Inputs:

- `PayrollInputBatch`
- `PayrollInputItem`
- `PayrollAdjustment`
- `PayrollOvertimeInput`
- `PayrollReimbursementInput`
- `PayrollDeductionInput`
- `PayrollLoanInput`
- `PayrollArrearInput`

Phase 4A implementation status:

- `PayrollAdjustment` now exists as the configurable one-time payroll input register for arrears, bonuses, incentives, reimbursements, loans, advances, deductions, corrections, and settlement preparation.
- Adjustment records are tenant-scoped and linked to payroll runs, employees, optional input snapshots, and optional salary components.
- Adjustment behavior is expressed through kind, direction, component metadata, effective/source periods, profile refs, approval profile refs, source refs, source hashes, and config snapshots.
- Adjustment lifecycle supports draft, submitted, approved, rejected, applied, and voided states through service/API actions.
- Pending adjustments are blocked after payroll review starts, and applied/voided adjustments are immutable.
- `/hr-admin/payroll-adjustments` provides a browser-tested workspace for adjustment review, approval state, applied state, profile refs, and source evidence.

Phase 4B implementation status:

- Applied adjustments are consumed by draft payroll calculation as adjustment-sourced `PayrollCalculationLine` records.
- Adjustment-sourced calculation lines use nullable rule linkage, required adjustment linkage, explicit `line_source`, component metadata, line direction, source hash, trace snapshot, and config snapshot.
- Calculation validates tenant/run/employee consistency and locked snapshot linkage before consuming applied adjustments.
- Calculation totals and selection/error snapshots include applied adjustment contribution metadata.
- HR admin APIs and `/hr-admin/payroll-calculations` expose rule-versus-adjustment source labels, adjustment ids, source detail, dependencies, and hashes.
- Full-and-final settlement orchestration is covered by Phase 4C.

Phase 4C implementation status:

- `PayrollSettlement` and `PayrollSettlementLine` now exist as tenant-scoped full-and-final settlement package models.
- Settlement packages link payroll run, employee, optional lifecycle exit record, optional locked input snapshot, settlement/approval/calculation profile refs, source refs, totals snapshots, source hashes, and config snapshots.
- Settlement lines are configurable by kind and direction for salary proration, leave encashment, notice recovery, loan recovery, advance recovery, bonus, arrear, gratuity, statutory, and other package components.
- Settlement lifecycle supports draft, submitted, approved, rejected, applied, and voided states through service/API actions.
- Applying an approved settlement creates applied payroll adjustments per settlement line, allowing draft payroll calculation to consume full-and-final amounts through the existing adjustment-sourced line path.
- Pending settlements are blocked after payroll review starts, and applied/voided settlement packages and lines are immutable.
- `/hr-admin/payroll-settlements` provides a browser-tested workspace for exit-sourced package review, final dues, recoveries, settlement lines, profile refs, dependency traces, and source evidence.
- Calculation validation hardening is covered by Phase 4D.

Phase 4D implementation status:

- `PayrollValidationIssue` now exists as the tenant-scoped calculation validation issue register.
- Validation issues link to payroll runs, optional calculation attempts, optional input snapshots, optional employees, and optional calculation lines.
- Validation behavior is driven by run-level validation profile config such as locked-input requirements, salary-payload requirements, snapshot warning handling, pending adjustment handling, pending settlement handling, and duplicate component-rule warnings.
- Pre-calculation validation refreshes open run-level issues before each draft calculation attempt.
- Blocker issues stop draft calculation before payroll totals or lines are created; warning/info issues are attached to the successful calculation attempt.
- Calculation selection/error snapshots now include validation profile refs and issue counts.
- `/api/v1/hr-admin/payroll-calculation-setup/` exposes validation issue rows, summary counts, and severity/category/status options.
- `/hr-admin/payroll-calculations` renders a browser-tested validation register above calculation attempts.
- Statutory and component-output validation catalogs are covered by Phase 4E.

Phase 4E implementation status:

- Validation profiles now support required component codes, required output paths, duplicate output-path warnings, allowed line types, required statutory profile refs, and statutory mapping requirements by line type.
- The calculation validator statically inspects safe expressions to detect dependencies before a draft run creates calculation lines.
- Dependency-order blockers identify formulas that consume outputs generated by later rules.
- Missing dependency warnings identify formulas that reference values not present in locked source data or prior rule outputs.
- Required statutory profile checks can enforce country-pack refs such as PF, ESI, PT, LWF, tax, or tenant-specific statutory treatment refs through configuration.
- Required component and output-path checks let tenant close-readiness profiles define mandatory payroll outputs without hardcoding component names in the engine.
- `/hr-admin/payroll-calculations` groups visible validation issues by category and shows source-data plus statutory demo examples.
- Backend and Playwright tests cover component, statutory, dependency-order, category grouping, and browser visibility.
- The next depth steps are external provider acknowledgement hardening and payroll artifact storage adapterization.

Phase 4F implementation status:

- Payroll output artifacts now carry durable file metadata: storage provider reference, storage key, MIME type, file size, SHA-256 checksum, downloadable flag, retention policy reference, and generated payload.
- Payslip artifacts default to generated HTML files; payroll register and finance handoff artifacts default to generated CSV files.
- Output and finance profiles can override MIME types, storage provider refs, storage key prefixes, and retention policy refs without changing engine code.
- HR admin downloads are gated by tenant, artifact publish status, payload availability, and checksum verification.
- Download URLs are exposed only for published downloadable artifacts.
- The remaining architecture gap is adding SDK-backed object-store runtime implementations and connecting real external providers.

Phase 4G implementation status:

- `PayrollProviderDelivery` now records provider-facing delivery state for finance handoff artifacts.
- Delivery records link tenant, finance handoff, output artifact, output batch, payroll run, and final-locked review lineage.
- Provider routing is expressed through configurable provider, channel, retry policy, acknowledgement profile, request/response/reconciliation snapshots, and config snapshots.
- Finance handoff transmission creates submitted delivery records for bank advice, accounting export, statutory summary, statutory return, and statutory challan artifacts.
- Reconciliation can mark deliveries acknowledged, reconciled, rejected, or failed with evidence and checksum/file metadata snapshots.
- Accepted handoff state is now driven by reconciled provider delivery evidence instead of a hardcoded local-only assumption.
- HR admin APIs and `/hr-admin/payroll-handoff` expose delivery ledger, external references, retry policy, attempts, and reconciliation counts.
- The remaining architecture gap is real provider adapters, webhook callback verification, background retry workers, and SDK-backed object-store runtime implementations.

Phase 4H implementation status:

- Payroll artifact storage now goes through a configurable adapter contract for store, read, and signed-url behavior.
- The local generated-payload adapter preserves dev/test behavior while making storage behavior explicit through `payroll.storage.local.generated.v1`.
- A signed-url-capable placeholder adapter proves the API/UI contract for signed download strategies before real object storage is installed.
- `PayrollOutputArtifact` now stores object version, download strategy ref, signed-url support, signed-url expiry seconds, storage key, checksum, MIME type, file size, and retention policy ref as one coherent file contract.
- HR admin downloads read through the adapter layer and return checksum, storage provider, object version, download strategy, and retention headers.
- HR admin APIs expose signed download URL metadata when the selected adapter supports it.
- Finance provider delivery request snapshots include storage strategy evidence so reconciliation remains auditable.
- The remaining architecture gap is production secret-manager wiring and provider-side storage policy verification; employee download audit, revocation, signed-access binding, SDK-backed runtime storage, and configurable storage policy enforcement are handled in later Phase 4I-4N work.

Phase 4I implementation status:

- Published payslip artifacts are now available through employee-scoped ESS APIs.
- `/api/v1/me/payroll-payslips/` lists only published payslips for the signed-in employee and tenant context.
- `/api/v1/me/payroll-payslips/<id>/download/` reads through the same storage adapter layer as HR admin downloads and verifies checksum before streaming.
- Employee payslip payloads expose run, period, pay date, file metadata, storage provider ref, object version, download strategy ref, signed URL readiness, retention policy ref, totals, calculation lines, source hash, and publisher metadata.
- `/ess/payslips` gives employees a compact payroll history, payment summary, download action, storage governance panel, source hash, and line-level calculation evidence.
- The remaining architecture gap is production secret-manager wiring, real provider adapters, and broader locked output audit exports; signed URL permission binding, revocation, and SDK-backed runtime storage are handled in later Phase 4K-4M work.

Phase 4J implementation status:

- `PayrollArtifactAccessEvent` now records an append-only tenant-scoped ledger for payslip publish, notification, download, read acknowledgement, and revocation-style access events.
- Publishing payroll output batches records payslip published events and triggers configurable payslip publish notifications using the notification engine.
- Employee and HR admin downloads record access events with actor, channel, request, storage provider, object version, download strategy, checksum, IP/user-agent, and metadata snapshots.
- `/api/v1/me/payroll-payslips/<id>/read/` lets employees acknowledge a published payslip and marks the linked in-app notification as read.
- ESS payslip payloads and HR admin output artifact payloads expose access summaries and recent access events.
- `/ess/payslips` now shows access trail, notification count, download count, read receipt state, and recent access events beside the existing storage governance and calculation evidence.
- Demo notification data now includes a payroll payslip notification so employee inbox filtering reflects the live payroll publish path.
- The remaining architecture gap is production secret-manager wiring, webhook callback verification, background retry workers, real bank/accounting/statutory providers, and broader auditor-facing review tooling.

Phase 4K implementation status:

- `PayrollArtifactSignedAccessGrant` now records permission-bound signed access grants for payroll artifact downloads.
- Signed grants are linked to tenant, artifact, output batch, payroll run, review, employee, issuing actor, target user/membership, storage evidence, expiry, access counts, and revocation metadata.
- Grant tokens are stored as SHA-256 hashes with a short prefix; the raw token appears only in the issued URL response.
- HR admin and ESS APIs can issue signed access grants only for published downloadable artifacts whose storage strategy supports signed URL behavior.
- Download endpoints validate grant id, token hash, expiry, max access count, user binding, and membership binding before marking signed access usage.
- HR admin APIs can revoke signed access grants with a required reason and append a revocation event to the artifact access ledger.
- HR admin artifact payloads expose signed grant counts through the access summary, and `/hr-admin/payroll-outputs` shows access governance plus an artifact access audit export link.
- `/api/v1/hr-admin/payroll-output-artifacts/<id>/access-audit-export/` exports event and signed-grant evidence as CSV.
- The remaining architecture gap is production secret-manager wiring, external provider webhooks/retries, real bank/accounting/statutory integrations, auditor drilldown UX, and public audit pack packaging.

Phase 4L implementation status:

- Payroll artifact storage profiles are now normalized and sanitized before file metadata is persisted.
- Local, placeholder signed URL, S3, GCS, and Azure provider families have explicit storage contract handling.
- S3/GCS/Azure profiles require provider-specific storage metadata plus a tenant-scoped `credential_ref`; raw credential keys are rejected recursively from configuration snapshots.
- Generated payslip, payroll register, and finance handoff artifacts now retain a sanitized `storage_profile` snapshot for auditability without persisting secrets.
- Unknown storage provider refs fail clearly instead of silently falling back to local generated storage.
- Object-store contract adapters can generate provider-style signed URL metadata in test/contract mode while making production runtime installation explicit.
- Backend tests cover incomplete object-store profiles, S3 contract-profile generation/publish/download, sanitized credential refs, and raw credential rejection.
- The remaining architecture gap is production secret-manager wiring, KMS/lifecycle/scanning policy enforcement, external provider webhooks/retries, real bank/accounting/statutory integrations, auditor drilldown UX, and public audit pack packaging.

Phase 4M implementation status:

- Payroll artifact storage credentials now resolve at runtime from `PAYROLL_ARTIFACT_STORAGE_CREDENTIALS` or `HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON` using artifact-safe `credential_ref` values.
- Credential resolution validates missing, disabled, provider-mismatched, and incomplete credential entries before any object-store operation runs.
- Runtime credential descriptors expose only reference/source/metadata evidence and never persist secret material on payroll artifacts.
- `PAYROLL_ARTIFACT_STORAGE_CLIENT_FACTORIES` allows deployments and tests to inject provider clients while keeping cloud SDK imports optional and lazy.
- Object-store runtime adapters now support S3, GCS, and Azure upload/read/signed URL methods behind the existing storage contract.
- S3 runtime coverage proves bytes are written to object storage, artifacts retain blank DB payloads, downloads read back through the storage adapter, checksums verify, and signed URL metadata comes from the runtime provider client.
- The remaining architecture gap is production secret-manager wiring, cloud IAM/bucket/container policy configuration, KMS/customer-managed key enforcement, lifecycle retention checks, malware scanning, multi-region durability controls, external provider webhooks/retries, real bank/accounting/statutory integrations, auditor drilldown UX, and public audit pack packaging.

Phase 4N implementation status:

- Payroll artifact storage policies now resolve from `PAYROLL_ARTIFACT_STORAGE_POLICIES` or `HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON`.
- Storage profiles now carry configurable storage, lifecycle, malware-scan, and durability policy refs in their sanitized artifact snapshots.
- Policy enforcement can allowlist provider families, provider refs, credential refs, bucket/container names, retention refs, encryption refs, and endpoint hosts.
- Policy enforcement can require encryption refs, private endpoints, runtime credential resolution, storage-key prefixes, minimum/maximum signed URL expiry, maximum file size, lifecycle profile refs, malware-scan profile refs, and durability profile refs.
- Local/dev, contract-mode object-store, and SDK-backed runtime store/read/signed URL paths all apply the same policy contract.
- Backend tests cover missing policy refs, strict encryption policy rejection, and strict S3 runtime policy success with lifecycle, malware-scan, and durability refs.
- The remaining architecture gap is production secret-manager adapter wiring, cloud IAM/bucket/container policy verification against provider APIs, actual KMS/lifecycle/scanning service integration, external provider webhooks/retries, real bank/accounting/statutory integrations, auditor drilldown UX, and public audit pack packaging.

Runs and snapshots:

- `PayrollRun`
- `PayrollInputSnapshot`
- employee source snapshot family
- organization source snapshot family
- salary source snapshot family
- attendance source snapshot family
- leave source snapshot family
- lifecycle source snapshot family
- document source snapshot family
- banking source snapshot family
- `PayrollCalculationLine`
- calculation line trace snapshot
- `PayrollValidationIssue`
- `PayrollRunApproval`

Rule engine:

- `PayrollRuleDefinition`
- `PayrollRuleVersion`
- `PayrollRuleEvaluation`

Outputs:

- `Payslip`
- `PayrollRegister`
- `BankPaymentFile`
- `AccountingExport`
- `StatutoryReport`
- `PayrollOutputArtifact`
- `PayrollFinanceHandoff`
- `PayrollProviderDelivery`

Compliance:

- `PayrollStatutoryPack`
- `PayrollStatutoryComponent`
- `PayrollStatutorySlab`
- `PayrollStatutoryEmployerRegistration`
- `PayrollStatutoryFilingCalendar`
- `EmployeeStatutoryProfile`
- `StatutoryDeclaration`

Phase 5A implementation status:

- `PayrollStatutoryPack`, `PayrollStatutoryComponent`, `PayrollStatutorySlab`, and `EmployeeStatutoryProfile` now exist as tenant-scoped statutory configuration models.
- The India pack foundation supports PF, ESI, PT, LWF, TDS, gratuity, and other statutory component kinds without hardcoded country logic in payroll calculation code.
- Statutory components resolve behavior through wage-base refs, statutory-treatment refs, registration refs, applicability refs, rounding refs, formula refs, and config snapshots.
- Statutory slabs support effective dates, state codes, wage ceilings, percentage rates, fixed employee/employer amounts, and applicability refs.
- Employee statutory profiles store PAN, UAN, PF/ESI identifiers, applicability flags, PT/LWF state, tax regime, declaration status, previous employment values, source refs, and deterministic source hashes.
- HR admin APIs can create, update, list, and inspect statutory packs, components, slabs, and employee statutory profiles.
- Later Phase 5 slices add declaration/proof workflows and statutory declaration workspaces; the remaining architecture gap is challan/return generation and statutory provider integrations.

Phase 5B implementation status:

- Draft payroll calculation now consumes selected active statutory packs/components/slabs and employee statutory profiles from tenant configuration.
- `PayrollCalculationLineSource` now includes `statutory`, so statutory-generated lines are distinguishable from rule-generated and adjustment-generated lines.
- Statutory calculation selection is controlled by the run calculation profile through pack codes, statutory pack refs, component codes, excluded components, and statutory types.
- Statutory wage bases resolve through component-level `wage_base_path` configuration or calculation-profile wage-base mappings.
- Slab, percentage, and fixed-amount statutory methods generate employee deduction, employer contribution, both-sided, or informational lines without embedding country rates in Python.
- Statutory line traces store wage-base path/value, statutory pack/component/slab refs, employee statutory profile hash, and deterministic source hashes.
- Validation now recognizes statutory-produced component codes and raises statutory setup blockers for missing active components, missing employee profiles, missing wage-base configuration, unavailable wage-base paths, and missing active slabs.
- Later Phase 5 slices add declaration/proof workflows and statutory declaration workspaces; the remaining architecture gap is richer TDS annualization, investment/exemption cap logic, challan/return generation, and statutory provider integrations.

Phase 5C implementation status:

- `EmployeeStatutoryDeclaration` now stores financial-year declaration packages linked to employees, employee statutory profiles, and optional statutory packs.
- `EmployeeStatutoryDeclarationItem` now stores section/component-level declared amounts, verified amounts, proof refs, proof status, rejection evidence, config snapshots, and source hashes.
- Declaration statuses now cover draft, submitted, verified, rejected, and locked lifecycle states.
- Proof statuses now cover not required, pending, submitted, verified, and rejected states.
- HR-admin APIs can create/update declarations, create/update proof items, submit declarations, verify declarations, reject declarations, lock declarations, and verify/reject individual proof items.
- Submission, verification, rejection, and lock transitions update the linked employee statutory profile declaration state.
- Payroll statutory setup payload now exposes declaration summaries, declaration records, proof item records, and declaration/proof option catalogs.
- The remaining architecture gap is TDS annualization, investment/exemption cap logic, challan/return generation, and provider integrations.

Phase 5D implementation status:

- Employee-scoped statutory declaration API now exists at `/api/v1/me/statutory-declarations/`.
- ESS declaration payloads expose the current employee's statutory profile, financial-year declarations, proof items, summary totals, available years, option catalogs, source refs, and source hashes.
- `/hr-admin/payroll-statutory` provides a browser-tested HR-admin statutory review workspace for packs, components, profiles, declarations, proof evidence, verification state, lock state, and source trace.
- `/ess/statutory-declarations` provides a browser-tested employee statutory workspace for tax profile, proof state, declared/verified totals, payroll consumption refs, and declaration source trail.
- Playwright e2e, tier-one smoke, and laptop/mobile operational visual baselines now cover both statutory declaration workspaces.
- The remaining architecture gap is TDS annualization, investment/exemption cap logic, challan/return generation, and provider integrations.

Phase 5E implementation status:

- Employee-scoped statutory create/update APIs now allow employees to manage their own draft or rejected declarations.
- Employee-scoped proof item APIs now allow employees to create/update declared proof rows and link proof document/artifact references.
- Employee proof writes are restricted to not-required, pending, or submitted states; HR-admin remains responsible for proof verification/rejection and declaration locking.
- Employee declaration submission refreshes totals, records the submitting user, and advances the employee statutory profile to proofs pending.
- `/ess/statutory-declarations` now includes a browser-tested action panel for declaration metadata, tax regime selection, proof item refs, and submit action.
- The remaining architecture gap is richer TDS annualization, investment/exemption cap logic, challan/return generation, and provider integrations.

Phase 5F implementation status:

- Employee statutory proof uploads now use `/api/v1/me/statutory-declarations/<id>/proof-upload/`.
- The upload workflow creates an employee document via the existing self-service document service and links the document/artifact refs to the statutory declaration item.
- Proof upload categories are sourced from tenant-configured self-upload document categories, preferring tax/statutory-marked categories.
- ESS statutory declaration actions now support direct file attachment as well as existing proof-reference entry.
- Backend and Playwright coverage prove the upload linkage and browser control availability.
- The remaining architecture gap is statutory provider submission, webhook verification, background retry workers, and certification flows.

Phase 5G implementation status:

- TDS can now run as a configured statutory component inside the existing draft payroll calculation pipeline.
- Annualization behavior is component/profile-driven: financial year, annual multiplier, remaining periods, output code/name/type, tax method, declaration statuses, proof statuses, declaration profile refs, and cap rules are configurable.
- Verified or locked employee statutory declarations can reduce taxable annual income through configured cap rules matched by section, component, item kind, and tax regime.
- Progressive slab calculation uses active effective-dated `PayrollStatutorySlab` records, and period TDS is derived from annual tax less prior deducted tax spread across configured remaining periods.
- Statutory TDS lines carry annual wage, declaration adjustment, taxable annual amount, slab trace, period tax, source hash, and consumed declaration cap evidence for payroll review.
- The HR payroll calculation workspace now shows TDS annualization details in the line trace panel, with Playwright and visual coverage.
- The remaining architecture gap is challan/return generation and provider integrations.

Phase 5H implementation status:

- TDS annualization can now calculate side-by-side tax regime projections from configured candidate regimes.
- Each projection independently applies declaration cap rules and effective-dated statutory slabs for its candidate regime.
- The selected payroll line amount stays profile/config-selected by default, with a configurable lowest-tax selection mode for tenants that want automated regime choice.
- TDS line trace/config snapshots now include selected regime, selection mode, projected declaration adjustments, taxable annual amounts, annual tax, remaining tax, period tax, selected flags, and deltas.
- `/hr-admin/payroll-calculations` displays the comparison matrix in the TDS annualization trace panel, backed by Playwright and visual coverage.
- The remaining architecture gap is challan/return generation and provider integrations.

Phase 5I implementation status:

- `PayrollStatutoryEmployerRegistration` now stores tenant-scoped statutory account numbers and employer identifiers by statutory pack, optional component, legal entity, branch, location, jurisdiction, filing authority, provider, effective dates, source refs, source hashes, and config snapshots.
- `PayrollStatutoryFilingCalendar` now stores tenant-scoped filing obligations by statutory pack, optional component, optional employer registration, filing type, frequency, period, due/grace/window dates, status, authority/provider refs, output profile refs, source refs, source hashes, and config snapshots.
- HR-admin APIs and the payroll statutory setup payload now expose registration and filing records, summary counts, due/overdue filing signals, legal entity/branch/location option catalogs, payroll frequencies, and filing status catalogs.
- `/hr-admin/payroll-statutory` now shows registration coverage and upcoming filing obligations in the same browser-tested workspace as statutory packs, components, declarations, proof evidence, and source trails.
- The remaining architecture gap is live statutory provider execution, webhook endpoints, background retry workers, and certification-flow automation.

Phase 5J implementation status:

- Finance handoff generation now creates configured statutory return and challan artifacts from eligible filing calendars and employer registrations.
- `PayrollOutputArtifact` carries filing artifacts as `kind = statutory_report` with `artifact_subtype` values for return and challan, keeping file generation metadata-driven.
- Generated return/challan artifacts include filing calendar refs, filing type refs, output profile refs, authority/provider refs, employer registration refs, payable totals, source hashes, and line evidence.
- Filing calendars record latest generation evidence in their config snapshot, including handoff, output batch, generated artifact IDs, totals, and generated timestamp.
- `/hr-admin/payroll-handoff` now exposes statutory filing files beside bank advice, accounting export, statutory summary, provider delivery, and reconciliation evidence.
- The remaining architecture gap is live statutory provider execution, webhook endpoints, background retry workers, and certification-flow automation.

Phase 5K implementation status:

- Provider route resolution now supports artifact-specific, output-profile, filing-type, artifact-kind, and statutory filing subtype keys such as `statutory_report:statutory_return`.
- Delivery request snapshots now include a normalized submission contract with adapter refs, submission modes, submission/request/response schema refs, callback refs, callback verification refs, certification refs, certification-required flags, and idempotency keys.
- Statutory filing delivery contracts carry filing calendar, filing type, authority, employer registration, and output profile context.
- Delivery config snapshots retain selected provider routes, submission contracts, and certification evidence state.
- Reconciliation snapshots now record callback verification and certification profile evidence alongside checksum and line-count evidence.
- `/hr-admin/payroll-handoff` exposes adapter, submission profile, callback verification, certification profile, and certification evidence state.
- The remaining architecture gap is live bank/accounting/statutory provider execution, production webhook hardening, background retry workers, and certification-flow automation.

Phase 5L implementation status:

- `PayrollProviderCallbackEvent` now stores signed inbound provider callback events linked to tenant, delivery, handoff, and output artifact lineage.
- Callback events store provider refs, external refs, idempotency keys, callback profile refs, verification refs, payload checksums, signatures, payload snapshots, verification snapshots, processing snapshots, timestamps, and failure evidence.
- `/api/v1/payroll-provider-callbacks/` ingests provider callbacks without HR-admin session coupling.
- Callback delivery resolution is controlled by provider ref plus delivery ID or external reference.
- Deterministic contract signatures verify callbacks against delivery submission contracts, callback verification refs, payload checksums, and artifact checksums.
- Provider/idempotency uniqueness prevents replayed callbacks from creating duplicate events or mutating delivery state again.
- Valid callbacks update delivery response/reconciliation snapshots, certification evidence, handoff summaries, and accepted/failed state where applicable.
- `/hr-admin/payroll-handoff` now displays callback events and callback verification refs beside provider delivery acknowledgements.
- The remaining architecture gap is live provider execution adapters, production webhook hardening, background retry-worker execution, and automated certification lifecycle handling.

Phase 5M implementation status:

- `PayrollProviderRetryEvent` now stores tenant-scoped retry/dead-letter records linked to provider delivery, finance handoff, output artifact, output batch, payroll run, and final-locked review lineage.
- Retry events carry scheduled/executed/dead-letter/skipped state, retry policy refs, failure taxonomy/category refs, retry reasons, attempt numbers, request snapshots, decision snapshots, response snapshots, and failure evidence.
- Provider delivery snapshots now retain nested retry policy config from the selected provider route.
- Retry decisions are configurable through route-level max attempts, backoff seconds, taxonomy refs, and provider-specific failure category mappings.
- HR-admin schedule-retry and requeue APIs provide the execution contract for failed/rejected deliveries while blocking mutation of reconciled deliveries.
- Dead-letter records are created when configured attempts are exhausted, preserving why the delivery can no longer be automatically retried.
- `/hr-admin/payroll-handoff` now displays retry metrics, provider retry events, failed-delivery retry state, and schedule/requeue command surfaces.
- The remaining architecture gap is live provider execution adapters, background retry-worker runtime, production queue integration, production webhook hardening, and automated certification lifecycle handling.

Phase 5N implementation status:

- Scheduled retry events can now be processed by `process_due_payroll_provider_retries`, filtered by tenant, due timestamp, and limit.
- `execute_payroll_provider_retry_event` provides the provider-agnostic adapter execution shell for one retry event.
- Route-level `execution_adapter` snapshots carry worker profile refs, adapter refs, execution modes, execution strategy refs, dispatch modes, schema refs, callback refs, and idempotency keys.
- The default execution shell is manual requeue: it moves failed/rejected deliveries back to submitted state and leaves final outcome handling to the existing provider callback or acknowledgement path.
- Stale scheduled retries are safely skipped with failure evidence when the delivery was already reconciled or is no longer retryable.
- `process_payroll_provider_retries` gives operations a command/scheduler entrypoint without binding the domain model to a specific queue provider.
- `/hr-admin/payroll-handoff` now exposes retry worker profile refs for failed-delivery recovery.
- The remaining architecture gap is production queue scheduling, provider-specific bank/accounting/statutory SDK adapters, production webhook hardening, and automated certification lifecycle handling.

Phase 5O implementation status:

- `backend/apps/payroll/providers.py` defines the provider adapter boundary with submission request/result dataclasses, an adapter protocol, raw-secret route validation, runtime credential resolution, a manual adapter, and a sandbox adapter.
- Provider credentials resolve by `credential_ref` from `PAYROLL_PROVIDER_CREDENTIALS` or `HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON`; persisted snapshots contain sanitized descriptors, never credential material.
- Provider routes can now configure credential refs, credential profile refs, credential-required flags, sandbox responses, retry policies, and execution adapter config without hardcoded provider behavior in payroll core.
- Finance handoff transmission runs newly created provider deliveries through the adapter boundary and stores normalized request/result evidence with provider batch refs, schema refs, callback refs, credential descriptors, and certification evidence refs.
- Adapter results can move deliveries to submitted, acknowledged, reconciled, rejected, or failed states while preserving handoff summary consistency.
- Retry worker execution reuses the same submission boundary after requeue, so initial provider submission and retry submission share the same contract.
- `PAYROLL_PROVIDER_ADAPTERS` gives production deployments a registry hook for provider-specific bank, accounting, and statutory SDK adapters.
- `/hr-admin/payroll-handoff` exposes credential refs and credential profile refs for failed-delivery recovery without exposing secrets.
- The remaining architecture gap is production SDK/portal adapter implementation, production queue scheduling, production webhook hardening, and automated certification lifecycle handling.

Phase 5P implementation status:

- Provider-specific sandbox scaffolds now exist for bank, accounting, and statutory delivery domains behind the provider adapter protocol.
- Each scaffold validates supported artifact kinds before submission to catch wrong adapter/artifact pairings early.
- Bank responses stamp bank payment instruction contract evidence, including payment file name and checksum.
- Accounting responses stamp accounting journal import contract evidence, including ledger file name and checksum.
- Statutory responses stamp statutory filing upload contract evidence, including filing file name, checksum, filing context, and certification evidence refs.
- The adapter registry resolves bank/accounting/statutory sandbox refs without custom settings, while still allowing production overrides through `PAYROLL_PROVIDER_ADAPTERS`.
- `/hr-admin/payroll-handoff` demo data now surfaces the statutory sandbox adapter ref for failed challan recovery.
- The remaining architecture gap is production bank/accounting/statutory SDK or portal automation adapters, production queue scheduling, production webhook hardening, and automated certification lifecycle handling.

Phase 5Q implementation status:

- `PayrollProviderConnection` now stores tenant-owned provider onboarding state for bank, accounting, and statutory provider families.
- Provider connection records hold provider refs, environment refs, adapter refs, sandbox adapter refs, channel refs, credential refs, credential profile refs, callback profile refs, callback verification refs, retry policy refs, certification profile refs, readiness snapshots, and certification snapshots.
- Active provider connections are blocked until required runtime refs are present and certification has passed.
- Raw provider credential keys are rejected from connection config/evidence snapshots, preserving credential-ref-only SaaS configuration.
- Default bank, accounting, and statutory sandbox connection blueprints give tenants a configurable starting point without binding payroll core to a provider implementation.
- HR-admin provider connection setup, list/create, detail/update, and certify APIs now expose the onboarding contract.
- `/hr-admin/payroll-providers` adds a provider launch-control workspace with readiness gates, certification evidence, credential boundaries, and vertical provider coverage.
- The remaining architecture gap is connecting certified provider connections into finance handoff route selection, production SDK/portal adapter implementation, production queue scheduling, production webhook hardening, and automated certification test execution.

Phase 5R implementation status:

- Finance handoff provider routes can now enforce provider connection policy through `disabled`, `warn`, `certified`, or `active` modes.
- Route resolution can inherit adapter refs, channel refs, credential refs, credential profile refs, callback refs, retry policy refs, and certification refs from the tenant-owned `PayrollProviderConnection`.
- Strict certified/active enforcement blocks transmission when the connection is missing, uncertified, inactive, not readiness-complete, or mismatched with explicit route refs.
- Delivery route snapshots and submission contracts carry provider connection gate evidence for audit and support.
- `/hr-admin/payroll-handoff` surfaces provider connection gate mode, connection status, and blocking gate refs next to provider acknowledgement evidence.
- The remaining architecture gap is production SDK/portal adapter implementation, production queue scheduling, production webhook hardening, and automated certification test execution.

Phase 5S implementation status:

- `PayrollProviderCertificationRun` now stores tenant-scoped automated provider certification execution history linked to provider connections.
- Certification runs carry run/profile refs, scenario counts, pass/fail/blocker counts, request snapshots, response snapshots, evidence snapshots, error snapshots, source hashes, and requested/executed actor lineage.
- Certification scenarios resolve from connection `config_snapshot.certification_scenarios`, with provider-kind defaults for bank, accounting, and statutory sandbox certification.
- The runner builds provider submission requests, calls the configured sandbox adapter, verifies expected provider statuses, records scenario evidence refs, and persists failure reasons without storing raw provider credentials.
- Successful runs update connection certification to passed and can restore a previously blocked connection to certified; failed runs mark the connection failed/blocked with scenario-level evidence.
- HR-admin APIs and `/hr-admin/payroll-providers` expose run execution, latest scenario evidence, run summaries, and the certification ledger.
- The remaining architecture gap is production SDK/portal adapter implementation, production queue scheduling for recurring certification, production webhook hardening, and execution against real external provider sandboxes.

Phase 5T implementation status:

- Provider adapter requests and results now pass through reusable contract validators in `apps.payroll.providers`.
- Adapter contracts are configuration-driven and support `disabled`, `warn`, and `strict` enforcement modes.
- Request validation checks required request fields, provider refs, adapter refs, idempotency keys, checksums, schema refs, and optional credential-resolution evidence.
- Result validation checks provider statuses, required result fields, and required response snapshot fields such as provider domain contract refs.
- Finance handoff routes and submission contracts now carry `adapter_contract` snapshots for audit.
- Strict adapter contract failures fail the provider delivery deterministically while preserving request-validation evidence.
- Automated provider certification runs use the same strict adapter contract validation path.
- `/hr-admin/payroll-providers` exposes adapter contract profile, enforcement mode, expected adapter, and latest request/result validation state.
- The remaining architecture gap is real production SDK/portal adapters, recurring queue execution, provider-specific webhook signature adapters, and provider-specific schema mapping packs.

Phase 5U implementation status:

- Provider delivery submission contracts now carry a configurable `callback_security_policy` block with policy refs, enforcement mode, signature algorithm refs, secret rotation refs, replay windows, source policy, and rate-limit refs.
- Public provider callback ingestion records optional event timestamp and source IP metadata, with request-source fallback for audit.
- Callback verification snapshots now persist gate evidence for signature matching, secret rotation refs, replay-window checks, source policy, rate-limit checks, and idempotency replay guard.
- Strict webhook security enforcement can reject callbacks with `callback_security_policy_failed` while keeping the provider delivery unchanged.
- Warn-mode defaults preserve existing callback compatibility and make production security gaps visible before tenant-specific enforcement is enabled.
- Default provider blueprints and demo handoff data expose callback security policy refs without hardcoded secrets.
- `/hr-admin/payroll-handoff` shows webhook security policy and gate status in provider callback cards.
- The remaining architecture gap is real production SDK/portal adapters, recurring queue execution, provider-specific webhook signature adapters, and schema mapping packs.

---

## 5. Configuration-First Component Design

Each salary component should be configurable, versioned, and effective-dated.

Minimum fields:

| Field | Purpose |
|---|---|
| `code` | Stable component key such as `BASIC`, `HRA`, `PF_EMPLOYEE`, `TDS`. |
| `name` | Tenant-facing label. |
| `component_type` | Earning, deduction, employer contribution, reimbursement, tax, informational. |
| `value_type` | Fixed amount, percentage, formula, slab, or external input. |
| `formula_ref` | Link to safe formula definition when formula-based. |
| `is_taxable` | Tax treatment flag or rule reference. |
| `is_proratable` | Whether payable days affect the amount. |
| `rounding_rule` | Rounding behavior. |
| `payslip_visibility` | Visible, hidden, grouped, or employer-only. |
| `statutory_treatment` | Links to compliance pack rules. |
| `accounting_mapping` | GL/export mapping. |
| `effective_from` / `effective_to` | Version validity. |
| `status` | Draft, active, retired. |

No formula should be embedded directly in payroll code for a tenant-specific case.

---

## 6. Formula And Rule Engine

The formula engine should evaluate safe declarative expressions, not arbitrary code.

Supported concepts:

- arithmetic
- references to named components
- references to approved payroll inputs
- references to employee/pay-group attributes exposed by contract
- min/max caps
- conditional rules
- slabs
- rounding
- effective-date lookup
- country-pack functions

Examples of formula intent:

```text
BASIC = CTC * 0.40
HRA = BASIC * 0.50
PF_EMPLOYEE = min(BASIC, 15000) * 0.12
LOP_DEDUCTION = MONTHLY_GROSS / PERIOD_PAYABLE_DAYS * LOP_DAYS
NET_PAY = GROSS_EARNINGS - EMPLOYEE_DEDUCTIONS - TAXES
```

These examples describe configuration behavior. They should become records in formula/rule tables, not hardcoded branches.

Formula safety requirements:

- parse formulas with a whitelist grammar or safe expression AST
- no runtime `eval`
- no filesystem, network, database, or process access from formulas
- validate references before activation
- store formula version used in each calculation trace
- support dry-run preview before publishing a formula
- block deletion of formula versions used by locked payroll runs

---

## 7. Country And Compliance Packs

Payroll core should be country-neutral.

India should be implemented as a country pack:

- Provident Fund
- ESI
- Professional Tax by state
- Labour Welfare Fund by state
- TDS
- gratuity
- bonus
- statutory reports

Country pack rules should be:

- versioned
- effective-dated
- state-aware where needed
- tenant-configurable within legal limits
- traceable in payroll calculations

Compliance pack design:

```text
Payroll Core
  -> CountryPayrollPack: India
      -> StatutoryRuleSet: PF
      -> StatutoryRuleSet: ESI
      -> StatutoryRuleSet: PT
      -> StatutoryRuleSet: LWF
      -> StatutoryRuleSet: TDS
      -> StatutoryRuleSet: Gratuity
      -> StatutoryRuleSet: Bonus
```

---

## 8. Snapshot-Based Payroll Run

Payroll runs must calculate from snapshots.

Run flow:

```text
Draft
  -> Collect Inputs
  -> Validate Inputs
  -> Ready For Calculation
  -> Calculated
  -> Reviewed
  -> Approved
  -> Locked
  -> Payslips Published
  -> Bank File Generated
  -> Accounting Exported
```

Snapshot data should include:

- employee identity and employment state
- organization allocation
- legal entity and branch
- location and state
- pay group
- salary assignment and component versions
- attendance summary
- leave and LOP summary
- overtime summary
- joiner/exiter/proration data
- approved reimbursements, deductions, incentives, loans, advances, and arrears
- bank/KYC readiness indicators
- workflow approval state

Once a run is locked:

- calculation inputs cannot mutate
- calculation lines cannot mutate
- payslip values cannot mutate
- corrections happen through adjustment runs, arrears, reversals, or next-cycle adjustments

---

## 9. Payroll Run Validation

Before calculation, payroll should validate:

- employee has active salary assignment for the period
- employee belongs to exactly one pay group for the period
- legal entity, branch, location, department, cost center, and grade are valid
- attendance/leave inputs are finalized or explicitly accepted as provisional
- LOP and payable days are present
- joiner/exiter proration data is present
- bank account and KYC readiness are acceptable for payment
- required declarations are present
- statutory profile is complete where applicable
- workflow approvals are complete for sensitive inputs
- prior period locks and arrears are consistent

Validation outcomes:

- blocker
- warning
- accepted exception

Accepted exceptions must be stored with actor, reason, timestamp, and scope.

---

## 10. Audit And Explainability

Every calculated amount must be explainable.

For each `PayrollCalculationLine`, store:

- component code and source type
- formula/rule version or adjustment reference
- input values used
- intermediate values
- final amount
- rounding rule
- proration rule
- statutory rule reference where applicable
- source snapshot ids
- calculation timestamp

The UI should answer:

- Why is this employee included?
- Which pay group and calendar were used?
- Which salary structure was used?
- Which attendance and leave inputs were used?
- Why was this earning/deduction applied?
- What formula produced this amount?
- Who approved the run?
- Is the run locked?

---

## 11. Permissions And Sensitive Data

Payroll requires stricter permissions than general HRMS.

Future roles:

- payroll admin
- payroll processor
- payroll approver
- finance viewer
- statutory compliance manager
- auditor
- employee payslip viewer

Permission needs:

- salary field visibility
- payroll input edit
- payroll calculation run
- payroll approval
- run lock/unlock
- payslip publish
- bank file generation
- accounting export
- statutory report generation
- payroll audit export

Field-level controls are required for salary and tax data.

---

## 12. SaaS Configuration Requirements

The payroll module must support:

- multiple legal entities in one tenant
- multiple pay groups
- multiple payroll calendars
- monthly, weekly, biweekly, and custom periods where configured
- effective-dated salary revisions
- employee transfers between entities or cost centers
- tenant-specific component libraries
- reusable platform component templates
- country pack adoption and tenant overrides
- formula preview and activation workflow
- payroll run approval workflows
- immutable locked runs
- tenant-specific numbering for payslips, registers, and bank files
- feature flags for modules and editions

Do not build a single-company payroll flow.

---

## 13. Recommended Implementation Phases

### Payroll Phase 0: Source-Data Contract

- Define HRMS data consumed by payroll.
- Define period snapshots.
- Define payroll-readiness validations.
- Add source-data contract tests.

Phase 0 implementation now starts with payroll readiness, not payroll calculation:

- Backend endpoint: `/api/v1/hr-admin/payroll-readiness/`
- Frontend route: `/hr-admin/payroll-readiness`
- Configuration key: `payroll.readiness_profile.v1`
- Default behavior: resolve tenant configuration when present, otherwise use a documented platform fallback profile.
- Covered source checks: employee master/org assignments, primary bank account readiness, pending leave requests, pending attendance regularizations, attendance record coverage, lifecycle movement/exit signals, and document counts.
- Browser coverage: Playwright e2e flow plus laptop/mobile visual baselines.

Boundary:

- This endpoint validates payroll input readiness only.
- It does not calculate salary, LOP, statutory deductions, payslips, or payment outputs.

### Payroll Phase 1: Configuration Foundation

- Add payroll calendars and periods.
- Add pay groups and employee pay group assignments.
- Add component library and salary structures.
- Add effective-dated employee salary assignments.

### Payroll Phase 2: Calculation Engine V1

- Add safe formula engine. Completed as Phase 2A foundation through versioned rule definitions, safe expression previews, and trace persistence.
- Consume locked input snapshots. Completed as Phase 2B draft calculation.
- Add draft run calculation. Completed as Phase 2B with calculation attempts and line outputs.
- Add calculation trace. Completed as Phase 2B line trace snapshots.
- Add validation blockers and warnings. Partially complete through locked-input preconditions and line-level error capture; richer payroll calculation validations remain future hardening.

### Payroll Phase 3: Review, Approval, And Locking

- Add payroll run workflow.
- Add review screens.
- Add approval and lock states.
- Add exception handling.
- Add locked-run immutability.

### Payroll Phase 4: Payslips And Registers

- Add payslip preview and publish. Completed through published output artifacts.
- Add employee payslip access. Completed through Phase 4I ESS APIs and `/ess/payslips`.
- Add payslip access audit, read receipts, and publish notifications. Completed through Phase 4J access events and notification integration.
- Add signed URL permission binding, revocation history, and artifact access audit export. Completed through Phase 4K signed access grants and CSV export.
- Harden object-storage profile contracts so S3/GCS/Azure storage can be configured without hardcoded secrets. Completed through Phase 4L contract validation and sanitized storage snapshots.
- Add runtime credential resolution and SDK-backed object storage. Completed through Phase 4M optional S3/GCS/Azure runtime adapters and injected-client coverage.
- Add configurable storage policy enforcement. Completed through Phase 4N policy refs, allowlists, encryption/retention/endpoint/size gates, and strict runtime tests.
- Add payroll register. Completed through published register artifacts.
- Add CSV exports. Completed for payroll register and finance handoff artifacts; provider-specific production export adapters remain open.

### Payroll Phase 5: India Compliance Pack V1

- Add PF, ESI, PT, LWF, TDS, gratuity, and bonus foundations. Started through Phase 5A statutory packs, components, slabs, and employee statutory profiles.
- Add statutory profiles and declarations. Employee statutory profiles, HR-admin declaration/proof workflow APIs, employee create/update/submit APIs, direct statutory proof upload, HR-admin statutory review UI, and ESS statutory declaration UI/actions are implemented.
- Add statutory calculations that consume effective-dated statutory packs, components, slabs, wage-base refs, applicability refs, and employee statutory profiles. Started through Phase 5B statutory-generated calculation lines.
- Add statutory reports, challans, returns, and filing evidence. Statutory summary, return, challan artifact generation, provider submission contracts, signed callback ingestion, callback verification refs, and certification evidence refs now exist through the finance handoff pipeline; live statutory provider execution remains deferred.

### Payroll Phase 6: Finance And Payments

- Add bank file generation.
- Add payment advice.
- Add accounting mappings and exports.
- Add finance approval handoff.

### Payroll Phase 7: Maturity

- Add deeper arrears, loans, advances, reimbursements, incentives, off-cycle runs, reversals, and settlement automation.
- Add reporting and analytics depth.
- Add public APIs and webhooks.

---

## 14. First Build Recommendation

Start with:

1. `docs/payroll-source-data-contract.md`
2. payroll model proposal
3. payroll calendar and pay group models
4. salary component and formula metadata models
5. employee salary assignment model
6. payroll input snapshot model
7. draft payroll run model
8. calculation trace model

Avoid starting with payslip UI first.

Payroll trust comes from:

- correct source data
- clear configuration
- safe formulas
- immutable snapshots
- explainable calculation traces
