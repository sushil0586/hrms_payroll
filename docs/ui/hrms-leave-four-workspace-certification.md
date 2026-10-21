# Leave Management — HR Admin, ESS, MSS and Tenant Admin certification

Date: 20 October 2026. **Overall local certification: FAIL. Visual acceptance: FAIL. Lightsail promotion: NO-GO. Real-payroll production: NO-GO.**

The supported Leave workflows have strong passing PostgreSQL and joined-role evidence. Full acceptance remains blocked by a production Chromium report hydration failure and Tenant Admin visual integration defects. Follow-up passes do not erase the failed full-run results or prove the cause of intermittent failures.

## Scope and authoritative baseline

Reviewed the [horizontal plan](hrms-horizontal-experience-upgrade-plan.md), [HR Admin tracker](hrms-hr-admin-coverage-tracker.md), [ESS tracker](hrms-ess-coverage-tracker.md), [Leave correctness certification](hrms-hr-admin-leave-correctness-certification.md), [supported Leave certification](hrms-hr-admin-leave-final-certification.md), [mixed-ledger concurrency certification](hrms-ess-ledger-mixed-concurrency-certification.md), and existing MSS workflow evidence in `docs/qa/db6-9-mss-manager-approval-certification.md`.

Scope is **Leave Management across four workspaces**, with neighboring navigation checks. Earlier ESS/HR Admin certifications are historical evidence; their counts are not added below. This is not certification of every module in those workspaces or a fresh execution of the frozen ESS 204-case suite.

| Workspace | Supported scope exercised | Source contracts |
| --- | --- | --- |
| HR Admin | Types/policies/assignments; filters, history and pagination; create/edit/archive/deactivate; guarded deletion; resolution and CSV workflows; applications and decisions; balances, adjustments, maker/checker, transactions; complete-population report/export; leave-year controls | `web/src/app/hr-admin/leave-*`, `reports/leave-balance`, `backend/apps/common/api_views.py`, `leave_year_api.py` |
| ESS | Entitlements; request filtering/pagination/calendar/details; full/half-day submission and evidence; withdrawal; permitted direct cancellation; governed cancellation; restrictions; empty/error/loading/retry and refresh | `web/src/app/ess/leave`, `leave-request-lifecycle-actions.tsx`, `/api/v1/me/leave-*` |
| MSS | Assigned queue; review notes; approve/reject; governed cancellation approve/reject; real 503 retry; session/offline recovery; lost-response canonical replay; ESS/MSS role context | `web/src/app/mss/approvals`, `/api/v1/manager/leave-requests/*`, existing workflow services |
| Tenant Admin | Authorized options; period creation; close preview/confirmation; durable close execution; close/reopen/lock; HR visibility; foreign-tenant and employee denials | `web/src/app/tenant-admin/leave-year`, shared `LeaveYearWorkbench`, `/api/v1/tenant-admin/leave-year/*` |

Tenant Admin governs leave years; HR Admin owns the tested policy setup. No universal approval, delegation, reassignment, holiday, encashment or cancellation policy was invented.

## Environment and provenance

All fixtures ran in an owned PostgreSQL container on loopback port 55451, database `hrms_ess2`, with a private media directory, disabled notification/provider processors and synthetic tenants. Frontends used real production Next builds, not a development server. The development-only hydration diagnostic is explicitly separate from acceptance runs.

- Git HEAD: `2dbfecf02fb1b5dc2d700ac0c2ad33b9d718b161`. The working tree contains substantial pre-existing work and remains dirty. No commit or immutable release image is claimed.
- Final production Next build: **`AQK9sHPwu9XqgC8B39rYq`**, retained at `web/.next/leave-four-release`.
- The preceding build `Wn550kHYxO_WTeVmyfPSB` ran HR, catalog/balance and joined-role suites before the final shared scrolling correction. The final build ran ESS/recovery suites and the six-case governance/presentation follow-up. This was not one clean full-matrix execution on the final artifact.
- Chromium 151.0.7922.34, Firefox 153.0, Playwright WebKit 26.5; macOS arm64, Node v24.14.0. PostgreSQL 16.15. WebKit is not a native Safari certification.
- [Build provenance](../qa/evidence/leave-four-workspaces/build-provenance.json), [source hashes/status](../qa/evidence/leave-four-workspaces/provenance.json), [Git status](../qa/evidence/leave-four-workspaces/git-status.txt).

No migrations, dependency changes, financial/statutory calculations, approved business policies or release-gate statuses were changed. No Lightsail deployment or configuration change occurred.

## Exact executed results

### Primary cross-browser selection

