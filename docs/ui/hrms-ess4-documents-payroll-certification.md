# ESS-4 employee documents and payslips certification

**ESS-4A update (2026-10-19): local functional PASS; release CONDITIONAL.** Final build `pK88fNFAqagso1Xy6FsAq` passed 108 browser and 48 backend/API/PostgreSQL checks, with zero failed/skipped/blocked/unexecuted final cases. Four P0 application fixes, diagnostic failures, screenshots, cleanup and open gates are documented in the [ESS-4A certification](hrms-ess4a-remediation-certification.md). No production certification, Lightsail deployment or frozen-gate promotion. The original ESS-4 BLOCKED results below are historical evidence, preserved in full.

**Original ESS-4 release decision: BLOCKED.** ESS-4 is implemented; executed verification found unresolved runtime defects. An unchanged neighboring Leave browser regression reproduced a stale cancellation status; no production certification is claimed.

## Approved scope and dependencies

Reviewed the ESS coverage tracker, ESS-3 Leave certification, Accerio design-system implementation/certification and the existing employee document/payroll source. ESS-4 covers `/ess/payslips` and `/ess/documents`. The tracker labels statutory declarations ESS-4/5: its existing self/proof/submit authorization is audited and regression tested as a dependency; its interface and tax workflow are not redesigned or newly browser-certified in this slice. ESS-5 requests/notifications/settings are not started.

Payslips: own published history, global search/pay-date-year filtering and pagination, selected-record full detail, recorded payroll lines/tax/day-count evidence where supplied, authenticated download, read receipt and access tracking. Signed-access expiry/limits remain existing backend contracts; no public sharing action is added.

Documents: assigned requirements, category-governed uploads, expiry/verification/history filters, validation, stored upload, HR review/reupload notes, replacement/version history and protected own download. UI availability follows existing backend requirement/category data. The signed enabled-feature manifest and production protected-storage gates remain open; local success does not authorize enabling an excluded production capability.

Separate open gates: approved employee-effective leave-year projection; approved employee-effective upcoming-holiday projection; screen-reader assessment; native browser zoom; formal WCAG certification. No new holiday calendar, financial calculation or universal approval policy is introduced.

## Current findings and changes

- Old payslip presentation repeated summary/action/checklist sections, described scheduled pay dates as “paid”, rounded payroll amounts to whole currency units and used a `.pdf` fallback for non-PDF artifacts. Shared compact headers/panels/information fields replace the redundant blocks; source decimal strings are preserved without inferring currency or payment completion, and downloads use the recorded filename.
- The list API provides full render/line detail only for the selected ID. Other rows now select the record through an authenticated document GET before full review. A stale/foreign/off-page selection is explicitly reported; it never becomes an authorization bypass or fabricated detail. No new detail API is invented.
- Payslip detail no longer truncates sections to six lines. Complete published lines lead the review; compact shared information panels replace the duplicated local detail-row component in both workspaces. Access/storage evidence remains available in a native keyboard-accessible disclosure; unsupported downloads remain unavailable.
- Both workspaces use existing Accerio tokens and stable patterns. No new CSS file, hardcoded color, component library or business API is added.
- Document dialogs opt into the centralized portal theme and explicit keyboard ordering. A hydration-safe mount snapshot replaces document-global render detection. Upload submission has an immediate ref guard against duplicate activation; existing backend validation and single-active-version rules remain authoritative.
- Requirement/history navigation uses authenticated document GETs, matching certified ESS recovery patterns. Server loaders bound reads to 15 seconds, normalize query inputs and recover oversized positive pages to the last populated page. Malformed category UUIDs do not reach Django query parsing.
- Date labels use deterministic date-only formatting, preserving dates across browser/server timezone and locale differences. Timestamp evidence explicitly identifies UTC. Missing amounts are unavailable rather than a fabricated zero.
- Future-due requirements without a current file have a neutral indicator. No category permission or verification policy is inferred from presentation state.

## Architecture and contracts

Reused: WorkspaceChrome/menu catalog, WorkspaceStandardHeader/Panel, WorkspaceInformation, WorkspaceFilterBar, WorkspaceStatusBadge, existing tables and scroll regions, PaginationBar, HrAdminActionModal, AsyncActionButton, AsyncDownloadButton, ActionToast, UploadProgressStatus, validation helpers, mutation refresh and ESS loading/error boundaries.

