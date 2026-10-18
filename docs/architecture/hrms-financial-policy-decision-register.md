# HRMS/Payroll Financial Policy Decision Register

Date: 2026-10-18  
Phase: RG-2B  
Status: Decision package; no policy is approved by this document  
Production readiness: **NO-GO**

## Purpose And Governance

This register converts the eight frozen RG-2 release gates into decisions that accountable business, payroll, finance, tax, legal, security, and integration owners can approve. It does not define statutory rates, create defaults, or authorize financial processing.

An approval is valid only when it records:

- gate and policy version;
- country, state or other jurisdiction;
- tenant and legal-entity applicability;
- included and excluded employee populations;
- effective-from and, where known, effective-to dates;
- source authority, source publication date, reviewer, and review date;
- formula inputs, thresholds, ceilings, exemptions, rounding, frequency, and ownership;
- historical, correction, reversal, and transition treatment;
- maker, checker, legal/tax reviewer, and release approver;
- acceptance examples with independently calculated expected values.

Draft or expired decisions must remain inactive. A new effective-dated version must not rewrite payroll, payslips, settlements, leave ledgers, payment records, or finance entries already finalized under an earlier version.

## Existing Policy-Neutral Foundation

| Capability | Current implementation | What it does not prove |
|---|---|---|
| Effective-dated statutory configuration | `PayrollStatutoryPack`, `PayrollStatutoryComponent`, `PayrollStatutorySlab`, `EmployeeStatutoryProfile` | That any configured rate, threshold, applicability rule, or formula is legally correct |
| Salary and payroll dating | Effective-dated salary assignments, payroll periods, input snapshots, accounting-period links | Approved joiner/leaver, retro, tax-year, or cross-period policy |
| Adjustments | `PayrollAdjustment`, immutable source identity, maker/checker, row locking, PostgreSQL guard | Automatic delta, reversal, supplementary-run, payslip, tax, or finance treatment |
| FnF settlement | `PayrollSettlement` and `PayrollSettlementLine`, maker/checker, immutable applied records | Automatic gratuity, leave encashment, recovery, tax, payment, or accounting derivation |
| Leave history | Append-only leave ledger and entitlement lots | Approved post-expiry cancellation or encashment valuation treatment |
| Provider integration | Connections, mapping packs, signed callback validation, delivery/retry/job records and finance handoff | Contract-specific employee payment states or real sandbox behavior |
| Audit and authorization | Tenant scope, RBAC, transition auditing, immutable finalized payroll protections | Legal approval of the configured business content |

## Frozen Gate Decisions

### DDG-F-001: Full And Final Settlement

**Scope requiring approval**

- Jurisdiction: each country/state in which FnF is offered; current configurable payroll foundation defaults to India (`IN`/`INR`) but is not an approved India policy.
- Entity scope: tenant and legal entity, including employing entity and finance ledger.
- Population: resignation, termination, retirement, death, contract completion, and other approved exit reasons; explicitly state exclusions.
- Effective date: exit event, last working day, payroll earning date, payment date, tax period, and accounting posting date must be separately defined.
- Historical implication: corrections must create compensating settlement/payment/finance records and must not rewrite an applied settlement or finalized payroll.

**Decisions required**

1. Component matrix: unpaid salary, notice pay/recovery, leave encashment, gratuity, bonus/incentive, loan/advance recovery, reimbursements, statutory deductions, tax, and any jurisdiction-specific component.
2. Eligibility and service-date definitions for every component.
3. Wage base, proration denominator, partial-day treatment, currency precision, component rounding, and final-net rounding.
4. Treatment of negative settlement, employee recovery, waiver, dispute, hold, death/nominee, and unclaimed amount.
5. Whether settlement is included in regular payroll, a supplementary run, or a separately posted settlement while preserving one settlement identity.
6. Required approvals, payment authorization, accounting mapping, statutory reporting, correction and reversal process.

**Legitimate configurable options**

- Regular payroll versus dedicated supplementary settlement run. A regular run is operationally simpler; a supplementary run isolates settlement and correction history.
- Component-level rounding versus final-total rounding. Either requires a signed expected-value matrix and consistent statutory treatment.
- Negative net blocked pending recovery agreement versus approved receivable workflow. Silent clipping to zero is not acceptable.

