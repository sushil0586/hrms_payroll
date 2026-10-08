# Payroll SaaS Hardening Phase Plan

Date: 2026-10-08  
Owner: Payroll, HR Admin, ESS, QA  
Primary goal: make payroll output, payslip PDF, tax sheet, publication, access, and audit behavior SaaS-ready with browser-based Playwright certification at the end of every phase.

## Current Implementation Baseline

The payroll foundation already supports immutable payroll input snapshots, safe rule evaluation, draft calculation, review, approval, final lock, output batches, artifact storage, HR publishing, ESS payslip access, read receipts, storage metadata, signed-access governance, and download audit evidence.

The key SaaS-readiness gap is output fidelity. Payslip artifacts currently default to generated HTML content, and the employee-facing payslip detail focuses on totals, calculation lines, source hash, access trail, and storage governance. A launch-grade SaaS payroll module needs a true PDF payslip, a tax sheet, statutory/TDS reconciliation, tenant branding, deterministic rendering, and browser-certified usability on ESS and HR Admin.

## Non-Negotiable Acceptance Bar

Every phase must finish with:

- Backend tests for core correctness and permission boundaries.
- Playwright browser tests for HR Admin and/or ESS user journeys.
- Mobile, tablet, and desktop UI/UX checks for changed screens.
- Success, failure, disabled, empty, and unauthorized states where relevant.
- Documentation updates for HR Admin and ESS users.
- Stage-compatible test commands and evidence notes.

No payroll change is considered complete if it only passes API checks while the browser flow is confusing, visually broken, or lacks clear feedback.

## Payroll Output Principles

- Payroll output is generated only from a final-locked review.
- Published output artifacts are immutable.
- Employee payslips must be employee-scoped and tenant-scoped.
- HR payroll artifacts must require explicit payroll permissions.
- PDF content must reconcile to calculation lines and payroll register totals.
- Tax sheet values must be explainable from statutory profile, declarations, and payroll calculation lines.
- Template behavior must be configurable by tenant/profile, not hardcoded for one customer.
- Every download/read/publish/signed-access action must leave audit evidence.

## Phase P0: Baseline Audit And Risk Map

Goal: freeze the current payroll baseline before output upgrades.

Scope:

- Payroll calculation lifecycle.
- Payroll output artifact generation.
- ESS payslip download/read flow.
- HR payroll output publish/download flow.
- Current report coverage.
- Current docs and Playwright coverage.

Work:

- Inventory current backend tests and E2E specs.
- Run targeted TypeScript checks.
- Run current ESS payslip and HR payroll output specs against local UI plus staging API when credentials/data permit.
- Record known gaps: HTML payslip, no PDF renderer, no tax sheet contract, limited PDF content validation.

Exit criteria:

- Baseline results documented.
- Existing failures separated from new hardening work.
- No unrelated payroll behavior changed.

Playwright gate:

- `ess-payslips-launch-certification.spec.ts`
- `payroll-output-artifact-certification.spec.ts` or a lighter stage-safe equivalent.

## Phase P1: Payslip PDF And Tax Sheet Contract

Goal: define the exact employee-facing and HR-facing output contract before building PDF rendering.

Deliverables:

- Structured payslip render model.
- Structured tax sheet render model.
- Field-level required/optional matrix.
- Line grouping rules.
- Reconciliation rules.
- Tenant template/profile knobs.
- Browser acceptance checklist.

Payslip PDF content contract:

| Area | Required Fields |
| --- | --- |
| Tenant/legal entity | Company name, legal entity, address, country, payroll contact or support instruction, optional logo/template ref. |
| Employee identity | Employee name, employee code, department, designation/job title where available, location/branch where available. |
| Payroll period | Period name, start date, end date, pay date, payroll run code/name. |
| Earnings | Visible earning lines, amount, optional YTD amount, grouping/order from payslip template. |
| Deductions | Visible employee deduction lines, amount, optional YTD amount. |
| Employer contributions | Employer contribution lines separated from employee deductions. |
| Reimbursements/information | Reimbursement and informational lines where configured visible. |
| Totals | Gross earnings, employee deductions, employer contributions, reimbursements if used, net pay. |
| Integrity | Source hash, artifact checksum, generated timestamp, template ref, confidentiality footer. |

