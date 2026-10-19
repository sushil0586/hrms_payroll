# ESS-3 Leave workspace certification

**Decision: CONDITIONAL. Scoped local functional verification: PASS. Completed 2026-10-19 IST.** ESS-3 Leave is implemented and verified for its supported contracts. No production certification or frozen release-gate promotion is claimed; formal accessibility assessments and existing production release gates remain outstanding.

## Scope established from the approved sequence

The [ESS tracker](hrms-ess-coverage-tracker.md) identifies Leave as ESS-3: entitlement/application/cancellation/history, with workflow/calendar/leave-year display audit and an employee-effective holiday contract dependency. The [Accerio implementation](accerio-design-system-implementation.md) and [certification](accerio-design-system-certification.md) establish the shared semantic theme, presentation components and conditional accessibility boundaries.

Complete existing functional scope: current policy-resolved entitlements; application by leave type/date/day portion/reason; optional or required evidence file/reference; validation and backend policy decisions; status counts and paginated own history; request detail, recorded per-day unit calculation, approver steps and decision notes; protected evidence download; policy-controlled withdrawal, direct cancellation or cancellation requiring approval. The workspace must preserve existing audit, ledger, payroll collision and closed-period protections.

No employee-effective upcoming-holiday endpoint or exact per-policy leave-year date range is available in the existing self contract. Those displays remain unavailable. Recorded request breakdowns may disclose the holiday/shift names already authorized by that contract. HR administration endpoints are not reused as employee disclosure endpoints.

## Implementation architecture

- Existing Accerio semantic stylesheet and ESS compact layout; no new CSS file, color literals, dependencies or component library.
- Reused `WorkspaceStandardHeader`, `WorkspaceStandardPanel`, `WorkspaceInformation`, status badges, filter bar, pagination, action modal, validation, async buttons and toast patterns.
- Shared `WorkspaceCalendar` adds optional label/key inputs; attendance defaults remain identical. Leave supplies only dates and counts of requests on the loaded page. It never computes entitlement, chargeable units, working days, holiday applicability or approval policy.
- Dedicated server loader reads existing dashboard, own leave history and own leave types, with bounded read timeouts; it no longer loads unrelated legacy attendance options/regularization history. No API contract or backend business implementation change.
- Authorized request detail loads independently of the history page for deep links. UUID validation and backend employee/tenant scoping remain authoritative.
- Status tabs and pagination use authenticated document GET navigation. Search/type/date/calendar filters explicitly identify their loaded-page scope; global status totals retain backend meaning.
- Removes aggregate mixed-type availability and duplicated page-local “upcoming/recent decision” summary cards. Balance units remain generic where the balance contract does not provide the leave type’s unit.

## Defects found and fixed

- Date-only display and calendar interval calculations used browser-local parsing; UTC date-only parsing/formatting now avoids date shifts and DST day-length changes. Timestamp displays explicitly identify UTC and hydrate consistently.
- Application idempotency signature omitted start/end day portions. Those fields now participate without changing the existing backend idempotency contract.
- Client overlap checks blocked any intersecting date range even when day portions might be compatible. Loaded-page overlap remains advisory; final conflict/policy decisions belong to the backend.
- Off-page request IDs previously silently failed to open. Existing self detail endpoint now resolves them without fetching other employees’ history.
- Balance labels rounded backend decimal values to one decimal. They now preserve the exact backend string; a 12.25-unit fixture guards precision without changing calculations.
- Success feedback disappeared as its modal unmounted. A parent status message acknowledges an actual successful application.
- Unknown collision evidence previously appeared as “Clear”; missing projection now says “Not provided”.

## Safety boundaries

No migrations, backend business-service edits, payroll/statutory calculations, RBAC changes, raw punch edits, historical record updates, live Lightsail access or frozen gate changes. Synthetic test data is isolated from product pages and removed after verification. Previous certification evidence is preserved.

## Results and evidence

All final acceptance browser runs used production build **`RGJTsthC70xoAZKV8g8Xj`**, demo mode disabled and isolated PostgreSQL 16. No failed, skipped or flaky final cases. Diagnostic/preflight runs are excluded.

