# ESS final blocker remediation and re-certification

Review date: 2026-10-19. **Final local ESS decision: CONDITIONAL. Lightsail staging deployment: NO-GO.** The reproducible ledger availability defect is remediated; the original Firefox transport-reset trigger remains unproven. This report does not certify complete root-cause closure of all four original failures or production readiness. This assessment follows the [visual/accessibility review](hrms-ess-final-visual-accessibility-acceptance.md), [ESS-6A report](hrms-ess6a-browser-remediation-certification.md) and [ESS coverage tracker](hrms-ess-coverage-tracker.md). Historical results are not counted as fresh executions.

Evidence root: [`docs/qa/evidence/ess-final-blocker-closure`](../qa/evidence/ess-final-blocker-closure/). Original failures, logs and traces remain at their original paths; SHA-256 preservation records are in `preserved-failure-evidence.json`.

## Exact original failures and classification

All four IDs are from the original Playwright JSON, not inferred from screenshot names. See `original-four-scenarios.json` and the predecessor `concurrent-failures.json` for complete errors and attachments.

| Project / file / line | Exact test ID and scenario | Finding |
|---|---|---|
| Chromium, `ess6-final-product.spec.ts:98` | `f35ec037fa049d2a2a11-84c119f1ce6c3d2e3dbd` — journey login dashboard profile attendance using real navigation and keyboard | Attendance heading absent after navigation; dashboard HTTP 500 recorded during the original run. Shared backend lazy-accrual collision is a genuine application availability defect. |
| Chromium, same file, line 131 | `f35ec037fa049d2a2a11-2d3e7d65bde04729cba8` — journey apply Leave My Requests configured approval and permitted cancellation | Initial Leave type selector never appeared because the employee workspace entered its unavailable state. Dashboard dependency HTTP 500 and screenshot retained. |
| Chromium, same file, line 191 | `f35ec037fa049d2a2a11-8f637c6774e9dbad52f7` — journey notification read unread persistence and canonical related workflow | Canonical Leave detail did not open; the source page depends on the same dashboard read that failed. No notification read/unread policy defect established. |
| Firefox, same file, line 80 | `f35ec037fa049d2a2a11-5ebad1fd77f0334c9d59` — route audit profile: desktop tablet mobile WCAG 2.2 rules | `APIRequestContext.post` failed with TCP `ECONNRESET` before an HTTP authentication response. Confirmed transport failure, not evidence of a Firefox rendering or cookie rejection. The original peer-reset trigger is not established by the available logs. |

The three Chromium failures share a reproducible backend failure class. Their UI timeouts are symptoms; the original traces do not provide a unique request ID linking every failed navigation to a specific database exception. This limitation is retained rather than overstating trace causality.

## Ledger root cause and correction

`MeDashboardView.get` calls `get_employee_leave_summary`, which materializes supported policy accrual through `ensure_employee_leave_balances` and `_get_or_create_leave_balance`.

Two races existed:

1. `ensure_governed_leave_balance` acquired a balance row lock inside its own short transaction, then released it before its caller calculated and materialized the accrual shortfall and entitlement lot.
2. `append_leave_ledger_movement` checked for an existing idempotency key **before** acquiring the balance lock. Parallel callers could both observe no command. The losing insert then violated `uniq_leave_ledger_command`, correctly enforced by PostgreSQL, and the exception propagated as HTTP 500.

This is not confined to fixture creation: the preserved predecessor authenticated HTTP probe returned `[500, 200, 200, 500]` for four parallel employee dashboard reads. The earlier in-process probe contains the unique-constraint exception stack. Its raw exception-signal capture caveat is documented in the predecessor report; the real HTTP statuses independently establish employee-facing impact.

Minimal application changes:

- [`services.py`](../../backend/apps/leave_management/services.py): make `_get_or_create_leave_balance` atomic so the existing governed balance lock remains held through the shortfall calculation, movement and entitlement-lot creation.
- [`year_end_services.py`](../../backend/apps/leave_management/year_end_services.py): acquire the existing per-balance row lock before checking command replay identity. Identical retries return the existing transaction; conflicting payloads retain the existing validation rejection.

