# Leave blocker closure — four-workspace recertification

Executed 20–21 October 2026. **Tested local functionality: PASS. Overall four-workspace acceptance: CONDITIONAL. Lightsail staging: NO-GO. Real-payroll production: NO-GO.**

The previous failed Leave matrix now passes completely on one production artifact. Tenant Admin's shell, mobile header and historical metrics are corrected. This pass also found and fixed stale post-mutation ledger display, lost pre-hydration rejection input, and double deduction of reserved units in HR report presentation/CSV. Existing backend calculations, contracts and authorization remain unchanged. Broader MSS visual consistency and accessibility/operational limitations remain open.

## Scope and provenance

This is the bounded follow-up to [four-workspace Leave certification](hrms-leave-four-workspace-certification.md), using the [HR Admin tracker](hrms-hr-admin-coverage-tracker.md), [ESS tracker](hrms-ess-coverage-tracker.md), [central design system](accerio-design-system-implementation.md), and the preceding Leave and ledger evidence. Scope remains Leave Management across HR Admin, ESS, MSS and Tenant Admin, plus affected shared-shell navigation. It is not full certification of all four products or a new execution of the frozen ESS 204-case suite.

- Git HEAD: `2dbfecf02fb1b5dc2d700ac0c2ad33b9d718b161`. The tree contains substantial pre-existing uncommitted work. No clean-tree, commit or immutable deployment-image certification is claimed.
- Final production artifact: **`dmg0iOtjUis20neYrAMQq`**, retained at `web/.next/leave-closure-net-certified`. All final results below use this artifact; no subsequent application changes.
- Chromium **151.0.7922.34**, Firefox **153.0**, Playwright WebKit **26.5**, macOS arm64, Node **v24.14.0**, isolated PostgreSQL **16.15**. Playwright WebKit is not native Safari/device certification.
- Real Next production servers used owned loopback services and synthetic tenants/private media. Notification/provider processors were disabled. No customer data, Lightsail changes, AWS resources or external delivery claims.
- [Source/build hashes](../qa/evidence/leave-blocker-closure/provenance.json), [scoped delta and unchanged gates](../qa/evidence/leave-blocker-closure/source-and-gate-verification.json), [dirty Git inventory](../qa/evidence/leave-blocker-closure/git-status.txt), [artifact history](../qa/evidence/leave-blocker-closure/build-artifact-history.json).

## Findings, fixes and root-cause limits

| Finding | Classification / root cause | Change and executed proof |
| --- | --- | --- |
| L4-07 Chromium report React #418 / streamed `$RS` `parentNode` cascade; additional intermediate Firefox Leave Type #418 | Browser/framework timing defect; exact original trigger remains **unproven**. The signature resembles the parser/stream race in [React issue 37321](https://github.com/react/react/issues/37321); this is an inference. Ordinary, cached and throttled diagnostics did not reproduce #418 consistently. | Reusable `DocumentHydrationBoundary` inside Suspense at the HR Admin and Tenant Admin shell consumers defers client hydration until actual `DOMContentLoaded`. SSR remains enabled, with named loading feedback. No sleeps, warning suppression, dependency patch or relaxed page-error assertion. Deterministically held real report HTML verifies parser-time readiness, then a working filter after release in all engines; nine repeated report journeys and nine setup journeys pass. This is containment, not a proven upstream framework fix. |
| L4-10 Tenant Admin chrome and historical counters | Layout selected legacy standard appearance; narrow header controls overlapped and adjacent inline counters lacked shared metric layout. | Reuse Accerio shell/branding, central header wrapping, existing `PageIntro`, `MetricTile` and responsive grid. Twelve Tenant routes × three engines pass shell checks at 1440/768/390 px. Quantities, permission-driven menus and destinations unchanged. |
| Header keyboard hint contrast | Inherited `Cmd K` hint measured 2.91:1 in the new header scan. | Central semantic text/surface/border tokens; failed scan retained and current scopes report zero violations. |
| WebKit credit committed but visible balance remained stale | Existing `router.refresh()` path received RSC containing closing **24**, while visible table retained **23**. Mutation and canonical API were correct. Exact underlying reconciliation trigger remains unproven. | Read both authorized ledger GET contracts after confirmed writes; snapshot is bound to current committed filters/server-prop references. Abort superseded reads, sequence/URL guard stale results, re-read a last valid page and canonicalize pagination/detail links. Failed reads expose a **GET-only** retry; committed POST is not replayed. Three-engine tests verify blocked RSC, read 503/retry, overlapping reads/two genuine credits and last-page review. [RSC proof](../qa/evidence/leave-blocker-closure/balance-refresh-rsc-diagnostic.json). |
| WebKit last-page rejection submitted an empty reason | Controlled inputs were usable before handlers hydrated, losing typed state. The captured POST returned **400** for missing `rejection_reason`; this was not a successful mutation or pagination arithmetic defect. | Reuse shared disabled-until-hydrated `WorkspaceFormControls` for decision/action/import controls. Tests require exact reason in POST and HTTP 200 before canonical page/detail assertions; nine repeated review executions also pass. No arbitrary wait. |
| Report/CSV availability deducted reservations twice | Backend `_recalculate_projection` already incorporates `reserved` into `closing_balance`; UI utility subtracted it again. With closing **23** and reserved **1**, ESS showed **23**, HR/CSV **22**. | Presentation utility now uses canonical closing as available. Backend calculations unchanged; existing CSV column `available_after_reserved` retained. A preserved baseline browser failure, real HR/ESS/CSV parity in all engines, and two new PostgreSQL reservation cases prove the correction. Factual negative-state classification uses canonical available, including a negative regression. [Before proof](../qa/evidence/leave-blocker-closure/availability-before-fix/results.json), [database proof](../qa/evidence/leave-blocker-closure/backend-net-projection.txt). |
| L4-08 original delayed ESS read timeout | Original four-second deliberate delay inside a five-second assertion budget; application versus environment/budget cause remains unproven. | Original ESS delay, assertions and business/API behavior retained. Complete ESS batch and nine repeated readiness executions pass. Non-recurrence is not proof of the original trigger. |
| L4-09 original WebKit Tenant → HR RSC access-control error | Original trigger remains unproven. | Tenant eager off-screen prefetch disabled, matching existing HR shell. Complete joined journeys and six repeated governance journeys pass with strict page-error checks; no errors filtered. |

