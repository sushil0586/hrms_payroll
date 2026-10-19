# ESS final visual and accessibility acceptance

Review date: 2026-10-19. **Final Visual / Accessibility: CONDITIONAL. Local functional concurrency: FAIL. Lightsail deployment: NO-GO.** This assessment follows [ESS-6A](hrms-ess6a-browser-remediation-certification.md), the [coverage tracker](hrms-ess-coverage-tracker.md) and [central design implementation](accerio-design-system-implementation.md). Baseline functional results are retained as historical evidence, not counted as fresh executions.

## Scope and method

Ten actual routes: Dashboard, My Profile, Attendance, Leave, Documents, Payslips, Statutory Declarations, My Requests, Notifications and Settings. Holidays have no approved self projection/standalone route; recorded attendance holiday context and honest Leave guidance are reviewed instead. No holiday functionality is invented or certified.

Human visual inspection uses actual rendered desktop 1440×1000, tablet 768×1000 and mobile 320×568 captures. Full-page images establish content density and alignment; viewport images establish visible focus and clipping. Browser resizing is not physical mobile-device certification. Compare the preserved ESS-6A captures with new captures in the screenshot index. Automated assertions and axe results support, but do not determine, visual acceptance.

All work uses disposable synthetic tenants and loopback PostgreSQL. No Lightsail change, policy change, migration, API change, payroll/statutory calculation change or production gate promotion is authorized.

## Visual assessment by workspace

| Workspace | Finding and acceptance considerations |
|---|---|
| Dashboard | Compact identity, restrained brand accent, useful attendance/leave/approval/service actions. Desktop two-column layout stacks on tablet/mobile. Unknown attendance remains neutral; it does not imply absence. Mobile balance table scrolls. |
| My Profile | Clear selected section, readable details, wrapping long email, responsive native section selector. Read-only HR guidance is explicit. Space below a short selected section is acceptable; no decorative filler needed. |
| Attendance | Dense calendar/list, explicit period and timezone, selected day detail and real correction links. Mobile abbreviated statuses have a status key; long policy details remain readable vertically. Recorded holiday context does not imply an approved upcoming-holiday projection. |
| Leave and Holidays | Real entitlements and request history; filter/calendar page scope is stated. Status strip and data table scroll within bounds. Approved leave-year/holiday projections remain separate open dependencies. |
| Documents | Requirements, upload/replacement/review/history share cards/forms/status patterns. Tablet action truncation found and remediated (VA-01). |
| Payslips | Published-only history, exact monetary strings, selected row, review/download/read actions. Native 400% review exposed a short-height dialog defect (VA-03). No salary-paid inference. |
| Statutory Declarations | Shared palette/header/forms/dialogs; legacy nested cards/proof guidance make this the longest mobile page. Direct next actions remain near the top. Further simplification is an opportunity requiring a separate scoped review, not an unrelated rewrite. |
| My Requests | Workflow-specific status, dates, approver and canonical source detail; honest page-local search/sort. Named keyboard scroll region retains the ESS-6A fix. |
| Notifications | Message/read state clearly separated from delivery; readable timestamps and responsive filters. No email/SMS/push/realtime provider certification inferred. |
| Settings | Compact account context and real service navigation. Unsupported preferences/security controls are described, with no fake toggles or expanded permissions. |

## Confirmed defects and targeted remediation

Application changes are limited to seven files: the central theme, shared loading primitive, ESS layout/loading entries and Dashboard/Documents/Payslips table wrappers. Existing dirty worktree changes belong to previous work and are not attributed to this assessment.

