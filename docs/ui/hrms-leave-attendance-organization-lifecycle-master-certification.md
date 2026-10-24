# Leave, Attendance and Organization/Lifecycle — master regression certification

Date: 23 October 2026. Status: **complete within the declared local regression scope** on production build `yg7UOTj_6aViKFnMslNGK`. Historical certificates remain evidence for their own recorded builds and are not silently counted as current passes.

## Scope and accounting

| Family | Current route-pattern inventory | Roles/workspaces | Current execution status |
| --- | ---: | --- | --- |
| Leave | 16 | HR Admin (13), ESS (1), MSS (1), Tenant Admin (1) | 48/48 route matrix and all 231 deep matrix executions passed |
| Attendance | 30 | HR Admin, ESS and MSS shared approval consumer | 9/9 cross-role executions passed; all 198 deep HR Admin matrix executions now have a passing current-source result |
| Organization/Lifecycle | 18 | HR Admin plus report consumers | 213/213 current-source browser executions, 29 contracts and three PostgreSQL checks passed |

The route count is a route-pattern count. Dynamic record IDs, the nine Organization section variants, dialogs, states, role combinations and responsive widths are separate coverage dimensions rather than additional routes.

## Certification gates

| Gate | Required evidence | Status |
| --- | --- | --- |
| Inventory | Every changed route and shared consumer mapped to its source, role and owning test | Passed; Attendance inventory corrected to 30 |
| Functional workflows | Create/edit/review/approve/reject/cancel/import/bulk operations where supported, including invalid and uncertain outcomes | Passed for the restored Leave, Attendance and Organization/Lifecycle owning matrices |
| Filters and navigation | Every finite option, meaningful intersections, no-match, clear, reload, copied URL, Back/Forward, page size and boundaries | Passed for Leave, Attendance and Organization/Lifecycle current contracts |
| Data parity | Visible IDs/order/totals agree with API and CSV/manifest exports for committed scope | Passed for Leave reports/ledger/year close, Attendance CSV/manifest/beyond-page-500, and Organization/Lifecycle report selections |
| Access boundaries | HR Admin, manager, employee, read-only and foreign-tenant checks at UI and API boundaries | Passed in the owning Leave, Attendance and Organization/Lifecycle role/tenant matrices |
| UI/UX parity | Shared header, summaries, filters, tables, actions, feedback, dialogs, empty/error states and terminology | Passed for the fresh selected surfaces; representative captures inspected |
| Responsive/accessibility | Chromium, Firefox and WebKit at desktop/tablet/mobile; overflow, keyboard, focus and selected axe checks | Passed across all three families; actual shared loading defect corrected and rerun |
| Integration/integrity | Backend state, audit/history, calculation and idempotency checks appropriate to each workflow | Passed for Leave ledger/lifecycle/year close plus three focused lifecycle PostgreSQL checks |
| Quality/build | Diff whitespace, TypeScript, focused ESLint, Django checks, migrations and production build | Passed; build emitted the existing CSS `end` compatibility warning |
| Cleanup/provenance | Source hashes, exact results, inspected captures and owned fixture/process/database cleanup | Passed for owned fixtures/services/database; current build retained |

## Existing evidence used as a baseline

- Leave has a retained clean 228/228 three-engine matrix, with MSS, frozen ESS and backend checks recorded separately. It belongs to the 21 October build and will not be represented as a pass for current source.
- HR Attendance has a retained 198-execution main suite, 27 neighboring executions and 36 backend checks. This audit found that `/hr-admin/reports/roster-rollout-audit` was described by the certificate and exercised by export tests but omitted from its 29-entry `routes.json`; the current inventory restores it as the thirtieth route.
- Organization/Lifecycle has 102 newly written functional definitions across its original closure and filter supplement (103 including baseline capture). The supplemental build passed 63 browser executions, 29 report contracts and three backend checks on 23 October.

## Known execution issue

The Attendance fixture has been restored as `backend/tests/fixtures/attendance_family.py`; the historical `seed.py` path is a small compatibility entry point. Leave compatibility paths now delegate to `backend/tests/fixtures/leave_deep.py`. Both fixture families validate the loopback PostgreSQL database and Playwright-owned sandbox before seeding. Old local services were not accepted as substitutes. A first backend invocation selected SQLite and failed during PostgreSQL-only trigger migration setup; the corrected isolated PostgreSQL run passed three checks.

## Current-source results

