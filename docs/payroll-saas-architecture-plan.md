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
- The next depth steps are external provider acknowledgement hardening and object-storage adapterization.

Phase 4F implementation status:

- Payroll output artifacts now carry durable file metadata: storage provider reference, storage key, MIME type, file size, SHA-256 checksum, downloadable flag, retention policy reference, and generated payload.
- Payslip artifacts default to generated HTML files; payroll register and finance handoff artifacts default to generated CSV files.
- Output and finance profiles can override MIME types, storage provider refs, storage key prefixes, and retention policy refs without changing engine code.
- HR admin downloads are gated by tenant, artifact publish status, payload availability, and checksum verification.
- Download URLs are exposed only for published downloadable artifacts.
- The remaining architecture gap is replacing the local generated payload with a pluggable object-storage backend and adding external provider acknowledgement/reconciliation state.

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

Compliance:

- `CountryPayrollPack`
- `StatutoryRuleSet`
- `StatutoryRuleVersion`
- `StatutorySlab`
- `StatutoryDeclaration`
- `EmployeeStatutoryProfile`

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

- Add payslip preview and publish.
- Add employee payslip access.
- Add payroll register.
- Add CSV exports.

### Payroll Phase 5: India Compliance Pack V1

- Add PF, ESI, PT, LWF, TDS, gratuity, and bonus foundations.
- Add statutory profiles and declarations.
- Add statutory reports.

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
