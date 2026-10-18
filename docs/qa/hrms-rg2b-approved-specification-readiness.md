# HRMS/Payroll RG-2B Approved-Specification Readiness

Date: 2026-10-18  
Decision: **CONDITIONAL**  
Task type: Policy analysis and decision preparation  
Application code, migrations, financial records, and test statuses changed: **No**

## Frozen Outcome

| Gate | Priority | Current status | Policy readiness | Technical readiness | Required next decision/evidence |
|---|---:|---|---|---|---|
| `DDG-F-001` | P0 | Blocked overall / technical partial | Not approved | Configured immutable settlement lines and maker/checker exist | Approve complete FnF component, eligibility, tax, rounding, payment and finance policy |
| `DDG-F-005` | P1 | Partial | Not approved beyond tested mode | Existing configured proration path exists | Approve joiner/leaver denominator, boundaries, calendar treatment and rounding matrix |
| `DDG-F-006` | P0 | Blocked | Not approved | Append-only leave corrections exist; action safely blocked | Approve restore, re-expire, forfeiture or controlled-correction behavior |
| `DDG-F-010` | P0 | Partial | Synthetic PF/TDS fixtures only; not legal approval | Effective-dated statutory packs, components, slabs and profiles exist | Qualified legal/tax review of every enabled jurisdiction/component/version |
| `DDG-F-011` | P0 | Partial | Automatic delta/reversal policy absent | Explicit immutable adjustments, maker/checker and duplicate guards exist | Approve look-back, delta, reversal, supplementary run, tax and finance treatment |
| `DDG-F-012` | P0 | Partial | Provider/payment-state contract absent | Signed callbacks, retry, replay defense and finance handoff exist | Approve employee payment ledger, partial acceptance, outstanding and reissue semantics |
| `DDG-F-030` | P1 | Partial | Full precedence matrix absent | Several effective-dated classes and overlap guards exist | Approve scope precedence and identify every measured overlap key |
| `STG-005` | P0 | Blocked externally | Provider contract/sandbox unavailable | Local synthetic provider controls exist | Supply approved sandbox, schemas, secrets and real signed failure/recovery evidence |

Totals remain **0 Verified, 5 Partial, 3 Blocked, 0 Not Started**. The release-gate tracker was reviewed but not changed because RG-2B produced no approved decision or new executed certification evidence.

## Required Decision Packets

### Packet A: Statutory Scope And Effective-Dated Rulebook

Gates: `DDG-F-010`, `DDG-F-030`; dependencies for `DDG-F-005`, `DDG-F-011`, and `DDG-F-001`.

Decision owners:

- accountable: Payroll Compliance Lead;
- required approvers: qualified Tax Reviewer, Legal/Employment Counsel, Finance Controller;
- consulted: Payroll Product Owner, legal-entity payroll owner, Payroll Architecture;
- release acceptance: Independent QA/Certification Lead.

Required inputs:

1. Launch jurisdictions, legal entities, registrations, employee populations, payroll frequencies, currencies, and effective dates.
2. Authoritative current legal/regulatory sources for every enabled component.
3. Signed tables for applicability, wage bases, thresholds, ceilings, exemptions, rates, employer/employee ownership, frequency, rounding, annualization, declarations and corrections.
4. Configuration precedence and cutover behavior by earning, payment, tax and accounting date.
5. Filing/challan/reporting and amended-return treatment.

No rate or threshold in a fixture, default reference, test, or prior local report is an approved legal specification. A qualified reviewer must validate the final version against authoritative sources current for the stated effective date.

Acceptance examples after approval:

- one below-threshold, exact-threshold, and above-threshold employee per component;
- state/jurisdiction applicability and exemption boundaries;
- mid-period joiner, exit, salary revision and changed eligibility;
- March earnings paid in April with separate earning/payment/statutory/accounting dates;
- annual reconciliation and declaration-cap boundaries where applicable;
- employee contribution, employer liability, net pay, filing total and finance total reconcile independently.

### Packet B: Joiner/Leaver And Leave-Settlement Policy

