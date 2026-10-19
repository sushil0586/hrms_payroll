# Accerio HRMS ESS-6 final product certification

Date: 2026-10-19. Scope: final ESS consolidation and targeted presentation remediation. This report distinguishes fresh ESS-6 execution from inherited ESS-1–5 evidence. No deployment or production certification is implied.

## Actual route and workflow inventory

The source inventory was captured before editing: [route/function inventory](../qa/evidence/ess6-final-product/route-function-inventory.md), [source functions/modals/API references](../qa/evidence/ess6-final-product/frozen-source-inventory.json), [baseline hashes](../qa/evidence/ess6-final-product/source-baseline.json). All ten routes were reviewed, including statutory declarations previously excluded from browser certification.

| Route | Actual supported experience | Restrictions |
|---|---|---|
| `/ess` | Identity, recorded attendance, leave balances, actual pending counts, canonical service/form links | No invented holiday, completeness or announcement projections |
| `/ess/profile` | Overview, personal/contact, employment/organization, payroll/documents, access/update classification; mobile section selector | Existing own GET projection; no employee profile mutation or approval policy |
| `/ess/attendance` | Month navigation, calendar/list, day detail, recorded hours/shifts/exceptions, UTC correction form, history, pagination, retry, finalized restrictions | Raw punches cannot be edited; no invented overtime entitlement |
| `/ess/leave` | Entitlements, filters, calendar, full/half-day application/evidence, details/history, withdrawal and policy-permitted cancellation | Leave-year/employee-effective holiday projection APIs remain unimplemented |
| `/ess/documents` | Requirements, permitted uploads/replacements, expiry/file validation, versions/review/filter/paging, protected download | Metadata review is supported; no separate inline file-preview contract or letter-request service |
| `/ess/payslips` | Published list/year/search/page, full detail, protected download, receipt/read acknowledgment and access history | Publication/pay date does not prove bank payment |
| `/ess/statutory-declarations` | Fiscal-year selection/filter/page, own statutory profile, create/update setup, proof register/filter/sections, proof/reference/upload/detail, submission, submitted/locked restrictions | HR verification/locking remain privileged; masked identifiers are presentation, not server withholding |
| `/ess/requests` | Separate Leave/cancellation/attendance sources and statuses, filtering/paging, explicitly page-local search/sort, canonical source details | No invented universal approval state or document-letter request workflow |
| `/ess/notifications` | Inbox filters/paging, category/channel/delivery/read distinction, details, read/unread mutation, canonical source navigation, retry | No claim of genuine email/SMS/push/realtime provider delivery |
| `/ess/settings` | Own account context, profile/inbox/requests/recovery navigation and shared sign-out | No writable preferences, direct credential change, session administration or privileged settings contract |

Shared shell actions include service search, desktop/mobile navigation, skip link, sign-out and authentication/session recovery. Login/forgot-password/reset/setup are supporting authentication routes. Recovery navigation does not certify provider dispatch or token delivery. Unsupported preference persistence is explicitly unavailable rather than reported as a successful journey.

## Targeted remediation and contract preservation

- `web/src/styles/accerio.css`: semantic contrast tokens override legacy navigation/form/table selectors; status colors keep their semantic meaning. Portalled detail labels use the same readable muted token. Validation error text retains its error treatment.
- `web/src/components/patterns/hr-admin-action-modal.tsx`: the shared scrolling body is a named region with opt-in keyboard tab focus for read-only content. Form bodies remain programmatically focusable without adding a stop to their certified Tab order. Existing Escape, dirty-form guard, focus trap/restoration and bounded header/footer remain.
- `web/src/lib/ui/employee-document-format.ts`: reusable presentation mask for authorized own identifiers.
- `web/src/app/ess/statutory-declarations/statutory-declaration-workspace.tsx`: shared compact header, shared proof table/scroll region, Accerio dialog containment, stable shared date formatting, source decimal precision, masked PAN/UAN, real navigation and read-only submitted/locked setup. Removed decorative readiness claims and the legacy filter-grid wrapper that constrained the shared filter bar.
- Added test-only synthetic fixture, statutory authorization/state contracts, integrated browser suite/configurations and pinned axe-core development dependency. No new component library.