**Owners:** HR policy, Payroll Operations, Finance Controller, Tax/Payroll Compliance, Legal/Employment Counsel, Security for access, Release Authority.

**Safe interim behavior:** automatic FnF, encashment, gratuity, payment, and finance posting remain disabled. Manually configured synthetic settlement lines may be used only in shadow certification with maker/checker and no real payment.

### DDG-F-005: Joiner/Leaver Leave And Payroll Proration

**Scope requiring approval**

- Jurisdiction/entity: by legal entity and payroll/leave policy; do not assume one denominator across entities.
- Population: mid-period joiners, leavers, unpaid absence, part-time employees, transfers, and employees changing work schedules.
- Effective dates: joining date, service commencement, last working day, exit completion, leave-policy assignment, earning period, and payment period.
- Historical implication: a later policy version applies prospectively unless an authorized adjustment policy explicitly directs a correction.

**Decisions required**

1. Calendar-day, working-day, fixed-day, or other approved denominator by component and policy.
2. Inclusive/exclusive treatment of joining and last-working dates, weekends, holidays, paid leave, unpaid leave, and partial days.
3. Accrual frequency, eligibility cutoffs, minimum service, anniversary versus fixed leave year, and join/exit proration.
4. Precision and rounding stage for entitlement units, payable days, salary components, deductions, and final totals.
5. Interaction with salary revision, attendance close, leave close, and payroll input locking.

**Options:** calendar-day and working-day methods are both technically expressible but produce different outcomes. The approved method must be explicit per salary/leave component; mixed methods require separate oracle rows.

**Owners:** HR Policy, Payroll Operations, Finance Controller for monetary rounding, Legal/Compliance where mandated.

**Safe interim behavior:** only the already configured and tested proration mode may be enabled. Unsupported modes and populations remain blocked rather than inferred.

### DDG-F-006: Post-Expiry Leave Cancellation

**Scope requiring approval**

- Jurisdiction/entity: tenant/legal-entity leave policy and any legal entitlement requirement.
- Population: requests cancelled after the consumed entitlement lot expired, after leave-year close, after payroll close, or after exit.
- Effective dates: leave date, approval date, cancellation date, entitlement expiry, leave-year close, and payroll close.
- Historical implication: the original usage and expiry movements remain immutable; resolution requires compensating ledger entries.

**Decisions required**

1. Restore to a controlled correction lot, restore then immediately expire, forfeit with explicit audit reason, or require manual review.
2. Whether restored value inherits original expiry, receives a new approved expiry, or is non-consumable pending review.
3. Attendance and payroll correction rules where the leave affected closed periods.
4. Approval authority and employee notification/dispute treatment.

**Options:** manual correction is safest before policy approval; automatic restore is operationally easier but can recreate expired entitlement; immediate re-expiry preserves expiry semantics but may require a compensating payroll correction.

**Owners:** HR/Leave Policy, Legal/Employment Counsel, Payroll Operations where pay was affected, Internal Controls.

**Safe interim behavior:** cancellation remains fail-closed with an actionable manual-review message. No expired entitlement is recreated.

### DDG-F-010: Effective-Dated Statutory Payroll

**Scope requiring approval**

- Jurisdiction: every enabled country, state, establishment, registration, and employee category. The repository supports India-oriented identifiers, but no value is approved merely because a default reference exists.
- Entity scope: legal entity, establishment/registration, state, and statutory account.
- Population: applicability by employee category, wages, age/other lawful attributes, location, registration, exemption, and approved declaration status.
- Effective dates: earning date, payment date, tax/statutory period, fiscal year, rule publication/effective date, and transition date.
- Historical implication: rule versions are immutable for finalized payroll; corrections use approved adjustments and filings.

**Specifications requiring authoritative qualified review**

- Income-tax/TDS regime, taxable wage base, projections, declarations, exemptions, cess/surcharge/rebate, annual reconciliation, joiner/previous-employer data, and rounding.
- Provident Fund applicability, wage definition, ceilings, employee/employer split, voluntary contributions, exclusions, and rounding.
- ESI applicability, contribution periods, wage ceiling behavior, employee/employer rates, and rounding.
- Professional Tax and Labour Welfare Fund by applicable state, schedule, frequency, thresholds, exemptions, and registration.
- Bonus and gratuity eligibility, wage base, ceilings, service rules, payment timing, taxation, and rounding where offered.
- Filing/challan/reporting schemas and amendment treatment.

