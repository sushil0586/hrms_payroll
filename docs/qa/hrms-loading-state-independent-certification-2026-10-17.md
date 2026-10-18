# HRMS/Payroll Loading-State Independent Certification

Date: 2026-10-17  
Scope: HR Admin, ESS, MSS, Tenant Admin, and Platform Admin  
Environment: local production-capable build with live Django API and isolated Playwright fixtures  
Decision: **CONDITIONAL**

## Certification statement

The implemented loading and asynchronous-feedback architecture is suitable for continued staging validation. No unresolved P0 loading defect, authorization bypass, tenant-isolation defect, payroll-integrity defect, duplicate financial mutation, or user-visible stuck-action defect was found in the executed certification scope.

Application-wide unconditional certification is not granted. The frozen 46-family tracker contains 12 Verified, 2 Covered, 32 Partial, and 0 Open families. Partial means implementation or representative coverage exists, but at least one documented route-specific failure, persistence, focus, timeout, or fault-injection matrix has not been independently executed.

## Certified behavior

- Route navigation provides immediate localized feedback, clears on completion/error/cancellation, restores destination-heading focus, preserves query state, and resolves rapid navigation to the latest destination.
- Employee detail selection highlights immediately, renders a stable accessible skeleton, prevents stale employee rendering, supports Retry, and restores query state through browser history.
- Shared mutation controls block duplicate submissions, expose truthful operation-specific labels, retain values on recoverable errors, and return to an actionable state.
- Search, filters, pagination, imports, uploads, downloads, dialogs, and representative reports retain usable content while work is pending and do not announce success before backend confirmation.
- Durable payroll jobs expose persisted queued/running/succeeded/failed state, bounded polling, reload recovery, secure status access, idempotency, and stale-worker recovery.
- Compact desktop/mobile dimensions, `aria-busy`, live status announcements, keyboard behavior, and reduced-motion behavior passed the focused browser checks.

## Independent execution results

| Suite | Result |
| --- | ---: |
| Shared loading-feedback browser suite | 31 passed |
| Governance and Platform permission browser suite | 16 passed |
| ESS/MSS/Tenant neighboring browser suite | 19 passed |
| Payroll/report browser suite | 11 passed, 1 fixture-limited |
| Payroll durability/RBAC/upload/export backend suite | 9 passed |
| TypeScript | Passed |
| Focused ESLint | Passed |
| Next.js production build | Passed, 273 pages |
| Django system check | Passed, 0 issues |
| Disposable `PW-QA-*` tenants after cleanup | 0 |

The fixture-limited browser test was `payroll-background-job-recovery.spec.ts`; this invocation did not have `PLAYWRIGHT_PAYROLL_BACKGROUND_RUN_ID`. It is not counted as passed. Its exact durable reload behavior has prior passing evidence from an authorized disposable Enterprise workspace with Redis, Celery worker, and beat in `docs/qa/evidence/loading-state-l4/001-phase-l4-execution-log.md`.

## Defects closed during final verification

1. Methodless React mutation forms were incorrectly treated as GET navigation by shared navigation capture because the DOM `form.method` property defaults to `get`. Capture now requires an explicitly declared GET method or explicit server action.
2. Employee shift assignment and shift roster saves now use the shared pending control, synchronous duplicate guards, transport recovery, and one authoritative success navigation.
3. Platform permission Reset now remounts uncontrolled filters from URL state, preventing stale visible filters from contaminating later queries.
4. Tenant fault-injection automation now derives the backend origin from `HRMS_API_BASE_URL` instead of assuming port 8001.

## Residual certification exclusions

The 32 Partial rows in `docs/qa/hrms-loading-state-coverage.csv` remain the source of truth. The highest-risk exclusions are:

- failed auxiliary employee dialog hydration with trigger-focus restoration;
- attendance edit/review failure and persistence matrices;
- leave-balance transaction and cancellation/restoration feedback;
- successful mutable ESS document and statutory-declaration persistence fixtures;
- Tenant role/status and support decision persistence matrices;
- Platform onboarding stage-by-stage recovery;
- payroll provider rehearsal durability;
- complete report-family delayed/error matrices;
- slow/revoked-session no-content-flash checks;
- shared timeout/error taxonomy for remaining native `fetch` consumers;
- broad bespoke-dialog completion-focus and announcement checks.

These are evidence gaps or lower-level consistency gaps, not silently accepted passes. Any staging observation of duplicate mutation, false success, authorization leakage, payroll inconsistency, or unrecoverable disabled controls changes this decision to FAIL.

## Evidence

- `docs/qa/hrms-loading-state-coverage.csv`
- `docs/qa/hrms-loading-state-final-closure-2026-10-17.md`
- `docs/qa/evidence/loading-state-final-closure/007-payroll-report-regression.log`
- `docs/qa/evidence/loading-state-final-closure/008-typecheck-final.log`
- `docs/qa/evidence/loading-state-final-closure/009-eslint-final.log`
- `docs/qa/evidence/loading-state-final-closure/010-production-build-final.log`
- `docs/qa/evidence/loading-state-final-closure/011-django-check-final.log`
- `docs/qa/evidence/loading-state-final-closure/012-fixture-cleanup-final.log`
- `docs/qa/evidence/loading-state-final-closure/013-certification-backend.log`

## Release disposition

- Loading-state certification: **CONDITIONAL**.
- Staging entry for focused validation: **GO**, provided the residual exclusions remain tracked and staging uses non-production synthetic data.
- Production readiness: **NOT CERTIFIED** by this local loading-state exercise.
- Unconditional loading-state PASS requires executed evidence for every applicable Partial-family acceptance criterion, or a documented product-owner/security risk acceptance for criteria proven non-applicable.

