# HRMS Module Confidence Model and Certification Plan

Date: 2026-11-06
Purpose: replace subjective confidence percentages with reproducible, evidence-linked measurements.

## 1. Metric Definitions

Two values must be reported separately.

### Local scenario completion

`Passed frozen scenarios / total frozen scenarios x 100`

This is a coverage result, not production confidence. Failed, Blocked, Partial, Conditional, and Not Run scenarios are not counted as Passed. Approved Not Applicable scenarios may be removed from the denominator only with recorded Product Owner and QA Owner approval.

### Release confidence

Release confidence is calculated only when a module has all five current-candidate evidence dimensions below:

| Dimension | Weight | Required measurement |
| --- | ---: | --- |
| Functional workflow | 35 | Frozen end-to-end scenarios with browser, API, and persistence proof |
| Security and integrity | 25 | RBAC, tenant isolation, audit, concurrency, idempotency, and historical protection |
| UX and accessibility | 15 | Validation, feedback, loading, responsive, keyboard, and automated accessibility contracts |
| Deployed environment | 15 | Same immutable candidate verified on shared staging, including configured integrations |
| Operations and recovery | 10 | Monitoring, notification/provider behavior, backup, isolated restore, rollback, and cleanup |

Each dimension score is `passed mandatory checks / applicable mandatory checks x 100`. The release-confidence score is the weighted sum. A module is `UNSCORED` when any dimension lacks a frozen denominator or current-candidate execution evidence. A score cannot be inferred from raw test counts because one scenario may have many parameterized tests.

### Certification labels

- **Fully Certified:** release confidence at least 95, no Failed or unexplained Not Run P0/P1 scenario, and no unresolved mandatory policy blocker.
- **Conditional:** measured evidence exists, but one or more mandatory gates are Blocked, Not Run, stale, local-only, or policy-dependent.
- **Blocked:** a mandatory safety, policy, provider, recovery, or integrity prerequisite prevents execution or release.
- **Unscored:** the evidence denominator is incomplete, inconsistent, or not reconciled to the current candidate.

## 2. Current Real Measurements

These values are copied from authoritative frozen registers or final local batch certificates. They are not estimates.

| Module or evidence package | Frozen scope | Passed | Failed | Blocked | Not Run | Measured local completion | Release confidence | Source |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Employee Lifecycle | 100 | 96 | 0 | 3 | 1 | 96.0% | UNSCORED | `hrms-employee-lifecycle-scenario-register.md` |
| Leave unified catalogue, strict per-ID reconciliation | 209 | 0 | 0 | 0 | 209 | 0.0% formally reconciled | UNSCORED | `hrms-leave-complete-e2e-scenario-catalog.md`; `hrms-leave-confidence-baseline.md` |
| Leave lifecycle batch, supporting subset only | 12 | 12 | 0 | 0 | 0 | 100.0% | UNSCORED | `hrms-stg136-batch5-leave-lifecycle-certification.md` |
| Attendance/roster/monthly-close batch | 12 | 12 | 0 | 0 | 0 | 100.0% | UNSCORED | `hrms-stg136-final-local-certification.md` Batch 6 |
| Documents/notifications batch | 10 | 9 | 0 | 1 | 0 | 90.0% | UNSCORED | `hrms-stg136-batch7-documents-notifications-certification.md` |
| Salary/statutory/readiness batch | 10 | 9 | 0 | 1 | 0 | 90.0% | UNSCORED | `hrms-stg136-batch8-salary-statutory-certification.md` |
| Payroll calculation/approval/lock batch | 10 | 10 | 0 | 0 | 0 | 100.0% | UNSCORED | `hrms-stg136-batch9-payroll-workflow-certification.md` |
| Payroll outputs/payments/finance batch | 10 | 9 | 0 | 1 | 0 | 90.0% | UNSCORED | `hrms-stg136-batch10-financial-output-certification.md` |
| Reports/imports/exports batch | 10 | 9 | 0 | 1 | 0 | 90.0% | UNSCORED | `hrms-stg136-batch11-reports-import-export-certification.md` |
| Lifecycle/history batch | 8 | 7 | 0 | 1 | 0 | 87.5% | UNSCORED | `hrms-stg136-batch12-lifecycle-history-certification.md` |
| Recovery/idempotency/security batch | 10 | 10 | 0 | 0 | 0 | 100.0% | UNSCORED | `hrms-stg136-batch13-recovery-security-certification.md` |
| Complete local STG-136 campaign | 136 | 131 | 0 | 5 | 0 | 96.3% | UNSCORED | `hrms-stg136-final-local-certification.md` |
| Shared staging STG-136 campaign | 136 | 0 | 0 | 0 | 136 | 0.0% executed | UNSCORED | `hrms-staging-certification-dashboard.md` |

The batch values are useful risk indicators but are not yet complete module confidence values. The 12-case leave batch does not by itself prove every Leave screen, validation boundary, attachment lifecycle, accessibility behavior, notification route, and recovery condition. Leave already has a validated 209-ID catalogue; its strict baseline remains zero formally reconciled IDs until existing evidence is mapped to each complete acceptance contract.

## 3. Why Most Modules Are Currently Unscored

