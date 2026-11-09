# Employee Lifecycle EL-1B Certification

Date: 2026-11-05
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16 (`hrms_ess1`), Django, and production-built Next.js on loopback only

## Scope

EL-1B reconciled the current ESS self-profile contract, MSS manager surface, and HR employee create/edit lifecycle. No shared staging or production resource was used.

## Corrections

- Updated stale ESS browser assertions to recognize preferred name, personal email, and phone as explicitly editable self-service fields while work email and employment fields remain HR controlled.
- Added an accessible employee create/update success receipt after both full-page navigation and in-workspace dialog reconciliation.
- Made the structural-dependency browser test select a legal entity that actually owns an active branch instead of relying on option order.
- Classified the initial WebKit login failure as a local production-mode cookie configuration issue. WebKit rejects `Secure` cookies over loopback HTTP; the rerun used the supported local-only `HRMS_COOKIE_SECURE=false` override. Deployed cookie policy was unchanged.

## Browser evidence

| Suite | Chromium | Firefox | WebKit | Result |
| --- | ---: | ---: | ---: | --- |
| ESS dashboard/profile | 8/8 | 8/8 | 8/8 | PASS |
| MSS manager dashboard | 3/3 | 3/3 | 3/3 | PASS |
| Employee create/edit lifecycle | 12/12 | 12/12 | 12/12 | PASS |
| **Total** | **23/23** | **23/23** | **23/23** | **69/69 PASS** |

The ESS suite verified current profile values, self-service field boundaries, responsive layouts down to 320px, keyboard navigation, loading, timeout and 503 recovery, session isolation, and privileged-route denial. The MSS suite verified scoped manager queues, a clear-queue manager, direct destinations, 320px usability, and zero scoped AXE violations. The employee suite verified real page/dialog create and edit, required/email/date validation, duplicate-code rejection, dirty cancel, pending-state duplicate suppression, backend field mapping, uncertain network outcomes, refresh persistence, ESS denial, responsive behavior, and scoped WCAG scans.

## PostgreSQL and API evidence

Focused result: **12 passed**.

- ESS reads only its own profile and cannot access HR, manager, or platform endpoints.
- Self-service PATCH permits only preferred name, personal email, and phone; disallowed fields are rejected without mutation.
- Minimum employee creation atomically creates the employee, employment spell, current assignment, and source reference.
- Employee create/edit emits non-PII audit evidence with actor, tenant, resource, and changed-state attribution.
- Mandatory audit-write failure rolls the employee mutation back.

Django system check passed. Migration consistency reported no changes. The production build passed; the existing Autoprefixer warning at `globals.css:4686` remains unrelated.

## Scenario disposition

Passed in this wave: `ELC-011`, `ELC-014`, `ELC-016`, `ELC-019`, `ELC-020`, `ELC-023`, `ELC-024`, `ELC-025`, `ELC-026`, `ELC-027`, and `ELC-030`.

Partial: `ELC-012`. The manager dashboard and isolated manager scope passed, but the frozen contract specifically requires an explicit current-reportee listing and effective-date proof.

Still Not Run: `ELC-015`, `ELC-017`, `ELC-018`, `ELC-021`, `ELC-022`, `ELC-028`, `ELC-029`, `ELC-031`, and `ELC-032`. Existing neighboring evidence is not promoted as a substitute for each complete frozen contract.

## Cleanup and verdict

Every Playwright workspace used exact ownership manifests and completed the repository cleanup dry-run plus verified deletion path. The isolated database container and loopback services were removed after final verification.

EL-1B verdict: **PASS for the executed scope; overall Employee Lifecycle remains CONDITIONAL**. The next package should close explicit MSS reportee projection plus the remaining employee create/edit negative, concurrency, deactivate, and delete-protection contracts.
