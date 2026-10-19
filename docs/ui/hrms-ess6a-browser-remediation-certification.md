# Accerio HRMS ESS-6A browser remediation certification

Date: 2026-10-19. Scope: the two ESS-6 browser defects and their required neighboring regressions. **Local functional decision: PASS. Overall release certification: CONDITIONAL. Lightsail deployment: NO-GO.** This report supersedes neither historical execution evidence nor production release gates.

## Root causes and minimal changes

### Firefox: role-redirect destination hydrates before its streamed shell is ready

The original ESS-6 failure is React #418 after the authorized `/ess/settings` → `/platform-admin` redirect. Direct role/tenant resolution works; the exception belongs to hydration, not an authorization rejection. Repeated direct platform sign-in did not reproduce it reliably. Replaying the employee → password recovery → employee settings → logout/cookie clearance → platform-only sign-in → protected ESS URL sequence reproduced it.

A disposable copy of the retained ESS-6 artifact logged the failing React host claim while retaining the original throw. It expected a `div`, encountered no host node, and recorded `document.readyState="interactive"`; the component ancestry includes the shared workspace shell. See [instrumented journey](../qa/evidence/ess6a-browser-remediation/fiber-journey-probe.json) and [diagnostic script](../qa/evidence/ess6a-browser-remediation/supporting-scripts/ess6a-fiber-journey.cjs). This directly establishes a missing host at hydration. Attribution to the streamed shell/reveal timing is supported by that observation and the destination's absence of the existing ESS parsed-document boundary; it does not establish a browser-engine implementation defect or a specific malformed business field.

`web/src/app/platform-admin/layout.tsx` now reuses `WorkspaceHydrationBoundary` and the existing `WorkspaceLoading` fallback. It retains server rendering and waits for document/deferred reveal readiness before claiming the shell, as ESS already does. The access guard and menu resolution still complete before the shell. No cookie, tenant fallback, role resolution, API or authentication behavior changes. Demo data remains disabled in the isolated QA environment. No arbitrary sleep, hydration-warning suppression or framework patch is present in acceptance source/artifacts.

The first complete three-fix matrix had **204 passing assertions but two uncaught Firefox errors** in the frozen Attendance manager-decision scenario. Its raw trace places #418 and a subsequent `$RS` streaming-reveal `parentNode` failure on the `/mss` visit. That artifact's local decision is **FAIL**, despite Playwright's passing assertion total. [Manager timeline](../qa/evidence/ess6a-browser-remediation/manager-hydration-timeline.json) and the retained `pre-manager-boundary/raw-runtime-audit.json` preserve this finding.

`web/src/app/mss/layout.tsx` now applies the same existing parsed-document boundary at this required role-transition destination. This is a companion hydration fix for a frozen ESS attendance regression, not MSS product work: no manager page, business workflow, API, permission or navigation policy is redesigned. A new strict supplementary employee → manager → employee scenario covers all engines. The final complete matrix must pass both its assertions and raw runtime audit.

### WebKit: an advertised keyboard region is available before its handler

Passive first-key diagnostics found the real My Requests region focused, width 264px, content width 760px, but no attached React props/handler when Arrow Right arrived. Some first keys were consequently lost; later successful scrolling did not make the initial interaction reliable. See [first-key observations](../qa/evidence/ess6a-browser-remediation/scroll-probe.json) and [post-hydration observations](../qa/evidence/ess6a-browser-remediation/scroll-settled-probe.json). These diagnostic observations are not acceptance tests.

`web/src/components/patterns/workspace-table-scroll-region.tsx` now uses `useSyncExternalStore`'s server/client snapshots to expose the focusable, named region only after hydration. The server-rendered named table remains readable. Once advertised, the region has its original real arrow-key handler. No keyboard assertion, timeout, horizontal-overflow requirement or modifier handling was weakened.

Repeated execution also exposed `Load failed` in the same mobile/tablet keyboard/navigation scenario. Its trace shows clicking the already-active Settings link starts a redundant RSC request; the next document navigation interrupts its receive stream, followed immediately by React's global error report. This is an application navigation race, not an environmental pass. See [redacted request timeline](../qa/evidence/ess6a-browser-remediation/webkit-same-route-network.json) and the superseded focused WebKit trace.

