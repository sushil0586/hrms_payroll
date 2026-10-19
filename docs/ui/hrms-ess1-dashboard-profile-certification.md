# ESS-1 dashboard and My Profile certification

Date: 2026-10-18 (Asia/Kolkata). **Decision: CONDITIONAL for release; PASS for the executed local ESS-1 scope.** ESS-2 through ESS-6 remain outside this slice. Existing production release restrictions are unchanged.

## Delivered behavior

The dashboard uses a compact identity header, current attendance, policy-year leave balances, requests **awaiting approval**, and contextual employee services. Pending requests are no longer presented as employee tasks; document/payslip links no longer claim a static Ready state. The dashboard reads the existing `/me/dashboard/` contract without fetching unrelated request histories.

A dedicated `/ess/profile` route provides Overview, Personal details, Contact information, Employment & organization, Payroll & documents, and Access & updates. Sections use URL state, desktop navigation and a labelled native mobile selector. The payroll section uses the existing own-published-payslip endpoint, renders period/pay-date links and retains canonical secure document views. Salary amounts are omitted from the profile summary. There is no claim that publication proves payment.

All employee-master fields remain HR-controlled/read-only under the existing GET-only contract. Direct editing and profile change requests/history are explicitly unavailable. No profile PATCH, approval rule or business policy was invented. DOB, address, emergency contact, qualification and skill details remain unavailable under this self-profile contract. There is no new bank/statutory profile projection or reveal action; identifiers are withheld as profile fields rather than fetched through privileged HR APIs or masked only with CSS. Existing authorized payroll documents retain their own content and access rules.

ESS navigation uses the code-backed menu catalog plus existing database overrides/fallback. My Profile is available through both navigation sources. The HR workspace shortcut now uses session workspace access instead of a role-name prefix. ESS-owned styles compact the top bar and remove the static sidebar promotion. Search accurately describes service navigation. Shared shell behavior and other workspace designs are preserved.

Dashboard leave/regularization launch anchors now open the existing module dialogs and consume the intent so a dismissed form does not reopen on reload. These are connection fixes for ESS-1 actions, not an ESS-2/3 calendar, policy or workflow redesign. Existing submit/validation/ledger logic is unchanged.

Self-profile and dashboard reads have a 15-second bound; the profile's published-payslip read uses the same bound. Error feedback is employee-facing, hides technical configuration details and supports retry/reauthentication. Existing shared loading feedback is retained. Date-only values are formatted in UTC to avoid timezone-dependent day shifts; dashboard timestamps are explicitly labelled UTC. The attendance service still determines the date and totals. A tenant-effective timezone contract remains an ESS-2 concern; no frontend timezone guess or attendance calculation was added.

## Sources and changed surface

- [Dashboard](../../web/src/app/ess/page.tsx), [profile](../../web/src/app/ess/profile/page.tsx), [mobile/desktop section navigation](../../web/src/app/ess/profile/profile-section-nav.tsx), [identity/field presentation](../../web/src/app/ess/ess-profile-summary.tsx).
- [ESS layout](../../web/src/app/ess/layout.tsx), [ESS styles](../../web/src/app/ess/ess-experience.css), [error/retry](../../web/src/app/ess/error.tsx), [API reads](../../web/src/lib/api.ts), [menu definitions](../../backend/apps/iam/menu_catalog.py).
- Existing [leave](../../web/src/app/ess/leave/leave-workspace.tsx) and [attendance](../../web/src/app/ess/attendance/attendance-workspace.tsx) dialog launch integration only.
- [Single ESS coverage tracker](hrms-ess-coverage-tracker.md); UX-0 field matrix and architecture remain in the authoritative specifications.
- [Application source hashes](../qa/evidence/ess1-dashboard-profile/source-hashes.json) identify the working-tree application surface tested on base commit `64cf9f38b0a625781d6bc7dc0dd41f400815f9f0`.

Existing tests with obsolete dashboard headings were updated to assert the new waiting/service semantics. The pilot manager assertion now checks the dedicated profile employment section. Workflow/security assertions were retained; no snapshots were automatically accepted. The ESS user guide was updated to match the new labels and read-only profile limits.

## Isolated execution environment

PostgreSQL 16 in the disposable `hrms-ess1-postgres` container, bound to loopback port 55439 with database `hrms_ess1`; Django staging settings run locally at port 8038; a production-built Next.js server at port 3139 uses demo mode disabled and no bearer-token fallback. A test-only loopback proxy at port 8039 forwards actual Django responses and injects explicit 503/delayed reads. It is implemented in the browser suite, not application runtime.

The [dedicated Playwright config](../../web/playwright.ess1.config.ts) targets only loopback and does not launch a development/demo server. The suite refuses provisioning unless the dedicated local PostgreSQL host/database are selected. Each browser provisions an ownership-marked synthetic workspace through the existing fixture command and uses its guarded cleanup in `afterAll`. No shared employee, payroll, Lightsail resource or production data was used.

## Executed results

