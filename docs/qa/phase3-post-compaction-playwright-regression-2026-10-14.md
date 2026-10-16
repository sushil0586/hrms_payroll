# Phase 3 Post-Compaction Playwright Regression

Date: 2026-10-14

Scope: local Playwright regression across HR Admin, ESS, MSS, Tenant Admin, and Platform Admin after the UI compaction repairs from Phase 2 and Phase 2A. This is local regression evidence only and does not certify production readiness.

## Frozen Inventory

Playwright discovery was frozen from `pnpm --dir web exec playwright test --list --reporter=line`.

- Raw discovered Playwright tests: `1025`
- Scoped HRMS workspace tests: `963`
- Manifest: `docs/qa/evidence/phase3-post-compaction/playwright-scoped-manifest.csv`
- Summary: `docs/qa/evidence/phase3-post-compaction/manifest-summary.md`

| Module | Tests |
| --- | ---: |
| HR Admin | 583 |
| ESS | 211 |
| MSS | 21 |
| Tenant Admin | 93 |
| Platform Admin | 55 |

## Batch Results

| Batch | Scope | Result | Evidence |
| --- | --- | --- | --- |
| 01 | P0 frontend validations, ESS/MSS control centers, modal stability, workflow handoff | `42 passed`, `1 skipped` | `docs/qa/evidence/phase3-post-compaction/01-p0-validation-ess-mss-platform.log` |
| 03/04 | Focused HR Admin configuration and navigation repair/rerun | `10 passed` after repair | `03-focused-hr-admin-config-navigation.log`, `04-focused-hr-admin-config-navigation-rerun.log` |
| 06/09 | Focused HR Admin setup-policy repair/rerun | `9 passed` after repair | `06-focused-hr-admin-setup-policy.log`, `09-focused-hr-admin-setup-policy-rerun.log` |
| 10 | Broad HR Admin P0 batch | stopped after oversized-batch timeouts; focused repaired suites passed separately | `10-p0-hr-admin-payroll-core-final.log` |
| 11 | Platform Admin and Tenant Admin P0 batch | `28 passed`, `9 failed`, `3 not run` | `11-p0-platform-tenant-admin.log` |
| 12 | Focused Platform/Tenant failed-test rerun subset | `4 failed` | `12-focused-platform-tenant-failure-rerun.log` |

## Automation Repairs Applied

- `configuration-form-flows.spec.ts`
  - Updated employee create coverage for the compact stepper: navigate to Structure before legal-entity dependent dropdown assertions.
  - Updated leave policy preview validation to open the current preview dialog and run the dialog-scoped preview action.
- `hr-admin-navigation-control-center-95.spec.ts`
  - Fixed strict nav locator collisions for entitlement-disabled compact nav rows.
  - Accepted current disabled nav state for payroll-cycle routes when local tenant limits disable payroll links.
  - Avoided hanging on hidden mobile `Menu` control when the compact mobile shell renders without that summary.
- `hr-admin-setup-policy-frontend-validation.spec.ts`
  - Updated leave type and assignment removal coverage for the current Inspect -> Remove dialog model.
  - Updated leave policy preview dialog names.
  - Replaced removed `.queue-toolbar` dependency with accessible main/filter controls and opened compact `More filters` details for accrual.
- `platform-admin-crud-state-transition-certification.spec.ts`
  - Removed stale dependence on transient `Tenant created.` notice; API and subsequent tenant/onboarding assertions remain.
- `platform-admin-dashboard-certification.spec.ts`
  - Scoped duplicated activation blocker tenant text with `.first()`.
  - Updated command shortcut count from 6 to current 7.
- `platform-admin-launch-readiness-certification.spec.ts`
  - Replaced stale `Policy pack created.` notice dependency with visible created template evidence.
- `platform-admin-rbac-permissions-certification.spec.ts`
  - Updated denied Platform Admin redirect expectation to allow current safe HR Admin landing for HR personas.
- `platform-admin-tabs-pagination-certification.spec.ts`
  - Replaced brittle focus assertion after invalid create submit with `aria-invalid` validation on the Code field.
- `tenant-admin-boundary-certification.spec.ts`
  - Removed stale dependency on exact `Tenant admin restricted` copy while preserving denial of Tenant Admin workspace shell.
- `tenant-admin-roles-certification.spec.ts`
  - Removed stale dependency on transient `Role created.` toast; role row visibility remains asserted.

TypeScript verification: `pnpm --dir web exec tsc --noEmit` passed.

## Remaining Failures / Blockers

| Priority | Test | Classification | Evidence / Notes |
| --- | --- | --- | --- |
| P0 | `platform-admin-tabs-pagination-certification.spec.ts` tab routing | UI-compaction automation or app selected-state defect | After opening Launch Readiness, URL/panel navigation occurs but the tab retained `aria-selected="false"`. Needs UI check before changing expectation. |
| P0 | `tenant-admin-boundary-certification.spec.ts` denied API checks | Environment/performance blocker | `/api/tenant-admin/trust-audit` timed out for a denied persona in local batch/focused rerun. Need isolate backend query latency or proxy timeout. |
| P0 | `tenant-admin-boundary-certification.spec.ts` active tenant surfaces | Environment/performance blocker | Navigation to `/tenant-admin/security-readiness` aborted under local load. Needs focused rerun after backend health check. |
| P1 | `tenant-admin-roles-certification.spec.ts` role update dialog | UI behavior or automation drift | Create path succeeds and row appears; update dialog remains open after submit. Need inspect whether save error/status is shown or dialog-close behavior changed. |
| P1 | `platform-admin-crud-state-transition-certification.spec.ts`, dashboard, launch readiness | Automation drift patched but not rerun in exact focused set due grep command selecting only four tests | Needs direct rerun of those specs/tests. |
| P1 | HR Admin broad P0 batch | Batch sizing issue | Individual repaired suites passed; oversized 66-test batch timed out during broad navigation and organization CRUD setup. Continue in smaller module batches. |
| P1 | HR Admin payroll frontend validation | Fixture/entitlement issue | Local demo tenant is over active employee/payroll limits; payroll setup route returns 403. Do not bypass permissions. Requires a payroll-entitled fixture tenant or documented exclusion. |

## Existing Skip Investigation

- `ess-frontend-validation.spec.ts`: one skip remains for unavailable submittable leave type in the tenant. Classification: fixture gap / valid exclusion for this local tenant data shape. It was not introduced by Phase 3 repairs.

## Commands Executed

```bash
pnpm --dir web exec playwright test --list --reporter=line
```

```bash
../.venv/bin/python manage.py bootstrap_demo_workspace
../.venv/bin/python manage.py runserver 127.0.0.1:8000
HRMS_ENABLE_DEMO_DATA=true HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 NEXT_DIST_DIR=.next/playwright pnpm exec next dev --hostname 127.0.0.1 --port 3100
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/hr-admin-core-frontend-validation.spec.ts tests/e2e/ess-frontend-validation.spec.ts tests/e2e/mss-frontend-validation.spec.ts tests/e2e/tenant-admin-frontend-validation.spec.ts tests/e2e/platform-admin-frontend-validation.spec.ts tests/e2e/ess-control-center-certification.spec.ts tests/e2e/ess-mss-workflow-certification.spec.ts tests/e2e/mss-control-center-certification.spec.ts tests/e2e/ess-mss-modal-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/configuration-form-flows.spec.ts tests/e2e/hr-admin-navigation-control-center-95.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-setup-policy-frontend-validation.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/platform-admin-frontend-validation.spec.ts tests/e2e/platform-admin-dashboard-certification.spec.ts tests/e2e/platform-admin-tabs-pagination-certification.spec.ts tests/e2e/platform-admin-crud-state-transition-certification.spec.ts tests/e2e/platform-admin-rbac-permissions-certification.spec.ts tests/e2e/platform-admin-permission-catalog-certification.spec.ts tests/e2e/platform-admin-launch-readiness-certification.spec.ts tests/e2e/tenant-admin-frontend-validation.spec.ts tests/e2e/tenant-admin-users-dialog-certification.spec.ts tests/e2e/tenant-admin-roles-certification.spec.ts tests/e2e/tenant-admin-support-access-certification.spec.ts tests/e2e/tenant-admin-boundary-certification.spec.ts --workers=1 --reporter=line
```

