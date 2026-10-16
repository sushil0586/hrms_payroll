# Docker Performance Phase 5D - Payroll Volume and Background Reliability

Date: 2026-10-16  
Environment: isolated production-built local Docker  
Decision: **CONDITIONAL**

## Scope and architecture

The stack contained PostgreSQL 16, Redis 7, Django/Gunicorn, production-built Next.js, a Celery worker, and Celery beat. Gunicorn used four synchronous workers. Celery used two prefork workers. The host exposed 10 CPUs and 24 GiB RAM; Docker exposed 10 CPUs and 7.75 GiB RAM.

Payroll calculation, review, final lock, output generation, publication, and finance-handoff generation are synchronous service/API operations. They are **not Celery jobs**. Provider submission/retry uses the separate durable `PayrollProviderJob` ledger and `process_payroll_provider_jobs` worker command. Celery currently processes notifications. This report keeps those three execution paths separate.

An unrelated `edutech` web container consumed about 26% CPU at preflight. It was not stopped. Payroll timings are valid local observations but not isolated staging capacity claims.

## Configuration and preflight

- PostgreSQL: `max_connections=100`, `shared_buffers=128MB`, `work_mem=4MB`, `effective_cache_size=4GB`, `track_io_timing=on`, `pg_stat_statements` enabled.
- Gunicorn: 4 synchronous workers, 60-second request timeout.
- Celery: Redis broker/result backend, concurrency 2, prefork pool, prefetch count 8.
- All six containers were healthy with zero restarts and zero OOM events.
- Final database state: 83 MB, one observed connection, zero lock waiters, zero deadlocks.
- Redis final use: 1.66 MB; Celery queue depth: 0.

The strict production preflight correctly failed seven local-only deployment gates: secure cookies, live email, enterprise identity declaration, provider credentials, protected artifact-storage credentials, and storage policy. A temporary HTTP-only health probe was used for this isolated benchmark. Those failures remain staging/release gates and were not bypassed in application settings.

## Deterministic fixture

The supported `manage_playwright_workspace` command created two disposable Enterprise workspaces. The primary workspace contained 2,500 deterministic payroll employees with a single calendar-consistent pay group/period, active salary assignments, statutory profiles, locked input snapshots, synthetic bank data, and two rules:

- Gross earning: INR 50,000 per employee.
- Employee statutory deduction: INR 5,000 per employee.
- Expected net: INR 45,000 per employee.

Separate immutable run codes were used for 100, 500, 1,000, and 2,500 employees. No Northstar or customer data was read or mutated.

## Volume results

| Employees | Calculate | Generate outputs | Publish | Finance handoff | Measured E2E | Artifact count | Artifact bytes | Result |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 100 | 0.723 s | 0.506 s | 1.237 s | 0.085 s | 2.620 s | 104 | 244,505 | PASS |
| 500 | 3.724 s | 2.545 s | 6.057 s | 0.322 s | 12.788 s | 504 | 1,220,505 | PASS |
| 1,000 | 8.410 s | 5.487 s | 12.256 s | 0.536 s | 26.888 s | 1,004 | 2,441,505 | PASS |
| 2,500 | 24.632 s | 13.610 s | 41.178 s | 1.500 s | 81.322 s | 2,504 | 6,103,005 | PASS |

All four persisted runs passed these checks:

- employee and payslip counts matched the requested volume;
- gross, deductions, and net reconciled exactly;
- calculation error count was zero;
- one register plus bank advice, accounting export, and statutory report existed;
- input source hashes were populated and final runs remained locked;
- duplicate publication returned the existing batch;
- duplicate finance-handoff generation returned the existing handoff;
- regeneration of a published output batch was rejected.

At 2,500 employees, totals were gross INR 125,000,000, deductions INR 12,500,000, and net INR 112,500,000.

## Resource and SQL findings

- Peak sampled backend CPU: 91.64%; peak backend memory: approximately 640 MiB.
- Peak sampled PostgreSQL CPU: 47.99%; peak PostgreSQL memory: approximately 129 MiB.
- Celery worker remained around 215 MiB because payroll processing is synchronous and did not run in Celery.
- The dominant SQL family was an 8,200-call per-calculation-line duplicate check (4.83 seconds cumulative).
- Output generation/publication made roughly 4,100 per-artifact uniqueness checks, updates, inserts, access-event writes, and notification writes.
- Publication is the primary volume bottleneck: 41.18 seconds at 2,500 employees, versus 24.63 seconds calculation and 13.61 seconds output generation.

No speculative optimization was made in this phase. Candidate follow-up work is bulk-safe calculation-line insertion and durable batched publication/notification, preserving append-only evidence and idempotency.

## Async, retry, and idempotency

Celery notification execution through the project app completed successfully:

- submit overhead: 49.45 ms;
- queue plus worker execution: 52.36 ms;
- final status: successful;
- final Redis queue depth: 0.

A controlled invalid provider-submission job validated the durable provider ledger:

- first enqueue created one job; duplicate enqueue returned the same ID;
- initial queue wait: 26.42 ms;
- attempt 1 failed safely and returned to `queued` with retry schedule;
- attempt 2 reached the configured maximum and moved to `dead_lettered`;
- lease-acquisition/runtime evidence was retained for both attempts.

Focused backend tests also passed provider retry, dead-letter, heartbeat, stale recovery, callback idempotency, adapter credential boundaries, payslip visibility, and artifact-download permission checks.

## UI feedback

Three production-Docker Playwright scenarios passed for calculation, review/approval/lock/output, and publication/handoff controls. The shared payroll action panel immediately:

- changes the active button label to `Working...`;
- disables every mutation control while one request is active;
- publishes success through `role=status` and failures through `role=alert`;
- restores controls in `finally` after success or failure;
- preserves profile references and comments on recoverable failure.

This feedback is truthful for synchronous requests but is not durable job progress. Reloading or losing the connection cannot recover payroll calculation/publication progress because those operations have no backend job record. No artificial percentages are shown.

## Regression results

- Payroll backend model/service regression: **17 passed**.
- Provider/RBAC/artifact backend regression: **7 passed**.
- Docker Playwright payroll action controls: **3 passed**.
- TypeScript (`tsc --noEmit`): **passed**.
- Production backend and frontend images: **built and executed successfully**.
- Container restarts/OOM/deadlocks/lock waits: **0**.

## Cleanup

Both owned tenants were deleted through `manage_playwright_workspace --cleanup`. The command reported `verified_absent: true` for each tenant, and a final database query confirmed both tenant codes absent. The isolated stack and volumes were then removed.

## Decision and limits

**CONDITIONAL**

Local correctness is verified through 2,500 employees, which is the maximum payroll volume verified in this phase. Financial reconciliation, immutable inputs, output persistence, duplicate prevention, provider retry/dead-letter behavior, RBAC regressions, and cleanup passed.

The following prevent a full PASS:

1. Payroll calculation/publication is synchronous and has no durable pending/processing/recovery record.
2. The 2,500-employee publication step takes 41.18 seconds and approaches the 60-second Gunicorn timeout if invoked through one HTTP request.
3. Interactive API latency during an active payroll calculation was not certified as a background-job property because payroll is not queued; a shell-triggered synchronous benchmark would not model the request queue accurately.
4. Live provider transmission, real payments, email delivery, and protected external artifact storage were intentionally not exercised locally.
5. Strict production preflight remains red for the seven expected external/deployment gates.

## Staging sizing and next gate

For an initial isolated staging experiment, start with at least:

- application: 4 vCPU and 4 GiB RAM, four Gunicorn workers;
- worker: 2 vCPU and 2 GiB RAM, Celery concurrency 2;
- PostgreSQL: 4 vCPU and 8 GiB RAM with monitored connection/IO limits;
- Redis: 1 vCPU and 1 GiB RAM;
- protected object storage and real non-production provider/email credentials.

Staging must test 2,500-employee calculation and publication through the real HTTP/UI path, concurrent interactive traffic within the previously verified 25-user envelope, worker interruption/restart, external artifact access, and provider sandbox retry. A durable payroll job design is recommended before certifying larger volumes or connection-loss recovery.

## Evidence

Evidence is under `docs/qa/evidence/docker-performance-phase5d/`. Key files:

- `001-host-and-docker-preflight.txt`
- `010-preflight-failure.json`
- `012-idle-and-celery-baseline.txt`
- `017-payroll-volume-results.jsonl`
- `023-payroll-volume-results-500-2500.jsonl`
- `026-payroll-volume-results-1000-2500.jsonl`
- `031-provider-failure-idempotency.json`
- `034-celery-notification-task-project-app.json`
- `036-persisted-volume-reconciliation.json`
- `037-top-sql.csv`
- `038-payroll-backend-regression.log`
- `039-web-typecheck.log`
- `040-final-infrastructure-state.txt`
- `041-main-cleanup.json`
- `044-isolation-cleanup.json`
- `045-cleanup-verification.txt`

## Exact command families

```text
docker compose --project-name hrms-perf-p5d --env-file .env.production \
  -f docker-compose.production.yml -f docker-compose.performance-phase5d.yml up -d --build ...
docker compose ... --profile release run --rm migrate
docker compose ... exec -T backend python manage.py manage_playwright_workspace --seed-ref <seed>
docker compose ... exec -T backend sh -c 'python manage.py shell < /tmp/certify_payroll_volume.py'
docker compose ... exec -T backend python manage.py process_payroll_provider_jobs ...
pnpm --dir web exec playwright test tests/e2e/phase5b-payroll-close-action-controls.spec.ts \
  --project=chromium --workers=1 --grep 'calculation page|review page|outputs page'
backend/.venv/bin/pytest -q apps/payroll/tests.py
backend/.venv/bin/pytest -q tests/test_phase0_api_smoke.py::<focused tests>
pnpm --dir web typecheck
docker compose ... down -v --remove-orphans
```

This local Docker result does not establish production readiness.
