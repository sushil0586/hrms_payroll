# Accerio design system certification

Decision: **CONDITIONAL**. Scoped functional verification **PASS**. Completed 2026-10-19 IST (2026-10-18 UTC). Formal native zoom, screen-reader and full WCAG assessments remain unexecuted; existing release gates are unchanged.

## Final executed results

Production build: `-8ijYFOzPawZXZpwq-Huu`. All acceptance browser runs started after this build; zero failed, skipped or flaky cases. Preflight attempts are excluded from these totals.

| Check | Result | Evidence |
| --- | --- | --- |
| Existing ESS-1 browser regression | 24 passed: 8 per engine | [Log](../qa/evidence/accerio-design-system/ess1/browser-final.txt), [JSON](../qa/evidence/accerio-design-system/ess1/browser-results.json) |
| Existing ESS-2 browser regression | 24 passed: 8 per engine | [Log](../qa/evidence/accerio-design-system/ess2/browser-final.txt), [JSON](../qa/evidence/accerio-design-system/ess2/browser-results.json) |
| Shared-component/theme checks | 6 passed: 2 per engine | [Combined foundation/MSS log](../qa/evidence/accerio-design-system/foundation-browser.txt) |
| Neighboring MSS smoke | 12 passed: 4 per engine | [Combined JSON](../qa/evidence/accerio-design-system/foundation-results.json) |
| **Browser total** | **66 passed** across Chromium, Firefox and WebKit | [Source/build/screenshot manifest](../qa/evidence/accerio-design-system/source-manifest.json) |
| Employee profile/attendance API/PostgreSQL contracts | 17 passed | [API regression](../qa/evidence/accerio-design-system/api-regression.txt) |
| Historical close and focused workflow regressions | 11 passed; 362 unrelated tests deselected | [Close regression](../qa/evidence/accerio-design-system/close-regression.txt) |
| **Backend total** | **28 passed** on PostgreSQL 16 | Existing financial/closed-history protections retained |
| TypeScript | PASS | [Log](../qa/evidence/accerio-design-system/typecheck.txt) |
| Focused ESLint | PASS, zero warnings | [Log](../qa/evidence/accerio-design-system/eslint.txt) |
| Django system check | PASS, zero issues | [Log](../qa/evidence/accerio-design-system/django-check.txt) |
| Production build | PASS | [Log](../qa/evidence/accerio-design-system/production-build.txt) |
| Diff whitespace check | PASS | [Log](../qa/evidence/accerio-design-system/diff-check.txt) |

All 36 acceptance screenshots are indexed below and hashed with dimensions in the manifest. New functionality is presentation reuse and reliable read recovery; no API contract, backend policy, migration, payroll/statutory calculation or permission change was required.

## Scope and environment

Presentation-only foundation on the existing employee dashboard, profile and attendance. Shared ESS/MSS shell opt-in. No backend contract, policy or calculation implementation change. Production Next build with demo mode disabled; local PostgreSQL 16 disposable container; employee-owned synthetic workspaces removed by existing guarded cleanup. Lightsail untouched; frozen release gates remain unchanged.

## Verification strategy

- Rerun existing ESS-1 eight tests and ESS-2 eight tests on Chromium, Firefox and WebKit; retain all assertions, real authentication/API interactions and cleanup checks. Output redirection is opt-in and does not overwrite previous evidence.
- Add focused shared-component/theme checks on actual authenticated pages: identity, information panel, genuine action links, tablet screenshots, focus/skip link, reduced motion and reflow probe.
- Run the existing neighboring phase-4 manager browser smoke against an explicitly provisioned isolated manager, correcting only two stale default Inbox-label expectations to exact existing Alert headings; retain every filter/navigation/RBAC check. Add live ESS/MSS theme consumption checks.
- Rerun focused employee API/PostgreSQL contracts and historical-close regressions as defense in depth despite no integration behavior change.
- TypeScript, focused ESLint, Django system check and production build.
- Inspect actual desktop/tablet/mobile screenshots. Record visual findings and any follow-up limitations.

## Accessibility scope

Existing tests cover calendar and table keyboard interaction, selected-day keyboard navigation, dialog Tab/Shift+Tab, Escape/opener restoration, profile section selection, status/loading/error semantics and horizontal overflow. New tests check visible focus, skip navigation, reduced motion and tablet layouts. Root font-size 200% is a reflow probe, not native browser zoom certification.

