# HR Admin A1 — Attendance Records safety and shared presentation

Assessment date: 2026-10-20. Scope: `/hr-admin/attendance-records`, its existing permitted edit/bulk actions, and opt-in shared presentation. This is local synthetic certification; no staging deployment or frozen release-gate change is authorized by this report.

## Findings and remediation

| Finding | Root cause | Implemented correction |
|---|---|---|
| HA-F01 Back/Forward restores rows but not controls | Filter controls retained state initialized from earlier props | Named native GET filter form keyed by committed query scope; controls and results restore together |
| HA-F02 hidden selected records remain actionable | Selection outlived the result/filter scope | Scope-owned selection reconciled against visible IDs, including immediately before dispatch |
| HA-F03 pagination submits draft filters | Pagination read editable local controls | Pagination and page-size changes use committed server filters only |
| Closed-period bulk operation produced HTTP 500 | PostgreSQL historical-close trigger rejection escaped the API | Atomic batch maps only SQLSTATE P0001 with the exact known close-guard message to field validation HTTP 400; unrelated DB errors still surface |
| Retry did not issue a fresh failed server read | Generic route reset did not reliably reload the current server query | Route-specific shared error presentation retries with a fresh document load |
| Bulk-status label contrast | Inherited muted color on panel surface | Shared semantic muted-text token; scoped axe recheck |
| Oversized mobile Select page action | Legacy horizontal flex basis became a 160px vertical basis | Shared Accerio action-row rule resets mobile flex basis; rendered height assertion |

Malformed dates/ranges show validation without presenting unfiltered records as matching results. Page/page-size inputs are bounded; out-of-range pages canonicalize to the final page. Advanced filters, real statuses and option sources reuse existing contracts. Summary counts distinguish dataset totals from current-page counts. Navigation and import tools are compact disclosures; import functionality is retained, not recertified as a new workflow.

## Reuse and changed contracts

Uses the existing shell, `PageIntro`, `WorkspaceFilterForm`, keyboard `WorkspaceTableScrollRegion`, `WorkspaceStatusBadge`, async actions, modal/dirty confirmation and shared semantic `workspace-patterns.css`. New filter-contract and filter-form modules contain Attendance-specific query fields rather than creating a second UI library. Error-state Accerio appearance and user-facing copy are opt-in; existing consumers retain defaults. Presentation carries no new role or business policy.

Existing list/detail-edit/bulk endpoints, employee/tenant scope, permissions, success response and calculation payloads remain unchanged. Closed bulk failure now returns `400 {record_ids: [message]}`. Foreign-ID bulk requests retain the existing scoped `200 updated_count: 0` contract; foreign PATCH remains 404 and view-only bulk remains 403. No migrations, dependencies, historical records, payroll/leave calculations or close triggers changed.

Application files: Attendance `page.tsx`, `attendance-record-bulk-manager.tsx`, `attendance-record-form.tsx`, new `attendance-record-filters.tsx`, `filter-contract.ts`, `error.tsx`; shared `workspace-filter-form.tsx`, `workspace-error-state.tsx`, `workspace-patterns.css`; backend `apps/common/api_views.py`. QA additions: `backend/tests/test_hr_admin_attendance_workspace.py`, `web/tests/attendance-admin/records.spec.ts`, isolated Playwright config and evidence scripts. Earlier shell/Employees worktree changes are preserved separately.

## Evidence and historical results

Evidence root: [A1 artifacts](../qa/evidence/hr-admin-standardization/a1/). Traces are retained for every configured execution; retries are disabled.

- Unchanged production-build baseline: **3 failed** reproductions, one per HA-F01–03, in `baseline/`.
- Corrected focused three-engine selection: **9 passed** in `focused/`.
- Backend pre-fix closed-period reproduction: **1 failed**, HTTP 500 rather than expected 400, `closed-api-baseline.txt`.
- Earlier backend fixture attempt: 20 passed/1 failed due Decimal/string fixture comparison; corrected fixture refreshes DB types. `backend-regression.txt`: 22 passed.
- Diagnostic browser attempt 1 retained in `full-attempt1/`: interrupted; unsupported BFF GET assumptions, server-retry and contrast defects were investigated. No complete-suite acceptance is claimed from it.
- Diagnostic browser attempt 2: **39 passed / 3 failed** in `full-attempt2/`. Chromium used a synthetic custom role lacking the existing required `hr-` workspace prefix; Firefox/WebKit encountered an ambiguous read-only notice locator (toolbar plus import panel). Fixture and locator corrected without production IAM changes.

Final execution, accessibility, screenshot, provenance and cleanup results follow below. Historical failed and interrupted runs remain evidence and are not replaced by later passes.

## Limits and release restrictions

The original page-audit transport failure remains unclassified. Controlled 503/aborted-request recovery proves the tested recovery paths, not that historical incident's cause. No arbitrary sleeps, assertion removal, constraint weakening or global request serialization was introduced.

