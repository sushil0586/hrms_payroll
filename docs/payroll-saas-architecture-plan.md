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
- The remaining architecture gap is production secret-manager wiring, external provider webhooks/retries, real bank/accounting/statutory integrations, and public audit pack packaging.

Phase 4L implementation status:

- Payroll artifact storage profiles are now normalized and sanitized before file metadata is persisted.
- Local, placeholder signed URL, S3, GCS, and Azure provider families have explicit storage contract handling.
- S3/GCS/Azure profiles require provider-specific storage metadata plus a tenant-scoped `credential_ref`; raw credential keys are rejected recursively from configuration snapshots.
- Generated payslip, payroll register, and finance handoff artifacts now retain a sanitized `storage_profile` snapshot for auditability without persisting secrets.
- Unknown storage provider refs fail clearly instead of silently falling back to local generated storage.
- Object-store contract adapters can generate provider-style signed URL metadata in test/contract mode while making production runtime installation explicit.
- Backend tests cover incomplete object-store profiles, S3 contract-profile generation/publish/download, sanitized credential refs, and raw credential rejection.
- The remaining architecture gap is production secret-manager wiring, KMS/lifecycle/scanning policy enforcement, external provider webhooks/retries, real bank/accounting/statutory integrations, and public audit pack packaging.

Phase 4M implementation status:

- Payroll artifact storage credentials now resolve at runtime from `PAYROLL_ARTIFACT_STORAGE_CREDENTIALS` or `HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON` using artifact-safe `credential_ref` values.
- Credential resolution validates missing, disabled, provider-mismatched, and incomplete credential entries before any object-store operation runs.
- Runtime credential descriptors expose only reference/source/metadata evidence and never persist secret material on payroll artifacts.
- `PAYROLL_ARTIFACT_STORAGE_CLIENT_FACTORIES` allows deployments and tests to inject provider clients while keeping cloud SDK imports optional and lazy.
- Object-store runtime adapters now support S3, GCS, and Azure upload/read/signed URL methods behind the existing storage contract.
- S3 runtime coverage proves bytes are written to object storage, artifacts retain blank DB payloads, downloads read back through the storage adapter, checksums verify, and signed URL metadata comes from the runtime provider client.
- The remaining architecture gap is production secret-manager wiring, cloud IAM/bucket/container policy configuration, KMS/customer-managed key enforcement, lifecycle retention checks, malware scanning, multi-region durability controls, external provider webhooks/retries, real bank/accounting/statutory integrations, and public audit pack packaging.

Phase 4N implementation status:

- Payroll artifact storage policies now resolve from `PAYROLL_ARTIFACT_STORAGE_POLICIES` or `HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON`.
- Storage profiles now carry configurable storage, lifecycle, malware-scan, and durability policy refs in their sanitized artifact snapshots.
- Policy enforcement can allowlist provider families, provider refs, credential refs, bucket/container names, retention refs, encryption refs, and endpoint hosts.
- Policy enforcement can require encryption refs, private endpoints, runtime credential resolution, storage-key prefixes, minimum/maximum signed URL expiry, maximum file size, lifecycle profile refs, malware-scan profile refs, and durability profile refs.
- Local/dev, contract-mode object-store, and SDK-backed runtime store/read/signed URL paths all apply the same policy contract.
- Backend tests cover missing policy refs, strict encryption policy rejection, and strict S3 runtime policy success with lifecycle, malware-scan, and durability refs.
- The remaining architecture gap is production secret-manager adapter wiring, cloud IAM/bucket/container policy verification against provider APIs, actual KMS/lifecycle/scanning service integration, external provider webhooks/retries, real bank/accounting/statutory integrations, and public audit pack packaging.

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

Phase 5V implementation status:

- `PayrollProviderJob` now provides a tenant-scoped portable provider queue ledger with job kind/status, idempotency, queue policy refs, worker profile refs, lease metadata, attempt counts, related delivery/retry/callback/connection/certification links, and evidence snapshots.
- Provider job snapshots use the existing raw-credential guard so queue orchestration remains credential-ref-only.
- Retry scheduling now creates idempotent provider retry jobs automatically.
- Provider job enqueue helpers cover provider submission, provider retry, provider certification, and callback reconciliation work.
- The generic provider job worker leases due jobs and dispatches into existing submission, retry, certification, and callback reconciliation seams.
- `process_payroll_provider_jobs` is the new portable worker command with tenant filtering and worker identity evidence.
- HR-admin finance handoff APIs and `/hr-admin/payroll-handoff` now expose provider queue counts and job ledgers.
- The remaining architecture gap is swapping the local database poller for the selected production queue runtime, real production SDK/portal adapters, provider-specific webhook signatures, and deeper mapping pack version-management workflows.

Phase 5W implementation status:

- `PayrollProviderSchemaMappingPack` now stores tenant-owned provider/artifact mapping versions with source/target schema refs, transform and validation rules, enforcement mode, samples, evidence snapshots, and source hashes.
- Default provider onboarding now seeds active bank, accounting, and statutory schema mapping packs without raw credentials.
- Provider route resolution selects schema mapping by explicit mapping profile, provider connection, or provider/artifact fallback.
- Provider submission contracts carry `schema_mapping` evidence, and normalized requests expose artifact metadata, totals, line snapshots, and config snapshots for mapping.
- The safe mapping engine supports source paths, target paths, defaults, required gates, simple type formatting, validation gates, and disabled/warn/strict enforcement.
- Strict mapping failures fail provider delivery with `provider_schema_mapping_failed` while preserving blocked mapping gate evidence.
- Manual and sandbox adapters stamp mapped provider payloads and mapping validation snapshots in adapter results.
- HR-admin provider setup and `/hr-admin/payroll-providers` expose mapping pack counts and version details; `/hr-admin/payroll-handoff` shows delivery-level mapping evidence.
- The remaining architecture gap is persisted simulation comparison across mapping versions, provider-specific signature adapters, and real production SDK/portal adapters.

Phase 5X implementation status:

- Tenant-scoped mapping pack lifecycle services now support create/update draft, clone, activate, archive, export, and import workflows.
- Active mapping pack versions are protected from direct edits; admins clone draft versions before changing provider schema mappings.
- Activation supersedes older active versions for the same mapping profile by moving them to inactive, preserving deterministic route resolution.
- Mapping lifecycle audit evidence is stored in `evidence_snapshot` with actor, action, reason, approval/import/source-version evidence, and superseded pack ids.
- Mapping pack export/import uses a versioned `payroll.provider_schema_mapping_pack.export.v1` payload and creates imported packs as the next draft version.
- HR-admin APIs expose mapping pack list/create, detail/update, import, clone, activate, archive, and export actions.
- `/hr-admin/payroll-providers` now surfaces mapping lifecycle controls, draft/active counts, latest lifecycle action, and compact audit evidence.
- The remaining architecture gap is persisted simulation comparison across mapping versions, production provider SDK/portal adapters, provider-specific signature adapters, and deeper nested/row-expansion mapping support.