Tax sheet content contract:

| Area | Required Fields |
| --- | --- |
| Tax profile | Tax regime, statutory profile ref, PAN/tax identifier when configured and safe to show. |
| Current month tax | Current month taxable earnings, tax/TDS line, professional tax, other statutory tax lines. |
| Year-to-date | YTD taxable earnings, YTD tax/TDS, YTD deductions/exemptions considered where available. |
| Declarations/proofs | Declaration status summary, verified/pending/rejected proof counts where available. |
| Prior employment | Previous employment taxable income and tax deducted where available. |
| Projection | Annual taxable projection and remaining tax estimate when configured. |
| Trace | Calculation/source hash refs for tax lines. |

Line grouping rules:

- Earnings, deductions, employer contributions, tax, reimbursement, and informational lines must be visually separated.
- Lines with `payslip_visibility` hidden or profile-hidden must not render.
- Amounts must use currency formatting and two-decimal backend values.
- Net pay must reconcile to calculation totals, not recalculated in the browser.
- Empty groups should render a calm "No items" state or be suppressed by template profile.

Exit criteria:

- Contract approved in docs.
- Implementation tasks split into backend render model, PDF renderer, UI preview, tests, and docs.

Playwright gate:

- Contract phase can pass with browser audit of existing ESS/HR pages plus documented gaps.

## Phase P2: Backend Render Model And Reconciliation Service

Goal: create a deterministic backend representation used by PDF, ESS modal, reports, and tests.

Work:

- Add a payslip render-model builder from `PayrollOutputArtifact`.
- Group calculation lines by semantic section.
- Add tax-sheet model from statutory profile, declaration snapshot, line snapshot, and totals.
- Add validation helpers:
  - gross earnings equals earning totals.
  - deductions equal deduction/tax totals where appropriate.
  - net pay equals approved calculation total.
  - visible lines match template visibility profile.
  - tax sheet TDS matches tax calculation line.
- Store render-model metadata in artifact config or derive deterministically from locked artifact snapshots.

Backend tests:

- Render model groups lines correctly.
- Hidden lines are excluded.
- Tax lines appear in tax sheet.
- Missing tax profile produces explicit unavailable state.
- Totals reconcile.
- Published artifact immutability remains intact.

Playwright gate:

- ESS payslip modal shows grouped sections and tax sheet summary.
- HR payroll output detail exposes template/render metadata clearly.

UI/UX acceptance:

- Employee language must be simple: "Earnings", "Deductions", "Tax sheet", "Net pay".
- HR language can include source hashes, template refs, storage refs, and reconciliation status.

## Phase P3: PDF Rendering Engine

Goal: generate true PDF payslip artifacts instead of employee-facing HTML artifacts.

Work:

- Choose renderer and install/wire it safely.
- Add `application/pdf` artifact support.
- Generate PDF from the render model and tenant template profile.
- Preserve checksum, file size, storage key, MIME type, and retention metadata.
- Keep HTML preview/source only as internal render source if useful.
- Add deterministic PDF metadata where possible.

Potential renderer options:

- Backend HTML-to-PDF renderer if available and deployment-friendly.
- ReportLab-style programmatic PDF if deterministic layout is more important than CSS support.
- Node/browser PDF rendering only if operationally acceptable for server runtime.

Acceptance:

- Payslip artifact content type is `application/pdf`.
- File name ends `.pdf`.
- Download headers show PDF MIME/content disposition.
- PDF opens and contains required text.
- PDF content is not blank.
- Same locked source data produces stable reconciliation values and source hash.

Backend tests:

- PDF artifact generation.
- PDF MIME and file extension.
- PDF text extraction includes employee, period, gross, deductions, net pay, and tax sheet label.
- Checksum exists and changes when source artifact model changes before publish.

Playwright gate:

- HR downloads selected payslip PDF.
- ESS downloads own PDF.
- Unauthorized ESS download of another employee's PDF fails closed.

UI/UX acceptance:

- Download labels say "Download PDF payslip".
- Blocked download explains why.
- Mobile UI does not imply PDF preview if only download is available.

## Phase P4: Professional Payslip And Tax Sheet Template

Goal: make the output usable by employees, HR, banks, auditors, and statutory review.

Work:

- Design A4 template with clean sections.
- Add tenant/legal entity branding placeholders.
- Add employee and period summary block.
- Add earnings/deductions/tax/employer contribution tables.
- Add tax sheet as second page or section.
- Add source hash/checksum footer.
- Add confidentiality and support instruction footer.

PDF visual QA:

- Render sample PDF to images.
- Inspect desktop and mobile download flow.
- Verify no overlapping text.
- Verify long employee names and component labels wrap.
- Verify multi-page line tables paginate.

Backend tests:

- Long label wrapping does not fail PDF generation.
- Multiple earning/deduction lines render.
- Missing optional values render as "Not available" or are suppressed.

Playwright gate:

- Browser flow downloads professional PDF.
- PDF text extraction confirms tax sheet content.
- ESS modal matches PDF totals.

## Phase P5: Payroll Output And Report Reconciliation

Goal: prove payslip, payroll register, tax sheet, and reports all tell the same story.

Work:

- Cross-check payroll register totals against payslip totals.
- Cross-check payslip publication report against published artifact count.
- Cross-check statutory deductions report against payslip tax sheet lines.
- Cross-check TDS e-file readiness against TDS/tax sheet values.
- Add report-level evidence columns when missing.

Tests:

- Register gross/deductions/net equals sum of payslips.
- Published payslip count equals output batch payslip count.
- Tax sheet TDS matches statutory deductions report.
- Access audit records download/read actions.

Playwright gate:

- HR opens Payroll Outputs, Payroll Register report, Payslip Publication report, and Statutory Deductions report.
- Filters, exports, and totals are browser-validated.

## Phase P6: ESS Payslip UX Hardening

Goal: make employee payslip use easy and safe.

Work:

- Rename actions to "Review payslip" and "Download PDF".
- Add tax sheet summary in modal.
- Add "What to check" microcopy.
- Improve read receipt success/failure feedback if needed.
- Ensure Escape closes modal.
- Ensure no modal remains open after intended action if action requires closing.
- Add compact mobile cards if table becomes hard to scan.

Playwright gate:

- Desktop, tablet, mobile.
- Modal stability.
- Download link correctness.
- Read receipt failure/retry/success.
- Empty state.
- Employee-scope denial.

## Phase P7: HR Payroll Outputs UX Hardening

Goal: make payroll output publication and evidence review safe for HR.

Work:

- Add output readiness panel: PDF ready, tax sheet ready, reconciliation passed, report totals matched.
- Add publish confirmation copy.
- Add success/failure toasts for publish/handoff where missing.
- Add clearer blocked states for generated/unpublished/published.
- Add selected artifact preview metadata.
- Add tax sheet evidence labels.

Playwright gate:

- Publish failure/retry/success.
- Download failure/blocked state.
- Handoff disabled until publish.
- Artifact pagination.
- Mobile/tablet no overflow.

## Phase P8: RBAC, Audit, And Signed Access Hardening

Goal: close sensitive payroll document access boundaries.

Work:

- Verify route-level permission checks for all payroll output APIs.
- Verify employee can only access own payslip artifacts.
- Verify HR without output download permission cannot download.
- Verify signed access is token-bound, expiry-bound, and revocable.
- Verify audit export includes published, notified, downloaded, read, signed, revoked events.

Playwright gate:

- Employee HR route denial.
- Other employee payslip denial.
- Limited payroll viewer role.
- Signed access issue/revoke if UI exists or API proof if not.

## Phase P9: Stage Payroll Pilot Certification

Goal: certify realistic SaaS behavior on staging.

Scope:

- One controlled single-employee run for deep PDF/tax inspection.
- One multi-employee run for aggregate reconciliation.
- HR publish/download/report flow.
- Employee ESS download/read flow.
- Notification visibility.
- RBAC denial.

Exit criteria:

- All target specs pass on stage or local UI against staging API.
- Screenshots/videos retained for failed tests only.
- Known limitations documented.
- User docs updated.

## Test Suite Targets

Existing specs to reuse/extend:

- `web/tests/e2e/ess-payslips-launch-certification.spec.ts`
- `web/tests/e2e/ess-payslip-flows.spec.ts`
- `web/tests/e2e/payroll-output-artifact-certification.spec.ts`
- `web/tests/e2e/pilot-100-output-payslip-ess-certification.spec.ts`
- `web/tests/e2e/payroll-lifecycle-rbac-certification.spec.ts`
- `web/tests/e2e/payslip-publication-report-certification.spec.ts`
- `web/tests/e2e/statutory-deductions-report-certification.spec.ts`
- `web/tests/e2e/tds-efile-readiness-report-certification.spec.ts`

New specs expected:

- `payroll-payslip-pdf-tax-sheet-certification.spec.ts`
- `ess-payslip-pdf-usability-certification.spec.ts`
- `hr-admin-payroll-output-pdf-reconciliation.spec.ts`

## Documentation Updates Required

- `docs-site/docs/ess/payslips.md`
- `docs-site/docs/hr-admin/payroll/payroll-outputs.md`
- `docs-site/docs/hr-admin/payroll/statutory-payroll.md`
- `docs-site/docs/hr-admin/payroll/payroll-review.md`
- `docs-site/docs/troubleshooting/payroll.md`

## Implementation Start Order

1. P1 contract documentation.
2. P2 render model and reconciliation service.
3. P3 PDF renderer.
4. P4 professional template.
5. P6/P7 UI and browser hardening.
6. P5 report reconciliation.
7. P8 RBAC/audit hardening.
8. P9 stage certification.

## First Engineering Tasks

- Add render-model helpers without changing existing output behavior.
- Add tests for line grouping, totals, and tax-sheet model.
- Introduce PDF renderer behind output profile flag.
- Add a small deterministic backend PDF test before replacing the default artifact MIME.
- Add a Playwright spec that downloads and validates the generated payslip PDF.

## Next Hardening Phases With QA

### Phase P5: Artifact Reconciliation

Goal: prove generated payroll artifacts agree before HR publishes or sends finance handoff.

Scope:

- Payslip totals vs payroll register rows.
- Payslip net pay vs bank advice and finance handoff rows.
- Payslip tax-sheet lines vs statutory/tax report artifacts.
- Employee identity, source hash, and artifact ID consistency across outputs.
- Clear HR-facing mismatch evidence.

QA:

- Backend tests for pass, mismatch, and missing-register-row scenarios.
- API payload assertions for batch and artifact reconciliation summaries.
- Playwright HR Payroll Outputs assertions for reconciliation status and mismatch count.
- Negative test to confirm a blocking mismatch can be detected before publish/handoff.

### Phase P6: Tax Accuracy And Statutory Depth

Goal: make the tax sheet accurate, explainable, and extensible across statutory packs.

Scope:

- TDS regime trace.
- YTD taxable income and YTD TDS.
- Declaration/proof counts.
- PF/ESI/PT/LWF applicability traces.
- Statutory report matching.

QA:

- Backend tests for new/old regime and not-declared cases.
- Tests for proof verified/pending/rejected states.
- Tests for applicable and non-applicable statutory employees.
- Browser checks in HR outputs and ESS payslip modal.

### Phase P7: PDF Visual QA

Goal: certify visual quality, not only PDF text markers.

Scope:

- Render PDF pages to images when Poppler tooling is available.
- Nonblank page checks.
- Header/footer/table layout checks.
- Long employee name and component label wrapping.
- Multi-page line table support.

QA:

- PDF render smoke test.
- Pixel/nonblank checks.
- Long-line fixture.
- Browser download plus rendered PDF artifact inspection.

