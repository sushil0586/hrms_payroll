# HR Admin Unified UI/UX Model

Date: 2026-10-09  
Phase: E90-8 UX Consistency Pass  
Prototype reference: [HR Admin compact operations prototype](../prototypes/hr-admin-compact-operations-prototype.html)
Execution plan: [HR Admin E90-8 Module-wise UX Execution Plan](./hr-admin-e90-8-module-wise-ux-execution-plan-2026-10-09.md)

## Purpose

This model defines one shared UI/UX standard for the full HR Admin module. Every HR Admin screen should feel like part of the same compact, professional operations product used daily by HR, payroll, and compliance teams.

## Product Feel

- Compact, serious, and fast to scan.
- Built for repeated work, not marketing presentation.
- Small fonts, short controls, low vertical spacing.
- Clear filters, clear status, clear next action.
- Minimal page switching for view/update work.
- No giant cards, no oversized headers, no decorative sections.

## Density Tokens

Use these as the target for HR Admin screens:

| Element | Target |
| --- | --- |
| Body text | `12px` |
| Metadata/chips/help text | `10px-11px` |
| Form controls | `11px-12px`, `25px-30px` height |
| Page title | `16px-18px` |
| Section title | `13px-15px` |
| Table row padding | `5px-8px` vertical |
| Card/panel radius | `6px-8px` |
| Main page padding | `6px-10px` |
| Panel padding | `7px-10px` |

## Page Types

Every HR Admin page should map to one of these types.

| Page type | Responsibility | Preferred layout |
| --- | --- | --- |
| Hub | Summarize work areas and route users. | Compact metric strip plus dense action links. |
| Queue | Filter, compare, act on records. | Filter toolbar, paginated table/list, modal view/update. |
| Detail | Deep evidence or audit history. | Focused sections, source links, limited actions. |
| Create/Edit | Structured setup or long form. | Full page form with sections and validation. |
| Import | Bulk upload/preview/commit. | Template, paste/upload, preview table, commit summary. |
| Report | Filter/export/manifest/print evidence. | Compact filters, metrics, paginated report rows. |
| Control | Cross-module operational readiness. | Journey/status rows, evidence links, action queue. |

## Page Anatomy

Preferred order:

1. Compact top context bar when useful.
2. Compact page header with title, one-line description, and key actions.
3. Metric strip only if it helps triage.
4. Dense filter toolbar.
5. Main queue/report/list.
6. Pagination near the controlled data.
7. Modal/drawer for quick view/update.
8. Full detail page only for deep evidence.

## Navigation Model

- HR Admin navigation should be compact and predictable.
- Use consistent module groupings: Workforce, Time & Leave, Payroll, Reports, Setup, Governance.
- Current section must be visually obvious.
- Avoid sending users through dashboard pages when a direct operation link exists.
- Keep secondary navigation slim; no large tab panels unless the page genuinely has multiple modes.

## Queue Model

Queues are the default for operational work.

Required:

- Search.
- Status filter.
- Risk/state filter where applicable.
- Rows/page selector.
- Clear filters.
- Pagination.
- Empty state.
- Row-level View/Update action.

Preferred:

- Table for dense comparison.
- Record cards only when row content is too heterogeneous.
- View/update in modal so the user keeps list context.
- Full detail link inside modal for deeper audit.

## Modal/Drawer Model

Use modals or drawers for quick view/update flows:

- Leave request review.
- Attendance regularization decision.
- Attendance record quick edit/status update.
- Leave balance adjustment/encashment/reserve.
- Payroll exception decision.
- Payroll adjustment/post-lock impact review.
- Shift assignment conflict preview.
- Roster rollout preview summary.

Modal structure:

- Header: record title, employee/code/status, close action.
- Tabs: Summary, Evidence, Decision, History.
- Body: two-column desktop, one-column mobile.
- Footer: Cancel, Save draft, Apply/Submit primary action.
- Keep queue visible behind modal.

Use full pages for:

- New setup records.
- Long policy configuration.
- Bulk import preview/commit.
- Deep audit history.
- Printable reports.