```bash
pnpm --dir web exec tsc --noEmit
```

## Phase 3C.2A Fixture Stabilization (2026-10-15)

Broad P1/P2 execution was paused to address shared-fixture instability. Northstar remains unchanged at 2,377 employees / 2,274 active employees. Historical test-like records could not be assigned reliable ownership from naming alone, so none were changed or deleted.

An isolated, manifest-backed Playwright workspace command and helper now provision guarded `pw-qa-*` Enterprise sandbox tenants with deterministic user, employee, organization, payroll, salary, leave, and attendance UUIDs. Payroll periods and pay groups are validated against the same calendar. Cleanup requires exact ownership markers, removes protected payroll dependencies in order, and verifies absence.

Verification completed with 3 backend tests passed, TypeScript passed, one focused browser fixture contract passed, reciprocal cross-tenant employee reads returning HTTP 404, and successful cleanup. The original browser contract failure (GET against mutation-only BFF routes) is retained in evidence and was automation-only.

The 27 open P1 failures are classified as 5 fixture contamination/nondeterminism, 6 local environment/resource issues, 16 compact-UI automation drift, and 0 newly proven application defects. Historical register statuses remain unchanged until focused reruns. Full evidence and exact IDs are in `docs/qa/evidence/phase3-post-compaction/314-phase3c2a-fixture-stabilization.md`.

## Phase 3C.2 P1 Continuation

Date: 2026-10-15

The frozen P1 inventory contains 151 unique tests. After batches `298` through `312`, the current deduplicated register is 111 passed, 27 failed, 4 skipped, 0 blocked, and 9 not run. Detailed commands, classifications, and remaining IDs are in `docs/qa/evidence/phase3-post-compaction/313-phase3c2-p1-closure-status.md` and the Phase 3C execution register.

Broad execution stopped after authorized payroll fixtures ceased to be deterministic: the local tenant has 2,377 employees while setup option payloads can be capped at 500, and one negative-control fixture selected a pay group from a different calendar than its new payroll period. Server-side validation correctly rejected that mismatch. Phase 3C.2 is not complete, and P2 execution has not started.

## Phase 3C P1/P2 Progress - 2026-10-15

### Frozen Inventory

- Frozen manifest: 963 unique tests.
- Completed P0 baseline retained: 479 tests (`477 passed`, `2 justified skips`).
- Non-P0 register: 484 unique tests, classified deterministically as `151 P1` and `333 P2`; no unclassified cases.
- Current P1: `56 passed`, `1 failed`, `1 blocked`, `1 skipped`, `92 not run`.
- Current P2: `0 passed`, `0 failed`, `0 blocked`, `0 skipped`, `333 not run`.

The deduplicated register is `docs/qa/evidence/phase3-post-compaction/phase3c-p1-p2-execution-register.csv`. Historical failures and rerun evidence remain in logs `262` through `296`.

### Completed P1 Batches

- Access/routing: 12 passed, 1 existing conditional skip (`P3-0976`).
- Forms/documents: 14 passed; one mixed-batch form-load flake passed in isolation.
- Governance assignments: 14 passed after compact locator repairs and the attendance-assignment refresh defect fix.
- Tenant Admin console: 10 passed after exact accessible role-checkbox scoping.
- Operational queues: 6 passed after compact filter repairs and record-title overflow remediation.

### Defects And Repairs

- Attendance assignment saves recalculated all 27,468 tenant attendance records because an unsaved UUID assignment was treated as persisted and supplied an empty previous scope. Refreshes now target affected assignment scopes, skip inactive-to-inactive saves, and retain old/new scope refresh on edits. Backend attendance tests: 21 passed.
- Organization master detail overflowed a 1280px viewport by 32-47px for long seeded names. Shared record-card titles now constrain and wrap content; the focused organization workflow passes.
- MSS decision success feedback was unmounted immediately by `onCompleted={onClose}`. Review dialogs now remain mounted until the existing refresh reconciles the queue, making success state and toast observable.
- Automation drift repaired centrally or in owning suites: dynamic edit headings, exact record IDs, paginated API unwrapping, scoped Apply buttons, compact filter disclosure, current URL-driven lifecycle details, current review-dialog accessible names, table-row/detail-dialog locators, and exact role checkbox names.

### Current Blocker

Broad Phase 3C execution paused on `P3-0614`. The shared EMP-0042 fixture contains multiple `LeaveBalance` rows for the same CL Standard policy with divergent balances (observed values include `618.17`, `1.67`, and `1.00`), while leave submission resolved another effective balance (`-0.33`). This is a fixture-integrity blocker; ambiguous records were not deleted or bypassed. `P3-0613` retains a current failed status pending one focused rerun after its ESS detail-dialog locator repair. `P3-0615` and `P3-0616` remain not run after the latest application feedback fix.

### Phase 3C.1 Leave-Balance Fixture Integrity

Date: 2026-10-15

`P3-0614` is resolved. The apparent duplicate `CL Standard` balances are three valid unique policy periods (2026, 2027, and 2028), not duplicate rows. The root cause was fixture contamination from an obsolete Playwright helper that iterated every period row and omitted `effective_date`, causing repeated credits to the current period. A future-dated test also left the 2027 row recalculated at a later accrual point, explaining the stored `1.67` versus submission-time `-0.33` result for an earlier 2027 date.

No application business-logic change was required. The helper now selects exactly one matching policy period, supplies the request date, and only credits a shortfall. Existing transactions were preserved. Three isolated backend regressions verify idempotent one-row-per-period generation, effective-period adjustment selection, and rejection restoration without affecting another period.

Focused results:

| Scope | Result |
| --- | --- |
| New isolated leave-balance backend regressions | `3 passed` |
| Server-side leave-balance tenant-isolation API regression | passed |
| Complete leave runtime backend class | `24 passed` |
| P3-0614 focused browser rerun | `1 passed` |
| P3-0613 through P3-0616 serial browser rerun | `4 passed` |
| TypeScript | passed |

The current P1 register is `60 passed`, `0 failed`, `0 blocked`, `1 skipped`, and `90 not run`. P2 remains `333 not run`. Historical failed/blocked evidence remains in logs `295` and `296`; current outcomes point to `297-phase3c1-leave-balance-fixture-integrity.md`.

The broader 24-test leave runtime class initially exposed one unrelated date-dependent failure because a fixed 2026 date had become backdated. That test now uses the suite's existing dynamic weekday helper and was rerun with the complete class. Broad P1/P2 execution remains paused pending the next explicit continuation; local results do not certify production readiness.

Phase 3C is **not complete**. P2 execution has not started, and no production-readiness claim is made.

## Phase 3B.6 Final P0 Blocker Closure

Date: 2026-10-15

`P3-0612` is resolved and now Passed. Its prior Phase 3B.5 Blocked result remains in the execution-register evidence history.

### Isolation Result

The test provisioned two uniquely named Enterprise sandbox tenants through the supported Platform Admin tenant API, added a primary contact to each tenant, and provisioned separate active `hr-admin` users through the supported first-admin API. The temporary HR Admin roles received the canonical employee/document permissions through normal `RolePermission` records; no platform, tenant, RBAC, or entitlement check was bypassed.

Each HR Admin created an employee and uploaded an identity document within its own tenant. Tenant A could list, retrieve, update, and download its own records. Tenant A could not see Tenant B records in the compact browser directory/document queue or API lists, and server-side object requests produced the following results:

| Operation by Tenant A against Tenant B | Status |
| --- | ---: |
| Employee retrieve | `404` |
| Employee update | `404` |
| Employee delete | `405` (operation unsupported for all tenants) |
| Document retrieve via Django API | `404` |
| Document update | `404` |
| Document delete | `405` (operation unsupported for all tenants) |
| Document attachment download | `404` |

The denial bodies contained no Tenant B employee code, document title, marker, or attachment content. Re-authentication as Tenant B confirmed its employee and document remained unchanged and its attachment remained downloadable. This demonstrates server-side tenant scoping rather than UI-only filtering.