No constraint is removed. No exception is converted into a false success or fabricated balance. Unrelated employee balances are not globally serialized. Existing units, accrual schedules, effective dates, policy-period restrictions, projection checksums, audit fields and historical protections are preserved. There is no migration or API contract change.

## Firefox authentication and transport investigation

Reviewed the original Firefox trace, Next login route, shared authentication helper and isolated browser fixtures. The helper clears cookies and logs out before authentication. Each test receives a fresh browser context; worker fixtures use distinct synthetic employee identities. The Next route delegates credentials to the existing backend and sets the established HttpOnly access-token cookie with SameSite=Lax and the existing secure-cookie configuration. No demo tenant fallback or browser-only rendering branch occurs in that POST route.

The failed call is executed by Playwright's Node `APIRequestContext`; the Firefox project name does not mean Firefox's native networking stack issued it. Playwright 1.62.1 uses a shared keep-alive HTTP agent. The original trace shows a logout request about seven seconds before the failing login; the Next connection advertises a five-second keep-alive timeout. A stale pooled-socket race is a hypothesis, **not a proven original root cause**. Neither original server logs nor the trace recorded the failed socket's reuse/close lifecycle.

Fresh QA-only server and client observers record request arrival, completion, socket reuse and transport errors without headers, bodies, cookies or credentials. Instrumented final repetitions recorded **54 Node API login responses, all HTTP 200, zero transport errors** (`client-transport-results.json`). Pooled socket reuse was observed, but reuse alone is not proof of a defect. The production authentication code, cookie security, tenant resolution and frozen authentication helper are unchanged. Passing repetitions must not be described as proof that the original transport trigger was fixed.

## Regression evidence

All results below are newly executed. Automatic Playwright retries are disabled. [Acceptance results](../qa/evidence/ess-final-blocker-closure/acceptance-results.json), [raw trace audit](../qa/evidence/ess-final-blocker-closure/raw-runtime-audit.json) and [all execution accounting](../qa/evidence/ess-final-blocker-closure/all-test-runner-executions.json) retain the selection and diagnostic boundaries.

| Frozen suite | Chromium | Firefox | WebKit | Passed |
|---|---:|---:|---:|---:|
| Dashboard/Profile | 8 | 8 | 8 | 24 |
| Attendance | 8 | 8 | 8 | 24 |
| Leave | 9 | 9 | 9 | 27 |
| Documents/Payroll | 11 | 11 | 11 | 33 |
| Requests/Notifications/Settings | 11 | 11 | 11 | 33 |
| Integrated product journeys and route audits | 21 | 21 | 21 | 63 |
| **Frozen total** | **68** | **68** | **68** | **204** |

| New test-runner execution group | Passed | Failed | Skipped | Blocked | Unexecuted |
|---|---:|---:|---:|---:|---:|
| Final frozen suite | 204 | 0 | 0 | 0 | 0 |
| Final focused repetitions: three runs, four scenarios × three engines | 36 | 0 | 0 | 0 | 0 |
| Final original stress command: four scenarios × three repeats × three engines, three workers | 36 | 0 | 0 | 0 | 0 |
| **Final acceptance selections** | **276** | **0** | **0** | **0** | **0** |
| Earlier stress diagnostic | 33 | 3 | 0 | 0 | 0 |
| ESS-1 runner configuration diagnostic | 0 | 3 | 0 | 0 | 21 |
| **All new test-runner executions, including diagnostics** | **309** | **6** | **0** | **0** | **21** |

The 204 frozen cases are unique and unchanged; supplementary repetitions do not increase that unique scenario count. All **276 final traces** were inspected programmatically: **0 page errors, 0 hydration warnings, 0 excluded errors**. The historical ESS-6A 19 supplementary executions are not counted as new results.

Diagnostic details remain in `diagnostic-results.json`:

- Initial stress: three Chromium executions of the Leave journey failed later than the original initial-selector failure: while awaiting approved-detail controls or dialog dismissal after successful submissions/cancellations. There were Next read/navigation timeouts, peak observed host load 67.58 and no blocked query in the sampled PostgreSQL snapshot. These observations associate the failures with contention; they do not independently prove an infrastructure-only cause. The **identical three-worker / repeat-each=3 command subsequently passed all 36**, without assertion, timeout, authentication-helper or application-code changes between those two stress runs.
- ESS-1 runner: the first launch mistakenly inherited `hrms_ess2`; the existing guard required `hrms_ess1`. Three setup failures and 21 never-executed serial dependents are retained. Playwright labels those dependents skipped; this report classifies them as **unexecuted**, not intentional skips. Correcting only the runner environment produced **24 passes**. The database guard was not weakened.

