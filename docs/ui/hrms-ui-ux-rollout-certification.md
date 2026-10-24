# Shared UI/UX rollout — implementation and verification

Date: 22 October 2026. Scope: repository implementation and isolated local verification. No deployment or production/frozen-gate promotion.

## Implemented presentation

The remaining authenticated screen compositions explicitly adopt the existing `accerio-page` content patterns and Accerio `PageIntro` appearance. Existing route/API/authentication/calculation contracts stay in their owning modules. Public account/marketing and authenticated documentation retain their appropriate standalone compositions; scoped Support uses the shared content styles without unrelated privileged navigation.

- HR Admin, ESS, MSS, Tenant Admin, Platform Admin and Finance Manager use the same compact operational content language. Platform/Finance explicitly opt into `WorkspaceChrome` Accerio appearance and consistent product branding. Header search accurately says “Search pages and actions”.
- Raw table wrappers migrate to `WorkspaceTableScrollRegion` while retaining their existing table columns, row actions and overflow classes. Regions receive contextual names, hydration-safe focusability and keyboard panning. This does not turn page-local arrays into server-filtered datasets or authorize bulk actions.
- ESS Attendance adopts compact header/panel/summary spacing; its calendar, timezone, correction APIs and finalized protections remain unchanged. MSS dashboard links explicitly identify the general Leave/Attendance queue rather than claiming an unsupported exceptions/team-leave filtered destination.
- Notification inboxes use `PageIntro`, accurate on-page summary labels and the shared scroll region. Timestamp presentations that produced hydration differences reuse the existing deterministic formatter, preserving the established Asia/Kolkata presentation where explicitly configured.
- Tenant membership/role, Platform create/contact/evidence/confirmation/permission, notification detail, provider configuration/rule editing and remediation dialogs converge on the existing action-modal lifecycle. Busy close guards and a centralized wide editor variant are added; nonfunctional tab semantics become plain section labels. Existing mutation payloads, permission checks, field restrictions and backend transitions remain unchanged.
- Data Governance uses shared native form controls and named table regions. Document summaries wrap instead of overlapping; inline status cards no longer inherit a row flex basis as a tall column height. Long evidence references wrap, small-screen enforcement metadata reflows, and native selects contain long option text instead of widening Safari's document.
- Root workspace error views explicitly use the shared appearance and user-facing copy; diagnostic configuration/details are not displayed as operator task guidance. Fault injection reproduced cached error boundaries after service recovery. Root retries now issue a fresh authenticated document GET at the current URL instead of only resetting the cached boundary.

## Scope and evidence interpretation

The [190-route source census](hrms-ui-ux-route-inventory.md) is the route baseline. Browser selection includes 153 static core-workspace routes, 28 HR dynamic route patterns exercised through 44 seeded route variants, Finance, standalone public/documentation screens, workspace routing and denied Support contexts. A successful routed page is not every permission/state/policy permutation. Documentation's catch-all is exercised through its authenticated root, not every guide slug; access routing is exercised with an assigned employee, not every unassigned/multi-role combination.

The [gap tracker](hrms-ui-ux-gap-tracker.md) retains its pre-rollout evidence classification. This report records the later presentation work separately, rather than declaring previously pending workflow contracts fully certified because styles or imports changed.

## Verification method

Owned PostgreSQL 16 container `accerio-ui-rollout-20261022`, database `hrms_ui_rollout`, loopback port 55462; Django 8062; production Next 3262. Unique synthetic tenants use the existing ownership-guarded workspace provision/cleanup command. Render-only fixtures add catalog/lifecycle/provider objects without claiming service-driven business transitions. Finance uses a role added to an existing owned synthetic user. The role-update dialog executes a genuine unchanged-role PATCH; most broad route cases are presentation/navigation checks, not mutation certification.

Browser retries are disabled. The route matrix checks real authenticated page reads, headings, shared presentation, 1440/768/390/320 viewport reflow, keyboard panning where tables overflow, and page errors. Dynamic variants use 1440/390. Focused dialogs check initial/trapped/restored focus, dirty confirmation and a real pending write. Scoped axe outputs are retained for the Attendance/MSS selection only; the whole route matrix is not an exhaustive axe/contrast/assistive-technology assessment.

