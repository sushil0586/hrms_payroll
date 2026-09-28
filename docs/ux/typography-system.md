# HRMS Typography System

This document defines the product typography contract for HRMS. The notification module is the pilot implementation; once approved, the same rules should be rolled across HR Admin, Tenant Admin, ESS, MSS, Platform Admin, support, and public/auth pages.

## Design Goal

Typography should make the product feel calm, operational, and trustworthy. HR, finance, tenant admins, employees, and managers should be able to scan dense workflows without every row competing for attention.

The target feeling is:

- Professional SaaS control center.
- Clear enough for daily operations.
- Calm enough for payroll/compliance work.
- Dense where needed, but never visually noisy.

## Font Family

- Primary: `Avenir Next`
- Fallbacks: `Plus Jakarta Sans`, `Manrope`, `Segoe UI`, `sans-serif`
- Display and UI should use the same family for operational screens.
- Marketing/public hero sections may use larger display sizing, but not a separate visual language.
- Monospace is reserved for JSON, hashes, payloads, logs, exports, and command snippets.

## Core Tokens

Defined in `web/src/styles/tokens.css`:

- `--type-size-2xs`: `10px`
- `--type-size-xs`: `11px`
- `--type-size-sm`: `12px`
- `--type-size-md`: `13px`
- `--type-size-base`: `14px`
- `--type-size-lg`: `16px`
- `--type-size-xl`: `18px`
- `--type-size-2xl`: `22px`
- `--type-size-3xl`: `28px`
- `--type-size-page`: `clamp(28px, 3vw, 40px)`
- `--type-weight-regular`: `400`
- `--type-weight-medium`: `500`
- `--type-weight-semibold`: `600`
- `--type-weight-bold`: `700`
- `--type-weight-heavy`: `760`
- `--type-leading-tight`: `1.15`
- `--type-leading-title`: `1.2`
- `--type-leading-copy`: `1.45`
- `--type-leading-comfortable`: `1.6`
- `--type-tracking-normal`: `0`
- `--type-tracking-label`: `0.04em`

## Global Rules

- Use heavy weights only for page titles, key metric values, and the primary row title.
- Avoid repeated `800/900` weights in cards, grids, chips, tables, and buttons.
- Letter spacing should be `0` for normal text.
- Uppercase is allowed only for compact taxonomy labels, table headers, and status/system labels.
- Body text must be readable, not washed out. Prefer slate-600/700 range for operational copy.
- Dense grids should prioritize alignment and scan speed over visual drama.
- Keep line-height generous for paragraph text and tighter for row labels and titles.
- Never use viewport-based font scaling except controlled title clamps.
- One page should have one clear typographic peak: the page title.

## Type Scale By UI Section

### App Shell

Sidebar product name:

- Size: `18px`
- Weight: `700`
- Line-height: `1.2`

Sidebar workspace role/subtitle:

- Size: `13px`
- Weight: `400-500`
- Color: muted

Sidebar group labels such as Workspace, Operations, Governance:

- Size: `11px`
- Weight: `700`
- Letter spacing: `0.04em`
- Uppercase: yes

Sidebar nav item title:

- Size: `14px`
- Weight: active `700`, inactive `600`
- Line-height: `1.25`

Sidebar nav item description:

- Size: `12px`
- Weight: `400-500`
- Line-height: `1.35`

Top search placeholder:

- Size: `13px`
- Weight: `400-500`

Top quick links:

- Size: `13px`
- Weight: `600`

User chip name:

- Size: `13px`
- Weight: `700`

User chip role:

- Size: `11-12px`
- Weight: `400-500`

### Page Header

Eyebrow:

- Size: `11px`
- Weight: `700`
- Letter spacing: `0.04em`
- Uppercase: yes

Page title:

- Size: `28-40px`
- Weight: `700`
- Line-height: `1.15`
- Letter spacing: `0`

Page description:

- Size: `13-15px`
- Weight: `400`
- Line-height: `1.45-1.6`

Header action buttons:

- Size: `13-14px`
- Weight: `600`

Header pills:

- Size: `11-12px`
- Weight: `600`
- Letter spacing: `0.04em`

### Section Headers

Section title:

- Size: `18-22px`
- Weight: `700`
- Line-height: `1.2`

Section description:

- Size: `13px`
- Weight: `400`
- Line-height: `1.45`

Section meta count:

- Size: `12px`
- Weight: `600`

### Metrics And KPI Tiles

Metric label:

- Size: `11-12px`
- Weight: `600`
- Letter spacing: `0.04em` only when used as compact label

Metric value:

- Size: `26-34px`
- Weight: `700`
- Line-height: `1`

Metric trend/subtitle:

- Size: `11-12px`
- Weight: `400-500`
- Line-height: `1.35`

Metric values should be visually strong, but labels should stay calm.

### Cards

Card title:

- Size: `16-18px`
- Weight: `700`
- Line-height: `1.2`

Card subtitle/body:

- Size: `13px`
- Weight: `400`
- Line-height: `1.45`

Card meta:

- Size: `12px`
- Weight: `400-500`

Repeated cards should not use display font or `800/900` weight.

### Record Rows And Queue Items

Primary row title:

- Size: `14-16px`
- Weight: `700`
- Line-height: `1.25`

Secondary row metadata:

- Size: `12px`
- Weight: `400-500`
- Line-height: `1.35`

Inline warnings/errors:

- Size: `12-13px`
- Weight: heading `700`, message `400`

Expanded row details:

- Label: `11px`, weight `600`, optional uppercase
- Value: `13px`, weight `500-600`

Row actions:

- Size: `13px`
- Weight: `600`

Action alignment:

- Page, toolbar, table, card, queue, and form action groups align to the right on desktop.
- Supporting text stays left; the decision/action buttons sit on the right edge.
- Primary action appears last in the visual row unless the workflow has a destructive confirmation pattern.
- Status chips may sit before the action button, but must not push the button away from the right edge.
- On mobile, actions may stack full-width for tap comfort, but the ordering should remain: context first, action last.
- Use this pattern for `page-intro__actions`, `queue-toolbar__actions`, `record-card__actions`, `pagination-bar__actions`, `form-actions-bar__buttons`, and module-specific action footers.

### Tables

Table header:

- Size: `11px`
- Weight: `600-700`
- Letter spacing: `0.04em`
- Uppercase: yes

Primary cell text:

- Size: `13-14px`
- Weight: `600-700`

Secondary cell text:

- Size: `12px`
- Weight: `400-500`

Numeric cell:

- Size: `13-14px`
- Weight: `600`
- Align according to table design, usually right for money/counts

Table action buttons:

- Size: `12-13px`
- Weight: `600`

Avoid all-bold table rows. Only the identifying cell should be prominent.

### Forms

Field label:

- Size: `11-12px`
- Weight: `600-700`
- Letter spacing: `0.04em`
- Uppercase: yes for compact labels, normal case for conversational labels

Input/select/textarea text:

- Size: `14px`
- Weight: `400`
- Line-height: `1.4`

Helper text:

- Size: `12px`
- Weight: `400-500`
- Line-height: `1.4`

Validation message:

- Size: `12px`
- Weight: `500-600`

Form section title:

- Size: `18px`
- Weight: `700`

Form section description:

- Size: `13px`
- Weight: `400`

### Lifecycle Queues And Workflow Forms

Lifecycle queues cover onboarding, movement, probation review, exit, and the unified lifecycle inbox.

Queue page title:

- Short noun phrase, usually `Lifecycle`, `Onboarding operations`, `Movement operations`, `Probation reviews`, or `Exit operations`
- Avoid sentence-length headings in these operational pages

Queue toolbar title:

- Size: `17px`
- Weight: `700-760`
- Line-height: `1.2`

Queue toolbar description:

- Size: `12px`
- Weight: `400-500`
- Line-height: `1.45`
- Keep to one sentence

Queue filter labels:

- Size: `10-11px`
- Weight: `700`
- Letter spacing: `0.06-0.08em`
- Uppercase: yes

Bulk action rows:

- Split owner actions and status/decision actions into separate groups
- Input/select stays left inside the group
- Buttons align right on desktop and stack full-width on mobile
- Live bulk actions must show visible confirmation or a visible error

Lifecycle record title:

- Size: `16px`
- Weight: `700-760`
- Line-height: `1.22`

Lifecycle record metadata:

- Size: `12px`
- Weight: `400-500`
- Line-height: `1.4`

Lifecycle chips:

- Size: `9.5-10px`
- Weight: `700`
- Letter spacing: `0.06em`
- Use compact uppercase labels only

Lifecycle detail cells:

- Label: `10px`, weight `700`, uppercase
- Value: `12px`, weight `600-680`
- Cells should be compact and quiet, not card-like profile blocks

Lifecycle create/edit forms:

- Use compact child-form rhythm
- Form shell title: `17px`, weight `700-760`
- Form section title: `15px`, weight `700`
- Form section description: `12px`, max two visible lines
- Sticky action bar has supporting text left and buttons right

### Buttons

Primary, secondary, ghost, danger:

- Size: `13-14px`
- Weight: `600`
- Letter spacing: `0`
- Line-height: `1`

Compact button:

- Size: `12-13px`
- Weight: `600`

Disabled button:

- Same size and weight as enabled state.
- Use muted color and disabled background, not reduced legibility.

Buttons should never be visually heavier than row titles.

### Chips, Badges, Pills, Status Labels

Standard chip:

- Size: `11-12px`
- Weight: `600`
- Letter spacing: `0.04em` only for taxonomy/status labels
- Uppercase: yes for status and module codes, no for conversational chips

Status chip:

- Size: `11px`
- Weight: `700`
- Uppercase: yes

Count chip:

- Size: `12px`
- Weight: value `700`, label `500-600`

Risk chip:

- Size: `11px`
- Weight: `700`
- Uppercase: optional based on risk taxonomy

### Tabs And Segmented Controls

Tab text:

- Size: `12-13px`
- Weight: active `700`, inactive `600`
- Letter spacing: `0.02-0.04em` only when uppercase

Tab descriptions, if present:

- Size: `12px`
- Weight: `400-500`

### Detail Grids

Detail label:

- Size: `11px`
- Weight: `600-700`
- Letter spacing: `0.04em`
- Uppercase: yes

Detail value:

- Size: `13-14px`
- Weight: `500-600`
- Line-height: `1.35`

Long values:

- Size: `12-13px`
- Weight: `400-500`
- Use wrapping, not clipped text.

### Notices, Alerts, And Validation Strips

Notice title:

- Size: `13-14px`
- Weight: `700`

Notice body:

- Size: `12-13px`
- Weight: `400`
- Line-height: `1.45`

Critical alert title:

- Size: `14px`
- Weight: `700`

Critical alert body:

- Size: `13px`
- Weight: `400-500`

Do not use oversized text in alerts; color and placement carry urgency.

### Empty States

Empty state title:

- Size: `16-18px`
- Weight: `700`

Empty state body:

- Size: `13px`
- Weight: `400`
- Line-height: `1.45`

Empty state action:

- Button size `13px`, weight `600`

### Error States

Page-level error title:

- Size: `28-36px`
- Weight: `700`

Technical detail:

- Size: `12-13px`
- Weight: `400`
- Use monospace only for literal code, URLs, IDs, or stack/reference values.

Recovery action buttons:

- Size: `13-14px`
- Weight: `600`

### Modals And Drawers

Modal title:

- Size: `20-22px`
- Weight: `700`

Modal subtitle/body:

- Size: `13px`
- Weight: `400`
- Line-height: `1.45`

Drawer title:

- Size: `20px`
- Weight: `700`

Drawer section title:

- Size: `16-18px`
- Weight: `700`

Drawer field labels:

- Follow form label rules.

Modal footer helper text:

- Size: `12px`
- Weight: `400-500`

### Import/Bulk Workbenches

Workbench title:

- Size: `18-20px`
- Weight: `700`

Textarea/CSV/code:

- Size: `12px`
- Font: monospace
- Line-height: `1.5`

Preview table:

- Follow table rules.

Import result labels:

- Size: `11px`
- Weight: `700`
- Uppercase: yes only for status taxonomy

### Workflow/Stepper Pages

Step title:

- Size: `15-16px`
- Weight: active `700`, inactive `600`

Step subtitle:

- Size: `12px`
- Weight: `400-500`

Step number:

- Size: `12px`
- Weight: `700`

Current step content title:

- Size: `20-22px`
- Weight: `700`

### Setup Dynamic Forms

Organization, workflow template, and workflow assignment child forms use the shared compact setup rhythm.

Form shell title:

- Size: `17-18px`
- Weight: `700`
- Keep title literal and short, such as `Edit workflow` or `Create legal entity`.

Form section title:

- Size: `15-16px`
- Weight: `700`
- Use section titles for task grouping, not long instructions.

Field labels:

- Size: `10px`
- Weight: `700`
- Uppercase taxonomy style only.

Helper text:

- Size: `12px`
- Weight: `500-600`
- Keep warnings inline and concise.

Form actions:

- Right-aligned on desktop.
- Stack full-width on mobile.
- Primary action first, cancel/back secondary.

Certification rule:

- Dynamic setup routes must be opened with real record IDs, not placeholder URLs.
- Browser audit must check visible links, action alignment, no horizontal overflow, and desktop/mobile screenshots.

### Reports

Report title:

- Size: `28-36px`
- Weight: `700`

Report toolbar labels:

- Size: `11-12px`
- Weight: `600-700`

Report table:

- Follow table rules.

Report summary chips:

- Size: `12px`
- Weight: `600`

Money values:

- Size: `13-14px`
- Weight: `600-700`

Large totals:

- Size: `22-28px`
- Weight: `700`

### Payroll And Finance Screens

Payroll page title:

- Same as page title.
- Use compact command-center sizing on dense HR Admin payroll pages.
- Keep action groups right-aligned on desktop and full-width stacked on mobile.

Payroll phase title:

- Size: `16-18px`
- Weight: `700`

Payroll run name:

- Size: `15-18px`
- Weight: `700`

Payroll amount:

- Size: normal amount `14px`, major amount `22-28px`
- Weight: `700`

Exception message:

- Size: `13px`
- Weight: title `700`, body `400`

Audit/hash/source references:

- Size: `11-12px`
- Font: monospace only for actual hash/code

Payroll cycle reference pattern:

- Scope: `/hr-admin/payroll-readiness`, `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations`, `/hr-admin/payroll-review`, `/hr-admin/payroll-outputs`, `/hr-admin/payroll-handoff`.
- H1: `20-24px`, `760`, sentence-like command title behavior while preserving route identity.
- Header actions: `12px`, minimum height `36px`, right-aligned.
- Cycle journey: compact context plus step navigation; duplicate next-action card is hidden because the active page owns the decision and next step.
- Summary decision title: `17px`, `760`, one clear action group aligned to the right.
- Issues and Setup Health cards: `16px` card title, `12px` body, action button right-aligned.
- Employee table: `13px` row text, `11px` table headers, sticky header, detail panel remains secondary.
- Evidence grid: compact `detail-row` typography; evidence is available but not visually dominant.
- Payroll run cards: `16px` max title, wrapped long generated run names, compact `11px` count chips.
- Payroll cycle panels: `16px` panel title, `12px` body copy, rounded `14px` panels, no clipped chips or card text.

### Employee And Master Data Screens

Employee name:

- Size: `16-18px`
- Weight: `700`

Employee code/designation metadata:

- Size: `13px`
- Weight: `400-500`

Readiness pill:

- Size: `11-12px`
- Weight: `700`

Selected employee detail sections:

- Section title size: `13px`
- Weight: `800`
- Behavior: group related detail rows into meaningful sections instead of showing every field as a separate equal-weight card.

Employee detail label/value rows:

- Label size: `10-11px`
- Label weight: `700`
- Value size: `13px`
- Value weight: `500-600`
- Behavior: labels and values should stay visually separated, wrap within their own cell, and collapse to one column on mobile.

Master data row title:

- Size: `14-16px`
- Weight: `700`

Master data detail:

- Size: `12-13px`
- Weight: `400-500`

### Navigation Hubs And Workspace Cards

Workspace card title:

- Size: `16-18px`
- Weight: `700`

Workspace card description:

- Size: `13px`
- Weight: `400`

Workspace card eyebrow:

- Size: `11px`
- Weight: `700`
- Letter spacing: `0.04em`
- Uppercase: yes

CTA:

- Follow button rules.

### Search And Filters

Filter label:

- Size: `11-12px`
- Weight: `600-700`
- Letter spacing: `0.04em`
- Uppercase: yes

Search input:

- Size: `14px`
- Weight: `400`

Filter summary:

- Size: `12px`
- Weight: `500-600`

Filter chips:

- Size: `12px`
- Weight: `600`

### Pagination

Range text:

- Size: `12px`
- Weight: `600`

Page count:

- Size: `12px`
- Weight: `600`

Pagination buttons:

- Size: `12-13px`
- Weight: `600`

### Audit Logs And Event Timelines

Event title:

- Size: `14px`
- Weight: `700`

Event metadata:

- Size: `12px`
- Weight: `400-500`

Payload/code:

- Size: `12px`
- Font: monospace
- Line-height: `1.5`

### Code, JSON, Payloads, IDs

Use monospace only when the content is literal:

- API path
- Hash
- UUID
- JSON payload
- Command
- Error code
- Provider reference

Monospace size:

- `12px`
- Weight: `400`
- Line-height: `1.5`

Long literal values must wrap or scroll inside a bounded container.

## Notification Pilot Decisions

The notification module currently uses `notification-shell` as a scoped pilot.

Implemented decisions:

- Queue rows use calmer titles and metadata.
- Catalog tables use lower-weight headers and clearer row title hierarchy.
- Review/detail cards keep payload and delivery logs secondary.
- Buttons remain visible but are not heavier than row titles.
- Dense channel health cards use metric labels and values instead of paragraph-like bold text.

Pilot pages:

- `/hr-admin/notifications-admin`
- `/hr-admin/notification-delivery`
- `/hr-admin/notification-templates`
- `/hr-admin/notification-templates/new`
- `/hr-admin/notification-templates/[itemId]/edit`
- `/hr-admin/notification-events`
- `/hr-admin/notification-events/new`
- `/hr-admin/notification-events/[itemId]/edit`
- `/hr-admin/notifications`
- `/hr-admin/notifications/[itemId]/review`
- `/hr-admin/notification-diagnostics`

## Document Workflow Decisions

The document module uses `hr-document-workbench` as its scoped implementation.

Implemented pages:

- `/hr-admin/documents`
- `/hr-admin/employee-documents`
- `/hr-admin/employee-documents/new`
- `/hr-admin/employee-documents/[itemId]/review`
- `/hr-admin/document-categories`
- `/hr-admin/document-categories/new`
- `/hr-admin/document-categories/[itemId]/edit`
- `/hr-admin/document-requirements`
- `/hr-admin/document-requirements/new`
- `/hr-admin/document-requirements/[itemId]/edit`
- `/hr-admin/generated-letters`

Page titles:

- Use short noun phrases such as `Employee document review`, `Document categories`, and `Generated HR letters`.
- Do not put workflow instructions in the title; instructions belong in body copy or form helper text.

Document queue toolbar:

- Section title: `17px`, weight `760`.
- Helper copy: `12px`, regular, max `62ch`.
- Filter labels: `10-11px`, uppercase, semibold.
- Toolbar actions are right-aligned on desktop and full-width/stacked on mobile.

Document record cards:

- Record title: `16px`, weight `760`, normal letter spacing.
- Metadata: `12px`, muted, wraps inside the row.
- Chips: `9.5-10px`, compact uppercase, never louder than the record title.
- Row actions: right-aligned on desktop, stacked on mobile.

Document hub cards:

- Card title: `16px`, weight `760`, normal letter spacing.
- Eyebrow: `10px`, weight `760`, compact uppercase.
- Description: `12px`, regular, max two visible lines where space is tight.
- Detail labels: `10px`, compact uppercase; values: `12px`, weight `720`.
- CTA buttons: compact, right-aligned on desktop and full-width on mobile.

Document detail grids:

- Label: `10px`, semibold, uppercase.
- Value: `12px`, weight `720`.
- Cells are quiet background blocks and must not compete with the title or action buttons.

Inline document review:

- Keep quick review available inside the queue.
- Use a compact three-column control row on desktop.
- Use a static action bar, never sticky inside a queue card.
- Use the full review page when the task needs payload/history context.

Document child forms:

- Form shell title: `17px`, weight `760`.
- Form section title: `15px`, weight `700-760`.
- Section helper copy: `12px`, max two lines.
- Bottom action bars carry short supporting text on the left and right-aligned buttons on the right.

Generated letters:

- Treat authoring, preview, and generated artifacts as separate zones.
- Use a bounded preview area so long rendered letters scroll inside the panel instead of stretching the page.

