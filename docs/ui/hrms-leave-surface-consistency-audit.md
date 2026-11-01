# HRMS Leave Surface Consistency Audit

Date: 2026-11-01
Source revision: `11fd49da165f4f07ce3607ccde07d78c8c6e435f`

## Goal

Complete the Leave experience as one coherent product area without forcing every workflow into the same layout. Catalogs should use the established master/detail workbench, operational queues should use the queue/detail workbench, and employee/manager pages should retain their role-specific interaction model while sharing the same visual language.

## Reference patterns

The current reference screens are Shifts, Holiday Calendars, Attendance Policies, and the revised Leave Types page. Their reusable language is:

- one standard page header and one concise context/summary layer;
- a restrained summary strip;
- a filter toolbar with result and selection state;
- a stable master/detail layout on desktop and ordered stacking on smaller screens;
- selectable rows with one visible selected state;
- a compact identity card followed by grouped details;
- primary action in the detail panel, destructive/governed actions separated;
- truthful loading, empty, error, success, permission, and read-only states;
- horizontal containment for dense tables and reachable actions on mobile.

## Surface inventory and verdict

| Surface | Route | Workflow type | Current verdict | Main gap |
| --- | --- | --- | --- | --- |
| Policy control | `/hr-admin/policies` | Navigation/control hub | Minor alignment | Leave destinations are split across hub cards and the Time & Leave strip; hierarchy and terminology need reconciliation. |
| Leave types | `/hr-admin/leave-types` | Catalog/master-detail | Aligned | Newly revised. Retain as the catalog reference and add regression coverage. |
| Leave policies | `/hr-admin/leave-policies` | Catalog/master-detail | Aligned locally | Revised to the Leave Types/Shifts workbench with selected-row state, grouped detail, consistent actions, and responsive stacking; deployment remains pending. |
| Leave assignments | `/hr-admin/leave-policy-assignments` | Catalog/governance | Aligned locally | Revised to the shared catalog/detail workbench with default selection, grouped scope and effective-date evidence, consistent actions, and secondary governance/import tools; deployment remains pending. |
| Leave requests | `/hr-admin/leave-requests` | Operational queue | Aligned locally | Uses the shared queue toolbar, default selected request, selected-row semantics, focused detail, and responsive containment; deployment remains pending. |
| Leave balances | `/hr-admin/leave-balances` | Ledger/review operations | Aligned locally | Shared ledger toolbar, default selections, selected-row semantics, and focused balance/transaction detail are verified. A future mode split may reduce page length without changing maker-checker controls. |
| Leave-year control | `/hr-admin/leave-year` | Governed lifecycle operations | Aligned locally | Adds a concise operational summary while retaining period transitions, preview, durable close jobs, historical classification, and explicit policy decisions. |
| Tenant leave-year control | `/tenant-admin/leave-year` | Governed lifecycle operations | Aligned locally | Reuses the verified workbench and operational summary while preserving tenant-scoped permissions. |
| Employee leave | `/ess/leave` | Self-service history/action | Verified coherent | Role-specific apply, attachment, entitlement, calendar/history, and request-detail patterns remain intact and pass responsive production-build checks. |
| Manager approvals | `/mss/approvals` | Approval queue/history | Verified coherent | Pending Leave, Attendance, and Decision History remain separate modes; leave queue/history and responsive containment pass production-build checks. |
| Leave balance report | `/hr-admin/reports/leave-balance` | Reporting | Minor alignment | Preserve report pattern; align links, filter labels, status treatment, and handoff to balance operations. |
| Leave/attendance collisions | `/hr-admin/reports/leave-attendance-collisions` | Exception report | Minor alignment | Preserve report pattern; align review handoff and collision severity language with Leave Requests. |

## Functional audit

### Leave types

Already present and to be preserved:

- create and edit modal flows;
- category/status filters;
- selected-row detail;
- governance locks;
- impact check before deactivate/detach/delete;
- empty and read-only states.

