# Employee Lifecycle EL-1N Directory Certification

Date: 2026-11-06
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope

EL-1N certifies the complete employee-directory contract in `ELC-001` through `ELC-010`. It preserves all later lifecycle statuses and historical EL-1A evidence.

## Corrections

- Added an explicit directory refresh action with pending state, one recoverable error notice, retained last-confirmed rows, and bounded retry.
- Hid pagination when a filter produces no records.
- Restored a responsive advanced-filter disclosure so the table remains reachable on mobile while Search and Apply/Reset remain immediately available.
- Active advanced filters reopen after apply, survive refresh/back navigation, and collapse after reset.
- Reconciled production authentication and current in-flow button/dialog behavior in the Phase 2 browser fixtures.

## Scenario Results

| Range | Result | Evidence |
| --- | --- | --- |
| ELC-001 to ELC-003 | Passed | Scoped totals, privacy-safe list response, name search, partial/exact employee-code search, Enter and Apply. |
| ELC-004 to ELC-005 | Passed | Department/status and manager/readiness dropdown-only filters, URL serialization, refresh and history restoration. |
| ELC-006 | Passed | Name and employee-code sorting in both directions with stable ordering and page reset. |
| ELC-007 | Passed | Page size, next page, stale page clamping, empty state, accurate counts, and hidden empty pagination. |
| ELC-008 to ELC-009 | Passed | Pointer/keyboard detail selection, close focus, URL state, refresh, Back/Forward, and stale-selection clearing. |
| ELC-010 | Passed | Deterministic list failure shows one error without false empty state; confirmed rows remain and Retry recovers. |

## Verification

- Production-built directory and Phase 2 campaign: **51 passed, 0 failed** across Chromium, Firefox, and WebKit.
- Additional privacy response-shape qualification: **3 passed, 0 failed** across all three engines.
- Focused Django/PostgreSQL directory, detail, manager-readiness, and authorization selection: **5 passed, 0 failed**; 412 deselected.
- TypeScript: PASS.
- Focused ESLint: PASS.
- Production build: PASS, with the pre-existing CSS autoprefixer warning only.
- Django system checks and migration drift: PASS.
- Accessibility: scoped WCAG 2 A/AA and 2.1 AA scan reported no violations.
- Responsive evidence: 1440, 1024, 768, 390, and 320 pixel layouts; mobile keyboard table scrolling and filter disclosure passed.

## Register Result

Newly Passed: **10**.
Global lifecycle register after EL-1N: **84 Passed, 0 Failed, 3 Blocked, 13 Not Run**.

## Verdict

EL-1N is **PASS**. The employee directory is certified for its frozen ten-scenario scope. Employee lifecycle remains conditional until the remaining profile, create/edit, exit-dependency, and policy-owned scenarios are resolved.

No commit, push, deployment, shared migration, live email, payroll execution, or shared-environment mutation occurred.