1. Leave, Attendance, Documents, Payroll, ESS/MSS, Organization/RBAC, and Notifications do not yet have one reconciled module register with unique frozen IDs and a complete denominator.
2. The 5,458-case CRUD register contains broad generated coverage, historical count drift, Partial cases, and ownership corrections. It cannot be converted directly into module confidence until package ownership and applicability are reconciled.
3. Several reports contain local-only evidence while the shared-staging register remains 136 Not Run.
4. Some evidence predates the current working candidate or was executed against a different build/runtime fingerprint.
5. External controls such as SES delivery, private object storage, provider interruption, centralized audit, and isolated restore are not uniformly certified per module.

## 4. Phase-Wise Measurement Plan

### Phase 0 - Freeze the candidate and evidence rules

- Record Git SHA, backend/web/worker image digests, migration graph, runtime fingerprint, and test-data namespace.
- Freeze the confidence formula and severity rules in this document.
- Define evidence freshness: evidence is current only when run against the same source candidate or a reviewed content-identical build.
- Preserve historical reports without borrowing their Passed verdicts into the current score.

Exit gate: immutable candidate identity and evidence policy approved.

### Phase 1 - Build authoritative module registers

Create one unique-ID register for each:

1. Leave
2. Attendance and roster
3. Documents
4. Employee Lifecycle
5. Organization and RBAC
6. ESS/MSS cross-workspace behavior
7. Notifications and email
8. Payroll and statutory
9. Recovery and operations

Every row must include severity, role, route, workflow state, expected browser feedback, API contract, database/audit contract, tenant boundary, accessibility requirement, environment requirement, and evidence path.

Exit gate: every mandatory case has one owner and one package; no duplicate or invented IDs.

### Phase 2 - Reconcile existing evidence

- Map existing browser, Django/PostgreSQL, accessibility, and operational evidence to exact frozen IDs.
- Accept evidence only when candidate identity, environment, assertions, and cleanup are reproducible.
- Mark incomplete evidence Partial or Not Run rather than Passed.
- Resolve stale dashboard totals and CRUD ownership drift.

Exit gate: each module has authoritative Passed/Failed/Blocked/Not Run totals and an evidence freshness date.

### Phase 3 - Execute local certificate campaigns

For each module, run one connected isolated campaign covering:

- Full role-to-role workflow and lifecycle transitions.
- Browser action, authenticated API result, PostgreSQL before/after, and audit evidence.
- Validation, truthful success/error feedback, loading, duplicate suppression, retry, and refresh persistence.
- RBAC, cross-tenant denial, stale/concurrent writes, replay/idempotency, and historical protection.
- Desktop, tablet, mobile, keyboard, focus, and automated accessibility checks.
- Exact-ID cleanup and residual-resource verification.

Exit gate: no Failed mandatory case and no unexplained Not Run executable P0/P1 case.

### Phase 4 - Execute deployed staging campaigns

- Verify immutable deployed SHA and image digests before execution.
- Run the approved module cases against shared staging using synthetic identities and namespaces.
- Verify SES recipient isolation, private object storage, Celery/Redis behavior, centralized logs, and environment fingerprint.
- Keep local and staging verdicts separate.

Exit gate: deployed-environment dimension has a real denominator and no unresolved security stop condition.

### Phase 5 - Operations and recovery qualification

- Verify encrypted off-host backup, restricted restore identity, retention, versioning, checksum, and isolated restore.
- Exercise provider interruption and retry where authorized.
- Verify monitoring, correlation IDs, alert ownership, rollback, and governed cleanup.
- Measure recovery duration against approved RPO/RTO.

Exit gate: operations/recovery dimension has current evidence for every module that stores protected or financial data.

### Phase 6 - Publish real confidence values

- Calculate all five dimension scores from frozen denominators.
- Publish weighted score, raw dimension scores, candidate identity, environment, date, and open risks.
- Require independent QA review of evidence mappings and arithmetic.
- Never round an unmeasured dimension into a favorable score.

Exit gate: each published percentage can be independently recalculated from linked rows.

## 5. Recommended Execution Order

1. Documents: close the existing private-storage/notification blocker and reconcile attachment, retention, download-audit, and recovery cases.
2. Leave: consolidate the broad existing evidence into one frozen register and execute remaining policy/attachment/notification cases.
3. Attendance: consolidate roster, assignment, regularization, close, historical, and payroll-input contracts.
4. Organization and RBAC: certify tenant hierarchy, roles, last-admin, privilege escalation, and cross-tenant isolation.
5. ESS/MSS: certify combined persona switching, reportee scope, history, and cross-module navigation.
6. Notifications: certify every event-recipient-channel combination, retry, deduplication, and provider failure.
7. Payroll/statutory: reconcile the broadest financial and provider surface last, with immutable calculations and maker-checker controls.
8. Recovery/operations: complete cross-module staging restore and rollback proof before release scoring.

## 6. Immediate Next Action

Start the Documents module register because it already has a bounded `9 Passed / 1 Blocked` local package and the missing controls are explicit. Reconcile the existing document lifecycle, ESS/HR Admin UI, private storage, download audit, notification, retention, and recovery evidence into unique cases before running new tests.

Until this plan is completed, publish local scenario completion values exactly as shown above and report module release confidence as `UNSCORED`, not as an estimated percentage.
