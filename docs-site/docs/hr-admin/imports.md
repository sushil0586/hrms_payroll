# Imports

Imports gives HR Admin users an evidence ledger for employee and organization batch uploads.

## Purpose

Use Imports to review batch outcomes, source hashes, blocked rows, created rows, and rollback readiness after bulk uploads.

## Use this page when

- Employee or organization data was imported.
- You need to know whether an import succeeded.
- Rows were blocked and need correction.
- You need source hash evidence for audit.
- A user asks why imported data did not appear.

## Page sections

| Section | Meaning |
| --- | --- |
| Import evidence ledger | High-level view of import batches and outcomes. |
| Batch list | Import runs with source, status, counts, and timestamps. |
| Source hash | Evidence that identifies the source file/input used. |
| Error or blocked rows | Rows that failed validation and need correction. |
| Created or updated rows | Records successfully committed. |
| Rollback readiness | Whether the batch has enough evidence for controlled rollback or review. |

## What to check first

| Situation | Check |
| --- | --- |
| Imported employee is missing | Confirm row was created and not blocked. |
| Counts look wrong | Compare ready, blocked, created, and skipped row counts. |
| Data looks stale | Confirm you are looking at the latest batch. |
| Duplicate upload suspected | Compare source hashes and timestamps. |
| User says import failed | Open the batch and read the first blocked-row message. |

## Good practice

- Keep import files in approved secure locations.
- Do not re-import repeatedly without reading blocked-row reasons.
- Fix validation errors at the source file when many rows fail.
- Confirm row counts before committing large imports.
- Keep source hash evidence for payroll-impacting imports.

## Example: Review an Employee Import Before Payroll Setup

Scenario: HR imported 250 employees before configuring salary and payroll assignments.

1. Open **HR Admin > Imports**.
2. Open the latest employee import batch.
3. Confirm batch status is completed.
4. Compare source row count with created plus blocked plus skipped rows.
5. Open blocked rows.
6. Group errors by reason.
7. Fix source masters or source file before re-importing.

Expected result:

- Every created employee has employee code, name, work email, legal entity, branch, department, manager, and employment status.
- Blocked rows are understood before payroll setup begins.
- Source hash is available for audit.

## Example: Fix Missing Organization Code In Import

Blocked row message: `department code DEP-SALES was not found`.

Fix path:

1. Open **Organization**.
2. Search for `DEP-SALES`.
3. If missing, create the department with correct parent business unit.
4. If code exists with a different spelling, correct the import file.
5. Re-run import only for blocked rows where possible.
6. Confirm the new batch has no department-code failures.

Expected result:

- HR fixes the missing master once.
- Multiple employee rows do not need manual repair.

## Example: Detect Duplicate Upload

Scenario: HR uploaded the same employee CSV twice.

1. Open **Imports**.
2. Compare source hash and timestamp across recent batches.
3. Review created, updated, skipped, and duplicate counts.
4. If the second upload updated records unexpectedly, open affected employee records.
5. Use Audit or Reports to confirm what changed.

Expected result:

- Duplicate uploads are identified by source hash.
- HR avoids repeated imports that overwrite corrected data.

## Negative Scenario: Import Says Completed But Employee Is Missing

Common causes:

- Row was skipped because employee code already existed.
- Row was blocked and not committed.
- Employee was created with different code or email.
- User is searching the wrong tenant, workspace, or page filter.

Fix path:

1. Search Imports by batch.
2. Search blocked and skipped rows by employee code or email.
3. Search Employees by employee code and work email.
4. If row was blocked, correct source data and re-import.
5. If row was skipped, decide whether an update import or manual correction is needed.

## Negative Scenario: Import Creates Bad Data

Examples:

- Wrong branch.
- Wrong manager.
- Wrong date of joining.
- Wrong employment status.
- Missing payroll-critical bank/statutory field.

Fix path:

1. Stop further imports from the same source.
2. Identify affected rows from import evidence.
3. Correct employees using bulk correction, employee edit, or lifecycle workflow depending on the field.
4. Use Audit to record corrective action.
5. Re-run readiness checks before payroll setup.

Do not silently edit payroll-impacting fields without evidence.

## FAQ

### Should I import again if many rows failed?

Not immediately. First group the failure reasons. If many rows failed because one master is missing, fix the master and then import corrected rows.

### Can Imports replace Employee Master review?

No. Imports commit data. Employee Master review confirms the data is usable for access, policies, manager approvals, documents, and payroll.

### What evidence should I keep?

Keep batch ID, source hash, uploaded file reference if allowed, row counts, blocked-row reasons, and the correction batch if one was needed.

## Related guides

- [Employees](employees.md)
- [Organization](organization.md)
- [Employee to Payroll](../workflows/employee-to-payroll.md)
- [Payroll Issues](../troubleshooting/payroll.md)