Phase 5Y implementation status:

- `/hr-admin/payroll-providers` now includes a visual mapping rule builder drawer for provider schema mapping packs.
- Draft mapping packs can edit target schema refs, enforcement mode, transform source/target paths, value types, defaults, required flags, gate refs, and validation payload paths.
- Active and archived mapping versions render as locked so admins follow the clone-before-edit lifecycle.
- The builder includes add/remove controls and blocks saves while transform or validation rows are incomplete.
- A Next API proxy now forwards mapping pack `PATCH` updates to the HR-admin backend endpoint.
- Provider page browser coverage opens the builder and verifies rule controls, while visual baselines cover the updated provider workspace.
- The remaining architecture gap is persisted simulation comparison across mapping versions, production provider SDK/portal adapters, provider-specific signature adapters, and deeper nested/row-expansion mapping support.

Phase 5Z implementation status:

- Mapping pack simulation now runs through the same safe path-based mapping engine used by provider submissions.
- The HR-admin simulation API returns simulation profile evidence, request snapshot, mapped provider payload, gate counts, passed counts, blocking gate refs, source/target schema refs, and source hash.
- Simulation requests are checked by the existing raw-credential guard, preserving the credential-ref-only boundary.
- Simulation accepts temporary mapping contract overrides so admins can preview unsaved rule-builder edits before activation.
- `/hr-admin/payroll-providers` rule builder now includes a sample request JSON editor, preview action, mapped payload output, pass/block gate chips, and demo-mode local fallback.
- Demo mapping packs include sample request/output snapshots for meaningful preview coverage.
- The remaining architecture gap is persisted simulation evidence comparison across versions, production provider SDK/portal adapters, provider-specific signature adapters, and deeper nested/row-expansion mapping support.

Phase 6A implementation status:

- Provider callback signature verification now runs through a configurable adapter framework instead of a hardcoded deterministic hash path.
- Callback security policies carry signature adapter refs, algorithm refs, material field lists, delimiters, digest format, and signature key refs.
- The default adapter preserves the existing deterministic SHA-256 callback contract and previous material order.
- A keyed HMAC-SHA256-ref adapter path is available for provider profiles that need keyed callback verification evidence without storing raw secrets in delivery snapshots.
- Callback verification snapshots now include adapter refs, material field refs, material hashes, compare mode, digest format, expected/received signatures, and pass/fail status.
- Callback security gates expose the signature adapter evidence used for verification.
- `/hr-admin/payroll-handoff` now shows the selected signature adapter on provider callback cards.
- The remaining architecture gap is secret-manager-backed runtime key resolution for production HMAC/RSA provider signatures, persisted mapping simulation comparisons, production provider SDK/portal adapters, and deeper nested/row-expansion mapping support.

Phase 6B implementation status:

- HMAC-SHA256-ref callback signatures can now resolve signing material from the runtime payroll provider credential resolver.
- Callback security policy config supports `signature_key_resolution_mode`, `signature_key_material_field`, and `require_runtime_signature_key`.
- Runtime signing material is used only while computing the signature; snapshots keep sanitized credential evidence with source refs, metadata, selected material field, and resolved state.
- Reference-derived HMAC mode remains available for deterministic sandbox/demo use, and deterministic SHA-256 remains the default backward-compatible adapter.
- Backend tests prove runtime-secret verification succeeds and raw signing material is not persisted in delivery or callback evidence.
- The remaining architecture gap is asymmetric provider signature adapters, persisted mapping simulation comparisons, production provider SDK/portal adapters, and deeper nested/row-expansion mapping support.

Phase 6C implementation status:

- Provider callbacks now support RSA-SHA256 public-key signature verification through a named asymmetric signature adapter.
- RSA callback verification resolves PEM public keys through the runtime provider credential resolver and stores only sanitized credential evidence.
- Signature policy config supports base64 or hex signature encoding, with RSA callbacks using base64 in demo and regression coverage.
- Callback API/model storage now accepts longer provider signatures, backed by a schema migration.
- RSA verification validates the received signature directly and intentionally leaves `expected_signature` blank in evidence snapshots.
- `/hr-admin/payroll-handoff` demo callback cards now expose RSA public-key adapter evidence.
- The remaining architecture gap is configurable production provider submission transports, persisted mapping simulation comparisons, production provider SDK/portal adapters, and deeper nested/row-expansion mapping support.

Phase 6D implementation status:

- Payroll provider submissions now support a configurable HTTP JSON adapter for production-style API dispatch.
- Route configuration controls endpoint URL, HTTP method, timeout, transport ref, auth scheme, API-key header name, response extraction paths, and domain contract refs.
- HTTP endpoints are required to be HTTPS unless explicitly allowed by configuration for non-production testing.
- Bearer and API-key authentication material resolves through the existing runtime provider credential resolver and is not persisted in raw form.
- Adapter evidence captures sanitized request metadata, redacted headers, response status/header/body checksum, parsed provider response JSON, mapped provider payload, and schema mapping evidence.
- Response mapping can extract provider status, external reference, provider batch ref, failure code/reason, and certification evidence refs from provider-specific JSON paths.
- Backend regression coverage verifies runtime credential usage, contract validation, provider acknowledgement extraction, and secret redaction.
- `/hr-admin/payroll-handoff` demo bank advice now exposes HTTP provider route metadata including adapter profile, transport, method, and auth scheme.
- The remaining architecture gap is persisted mapping simulation comparisons, provider-specific production SDK/portal adapters, and deeper nested/row-expansion mapping support.

Phase 6E implementation status:

- Provider mapping simulations are now persisted as tenant-scoped ledger records instead of remaining transient preview responses.
- `PayrollProviderSchemaMappingSimulation` records candidate mapping version, active baseline mapping version, request snapshot, provider payload, baseline payload, gate evidence, blocker refs, comparison evidence, source hash, and actor/time metadata.
- Simulation comparison runs candidate output against the active mapping pack for the same provider/artifact kind and stores changed, added, removed, and unchanged provider payload path counts.
- Comparison evidence keeps a compact diff sample with path, change type, baseline value, and candidate value.
- The simulation API response now returns both the transient simulation payload and the persisted simulation run.
- Payroll provider setup APIs expose simulation summary counts and the latest simulation ledger rows for HR admin review.
- `/hr-admin/payroll-providers` now shows simulation totals, active comparison evidence, latest diff details, and a simulation ledger table.
- The visual mapping rule builder now surfaces comparison status and diff counts after preview execution.
- The remaining architecture gap is deeper nested/row-expansion mapping support and provider-specific production SDK/portal adapters.

Phase 6F implementation status:

- Provider schema mapping now supports advanced transform modes while keeping safe `copy` transforms as the default.
- `expand_rows` transforms map source arrays such as handoff line snapshots into nested provider payload arrays using configurable row mappings.
- `group_rows` transforms group source arrays by a configured source path, write group keys, emit nested row arrays, and compute configurable `sum` and `count` aggregates.
- Row mappings produce row-level validation gates, so missing required fields remain visible in simulation and strict mapping enforcement.
- Persisted simulation comparison now naturally captures array-path diffs such as `payment.employee_rows[0].employee.code`.
- Backend coverage proves nested bank payment rows, grouped cost-center totals, aggregate counts, comparison evidence, and persisted simulation snapshots.
- The visual rule builder preserves advanced transform config, exposes transform mode selectors, and displays advanced row mapping/aggregate summaries.
- Demo provider mapping data now includes expanded employee payment rows and grouped cost-center payment totals for browser and visual coverage.
- The remaining architecture gap is provider-specific production SDK/portal adapters and locked provider audit pack packaging.

Phase 6G implementation status:

- Provider queue runtime now records heartbeat timestamps, heartbeat counts, recovery counts, and latest recovery timestamps on `PayrollProviderJob`.
- Workers can heartbeat leased/running jobs, extend leases, and preserve heartbeat runtime evidence without storing raw credentials.
- Stale leased/running jobs are recovered back to queued state with configurable backoff or dead-lettered after configurable recovery limits.
- Queue processing now performs stale recovery before due job execution and reports recovered counts through the management command and worker result.
- HR-admin finance handoff setup APIs expose heartbeat, recovery, and stale-job summary counts plus per-job runtime fields.
- `/hr-admin/payroll-handoff` now shows heartbeat/recovery counts, last runtime timestamps, and queue runtime profile evidence.
- Backend coverage proves heartbeat extension, stale recovery, recovery-limit dead-lettering, and API runtime evidence.
- Browser and visual coverage verifies runtime evidence in the handoff workspace.
- The remaining architecture gap is provider-specific production SDK/portal adapters and locked provider audit pack packaging.

Phase 6H implementation status:

- `/hr-admin/payroll-handoff` now supports URL-addressable audit drilldowns for provider deliveries, retry events, queue jobs, and callback events.
- Delivery ledger cards, retry cards, job cards, and callback cards are selectable evidence links that preserve handoff/artifact context.
- Delivery evidence shows provider routing, adapter contract, schema mapping, connection gate, certification evidence, checksums, retries, callbacks, jobs, reconciliation, and failure state.
- Retry evidence shows retry policy, failure taxonomy/category, scheduling decision, attempt/backoff configuration, and linked queue job recovery state.
- Queue runtime evidence shows queue policy, worker profile, lease/heartbeat/recovery policy, idempotency, runtime profile, and recorded runtime events.
- Callback evidence shows webhook identity, callback verification refs, signature adapter evidence, runtime credential-resolution evidence, webhook security policy, and security gates.
- The audit panel keeps the existing artifact detail behavior intact when no evidence item is selected.
- Browser and visual coverage verifies the audit drilldown UX across the payroll handoff workspace.
- The remaining architecture gap is provider-specific production SDK/portal adapters and locked provider audit pack packaging.

Phase 6I implementation status:

- Payroll output artifacts now include a `provider_audit_pack` kind for locked provider evidence bundles.
- Provider audit packs are generated as published JSON artifacts for accepted or failed finance handoffs with terminal delivery evidence.
- The pack builder compiles deterministic handoff, payroll run, output batch, artifact, provider delivery, callback, retry, and queue-job evidence.
- Evidence snapshots are recursively redacted for raw-looking secret/token/private-key fields before hashing and storage.
- Generated packs carry `payroll.provider_audit_pack.standard.v1`, `payroll.provider_audit_pack.schema.v1`, evidence checksum metadata, and 10-year provider-audit retention.
- The HR-admin API can generate/reuse a provider audit pack through the finance handoff action endpoint while preserving accepted handoff immutability.
- Handoff setup APIs expose provider audit pack counts and include audit packs in the package artifact register.
- `/hr-admin/payroll-handoff` shows audit-pack metrics, generation action, locked pack cards, checksum metadata, retention metadata, and download links through the existing artifact detail panel.
- Backend coverage proves accepted-handoff audit-pack generation, idempotent reuse, evidence checksums, redaction posture, downloads, and setup counts.
- Browser and visual coverage verifies audit-pack visibility in the handoff workspace.
- The remaining architecture gap is provider-specific production adapter-pack scaffolds and provider-side storage/IAM policy verification.

Phase 6J implementation status:

- Production provider delivery now has explicit adapter-pack refs for bank, accounting, and statutory domains.
- Production adapter-pack routes require a nested `production_adapter` config object and reject unsupported transport modes, insecure production endpoints, and raw credential material in snapshots.
- Production pack adapters stamp configurable adapter pack/profile refs, environment refs, transport mode/ref, operation refs, domain contract refs, evidence profile refs, idempotency/checksum/callback/storage controls, provider connection evidence, credential-resolution evidence, schema mapping evidence, and artifact metadata.
- The provider adapter resolver still supports `PAYROLL_PROVIDER_ADAPTERS`, so live bank SDKs, accounting SDKs, and statutory portal automations can replace the scaffold classes by configuration.
- Finance handoff transmission now creates all delivery records before adapter submission, preventing immediate provider reconciliation from prematurely accepting an incomplete handoff.
- `production_adapter` metadata is preserved in route and submission contract snapshots for audit-pack and UI evidence.
- `/hr-admin/payroll-handoff` surfaces production pack, transport, operation, and evidence metadata in artifact detail and audit drilldown views.
- Backend coverage proves all three production pack domains, strict adapter contracts, runtime credential refs, certification evidence, unsupported transport rejection, and raw-secret non-persistence.
- Browser and visual coverage verifies production-pack evidence in the handoff workspace.
- The remaining architecture gap is live SDK/portal implementation behind the adapter-pack refs, provider-side storage/IAM policy verification, and lifecycle/KMS/scanning service integration.