| Suite | Selected executions | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: |
| HR correctness, year operations and reporting | 48 | 47 | 1 | 0 |
| Catalogs, applications and balances | 102 | 102 | 0 | 0 |
| ESS Leave | 27 | 25 | 1 | 1 |
| Joined four-workspace journeys | 24 | 20 | 4 | 0 |
| ESS/MSS session, replay and context | 9 | 8 | 1 | 0 |
| **Total** | **210** | **202** | **7** | **1** |

The 210 Playwright executions comprise **198 browser UI cases and 12 Node helper/collector checks**. Primary UI results: **190 passed, 7 failed, 1 skipped**; helpers: **12 passed**. There were zero separately reported blocked/interrupted cases. The Chromium ESS mobile case was serially skipped after the preceding failure; it was subsequently executed successfully in isolation.

### Follow-up executions

| Follow-up | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Final-build Tenant Admin governance and four-role responsive/keyboard/axe checks, all engines | 6 | 0 | 0 |
| Strengthened ESS/MSS recovery suite, all engines | 9 | 0 | 0 |
| Previously skipped Chromium ESS mobile case | 1 | 0 | 0 |
| Chromium delayed-read/error/retry case in isolation | 1 | 0 | 0 |
| Joined policy → ESS → MSS → Tenant Admin focused Chromium journey | 1 | 0 | 0 |
| **Additional executions** | **18** | **0** | **0** |

Latest individual-case outcomes are **209 passed / 1 failed** across the 210 distinct cases, comprising **197 browser UI passes, 1 browser UI failure, and 12 helper passes**. **No selected case remains never executed**, and the earlier serial skip remains recorded in the primary result. This latest-outcome view is not a replacement clean full-suite pass: the full-run timing failure and one WebKit RSC error retain unresolved-cause watch status.

Across every browser-runner attempt in this assessment, including harness bring-up and failed intermediate runs: **392 passed, 36 failed, 10 skipped; 438 executions**. No inherited results are included. [Campaign totals, exact failed IDs and attempt inventory](../qa/evidence/leave-four-workspaces/campaign-summary.json).

### Backend/API/PostgreSQL and quality

- Corrected broad selection: **154 passed, 0 failed/skipped**.
- Post-fix integrity/concurrency/API selection: **29 passed, 0 failed/skipped**, including four new regression cases. This includes 20 repeated cases and nine additional distinct cases.
- Combined successful verification: **183 executions covering 163 distinct backend checks**, not 183 distinct tests.
- Original broad run: **150 passed / 4 failed**. All four were fixture defects corrected without removing or weakening the business assertions. All backend attempts total **333 passed / 4 failed; 337 executions**.
- Final TypeScript, full ESLint, Django checks, migration-drift check and production Next build: **PASS**. Django reports zero issues; no migrations detected. Three existing Python deprecation warnings remain in pytest output.

Evidence: [broad backend](../qa/evidence/leave-four-workspaces/backend-tests-final.txt), [post-fix backend](../qa/evidence/leave-four-workspaces/backend-post-fix.txt), [original failures](../qa/evidence/leave-four-workspaces/backend-tests.txt), [quality exits](../qa/evidence/leave-four-workspaces/quality-results.json).

## Defects, fixes and remaining findings