Each specification must be verified by a qualified payroll compliance/legal/tax reviewer against the authoritative regulator or legislation current for its stated effective period. RG-2B deliberately records no rates or thresholds.

**Owners:** Payroll Compliance, Tax Counsel/Qualified Tax Reviewer, Legal, Finance Controller, Product Owner for enabled scope, Release Authority.

**Safe interim behavior:** unapproved jurisdiction/component combinations cannot be activated. Synthetic PF/TDS examples remain test fixtures, not production policy. No statutory filing or real-payroll claim is permitted.

### DDG-F-011: Arrears, Retroactive Corrections, And Reversals

**Scope requiring approval**

- Jurisdiction/entity: legal entity, payroll group, statutory regime, and accounting ledger.
- Population/events: salary revisions, attendance/leave corrections, missed earnings/deductions, prior-period statutory corrections, and exits.
- Effective dates: source earning period, discovery/approval date, adjustment run, payment date, tax/statutory period, and accounting date.
- Historical implication: original finalized payroll and payslip remain unchanged; adjustment lineage points to the source period and event.

**Decisions required**

1. Delta calculation basis: recompute approved source inputs versus explicit authorized amount.
2. Number of look-back periods, treatment of multiple revisions, and aggregation versus per-period lines.
3. Positive/negative arrears, recovery limits, insufficient-net handling, and carry-forward.
4. Regular next run versus supplementary run.
5. Tax/statutory recognition period, revised filing/challan requirements, employer-liability corrections, and finance reversal/journal strategy.
6. Payslip disclosure, employee communication, maker/checker authority, dispute and correction process.
7. Source fingerprint and duplicate/reversal identity.

**Options:** explicit adjustment-only is safer and already supported; automatic source-period recomputation is more complete but requires approved temporal formulas and extensive oracle coverage. Net reversal and compensating lines are preferred over mutating history.

**Owners:** Payroll Operations, Finance Controller, Tax/Statutory Compliance, HR Policy for source changes, Internal Audit.

**Safe interim behavior:** automatic retro generation remains disabled. Authorized explicit adjustments retain maker/checker, immutable source identity, and locked-history controls.

### DDG-F-012: Employee Payment Reconciliation

**Scope requiring approval**

- Jurisdiction/entity: paying legal entity, bank/payment rail, currency, account, and finance ledger.
- Population: each employee/payment beneficiary, including invalid bank details, rejected instructions, partial batch acceptance, reissue, reversal, and unclaimed amounts.
- Effective dates: instruction creation, authorization, value date, provider acceptance, settlement, rejection, reversal, and accounting posting.
- Historical implication: every attempt is append-only and linked to employee, payroll result, settlement if applicable, batch, provider reference, and finance entry.

**Provider contract decisions required**

1. Canonical provider statuses and which signed events constitute accepted, processing, settled, rejected, reversed, or unknown.
2. Employee-level versus batch-level identifiers; idempotency key; callback ordering, replay window, signature/key rotation, and polling fallback.
3. Partial acceptance semantics, outstanding balance formula, reissue identity, duplicate-payment prevention, and manual reconciliation.
4. Whether Paid is based on provider settlement, bank confirmation, finance reconciliation, or another approved event.
5. Retryable/non-retryable errors, bounded retries, reconciliation SLA, and operational escalation.
6. Accounting treatment for accepted, rejected, outstanding, reversed, and reissued amounts.

**Owners:** Finance/Treasury, Payments Integration Owner, Security/Cryptography, Payroll Operations, Accounting, Provider Relationship Owner.

**Safe interim behavior:** generate protected artifacts only; do not initiate payment or mark employees Paid. Synthetic callbacks may certify technical controls but not provider behavior.

### DDG-F-030: Temporal Payroll Configuration Precedence

**Scope requiring approval**

- Configuration classes: salary assignments, pay groups/calendars, statutory packs/components/slabs/profiles, salary structures/rules, finance mappings, and provider mappings.
- Scope hierarchy: platform/global references where legitimate, tenant defaults, legal-entity override, pay-group/employee override, and jurisdiction-specific configuration.
- Effective dates: business/earning date, payment date, tax date, accounting date, and configuration activation date.
- Historical implication: snapshots retain the selected version and precedence path; later edits cannot alter finalized results.

