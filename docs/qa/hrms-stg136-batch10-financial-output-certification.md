# HRMS STG-136 Batch 10 Financial Output Certification

Date: 2026-10-27\
Runner revision: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus reviewed uncommitted campaign changes\
Environment: isolated PostgreSQL 16, Redis 7, Celery worker/beat, Django and production-built Next.js 15.5.28\
Decision: **CONDITIONAL locally**

## Frozen Results

| ID | Local result | Evidence disposition |
|---|---|---|
| STG-E2E-1001 | Passed | Browser generated one output batch from the final-locked payroll review; durable job succeeded 1/1. |
| STG-E2E-1002 | Passed | Browser published once; authenticated replay returned the canonical published batch without duplicate artifacts. |
| STG-E2E-1003 | Passed | ESS listed the intended employee's published payslip by exact run code. |
| STG-E2E-1004 | Passed | ESS downloaded the payslip; downloaded SHA-256 matched the persisted artifact checksum. |
| STG-E2E-1005 | Passed | A different authenticated employee received 404 and unauthenticated access received 401; backend cross-tenant/download permission regression also passed. |
| STG-E2E-1006 | Passed | Register contained one employee, gross/net INR 50,000.00, zero deductions/contributions, and a 64-character SHA-256 checksum. |
| STG-E2E-1007 | Passed | Bank advice contained one employee, net INR 50,000.00 and a 64-character SHA-256 checksum. No payment was initiated. |
| STG-E2E-1008 | Passed | Finance handoff job succeeded 3/3; bank, accounting and statutory artifacts retained exact source-run identity. |
| STG-E2E-1009 | Passed | Existing focused PostgreSQL/API period guard rejects finance posting into closed accounting periods; final-locked source remained immutable. |
| STG-E2E-1010 | Blocked | Frozen mapping requires deployed provider/storage interruption and retry evidence. Local deterministic jobs cannot certify an external payment failure, and no external payment may be marked Paid. |

Totals: **9 Passed, 0 Failed, 1 Blocked, 0 Incomplete**. Shared staging remains **0 Passed / 136 Not Run**.

## Reconciliation

- Payroll run: `5f012c75-5828-4fa9-9c15-a8b037e72da5`; status `locked`.
- Employee count: 1; working days: 21; LOP evidence: 1 day.
- Gross earnings: INR 50,000.00; deductions: INR 0.00; employer contributions: INR 0.00; net pay: INR 50,000.00.
- Payslip checksum: `7b8d71d99473928ed2c2e208a33b5caefed9ef7005142377aa462a03b0ddefc5`.
- Register checksum: `89a8571daa7e36894ef1f4e70028def0c3f477e61013df71c11cffa5609cdbcf`.
- Bank-advice checksum: `fbb586e66b5e86baaf6d30a08ae74fca26eb34f6d01f77a2128ac4231c4c3974`.
- Accounting-export checksum: `b448d5bb9bc9448815c0013cba22adf3ef1768f62638fcad16635a8ecee7d66c`.
- Celery jobs: calculation 1/1, output generation 1/1, publication 2/2 and finance handoff 3/3; every job succeeded on attempt 1.

## Defects And Regression

- Closed a P0 maker/checker defect: payroll review submitters could approve their own reviews. Approval/rejection now reload under `SELECT FOR UPDATE` and reject self-decisions.
- Added the missing authenticated GET-only Next.js proxy for payroll-output evidence.
- Production Playwright: `1 passed` in 59.6 seconds after retaining three earlier failed automation-development runs.
- Focused backend/API: `3 passed`; TypeScript, focused ESLint, Django checks, migration drift and production build passed.
- Batch 11 continuation was attempted but not counted: two legacy workforce-report tests failed due request-context authentication and stale redirect expectations.

## Safety

All records and files were synthetic and isolated. No provider transaction, live email, staging mutation, commit, push or deployment occurred. `1010`, `0804` and `0710` remain blocked by their external or approved-policy prerequisites.