## Time And Leave Decisions

The Time & Leave module uses `shell--time-leave` as its scoped implementation.

Implemented pages:

- `/hr-admin/attendance-operations`
- `/hr-admin/attendance-records`
- `/hr-admin/attendance-records/[itemId]/edit`
- `/hr-admin/attendance-regularizations`
- `/hr-admin/attendance-regularizations/[itemId]/review`
- `/hr-admin/shifts`
- `/hr-admin/shifts/new`
- `/hr-admin/shifts/[itemId]/edit`
- `/hr-admin/employee-shift-assignments`
- `/hr-admin/employee-shift-assignments/new`
- `/hr-admin/employee-shift-assignments/[itemId]/edit`
- `/hr-admin/shift-roster-templates`
- `/hr-admin/shift-roster-templates/new`
- `/hr-admin/shift-roster-templates/[itemId]/edit`
- `/hr-admin/holiday-calendars`
- `/hr-admin/holiday-calendars/new`
- `/hr-admin/holiday-calendars/[itemId]/edit`
- `/hr-admin/policies`
- `/hr-admin/policy-assignments`
- `/hr-admin/leave-balances`
- `/hr-admin/leave-types`
- `/hr-admin/leave-types/new`
- `/hr-admin/leave-types/[itemId]/edit`
- `/hr-admin/leave-policies`
- `/hr-admin/leave-policies/new`
- `/hr-admin/leave-policies/[itemId]/edit`
- `/hr-admin/leave-policy-assignments`
- `/hr-admin/leave-policy-assignments/new`
- `/hr-admin/leave-policy-assignments/[itemId]/edit`
- `/hr-admin/attendance-policies`
- `/hr-admin/attendance-policies/new`
- `/hr-admin/attendance-policies/[itemId]/edit`
- `/hr-admin/attendance-policy-assignments`
- `/hr-admin/attendance-policy-assignments/new`
- `/hr-admin/attendance-policy-assignments/[itemId]/edit`

Time & Leave page titles:

- Use short nouns such as `Shifts`, `Attendance records`, `Regularizations`, `Leave policies`, and `Attendance assignments`.
- Put operational context in supporting copy, not in the title.

Time & Leave command strip:

- Strip title: `17px`, weight `760`.
- Strip helper copy: `12px`, regular, max `68ch`.
- Navigation labels: `13px`, weight `760`; helpers: `11px`.
- Metrics align right on desktop and stack full-width on mobile.

Time & Leave queues:

- Toolbar title: `17px`, weight `760`.
- Toolbar helper copy: `12px`, max `64ch`.
- Filter labels: `10px`, compact uppercase.
- Bulk action buttons align right on desktop and stack full-width on mobile.
- Queue row titles use `16px`, weight `760`; chips stay compact and secondary.

Time & Leave forms:

- Form shell title: `17px`, weight `760`.
- Form section title: `15px`, weight `760`.
- Section helper copy: `12px`, max two visible lines.
- Toggle cards use `13px` titles and `12px` descriptions so large policy forms remain scannable.

Time & Leave certification scope:

- TL-1 covers HR Admin attendance and leave workbenches, policy hubs, direct create/edit/review pages, representative dynamic child routes, links, controls, and responsive overflow.
- TL-2 covers ESS-to-MSS leave and attendance decisions: employee submissions, validation, duplicate guardrails, manager approval, manager rejection, and manager-only access boundaries.
- TL-3 covers reports, imports, custom approver RBAC, policy CRUD, export denials for non-HR users, and stable backend setup helpers.
- TL-4 covers real-user visual polish screenshots across Time & Leave desktop/tablet/mobile routes, including compact navigation, readable actions, non-crowded ledgers, and pagination where row volume is high.
- Direct backend setup calls in browser certification must use `HRMS_API_BASE_URL` and trailing slashes on mutable Django endpoints so tests exercise the real API contract.
- Certification gate passed on 2026-09-28 with `35 passed`: `hr-admin-time-leave-phase12-certification`, `hr-admin-time-leave-policy-ui-audit`, policy CRUD, leave balance import/report, attendance reports, ESS/MSS flows, MSS control center, MSS RBAC, and HR Admin leave/attendance RBAC.
- TL-4 polish gate passed on 2026-09-28 with `3 passed`: `hr-admin-time-leave-tl4-polish.spec.ts`. Screenshot evidence is written to `web/test-results/hr-admin-time-leave-tl4/`.

