# HR Admin phased implementation and QA plan

Date: 2026-10-19. Status: **implementation underway; shared shell locally verified; Employees is the first page-level pilot**. This is the execution plan for the [audit](hrms-hr-admin-page-audit.md), [experience standard](hrms-hr-admin-experience-standard.md) and [146-route tracker](hrms-hr-admin-coverage-tracker.md). No phase is accepted from a source scan or a page render alone.

Baseline: 146 route files, 30 desktop render observations, focused non-mutating filter checks on two routes, six functional findings and two design findings. HA-F01–04 include confirmed UI behavior; HA-F05–06 include source-confirmed risks awaiting isolated large-data/fault reproduction. The Attendance network error remains unclassified. Existing ESS tests are historical evidence and will not be counted as fresh HR Admin results.

## Prototype reference

The [five reference patterns](prototypes/accerio-hr-admin/five-reference-screens.md) add contract mappings and separate prototype QA evidence. They do not close application/API acceptance.

The [final prototype candidate](prototypes/accerio-hr-admin/index.html) and [review/screenshot guide](prototypes/accerio-hr-admin/README.md) demonstrate the common family before application implementation. Representative flows only; this does not close any HR Admin workflow certification or imply design acceptance. Production integration must reuse existing React components and actual authorized data.

## Shared shell design checkpoint

Before broad page work, use the [sidebar/header/footer/popup review](hrms-shared-shell-dialog-design-review.md) to specify the single product family. A0 includes concrete shell/dialog reference design and acceptance criteria. Every subsequent phase checks visual consistency alongside functionality; A4 is the broad rollout, not the first point at which consistency matters. Preserve urgent A1 selection-safety priority.

## Sequence and boundaries

| Phase | Work | Depends on | Complexity / indicative effort* |
|---|---|---|---|
| HR-A0 | Reproducible baseline and isolated QA environment | Audit | M / 1–2 engineer-days |
| HR-A1 | Attendance filter/history/pagination/selection remediation | A0 | M / 2–3 engineer-days |
| HR-A2 | Shared filter behavior across queues and catalogs | A1 | L / 4–7 engineer-days |
| HR-A3 | Report completeness, counts, exports and reliable errors | A1; shared A2 contract | L / 5–10 engineer-days |
| HR-A4 | Accerio HR shell, master pages, details and forms | A2; report contract from A3 | L / 5–9 engineer-days |
| HR-A5 | Payroll/close/provider and remaining operational workspaces | A3–A4 | L/high impact / 4–8 engineer-days |
| HR-A6 | Complete product regression and controlled staging acceptance | A1–A5 | L / 3–5 engineer-days |

*Planning estimates include implementation plus QA/fixes for one engineer with QA capability. Roughly 24–44 engineer-days overall, not a calendar commitment. Re-estimate after A0/A1, especially where reports need backend projections. Do not postpone selection safety for a large visual redesign. Independent report diagnosis can proceed while queue adapters are being validated; no untested shared change is released merely to accelerate parallel work.

Each implementation batch gets a small reviewable diff, linked defects, before/after reproduction, tests and a phase report. Prefer a few routes per batch. Application integration is local/isolated first. Staging deployment is a separate explicit decision after candidate-image and recovery prerequisites, even though staging is already running.

## HR-A0 — Baseline and QA setup

**Work**

1. Preserve the audit and original browser failures. Record source commit, build IDs/image digests when available, dependencies, configuration keys and browser versions. Establish whether deployed source matches the intended candidate.
2. Build an isolated production-runtime harness with disposable PostgreSQL, loopback services, unique synthetic tenants/users and manifests for HR Admin, restricted HR user, manager, employee and foreign-tenant users. Disable outbound email/payment/provider operations and scheduled side effects in that environment.
3. Reproduce HA-F01–03 through normal navigation. Add deterministic fault controls and request correlation for the network failure; classify application, test fixture or environment causes with evidence. Do not infer the cause from a later successful health request.
4. Seed multiple pages and records with contrasting statuses; create locked attendance/leave snapshots through existing audited services. Seed report matches beyond the first page and service limits (Documents/Lifecycle >100; Attendance >500).
5. Capture untouched route screenshots and current test/lint/build baselines. Separate pre-existing failures from candidate regressions; do not weaken assertions or silently update snapshots.