| ID | Root cause and evidence | Minimal centralized correction |
|---|---|---|
| VA-01 | Legacy `.shell--workspace table.workspace-table td > span` makes `.table-actions` block/nowrap/hidden. Live 768px reproduction shows adjacent View/Upload clipped; `before-action-metrics.json` and before screenshot retained. | Restore flex, wrapping, visible overflow and existing semantic spacing for shared Accerio table action groups. No action/authorization is added. Bounded table scrolling remains intentional. |
| VA-02 | Panel border token used for input/select boundaries: `#dce1eb` on white is 1.311:1. Actual rendered styles are recorded in `before-control-contrast.json`. | Add `--ds-control-border: #7d879b` (3.614:1 on white) for shared workspace and portalled form controls. Keep subtle panel borders. Text/status/focus token ratios are recorded separately. |
| VA-03 | Native Chrome 400%, 1280×997 outer window → 320×227 CSS viewport. Fixed dialog header/footer leave only 20px body height for 1466px payslip content. Actual native screenshot inspected; resized reproduction retained. | Below 480px viewport height, scroll the complete Accerio dialog and restore natural body height. Existing dialog focus trap, Escape, dirty protection and restoration stay intact. Normal-height dialogs keep their existing body scroll. |
| VA-04 | WebKit arrow panning fails in legacy raw table wrappers. A stronger actual-keyboard check records 2 passed / 1 failed. Programmatic focus and partial viewport overlap were insufficient proof. | Reuse the existing `WorkspaceTableScrollRegion` for Dashboard balances, both Document tables and Payslips history. Same class names, labels, table children and authorization; no new scroll implementation. |
| VA-05 | Concurrent frozen Settings reload records 62 integrated passed / 1 failed: streamed employee loading `<main role="status">` coexists with the page `<main>`. Original strict assertion retained. | Add optional `embedded` mode to `WorkspaceLoading`; use a div/status with the same busy label and skeleton for both ESS fallbacks. Other workspaces retain default output. Repeat the original failing case unchanged. |

Changed sources: [central theme](../../web/src/styles/accerio.css), [shared loading](../../web/src/components/patterns/workspace-loading.tsx), [ESS layout](../../web/src/app/ess/layout.tsx), [ESS loading entry](../../web/src/app/ess/loading.tsx), [Dashboard](../../web/src/app/ess/page.tsx), [Documents](../../web/src/app/ess/documents/employee-document-center.tsx), [Payslips](../../web/src/app/ess/payslips/page.tsx).

No backend/API contract, audit rule, ownership check or historical-close protection changes. No frozen browser assertion is weakened. New review scripts live with evidence and exercise the rendered application. The exact baseline-relative patch and source hash audit isolate these seven changes from earlier work.

## Central design system and MSS reuse

`tokens.css` supplies typography, spacing and motion scales; `accerio.css` supplies semantic brand/surfaces/status/focus/control borders and opt-in layout treatment. Root import order is preserved. `WorkspaceChrome` already applies the same Accerio class to employee and manager tones. Server menus and permission decisions stay outside the visual primitives.

Reusable presentation: `WorkspaceStandardHeader`, `WorkspaceStandardPanel`, `WorkspaceFilterBar`, `WorkspaceDataTable`/`WorkspaceTableScrollRegion`, status badges, information/identity/quick actions, calendar descriptors, existing forms and `HrAdminActionModal`. Consumers supply formatted authorized data and callbacks; the shared presentation does not fetch employee data or invent approvals. MSS can consume these existing interfaces without duplicating business rules. This is an architectural reuse assessment, not MSS workflow/product acceptance.

Remaining design debt: the large legacy `globals.css` cascade, `ess-*` names on generic identity/information patterns, statutory nested-card density and other legacy module patterns. The four targeted raw wrappers now reuse the existing shared keyboard region; broader component migration is outside this remediation. The VA-01 specificity collision demonstrates why new shared rules belong in the central layer. No second UI/icon/font library is introduced. Source import/inline-style audit is retained in `design-system-source-audit.json`.

Playwright engine combinations: macOS 26.5.2 desktop profiles, Chromium 151.0.7922.34, Firefox 153.0 and WebKit 26.5; desktop/tablet/mobile are resized CSS viewports, not physical devices or native Safari. Native zoom uses installed Chrome 155.0.8059.80 separately. Frozen suites retain their configured Asia/Tokyo timezone.

## Accessibility evidence matrix

