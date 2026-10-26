# STG-0B Celery Beat Durability

Date: 2026-10-26
Status: **PARTIAL / remediation required**

## Findings

- Staging Compose starts `celery -A config beat -l INFO` without `--scheduler`, `--schedule`, or a dedicated volume.
- Celery therefore uses its default `PersistentScheduler` and local `celerybeat-schedule` file.
- The repository contains a 12 KiB SQLite-format `backend/celerybeat-schedule`, owned by the local user and mode `0644`; this is not deployment evidence.
- The container filesystem is ephemeral. The Compose file does not persist or isolate the schedule file.
- Compose defines exactly one beat service, but no distributed lock prevents a second manually started scheduler.
- Previous staging logs recorded schedule corruption; Celery deleted/recreated the file and resumed. Recovery was automatic but caused a durability gap and is not proof against duplicate dispatch.
- Business jobs have meaningful database idempotency and stale-worker recovery, reducing effect duplication, but scheduler state itself is not durable.

## Scheduled Work

The checked-in schedule dispatches leave auto-approvals, payroll background jobs, leave-year close runs, and optionally pending notifications. These tasks must remain idempotent because beat delivery is at-least-once.

## Safe Recovery Procedure

1. Confirm only one beat instance is active.
2. Record logs, task backlog and the affected schedule-file checksum.
3. Stop only the beat service during an approved maintenance window; do not stop workers.
4. Quarantine the corrupt file rather than silently overwriting evidence.
5. Start one beat instance and verify due tasks plus database-level idempotency.
6. Confirm no duplicate payroll, leave-close, notification or provider effect.

This procedure was not executed on shared staging in STG-0B.

## Recommended Architecture

Prefer `django-celery-beat` with PostgreSQL-backed schedules and one elected beat instance, or retain static code schedules while running beat as a supervised singleton with a dedicated persistent volume. A database scheduler adds operational schema and migration responsibilities; it is justified only if schedules must change at runtime. Static schedules still require singleton enforcement, monitoring and idempotent tasks.

## Regression Coverage

Existing tests verify duplicate dispatch and worker retry safety for leave-year close and payroll background jobs. `backend/tests/test_staging_configuration.py` passed. No safe unit test can certify file locking or container interruption; an isolated Compose interruption test is still required. Shared beat was not restarted.

## Acceptance Criteria

- Explicit scheduler and schedule location
- Singleton enforcement
- Writable directory owned by the service user with restrictive permissions
- Corrupt-file alert and documented quarantine recovery
- Isolated abrupt-stop/restart evidence
- No duplicate business effects after redelivery
- Queue/last-success monitoring for each scheduled task family