Read-failure verification uses a separate loopback forwarding proxy on 8063 and frontend 3263: authorized session/menu reads and all successful application responses come from real Django; explicit GET failures exercise the five root workspace errors and recovery. It does not fabricate successful writes.

Each build has its own directory. Earlier overlapping build/server runs are retained as diagnostic attempts, not immutable final-artifact acceptance. The main route artifact and the later bounded recovery/heading/dialog-semantics artifact have separate provenance and execution scopes. Their exact source delta must be recorded, not presented as a single combined immutable build.

## Execution record

The immutable broad route run completed **512 passed / 7 failed / 0 skipped / 0 flaky** (519 cases). Its failures are two incorrect modal entry points in Chromium/Firefox and the duplicate documentation H1 in all three engines. The later independent closure completed **72 passed / 0 failed / 0 skipped / 0 flaky**, including corrected entry points, the documentation outline, five real read-failure/recovery paths, dialog lifecycle and section semantics in Chromium, Firefox and WebKit. These are separate executions, not 584 unique passing workflows.

The [machine coverage map](../qa/evidence/ui-ux-rollout-2026-10-22/presentation-coverage.json) joins only the declared route scopes: **190/190 route patterns have passing three-engine presentation evidence**. Dynamic routes, documentation and Support/access use the bounded grouped scopes described above. Historical classifications in the inventory remain intact alongside this additive execution field.

Backend selections completed **10 Django tests** and **25 expanded pytest cases**, with three Python deprecation warnings in the latter. Django system checks found no issues; migration drift reported no changes. They use the isolated PostgreSQL database and do not certify every business workflow.

Broad artifact: `a8pLveEhXkG_SkEkDC2RW`, directory `.next/ui-rollout-release`, [source provenance](../qa/evidence/ui-ux-rollout-2026-10-22/source-build-provenance.json). Closure artifact: `bGv2setv2isBIr-kcnJG9`, directory `.next/ui-rollout-complete`, [source provenance](../qa/evidence/ui-ux-rollout-2026-10-22/complete-source-build-provenance.json). Eight source files differ between those stages: the five root error views, embedded guide renderer/host, and shared modal section semantics. Subsequent pointer-trigger changes have a separate final manifest and execution record.

Shared screenshot filenames can be refreshed by later scoped runs; retained per-run traces and manifests are the authoritative execution record. The broad run began before later test-entry corrections; workers did not all execute the same edited test bodies. Original traces and result records define what each attempt actually executed. The fresh closure uses one fixed selection and immutable build. Earlier overlapping-build runs and interrupted selections are diagnostic history, retained in [the execution audit](../qa/evidence/ui-ux-rollout-2026-10-22/execution-audit.json), and are not added to the final pass count.

Visual inspection includes 13 historical desktop overview sheets, representative mobile composition checks and readable Tenant invite/HR mapping-dialog crops. See [visual scope](../qa/evidence/ui-ux-rollout-2026-10-22/visual-review-scope.json). This is a representative visual review, not detailed manual inspection of every screenshot or every route state.

Final artifact: `tSAvdxZ6M4oHcmdmURgbl`, `.next/ui-rollout-pointer`, [final source/test provenance](../qa/evidence/ui-ux-rollout-2026-10-22/final-source-build-provenance.json). It differs from the broad artifact in 36 source files and from the 72-case closure artifact in 28: one pointer-focus helper and 27 opener consumers. No later application source hash differs from this manifest. This bounded interaction delta is checked separately; the entire 190-route matrix is not claimed to have been rerun on this final build.

Production build, full ESLint and TypeScript checks exited zero. Build-generated `tsconfig.json` and `next-env.d.ts` changes were restored to their pre-task Git content before the final standalone type check. [Quality exits](../qa/evidence/ui-ux-rollout-2026-10-22/quality-exits.json) records these checks and continuity.

Historical failures and interrupted runs remain in the evidence root. The final fixed selection completed **111 passed / 0 failed / 0 skipped / 0 flaky**, with retries disabled: 37 cases per browser, combining the 72 closure cases and 39 mouse-trigger focus cases. See [final results](../qa/evidence/ui-ux-rollout-2026-10-22/final-results.json) and `final.txt`. All 13 selected pointer entry points restore focus in each engine, including the previously failing WebKit manager case.

