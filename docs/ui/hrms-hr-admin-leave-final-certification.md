# HR Admin Leave: final supported-workflow certification

**Local tested functionality: PASS. Overall acceptance: CONDITIONAL.** Final scoped execution: 153 Playwright runner executions and 72 backend/API/PostgreSQL tests passed, with zero final failures, skips, flaky results, blocks or unexecuted selected cases. This completes the remaining supported Leave Year and Leave Balance Report slices; the restrictions below remain open.

## Delivered scope

The two remaining planned slices are implemented: **Leave Year** and **Leave Balance Report**. Applications, Balances/Ledger, Types, Policies and Assignments receive a fresh family regression. This does not certify every policy combination or close any production gate.

Both pages use Accerio `PageIntro`, semantic tokens, shared forms, `MetricTile`, status badges, keyboard table regions, feedback/loading/error states and the existing action modal. Desktop cards use the shared compact spacing; report metrics form four columns on desktop and two on mobile, with an explicit non-overlap check. No second UI library, page-level color palette or fabricated production data was introduced.

## Functional findings and fixes

| Finding | Root cause and final behavior |
| --- | --- |
| Incomplete balances and exports | UI fetched only 50 balances; live CSV fetched only the default first API page. Both now use the existing bounded complete-page collector. PostgreSQL adds an ID ordering tiebreaker for identical employee/policy/year keys. A 57-row, tied-name fixture verifies full UI/CSV population and tenant isolation. |
| Filter/history/export mismatch | Local-only filter state lost refresh/Back context; generic CSV search also matched numeric amounts absent from UI search. Committed native GET filters, URL pagination and matching search fields preserve the represented view and export. Empty/last-page/drilldown cases are covered. |
| False creation error | React event `currentTarget` was accessed after `await`. Capture the form before the request, reconcile the real created period and reset only after success. Duplicate/overlap rejection retains inputs. |
| Misleading audit reason | Transitions previously generated text asserting authorization. An operator now enters the actual reason, with the existing backend minimum length. The shared modal confirms close/reopen/lock; successful actions focus the next row control or the periods heading. |
| Stale preview/re-entry | A synchronous in-flight guard prevents duplicate commands, pending controls lock, and every relevant input including schedule invalidates preview. Existing confirmation and backend idempotency remain authoritative. |
| Firefox/WebKit refresh errors | A document reload interrupted post-mutation RSC refresh, producing `Error in input stream` / `Load failed`. Commands now reconcile their authorized response payloads; abortable, non-overlapping JSON polling refreshes durable job statuses, with real failure/retry feedback. Polling stops on page exit and resumes on cached Back restoration. |
| Assignment check outlived save | A debounced read could continue through native navigation, which does not guarantee React unmount cleanup. Submission synchronously cancels the check; checks remain suspended while saving, cancel on page exit and resume on cached Back restoration. Cancelled responses/errors cannot overwrite current feedback. The same regression fails on the archived build (`check-start, save-start`) and passes across all three engines after the fix (`check-start, check-abort, save-start`). |
| Unused navigation requests | Remaining Next links issued RSC prefetches in a document-navigation workspace. Native links now serve the affected headers/detail/report actions, and the shared Time & Leave strip disables prefetching. The regression explicitly rejects unused balance RSC requests. |
| Visual/accessibility defects | Corrected six preview labels measured at 3.61:1, unstable select accessible names, card edge spacing, an empty legacy filter column and crowded mobile metric text. Shared semantic styles and `MetricTile` replace these deviations. Real screenshots are reviewed separately from test pass counts. |

The initial Firefox reduced-motion check read styles before layout settled. The separate diagnostic measured `0.00001s` at all six route/viewport combinations; the regression now waits for the same unchanged style threshold, without a fixed sleep.

## Contracts, permissions and integrity