An initial report-only boundary passed HR tests but the neighboring batch exposed Firefox #418 on Leave Type creation. The final boundary therefore composes the two affected shell consumers with visible loading feedback. It is not applied globally to unrelated platforms or ESS/MSS. Upstream hydration behavior and the original intermittent triggers remain watch items.

## Changed files, contracts and design-system reuse

Eight application files changed relative to the preceding certification's source hashes:

| File | Change |
| --- | --- |
| `web/src/components/patterns/document-hydration-boundary.tsx` | New reusable parser-readiness boundary |
| `web/src/components/shell/hr-admin-chrome.tsx` | Scoped boundary/Suspense composition around existing shell |
| `web/src/app/tenant-admin/layout.tsx` | Existing Accerio appearance/brand, explicit prefetch and readiness composition |
| `web/src/app/tenant-admin/leave-year/page.tsx` | Existing Accerio page/header styling |
| `web/src/app/hr-admin/leave-year/leave-year-workbench.tsx` | Four shared historical-classification metric cards |
| `web/src/styles/workspace-shell.css` | Shared wrapping controls and semantic shortcut-hint contrast |
| `web/src/app/hr-admin/leave-balances/leave-balance-operations.tsx` | Canonical read refresh/retry/stale-response and pagination handling; shared form readiness |
| `web/src/lib/ui/leave-balance-presentation.ts` | Canonical net-available presentation and CSV parity |

No backend application, API success contract, dependency, migration, ledger locking/calculation, policy, audit, RBAC, tenant isolation, payroll or historical-close rule changed. Refresh reuses existing BFF GET `/api/hr-admin/leave-balances` and `/api/hr-admin/leave-balances/transactions`; existing action/review POST payloads remain. Read retry never retries a write. Native history replacement only corrects the current invalidated page URL after an authorized result.

New tests/configs: `web/tests/leave-blocker-closure`, `leave-closure-shell`, `leave-closure-stream`, `leave-closure-refresh`, `leave-closure-availability`, and `web/playwright.leave-closure*.config.ts`. Existing four-workspace definitions retain business assertions; evidence paths are configurable and screenshot capture now waits for each exact role heading rather than a main-region loading skeleton. The original ESS/recovery definitions are reused unchanged.

Two new parametrized cases in `backend/tests/test_hr_admin_leave_report_population.py` assert canonical HR/ESS net projection and unchanged ledger entries after reads. Existing helper expectations in `web/tests/leave-correctness/presentation.spec.ts`, `web/tests/leave-four-workspaces/hr-presentation.spec.ts` and the new clone now use the demonstrated canonical meaning; zero/positive/negative numeric assertions were added. Their old sources/hashes are retained in [presentation-tests-before-fix](../qa/evidence/leave-blocker-closure/presentation-tests-before-fix/). This corrects an expectation that mirrored the UI bug; negative coverage was retained. Frozen ESS definitions were not weakened or altered.

Generated `next-env.d.ts` references the final artifact. Only this task's obsolete generated type includes were removed from `tsconfig.json`; pre-existing includes were preserved.

