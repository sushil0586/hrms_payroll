# DD-4 Attendance Domain Certification

Date: 2026-10-18  
Environment: isolated PostgreSQL 16 (`hrms_dd4`), production-built Next.js, Django base settings  
Decision: **CONDITIONAL**

## Frozen Scope

DD-4 in the original 81-scenario matrix is the Attendance domain. No scenarios were renamed or added.

| ID | Outcome | Certification statement |
| --- | --- | --- |
| DD-AT-001 | Verified | Prior DB-6.5/6.5A evidence retained for punch, regularization, approval and monthly close reconciliation. |
| DD-AT-002 | Verified | Prior overnight, holiday, weekly-off and leave precedence evidence retained. |
| DD-AT-003 | Verified | Prior PostgreSQL close, decision and late-write race evidence retained. |
| DD-AT-004 | Partial | Effective-date and close guards are proven, but a connected browser journey showing a retroactive roster/policy edit beside an unchanged historical close/report remains absent. |
| DD-AT-005 | Verified | Browser partial-conflict rollout and replay passed; injected audit-write failure rolls back assignments and rollout audit atomically. |
| DD-AT-006 | Verified | Configured holiday/weekly-off precedence, missing punch, grace/late, half-day, overtime derivation and payroll-impact summaries passed. |
| DD-AT-007 | Blocked | Overtime evidence is derived, but eligibility approval, rates and payroll conversion have no approved policy or authoritative end-to-end implementation. |
| DD-AT-008 | Partial | CSV partial failure and duplicate replay after reload are safe; durable biometric source identity and crash/replay recovery are not implemented. |

Counts: **5 Verified, 2 Partial, 0 Missing, 1 Blocked, 0 Failed, 0 Not Run**.

## Confirmed Defects And Remediation

### Roster rollout atomicity

Before remediation, an injected failure while writing `ShiftRosterRolloutItem` records left two employee shift assignments committed without their rollout audit. The service did not define a transaction boundary.

`preview_shift_roster_template_rollout` is now atomic. The same injected failure leaves zero assignments and zero rollout records. A retry test also proves that a completed rollout followed by the same request creates no duplicate assignments.

### Roster-template post-save navigation

The browser received HTTP 201 and the template persisted, but the compact form remained on `/hr-admin/shift-roster-templates/new`. The client-router transition did not complete in the production build. Successful saves now perform a deterministic same-origin navigation; network errors restore the action and preserve form values. The browser workflow reaches the roster list and independently resolves the persisted template by its unique code.

No attendance, leave or payroll calculation rule changed.

## Browser, API And PostgreSQL Evidence

- `009-browser-postgres-base-settings.log`: one complete Playwright scenario passed in 22.4 seconds.
- Browser-created published roster template; API returned 201 and subsequent authenticated lookup returned its persisted ID.
- First rollout: two targets, one created and one skipped because of an existing primary assignment.
- Replay: zero created and two skipped; no duplicate employee assignment.
- Attendance CSV: one valid and one unknown employee row; only the valid row committed.
- Reload and replay: zero ready rows and disabled commit; authenticated API returned exactly one matching attendance record.
- `001-postgresql-attendance-regression.log`: the pre-fix atomicity regression failed before the service change, then focused tests passed.
- `014-postgresql-neighboring-regression.log`: 30 attendance, close, derivation, regularization and DD-4 PostgreSQL tests passed.

Celery was not involved in the current synchronous roster and CSV-import paths. Its absence is not represented as evidence: durable biometric/import crash recovery remains Partial under DD-AT-008.

## Integrity And Downstream Findings

- Monthly close snapshots, locked attendance records and payroll-input close references remain guarded by the DB-6.5A tests.
- Configured attendance derivation continues to expose payable/LOP evidence without approximating per-employee rules.
- Cross-tenant ownership and API authorization remain covered by the retained DB-6 evidence and disposable-workspace browser session.
- Roster rollback now keeps operational assignments and audit history consistent.
- The test workspace cleanup command completed from `finally`; no Northstar, staging, production or customer data was used.

## Verification

```text
pytest DD-4 + attendance + monthly-close regressions: 30 passed
Playwright DD-AT-005/008 composite:              1 passed
TypeScript:                                      passed
Focused ESLint:                                  passed
Django check:                                    passed
Migration drift:                                 none
Production Next.js build:                        passed
```

The production build initially exposed the stale Cancel router reference and was rerun successfully after correction. Historical failed/interrupted logs `002` through `008` are retained; they are not counted as passes.

## Remaining Decisions And Gates

1. Approve overtime eligibility, maker/checker approval, rate/effective-date and payroll/statutory conversion rules before implementing DD-AT-007.
2. Define and implement durable biometric source-event identity, resumable job state and crash/replay recovery before completing DD-AT-008.
3. Execute a connected browser historical-report scenario for retroactive roster/policy changes before completing DD-AT-004.

DD-4 is **CONDITIONAL**. No unresolved executed defect caused financial corruption or tenant leakage, but policy and evidence gaps remain. Production readiness is not claimed.
