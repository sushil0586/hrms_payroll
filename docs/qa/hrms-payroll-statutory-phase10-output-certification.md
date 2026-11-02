# HRMS Payroll Statutory Phase 10 Output Certification

Date: 2 November 2026
Environment: task-owned PostgreSQL 16, Redis, Celery worker and Beat, Django, and production-built Next.js
Verdict: PASS for sealed output generation, controlled publication, and employee-scoped payslip access

## Scope

This phase verifies the boundary from a final-locked payroll review through output generation, publication, and ESS payslip access. All identities, payroll records, and artifacts were synthetic and tenant-scoped.

Excluded from execution: finance handoff generation, provider transmission, payment or bank processing, statutory filing, shared staging, and production.

## Controls verified

- Output generation required a final-locked review and revalidated its sealed calculation evidence.
- The output batch retained the canonical calculation-evidence payload and its SHA-256 hash.
- The payslip and payroll register retained the same evidence hash.
- Artifact source hashes and stored-file checksums were revalidated immediately before publication.
- A deliberately tampered generated payslip source hash returned HTTP 400 and did not publish the batch.
- Generated output remained absent from ESS until publication completed.
- Generation and publication executed through the durable database job, Celery Beat dispatcher, Redis broker, and Celery worker path.
- The HR detail surface exposed reconciliation and storage-governance evidence before publication.
- Finance handoff remained unavailable while the output batch was generated.
- After publication, the employee could review and download the payslip; the response checksum matched the artifact checksum.
- A second employee could not download the first employee's payslip.

## Results

| Verification | Result |
| --- | --- |
| Focused PostgreSQL/Django regression | 5 passed |
| Production-build Playwright | 1 passed, 1 worker |
| Durable generation and publication jobs | Passed |
| Evidence hash propagation | Passed |
| Tampered-artifact publication denial | Passed |
| Pre-publication ESS hiding | Passed |
| Employee download checksum | Passed |
| Cross-employee download denial | Passed |
| TypeScript and focused ESLint | Passed |
| Django checks and migration drift | Passed; no changes detected |
| Production frontend build | Passed |

The production build retained one pre-existing Autoprefixer warning at `globals.css:4677`, recommending `flex-end` instead of `end`; compilation and all 312 static page generations completed.

## Operational note

Payroll background jobs are intentionally durable: API requests persist queued work and Celery Beat dispatches it to a worker. An isolated verification stack therefore requires `REDIS_URL` to point Django, Beat, and workers at the same broker and requires Beat to be running. A worker alone does not dispatch queued database jobs.

## Stop boundary

The verified published batch is eligible for a separately governed finance-handoff phase. This certification does not authorize or claim provider delivery, bank-file use, employee payment, statutory filing, shared-staging mutation, or production operation.

## Cleanup

The governed workspace cleanup command was run against the exact synthetic seed reference with private-file deletion confirmation. Task-owned application processes, Redis and PostgreSQL containers, temporary fixture files, and Playwright artifacts were removed after verification.