### Fixture Cleanup

The test deletes run-scoped uploaded files, then cascades only the two temporary `qa-p30612-*` tenants and removes only the associated `qa.p30612.*` users in a `finally` block. Post-run database checks returned `0` matching tenants and `0` matching users. Existing certification tenants and identities were untouched.

### Evidence And Verification

| Evidence | Result |
| --- | --- |
| `253-phase3b6-p30612-isolation.log` | Historical environment failure before fixture creation: frontend started without explicit upstream API URL. |
| `254-phase3b6-p30612-isolation-rerun.log` | Historical fixture-helper database mismatch; run-scoped records subsequently cleaned from the actual local DB. |
| `255-phase3b6-p30612-isolation-final.log` | Historical proxy detail `GET` mismatch; Django supports detail GET while the Next proxy exposes PATCH only. |
| `256-phase3b6-p30612-isolation-final.log` | First complete passing isolation run: `1 passed`. |
| `257-phase3b6-p30612-isolation-evidence-final.log` | Final passing run with corrected environment metadata: `1 passed` (`22.8s`). |
| `phase3c3/03-cross-tenant-prerequisite-disposition.json` | Full browser/API status matrix, temporary tenant IDs, and cleanup disposition. |
| `258-phase3b6-neighbor-security-documents.log` | Existing broad cross-tenant object isolation plus live HR document workflow: `2 passed`. |
| `259-phase3b6-backend-documents.log` | Document domain backend suite: `5 passed`. |
| `260-phase3b6-backend-document-api.log` | Focused document RBAC and artifact upload/download API tests: `2 passed`, `355 deselected`. |
| `261-phase3b6-typescript.log` | `tsc --noEmit` passed with no diagnostics. |