### Phase P8: Payroll UX And Responsive Hardening

Goal: make HR and ESS payroll screens easy to use on desktop, tablet, and mobile.

Scope:

- HR Payroll Outputs detail panel.
- ESS Payslip modal.
- Handoff evidence panel.
- Empty, loading, error, disabled, success, and failure states.
- Modal close and Escape behavior.

QA:

- Playwright desktop/tablet/mobile screenshots.
- No horizontal overflow.
- Keyboard navigation checks.
- Download and read-receipt usability checks.

### Phase P9: Finance Handoff Reliability

Goal: make finance delivery operationally safe.

Scope:

- Bank advice correctness.
- Provider retry states.
- Callback reconciliation.
- Audit pack completeness.
- Idempotency and duplicate prevention.

QA:

- Backend tests for retry and idempotency.
- Browser tests for transmit, fail, retry, acknowledge.
- API isolation tests for tenant and role access.
- Audit CSV/PDF evidence checks.

### Phase P10: Security, Privacy, Audit

Goal: protect payroll documents and prove access governance.

Scope:

- Signed URL expiry and revocation.
- Employee isolation.
- HR permission enforcement.
- Download/read audit trail.
- PII-safe logs.
- Retention evidence.

QA:

- Cross-tenant object isolation tests.
- ESS cannot download another employee payslip.
- HR without payroll permission cannot download.
- Revoked/expired signed URL fails.
- Audit event is created for download/read/retry.

### Phase P11: Documentation And Release Readiness

Goal: align user documentation, QA evidence, and release checklist.

Scope:

- HR payroll outputs guide.
- ESS payslip guide.
- Payroll close runbook.
- Troubleshooting PDF/tax/reconciliation failures.
- QA evidence index.

QA:

- Docs match real UI labels.
- Playwright evidence references current browser flows.
- Final staging certification run.

## Implementation Log

### 2026-10-08: P1/P2 Foundation Started

Completed:

- Documented the phase plan, output principles, PDF contract, tax sheet contract, and browser gates.
- Added backend payslip render-model helper for line grouping, hidden-line exclusion, totals, and tax-sheet trace.
- Added deterministic `application/pdf` payload support behind the output profile MIME setting.
- Added backend tests for earnings/deductions/tax/employer contribution grouping, hidden line exclusion, tax-sheet trace, and PDF payload content.
- Updated ESS Payslips and HR Payroll Outputs user docs with PDF/tax-sheet expectations.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 4 tests.
- `./.venv/bin/python manage.py check` passed.
- `ess-payslips-launch-certification.spec.ts` passed against local UI with staging API: 2 tests.

### 2026-10-08: P2/P3 API and UI Visibility Added

Completed:

- Exposed the payslip render model in ESS payslip and HR payroll output artifact API payloads.
- Added serializer coverage for the nullable render model so older/non-payslip artifacts remain safe.
- Added shared frontend types for payslip render sections, tax-sheet evidence, and render quality.
- Updated ESS payslip review modal with compact Tax sheet, grouped Payslip lines, and PDF readiness sections.
- Updated HR Payroll Outputs artifact detail with Payslip PDF readiness so HR can verify template, visible/hidden lines, tax-sheet inclusion, tax regime, and period tax before release.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 4 tests.
- `./.venv/bin/python manage.py check` passed.
- `pnpm --dir web exec tsc --noEmit` passed.
- `ess-payslips-launch-certification.spec.ts` passed against local UI with staging API: 2 tests.

Remaining in P3:

- Add generated PDF download validation from a real payroll output artifact.
- Upgrade browser tests to assert PDF MIME/content once a stage-safe generated PDF artifact is available.

### 2026-10-08: P3 Browser PDF Gate Added, Stage Backend Mismatch Found

Completed:

- Added a Playwright certification path that creates a payroll run for the signed-in ESS employee, injects a PDF/tax-sheet output profile, publishes outputs, checks HR payroll output readiness, downloads the HR PDF artifact, opens ESS payslip review, and downloads the ESS payslip.
- Made the live payroll setup helper more resilient by clearing incompatible pay-group selections and selecting the employee from the authenticated ESS profile instead of a brittle seed code.
- Propagated output-profile tax-sheet metadata into generated payslip artifact config so render-model and PDF generation can use tenant PDF/tax settings.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 4 tests.
- `./.venv/bin/python manage.py check` passed.
- `pnpm --dir web exec tsc --noEmit` passed.
- `git diff --check` passed.

Stage finding:

- The new Playwright test reached a published live artifact, but staging was still serving the old backend behavior: the artifact advertised `application/pdf` while keeping a `.json` filename/body path, and the HR artifact payload did not include `render_model`.
- This is expected until the latest backend changes in this branch are deployed to staging. After deployment, rerun `payroll-output-artifact-certification.spec.ts` with the `PDF payslip output carries tax-sheet evidence` grep.

### 2026-10-08: P3 Stage Certification Passed After Deployment

Completed:

- Reran the focused PDF/tax-sheet Playwright gate after staging deployment.
- Fixed strict Playwright download-link scoping in the ESS payslip modal.
- Made all payroll output artifact certification tests select the live signed-in ESS employee dynamically instead of relying on stale seed code `EMP-0042`.
- Reran the full payroll output artifact certification suite against staging.

Verification:

- Focused gate passed: `PDF payslip output carries tax-sheet evidence in HR and ESS browser flows`.
- Full suite passed: `payroll-output-artifact-certification.spec.ts` had 3 passed tests in Chromium against staging.

### 2026-10-08: P4 Professional Payslip PDF Layout Started

Completed:

- Upgraded the dependency-free PDF renderer from a plain text listing to a structured payslip layout.
- Added header, employee details, net pay summary, payslip detail tables, tax-sheet block, source hash, and confidentiality footer.
- Strengthened backend PDF tests to assert professional section labels and tax-sheet content.
- Strengthened the browser PDF gate to assert the new PDF layout markers after deployment.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 4 tests.
- `./.venv/bin/python manage.py check` passed.
- `pnpm --dir web exec tsc --noEmit` passed.
- `git diff --check` passed.

Remaining in P4:

- Deploy the professional PDF renderer to staging.
- Rerun the focused PDF/tax-sheet browser gate and full payroll output artifact certification suite.
- Add visual PDF render inspection if Poppler/reportlab tooling is introduced for richer multi-page rendering.

### 2026-10-08: P4 Professional PDF Stage Certification Passed

Completed:

- Deployed the professional payslip PDF renderer to staging.
- Reran the focused PDF/tax-sheet gate against staging and confirmed the new layout markers are present in HR/ESS PDF downloads.
- Reran the full payroll output artifact suite against staging.

Verification:

- Focused gate passed: `PDF payslip output carries tax-sheet evidence in HR and ESS browser flows`.
- Full suite passed: `payroll-output-artifact-certification.spec.ts` had 3 passed tests in Chromium against staging.

### 2026-10-08: P5.1 Payslip/Register Reconciliation Started

Completed:

- Added backend reconciliation summary comparing every payslip's gross earnings, employee deductions, employer contributions, and net pay against payroll register rows.
- Added batch-level reconciliation evidence into output batch artifact summary.
- Added artifact-level reconciliation evidence into HR payroll output artifact payloads.
- Added HR Payroll Outputs UI sections for batch reconciliation and selected artifact register reconciliation.
- Added backend tests for passing reconciliation and net-pay mismatch detection.
- Strengthened payroll output Playwright assertions to require reconciliation evidence in HR artifact detail.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 6 tests.
- `./.venv/bin/python manage.py check` passed.
- `pnpm --dir web exec tsc --noEmit` passed.

Remaining in P5.1:

- Deploy to staging.
- Rerun focused payroll output artifact certification, then the full suite.
- Add a negative browser/API fixture for intentionally mismatched register rows before enforcing publish/handoff blocking.

### 2026-10-08: P5.2 Reconciliation Gate Enforcement Started

