# HRMS Payroll Statutory Phase 8 Consumption Certification

## Verdict

PASS for isolated local consumption of locked statutory declaration evidence by draft payroll calculation.

This is local qualification evidence only. It does not authorize deployment, shared-staging mutation, payroll approval, payment, filing, or use of real employee evidence.

## Scope

- Locked-only declaration eligibility for TDS cap adjustments
- Exact declaration and item source-hash provenance
- Immutable payroll calculation-line source hash
- Finance-visible, privacy-preserving calculation trace
- Verified-state negative control

## PostgreSQL evidence

The focused calculation test used synthetic records in task-owned PostgreSQL 16.

| Assertion | Result |
| --- | --- |
| Verified declaration changes payroll | PASS: no; declaration adjustment remained `0.00` and period TDS was `1125.00`. |
| Locked declaration changes payroll | PASS: yes; the configured cap was `50000.00` and period TDS was `500.00`. |
| Exact evidence identity retained | PASS: declaration ID, item ID, declaration source hash, and item source hash matched their PostgreSQL rows. |
| Provenance responds to evidence eligibility | PASS: the locked-evidence calculation source hash differed from the verified-state calculation source hash. |
| Private proof data enters trace | PASS: no proof filename, storage reference, or employee payload is added to the declaration-source trace. |

Final focused run: 1 passed with 3 unrelated Django authentication deprecation warnings. The broader pre-edit focused gate passed 4/4 and included financial-year lifecycle, declaration correction governance, and Finance redaction.

## Finance trace

The calculation detail panel exposes a read-only `Locked declaration evidence` section only when the backend trace contains complete source records. It displays full declaration and item source hashes and uses the corresponding opaque IDs only as non-visible title metadata. Employee and proof details are intentionally excluded.

The connected production-build browser run passed 1/1 with one Chromium worker in 4.3 seconds. It authenticated as the task-owned HR payroll operator, opened the exact synthetic calculation and TDS line, matched both displayed source hashes to PostgreSQL, matched the line hash, confirmed the private document reference and PAN were absent, and found no horizontal overflow.

The first connected run identified that paginated calculation-line rows intentionally omitted trace snapshots while the page had no detailed selected-line payload. The API now returns one full, tenant-scoped `selected_line` record and retains lightweight pagination rows. A backend regression verifies the selected line and declaration-source trace returned by this contract.

## Validation

- TypeScript: passed
- Focused ESLint: passed
- Django system checks: passed
- Migration drift: no changes detected
- Scoped `git diff --check`: passed
- Production frontend build: passed
- Connected Playwright: 1 passed with one worker

## Migration status

No database migration is required. The implementation uses existing calculation trace, configuration snapshot, and source-hash fields.

## Safety and cleanup

No real payroll, payment, filing, email, shared staging, or production operation was performed. The task-owned workspace, Django and Next.js processes, temporary evidence files, and PostgreSQL container were removed after verification. No commit or deployment occurred.

## Residual boundary

The phase certifies deterministic draft-calculation consumption and review trace behavior locally. Approval, lock, payment, statutory filing, and shared-staging execution remain separately governed operations.
