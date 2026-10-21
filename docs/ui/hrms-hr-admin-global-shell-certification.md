# Accerio HR Admin shared shell implementation

2026-10-20. Scope: sidebar, global header and minimal footer. No staging deployment. Base commit: `2dbfecf02fb1b5dc2d700ac0c2ad33b9d718b161`; these changes are an uncommitted local patch, not a deployed image.

## Central architecture

`web/src/styles/workspace-shell.css` owns semantic shell tokens and responsive presentation. It consumes existing Accerio colors, radii, typography, spacing and focus tokens. It is imported once by the root layout. There are no new dependencies, migrations or page-local style sheets.

The existing `WorkspaceChrome` accepts an opt-in `appearance="accerio"`. HR Admin enables it first. ESS/MSS continue using their established appearance; the same shared component is available for subsequent adoption. Presentation receives existing permission-filtered navigation, actual user labels and authorized shortcuts. It makes no authorization decisions. Shared SVG glyphs replace letter tiles; accessible link labels remain text.

- 224px ink-indigo desktop navigation, independently scrollable, with expandable existing groups.
- 64px desktop header, page/action navigation search, actual ESS/MSS shortcuts, identity and existing sign-out.
- Attendance, policies and other child routes identify their containing navigation destination.
- Slate workspace canvas, subtle header surface and compact shared spacing.
- Mobile/tablet navigation below 900px, scrollable destination list, 44px controls, close on selection and Escape with focus restoration.
- Minimal footer uses product/workspace/role labels. No fabricated service health, provider or deployment status.
- Reduced-motion and visible focus styling reuse semantic tokens.

Page headers, cards, tables, filters, dialogs and business workflows have not been redesigned in this slice. Existing attendance filter/history/selection defects from the page audit remain open. Review [the phased plan](hrms-hr-admin-phased-implementation-plan.md) before page-level implementation.

## Verification and evidence

Production Next build against a dedicated local PostgreSQL 16 synthetic database. Demo data mode disabled. Local HTTP uses the existing `HRMS_COOKIE_SECURE=false` configuration; staging cookie configuration was not changed. Browser tests have zero retries. See `web/playwright.shell.config.ts` and `web/tests/shell/global-shell.spec.ts`.

Evidence: [execution directory](../qa/evidence/hr-admin-global-shell/). Final results and decision are recorded below after cleanup. TypeScript, ESLint, Django system check and production-build logs are retained there.

Each browser checks three HR routes (Employees, Attendance records, Leave policies), desktop shell geometry, search feedback, 768/390/320px menu bounds, keyboard activation/Escape/restoration, real navigation, employee HR-page/API rejection, neighboring ESS/MSS shells, sign-out, axe shell checks and reduced-motion duration. These are scoped smoke tests, not 146-page functional certification or a full ESS re-certification.

## Defects and test setup corrections

1. Actual visual defect: legacy `HR` pseudo-element overlapped the new brand mark. The shared shell explicitly suppresses the old pseudo-elements. Final test asserts this.
2. Initial test used an exact mobile accessible name despite existing descriptive text. Select the known destination href instead; labels/descriptions were preserved.
3. Initial local production server used secure cookies over HTTP; WebKit rejected them. Corrected only the local runner's existing cookie flag; no application security changes.
4. Shortcut test ran before client interaction readiness. It now establishes the rendered search interaction before checking the keyboard shortcut.
5. Existing global reduced-motion CSS uses an effectively zero `0.00001s` duration. Check the meaningful <=1ms threshold rather than an incorrect exact-zero expectation.
6. Firefox same-route document navigation was still loading when the test requested another viewport navigation. A subsequent exact-navigation wait on an already-active destination was invalid. The final test selects a different destination and waits for its URL/load before the next viewport check, retaining keyboard and real-link verification. A separate local login timeout remains recorded in historical evidence; do not infer an application root cause from it.

Historical attempts are preserved: attempt1 was interrupted after one pass, with remaining cases incomplete; attempt2 reports 2 passed, 9 failed, 4 not run; attempt3 reports 13 passed, 2 failed. Attempt4 was interrupted after two active-page-navigation wait failures; its partial trace/log evidence remains preserved. Historical failures are not reclassified as passes.

## Screenshot index

Each engine (`chromium`, `firefox`, `webkit`) has `*-employees-desktop.png`, `*-attendance-records-desktop.png`, `*-leave-policies-desktop.png`, `*-768.png`, `*-390.png`, `*-320.png` in the evidence directory. The approved reference is [the prototype](prototypes/accerio-hr-admin/index.html). This is a reference-versus-render review, not a pixel-identical baseline comparison. The first legacy branding issue was found by inspecting rendered output, not only assertions.

Shell rendering was visually inspected at desktop and mobile widths. Small-screen employee tables retain their existing internal horizontal scroll; page-level responsive redesign remains separate.

## Accessibility limits

Executed: menu keyboard activation, Escape/focus restoration, search shortcut/Enter, readable accessible names via role queries, axe-core WCAG A/AA-tagged automated rules limited to sidebar/header/footer, reduced-motion styles. Automated contrast checks cover the shell under those rules, not all page states.

Unexecuted: actual screen-reader review, native browser zoom, formal WCAG assessment, exhaustive tab-order review, dialog focus trapping (dialogs unchanged), complete HR Admin accessibility regression. Responsive viewport checks are not native zoom certification.

No payroll/statutory/leave/attendance calculations, API contracts, permission rules, historical records or release-gate statuses changed. No backend regression suite is claimed: authorization is checked through actual browser/API smoke requests; backend changes were unnecessary.

## Final full-suite result

**15 passed, 0 failed, 0 skipped, 0 flaky** across Chromium, Firefox and WebKit (five scenarios each), zero retries. [Machine-readable results](../qa/evidence/hr-admin-global-shell/results.json) and [execution log](../qa/evidence/hr-admin-global-shell/browser-final.txt). TypeScript, ESLint, Django system check and production build passed. Supplementary loaded-content mobile screenshots are recorded separately in `responsive-final.txt`; not counted as part of the 15 full-suite scenarios.

**Local shared-shell decision: PASS for this scoped implementation.** Whole-HR-Admin product acceptance remains OPEN pending page-by-page functional and visual QA. No Lightsail deployment performed or certified. Existing frozen release gates remain unchanged.

Supplementary final responsive execution: **3 passed, 0 failed** (one per engine), including completed Attendance operations content at tablet/mobile widths. Combined newly successful executions: **18**; the full-suite and supplementary counts remain separate. All three engines' final shell axe scans reported zero violations within the tested shell regions.

Cleanup: final browser fixtures use the existing verified-absence teardown. Three interrupted-attempt fixture tenants were additionally removed using the guarded synthetic-tenant cleanup command. Dedicated database tenant count verified **0** before removal. Owned PostgreSQL container/anonymous volumes, local servers, secure runtime environment file and matching interrupted-fixture temporary manifests were removed. See `database-cleanup.json`, `cleanup-*.json`, and `infrastructure-cleanup.json`. Generated Next type/config edits were restored to their pre-task versions. No customer data or staging resources were used.
