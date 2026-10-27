# HRMS STG-136 Batch 9 Payroll Workflow Certification

Date: 2026-10-27\
Runner revision: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus reviewed uncommitted campaign changes\
Environment: isolated PostgreSQL 16, Redis 7, Celery worker/beat, Django and production-built Next.js 15.5.28\
Decision: **PASS locally**

## Frozen Results

| ID | Local result | Evidence disposition |
|---|---|---|
| STG-E2E-0901 | Passed | Browser created run `DB610_1793087422095` for April 2026 and PostgreSQL confirmed tenant/pay-group/period identity. |
| STG-E2E-0902 | Passed | Browser created and locked one employee input snapshot; PostgreSQL retained the exact salary and attendance inputs. |
| STG-E2E-0903 | Passed | Browser submitted a second regular run for the same pay group and period; API returned 400 and PostgreSQL retained one run. |
| STG-E2E-0904 | Passed | Browser selected the locked snapshot and attempted a salary mutation; API returned 400 immutable and PostgreSQL retained INR 50,000 monthly gross. |
| STG-E2E-0905 | Passed | Browser queued calculation; Celery completed one item in one attempt. |
| STG-E2E-0906 | Passed | Browser refresh restored the succeeded calculation state from the durable job record. |
| STG-E2E-0907 | Passed | Browser opened and submitted payroll review. |
| STG-E2E-0908 | Passed | Maker self-approval returned 400, a distinct authorized checker approved, stale replay returned 400, and PostgreSQL retained one approval with different submitter/approver IDs. |
| STG-E2E-0909 | Passed | Browser final-locked the approved run; backend immutability regression rejected finalized business edits. |
| STG-E2E-0910 | Passed | Independent PostgreSQL reconciliation matched gross INR 50,000.00, deductions INR 0.00, employer contributions INR 0.00 and net INR 50,000.00. |

Totals: **10 Passed, 0 Failed, 0 Blocked, 0 Incomplete**. Shared staging remains **0 Passed / 136 Not Run**.

## Closure Evidence

- Production-built composite Playwright: `1 passed` in 59.6 seconds for `0903`, `0904`, `0908` and Batch 10.
- Closure run `5f012c75-5828-4fa9-9c15-a8b037e72da5`; snapshot `826a8d77-30de-4ff5-a990-9122d116bfea`; calculation `08568bc1-ab8e-472c-add6-d803306e0b80`; review `242d2b8a-6829-4c07-ae4e-9f533667af58`.
- Maker/checker enforcement is now transactional with row locking. Focused backend/API closure: `3 passed`.
- The protected payroll Playwright diff checksum remained `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`.

## Connected Evidence

- Protected Playwright workflow: `1 passed` in 1.3 minutes; protected diff checksum remained `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`.
- Run `e3413d37-5eb7-4320-bdb2-cd55be775afd`, snapshot `8d0b6134-67da-46f1-95e7-138b9d0ba21c`, calculation `95ff6cc2-40a9-4ee9-9378-d682bd46358b`.
- Period: 2026-04-01 through 2026-04-30; pay date 2026-04-30.
- Locked snapshot: annual CTC INR 600,000; monthly gross INR 50,000; 21 working days, 20 present days and 1 LOP day as immutable source evidence.
- Calculation result: one `QA_GROSS` earning line for INR 50,000.00; no statutory rate, deduction, overtime or unapproved formula was introduced.
- Durable jobs: calculation 1/1, output generation 1/1, publication 2/2 and finance handoff 3/3; all succeeded in one attempt without error.
- PostgreSQL/API regressions: `4 passed` for input locking, durable calculation/idempotency, review/final lock and finalized-run immutability.

## Historical Runner Evidence

The first invocation incorrectly fell back to an obsolete local SQLite database. The second began before Celery beat was active and left the UI queued until timeout, although the durable outbox later completed. Neither run was counted. PostgreSQL-only execution with worker and beat is the final evidence.

## Safety

Only isolated synthetic data was used. No shared staging, production, real payment, live email, commit, push or deployment occurred.
