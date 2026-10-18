# HRMS Database Remediation Roadmap

## Principles

- Preserve existing payroll snapshots, calculations, artifacts, and leave behavior during migration.
- Extend current models and Celery architecture; do not create a second policy/job framework.
- Add observability and shadow data before enforcement.
- Never auto-normalize ambiguous financial or leave history.
- Introduce constraints only after read-only audits and explicit remediation.

## Phase 0: Production gate and evidence (1-2 weeks)

1. Freeze production customer onboarding and destructive delete paths.
2. Add read-only audit commands for cross-tenant FKs, duplicate regular runs, overlapping ranges, balance/ledger drift, invalid status timestamps, and delete graphs.
3. Capture database backup and perform restore rehearsal.
4. Define finance/HR owners for ambiguity disposition.

Exit: no unknown P0 data violations; signed migration rules. Complexity: M.

## Phase 1: Concurrency and write barriers (2-4 weeks)

1. Lock leave request/balance/workflow rows and add mutation idempotency.
2. Add duplicate regular-run model semantics and conditional uniqueness.
3. Add terminal-state DB checks and centralized payroll write services.
4. Block physical deletion of tenants/employees with history.
5. Add cross-tenant integrity checks for critical payroll, leave, attendance, workflow, and document relations.

Exit: concurrency tests and bulk/raw bypass tests pass; no P0 corruption path remains. Complexity: L.

## Phase 2: Fiscal calendar and posting controls (4-7 weeks)

1. Introduce FiscalCalendar, FiscalYear, FiscalPeriod, and status-event ledger.
2. Backfill shadow mappings and resolve ambiguity.
3. Link payroll periods, declarations/tax years, finance handoffs, and corrections.
4. Enable open/soft-close/close/reopen RBAC and audit.
5. Add March-paid-April and multi-country certification.

Exit: all new runs have deterministic fiscal/accounting mappings and closed posting is impossible. Complexity: XL.

## Phase 3: Leave immutable ledger and year-end (5-9 weeks)

1. Expand transaction taxonomy and implement balance projection versioning.
2. Add policy periods, entitlement lots, allocations, and close runs.
3. Implement carry-forward cap/expiry/forfeiture/encashment/reversal.
4. Add cross-year request allocation and exact cancellation restoration.
5. Reconcile existing balances without deleting ambiguous rows.

Exit: ledger rebuild equals projection; close/retry is idempotent; worked example passes. Complexity: XL.

## Phase 4: Employment history and transfer orchestration (5-8 weeks)

1. Add EmploymentSpell and effective-dated EmploymentAssignment.
2. Backfill current assignment and trustworthy movement history.
3. Orchestrate cross-entity payroll/leave/attendance/statutory transitions.
4. Link exits, rehires, settlements, and salary revisions.

Exit: historical date queries are deterministic; rehire and transfer scenarios pass. Complexity: XL.

## Phase 5: Temporal policy and configuration hardening (3-6 weeks)

1. Effective-date leave/attendance/workflow assignments.
2. PostgreSQL range exclusion constraints for active assignments/config versions.
3. Immutable configuration version history and temporal resolver.
4. Snapshot policy-resolution evidence into operational transactions.

Exit: “what policy applied on date X?” is answerable and race-safe. Complexity: L.

## Phase 6: Payment lifecycle, retention, and scale (4-8 weeks)

1. Add payment batch/instruction/status/reissue/reversal ledger.
2. Define legal retention and hold policies; protect storage and database evidence.
3. Add measured composite indexes and partition high-volume tables where justified.
4. Implement archive/export/restore and tenant deletion governance.
5. Run 5/10-year volume and disaster-recovery tests.

Exit: payment reconciliation and lifecycle retention certified at staging volume. Complexity: XL.

## Release gates

Production remains **NO-GO** until Phases 0-3 are complete for enabled customer workflows and all P0 rows in `hrms-schema-risk-register.csv` are closed or formally accepted. Phases 4-6 may be capability-gated only if unsupported scenarios (rehire, cross-entity transfer, complex carry-forward, payment initiation) are disabled and clearly excluded contractually; tenant isolation, fiscal posting, payroll uniqueness, leave concurrency, and historical retention cannot be deferred.