| Check | Final result | Evidence |
| --- | --- | --- |
| ESS-3 Leave, three engines | **27 passed**: 9 each Chromium/Firefox/WebKit | [Log](../qa/evidence/ess3-leave/browser-final.txt), [JSON](../qa/evidence/ess3-leave/browser-results.json) |
| Existing ESS-1 Dashboard/Profile regression | **24 passed** | [Log](../qa/evidence/ess3-leave/ess1/browser-final.txt), [JSON](../qa/evidence/ess3-leave/ess1/browser-results.json) |
| Existing ESS-2 Attendance regression | **24 passed** | [Log](../qa/evidence/ess3-leave/ess2/browser-final.txt), [JSON](../qa/evidence/ess3-leave/ess2/browser-results.json) |
| **Browser total** | **75 passed** | [Source/build/screenshot manifest](../qa/evidence/ess3-leave/source-manifest.json) |
| Self/tenant/request/evidence authorization | **6 passed** | [API contract log](../qa/evidence/ess3-leave/api-contract.txt) |
| Leave application/lifecycle/idempotency/policy regression | **20 passed**, 349 unrelated cases deselected | [Workflow log](../qa/evidence/ess3-leave/workflow-regression.txt) |
| Leave-year/operations/attendance-close integrity | **23 passed**: 13 + 6 + 4 | [Integrity log](../qa/evidence/ess3-leave/integrity-regression.txt) |
| Existing ESS-1/ESS-2 API contracts | **17 passed**: 7 + 10 | [Neighbor API log](../qa/evidence/ess3-leave/neighbor-api-regression.txt) |
| **Backend/API/PostgreSQL total** | **66 passed** | [PostgreSQL runtime](../qa/evidence/ess3-leave/postgres-runtime.txt) |
| TypeScript | PASS | [Log](../qa/evidence/ess3-leave/typecheck.txt) |
| Focused ESLint | PASS, zero warnings | [Log](../qa/evidence/ess3-leave/eslint.txt) |
| Django system check | PASS, zero issues | [Log](../qa/evidence/ess3-leave/django-check.txt) |
| Production build | PASS | [Log](../qa/evidence/ess3-leave/production-build.txt), [Stable build inputs](../qa/evidence/ess3-leave/build-inputs.json) |
| Diff whitespace | PASS | [Log](../qa/evidence/ess3-leave/diff-check.txt) |

Backend business services/selectors match HEAD; attendance projections/proxies/types retain their prior certified hashes, and the centralized theme matches foundation certification. See [dependency comparison](../qa/evidence/ess3-leave/preserved-dependencies.json). No backend business calculation, authorization, audit service or schema change was required.

### ESS-3 screenshot index

**18 ESS-3 screenshots**, with 12 ESS-1 and 9 ESS-2 regression screenshots: **39 final captures**. All paths, actual pixel dimensions and SHA-256 hashes are recorded in the manifest. Device pixel ratios differ between engines. These are responsive browser viewports, not physical-device or touch-assistive-technology certification.

| Surface | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| Desktop/history | [Image](../qa/evidence/ess3-leave/chromium-leave-desktop.png) | [Image](../qa/evidence/ess3-leave/firefox-leave-desktop.png) | [Image](../qa/evidence/ess3-leave/webkit-leave-desktop.png) |
| Calendar/day selection | [Image](../qa/evidence/ess3-leave/chromium-leave-calendar.png) | [Image](../qa/evidence/ess3-leave/firefox-leave-calendar.png) | [Image](../qa/evidence/ess3-leave/webkit-leave-calendar.png) |
| Narrow mobile, 320px | [Image](../qa/evidence/ess3-leave/chromium-leave-320.png) | [Image](../qa/evidence/ess3-leave/firefox-leave-320.png) | [Image](../qa/evidence/ess3-leave/webkit-leave-320.png) |
| Mobile, 390px | [Image](../qa/evidence/ess3-leave/chromium-leave-390.png) | [Image](../qa/evidence/ess3-leave/firefox-leave-390.png) | [Image](../qa/evidence/ess3-leave/webkit-leave-390.png) |
| Tablet, 768px | [Image](../qa/evidence/ess3-leave/chromium-leave-768.png) | [Image](../qa/evidence/ess3-leave/firefox-leave-768.png) | [Image](../qa/evidence/ess3-leave/webkit-leave-768.png) |
| Application dialog, 390px | [Image](../qa/evidence/ess3-leave/chromium-leave-form-mobile.png) | [Image](../qa/evidence/ess3-leave/firefox-leave-form-mobile.png) | [Image](../qa/evidence/ess3-leave/webkit-leave-form-mobile.png) |

