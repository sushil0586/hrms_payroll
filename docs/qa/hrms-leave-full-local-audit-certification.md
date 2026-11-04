# HRMS Leave Full Local Audit Certification

Date: 2026-11-03

Verdict: **CONDITIONAL - CORE SCOPE PASSES; LEGACY CONNECTED CONTRACTS REMAIN OPEN**

This audit qualifies the connected HR Admin, ESS, and MSS leave lifecycle against a fresh PostgreSQL 16 database and a production-built Next.js application. It does not claim that all 209 executable catalogue scenarios have independent evidence yet.

## Scope

- HR Admin leave types, policies, assignments, balances, requests, imports, leave-year controls, and leave reports.
- ESS entitlements, apply-leave validation, evidence upload, history, filtering, details, withdrawal, and cancellation surfaces.
- MSS pending approvals, decisions, history, delegation and authorization boundaries.
- Responsive behavior, keyboard/modal behavior, loading, sorting, pagination, durable feedback, audit and tenant isolation contracts represented by the selected suites.
- Frozen catalogue: 209 scenarios, all executable under the approved conservative policy baseline.

## Confirmed repairs

1. ESS Apply Leave now distinguishes incomplete input from an invalid completed date range. Blank required fields can be submitted once to reveal the complete validation set; a completed reverse date range is blocked immediately.
2. A leave type requiring evidence keeps Submit disabled until a file or evidence reference is present.
3. Successful leave submission now uses the shared confirmed-mutation receipt: one fixed in-page success message and one five-second toast. The modal no longer emits duplicate success feedback.
4. HR leave-request inspection now has one accessible modal title. The internal section is named `Request context`, removing duplicate `Leave request detail` headings.
5. Browser tests now obtain the created request ID from the authoritative POST response instead of an obsolete query parameter.
6. Queue certification closes the inspection modal before exercising page-level filters, matching real modal interaction semantics.
7. Historical leave application, setup, and balance suites now call guarded repository-owned fixture helpers instead of removed evidence-directory scripts.
8. Delegated approval retry assertions now verify the ambiguity-safe denial and the current durable success receipt.
9. Collision report CSV and manifest verification now use the authenticated browser session.
10. Mobile leave review uses the current ellipsis-button contract and completes keyboard, focus-restoration, and overflow checks without the prior timeout.
11. Leave-type dropdown-only filters submit the form's current values, preventing a previously applied status from being recommitted.

## Verification results

### Django and PostgreSQL

- Fresh PostgreSQL 16 migration: PASS.
- Focused leave suite: **140 passed**, 0 failed.
- Django system check: PASS.
- Migration drift: none.

The suite covered core leave services, assignment visibility, request and ledger transitions, year-end integrity and operations, history, auto-approval, reports, workspace APIs, validation and governed cleanup.

### Frontend quality gates

- TypeScript: PASS.
- ESLint: PASS.
- Production Next.js build: PASS, 313 static pages generated.
- Existing non-blocking CSS warning remains at `globals.css:4687`: Autoprefixer recommends `flex-end` instead of `end`.

### Production-browser qualification

The original stable connected groups produced **32 passing tests** and **2 declared skips**. The six follow-up evidence/test-harness gaps were subsequently repaired and bounded reruns passed.

Confirmed passing coverage includes:

- HR Admin setup -> assignment -> ESS submission -> MSS approval -> balance reconciliation -> responsive UI.
- Mandatory evidence upload and employee/manager visibility.
- Leave type, policy and assignment inspect/close/edit/save/cancel/removal controls.
- Explicit filter submission, sorting, ESS Enter-to-filter, scoped loaders and empty-pagination behavior.
- Complete blank-field validation, immediate invalid-date protection, blocked upload types and mobile usability.
- HR request inspection, override validation, API denial, policy resolution and balance imports.
- Time/leave setup navigation, dynamic edit links and desktop/tablet/mobile polish.
- Leave balance report access, filtering, pagination, export and employee denial.
- Delegated-approval role revocation denial.
- Canonical leave-year and leave-balance report campaign: **11/11 passed**.
- Collision report authenticated export and denial campaign: **2/2 passed**.
- Mobile leave-review keyboard and responsive case: **1/1 passed** in 7.8 seconds.
- Delegated interruption safe-retry and role-revocation cases: **2/2 passed**.
- Repository-owned application/setup/balance fixture probes: PASS, including dropdown-only filters and last-page maker-checker canonicalization.

