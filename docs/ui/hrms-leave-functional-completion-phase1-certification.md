# Leave functional completion — Phase 1

21 October 2026. **Scoped local functionality PASS; overall Leave release CONDITIONAL. Lightsail staging and real-payroll production remain NO-GO.** This is a Phase 1 checkpoint, not full-product, formal accessibility or production certification.

## Scope and contract decisions

This checkpoint implements complete-history ESS filtering/calendar and complete authorized import identity lookup. It does not change accrual, payroll, chargeability, eligibility, approval, cancellation, audit, RBAC or historical-close policy. Existing manual and timed approval rules remain authoritative. The pre-existing dirty worktree is preserved.

| Existing endpoint | Additive read contract | Compatibility and ownership |
| --- | --- | --- |
| `GET /api/v1/me/leave-requests/` | `q` (200 characters), exact `leave_type` code, `period` (`all/upcoming/past/current/this_year`), overlapping `date_from/date_to`, `month=YYYY-MM`, selected `day=YYYY-MM-DD` | Employee and tenant scoped. Existing status, pagination and global status-count semantics remain. Filters run before paging. Requests sort by descending creation time then ID. Mutation payloads are unchanged. |
| Same history endpoint | `filter_types`: code/name pairs from all own historical requests, including retired types; optional `calendar_days` containing date/count for the requested month | Application choices still use the existing permitted Leave type endpoint. Calendar counts reflect all matching requests, including cancelled/withdrawn states; they are neither chargeable units nor holiday entitlement. Day selection filters the paginated list; it does not narrow the other month counts. |
| `GET /api/v1/hr-admin/employees/option-search/` | Optional exact, trimmed, case-insensitive `employee_code` | Existing fuzzy `q` search is preserved for directory/search controls. Imports use exact codes only, reject case-colliding identities and never substitute a name or first prefix match. Existing HR workspace and permission checks are unchanged. |
| `GET /api/v1/hr-admin/leave-policy-assignments/` and its existing Next proxy | Optional validated `employee_id`, `leave_policy_id` | Tenant scope and `leave.view` remain. Preview checks exact pairs independently of current filters/page. An existing pair is informational. The existing authorized conflict preview, with effective dates and priority forwarded, decides blocking status; nonoverlapping or otherwise permitted assignments remain possible. Imports do not overwrite existing records. Backend governance still decides each actual write. |

The existing `POST /api/v1/hr-admin/leave-policy-assignments/conflicts/` still requires `leave.policies.manage`; it is a read-only domain preview. Its existing effective-date inputs are now forwarded consistently with save. Input priority limits reflect the database field range rather than a new routing policy.

UTC relative filters are presentation filters: upcoming starts after today; in-progress includes today; past ends before today; calendar year means January–December overlap. These are not tenant leave-year rules. Inclusive custom ranges find requests overlapping the range. Invalid dates/ranges produce visible correction feedback; no hidden date conversion or holiday calculation is introduced.

Calendar projection iterates date intervals without building every request's attachment/workflow/lifecycle payload. Only the requested page receives those existing detail projections. Counts and list queries are live reads, not a repeatable-read accounting snapshot under concurrent changes.

## Reused design and import safeguards

ESS uses `WorkspaceFilterForm`, existing headers/panels, status tabs, calendar and document pagination. Search/date/type/month selections are committed GET navigation; refresh/back/forward retain query meaning. Month editing requires explicit Apply month so keyboard editing does not trigger navigation on every value change. The central workspace stylesheet extends existing filter styles to the ESS shell; no page-specific stylesheet or new library.

Balance previews resolve employees independently of loaded balances. Assignment previews also check complete existing employee/policy pairs and reuse the existing backend conflict preview. The previous read API accepted dates but omitted them from its domain call; it now forwards the existing date fields, matching the save service. Identity alone never rejects a valid dated/priority assignment. CSV priorities are not truncated, unknown active flags/impossible dates are rejected, and balance quantities with excess precision are rejected instead of rounded. Assignment priority validation now enforces the existing PostgreSQL PositiveInteger range (0–2147483647) at the API boundary; existing valid zero remains supported by the API, while the existing CSV positive-priority requirement remains. No calculation or business policy changes. Employee-code and pair lookups are bounded to six parallel reads and 250 distinct identities/pairs per preview. CSV changes invalidate old preview rows; pending preview/commit states disable conflicting edits. Read failures retain CSV, block commit and allow explicit read retry. Actual mutation permission, eligibility, period restrictions, duplicate/conflict and audit behavior remain backend-owned; a ready preview is not a guaranteed successful write.

The shared import-audit helper now returns an unconfirmed/null result consistently for failed HTTP, lost transport and incomplete/malformed replies. It never automatically retries the POST. Leave retains its explicit audit-unconfirmed warning; a saved business row and an unconfirmed supplementary audit are separate outcomes. Legacy non-Leave audit presentation is not blanket-certified by this narrow transport fix.

The existing shared exact-code hook also serves Leave request, Attendance and Shift imports. Its fuzzy fallback is removed consistently; neighboring previews are included in targeted verification. No Attendance or Shift business rules are redesigned.

