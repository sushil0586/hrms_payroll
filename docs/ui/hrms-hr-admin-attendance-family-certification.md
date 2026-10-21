# HR Admin attendance family — centralized experience and certification

Date: 2026-10-20. Scope is HR Admin attendance, as a continuation of the shared shell, Employees and Attendance Records pilots. ESS and MSS business workspaces are not redesigned by this change. No deployment or frozen release-gate change.

## Route scope

30 routes: Attendance operations; Records and edit; Regularizations and review; Monthly attendance close; Shifts, Employee shift assignments, Roster templates, Attendance policies, Attendance assignments and Holiday calendars (each catalog/create/edit); Attendance reports landing, Daily Attendance Register, Attendance Derivation Exceptions, Attendance Exceptions, Leave-Attendance Collisions and Roster Rollout Audit. Exact source routes are recorded in [routes.json](../qa/evidence/hr-admin-standardization/attendance-family/routes.json).

## Shared implementation

All route headers opt into the existing Accerio PageIntro and semantic theme. Existing operational/report strips become expandable contextual navigation rather than repeated dominant banners. Catalogs, reports, forms and action surfaces consume one `workspace-patterns.css`; no additional library or module stylesheet is introduced. Wide tables reuse the hydration-safe named keyboard scroll region and column-header semantics. Existing shared action modals and business forms remain authoritative for permitted controls.

Instant catalog/report filters use a common query-filter hook. Their URL survives refresh; multi-field Clear reads the live URL on each write to avoid resurrecting cleared values. These are immediate filters, not a hidden Apply workflow. Paginated assignment/roster queues retain their server GET contract and now use the same shared committed-query form for filtering and page-size changes. Regularizations use a named GET form and committed URL pagination rather than draft values; only the filter subtree resets on committed scope changes. Invalid dates are rejected locally and invalid deep links show validation before fetching records. Out-of-range regularization pages canonicalize while preserving filters.

All attendance family roots have shared loading and real error/retry boundaries. Retry issues a fresh current-query document read. Unavailable evidence is not replaced by production fixture/demo data. Demo controls remain governed by existing environment contracts.

Monthly close now handles initial/transport failures, loading/empty states and request ordering. Mutation duplicate activation is guarded synchronously; backend idempotency and transitions remain authoritative. Legal entity/status controls remain permission-scoped. Reopen uses the shared reason dialog rather than a browser prompt. Payable/LOP values are displayed from the existing snapshot, with unavailable values explicitly labelled rather than fabricated zeroes.

## Report integrity correction

The register previously fetched only the first 500 rows and then refetched filtered first pages with a silent old-data fallback. Other attendance reports and live export adapters also fetched a fixed first page. Screens and CSV/manifest source loading now follow all source pages, using requested pages of 100 and the actual returned population. A shared bounded assembler rejects incomplete, overlapping or population-count-changing results and upstream failures. The interactive cap is 10,000 rows; exceeding it produces an explicit unavailable-report error, not a partial report. This cap is a technical resource bound, not a business policy.

Register client and export search include the report's full fields; the export adapter no longer prematurely narrows its population using the different source-list search contract. Existing export permission checks, filtering, CSV format and audit-writing paths are retained. Export and screen are separate reads, not a database transaction snapshot; equal-count concurrent edits are not claimed to be detected. Existing report readiness/aging heuristics are identified as descriptive indicators, not approved tenant SLA/payroll authorization.

## Safety and source references

No migration, dependency, payroll/leave calculation, attendance derivation, close trigger, RBAC, tenant-scope or audit-policy changes. Existing close guards, backend permissions and rollout governance remain authoritative. Foreign IDs remain rejected by detail/mutation endpoints. The earlier Records bulk closed-period 400 correction and original failure evidence remain preserved in [A1 certification](hrms-hr-admin-a1-attendance-certification.md).

Primary changes: the route families above; their shared presentation/table/form integration; `components/patterns/use-workspace-query-filter.ts`, `workspace-load-error.tsx`, `styles/workspace-patterns.css`; `lib/complete-report.ts`; attendance-specific source loading in `app/api/hr-admin/reports/[reportKey]/route.ts`. Test changes include `tests/attendance-family`, isolated Playwright configuration and additional six-catalog API authorization regressions.

## Executed QA and evidence