| Operation | Existing contract and restriction |
| --- | --- |
| Periods/runs/classification | Existing HR/Tenant Admin `leave-year` APIs; `leave.periods.view`, tenant-scoped data. Classification stays read-only. |
| Create period | `POST periods/`, `leave.periods.manage`; existing policy/entity ownership, dates, overlap and uniqueness validation. Existing period boundaries are not edited. |
| Preview/queue | Existing `preview/` and `close-runs/`; `leave.periods.close`, exact confirmation and existing idempotency. Preview performs no writes. |
| Close/reopen/lock | Existing period transition API and audit events. Close needs a successful run; reopen requires its separate permission; locked periods have no exposed reopening action. |
| Balances/report | Existing `/hr-admin/leave-balances/` and CSV/manifest routes. Same JSON shapes, page caps and authorization; full pagination and search parity corrected. Report quantities retain the existing formulas and are leave units, not monetary/statutory valuations. |
| Assignment checks | Existing conflicts/create/edit APIs and permissions; only request lifetime, cancellation and presentation feedback change. |

No migrations, dependency additions, new runtime settings, authentication changes, payroll/leave formulas, historical records or database constraints changed. `makemigrations --check --dry-run` verifies no model delta. No exactly-once guarantee is added to non-idempotent creates; inspect persisted state after an ambiguous network outcome.

The collector detects overlapping/incomplete pages and population changes, retries population change once, and enforces the existing 10,000-row interactive bound. It is not a repeatable-read snapshot across concurrent value updates.

## Executed verification

| Fresh final execution | Passed | Failed / skipped / flaky |
| --- | ---: | --- |
| Final Year/report suite | 33 | 0 / 0 / 0 |
| Full neighboring Applications, Balances and Setup suite | 102 | 0 / 0 / 0 |
| Firefox period-transition repetitions | 3 | 0 / 0 / 0 |
| Year-boundary/timezone cases | 3 | 0 / 0 / 0 |
| Neighboring regression repetitions | 9 | 0 / 0 / 0 |
| Deterministic assignment request-lifetime regression | 3 | 0 / 0 / 0 |
| **Playwright total** | **153** | **0 / 0 / 0** |
| Backend/API/PostgreSQL (70 focused + 2 report population) | **72** | **0 / 0 / 0** |

The 153 runner executions comprise 150 UI/browser workflows and 3 Node-side collector cases executed in browser projects; they include repetitions, not 153 unique workflows. Engine totals: Chromium 50, Firefox 50, WebKit 53. Zero selected blocked/unexecuted cases. All browser retries are disabled. [Machine summary](../qa/evidence/hr-admin-standardization/leave-final/acceptance-summary.json).

TypeScript, ESLint, Django checks, migration dry-run and whitespace checks exited 0; [quality results](../qa/evidence/hr-admin-standardization/leave-final/quality-exits.json). The final production build passed: build ID `Bs9r-RCJyTl6hV2whHqQa`, [build log](../qa/evidence/hr-admin-standardization/leave-final/build-release-certified.txt). Scoped source/test hashes remained unchanged during final execution.

All fixtures use owned synthetic tenants on local PostgreSQL 16.15, backend `127.0.0.1:8055`, and a production-built frontend on `127.0.0.1:3205`. No customer/staging endpoint is targeted. The existing worker service is executed against synthetic close runs; this is not broker/dispatcher/scheduler operational certification.

The full family selection covers Applications, Balances/Ledger and the nine Setup catalog/create/edit routes; it includes real saves, decisions, adjustments, maker-checker review, CSV commit, authorization and neighboring Employees/Attendance navigation. It is not a fresh run of the frozen ESS suite or the whole Attendance/MSS product.

## Visual and accessibility acceptance

Actual final screenshots were inspected through seven three-engine contact sheets: both pages at 1440/768/390px and the mobile transition dialog, covering all **21 main captures**. Two before/final comparison sheets were also reviewed. The before images are from an intermediate local attempt, not deployed staging. Final spacing, card hierarchy, two-column mobile metrics and action visibility are consistent; wide tables intentionally scroll within named keyboard-accessible regions. [Screenshot index](../qa/evidence/hr-admin-standardization/leave-final/screenshots.md). An additional 72 neighboring screenshots are retained as regression evidence, not individually declared visually reviewed here.

Automated axe results: **51 retained distinct scans, zero reported violations**; three repeated Firefox scans additionally executed (overwriting the same result filenames), for 54 scan executions. These are the configured scoped axe checks, not formal WCAG certification. Exact environment: macOS 26.5.2 arm64, Chromium 151.0.7922.34, Firefox 153.0, WebKit 26.5, Node v24.14.0; Playwright headless desktop/mobile viewport emulation.

