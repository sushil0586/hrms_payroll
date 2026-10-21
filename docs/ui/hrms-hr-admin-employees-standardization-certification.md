# Accerio HR Admin Employees standardization

Date: 2026-10-20. Scope: employee directory and shared page/list presentation. Local implementation only; no deployment. This follows the approved shared shell and the user's direction to start page-by-page with Employees. Attendance safety findings remain open; this does not accept HR-A1 or the entire HR-A2/A4 rollout.

## Implementation

- Extended existing `PageIntro` with an opt-in Accerio appearance. Default rendering for all other consumers is retained.
- Added `WorkspaceFilterForm`: a named GET form receiving module-owned fields, query names and actions. Shared presentation contains no data, permissions or workflow logic.
- Reused `WorkspaceTableScrollRegion`, including its hydration-safe keyboard scrolling handler. Added table accessible name and column scopes.
- Centralized opt-in presentation in `web/src/styles/workspace-patterns.css`, imported once from the root layout. Existing semantic Accerio tokens supply colors, typography, borders, radii, focus and spacing; no additional component library or dependencies.
- Applied compact header, filter grid, table spacing, restrained semantic states and indigo primary actions. Advanced filters expand within the layout instead of an overlapping floating panel; active advanced filters remain visible after navigation.
- Added name/code ascending/descending sorting, with deterministic ID tie-breaking, before pagination. Filtering/sorting operate on a copied authorized collection, preserving source/global status totals.
- URL query is the committed state. Filter and page-size forms remount only when committed directory scope changes; draft filters cannot leak into pagination. Detail selection resets on a changed scope, preserving the existing abort/stale-response handling within the detail provider.
- Pagination normalizes nonfinite/fractional page values and limits page size to the displayed choices. Filter changes reset to page 1. Page/status navigation clears stale action parameters.
- Active-filter count replaces the server-rendered selected-count chip, which could become misleading after client detail selection.
- Empty state gives useful filter/reset guidance rather than asking users to seed data. Removed the hidden decorative readiness-ring section and its inline colors/calculations; actual summary counts and warning predicates remain.

Preserved employee create/edit/access/bank/import actions, permission gates, employee authorization, API payloads, warnings, audit behavior and effective-dated/history business logic. Existing detail loading/error/retry and create modal are reused; they are not replaced with a prototype.

## Contracts and limitations

Sources: `web/src/app/hr-admin/employees/page.tsx`, `employee-detail-selection.tsx`, `web/src/lib/api.ts:getHrAdminEmployees`, `backend/apps/common/api_views.py:HrAdminEmployeeListView` and `backend/apps/common/selectors.py:get_hr_admin_employee_list`.

The existing no-query API returns the authorized full employee collection; this slice preserves that path, including the existing import workbenches. Filtering/sorting/pagination are server-rendered from that complete collection, not from an arbitrary first API page. The separate paginated API exists but was not adopted here because its summary does not expose the existing provisioned-access metric and import components require the collection. Large-tenant performance and lazy-loading import options need a separately measured follow-up; no scalability certification is claimed. UI `sort=name/-name/code/-code` is a page query, not a new backend API sort contract.

Global status-chip counts are directory totals, while "in this view" and pagination counts refer to the applied combined filters. No export or cross-page bulk action was introduced.

## Defects and verification history

Browser runs found Reset and subsequent Apply operations remaining on the previous URL while the shared client-navigation indicator stayed pending. Trace evidence contains no accompanying JavaScript error. Directory query forms, status links, pagination and Reset now use the existing native document-navigation convention (`data-navigation-mode="document"`) to request the committed query directly. The underlying client-routing scheduling cause is not proven; the accepted behavior is verified through actual reset, history, refresh and resulting records.

Original evidence remains in `attempt1/`, `attempt2/`, `attempt3/`, `attempt4/`, `attempt5/` and `attempt6/` under the evidence root; these interrupted diagnostic runs are not represented as completed passing suites. New-employee opening showed the same client-navigation stall. Employee create/close transitions now use document navigation, through an opt-in shared-modal property. The original dirty confirmation remains, including Cancel links matching the close URL; other modal consumers keep their defaults. Visual review found the new control background had removed the legacy select arrow; shared filters now draw a token-based chevron with explicit control heights. The initial native-select approach rendered too short in mobile WebKit despite a functional test pass; rendered review caught it, and final tests assert 44px sizing. A detail test initially expected one name-search match despite reporting-manager matches being supported; it now uses the unique synthetic manager employee code. A separate detail test mistakenly matched both the drawer error and Next route-announcer alerts; it now scopes the error assertion to the drawer. A separate test defect used exact label-text matching for native selects; corrected to combobox roles with accessible names, retaining exact selection assertions. A local server startup path error is retained in `backend-startup-error.log`; the QA runner explicitly adds the backend module path. The local Django server uses queue capacity 128 for the app's existing navigation prefetch traffic; this is harness configuration, not an application/server deployment change.

## Evidence and acceptance

Evidence root: `docs/qa/evidence/hr-admin-employees/`. Reproducible suite: `web/playwright.employees.config.ts`, `web/tests/employees/directory.spec.ts`. Local PostgreSQL 16 database, synthetic owned tenants, production Next build, no demo-data mode, no outbound worker use. Local HTTP uses existing `HRMS_COOKIE_SECURE=false`; staging security configuration is untouched.