**QA exit**: fixture ownership verified; baseline failure reproductions or explicit intermittent diagnostics retained; harness starts without production credentials/real data; all relevant synthetic cleanup paths exercised. Audit source inventory is already prepared, but this QA setup remains **PLANNED**.

Deliverable: `docs/ui/hrms-hr-admin-a0-baseline-certification.md`; evidence root `docs/qa/evidence/hr-admin-standardization/a0/`.

## HR-A1 — Attendance safety pilot

**Scope**: `/hr-admin/attendance-records`; HA-F01, HA-F02, HA-F03 and the associated unclassified transport event. No payroll formulas, raw-punch editing policy, attendance derivation policy, closed-period unlock or API authorization changes.

**Work**

- Separate draft controls from committed URL/result state. Apply/Enter commits validated filters and resets page to 1; pagination and page-size changes use committed filters.
- Rehydrate controls on Back/Forward/reload/deep links. Preserve unrelated unsaved edit forms; do not remount the entire workspace as a blanket fix.
- Clear/reconcile selection on committed scope changes; only visible eligible IDs can be submitted under the page-scoped contract. Clear stale detail selection. Preserve backend permission/lock validation.
- Use a real form for keyboard Apply, validate date ranges and retain explicit loading/error/retry states. Diagnose the network failure before any network/session fix.
- Introduce only the minimal reusable query/filter boundary required by the pilot; A2 validates generalization.

**Required QA**

| Area | Cases that must execute |
|---|---|
| State | Apply/Clear, Enter, Back/Forward, reload, deep link, pending draft + Next, pending draft + page-size, same-query resubmission |
| Pagination | Page boundaries, zero matches, invalid/out-of-range page, supported sizes, retained committed filters |
| Selection | Filter/page/sort changes, all/individual selection, removed/ineligible row, refresh during selection, duplicate submit and exact submitted IDs |
| Fault/race | Slow old read versus new query, interrupted navigation, non-OK response, retry, transport diagnostics without arbitrary sleeps |
| Security/history | Restricted user cannot mutate; foreign tenant/IDs rejected; historical-close snapshot and raw-punch invariants retained |
| UX | Desktop/tablet/mobile, keyboard/focus/names, no clipping or document overflow |

Run the production-built pilot suite on Chromium, Firefox and WebKit. Add an API/PostgreSQL selection proving permitted bulk behavior and negative lock/ownership cases without weakening existing guards. Rerun impacted ESS Attendance and neighboring HR queue navigation. All HA-F01–03 regressions must fail on the baseline and pass on the fix where deterministic reproduction is possible. The network condition remains separately open if its original cause cannot be established.

**Exit**: no known wrong-scope selection submission; URL/controls/results agree; draft pagination cannot change filters; exact test evidence and cleanup retained. An unexplained network error cannot be relabeled PASS.

Deliverable: `docs/ui/hrms-hr-admin-a1-attendance-certification.md`; evidence `.../a1/`.

## HR-A2 — Common filter behavior and queue rollout

**Scope**: remaining nine queue counterparts—Regularizations, Leave Requests, Documents, Lifecycle, Onboardings, Probation, Movements, Exits, Notifications—plus Leave Types/Policies and Employee Directory. Attendance remains the reference implementation. Source signatures are review signals; reproduce each route rather than applying ten speculative patches.

**Work**

- Reuse the pilot's filter-form/query-state utilities with module schemas and existing query-key adapters. Keep authorization and business actions outside presentation helpers.
- Remove inert Apply controls by implementing the standard draft/Apply contract; small immediate catalogs are permitted only with explicit, consistent semantics and URL persistence.
- Standardize Clear, active-filter indication, page-size, counts, empty/error/retry and detail selection without renaming backend states.
- Inspect Employee Directory's existing paginated API before changing its complete-array path; preserve readiness/manager filters and employee access behavior. Develop a missing predicate only as a reviewed API change.
- Make cross-page selection policy explicit; preserve each workflow's allowed transitions and audit effects.

**QA exit**: each queue executes the A1 state/pagination/selection matrix where applicable, plus its own filters and permitted workflow. Include at least one invalid filter, no-match, combined filter and cross-tenant negative per applicable endpoint. Catalog refresh/deep links must restore filters. Role-limited options must remain scoped. Cross-browser desktop/mobile screenshots and neighboring ESS Leave/cancellation, document and notification regressions are required for touched contracts.