Representative final desktop/calendar, tablet and mobile/dialog images were visually inspected. They retain the common indigo theme, aligned compact cards, readable decimal values, wrapping calendar labels and labelled horizontal history scrolling. Browser assertions reject document overflow at 320/390/768px; wide tables retain their data inside the scroll region.

Keyboard/accessible-name checks passed for native Enter activation, initial dialog control focus, Escape/opener restoration, visible focus and exact dialog/control names. Existing neighboring profile/calendar/dialog keyboard checks also passed. Reduced-motion preference and bounded transition duration were checked. **Screen-reader testing, native browser zoom and formal WCAG assessment are unverified.** No complete contrast inventory, automated axe audit or physical-device assistive-technology assessment is claimed.

## Accessibility assessment boundary

Keyboard focus, accessible names, dialog interaction, responsive bounds and reduced-motion behavior are browser checks. Screen-reader interoperability, native browser zoom and formal WCAG assessment are **unverified** unless separately recorded as executed. A browser smoke pass is not production certification.

## API reuse and permission boundary

| Existing contract | ESS-3 use | Authorization/policy ownership |
| --- | --- | --- |
| `GET /me/dashboard/` | Current assigned-policy balances | Existing employee context and backend balance services |
| `GET /me/leave-types/` | Authorized application choices/evidence hints | Existing employee policy resolution |
| `GET /me/leave-requests/` | Global status counts, bounded history pages | Existing self scope; page-local presentation filters are explicitly labelled |
| `GET /me/leave-requests/{id}/` | Independent deep-linked detail | Backend rejects another employee/tenant’s IDs |
| `POST /me/leave-requests/` | Actual multipart application and evidence | Existing validation, idempotency, audit and ledger movements |
| `POST /me/leave-requests/{id}/withdraw/` and `/cancel/` | Existing policy-advertised lifecycle actions | Server-provided availability/reasons; manager reapproval when configured |
| Existing attachment download | Protected own evidence | Existing artifact ownership and release restrictions |

No new endpoint or mutation permission is introduced. Required future development for exact employee leave-year dates or upcoming holidays is an approved employee-effective read projection with isolation tests; HR CRUD access is not a substitute. Server-side search/type/date filters would require an explicitly reviewed additive contract; this slice clearly scopes those filters to the current page.

## Acceptance and regression coverage

- Entitlements render API values without mixing leave types into a fabricated aggregate. Empty assignments remain an honest empty state.
- Status totals retain global meaning; status navigation resets pagination. Local filters can be cleared. Oversized page bookmarks resolve to the last populated page without changing the backend contract.
- Calendar displays selected month/day and request counts, including leap-day boundaries, with full accessible labels and compact mobile text. It is a request-history view, not an entitlement or holiday calendar.
- Date-only values preserve their dates across server/browser timezone differences. Relative date filters use the existing UTC reference date; calendar-year filtering is not leave-year policy resolution. Timestamps explicitly show UTC. Tenant-local policy decisions remain backend-owned.
- Applications validate fields, day portions and evidence; duplicate activation sends one request. Backend tests cover canonical idempotent replay and mismatched/concurrent submissions.
- Detail includes recorded unit breakdown, approval timeline, evidence, restrictions, collision availability and explicit cancellation-request kind. No missing collision projection is presented as cleared.
- Withdrawal, direct cancellation and governed cancellation/rejection exercise actual APIs and stored statuses. Rejection retains approved leave and existing ledger protections.
- Failure injection exercises real loading, read error and GET retry; empty filtered views are distinguished from load failures. No failure fallback fabricates balances or requests.
- Browser checks use production Next with demo mode disabled against disposable loopback PostgreSQL. Existing ESS-1 and ESS-2 assertions are retained and evidence redirected to new folders.