Phase 6K implementation status:

- Provider adapter registry readiness is now derived from built-in adapters, configured `PAYROLL_PROVIDER_ADAPTERS`, and adapter refs required by tenant provider connections.
- Registry readiness reports ready/blocked state, source refs, loader refs, missing adapter refs, failed imports, required-by-connection flags, adapter family, supported artifact kinds, and manual/sandbox/HTTP/production-pack classification.
- Invalid configured adapter paths are surfaced as blocked registry entries instead of failing the provider setup page.
- Missing tenant connection adapter refs are visible as `adapter_ref_not_registered`, even though runtime delivery submission still preserves the manual fallback for non-production refs.
- The HR-admin provider setup API now includes an `adapter_registry` evidence block and summary counts for total, ready, blocked, configured, and production-pack adapters.
- `/hr-admin/payroll-providers` shows adapter registry metrics and a live readiness table alongside provider certification, mapping packs, and simulation evidence.
- Backend coverage proves configured custom adapters, broken adapter refs, missing adapter refs, production-pack capability flags, and setup API serialization.
- Browser and visual coverage verifies registry visibility in the provider workspace.
- The remaining architecture gap is implementing live SDK/portal adapter classes behind registered refs, plus provider-side storage/IAM verification and lifecycle/KMS/scanning service integration.

Phase 6L implementation status:

- Bank payout delivery now has a built-in `payroll.provider_adapter.bank.live_payout.v1` adapter contract.
- The live bank adapter is SaaS-configurable through nested `bank_payout_adapter` route settings for client ref, payout profile ref, payment operation/network refs, debit account ref, payment date, response paths, failure taxonomy, partial-acceptance policy, idempotency policy, checksum policy, and secret-material policy.
- Runtime bank SDK/client implementations are resolved from `PAYROLL_BANK_PAYOUT_CLIENTS`; payroll core only calls the configured client boundary and keeps provider-specific code outside the core engine.
- Bank live payout requests are gated on mapped totals, mapped employee rows, credential resolution, idempotency, artifact checksum, client configuration, debit account ref, operation ref, and payment date.
- Bank acknowledgement evidence records payout totals, row counts, accepted/rejected counts, UTR refs, transaction refs, evidence refs, request gates, policy refs, credential snapshots, and redacted provider responses.
- Provider adapter contract validation now supports nested list/object required response fields, so tenant contracts can require evidence such as `bank_payout.utr_refs`.
- Route and submission contract snapshots preserve `bank_payout_adapter` for audit packs and UI evidence.
- `/hr-admin/payroll-handoff` surfaces bank live payout details in artifact detail and audit drilldown views; `/hr-admin/payroll-providers` classifies the built-in live bank adapter in registry readiness.
- Backend, browser, and visual coverage proves injected-client execution, credential-ref use, mapped row submission, UTR/evidence persistence, redaction posture, and UI evidence.
- The remaining architecture gap is a provider-specific bank SDK client package/certification fixture, plus live accounting/statutory adapters, provider-side IAM/storage verification, and lifecycle/KMS/scanning service integration.

Phase 6M implementation status:

- Accounting export delivery now has a built-in `payroll.provider_adapter.accounting.live_journal.v1` adapter contract.
- The live accounting adapter is SaaS-configurable through nested `accounting_journal_adapter` route settings for client ref, ledger profile ref, posting profile ref, journal operation ref, company/books refs, posting date, response paths, failure taxonomy, balancing policy, idempotency policy, checksum policy, and secret-material policy.
- Runtime accounting/ERP SDK client implementations are resolved from `PAYROLL_ACCOUNTING_JOURNAL_CLIENTS`; payroll core calls only the configured journal client boundary.
- Accounting live journal requests are gated on mapped totals, mapped journal rows, credential resolution when required, idempotency, artifact checksum, client configuration, company ref, operation ref, and posting date.
- Accounting acknowledgement evidence records ledger/posting profile refs, company/books refs, totals, row counts, posted/rejected counts, voucher refs, document refs, evidence refs, request gates, policy refs, credential snapshots, and redacted provider responses.
- Route and submission contract snapshots preserve `accounting_journal_adapter` for audit packs and UI evidence.
- `/hr-admin/payroll-handoff` surfaces accounting live journal details in artifact detail and audit drilldown views; `/hr-admin/payroll-providers` classifies the built-in live accounting adapter in registry readiness.
- Backend, browser, and visual coverage proves injected-client execution, credential-ref use, mapped journal row submission, voucher/document/evidence persistence, redaction posture, and UI evidence.
- The remaining architecture gap is provider-specific bank/accounting SDK client packaging and certification fixtures, live statutory portal/API execution, provider-side IAM/storage verification, and lifecycle/KMS/scanning service integration.

Phase 6N implementation status:

- Statutory report delivery now has a built-in `payroll.provider_adapter.statutory.live_filing.v1` adapter contract.
- The live statutory adapter is SaaS-configurable through nested `statutory_filing_adapter` route settings for client ref, filing profile ref, filing operation ref, filing type ref, authority ref, employer registration ref, filing calendar ref, due date, response paths, failure taxonomy, receipt policy, idempotency policy, checksum policy, and secret-material policy.
- Runtime statutory portal/API client implementations are resolved from `PAYROLL_STATUTORY_FILING_CLIENTS`; payroll core calls only the configured filing client boundary.
- Statutory live filing requests are gated on mapped totals, mapped filing rows, credential resolution, idempotency, artifact checksum, client configuration, authority ref, registration ref, filing type ref, and operation ref.
- Statutory acknowledgement evidence records filing profile, operation, filing type, authority, registration, calendar, due date, totals, row counts, accepted/rejected counts, receipt refs, challan refs, acknowledgement refs, evidence refs, request gates, policy refs, credential snapshots, and redacted provider responses.
- Certification evidence now includes receipt/challan/acknowledgement refs returned by the live filing adapter.
- Route and submission contract snapshots preserve `statutory_filing_adapter` for audit packs and UI evidence.
- `/hr-admin/payroll-handoff` surfaces statutory live filing details in artifact detail and audit drilldown views; `/hr-admin/payroll-providers` classifies the built-in live statutory adapter in registry readiness.
- Backend, browser, and visual coverage proves injected-client execution, credential-ref use, mapped filing row submission, receipt/challan/evidence persistence, redaction posture, and UI evidence.
- The remaining architecture gap is provider-specific bank/accounting/statutory SDK or portal client packaging and certification fixtures, provider-side IAM/storage verification, and lifecycle/KMS/scanning service integration.

