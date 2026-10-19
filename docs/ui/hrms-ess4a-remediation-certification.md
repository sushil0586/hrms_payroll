# ESS-4A P0 remediation and re-certification

**Local functional decision: PASS. Release decision: CONDITIONAL. Not production certification.**

All four reported defects have scoped application fixes and executed cross-browser evidence. Approved leave projection APIs, formal accessibility assessments and existing production requirements remain separate open gates. Lightsail and both frozen 40-row release-gate files are unchanged. ESS-5 is not started.

## Defects, causes and final fixes

| Issue | Investigation and cause boundary | Final implementation / evidence |
| --- | --- | --- |
| Firefox SSR/hydration; subsequently reproduced in Chromium/WebKit | Structurally valid streamed HTML failed a host claim (#418), then late `$RS` scripts lost their placeholder targets. Baseline instrumentation located a missing shell host; delayed/cached loads and neighboring Attendance reproduced the failure. This matches a reported React parser/hydration race, not a payroll/date-format difference. | Shared `WorkspaceHydrationBoundary` retains server-rendered markup inside Suspense. A cached client promise defers shell hydration until DOMContentLoaded and the following reveal frame. Uses public React/browser APIs; no Scheduler/vendor patch, SSR removal or warning suppression. Fifteen additional delayed cached document loads across three engines also assert the response still contains server-rendered content. Final raw traces contain no page errors. |
| Leave cancellation/withdrawal history stale after success | API mutation and refreshed server projection were correct while client history remained approved/pending. The defect is in client refresh/reconciliation; moving the transition owner did not reliably resolve it. No exact internal Next/React scheduling fix is claimed. | Successful lifecycle actions use POST → fresh authenticated document GET, remove the dismissed `requestId` and preserve URL status/page filters. Submission remains locked until navigation, preventing duplicate POSTs. History, balances and permissions reload together; no optimistic business status is invented. Original withdrawal/direct/governed cancellation assertions pass in all engines. |
| WebKit access-control-looking transport exception | Unsolicited menu/header prefetch reads were aborted during document navigation. This was not demonstrated to be an authorization denial or backend outage. Before/after trace comparison records 40 ESS RSC reads before versus zero speculative ESS reads afterward in the same payslip flow. | Shared shell has a default-preserving `prefetch` option. ESS opts out of bulk/viewport/hover prefetch; relevant header/recovery links and Dashboard action tiles do too. Actual links/router navigation remain functional. Other workspaces retain their prior default. New tests reject unrelated private reads. Final traces show zero page errors and zero excluded transport exceptions. |
| Small-screen payslip dialog clipping | A four-row grid was used even without tabs, placing body/footer in incorrect tracks; minimum content widths pushed actions outside the dialog. An old-build assertion measured a control edge at 392px inside a dialog ending at 310px. | Central Accerio dialog rows allocate `minmax(0,1fr)` to the body, with a tabs modifier when needed. Widths are bounded, header text wraps, footer actions wrap, and dynamic viewport height is respected. Background scroll locks; opener focus restores without moving the page. All engines verify 320×568, 390×844 and 768×900 dialog bounds, visible close/download actions, body scrolling, Tab wrap and Escape. |

The [upstream React issue](https://github.com/react/react/issues/37321) corroborates the streaming-race diagnosis; it is an open report, not a claim that our dependency version has an upstream fix. The application mitigation is supported by the local differential runs. Earlier wrapper/transition-owner candidates that failed are retained, not represented as successful fixes.

## Final executed verification

All final suites used **production build `pK88fNFAqagso1Xy6FsAq`**, demo data disabled, real loopback Django APIs and disposable PostgreSQL **16.15**. Maximum two browser suites ran concurrently. One worker per suite; zero retries. Original business assertions/timeouts remain. Final counts below exclude superseded diagnostic attempts.

| Verification | Passed | Failed | Skipped | Blocked | Unexecuted |
| --- | ---: | ---: | ---: | ---: | ---: |
| ESS-4 Chromium / Firefox / WebKit | 33 (11 per engine) | 0 | 0 | 0 | 0 |
| ESS-3 Leave Chromium / Firefox / WebKit | 27 (9 per engine) | 0 | 0 | 0 | 0 |
| ESS-1 Dashboard/Profile neighbors | 24 | 0 | 0 | 0 | 0 |
| ESS-2 Attendance neighbors | 24 | 0 | 0 | 0 | 0 |
| **Browser total** | **108** | **0** | **0** | **0** | **0** |
| Backend/API/PostgreSQL | **48** | **0** | **0** | **0** | **0** |

Zero flaky outcomes. Backend checks: 29 self/profile/attendance/leave/document contracts plus 19 existing document/payroll/statutory/year-filter/concurrency/attendance-close regressions. Own/foreign-employee/tenant isolation, anonymous rejection, unpublished payroll denial, signed-access expiry/limits, file ownership, immutable payroll snapshots and historical close are covered. No new backend application contract or calculation is introduced.

TypeScript, focused ESLint, Django checks (zero issues), production build and `git diff --check`: **PASS**. The build retains an existing `globals.css` autoprefixer warning about `end`; no unrelated CSS cleanup is included.

Evidence: [acceptance results](../qa/evidence/ess4a-remediation/acceptance-results.json), [ESS-4 log](../qa/evidence/ess4a-remediation/browser-final.txt), [Leave log](../qa/evidence/ess4a-remediation/ess3/browser-final.txt), [Dashboard/Profile log](../qa/evidence/ess4a-remediation/ess1/browser-final.txt), [Attendance log](../qa/evidence/ess4a-remediation/ess2/browser-final.txt), [backend contracts](../qa/evidence/ess4a-remediation/api-contract.txt), [workflow/integrity tests](../qa/evidence/ess4a-remediation/workflow-regression.txt), [build/source inputs](../qa/evidence/ess4a-remediation/build-inputs.json), [raw runtime audit](../qa/evidence/ess4a-remediation/raw-runtime-audit.json).

## Diagnostic outcomes retained separately

| Attempt | Passed | Failed | Interrupted | Unexecuted |
| --- | ---: | ---: | ---: | ---: |
| Initial focused diagnostics | 1 | 3 | 0 | 0 |
| Candidate `QQtJKYM-LCtvERk_wBTfG` | 9 | 1 | 2 | 42 |
| Mobile-role locator attempt | 8 | 1 | 1 | 20 |
| Parser-race candidate `bz0DQ-h8_UEDaMpmccfph` | 94 | 6 | 0 | 5 |
| Boundary candidate `SBasfyD1iGVM-GB4n_nA4` | 55 | 1 | 0 | 4 |
| Dashboard-prefetch audit candidate | 108 | 0 | 0 | 0 |
| **Diagnostic browser total** | **275** | **12** | **3** | **71** |

These are 361 scheduled diagnostic cases. Runner “skipped” includes interrupted/not-run cases; there were no intentional test skips. Including final acceptance, all ESS-4A browser attempts total **469 scheduled: 383 passed, 12 failed, 3 interrupted and 71 unexecuted**. Final acceptance is a separate clean execution, not a reclassification of earlier failures.

The Dashboard-prefetch candidate passed all 108 assertions, but independent raw-trace review found four WebKit transport events in its ESS-1 session/privilege test. They were not accepted as a clean runtime audit. Dashboard links and shared quick actions now also opt out of prefetch; ESS-1 adds a strict all-page-error guard. The complete browser set is rerun on the final build. That candidate and its four events are retained in `diagnostics/dashboard-prefetch-candidate/`.

One initial diagnostic failed before fixture provisioning because migrations were incomplete: zero application behavior executed, never counted as PASS. Standalone debug startup failures (missing fixture manifest / an unrelated occupied port) also claim zero passing application cases. The unrelated service was preserved. An intermediate duplicate JSX prop was caught and corrected by TypeScript; an intermediate build was deliberately interrupted before acceptance. Those logs remain under `diagnostics/`.

The mobile harness initially requested a button for the existing download link. The locator was corrected to its actual role while retaining visibility/bounds/keyboard assertions. A four-suite diagnostic Leave retry took 12.2 seconds against the original 10-second assertion; correct HTML arrived after the assertion. It remains a failed attempt, with [latency evidence](../qa/evidence/ess4a-remediation/leave-retry-latency.json). Final tests keep the timeout and use bounded concurrency. Diagnostic outcomes and failures are indexed in [diagnostic outcomes](../qa/evidence/ess4a-remediation/diagnostic-outcomes.json).

## Architecture, contracts and changed files

- `web/src/components/shell/workspace-hydration-boundary.tsx`: reusable parsed-document Suspense boundary; presentation lifecycle only.
- `web/src/components/shell/workspace-chrome.tsx`: optional prefetch control, default unchanged for MSS/administration.
- `web/src/components/patterns/workspace-information.tsx`, `web/src/app/ess/page.tsx`: private quick-action/Dashboard links avoid speculative reads.
- `web/src/app/ess/layout.tsx`: opt into the boundary and prefetch control; server authentication and the existing focus target remain.
- `web/src/app/ess/error.tsx`, `documents/page.tsx`, `payslips/page.tsx`: recovery/header links avoid speculative reads.
- `web/src/app/ess/leave/leave-workspace.tsx`: successful lifecycle document read; Overview prefetch opt-out.
- `web/src/app/ess/leave-request-lifecycle-actions.tsx`: preserve submission lock during successful read navigation.
- `web/src/components/patterns/hr-admin-action-modal.tsx`, `web/src/styles/accerio.css`: shared dialog row modifier, containment, scrolling and focus restoration.
- ESS-4 browser suite: stronger mobile, unsolicited-prefetch and cached-stream checks; existing authorization/business assertions retained. ESS-1 now rejects every uncaught page error, including role/session changes.
- This report, ESS-4 report/tracker and new evidence directory.

No backend application, API serializer/route, permission, dependency, schema/migration, financial/statutory calculation, audit or historical-close source changes. Recorded backend dependencies are [hash-verified unchanged](../qa/evidence/ess4a-remediation/preserved-backend-sources.json). The pre-existing dirty working tree is preserved; earlier ESS/backend/infrastructure changes are not attributed to ESS-4A.

Existing contracts remain: own published payslip list/detail/download/read/signed access; own document-center/upload/replacement/download; own leave lifecycle POSTs and authorized Leave/dashboard GETs. No new business endpoint, employee edit permission or approval policy is added.

## Screenshots and accessibility

Final PNG paths, pixel dimensions and hashes plus all 108 trace paths are in the [source/evidence manifest](../qa/evidence/ess4a-remediation/source-manifest.json). Desktop, 768px tablet, 320/390px mobile and short 320×568 dialogs are captured. Full-page images include off-viewport background beyond a fixed dialog; they do not represent native browser zoom or physical-device testing.

Representative captures:

- [320px payslip dialog](../qa/evidence/ess4a-remediation/webkit-payslip-dialog-320.png)
- [390px payslip dialog](../qa/evidence/ess4a-remediation/firefox-payslip-dialog-390.png)
- [tablet dialog](../qa/evidence/ess4a-remediation/chromium-payslip-dialog-768.png)
- [desktop documents](../qa/evidence/ess4a-remediation/chromium-documents-desktop.png)
- [desktop payslips](../qa/evidence/ess4a-remediation/chromium-payslips-desktop.png)

Rendered review is recorded in [visual review](../qa/evidence/ess4a-remediation/visual-review.json). Header close and footer actions are contained and readable; the body scrolls independently. Wide data tables retain labelled, keyboard-focusable contained scroll regions. Keyboard/accessible-name checks, Enter/Escape, focus wrap/restoration, reduced-motion preference and viewport bounds passed. **Screen-reader testing, native zoom and formal WCAG assessment remain three unexecuted assessments**, separate from the zero-unexecuted browser-case count.

## Cleanup, restrictions and release boundary

[Cleanup summary](../qa/evidence/ess4a-remediation/cleanup-summary.json) records zero enumerated business rows in both application databases and the test database before removal, verified physical upload deletion, preserved finalized attendance/published-payroll digests, and removed owned servers/container/volume. One interrupted-worker orphan was discovered and removed with the exact guarded seed command; final database/file audits also cover it. Synthetic API files and the DD2 temporary upload are separately verified absent. Unrelated user services/files remain.

The native lifecycle read retains URL status/page filters and removes the closed detail ID. Transient client-only history filters/scroll reset. The parse boundary defers React interaction until document parsing/reveals settle while retaining SSR content/native links. These are explicit UX tradeoffs; no production latency/capacity or whole-framework certification is claimed.

Separate open gates:

| Gate | Status |
| --- | --- |
| Approved leave-year self projection API | Unimplemented |
| Approved employee-effective holiday projection API | Unimplemented |
| Screen-reader assessment | Unverified / unexecuted |
| Native browser zoom | Unverified / unexecuted |
| Formal WCAG assessment | Unverified / unexecuted |
| Production enabled-feature manifest / excluded upload-sharing capabilities | Existing acceptance requirement remains open |
| Protected production storage / IAM / encryption / retention / production release requirements | Not certified by local tests |

Both frozen release CSVs retain their original hashes and 40 rows each: [gate evidence](../qa/evidence/ess4a-remediation/frozen-gates.json). No Lightsail configuration or deployment action occurred. No frozen release-gate promotion is authorized. **Stop after ESS-4A for review. ESS-5 is not started.**