## Tenant Admin Typography

Tenant Admin is an account-control workspace. It should feel calmer and more administrative than HR Admin, with fewer simultaneous workflows on screen.

Tenant Admin page titles:

- Use short operational names: `Account Control Center`, `Tenant User Management`, `Roles & Permissions`, `Plan & Billing`, `Tenant Setup Guide`, `Tenant Settings`, `Enterprise Security Readiness`, `Support Access`, and `Tenant Trust Audit`.
- Keep the H1 compact and place responsibility details in supporting copy.
- Avoid page titles that combine more than one action phrase.

Tenant Admin rows and tables:

- Prefer compact operational rows over wide spreadsheet grids when rows contain action buttons.
- Row titles use `14px`, weight `760`; secondary identity/email/code text uses `12px`.
- Row facts use compact chips and calm metadata. Do not bold every table cell.
- Row actions are right-aligned on desktop, wrap inside the row, and stack full-width on mobile.
- Any grid with more than five conceptual columns must either reserve a wide action column or collapse into card rows below tablet width.

Tenant Admin role and permission screens:

- Role list is the primary surface; permission catalog is a supporting side panel.
- Permission overview groups should scroll independently when long so they do not force the page to feel like a second dashboard.
- Permission editor belongs in a modal. The modal may use permission-module tabs because the action is focused and temporary.
- Risk badges use compact `11px` pill text and should not visually compete with role names.

Tenant Admin dialogs:

- Dialog H3: `20px`, weight `760`, line-height `1.2`.
- Dialog labels: `12px`, uppercase, compact letter spacing.
- Dialog validation strips: `13px`, calm background, no oversized warnings unless the action is destructive.
- Dialog actions are right-aligned on desktop and full-width stacked on mobile.

Tenant Admin dashboard and control centers:

- Dashboards should use short section names: `Action queue`, `Launch checklist`, `User Management`, and `Access design`.
- Put explanatory text below the heading in `13px` to `14px` muted copy; do not encode instructions into oversized headings.
- Action rows use a restrained grid: status, title/description, count, and one right-aligned action.
- Checklist rows use compact status, title, and count columns, with no all-bold row treatment.
- On mobile, dashboard tables collapse into card rows. The header row is hidden, actions remain visible, and no row requires horizontal scrolling.
- Shortcut panels should look subordinate to the action queue; they should help navigation, not compete with the main dashboard summary.

Tenant Admin setup, plan, and settings screens:

- Setup pages should use ordered launch-path rows when sequence matters. Use a compact index, owner eyebrow, short title, status, evidence, and one action.
- Guardrails and prerequisites belong in side panels or secondary lists so the primary path stays clear.
- Plan pages must separate read-only commercial evidence from governed actions such as plan, billing, or account-change requests.
- Change-request forms use two to three columns on desktop, full-width payload editing, compact helper text, and paginated request rows.
- Change-request row actions are right-aligned on desktop and full-width stacked on mobile.
- Settings pages should avoid long headings. Use short titles like `Tenant account`, `Readiness checks`, and `Published setup`, then put explanation in muted supporting text.

Tenant Admin security and audit screens:

- Governance pages should use short H2 labels and muted supporting copy. Avoid repeating long responsibility text in headings.
- Security readiness rows must separate the check summary, evidence, status, and owner. Evidence can wrap; it must not force horizontal scrolling.
- Support Access uses a request form first, then a searchable grant ledger. Approval buttons are secondary actions and stay right-aligned on desktop.
- Scope catalogs use compact cards, not large table rows.
- Trust Audit uses filter cards first and a ledger second. Ledger rows show event, source, group/session, actor, timestamp, and hash without bolding every field.
- Audit pagination remains visible at the ledger bottom and all long source/hash values wrap inside the row.

Tenant Admin Phase 1 certification scope:

- Phase 1 covers Users and Roles because these are the highest-risk account-control screens: user invites, role assignment, role creation, permission selection, and protected role status changes.
- Users directory must not clip action buttons, even with three row actions visible.
- Roles workspace must keep the permission matrix subordinate to the role list and must keep editor controls reachable.
- Screenshot evidence is written to `web/test-results/tenant-admin-users-roles-phase1/`.
- Phase 1 browser gate passed on 2026-09-28 with `tenant-admin-users-roles-phase1-polish.spec.ts`; the broader tenant desktop usability audit also passed on rerun after one transient request reset.