Screen-reader/assistive technology, native browser zoom, formal WCAG assessment, native mobile devices, large-tenant performance, full import certification and dialog opener-focus restoration remain unexecuted. Viewport emulation is not native zoom or device certification. Existing modal dirty-close behavior is preserved. Closed-period eligibility is enforced by existing backend protections; ordinary lock state is not represented as final-close eligibility.

This pilot does not certify other HR pages or modify the 40 frozen production gates. Lightsail and real-payroll production remain outside this local acceptance.

## Final executed verification

| Selection | Passed | Failed | Skipped | Blocked/unexecuted within selection |
|---|---:|---:|---:|---:|
| Full production-built browser suite (14 × Chromium/Firefox/WebKit) | 42 | 0 | 0 | 0 |
| Earlier focused HA-F01–03 selection (3 × 3 engines) | 9 | 0 | 0 | 0 |
| Final backend/API/PostgreSQL selection | 22 | 0 | 0 | 0 |
| Supplementary final screenshot/reflow selection (1 × 3 engines) | 3 | 0 | 0 | 0 |

Full browser evidence: `browser-certified.txt`, `certified/results.json` and `certified/results/` traces. Backend: `backend-final.txt` (new bulk-contract tests plus existing DB6 close-integrity and ESS2 contract tests). Existing backend deprecation warnings are retained. These are separately executed selections, not one inflated count of unique scenarios. Unexecuted broader acceptance gates below are not counted as executed test cases.

Browser coverage includes committed search/status/advanced filters, invalid dates, empty/reset/reload, Back/Forward, page-size and canonical page changes, visible-ID bulk payloads, actual transport abort/retry, pending duplicate-submit guard, interrupted older navigation, persisted mutations, closed-period denial, tenant isolation, foreign PATCH and scoped bulk contracts, read-only role, real edit/return navigation and neighboring Employees/Regularizations/ESS/MSS render smoke. Neighbor smoke is not full neighboring workflow certification.

TypeScript (`typecheck-final.txt`), full ESLint (`eslint-final.txt`), Django system checks (`django-final.txt`) and production build (`build-certified.txt`) passed. Next-generated `next-env.d.ts`/`tsconfig.json` build edits were restored to their pre-task tracked content; TypeScript passed afterward.

### Accessibility and visual evidence

Executed on Playwright desktop Chromium, Firefox and WebKit with responsive emulation at 1440, 768, 390 and 320 CSS pixels. Each engine checked document overflow, mobile filter-control minimum heights, compact Select page action, named table region keyboard scrolling, Enter inspection and close interaction. Automated axe scans of the page header, filter/action toolbar, table region and pagination passed with zero violations for the selected WCAG2A/AA and WCAG2.1AA tags; scans are scoped, not formal conformance assessment. Error, empty, disabled, selected and validation states are exercised in browser traces.

[Screenshot index](../qa/evidence/hr-admin-standardization/a1/screenshots.md). Actual desktop/mobile screenshots were visually reviewed; a legacy mobile action-size defect was corrected. Full-page sticky-header capture depends on document scroll position; supplementary final captures explicitly restore page top before capture. Native zoom, screen reader, full dialog focus trap/restoration and formal WCAG review were not executed and remain open.

### Provenance and decision

Source HEAD: `2dbfecf02fb1b5dc2d700ac0c2ad33b9d718b161` plus the uncommitted worktree (including preserved earlier shell/Employees work). Production build ID: `IYojUiwKUbvv5bmRR4sqc`. Exact selected source SHA-256 values: `source-build-provenance.json`. This is not an immutable committed release candidate or deployment certification.

**Local tested functionality: PASS. Overall A1 acceptance: CONDITIONAL** due the separately open transport-investigation and accessibility/performance/import gates. **Lightsail deployment: not performed; no release authorization/GO is issued.** No frozen gate was advanced and no subsequent module was started.


### Final screenshot capture and cleanup

Supplementary **3/3 responsive executions passed**, separately from the full 42 cases (`browser-screenshots.txt`, `screenshots-final/results.json`). Final desktop/tablet/mobile images overwrite the root screenshot paths in the index; original full-suite traces preserve their own captures. Desktop, mobile and error screenshots were rendered and inspected directly. Screenshot scroll normalization changes only capture positioning, not application behavior or keyboard assertions.

`database-cleanup.json` verifies **0 tenants and 0 Playwright users** in the dedicated `hrms_attendance_qa` database after guarded cleanup, including two interrupted-run fixture tenants. Matching interrupted synthetic manifests were removed. `infrastructure-cleanup.json` records exact owned-container identity removal, secure local runtime-environment deletion and closed ports 3201/8051/55446. Only the task-owned frontend/backend processes and PostgreSQL container/volume were stopped/removed. Historical evidence remains preserved. No real/customer data or external staging infrastructure was touched.
