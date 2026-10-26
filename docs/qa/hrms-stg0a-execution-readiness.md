# STG-0A Execution Readiness

Date: 2026-10-26
Decision: **CONDITIONAL**

## Frozen Inventory

- 136 unique scenarios
- 15 batch IDs (`0` through `14`)
- 93 Fully Mapped
- 32 Partially Mapped
- 4 Automation Missing
- 7 Environment Blocked
- 136 Not Run

Mapping readiness describes reusable automation only. It is not an execution result.

## Gap Classification

### A. Code or test remediation

- Four scenarios lack validated complete automation: deterministic import execution/replay/failure semantics and pending-request reassignment restriction.
- Thirty-two scenarios reuse existing suites but still need scenario-specific orchestration or independent API/PostgreSQL assertions.
- The payroll action-tab repair needs focused PostgreSQL-backed execution before its proposed separate commit.

### B. Staging configuration or credentials

- Strict preflight requires declared enterprise identity scope and payroll provider-worker mode.
- Provider credentials are absent; real provider processing must stay disabled.
- Protected payroll artifact storage credentials and policies are absent from verified evidence.
- SES can be used only with approved synthetic recipients and redacted delivery evidence.

### C. Infrastructure evidence

- No current encrypted off-host restore rehearsal proves recoverability.
- AWS alarm and custom memory/disk/swap/container monitoring verification is incomplete.
- Celery beat recovered from a corrupt local schedule file; recurrence handling and persistence must be proven before relying on scheduled work.
- Worker interruption requires an approved maintenance window.

### D. Documentation/evidence gaps

- Existing tests did not use `STG-E2E-*` IDs; this mapping provides the immutable cross-reference.
- Historical local passes remain supporting evidence only.
- PostgreSQL-specific migrations and trigger tests must run against PostgreSQL, never SQLite. The prior SQLite setup errors are classified as an invalid test environment, not product failures.

## Dependency-Ordered Execution

1. Batch 0: provenance, health, migrations, dependencies, resource and recovery preflight.
2. Batch 1: create the one connected disposable tenant and ownership manifest.
3. Batch 2: organization hierarchy.
4. Batch 3: fiscal, leave-year, and payroll calendars.
5. Batch 4: employees, roles, and effective-dated access.
6. Batch 5: leave policy and ESS/MSS leave lifecycle.
7. Batch 6: attendance, roster, regularization, and close.
8. Batch 7: documents, notifications, approved synthetic SES evidence.
9. Batch 8: salary/statutory fixture and payroll readiness.
10. Batch 9: payroll snapshot, calculation, review, approval, and lock.
11. Batch 10: outputs, payslip, payment artifact, and finance handoff.
12. Batch 11: reports, imports, and exports.
13. Batch 12: lifecycle changes and historical protections.
14. Batch 13: recovery, idempotency, and security.
15. Batch 14: governed teardown and shared-baseline verification.

Run one Playwright worker. Reuse the same owned tenant and manifest. APIs may create only technical prerequisites that have no required browser workflow. Each supported business operation begins in the browser and is independently verified against API and read-only PostgreSQL evidence.

## Immediate Stop Conditions

- Cross-tenant or unauthorized data access
- Payroll, payslip, bank, or finance mismatch
- Duplicate payroll processing or financial posting
- Mutation of locked/finalized financial history
- Leave ledger imbalance or mutable historical movement
- Shared tenant or non-owned data mutation
- Cleanup ownership ambiguity

## STG-1 Entry Criteria

1. Documentation commit group reviewed and explicitly approved.
2. Payroll test repair passes in an authorized disposable PostgreSQL-backed environment and its separate commit is approved.
3. All 136 mapping rows and evidence requirements are frozen in the QA candidate SHA.
4. Batch 0 has executable commands for commit/image, TLS, Django, PostgreSQL, Redis, Celery, backup, monitoring, and resource checks.
5. One unique run ID, disposable tenant name, ownership manifest, and authorized persona manifest are approved.
6. PostgreSQL-compatible test infrastructure is selected; SQLite is prohibited for integrity certification.
7. Strict-preflight exceptions are resolved or explicitly accepted as synthetic-only restrictions without weakening controls.
8. Backup/restore, monitoring, Celery beat, storage, SES, and provider limitations are dispositioned per affected scenario.
9. Evidence storage and redaction controls are available.
10. Cleanup and shared-baseline queries are rehearsed read-only and reviewed.

## Decision

STG-0A is **CONDITIONAL**. The scope and evidence model are frozen, but STG-1 must not begin until the missing automation, environment blockers, and commit approvals above are reconciled.