The only new production helper is `web/src/lib/ui/employee-document-format.ts`: stable display dates and exact decimal strings. Business data and authorization remain outside shared presentation components.

Existing contracts retained: `GET /me/payroll-payslips/` (`q`, `year`, `page`, `page_size`, `selected_id`); own `download`, `read` and `signed-access` artifact routes; `GET /me/document-center/`; multipart `POST /me/employee-documents/`; own document download. No serializer, URL, RBAC, model, migration, calculation or audit-service change.

Source references: `backend/apps/common/api_views.py` (`MeDocumentCenterView`, `MeEmployeeDocumentListCreateView`, `MeEmployeeDocumentDownloadView`, `MePayrollPayslip*` and `_build_me_payroll_payslip_list_payload`); `backend/apps/payroll/services.py` signed-access/access-event services; `backend/apps/payroll/storage.py` checksum/storage policy enforcement; `backend/apps/documents/models.py` and document storage services; `web/src/styles/accerio.css` and shared patterns. The final readiness assessment explicitly retains document uploads/sharing and production storage/manifest exclusions.

## Defects and diagnostic evidence

Preflight identified an expiry control whose accessible name absorbed inline validation text. Explicit stable names now survive validation; the error text remains visible and announced. Real screenshot inspection also found inherited document wrappers constraining the status panel and adding nested cards. Shared panels now supply the whole structure without a page-specific CSS override. A second rendered review caught the legacy `stack` flex row shrinking the summary; the existing `queue-list` grid now stretches panels vertically, with a browser width assertion guarding the correction. Missing filename/owner values no longer imply an unrecorded pending workflow. Malformed UUID-shaped category IDs and zero-year bookmarks are normalized before backend filtering. Numeric as well as string source amounts render without whole-unit rounding.

Synthetic payroll fixtures initially omitted required calculation/lock timestamps and used overlapping periods within one calendar. The fixtures were corrected to satisfy existing guards; no guard or test expectation was weakened. Failed diagnostics and an interrupted candidate build are retained under `preflight/` and excluded from final acceptance totals. A complete first candidate build passed; acceptance uses the final build ID recorded below.

The employee interface does not offer a permanent/public signed sharing URL. Backend self grants are exercised for employee/tenant ownership, access limits and expiry; real production object storage, IAM, encryption, retention and signed manifest acceptance remain separate gates.

## Blocking functional regression: existing Leave refresh

The unmodified ESS-3 suite failed on the neighboring-regression build, independently of the other browser suites. After an approved request was cancelled, the terminal cancellation API returned **200 / `cancelled`**, and a refreshed RSC response contained the cancelled status in about **1.8 seconds**. The visible history row continued to show **approved** through the original 10-second assertion. The suite stopped after its configured first failure: 5 passed, 1 failed, 21 not run. A preceding concurrent diagnostic similarly retained the old row after governed cancellation; the evidence does not support dismissing the issue as load alone.

See [defect evidence](../qa/evidence/ess4-documents-payroll/leave-refresh-defect.json), [final Leave log](../qa/evidence/ess4-documents-payroll/ess3/browser-final.txt) and its retained trace/error screenshot under `ess3/trace-artifacts/`. Backend cancellation and the refreshed server projection were correct in the recorded trace; the client presentation was stale. No root cause or fix is claimed. Leave workspace/lifecycle/shared refresh source is unchanged. No assertion, timeout, policy, reload workaround or test skip was introduced to hide this failure.

**Release remains BLOCKED until this regression is resolved and the original cross-browser Leave suite completes successfully.** Historical ESS-3 certification evidence is preserved; its earlier successful execution does not override this new failure. ESS-4 scope, backend safety and remaining acceptance results are reported separately.

## Executed verification