Browser/runtime: macOS 26.5.2 (25F84), Playwright 1.62.1, Chromium 151.0.7922.34, Firefox 153.0, WebKit 26.5. Browser tests use production artifact `Hh1gsxi5NfSm1AoXK9kl1` with the remediated backend. The fresh frontend build `E0Ia9xxLsPnlRn1Ozm4RE` passed; its frontend source hashes match the browser-tested artifact. There are no frontend source changes in this remediation. See `build-provenance.json`.

Quality checks: **TypeScript PASS; full ESLint PASS; Django check PASS (0 issues, 0 silenced); frontend production build PASS; sanitized backend Docker production build PASS**. Exact commands, exit codes and output are retained in `run.py`, `execution-exits.json`, per-check `run.txt` files and `backend-production-build-result.json`. The local backend tests use the existing Python 3.14 environment; the production image uses its existing Python 3.12 base. Image build success is not a production runtime/release certification.

Fresh PostgreSQL evidence already completed:

- **16 passed**: three new concurrent/negative ledger tests plus all 13 existing DB3 leave-year integrity cases (`concurrency/run.txt`).
- **12 authenticated HTTP reads passed**, four simultaneous reads per batch, three batches. A fresh configured policy ends with accrued `12.00`, ledger version `1`, one transaction and one entitlement lot (`http-probe-results.json`, `http-ledger-integrity.txt`). These requests are not added to pytest case totals.
- **43 passed**: ESS-1 through ESS-6 employee/API/authorization contracts (`contracts/run.txt`).
- **10 passed / 363 deselected**: focused statutory/attendance-close/API integrity selection (`close-api-regressions.txt`). Deselected cases are not passes or executed scenarios.

**Backend/API/PostgreSQL total: 69 passed / 0 failed / 0 skipped / 0 blocked / 0 unexecuted within the selected scope.** The 363 deselected cases are outside that selection. PostgreSQL 16.15 uses READ COMMITTED; `postgresql-integrity-metadata.txt` records the still-enforced partial unique index on `(tenant_id, idempotency_key)`. No HRMS background worker was started; parallel employee reads alone reproduce the predecessor defect. Dashboard GET retains its existing lazy policy-accrual materialization, now atomic.

New regression source: [`test_ess_final_ledger_concurrency.py`](../../backend/tests/test_ess_final_ledger_concurrency.py). A barrier starts four independent PostgreSQL connections together. Tests verify identical command replay applies once, parallel lazy accrual creates one movement/lot, and three conflicting replays are rejected without a second projection update.

## Visual and accessibility review

No new presentation code is introduced. The centralized Accerio components and the five previous visual fixes remain in place. Fresh desktop/tablet/mobile images cover ten ESS routes in all three engines; the [screenshot comparison index](../qa/evidence/ess-final-blocker-closure/screenshot-comparison-index.md) records exact paths, with dimensions and SHA-256 hashes in `screenshot-index.json`. Human inspection sampled Dashboard desktop, Profile/Attendance/Leave mobile, My Requests tablet, and WebKit's short-height payslip footer. These checks inspect actual rendered output, not test pass counts alone.