| Check | Executed outcome | Evidence |
|---|---:|---|
| Self-profile API/PostgreSQL contract/security | 7 passed | [Backend tests](../qa/evidence/ess1-dashboard-profile/backend-tests.txt) |
| Existing permission snapshot, tenant-scoped directory and manager summary | 3 passed | [Neighbor API regression](../qa/evidence/ess1-dashboard-profile/neighbor-api-tests.txt) |
| Existing published-payslip access, unpublished exclusion and multi-year history | 3 passed | [Payroll read regression](../qa/evidence/ess1-dashboard-profile/payroll-read-regression.txt) |
| Existing PostgreSQL monthly close, late-write denial and governed reopen history | 1 passed | [Attendance close regression](../qa/evidence/ess1-dashboard-profile/attendance-close-regression.txt) |
| Production-built Chromium | 8 passed | [Chromium execution and initial binary gaps](../qa/evidence/ess1-dashboard-profile/browser-attempt3.txt) |
| Production-built Firefox and WebKit | 8 + 8 passed | [Final browser execution](../qa/evidence/ess1-dashboard-profile/browser-final.txt), [machine-readable results](../qa/evidence/ess1-dashboard-profile/browser-results.json) |
| TypeScript | Passed | [Final typecheck](../qa/evidence/ess1-dashboard-profile/typecheck-final.txt) |
| Focused ESLint, including changed existing tests | Passed | [ESLint](../qa/evidence/ess1-dashboard-profile/eslint.txt) |
| Django system check | Passed, 0 issues | [Django check](../qa/evidence/ess1-dashboard-profile/django-check.txt) |
| Next.js production build | Passed, 283 generated page entries | [Final build](../qa/evidence/ess1-dashboard-profile/build-final.txt) |
| Source identity | All 11 application-file hashes matched final build inputs | [Hashes](../qa/evidence/ess1-dashboard-profile/source-hashes.json) |
| Fixture teardown | 0 synthetic tenants; 0 fixture users; services/container removed | [Cleanup](../qa/evidence/ess1-dashboard-profile/cleanup.txt) |

**Accepted totals: 24 browser passes and 14 PostgreSQL/API passes.** The [certification summary](../qa/evidence/ess1-dashboard-profile/certification-summary.json) combines Chromium's passing tests from the first multi-engine run with the subsequent passing Firefox/WebKit run against the same production server/build. Tests use zero automatic retries. Browser-install failures are retained, not counted as passes.

The eight scenarios per browser cover truthful counts/links and desktop screenshots; section navigation and live API-to-field parity; desktop keyboard navigation, skip-link focus and native mobile section selection; 503 failure/retry on both pages; delayed accessible loading; a 17-second injected delay producing the 15-second self-read timeout and successful retry; real leave/regularization dialogs with consumed intent and reload behavior; and logout/identity switching plus HR/MSS/Platform route rejection. A manager's own zero-request dashboard supplies a real empty waiting state.

API tests prove anonymous denial, exact allowlisted self projection, inability to retarget with same-tenant or cross-tenant IDs, 405 for unsupported writes, unchanged employee/bank values, missing/suspended/revoked employee context, and dashboard/profile parity. HR/platform reads are denied; an employee manager queue may return an authorized empty scoped list, which is explicitly checked for zero records. No blanket claim that every manager endpoint returns 403 is made.

Viewport execution includes 1440×1000 desktop, default desktop contexts, 768×844 tablet, 390×844 phone and 320px reflow. Reduced motion, native select labels, table semantics, visible focus, one h1 and skip navigation were checked. The 200% root-font smoke is not a substitute for independent native browser zoom or real screen-reader certification. This report does not assert full WCAG conformance.

The browser fixture exercises the empty published-payslip summary and navigation to the canonical payslip page. Positive published artifact/download, unpublished hiding and year isolation are executed at API/PostgreSQL level. Comprehensive browser payroll preview/download, uploads, declarations and every ESS child-route state remain ESS-4/6 work; they are not silently promoted by this slice.

## Final screenshots

- Dashboard: [desktop](../qa/evidence/ess1-dashboard-profile/chromium-dashboard-desktop.png), [mobile](../qa/evidence/ess1-dashboard-profile/chromium-dashboard-mobile.png).
- My Profile: [desktop](../qa/evidence/ess1-dashboard-profile/chromium-profile-desktop.png), [mobile](../qa/evidence/ess1-dashboard-profile/chromium-profile-mobile.png).
- Equivalent Firefox and WebKit desktop/mobile exports are retained with their browser prefixes in the same evidence directory. The user guide uses a new `overview-ess1.png`; the previous screenshot remains intact.

## Execution issues reconciled

The first browser attempt stopped on an alert locator that also matched Next.js's route announcer; the second stopped on an incorrect exact Close name although the real leave dialog opened. Locators now target the main-region alert and the actual named dialog close controls. Original logs and error contexts remain under the evidence directory. An initial build was invalidated by overlapping/interrupted build output; it was rerun alone and the final clean build passed. These attempts are not counted as successful checks.

Firefox/WebKit initially could not launch because the installed Playwright expected uncached binary versions. Matching binaries were installed using Playwright's installer; [download evidence](../qa/evidence/ess1-dashboard-profile/browser-install.txt) is retained. Both complete suites then passed. The existing globals.css autoprefixer `end` warning and Python asyncio deprecation warnings remain non-failing, recorded warnings.

No outstanding functional failure was observed in the executed ESS-1 scope. The release decision remains CONDITIONAL because local UI/API verification does not close the frozen infrastructure, policy, financial or legal gates, and formal assistive-technology/native zoom review is not newly certified. No migration, deployment or expanded field-write policy is approved by this report.

## Retained boundaries

This slice does not change statutory rates/calculations, payroll generation, employee-effective history, attendance close rules, leave ledgers, RBAC policy, tenant isolation, support access or release gates. No model changes or new migrations were authored; existing reviewed migrations were applied only to the disposable local database.

The [final release assessment](../qa/hrms-final-release-readiness-assessment.md) remains authoritative. ESS-1 UI verification cannot promote conditional synthetic-staging scope into real-payroll or unrestricted production approval. New profile field disclosure/editing, holidays, completeness, announcements and broad employee settings require their own approved contracts. The unavailable prototype was not reconstructed or claimed as an exact visual match; the implementation follows the UX-0 specification and established compact interface standard.