Database teardown verified **0 tenants, 0 users, 0 employee documents and 0 document artifacts** in the owned database after browser cleanup. [Database cleanup](../qa/evidence/ui-ux-rollout-2026-10-22/database-cleanup.json) retains the counts. Existing report-export audit history is preserved; synthetic reads appended audit records. No pre-task media hash baseline is claimed and no upload workflow was exercised.

Only the enumerated task-owned local services/container/anonymous volume and intermediate build directories were removed. Accepted local artifacts and all browser evidence remain available; unrelated services were not managed. [Resource cleanup](../qa/evidence/ui-ux-rollout-2026-10-22/resource-cleanup.json) records the exact resources and closed ports.

Evidence root: [ui-ux-rollout-2026-10-22](../qa/evidence/ui-ux-rollout-2026-10-22/). Main config: `web/playwright.ui-ux-rollout.config.ts`; focused configs and tests under `web/tests/ui-ux-rollout/`. Local fault proxy: `backend/tests/ui_rollout_fault_proxy.py`; guarded render fixtures: `backend/tests/fixtures/ui_ux_rollout.py`.

## Remaining boundaries

Source-level visual adoption does not certify every filter/draft/history, bulk-selection, export, custom-role, policy, storage/provider, financial or historical-state permutation across the entire product. Existing domain certificates remain authoritative within their tested scopes. Actual assistive technology, native zoom, physical devices and formal WCAG require separate executed evidence. Granted Support variants, every documentation slug, production load/recovery and operational/statutory gates are not inferred from this rollout.

The documentation renderer supports an explicit embedded heading offset, so guide content starts at H2 beneath the host page H1. The selected declaration-only modal section labels use group semantics rather than nonfunctional tabs.

No business model, migration, dependency or financial/attendance/Leave calculation is changed. No global shell default silently migrates unrelated consumers. Deployment remains a separate decision.

## Findings retained during verification

- Initial approval-heading expectation used the wrong casing/text; corrected to the actual “Manager approvals” heading without changing application copy.
- Data Governance had real narrow overflow; shared controls/scroll regions repaired the owning component.
- Browser images exposed overlapping document summary values and a row flex basis becoming a tall mobile status card; centralized responsive rules corrected both.
- A source-formatter reproducibility probe compares Node and WebKit locale output for the same timestamp. Deterministic presentation replaces the affected formatters; the probe alone is not proof of every historical hydration trigger.
- Native-select overflow was localized to long contact/template options in Safari. A labelled CSS-injection diagnostic confirmed selected-text containment fixed document width; production-source verification is separate from that diagnostic.
- First modal tests guessed “Create role” and omitted the Mapping tab. Corrected entry points use the real “Add role” button and supported `tab=mapping` route; these are test defects, not renamed application actions.
- The first five-error selection reproduced failed reset-only recovery; it is retained as 1 pass / 3 failures / 11 unexecuted after interruption. A fresh document GET is the bounded application correction.
- A real WebKit mouse click left focus on the prior main heading; closing the manager dialog consequently restored the wrong target. Explicit trigger focus runs inside the click handler before opening, without reading refs during render. The failing pre-fix pointer case is retained.
- Authenticated guide content repeated the host H1; the renderer's explicit heading offset corrects the embedded outline rather than weakening the unique-heading assertion.

## Scoped decision

| Area | Decision / boundary |
| --- | --- |
| Shared presentation implementation | Complete across the enumerated workspace compositions; existing shared components remain the implementation baseline |
| Routed presentation | Passing declared three-engine scopes for 190 route patterns across identified artifacts; no single-artifact blanket product certificate |
| Visual consistency | Conditional on representative review; detailed manual review of every screen/state is unexecuted |
| Accessibility | Executed keyboard, modal semantics and bounded automated scans; actual AT/native zoom/formal WCAG remains open |
| Domain functionality | Bounded regression evidence and earlier domain records apply; exhaustive business/permission/state combinations remain open |
| Release | No deployment or frozen operational/statutory gate promotion |
