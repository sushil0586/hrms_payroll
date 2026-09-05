# Payroll Source-Data Contract

## 1. Purpose

This document defines the HRMS data that payroll can consume.

It is the handoff contract between the completed HRMS pilot baseline and the future payroll module.

Core rule:

- HRMS owns operational source data.
- Payroll snapshots approved/finalized HRMS outputs for a payroll period.
- Locked payroll runs must not recalculate from mutable live HRMS records.

---

## 2. Contract Principles

1. Every source record must be tenant-scoped.
2. Payroll should consume effective-dated data.
3. Payroll should consume summarized period outputs where possible, not raw operational noise.
4. Every source value used in payroll should be traceable to a source record or accepted exception.
5. Payroll should distinguish blocker, warning, and accepted exception.
6. Source data must be frozen into payroll snapshots before calculation.
7. Payroll-sensitive outputs must have permission checks beyond normal HR admin visibility.

Phase 0 implementation note:

- `/api/v1/hr-admin/payroll-readiness/` exposes source readiness for a selected period.
- `/hr-admin/payroll-readiness` renders the browser workspace for HR admin review.
- The readiness profile resolves from tenant configuration key `payroll.readiness_profile.v1` with a platform default fallback.
- The response returns the resolved profile, period, summary, status counts, row-level warnings/blockers, and source counts.
- No salary component, statutory, LOP, or net-pay logic is hardcoded in this phase.

Phase 1A implementation note:

- `/api/v1/hr-admin/payroll-setup/` exposes payroll calendars, payroll periods, pay groups, effective-dated employee assignments, setup summary counts, and selectable tenant options.
- `/hr-admin/payroll-setup` renders the browser workspace for HR admin setup review.
- Periods cannot overlap within the same calendar, and employees cannot have overlapping active pay group assignments.
- Pay group behavior remains configuration-first through explicit scope fields and `config_snapshot` keys.
- Salary structures, statutory calculation, and net-pay logic remain future phases from this point in the plan.

Phase 1B implementation note:

- `/api/v1/hr-admin/salary-setup/` exposes salary components, salary structures, structure versions, component lines, employee salary assignments, summary counts, and selectable tenant options.
- `/hr-admin/salary-setup` renders the browser workspace for HR admin salary setup review.
- Salary components use type/value-type fields and references to formulas, applicability rules, rounding rules, accounting mappings, and statutory treatments.
- Active salary structure versions and active employee salary assignments cannot overlap in their effective windows.
- Payroll calculation, statutory formula evaluation, payslips, and net-pay logic remain future phases from this point in the plan.

Phase 1C implementation note:

- `/api/v1/hr-admin/payroll-input-snapshot-setup/` exposes payroll runs, employee input snapshots, lock status counts, validation status, source hashes, and selectable tenant options.
- `/hr-admin/payroll-inputs` renders the browser workspace for run input review and employee source-family inspection.
- `PayrollRun` anchors a period/pay-group run and stores input profile/schema references.
- `PayrollInputSnapshot` freezes employee, organization, salary, attendance, leave, lifecycle, document, banking, validation, and config source families as JSON snapshots.
- Locked input snapshots are immutable at the model/API layer.
- Payroll calculation, statutory formula evaluation, payslips, bank files, and accounting exports remain future phases.

Phase 2A implementation note:

- `/api/v1/hr-admin/payroll-rules-setup/` exposes tenant-scoped payroll rule definitions, rule versions, stored evaluations, locked snapshot preview options, setup summary counts, and supported rule/evaluator options.
- `/hr-admin/payroll-rules` renders the browser workspace for rule catalog review, version inspection, locked input preview context, safe expression visibility, dependencies, and stored trace output.
- `PayrollRuleDefinition` stores reusable rule intent by code, type, tags, and tenant configuration metadata.
- `PayrollRuleVersion` stores effective-dated `safe_expr_v1` expressions, schema metadata, rounding/config references, and activation state.
- `PayrollRuleEvaluation` stores preview context, input snapshot linkage, result snapshot, and trace snapshot for auditability.
- Rule previews can consume locked input snapshots only when a snapshot context is requested by id.
- Payroll run calculation, payslips, bank files, accounting exports, and statutory filing outputs remain future phases.

