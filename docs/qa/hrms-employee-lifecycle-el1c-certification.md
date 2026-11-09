# Employee Lifecycle EL-1C Certification

Date: 2026-11-05
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope and corrections

EL-1C closed the explicit MSS current-reportee projection and employee stale-write/delete-protection gaps.

- Added a manager-scoped current-reportee projection with employee code, name, department, and designation.
- Added an MSS current-reportee table with an explicit empty state and mobile containment.
- Added optional employee `expected_updated_at` revision handling under a database row lock. A stale browser draft is rejected without overwriting the committed revision.
- Kept employee hard delete unsupported and verified the record remains present after HTTP 405.
- Corrected the browser harness to use the authenticated page session for persistence assertions and real UI login across engines.

## Verification

Browser results:

| Suite | Chromium | Firefox | WebKit | Total |
| --- | ---: | ---: | ---: | ---: |
| Employee create/edit lifecycle | 13/13 | 13/13 | 13/13 | 39/39 |
| MSS manager dashboard | 3/3 | 3/3 | 3/3 | 9/9 |
| **Total** | **16/16** | **16/16** | **16/16** | **48/48** |

The browser campaign covered page and dialog create/edit, client and server validation, duplicate prevention, uncertain transport outcomes, responsive layouts, keyboard behavior, scoped WCAG scans, stale-write rejection, HR-route denial, direct-report visibility, empty reportee scope, and 320px usability.

Focused PostgreSQL/API result: **14 passed**. It covered direct-report scope, stale-write non-overwrite, HTTP 405 delete protection, duplicate code, self-manager rejection, date ordering, incompatible organization references, live-access deactivation protection, movement writeback, and exit protection.

Static and framework checks:

- TypeScript: PASS
- ESLint: PASS
- Django system check: PASS
- Migration drift: PASS, no changes detected
- Production build: PASS
- Diff whitespace check: PASS
- Existing Autoprefixer warning at `globals.css:4686`: unchanged

## Scenario disposition

Passed in EL-1C: `ELC-012`, `ELC-029`, and `ELC-032`.

Supporting evidence remains partial for `ELC-021`, `ELC-022`, and `ELC-031`: backend rejection and non-mutation are verified, but their complete frozen contracts still require dedicated browser evidence and, for deactivation, a successful access-disable-to-inactive sequence with historical reconciliation.

Still Not Run in the EL-1 create/edit range: `ELC-015`, `ELC-017`, `ELC-018`, and `ELC-028`. The current campaign did not prove every optional field, employee-code/phone boundary, whitespace/length boundary, or optional-field clearing contract.

Effective-dated manager-history scenarios `ELC-062`, `ELC-071`, and `ELC-072` remain outside this closure. A completed movement writeback passed, but former-manager history and effective-date scope transitions need their dedicated lifecycle package.

## Verdict

EL-1C executed scope: **PASS**. Overall Employee Lifecycle certification: **CONDITIONAL** because the explicitly listed validation, clearing, deactivation-success, and effective-dated manager-history contracts remain incomplete. No commit, push, deployment, shared staging mutation, email, or payroll execution occurred.