Commands:

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/phase3c3-employee-lifecycle-workforce-e2e.spec.ts -g "HRADM-E2E-020" --workers=1 --reporter=line --trace=retain-on-failure
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/phase7b-cross-tenant-object-isolation.spec.ts tests/e2e/hr-admin-employee-documents-live-workflow.spec.ts --workers=1 --reporter=line
```

```bash
cd backend && ../.venv/bin/python manage.py test apps.documents.tests --keepdb --noinput
cd backend && ../.venv/bin/python -m pytest tests/test_phase0_api_smoke.py -k 'custom_hr_document_viewer_role_gates_document_mutations or hr_admin_can_upload_and_download_employee_document_artifact' -q
pnpm --dir web exec tsc --noEmit
```

### Final P0 Register

| Module | Passed | Failed | Skipped | Blocked | Not Run | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HR Admin | 280 | 0 | 1 | 0 | 0 | 281 |
| ESS | 121 | 0 | 0 | 0 | 0 | 121 |
| MSS | 13 | 0 | 0 | 0 | 0 | 13 |
| Tenant Admin | 27 | 0 | 1 | 0 | 0 | 28 |
| Platform Admin | 36 | 0 | 0 | 0 | 0 | 36 |
| **Total** | **477** | **0** | **2** | **0** | **0** | **479** |

The two retained skips remain `P3-0578` (no incomplete payroll-provider lane in the fixture) and `P3-0890` (valid local last-admin lockout fixture exclusion). Every unique P0 ID has an evidenced outcome, and there are no failed, blocked, or not-run P0 IDs.

**Phase 3B decision:** complete for the frozen local P0 manifest. This local regression closure does not certify production readiness and does not supersede external launch gates.

## Latest Status

The preceding **Phase 3B.6 Final P0 Blocker Closure** supersedes the interim certification-status sections: `477 passed`, `2 skipped`, `0 blocked`, `0 failed`, and `0 not run` across `479` unique P0 IDs. Phase 3B is complete for the frozen local P0 manifest; this does not certify production readiness.

## Phase 3B.5 P0 Closure Update

Date: 2026-10-14

The frozen P0 execution register has been reconciled without rebuilding the 963-test master inventory. All `479` unique in-scope P0 IDs now have exactly one current status, while the evidence column and this report retain historical failure and rerun outcomes.

### Current Unique P0 Status

| Module | Passed | Failed | Skipped | Blocked | Not Run | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HR Admin | 279 | 0 | 1 | 1 | 0 | 281 |
| ESS | 121 | 0 | 0 | 0 | 0 | 121 |
| MSS | 13 | 0 | 0 | 0 | 0 | 13 |
| Tenant Admin | 27 | 0 | 1 | 0 | 0 | 28 |
| Platform Admin | 36 | 0 | 0 | 0 | 0 | 36 |
| **Total** | **476** | **0** | **2** | **1** | **0** | **479** |

Current outcome coverage is `479/479` (`100%`); the passing rate is `476/479` (`99.37%`). Phase 3B is **not complete** because one P0 isolation proof remains blocked.

### Non-Passing IDs

| ID | Status | Disposition |
| --- | --- | --- |
| `P3-0578` | Skipped | Valid fixture exclusion: the tenant has no incomplete payroll-provider lane against which to prove activation cannot be bypassed. |
| `P3-0612` | Blocked | The Playwright shell passed, but the generated evidence correctly records Blocked because the local demo workspace contains only one tenant. A two-tenant employee/document object-isolation proof cannot be executed from this fixture. |
| `P3-0890` | Skipped | Valid local fixture exclusion for the Tenant Admin last-admin lockout guard. |

There are no current Failed or Not Run P0 IDs. `P3-0612` is the only remaining manifest ID requiring execution in an authorized second-tenant fixture.

### Phase 3B.5 Repairs And Root Causes

- Phase 9 workforce import used obsolete `.record-card` attendance verification. It now scopes assertions to the compact attendance table row and accessible leave-detail region. The isolated 100-worker browser import and payroll lifecycle passed.
- P100 payslip publication was affected by fixture contamination and slow open-review exception creation. The scenario now creates an isolated authorized run in `inputs_locked`, resolves that run through bounded pagination, and verifies valid state transitions. Backend open-review now bulk-creates validated automatic exceptions, preserving payroll locks, audit behavior, and tenant/RBAC enforcement.
- The Phase 6 ESS/MSS workflow used stale filter, API-shape, and dialog assumptions. It now opens compact filters, uses current accessible review dialogs, chooses deterministic available working dates, and verifies persisted decisions in the ESS UI. This includes the compact Manager review control.
- Finance handoff certification exposed a genuine completeness defect: the bank-advice UI/export fetched only the first 50 artifacts and could omit the selected run in larger tenants. The bounded request now includes up to 500 handoffs/artifacts/delivery records, and the test scopes setup to the selected handoff.
- Manager leave detail authorization returned 404 for a valid second-level reviewer because pending workflow UUIDs were compared without string normalization. The selector now normalizes IDs while preserving scope and permission checks.
- The local Nisha fixture contained 221 leaked temporary setup roles, causing permission verification timeouts and defensive 403 responses. Only non-system `qa-*-setup-` roles and their temporary assignments were removed; product roles, permissions, and business data were not broadened.

### Durable Final Evidence

| Evidence | Result |
| --- | --- |
| `247-phase3b5-output-payslip-final-reseed.log` | Isolated authorized P100 output fixture created. |
| `248-phase3b5-output-payslip-final.log` | P100 payslip publication/read receipt: `1 passed` (`1.1m`). |
| `249-phase3b5-finance-handoff-final.log` | Finance handoff/compliance: `1 passed` (`55.2s`). |
| `250-phase3b5-phase9-workforce-final.log` | Phase 9 100-worker import: `1 passed` (`6.5m`). |
| `251-phase3b5-phase6-mutations-final.log` | ESS leave and attendance manager workflows: `2 passed` (`1.3m`). |
| `252-phase3b5-focused-neighbor-regression.log` | Neighboring bank-advice, ESS/MSS workflow, and MSS frontend checks: `7 passed` (`1.5m`). |

The Enterprise fixture accepted the additional 100-worker import, providing regression evidence that `employee_limit` did not unintentionally block the required workflow.

### Verification Commands

```bash
cd backend && ../.venv/bin/python manage.py seed_pilot_100_calculation --prefix PILOT100_20260912 --run-code-suffix output-payslip --run-name-suffix 'Output Payslip ESS Gate' --scenario output_payslip_ess_gate --input-profile-ref tenant.payroll.input.pilot100.outputs.v1 --output-file ../web/test-results/pilot-100-output-payslip-local-manifest.json
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-output-payslip-ess-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 PLAYWRIGHT_PILOT100_PREFIX=PILOT100_20260912 pnpm --dir web exec playwright test tests/e2e/pilot-100-finance-handoff-compliance-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/phase9-bulk-upload-100-workforce-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 PLAYWRIGHT_PHASE6_MUTATE=true PLAYWRIGHT_PHASE6_PREPARE=true pnpm --dir web exec playwright test tests/e2e/user-journey-phase6-ess-mss-practical-workflow.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/bank-advice-report-certification.spec.ts tests/e2e/ess-mss-workflow-certification.spec.ts tests/e2e/mss-frontend-validation.spec.ts --workers=1 --reporter=line
```

```bash
pnpm --dir web exec tsc --noEmit
cd backend && ../.venv/bin/python manage.py test apps.payroll.tests --keepdb --noinput
cd backend && ../.venv/bin/python manage.py test apps.leave_management.tests.LeaveRequestWorkflowPolicyRuntimeTests.test_partially_approved_leave_moves_to_second_level_mss_queue_with_track --keepdb --noinput
```

TypeScript passed. All `17` payroll backend tests passed. The focused manager leave authorization regression passed. The complete leave-management suite produced `27 passed` and one unrelated date-sensitive error: `test_friday_to_monday_excludes_weekend_when_policy_disallows_overlap` now supplies a calendar date rejected by the current backdated-leave rule. This is retained as a backend test-fixture maintenance item and is not hidden by a timeout or skip.

### Phase 3B.5 Decision

All runnable P0 tests have an evidenced current outcome and no current P0 failures or not-run entries remain. Phase 3B cannot be marked complete until `P3-0612` is executed with a valid second tenant or is formally reclassified outside the P0 scope. These local Playwright results do not certify production readiness, and all previously identified launch gates remain in force.

## Phase 3B.4 Batch 92 Resolution Update

Date: 2026-10-14

Phase 3B.4 triaged the `92-phase3b3-hr-admin-payroll-control-pilot-batch.log` failures without repeating the 333 previously passing tests. Current register rows for the affected P0 IDs now preserve the historical batch-92 failures and record the repaired rerun evidence.

### Results

| Evidence | Scope | Result |
| --- | --- | --- |
| `95-phase3b4-pilot-input-lock-focused.log` | Original P0 blocked payroll input lock repro | Failed: UI enabled `Lock selected run inputs` for a blocked 100-employee run |
| `96-phase3b4-pilot-input-lock-focused-after-fix.log` | Same lock scenario after source fix | Passed |
| `112-phase3b4-phase5a-payroll-control-full-after-navigation-settle.log` | Phase5A payroll control suite | `5 passed` |
| `107-phase3b4-pilot-100-inputs-full-after-fixes.log` | P100 input report/ESS/MSS/lifecycle suite | `4 passed` |
| `135-phase3b4-payroll-input-exceptions-after-ready-wait.log` | Payroll input exceptions report/export/drilldown focused rerun | `1 passed` |
| `137-phase3b4-batch92-full-default-prefix-after-fixes.log` | Full original batch-92 spec group using default `PILOT100_20260912` fixture prefix | `27 passed`, `1 failed`, `3 not run`; only remaining failure was stale support-agent safe-fallback text |
| `138-phase3b4-credential-time-tail-after-support-fallback.log` | Credential matrix and time-to-payroll tail after support fallback update | `14 passed` |
| `139-phase3b4-web-tsc.log` | TypeScript | Passed with exit 0 |
| `140-phase3b4-backend-common-tests.log` | Backend common tests | `21 passed` |

### Root Causes Resolved

- P0 payroll input lock defect: the compact lock panel derived eligibility from the paginated visible snapshot subset. Blockers for E096-E100 were outside the first page, so the button enabled despite backend lock guards. The UI now uses authoritative run-level counts and reconciliation summary for lock eligibility while keeping the visible snapshot examples for messaging.
- Phase5A metric/control failures: compact metric tiles no longer used the obsolete `.metric-tile` surface and navigation assertions raced immediately after `domcontentloaded`. Tests now use the shared compact metric helper and wait for settled navigation where links change pages.
- Attendance register P100 search/export failure: the report’s compact client filter could not reliably search high-volume local evidence. The report now fetches server-filtered attendance rows through an authenticated proxy and the backend page-size cap is bounded at 500 for this report path.
- Payroll input exceptions report failure: the report depended on the first payroll input setup page, which can omit P100 rows after many disposable local runs. The report/export path now uses the dedicated full snapshot list as the evidence source and keeps setup metadata for runs and manifest lineage.
- Payroll output artifact lookup failure: initial batch scans can miss the P100 output batch when many disposable output batches exist. The test now scopes artifact retrieval to the located batch before asserting published register/payslip evidence.
- Credential matrix drift: current compact routing safely redirects unauthorized employees to their allowed ESS workspace and support agents without workspace membership to the `No workspace access is assigned` fallback. Assertions now reflect those secure current states while preserving denial/no-leak checks.
- ESS/MSS label drift: `Self service` and `Manager inbox` expectations were updated to current accessible headings (`My workspace`, `Manager approvals`) where applicable.
- Compact payroll input drilldown timing: overflow was asserted during route transition. The drilldown now waits for the destination page readiness contract before retaining the horizontal-overflow assertion.

### Modified Areas

- Backend/API: payroll setup pagination cap and attendance record report cap in `backend/apps/common/api_views.py`.
- Frontend routes/reports: attendance register proxy/export, payroll input exceptions report/export, payroll input setup proxy query forwarding, payroll input lock panel.
- Compact CSS: scoped payroll input detail wrapping for long hashes/source evidence.
- Playwright helpers/specs: compact metric helper use, payroll/P100 report assertions, security isolation fixture lookup, credential matrix safe fallbacks.

### Remaining Notes

- The original `PILOT100_20260912` fixture is the batch-92 source of truth for published output artifacts. A local alternate `P100LOCAL_P5` fixture also exists and was useful for input-lock repro, but it does not have a published output batch.
- No unresolved P0 payroll-control application/security blocker remains from batch 92 after the default-prefix rerun and credential/time tail rerun.
- Phase 3B is not complete solely from this batch. Other manifest rows outside the batch-92 scope remain not-run or separately tracked, and production readiness is not certified from local Playwright results.

### Commands Executed

```bash
cd backend && ../.venv/bin/python manage.py bootstrap_demo_workspace && ../.venv/bin/python manage.py runserver 127.0.0.1:8000
```

```bash
cd web && HRMS_ENABLE_DEMO_DATA=true HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 NEXT_DIST_DIR=.next/playwright pnpm exec next dev --hostname 127.0.0.1 --port 3100
```

```bash
cd backend && ../.venv/bin/python manage.py shell -c "from apps.tenants.models import Tenant; from apps.common.selectors import update_saas_commercial_subscription, describe_saas_commercial_control; t=Tenant.objects.get(code='northstar-foods'); update_saas_commercial_subscription(t, subscription_plan='enterprise', status='active', billing_provider_ref='manual_billing.v1', billing_account_ref='phase3b4-browser-certification', current_period_end='2027-03-31', actor_identifier='phase3b4'); c=describe_saas_commercial_control(t); print(t.subscription_plan, c['subscription']['status'], [(s['scope_ref'], s['allowed']) for s in c['enforcement']['scopes'] if s['scope_ref']=='payroll_core'])"
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/pilot-credential-matrix-certification.spec.ts tests/e2e/phase5a-payroll-control-room-certification.spec.ts tests/e2e/pilot-100-inputs-certification.spec.ts tests/e2e/pilot-100-payroll-input-snapshot-certification.spec.ts tests/e2e/pilot-100-security-isolation-certification.spec.ts tests/e2e/time-to-payroll-control-certification.spec.ts --workers=1 --trace=retain-on-failure --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/pilot-credential-matrix-certification.spec.ts tests/e2e/time-to-payroll-control-certification.spec.ts --workers=1 --trace=retain-on-failure --reporter=line
```

```bash
pnpm --dir web exec tsc --noEmit
```

```bash
cd backend && ../.venv/bin/python manage.py test apps.common.tests
```

## Phase 3B.3 P0 Continuation Update

Date: 2026-10-14

Phase 3B.3 resumed from the frozen `963` scoped HRMS manifest and the existing Phase 3B execution register. The register was normalized so each unique P0 row has one current status, with historical failed reruns preserved in evidence notes.

### Current Unique Register Status

- Passed: `333`
- Failed: `11`
- Skipped: `2`
- Not run: `133`
- Remaining not-run by module: HR Admin `61`, ESS `46`, Platform Admin `13`, Tenant Admin `10`, MSS `3`

### Evidence Added

| Evidence | Scope | Result |
| --- | --- | --- |
| `69-phase3b3-hr-admin-reports-batch.log` | HR Admin reports batch | `23 passed` |
| `70-phase3b3-hr-admin-payroll-functional-batch.log` | HR Admin payroll functional batch | `25 passed`, `1 skipped`, `1 failed` before repair |
| `71-phase3b3-payroll-review-focused-rerun.log` | Payroll review focused rerun | `3 passed` |
| `72-phase3b3-payroll-providers-json.json` | Payroll providers skip classification | provider activation skip is a fixture gap: no incomplete lane |
| `73-phase3b3-hr-admin-policy-ops-timeleave-batch.log` | HR Admin policy/ops/time-leave batch | `21 passed`, `1 skipped`, `8 failed` before repair |
| `74-phase3b3-attendance-policy-focused-trace.log` | Attendance policy CRUD trace reproduction | failed; create persisted but UI remained on form past timeout |
| `75-phase3b3-attendance-backend-tests.log` | Attendance backend suite after create-refresh fix | `21 passed` |
| `77-phase3b3-attendance-backend-tests-refresh-scope.log` | Attendance backend suite after assignment-scoped refresh fix | `21 passed` |
| `78-phase3b3-attendance-policy-focused-rerun-after-refresh-scope.log` | Original attendance policy CRUD scenario | `1 passed` |
| `79-phase3b3-batch73-failed-specs-rerun.log` | Repaired ops/policy focused rerun | `14 passed`, time/leave residual drift |
| `83-phase3b3-time-leave-full-rerun-final.log` | Time/leave focused rerun | `5 passed` |
| `84-phase3b3-web-tsc.log` | TypeScript verification | passed with no compiler output |
| `87-phase3b3-hr-admin-enterprise-ui-final.log` | HR Admin enterprise UI route/responsive coverage | `35 passed` |
| `88-phase3b3-hr-admin-ux-unified-batch.log` | E90 UX plus unified route batch | E90 passed; unified helper failures isolated |
| `91-phase3b3-hr-admin-unified-groups-2-3-rerun.log` | Unified route failed groups rerun | `2 passed` |
| `92-phase3b3-hr-admin-payroll-control-pilot-batch.log` | Payroll/control/pilot batch | `5 passed`, `11 failed`, `15 did not run`; broad execution stopped |

### Repairs Completed

- Attendance policy CRUD blocker: backend no longer runs tenant-wide current-month attendance refresh when creating or editing an unassigned attendance policy. Assigned policy edits and assignment changes still refresh attendance records. This preserves policy runtime behavior while removing the minute-plus create/edit hang in the demo tenant.
- Payroll review automation: replaced a broad hidden text assertion with scoped visible headings `Exception actions` and `Approval trail`.
- Import history automation: replaced obsolete `.metric-tile` assertion with the shared compact metric helper.
- Time/leave automation: updated compact labels and disclosure behavior for attendance records, regularizations, operations, policy, shift, and assignment route checks.
- Policy governance automation: scoped attendance policy edit fields to the edit dialog and reused the existing save-failure helper for document requirement validation.
- Enterprise UI automation: switched stale cookie injection to the shared authenticated HR admin fixture and removed a hard-coded launch-remediation row count.
- Unified route automation: widened compact content-surface detection to current HR Admin panel/card classes, filtered visible surfaces, forced disclosure-summary audit clicks after scroll, and split static route groups from 12 to 4 routes per test to avoid local route-sweep timeouts.

### Stop Condition

Broad Phase 3B.3 execution stopped on the payroll/control/pilot batch because it produced unresolved P0-class failures requiring triage before continuing:

- Phase 5A payroll control-room tests show compact metric label drift across readiness, calculations, review, outputs, and handoff surfaces.
- Pilot-100 payroll input report expected seeded `PILOT100_20260912_E0` rows that are absent from the current filtered report.
- Pilot ESS/MSS heading expectations (`Self service`, `Manager inbox`) do not match the current workspace UI or redirect state.
- The blocked pilot payroll input run showed `Lock selected run inputs` enabled where the P0 test expected it disabled. This must be investigated as either a fixture state mismatch or a genuine payroll lock control defect before more broad P0 execution.
- Security/credential matrix tests expecting `Choose your workspace` or `Self Service` after denied cross-role access did not see those surfaces. This requires focused verification of current denied-route behavior before changing expectations.

Phase 3B.3 is not complete. Do not claim production readiness from these local Playwright results.

## Phase 3B.2 P0 Continuation Update

Date: 2026-10-14

Phase 3B.2 resumed after the Attendance Policy CRUD blocker was resolved in Phase 3B.1. The frozen P0 execution register at `docs/qa/evidence/phase3-post-compaction/phase3b-p0-execution-register.csv` remains the source of truth for unique IDs and historical reruns.

### Coverage Register

- Register rows tracked: `479`
- Current unique statuses after Phase 3B.2 update: `124 passed`, `66 passed-or-skipped`, `289 not-run`
- Remaining not-run by module: `HR Admin 202`, `ESS 59`, `Platform Admin 14`, `Tenant Admin 10`, `MSS 4`
- Final Phase 3B.2 ESS/MSS evidence applied to the register: `64-phase3b2-ess-mss-launch-final-green.log`

### Batch Results

| Evidence | Scope | Result |
| --- | --- | --- |
| `37-phase3b2-attendance-compliance-reports.log` | Attendance and compliance report batch before Enterprise fixture correction | `8 passed`, `2 failed` |
| `38-phase3b2-compliance-rerun-enterprise.log` | Compliance rerun after authorized Enterprise fixture | `4 passed` |
| `39-phase3b2-payroll-compliance-reports-a.log` | Payroll/compliance report batch A | `10 passed` |
| `40-phase3b2-payroll-reports-b.log` | Payroll report batch B | `10 passed` |
| `41-phase3b2-payroll-reports-c.log` | Payroll report batch C | `10 passed` |
| `46-phase3b2-ess-launch-post-css-fix.log` | Focused ESS launch rerun after compact selector/CSS repairs | `12 passed` |
| `60-phase3b2-mss-rbac-full.log` | MSS RBAC spec after compact dialog repairs | `2 passed` |
| `61-phase3b2-ess-mss-launch-final.log` | Combined ESS/MSS rerun before final date-window hardening | `16 passed`, `1 failed` |
| `63-phase3b2-mss-rbac-full-final.log` | MSS RBAC final rerun after date-window hardening | `2 passed` |
| `64-phase3b2-ess-mss-launch-final-green.log` | Final neighboring ESS/MSS launch batch | `17 passed` |
| `66-phase3b2-web-tsc-post-fix.log` | TypeScript verification after Phase 3B.2 repairs | passed with no compiler output |

### Root Causes Resolved

- ESS documents, notifications, and payslips still used obsolete `.metric-tile` selectors. These now use shared compact metric assertions against accessible text.
- ESS document upload/detail dialogs and payslip review dialogs now expose dynamic accessible names or content-scoped dialog text. Tests now use scoped dialog locators while preserving modal stability assertions.
- ESS leave filters were hidden by compact CSS because `.workspace-filter-disclosure` hiding rules applied to plain `div` filter panels as well as real collapsed `details`. The CSS now hides children only for collapsed `details.workspace-filter-disclosure`.
- ESS attendance dirty-form Escape coverage now accepts the browser confirm dialog before asserting the modal closes.
- MSS RBAC tests assumed old inline ESS submission forms and old MSS page headings. Setup now creates employee leave/attendance requests through authenticated employee APIs, while browser coverage remains on MSS dashboard, approval queue, review dialogs, RBAC denial, decision submission, and queue refresh.
- MSS leave setup originally used a future policy period and fixed dates, causing valid balance/overlap/non-working-day validation failures. It now uses a current-period date search that respects overlap and working-day rules.
- MSS dashboard and approvals assertions now reflect compact labels: `Manager dashboard`, `Manager approvals`, `Pending attendance fixes`, `Review leave approval`, and `Review attendance approval`.

### Files Modified In Phase 3B.2

- `web/src/app/globals.css`
- `web/tests/helpers/assertions.ts`
- `web/tests/e2e/ess-attendance-launch-certification.spec.ts`
- `web/tests/e2e/ess-documents-launch-certification.spec.ts`
- `web/tests/e2e/ess-leave-launch-certification.spec.ts`
- `web/tests/e2e/ess-notifications-launch-certification.spec.ts`
- `web/tests/e2e/ess-payslips-launch-certification.spec.ts`
- `web/tests/e2e/mss-rbac-approver-certification.spec.ts`
- `docs/qa/evidence/phase3-post-compaction/phase3b-p0-execution-register.csv`

### Commands Executed

```bash
cd backend && ../.venv/bin/python manage.py bootstrap_demo_workspace && ../.venv/bin/python manage.py runserver 127.0.0.1:8000
```

```bash
cd web && HRMS_ENABLE_DEMO_DATA=true HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 NEXT_DIST_DIR=.next/playwright pnpm exec next dev --hostname 127.0.0.1 --port 3100
```

```bash
../.venv/bin/python manage.py shell -c "from apps.tenants.models import Tenant; from apps.common.selectors import update_saas_commercial_subscription, describe_saas_commercial_control; t=Tenant.objects.get(code='northstar-foods'); update_saas_commercial_subscription(t, subscription_plan='enterprise', status='active', billing_provider_ref='manual_billing.v1', billing_account_ref='phase3b2-browser-certification', current_period_end='2027-03-31', actor_identifier='phase3b2'); t.refresh_from_db(); c=describe_saas_commercial_control(t); print(t.subscription_plan, c['subscription']['status'], [(s['scope_ref'], s['allowed']) for s in c['enforcement']['scopes'] if s['scope_ref']=='payroll_core'])"
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/attendance-derivation-exceptions-report-certification.spec.ts tests/e2e/attendance-exceptions-report-certification.spec.ts tests/e2e/attendance-register-report-certification.spec.ts tests/e2e/compliance-export-audit-history-certification.spec.ts tests/e2e/compliance-report-hub-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/compliance-export-audit-history-certification.spec.ts tests/e2e/compliance-report-hub-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/bank-advice-report-certification.spec.ts tests/e2e/challan-reconciliation-report-certification.spec.ts tests/e2e/compliance-summary-report-certification.spec.ts tests/e2e/esic-contribution-readiness-report-certification.spec.ts tests/e2e/lwf-readiness-report-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-adjustments-report-certification.spec.ts tests/e2e/payroll-close-readiness-report-certification.spec.ts tests/e2e/payroll-finance-report-certification.spec.ts tests/e2e/payroll-input-exceptions-report-certification.spec.ts tests/e2e/payroll-review-exceptions-report-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-settlements-report-certification.spec.ts tests/e2e/payslip-publication-report-certification.spec.ts tests/e2e/finance-handoff-exceptions-report-certification.spec.ts tests/e2e/tds-efile-readiness-report-certification.spec.ts tests/e2e/document-compliance-report-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/ess-documents-launch-certification.spec.ts tests/e2e/ess-leave-launch-certification.spec.ts tests/e2e/ess-attendance-launch-certification.spec.ts tests/e2e/ess-notifications-launch-certification.spec.ts tests/e2e/ess-payslips-launch-certification.spec.ts tests/e2e/mss-rbac-approver-certification.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/mss-rbac-approver-certification.spec.ts --workers=1 --reporter=line
```

```bash
pnpm --dir web exec tsc --noEmit
```

### Phase 3B.2 Status

The original Attendance Policy CRUD blocker is recorded as resolved in Phase 3B.1 and remains resolved. Phase 3B.2 completed the additional payroll report and ESS/MSS P0 continuation batches listed above, with the final neighboring ESS/MSS launch batch green. The broader frozen P0 manifest is not complete: `289` tracked P0 rows remain not-run in the conservative register. No new unresolved P0 functional or security blocker is open from this Phase 3B.2 slice. Production readiness is not certified from these local Playwright results.

## Phase 3B P0 Continuation Update

Date: 2026-10-14

Phase 3B continued from the frozen `963` scoped HRMS manifest and the Phase 3/3A evidence. A first-pass P0 execution register was written to `docs/qa/evidence/phase3-post-compaction/phase3b-p0-execution-register.csv` to reconcile unique test IDs before running additional batches. The register is intentionally conservative: it marks broad HRMS/P0-like candidates for review, not a new manifest replacement.

### Phase 3B Focused Results

| Evidence | Scope | Result |
| --- | --- | --- |
| `22-phase3b-hr-employee-lifecycle-docs.log` | HR Admin employee lifecycle, documents, directory, review/movement/exit | `13 passed` |
| `23-phase3b-hr-leave-attendance-policy.log` | HR Admin attendance operations, leave operations/RBAC, policy governance, leave balance import | `13 passed`, `5 failed` |
| `24-phase3b-hr-leave-policy-focused-rerun.log` | Focused leave/RBAC and policy governance rerun after selector repairs | `7 passed`, `3 failed` |
| `26-phase3b-policy-docs-rerun.log` | Focused document category/requirement rerun | `1 passed`, `1 failed` |
| `27-phase3b-policy-doc-requirement-rerun.log` | Document requirement rerun after dynamic dialog locator change, first attempt | `1 failed` due missing local regex helper |
| `28-phase3b-policy-doc-requirement-final-rerun.log` | Document requirement rerun after adding regex helper | `1 passed` |

### Phase 3B Repairs

- HR Admin leave/attendance RBAC: the compact page contains a hidden read-only balance notice inside a collapsed import details section. The assertion now scopes to the visible form notice while preserving the read-only business assertion.
- Policy governance shared row locator: compact register panels can contain full tables inside an article. `recordCard` now targets table body rows, employee directory items, or non-table record cards so assertions do not accidentally bind to the containing panel.
- Policy governance edit route handling: compact edit links use query parameters such as `editRequirement`, not only legacy fixed parameter names. The edit helper now extracts generic `edit*` IDs.
- Policy governance record selection: duplicate seeded labels can exist from prior local runs. Shared selection now chooses by persisted record ID instead of visible label where the fixture created the record.
- Document category compact assertions: the compact table no longer renders the old `HR only` visibility text. The test now verifies the persisted inactive state and the absence of `ESS upload`, preserving the intent that HR-only upload behavior remains disabled.
- Document requirement edit dialog: the compact accessible dialog name is dynamic, for example `Edit PW Test Document Category ...`. The assertion now matches the current accessible name for the created category.

### Phase 3B Blocker Status

- Historical blocker: `policy-governance-master-crud-flows.spec.ts` attendance policy CRUD stayed on `/hr-admin/attendance-policies/new` with the submit button disabled as `Saving...` until the Playwright timeout. This was carried into Phase 3B.1 for source investigation before broad Phase 3B resumed.
- Phase 3B did not continue into the remaining P0-like manifest candidates during the original Phase 3B run because of this stop rule. Phase 3B.1 below resolves the attendance policy blocker; broad Phase 3B execution remains paused until explicitly resumed.

### Phase 3B Commands Executed

```bash
cd backend && ../.venv/bin/python manage.py bootstrap_demo_workspace && ../.venv/bin/python manage.py runserver 127.0.0.1:8000
```

```bash
cd web && HRMS_ENABLE_DEMO_DATA=true HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 NEXT_DIST_DIR=.next/playwright pnpm exec next dev --hostname 127.0.0.1 --port 3100
```

```bash
../.venv/bin/python manage.py bootstrap_demo_workspace >/tmp/phase3b-seed-hr-employee.log && PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/employee-lifecycle-certification-flows.spec.ts tests/e2e/employee-documents-onboarding-certification-flows.spec.ts tests/e2e/employee-directory-certification.spec.ts tests/e2e/employee-review-movement-exit-certification-flows.spec.ts --workers=1 --reporter=line
```

```bash
../.venv/bin/python manage.py bootstrap_demo_workspace >/tmp/phase3b-seed-hr-leave-attendance.log && PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/hr-admin-attendance-operations-workflow-certification.spec.ts tests/e2e/hr-admin-leave-request-operations-certification.spec.ts tests/e2e/hr-admin-leave-attendance-rbac-certification.spec.ts tests/e2e/policy-governance-master-crud-flows.spec.ts tests/e2e/leave-balance-import-flows.spec.ts --workers=1 --reporter=line
```

```bash
../.venv/bin/python manage.py bootstrap_demo_workspace >/tmp/phase3b-seed-leave-focused.log && PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/hr-admin-leave-attendance-rbac-certification.spec.ts tests/e2e/policy-governance-master-crud-flows.spec.ts --workers=1 --reporter=line
```

```bash
../.venv/bin/python manage.py bootstrap_demo_workspace >/tmp/phase3b-seed-policy-docs.log && PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/policy-governance-master-crud-flows.spec.ts -g "document category|document requirement" --workers=1 --reporter=line
```

```bash
../.venv/bin/python manage.py bootstrap_demo_workspace >/tmp/phase3b-seed-policy-docreq.log && PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/policy-governance-master-crud-flows.spec.ts -g "document requirement" --workers=1 --reporter=line
```

```bash
../.venv/bin/python manage.py bootstrap_demo_workspace >/tmp/phase3b-seed-policy-docreq2.log && PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/policy-governance-master-crud-flows.spec.ts -g "document requirement" --workers=1 --reporter=line
```

## Phase 3B.1 Attendance Policy CRUD Blocker Resolution

Date: 2026-10-14

### Evidence Captured

| Evidence | Scope | Result |
| --- | --- | --- |
| `29-phase3b1-backend.log` | Django backend request log during focused reproduction | API create/update returned `201`/`200`; no backend exception, deadlock, permission denial, or serializer failure observed |
| `30-phase3b1-frontend.log` | Next.js frontend/proxy log during focused reproduction | Attendance policy POST/PATCH completed but local route timing was very slow under accumulated fixture data |
| `31-phase3b1-attendance-policy-repro-trace.log` plus Playwright trace artifact | Original focused reproduction with trace | Reproduced failure; create persisted, edit remained query-scoped due compact modal/filter ambiguity |
| `32-phase3b1-attendance-policy-after-fix.log` | First rerun after form option memoization and scoped edit locators | Create persisted but still exceeded the original URL wait in one run |
| `33-phase3b1-attendance-policy-after-payload-fix.log` | Focused rerun after limiting attendance policy preview option payload | `1 passed` |
| `34-phase3b1-neighboring-policy-leave-attendance.log` | Neighboring policy, leave, and attendance regression batch | `17 passed` |

### Root Cause

- Backend create/update was not failing: the Django endpoint returned successful `201`/`200` responses and persisted records. No backend exception, RBAC failure, subscription failure, deadlock, or serializer validation defect was found.
- The attendance policy form loaded and rerendered a large employee preview selector from `/hr-admin/policy-options/`. The local fixture had accumulated many employee rows, making the form and Next.js route path slow enough for the original Playwright URL assertion to expire while the UI displayed `Saving...`.
- The compact list/edit page also had two visible `Status` controls: the catalog filter and the edit modal field. The test was selecting the page filter instead of the modal field during the edit/archive step, so the persisted status assertion could fail even after the API update succeeded.

### Code Changes

- `backend/apps/common/api_views.py`: added optional `employee_limit` support to `HrAdminPolicyOptionsView`. Existing callers without the parameter keep full behavior.
- `web/src/lib/api.ts`: added an optional `employee_limit` parameter to `getHrAdminPolicyOptions`.
- `web/src/app/hr-admin/attendance-policies/page.tsx`, `new/page.tsx`, and `[itemId]/edit/page.tsx`: attendance policy forms now request a bounded preview employee option list with `employee_limit: 50`.
- `web/src/app/hr-admin/attendance-policies/attendance-policy-form.tsx`: memoized expensive select option lists so submit/preview state changes do not rebuild large option arrays.
- `web/tests/e2e/policy-governance-master-crud-flows.spec.ts`: scoped attendance policy edit fields and submit button to the dynamic edit dialog, preserving the archive assertion against the actual form.

### Verification

- API-level create and preview validation: `3 passed` via targeted backend pytest smoke tests.
- Browser create -> list -> edit -> save -> reload/filter -> duplicate validation: `policy-governance-master-crud-flows.spec.ts -g "attendance policy page"` passed.
- Persistence: latest `PW_TEST_APCRUD` record was present in the database with updated name, `archived` status, `late_mark_after_minutes = 20`, and the selected shift/calendar.
- Negative validation and permission coverage: neighboring HR leave/attendance RBAC and operations batch passed.
- TypeScript: `pnpm --dir web exec tsc --noEmit` passed.

### Phase 3B.1 Commands Executed

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/policy-governance-master-crud-flows.spec.ts -g "attendance policy page" --workers=1 --reporter=line --trace=on
```

