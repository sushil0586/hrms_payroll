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

## Related guides

- [Employees](employees.md)
- [Organization](organization.md)
- [Employee to Payroll](../workflows/employee-to-payroll.md)
- [Payroll Issues](../troubleshooting/payroll.md)