Completed:

- Added service-level enforcement so generated output batches cannot be published when payslip totals do not match the payroll register.
- Added finance handoff enforcement so downstream bank/accounting/statutory packages cannot be generated from a batch whose register reconciliation fails.
- Tightened reconciliation to block extra register rows that do not have a matching payslip artifact.
- Updated HR Payroll Outputs action cards to disable publish and handoff actions with clear HR-readable blocked-state copy when reconciliation status is failed.
- Added backend negative tests for publish and finance handoff blocking on net-pay mismatches.
- Re-ran local browser certification against a disposable local backend before any staging deployment.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 9 tests.
- `pnpm --dir web exec tsc --noEmit` passed.
- Local Playwright passed: `outputs publish, metadata, downloads, access audit, pagination, and ESS scope are certified`.
- Local Playwright passed: `PDF payslip output carries tax-sheet evidence in HR and ESS browser flows`.
- Full local Playwright passed: `payroll-output-artifact-certification.spec.ts` had 3 passed tests in Chromium.

Remaining in P5.2:

- Add a controlled browser-visible mismatch fixture if/when a non-production QA mutation hook or seed-only mismatch profile is introduced.
- Deploy after the full phase set is complete, per current release plan.

### 2026-10-08: P6.1 Payslip Tax Sheet Evidence Started

Completed:

- Expanded payslip tax-sheet render model with taxable earnings, taxable deductions, projected annual tax, remaining annual tax, readiness status, readiness warnings, tax source hash count, and source hash evidence.
- Corrected YTD tax calculation to sum tax-line `ytd_amount` values instead of current-period amounts.
- Extended payroll output generation so tax-sheet profile values from the output profile are copied into each payslip artifact snapshot.
- Added HR Payroll Outputs tax readiness details for HR review.
- Added ESS payslip modal tax readiness, taxable earnings, and source-hash evidence.
- Added PDF payslip tax-sheet markers for readiness, taxable earnings, and source-hash coverage.
- Strengthened Playwright PDF/tax-sheet assertions to verify enriched HR, ESS, and downloaded PDF evidence.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 10 tests.
- `pnpm --dir web exec tsc --noEmit` passed.
- Local Playwright passed: `PDF payslip output carries tax-sheet evidence in HR and ESS browser flows`.

Remaining in P6:

- Extend reporting checks so TDS readiness and payslip tax-sheet evidence agree.

### 2026-10-08: P6.2 Tax Sheet Negative Scenarios Certified

Completed:

- Added explicit no-tax payslip handling with `not_applicable` tax readiness when no tax sheet is configured and no tax/statutory lines exist.
- Added old-regime and new-regime render model tests to prove the selected regime is preserved in payslip tax evidence.
- Added rejected-proof warning coverage alongside existing pending-proof and missing-source-hash warning coverage.
- Strengthened browser QA so HR and ESS both show warning tax readiness when the configured tax sheet has no current-period tax line.
- Reran the full local payroll output artifact suite after the P6 tax changes.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 13 tests.
- `pnpm --dir web exec tsc --noEmit` passed.
- `./.venv/bin/python manage.py check` passed with the local Playwright database profile.
- Full local Playwright passed: `payroll-output-artifact-certification.spec.ts` had 3 passed tests in Chromium.

Remaining in P6:

- Extend reporting checks so TDS readiness and payslip tax-sheet evidence agree.
- Consider a seed-only multi-employee fixture covering taxable, no-tax, rejected-proof, and old-regime employees in one run.

### 2026-10-08: P6.3 TDS Readiness Linked To Payslip Tax Evidence

Completed:

- Added published payslip artifacts with render models to the payroll finance handoff setup payload for reporting use.
- Added a TDS readiness gate named `Payslip tax-sheet evidence` so HR can compare published payslip tax-sheet readiness with TDS e-file readiness.
- The new gate shows published payslip tax-sheet coverage, ready/warning/not-applicable counts, the latest payroll run code/title, and source-hash evidence.
- Strengthened TDS readiness report certification to include the new payslip tax-sheet evidence gate.
- Strengthened the payroll-output PDF browser flow so it creates a fresh payroll run, publishes a PDF payslip, then opens the TDS readiness report and verifies that exact run code appears in the payslip tax-sheet evidence gate.
- Adjusted the employee denial test to accept the local safe redirect target while still proving the TDS report is not rendered.

