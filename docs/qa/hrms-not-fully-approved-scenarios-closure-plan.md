# HRMS/Payroll Not-Fully-Approved Scenario Closure Plan

Date: 2026-10-18

Purpose: convert the remaining Partial and Blocked release gates into an executable approval, engineering and staging program without changing frozen test results or inventing policy.

Current release position:

- Frozen release gates: **40**
- Verified: **4**
- Partial: **15**
- Blocked/External/Confirmed: **21**
- Synthetic staging: **CONDITIONAL GO after staging entry controls pass**
- Real-payroll pilot: **NO-GO**
- Unrestricted production: **NO-GO**

The source of truth remains `docs/qa/hrms-release-gate-execution-tracker.csv`. This document does not change a gate status.

## Planning principles

1. Separate policy decisions from implementation. Engineering must not choose statutory rates, leave/FnF rules, transfer behavior, payment states, retention periods or approval authority.
2. Keep unsupported features technically disabled and fail closed until approved and verified.
3. Close gates by shared root cause, not by creating one project per scenario.
4. Reuse existing DB-1 through DB-6, DD, frozen 963-case and performance evidence; execute only the missing acceptance assertions.
5. Require browser initiation for supported user-facing operations, with independent API/PostgreSQL/Celery/storage verification.
6. Use synthetic tenants only until real-data gates are signed off.
7. A Partial or Blocked gate becomes Verified only when all acceptance criteria have executed evidence and the responsible owner signs the result.

## Workstream summary

| Workstream | Gate IDs | Primary outcome | Execution location |
|---|---|---|---|
| W1 Staging security and recovery | `DDG-F-004`, `DDG-F-024`, `DDG-F-027`, `DDG-F-028`, `DDG-F-032`, `STG-001`–`STG-004`, `STG-006`, `STG-007` | Secure deployed synthetic environment with recovery and protected storage | Tier A plus Tier B recovery window |
| W2 Payroll, statutory, payment and FnF | `DDG-F-001`, `DDG-F-005`, `DDG-F-006`, `DDG-F-010`–`DDG-F-012`, `STG-005` | Approved calculation/payment policies and reconciled sandbox behavior | Policy review, local implementation, Tier A/provider sandbox |
| W3 Employment and organization history | `DDG-F-002`, `DDG-F-003`, `DDG-F-017`–`DDG-F-019`, `DDG-F-025`, `DDG-F-029` | Approved effective-dated lifecycle semantics and historical reporting | Policy review and local browser/PostgreSQL certification |
| W4 Workflow authority and overtime | `DDG-F-008`, `DDG-F-013`–`DDG-F-016` | Explicit approval/delegation/escalation/overtime authority | Policy review and local browser/PostgreSQL/Celery certification |
| W5 Imports, reports and onboarding | `DDG-F-009`, `DDG-F-020`, `DDG-F-021`, `DDG-F-023`, `DDG-F-026` | Reliable enabled imports/reports and durable external onboarding | Local engineering plus Tier A/Tier B interruption tests |
| W6 Capacity and archival operations | `DDG-F-031`, `STG-008` and the external evidence portions of `DDG-F-028`, `DDG-F-032` | Valid capacity limit, restore and archival evidence | Temporary isolated Tier B |

The four already verified gates remain unchanged: `DDG-F-007`, `DDG-F-022`, `DDG-F-027` locally, and `DDG-F-030`. Deployed dependencies for `DDG-F-027` remain covered by `STG-001` and `STG-006` rather than reopening its local result.

## Phase 0 - Scope and approval freeze

**Objective:** determine exactly which capabilities will be enabled for the first real-payroll cohort.

Required signed inputs:

- Launch jurisdictions, legal entities and employee populations.
- Enabled salary, statutory, leave, attendance and payroll components.
- Explicit exclusions for transfer, rehire, overtime, FnF, retro pay, delegation, escalation, biometric ingestion and background imports.
- Approved RPO/RTO, retention, legal-hold, document-access and incident-response policies.
- Selected email, storage, malware-scanner and finance/payment sandbox providers.
- Maximum employee volume and concurrent-user target.
- Named HR, Payroll, Finance, Legal/Tax, Security, Infrastructure, SRE and Release owners.

Exit criteria:

1. One versioned enabled-feature and pilot-population manifest is signed.
2. Every excluded feature has a UI/API/configuration denial mechanism and an owner.
3. No draft policy is active in application configuration.
4. The selected staging budget and region are approved.

Until this phase completes, engineering may work only on policy-neutral infrastructure and evidence tooling.

## Phase 1 - Synthetic staging foundation

**Priority:** immediate; prerequisite for all external evidence.

Use the two-tier architecture in `docs/qa/hrms-cost-optimized-staging-plan.md`:

- Tier A for HTTPS, browser/API regression, email, protected storage and routine integration.
- Tier B only for recovery, rolling restart, managed broker/database interruption and capacity.

