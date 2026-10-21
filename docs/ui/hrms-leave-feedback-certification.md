# Leave validation and action feedback

21 October 2026. **Scoped local functionality: PASS. Overall release: CONDITIONAL. No Lightsail deployment.** This report covers Leave setup, applications, balances, ESS lifecycle actions, MSS decisions and the shared HR/Tenant year controls. It is not an audit of every unrelated HRMS form.

## Changes and findings

| Finding | Implemented correction |
| --- | --- |
| Nested serializer errors lost their field context or became object/JSON strings | Shared decoder preserves readable field paths and multiple corrections; known editor fields receive inline errors and accessible descriptions. Explicit nested aliases prevent a service-tier entitlement error from incorrectly highlighting the base entitlement |
| Invalid controls could remain inside collapsed sections | Shared validation focus reveals the section and focuses the first invalid enabled control |
| Correcting fields could leave stale form errors or interrupt typing | Clear the edited field's error and stale summary/toast; distinguish a new failure from clearing existing errors |
| Save feedback disappeared on document navigation | Hydration-safe one-shot destination receipts, written only after a valid confirmed response; filtered-out records receive current-view guidance |
| Connection loss/5xx messages suggested an ordinary failed write and immediate retry | Explain that the outcome is unconfirmed, retain the form/idempotency key, and instruct users to check current records before retrying; do not show internal server diagnostics |
| Incomplete successful responses could clear forms or imply success | Create/edit/ESS submission requires a returned record ID before success/reset/navigation |
| CSV errors and partial outcomes could appear as a completed success | Invalid headers/file reads are errors; nested row errors are readable; exact saved, failed/unconfirmed and blocked counts replace generic completion claims |
| MSS lost keyboard focus after a failed asynchronous decision | Disabling the button could leave focus on the document body in Chromium/Firefox, so dialog Escape no longer received the key. Focus the persistent error summary inside the dialog, while keeping client-validation corrections in their fields. The same shared handling covers ESS submission and lifecycle failures, including canceled discard prompts that preserve the draft |
| Assignment import saved a row but left its catalog count stale | Traces showed HTTP 201 followed by an aborted RSC refresh. Reordering into the shared transition remained intermittent (7/9 focused passes). The final workspace uses an authorized canonical GET, keeps the committed filter/page binding, aborts superseded reads and offers GET-only retry. Import rows/CSV remain mounted |
| Low-contrast legacy Counted/approval badges | Reuse `WorkspaceStatusBadge`; the rendered Counted badge improved from 2.25:1 to 6.49:1 in the automated contrast check |
| Supplementary import audit failure could be unhandled or confused with the saved business outcome | Retain saved-row results, show an explicit unconfirmed-audit warning, and still reconcile the catalog. No automatic import/audit POST retry or fabricated audit success |
| Intermediate decisions claimed final approval | Use the returned status to distinguish recorded approval steps from final approval; keep cancellation approval distinct. Year-close acceptance explicitly requires durable completion status |

[Shared standard](hrms-frontend-validation-feedback-standard.md). Existing Accerio fields, form sections, status indicators, tables, dialogs, feedback and pending buttons are reused. Only central toast overflow constraints were added to CSS; no page-specific stylesheet, library or new business policy.

## Implementation and contracts

- `web/src/lib/ui/api-error-message.ts`: nested errors, known-field mapping, session/permission/conflict/throttling guidance and safe unconfirmed outcomes.
- `web/src/lib/ui/use-validation-focus.ts`, `use-feedback-focus.ts`, `leave-decision-message.ts`: reusable correction/error focus and factual workflow wording.
- `web/src/components/patterns/action-toast.tsx`, `action-feedback-receipt.tsx`: existing toast with optional dismissal and confirmed-save receipts. Error toasts have persistent inline counterparts; Leave error-toast visibility is eight seconds.
- Leave type/policy/assignment editors and their lists, HR review, ESS application/lifecycle, MSS decisions, balance/assignment imports and shared year controls consume the standard.
- `web/src/app/hr-admin/leave-policy-assignments/leave-policy-assignments-workspace.tsx` owns the authorized catalog snapshot. Existing summary/filter/table/pager/governance markup was moved from its server page, preserving the UI and server permission checks. Imports and removal/deactivation share the read callback; read failure does not retry the saved mutation.
- `web/src/app/api/hr-admin/leave-policy-assignments/route.ts` forwards only existing approved `q`, `status`, `scope`, `risk`, `page`, `page_size` parameters on GET. It retains the token, tenant/RBAC enforcement and no-store behavior. Unqueried GET and all mutation contracts remain unchanged; no new backend endpoint or business field.