Verification:

- `./.venv/bin/python manage.py check` passed.
- `pnpm --dir web exec tsc --noEmit` passed.
- Local Playwright passed: `tds-efile-readiness-report-certification.spec.ts` had 2 passed tests in Chromium.
- Local Playwright passed: `PDF payslip output carries tax-sheet evidence in HR and ESS browser flows`, including browser-created payroll run evidence in the TDS report.

Remaining in P6:

- Consider a seed-only multi-employee fixture covering taxable, no-tax, rejected-proof, and old-regime employees in one run.
- Run the full payroll output and TDS report suites together before deployment.

### 2026-10-08: P6.4 Multi-Employee Tax Evidence Certified Locally

Completed:

- Added per-employee tax-sheet output profile overrides so a SaaS tenant can model mixed payroll populations in the same run.
- Supported an explicit employee-level `tax_sheet_profile: null` override to mark that employee's payslip tax sheet as not applicable instead of inheriting the batch default.
- Ensured the not-applicable override suppresses tax-sheet/statutory evidence counting for that employee while preserving normal statutory lines in payroll detail.
- Scoped the TDS readiness `Payslip tax-sheet evidence` gate to the latest published payslip batch so HR sees actionable evidence for the selected run instead of historical aggregate noise.
- Strengthened the browser certification to create actual disposable employees from the browser session, add them to a fresh payroll run, publish three PDF payslips, and verify mixed tax readiness in HR, ESS, and TDS readiness.

QA fixture shape:

- Primary signed-in ESS employee: tax sheet enabled, new regime, warning readiness because no current-period tax line is attached.
- Disposable no-tax employee: tax sheet explicitly not applicable through per-employee override.
- Disposable old-regime employee: tax sheet enabled, old regime, warning readiness.
- TDS readiness expected evidence for the fresh run: two warning payslips and one not-applicable payslip in the latest published batch.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 14 tests.
- `pnpm --dir web exec tsc --noEmit` passed.
- `git diff --check` passed.
- Local Playwright passed: `PDF payslip output carries tax-sheet evidence in HR and ESS browser flows`, including browser-created multi-employee payroll data and TDS latest-batch tax evidence.
- Local Playwright passed: `tds-efile-readiness-report-certification.spec.ts` had 2 passed tests in Chromium after the latest-batch scoping change.

Remaining in P6:

- Run the full payroll output artifact suite plus the TDS readiness report suite together before deployment.
- After deployment, rerun the focused multi-employee PDF/tax-sheet gate against staging and confirm the TDS readiness row reports the fresh batch only.

### 2026-10-08: P6.5 Local Pre-Deploy Regression Passed

Completed:

- Ran the full local payroll hardening browser regression across ESS payslips, HR payroll outputs, payroll finance handoff, and TDS readiness.
- Updated ESS payslip launch certification to assert the current employee-facing modal language: `Payslip lines`, `Tax sheet`, and `PDF readiness`.
- Hardened the TDS employee-denial browser test so it waits for the committed redirect before asserting the restricted report is absent.

Verification:

- `./.venv/bin/python manage.py test apps.payroll.tests --keepdb` passed: 14 tests.
- `./.venv/bin/python manage.py check` passed.
- `pnpm --dir web exec tsc --noEmit` passed.
- Local Playwright combined gate passed: `payroll-output-artifact-certification.spec.ts`, `tds-efile-readiness-report-certification.spec.ts`, and `ess-payslips-launch-certification.spec.ts` had 7 passed tests in Chromium.

Remaining in P6:

- Deploy to staging.
- Rerun focused stage gates for multi-employee PDF/tax evidence, TDS readiness, and ESS payslip usability.
