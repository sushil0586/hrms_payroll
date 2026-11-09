# Employee Lifecycle EL-1D Certification

Date: 2026-11-05
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope

EL-1D closed the executable employee validation and optional-data gaps carried from EL-1C.

- Employee codes now accept only letters, numbers, periods, underscores, slashes, and hyphens, with a 50-character limit.
- Phone numbers now require permitted phone punctuation and 7 to 15 digits.
- Browser and API validation use the same messages and reject invalid writes before persistence.
- Name and code inputs expose the API length boundaries in the browser.
- Optional text and date values were created, refreshed, cleared, and independently reconciled from PostgreSQL-backed API state.
- The edit form no longer offers the current employee as their own reporting manager; the API safeguard remains in place.

## Verification

PostgreSQL/Django:

- Focused integrity gate: **12 passed**.
- Additional whitespace and length boundary gate: **5 passed**.
- Covered invalid code/phone formats, whitespace-only required values, overlength code, optional clearing, self-manager rejection, incompatible structure rejection, stale writes, access-before-inactivation protection, movement writeback, and non-mutation on rejection.

Browser:

- Full phase-3 campaign before the self-manager correction: **44 passed, 1 WebKit diagnostic failure**.
- WebKit full-project qualification after classifying the same-origin RSC prefetch diagnostic: **15/15 passed**.
- Final-code focused format and self-manager regression: **6/6 passed** across Chromium, Firefox, and WebKit.
- Scoped WCAG checks in the full campaign reported no violations.

Framework gates:

- TypeScript: PASS
- ESLint: PASS
- Django system check: PASS
- Migration drift: PASS, no changes detected
- Production build: PASS
- Existing Autoprefixer warning at `globals.css:4686`: unchanged

## Scenario disposition

Promoted to Passed: `ELC-017`, `ELC-018`, `ELC-021`, `ELC-022`, and `ELC-028`.

`ELC-015` is Partial. Optional names, contact data, milestone dates, persistence, refresh, and clearing passed. A single browser creation carrying every optional organization and reporting relationship simultaneously was not executed.

`ELC-031` remains Partial. Live-access inactivation rejection is proven, but the complete successful access-disable-to-inactive sequence and historical reconciliation were not executed as one browser contract.

`ELC-062`, `ELC-071`, and `ELC-072` remain Not Run. Current reportee projection and movement writeback are supporting evidence only; effective-date transition, former-manager historical visibility, current-queue removal, and new-manager scope must be executed together in the dedicated manager-history package.

## Verdict

EL-1D executed scope: **PASS**. Overall Employee Lifecycle certification remains **CONDITIONAL** on `ELC-015`, `ELC-031`, and the effective-dated manager-history package. No commit, push, deployment, shared staging mutation, email, or payroll execution occurred.