**Decisions required**

1. Exact precedence order and tie-breaking for each configuration class.
2. Whether gaps are blocking or inherit from an approved parent scope.
3. Which overlapping versions are always invalid and which represent distinct scope keys.
4. Cutover semantics for periods spanning an effective date.
5. Backdating permissions, review, and impact preview requirements.

**Owners:** Payroll Architecture, Payroll Operations, Tax/Compliance for statutory precedence, Finance Architecture for mappings, Security for authorization.

**Safe interim behavior:** enable only configuration classes with tested deterministic resolution and overlap guards. Ambiguous resolution blocks payroll readiness.

### STG-005: External Provider And Delivery Contract

**Scope requiring approval**

- Providers: bank/payment, accounting/finance, statutory filing, and email/document delivery actually selected for staging.
- Entity/population: provider account and credential per legal entity/tenant; synthetic recipients and beneficiaries only during certification.
- Effective dates: contract version, credential/key validity, callback schema version, retry policy, and provider maintenance windows.
- Historical implication: provider events, payload hashes, responses, callbacks, retries, and reconciliation outcomes remain auditable.

**Decisions and external inputs required**

1. Approved sandbox endpoint, schema, credentials/secrets, IP/network requirements, certificate/key rotation, and data-handling agreement.
2. Signed callback algorithm and canonicalization, event ID, timestamp tolerance, replay rules, and out-of-order behavior.
3. Rate limits, retry/backoff contract, idempotency guarantees, timeout, status polling, and incident escalation.
4. Sandbox evidence for partial success, rejection, duplicate event, late event, outage, recovery, and reconciliation.
5. Explicit assurance that sandbox actions cannot send real money, statutory filings, or employee email.

**Owners:** Integration Owner, Provider Relationship Owner, Finance/Treasury, Security, Privacy/Legal, SRE/Operations.

**Safe interim behavior:** provider connections stay draft/sandbox and live delivery disabled. No real transaction or delivery is initiated.

## Cross-Gate Approval Rules

1. **Rounding:** specify decimal precision, rounding mode, rounding stage, aggregation order, and treatment of residual cents/paise for every monetary or entitlement calculation.
2. **Thresholds and ceilings:** identify the measured wage/value, inclusions/exclusions, period, effective dates, and exact boundary behavior.
3. **Salary revision:** define source effective date, proration, downstream statutory basis, prior-period delta, payslip disclosure, and finance treatment.
4. **Partial payments:** define instruction allocation, accepted/rejected amount, outstanding balance, reissue lineage, duplicate prevention, and Paid-state criterion.
5. **Reversals and corrections:** use compensating records with source identity; never rewrite finalized payroll, leave, payment, or finance history.
6. **Maker/checker:** maker and checker must be distinct authenticated actors; higher-risk release/payment steps may require an additional finance approver if approved.
7. **Unknown policy:** fail closed. Missing configuration is a readiness exception, not a zero value or silent fallback.

## Approval Record Template

| Field | Required value |
|---|---|
| Decision ID | Stable identifier linked to one or more frozen gate IDs |
| Status | Draft / Under review / Approved / Rejected / Superseded |
| Jurisdiction and authority | Country/state/registration plus authoritative citation |
| Tenant/legal-entity scope | Exact applicable entities and precedence |
| Employee population | Included and excluded categories |
| Effective period | Effective-from, effective-to, transition rule |
| Formula/policy | Inputs, ordering, thresholds, ceilings, exemptions, frequency |
| Rounding | Precision, mode, stage, residual treatment |
| Historical treatment | Correction, reversal, filing, payslip and finance handling |
| Safe exclusion | Required behavior when decision/configuration is absent |
| Independent examples | Boundary and normal examples with expected outputs |
| Owners | Author, payroll reviewer, finance reviewer, legal/tax reviewer, release approver |
| Evidence | Signed approval record and source-document hash/location |

## Decision Status At RG-2B Close

No new approved policy, statutory specification, provider contract, or external sandbox evidence was found. All eight frozen gate outcomes therefore remain unchanged. This register is decision-ready but is not itself an approval.