## Employee context dependencies reviewed

Two previously open projections remain unimplemented: exact per-policy employee leave-year dates, and employee-effective upcoming holidays. Existing employee balances/history do not provide a sufficient approved disclosure contract. The UI continues to direct employees to HR rather than reusing HR CRUD permissions or deriving entitlement from a calendar.

A future read contract must resolve the authenticated employee's effective policy/period and applicable holiday calendar through existing domain services, define date/as-of scope and no-assignment/ambiguous/unavailable behavior, and pass employee/tenant isolation tests. Policy-year dates must not be inferred from the UTC calendar-year filter. Historical request breakdowns remain recorded facts rather than a forecast. Planned-period activation is a separate state-machine/API scope.

## Bulk adapter and read-path findings

PostgreSQL-backed browser verification exposed a real pre-existing bulk-assignment adapter defect: effective dates were discarded by raw bulk_create, and the database overlap guard correctly refused the resulting undated row. Each imported row now calls the existing normal-save service inside its own transaction, preserving dates/scope, existing conflict policy and balance setup. The established 201/207 created/failed/IDs/errors contract remains. Only the identified concurrent overlap-guard exception becomes a rejected row; unrelated integrity errors are re-raised. Forced competing submissions, partial outcomes, valid dated rows, duplicate rejection and denied/foreign writes are tested. Database guards and domain calculations were not changed.

History projection redundantly evaluated lifecycle fields ten times per row. It now evaluates once, matching detail. A ten-row warm diagnostic changed 100 to 10 evaluations, with SQL queries unchanged at 130 and elapsed time approximately 0.469 to 0.449 seconds. This is not a SQL or performance-SLA certification. An earlier cold SSR read exceeded the unchanged 15-second API budget under local swap pressure; its trigger remains unproven and requires separate cold/load assessment. [Before](../qa/evidence/leave-completion-phase1/read-profile-before.json), [after](../qa/evidence/leave-completion-phase1/read-profile-after.json).

## Fresh execution evidence

| Final selected scope | Passed | Failed / skipped / blocked / unexecuted |
| --- | ---: | --- |
| feature | 48 | 0 / 0 / 0 / 0 |
| neighbors | 102 | 0 / 0 / 0 / 0 |
| integrated | 24 | 0 / 0 / 0 / 0 |
| feedback | 54 | 0 / 0 / 0 / 0 |
| ess | 27 | 0 / 0 / 0 / 0 |

**255 distinct project/case combinations passed:** 204 browser/API workflows, 3 browser-backed formatting checks and 48 Node-only helper executions. Each engine has 85 selected executions. This happens to include 204 workflows; it is **not** the separate frozen ESS-6 204-case suite, which was not rerun here. Retries are zero.

The final selection combines a clean 48-case complete feature rerun; 78 unaffected neighboring cases plus a clean 24-case complete HR requests-file rerun; and clean joined 24, feedback 54 and existing ESS Leave 27 selections. The original verified feature **47 passed / 1 failed** and neighbors **101 passed / 1 failed** remain failed batches. Both original WebKit failures asserted UI before streamed document navigation completed. A subsequent complete feature rerun retained three early assertions: Chromium search Clear filters, Chromium invalid-date Clear filters and Firefox keyboard day selection (45 passed / 3 failed). Native GET search/filter/calendar/paging actions now use one document-completion helper, and the failed predecessor remains retained. Tests now await real terminal HTTP 200 and transport completion before the original assertions; no sleep, timeout extension or mouse-only replacement was added. The complete affected files reran separately, not a falsely claimed clean combined command.

[Accepted case-by-case matrix](../qa/evidence/leave-completion-phase1/acceptance.json), [raw final feature](../qa/evidence/leave-completion-phase1/verified-feature-complete/results.json), [raw final requests](../qa/evidence/leave-completion-phase1/verified-requests-final/results.json), [original verified selections](../qa/evidence/leave-completion-phase1/verified-browser-exits.json), [requests/predecessor commands](../qa/evidence/leave-completion-phase1/terminal-browser-exits.json), [final complete-feature command](../qa/evidence/leave-completion-phase1/feature-complete-exit.json).

All task browser reports retain **1248 recorded outcomes: 978 passed, 47 failed, 37 skipped, 182 not_run, 4 interrupted**. Interrupted, serial-skipped and not-run results remain distinct and are not passes. Superseded driver plans include work never invoked; these are separately retained in their supersession manifests. [All reports/errors](../qa/evidence/leave-completion-phase1/browser-summary.json), [defects and harness/environment classifications](../qa/evidence/leave-completion-phase1/defects-and-fixes.md). Prior phase results are not counted as fresh.

Backend/API/PostgreSQL: **222 distinct checks, 247 passing executions**, from 217 broad checks and 30 post-fix checks with 25 overlapping. The broad 217 command preceded the isolated bulk adapter/read consolidation; all 30 affected history/import/concurrency/authorization cases reran on final backend source. The broad command was not rerun after those changes. [Selection and case accounting](../qa/evidence/leave-completion-phase1/backend-certification.json), [217-case XML](../qa/evidence/leave-completion-phase1/backend-final.xml), [30-case final XML](../qa/evidence/leave-completion-phase1/backend-post-fixes.xml). Extra focused/debug executions are retained but excluded from these selected totals. An occupied test-database setup error is environmental, not a pass; its original XML remains.

