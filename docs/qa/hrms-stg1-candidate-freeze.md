# STG-1 QA Candidate Freeze

Date: 2026-10-26
Decision: **BLOCKED pending an approved committed candidate revision**
Execution performed: read-only repository and staging inspection only

## Repository Provenance

- Branch: `main`
- Local HEAD: `20d832996ef505f0b6c2df2673204e841e7b6a52`
- `origin/main`: `20d832996ef505f0b6c2df2673204e841e7b6a52`
- No file is staged and no commit was created.
- The QA candidate is a working-tree proposal, not a revision. Its SHA cannot be stated until the exact manifest is approved and committed.

## Group A: Documentation And Test Automation

The proposed executable QA candidate contains these 24 paths:

1. `docs/qa/hrms-staging-complete-e2e-test-plan.md`
2. `docs/qa/hrms-staging-e2e-workflow-register.csv`
3. `docs/qa/hrms-stg0-readiness-assessment.md`
4. `docs/qa/hrms-stg0-infrastructure-checklist.md`
5. `docs/qa/hrms-stg0-risk-and-blocker-register.md`
6. `docs/qa/hrms-staging-certification-dashboard.md`
7. `docs/qa/hrms-stg0a-scenario-automation-mapping.csv`
8. `docs/qa/hrms-stg0a-evidence-contract.md`
9. `docs/qa/hrms-stg0a-git-change-review.md`
10. `docs/qa/hrms-stg0a-execution-readiness.md`
11. `docs/qa/hrms-stg0b-infrastructure-remediation.md`
12. `docs/qa/hrms-stg0b-celery-beat-durability.md`
13. `docs/qa/hrms-stg0b-backup-restore-readiness.md`
14. `docs/qa/hrms-stg0b-monitoring-and-alerts.md`
15. `docs/qa/hrms-stg0b-automation-gap-closure.md`
16. `docs/qa/hrms-stg0c-baseline-freeze-review.md`
17. `docs/qa/hrms-stg0c-business-contract-decisions.md`
18. `docs/qa/hrms-stg0c-operational-blocker-matrix.md`
19. `docs/qa/hrms-stg0c-batch1-entry-assessment.md`
20. `docs/qa/hrms-stg0d-batch1-automation-implementation.md`
21. `docs/qa/hrms-stg0d-batch1-local-verification.md`
22. `docs/qa/hrms-stg0d-batch1-authorization-assessment.md`
23. `backend/tests/test_stg0d_batch1_onboarding_integrity.py`
24. `web/tests/e2e/stg0d-batch1-onboarding.spec.ts`

The two STG-1 assessment documents produced by this review are not silently added to that 24-path candidate. They require explicit inclusion if the owner approves a revised 26-path manifest.

Executable test hashes:

- Backend/API/PostgreSQL: `ac7c68fc14be9d72d74e6dcfaaade021378556eb4c9a3b23ee8df3bc1cf7aae1`
- Playwright: `7e2b42f5491d199974ee9f570241d80dddb9cbba1dd20193ef08726034e97338`

## Group B: Pre-existing Payroll Repair

`web/tests/e2e/db6-payroll-processing.spec.ts` remains a separate tracked modification containing four added Actions-tab navigation assertions. STG-1 did not edit it. It is excluded from the 24-path QA candidate and must be reviewed, tested and committed separately.

## Group C: Unrelated Changes

No other tracked modification exists in this repository. The `Finacc/` files visible in the IDE belong to another project and are outside this HRMS repository/candidate. Generated build and Playwright output remain ignored and are not candidate files.

## Integrity And Secret Review

- The 136 IDs are unique; all 136 execution statuses remain `Not Run`.
- Mapping totals are 95 Fully Mapped, 32 Partially Mapped, 2 Automation Missing and 7 Environment Blocked.
- Diff whitespace validation passed.
- No private key, AWS access-key identifier, SMTP secret, database URI or environment file was found in the 24-path candidate.
- Both tests contain the clearly synthetic local fallback `Password@123`. This is test data, not a deployed credential. Staging execution must inject `STG0D_TENANT_ADMIN_PASSWORD` and platform credentials from an approved secret channel; the fallback must not be used as an assumed staging password.
- No application or migration file is included, so the candidate introduces no product behavior into the deployed images.

## Source-To-Deployment Compatibility

The deployed checkout and current local parent are both `20d832996ef505f0b6c2df2673204e841e7b6a52`. The candidate adds tests and documentation only, while the unrelated payroll test change remains excluded. Therefore the automation is designed to target the deployed application behavior without introducing uncommitted product behavior.

This compatibility is not yet reproducible release provenance because the tests themselves have no committed SHA. Approval requires an exact child revision of `20d8329` containing the reviewed candidate manifest.

## Freeze Decision

Candidate content is reviewable, but freeze is **BLOCKED** until the repository owner approves the exact manifest and authorizes creation of a commit. No `git add`, commit, deployment or staging mutation occurred.