| Check | Execution and scope | Limitation/open gate |
|---|---|---|
| Keyboard and focus | Fresh all-route skip-link traversal, visible outline, main-content target; document upload action focus; impacted frozen navigation/dialog journeys. | WebKit uses supported Option-Tab to include links. Not an actual screen reader. |
| Dialog trap/restoration | Fresh payslip short-height/mobile keyboard scroll, footer access, forward/reverse trap, Escape/restoration; integrated proof/leave/document/attendance dialogs. | Native browser/device combinations beyond those recorded remain open. |
| Automated rules | axe-core 4.12.1, WCAG-tagged rule sets across routes and relevant dialogs; raw incomplete/manual items retained. | Zero automated violations does not establish WCAG conformance. |
| Contrast | Rendered control borders plus calculated semantic text/status/focus pairs; VA-02 corrected. | Decorative panel borders are not form boundaries; full manual non-text/interactive-state conformance assessment remains open. |
| Reduced motion | Actual computed animation/transition durations checked on visible route descendants under reduced-motion preference, not merely matchMedia. | Exhaustive interactive animation-state audit remains open. |
| Native zoom/reflow | macOS 26.5.2 (25F84), Retina desktop, Chrome 155.0.8059.80, isolated profile, 1280×997 window; actual browser zoom controls at 200% and 400%; all ten route document-width metrics, sampled full native-window visual review and payslip dialog check. | Native Firefox/Safari zoom, every dialog at every zoom, physical touch devices remain unexecuted. Playwright viewport PNGs at native zoom may crop; actual native-window CUA images were inspected in the task transcript, not exported as artifact PNGs. |
| Screen reader | Command-F5 attempted; direct VoiceOver app access timed out (`-10005 timeoutReached`); no reviewable speech/caption output exposed. | **UNVERIFIED**, not passed. Chrome accessibility tree alone is not AT output. VoiceOver/Safari, NVDA/JAWS Windows and mobile AT remain unexecuted. |
| Formal WCAG | Not performed. | **UNVERIFIED**; no conformance claim. |

## Verification and evidence

Accepted visual build: **`Hh1gsxi5NfSm1AoXK9kl1`**, retained at `web/.next/ess-visual-final2`. All seven application deltas are isolated in the [baseline-relative patch](../qa/evidence/ess-final-visual-accessibility/application-source-delta.patch); [source preservation](../qa/evidence/ess-final-visual-accessibility/source-preservation-audit.json) verifies unchanged backend sources, existing tests, Lightsail and both frozen gate CSVs. No component dependency is added.

| Execution on this build | Passed | Failed | Skipped | Blocked | Unexecuted |
|---|---:|---:|---:|---:|---:|
| Integrated ESS suite, original configured one worker, three engines | 63 | 0 | 0 | 0 | 0 |
| Documents/Payslips suite, original one worker, three engines | 33 | 0 | 0 | 0 | 0 |
| Original Settings scenario, five explicit repetitions per engine | 15 | 0 | 0 | 0 | 0 |
| Selected successful regression executions | **111** | **0** | **0** | **0** | **0** |
| Additional integrated run with three concurrent workers | **59** | **4** | **0** | **0** | **0** |
| All current-build test-runner executions | **170** | **4** | **0** | **0** | **0** |
| Focused backend/API/PostgreSQL contract suite | **43** | **0** | **0** | **0** | **0** |

The concurrent failures remain failures. Successful serial/repeated executions do not reclassify them. No automatic retries or frozen assertion changes are used. The 96 fresh distinct frozen cases are a subset of the baseline 204: **108 frozen cases, 19 previous supplementary executions and 23 previous backend checks were not rerun in this assessment**; their original evidence remains, without being added to fresh totals.

Additional Playwright-driven review checks are reported separately from test-runner cases: **90 route/viewport checks**, **30 route skip-link/focus traversals**, **9 dialog checks**, and **3 table keyboard scenarios executed twice successfully (6 executions)**. The second table execution uses unique screenshot filenames so a later general route capture cannot overwrite its focused-action evidence. Complete button bounds and visible outline are asserted after actual arrow panning and Tab, rather than partial viewport intersection.