`web/src/components/shell/workspace-navigation-feedback.tsx` now prevents redundant same-path/query navigation in document-navigation workspaces. The local mobile-link handler still closes the menu. Modified clicks, external URLs, downloads, explicit document-mode links and same-document hash navigation retain their existing handling. Other workspaces' default client-navigation behavior is unchanged.

## Source and contract scope

Four application files changed in ESS-6A: the three above and the companion manager-shell boundary described above. Added `web/tests/e2e/ess6a-browser-remediation.spec.ts` and `web/playwright.ess6a.config.ts` provide supplementary cross-browser first-key and active-route navigation checks. Supporting audit/orchestration/diagnostic scripts and execution evidence are under `docs/qa/evidence/ess6a-browser-remediation/`; this report and the ESS coverage tracker are the documentation changes. Generated Next TypeScript configuration edits are restored from this turn's baseline.

No frozen ESS-1–6 test assertion or helper is changed. No backend domain/API, migration, financial/statutory calculation, leave policy, audit service, RBAC, tenant scoping, document/payslip authorization, attendance close or historical record implementation changed. The source preservation audit checks these independently of the pre-existing dirty worktree. Previous certification files and evidence remain historical records.

## Acceptance execution

Final production build: **`57FxWLWklzQK5jY-A67uv`**. All six frozen suites use this same artifact; automatic retries are disabled. The [acceptance matrix](../qa/evidence/ess6a-browser-remediation/acceptance-results.json) and [raw runtime audit](../qa/evidence/ess6a-browser-remediation/raw-runtime-audit.json) independently verify outcomes and errors.

| Frozen suite | Chromium | Firefox | WebKit | Total passed |
|---|---:|---:|---:|---:|
| Dashboard/Profile | 8 | 8 | 8 | 24 |
| Attendance | 8 | 8 | 8 | 24 |
| Leave | 9 | 9 | 9 | 27 |
| Documents/Payroll | 11 | 11 | 11 | 33 |
| Requests/Notifications/Settings and neighboring navigation | 11 | 11 | 11 | 33 |
| Integrated ten-route/journey suite | 21 | 21 | 21 | 63 |
| **Frozen total** | **68** | **68** | **68** | **204** |

**Frozen results: 204 passed / 0 failed / 0 skipped / 0 blocked / 0 unexecuted / 0 flaky.** All 204 traces were audited: **0 uncaught page errors, 0 hydration warnings, 0 excluded transport errors**. This includes the Attendance manager visit that failed the preceding raw audit.

Separate final supplementary execution: **10 focused repetitions passed** (5 Firefox role-redirect journeys, 5 WebKit mobile/tablet keyboard/navigation journeys), plus **9 additional cases passed** (first-key arrows and keyboard action access, no redundant active-menu RSC refresh, and employee/manager/employee transitions in all three engines). Each supplementary group has **0 failed / skipped / blocked / unexecuted / retries**, with **0 uncaught errors across its 19 traces**. See [supplementary results](../qa/evidence/ess6a-browser-remediation/supplementary-results.json).

**Total final acceptance browser executions: 223 passed, 0 failed/skipped/blocked/unexecuted.** Repeated focused executions do not add unique frozen ESS scenarios. Earlier failed/interrupted runs remain historical failures and are not included in this acceptance total.

The final integrated suite executed **123 axe-core 4.12.1 scans / 0 automated violations / 0 unexecuted scans**. [Accessibility results](../qa/evidence/ess6a-browser-remediation/accessibility-results.json) retain incomplete/manual-review findings and actual rule tags. This is not formal WCAG certification.

Screenshots and trace SHA-256 values are indexed in [frozen/viewport evidence](../qa/evidence/ess6a-browser-remediation/screenshot-trace-index.json) and [supplementary evidence](../qa/evidence/ess6a-browser-remediation/supplementary-screenshot-trace-index.json). Reviewed examples include:

- [Firefox redirect destination](../qa/evidence/ess6a-browser-remediation/firefox-platform-redirect-viewport.png).
- [Desktop Requests](../qa/evidence/ess6a-browser-remediation/firefox-requests-viewport-1440.png), [tablet Requests](../qa/evidence/ess6a-browser-remediation/chromium-requests-viewport-768.png), [WebKit mobile focused action](../qa/evidence/ess6a-browser-remediation/webkit-requests-viewport-320.png).
- [Dashboard](../qa/evidence/ess6a-browser-remediation/final-ess1/firefox-dashboard-desktop.png), [mobile Profile](../qa/evidence/ess6a-browser-remediation/final-ess1/chromium-profile-mobile.png), [320px payslip dialog](../qa/evidence/ess6a-browser-remediation/final-ess4/chromium-payslip-dialog-320.png).
- [Manager entry hydration regression](../qa/evidence/ess6a-browser-remediation/extra-accepted/firefox-manager-transition.png); this is not certification of MSS product UX/workflows.