| Selection | Passed | Failed | Skipped | Flaky/retries |
| --- | ---: | ---: | ---: | ---: |
| Leave route/edit/dialog/accessibility matrix, three engines | 48 | 0 | 0 | 0 |
| Leave Applications deep matrix, three engines | 27 | 0 | 0 | 0 |
| Leave Setup deep matrix, three engines | 51 | 0 | 0 | 0 |
| Leave Balances deep matrix, three engines | 24 | 0 | 0 | 0 |
| Leave Completion deep matrix, three engines | 48 | 0 | 0 | 0 |
| Leave Visual parity matrix, three engines | 24 | 0 | 0 | 0 |
| Leave Integrated lifecycle, accepted distinct executions | 24 | 0 | 0 | 0 |
| Leave Year close/report matrix, three engines | 33 | 0 | 0 | 0 |
| Attendance ESS/MSS responsive/navigation/accessibility matrix, three engines | 9 | 0 | 0 | 0 |
| Attendance deep HR Admin matrix, accepted current-source executions | 198 | 0 | 0 | 0 |
| Organization/Lifecycle Phase 6 workflow matrix, three engines | 150 | 0 | 0 | 0 |
| Organization/Lifecycle filter/navigation matrix, three engines | 63 | 0 | 0 | 0 |
| Organization/Lifecycle report and filter contracts | 29 | 0 | 0 | Not applicable |
| Organization/Lifecycle focused PostgreSQL checks | 3 | 0 | 0 | Not applicable |

The Leave route matrix renders all 16 route patterns, resolves the three real edit variants, checks 1440/768/390/320 widths, one visible H1, Accerio page composition, document containment, named table regions, ESS/MSS dialog containment and focus return, and selected axe scans in all engines. It retained 96 final route/edit captures; 18 additional pre-fix dynamic-route captures are diagnostic artifacts. The seven restored deep matrices add 231 passing executions for filters, pagination/history, CRUD, retry flows, imports, exact resolution, balances and ledger review, permissions and tenant isolation, shared-shell visual parity, responsive dialogs, keyboard behavior, axe, four-role business transitions and idempotent year close/report export.

The Attendance cross-role matrix covers MSS dashboard, MSS Attendance approvals and ESS Attendance at the same four widths, list/calendar URL persistence, manager table keyboard behavior, page errors and axe. It retained 36 final captures. The restored deep matrix covers all 30 HR Admin route patterns, catalog and compound filters, history and pagination, more than 500 report rows, exports, real edits, bulk retries, close governance, tenant and role boundaries, keyboard/responsive behavior and selected axe scans. Its final complete run passed 197/198; the only failure was a stale post-mutation locator assertion, which was corrected to assert zero selected checkboxes and then passed 3/3 across the engines. Every one of the 198 executions therefore has a passing current-source result; the evidence README keeps this split explicit.

The Organization/Lifecycle Phase 6 matrix covers Organization catalogs and guided setup/import, onboarding, probation, movement, exit, the joined lifecycle queue, and both lifecycle reports. Its 150 three-engine executions cover responsive routes and dialogs, CRUD and bulk workflows, validation and uncertain outcomes, tenant and permission boundaries, focus and keyboard behavior, state transitions, history and audit effects, and report/export parity. The fresh 63-execution supplement covers every declared filter option, meaningful intersections, page sizes, paging, copied URL and history behavior, sorting, as-of dates, exports, print scope, responsive parity, and filter inventory drift. The 29 contracts and three focused PostgreSQL checks independently verify collection integrity, filter semantics, stable sorting, owner filtering, attention sorting, and document-attention summaries.

## Defects found and corrected

1. The Attendance certificate described 30 routes, but `routes.json` contained 29. `/hr-admin/reports/roster-rollout-audit` was already described and export-tested; it is now restored to the source inventory and mapped to the Attendance evidence, bringing the census to 48 aligned-scoped and 123 pending-review routes.
2. `WorkspaceLoading` placed `role="status"` on a non-embedded `<main>`. Axe reported `aria-allowed-role` in HR Admin, MSS and Tenant Admin during real navigation. Non-embedded loading now keeps the main landmark, `aria-busy`, label and polite live behavior without the prohibited role; embedded `div` loading retains `role="status"`. The complete affected Leave and Attendance matrices passed after rebuild.
3. The maintained Attendance test hardcoded its old evidence destination. It now accepts `HRMS_MASTER_EVIDENCE_ROOT`; the accepted rerun writes JSON, traces and captures to this campaign. The first diagnostic run refreshed historical root screenshots before the defect was corrected; available Chromium ESS backups were restored, and the event is recorded rather than hidden.

## Visual review and cleanup

Actual final renders inspected include Chromium ESS Leave at 390px, WebKit HR Leave Requests at 1440px and Firefox MSS Attendance approvals at 390px. They show the shared Accerio shell, readable hierarchy, contained tables and controls, and mobile action sizing. This sampled inspection does not constitute pixel review of every retained image.

The accepted browser reports record zero accepted failures, skips, flakes and retries. Diagnostic reports retain the corrected Leave guard failure and the Organization/Lifecycle WebKit localhost-cookie failure alongside their clean correction reports. Guarded teardown left zero tenants and zero `pw_` users in each owned database. Owned Next and Django servers and disposable PostgreSQL containers were stopped and removed. Existing unrelated local services and containers were untouched.

## Acceptance rule

A family is current-source accepted only for the selections explicitly executed here. The current UI/UX regression, Attendance deep matrix, all seven Leave deep matrices, and Organization/Lifecycle workflow and filter matrices are locally accepted. Screen-reader use, native zoom, physical devices, exhaustive role/tenant Cartesian products, load/concurrency and release/deployment gates remain separate. No deployment or commit was performed.