Gates: `DDG-F-005`, `DDG-F-006`; dependency for `DDG-F-001`.

Decision owners: HR Policy Lead, Payroll Operations, Legal/Employment Counsel, Finance Controller for monetary rounding.

Required inputs:

1. Approved proration denominator and date inclusion matrix by salary component and leave policy.
2. Weekend, holiday, paid/unpaid leave, partial-day and work-schedule treatment.
3. Precision, rounding and minimum/maximum entitlement treatment.
4. Post-expiry cancellation policy, approval authority and closed-payroll correction behavior.
5. Explicit exclusions for transfer, rehire or employee classes whose policies remain unresolved.

Acceptance examples after approval:

- join/exit on first, middle, last, weekend and holiday dates;
- leap-year and short-month boundaries;
- salary revision and leave-policy change during the same period;
- cancellation before expiry, at expiry boundary and after expiry/leave close;
- append-only movement arithmetic and payroll reconciliation with no recreated expired entitlement.

### Packet C: Arrears And Retroactive Correction Policy

Gate: `DDG-F-011`; depends on approved statutory and proration packets.

Decision owners: Payroll Operations, Finance Controller, Tax/Statutory Compliance, Internal Audit.

Required inputs:

1. Qualifying source events and permitted look-back horizon.
2. Recalculation versus explicit adjustment policy.
3. Per-period versus aggregated lines and ordering of multiple revisions.
4. Positive/negative recovery, insufficient-net and carry-forward rules.
5. Regular versus supplementary run, payslip disclosure, tax period, revised filing and finance reversal treatment.
6. Source fingerprint, maker/checker, reversal and duplicate-request rules.

Acceptance examples after approval:

- one- and multi-period salary revisions;
- attendance and leave correction after payroll close;
- positive and negative deltas, insufficient net and subsequent recovery;
- duplicate generation, concurrent approval/rejection and retry;
- exact source-period delta, current-run line, tax impact, employee net, finance journal and unchanged original payslip.

### Packet D: FnF Source-To-Payment-To-Finance Policy

Gate: `DDG-F-001`; consumes Packets A-C where applicable.

Decision owners: HR Policy, Payroll Operations, Finance Controller, Tax/Compliance, Legal, Treasury.

Required inputs:

1. Exit reason/population and service-date rules.
2. Approved component and eligibility matrix.
3. Leave encashment source-lot identity, cap, valuation and rounding.
4. Gratuity, notice, bonus, loan/advance, reimbursement, tax and negative-net treatment.
5. Settlement run, approval, payment, accounting, correction, dispute and audit workflow.

Acceptance examples after approval:

- ordinary resignation, termination and other explicitly supported exits;
- eligible/ineligible boundary dates and service duration;
- positive, zero and negative settlement;
- leave encashment cap/rounding and source-ledger reconciliation;
- one settlement ID through payroll lines, final payslip, employee payment instruction, provider outcome and finance entry;
- duplicate submission/callback and failed payment/reissue with no duplicated amount.

### Packet E: Employee Payment And Provider Contract

Gates: `DDG-F-012`, `STG-005`.

Decision owners: Finance/Treasury, Payment Integration Owner, Provider Relationship Owner, Security, Accounting, SRE, Privacy/Legal.

Required inputs:

1. Provider sandbox and immutable contract/schema version.
2. Employee/batch identifiers, idempotency, callback signatures, timestamps, replay and ordering.
3. Canonical states and the exact event authorizing `Paid`.
4. Partial acceptance, rejection, reversal, outstanding balance, reissue and duplicate prevention.
5. Retry/backoff, polling, reconciliation SLA, dead-letter and escalation.
6. Protected artifacts, secrets, key rotation, network allow-listing, logs and data retention.

Acceptance examples after approval:

- all accepted, all rejected and mixed employee-line response;
- timeout before response, response lost after commit, duplicate callback, late callback and out-of-order callback;
- provider outage and worker restart;
- rejected amount reissued under a new attempt while preserving original lineage;
- employee instruction totals equal payroll payable, provider accepted plus rejected/outstanding totals, and finance postings;
- no real money, filing or employee email during sandbox certification.