Tenant Admin Phase 2 certification scope:

- Phase 2 covers Dashboard and cross-page navigation because every tenant operator lands here before choosing users, roles, plan, setup, security, support, or audit work.
- Dashboard action queues must keep one clear primary action per row and must not clip links or counts.
- Launch checklist should remain a compact readiness summary, not a second dense dashboard.
- Screenshot evidence is written to `web/test-results/tenant-admin-dashboard-phase2/`.
- Phase 2 browser gate passed on 2026-09-28 with `tenant-admin-dashboard-phase2-polish.spec.ts`; the broader tenant-admin audit passed across desktop, mobile, and safe dialog interactions.

Tenant Admin Phase 3 certification scope:

- Phase 3 covers Plan, Setup Guide, and Settings because they control tenant launch sequencing, commercial evidence, governed account changes, and configuration posture.
- Setup Guide must show the tenant launch path as ordered, actionable rows with no horizontal scrolling.
- Plan must keep subscription evidence and change-request operations visually separate but connected.
- Settings must expose account identity and readiness without implying direct edits for governed fields.
- Screenshot evidence is written to `web/test-results/tenant-admin-plan-setup-settings-phase3/`.
- Phase 3 browser gate passed on 2026-09-28 with `tenant-admin-plan-setup-settings-phase3-polish.spec.ts`; the broader tenant-admin audit passed across desktop, mobile, and safe dialog interactions.

Tenant Admin Phase 4 certification scope:

- Phase 4 covers Security Readiness, Support Access, and Tenant Trust Audit because these are customer-visible governance, access, and evidence flows.
- Security rows must be compact and structured, with evidence separated from action state.
- Support Access must keep request creation, searchable grant review, and grant lifecycle actions reachable without overcrowding.
- Trust Audit must keep filters and ledger distinct, while preserving event-group, event-type, support-session, pagination, and audit-download links.
- Screenshot evidence is written to `web/test-results/tenant-admin-governance-phase4/`.
- Phase 4 browser gate is `tenant-admin-governance-phase4-polish.spec.ts`.

Tenant Admin Phase 5 certification scope:

- Phase 5 is the final full-workspace release gate after focused page-group polish.
- It covers every Tenant Admin menu route at desktop and mobile sizes, with screenshots for each.
- It verifies active side navigation, H1s, required section text, logout presence, visible internal links, control reachability, and no horizontal overflow.
- It also smoke-tests safe account-control dialogs and non-mutating filters across Users, Roles, Support Access, and Trust Audit.
- Screenshot evidence is written to `web/test-results/tenant-admin-final-release-gate/`.
- Phase 5 browser gate is `tenant-admin-final-release-gate.spec.ts`.

## Rollout Checklist For Each Phase

For every route group, verify:

- Page title follows page-title rule.
- Section titles follow section-title rule.
- Card/row/table hierarchy has one primary emphasis only.
- Buttons are not heavier than row titles.
- Chips are compact and readable.
- Metadata is readable, not too pale.
- Tables do not have all-bold rows.
- Forms have consistent labels, helper text, and validation messages.
- Notices and error states are calm but clear.
- JSON/code uses monospace only when needed.
- Mobile screenshots do not clip text or make buttons unreadable.
- Desktop screenshots do not show overly loud repeated labels.

## Quality Gates

Each typography phase must include:

- Route inventory updated.
- Screenshot review at desktop and mobile.
- Link/button route verification.
- Dynamic create/edit/review child routes opened from their parent page when data exists.
- No horizontal overflow.
- No clipped button text.
- Typecheck pass.
- Lint pass.
- Build pass before deployment.

## Rollout Order

1. Notification module pilot.
2. HR Admin shell/navigation.
3. HR Admin dashboard and command pages.
4. Employee and organization master pages.
5. Lifecycle, attendance, leave, and document workflows.
6. Payroll setup, readiness, inputs, calculation, review, outputs, and handoff.
7. Reports and audit pages.
8. Tenant Admin.
9. ESS and MSS.
10. Public/auth pages.