```bash
pnpm --dir web exec tsc --noEmit
```

```bash
.venv/bin/pytest backend/tests/test_phase0_api_smoke.py::test_hr_admin_attendance_setup_mutations_write_audit_evidence backend/tests/test_phase0_api_smoke.py::test_hr_admin_attendance_policy_preview_marks_matching_holiday backend/tests/test_phase0_api_smoke.py::test_hr_admin_attendance_policy_preview_derives_late_and_overtime -q
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/policy-governance-master-crud-flows.spec.ts tests/e2e/hr-admin-leave-attendance-rbac-certification.spec.ts tests/e2e/hr-admin-attendance-operations-workflow-certification.spec.ts tests/e2e/hr-admin-leave-request-operations-certification.spec.ts --workers=1 --reporter=line
```

```bash
cd backend && ../.venv/bin/python manage.py shell -c "from apps.attendance.models import AttendancePolicy; qs=AttendancePolicy.objects.filter(code__startswith='PW_TEST_APCRUD').order_by('-updated_at')[:5]; print([{'code': p.code, 'name': p.name, 'status': p.status, 'late': p.late_mark_after_minutes, 'shift': p.default_shift.name if p.default_shift else None, 'calendar': p.holiday_calendar.name if p.holiday_calendar else None} for p in qs])"
```