Phase 6O implementation status:

- Provider runtime client readiness now has a first-class `payroll.provider_client_registry.readiness.v1` descriptor.
- Built-in certification fixture clients exist for bank payout, accounting journal, and statutory filing through `payroll.provider_client.bank.fixture.v1`, `payroll.provider_client.accounting.fixture.v1`, and `payroll.provider_client.statutory.fixture.v1`.
- Live adapters resolve deployment-configured clients from `PAYROLL_BANK_PAYOUT_CLIENTS`, `PAYROLL_ACCOUNTING_JOURNAL_CLIENTS`, and `PAYROLL_STATUTORY_FILING_CLIENTS`, then fall back to fixture clients by explicit ref.
- Client readiness reports family, supported adapter refs, supported artifact kinds, expected/implemented methods, built-in vs configured source refs, fixture vs live mode, required-by-connection flags, and blockers.
- Provider setup API and `/hr-admin/payroll-providers` now expose client readiness next to adapter readiness, keeping SaaS onboarding transparent without persisting raw provider secrets.
- Backend and browser coverage proves fixture/configured/missing client classification and setup-screen visibility.
- The remaining architecture gap is implementing real vendor SDK/portal packages behind these client refs, provider-side IAM/storage verification, and lifecycle/KMS/scanning service integration.

Phase 6P implementation status:

- Provider integration packages now have a manifest registry profile through `payroll.provider_package_registry.readiness.v1`.
- Built-in fixture package manifests cover bank payout, accounting journal, and statutory filing using `payroll.provider_package.bank.fixture.v1`, `payroll.provider_package.accounting.fixture.v1`, and `payroll.provider_package.statutory.fixture.v1`.
- Deployments can declare package manifests through `PAYROLL_PROVIDER_PACKAGES` without changing payroll core.
- Package manifests declare provider kind, adapter ref, runtime client ref, certification fixture client ref, supported artifact kinds, transport modes, required route config refs, certification scenario refs, evidence paths, failure taxonomy, and reference-only secret policy.
- Package readiness blocks unsafe manifests with raw credential keys, unsupported provider kinds, missing adapters/clients, missing config/scenario/evidence coverage, or invalid secret-material policy.
- Provider setup API and `/hr-admin/payroll-providers` expose package manifest readiness beside adapter and client readiness.
- Backend and browser coverage proves fixture/configured/missing/unsafe package classification and setup-screen visibility.
- The remaining architecture gap is implementing real vendor SDK/portal package modules behind these manifest refs, provider-side IAM/storage verification, and lifecycle/KMS/scanning service integration.

Phase 6Q implementation status:

- The first live provider package skeleton now exists for bank payouts through `payroll.provider_client.bank.sdk_http.v1`.
- A built-in `payroll.provider_package.bank.sdk_http.v1` manifest declares the bank SDK HTTP package boundary, required route config refs, certification scenario refs, evidence paths, credential profile, and reference-only secret policy.
- `bank_payout_adapter` route configuration now carries endpoint URL, transport ref, timeout, auth scheme, API-key header name, static headers, and insecure-HTTP override for controlled tests.
- The bank SDK HTTP client uses runtime-resolved credential refs for bearer/API-key auth, injects idempotency/checksum headers, delegates network execution through `PAYROLL_PROVIDER_HTTP_TRANSPORTS`, and normalizes provider acknowledgements back into the live bank payout adapter response contract.
- Evidence records package/client refs, transport metadata, header refs, response status, and response body checksum while omitting credential material.
- Backend tests prove configured transport execution, request body shape, credential use, normalized UTR/transaction/evidence persistence, and redaction.
- `/hr-admin/payroll-providers` demo/browser/visual coverage now exposes the bank SDK HTTP client and package as live package readiness.
- The remaining architecture gap is accounting/statutory package skeletons, real vendor SDK modules behind these refs, provider-side IAM/storage verification, and lifecycle/KMS/scanning service integration.

Phase 6R implementation status:

- Accounting journal posting now has a live provider package skeleton through `payroll.provider_client.accounting.sdk_http.v1`.
- A built-in `payroll.provider_package.accounting.sdk_http.v1` manifest declares the accounting SDK HTTP package boundary, required route config refs, certification scenario refs, evidence paths, credential profile, and reference-only secret policy.
- `accounting_journal_adapter` route configuration now carries endpoint URL, transport ref, timeout, auth scheme, API-key header name, static headers, and insecure-HTTP override for controlled tests.
- The accounting SDK HTTP client uses runtime-resolved credential refs for bearer/API-key auth, injects idempotency/checksum headers, delegates network execution through `PAYROLL_PROVIDER_HTTP_TRANSPORTS`, and normalizes provider acknowledgements back into the live accounting journal adapter response contract.
- Evidence records package/client refs, transport metadata, header refs, response status, and response body checksum while omitting credential material.
- Backend tests prove configured transport execution, request body shape, credential use, normalized voucher/document/evidence persistence, and redaction.
- `/hr-admin/payroll-providers` demo/browser/visual coverage now exposes the accounting SDK HTTP client and package as live package readiness.
- The remaining architecture gap is the statutory API/portal package skeleton, real vendor SDK modules behind these refs, provider-side IAM/storage verification, and lifecycle/KMS/scanning service integration.

Phase 6S implementation status:

- Statutory filing now has a live provider package skeleton through `payroll.provider_client.statutory.sdk_http.v1`.
- A built-in `payroll.provider_package.statutory.sdk_http.v1` manifest declares the statutory SDK HTTP package boundary, required route config refs, certification scenario refs, evidence paths, credential profile, and reference-only secret policy.
- `statutory_filing_adapter` route configuration now carries endpoint URL, transport ref, timeout, auth scheme, API-key header name, static headers, and insecure-HTTP override for controlled tests.
- The statutory SDK HTTP client uses runtime-resolved credential refs for bearer/API-key auth, injects idempotency/checksum headers, delegates network execution through `PAYROLL_PROVIDER_HTTP_TRANSPORTS`, and normalizes provider acknowledgements back into the live statutory filing adapter response contract.
- Evidence records package/client refs, transport metadata, header refs, response status, and response body checksum while omitting credential material.
- Backend tests prove configured transport execution, request body shape, credential use, normalized receipt/challan/acknowledgement/evidence persistence, and redaction.
- `/hr-admin/payroll-providers` demo/browser coverage now exposes the statutory SDK HTTP client and package as live package readiness.
- The remaining architecture gap is real vendor SDK modules behind these refs, provider-side IAM/storage verification, and lifecycle/KMS/scanning service integration.