Employee-scoped APIs, payloads, authorization, domain services, migrations, financial/statutory calculations, audit behavior and historical protections are preserved. The authorized statutory self API still returns own identifiers; masking is not a new backend disclosure policy. Existing section aggregation remains backend/application behavior, not a new statutory calculation. Shared components continue serving their existing consumers; no MSS workflow redesign is included.

## Evidence and decision

**Final ESS functional decision: FAIL. Staging/deployment: NO-GO.** Production certification is not granted; current results and unresolved historical findings are recorded below.

## Accessibility assessment scope

Assessment target is [WCAG 2.2](https://www.w3.org/TR/WCAG22/) A/AA. axe-core **4.12.1** runs the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` rule tags on rendered documents, including open dialogs. This is an automated subset, not full conformance. Full rule results retain `passes`, `incomplete`, `violations` and inapplicable rules; incomplete findings are not silently treated as passes. The [axe API documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) describes these result categories.

| Area / success criteria | Executed method and practical limit |
|---|---|
| Structure/name/role/value: 1.3.1, 2.4.2, 2.4.4, 3.1.1, 3.3.2, 4.1.2 | Axe DOM rules plus Playwright accessible-name assertions, labelled tables/regions/dialogs, one route H1. Exact actually-passing rule-to-SC tags are preserved in `accessibility-results.json`; no full SC conformance claim. |
| Text contrast: 1.4.3 | Real rendered axe contrast checks before/after central token fixes. Incomplete glyph/native-control checks remain separately indexed for manual review. |
| Resize/reflow: 1.4.4, 1.4.10 | Actual native Chrome 200%/400% zoom on ten routes, 1280 outer width producing 640/320 CSS viewport widths; per-route screenshots and measured page overflow. This does not certify every dialog at native zoom or native Firefox/WebKit zoom. |
| Keyboard, traps, bypass, order, focus: 2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7 | Real Tab/Shift-Tab/Escape/skip-link and focused-region scrolling assertions; small-screen action containment and restoration checks. Visible focus reviewed in screenshots; no claim of exhaustive focus-obscuration certification. |
| Input purpose/spacing: 1.3.5, 1.4.12 | Applicable automated rules only; user stylesheet/text-spacing assessment is not independently executed. |
| Target size: 2.5.8 | Applicable axe WCAG 2.2 rule on routes/dialogs; does not prove every possible dynamic state. |
| Status/error feedback: 3.3.1, 4.1.3 | Validation/retry outcomes and existing alert/status semantics inspected; spoken announcements NOT VERIFIED. |
| Reduced motion | Browser preference emulation and existing shared reduced-motion CSS reviewed; sampled flows exercised with preference enabled. Not a blanket animation or vestibular-safety certification. |
| Screen-reader review | **NOT VERIFIED.** Native AX inspection is available, but no screen-reader speech/output review was executed. |
| Formal WCAG assessment | **NOT VERIFIED.** Automated checks and bounded manual review do not close this gate. |

WebKit diagnostic probing found Arrow Down did not scroll the focused region, while native Page Down did (scrollTop 0 → 280). The final keyboard case uses supported Page Down and retains the scroll assertion, focus containment and focus-return assertions. No test expectation from ESS-1–5 was removed or weakened.

## Diagnostic attempts and defects

Diagnostic failures remain evidence, separately from acceptance totals:

- Initial axe discovery: all ten routes had legacy text-contrast overrides. Central semantic overrides remediate navigation labels, form labels, colored table badges and selected payslip hints. The post-fix ten-route desktop smoke recorded zero violations.
- Initial integrated attempt: the new fixture attempted to delete an existing seeded statutory declaration. PostgreSQL correctly rejected historical deletion. Fixture setup was corrected to retain history and create a distinct supported synthetic fiscal year; no trigger was disabled or bypassed. The hook failure and unexecuted cases remain recorded.
- Integrated attempt 2: **17 passed / 3 failed / 0 skipped** (Chromium only). Two new independent ORM probes used incorrect model field names (`action_type`, `artifact`); corrected to actual `action`, `output_artifact`. The third failure exposed contrast and keyboard-focusability defects in statutory proof details; corrected through central presentation/components.
- Integrated attempt 3: **36 passed / 2 failed / 1 interrupted / 21 unexecuted** of 60 planned. New Leave fixture lacked the policy period required for ledger movements; it now configures that synthetic period and retains the consumption-reversal assertion. The statutory upload selector used a label query that did not resolve the browser's actual accessible control; the final test uses the actual named combobox. After isolated statutory success, the obsolete diagnostic run was stopped before the final complete acceptance run. No interruption is counted as a pass.
- Isolated statutory diagnostic: **1 passed**, actual create/upload/submit/read-only flow; not added to final acceptance totals. Mobile isolation: **1 failed**, Arrow Down scrolling assumption, investigated with the actual focused/scrollable DOM and Page Down probe; not misclassified as an application pass.
- Backend attempt 1: Django reports **37 tests run, 1 class-setup error**, new six-case class unexecuted: fixture tax-regime values did not match existing choices. Attempt 2: **43 run, 1 error**: locked fixture required actual submitted/verified/locked timestamps. Corrected synthetic inputs without relaxing backend guards. Final runs are separately listed in acceptance totals.

The statutory visual review also identified a nested legacy form grid constraining the centralized filter bar. Removing that wrapper is the sole source delta between the neighboring regression build and final integrated/zoom build; hashes and both build identities are retained. An initial runtime restart command safely rejected a process-name mismatch before mutation; the retry verified both owned PID and bound loopback port before replacement.

## Remaining policy, provider and production gates

Keep these independently open: approved employee leave-year projection API; employee-effective holiday projection API; writable profile/change-approval policy and contracts; notification preference/security-session contracts; real email/SMS/push/realtime provider integration; recovery delivery; production object storage/signed-access integration; statutory business acceptance and all existing production/feature-manifest/release requirements. Synthetic configured policies are test fixtures, not new customer policy.

Backend tests exercise direct own/foreign/cross-tenant access, privileged rejection, real state transitions, submitted/locked restrictions and PostgreSQL close protections. They do not authorize production release or certify legal/statutory calculation correctness. The local backend regressions run on the workspace Python environment; the production Python image build/WSGI import is separate evidence, not an assertion that all tests ran inside that image.

## Fresh contract and build checks

No API contract was added or changed. Integrated journeys use existing `/auth/login/`, `/auth/session/`, `/me/profile/`, `/me/dashboard/`, attendance-record/regularization, Leave application/lifecycle/attachment, employee-document, published-payslip/read/download, notification read-state and statutory declaration/item/proof-upload/submit endpoints. A synthetic authorized manager approval is an API precondition for the employee cancellation journey; no MSS interface/workflow is redesigned.

The statutory suite verifies own-only lists, foreign/cross-tenant detail/PATCH/submit/item rejection, foreign profile creation rejection, exact decimal proof persistence, actor/timestamp submission, protected verification status, locked writes, revoked sessions and role restrictions. Integrated database probes independently read browser-created attendance, Leave balances/ledger, documents, notification state, payslip hash/access events and submitted statutory amounts/actor. Existing DB-6 tests cover late-write/reopen history, changed sources, blockers, tenant/reason checks and payroll references to closed attendance. DB-3 tests cover persisted leave-year/ledger integrity.

Production frontend builds completed with the pre-existing autoprefixer warning about `align-items: end` in unrelated `globals.css`; no unrelated styling refactor was made. Production backend image built from an owned sanitized context excluding media, environment files, caches and local databases, then imported WSGI in a network-disabled disposable container. An earlier root-context image was never run; both owned image IDs are included in cleanup. This build evidence does not approve production storage/configuration packaging.

## Later findings and unresolved regression

- `integrated-final`: **60 passed / 3 failed / 0 skipped**, all three failures in `afterAll` teardown after the final case body completed. The existing synthetic cleanup command bulk-deletes leave ledger rows, but compensation rows protect their source transaction. The ESS-6 test helper now deletes owned ledger leaves first under the existing `authorized_synthetic_tenant_teardown` capability, with exact local-database, sandbox/seed/owner checks. No production cleanup command, retention trigger or domain service was changed. Retained remnants are independently cleaned and audited below.
- `integrated-acceptance`: **62 passed / 1 failed / 0 skipped**. The remaining WebKit failure was actual statutory modal focus restoration. macOS/WebKit pointer activation leaves the trigger unfocused; the existing shared modal therefore captures the previous body focus. Statutory modal triggers now explicitly focus their invoking button, matching the already-certified Leave and Attendance pattern. Assertions are retained and the complete integrated suite is rerun on the final focus-fix build.
- ESS-5 neighboring regression: **32 passed / 1 failed / 0 skipped**. Firefox raises **React error #418** after the platform-only account is correctly redirected from `/ess/settings` to `/platform-admin`. The failing trace locates the exception after the Platform Admin document loads; protected ESS content is absent and privileged employee API checks correctly reject access. This remains an **application failure**, not an infrastructure exclusion or test pass. Platform Admin has not been modified under this ESS-only task. The exact underlying markup/stream timing cause is **not yet proven**; its destination shell lacks the ESS parsed-document boundary, which is a hypothesis rather than a certified root cause.
- A read-only diagnostic repeated the same platform redirect **12 times** on the retained ESS-5 production artifact and observed no page errors. This does **not** establish that the failure is pre-existing, fixed or safe; it is intermittent evidence only and is excluded from acceptance totals. The original Firefox failure remains an open required browser gate.

The final certification therefore cannot be an overall functional PASS even if the ESS-only integrated suite passes. No broader Platform Admin/MSS implementation or release-gate advancement is authorized or undertaken. Existing neighboring MSS notification/navigation smoke cases are only rerun as part of the unchanged ESS-5 regression suite.

**Native zoom evidence limitation:** native Chrome 200%/400% controls were actually exercised and all twenty route-level DOM reflow measurements show no page overflow. Manual image review subsequently found that Playwright full-page capture at native zoom crops the native rendering. Those PNGs are retained as diagnostics, not accepted full-window visual proof. Native zoom is therefore **PARTIALLY VERIFIED**: control/viewport/DOM reflow verified; complete native-window visual review NOT VERIFIED. Ordinary responsive screenshots are not substituted for that missing review. Native Firefox/WebKit zoom and all-dialog native zoom remain unverified.


## Open WebKit keyboard-scroll defect

The final unchanged ESS-5 mobile/tablet keyboard scenario fails in WebKit: after focusing the My Requests horizontal region and pressing Arrow Right, `scrollLeft` remains 0. The shared `WorkspaceTableScrollRegion` already implements an Arrow Left/Right handler; the final trace confirms the attempted control sequence, but the underlying focus/hydration/browser timing cause is **not established**. This is retained as an **open application/accessibility failure**, not reclassified as infrastructure or waived. No assertion or timeout was changed. The final ESS-only integrated suite passes 63 cases but does not replace this separate required failing keyboard scenario.


## Aggregate audit correction and final reviewed run

The initial neighboring Attendance run was **21 passed / 3 failed**, not 24 passed. Aggregate JSON auditing caught all three mobile keyboard failures: adding the shared dialog body to normal Tab order broke the existing Shift-Tab-to-close assertion. Earlier progress messages were premature and are superseded here. The read-only body tab stop is now opt-in (`focusableBody`), and the original form order is preserved. No existing expectation was weakened. The complete 204-case matrix was rerun on one reviewed build after this fix.

The earlier required matrix had **200 passed / 4 failed** (three Attendance focus failures and one Firefox Platform Admin redirect hydration error). The audit rejection is retained in `acceptance-audit.txt`; subsequent cleanup removed only completed synthetic fixtures and retained all failed-attempt traces. The earlier 203/1 progress total was not accepted as certification. Statutory focus restoration and Attendance tab order are separately verified in the final run. The historical Platform Admin #418 failure remains open unless a root-cause fix and accepted evidence close it; a later passing sample alone is not that closure.

## Final executed results

| Fresh suite | Passed | Failed | Skipped | Blocked | Unexecuted |
|---|---:|---:|---:|---:|---:|
| Dashboard/Profile | 24 | 0 | 0 | 0 | 0 |
| Attendance | 24 | 0 | 0 | 0 | 0 |
| Leave | 27 | 0 | 0 | 0 | 0 |
| Documents/Payslips | 33 | 0 | 0 | 0 | 0 |
| Requests/Notifications/Settings + neighbors | 31 | 2 | 0 | 0 | 0 |
| ESS-6 integrated routes/journeys/accessibility | 63 | 0 | 0 | 0 | 0 |

**204 selected browser cases: 202 passed / 2 failed / 0 skipped / 0 blocked / 0 unexecuted / 0 flaky or retried.** By engine: chromium: 68 passed, 0 failed; firefox: 67 passed, 1 failed; webkit: 67 passed, 1 failed. Fresh ESS-6 results are not inherited prior 141/108 counts. All diagnostic attempts remain separate.

All six final suites used production build **`6m52xCGKhArsk6dT14t1k`**, `.next/ess6-final-reviewed`, with matching source hashes. Native Chrome DOM zoom metrics use the earlier `.next/ess6-accepted` build before focus/Tab-only handler changes; they are scoped DOM evidence, not full native visual certification. Earlier builds and failed tests are retained as diagnostics. [Reviewed source freeze](../qa/evidence/ess6-final-product/reviewed-build-source.json) and [matrix command exit codes](../qa/evidence/ess6-final-product/final-matrix-exit-codes.json) establish provenance.

**Backend/API/PostgreSQL: 66 passed / 0 failed / 0 skipped / 0 blocked / 0 unexecuted**: 43 focused contracts (including six new statutory cases), 10 existing statutory/attendance-close tests, 13 leave-year/ledger integrity tests. The ten-case selection deselected 363 out-of-scope tests; those were not executed or counted as skipped. Backend sources stayed hash-identical through later frontend fixes. TypeScript, full ESLint, Django checks, frontend production builds and backend sanitized-image build/WSGI import passed.

Automated axe: **123 scans**, **0 violations**, **159 incomplete scan/rule entries** retained for manual review. [Accessibility results](../qa/evidence/ess6-final-product/accessibility-results.json) list exact applicable passing SC tags/rules and all incomplete nodes. Automated rules do not close screen-reader, native full-window visual or formal WCAG gates.

[Raw runtime audit](../qa/evidence/ess6-final-product/raw-runtime-audit.json): **204 final traces**, **1 page errors**, **0 hydration-related console warnings**, zero excluded transport errors. Earlier Firefox #418 remains in its failed trace/report. [Current failed cases](../qa/evidence/ess6-final-product/failed-current-cases.json), [execution totals](../qa/evidence/ess6-final-product/acceptance-results.json), [protected sources](../qa/evidence/ess6-final-product/protected-source-audit.json), and [unchanged existing expectations](../qa/evidence/ess6-final-product/existing-expectations-audit.json) are indexed.

## Final screenshot index

All engines capture 1440/768/320 CSS-pixel route views. Representative final Chromium images are below; [all screenshot/trace hashes](../qa/evidence/ess6-final-product/screenshot-trace-index.json) include engine/tablet variants. Desktop/mobile samples of all ten routes were manually inspected; tablet Profile was sampled, and critical mobile dialog viewport images were inspected. Dense tables use labelled focusable horizontal regions, not page overflow. This is bounded visual review, not formal conformance.

| Route | Desktop | Mobile |
|---|---|---|
| `/ess` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-dashboard-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-dashboard-320.png) |
| `/ess/profile` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-profile-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-profile-320.png) |
| `/ess/attendance` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-attendance-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-attendance-320.png) |
| `/ess/leave` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-leave-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-leave-320.png) |
| `/ess/documents` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-documents-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-documents-320.png) |
| `/ess/payslips` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-payslips-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-payslips-320.png) |
| `/ess/statutory-declarations` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-statutory-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-statutory-320.png) |
| `/ess/requests` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-requests-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-requests-320.png) |
| `/ess/notifications` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-notifications-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-notifications-320.png) |
| `/ess/settings` | [1440](../qa/evidence/ess6-final-product/final-integrated/chromium-settings-1440.png) | [320](../qa/evidence/ess6-final-product/final-integrated/chromium-settings-320.png) |

