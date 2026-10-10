# HR Admin Compact UX Prototype

Date: 2026-10-09  
Phase: E90-8 UX Consistency Pass  
Prototype: [HR Admin compact operations prototype](../prototypes/hr-admin-compact-operations-prototype.html)
Unified model: [HR Admin Unified UI/UX Model](./hr-admin-unified-ui-ux-model-e90-8-2026-10-09.md)
Execution plan: [HR Admin E90-8 Module-wise UX Execution Plan](./hr-admin-e90-8-module-wise-ux-execution-plan-2026-10-09.md)

## Goal

Create a professional HR-operator interface standard before changing the real HR Admin module. The target is compact, fast to scan, low-scroll, and suitable for daily HR/payroll work.

## UX Direction

- Use smaller, readable fonts: 10-11px metadata/chips, 11-12px controls, 12px base text, 16-18px page titles.
- Keep page headers very compact. No large hero treatment inside HR Admin operations.
- Keep one responsibility per page: queue, setup, detail, report, import, or control.
- Put filters in one dense toolbar row/grid with clear Apply/Clear actions; avoid tall filter panels.
- Keep primary actions visible but restrained, with short labels and compact button heights.
- Prefer slim tables or dense record rows for operational queues.
- Use modal/drawer popups for quick view/update flows when the user should keep queue context.
- Reserve full pages for complex create flows, deep audits, long forms, and printable reports.
- Use metric strips only when they help triage; keep metric tiles short and avoid oversized decorative cards.
- Keep pagination close to the list/report it controls.
- Avoid nested cards and tall section stacking.
- Keep labels consistent: Search, Status, Risk, Rows, Apply filters, Clear, Export CSV, Manifest.

## Prototype Structure

- Top command bar: module switch, search, date/pay-cycle context, quick actions.
- Left compact navigation: one-line HR Admin areas with active state.
- Page header: title, concise description, primary actions.
- Metric strip: compact operational counts.
- Filter toolbar: dense grid, single row on desktop where possible.
- Main work area: split queue/detail layout to reduce navigation and scrolling.
- Right insight rail: selected record evidence, next action, source links.
- Modal popup: quick view/update with Summary, Evidence, Decision, and History tabs.
- Pagination: slim controls with record range and page state.

## Acceptance Standard For E90-8

- Desktop 1440px: primary queue, filters, metrics, pagination, and detail context visible with minimal scrolling.
- Small laptop 1180px: collapsed navigation, five compact metrics, and most filters visible without a tall stack.
- Tablet 768px: filters wrap into three compact columns; actions remain reachable; no horizontal overflow.
- Mobile 390px: two-column filters/metrics where practical, single-column detail, no overlapping text, no giant cards.
- Every HR Admin list/report page has useful filters and pagination if data can grow.
- Queue rows should support View/Update in compact modals where practical, avoiding unnecessary page changes.
- Every page has a clear empty state and permission/read-only state.
- Browser QA must include no-horizontal-overflow checks for each slice.

## Implementation Slices

1. Time and Leave operations: attendance records, regularizations, leave requests, balances, policies, shifts, rosters.
2. Payroll operations: inputs, calculations, review, adjustments, outputs, handoff, readiness.
3. Reports: payroll input exceptions, close readiness, attendance derivation, leave-attendance collisions, roster audit.
4. Policy and assignment setup: policy masters, assignments, governance panels, imports.
5. HR Admin dashboard/navigation: final consistency pass across hubs and links.

## Notes

This prototype is intentionally dense. HR users generally need comparison, scanning, filtering, and repeated action more than marketing-style presentation. The real implementation should keep visual polish, but operational density wins.