### Phase 3B.1 Status

The P0 Attendance Policy CRUD blocker is resolved for the original scenario with persistence evidence. Broad Phase 3B coverage is still not resumed in this phase, and production readiness is not certified from these local Playwright results.

## Certification Status

Phase 3 is not complete. P0 ESS/MSS and frontend validation surfaces are green locally, and several HR Admin compact UI automation failures were repaired and revalidated. Platform/Tenant Admin and payroll-entitled HR Admin coverage still have open blockers. Do not claim production readiness from this evidence; preserve all existing P0 launch gates.

## Phase 3C.2C P1 Closure Update

Date: 2026-10-15

The frozen 151-test P1 register is reconciled to `147 passed`, `4 justified skips`, `0 failed`, `0 blocked`, and `0 not run`. Final evidence is recorded in `docs/qa/evidence/phase3-post-compaction/483-phase3c2c-p1-final-closure.md`; historical failures and reruns remain in the evidence directory.

`P3-0634` passed in `444-phase3c2c-p3-0634-final.log`. `P3-0001` passed all seven Accerio payroll phases in `479-phase3c2c-p3-0001-final.log`, including deterministic employee provisioning, payroll input locking, calculation/review, output publication, finance handoff, selected payslip download evidence, and governed report exports. Disposable fixture cleanup was verified and backend workspace tests passed 3/3.