| ID | Root cause / classification | Disposition and evidence |
| --- | --- | --- |
| L4-01 | Stale manager approve/reject after employee withdrawal raises an existing Django validation exception that the API did not translate, returning 500 | **Fixed.** Translate only expected validation exceptions to DRF 400 in the two MSS Leave decision endpoints. Service locking, authorization and state rules remain unchanged. New tests assert 400, withdrawn status and exact unchanged projection/transaction count; joined browser withdrawal test passes in all engines. Unexpected database errors are not hidden. |
| L4-02 | Owned synthetic teardown bulk-deleted movements whose compensation records protect their source | **Fixed test infrastructure.** Delete leaf movements before sources inside the existing ownership-verified atomic teardown. Preserve `PROTECT`; fail closed if no leaf exists. New tests verify ordinary source deletion remains protected and a changed ownership marker prevents teardown. |
| L4-03 | Three API date fixtures landed on weekends; one generated a code longer than the database's 50-character limit | **Fixed test fixtures.** Use the working days required by the original insufficient-balance/backdate/withdrawal assertions and bound generated code prefixes while retaining UUID uniqueness. The 154-case command passes; calculations and assertions are preserved. |
| L4-04 | Tenant Admin's legacy shell did not inherit readable operation-form label colors | **Fixed shared presentation.** Operation labels consume `--ds-text-muted` centrally. Original ratio 3.97:1 failed axe. Adding a page class alone was insufficient; that failed attempt is preserved. Final scans report zero violations. |
| L4-05 | Shared table scrolling CSS was restricted to an Accerio shell, leaving Tenant Admin year tables with visible overflow | **Fixed shared presentation.** At 390 px, the document was 489 px wide. Diagnostic style probe produced 390 px document width and keyboard scrollLeft 136. Move functional overflow/minimum-width and semantic focus treatment to `.workspace-table-region`, independent of shell. Final six-case follow-up passes in all engines, including named Tenant Admin ArrowRight/ArrowLeft scrolling. No columns or actions were removed. |
| L4-06 | WebKit logout correctly produced HTTP 401 `Invalid token.`; the historical test accepted other authentication messages but omitted this supported response | **Fixed harness, not an authorization defect.** Preserve original test source; add explicit HTTP 401 verification and permit the authentic token-revocation message. Draft preservation, one persisted request, canonical replay and request-count assertions remain. Strengthened suite passes 9/9. No cookie/security behavior was weakened. |
| L4-07 | Production Chromium report navigation raises React #418 plus streaming `parentNode` errors | **OPEN — browser acceptance blocker.** Exact case: `[chromium] hr-final.spec.ts:23` — `report every filter and sort persist and export matches all backend pages`. Empty-population production diagnostic did not reproduce; populated production diagnostic did. Development diagnostic did not reproduce. Removing the form's unnecessary interactivity-key remount did not eliminate the error. Root cause is not proven. No warnings were suppressed and no assertion was removed. [Final failure/trace directory](../qa/evidence/leave-four-workspaces/hr/results/hr-final-report-every-filt-3b6ae-t-matches-all-backend-pages-chromium). |
| L4-08 | Chromium delayed-read readiness assertion failed in the full ESS batch, then passed in isolation | **OPEN cause/watch.** Exact case: `[chromium] ess3-leave-certification.spec.ts:281` — `direct authorization, empty/error/loading and read-only retry`. The heading failed its existing five-second assertion after an intentional four-second read delay. Application-vs-budget/environment cause is not established. Do not label the full-run failure an environmental pass. Original timeout is unchanged. |
| L4-09 | One WebKit Tenant Admin → HR journey completed its business assertions but emitted an RSC access-control page error in afterEach | **OPEN cause/watch; not reproduced in final follow-up.** Exact case: `[webkit] integrated.spec.ts:49` — `Tenant Admin creates previews closes reopens and locks; HR and closed history stay consistent`. The complete final-build journey passes. No error was filtered out; a non-recurrence does not establish its original trigger. |
| L4-10 | Tenant Admin still consumes legacy global chrome and incomplete theme styling | **OPEN visual blocker.** Actual 390 px Chromium/WebKit screenshots show crowded/overlapping search/menu/shortcut presentation; the search input is only 44 px wide. Historical-classification metrics run together without the shared grid spacing. Blue/HRMS branding and card treatment differ from the Accerio family. Automated main-region axe success does not accept this chrome. Global Tenant Admin shell integration requires its own affected-page regression scope; it was not broadly redesigned during this Leave certification. |
| L4-11 | MSS repeats Home/Open ESS/Sign out actions and uses taller legacy page sections | **Open design consistency advisory.** Actions function, but density and hierarchy remain below the compact reference direction. No MSS workflow redesign was started. |

The other primary failed IDs are the three `[chromium/firefox/webkit] integrated.spec.ts:58` responsive/axe cases (L4-05) and `[webkit] dd6-ess-mss-domain-certification.spec.ts:27` session recovery (L4-06). All seven primary failures and their original traces remain retained.

## Changed source and maintained boundaries

| File | Change in this assessment |
| --- | --- |
| `backend/apps/common/api_views.py` | Translate expected validation errors in MSS Leave approve/reject; existing authorized and foreign-scope paths retained |
| `backend/apps/common/management/commands/manage_playwright_workspace.py` | Guarded synthetic compensation-graph teardown order |
| `backend/tests/test_synthetic_leave_cleanup.py` | Four new ownership/protection/stale-decision cases |
| `backend/tests/test_phase0_api_smoke.py` | Valid schema-sized fixture codes and working-date fixtures; assertions retained |
| `web/src/styles/workspace-patterns.css` | Semantic operation labels, shell-independent table scrolling/focus |
| `web/src/components/patterns/workspace-filter-form.tsx` | Avoid replacement solely when hydration enables interactivity; preserve history-restoration key and disabled-until-hydrated controls; does not close L4-07 |
| `web/tests/e2e/dd6-ess-mss-domain-certification.spec.ts` | Stronger expired-session HTTP assertion and supported error message; original source preserved in evidence |
| `web/tests/leave-four-workspaces/*`, `web/playwright.leave-four*.config.ts` | New joined-role, security, governance, responsive and existing-regression selections |
| `web/next-env.d.ts`, `web/tsconfig.json` | Generated final build reference; only this assessment's superseded generated type references removed |