Browser matrix covers combined search/department/status/manager/readiness filters, Enter/Apply, Reset, refresh/history, sorting, page size, unapplied draft pagination, out-of-range page, zero results, detail 503/retry, selection scope changes, create modal close, cross-tenant ID rejection and employee role rejection, neighboring HR/ESS/MSS pages, desktop/tablet/mobile screenshots, keyboard table scrolling and automated accessibility of the shared page patterns.

Screenshots use `<engine>-1440.png`, `-768.png`, `-390.png`, `-320.png`, for Chromium/Firefox/WebKit. These are actual application renders with synthetic records, not prototype images. The previous shell screenshots are the before reference; layout changes are not certified solely from automated assertions.

Focus restoration to the original opener across a document-navigation modal close is not certified. Screen-reader testing, native browser zoom, formal WCAG conformance and exhaustive employee mutation/import certification remain unexecuted in this slice. Viewport reflow is not native zoom. Automated accessibility checks cover only selected header/filter/table regions, not every drawer, form or HR page.

Final execution counts, cleanup and scoped decision follow below.

The first post-sizing check reported 5 passed / 1 failed: Firefox returned a 43.999999px bounding rectangle for a 44px control. Final sizing checks allow only 0.01 CSS pixel numeric precision tolerance; the genuinely short WebKit control would still fail. Original logs/traces remain in `sizing-precision-attempt/`. This was a measurement precision issue, not a new application height defect.

## Final executed results and decision

| Selection | Passed | Failed | Skipped / blocked / unexecuted within selection |
|---|---:|---:|---|
| Full production-built directory suite: 9 cases × 3 engines | 27 | 0 | 0 / 0 / 0 |
| Post-CSS sizing fix: combined filters + responsive checks × 3 engines | 6 | 0 | 0 / 0 / 0 |
| Focused PostgreSQL backend regressions (two commands) | 6 | 0 | 0 / 0 / 0 |

**33 successful browser executions**, including **27 distinct functional scenario/engine combinations** plus six targeted repeat executions. They are not 33 distinct workflows. All are newly executed in this task; no inherited ESS certification results are counted. Zero retries. Full-suite results: [JSON](../qa/evidence/hr-admin-employees/functional-full/results.json), [log](../qa/evidence/hr-admin-employees/functional-full/browser-final.txt). Final CSS checks: [log](../qa/evidence/hr-admin-employees/final-sizing.txt), traces in `final-sizing-results/`. [Acceptance summary](../qa/evidence/hr-admin-employees/acceptance-summary.json).

The 27-case run preceded the last CSS-only WebKit sizing/chevron correction. The six targeted executions ran against the final rebuilt production bundle and include new mobile height assertions. The full 27 were not rerun after that CSS-only correction. Application TypeScript/logic was unchanged between these builds; [source manifest](../qa/evidence/hr-admin-employees/source-manifest.json) records source hashes and both build IDs.

Six existing backend tests passed: employee HR dashboard rejection; custom employee-viewer mutation rejection; directory access state; manager reassignment visibility; detail access summary; detail direct-report count. API ownership/role checks within browser scenarios are included in browser counts, not counted a second time as backend tests. Other backend tests were deliberately deselected, not represented as executed.

TypeScript, full ESLint, Django system checks and final production build passed. Final build log: `build-final-sizing.txt`. Next-generated type/config edits were restored; TypeScript and ESLint were run again on the resulting checkout.

Historical diagnostic attempts are separate: **21 observed passes, 8 observed failures and 112 not-reported/interrupted cases across six interrupted selections**, plus the completed sizing-precision attempt (**5 passed / 1 failed**). Their logs/traces remain intact; none are converted into passes. See `diagnostic-attempts.json` and `sizing-precision-attempt/`. "Not reported/interrupted" does not assert that every such case started or failed.

Rendered review: final Chromium desktop, Firefox desktop and WebKit mobile were manually inspected, alongside Chromium mobile and earlier comparison renders. Desktop/tablet/390px/320px screenshots were captured in all three engines; document overflow and keyboard region scrolling were checked in each. Focus outlines in captures are intentional keyboard-verification states. See [screenshot index](../qa/evidence/hr-admin-employees/screenshots.md).

Automated axe checks reported zero violations in the tested header/filter/table regions in all three full-suite engines. Keyboard checks verify Enter submission, table horizontal scrolling, modal initial focus, Escape, Cancel and dirty-draft confirmation. These results do not close screen-reader, native-zoom, complete focus restoration, full dialog accessibility, formal WCAG or whole-product release gates.

Cleanup verified **0 tenants and 0 Playwright users** in the dedicated QA database after removing 12 interrupted-fixture tenants through guarded ownership teardown. Matching interrupted-fixture temp manifests were removed. The owned database container/volume and secure runtime environment file were removed; ports 3199/8049/55444 verified closed. See `database-cleanup.json`, `cleanup-*.json` and `infrastructure-cleanup.json`. No staging/customer infrastructure or data was touched.

**Local directory functional decision: PASS. Overall page acceptance: CONDITIONAL**, pending the explicitly unexecuted accessibility checks, cross-document modal focus-return review, large-tenant performance evaluation and separate mutation/import coverage. Existing business workflows remain available and permission-gated, but their complete re-certification is not inferred from this read/list pilot. No production certification or deployment GO is issued. Lightsail and frozen release gates remain unchanged.