## Closed follow-up gaps

1. The obsolete global `FY-2026`/environment-ID leave-year contract is superseded by the guarded `prepare_final` fixture. Its canonical browser campaign passed 11/11.
2. The delegated interruption case now asserts the ambiguity-safe retry warning and durable standardized success receipt.
3. Collision-report CSV and manifest evidence is fetched with the browser's authenticated cookie session; positive and employee-denial cases passed 2/2.
4. Historical broad suites now call `prepare_applications`, `prepare_setup`, and `prepare_balances` from `backend/tests/fixtures/leave_deep.py`.
5. The mobile timeout was caused by a stale link locator after Inspect became an accessible ellipsis button; the corrected case passed in 7.8 seconds.
6. Dropdown-only leave-type filtering exposed and closed a stale-submit defect; the focused regression now passes.

## Conservative policy closure

The repository owner approved the fail-closed dispositions on 2026-11-04:

- Unsupported daily proration remains unavailable.
- Evidence remains private and employee destructive deletion is denied.
- Partial-unit approval remains unavailable; multi-level intermediate status is preserved.
- Pending steps remain with their recorded workflow owner.
- Started/past cancellation is denied unless explicitly configured.
- Expired entitlement is not recreated automatically.
- Mixed-validity leave-request imports are atomic.
- Leave encashment does not automatically post into FnF/payroll.

### Closure verification - 2026-11-04

- Repaired leave-request bulk import to prevalidate all rows and roll back the complete transaction when any runtime business validation fails.
- Added request serializer date-order and single-day portion validation so invalid rows fail with field diagnostics before schedule calculation instead of producing a server error.
- Updated the browser import workbench to report atomic rollback truthfully, preserve row diagnostics, avoid partial-success wording, and record rollback support in the governed import audit.
- Focused PostgreSQL policy checks: **4 passed**, covering atomic import rollback, post-expiry restoration denial, employee document deletion denial, and multi-level approval intermediate-state preservation.
- Connected leave workflow/history/document/year-integrity regression: **86 passed**, 0 failed.
- Post-repair leave workflow/import rerun: **67 passed**, 0 failed, including reversed-date rejection and atomic rollback.
- TypeScript: PASS.
- Targeted ESLint: PASS.
- Django system check: PASS.
- Migration drift: none.
- Production Next.js build: PASS, 313 static pages generated. The pre-existing `globals.css:4687` Autoprefixer warning remains non-blocking.
- Frozen catalogue reconciliation: **209 unique IDs**.

## Cleanup

- Four interrupted `pw-qa-*` tenants were ownership-verified with dry-run cleanup and removed.
- Final run-owned tenant count: zero.
- The disposable PostgreSQL and application processes are local audit infrastructure only.
- No staging or production mutation, email, payroll operation, commit, push or deployment occurred.

## Exit decision

Core leave pages and the principal HR Admin -> ESS -> MSS -> HR Admin lifecycle are locally operational for the executed scope. The six follow-up gaps are closed. The eight former policy gaps now have approved conservative acceptance criteria, but approval does not substitute for per-ID execution evidence; unexecuted catalogue IDs retain their prior status.

## Final connected reconciliation - 2026-11-04