Deliverable: `docs/ui/hrms-hr-admin-a2-filters-queues-certification.md`; evidence `.../a2/`.

## HR-A3 — Report correctness before visual polish

**Scope**: all 35 report archetypes and their report navigation/catalog hubs. Prioritize Attendance Register, Document Compliance, Lifecycle Queue/Aging and related capped-source reports; HA-F05 and HA-F06.

**Work**

- Trace each visible filter/sort/count/export through page → shared UI → BFF → backend query. Record supported, missing technical and policy-dependent contracts separately.
- Replace bounded-first-page reporting with authorized server-side report projections/pagination where supported. Do not fetch unlimited tenant datasets or raise global limits to mask a missing report contract.
- Unify committed query semantics for rows, full-scope counts, exports and manifests. Label intentional page-versus-export scope clearly.
- Make failed/aborted/stale reads visible and retryable; a failed filter must not silently present unfiltered data as current.
- Keep readiness/risk fields tied to approved domain definitions; do not invent payroll eligibility heuristics for nicer report cards.

**Required QA**: qualifying matches beyond 100/500; combined predicates; all result pages; stable ordering/ties; count/screen/export/manifest parity; empty results; 400/401/403/500 and transport retry; out-of-order response handling; large-but-bounded synthetic datasets; role/tenant isolation. Verify export authorization and audit entries without enabling real provider activity. Exercise the same committed query after refresh and browser history. Backend/PostgreSQL checks are mandatory for modified query/projection contracts.

**Exit**: no report accepted with undisclosed partial data, inconsistent export scope or silent filter failure. Missing backend contracts are BLOCKED, not certified through UI placeholders. Validate all 35 reports individually; shared-template tests alone do not certify their domain predicates.

Deliverable: `docs/ui/hrms-hr-admin-a3-reports-certification.md`; evidence `.../a3/`.

## HR-A4 — Centralized Accerio shell, masters and forms

**Scope**: HR shell integration, master catalogs, 22 create + 22 edit route files, other details/reviews and shared presentation across already-remediated queues/reports. Route ownership is recorded separately from shared cross-cutting changes.

**Work**

- Integrate HR with existing semantic tokens and shell components. Preserve navigation, commercial entitlement handling and permission checks. Remove duplicate headers/summary banners; retain genuinely useful context.
- Reuse shared compact headers, filter forms, tables, badges, dialogs, loading/error/empty states and form footers. No additional component library or page-specific color systems.
- Move secondary imports/tools into accessible task-oriented disclosures/navigation where appropriate. Preserve all actual workflows and discoverability.
- Standardize validation, submit/pending/success/failure feedback, field masking, long-form layout and unsaved-change behavior. Sensitive employee access/bank/document details retain backend restrictions.

**QA exit**: every affected form has valid/invalid submit, failure retention, actual success refresh, duplicate prevention, permission denial and audit coverage. Visual checks at 1440/1024/768/390/320 CSS pixels; accessible control names, keyboard, focus trap/restoration and reduced motion. Capture before/after desktop/tablet/mobile screenshots and inspect them. Execute available native 200%/400% zoom and actual screen reader reviews; unexecuted combinations remain explicitly open. Automated scans do not establish WCAG conformance. Rerun impacted ESS/MSS shell, dialogs and table behavior because shared components changed.

Deliverable: `docs/ui/hrms-hr-admin-a4-design-forms-certification.md`; evidence `.../a4/`.

## HR-A5 — Payroll and remaining operational workspaces

**Scope**: Payroll Setup/Rules/Inputs/Review/Outputs/Handoff/Adjustments/Settlements, statutory/provider consoles, attendance/leave-year close controls, dashboards and remaining operational/configuration hubs assigned to A5.

**Work**: apply the same hierarchy, supported filters/tables/forms and explicit feedback. Preserve effective dates, maker/checker separation, readiness gates, locked snapshots, provider availability, audit and finance semantics. Use existing disabled/restricted states; do not add new business capabilities for visual uniformity.

