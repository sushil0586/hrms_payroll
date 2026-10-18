# DB-5 Employee Lifecycle Transition Matrix

Date: 2026-10-17

| Transition | Current behavior | Atomic effects | Decision gate / limitation |
|---|---|---|---|
| New join | Employee create with legal entity and joining date creates spell 1 and assignment 1 | Employee and timeline commit together | Incomplete create payload remains visible in classification report |
| Probation/confirmation | Existing lifecycle records retained | Current employee dates remain source for existing workflow | Rich effective-dated probation versions not added |
| Promotion/designation | Completed movement closes prior assignment and creates the new assignment | Employee projection changes only when effective | Same-day replacement requires correction workflow |
| Department/location/branch transfer | Same as promotion; historical scope remains queryable | Leave/attendance resolve organization as of business date | Cross-entity transitions are separately blocked |
| Manager change | Reporting manager is copied into each assignment version | Historical manager is preserved | Manager must be in the same tenant at DB level |
| Salary revision | Existing salary assignment model retained | Active range overlap rejected under concurrency | Salary API remains the approved entry path |
| Suspension/return | Spell supports `suspended` and `active` states | No implicit entitlement conversion | Operational transition API is not yet approved |
| Exit/FnF | Existing exit and settlement controls retained | Protected payroll/finance history remains immutable | `EmployeeExit` is still one-to-one; spell-close orchestration remains pending |
| Rehire | Stable employee identity and multiple spells can represent rehire | No automatic historical rewrite | Rehire continuity, statutory tenure and leave conversion policy remains unapproved; completion is blocked |
| Cross-legal-entity transfer | Service rejects completion before any mutation | Transaction rolls back fully | Leave preserve/convert/encash/forfeit, fiscal, statutory and continuity decisions are required |
| Retroactive correction | Data model supports linked correction evidence | Corrected versions are excluded from active overlap | Administrative correction workflow is pending approval |

Unsupported transitions fail with actionable validation and do not partially mutate employee, payroll, leave, attendance, or statutory state.
