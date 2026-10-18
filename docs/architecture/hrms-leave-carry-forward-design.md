# HRMS Leave Carry-Forward and Year-End Design

## Current state

Leave policies support effective dates, monthly/quarterly/yearly accrual, policy start month/day, join-month proration, service tiers, carry-forward caps, negative balance, encashment controls, approval workflows, and cancellation. The current `LeaveBalance` is a mutable period summary. `LeaveBalanceTransaction` records only credit/debit adjustments and encashment.

Confirmed gaps:

- no persisted leave-year period or close run;
- no transaction types for opening, accrual, reservation, consumption, release, carry-forward, expiry, forfeiture, or reversal;
- no carry-forward expiry date or entitlement lot;
- no idempotent year-end key/job;
- existing-balance refresh recomputes and overwrites accrual/carry-forward;
- request allocation uses the start-date balance and does not split cross-year leave;
- reservation/consumption helpers update balances without row locks;
- exit-date/transfer/anniversary proration is not supported.

Evidence: `backend/apps/leave_management/models.py:95-365` and `backend/apps/leave_management/services.py:290-480`, `1337-1392`, `1653-1706`, `1903-2085`, `2287-2506`.

## Recommended extension

1. `LeavePolicyPeriod`: policy/version, start/end, status, close metadata; date-range exclusion constraint.
2. `LeaveYearCloseRun`: tenant, policy period, status, idempotency key, counts, request/result/error snapshots, retry metadata.
3. Extend `LeaveBalanceTransaction` into an immutable ledger with actions: opening, accrual, reservation, reservation_release, consumption, consumption_reversal, adjustment, carry_forward, expiry, forfeiture, encashment, encashment_reversal, close, and correction.
4. `LeaveEntitlementLot`: source transaction, granted units, remaining units, effective date, expiry date, source period, priority. Consume earliest-expiring eligible lot first unless policy explicitly says otherwise.
5. `LeaveRequestAllocation`: request, date/segment, policy period, balance, lot, reserved/approved/consumed units. This supports cross-year requests and exact reversal.
6. Keep `LeaveBalance` as a locked materialized projection with ledger version/checksum, never the source of truth.

## Concurrency and idempotency

- Every submit/approve/reject/cancel/admin action runs in one transaction.
- Lock leave request, relevant policy periods, projection rows, and lots in deterministic order.
- Each user command and scheduled close has a tenant-scoped idempotency key.
- A unique constraint prevents a transaction being applied twice for the same command/source/allocation.
- Projection updates use ledger delta or `F()` expressions and verify expected ledger version.
- Failed close runs resume from durable per-employee items; rerun creates no duplicate credits.
- Corrections append reversal and replacement entries; they never rewrite applied ledger rows.

## Worked example

Assumptions: prior-year unused leave is 18 days; policy allows at most 10 carry-forward; 4 of those 10 expire after 90 days; employee takes 6 days during the expiry window.

Persist at close date, for example 2027-04-01:

1. Prior period closing ledger/projection: 18 available.
2. `forfeiture` transaction: 8 days effective 2027-03-31, linked to the close run (18 minus cap 10).
3. `carry_forward` transaction: +10 days effective 2027-04-01, linked to the prior period and close run.
4. Two new-period lots:
   - lot CF-EXP: 4 days, effective 2027-04-01, expires 2027-06-29;
   - lot CF-BASE: 6 days, effective 2027-04-01, no special expiry or the policy-period end.
5. New-year scheduled accrual/upfront entitlement is a separate transaction and lot; it must not be merged with carry-forward.

When 6 days are approved on 2027-05-10, create dated allocations using earliest expiry first:

- consume 4 from CF-EXP;
- consume 2 from CF-BASE;
- one `consumption` ledger transaction (or two linked lot entries) totals 6.

At 2027-06-30 the expiry job sees CF-EXP remaining 0, so it creates no expiry debit. If the employee had used only 2 days, it would append an `expiry` transaction of 2 on 2027-06-30. Cancellation reverses the exact original lot allocations; if cancellation occurs after expiry, policy must explicitly choose whether restored expiring units immediately expire or return under an approved correction. The system must not silently credit unrestricted leave.

## Policy changes and transfers

- Policy edits create a future version; an active period retains its version unless an approved retroactive correction is run.
- Legal-entity transfers close/segment the old assignment and open the new one. Transfer rules explicitly choose preserve, convert, encash, or forfeit by leave type.
- Joining and exit proration use exact effective dates and versioned strategies.
- Anniversary cycles use employee-specific persisted policy periods, not a synthetic calendar-year integer.
- Negative/advance leave is represented as ledger debt, bounded by policy and visible during transfer/year close.

## Required tests

- Concurrent submissions and approvals against the same balance.
- Monthly/quarterly/yearly/upfront accrual, join/exit proration, leap years.
- Carry cap, partial expiry, consumption order, encashment, forfeiture, reversal.
- Close failure and retry, duplicate scheduler delivery, worker crash recovery.
- Cross-year request segmentation and cancellation restoration.
- Mid-year policy version and entity transfer.
- Retroactive approval/cancellation after close.
- Tenant isolation and cross-tenant FK rejection.
- Projection rebuilt exactly from ledger.

