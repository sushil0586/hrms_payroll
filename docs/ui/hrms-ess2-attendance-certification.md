# Accerio HRMS ESS-2 — Employee Attendance certification

Date: 18 October 2026. Scope: employee attendance only; no ESS-3 implementation or Lightsail deployment.

## Disposition

**CONDITIONAL — scoped functional verification PASS; production release remains conditional.** All 24 production-browser cases and 28 API/PostgreSQL cases passed. TypeScript, focused ESLint, Django checks and the production build passed. Synthetic counts were zero before the owned database container/volume was removed; all owned ports are closed. The frozen 40-gate statuses are unchanged. Formal assistive-technology/native-zoom review and existing production release gates remain open. ESS-2 stops here for review.

## Reviewed baseline and implementation

Reviewed [horizontal upgrade plan](hrms-horizontal-experience-upgrade-plan.md), [ESS coverage tracker](hrms-ess-coverage-tracker.md), [ESS-1 certification](hrms-ess1-dashboard-profile-certification.md), employee attendance views/serializers, policy resolution, regularization submission/approval services, and [DB-6 historical-close tests](../../backend/tests/test_db6_attendance_close_integrity.py).

The previous workspace showed today/month-to-date summaries and correction history but offered no complete monthly calendar or paginated day list. The legacy latest-records endpoint capped its array at 30 records and could generate current attendance records. It could not safely supply arbitrary historical periods.

Implemented:

- Compact ESS-1 shell/header/panels, recorded-day/hour/finalized/pending summary, explicit month range and tenant timezone, current-period shortcut, previous/next month and calendar/list navigation.
- Monthly calendar includes every date, including leap days. Missing records say **No record**, never inferred absence, holiday or weekly off. Day and calendar/list selection use the authorized month already in memory and synchronizes URL/back/forward state, so rapid day clicks do not issue competing server reads. Calendar/list switching preserves the list page. Period changes, pagination and history filters use authenticated document GETs; this avoids intermittent WebKit streamed-navigation stalls while retaining server authorization, real URLs and loading feedback. This follows the [Next.js native history integration](https://nextjs.org/docs/14/app/building-your-application/routing/linking-and-navigating#using-the-native-history-api).
- Ascending day list with independent page/size controls; selected day details remain accessible across list pages. Calendar receives the complete bounded month, not merely the current list page.
- Stored daily check-in/out, working/overtime hours, late/early-exit minutes, recorded shift/holiday, regularized state and finalization protection. Unfinalized derivation explanations are explicitly current-policy context for that date. Finalized rows omit live derivation entirely.
- Existing correction modal, validation, idempotency key, duplicate-submission guard, recoverable submission error, retained inputs, persistent success feedback and workspace-owned refresh. Correction actions are disabled while that refresh is pending. Eligible records exclude finalized days, pending duplicates and dates whose resolved policy disallows regularization. POST remains authoritative if state changes while the form is open.
- All-period correction history with separate status filters/pagination, configured approval steps and manager decisions. Authorized `regId` notification links resolve through the existing own-request detail endpoint independently of the visible history page/filter.
- Existing loading/error/retry components; an invalid month URL produces an explicit validation alert and current-tenant-month fallback. Native month input is bounded to supported calendar years.
- Responsive seven-column calendar with mobile status codes, full accessible labels and a keyboard-operable status key; tables scroll inside labelled, keyboard-focusable regions with explicit Left/Right-key support. Desktop retains full row density. No decorative-only action or new check-in, raw-punch-edit, overtime approval or closed-period correction control.

## Changed files and API contracts

| File | ESS-2 change |
| --- | --- |
| `backend/apps/common/ess_attendance.py` | New read-only monthly projection, strict month/page validation, tenant-local today, own-record allowlist, applicable existing policy eligibility and closed-span protection |
| `backend/apps/common/api_views.py` — `MeAttendanceRecordListView` | Additive monthly branch before legacy materialization; no-month contract unchanged |
| `web/src/lib/types.ts` | `EssAttendanceDay` and `EssAttendanceMonth` types |
| `web/src/lib/api.ts` | Monthly read, paginated correction history, own correction detail accessors with 15-second read timeout |
| `web/src/app/api/me/attendance-records/route.ts` and `attendance-regularizations/route.ts` | Cookie-authenticated, no-store GET forwarding for allowed month/history query fields; legacy no-month GET and existing POST retained |
| `web/src/app/ess/attendance/page.tsx` | Authorized server reads, separate pagination, validation and deep-link resolution |
| `web/src/app/ess/attendance/attendance-workspace.tsx` | Calendar/list/details/history UI and existing correction integration |
| `web/src/components/patterns/hr-admin-action-modal.tsx` | Optional explicit Tab traversal, enabled only by ESS attendance dialogs; existing consumers keep the default behavior |
| `web/src/components/patterns/pagination-bar.tsx` and `web/src/components/shell/workspace-navigation-feedback.tsx` | Optional document-navigation mode used by attendance server query controls; existing consumers retain default routing |
| `web/src/app/ess/attendance/attendance.css` | Scoped compact/responsive calendar, toolbar and scroll styles |
| `backend/tests/test_ess2_attendance_contract.py` | Ten projection/security/compatibility tests |
| `backend/tests/ess2_test_server.py` | Guarded loopback QA server with 128-connection backlog for concurrent SSR reads; production server settings unchanged |
| `backend/tests/ess2_browser_fixture.py` | Guarded disposable PostgreSQL browser fixtures and snapshot-preservation assertion; never imported by production code |
| `web/playwright.ess2.config.ts` | Dedicated production-only, three-browser suite; no demo server |
| `web/tests/e2e/ess2-attendance-certification.spec.ts` | Eight real browser scenarios per engine, fault injection, screenshots, isolated-fixture cleanup |
| This document and `hrms-ess-coverage-tracker.md` | Scoped evidence and remaining restrictions |

Existing uncommitted ESS-1 and unrelated user changes were retained. No model/service calculation, migration, payroll input, authentication, role assignment, raw attendance write or live infrastructure configuration was changed for ESS-2.

### Additive GET contract

`GET /api/v1/me/attendance-records/?month=YYYY-MM&page=1&page_size=10`

- An explicitly present empty `month=` selects the tenant-local current month. Omitting the parameter retains the legacy latest-30 array contract and its existing behavior for existing callers.
- Monthly envelope: `month`, `period_start`, `period_end`, IANA `timezone`, tenant-local `today`, `days` (all recorded days, at most 31), `items` (list page), `page`, `page_size`, `total_count`, `total_pages`, `has_next`, `has_previous`, `summary`, `raw_punch_history_available: false`.
- Page size 1–31; positive page; out-of-range positive pages clamp to last page. Invalid API month/page/size returns 400. Browser controls use 5/10/20/31 rows and normalize unsupported URL sizes to 10; requests have separate `reg_page`.
- Day allowlist: ID, date/status, names from stored shift/holiday references, daily check-in/out, stored duration/overtime/late/early-exit values, regularized/locked state, current-policy derivation when unfinalized, and correction availability/reason. No geolocation or source payload.
- Summary counts only recorded rows; recorded hours are a sum of stored values, not payroll recomputation. Pending count is for this month. History explicitly spans all periods and has its own pending count.
- Always derives employee/tenant from authenticated active employee context. Client employee/tenant parameters cannot retarget a read. Monthly GET never calls attendance materialization or saves a row.

Reused unchanged: `GET/POST /api/v1/me/attendance-regularizations/`, own `GET /api/v1/me/attendance-regularizations/{id}/`, existing Next POST proxy, configured manager decisions and idempotency services. Post-submit refresh uses the same own-record contracts through cookie-authenticated Next GET proxies, with a 15-second timeout, a local retry state, and period/request-version guards against stale async results. A failed refresh explicitly retains last-loaded data and disables correction actions until refresh succeeds; it never repeats POST. UI `datetime-local` correction inputs are explicitly **UTC** and submit an ISO `Z` suffix, independent of browser timezone. Displayed daily timestamps use tenant timezone with a deterministic numeric UTC offset (including DST); attendance dates remain date-only and are never shifted by UTC conversion. Request timeline timestamps identify UTC.

## Authorization and historical integrity

- Active employee context only; missing/revoked context is rejected. Same-tenant peers and other tenants cannot retarget the monthly response or read another employee's correction detail; foreign regularization submission is rejected.
- Monthly endpoint exposes no write method. A correction is a pending request governed by the existing service, not a raw punch mutation.
- Both stored row lock and matching tenant/legal-entity closed period suppress correction and live derivation. Closed evidence is not reconstructed from current policy.
- The PostgreSQL regression suite retains trigger-level rejection of late writes, stale reconciliation rejection, close/reopen history and payroll references to the closed version. Browser fixtures use the real reconcile → submit → approve → close service sequence, then verify hash, closed status and locked row after viewing and rejected correction attempts.
- No historical records are unlocked to make browser tests pass. No policy, overtime entitlement, working-day or holiday applicability rule was added.

## Executed verification

Evidence root: [`docs/qa/evidence/ess2-attendance`](../qa/evidence/ess2-attendance/).

| Check | Result | Evidence |
| --- | --- | --- |
| New monthly API contract plus ESS-1 self-profile regression | 17 passed: 10 new ESS-2 + 7 preserved ESS-1 cases, PostgreSQL | [API results](../qa/evidence/ess2-attendance/api-tests.txt) |
| Existing regularization/RBAC/idempotency + historical close/payroll-reference tests | 11 passed; 362 deselected | [Regression results](../qa/evidence/ess2-attendance/close-regression.txt) |
| WebKit / Chromium / Firefox final production build | 24 passed: 8 per engine; 0 failed/skipped/retried | [JSON results](../qa/evidence/ess2-attendance/browser-results.json), [final run](../qa/evidence/ess2-attendance/browser-final.txt) |
| TypeScript, focused ESLint, Django checks, production build | PASS; Django: 0 issues; ESLint: 0 warnings/errors | [TypeScript](../qa/evidence/ess2-attendance/typecheck.txt), [ESLint](../qa/evidence/ess2-attendance/eslint.txt), [Django](../qa/evidence/ess2-attendance/django-check.txt), [build](../qa/evidence/ess2-attendance/production-build.txt) |
| Synthetic cleanup, closed hashes and disposable infrastructure removal | PASS; all 3 closed hashes preserved; both databases empty; container/volume removed; 4 owned ports closed | [Cleanup summary](../qa/evidence/ess2-attendance/cleanup-summary.txt), per-engine `*-fixture-cleanup.json` |

Backend checks cover leap-year extent, pagination/clamping, empty periods with no materialization, sensitive-field exclusion, cross-employee/tenant ownership, tenant-local month boundary, invalid API parameters, locked correction rejection, raw write rejection, revoked/anonymous context, effective policy boundaries, pending duplicate eligibility, foreign detail denial and the preserved legacy array response. Existing regressions cover real submit/replay/rejection, duplicate pending requests, invalid check-out order, reviewer permission gates and all four DB-6 close scenarios.

The browser suite runs on production Next output against real Django/PostgreSQL, demo data disabled, one worker and zero retries. A loopback forwarding proxy injects explicit 503/delay failures; the browser intercepts one correction POST with a network abort, then removes interception and verifies the real successful request in persistent history. Successful writes and decisions are never mocked. Each browser gets its own guarded synthetic sandbox, with a New York tenant and a Tokyo browser timezone. Fixtures include real stored weekly-off/holiday/late rows, seeded rejected history for pagination, and a service-closed historical period.

A host-paused run is retained as `browser-host-suspend.txt` (individual cases exceeded their 90-second limits across multi-minute execution gaps). The final run prevents idle system sleep only for the lifetime of the test command; it does not change system power settings. Preflight logs are diagnostic history, not final acceptance results.

The final submission case waits for refreshed pending state before reloading, then verifies persistence again. The delayed-loading probe uses an unvisited full-navigation URL, so route prefetch cannot mask the loading state.

Eight scenarios per browser: calendar/day/timezone/holiday navigation; list/history pagination, leap/year/invalid-month boundaries; closed-period restriction; UTC correction validation/network recovery/single persisted request/deep link outside status filter; real manager rejection/approval, employee detail and persisted authorized daily-record update; direct API authorization/write rejection; server failure/retry/loading; responsive layout, DST offset, keyboard and modal focus.

A WebKit preflight exposed different Safari/Node locale punctuation and day-period casing in formatted timestamps, causing React hydration error #418 and interrupted calendar navigation. Attendance now assembles stable English date/time text from numeric IANA-zone parts and displays a numeric UTC offset. The final suite explicitly rejects attendance hydration errors. Notification detail portals also wait until hydration completes, preserving the server-rendered tree on direct request URLs. WebKit additionally left a React Server Component refresh transition pending despite a complete server response, including after moving it outside the closing modal. Post-submit refresh now uses explicit authenticated contract reads owned by the persistent workspace; the final test injects a refresh-read failure, retries the read, requires live pending status before reload, and verifies persistence after reload. Initial narrow-calendar word wrapping was also replaced with mobile codes and a full accessible status key.

### Screenshots and accessibility

Nine screenshots were generated by the final passing run. Desktop, calendar-mobile and list-mobile captures were visually reviewed; viewport/keyboard/reflow checks ran in all three engines. The manifest records actual PNG pixel sizes and hashes (WebKit uses a 2× device scale). Capture viewports:

- `{engine}-attendance-desktop.png` — 1440 × 1000 viewport, full page.
- `{engine}-attendance-mobile.png` — 390 × 844 viewport, full page calendar/details/history.
- `{engine}-attendance-list-mobile.png` — 390 × 844 viewport, full page list with internal table scroll.


| Engine | Desktop | Mobile calendar | Mobile list |
| --- | --- | --- | --- |
| chromium | [Desktop](../qa/evidence/ess2-attendance/chromium-attendance-desktop.png) | [Mobile](../qa/evidence/ess2-attendance/chromium-attendance-mobile.png) | [List](../qa/evidence/ess2-attendance/chromium-attendance-list-mobile.png) |
| firefox | [Desktop](../qa/evidence/ess2-attendance/firefox-attendance-desktop.png) | [Mobile](../qa/evidence/ess2-attendance/firefox-attendance-mobile.png) | [List](../qa/evidence/ess2-attendance/firefox-attendance-list-mobile.png) |
| webkit | [Desktop](../qa/evidence/ess2-attendance/webkit-attendance-desktop.png) | [Mobile](../qa/evidence/ess2-attendance/webkit-attendance-mobile.png) | [List](../qa/evidence/ess2-attendance/webkit-attendance-list-mobile.png) |

Checks include absence of attendance hydration errors, single H1, labelled controls/tables/scroll regions, textual status (not color alone), selected-date/current-view semantics, keyboard day activation, modal focus containment and Escape/focus return, loading status, error alert and success status, reduced motion, no page overflow at 320/390/768 widths, and a 200% root-font scaling reflow probe. Safari reverse-Tab escape was found during verification and addressed through an opt-in deterministic dialog traversal; attendance openers also receive explicit focus so close restores the correct button under Safari. Native date/time segment navigation is retained. Other dialog consumers are unchanged by default. Attendance scroll regions explicitly handle Left/Right keys because native Safari region scrolling was inconsistent; child controls and modified keys retain their own behavior.

Native browser zoom, screen-reader interaction, OS-level high contrast, full contrast audit and physical iOS/Android touch testing are not certified by these checks.

Build/source and screenshot provenance: [source manifest](../qa/evidence/ess2-attendance/source-manifest.json). Consolidated check counts: [checks summary](../qa/evidence/ess2-attendance/checks-summary.json). Both 40-row gate CSVs match their pre-implementation SHA-256 values. Existing global CSS autoprefixer and Python asyncio deprecation warnings are non-failing; no new focused ESLint warnings remain.

## Remaining restrictions and review boundary

- No employee raw punch history contract exists; the workspace explicitly labels daily stored punches and does not offer raw-punch editing or clock-in/out.
- A day without an attendance record cannot be regularized here. No inferred absence or fabricated holiday/shift/day record is created by the monthly API.
- Overtime is recorded time, not approved pay. No financial/statutory calculation or entitlement promise was added.
- Finalized rows remain read only. HR's existing governed close/reopen process remains outside ESS.
- Shift/holiday references retain their existing master-data names; these labels are not a separately frozen historical name snapshot. Unfinalized holiday context may also come from the existing authorized resolver.
- Unfinalized explanations reflect current resolver configuration for that work date, not a frozen historic policy snapshot. Finalized explanations are withheld.
- Correction time entry is explicitly UTC; local tenant-time entry would need a separately reviewed DST-ambiguity input contract. Tenant-local display is implemented and tested.
- This is a focused ESS-2 suite, not a rerun of every legacy browser suite. Historical evidence is preserved; older attendance-launch automation contains superseded screen-label expectations and is not acceptance evidence for this implementation.
- Existing production/storage/release exclusions and formal accessibility review remain open. Frozen gate files must remain byte-for-byte unchanged. No staging deployment or release-gate promotion is implied.

Stop after ESS-2 review. Do not begin ESS-3 automatically.

## Reproduction and isolation

Use a disposable PostgreSQL 16 database named `hrms_ess2`, bound to `127.0.0.1:55440`, with `DJANGO_SETTINGS_MODULE=config.settings.staging`, explicit local database credentials and allowed hosts `localhost,127.0.0.1,testserver`. Run only existing migrations into this empty database. Tests refuse another browser-fixture database/host. Production web demo data must be disabled.

1. Run `.venv/bin/python backend/tests/ess2_test_server.py` on `127.0.0.1:8048`. It retains Django `--noreload` and raises only the local test-process TCP backlog from 10 to 128 to accommodate SSR read bursts; all application read timeouts are unchanged.
2. Build with `HRMS_ENABLE_DEMO_DATA=false HRMS_API_BASE_URL=http://127.0.0.1:8049/api/v1 pnpm --dir web build`.
3. Start the production output using `NEXT_DIST_DIR=.next/build`, the same API base, `HRMS_COOKIE_SECURE=false`, an empty bearer-token override and Next port `3149`. The test runner owns forwarding/fault port `8049`; it is never a staging proxy.
4. Run `caffeinate -i pnpm --dir web exec playwright test --config playwright.ess2.config.ts` on macOS with the dedicated database environment. The suite provisions a unique guarded sandbox per browser and verifies its removal in `afterAll`.
5. Run the explicitly named Django contract classes and selected pytest regressions recorded in the logs. Run database test processes sequentially; Django and pytest share the derived `test_hrms_ess2` database.
6. After recording fixture counts and final hashes, stop only the owned local servers and remove the owned disposable database container/volume. No production or staging host is involved.

Focused backend commands (with the isolated environment above):

```sh
.venv/bin/python backend/manage.py test \
  tests.test_ess2_attendance_contract.Ess2AttendanceContractTests \
  tests.test_ess1_profile_contract.Ess1SelfProfileContractTests --keepdb --noinput
.venv/bin/python -m pytest \
  backend/tests/test_db6_attendance_close_integrity.py \
  backend/tests/test_phase0_api_smoke.py \
  -k 'monthly_close_is_idempotent or close_rejects or payroll_input_references_closed_attendance or employee_regularization_history_returns_paginated or attendance_submission_and_manager_rejection_replay or employee_can_submit_attendance_regularization or employee_cannot_submit_regularization_for_locked or employee_cannot_submit_duplicate_pending_regularization or employee_cannot_submit_regularization_with_checkout or custom_attendance_reviewer_role_gates_manager' \
  --reuse-db -q
pnpm --dir web typecheck
pnpm --dir web exec eslint src/app/ess/attendance src/components/patterns/hr-admin-action-modal.tsx src/components/patterns/pagination-bar.tsx src/components/shell/workspace-navigation-feedback.tsx src/app/api/me/attendance-records/route.ts src/app/api/me/attendance-regularizations/route.ts src/lib/api.ts src/lib/types.ts tests/e2e/ess2-attendance-certification.spec.ts playwright.ess2.config.ts
.venv/bin/python backend/manage.py check
```