Keyboard checks include committed Enter submission, named horizontal table scrolling, focus visibility, modal Tab/Shift+Tab containment and Escape restoration, and focus after successful close/reopen/lock. Reduced-motion emulation verifies the preference and sampled input transition durations across both pages and all viewports.

| Assessment | Scope / remaining gate |
| --- | --- |
| Actual screen reader / AT | **Unexecuted**; no assistive-technology combination certified. |
| Native browser zoom 200% / 400% | **Unexecuted**. Viewport resizing is not native zoom. |
| Formal WCAG / real devices | **Unexecuted**. Scoped axe scans and headless browser emulation do not establish conformance. |
| Large-data/custom-role/full policy matrices | Interactive limit, exhaustive CSV/partial-failure/detach permutations, international collation and custom permission combinations are not comprehensively certified. |
| Historical Chromium hydration incident | An isolated React #418 occurred in an earlier family run. Three development repetitions did not reproduce it; three focused production repetitions and the final full family selection also passed. Preserve this as a stability watch; no unproven framework root-cause fix is claimed. |

## Restrictions and release decision

Planned-period activation has no existing transition contract and remains unavailable. No generic run retry/force-complete, automatic historical reclassification, cross-entity conversion, rehire/proration or post-expiry policy is invented. Approved ESS leave-year/holiday projection APIs remain a separate open gate; HR period management does not implement those employee projections.

**Local tested functionality: PASS; overall experience/release acceptance: CONDITIONAL.** Supported scoped workflows passed the executed checks. Accessibility assessments, policy/API restrictions and the historical Chromium stability watch remain explicit open items. **Lightsail staging deployment: NO-GO; real-payroll production: NO-GO.** This local certification does not approve promotion. [Verified cleanup](../qa/evidence/hr-admin-standardization/leave-final/cleanup.json): zero synthetic tenants/users before removing the exact owned PostgreSQL container/volume, private runtime environment deleted and all owned service ports closed.

Lightsail/customer data and the frozen 40 production release gates are unchanged. No deployment, billable AWS resource, production image promotion or MSS implementation is performed.

## Changed source and evidence

Key source: [Year workbench](../../web/src/app/hr-admin/leave-year/leave-year-workbench.tsx), [report workspace](../../web/src/app/hr-admin/reports/leave-balance/leave-balance-report-workspace.tsx), [report proxy](../../web/src/app/api/hr-admin/reports/%5BreportKey%5D/route.ts), [balance API ordering](../../backend/apps/common/api_views.py), [assignment form](../../web/src/app/hr-admin/leave-policy-assignments/leave-policy-assignment-form.tsx), [shared navigation strip](../../web/src/app/hr-admin/time-leave-operations-strip.tsx), [central styles](../../web/src/styles/workspace-patterns.css). Page headers/links, request detail link and new loading/error boundaries also change. Stable shared primitives are reused.

The worktree includes substantial pre-existing work. Scoped source/test SHA-256 fingerprints and local build ID are recorded in [provenance](../qa/evidence/hr-admin-standardization/leave-final/source-provenance.json); this is an uncommitted local QA build, not an immutable deployment image. Generated Next TypeScript configuration changes are restored to their initially clean state. Owned intermediate build directories were removed; the certified final build and all historical result evidence are retained. Strict final cleanup first detected three old interrupted-attempt fixtures, removed only their verified synthetic ownership identities, then confirmed zero tenants/users before infrastructure removal.

[Evidence directory](../qa/evidence/hr-admin-standardization/leave-final/README.md) contains exact commands/results, traces, screenshots, diagnostics and cleanup. [Historical execution index](../qa/evidence/hr-admin-standardization/leave-final/execution-history.md) retains failed/interrupted/superseded results; they are not relabeled as passes. The original fixture-attempt text log was accidentally overwritten; its retained JSON and explicit note disclose that loss. Initial report-test fixture errors and the unrelated historical broad payroll fixture failure are not claimed as application fixes.