No backend application, calculation, migration, authentication, historical-close or tenant policy change in this pass. Test fixtures are synthetic and local. No dependency, Lightsail configuration or deployed image change.

## Verification

Retained production frontend **`lTo7iqzNbpHJbf1FdRQ90`** at `web/.next/leave-feedback-reviewed-final`. All accepted browser commands used this artifact; static build manifests were verified on all three owned loopback frontend ports. HEAD remains `2dbfecf02fb1b5dc2d700ac0c2ad33b9d718b161` with the pre-existing dirty tree preserved. No commit or immutable deployment-image certification is claimed. [Source hashes and exact application file list](../qa/evidence/leave-feedback/source-provenance.json), [served artifact](../qa/evidence/leave-feedback/served-build.json).

| Fresh accepted selection | Passed | Failed / skipped / blocked / unexecuted selected |
| --- | ---: | --- |
| HR reporting, period governance and correctness | 48 | 0 / 0 / 0 / 0 |
| Neighboring catalogs, applications and balances | 102 | 0 / 0 / 0 / 0 |
| Joined HR Admin / ESS / MSS / Tenant Admin | 24 | 0 / 0 / 0 / 0 |
| Session, context and committed-response recovery, complete rerun | 9 | 0 / 0 / 0 / 0 |
| ESS Leave, complete rerun | 27 | 0 / 0 / 0 / 0 |
| New validation/feedback cases, corrected complete rerun | 54 | 0 / 0 / 0 / 0 |
| **Primary accepted selections** | **264** | **0 / 0 / 0 / 0** |
| Repeated assignment-import refresh checks | 9 | 0 / 0 / 0 / 0 |
| **Accepted executions** | **273** | **0 / 0 / 0 / 0** |

The primary selection contains **264 distinct project/case combinations**: 228 browser/API workflow executions, 3 browser-backed format checks and 33 Node-only helper executions. The nine additional repetitions are duplicate workflow checks, giving **237 browser/API executions + 3 format checks + 33 Node-only helpers**. Each engine has 91 accepted executions. These are separate completed commands, not a claim that the earlier failed concurrent selections were one clean combined run. Retries were disabled. [Exact accepted case inventory](../qa/evidence/leave-feedback/acceptance.json).

Chromium **151.0.7922.34**, Firefox **153.0**, Playwright WebKit **26.5**, macOS arm64. WebKit/device presets are not native Safari or physical-device certification. Existing certifications and the frozen ESS-204 result were retained, not counted as new executions here.

Final backend/API/PostgreSQL selection: **192 distinct checks passed**, zero failures/errors/skips. The same 192 were also executed earlier in this task: **384 passing executions, 192 distinct cases**, not 384 distinct tests. These cover existing policy validation, Leave transitions, concurrency, tenant/RBAC boundaries, ledger consistency and historical-close protection. No new backend test or application logic was required. [Final output](../qa/evidence/leave-feedback/backend-final.txt), [JUnit](../qa/evidence/leave-feedback/backend-final.xml), [selection](../qa/evidence/leave-feedback/backend-selection.json).

TypeScript, full ESLint, Django checks, migration-drift check and production build **PASS**. Final frontend checks also passed after evidence-path cleanup. [Quality exits](../qa/evidence/leave-feedback/quality-results.json), [terminal frontend checks](../qa/evidence/leave-feedback/quality-frontend-terminal.json), [build](../qa/evidence/leave-feedback/build-reviewed-final.txt). Existing Autoprefixer/Python deprecation warnings were not hidden or addressed by an unrelated dependency upgrade.

New test sources: `web/tests/leave-feedback/{feedback.spec.ts,helpers.spec.ts}` and `web/playwright.leave-feedback*.config.ts`. Existing setup/integrated/DD6/ESS test changes update intentional message assertions and synchronize with real successful responses. HTTP success, persisted rows/counts, authorization, historical protection and original UI assertions remain required. No test or scenario was removed, no arbitrary sleep or longer assertion timeout was introduced.

## Historical failures retained

Across all task Playwright reports, including helper cases and reruns: **1,344 recorded outcomes — 1,261 passed, 46 failed, 37 skipped**. The 37 were unexecuted after fixture/serial predecessors failed; they are not passes or additional independent blocks. No inherited earlier-phase result is included. [All attempts and exact failed cases](../qa/evidence/leave-feedback/browser-summary.json).