Phase 2B implementation note:

- `/api/v1/hr-admin/payroll-calculation-setup/` exposes payroll runs, calculation attempts, calculation lines, latest totals, statuses, active rule-version options, and line trace metadata.
- `/api/v1/hr-admin/payroll-runs/<id>/calculate-draft/` creates a draft calculation attempt only after payroll input snapshots are locked.
- `/hr-admin/payroll-calculations` renders the browser workspace for run selection, calculation attempts, gross/deduction/net totals, rule-sourced formula lines, adjustment-sourced input lines, dependencies, source hashes, and config metadata.
- `PayrollRunCalculation` stores the calculation profile reference, selected rule snapshot, totals snapshot, error snapshot, actor, and attempt number.
- `PayrollCalculationLine` stores the employee, locked input snapshot, source type, rule version or adjustment linkage, expression/source detail, result, context snapshot, trace snapshot, source hash, and configurable component metadata used for the draft amount.
- Prior draft or completed attempts are preserved as `superseded` when a new draft calculation is generated.
- Payslip publishing, statutory filing outputs, bank files, and accounting exports remain future phases.

Phase 4D implementation note:

- `PayrollValidationIssue` stores pre-calculation and calculation validation findings with tenant, run, optional calculation, optional input snapshot, optional employee, severity, category, status, profile ref, source ref, source hash, context snapshot, and config snapshot evidence.
- Draft calculation now refreshes open run-level validation issues before each attempt.
- Source-data blockers, missing salary payloads, unlocked snapshots, missing active payroll rules, and applied adjustments without locked snapshots block calculation before lines or totals are created.
- Source-data warnings, duplicate component-rule targets, pending adjustments, and pending settlements persist as warning issues and attach to the generated calculation attempt when calculation succeeds.
- `/api/v1/hr-admin/payroll-calculation-setup/` exposes validation issues and summary counts so the browser workspace can show calculation readiness without recalculating source data.

Phase 4E implementation note:

- Calculation validation profiles can now declare required component codes, required output paths, allowed line types, statutory profile refs, statutory mapping requirements, and dependency-order behavior.
- The validator compares required outputs against matched active rule versions, not hardcoded component assumptions.
- Safe-expression dependency inspection checks whether formulas read locked source-data paths or earlier rule output paths before calculation starts.
- Missing or out-of-order formula dependencies are persisted as validation issues with source refs and context snapshots.
- Statutory profile checks are profile-driven so India-first packs and future country packs can define their own PF, ESI, PT, LWF, tax, or local compliance requirements.

Phase 3A implementation note:

- `/api/v1/hr-admin/payroll-review-setup/` exposes payroll runs, calculation attempts, reviews, exceptions, approvals, latest totals, review statuses, exception severities, and final-lock metadata.
- `/hr-admin/payroll-review` renders the browser workspace for review queue selection, exception register review, approval-trail inspection, final-lock status, and approved calculation-line evidence.
- `PayrollRunReview` stores the calculation under review, review profile reference, totals snapshot, exception summary snapshot, approval snapshot, actor timestamps, and config metadata.
- `PayrollRunException` stores blocker/warning/info severity, decision state, employee/source/calculation-line links, decision reason, and config snapshot.
- `PayrollRunApproval` stores approver decision state, approval profile reference, comment, decision timestamp, and config snapshot.
- Payroll reviews cannot be submitted while open blocker exceptions exist.
- Approved payroll reviews can final-lock the payroll run; locked runs retain final-lock actor/timestamp metadata and are immutable for close-critical fields.
- Statutory filing outputs, bank files, and accounting exports remain future phases.

Phase 3B implementation note:

- `/api/v1/hr-admin/payroll-output-setup/` exposes final-locked reviews, output batches, output artifacts, publish state, artifact counts, latest totals, output statuses, artifact kinds, and source-hash metadata.
- `/api/v1/hr-admin/payroll-reviews/<id>/generate-outputs/` generates an output batch from a final-locked review.
- `/api/v1/hr-admin/payroll-output-batches/<id>/publish/` publishes generated output artifacts and stamps publish actor/timestamp metadata.
- `/hr-admin/payroll-outputs` renders the browser workspace for output batch selection, artifact register review, payslip/register detail, output profile inspection, and finance handoff readiness.
- `PayrollOutputBatch` stores the output profile reference, review/run linkage, generated/published actor timestamps, totals snapshot, artifact summary snapshot, and config metadata.
- `PayrollOutputArtifact` stores payslip/register metadata, employee/source linkage, artifact key, template/config references, totals snapshot, line/register snapshot, source hash, and publish metadata.
- Generated payslip/register artifacts are JSON snapshots for the current foundation phase; durable file storage, downloads, and external delivery remain future phases.

Phase 3C implementation note:

- `/api/v1/hr-admin/payroll-finance-handoff-setup/` exposes published output batches, finance handoff packages, finance artifacts, handoff statuses, latest totals, and source-hash metadata.
- `/api/v1/hr-admin/payroll-output-batches/<id>/generate-finance-handoff/` generates a finance handoff from a published output batch.
- `/api/v1/hr-admin/payroll-finance-handoffs/<id>/transmit/` publishes finance artifacts and stamps transmission actor/timestamp metadata.
- `/hr-admin/payroll-handoff` renders the browser workspace for handoff package selection, bank advice/accounting/statutory artifact review, profile inspection, transmission state, and source evidence.
- `PayrollFinanceHandoff` stores the output batch/review/run linkage, generated/transmitted/accepted actor timestamps, totals snapshot, handoff summary snapshot, and configurable profile references for finance, bank, accounting, and statutory packages.
- Bank advice, accounting export, and statutory summary artifacts are generated as `PayrollOutputArtifact` snapshots from published payslip artifacts.
- Finance handoff generation is gated on a published payroll output batch and does not mutate final-locked calculations or published output batch metadata.
- Durable file storage/downloads, real provider transmission, acknowledgement callbacks, settlement hardening, and broader locked output audit trails remain future phases.

Phase 4A implementation note:

- `/api/v1/hr-admin/payroll-adjustment-setup/` exposes payroll runs, input snapshots, one-time adjustment records, adjustment statuses, adjustment kinds, directions, and source-hash metadata.
- `/api/v1/hr-admin/payroll-adjustments/` creates one-time payroll adjustments for arrears, bonuses, incentives, reimbursements, loans, advances, deductions, corrections, and settlement preparation.
- `/api/v1/hr-admin/payroll-adjustments/<id>/submit/`, `/approve/`, `/reject/`, and `/apply/` move adjustments through controlled lifecycle states.
- `/hr-admin/payroll-adjustments` renders the browser workspace for run selection, one-time input review, profile inspection, approval state, applied state, and source evidence.
- `PayrollAdjustment` stores tenant/run/employee/source-snapshot linkage, configurable kind/direction/component metadata, effective/source periods, amount, profile refs, approval profile ref, source ref, reason, actor timestamps, source hash, and config snapshot.
- Pending adjustments are blocked after payroll review starts so close-critical inputs cannot drift under review or final lock.
- Applied and voided adjustment records are immutable.
- Applied adjustments are now consumed by draft calculation, including settlement-generated applied adjustment records.

Phase 4B implementation note:

- Draft payroll calculation consumes applied adjustments for the same tenant and payroll run after validating locked input snapshot linkage.
- `PayrollCalculationLine` distinguishes rule-backed and adjustment-backed lines through `line_source`, nullable `rule_version`, and optional `adjustment` linkage.
- Adjustment-backed calculation lines preserve component metadata, direction, amount, currency, source hash, adjustment profile refs, approval profile refs, source refs, trace snapshots, and config snapshots.
- Payroll calculation totals include adjustment-backed lines using the same configurable line-type total behavior as rule-backed lines.
- `/api/v1/hr-admin/payroll-calculation-setup/` exposes `line_source`, `line_source_label`, and `adjustment_id` so browser review can distinguish formula output from approved one-time inputs.
- `/hr-admin/payroll-calculations` renders adjustment-sourced calculation evidence alongside rule formulas, dependency traces, source details, and hashes.
- Durable file storage/downloads, real provider transmission, acknowledgement callbacks, and broader locked output audit trails remain future phases.

Phase 4C implementation note:

- `/api/v1/hr-admin/payroll-settlement-setup/` exposes payroll runs, input snapshots, full-and-final settlement packages, settlement lines, statuses, line kinds, directions, exit records, and source-hash metadata.
- `/api/v1/hr-admin/payroll-settlements/` creates settlement packages linked to payroll run, employee, optional lifecycle exit record, optional payroll input snapshot, profile refs, dates, source refs, totals snapshots, and config snapshots.
- `/api/v1/hr-admin/payroll-settlements/<id>/lines/` adds configurable settlement lines for salary proration, leave encashment, notice recovery, loan recovery, advance recovery, bonus, arrear, gratuity, statutory, and other components.
- `/api/v1/hr-admin/payroll-settlements/<id>/submit/`, `/approve/`, `/reject/`, and `/apply/` move settlements through the close-control lifecycle.
- Applying a settlement generates applied payroll adjustments per settlement line so draft calculation consumes full-and-final amounts through the same adjustment-sourced line path.
- `/hr-admin/payroll-settlements` renders the browser workspace for exit-sourced package review, final dues, recoveries, settlement lines, profile inspection, dependencies, and source hashes.
- Statutory/component validation catalogs are covered by Phase 4E; durable file storage/downloads, real provider transmission, acknowledgement callbacks, and broader locked output audit trails remain future phases.

---

## 3. Source Data By HRMS Module

| HRMS Source | Payroll Usage | Current Readiness | Needed Payroll Contract |
|---|---|---|---|
| Tenant | Payroll isolation, configuration ownership, legal entity grouping. | Tenant foundation exists. | Tenant id, active status, country/locale, default currency, enabled payroll packs. |
| Legal entity | Employer identity, statutory registration, payroll grouping, bank file grouping. | Organization masters exist. | Effective legal entity snapshot with registration metadata and address. |
| Branch/location | Work location, state-level compliance, PT/LWF applicability. | Organization masters exist. | Location/state snapshot for each employee in period. |
| Department/business unit/cost center | Accounting allocation, reports, approvals, analytics. | Organization masters and employee mappings exist. | Period allocation snapshot, including transfer effective dates. |
| Grade/designation/employment type | Salary structure eligibility, policy rules, reports. | Organization masters and employee mappings exist. | Employee classification snapshot. |
| Employee master | Payroll inclusion, proration, employee identity, status. | Strong pilot vertical exists. | Employee payroll profile snapshot. |
| Employee access/IAM | Payroll permissions and payslip visibility. | Workspace role model exists. | Payroll roles and salary-sensitive field permissions. |
| Leave | Paid leave, unpaid leave, LOP, leave encashment inputs. | Leave policy/runtime behavior exists. | Period leave summary by employee and leave type. |
| Attendance | Payable days, absences, late marks, overtime, regularization status. | Attendance runtime behavior exists. | Period attendance summary by employee. |
| Lifecycle | Joiner, transfer, probation confirmation, exit, rehire, F&F triggers. | Lifecycle vertical exists. | Period lifecycle event summary and proration triggers. |
| Documents | Bank/KYC readiness and compliance blockers. | Documents and generated letters exist. | Payroll readiness flags for bank, PAN/tax, ID, and required documents. |
| Workflow | Payroll input approval and exception trace. | Workflow templates, runtime, and trace exist. | Approval status and action trace for payroll-impacting inputs. |
| Notifications | Payslip and payroll communication readiness. | Notification foundation exists. | Notification events for payslip publish and payroll alerts. |
| Audit | Explainability and compliance review. | Audit and workflow trace exist. | Source audit references stored on payroll snapshots. |