| Review | Fresh execution / limitation |
|---|---|
| Responsive layout and reduced motion | Ten routes × three widths × three engines; document overflow, computed reduced-motion durations, axe rules and actual skip-link focus traversal. |
| Dialog and table keyboard behavior | Payslip short-height/mobile scroll, visible footer, forward/reverse focus trap, Escape and trigger restoration; actual document-table arrow panning and action visibility in three engines. |
| Native zoom/reflow | Actual Chrome 155.0.8059.80 on macOS, isolated 1280×998 window, native controls verified at 200% and 400%. Ten routes at each zoom: 640×455 and 320×227 CSS viewports, no document-level horizontal overflow. Full native 400% My Requests screenshot was inspected through CUA; native-window images are in the task transcript, not exported PNG artifacts. |
| Contrast / semantic states | Fresh rendered control border/white contrast **3.6139:1**; sampled semantic text pairs **5.6421:1–15.0455:1** (`contrast-results.json`). Existing semantic tokens retained; axe findings reviewed. Full manual interactive-state contrast conformance is outside this evidence. |
| Screen reader | No actual assistive-technology speech/caption review executed in this remediation. **UNVERIFIED**. The earlier unavailable VoiceOver attempt is historical evidence, not a fresh pass. |
| Formal WCAG | **UNVERIFIED**. Automated rule results and an accessibility tree do not establish formal conformance. Native Firefox/Safari zoom, physical touch devices and Windows/mobile AT remain unexecuted. |

Custom review harness diagnostics are preserved: the table script initially targeted an unstarted diagnostic port, corrected to the owned runtime; the dialog script initially sent Enter before an observable hydration-ready table region existed, and now waits for that existing client-ready region. Neither correction changes application code or a frozen assertion. Final custom review: **90 route/viewport checks passed**, including **30 route skip-link traversals**; **9 dialog checks passed**; **3 table keyboard checks passed**. Each final group has 0 failed/skipped/blocked/unexecuted. Initial custom harness diagnostics remain **2 failed / 10 unexecuted** (dialog: one failure/eight unexecuted; table: one failure/two unexecuted), separate from test-runner totals. There is no claim that those failed attempts passed.

There are **273 retained axe result files / 0 automated violations / 316 incomplete/manual-review entries**. This is a retained-file count, not an asserted total scan count: same-project stress repeats can overwrite direct screenshot/axe filenames. Unique per-execution traces preserve every test execution; the screenshot comparison uses the separate deterministic review captures. Manual/incomplete entries are not automatically accepted. See `accessibility-results.json`.

## Remaining restrictions and decision

**Final local ESS decision: CONDITIONAL.** The genuine lazy-accrual collision is closed by concurrent PostgreSQL and authenticated HTTP evidence. All 204 frozen cases and 72 final repetitions pass. The original Firefox transport trigger is **OPEN / UNPROVEN**, and contention-associated diagnostic timing failures are retained rather than reclassified as passes. No speculative authentication or session-security change is made. A future recurrence needs the client/server socket lifecycle evidence now available before a transport-layer correction can be justified.

Independently open: original login-reset trigger, actual screen-reader coverage, formal WCAG review, approved leave-year/holiday projection APIs, provider/storage/statutory and existing production-release requirements. Lightsail deployment stays **NO-GO**. Frozen production gate statuses are not promoted. No MSS work is started.


## Cleanup and changed-file audit

Both isolated databases (`hrms_ess1`, `hrms_ess2`) have **zero Tenant/User/tenant-owned business rows** after fixture cleanup. Temporary test databases are absent. Browser fixture cleanup records verify tenant absence and finalized/published snapshot preservation. Both manual tenants were removed only after verifying their closed attendance hashes and published payroll outputs.

All **440 baseline media files** retain their hashes. One leftover API-upload file was removed only after its bytes matched the synthetic literal at `test_phase0_api_smoke.py:4759`; no new media files remain. The test command's attempted `MEDIA_ROOT` environment override is not consumed by base settings; this explicit hash/provenance cleanup closes that harness limitation.

Owned Next/Django listeners, PostgreSQL container and anonymous volume, temporary backend image tag, manifests and environment file are removed. Native Chrome was restored to 100% and its owned browser session closed. Production frontend artifacts and evidence are retained. See `manual-cleanup.json`, `media-cleanup.json`, both `database-cleanup-*.txt`, `test-database-cleanup.json` and `infrastructure-cleanup.json`.

Application changes are exactly the two ledger service files listed above; new regression source is `test_ess_final_ledger_concurrency.py`. Documentation changes are this report and the ESS coverage tracker; evidence/supporting scripts reside under the evidence root. Generated Next configuration is restored from the pre-task copies, preserving earlier user changes. `source-preservation.json` verifies unchanged frozen tests/helpers, original failure evidence, Lightsail baseline and both frozen release-gate CSVs. No migration, calculation, authorization, historical-record, unrelated module or MSS implementation change is included.