**QA exit**: synthetic-only end-to-end paths, closed-period rejection, employee/manager/limited-HR denial, cross-tenant IDs, idempotency/retry, audit assertions and relevant PostgreSQL integrity tests. Compare authoritative calculation results before/after; presentation changes must not alter them. Exercise unavailable provider behavior without calling real rails. No irreversible close, payment, erasure or statutory transmission on shared staging. Existing payroll/ledger/attendance historical protections must pass their impacted regressions.

Deliverable: `docs/ui/hrms-hr-admin-a5-operations-certification.md`; evidence `.../a5/`.

## HR-A6 — Final integrated acceptance

1. Close every applicable check for all 146 route patterns. Dynamic organization sections and records require representative supported variants; do not count one pattern as all data/role combinations.
2. Run the frozen impacted HR Admin suites and the new defect regressions against production-built candidate images across Chromium, Firefox and WebKit. Include desktop/tablet/mobile projects; list actual browser/device/OS versions and exact viewports.
3. Execute relevant API/PostgreSQL suites and tenant/RBAC/history/integrity checks. Run TypeScript, ESLint, Django checks, migration drift and frontend/backend production builds. Review dependency-version warnings; baseline mismatches must be documented, not solved by unrelated upgrades.
4. Rerun impacted ESS/MSS functional suites. Any shared shell/filter/dialog change expands the regression boundary accordingly.
5. Review real final screenshots, keyboard/focus, contrast, reduced motion, zoom/reflow and available actual assistive-technology output. Keep formal WCAG and unexecuted AT coverage separate.
6. Verify fixture tenants/users/files, owned servers/ports/container volumes removed and baseline protected hashes preserved. Retain all failures/traces; never overwrite an initial failure with a passing rerun.
7. Produce candidate source/image provenance, rollback instructions and a separate staging GO/NO-GO. Deployment requires explicit authorization and current recovery/operational evidence. After an authorized deployment, use a dedicated bounded synthetic smoke harness; do not retarget local destructive fixtures at staging.

Deliverable: `docs/ui/hrms-hr-admin-final-certification.md`; evidence `.../a6/`.

## Common QA execution and evidence contract

Before changing a phase, define named scenarios and a reproducible environment. Use existing backend/Playwright fixtures where safe, add module-specific data only where needed, and isolate contexts/tenants across workers. Application deadlocks and fixture collisions must be distinguished through SQL/request evidence; globally serializing unrelated application work is not a fix.

Test commands must use the phase's actual config/selection and production runtime. Existing scripts provide entry points, not proof of adequate coverage:

```bash
pnpm --dir web typecheck
pnpm --dir web lint
pnpm --dir web build
# Run against external, disposable local QA configuration only:
.venv/bin/python backend/manage.py check
.venv/bin/python backend/manage.py makemigrations --check --dry-run
# Pick and record the actual phase-specific test nodes/config:
# pnpm --dir web exec playwright test --config <phase-config> <phase-spec>
# .venv/bin/python -m pytest -c backend/pytest.ini <impacted-test-nodes>
```

Do not run generic commands with an environment pointing to staging. `web/playwright.config.ts` can start demo/development infrastructure; the HR certification config must explicitly target a production-built isolated runtime, with retries 0 for final accounting and unique fixture ownership. A retry may diagnose intermittency, but preserve its first failure and report all attempts.

For each phase retain:

- source commit/diff, candidate build/image identity, runtime configuration **keys only**, browser/DB versions and test selection;
- defect IDs, root causes, changes, before/after reproduction and request/DB diagnostics with secrets/personal data redacted;
- machine-readable browser and backend reports, traces, desktop/tablet/mobile screenshots and visual review notes;
- passed/failed/skipped/blocked/unexecuted totals, distinguishing unique cases, repetitions and diagnostic attempts; deselected tests are not passes;
- accessibility execution matrix and unverified items;
- database/file/fixture/process cleanup verification and rollback limitations;
- phase decision with remaining restrictions and links back to the 146-route tracker.

### Phase acceptance rules

**PASS**: applicable scoped functionality/security/integrity checks executed and passed; no unresolved P0/P1 in the slice; required evidence and cleanup complete. **CONDITIONAL**: only explicit nonblocking limitations remain, with owner, impact and follow-up; this cannot waive wrong-scope actions, unauthorized access, incomplete financial/report results or historical-integrity failures. **FAIL**: an executed required scenario fails. **BLOCKED**: execution cannot proceed because an API, fixture, environment, policy or permission dependency is missing. Preserve mixed per-check outcomes even when the overall phase is BLOCKED/FAIL.

