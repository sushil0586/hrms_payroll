# Payroll Phase 2 — configuration makeover

Prepared and certified: 24 October 2026. Status: complete. Scope: Payroll Setup, Salary Setup, Payroll Statutory and Payroll Rules.

## Outcome

The four configuration workspaces now use the same compact task model established by the Leave, Attendance and Organization/Lifecycle makeovers. Each screen keeps its route-level summary and read views, then presents one active create/edit family at a time under Setup Actions. On narrow screens, route and action tabs form a horizontally scrollable task strip instead of stacking every choice into a long preamble.

The shared behavior is:

- one route H1 and one named configuration console;
- a compact summary before detailed work;
- one selected setup family with visible context;
- hash-backed action selection that survives reload;
- consistent record selection, create/edit mode, saved-record paging and pending button state;
- field and summary validation without clearing entered values;
- internal containment for long statutory references and readiness values;
- no document-level horizontal overflow at 320px.

## Screen contracts

| Workspace | Read sections | Setup action families | Workflow evidence |
| --- | --- | --- | --- |
| Payroll Setup | Overview, calendars, periods, pay groups, assignments | Calendars, periods, pay groups, assignments | Calendar, period, pay-group and assignment create/update; dependency and date validation; mobile action switching. |
| Salary Setup | Overview, components, structures, versions, assignments, actions | Import, components, structures, versions, lines, assignments | CSV preview/commit, component through assignment create/update, effective-date and amount validation, mobile action switching. |
| Payroll Statutory | Overview, declarations, compliance, catalog, actions | Import, catalog, compliance, profiles, declarations | Profile import, pack/component/slab/registration/filing/profile/declaration/item CRUD and proof actions, source hashes, mobile action switching. |
| Payroll Rules | Overview, rules, versions, trace, actions | Definitions, versions | Definition and effective-dated version creation, JSON/expression validation, version/detail readback, mobile action switching. |

The route tabs answer “what area am I reviewing?” and the action tabs answer “what configuration task am I performing?”. The two levels remain visually distinct and retain their own active state.

## Responsive correction

At widths up to 720px, route tabs and setup-action tabs keep a single compact row with touch scrolling and snap alignment. Each target remains at least 56px high and nearly fills the viewport, so the next task remains visible as a spatial cue. The active work context stacks above the form, and form grids collapse to one column.

Statutory readiness cards now force long provider, source, FVU and configuration references to wrap inside their card and detail cells. This resolves the overlap found in the Phase 1 TDS mobile baseline.

## Certification

The accepted source-matched production build is `XWGfNDvxUPV0vUHgMpkDV`.

- 15/15 Phase 2 responsive executions passed: five checks in Chromium, Firefox and WebKit.
- 12 action-console executions covered four workspaces across all three engines.
- Three statutory overview checks proved every TDS readiness card is internally contained at 320px.
- 15/15 Chromium workflow tests passed against an owned synthetic tenant, covering real create/update, validation, imports, proof actions, source evidence and mobile behavior.
- 15 final screenshots cover every configuration console plus the statutory overview in all three engines.
- Production build, TypeScript validation inside the build, focused ESLint and Django system check passed.
- All Playwright-owned tenants were removed with `verified_absent: true`; the isolated PostgreSQL service was removed after certification.

Evidence is indexed in [Payroll Phase 2 evidence](../qa/evidence/payroll-makeover-phase2-2026-10-24/README.md).

## Boundary

This phase certifies configuration UI composition and the existing browser workflows against the isolated local environment. Payroll calculation, input locking, review, settlement, publication, finance handoff, provider transport and report-wide filter/export parity belong to later phases. Statutory e-file readiness remains tenant-data evidence; it does not certify submission to government utilities.