Not executed as formal assessments: screen-reader testing (VoiceOver/NVDA/JAWS), native browser zoom across all engines, automated axe/WCAG audit, complete contrast inventory and touch assistive-technology testing. No full WCAG compliance claim.

## Screenshot index

All screenshots use isolated synthetic employees. Desktop/mobile ESS captures come from the original regression suites; tablet captures and MSS integration captures come from the foundation suite. Equivalent Firefox and WebKit files use the same suffixes.

| Surface | Desktop | Mobile | Tablet |
| --- | --- | --- | --- |
| Dashboard | [Chromium desktop](../qa/evidence/accerio-design-system/ess1/chromium-dashboard-desktop.png) | [Chromium mobile](../qa/evidence/accerio-design-system/ess1/chromium-dashboard-mobile.png) | [Chromium tablet](../qa/evidence/accerio-design-system/chromium-dashboard-tablet.png) |
| My Profile | [Chromium desktop](../qa/evidence/accerio-design-system/ess1/chromium-profile-desktop.png) | [Chromium mobile](../qa/evidence/accerio-design-system/ess1/chromium-profile-mobile.png) | [Chromium tablet](../qa/evidence/accerio-design-system/chromium-profile-tablet.png) |
| Attendance | [Chromium desktop](../qa/evidence/accerio-design-system/ess2/chromium-attendance-desktop.png) | [Chromium calendar](../qa/evidence/accerio-design-system/ess2/chromium-attendance-mobile.png), [list](../qa/evidence/accerio-design-system/ess2/chromium-attendance-list-mobile.png) | [Chromium tablet](../qa/evidence/accerio-design-system/chromium-attendance-tablet.png) |
| MSS shared shell | [Chromium desktop](../qa/evidence/accerio-design-system/chromium-mss-desktop.png) | [Chromium mobile menu](../qa/evidence/accerio-design-system/chromium-mss-mobile.png) | Covered by shared shell breakpoint checks; no dedicated MSS tablet capture |

## Contract and policy preservation

The foundation edits no backend or API route source. [Dependency comparison](../qa/evidence/accerio-design-system/preserved-api-backend-hashes.json) verifies nine backend/API/type/test dependencies against the existing ESS-2 manifest. The implementation document lists this task's source changes separately from pre-existing uncommitted work.

Employee scope, tenant isolation, masking, read-only profile restrictions, UTC correction inputs, idempotent real submission, authorized manager transitions, read-only refresh retry and finalized snapshot integrity remain the existing implementation. No financial or statutory calculation change, new approval policy, raw-punch edit action or invented business data was introduced.

## Palette verification

[Token contrast evidence](../qa/evidence/accerio-design-system/token-contrast.json) checks eight opaque foreground/background pairs using WCAG sRGB relative luminance. All exceed 4.5:1; the minimum is 5.64:1. This checks declared palette pairs only, not every rendered element, disabled state, inherited legacy style or background combination.

## Reproduction outline

Use disposable loopback PostgreSQL databases `hrms_ess1` and `hrms_ess2`, port 55440, existing migrations and the existing guarded synthetic workspace commands. Run Django on 8038 and the existing ESS-2 QA server on 8048 with request queue 128. Build with demo mode disabled. Start production Next on 3139 using API proxy 8039 and on 3149 using API proxy 8049. The original suites own their loopback fault proxies.

```sh
# Set the matching isolated database and absolute evidence path for each suite.
HRMS_CERT_EVIDENCE_DIR="$PWD/docs/qa/evidence/accerio-design-system/ess1" \
  pnpm --dir web exec playwright test --config playwright.ess1.config.ts
HRMS_CERT_EVIDENCE_DIR="$PWD/docs/qa/evidence/accerio-design-system/ess2" \
  pnpm --dir web exec playwright test --config playwright.ess2.config.ts
```

Run a separate production Next instance on 3159 against direct local Django 8048 for the foundation/MSS suite. This instance does not depend on the fault proxies. Provision an isolated manager with `manage_playwright_workspace --seed-ref accerio-mss-smoke`, set `PLAYWRIGHT_LIVE_MANAGER_USERNAME` to its generated synthetic manager and run `playwright.accerio.config.ts`. The foundation file owns and removes its own per-engine workspaces; explicitly clean up the external MSS smoke workspace afterward.