Viewport captures verify visible focus/action containment; full-page images illustrate layout with the capture limitation described below. Final manual viewport observations are recorded in [viewport review](../qa/evidence/ess6a-browser-remediation/viewport-review.json).


## Backend and quality checks

Fresh backend/API/PostgreSQL: **66 passed / 0 failed / 0 skipped / 0 blocked / 0 unexecuted**:

| Selection | Passed | Evidence |
|---|---:|---|
| ESS-1–6 focused contracts | 43 | [Django contract execution](../qa/evidence/ess6a-browser-remediation/backend-contracts.txt) |
| Statutory and DB-6 attendance-close selection | 10 | [PostgreSQL execution](../qa/evidence/ess6a-browser-remediation/postgresql-regressions.txt) |
| DB-3 leave-year/ledger integrity | 13 | [Leave-year execution](../qa/evidence/ess6a-browser-remediation/leave-year-regressions.txt) |

The selection excludes 363 unrelated pytest cases; deselection is not a skipped or passed case. Contracts include own/foreign/cross-tenant access, privileged-role restrictions, revoked sessions, notification mutations/concurrency, protected statutory transitions, published outputs, closed attendance and historical ledger preservation.

The frontend production build, full ESLint, TypeScript, Django checks, sanitized backend Python 3.12 production image build and network-disabled WSGI import all passed; [quality results and evidence hashes](../qa/evidence/ess6a-browser-remediation/quality-results.json) record them separately. Backend regressions run in the local Python environment, not inside the production image. Existing unrelated autoprefixer/deprecation warnings are retained.

## Accessibility and visual assessment limits

Native review: macOS **26.5.2 (25F84)**, Retina desktop, Google Chrome **155.0.8059.80**, isolated Playwright-owned profile/window, outer size 1280×995. Actual Chrome controls confirmed 200% and 400%, yielding 640/320 CSS viewport widths; document widths 632/316 equal their client widths. Full native-window CUA screenshots were visually inspected in the task transcript, including vertical scroll access, the table focus ring, Arrow Right movement and Tab revealing the complete Review request action at 400%. The native window was restored to 100% and closed. [200% metrics](../qa/evidence/ess6a-browser-remediation/native-accepted-zoom-200.json), [400% metrics](../qa/evidence/ess6a-browser-remediation/native-accepted-zoom-400.json). The linked native review used the three-fix artifact `Tj_UqI2VSEVdCBzmEc09K`. The subsequent application delta is only the manager layout boundary; [source continuity](../qa/evidence/ess6a-browser-remediation/native-review-source-continuity.json) verifies unchanged ESS Requests presentation sources. Final viewport-only captures use the final four-fix artifact. The overall native-zoom gate remains open.

This is a sampled native review of My Requests, not an all-route/dialog native zoom certification. Native Firefox/WebKit zoom remains **unexecuted**. CUA native images were reviewed directly; there is no exported native-window PNG artifact, and cropped Playwright native-zoom captures are not substituted for one.

Screen-reader speech/output review remains **unexecuted / NOT VERIFIED**: planned macOS VoiceOver × Chrome review has no executed speech/output evidence. Native accessibility-tree inspection does not count as screen-reader testing. NVDA/JAWS on Windows and physical mobile assistive-technology combinations were not exercised. Formal WCAG 2.2 A/AA assessment remains **unexecuted / NOT VERIFIED**. Automated axe checks, named controls, keyboard assertions and native reflow samples cannot close those gates.

Playwright browser combinations: macOS 26.5.2 desktop engines, Chromium 151.0.7922.34, Firefox 153.0 and WebKit 26.5, with desktop/tablet/mobile viewport resizing. These are not physical phone or native Safari/Firefox assistive-technology certifications. Native Chrome is the separate installed browser version stated above.

## Diagnostics, defects and interrupted runs

[Diagnostic execution summary](../qa/evidence/ess6a-browser-remediation/diagnostic-execution-summary.json) retains exact selected-run counts and partial interrupted logs. These do not become acceptance passes.

