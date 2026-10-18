# DB-5 Historical Classification Report

Date: 2026-10-17  
Mode: Read-only; no automatic backfill

The classification API is tenant-scoped at `GET /api/v1/hr-admin/employment-history/classification/`. It reports employees lacking a canonical timeline and employees with multiple open assignments. It never creates, edits, or deletes history.

## Disposable evidence

Workspace `pw-qa-db5-classification` was provisioned in isolated PostgreSQL 16 with four synthetic employees.

```json
{
  "automatic_backfill_performed": false,
  "classification_mode": "read_only",
  "employee_count": 4,
  "multiple_open_timeline_count": 0,
  "without_timeline_count": 4
}
```

The workspace was deleted through `manage_playwright_workspace --cleanup`; `verified_absent` was true and the follow-up tenant count was zero.

## Migration policy

- Existing employee projections, movements, exits, payroll, leave, attendance, finance and audit records are not rewritten.
- A baseline is created only from an explicit approved source reference.
- New employees with a legal entity and joining date receive a timeline atomically from the approved create request.
- Ambiguous movement sequences, missing dates, multiple open ranges, rehire continuity and cross-entity transitions require manual review and approved policy.
- DB-5 preflight aborts if overlapping ranges already exist; it reports counts and performs no cleanup.

No Northstar, staging, production, customer, or shared certification data was inspected or changed.