---

## 4. Employee Payroll Profile Snapshot

Minimum snapshot fields:

- employee id
- employee code
- display name
- employment status
- joining date
- exit date
- probation/confirmation state
- rehire state where applicable
- legal entity
- branch
- location
- department
- business unit
- cost center
- designation
- grade
- employment type
- manager
- default currency
- bank readiness flag
- statutory profile readiness flag
- document readiness flag

Payroll inclusion rules should be configurable by pay group.

Examples:

- include active employees
- include joiners whose joining date falls inside the period
- include employees on notice
- include exited employees for final settlement
- exclude draft/preboarding employees unless configured

---

## 5. Organization Allocation Snapshot

Payroll needs period-aware organization allocation.

Minimum fields:

- legal entity id/code/name
- branch id/code/name
- location id/code/name/state/country
- department id/code/name
- business unit id/code/name
- cost center id/code/name/accounting code
- grade id/code/name
- designation id/code/name
- employment type id/code/name
- effective_from
- effective_to
- source movement/lifecycle record where applicable

Open contract gap:

- Employee movement history should produce period allocation slices when an employee transfers mid-period.

---

## 6. Leave Period Summary

Payroll should consume a summarized leave output.

Minimum fields by employee and period:

- paid leave days
- unpaid leave days
- LOP days
- leave without pay days by leave type
- approved leave days
- pending leave days
- rejected leave days
- cancelled leave days
- withdrawal adjustments
- encashment-eligible balance where configured
- source leave request ids
- approval status

Readiness rule:

- Payroll calculation should block or warn when payroll-impacting leave requests remain pending for the period.

Open contract gaps:

- Dedicated payroll leave summary API.
- Configurable mapping from leave type to paid/unpaid/LOP/payroll treatment.
- Encashment rules and payout timing.

---

## 7. Attendance Period Summary

Payroll should consume finalized attendance output.

Minimum fields by employee and period:

- calendar days
- working days
- weekly offs
- holidays
- payable days
- present days
- absent days
- half days
- late marks
- early exits
- overtime hours
- regularized days
- pending regularization count
- approved regularization count
- rejected regularization count
- LOP-equivalent days
- source attendance record ids
- source regularization ids

Readiness rule:

- Payroll calculation should block or warn when attendance is not finalized for the period.

Open contract gaps:

- Dedicated payroll attendance summary API.
- Attendance finalization/lock state by pay period.
- Overtime approval and payroll treatment mapping.

---

## 8. Lifecycle Payroll Impact Summary

Lifecycle events can affect payroll inclusion and proration.

Minimum fields:

- joiner events
- movement/transfer events
- probation confirmation events if salary structure depends on confirmation
- exit/resignation events
- rehire events
- effective date
- old and new organization allocation
- old and new manager
- old and new employment status
- source lifecycle record id
- workflow status

Payroll uses:

- joining proration
- exit proration
- full and final trigger
- cost center split
- legal entity split
- grade/designation salary eligibility

Open contract gaps:

- Period lifecycle impact summary API.
- Configurable payroll effect mapping for lifecycle event types.
- Full and final handoff contract.

---

## 9. Document And Compliance Readiness

Documents should not directly calculate payroll, but they can block payment or compliance output.

Minimum readiness flags:

- bank account verified
- PAN/tax id verified where applicable
- identity/KYC verified
- address proof verified where applicable
- required payroll documents complete
- expired critical documents
- pending re-upload requests

Open contract gaps:

- Dedicated payroll readiness report.
- Configurable document requirements by payroll pack, legal entity, and employee type.