Evidence root: [attendance-family](../qa/evidence/hr-admin-standardization/attendance-family/). Local PostgreSQL and loopback services are isolated from staging, with outbound processing disabled and unique synthetic tenants. Fixture includes more than 500 attendance rows, multiple regularization pages, real governed close evidence, and related setup objects. Browser retries are disabled.

- Initial focused backend selection: **24 passed** (`backend-regression.txt`).
- Expanded final backend/API/PostgreSQL selection: **36 passed**, 0 failed (`backend-final.txt`), including six-catalog foreign detail/mutation rejection and employee denial, plus DD4 rollout atomic rollback/idempotency, DB6 close integrity, ESS2 isolation and Records bulk contracts.
- Django system checks: passed (`django-check.txt`).
- Historical build/lint failures and generated-type checking collision are retained. A lifecycle lint issue and a missing required header prop were corrected; no lint rule was disabled. The candidate build log and final quality results are listed below with final browser totals.

Final execution results, screenshots, open accessibility gates and cleanup verification are recorded below. Inherited prior certificates are context, not newly executed counts.

## QA defect/remediation record

| Observation | Classification | Correction/evidence |
|---|---|---|
| Empty catalog test counted explanatory row as a data row | Test selector defect | Count actual rows excluding the colSpan empty-state row; retain empty-state verification |
| Copied Records last-page/status assumptions no longer fit >500-row fixture | Fixture/test expectation defect | Compute last page from real count; seed contrasting initial/filter statuses; preserve hidden-ID payload assertions |
| Close error locator matched Next route announcer too | Test locator defect | Scope alert assertion to the actual main workspace |
| Regularization Back restored an unapplied native select draft | Application/browser lifecycle defect | Shared GET form initializes from committed defaults after hydration and recreates only filter controls on cached/history restoration; edit workspace is not remounted |
| Screen reload rejected changing report population | Real read concurrency exposed by integrity guard | Existing HR shell eagerly prefetched every destination, including existing employee/ESS projection reads which materialize attendance. HR Admin now opts out of eager prefetch; intent navigation remains. Report assembler permits one immediate full restart for a detected population-count change, never returns a partial population and still rejects persistent churn |
| Filter/close labels and selected-row secondary text missed contrast | Presentation defect | Shared semantic text rules override legacy labels; selected-row secondary text uses the primary text token |
| Mobile/tablet action buttons stretched to large blocks; header actions remained 32px | Presentation defect | Shared action flex-basis correction, mobile minimum height and exact header override; rendered control-size assertions added |
| Early close screenshot captured loading rather than settled content | Capture synchronization defect | Wait for the actual close workspace busy state to settle before final responsive capture; loading remains a valid separate state |

Historical diagnostics are retained separately: interrupted `browser-attempt1.txt` logs 53 completed passes and 10 completed failures, without a completed full-suite result. The JSON produced by the earlier `--list` command is preserved as `inventory-list-results.json`; its inventory exclusions are not executed browser skips. `browser-focused.txt`: 11 passed/3 failed. `browser-focused2.txt`: 6 passed/3 failed. `browser-history-diagnostic.txt`: 1 failed after explicit document-load synchronization. `browser-focused3.txt`: 2 passed/1 failed (history). These results are not erased or reported as final acceptance passes.


Neighbor-harness provenance: the first neighboring run reused the legacy Employees test. Its header assertion expected Attendance Records to remain unmodernized and failed; the isolated copy now expects the Accerio header on that route while retaining assertions on untouched neighbors. That initial run refreshed prior root Chromium/Firefox Employees PNGs through a hardcoded path. Their screenshot index explicitly identifies this refresh; original result logs and immutable per-execution traces remain unchanged. Subsequent captures are isolated in this batch's `screenshots-neighbors/`. These refreshed images are not represented as original-candidate evidence.


The first complete 189-execution run finished **188 passed / 1 failed** (`browser-final.txt`, `full-attempt2/results.json`). Its sole failure was WebKit focus return after dismissing the governed reopen dialog. WebKit mouse activation did not focus the opener, so the modal's active-element restoration had no useful target. The reopen action now explicitly focuses its real button before opening; permissions and transition payloads are unchanged. `browser-focus-export-final.txt` verifies the close/focus workflow and all five report CSV/manifest actions **twice each in WebKit: 4 passed**. The first export probe incorrectly searched for a button instead of the actual accessible download link; its **2 passed/2 failed** run is preserved in `focus-export-attempt1/`. The corrected link assertion still requires an actual browser download and validates the saved CSV and live manifest response.

