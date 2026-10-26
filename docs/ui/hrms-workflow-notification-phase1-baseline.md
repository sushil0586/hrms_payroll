# Workflow and Notification Management Phase 1 — baseline protocol

Prepared: 24 October 2026. Status: accepted baseline complete within the route-shell, responsive, state, permission, keyboard and selected automated-accessibility scope recorded below.

## Baseline objective

Capture the current 20-route family before implementation and turn observed issues into reproducible acceptance checks. The baseline is read-only except for owned preview/test fixtures explicitly created and removed for state coverage.

## Capture matrix

- Widths: 1440 × 900, 1024 × 768, 768 × 1024, 390 × 844 and 320 × 568.
- Additional short-height states: workflow step editor, assignment scope form, notification template/event form, delivery configuration and ESS/MSS detail modal.
- States: populated, empty tenant, filtered no-match, loading, recoverable API failure, unavailable/stale item and permission denial.
- Interaction: first task focus, filter Apply/Enter/Clear, Back/Forward, pagination, row action, dialog open/close/Escape/focus return and dirty-form close.
- Accessibility: one H1, labelled regions/tables, accessible control names, visible focus, logical order, reduced motion and selected axe scans.

## Contract discovery checklist

For each route record its server/client boundary, source component, API calls, permission requirements, query keys, pagination model, count population, selected-record behavior, writes, audit effects, return target and downstream consumer. For each write record valid transition, invalid transition, duplicate protection, abort/5xx/malformed behavior, retained operator input and persisted success evidence.

## Initial source observations to verify in renders

- The workflow control center derives several summaries from loaded arrays; labels must be checked to ensure they do not imply tenant-wide totals when pagination or bounded projections apply.
- Workflow template and assignment catalogs currently offer limited visible filtering compared with trace and notification catalogs; Phase 1 must distinguish a real endpoint limitation from a missing UI control.
- Notification navigation is split across a control center, action menu and page-local handoffs; inspect whether operators see one clear next task.
- Preview, test-send, saved configuration and live delivery evidence must use different feedback language.
- Diagnostics tables and queue action groups are dense and need explicit 320-pixel and keyboard inspection.
- ESS/MSS inbox detail behavior must retain filters and focus and must not expose another user's notification through a supplied ID.

## Exit artifacts

The bounded Phase 1 baseline closes after publishing a source/build record, machine-readable result, responsive captures, state and permission checks, selected accessibility results and zero-residue cleanup proof. Write-transition, service-failure and persisted recovery cases remain gates of the implementation phase that owns each action. Historical tests are inputs, not accepted Phase 1 executions.

## Accepted initial execution — 24 October 2026

- The machine inventory remained exactly 20 unique route patterns: 18 HR Admin and two ESS/MSS consumers.
- Chromium, Firefox and WebKit each passed 21 of 21 checks with retries disabled: one inventory guard and 20 route checks. Accepted total: **63 of 63**.
- Every route returned the expected current page, exposed one visible H1 and avoided document-level horizontal overflow at 1440 × 900, 1024 × 768, 768 × 1024, 390 × 844 and 320 × 568.
- Visible table regions retained a keyboard entry point and accessible name. Each route exposed and accepted focus on its first enabled task control.
- Dynamic edit routes used owned persisted workflow templates, assignments, notification templates and events. Notification review used the isolated fixture's owned manager notification rather than an invented or foreign ID.
- Chromium produced 20 narrow-screen full-page captures. Browser results are recorded in `browser-accepted.txt` and `results.json` under `docs/qa/evidence/workflow-notification-phase1-2026-10-24`.
- The isolated tenant cleanup completed after every project; the final database tenant count was zero.

## Accepted state follow-up — 24 October 2026

- Chromium passed **5 of 5** focused scenarios with retries disabled. Combined with the three-engine route run, the accepted Phase 1 total is **68 of 68**.
- HR workflow and notification catalogs plus ESS/MSS inboxes preserved filtered no-match scope through Clear and browser Back navigation.
- Employee and manager personas were denied access to the sampled HR notification APIs.
- The MSS detail dialog exposed modal semantics, closed with Escape and restored focus to its opener.
- Five representative WCAG 2 A/AA and 2.1 AA axe scans passed with zero violations: workflows, delivery configuration, delivery queue, diagnostics and the MSS inbox.
- The scan found and drove two shared contrast corrections: notification faint text now uses `#596579`, and accent chips use `#5145cd` against their pale accent surface.
- Production build output, the final state log, machine-readable results and axe JSON are stored under `docs/qa/evidence/workflow-notification-phase1-2026-10-24`.

This closes the bounded Phase 1 baseline. Genuine empty, loading, recoverable service failure, unavailable item and write-transition behavior are tested in the implementation phase that changes each relevant surface, beginning with Phase 2 workflow configuration.