On macOS, use a process-scoped `caffeinate -dims` wrapper during local builds/tests. Initial timeout diagnostics and host power events are retained under `attempt1/`; the operating system entered maintenance sleep for 300 seconds during that attempt. No assertions or timeouts were relaxed to obtain acceptance results.

## Preflight findings and resolution

- A host sleep interrupted the first run. The retained power log confirms a 300-second maintenance sleep; subsequent runs use scoped sleep prevention.
- The unchanged attendance overflow check caught an inherited `nowrap` metric label at 320px. The final style wraps labels within their cards; no body-level overflow hiding or assertion relaxation was used.
- Screenshot inspection caught touching balance-table headings at tablet width. Natural column sizing and stacked tablet panels fix the layout; a new rendered header-clipping assertion guards it.
- The existing MSS smoke test used shared-component default Inbox labels instead of the manager page's existing Alert labels. [Baseline proof](../qa/evidence/accerio-design-system/mss-label-contract.json) confirms the MSS page matches HEAD. Two assertions now require the exact accessible manager headings; all workflow, filter, routing and role checks remain. Interrupted/stale-label diagnostics are preserved under `mss-preflight/`.
- Preflight reruns are not added to the final acceptance case counts. Earlier ESS-1/ESS-2 evidence directories and frozen gate files remain preserved.

A repeated attendance read-fault case also stalled in the existing RSC refresh/reset boundary. The shared ESS error action now reloads the same authenticated URL for a fresh read. This transport repair is explicitly included in final recovery regression; request submissions and business-policy logic are unchanged. Diagnostics remain under `retry-preflight/`.

The WebKit keyboard probe confirmed plain Tab starts at the search input while Alt/Option+Tab reaches the skip link in this runtime. The foundation test uses that native traversal modifier, retaining exact skip-link focus, visible outline and Enter-to-content assertions. [Diagnostic](../qa/evidence/accerio-design-system/webkit-keyboard-diagnostic.txt); original failure retained under `keyboard-preflight/`. This is a harness correction, not an application focus override or removed assertion.

Real MSS mobile screenshot review caught a legacy right-aligned menu extending off the viewport. The shared ESS/MSS panel now anchors to the full header, remains bounded in portrait/landscape and closes on normal link activation. The foundation assertions check panel/link bounds and navigation through the visible menu, including closure. Diagnostic evidence is under `navigation-preflight/` and `navigation-layout-diagnostic.txt`.

## Visual review and scoped restrictions

Representative final renders were inspected for desktop Dashboard/Profile/Attendance, tablet panels and information fields, mobile Profile/Attendance and the open MSS menu. Regression assertions cover all three engines and reject document overflow, clipped balance headers and off-viewport menu links. Cards use common surfaces/radii, primary selection and readable labels; wide tables remain within labelled scroll regions.

MSS adoption is a live shared-shell/control/metric example, not a full redesign of its legacy business tables or approval layouts. Other ESS pages inherit the shell but are not claimed as ESS-6 certified. HR Admin, Tenant Admin and Platform Admin page adoption remains separate work. Profile editing and unsupported attendance actions remain restricted by the existing policy/API contracts. ESS-3 is not started.

Nonblocking tooling output: the existing global stylesheet reports the pre-existing autoprefixer `end`/`flex-end` compatibility warning; Python 3.14 reports existing asyncio deprecation warnings. These did not fail the executed checks.


## Cleanup and final disposition

[Cleanup evidence](../qa/evidence/accerio-design-system/cleanup-summary.json) verifies zero tenants, users, attendance records, regularizations and attendance closes in both browser databases and the PostgreSQL test database. The external MSS smoke workspace and all per-engine fixtures were removed. Each engine verified its finalized snapshot hash before guarded teardown. The owned PostgreSQL container/volume and local Next/Django services were removed/stopped; all eight owned test ports are closed. No user services were stopped.

The two frozen gate files retain their original hashes and 40 rows each. Lightsail staging was not accessed or deployed. Earlier browser/API/backend evidence remains preserved. The foundation is ready for review with scoped functional PASS and overall CONDITIONAL disposition for the explicitly unexecuted formal accessibility assessments. No ESS-3 work was started.