`WorkspaceChrome`, shared navigation/search/footer, `PageIntro`, metrics, filters, tables, status/feedback, form readiness and existing dialogs remain reusable by MSS. Business permissions remain in existing containers/backend. No new component library or broad MSS redesign. MSS still repeats Home/Open ESS/Sign out and uses taller detail sections; ESS/MSS retain a lighter shell variant. Tenant Leave Year/Data Governance remain authorized direct routes absent from the current menu catalog. These discoverability/density/family-consistency advisories are **open**, not overridden by changing permissions or inventing links. Shell smoke checks do not certify all legacy Tenant page bodies.

## Exact fresh execution results

| Final-artifact suite | Passed | Failed / skipped / blocked / unexecuted |
| --- | ---: | --- |
| HR correctness, year operations and reporting | 48 | 0 / 0 / 0 / 0 |
| Catalog, applications and balances | 102 | 0 / 0 / 0 / 0 |
| ESS Leave | 27 | 0 / 0 / 0 / 0 |
| Joined four-workspace journeys | 24 | 0 / 0 / 0 / 0 |
| ESS/MSS session, replay and role context | 9 | 0 / 0 / 0 / 0 |
| **Complete primary selection** | **210** | **0 / 0 / 0 / 0** |
| New Tenant shell / held stream / refresh / availability | 36 + 3 + 12 + 3 = **54** | 0 / 0 / 0 / 0 |
| Repeated report / governance / setup / ESS readiness | 9 + 6 + 9 + 9 = **33** | 0 / 0 / 0 / 0 |
| **Complete final matrix** | **297** | **0 / 0 / 0 / 0** |
| Same-artifact preflight availability / repeated last-page review | 3 + 9 = **12** | 0 / 0 / 0 / 0 |
| **All final-artifact executions** | **309** | **0 / 0 / 0 / 0** |

The primary 210 comprises **198 UI cases and 12 Node helper checks**. The final matrix 297 comprises 285 UI executions + 12 helpers; all final-artifact runs total **297 UI executions + 12 helpers**, not 309 distinct UI tests. They cover **264 distinct project/case combinations: 252 UI + 12 helpers**. Repeats/preflights are counted as executions. Each engine project records 103 successful executions, including four helpers; retries are disabled, zero flaky outcomes. [Execution/count/trace audit](../qa/evidence/leave-blocker-closure/final-execution-audit.json) retains 309 final trace archives. [Matrix exits](../qa/evidence/leave-blocker-closure/net/browser-run-exits.json), [exact cases](../qa/evidence/leave-blocker-closure/net/execution-summary.json), [whole-campaign inventory](../qa/evidence/leave-blocker-closure/campaign-summary.json).

Fresh backend/API/PostgreSQL: **154 broad + 4 ownership/stale/protection + 8 post-refresh + 4 net-projection = 170 passing executions / 160 distinct checks**, zero failures/skips. The eight repeat broad checks; the projection file repeats two prior cases and adds two. Coverage includes concurrent ledger invariants, reservations/approval/cancellation/expiry, expected stale-decision rejection, employee/tenant isolation, audit, protected deletion and historical attendance/leave-year preservation. [Selection](../qa/evidence/leave-blocker-closure/backend-selection.json), [154](../qa/evidence/leave-blocker-closure/backend-tests.txt), [4](../qa/evidence/leave-blocker-closure/backend-cleanup-stale.txt), [8](../qa/evidence/leave-blocker-closure/backend-post-refresh.txt), [projection 4](../qa/evidence/leave-blocker-closure/backend-net-projection.txt).

TypeScript, full ESLint, Django checks, migration-drift check and production build **PASS**. Django: zero issues; no migrations detected. The existing Autoprefixer `end` warning in `globals.css` and three Python deprecation warnings remain. A new proxy `HeadersInit` typing error was caught in the initial TypeScript run, corrected and the failed output retained. [Final quality exits](../qa/evidence/leave-blocker-closure/quality-results.json), [production build](../qa/evidence/leave-blocker-closure/build-net-certified.txt).

### Historical results are preserved

Before this final artifact, this task recorded **861 runner executions: 847 passed / 14 failed / 0 skipped**. All task runner attempts therefore total **1170: 1156 passed / 14 failed / 0 skipped**. These include bring-up, reproduction and intermediate builds; they are not final acceptance totals. Exact failed IDs/logs/traces remain in the campaign inventory. The failures include wrong-port/missing-output harness setup, expected old-stream readiness failure, genuine contrast/metric/hydration defects, a WebKit stream fallback presentation failure, stale visible credit, empty rejection reason, and the pre-fix availability proof.

Four stopped intermediate plans left **429 uninvoked planned executions** (99 + 234 + 72 + 24). These are explicitly unexecuted historical plan work, not runner skips or passes; final selected coverage above is independently complete. Transport-only diagnostic errors (`ERR_NETWORK_IO_SUSPENDED`/detached protocol), an early fixture command before migrations finished and quality/build commands are not browser case passes. Original preceding-certification 202/7/1 results and all earlier evidence remain historical, unchanged and excluded from fresh counts. The full frozen ESS 204 suite was **not newly executed** here.