- Current HR leave-request campaign: **8/8 passed** after replacing obsolete link/deep-query assumptions with the actual Inspect -> Review panel flow and canonical default page-size URL.
- Delegated approval interruption and role-revocation campaign: **2/2 passed**.
- Atomic import browser proof: **1/1 passed**; both ready rows were shown as failed after a simulated rolled-back batch, with no false created receipt.
- Mobile leave review: **1/1 passed**.
- Leave report, year-close, authorization, responsive and integrity campaign: **11/11 passed** within `leave-correctness-regression`.
- The initial combined neighboring run completed **16 passed / 17 failed**. The failures were retained as open qualification work rather than application PASS evidence.
- Balance-refresh reconciliation subsequently closed all three refresh gaps: **4/4 passed** on a fresh PostgreSQL database and production build. The repaired contracts verify committed ledger refresh without RSC delivery, read-only retry after a failed refresh, aborting a superseded read without stale replacement, and last-page canonicalization.
- The fourteen previously open `leave-setup-admin` contracts were reconciled against the supported interface and authenticated backend boundary. The complete setup package now passes **17/17** on fresh PostgreSQL and the production frontend build. Reconciliation covered accessible Inspect buttons, modal detail lifecycle and focus restoration, authenticated independent API proof, supported page sizes, renamed governance disclosure, standalone create/edit routes, archive/deactivate preservation, responsive layouts, keyboard containment, and zero axe violations.
- No cross-tenant disclosure, unauthorized mutation, audit corruption, or leave-balance corruption was observed in the current focused suites.
- Final task-owned `pw-qa-*` tenant count: **0**.

The former legacy setup-contract blocker is closed. This report still limits its conclusion to the frozen and focused local campaigns actually executed; shared staging and any catalogue cases without recorded per-ID evidence remain outside this local verdict.

## Connected campaign extension - 2026-11-04

The final connected run reused one task-owned PostgreSQL 16 database, one Django process, and one production-built Next.js process. It deliberately retained failing diagnostics instead of converting obsolete contracts into passing assertions.

### Current canonical evidence

- Focused Django/PostgreSQL leave modules: **107 passed**, 0 failed. The three warnings are upstream Python/Django asyncio deprecations and do not indicate leave behavior failures.
- HR Admin actions, requests, balances, and setup group: **53/53 passed** after correcting three test-only independent API probes to authenticate against the canonical `/api/v1` backend boundary.
- Leave balance package: **8/8 passed**. This includes filter submission, independent pagination, keyboard/detail lifecycle, authoritative refresh, maker-checker rejection/approval, rejected-operation non-mutation, cross-tenant denial, responsive containment, and zero scoped axe violations.
- Leave setup package: **17/17 passed**.
- Leave balance refresh package: **4/4 passed**.
- Canonical correctness regression: **11/11 passed**.
- No application source change was required by the balance reconciliation; the correction is confined to browser evidence helpers that had called unauthenticated Next.js proxy routes from Playwright's API context.

### Retained qualification gaps

- `leave-blocker-closure`, `leave-closure-stream`, `leave-final-admin`, and parts of `leave-four-workspaces` depend on removed historical `docs/qa/evidence/**` seed scripts or fixed legacy ports. Their current failures are classified as **historical harness non-reproducibility**, not passing product evidence.
- `leave-completion` and `leave-feedback` contain stale selectors, labels, and proxy-auth assumptions relative to the current supported UI. Their failed assertions remain open test-contract reconciliation work; they were not silently skipped or promoted.
- `leave-policy-auto-approval` browser coverage depends on a removed worker fixture. PostgreSQL policy-auto-approval coverage passed, but browser/worker qualification remains open until a repository-owned task-worker fixture replaces the archived script.
- `leave-visual-phase2` requires an explicit evidence destination and a removed visual fixture. Existing current responsive and axe coverage passed, but that historical visual package is not independently reproducible.
- Because these gaps remain, this extension does **not** certify every one of the 188 enumerated browser tests. It certifies the current canonical packages listed above and preserves the remaining suites as explicit test-infrastructure debt.
