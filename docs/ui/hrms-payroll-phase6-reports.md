# Payroll Phase 6 — reports

Prepared: 24 October 2026. Status: UI/UX implementation and cross-browser certification complete.

## Scope

Phase 6 covers the 21 payroll report routes: the payroll hub, seven core payroll reports, four output and finance reports, and nine statutory reports listed in the payroll inventory.

## Baseline finding

The baseline found that report workspaces filtered a complete bounded source array and passed the same filter values to CSV or manifest URLs, while visible filter, sort and page state lived only in component memory. The completed rollout moves that state into the visible URL across the report family and corrects stale page values after filtering.

The initial production-build shell baseline passed all 63 route-engine checks: 21 routes in Chromium and Firefox, followed by a clean 21-route WebKit rerun. It verifies 320 × 640 containment, a single page heading and absence of actionable runtime errors. WebKit's non-actionable protected-prefetch messages are excluded explicitly; report rendering and application errors remain failures. This baseline does not close the filter, data or export gates below.

## UI/UX and data contract

- Search, finite selectors, sort and page use committed URL query parameters.
- Draft control values become committed scope through Apply or Enter; Clear returns the canonical unfiltered URL.
- Reload, copied URLs and Back/Forward restore the same rows, totals, sort and page.
- Page correction after filtering is deterministic and written back to the URL.
- Screen rows, filtered totals, CSV, manifest and print use the same declared bounded collection and selector contract.
- Stable ordering includes an identity tie-breaker.
- Empty source, filtered no-match, unavailable source and permission denial remain distinct states.
- Drill-down links retain supported report scope through a validated return target.
- Wording distinguishes generated, published, transmitted, acknowledged, filed and reconciled states.

## Implementation sequence

1. Establish the 21-route, three-engine responsive baseline.
2. Retrofit URL-backed filters, sort, Clear, page and history behavior across core payroll reports.
3. Apply the same contract to output and finance reports.
4. Apply the same contract to statutory summary and readiness reports.
5. Certify complete bounded collection, stable pagination and screen/CSV/manifest/print parity.
6. Certify drill-down return scope, permission denial, unsafe identifiers and export audit behavior.

## Reference implementation

Payroll Register is the first report migrated to the Phase 6 interaction contract. It now:

- keeps edited controls as a draft until Apply or Enter;
- commits search, finite selectors, non-default sort and page to a normalized URL;
- removes default, invalid and unknown query values and corrects an out-of-range page;
- restores committed controls and rows after reload and browser Back/Forward;
- derives screen totals, CSV and manifest URLs from committed scope;
- uses an artifact identity tie-breaker for stable ordering; and
- opens Payroll Outputs on its detail tab with a return target containing the committed report scope.

The remaining report workspaces now use the shared URL-backed filter and pagination primitives, including canonical default removal and stale-page correction. The payroll family hub also retains group, search and readiness scope.

## Certification result

- Production Next.js build: passed.
- ESLint, TypeScript and whitespace validation: passed.
- Chromium: 41/41 report shell and state checks passed.
- Firefox: 41/41 report shell and state checks passed.
- WebKit: 41/41 report shell and state checks passed.
- Aggregate: 123/123 checks passed against the same production build.
- Disposable PostgreSQL tenant cleanup: verified at zero remaining tenants.

The browser matrix covers all 21 report routes at 320 × 640, one page heading, horizontal containment, actionable runtime errors, Payroll Register Apply/Enter/Clear/canonical URL behavior, and search/reload/Back/page-correction behavior for every other detail report.

## Exit gate

Phase 6 closes only after all routes pass responsive parity, every finite filter option and meaningful intersection, normalized search, no-match and Clear behavior, page boundaries, stable tie ordering, copied URL/reload/history restoration, complete bounded population checks, export/manifest/print parity, authorization isolation and disposable-data cleanup on one source-matched production build.