## Changed files attributable to ESS-3

- `web/src/app/ess/leave/page.tsx`: bounded query normalization and dedicated loader.
- `web/src/app/ess/leave/leave-workspace.tsx`: shared presentation, honest scope, calendar, date handling, deep links, feedback and cancellation kind.
- `web/src/lib/api.ts`: additive leave-only loader over existing self endpoints; high-page recovery.
- `web/src/components/patterns/workspace-calendar.tsx`: optional accessible label/status-key inputs; attendance defaults preserved.
- `backend/tests/test_ess3_leave_contract.py`, `backend/tests/ess3_browser_fixture.py`: isolated scope and browser data/closed-snapshot checks.
- `backend/tests/test_phase0_api_smoke.py`: three date-fixture corrections only. Weekend candidates are replaced with working dates so the original backdating/cancellation assertions actually run; no assertion or policy expectation is removed.
- `web/playwright.ess3.config.ts`, `web/tests/e2e/ess3-leave-certification.spec.ts`: three-engine certification and guarded cleanup.
- This report, the ESS coverage tracker and `docs/qa/evidence/ess3-leave/`.

The working tree contained substantial prior user/ESS-1/ESS-2/foundation changes. They are preserved and are not newly attributed to ESS-3. No Lightsail infrastructure file, frozen gate CSV or unrelated module implementation is edited by this task.

## Current-state source references

- [Self API views](../../backend/apps/common/api_views.py): `MeLeaveRequestListCreateView`, `MeLeaveRequestDetailView`, withdrawal/cancellation and protected attachment views define the reused contracts and employee context.
- [Employee selectors](../../backend/apps/common/selectors.py): `get_employee_leave_summary`, `get_employee_leave_requests` and detail projection provide current balances, request action, recorded unit breakdown and policy-advertised lifecycle availability. The summary year is derived across resolved policies; it is not an exact per-balance leave-year date disclosure.
- [Leave services](../../backend/apps/leave_management/services.py): submission, configured approval, unit resolution, withdrawal, cancellation and cancellation rejection remain authoritative.
- [Leave-year services](../../backend/apps/leave_management/year_end_services.py): immutable ledger/lot, expiry, close/lock and compensating-correction behavior is preserved and tested.
- [Shared theme](../../web/src/styles/accerio.css), [standard patterns](../../web/src/components/patterns/workspace-standard.tsx), [information presentation](../../web/src/components/patterns/workspace-information.tsx) and [action modal](../../web/src/components/patterns/hr-admin-action-modal.tsx) are reused; no competing design system is introduced.

## Reproduction and infrastructure boundary

Use disposable loopback PostgreSQL 16 databases `hrms_ess2` and `hrms_ess1`, existing migrations, and the guarded `manage_playwright_workspace` command. The ESS-3 fixture explicitly creates restrictive, directly cancellable and approval-required test policies; it does not assume cancellation is universally available. Lifecycle eligibility follows the existing backend’s current configured policy. No immutable lifecycle-policy snapshot behavior is newly claimed.

Run existing ESS-2 QA Django on 8048 and ESS-1 Django on 8038, queue size 128. Production Next uses `.next/build` with demo mode disabled: 3169 → fault proxy 8059 → 8048 for ESS-3, 3149 → 8049 → 8048 for ESS-2, and 3139 → 8039 → 8038 for ESS-1. Suites own their loopback forwarding proxies. Each suite has one worker; per-engine fixtures and existing protected teardown remain isolated.

```sh
HRMS_CERT_EVIDENCE_DIR="$PWD/docs/qa/evidence/ess3-leave" \
  pnpm --dir web exec playwright test --config playwright.ess3.config.ts
POSTGRES_DB=hrms_ess1 HRMS_CERT_EVIDENCE_DIR="$PWD/docs/qa/evidence/ess3-leave/ess1" \
  pnpm --dir web exec playwright test --config playwright.ess1.config.ts
POSTGRES_DB=hrms_ess2 HRMS_CERT_EVIDENCE_DIR="$PWD/docs/qa/evidence/ess3-leave/ess2" \
  pnpm --dir web exec playwright test --config playwright.ess2.config.ts
```