| Failed executions | Classification / resolution |
| ---: | --- |
| 18 | New harness route/body/selector/precondition errors: read against a write-only route, assumed POST reason field, wrong MSS button name, ambiguous status live regions, insufficient pagination fixture rows, and capturing a 308 instead of terminal withdrawal response. Corrected without weakening real HTTP/persistence checks. |
| 6 | Missing copied fixture directories/seed scripts prevented HR suite setup; 36 cases did not run. Prepared the owned namespace and reran all 48. |
| 12 | Old exact message assertions no longer matched the intended safer error/import wording. Updated to require truthful outcomes and preserved DB assertions. |
| 2 | Real MSS focus loss in Chromium/Firefox after disabling the asynchronous action button. Shared failure focus fixes the keyboard ownership issue. |
| 3 | Real canceled catalog refresh: one broad failure plus two repeated failures after a timing-only transition attempt. Final canonical GET and GET-only retry passed all nine repetitions and joined cases. |
| 3 | Real Counted badge contrast failure in every engine. Reused the central status badge; final rendered ratio 6.49:1. |
| 2 | Late Firefox synchronization budgets under host pressure: authentication returned 200 after 6.119 seconds while URL assertion started at click with a five-second limit; deliberately delayed document stream took 4.662 seconds inside a five-second render budget. Await successful auth / completed document transport before unchanged UI assertions. Complete 9- and 27-case suites reran clean; one earlier serial successor remained unexecuted in its original report. |

The initial lint/build attempt rejected synchronous receipt state updates in an effect. The final receipt uses an SSR-safe client readiness gate and initializer; the lint rule and hydration warnings were not disabled. Interrupted intermediate builds and an initial working-directory command error are not passing build/test evidence. Host memory pressure was observed; no login latency SLA or production performance certification is claimed.

## Accessibility and visual scope

**186 final PNG files**, including **21 new feedback captures**. Seven representative final images were actually viewed across desktop, tablet, mobile and all three engines; other captures were not all individually inspected. Invalid-field states and focus transitions are also retained in traces. Full-page fixed/sticky/dialog captures and long-form scaling limit what one PNG establishes. [Screenshot index](../qa/evidence/leave-feedback/screenshots.md), [comparison index](../qa/evidence/leave-feedback/screenshot-comparison-index.md), [manual review](../qa/evidence/leave-feedback/manual-visual-review.json).

Keyboard/names/descriptions, correction focus, persistent failure summaries, Escape/discard preservation, existing dialog trapping/restoration, table scrolling and reduced-motion selections pass. Automated evidence: **117 scan files, zero violation entries**. The complete new scans retain **27 incomplete rule entries: 21 contrast + 6 ARIA**. Named generic summary/quantity divs remain a semantic-grouping finding; incomplete checks are **not passes**. [Accessibility evidence matrix](../qa/evidence/leave-feedback/accessibility-evidence-matrix.md), [all scans](../qa/evidence/leave-feedback/accessibility-scans.json).

Actual screen-reader speech, native 200%/400% zoom, physical devices and formal WCAG conformance are **unexecuted in this pass**. Existing whole-form length, broader MSS density, projection/policy and operational/statutory gates remain open. Local automation is not whole-product accessibility or production certification.

## Cleanup and integrity

[Fixture audit](../qa/evidence/leave-feedback/fixture-cleanup.json): zero remaining tenants, users, document artifacts and private media files. [Owned infrastructure cleanup](../qa/evidence/leave-feedback/cleanup.json): PostgreSQL container/volume, API, three frontends, private runtime/environment and intermediate builds removed; owned ports closed. The final artifact and all historical reports/traces remain; unrelated processes and shared Docker images were preserved.

[277 protected backend application/configuration files](../qa/evidence/leave-feedback/protected-backend.json) match the prior certified snapshot. This comparison excludes test files; the preceding report documented date-only fixture corrections. This task did not edit backend application or test code. Frozen gate-file hashes remain unchanged, and the append-only report-export audit prefix was preserved. [Audit preservation](../qa/evidence/leave-feedback/audit-preservation.json).

## Decision

**Scoped local feedback functionality PASS; overall release CONDITIONAL.** Resolve the documented accessibility and existing operational/production requirements separately. Existing Lightsail staging-promotion and real-payroll production **NO-GO** gates were not advanced. No Lightsail deployment, billable AWS resource, customer-data operation or next-module redesign occurred. Stop at this feedback standard and certification for review.
