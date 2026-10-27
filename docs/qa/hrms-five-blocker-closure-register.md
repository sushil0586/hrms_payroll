# HRMS Five-Blocker Closure Register

Date: 2026-10-27

| Scenario | Current status | Missing decision/evidence | Required owner | Closure evidence |
|---|---|---|---|---|
| `STG-E2E-0710` | Blocked | Real SES delivery/isolation and external private object-storage controls have not been executed | Infrastructure and security owners | Allowed synthetic delivery, denied unauthorized recipient/access, encrypted private object, signed download expiry, audit trail and cleanup |
| `STG-E2E-0804` | Blocked | No approved effective-dated statutory specification and independent oracle | Payroll, legal/statutory and finance owners | Signed jurisdiction/entity/population/effective-date specification; deterministic expected values; browser/API/PostgreSQL reconciliation |
| `STG-E2E-1010` | Blocked | Provider/storage interruption, retry and recovery require deployed sandbox infrastructure | Finance integration and infrastructure owners | Failed/duplicate/out-of-order sandbox events, bounded retry, no premature Paid state, exact outstanding balance and finance reconciliation |
| `STG-E2E-1110` | Blocked | Import crash-recovery contract is unapproved and durable execution semantics are incomplete | Product, data and operations owners | Approved atomic/partial policy, durable source/job identity, lease/recovery, bounded retry, crash rehearsal, canonical replay and tenant-safe audit |
| `STG-E2E-1208` | Blocked | Pending-request reassignment policy is unapproved | HR policy, workflow product and security owners | Approved eligible statuses/roles/scope/SoD/notification policy; concurrent approve/reassign test; immutable old/new authority audit |

## Pilot treatment

- `0710`: exclude live document/email delivery; use synthetic allowlisted transport only.
- `0804`: do not run real payroll for affected statutory populations.
- `1010`: disable real provider payment and external finance transmission.
- `1110`: disable background/import crash replay; use only approved bounded synchronous import paths.
- `1208`: disallow reassignment; preserve the existing safe ownership restriction.

These exclusions may support a synthetic/shadow staging campaign only. They do not permit real-payroll production use or convert any scenario to Passed.