### Gate batch 1A - Network and deployment security

Gates: `STG-001`, `STG-006`, `STG-007`.

Implementation:

- Deploy signed, digest-pinned images through the existing staging validator.
- Configure TLS 1.2/1.3, redirects, HSTS, secure cookies, CSRF origins, trusted hosts and proxy-header trust.
- Configure central logs, metrics, error monitoring, payroll/job alerts and named responder routes.
- Rehearse candidate deployment, health checks, previous-digest rollback and migration compatibility.

Acceptance evidence:

- External TLS/security scan and real browser cookie/redirect tests.
- Bad host, origin and spoofed proxy denial.
- Alert generation for authentication denial, failed payroll job, stale worker and backup failure.
- Rolling/controlled deployment log with availability checks and successful rollback.

### Gate batch 1B - Data, broker and storage recovery

Gates: `STG-002`, `STG-003`, `STG-004`, `DDG-F-004`, `DDG-F-024`, infrastructure portions of `DDG-F-028` and `DDG-F-032`.

Implementation:

- Private encrypted PostgreSQL backups/PITR with an isolated restore target.
- Private TLS Redis/Valkey with persistence and isolated Celery queues.
- Private S3 storage with SSE-KMS, block-public-access, versioning, quarantine, scanner events, access logs and signed access.
- Keep irreversible erasure disabled.

Acceptance evidence:

- Timed restore against approved RPO/RTO, row/artifact counts and checksums.
- Broker interruption, duplicate delivery, stale-worker recovery and no duplicate payroll/import effect.
- Clean and malicious upload, quarantine, cross-tenant/direct-key denial, signed expiry/revocation and object restore.
- Legal hold prevents supported deletion; no retention period is inferred.

Exit criteria: `STG-001`–`STG-004`, `STG-006` and `STG-007` have deployed evidence or a precise external blocker. Synthetic Tier A may then host supervised testing.

## Phase 2 - Statutory and payroll policy closure

**Priority:** launch-critical P0. No real payroll may begin before applicable parts pass.

Use `docs/architecture/hrms-financial-policy-decision-register.md` as the approval template.

### Gate batch 2A - Applicable statutory pack

Gate: `DDG-F-010`.

Decision owners: Payroll Compliance, qualified Tax/Legal reviewer, Finance Controller and Release Authority.

Required specification per enabled component:

- Jurisdiction, legal entity, establishment and employee applicability.
- Effective dates and authoritative legal source.
- Wage base, inclusions/exclusions, thresholds, ceilings, exemptions and employer/employee split.
- Precision, rounding mode/stage, annual reconciliation and correction treatment.
- Filing/reporting output and approval ownership.

Engineering after approval:

- Load versioned configuration without hardcoded defaults.
- Add independent boundary-value oracles and effective-date tests.
- Block missing, expired or ambiguous packs at payroll readiness.
- Verify historical payroll continues using its captured version.

Exit evidence: independent calculations, browser payroll review, PostgreSQL selected-version proof, exact reconciliation and reviewer sign-off for every component applicable to the pilot population.

### Gate batch 2B - Proration, leave correction and arrears

Gates: `DDG-F-005`, `DDG-F-006`, `DDG-F-011`.

Decisions:

- Joiner/leaver denominator, inclusion dates, partial days and rounding.
- Post-expiry cancellation restoration, immediate expiry, forfeiture or manual correction.
- Retro delta source, look-back, supplementary/regular run, tax period, negative recovery and reversal treatment.

Engineering after approval:

- Preserve append-only leave/payroll history.
- Create compensating movements/adjustments with source fingerprints.
- Enforce distinct maker/checker and duplicate/reversal identity.
- Reject corrections affecting closed periods unless the approved correction workflow is used.

Exit evidence: boundary dates, duplicate retry, concurrent correction, immutable original payroll/payslip, ledger reconciliation and exact statutory consequences.

### Gate batch 2C - FnF and employee payments

Gates: `DDG-F-001`, `DDG-F-012`, `STG-005`.

Decisions:

- Approved FnF components, service dates, gratuity/encashment/recovery/tax, negative settlement and rounding.
- Provider payment states, employee instruction identity, partial acceptance, outstanding balance, reissue, reversal and Paid criterion.
- Callback signature, event identity, replay window, ordering, polling fallback and retry rules.

Engineering after approval:

- Preserve one settlement identity through approved components, payment and finance.
- Add employee-level append-only payment attempts and reconciliation.
- Prevent duplicate payment, posting, callback effect and premature Paid status.

Exit evidence: production-built browser maker/checker, independent monetary oracle, signed sandbox callbacks including duplicate/out-of-order/failure, Celery recovery and exact payment-to-finance reconciliation. No real payment is initiated during certification.