---

## 10. Workflow And Audit Contract

Payroll-impacting source records must expose approval state.

Minimum fields:

- source module
- source record id
- workflow instance id
- current status
- pending approver
- final action
- final actor
- final action timestamp
- decision note
- timeline summary

Payroll should store:

- source workflow trace id
- source action log ids
- accepted exception id if payroll proceeds before final approval

Open contract gaps:

- Broader live-backend mutation coverage for approval/review actions.
- Payroll exception workflow for unresolved inputs.

---

## 11. Payroll Snapshot Readiness Checks

Before payroll calculation, each employee should get a readiness state:

| State | Meaning |
|---|---|
| Ready | All required source data is finalized and valid. |
| Warning | Payroll can proceed, but a non-blocking issue exists. |
| Blocked | Payroll cannot proceed until corrected or formally excepted. |
| Excepted | A blocker was accepted by an authorized user with reason and trace. |

Suggested validations:

- no salary assignment
- no pay group assignment
- multiple active pay group assignments
- missing bank readiness
- missing statutory profile
- missing legal entity or work location
- unresolved pending leave
- unresolved attendance regularization
- attendance period not finalized
- employee status inconsistent with period inclusion
- exit completed but final settlement not configured
- transfer during period without allocation split

---

## 12. APIs Or Services To Add Before Calculation

Recommended HRMS-facing payroll source APIs:

- Implemented Phase 0 aggregate: `GET /api/v1/hr-admin/payroll-readiness/`
- Future granular employee snapshot API: `GET /api/v1/payroll-readiness/employees/`
- Future granular organization allocation API: `GET /api/v1/payroll-readiness/organization-allocations/`
- Future granular leave summary API: `GET /api/v1/payroll-readiness/leave-summary/`
- Future granular attendance summary API: `GET /api/v1/payroll-readiness/attendance-summary/`
- Future granular lifecycle events API: `GET /api/v1/payroll-readiness/lifecycle-events/`
- Future granular document readiness API: `GET /api/v1/payroll-readiness/document-readiness/`
- Future granular workflow traces API: `GET /api/v1/payroll-readiness/workflow-traces/`

Recommended payroll-owned APIs:

- `POST /api/v1/payroll/runs/`
- `POST /api/v1/payroll/runs/{id}/collect-inputs/`
- `POST /api/v1/payroll/runs/{id}/validate/`
- `POST /api/v1/payroll/runs/{id}/calculate/`
- `POST /api/v1/payroll/runs/{id}/submit-for-approval/`
- `POST /api/v1/payroll/runs/{id}/approve/`
- `POST /api/v1/payroll/runs/{id}/lock/`
- `POST /api/v1/payroll/runs/{id}/publish-payslips/`

---

## 13. Testing Contract

Backend tests should prove:

- tenant isolation on payroll source reads
- employee inclusion/exclusion by period
- joiner and exiter proration source data
- leave unpaid/LOP summary
- attendance payable-day summary
- pending approval blocker behavior
- missing bank/KYC readiness warnings
- transfer/cost-center allocation split
- source snapshot immutability after payroll run collection

Browser tests should prove:

- HR/payroll admin can review payroll readiness blockers
- filters expose blocked/warning/ready employees
- drill-down opens source HRMS records
- live-backend source summaries reflect approved workflow mutations

Visual tests should protect:

- payroll readiness dashboard
- employee payroll source review
- run validation blocker table
- calculation trace view when implemented

---

## 14. First Implementation Slice

Do this before payroll calculations:

1. Add payroll-readiness source serializers/services.
2. Add employee payroll profile summary.
3. Add leave period summary.
4. Add attendance period summary.
5. Add lifecycle impact summary.
6. Add document readiness summary.
7. Add readiness blocker/warning classifier.
8. Add backend contract tests.
9. Add HR admin payroll-readiness report screen.
10. Add Playwright route and filter coverage.

Only after this slice should calculation engine implementation begin.
