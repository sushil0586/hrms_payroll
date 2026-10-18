# DB-5 Database/API/Frontend Impact Matrix

Date: 2026-10-17

| Layer | Consumer | Change | Compatibility |
|---|---|---|---|
| PostgreSQL | Employment spell/assignment | Additive tables, date checks, tenant/scope and concurrent-overlap triggers | Existing employees remain unchanged |
| PostgreSQL | Salary/pay-group/statutory assignments | Concurrent active-range guard | Existing preflight must be clean before activation |
| PostgreSQL | Leave/attendance assignments | Add nullable dates and exact-scope/equal-priority overlap guard | NULL preserves unclassified legacy semantics |
| Django service | Employee movement | Locked, idempotent assignment transition; future projection is not applied early | Cross-entity and same-day replacement fail closed |
| Django service | Employee create | New complete records receive initial spell/assignment atomically | Incomplete legacy-compatible create remains classified |
| Django selector | Leave/attendance | Resolve policy against historical employment scope and assignment date | Current-date callers keep current behavior |
| API | Policy assignments | Read/write `effective_from` and `effective_to`; validate ordering | Fields are optional for legacy compatibility |
| API | History classification | New tenant-scoped read-only endpoint | No mutation or implicit backfill |
| Frontend | Leave/attendance policy assignments | Compact effective-from/to inputs and CSV columns | Existing layout and API route retained |
| HR Admin lifecycle | Movement create/edit | Existing UI receives actionable transition errors | No redesign; completed movement now requires classified history |
| ESS/MSS | Leave/attendance views and approvals | Historical business date selects the correct org policy | Existing contracts retained |
| Payroll/background jobs | Payroll snapshots and calculation | Existing effective-dated salary/pay-group/statutory selectors retained and DB-hardened | No formula or job-state change |
| Reporting | Historical employee scope | Canonical resolver available for classified employees | Legacy fallback is explicitly labeled `legacy_employee_projection` |

No Celery task was added: DB-5 does not require a timer to activate future rows because selectors resolve by business date. A future projection materializer may be added only if a measured consumer requires it; correctness does not depend on such a job.