## Decision Alternatives And Trade-Offs

| Subject | Option | Trade-off | Required control |
|---|---|---|---|
| Proration | Calendar days | Simple and predictable; may differ from work-schedule policy | Explicit component applicability and boundary examples |
| Proration | Working days | Aligns to schedule; depends on historical roster/holiday resolution | Frozen business-date schedule and denominator evidence |
| Arrears | Explicit authorized adjustment | Safest initial scope; more operational input | Maker/checker, source identity and independent amount review |
| Arrears | Automatic source-period delta | Better scale; highest temporal/statutory complexity | Versioned source oracle, idempotency and supplementary-run policy |
| FnF | Dedicated supplementary run | Clear isolation and audit | Connected settlement/payment/finance identity |
| FnF | Regular payroll inclusion | Fewer operational runs | Component visibility and exit cut-off controls |
| Expired leave cancellation | Manual correction review | Safest while rare; operational delay | Append-only correction and documented outcome |
| Expired leave cancellation | Approved automatic compensating treatment | Faster and consistent | Explicit lot/expiry/payroll rules and concurrency tests |
| Payment status | Provider acceptance | Faster status; may precede settlement | Must not be called Paid unless policy explicitly accepts that risk |
| Payment status | Settled/reconciled confirmation | Stronger financial evidence; slower | Polling/callback recovery and operational SLA |

The table offers legitimate design choices, not recommendations or approvals.

## Safe Interim Launch Behavior

| Gate | Required fail-closed behavior until approval |
|---|---|
| `DDG-F-001` | Disable automatic FnF, leave encashment, gratuity and real settlement payment |
| `DDG-F-005` | Permit only the previously configured/tested proration mode and explicitly supported populations |
| `DDG-F-006` | Block post-expiry cancellation and route to authorized manual review |
| `DDG-F-010` | Do not activate unapproved statutory packs/components; no statutory filing or real-payroll claim |
| `DDG-F-011` | Disable automatic arrears; permit only explicit approved adjustments under maker/checker |
| `DDG-F-012` | Artifact generation only; no payment initiation and no Paid state |
| `DDG-F-030` | Payroll readiness blocks ambiguous or overlapping configuration resolution |
| `STG-005` | Keep provider connections sandbox/draft with live delivery disabled |

These exclusions are acceptable only for synthetic/shadow use. Applicable statutory calculations and employee payment integrity cannot be waived for real payroll.

## Approval-To-Implementation Handoff

After approval, each packet must produce:

1. A signed, versioned specification and authoritative source record.
2. A machine-readable effective-dated configuration proposal reviewed independently from the implementation team.
3. Normal, threshold, boundary, historical, correction and negative calculation examples.
4. A migration/data-impact assessment that does not reinterpret finalized history.
5. Browser/API/PostgreSQL/Celery/provider test mapping with exact expected values.
6. Feature activation and rollback plan; absence or expiry of policy must fail closed.

Required certification evidence then includes:

- browser maker/checker actions and truthful pending/failure feedback;
- API authorization, idempotency and canonical responses;
- PostgreSQL tenant scope, overlap constraints, immutable history and concurrency;
- independent gross-to-net, employer-liability, settlement, payment and finance reconciliation;
- Celery retry/recovery where processing is asynchronous;
- real provider sandbox logs for `STG-005` and `DDG-F-012`.

## Tracker Decision

The execution tracker was not changed. RG-2B found no signed business decision, approved statutory source pack, qualified-review record, provider contract, or new executed certification evidence. Promoting any gate would therefore violate the frozen evidence rules.

## RG-2B Decision

RG-2B is **CONDITIONAL** as a decision-preparation phase: the eight gates now have explicit decision owners, scope, options, acceptance examples, and safe interim behavior. Policy readiness remains incomplete, provider staging evidence remains unavailable, and real-payroll production readiness remains **NO-GO**.

RG-2B stops here. No application code, migration, financial configuration, release-gate status, or customer data was changed.
