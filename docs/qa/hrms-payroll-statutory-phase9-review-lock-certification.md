# HRMS Payroll Statutory Phase 9 Review and Lock Certification

Date: 2 November 2026
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js
Verdict: PASS for controlled review and final-lock integrity

## Scope

This phase verifies that locked statutory declaration evidence remains exact through payroll review, independent approval, and final lock. All records and identities were synthetic and tenant-scoped.

Excluded from execution: output generation, payslip publication, finance/provider handoff, payment, bank processing, statutory filing, shared staging, and production.

## Controls verified

- Review opening sealed all calculation line IDs/source hashes and consumed declaration/item IDs/source hashes.
- Submit, approval, and lock revalidated the sealed evidence against current PostgreSQL rows.
- Declaration and item evidence rows were locked transactionally during each state transition.
- A changed declaration lifecycle state produced a stale-evidence denial and no approval record.
- The submitting maker could not approve: the browser control was disabled and the authenticated API returned HTTP 400.
- A separate checker approved and final-locked the review.
- The post-lock calculation trace displayed the same declaration hash, item hash, and calculation-line hash prefix.
- The trace excluded the private proof reference and PAN.
- Final-locked calculation lines rejected update and delete attempts.
- Draft recalculation of the final-locked payroll run was rejected.

## Results

| Verification | Result |
| --- | --- |
| Focused PostgreSQL/Django regression | 2 passed |
| Production-build Playwright | 1 passed, 1 worker |
| Maker/checker browser and API controls | Passed |
| Evidence stale-state denial | Passed |
| Locked-line immutability | Passed |
| Post-lock evidence visibility/redaction | Passed |
| Production frontend build | Passed |

The production build retained one pre-existing Autoprefixer warning recommending `flex-end` instead of `end`; it did not fail compilation.

## Operational note

Open reviews created before this evidence seal was introduced fail closed at submit, approval, or lock. Operators must create a new controlled calculation and review rather than bypassing or editing historical evidence.

## Cleanup

The governed workspace cleanup command was used with the exact synthetic seed reference and private-file confirmation. Task-owned application processes, PostgreSQL container, temporary fixture files, and browser artifacts were removed after verification.