If policy approval is delayed, automatic FnF, post-expiry cancellation, automatic arrears and payment execution remain disabled. This does not block synthetic shadow payroll but blocks affected real-payroll populations.

## Phase 3 - Employment, organization and subscription policy closure

Gates: `DDG-F-002`, `DDG-F-003`, `DDG-F-017`, `DDG-F-018`, `DDG-F-019`, `DDG-F-025`, `DDG-F-029`.

Required decisions:

- Cross-legal-entity transfer: service, leave, payroll, statutory, manager and access continuity.
- Rehire: identity reuse, new employment spell, service continuity and historical access.
- Temporal organization masters: rename/reparent effective dates and as-of naming/allocation semantics.
- Archive-versus-assignment concurrency winner.
- Subscription downgrade treatment for active over-limit workflows.
- Deterministic historical classification rules or permanent reviewed exceptions.

Implementation sequence after approval:

1. Effective-dated master entities and precedence only where approved.
2. Atomic transfer/rehire service with preview, authorization and rollback.
3. As-of reports based on effective assignment and approved master naming semantics.
4. Archive/downgrade conflict handling under row locks.
5. Read-only classification preview before any governed backfill.

Required evidence:

- Browser create/change/preview/confirm and actionable denied paths.
- PostgreSQL exclusion/tenant constraints, overlap races and rollback.
- As-of report totals against independent queries.
- Historical payroll, leave, attendance, documents and manager records unchanged.
- Cross-tenant and unauthorized references rejected.

Safe interim treatment: reject cross-entity transfer and rehire, disable future master restructure and downgrade, restrict archive of referenced nodes, label reports as current-state only, and never guess legacy classifications.

## Phase 4 - Workflow authority and overtime policy closure

Gates: `DDG-F-008`, `DDG-F-013`, `DDG-F-014`, `DDG-F-015`, `DDG-F-016`.

Required decisions:

- Overtime eligibility, evidence, approval chain, rate, cap, rounding and payroll conversion.
- Parallel approval quorum and reject/withdraw behavior.
- Delegation scope, duration, conflicts, revocation and audit.
- Escalation SLA, fallback owner, duplicate prevention and notification.
- Pending request ownership after manager reassignment.

Implementation requirements after approval:

- Authority is evaluated server-side at decision time and by business date.
- Revocation/expiry immediately denies subsequent action.
- Approve/reject/quorum races serialize and remain idempotent.
- Only an approved overtime record can become an immutable payroll input.
- Existing pending requests follow the approved reassignment rule without history rewrite.

Evidence:

- Multi-actor browser workflows plus direct unauthorized API attempts.
- PostgreSQL concurrent approve/reject/revoke races.
- Celery duplicate escalation delivery and recovery.
- Leave/attendance/payroll downstream reconciliation and immutable audit.

Safe interim treatment: sequential workflows only; delegation, escalation, parallel completion and overtime-to-payroll conversion remain disabled; pending reassignment requires manual governed disposition.

## Phase 5 - Import, reporting and onboarding reliability

Gates: `DDG-F-009`, `DDG-F-020`, `DDG-F-021`, `DDG-F-023`, `DDG-F-026`.

### Batch 5A - Enabled import contract

1. Inventory only launch-enabled imports.
2. Approve atomic versus partial-row semantics for each module.
3. Define deterministic source file/event identity and normalized row fingerprints.
4. Add durable job/checkpoint processing only for imports that require background execution.
5. Preserve original file, row outcome, actor, tenant, retry and audit identity.

Evidence: interrupted upload, lost response, duplicate replay, worker crash, malformed row, cross-tenant mapping, retry, browser refresh and exact PostgreSQL counts. Unsupported biometric/background routes remain disabled.

### Batch 5B - Enabled report contract

For each enabled report certify:

- Tenant/legal-entity scope, filters, sort order, pagination and as-of date semantics.
- Browser row totals against independent PostgreSQL queries.
- Export manifest, complete row count, checksum and audit event.
- Protected artifact access, expiration and cross-tenant denial.
- Approved volume and memory/latency ceiling.

Do not repeat already-certified report families unless shared code changed.

### Batch 5C - External onboarding

Verify one tenant and one seed graph across provider failure, retry and lost response. Provider calls need deterministic idempotency and reconciliation before supervised onboarding becomes automatic.

Exit criteria: each enabled import/report/onboarding flow has its own evidence record; all other routes are explicitly disabled rather than implicitly unsupported.

## Phase 6 - Isolated capacity, failover and archive certification

Gates: `DDG-F-031`, `STG-008`, plus final external evidence for `DDG-F-028` and `DDG-F-032`.

Use temporary Tier B only after application and policy scope is frozen.

Execution:

1. Deploy exact signed release digests on production-comparable app, worker, PostgreSQL and Valkey resources.
2. Provision deterministic 100, 500, 1,000 and 2,500 employee synthetic volumes as applicable.
3. Capture `EXPLAIN ANALYZE`, `pg_stat_statements`, locks, connections, CPU, memory, queue depth and artifact volume.
4. Run 2/10-VU health checks, one 25-VU run and two uncontaminated 50-VU runs.
5. Preserve the fixed p95 below 1,500 ms and 5xx below 0.1% thresholds; stop on integrity/security failure.
6. Exercise database restore, broker failover, worker restart and rolling application replacement.
7. Reconcile retained archive, legal hold and restored database/object checksums under approved policy.

Exit criteria: maximum concurrency and employee volume are stated as measured limits. A failed 50-VU result retains the 25-VU cap and does not trigger speculative local tuning.

## Recommended execution order

| Order | Activity | Can run in parallel? | Launch effect |
|---:|---|---|---|
| 1 | Phase 0 scope and approvals | Yes, across policy-owner groups | Defines all subsequent work |
| 2 | Phase 1A TLS, deployment and observability | Yes with policy review | Enables supervised synthetic staging |
| 3 | Phase 1B backup, broker and protected storage | Yes with Phase 2 specification | Mandatory before real data/artifacts |
| 4 | Phase 2A applicable statutory pack | Yes with Phases 3/4 decisions | Mandatory for real-payroll cohort |
| 5 | Phase 2C payment/provider and FnF decisions | Provider work can parallel local ledger design | Mandatory for real payments; FnF may be excluded by cohort |
| 6 | Phase 5 enabled imports/reports/onboarding | After launch-enabled scope is signed | Mandatory only for enabled families |
| 7 | Phases 3 and 4 advanced lifecycle/authority | Parallel after owner approval | May be excluded from restricted pilot |
| 8 | Phase 6 Tier B capacity/recovery | Last, against frozen candidate | Mandatory for production capacity decision |

## Evidence package per gate

Every closure submission must contain:

- Gate ID and unchanged acceptance criterion.
- Approved specification version and owners, where applicable.
- Commit and immutable backend/web image digests.
- Environment ID, tenant/legal-entity/employee IDs and synthetic-data declaration.
- Browser trace or screenshot for user-facing action.
- API request/response metadata with secrets and personal data redacted.
- PostgreSQL before/after state, constraints and independent expected-value reconciliation.
- Celery/provider/storage evidence where applicable.
- Positive, negative, duplicate, concurrency, failure/retry and recovery outcomes.
- Cleanup result and retained artifact list.
- Residual limitation, pilot treatment and explicit status decision.

## Pilot milestones

### Milestone S - Synthetic functional staging

Required:

- Phase 1A complete.
- Database backup and basic restore evidence from Phase 1B.
- Synthetic-only feature manifest and technical exclusions enforced.
- No live payment, statutory filing, customer email or customer document.

Decision after completion: supervised synthetic functional testing may proceed.

### Milestone SP - Synthetic shadow payroll

Required:

- Applicable synthetic calculation oracles and immutable payroll controls.
- Durable jobs, broker recovery and protected synthetic payslip storage.
- No real employee, beneficiary, provider transaction or filing.

Decision after completion: synthetic shadow payroll may proceed; this is not real-payroll approval.

### Milestone RP - Restricted real-payroll pilot

Required:

- All statutory rules applicable to the selected cohort approved and Verified.
- Employee payment reconciliation and provider sandbox Verified.
- Protected storage, legal hold/retention, backup/PITR, broker recovery, monitoring and rollback Verified.
- Cohort excludes every unresolved transfer, rehire, overtime, FnF, retro, delegation or other policy-dependent path.
- Security, Payroll, Finance, Legal/Privacy, SRE and Release owners sign the gate register.

### Milestone UL - Unrestricted launch

Required:

- All 40 gates Verified or formally approved as non-applicable with executed fail-closed exclusion evidence.
- Tier B recovery and capacity limits accepted.
- No unresolved P0 integrity, statutory, payment, security or retention gate.

## Immediate next actions

1. Approve the staging region and resize/provision Tier A; the currently inspected `t3.small` is not suitable.
2. Name policy owners and schedule separate statutory/payroll, HR lifecycle, workflow-governance and privacy/retention decision reviews.
3. Sign the synthetic staging feature-exclusion manifest before deployment.
4. Prepare signed backend/web image digests and the staging secret-reference bundle.
5. Start Phase 1A deployment-security evidence; do not wait for advanced HR policy decisions.
6. In parallel, complete only the applicable statutory pack for the intended first payroll jurisdiction/population.

## Decision

**Plan status: PASS.** The unresolved scope is actionable when separated into policy, engineering and external evidence streams.

**Application status remains conditional.** Synthetic staging can proceed after Phase 1 entry controls. Real-payroll and unrestricted production remain **NO-GO** until their mandatory gates meet the evidence requirements above.