## Rendered visual and accessibility review

[Screenshot/comparison index](../qa/evidence/leave-blocker-closure/screenshot-index.md) inventories **273 final PNGs**, including 36 joined-role captures and 108 Tenant route/width captures. Different synthetic fixtures make comparisons qualitative, not pixel equality. [Manual review](../qa/evidence/leave-blocker-closure/manual-visual-review.json) records **16 actually viewed images**: all 12 Chromium role/width combinations, WebKit Tenant mobile, Chromium HR report desktop, and Chromium/WebKit HR year mobile. All captured images are not claimed individually reviewed.

The targeted Tenant header and historical metric defects are visually accepted: readable hierarchy, no overlapping controls, consistent Accerio branding, usable 390 px forms and independent table scrolling. HR report shows canonical closing/available 23 with reserved 1. MSS legacy density/duplicate navigation and broader family variants remain conditional. Native WebKit empty-date placeholders differ visually from Chromium; no fake stored dates were added.

| Check | Fresh evidence / exact limitation |
| --- | --- |
| Responsive reflow | 1440/768/390 px across four roles and all 12 Tenant routes; ESS includes 320 px. No document overflow in selected Leave reflow checks; tables retain keyboard scrolling. Viewports are not physical devices or native zoom. |
| Keyboard/focus | Existing HR/MSS dialog keyboard open, trapping/restoration and Escape; named table ArrowRight/ArrowLeft; form/filter/history actions; Tenant mobile-menu Enter/Escape/restore and keyboard search to real Users route. Role-based named controls and validation/retry feedback verified. |
| Automated axe | **204 files / zero violation entries**. **108 complete header-scoped results** retain **108 incomplete contrast-rule/node entries** for an `aria-hidden` non-text search glyph. These remain manual-rule items, not automatic passes. Other 96 reused main/dialog files contain violations only; their incomplete results are unverified. |
| Contrast / reduced motion | Semantic shortcut-hint repair rescanned; existing emulated reduced-motion and transition assertions executed. Not exhaustive color/animation certification. |
| Native browser zoom 200%/400% | **Unexecuted in this pass**. Historical ESS zoom evidence is not counted anew. |
| Actual screen-reader speech | **Unexecuted**; no VoiceOver/NVDA/JAWS + browser/device combination certified. Accessible-name assertions are not speech review. |
| Formal WCAG / physical devices | **Unexecuted**; no conformance or native Safari/mobile-device claim. |

[Accessibility scopes and incomplete inventory](../qa/evidence/leave-blocker-closure/accessibility-summary.json). Targeted repaired presentation **PASS**; whole-family visual/accessibility acceptance **CONDITIONAL**.

## Cleanup and decisions

[Final fixture audit](../qa/evidence/leave-blocker-closure/fixture-cleanup.json) verifies zero synthetic tenants, users and document artifacts, with zero private media files. Owned interrupted diagnostic fixtures were recovered with tenant-code, sandbox and owner-email checks. No constraints were disabled. [Infrastructure cleanup](../qa/evidence/leave-blocker-closure/infrastructure-cleanup.json) verifies no test databases before removal; exact owned PostgreSQL container/anonymous volume, private runtime/environment, diagnostic manifest and nine intermediate build directories removed; owned servers/proxies/caffeinate stopped and loopback ports closed. Final artifact/evidence and the pre-existing shared PostgreSQL image/other work were retained.

Append-only local export-audit history was **preserved**, not erased as cleanup: [prefix/hash audit](../qa/evidence/leave-blocker-closure/audit-preservation.json) verifies the recorded pre-final prefix unchanged and records additions. Three frozen gate-file hashes are unchanged. No credentials/runtime configuration are included in the report.

**Tested local Leave functionality PASS** on the complete single-artifact selection. **Overall four-workspace acceptance CONDITIONAL**, with intermittent-trigger watches, MSS density/discoverability advisories and separate unimplemented/unverified gates. This supersedes the preceding local blocker disposition without rewriting historical failed runs or closing HR-A5/full-product certification.

Separate open requirements: approved ESS leave-year/employee-effective holiday projection APIs; planned-period activation without an approved API; policy-dependent delegation/escalation/reassignment; broader imports/custom-role/error permutations; deployed scheduler/worker operations; large-tenant performance; actual AT/native zoom/physical devices/formal WCAG; immutable image/source provenance, operational monitoring, off-host backup/restore and production/statutory requirements.

**Lightsail staging NO-GO; real-payroll production NO-GO.** No deployment or frozen release-gate advancement. Stop at this bounded closure; no new module or broad MSS redesign started.