**213 final automated axe scans: 0 violations**, with **270 repeated incomplete/manual-review entries** retained. These are not 270 confirmed defects and do not imply conformance. [Accessibility raw results](../qa/evidence/ess-final-visual-accessibility/accessibility-results.json), [90-view review](../qa/evidence/ess-final-visual-accessibility/review-results.json), [dialog checks](../qa/evidence/ess-final-visual-accessibility/dialog-results.json), [table keyboard evidence](../qa/evidence/ess-final-visual-accessibility/actions-keyboard-results.json), [contrast ratios](../qa/evidence/ess-final-visual-accessibility/token-contrast.json).

[Raw runtime audit](../qa/evidence/ess-final-visual-accessibility/raw-runtime-audit.json): **120 selected successful regression/review traces, 0 uncaught page errors, 0 hydration warnings, 0 excluded errors**. This does not describe the failed concurrent run, whose four failed cases, screenshots and traces are separately retained in the [failure index](../qa/evidence/ess-final-visual-accessibility/concurrent-failures.json) and [complete concurrent report](../qa/evidence/ess-final-visual-accessibility/accepted-integrated/browser-results.json). [Serial report](../qa/evidence/ess-final-visual-accessibility/serial-integrated/browser-results.json), [Documents report](../qa/evidence/ess-final-visual-accessibility/accepted-documents/browser-results.json), [Settings repetitions](../qa/evidence/ess-final-visual-accessibility/accepted-settings-repeat/browser-results.json), [43 backend tests](../qa/evidence/ess-final-visual-accessibility/backend-contracts.txt).

TypeScript, full ESLint, Django checks and the production frontend build completed successfully: [quality evidence](../qa/evidence/ess-final-visual-accessibility/quality-results.json). The backend was unchanged; no new backend image or migration was needed.

## Open functional blockers discovered during review

**AR-01 — real backend dashboard concurrency failure, not an environmental pass.** Three Chromium journeys in the concurrent run coincide with dashboard API 500s. Independent real employee sign-in and four simultaneous authenticated backend dashboard reads returned **2 HTTP 200 / 2 HTTP 500**: [HTTP reproduction](../qa/evidence/ess-final-visual-accessibility/http-dashboard-probe-results.json). An independent in-process same-route diagnostic also returned **2 HTTP 200 / 2 HTTP 500**, with `IntegrityError` on **`uniq_leave_ledger_command`**: [stack evidence](../qa/evidence/ess-final-visual-accessibility/concurrent-dashboard-probe-results.json). The latter uses forced synthetic employee authentication and is diagnostic, not an authentication certification. Its original raw exception capture is retained; process-wide Django test-client exception signals can appear on 200 responses, so those exception fields are not attributed to successful requests.

Source path: [dashboard selector](../../backend/apps/common/selectors.py) `get_employee_leave_summary` calls `ensure_employee_leave_balances`; [leave service](../../backend/apps/leave_management/services.py) `_get_or_create_leave_balance` computes an accrual shortfall and appends a ledger command with `accrual:{balance.id}:{date}`. Parallel first reads can attempt the same unique command. The independent exception reproduction confirms this backend defect; exact exception stacks for each earlier browser-associated HTTP 500 were not captured. The QA logging file remained empty and is not presented as proof of those stacks.

The uniqueness protection is preserved. **No calculation, idempotency constraint, policy, ledger or historical record is changed to make a visual test pass.** This requires a separate backend concurrency remediation/review, followed by first-read concurrency, ownership and ledger-integrity regression evidence. Two 500 responses are failures, not successful API checks; the two four-request probes are separate diagnostics and are not added to the 43 passing contract tests.

**AR-02 — Firefox login transport reset remains unclassified.** One concurrent browser case failed with `ECONNRESET` during `/api/auth/login`. Local CPU contention was observed, but its root cause is not proven. The successful original-worker run does not turn that transport failure into a pass or close this finding.