| Check | Executed result |
| --- | --- |
| ESS-4 production Playwright, Chromium/Firefox/WebKit | **25 passed, 2 failed, 0 skipped/flaky**; all 27 attempted |
| ESS-1 neighboring browser regression | 24 passed |
| ESS-2 neighboring browser regression | 24 passed |
| ESS-3 neighboring browser regression | **5 passed, 1 failed, 21 not run** after configured first failure |
| Combined scheduled browser cases | 78 passed, 3 failed, 21 not run; 81 executed / 102 scheduled |
| Backend/API/PostgreSQL | **48 passed**: 29 contract, 13 workflow, 5 integrity/concurrency/closed-period, 1 multi-year filter |
| TypeScript / focused ESLint / Django check / production build | PASS; final type/lint rerun after test changes; Django zero issues |
| Accessibility | Focused keyboard, accessible-name, focus restoration, reduced-motion and viewport assertions executed; runtime failures prevent overall browser PASS |

Final ESS-4 build: `uK1W7ZZ1lg907vHjD3Mam`. Neighbor suites used `cO8SApyznXhcwiBEsbg_L`, before the final target-page read guards and receipt focus fix; neighbor/shared/business source remained unchanged. This is not a claim that all suites passed against one final build. See `build-inputs.json` and `neighbor-build-inputs.json`.

[Final ESS-4 log](../qa/evidence/ess4-documents-payroll/browser-final.txt), [structured results](../qa/evidence/ess4-documents-payroll/browser-results.json), [source/screenshot manifest](../qa/evidence/ess4-documents-payroll/source-manifest.json), [cleanup summary](../qa/evidence/ess4-documents-payroll/cleanup-summary.json). Backend logs: `api-contract.txt`, `workflow-regression.txt`, `integrity-regression.txt`, `year-filter-regression.txt`. Diagnostic/preflight runs are excluded from acceptance totals.

**Unresolved ESS-4 runtime defect:** Firefox responsive navigation emitted React hydration error #418 and a streaming DOM `b.parentNode` null exception. Related production preflight errors remain retained; development diagnostics did not reproduce them and do not establish a fix. Final Firefox case failed its strict no-runtime-errors assertion. WebKit's error/retry case separately failed on a background statutory-declarations RSC “access control checks” transport event; it is retained as FAIL, not silently reclassified as success. Only requestfailed-confirmed cancelled Notifications RSC transport is narrowly excluded; authorization denials and application/hydration errors are not excluded. Traces and failure screenshots are under `trace-artifacts/`.

The read guards reuse the existing ESS error boundary and Next `unstable_rethrow` for framework control flow; they do not resolve the runtime defect. Receipt activation now moves focus to Close before disabling its button, fixing Chromium Escape/focus restoration. Tests retain strict assertions; the final run used `--max-failures=0` to execute all independent cases, with real API setup after worker restarts and unique cleanup records.

**Rendered review:** desktop document panels and complete eight-line payslip details were inspected, plus final 320px documents and mobile payslip screenshots. Compact hierarchy and contained table scrolling are present. The mobile payslip capture shows a clipped right dialog edge/control and dense underlying table; this remains an unresolved visual defect, despite document-width assertions passing. Viewport bounds alone do not certify every dialog control. No visual perfection or mobile release PASS is claimed. All final capture paths/dimensions/hashes are indexed in the manifest.

Synthetic fixture cleanup verified tenant absence, physical upload deletion, unchanged closed attendance and published payroll snapshots. Both disposable application databases had zero enumerated business rows before removal. Owned database/container/volume and servers were removed; see cleanup evidence. Prior user files/processes were preserved.

## Changed files attributable to ESS-4

| File | Change |
| --- | --- |
| `web/src/app/ess/payslips/page.tsx` | Compact shared panels, real published totals, safe query/page selection, recorded filenames and document pagination |
| `web/src/app/ess/payslips/payslip-detail-action.tsx` | Shared dialog theme/focus, complete published sections, neutral pay-date wording and async download feedback |
| `web/src/app/ess/payslips/payslip-read-receipt-action.tsx` | Immediate duplicate guard, acknowledged state only after successful save, announced errors |
| `web/src/app/ess/documents/page.tsx` | Shared header, bounded query normalization and high-page recovery |
| `web/src/app/ess/documents/employee-document-center.tsx` | Shared panels/grid/dialogs, stable form names, duplicate upload guard, honest missing values and document navigation |
| `web/src/lib/ui/employee-document-format.ts` | Shared deterministic dates and source amount presentation |
| `web/src/lib/api.ts` | Existing document-center loader gets a 15-second read bound; all earlier ESS-3 edits predate this task |
| `backend/tests/ess4_browser_fixture.py` | Guarded synthetic display fixtures, closed attendance and published payroll snapshot verification |
| `backend/tests/test_ess4_document_contract.py` | Six direct self/tenant/document/payroll/immutability/signed-access checks |
| `web/playwright.ess4.config.ts`, `web/tests/e2e/ess4-documents-payroll-certification.spec.ts` | Production three-engine acceptance, fault injection, screenshots, responsive width assertion and guarded cleanup |
| This certificate, ESS tracker and `docs/qa/evidence/ess4-documents-payroll/` | Scoped implementation and executed evidence |