Phase 3C P1 local certification is complete. P2 has not started, Phase 3 remains incomplete, and these local results do not establish production readiness.

## Phase 3A Blocker Resolution Update

Date: 2026-10-14

Phase 3A used the frozen `963` scoped HRMS manifest as the coverage baseline. The counts below are not cumulative pass counts across overlapping reruns; they are evidence for the specific failed/not-run blockers and continuation batches exercised in Phase 3A.

### Focused Results

| Evidence | Scope | Result |
| --- | --- | --- |
| `13-phase3a-focused-platform-tenant-rerun.log` | Reproduced Platform/Tenant open failures after Phase 3 | `6 failed`, `6 passed`, `3 not run` |
| `14-phase3a-focused-platform-tenant-rerun-after-repairs.log` | Same focused Platform/Tenant set after first repairs | `2 failed`, `10 passed`, `3 not run` |
| `15-phase3a-focused-tabs-roles-rerun.log` | Platform tabs and Tenant roles focused rerun | Platform tabs passed; Tenant role search still failed |
| `16-phase3a-tenant-roles-rerun.log` | Tenant roles full spec | `3 passed`, `1 skipped` |
| `17-phase3a-focused-platform-tenant-final.log` | All previously failed/not-run Platform/Tenant specs | `14 passed`, `1 skipped` |
| `19-phase3a-payroll-frontend-validation.log` | HR Admin payroll frontend validation with authorized payroll fixture | `14 passed` |
| `20-phase3a-hr-admin-small-batch-org-payroll.log` | Smaller HR Admin organization/payroll continuation batch | `28 passed`, `2 failed` |
| `21-phase3a-organization-focused-rerun.log` | Focused rerun for the two HR Admin organization failures | `2 passed` |