TypeScript, full ESLint, Django checks, migration-drift check and retained production Next build all exit zero. Frontend checks reran after the final test synchronization edits. [Quality exits](../qa/evidence/leave-completion-phase1/quality-terminal.json), [build log](../qa/evidence/leave-completion-phase1/build-closure.txt).

## Visual, responsive and accessibility evidence

Final selected evidence contains **156 PNGs**, with **7 actual final PNGs manually viewed**. [Screenshot inventory](../qa/evidence/leave-completion-phase1/screenshots.md), [before/after index](../qa/evidence/leave-completion-phase1/screenshot-comparison-index.md), [manual findings](../qa/evidence/leave-completion-phase1/visual-manual-review.json). Desktop/tablet/mobile viewports are emulated, not physical devices. Central ESS filter styling is corrected; broader MSS duplicate navigation/density, long import forms and Tenant discoverability remain Phase 2 advisories.

Scoped axe evidence: **102 files, zero violations**. Of these, 36 retain complete outputs and 66 retain violation arrays only. Complete outputs retain **57 incomplete rule entries** (aria-prohibited-attr: 21, color-contrast: 36). Omitted incompletes in array-only outputs cannot be interpreted as passes. [Exact scan inventory](../qa/evidence/leave-completion-phase1/visual-accessibility-inventory.json), [accessibility matrix](../qa/evidence/leave-completion-phase1/accessibility-evidence-matrix.md).

Keyboard calendar selection, named controls, invalid-field focus, Escape/dialog handling, responsive overflow and reduced-motion emulation are exercised by the selected tests. Actual assistive technology/speech, native browser zoom at 200%/400%, physical devices and formal WCAG conformance are **unexecuted**. Automated labels, contrast rules and focus assertions do not certify these.

## Source and safety provenance

HEAD remains `2dbfecf02fb1b5dc2d700ac0c2ad33b9d718b161` with the pre-existing dirty worktree preserved. Retained Next artifact: `web/.next/leave-completion-phase1-closure`, build ID **`k--V5gA0PECykoO3hpiQ2`**. Frontend application source is unchanged since this build. The paired Django backend was restarted and tested after its isolated Python adapter/read fixes. Original at-build hashes and reviewed final backend hashes are separately recorded; this is not an immutable deployment-image or clean-commit claim. [Exact 16-file application source manifest](../qa/evidence/leave-completion-phase1/source-provenance.json), [served artifact check](../qa/evidence/leave-completion-phase1/served-build-closure.json).

New test sources are [backend contract/concurrency tests](../../backend/tests/test_leave_history_completion.py), [browser workflows](../../web/tests/leave-completion/completion.spec.ts) and [helper checks](../../web/tests/leave-completion/helpers.spec.ts). Existing ESS Leave and joined-workflow tests retain scenario coverage; only intended global-filter interactions, owned environment configuration and real transport synchronization changed. Existing HR request recovery now synchronizes its actual document response.

No domain service/model/migration, dependency or environment contract changed in this checkpoint. [137 protected domain/configuration files](../qa/evidence/leave-completion-phase1/protected-domains.json) match the task baseline, which includes earlier approved dirty changes. No payroll/statutory calculation, RBAC, tenant scope, database guard or historical-record policy is weakened.

## Cleanup and open gates

Ownership-verified teardown found zero synthetic tenants, users, document artifacts and media files, then removed the owned PostgreSQL container/volume, private runtime/environment and owned service listeners. Intermediate builds were removed; the reviewed final frontend artifact and all original traces/screenshots remain. Append-only audit history is preserved, and frozen gate hashes are unchanged. [Fixture audit](../qa/evidence/leave-completion-phase1/fixture-cleanup.json), [resource cleanup](../qa/evidence/leave-completion-phase1/cleanup.json), [audit preservation](../qa/evidence/leave-completion-phase1/audit-preservation.json).

1. Phase 2: compact shared presentation across HR Admin/ESS/MSS/Tenant Admin; remove duplicate navigation, improve mobile import/pagination density and resolve actual axe incomplete findings through manual checks.
2. Approved employee-context APIs: policy-effective leave-year boundaries and employee-effective holidays; retain explicit unavailable states until authorized projections exist. Planned-period activation remains separate policy/API work.
3. Scheduler/worker recovery and real Beat dispatch/load acceptance; this checkpoint did not create Redis/Celery or certify job operations.
4. Actual screen-reader/native zoom/physical-device reviews, cold/load performance and independent production/statutory, immutable-image, backup/restore, alerting and release infrastructure gates.

**Scoped local functionality PASS; overall Leave release CONDITIONAL.** Existing Lightsail staging and real-payroll production remain **NO-GO**. No deployment, customer data, billable resource, frozen release-gate advancement or automatic next-module implementation occurred.