Remaining verification:

- keyboard selection and focus return after close/edit;
- create/edit validation and duplicate code feedback;
- active/inactive state refresh after mutation;
- 390 px, 768 px, and desktop containment.

### Leave policies

Capabilities already present:

- create/edit with a detailed policy form;
- policy preview;
- search, status, leave type, and accrual filtering;
- archive/delete impact checks;
- governance locks and status display.

Required consistency work:

- move to the same workbench shell as Leave Types;
- select the first visible policy and preserve selection across filtering when valid;
- use `is-selected`/`aria-selected` consistently;
- group detail into Identity, Entitlement, Accrual, Eligibility, Approval, and Governance;
- make Edit the primary detail action and isolate removal actions;
- remove the low-value “Filters update this catalog only” copy;
- improve no-results and read-only states;
- review the very long create/edit form for progressive disclosure and sticky save/cancel actions.

### Leave policy assignments

Capabilities already present:

- scoped assignment create/edit;
- employee and organization targeting;
- conflict/risk display;
- conflict resolution and bulk import governance tools;
- pagination and permission-aware actions.

Required consistency work:

- introduce a standard summary and catalog toolbar;
- use the stable master/detail workbench and selected row semantics;
- group detail into Policy, Scope, Effective dates, Priority, Conflict, and Governance;
- keep conflict resolution near the selected assignment rather than visually detached;
- separate import tooling into an explicit secondary mode;
- unify clear/apply/create action order and naming;
- add purposeful empty, no-results, read-only, and conflict states.

### Leave requests

Capabilities already present:

- tenant-wide request search and filtering;
- policy and approval-track context;
- attendance collision evidence;
- approval/rejection flow;
- pagination, print, and balance handoff;
- request attachments and import tooling.

Required consistency work:

- reduce the vertical gap between toolbar and results;
- make selected request state survive pagination/filter refresh when still visible;
- align detail header and primary Review action with other queue screens;
- group request, approval, attachments, collision, and balance evidence predictably;
- move Print to a secondary overflow/utility position;
- ensure approval/rejection feedback updates row, counts, detail, and focus together;
- align import disclosure with other governed import surfaces.

### Leave balances

Capabilities already present:

- balance ledger and transaction ledger;
- controlled adjustments and encashment;
- maker-checker transaction review;
- employee/policy/status filtering;
- bulk import and exact record detail.

Required consistency work:

- introduce explicit `Balances`, `Transactions`, and `Actions/import` modes or tabs;
- avoid presenting two complete directories and two pagination controls simultaneously;
- retain one focused detail drawer for the active mode;
- place adjustment/encashment entry behind a clear primary command;
- standardize pending review emphasis and maker-checker messages;
- ensure filters clearly state which mode they affect;
- preserve exact ledger/audit evidence and do not simplify financial controls.

### Leave-year control

Capabilities already present:

- governed periods;
- create period;
- close preview;
- close/reopen/lock transitions with reason capture;
- asynchronous run status;
- historical classification and unresolved policy decisions.

Required consistency work:

- add the HR Time & Leave context strip and an operational summary matching the tenant view;
- establish `Periods`, `Close operations`, and `History/governance` modes;
- keep destructive or historical transitions in focused confirmation dialogs;
- make empty states actionable without implying unsupported period opening;
- separate unresolved product-policy decisions from routine operator work;
- preserve polling, interruption recovery, permission checks, and audit reasons.

### ESS leave

The page should remain a self-service experience, not a master/detail admin catalog.

Required consistency work:

- make attachment required/optional state unambiguous before submission;
- preserve selected file and form values on recoverable errors;
- group request detail, approval timeline, evidence, cancellation, and withdrawal actions;
- keep status tabs and filters usable without duplicate controls on mobile;
- verify calendar/list state through refresh and browser navigation;
- use the same status language as HR and MSS surfaces.

### MSS leave approvals

Required consistency work:

- maintain separate Pending Leave, Pending Attendance, and Decision History modes;
- keep filters in one row on desktop and ordered rows on tablet/mobile;
- verify decision history pagination beyond 25 records;
- preserve manager scope after employee reporting-line changes;
- show current request status separately from the manager's historical decision;
- align attachments, decision reasons, focus return, and error feedback with HR review.

## Cross-surface inconsistencies

1. **Selection semantics:** `table-row--selected` and `is-selected` are both used; some pages start without a selection.
2. **Container vocabulary:** `workspace-data-panel`, `employee-directory-layout`, `attendance-review-workbench`, and raw full-width cards represent similar structures.
3. **Filter actions:** pages vary among `Clear`, `Clear filters`, primary/secondary ordering, immediate filtering, and explicit Apply.
4. **Detail actions:** Edit, Review, Close, Print, Remove, and governance actions appear in different orders and visual weights.
5. **Summary layers:** some pages have both a collapsed navigation strip and a summary strip, while Leave Year lacks the HR leave context entirely.
6. **Empty states:** several tables use a plain table cell instead of a concise explanation plus recovery action.
7. **Responsive behavior:** dense tables are contained, but filter ordering, detail placement, and multiple pagers are inconsistent on narrow screens.
8. **Status language:** active/inactive, request status, decision status, collision status, transaction status, and period status need a shared tone and capitalization contract.
9. **Feedback:** save/review outcomes do not always reconcile list counts, detail content, URL state, toast, and focus as one transaction.
10. **Navigation:** Leave Types is available through Policy Control but is absent from the Time & Leave operations strip; Leave Year is similarly discoverable only through selected routes.

## Recommended completion sequence

### Phase 1: Leave setup consistency

1. Leave Policies
2. Leave Policy Assignments
3. Leave Types regression and shared pattern extraction

Acceptance gate: all three use one catalog/master-detail contract, consistent filters/actions, and verified desktop/tablet/mobile behavior.

### Phase 2: Leave operations consistency

1. Leave Requests
2. Leave Balances
3. Leave Year, including Tenant Admin shared behavior

Acceptance gate: queues and ledgers retain their operational safeguards while presenting one clear active mode, focused detail, and truthful feedback.

### Phase 3: Role continuity

1. ESS Leave
2. MSS Leave approvals and decision history
3. Leave reports and cross-links

Acceptance gate: the same request, status, approval, attachment, and balance concepts use consistent language and handoffs across employee, manager, HR, and tenant-admin roles.

## Verification gate for every changed page

- authenticated production build at desktop, 768 px, and 390 px;
- no horizontal page overflow; only intentional table regions scroll;
- keyboard reachability, visible focus, dialog focus trap, and focus return;
- loading, empty, no-results, API failure, read-only, and permission-denied states;
- create/update/review actions reconcile URL, list, counts, detail, and feedback;
- no false success or duplicate submission;
- tenant and role boundaries unchanged;
- no weakening of audit, historical, ledger, maker-checker, attachment, or cleanup controls;
- focused Playwright coverage for layout state and functional state, followed by TypeScript, ESLint, production build, and relevant Django/PostgreSQL regressions.

## Local completion result

The Leave setup and operational surfaces now share consistent summary, toolbar, selection, detail, action, and responsive behavior without replacing the distinct ESS and MSS workflows. Verified locally against the production build:

- TypeScript and focused ESLint: passed;
- production build: passed, with only the existing Autoprefixer `end` compatibility warning;
- seven Leave routes at 1440 px, 900 px, and 390 px: 21/21 returned HTTP 200;
- page-level horizontal containment: 21/21 passed;
- default detail, close, and row-reopen behavior for Policies, Assignments, Requests, and Balances: 12/12 passed;
- Leave Year operational summary: four metrics rendered;
- browser console and uncaught runtime errors: none.

No shared staging mutation, leave approval, balance adjustment, year close, email, commit, or deployment was performed during this audit and local implementation pass.
