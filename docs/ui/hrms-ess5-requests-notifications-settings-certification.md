# ESS-5 Requests, Notifications and Employee Settings certification

Date: 2026-10-19 IST. **Release decision: CONDITIONAL. Scoped local functional verification: PASS. This is not production certification.** ESS-6 is not started.

## Delivered experience and authoritative contracts

The horizontal upgrade plan, ESS coverage tracker, ESS-4A certificate and centralized Accerio implementation were reviewed before implementation. [Contract inventory](../qa/evidence/ess5-requests-notifications-settings/contract-inventory.md) records existing APIs, policy boundaries and missing functionality.

| Workspace | Implemented behavior | Existing contract reused |
| --- | --- | --- |
| `/ess/requests` | Central entry point for own Leave applications/cancellation requests and attendance regularization. Distinct source/status vocabularies, submission dates in UTC, effective dates, projected current approver, canonical details/approval history and source actions. Server status filtering/pagination, out-of-range recovery; explicitly page-scoped search/sort. | `GET /me/leave-requests/`, `GET /me/attendance-regularizations/` and existing self detail endpoints. Mutations remain in Leave/Attendance. |
| `/ess/notifications` | Employee inbox, real search/filter/page-size/pagination, read/unread indicators, separate delivery status, UTC timestamps, detail dialog, canonical contextual navigation, persisted read/unread mutation, retry/loading/empty/error feedback. | `GET /me/notifications/`, `GET/PATCH /me/notifications/<id>/`; existing Next read-state proxy. |
| `/ess/settings` | Real self-profile name/code/work email, profile/inbox/request links, existing secure recovery navigation and shell sign-out. Unsupported controls are explained. | Own profile, existing session/logout and signed recovery contracts. |
| ESS navigation | My Requests and Settings in IAM menu and fallback navigation. | Existing ESS workspace guard and self endpoints remain authoritative; menu entries confer no new business permission. |

No universal approval engine or combined cross-type status is invented. Cancellation actions follow the backend's pending/partial cancellation projection; resolved history remains in canonical Leave detail. Approval history and approver names are shown only where projected by authorized APIs. Missing names link to existing approval history.

## Restrictions and missing contracts

- **Technical:** global all-type request search/order/aggregation, deeper consolidated approval audit beyond projected source detail, per-user unread filters, writable preferences and session inventory/revocation. Request search/sort is labelled as applying to the current server page. Current role-recipient notifications retain the existing shared stored read timestamp; cross-tab conflicting writes retain existing last-completed-write behavior.
- **Policy dependent:** additional request types, document/letter approvals, subscription rules, credential/profile changes. Documents supports upload/replacement/download; no separate employee document-request approval contract was found. Existing statutory declarations and published payroll artifacts remain canonical services, not fabricated universal requests.
- **Externally dependent:** actual email/SMS/push/WhatsApp/realtime delivery and recovery email availability. Marking a failed notification read does not deliver it or retry delivery. Provider retry/configuration remains administrator-only. No live message is dispatched by these tests.
- Settings exposes no role/tenant/payroll controls, authenticated password-change form, writable notification subscriptions or invented preferences. Recovery navigation is verified; real delivery and reset completion are not certified here.

## Centralized architecture and changed files

All presentation consumes existing Accerio classes/tokens and shared headers, panels, filters, tables, badges, information/quick-action panels, pagination, dialogs and feedback. No component library, stylesheet, page color literals, migration or domain API is added. Business data and permissions remain outside presentation primitives.

Production source changes: **21 files**, with exact hashes in [build inputs](../qa/evidence/ess5-requests-notifications-settings/build-inputs.json) and [source manifest](../qa/evidence/ess5-requests-notifications-settings/source-manifest.json):