## Functional coverage boundaries

| Area | Fresh verification |
|---|---|
| Every route | Actual authenticated render at 1440/768/390 widths, no document overflow, named wide-table keyboard scrolling where applicable, mobile action sizes; screenshots |
| Catalogs | Four instant-filter catalogs: filter/empty/clear/URL refresh; both paginated catalogs: committed history/clear/draft isolation/page size; six existing permitted edit forms save through actual APIs |
| Regularization queue | Committed-versus-draft pagination, Apply, Back, date validation; review form renders. Approval/rejection policy/complete multi-step UI permutations are not newly certified |
| Records | Earlier safety matrix rerun, exact selected-ID payloads, retry, stale navigation, duplicate activation, edit save and closed-period bulk protection |
| Close | Real closed history read, transport-error retry, filtering, dialog keyboard initial focus/Escape/opener restoration. Browser verification does not execute a historical reopen; backend close protections are freshly tested |
| Reports | All six report routes render; five report CSV actions and manifest responses execute. Register matches a record beyond the former 500-row window. Shared pagination utility checks missing/overlapping/changed/unavailable/oversized populations and one bounded restart |
| Rollouts/imports | UI remains integrated with existing contracts; backend rollout rollback/idempotency rerun. Full browser CSV-import and rollout-transition policy permutations remain outside this selected acceptance |
| Authorization | Employee rejection; six setup families reject foreign detail/PATCH IDs; Records foreign IDs/read-only role; report export employee rejection |

Large-tenant report projection/export above 10,000 source rows remains a technical follow-up: this UI refuses partial evidence rather than pretending completeness. The report-read guard is not an isolated database snapshot and does not detect equal-count concurrent field edits. Original historical audit transport root cause remains unproven; the newly observed prefetch/materialization race does not retroactively classify it.


The next complete run (`browser-certified.txt`, `certified/results.json`) passed **192/192** (180 browser cases and 12 utility executions). Additional targeted coverage then reproduced stale Back-restored search controls in both paginated catalogs in **all three engines: 6 failed** (`browser-catalog-history.txt`, `catalog-history-baseline/`). Both catalogs now reuse the repaired shared GET form, including page-size controls. The already-supported backend size 100 is included consistently in their selectors. This follow-up is within the requested full Attendance scope; final acceptance below uses the expanded rerun rather than treating the earlier 192 passes as covering those six new scenarios.


The first catalog repair rerun reached the added page-size assertion after history had recovered, then failed **6/6** because the new 100-row option still met the old frontend 50-row clamp (`browser-catalog-history-final.txt`, `catalog-history-sizing-attempt/`). Both existing backend list views explicitly support `max_size=100`; the frontend normalization is now aligned to that existing bound. No attendance-policy or database calculation changed. The selected regression also verifies that unapplied search text cannot leak through page-size submission.

## Accessibility and visual review scope

| Review | Execution and limit |
|---|---|
| Responsive/reflow | All 30 routes at 1440, 768 and 390 CSS pixels in Chromium, Firefox and WebKit; Records also includes 320px. Document overflow and compact mobile button heights asserted |
| Keyboard | Named horizontal table regions and arrow scrolling across applicable routes; Records Enter inspection; close dialog initial focus, Escape and opener restoration; neighboring directory menu/modal/table regressions |
| Automated accessibility/contrast | Main-content axe scans on Shifts, Regularizations, Close and Register in every engine, plus Records and directory scoped scans. These are selected scans, not all-state WCAG certification |
| Visual inspection | Actual rendered route screenshots/contact sheets reviewed for all 30 routes in desktop/tablet/mobile Chromium layouts, plus representative individual renders. Full image index retains every engine; automated pass alone is not visual acceptance |
| Assistive technology | Screen-reader execution not performed; no VoiceOver/NVDA/JAWS certification claimed |
| Native zoom/devices | Native browser 200%/400% zoom, native mobile-device testing and assistive-technology combinations remain unexecuted; viewport emulation does not substitute for them |
| Other open checks | Formal WCAG assessment, exhaustive tab order/dialog permutations, fresh reduced-motion assessment and large-tenant performance remain open |