- The first isolated setup attempt started fixtures before migration completed; it recorded **0 passed / 2 failed / 0 skipped / 0 blocked / 2 unexecuted**, with missing tables/deadlock. Migration was completed before the next attempt. This is retained setup failure, not an application pass.
- Initial instrumented selected cases: 4 passed. The unmodified pre-fix repeated selection: 18 passed / 2 failed, both WebKit `Load failed`. Separate first-key probes established the hydration-readiness defect.
- Direct/development/throttled and instrumented Firefox probes are diagnostic observations only. The throttled development proxy initially redirected off its origin due to proxy header/cookie handling; those observations do not verify the intended journey. The corrected proxy's HMR errors are diagnostic infrastructure limitations, not acceptance exceptions.
- The disposable full Firefox diagnostic run was inadvertently stopped with its diagnostic server after 7 cases passed; its remaining 4 cases failed against the stopped server. It is not a certification run. This mistake does not justify excluding any errors from final acceptance.
- The first table implementation triggered ESLint's synchronous-set-state-in-effect rule. It was replaced by the hydration snapshot pattern; the initial build was interrupted and is excluded from acceptance.
- The superseded two-fix artifact recorded Firefox focused 5 passed, WebKit focused 4 passed / 1 failed (`Load failed`). Its partial full matrix was intentionally interrupted to fix the navigation race and rebuild. Completed results, partial logs, traces and interrupted fixture cleanup remain under `superseded-two-fix-build/`; the final acceptance matrix is a fresh complete run on one artifact.
- Guarded cleanup initially refused an additional diagnostic tenant copied into the owned ESS-1 QA clone. The exact copied fixture was identified and explicitly allowlisted; no ownership guard or retention trigger was bypassed. Logs preserve the refusals and successful retry.

- The initial supplementary six-case run recorded 5 passed / 1 failed: ordinary Tab skipped the link in macOS WebKit, after both arrow assertions passed. The new supplementary test now uses Option-Tab in WebKit, retaining the same real focus assertion; [Apple documents the supported link-navigation shortcut](https://support.apple.com/en-gb/guide/safari/cpsh003/mac). This corrects a new test assumption; it changes no frozen test or application Tab handling. The original failed run is retained under `extra/`; the complete corrected run is separate under `extra-accepted/`.

## Cleanup, restrictions and release disposition

Both isolated PostgreSQL databases independently audit **zero Tenant/User and tenant-related business rows**: [ESS-1](../qa/evidence/ess6a-browser-remediation/database-cleanup-ess1.json), [ESS-2](../qa/evidence/ess6a-browser-remediation/database-cleanup-ess2.json). Accepted fixture teardown verifies original closed snapshot hashes/locked rows and published payroll artifact integrity before deletion. All **440 baseline media files retain their hashes; 0 new media files remain**.

[Infrastructure cleanup](../qa/evidence/ess6a-browser-remediation/infrastructure-cleanup.json) verifies owned Next/Django processes, loopback ports, PostgreSQL container/volume, backend QA image, interrupted-fixture directories and task temporary files removed. Only the final frontend build is retained for review; owned intermediate builds are removed. [Source preservation](../qa/evidence/ess6a-browser-remediation/source-preservation-audit.json) confirms unchanged backend/domain sources, existing tests, Lightsail files and both frozen production trackers. The [four-file application patch](../qa/evidence/ess6a-browser-remediation/application-source-delta.patch) is reconstructed against verified turn-start hashes, separating these changes from the pre-existing dirty worktree.

**Local functional PASS; release CONDITIONAL; Lightsail deployment NO-GO.** No staging change/deployment, production certification or frozen-gate promotion occurs. All task infrastructure was local and synthetic.

Keep separately open: approved leave-year and employee-effective holiday projection APIs; profile edit/change-approval policy/contracts; writable notification/account/session preferences; provider/recovery delivery; production storage/signed access; statutory business acceptance; screen-reader and complete native-zoom review; formal WCAG and all existing production requirements. No MSS implementation begins.

Visual review also found an offscreen fixed skip-link painted inside a scrolled full-page WebKit capture, despite the Review request action retaining actual focus. Dedicated viewport-only captures verify the real visible UI; these are the accepted focus-visibility illustrations. The full-page diagnostic PNG is retained rather than presented as an additional visible application defect.