- New Requests page/history, Settings page and employee notification-inbox presentation; modernized Notifications page.
- `backend/apps/iam/menu_catalog.py`, ESS layout and `web/src/lib/api.ts`: navigation and source-specific read adapter; no endpoint contract change.
- Shared `notification-read-toggle.tsx`: synchronous single-flight guard, confirmed-response callback, error/retry and stale-selection protection. MSS default refresh remains supported.
- Shared `async-action-button.tsx`: opt-in focus-preserving busy state, while default callers retain native disabling.
- `workspace-standard.tsx` and new `workspace-table-scroll-region.tsx`: optional labelled focusable scroll region; explicit Left/Right scrolling only while that region owns focus. Nested controls/modifiers and default tables are preserved.
- `workspace-chrome.tsx` / `workspace-navigation-feedback.tsx`: ESS opt-in to fresh authorized document GET navigation after demonstrated completed-RSC stalls. MSS/admin defaults remain unchanged. Profile section navigation and remaining profile links disable speculative prefetch. Transient client-only state/scroll may reset; URL filters and modified/download links retain their semantics.
- Leave workspace: successful creation completes with authenticated page-one/all-status GET; submission lock remains until navigation. A one-shot tab-local ID is confirmed against own server history before showing success. Search/type/date controls wait for hydration readiness. Payload, validation, idempotency and approval policy are unchanged.
- Payslip read action: confirmed backend acknowledgement updates the action, table and detail together. The own-scoped receipt response is validated, then a page-local context updates table, dialog and access detail from that real response. No global store or optimistic business state. Payslip page/detail and new `payslip-read-state.tsx` consume it. Existing receipt POST, audit and calculations are unchanged. Its complete authorized response replaces the redundant background RSC refresh, which could be cancelled by immediate reload and raise Firefox “Error in input stream.” The earlier busy-label-only fix is retained as [historical delta](../qa/evidence/ess5-requests-notifications-settings/receipt-feedback-delta.json).

QA additions: guarded synthetic ESS-5 fixture, notification contract/concurrency tests, ESS-5 Playwright suite and isolated configs. Existing ESS-3 proxy passively captures real upstream POST response bytes before forwarding: native completion can retire Chromium's response-body resource. Browser/HTTP status equality, actual JSON ID, single-submit, UI history/units and evidence-download assertions remain required. No response is fabricated; original business assertions/timeouts remain. ESS-4 viewport measurement waits two browser layout frames before reading bounds to avoid comparing different resize frames; no containment assertion is removed.

## Defects investigated and fixes

| Finding | Evidence / root cause | Fix |
| --- | --- | --- |
| Read mutation lost Escape/focus | Native-disabled pending trigger lost focus outside dialog. | Shared opt-in focus-preserving busy state plus single-flight guard. |
| Mobile notification footer clipped | Caller omitted existing `accerio-dialog`; action edge 590px exceeded 568px viewport. | Reuse bounded Accerio modal; body scrolling and visible actions tested at 320/390/768px. |
| WebKit return focus missed opener | Pointer activation did not focus Review before modal captured return target. | Explicit trigger focus before opening; original Escape/return assertion retained. |
| Completed Profile RSC remained loading | Correct Contact payload returned HTTP 200 in 216.262ms, but visible content did not commit within original assertion. Framework-internal scheduling cause unproven. | ESS document GET navigation; private profile prefetch disabled. |
| WebKit table keyboard scroll stayed zero | Native region ArrowRight did not move scroll offset. | Shared opt-in keyboard scroll region; original movement assertion retained. |
| Leave creation history stale | Child closed/unmounted its refresh owner; POST 201 and correct RSC 200 did not update visible history. | Fresh authorized completion GET, verified success feedback. |
| Leave search lost early text | Page-two SSR field accepted input before hydration handler attached; controlled value reset. | Existing hydration readiness signal gates filter editing. |
| Payslip stayed “Refreshing” after success | Receipt returned 200; background refresh busy label overrode saved acknowledgement. | Acknowledged state wins over refresh busy presentation. |
| Harness/runtime failures | Exact Settings accessible name included description; CDP response resource was retired; Attendance origin was 3169 instead of required 3149; Secure cookies were unsuitable for HTTP loopback. | Correct semantic locator/passive response observation/runtime origin; QA-only cookie setting false. Production auth defaults unchanged. |
| Stale receipt table | Confirmed read response reached the dialog while server refresh left the table stale. | Share the validated response through page-local receipt context; table and full detail update together, without a redundant background refresh. |
| Resize measurement race | Firefox measured the old dialog right edge (341) and its child after the new viewport layout (363), within adjacent resize frames. | Wait two animation frames after viewport changes; every original containment assertion and timeout remains. No CSS clipping is waived. |
| Cancelled receipt refresh raised runtime errors | After confirmed receipt, immediate reload cancelled a redundant RSC refresh, raising Firefox input-stream / WebKit load errors. | Use the complete authorized receipt response directly; no secondary refresh is needed. Runtime-error assertions remain strict. |
| Interrupted runs | Host power logs record sleep/deep-idle; cleanup hook timed out; later Leave read timed out before withdrawal action, showing real error boundary. Runtime/build then stopped. | Preserve failures, restore owned local runtime, clean interrupted fixture and rerun full suites with unchanged timeouts. No environmental failure is counted as a pass. |