Phase 6T implementation status:

- Provider package manifests now declare `storage_policy_refs`, making artifact storage and IAM policy expectations part of package readiness.
- `describe_payroll_artifact_storage_policy_registry` exposes `payroll.storage_policy_registry.readiness.v1` with builtin, configured, required, ready, missing, disabled, and blocked policy classification.
- Package readiness blocks manifests with omitted, missing, or blocked storage policy refs before the provider package can be treated as launch-ready.
- Storage policy readiness evidence exposes provider family, credential, bucket/container, retention, encryption, endpoint, lifecycle, malware scan, durability, and max-size controls while recursively redacting secret-shaped metadata keys.
- Provider setup API summary now includes storage policy registry counts, and `/hr-admin/payroll-providers` shows artifact policy readiness beside package/client/adapter readiness.
- Backend and browser tests prove ready/blocked policy classification, package-level policy refs, secret redaction, and setup-screen visibility.
- The remaining architecture gap is lifecycle/KMS/scanning verification against real control-plane APIs and real vendor package modules behind the SDK HTTP skeleton refs.

Phase 6U implementation status:

- Storage policy controls now have a cloud-neutral verifier hook contract through `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFIERS`.
- `verify_payroll_artifact_storage_policy_controls` derives KMS/encryption, lifecycle, malware scan, durability, and IAM control refs from the configured storage policy.
- Verification can run in `declaration` mode for non-blocking readiness evidence or `strict` mode for launch-blocking service-backed checks.
- Verifiers can be registered by exact control ref, control kind, or wildcard, keeping vendor/control-plane implementations outside payroll core.
- Strict storage policies block readiness when verifiers are missing, fail, or return blocked control results.
- Control verification snapshots carry verifier refs, status, failure codes, blocked refs, and redacted evidence.
- Provider setup API/UI now show verified versus blocked storage controls in the artifact policy readiness table.
- Backend and browser tests prove strict verified controls, blocked malware-scan controls, missing-verifier blockers, redaction, and setup-screen visibility.
- The remaining architecture gap is real vendor package modules behind the SDK HTTP skeleton refs and production deployment runbooks for verifier wiring.

Phase 6V implementation status:

- The first named provider package module now exists for bank payouts through `payroll.provider_client.bank.razorpayx_http.v1`.
- A built-in `payroll.provider_package.bank.razorpayx_http.v1` manifest declares package module, vendor profile, provider contract, adapter, client, fixture client, route config refs, certification scenarios, evidence paths, schema mapping profile, credential profile, failure taxonomy, secret policy, and storage policy refs.
- The package module reuses the configurable live bank payout adapter and injected HTTP transport rather than adding vendor logic to payroll run or handoff code.
- RazorpayX-compatible response-path defaults normalize status, external reference, batch ref, accepted/rejected counts, UTR refs, transaction refs, evidence refs, and error fields into the existing bank payout contract.
- Tenant deployments can override endpoint/auth/header/transport/timeout/account/payment/operation/response-path behavior through route configuration.
- Evidence carries package module, vendor profile, provider contract, response path profile, transport metadata, response checksum, and redacted provider responses.
- Provider client/package registries and `/hr-admin/payroll-providers` now surface the named bank package beside generic SDK HTTP and fixture packages.
- Backend and browser tests prove package execution, registry exposure, provider acknowledgement normalization, and credential redaction.
- The remaining architecture gap is accounting/statutory vendor package modules and production deployment runbooks.

Phase 6W implementation status:

- The first named accounting provider package module now exists through `payroll.provider_client.accounting.tallyprime_http.v1`.
- A built-in `payroll.provider_package.accounting.tallyprime_http.v1` manifest declares package module, vendor profile, provider contract, adapter, client, fixture client, route config refs, certification scenarios, evidence paths, schema mapping profile, credential profile, failure taxonomy, secret policy, and storage policy refs.
- The package module reuses the configurable live accounting journal adapter and injected HTTP transport rather than adding vendor logic to payroll run or handoff code.
- TallyPrime-compatible response-path defaults normalize status, GUID, import ref, posted/rejected counts, voucher refs, document refs, evidence refs, and error fields into the existing accounting journal contract.
- Tenant deployments can override endpoint/auth/header/transport/timeout/company/books/posting/operation/response-path behavior through route configuration.
- Evidence carries package module, vendor profile, provider contract, response path profile, transport metadata, response checksum, and redacted provider responses.
- Provider client/package registries and `/hr-admin/payroll-providers` now surface the named accounting package beside generic SDK HTTP and fixture packages.
- Backend and browser tests prove package execution, registry exposure, journal acknowledgement normalization, and credential redaction.
- The remaining architecture gap is statutory vendor package modules and production deployment runbooks.

Phase 6X implementation status:

- The first named statutory provider package module now exists through `payroll.provider_client.statutory.epfo_ecr_http.v1`.
- A built-in `payroll.provider_package.statutory.epfo_ecr_http.v1` manifest declares package module, vendor profile, provider contract, adapter, client, fixture client, route config refs, certification scenarios, evidence paths, schema mapping profile, credential profile, failure taxonomy, secret policy, and storage policy refs.
- The package module reuses the configurable live statutory filing adapter and injected HTTP transport rather than adding vendor logic to payroll run or handoff code.
- EPFO ECR-compatible response-path defaults normalize status, TRRN, ECR ref, accepted/rejected counts, receipt refs, challan refs, acknowledgement refs, evidence refs, and error fields into the existing statutory filing contract.
- Tenant deployments can override endpoint/auth/header/transport/timeout/authority/registration/filing/calendar/response-path behavior through route configuration.
- Evidence carries package module, vendor profile, provider contract, response path profile, transport metadata, response checksum, and redacted provider responses.
- Provider client/package registries and `/hr-admin/payroll-providers` now surface the named statutory package beside generic SDK HTTP and fixture packages.
- Backend and browser tests prove package execution, registry exposure, statutory acknowledgement normalization, and credential redaction.
- The remaining architecture gap is production deployment runbooks and environment templates.

Phase 6Y implementation status:

- Production payroll provider readiness is now documented in `docs/payroll-production-readiness-runbook.md`.
- Sanitized runtime configuration shapes are now documented in `docs/payroll-production-env-template.md`.
- Backend settings now explicitly declare empty defaults for provider transports, custom packages, bank/accounting/statutory live client registries, storage control verifiers, and storage verification mode.
- `backend/.env.example` now points operators to the payroll production configuration docs without committing secret material.
- The runbook covers tenant provider connection gates, package refs, route config requirements, storage policy controls, certification flow, launch commands, support triage, and production change control.
- The template covers credential resolver shape, callable transport registry shape, package manifest overrides, bank/accounting/statutory route examples, storage credential shape, storage policy shape, and storage verifier callback shape.
- `docs/hrms-pilot-setup-notes.md` now links the provider launch runbook and environment template from the operational commands section.
- The remaining architecture gap is production launch rehearsal against tenant-specific configuration and broader release hardening.

Phase 6Z implementation status:

- Provider setup now includes a deterministic launch rehearsal snapshot under `payroll.provider_launch_rehearsal.v1`.
- The rehearsal aggregates bank, accounting, and statutory launch lanes from provider connections, tenant route snapshots, adapter registry readiness, client registry readiness, package registry readiness, storage policy readiness, and finance handoff enforcement.
- Each lane reports connection count, launch-ready connection count, route count, adapter ref, client ref, package ref, storage policy refs, package module ref, vendor profile ref, provider contract ref, handoff enforcement mode, passed gates, and blocking gate refs.
- A lane is launch-ready only when the provider connection is certified or active with `active_allowed`, a route exists, the adapter/client/package refs are ready, package storage policy refs are ready, and finance handoff enforcement is `certified` or `active`.
- `/api/v1/hr-admin/payroll-provider-connection-setup/` now returns rehearsal summary counts and the full lane ledger.
- `/hr-admin/payroll-providers` now shows a production dry-run panel with the rehearsal profile ref, lane status, package/client refs, storage policy count, handoff gate, and blockers.
- Backend tests prove a fully ready three-lane production rehearsal with strict storage verifier evidence and redaction.
- Browser coverage verifies the launch rehearsal panel is visible in the provider workspace.
- The remaining architecture gap is running tenant-specific launch rehearsals against real deployment settings and broader release hardening.

Phase 7A implementation status:

- Tenant-specific launch readiness can now run through `manage.py rehearse_payroll_provider_launch --tenant-code <tenant-code>`.
- The command reuses the HR admin provider setup assembly path, so CLI release gates, admin workspace readiness, and API snapshots evaluate the same tenant connection, route, registry, storage policy, and finance handoff evidence.
- Successful runs emit a sanitized `payroll.provider_launch_readiness.audit_pack.v1` payload with tenant snapshot, connection refs, lane ledger, registry evidence, release gates, blockers, the full launch rehearsal, and an evidence checksum.
- Blocked runs exit nonzero by default and can still export diagnostic evidence with `--allow-blocked`.
- Backend coverage proves blocked audit export, command failure behavior, ready three-lane command execution, checksum generation, and verifier secret redaction.
- The remaining architecture gap is persisted launch history, broader release hardening, and non-provider module completion review.

Phase 7B implementation status:

- Provider launch rehearsal history is now persisted in `PayrollProviderLaunchRehearsal`.
- Each persisted rehearsal stores the launch rehearsal profile, audit pack profile, generated-by ref, ready/blocked status, `can_launch`, lane counts, blocker count, blocker refs, sanitized audit-pack snapshot, evidence checksum, generated timestamp, actor, and source hash.
- `record_payroll_provider_launch_rehearsal` creates a ledger row from the same setup payload used by the admin workspace and command gate.
- `manage.py rehearse_payroll_provider_launch` now records a launch rehearsal row for every command run while preserving JSON export and blocked-run exit behavior.
- `/api/v1/hr-admin/payroll-provider-connection-setup/` now includes recent launch rehearsals plus run-count, ready-count, blocked-count, latest-status, and latest-checksum summary fields.
- `/api/v1/hr-admin/payroll-provider-launch-rehearsals/run/` records a rehearsal from the HR admin workspace and returns the refreshed setup snapshot.
- `/hr-admin/payroll-providers` now includes a run action, launch history metric, and recorded rehearsal table with status, lane counts, blockers, and checksum.
- Backend and browser coverage prove persisted history, command persistence, API action behavior, and visual/UI exposure.
- The remaining architecture gap is broader release hardening and non-provider module completion review.

Phase 7C implementation status:

- HR admin dashboard launch readiness now includes `hrms.saas_launch_audit.v1`.
- The audit rolls up tenant foundation, IAM, organization, employee master, ESS/MSS, leave, attendance, lifecycle, documents, notifications, payroll core, and provider launch history.
- Each module returns gate status, passed count, blockers, warnings, failed refs, and evidence refs from tenant-owned operational records and persisted provider rehearsal history.
- Payroll core readiness is checked through active calendars, pay groups, salary components, salary structure versions, and payroll rule versions.
- Provider launch history remains a broader-audit warning until a ready rehearsal exists, keeping provider go-live strictness in the dedicated provider launch gate while still making it visible in the HRMS launch overview.
- `/hr-admin` now surfaces the audit as a compact control-center panel with Playwright route-smoke and visual coverage.
- The remaining architecture gap is converting launch audit warnings/blockers into assigned remediation workflows and exportable release packs.

Phase 7D implementation status:

- Launch audit metadata is now configuration-first through `hrms.saas_launch_audit_profile.v1`.
- Tenant configuration can override module owner role refs, action routes, action labels, SLA days, and individual gate severity/action metadata.
- Failed launch gates now produce `release_actions` with owner, route, SLA, current value, severity, module, and evidence refs.
- `/hr-admin` shows actionable remediation rows directly under the launch audit module summary.
- `describe_hrms_saas_launch_audit_pack` builds `hrms.saas_launch_audit_pack.v1` with tenant snapshot, summary counts, modules, release actions, evidence refs, launch flag, and checksum.
- `manage.py rehearse_hrms_saas_launch --tenant-code <tenant-code>` exports the HRMS launch audit pack, blocks on blocker gates by default, supports diagnostic `--allow-blocked`, and supports strict warning failure through `--strict-warnings`.
- The remaining architecture gap is persisted remediation assignment lifecycle and in-app launch-pack download.

Phase 7E implementation status:

- Launch remediation assignments are now persisted in `HrmsLaunchRemediationAssignment`.
- Each tenant gate assignment stores module refs, labels, severity, status, owner role ref, action route, action label, SLA days, current value, evidence ref, first/last seen timestamps, resolution timestamp, assignment snapshot, and source hash.
- `sync_hrms_saas_launch_remediation_assignments` materializes current failed gates and closes open assignments when the gate is no longer failing.
- HR admin dashboard reads now return remediation assignment rows and summary counts inside `launch_audit`.
- `manage.py rehearse_hrms_saas_launch` syncs the remediation ledger and includes the remediation assignment summary in the exported audit-pack checksum.
- `/api/v1/hr-admin/saas-launch-audit/download/` provides an authorized JSON audit-pack download with checksum/profile headers.
- `/hr-admin` exposes open assignment count and a “Download audit” action through a Next proxy route.
- Launch remediation assignments now support assignee identifiers, acknowledgement, ignored-risk decisions, resolution notes, and action history.
- `/api/v1/hr-admin/launch-remediations/` provides status/severity/owner/module/search filtering and `/api/v1/hr-admin/launch-remediations/<id>/` records acknowledge, assign, ignore, resolve, and reopen actions.
- `/hr-admin/launch-remediation` gives release managers a browser-tested launch-risk workspace with dense filters, assignment rows, action controls, direct owning-route navigation, and operational visual baselines.
- Launch remediation SLA automation now derives due dates from configurable launch-audit SLA days, supports manual due-date overrides, reminder and escalation actions, due-state filtering, and a scheduled `process_hrms_launch_remediations` command.
- Reminder/escalation delivery routes through configurable notification events under module `saas_operations`, with fallback in-app notifications when a tenant has not configured templates/channels yet.
- SaaS commercial control-plane foundation now exists through `saas.commercial_profile.v1`, resolving tenant plan, subscription active status, module entitlements, required launch entitlements, and usage limits without hardcoded packaging.
- `/api/v1/hr-admin/saas-control-plane/` and `/hr-admin/saas-control-plane` expose commercial readiness, while `hrms.saas_launch_audit.v1` now includes a `saas_commercial_control` launch gate.
- `saas.commercial_profile.v1` now also defines commercial enforcement scopes for API path prefixes, methods, entitlements, and blocking usage meters.
- HR admin payroll and payroll-provider APIs are commercially gated by tenant plan, subscription status, entitlement state, and usage-limit policy; denied responses include the matched enforcement scopes for support/debug review.
- `/api/v1/hr-admin/saas-control-plane/` supports provider-neutral subscription lifecycle updates for plan, status, billing provider ref, billing account ref, and current period end, and `/hr-admin/saas-control-plane` exposes these controls with browser-tested lifecycle and enforcement panels.
- `SaasUsageMeterSnapshot` now persists point-in-time commercial usage evidence, `SaasCommercialAuditEvent` records subscription and scheduled snapshot events with source hashes, and `snapshot_saas_commercial_usage` supports scheduled/manual usage capture.
- `/api/v1/hr-admin/saas-control-plane/` and `/hr-admin/saas-control-plane` now expose recent usage-meter evidence and commercial audit history.
- Tenant-admin workspace access now exposes `/api/v1/tenant-admin/console/` for tenant account posture, commercial readiness, seat usage, role coverage, configuration health, governance checks, and recent commercial evidence, with `/tenant-admin` providing a browser-tested self-service console foundation.
- Tenant-admin membership mutations now support invite, activate, suspend, revoke, and role update actions through tenant-scoped APIs, with active-seat enforcement sourced from `saas.commercial_profile.v1`, last tenant-admin safety, and commercial audit events for every action.
- Tenant-admin plan, billing contact, and configuration change requests now persist in `SaasTenantChangeRequest` with configurable request type metadata from `saas.commercial_profile.v1`, requested/current snapshots, decision/application lifecycle, source hashes, commercial audit events, tenant-admin APIs, and `/tenant-admin` queue controls.
- Tenant-admin governed support access grants now persist in `SaasSupportAccessGrant` with configurable support scopes, maximum duration, request snapshots, decision/session/revocation history, source hashes, commercial audit events, tenant-admin APIs, Next proxy routes, and `/tenant-admin` support grant controls.
- Runtime support-session enforcement now validates active grant state, authenticated support-agent identity, session refs, expiry windows, read-only methods, and requested scope refs before exposing `/api/v1/support/tenant-console/`; `/support` gives support users a browser-tested scoped console for allowed tenant posture sections.
- Tenant-admin commercial/support audit export now builds `saas.commercial_support_audit_pack.v1` with tenant snapshot, commercial control evidence, commercial event ledger, usage-meter snapshots, support-access grant lifecycle evidence, source hashes, and checksum headers through `/api/v1/tenant-admin/commercial-support-audit/download/`.
- SaaS operational health now builds `saas.operational_health.v1` across launch blockers, commercial control, notification delivery, provider queue jobs/retries, support sessions, tenant change requests, and remediation SLA, with `/api/v1/hr-admin/saas-operational-health/` and `/hr-admin/saas-operations` exposing the cockpit.
- SaaS resilience readiness now builds `saas.resilience_readiness.v1` from the configurable `saas.resilience_profile.v1`, covering backup cadence/RPO, latest backup evidence, encrypted/offsite storage controls, restore-test recency, retention windows, deletion/legal-hold refs, and runbook/evidence refs through `/api/v1/hr-admin/saas-resilience/` and `/hr-admin/saas-resilience`.
- SaaS SLA operations now persist `SaasIncidentRecord` rows with tenant-scoped incident refs, severity/status, impact refs, owner role refs, response/resolution targets, action history, snapshots, and source hashes; `saas.sla_profile.v1` evaluates incidents plus notification/provider/support/remediation thresholds into `saas.sla_operations.v1` through `/api/v1/hr-admin/saas-sla-operations/` and `/hr-admin/saas-sla-operations`.
- The remaining architecture gap is billing-provider webhooks/sync, expanding support-session enforcement into deeper domain APIs, live backup/restore provider execution, incident provider automation, and deployment runbooks.

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
- Keep support diagnostics SaaS-ready through configurable support-domain snapshot mappings, where each tenant-visible payroll/provider diagnostic surface is read-only, tenant-scoped, session-ref gated, expiry-aware, and bound to an approved support-access scope.
- Keep commercial and support evidence customer-reviewable through configurable tenant trust-audit groups and filters, so payroll/provider support sessions can be inspected by tenant admins before audit-pack export.
- Keep enterprise security launch posture customer-visible through configurable `saas.enterprise_security_profile.v1` readiness checks for MFA, SSO, SCIM, session controls, audit export/retention, and data protection before enabling payroll SaaS launch.

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
