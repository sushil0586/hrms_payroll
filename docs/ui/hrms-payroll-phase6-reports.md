# Payroll Phase 6 — reports

Prepared: 24 October 2026. Status: implementation in progress; filter-state remediation and certification pending.

## Scope

Phase 6 covers the 21 payroll report routes: the payroll hub, seven core payroll reports, four output and finance reports, and nine statutory reports listed in the payroll inventory.

## Baseline finding

The report workspaces generally filter a complete bounded source array and pass the same filter values to CSV or manifest URLs. Their visible filter, sort and page state is currently initialized in component memory instead of committed URL state. As a result, a filtered screen cannot yet be reliably restored from a copied URL, reload, or browser Back/Forward navigation. Phase 6 treats this as a family-level implementation defect rather than certifying each report independently with the same gap.

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

## Exit gate

Phase 6 closes only after all routes pass responsive parity, every finite filter option and meaningful intersection, normalized search, no-match and Clear behavior, page boundaries, stable tie ordering, copied URL/reload/history restoration, complete bounded population checks, export/manifest/print parity, authorization isolation and disposable-data cleanup on one source-matched production build.