## Executed verification

| Suite | Passed | Failed | Skipped | Blocked | Unexecuted |
| --- | ---: | ---: | ---: | ---: | ---: |
| ESS-5 including neighboring MSS | 33 | 0 | 0 | 0 | 0 |
| ESS-1 Dashboard/Profile | 24 | 0 | 0 | 0 | 0 |
| ESS-2 Attendance | 24 | 0 | 0 | 0 | 0 |
| ESS-3 Leave | 27 | 0 | 0 | 0 | 0 |
| ESS-4 Documents/Payroll | 33 | 0 | 0 | 0 | 0 |
| **Browser acceptance** | **141 (47 per engine)** | **0** | **0** | **0** | **0** |
| **Backend/API/PostgreSQL** | **41** | **0** | **0** | **0** | **0** |

Backend: 36 focused Django contracts, one true concurrent-read test and four existing notification/document workflows. 365 unrelated pytest cases were deselected, not counted as passed or skipped acceptance tests. Ownership/cross-tenant rejection, anonymous/revoked context, restricted settings/admin transitions, repeated/concurrent read state, stale responses, failed-provider behavior, retry and real state persistence are covered. Browser suites include actual cancellation workflows, protected document access, attendance-close and published payroll preservation.

TypeScript, focused ESLint, Django checks, production build and `git diff --check` pass. Existing CSS autoprefixer/deprecation warnings remain recorded; no lint rule or assertion is disabled. Final build: `-fpLQTUrNRgrNctqMvjrb`. ESS-4 runs this final build; ESS-3 runs `iBOxhqugIpJXfx0qrK3z5` before the later payslip-only confirmation changes; ESS-5/1/2 run `Ya2h5tf40xNW7Oo4oUM6-`. [Build matrix](../qa/evidence/ess5-requests-notifications-settings/browser-build-matrix.json) records identical original shared/ESS-5 sources and the later Leave/receipt-only deltas, covered by full affected suites. This is not a claim that all 141 tests ran on one artifact.

Historical finalized diagnostic reports are retained separately below. “Runner skipped” includes interrupted/not-run cases; none receives acceptance credit.

| Diagnostic run | Passed | Failed | Runner skipped |
| --- | ---: | ---: | ---: |
| attempt1 | 7 | 3 | 20 |
| attempt1/ess1 | 16 | 1 | 7 |
| attempt11/ess4 | 29 | 4 | 0 |
| attempt12/ess4 | 31 | 2 | 0 |
| attempt2 | 29 | 1 | 0 |
| attempt2/ess1 | 24 | 0 | 0 |
| attempt3 | 16 | 1 | 13 |
| attempt3/ess1 | 17 | 1 | 6 |
| attempt4 | 32 | 1 | 0 |
| attempt4/ess1 | 19 | 1 | 4 |
| attempt5/ess3 | 21 | 1 | 5 |
| attempt5/ess4 | 33 | 0 | 0 |
| attempt6/ess2 | 3 | 2 | 19 |
| attempt7/ess3 | 21 | 1 | 5 |
| attempt8/ess3 | 18 | 1 | 8 |
| attempt9/ess4 | 31 | 2 | 0 |
| focus-return-target | 1 | 0 | 0 |
| keyboard-recheck | 1 | 0 | 0 |
| leave-create-recheck | 1 | 0 | 0 |
| mobile-recheck | 2 | 0 | 0 |
| navigation-recheck | 1 | 0 | 0 |
| prefetch-recheck | 2 | 0 | 0 |