These commands assume the guarded local database/server environment is already established. They are not instructions to run fixtures against staging. Browser timezone is Asia/Tokyo; ESS-3/ESS-2 synthetic tenant timezone is America/New_York. Date-only labels remain unchanged between server/browser; timestamps explicitly identify UTC. On macOS use process-scoped `caffeinate -dims`; no global power setting changes are necessary.

## Preflight diagnostics, distinct from final acceptance

Earlier attempts are retained under `../qa/evidence/ess3-leave/preflight/` and excluded from final pass counts:

- The initial production render reported React text-hydration errors. Locale-dependent date/timestamp formatting was removed; final runs reject those hydration errors across all three engines.
- Rendered review corrected balance-card padding, redundant panel nesting and verbose/technical employee-facing copy. Balance precision now preserves the backend’s decimal string rather than rounding to one decimal; a fractional entitlement guards this case.
- Three existing API fixtures landed on weekends for the execution date. Only their working-date candidates changed; original backdating, cancellation rejection and required-evidence assertions remain intact. See `test-fixture-date-fixes.diff`.
- Exact nested-label text in Playwright includes select option text, while the control’s accessible name is exactly “Leave type”. The harness now targets that exact role/name; the minimal diagnostic and prior traces are retained.
- The lifecycle fetch follows the existing Next 308 canonical-path redirect. Response assertions now wait for the terminal response and still require 200; backend requests and stored outcomes are verified.
- A default restrictive test policy correctly prevented cancellation. Fixtures now explicitly separate restrictive, directly permitted and reapproval-required policies instead of expecting an unsupported transition.
- Screenshot capture no longer blurs focus inside an open dialog, so Escape/focus-restoration checks exercise actual keyboard state.
- A WebKit test started a document GET while the mutation refresh was finishing. The harness now waits for the actual updated history row and reopens details through View. This strengthens verification of read refresh; status, evidence and restriction assertions remain intact.
- The additional streaming ownership test consumes the response without explicitly closing the test client’s transaction connection; owned synthetic files are deleted and absence checked. Earlier harness errors remain retained.
- An initially queued integrity run was interrupted before executing cases to avoid overlapping test-database setup; the completed sequential integrity run supplies the acceptance count.

No test assertion, production permission, historical-close guard or business calculation was weakened to obtain passing results.

## Cleanup, release disposition and review stop

[Cleanup summary](../qa/evidence/ess3-leave/cleanup-summary.json) verifies zero tenants, users, employees, leave requests/balances/ledger transactions/lots/policy periods, attendance records/regularizations/closes and document artifacts in both browser databases and the PostgreSQL test database. Owned uploaded files were deleted and absence checked. All six ESS-3/ESS-2 per-engine closed snapshot checks passed before guarded synthetic teardown. Temporary preflight workspaces were also removed.

The owned PostgreSQL container and anonymous volume were removed. All nine owned test ports are closed; unrelated user services were left alone. Process-scoped sleep prevention was stopped, with no global power-setting change. No Lightsail access or deployment occurred.

Both frozen release-gate CSVs retain their recorded hashes and **40 rows each**; no status was promoted. Previous ESS-1/ESS-2/foundation certification evidence is preserved. Existing global stylesheet/autoprefixer and Python asyncio deprecation warnings are nonblocking and remain outside this scoped change.

**Supported ESS-3 functionality: local PASS. Overall/release: CONDITIONAL.** Exact per-policy leave-year dates and an employee-effective upcoming-holiday feed still require approved self projections. Search/type/date/calendar remain explicitly scoped to the current history page. Formal screen-reader/native zoom/WCAG assessments and applicable existing production release gates still require acceptance evidence. Application idempotency is the existing backend contract; no new lifecycle lost-response replay guarantee is claimed.

**Not production certified. Stop after ESS-3 for review. ESS-4 through ESS-6 are not started.**
