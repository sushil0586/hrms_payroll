# HRMS Loading State Phase L4: Long-Running Operations

Date: 2026-10-16  
Decision: **CONDITIONAL**

Phase L4 closes the highest-risk payroll-job recovery path and establishes reusable, truthful transfer feedback for uploads and bounded downloads. It does not reconcile every upload, import, export, and background-operation family across all five portals, so application-wide loading certification is not claimed.

## Implemented

- Added `AsyncDownloadButton`, preserving link semantics and original URLs while exposing Preparing, Downloading, streamed byte counts, failure, and explicit Retry states.
- Added XHR-based multipart upload support with real `loaded/total` progress events and an accessible `UploadProgressStatus`.
- Migrated HR Admin and ESS employee-document uploads to stable pending controls, actual byte feedback, duplicate guards, retained input/file state on failure, and actionable errors.
- Migrated representative workforce, payroll-register, compliance-summary, ESS document, and ESS payslip downloads to the shared transfer primitive.
- Hardened `PayrollCloseActionsPanel` with immediate polling, bounded exponential backoff, abort-on-unmount, reconnecting state, secure terminal handling for 401/403/404, duplicate guards, and clear separation of accepted/queued from completed.
- Preserved durable job restoration across refresh/navigation and displayed only backend stages and completed item counts. No synthetic percentage was introduced.

No payroll formula, job-state model, API contract, RBAC rule, entitlement, audit behavior, or tenant-scoping rule changed.

## Measured Results

| Workflow | Injected condition | Feedback | Outcome |
| --- | ---: | ---: | --- |
| Workforce export | 2,000 ms HTTP 503 | 158 ms | Error, Retry, then 750 ms successful download |
| Employee document upload | 2,000 ms HTTP 503 | 164 ms | One request; title and file retained |
| Payroll calculation | Real Redis/Celery/beat | Immediate queued state | Reload recovery and completion passed in 9.0 s |

Desktop and 390x844 compact layouts passed without document-level horizontal overflow. Pending states use `aria-busy`; failures use alerts; progress values come from transfer bytes or persisted backend job counts.

## Verification

- Focused L4 Playwright against the production build: **2 passed (30.0s)**.
- Real payroll background-job browser recovery: **1 passed**.
- Workforce report neighboring regression: **2 passed**.
- Backend payroll/job/RBAC/upload/export checks: **9 passed**.
- TypeScript: passed.
- Focused ESLint: passed.
- Production Next.js build: passed with the pre-existing Autoprefixer warning.
- Disposable tenant and temporary broker/process artifacts: removed and absence verified.

Historical environmental evidence is preserved: a worker-only payroll run remained queued until the existing outbox dispatcher supplied by Celery beat was started. This confirms beat is an operational dependency, not an optional process.

## Tracker Reconciliation

Updated families: LS-011, LS-017, LS-018, LS-038, LS-042, and LS-046. The 46-family tracker now records **5 verified, 20 partial, 19 open, 1 covered, and 1 audited**.

Remaining L4 gaps include the complete 35-report migration, provider export/rehearsal feedback, every CSV batch-import recovery path, ESS success-refresh evidence with assigned document requirements, payslip modal download feedback, explicit tenant-keying of browser job persistence, a fresh two-tenant direct job-status denial run, and long-running Platform/Tenant operations that do not yet expose durable backend jobs. Existing backend permission denial passed, but it is not presented as new cross-tenant execution evidence.

Evidence: `docs/qa/evidence/loading-state-l4/001-phase-l4-execution-log.md`.

## Decision

**CONDITIONAL.** Critical payroll durability and representative transfer feedback are verified without business-rule changes. Remaining partial/open families are explicit and prevent an application-wide PASS or any production-readiness claim.
