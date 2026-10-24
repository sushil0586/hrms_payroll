# Payroll Phase 1 — current rendered design baseline

Prepared: 24 October 2026. Status: **Phase 1 complete as a read-only rendered/source baseline; workflow acceptance remains open for Phases 2–7.**

## Baseline result

The current production build `yg7UOTj_6aViKFnMslNGK` rendered all **35 route patterns** in Chromium, Firefox and WebKit. The suite passed **108/108 executions**: 105 route/browser combinations plus one inventory guard in each engine. It checked one visible H1, Accerio shell/page composition, hydrated client regions, page errors, document overflow and labelled focusable table regions at 1440, 1024, 768, 390 and 320 pixels.

The run retained **315 screenshots**: every route in every engine at 1440, 390 and 320 pixels. It also retained 105 per-route proof records. Browser retries were disabled; there were zero failed, skipped or flaky executions.

Evidence: [Phase 1 evidence index](../qa/evidence/payroll-makeover-phase1-2026-10-24/README.md), [machine route inventory](hrms-payroll-route-inventory.json), [action/filter/authorization map](hrms-payroll-phase1-contract-map.md).

## Inspected findings

Six representative final images were inspected across engines, desktop and mobile: Payroll Setup, Inputs, Review, Providers, Payroll Register and TDS E-file Readiness.

1. **The shared visual language is already present.** Headers, compact tags, summaries, cards, tabs, action buttons, notices and table containers align with the earlier Accerio families. Phase 2 should refine task order and interaction contracts rather than replace the visual system.
2. **Operational mobile pages are extremely long.** Payroll Inputs exceeds thirteen thousand rendered pixels at 320px in the populated fixture. Review and provider screens also stack many full workflows into one document. This creates high navigation cost even though horizontal document overflow is absent.
3. **Several pages expose too many simultaneous work areas.** Inputs combines journey, runs, snapshots, detail, two creation/import forms and lock readiness. Review combines journey, queue, state, calculation, four controls, exception creation/decision, approvals and lines. Providers combines connection selection, certification, mapping, rehearsal, registry and audit evidence. Later phases should use deliberate progressive disclosure while preserving evidence and actions.
4. **Desktop detail balance varies.** Payroll Setup leaves a large quiet area below its primary summary while a long configuration snapshot occupies the right rail. Providers is information-dense across the full page. Phase-specific composition should keep the current task and selected record dominant.
5. **Mobile report controls remain usable but dense.** Payroll Register stacks hub navigation, summaries, export actions, filters, table and pagination correctly. The page is lengthy and should keep committed filters and report scope visible when actions occur.
6. **A concrete mobile summary defect is visible on TDS readiness.** Metric labels and values overlap at 390px (`Ready`, `Blocked`, counts and explanatory text). This is a Phase 6 responsive defect, not a stylistic preference.
7. **Wide statutory tables rely on internal containment.** The TDS gate table is contained by the page but presents only part of each row at mobile width. Phase 6 must verify labelled keyboard scrolling and decide whether a parity-preserving card representation improves comprehension.
8. **Empty fixtures are sometimes useful but insufficient for workflow review.** Payroll Register correctly displays a genuine empty state in this fixture. Phase 6 still needs populated, no-match, unavailable, more-than-one-page and export-parity states.

## Source and contract findings

- The permission catalog separates setup view/manage, inputs view/manage, calculate, review, approve, lock, publish, outputs view/download, finance handoff create/transmit/acknowledge, statutory setup/view/export and report view/export. Each phase must test its real endpoint guard rather than infer authority from menu visibility.
- Input selection exposes `runId` and `snapshotId`; source currently falls back to the first loaded run when the requested run is absent. Phase 3 must determine whether this is deliberate and add explicit stale/off-scope feedback where needed.
- Payroll reports use a mix of URL-backed and client-local filters. Phase 6 must normalize committed scope before claiming reload, copied-link or Back/Forward parity.
- Existing payroll browser and backend suites cover substantial business behavior. They remain domain baselines, but their historical results are not counted as current Phase 1 workflow passes.

## Phase handoff

Phase 2 starts with the four configuration routes. Its implementation batches should be: payroll calendars/periods/groups; salary components/structures/assignments; statutory packs/components/slabs/registrations/calendars; rule definitions/versions/evaluation. Each batch carries its populated and mobile baseline forward and adds real persistence, validation, permission, tenant, draft/pending and uncertain-outcome coverage.

Phase 1 does not certify calculations, maker-checker transitions, publication, finance transmission, provider connectivity, filing packages, report completeness or production readiness.