Critical viewport captures: [WebKit statutory proof](../qa/evidence/ess6-final-product/visual-review/webkit-statutory-dialog-320.png), [Firefox payslip](../qa/evidence/ess6-final-product/visual-review/firefox-payslip-dialog-320.png). Six measured viewport captures are listed in [critical-dialog results](../qa/evidence/ess6-final-product/visual-review/critical-dialogs.json). These predate the Tab-only fix and verify identical visual styling; final keyboard assertions use the reviewed build. Native-zoom PNGs are cropped diagnostic artifacts and are not accepted full-window visual evidence.

## Cleanup and decision

[Owned remnant cleanup](../qa/evidence/ess6-final-product/manual-remnant-cleanup.json) and independent database audits verify zero remaining tenant/user/business rows in both isolated databases before runtime removal. The original baseline close hash and published artifact hashes/checksums/totals were verified before authorized teardown. **440 pre-existing media files remain unchanged; zero new media files remain.** [Infrastructure cleanup](../qa/evidence/ess6-final-product/infrastructure-cleanup.json) verifies owned loopback services, PostgreSQL container/anonymous volume, both owned backend images are verified absent and temporary data was removed. Evidence/build artifacts remain for review. Lightsail and both frozen 40-row release-gate files are unchanged.

**FAIL / deployment NO-GO.** The Firefox Platform Admin role-redirect hydration failure and final WebKit My Requests Arrow Right scrolling failure remain open; no root-cause closure is claimed. Required follow-up includes both explicitly scoped defects, complete native-window zoom visual evidence, screen-reader review, formal accessibility assessment and the separate policy/provider/storage/statutory/production requirements. No frozen release-gate status is advanced. Stop after ESS-6; no new MSS or other workspace implementation begins.