The pre-existing dirty working tree includes earlier ESS/foundation/backend/infrastructure/documentation work. Those changes are preserved and are not newly attributed to ESS-4. No application backend, schema, theme or neighboring workspace source is modified by this slice.

## Reproduction boundary

Use disposable loopback PostgreSQL 16 databases `hrms_ess2`, `hrms_ess1` and the Django/pytest test database. Existing migrations only. Demo mode is disabled. ESS-4 fixtures explicitly guard database name/host and synthetic tenant namespace. They seed published display records that satisfy model locks; existing API regressions independently exercise generation, publication, access audits and signed-grant behavior. No browser claim of performing an HR payroll publication is made.

Production Next used the final ESS-4 build at 3179 → fault proxy 8069 → Django 8048 (ESS-4), and the recorded preceding build at 3169 → 8059 → 8048 (ESS-3), 3149 → 8049 → 8048 (ESS-2), and 3139 → 8039 → Django 8038 (ESS-1). Suites own proxies and use one worker, no retries. Browser timezone is Asia/Tokyo and the synthetic attendance tenant uses America/New_York. Viewport captures cover desktop, 768px tablet, and 320/390px mobile sizes; these are not physical-device or touch-assistive-technology certification.

```sh
HRMS_CERT_EVIDENCE_DIR="$PWD/docs/qa/evidence/ess4-documents-payroll" \
  pnpm --dir web exec playwright test --config playwright.ess4.config.ts --max-failures=0
HRMS_CERT_EVIDENCE_DIR="$PWD/docs/qa/evidence/ess4-documents-payroll/ess3" \
  pnpm --dir web exec playwright test --config playwright.ess3.config.ts
HRMS_CERT_EVIDENCE_DIR="$PWD/docs/qa/evidence/ess4-documents-payroll/ess2" \
  pnpm --dir web exec playwright test --config playwright.ess2.config.ts
POSTGRES_DB=hrms_ess1 HRMS_CERT_EVIDENCE_DIR="$PWD/docs/qa/evidence/ess4-documents-payroll/ess1" \
  pnpm --dir web exec playwright test --config playwright.ess1.config.ts
```

These commands assume the guarded local database/server environment is already established; they must not be pointed at staging. Process-scoped macOS sleep prevention is used, with no global power-setting change.

## Remaining restrictions and separate open gates

| Gate / restriction | Current boundary |
| --- | --- |
| Approved leave-year self projection | Unimplemented; no exact per-policy range is certified by ESS-4 |
| Approved employee-effective holiday projection | Unimplemented; no upcoming-holiday feed is certified |
| Enabled-feature manifest | No new signed launch acceptance; excluded document upload/sharing paths must remain excluded for that release |
| Protected production storage | Local authenticated storage tests do not certify object-store IAM, encryption, lifecycle/retention or production credentials |
| Screen-reader interoperability | Unverified |
| Native browser zoom | Unverified; viewport resizing is not native zoom |
| Formal WCAG | Unverified; focused keyboard/naming/viewport checks do not establish full conformance |
| Statutory declarations | Existing self/proof/status guards audited and regressed; UI modernization and full browser certification remain pending in the existing ESS-4/5 planning item |
| Additional uploads | Existing self category/requirement contract remains authoritative; backend may reject another active file for a single-file category. No new replacement permission or universal upload replay guarantee is invented |
| Published artifact selection | Full detail is limited to the selected record on the loaded page; stale/off-page selections show guidance rather than claiming a separate detail lookup |

## Release boundary

Lightsail, frozen release gates, payroll/leave calculations, RBAC, historical close and audit behavior are unchanged. Prior ESS certification artifacts are preserved. Formal screen-reader, native zoom and WCAG assessments remain unverified. Stop after ESS-4; do not start ESS-5.