Attempt10 has **no finalized report**: its list log records 13 passed, 1 failed, 4 serial cases skipped and 9 remaining cases without results. Its stale prior JSON is explicitly excluded; see `diagnostics/attempt10/ess3/interrupted-run-summary.json`. Earlier failures are not retrospectively reclassified as passed.

## Evidence and accessibility

[Acceptance totals](../qa/evidence/ess5-requests-notifications-settings/acceptance-results.json), [141 raw traces audit](../qa/evidence/ess5-requests-notifications-settings/raw-runtime-audit.json), [backend contracts](../qa/evidence/ess5-requests-notifications-settings/backend-contracts.txt), [concurrency](../qa/evidence/ess5-requests-notifications-settings/backend-concurrency.txt), [workflow regressions](../qa/evidence/ess5-requests-notifications-settings/neighbor-workflows.txt), and [source/screenshot/trace hashes](../qa/evidence/ess5-requests-notifications-settings/source-manifest.json).

Screenshots: [Requests desktop](../qa/evidence/ess5-requests-notifications-settings/webkit-requests-desktop.png), [Inbox desktop](../qa/evidence/ess5-requests-notifications-settings/firefox-inbox-desktop.png), [Settings tablet](../qa/evidence/ess5-requests-notifications-settings/chromium-settings-768.png), [320px dialog viewport frame](../qa/evidence/ess5-requests-notifications-settings/viewport-frames/webkit-notification-320.jpeg), [mobile navigation](../qa/evidence/ess5-requests-notifications-settings/webkit-navigation-320.png). Actual inspected renders/findings are recorded in `visual-review.json`. Full-page screenshots include off-viewport background; trace frames are unmodified but may be downsampled. Firefox frame metadata may differ from CSS viewport; both are recorded.

Keyboard and accessible-name checks cover actual headings/labels/actions, focus containment/restoration, Escape, Tab/Shift+Tab, busy-state focus, keyboard table scrolling and bounded menu activation. Reduced motion and desktop/tablet/mobile bounds execute. Raw trace audit finds no uncaught page errors or React hydration warnings, with no transport exception waived. Expected API-failure/error-boundary console messages in injected negative tests are not claims of successful API reads.

**Three separate assessments remain unexecuted: screen-reader testing, native browser zoom and formal WCAG assessment.** Resizing and Playwright keyboard checks do not substitute for them. Mobile evidence uses browser viewports; no physical-device certification is claimed.

## Cleanup and release boundary

[Cleanup summary](../qa/evidence/ess5-requests-notifications-settings/cleanup-summary.json) verifies zero scoped business rows across 129 model counts in each QA database, fixture/file removal, all 440 pre-existing media files unchanged, owned local processes/container/volume removed and owned ports closed. Interrupted fixture cleanup is separately recorded. Existing release CSV hashes and both 40-row counts match baseline; the pre-existing Lightsail example remains byte-for-byte unchanged by this work.

Open separately: approved leave-year/effective-holiday projection APIs; unsupported request/preferences/session contracts; live provider/recovery delivery; screen reader; native zoom; formal WCAG; production feature manifest, protected storage/IAM/retention and all existing statutory/production release gates. No financial/statutory calculation, tenant isolation, RBAC, domain audit or historical-close rule is changed. No Lightsail deployment or frozen-gate promotion. **Stop after ESS-5; ESS-6 is not started.**