Cleanup note: the first runtime-cleanup pass stopped owned services and removed the container/active image, then encountered an already-absent diagnostic image. That command error is retained in `infrastructure-cleanup-run.txt`. The idempotent final pass independently verified container, volume, both image IDs, ports, profiles and temporary data absent; this is cleanup recovery, not a functional test pass.

## Diagnostic count reconciliation

| Diagnostic selection | Passed | Failed / errors | Interrupted | Not run |
|---|---:|---|---:|---:|
| Integrated attempt 1, Chromium | 0 | 1 beforeAll failure | 0 | 19 (raw report marks skipped) |
| Integrated attempt 2, Chromium | 17 | 3 | 0 | 0 |
| Integrated attempt 3, planned three engines | 36 | 2 | 1 | 21 |
| Pre-teardown-fix integrated matrix | 60 | 3 afterAll failures | 0 | 0 |
| Pre-trigger-focus-fix integrated matrix | 62 | 1 | 0 | 0 |
| Trigger-focus-fix integrated matrix, before form Tab-order correction | 63 | 0 | 0 | 0 |
| Earlier complete required matrix (includes neighboring suites) | 200 | 4 | 0 | 0 |
| Isolated statutory diagnostic | 1 | 0 | 0 | 0 |
| Isolated mobile Arrow Down diagnostic | 0 | 1 | 0 | 0 |

These rows overlap by design and are **not added** to final totals. Backend diagnostic attempt 1 reports 37 tests run plus one class-setup error, with six new tests unexecuted; attempt 2 reports 43 run with one error. Final backend totals use only the subsequent 43 + 10 + 13 passing selections. Twelve baseline-platform redirect observations, twenty native DOM zoom measurements and six critical-dialog viewport captures are supplementary observations, not extra Playwright test cases.