Executed engine/platform metadata is in `browser-versions.json`, `macos-version.txt` and `playwright-version.txt`: headless Chromium 151.0.7922.34, Firefox 153.0, WebKit 26.5, Playwright 1.62.1, macOS 26.5.2 arm64. These are Playwright engines, not certification of the installed Chrome/Safari native applications.

The route implementation and executed workflows can pass locally while the wider experience remains conditional. Create/import/rollout/reopen policy permutations not listed as executed are not represented as certified. No existing 40-gate production status is advanced.

## Final executed results and decision

| Selection | Passed | Failed | Skipped | Blocked/unexecuted within selection |
|---|---:|---:|---:|---:|
| Final Attendance browser cases (62 × three engines) | 186 | 0 | 0 | 0 |
| Shared report-pagination utility executions (4 × three project configurations; not browser cases) | 12 | 0 | 0 | 0 |
| Separate neighboring Employees regressions (9 × three engines) | 27 | 0 | 0 | 0 |
| Final backend/API/PostgreSQL regressions | 36 | 0 | 0 | 0 |
| Repeated focused WebKit close/export proof | 4 | 0 | 0 | 0 |
| Focused final Chromium queued-catalog proof | 2 | 0 | 0 | 0 |

The final expanded **198-execution suite** is `browser-all-final.txt`, `acceptance/results.json` and `acceptance/results/`. It ran with one worker and retries disabled. Neighbor evidence is `browser-neighbors-final.txt`, `neighbors-results.json` and `neighbors-results/`. Neighbor checks executed earlier in this batch, before the final catalog-only adapters/size normalization; no shared directory filter logic changed afterward. The final main matrix also renders neighboring HR/ESS/MSS pages. Focused proof runs are separate repeat executions, not additional unique workflows.

TypeScript (`typecheck-final.txt`), full ESLint (`eslint-final.txt`), Django checks (`django-check.txt`), production build (`build-release-candidate.txt`) and `git diff --check` passed. Generated Next `next-env.d.ts` and `tsconfig.json` build changes were restored to the pre-task tracked contents; TypeScript was rerun after restoration. Dependencies and migrations are unchanged.

Provenance: HEAD `2dbfecf02fb1b5dc2d700ac0c2ad33b9d718b161` plus the uncommitted worktree, including preserved prior shell/Employees/A1 work. Final production build ID **`1QxfARIuTFgAsc5ht44wl`**. Selected source SHA-256 values and prior build IDs are in `source-build-provenance.json`; this is a local working-tree build, not an immutable committed deployment artifact. [Acceptance summary](../qa/evidence/hr-admin-standardization/attendance-family/acceptance-summary.json) separates execution kinds and cleanup results.

**Local implemented/tested functionality: PASS. Overall attendance-family experience acceptance: CONDITIONAL.** The conditional decision preserves the explicitly open accessibility, large-report/performance, historical transport and exhaustive workflow gates. All 30 route patterns have been standardized; that is not blanket certification of every business-policy permutation.

**Lightsail: unchanged; no deployment performed and no deployment GO issued. Existing real-payroll/production release decisions and the 40 frozen gates remain unchanged.** No subsequent module or MSS redesign was started.

### Screenshots and cleanup

[Full screenshot index](../qa/evidence/hr-admin-standardization/attendance-family/screenshots.md): **270 primary route captures** (30 routes × three widths × three engines), plus Records narrow/error and neighboring directory captures. Contact sheets are supporting visual review artifacts, not substitutes for the full images. Main responsive screenshots were reviewed separately from browser pass totals; final assignment/roster renders were inspected after their shared-form adoption.

`database-cleanup.json` verifies **0 synthetic tenants and 0 Playwright users** in the dedicated QA database, including four leftover preflight/interrupted tenants. Matching owned temporary manifests and the separately named preflight manifest were removed. `infrastructure-cleanup.json` verifies the exact owned PostgreSQL container/volume removal, secure runtime-environment file deletion, and closed loopback ports **3201 / 8051 / 55446**. Only task-owned local services were stopped.

The existing local report-audit file received genuine synthetic export audit rows during QA. Cleanup archived **100 positively identified task-owned rows** in `owned-synthetic-report-audits.jsonl` and removed only those rows from the runtime store after the owned servers stopped. `audit-cleanup.json` confirms that all other original lines remain byte-for-byte unchanged. No live/customer audit trail was deleted or rewritten. Historical traces, logs, failed executions, source snapshots and certificates remain preserved, with the separately disclosed legacy root PNG refresh clearly marked.