TypeScript verification after Phase 3A repairs: `pnpm --dir web exec tsc --noEmit` passed.

### Root Causes Resolved

- Platform Admin tab selected-state behavior: focused reruns showed current tab selection is valid; the remaining tab failure was pagination-control drift. The pagination helper now accepts the compact component's valid single-page rendering while still asserting page summary and first/previous/next/last controls when rendered.
- Platform Admin tenant CRUD: the test raced the tenant list immediately after create. It now waits for the browser-authenticated tenant mutation response and keeps downstream API/detail assertions.
- Platform Admin dashboard: compact shell exposes multiple `Dashboard` links. The test scopes the return action to the banner link.
- Platform Admin launch readiness: newly created setup templates can be present as select options before they are visible list rows. The assertion now verifies the created option, then filters/publishes as before.
- Platform Admin RBAC: denied HR personas currently land on safe `/hr-admin` home, not always `/`. The denial assertion now accepts both safe homes while still asserting Platform Admin surfaces are absent.
- Tenant Admin navigation timeouts/aborts: did not reproduce in isolated Phase 3A reruns. Classified as local batch/resource pressure, not a proven navigation defect.
- Tenant Admin role update: API succeeds, dialog closes, row state refreshes, and the updated description persists after reload. Stale toast assertions were replaced with persisted row assertions.
- HR Admin payroll 403: commercial-control evidence shows the seed tenant has payroll entitlements but Growth usage limits are exceeded: `active_employees` and `payroll_runs_per_month` block `payroll_core`. Payroll frontend validation now authorizes its local fixture through the HR Admin SaaS control plane by setting the tenant to active Enterprise before entering payroll surfaces.
- HR Admin organization limited-viewer proof: live fixture setup exceeded the default test timeout. The test now uses a focused timeout.
- HR Admin employee structural mapping: compact employee creation is step-based. The test now opens the Structure step before asserting dependent organization dropdowns.

### Remaining Blockers

- No Platform/Tenant Admin blockers remain from the original `9 failed`, `3 not run` Phase 3 set. The last-admin lockout skip in Tenant roles remains an existing valid exclusion in this local data shape.
- HR Admin broader P0 coverage still needs continuation in smaller, non-overlapping batches against the frozen manifest. Phase 3A resolved the known payroll entitlement blocker and the organization failures encountered in the first smaller batch, but it does not represent full 963-test completion.
- Production readiness is still not certified from these local Playwright results. Existing P0 launch gates remain in force.

### Additional Commands Executed

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/platform-admin-tabs-pagination-certification.spec.ts tests/e2e/platform-admin-crud-state-transition-certification.spec.ts tests/e2e/platform-admin-dashboard-certification.spec.ts tests/e2e/platform-admin-launch-readiness-certification.spec.ts tests/e2e/platform-admin-rbac-permissions-certification.spec.ts tests/e2e/tenant-admin-boundary-certification.spec.ts tests/e2e/tenant-admin-roles-certification.spec.ts --workers=1 --reporter=line
```

```bash
../.venv/bin/python manage.py shell -c "from apps.tenants.models import Tenant; from apps.common.selectors import describe_saas_commercial_control; c=describe_saas_commercial_control(Tenant.objects.get(code='northstar-foods')); print(c.keys()); print(c)"
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/hr-admin-payroll-frontend-validation.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/organization-master-crud-flows.spec.ts tests/e2e/payroll-setup-flows.spec.ts tests/e2e/hr-admin-payroll-frontend-validation.spec.ts --workers=1 --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir ../web exec playwright test tests/e2e/organization-master-crud-flows.spec.ts -g "limited organization viewer|employee structural mapping" --workers=1 --reporter=line
```

```bash
pnpm --dir web exec tsc --noEmit
```
## Phase 3C.4 P2 closure (2026-10-16)

- Frozen P2 outcome: 333 passed, 0 failed, 0 blocked, 0 skipped, 0 not run.
- Final 963-case reconciliation: 957 passed and 6 justified skips; all IDs are unique and no P1 outcomes remain unresolved.
- Documentation screenshots P3-0045 through P3-0097 and responsive groups P3-0392 through P3-0439 passed with one worker.
- Visual-functional groups P3-0481 through P3-0499 passed individually; P3-0161 passed the complete non-destructive final application audit in 18.5 minutes.
- Automation repairs excluded closed disclosure descendants and native choice inputs from false overlap comparisons, avoided duplicate live requests for static routes audited independently, and replaced network-idle/arbitrary waits with deterministic shell and heading readiness.
- Historical cold-route, connection-pressure, and first-run failures remain in logs 614, 620, 626, 647, 653, 656, and 665 with successful reruns retained separately.
- TypeScript validation passed in log 673. No application source changed in Phase 3C.4, so no additional backend regression was required.
- Disposable workspace `phase3d-p2-route-audit` passed its pre-cleanup ownership/integrity audit and was deleted with `verified_absent: true` in logs 674-676.
- Evidence for this closure is retained in logs 608-677 and the frozen P1/P2 execution register.

Phase 3C local regression certification is complete. This result does not by itself establish production readiness; staging, deployment, observability, migration, backup/restore, security, and operational launch gates remain independently required.

## Phase 3D integrated certification (2026-10-16)

Phase 3D audited all 963 frozen register rows against retained evidence without repeating the full suite. The register remains `957 passed`, `6 justified skips`, `0 failed`, `0 blocked`, and `0 not run`; all IDs are unique and every row has evidence.

Focused browser regression covered payroll controls and handoff, ESS/MSS validation, authentication and role boundaries, and tenant/platform negative security. Backend domain and API regression passed `87` tests. Database checks found no unapplied or missing migrations, TypeScript passed, and the optimized frontend production build completed. Northstar was restored to its certified `2,377` employee / `2,274` active baseline, and no disposable QA tenant or Phase 3D-owned record remains.

The integrated status is **CONDITIONAL**. The six fixture-conditioned skips require staging execution or explicit risk acceptance, and strict production preflight intentionally fails under local development settings. The formal report is `docs/qa/phase3d-final-integrated-qa-certification-2026-10-16.md`; detailed evidence and exact commands are in `docs/qa/evidence/phase3-post-compaction/678-phase3d-integrated-certification.md`.