No phase advances to shared rollout while its prerequisite safety contract is failing. Formal accessibility and real-payroll production gates remain independent; a local UI PASS is not a production release certificate.

## Work tracking and first implementation batch

The [phase allocation](../qa/evidence/hr-admin-page-audit/phase-allocation.csv) assigns every route exactly one primary delivery owner. Shared shell and regression work intentionally cross phase boundaries. The [coverage tracker](hrms-hr-admin-coverage-tracker.md) remains the acceptance source; no route is automatically completed by allocation.

**Start with A0, then A1**: preserve/automate the three Attendance reproductions, establish safe fixture ownership and network diagnostics, implement committed-versus-draft state and selection safety, and certify the production-built pilot before extending it. A1 may proceed without a new feature or global visual rollout. The planning work itself changes no application behavior and does not certify a fix.

## Execution checkpoint — 2026-10-20

User-approved sequence starts with the shared global shell, then shared page patterns and Employees. This does not close the urgent attendance safety work in HR-A1. See [shell certification](hrms-hr-admin-global-shell-certification.md) and [Employees pilot](hrms-hr-admin-employees-standardization-certification.md); all broader phase exits still require their listed evidence.


### A1 execution — 2026-10-20

Attendance Records safety/presentation pilot completed with 42 full cross-browser passes and 22 final PostgreSQL regressions. See [scoped A1 certification](hrms-hr-admin-a1-attendance-certification.md). HA-F01–03 are locally verified; the historical transport incident, formal accessibility and remaining phase exits stay open. No automatic expansion to the next module or staging deployment.


### Full attendance family — 2026-10-20

User-authorized expansion covers all 30 attendance-family routes across primary phase owners A1–A5. [Attendance-family certification](hrms-hr-admin-attendance-family-certification.md) records 186 browser + 12 utility passes, 36 backend passes and 27 separate neighboring passes. Shared presentation and observed filter/history/report-completeness defects are locally implemented and verified. This batch is CONDITIONAL, not an automatic exit for the wider A2–A6 phases; remaining 146-route, workflow-scale and formal accessibility gates still apply. No staging deployment or frozen gate advancement.

## Leave Applications reference slice — 2026-10-20

First Leave Management page implemented under A2/A4, with a scoped shared modal action-flow correction and additive option-code serialization repair. [Certification](hrms-hr-admin-leave-applications-certification.md) records 27 browser passes, 6 focused repeats, 73 broad backend passes and a corrected pure serializer assertion. Local tested functionality PASS; overall CONDITIONAL. Historical failures remain visible. This does not close A2/A4 or the entire Leave family. Next sequence: balances/ledger → types/policies/assignments → leave-year operations/balance reporting, each with its own QA checkpoint. No staging deployment or release-gate changes.

## Leave Balances and Ledger checkpoint — 2026-10-20

Second Leave slice completed locally using centralized Accerio patterns. Fresh results: 24 browser and 57 backend/API/PostgreSQL passes, TypeScript/ESLint/Django/build passed; screenshots reviewed and isolated cleanup verified. [Certification](hrms-hr-admin-leave-balances-certification.md): tested functionality PASS, overall CONDITIONAL. No deployment or frozen-gate advancement. Remaining sequence: Types/Policies/Assignments and forms, then Leave Year operations and balance reporting, each with its own scoped QA. No automatic next-slice implementation.

## Leave setup and governance checkpoint — 2026-10-20

Types, Policies and Assignments catalogs/forms completed as the next scoped A2/A4 slice. [Certification](hrms-hr-admin-leave-setup-certification.md): 51 main, 27 neighboring and 4 supplementary browser executions passed; 70 focused backend/API/PostgreSQL passed. Shared Accerio patterns, real mutations and restrictions, hydration-safe inputs, deterministic timestamps, expanded import accessibility and strict cleanup are evidenced. Local tested functionality/visual PASS; overall CONDITIONAL for the reported unexecuted assessments and unrelated broader payroll-fixture failure. No deployment or frozen-gate advancement. Remaining sequence: Leave Year operations and balance reporting, each with separate QA; not automatically begun.