## Visual evidence and diagnostic history

[Before/after comparison index](../qa/evidence/ess-final-visual-accessibility/screenshot-comparison-index.md) covers all ten routes at desktop/tablet/mobile sizes. [Screenshot hashes/dimensions](../qa/evidence/ess-final-visual-accessibility/screenshot-index.json) and [trace hashes](../qa/evidence/ess-final-visual-accessibility/trace-index.json) bind the artifacts. Synthetic seeds/timestamps differ between baseline and final captures; comparison is qualitative, not a claimed pixel-identical baseline.

Actual empty/loading/error renders were extracted without image alteration from final production-suite trace frames and visually inspected: [empty](../qa/evidence/ess-final-visual-accessibility/feedback-empty-payslips.jpeg), [loading](../qa/evidence/ess-final-visual-accessibility/feedback-loading.jpeg), [error/retry](../qa/evidence/ess-final-visual-accessibility/feedback-error-retry.jpeg), [frame provenance](../qa/evidence/ess-final-visual-accessibility/feedback-screenshot-index.json). No data is fabricated to replace a failed read.

Native Chrome [200% metrics](../qa/evidence/ess-final-visual-accessibility/native-200-results.json) and [400% metrics](../qa/evidence/ess-final-visual-accessibility/native-400-results.json): all ten routes have document width equal to client width (632px at 200%, 316px at 400%). Wide tables intentionally retain bounded internal scrolling. [Actual-window dialog observations](../qa/evidence/ess-final-visual-accessibility/native-dialog-review.json) record footer focus, scrolling, Escape/restoration and reset to 100%. [VoiceOver attempt](../qa/evidence/ess-final-visual-accessibility/assistive-technology-attempt.json) remains unverified.

[Diagnostic execution history](../qa/evidence/ess-final-visual-accessibility/diagnostic-execution-summary.json) preserves earlier results separately: the two-fix build had 96 browser assertions pass but native review found VA-03; the three-fix build had 95 passed / 1 failed (VA-05); a stronger table check had 2 passed / 1 failed (VA-04). The initial new review harness recorded 6 completed viewport checks, 1 navigation failure and 83 unexecuted checks after mistakenly using a 10-second navigation limit. Its corrected fresh run restores the standard 30-second navigation limit while retaining 10-second locator assertions; frozen tests are unchanged. The initial database-readiness failure and interrupted builds are retained as setup/build diagnostics, never counted as browser passes.

## Cleanup

[Manual/probe fixture cleanup](../qa/evidence/ess-final-visual-accessibility/manual-fixture-cleanup.json) verifies all three owned diagnostic tenants, original closed attendance hashes and published payroll outputs before deletion. Browser suites retain their per-fixture cleanup flags. The [database audit](../qa/evidence/ess-final-visual-accessibility/database-cleanup.txt) confirms zero Tenant/User and tenant-related business rows before owned PostgreSQL removal.

[Infrastructure cleanup](../qa/evidence/ess-final-visual-accessibility/infrastructure-cleanup.json) confirms owned servers, loopback ports, PostgreSQL container/anonymous volume and temporary manifests/environment removed. **440 baseline media files retain their hashes; 0 new media files remain.** The final frontend artifact and previous ESS-6A artifact remain for review. Other processes and Docker resources are untouched.


## Restrictions and release decision

**Final Visual / Accessibility: CONDITIONAL. Original-worker functional regression: PASS; overall functional concurrency: FAIL / OPEN. Lightsail staging deployment: NO-GO.** The five targeted presentation defects are remediated; AR-01 and AR-02 prevent a complete product acceptance claim. Screen-reader, broader native-browser/device coverage and formal WCAG remain separate open gates. Keep separately open: approved employee-effective holiday and leave-year APIs; unavailable preferences/edit workflows/providers; production storage/statutory acceptance and all existing release requirements; unexecuted screen-reader/native-browser-device coverage and formal WCAG review. No frozen production gate status changes and no MSS implementation begins.