No financial/policy model, database calculation, historical record, RBAC permission or employee API success contract changed. No competing component library was introduced. Presentation continues to reuse `WorkspaceChrome`, `PageIntro`, shared filter/table/metric/status patterns, `HrAdminActionModal`, existing feedback and `LeaveYearWorkbench`.

The joined journey creates a real type, active policy and assignment through HR Admin UI; the employee submits; the assigned manager approves; SQL checks the reservation → consumption → closing deltas; HR sees the authoritative balance; Tenant Admin sees the authorized policy. Governed cancellation approve/reject verifies exact ledger restoration/non-restoration. Unsupported cancellation is rejected without projection changes. Employee, anonymous and cross-tenant direct API denials are checked. An employee's permitted empty manager inbox response is verified as empty; its decision API remains forbidden.

Year-close tests execute the existing close service deliberately after a real queued request. They preserve a closed attendance snapshot hash, locked row and closed status. This is not a certification of deployed broker, scheduler or worker operations.

## Visual and accessibility evidence

[Final screenshots and comparison index](../qa/evidence/leave-four-workspaces/screenshot-index.md) contains **36 final four-role screenshots**: three engines × four roles × three viewport widths. Manual inspection covered all 12 final Chromium role/width combinations plus final WebKit Tenant Admin at 390 px. Additional application/setup/report/dialog and ESS screenshots remain linked in the evidence tree. Final images are source-built; CSS-injection probes are labelled diagnostic.

| Assessment | Execution / limitation |
| --- | --- |
| Responsive viewport reflow | 1440/768/390 px for all four roles; existing ESS checks additionally include 320 px. Final table follow-up has no page-level horizontal overflow. Tables retain independent scroll. This does not dismiss header overlap or certify physical devices. |
| Keyboard/focus | Existing HR modal trap/restore and navigation checks; MSS decision dialog accessible name, keyboard open/Escape/focus restore; named table keyboard scrolling; explicit Tenant Admin ArrowRight/ArrowLeft and retained focus in final follow-up |
| Accessible names and feedback | Role queries for named controls/tables/dialogs; validation, alerts, retry and permission states in the executed suites |
| Automated accessibility | **96 retained current violation-scan files, zero violation entries** across selected runs; **36** are final four-role main-region scans. Selected HR dialogs are scanned separately. Global chrome is outside those integrated axe scopes. Saved outputs contain violations only; incomplete/manual-rule results were not retained and are unverified. |
| Contrast | Corrected operation labels checked by axe; not an exhaustive page-wide contrast certification |
| Reduced motion | Emulated preference and existing selected assertions executed; no exhaustive animation inventory or physical-device preference review |
| Actual assistive technology / screen-reader speech | **Unexecuted** in this assessment; no NVDA, JAWS or VoiceOver combination certified |
| Native browser zoom 200% and 400% | **Unexecuted** in this assessment; viewport resizing is not native zoom. Historical zoom evidence is not counted as newly executed. |
| Formal WCAG assessment | **Unexecuted**; no conformance claim |

Full visual acceptance fails despite automated checks passing: L4-10 and the design-family gaps are visible in actual images. [Accessibility file inventory and limits](../qa/evidence/leave-four-workspaces/accessibility-summary.json).

## Cleanup, remaining restrictions and decision

[Fixture cleanup](../qa/evidence/leave-four-workspaces/fixture-cleanup.json) verifies **zero tenants, users and document artifacts**, with zero private media files. Two ownership-verified interrupted/diagnostic fixtures were recovered. Per-project cleanup filenames may reflect the latest targeted run; the final database audit covers the entire campaign. [Infrastructure cleanup](../qa/evidence/leave-four-workspaces/infrastructure-cleanup.json) confirms no test databases before removal, the exact owned container and anonymous volume removed, private environment/runtime removed, and ports 55451/8048/8059/3215–3219 closed. Only the final build is retained; shared PostgreSQL image (ownership not claimed) and other work were preserved.

Separate open gates remain for approved ESS leave-year/holiday projection APIs, planned-period activation without an approved API, policy-dependent delegation/escalation/reassignment, broader import/error/custom-role permutations, deployed scheduler/worker operation, actual screen readers, native zoom, physical devices, formal WCAG and production infrastructure/recovery/provenance requirements. They are not passed cases or silently implemented policies.

**Final local four-workspace decision: FAIL.** The backend and supported joined workflows have strong passing evidence, but L4-07, L4-10 and unresolved full-batch reliability findings prevent full certification. Next bounded closure should isolate the report SSR/streaming failure, integrate Tenant Admin's shared shell/metric presentation with affected-page checks, and obtain a clean complete browser batch on one final artifact. Do not start a broad MSS redesign or change business policy as part of that closure.

**Lightsail staging promotion: NO-GO. Real-payroll production: NO-GO.** No deployment occurred and no frozen production gate was advanced.