## Filter Model

Filters should be compact and consistent:

- Labels: Search, Status, Risk, Scope, Date from, Date to, Rows.
- Buttons: Apply filters, Clear.
- Place filters in one toolbar/grid, not multiple stacked panels.
- Use date ranges for time-based queues.
- Use page-size controls for growing lists.
- Keep filters server-backed where data can grow.

## Pagination Model

Every scalable list/report should have pagination.

Required display:

- Current range: `1-25 of 248 records`.
- Page state: `Page 1 of 10`.
- First, Previous, Next, Last.
- Rows selector when useful.

Pagination must reflect backend totals, not just visible rows.

## Report Model

Reports should be evidence tools, not dashboards.

Required:

- Compact filters.
- Export filtered CSV.
- Manifest.
- Print.
- Source endpoints in manifest.
- Checksum headers on export.
- Export audit where applicable.
- Employee/unauthorized RBAC negative browser QA.

## Form Model

Forms should be compact but not cramped.

- Two-column desktop layout.
- Single-column mobile layout.
- Group only related fields.
- Use inline help text sparingly.
- Use validation near the field.
- Keep sticky action footer for long forms.
- Avoid decorative section cards inside other cards.

## Empty, Error, Loading, Read-only States

Every page must provide:

- Empty state with clear next action.
- Recoverable error state with retry or navigation.
- Loading state that does not shift layout heavily.
- Read-only state for users without update permission.
- No raw backend stack/errors shown to users.

## Responsive Rules

Desktop `1440px`:

- Queue, filters, metrics, and detail/modal context should fit with minimal scroll.

Small laptop `1180px`:

- Collapse sidebar.
- Keep metric strip compact.
- Keep filters in 3-4 columns where possible.

Tablet `768px`:

- Queue and detail stack.
- Filters use 2-3 columns.
- Tables may scroll horizontally only inside table container.
- Page itself must not horizontally overflow.

Mobile `390px`:

- Use compact top nav.
- Two-column filters/metrics where practical.
- Modal becomes bottom-sheet style.
- No overlapping labels/buttons/text.

## Screen-Specific Application

### Time & Leave

- Attendance records: queue plus quick modal for status, lock, regularization evidence.
- Regularizations: queue plus decision modal.
- Leave requests: queue plus approve/reject/send-back modal.
- Leave balances: queue plus adjustment/encash/reserve modal.
- Shifts/rosters: list plus conflict/rollout preview modal.

### Payroll

- Payroll inputs: compact run/snapshot queue; full evidence detail only on demand.
- Calculations: run list plus calculation evidence drilldown.
- Review: exception queue plus decision modal.
- Adjustments: queue plus post-lock impact modal.
- Outputs/handoff: compact lanes, provider evidence on demand.

### Reports

- Keep report pages slim and export-focused.
- Avoid operational mutation controls inside reports.
- Link back to source queues/details.

### Setup/Policies

- Use full pages for create/edit.
- Keep list pages compact and paginated.
- Use modals for conflict preview or quick assignment inspection.

## Browser QA Contract

Each E90-8 slice must include browser QA for:

- Desktop no horizontal overflow.
- Mobile no horizontal overflow.
- Filter controls visible and usable.
- Pagination visible when data can grow.
- Modal open/close and primary action path where implemented.
- Read-only or RBAC negative state.
- Export/manifest for reports.

## Implementation Order

1. Establish shared CSS/component primitives for compact HR Admin pages.
2. Apply to Time & Leave queues and modals.
3. Apply to Payroll operation queues and modals.
4. Apply to Reports pages.
5. Apply to Setup/Policy pages.
6. Final HR Admin dashboard/navigation pass.

## Definition Of Done

A screen is E90-8 compliant when:

- It maps to one page type.
- It follows density tokens.
- It has proper filters and pagination where needed.
- View/update work preserves queue context through modal/drawer where practical.
- It has no horizontal overflow on desktop/tablet/mobile.
- It has professional empty/error/read-only states.
- Browser QA for that slice passes.
