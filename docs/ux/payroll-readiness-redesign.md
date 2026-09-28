# Payroll Readiness Redesign

Last updated: 2026-09-28
Owner: HRMS product/UX redesign track
Pilot screen: `/hr-admin/payroll-readiness`

## Goal

Make Payroll Readiness answer one clear question:

> Can payroll safely proceed, and what must be fixed first?

The current page is powerful, but it carries too many responsibilities at once. The redesign will make it easier for payroll and HR users to understand status, identify blockers, and move to the right fix path without remembering every setup/master screen.

## Current Problems

- The page mixes readiness dashboard, employee register, setup/master health, workflow navigation, and audit evidence.
- The employee table/detail pattern dominates too early.
- Master-screen checks such as salary setup, pay group, bank coverage, attendance, leave, and statutory readiness appear mixed into the readiness experience.
- Evidence/profile/source details are useful but visible too close to daily work.
- The next recommended action is not prominent enough.
- Users must remember where to fix each issue.
- The page feels like a report plus registry instead of a guided payroll gate.

## Target UX Principle

Payroll Readiness should be a read-only readiness evaluator and action router.

It should:

- Summarize whether payroll is Ready, Warning, or Blocked.
- Show the top blocker and next best action.
- Group issues by source and business impact.
- Route users to the correct source screen for fixes.
- Keep employee-level detail available but secondary.
- Keep setup/master health separate from employee readiness.
- Keep audit/evidence available but out of the first screen.

It should not:

- Become the editor for all payroll source data.
- Behave like another master screen.
- Force users to scan a large table before understanding status.
- Show advanced evidence/config details as the default experience.

## Target Screen Structure

Use tabs inside the same Payroll Readiness page first. Avoid adding new sidebar items until the pattern is proven.

```text
Payroll Readiness

[Period: September 2026] [Pay group: India Monthly] [Change]

Tabs:
Summary | Issues | Employees | Setup Health | Evidence
```

## Responsibility Split

### 1. Summary

Purpose:

- Give the 10-second answer.
- Tell the user if payroll can proceed.
- Show the next recommended action.

Primary users:

- Payroll admin
- HR ops lead
- Finance reviewer

Content:

- Current period and pay group.
- Overall readiness status.
- Short status explanation.
- Next recommended action.
- Readiness metrics.
- Top blocker groups.
- Payroll cycle position.

Primary actions:

- Fix blockers.
- Review warnings.
- Open payroll inputs.
- Change period/pay group.

Should not include:

- Full employee table.
- Raw audit details.
- Long config/profile data.
- Deep source counts.

Prototype:

```text
Payroll Readiness                         September 2026
Can payroll safely proceed?               India Monthly Payroll

[BLOCKED]
5 issues must be fixed before payroll inputs can be locked.

Next recommended action
Missing bank accounts are blocking payroll for 3 employees.
[Fix bank accounts] [View all issues]

Readiness Snapshot
Employees in scope     Ready      Warnings      Blocked
251                    208        38            5

Top Blockers
Missing bank account          3       Bank advice blocked       Fix
Missing salary assignment     1       Calculation blocked       Fix
Attendance not finalized      1       Pay days uncertain        Fix

Payroll Cycle
Readiness -> Inputs -> Calculation -> Review -> Outputs -> Handoff
You are here
```

### 2. Issues

Purpose:

- Provide the actionable work queue.
- Group blockers and warnings by issue type.
- Explain impact and route to fixes.

Primary users:

- HR ops
- Payroll ops
- Payroll admin

Content:

- Issue groups.
- Severity.
- Affected employee count.
- Business impact.
- Owner/due date where available.
- Affected employee list or preview.

Primary actions:

- Open affected employees.
- Open source fix page.
- Assign owner.
- Mark reviewed, where applicable.
- Export issue list.

Should not include:

- Master editing forms.
- Large raw evidence.
- Full payroll setup forms.

Prototype:

```text
Payroll Readiness / Issues

[All severity] [All sources] [Owner] [Search employee or issue]

[Critical] Missing bank account
3 employees affected
Impact: Bank advice cannot be generated.
[Open affected employees] [Assign owner]

[Critical] Missing salary assignment
1 employee affected
Impact: Payroll calculation cannot run for this employee.
[Open salary setup]

[Warning] Leave approval pending
4 employees affected
Impact: Payable days may change before lock.
[Open leave approvals]
```

### 3. Employees

Purpose:

- Preserve employee-by-employee readiness review.
- Support search/filter/detail inspection.

Primary users:

- HR ops
- Payroll ops

Content:

- Employee readiness register.
- Employee identity and department.
- Salary, bank, attendance, leave, statutory, pay group status.
- Overall readiness status.
- Fix action shortcuts.

Primary actions:

- Open employee.
- Fix bank.
- Fix salary.
- Review attendance.
- Review leave.
- Open employee detail drawer.

Should not include:

- Setup profile/audit details.
- Full employee editing form inside the readiness page.

Prototype:

```text
Payroll Readiness / Employees

[Search employee] [Status] [Department] [Issue type]

Employee             Salary   Bank     Attendance  Leave   Status    Action
Aarav Full Month     Ready    Ready    Ready       Ready   Ready     View
Kabir LOP            Ready    Ready    Warning     Ready   Warning   Review
Rohan Exit           Ready    Missing  Ready       Ready   Blocked   Fix

Right drawer:
Rohan Exit
Blocked

Bank account       Missing      [Add bank account]
Salary assignment  Ready
Pay group          Ready
Attendance         Ready
Leave              Ready
Statutory          Warning      [Review statutory]
```

### 4. Setup Health

Purpose:

- Separate master/setup health from employee readiness.
- Tell setup owners which source systems/masters are incomplete.

Primary users:

- Payroll admin
- HR admin
- Tenant setup owner

Content:

- Payroll calendar.
- Payroll period.
- Pay group.
- Salary structure/version.
- Pay group assignments.
- Bank coverage.
- Attendance source status.
- Leave workflow status.
- Statutory setup.
- Provider setup.

Primary actions:

- Open payroll setup.
- Open salary setup.
- Open statutory setup.
- Open provider setup.
- Open bank coverage fixes.

Should not include:

- Long setup forms.
- Provider credential inputs.
- Payroll calculation/review controls.

Prototype:

```text
Payroll Readiness / Setup Health

Payroll setup
Calendar                Ready
September period        Ready
Pay group               Ready
Pay group assignments   5 employees assigned
Salary structure        Ready
Salary version          Ready

Source setup
Bank coverage           3 missing       [Open bank fixes]
Attendance period       Ready
Leave workflow          4 pending       [Open approvals]
Statutory setup         Warning         [Open statutory]
Provider setup          Ready           [Open providers]
```

### 5. Evidence

Purpose:

- Give audit proof of the readiness decision.
- Keep advanced evidence away from daily operators unless needed.

Primary users:

- Auditor
- Payroll admin
- Finance reviewer
- Implementation/support team

Content:

- Readiness profile reference.
- Generated timestamp.
- Period and pay group.
- Source counts.
- Source endpoint list where useful.
- Evidence reference.
- Export/download actions.
- Historical readiness snapshots, if available.

Primary actions:

- Download evidence.
- View audit log.
- Refresh readiness check.

Should not include:

- Daily operator next-action content.
- Master editing.

Prototype:

```text
Payroll Readiness / Evidence

Readiness decision
Status: Blocked
Profile: payroll.readiness_profile.v1
Generated: 24 Sep 2026, 10:14 AM
Period: 01 Sep 2026 - 30 Sep 2026
Pay group: India Monthly Payroll

Source counts
Employees checked: 251
Bank accounts checked: 251
Salary assignments checked: 251
Attendance records checked: 251
Leave requests checked: 42

Audit
Last refreshed by: Sushil Bansal
Evidence ref: payroll-readiness-sep-2026-001
[Download evidence] [View audit log]
```

## Modal And Drawer Rules

Use drawers for inspection:

- Employee readiness detail.
- Issue detail.
- Setup health detail.
- Evidence preview.

Use modals for short decisions:

- Change period/pay group.
- Proceed despite warnings.
- Assign owner.
- Export evidence.
- Confirm navigation to payroll inputs.

Avoid modals for:

- Full employee edit.
- Salary setup.
- Pay group setup.
- Payroll rule setup.
- Any long form.

Modal principle:

> A modal should answer one decision question. If it needs scrolling, tabs, or many fields, it should become a page or drawer.

## Fix Path Rules

Every blocker must have a clear fix path:

| Blocker | Fix target |
| --- | --- |
| Missing bank account | Employee bank account page |
| Missing salary assignment | Salary setup / employee salary assignment |
| Missing pay group | Payroll setup / pay group assignment |
| Missing organization structure | Employee profile / organization master |
| Attendance pending | Attendance exceptions or attendance register |
| Leave approval pending | Leave approvals |
| Statutory profile missing | Payroll statutory setup |
| Provider not ready | Payroll providers |

## Phase 2 Low-Fidelity Wireframe

This prototype is intentionally low fidelity. It defines hierarchy, content, actions, and behavior before visual styling or implementation.

### Global Page Frame

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Payroll Readiness                                             [Refresh]      │
│ Can payroll safely proceed, and what must be fixed first?     [Export]       │
│                                                                              │
│ Period: September 2026        Pay group: India Monthly        [Change]       │
│                                                                              │
│ [Summary] [Issues] [Employees] [Setup Health] [Evidence]                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

Global behavior:

- The selected period/pay group stays visible on every tab.
- `Change` opens a compact modal.
- `Refresh` re-runs/reloads readiness data if supported.
- `Export` opens an export evidence modal or routes to the Evidence tab.
- Tabs are URL-addressable where practical so users can share links.

### Summary Tab Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Status                                                                       │
│ ┌──────────────────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ BLOCKED                                  │ │ Payroll cycle               │ │
│ │ 5 issues must be fixed before input lock │ │ Readiness → Inputs → Calc   │ │
│ │                                          │ │ You are here                │ │
│ │ [Fix blockers] [Review warnings]         │ │ [Open payroll inputs]       │ │
│ └──────────────────────────────────────────┘ └─────────────────────────────┘ │
│                                                                              │
│ Next recommended action                                                       │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Missing bank accounts block bank advice for 3 employees.                  │ │
│ │ [Fix bank accounts] [View all issues]                                     │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Readiness snapshot                                                            │
│ ┌──────────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ ┌───────────────────┐ │
│ │ In scope 251 │ │ Ready  │ │ Warnings │ │ Blocked │ │ Pending approvals │ │
│ │              │ │ 208    │ │ 38       │ │ 5       │ │ 4                 │ │
│ └──────────────┘ └────────┘ └──────────┘ └─────────┘ └───────────────────┘ │
│                                                                              │
│ Top blockers                                                                  │
│ ┌──────────────────────────┬───────┬─────────────────────────┬────────────┐ │
│ │ Issue                    │ Count │ Impact                  │ Action     │ │
│ ├──────────────────────────┼───────┼─────────────────────────┼────────────┤ │
│ │ Missing bank account     │ 3     │ Bank advice blocked     │ Fix        │ │
│ │ Missing salary assignment│ 1     │ Calculation blocked     │ Fix        │ │
│ │ Attendance not finalized │ 1     │ Pay days uncertain      │ Review     │ │
│ └──────────────────────────┴───────┴─────────────────────────┴────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Summary tab rules:

- It must fit the core decision in the first viewport on laptop/desktop.
- It must show only the most important blockers.
- It should not show the full employee register.
- The primary button changes by status:
  - Blocked: `Fix blockers`
  - Warning: `Proceed with warning`
  - Ready: `Open payroll inputs`

### Issues Tab Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Issues                                                                       │
│ [All severity] [All sources] [Owner] [Search issue or employee]              │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Critical · Missing bank account                              3 employees │ │
│ │ Bank advice cannot be generated until primary accounts exist.             │ │
│ │ Affected: Rohan Exit, Kabir LOP, Isha Joiner                              │ │
│ │ [Open affected employees] [Assign owner] [View detail]                    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Critical · Missing salary assignment                         1 employee  │ │
│ │ Payroll calculation cannot run for this employee.                         │ │
│ │ [Open salary setup] [View detail]                                         │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Warning · Leave approval pending                              4 employees│ │
│ │ Payable days may change before input lock.                               │ │
│ │ [Open leave approvals] [View detail]                                      │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Issues tab behavior:

- Clicking `View detail` opens a right drawer.
- Clicking a fix action routes to the owning source page with filters where possible.
- `Assign owner` opens a short modal only if ownership exists in the data model.

Issue detail drawer:

```text
┌──────────────────────────────┐
│ Missing bank account          │
│ Critical                      │
│                               │
│ Impact                        │
│ Bank advice cannot be created.│
│                               │
│ Affected employees            │
│ - Rohan Exit                  │
│ - Kabir LOP                   │
│ - Isha Joiner                 │
│                               │
│ Recommended fix               │
│ Add primary bank account.     │
│                               │
│ [Open affected employees]     │
│ [Close]                       │
└──────────────────────────────┘
```

### Employees Tab Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Employees                                                                    │
│ [Search employee] [Readiness status] [Department] [Issue type] [Page size]   │
│                                                                              │
│ ┌────────────────────┬────────┬──────┬────────────┬───────┬────────┬──────┐ │
│ │ Employee           │ Salary │ Bank │ Attendance │ Leave │ Status │ Act. │ │
│ ├────────────────────┼────────┼──────┼────────────┼───────┼────────┼──────┤ │
│ │ Aarav Full Month   │ Ready  │Ready │ Ready      │Ready  │ Ready  │View  │ │
│ │ Kabir LOP          │ Ready  │Ready │ Warning    │Ready  │ Warn   │Review│ │
│ │ Rohan Exit         │ Ready  │Miss. │ Ready      │Ready  │Blocked │Fix   │ │
│ └────────────────────┴────────┴──────┴────────────┴───────┴────────┴──────┘ │
│                                                                              │
│ Pagination                                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Employee detail drawer:

```text
┌──────────────────────────────┐
│ Rohan Exit                    │
│ ACC-SEP-001 · People Ops      │
│ Blocked                       │
│                               │
│ Salary assignment   Ready     │
│ Pay group           Ready     │
│ Bank account        Missing   │ [Add bank account]
│ Attendance          Ready     │
│ Leave               Ready     │
│ Statutory           Warning   │ [Review statutory]
│                               │
│ [Open employee profile]       │
│ [Close]                       │
└──────────────────────────────┘
```

Employees tab rules:

- This tab can preserve the current table/detail functionality.
- The detail panel should be a drawer or side panel, not the default first-screen content.
- Each failed readiness cell should have a clear source and fix action.

### Setup Health Tab Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Setup Health                                                                 │
│                                                                              │
│ Payroll masters                                                              │
│ ┌────────────────────────┬─────────┬────────────────────────┬─────────────┐ │
│ │ Source                 │ Status  │ Detail                 │ Action      │ │
│ ├────────────────────────┼─────────┼────────────────────────┼─────────────┤ │
│ │ Calendar               │ Ready   │ September calendar     │ Open setup  │ │
│ │ Period                 │ Ready   │ 01 Sep - 30 Sep        │ Open setup  │ │
│ │ Pay group              │ Ready   │ India Monthly          │ Open setup  │ │
│ │ Salary structure       │ Ready   │ Active version         │ Open salary │ │
│ │ Pay group assignments  │ Warning │ 5 assigned / 3 missing │ Review      │ │
│ └────────────────────────┴─────────┴────────────────────────┴─────────────┘ │
│                                                                              │
│ Source readiness                                                             │
│ ┌────────────────────────┬─────────┬────────────────────────┬─────────────┐ │
│ │ Bank coverage          │ Blocked │ 3 missing              │ Fix banks   │ │
│ │ Attendance             │ Warning │ 1 not finalized        │ Review      │ │
│ │ Leave workflow         │ Warning │ 4 approvals pending    │ Open leave  │ │
│ │ Statutory setup        │ Warning │ Profiles incomplete    │ Review      │ │
│ │ Provider setup         │ Ready   │ Bank provider active   │ Providers   │ │
│ └────────────────────────┴─────────┴────────────────────────┴─────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Setup Health rules:

- Shows health only, not setup forms.
- Actions route to source setup pages.
- If a source is not yet represented in API data, show it as a planned/neutral item only if that helps users.

### Evidence Tab Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Evidence                                                                     │
│                                                                              │
│ Readiness decision                                                           │
│ Status: Blocked                                                              │
│ Profile: payroll.readiness_profile.v1                                        │
│ Generated: 24 Sep 2026, 10:14 AM                                             │
│ Period: 01 Sep 2026 - 30 Sep 2026                                            │
│ Pay group: India Monthly Payroll                                             │
│                                                                              │
│ Source counts                                                                │
│ Employees checked              251                                           │
│ Bank accounts checked          251                                           │
│ Salary assignments checked     251                                           │
│ Attendance records checked     251                                           │
│ Leave requests checked          42                                           │
│                                                                              │
│ Evidence actions                                                             │
│ [Download evidence] [View audit log] [Copy profile ref]                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

Evidence tab rules:

- This is for audit/admin use, not daily work.
- It should be plain, copyable, and exportable.
- It should avoid overwhelming operational users.

### Modal Prototypes

Change period/pay group:

```text
┌────────────────────────────────────┐
│ Change Payroll Scope                │
│                                     │
│ Payroll period                      │
│ [September 2026        v]           │
│                                     │
│ Pay group                           │
│ [India Monthly Payroll v]           │
│                                     │
│ [Cancel] [Apply]                    │
└────────────────────────────────────┘
```

Proceed with warnings:

```text
┌────────────────────────────────────┐
│ Proceed With Warnings?              │
│                                     │
│ Payroll has 38 warnings and no      │
│ blockers. You can continue, but     │
│ warnings should be reviewed before  │
│ final lock.                         │
│                                     │
│ [Review warnings] [Proceed]         │
└────────────────────────────────────┘
```

Export evidence:

```text
┌────────────────────────────────────┐
│ Export Readiness Evidence           │
│                                     │
│ Includes summary, issues, source    │
│ counts, profile refs, and timestamp.│
│                                     │
│ [Cancel] [Download]                 │
└────────────────────────────────────┘
```

### Empty State Prototypes

Ready state:

```text
No blockers found.
Payroll is ready for input lock.

[Open payroll inputs]
```

No employees in scope:

```text
No employees found for this period and pay group.
Check pay group assignments or change the payroll scope.

[Open pay group assignments] [Change scope]
```

No setup:

```text
Payroll setup is incomplete.
Create a calendar, period, and pay group before checking readiness.

[Open payroll setup]
```

### Responsive Behavior

Desktop:

- Tabs stay horizontal.
- Summary uses two-column top band: status and cycle.
- Issue cards can show actions inline.
- Drawer opens on right.

Tablet:

- Summary cards wrap into two columns.
- Issue card actions wrap below copy.
- Drawer can become wider overlay.

Mobile:

- Tabs become horizontally scrollable or segmented compact row.
- Summary cards stack.
- Tables become card rows or show essential columns only.
- Drawer becomes full-screen sheet.
- Modals should fit without horizontal scrolling.

## Phase 3 UX Review Outcome

Status: Approved for first implementation pass

Review result:

- The five-tab structure is approved as the first redesign pattern.
- The Summary tab should become the default landing view.
- The employee register should move out of the default first viewport and into Employees.
- Issues should be grouped by business problem, not only by employee.
- Setup Health should separate payroll/master readiness from employee readiness.
- Evidence should be available, but should not distract daily operators.
- Drawers are approved for inspection.
- Modals are approved only for short decisions.

### Approved MVP Scope

The first implementation pass should focus on clarity and reuse existing readiness data as much as possible.

Included:

- Tab structure: Summary, Issues, Employees, Setup Health, Evidence.
- Summary first viewport with status, next action, metrics, top blockers, and payroll cycle position.
- Issues tab with grouped blocker/warning cards derived from existing readiness item blockers/warnings.
- Employees tab using the current employee readiness table and selected employee detail behavior.
- Setup Health tab with available source/master checks from current readiness data; missing data can be represented as neutral/planned only if clearly labeled.
- Evidence tab with current profile, period, source counts, and export/audit placeholders if direct exports are not yet wired.
- Change scope behavior can remain as existing period filters in the first implementation if a modal would require extra backend/API changes.
- Fix links should route to known source pages even if deep filtering is not available yet.

Deferred:

- Persistent issue owner assignment.
- Historical readiness snapshots.
- Advanced evidence export if no existing export endpoint exists.
- New backend data model for issue groups.
- New sidebar routes such as `/hr-admin/payroll-readiness/issues`.
- Full mobile card-table transformation if it increases scope too much; first pass must still avoid overflow.

### UX Decisions

| Topic | Decision |
| --- | --- |
| Default tab | Summary |
| Navigation model | Tabs inside `/hr-admin/payroll-readiness` first |
| First implementation data strategy | Reuse existing readiness response where possible |
| Issue grouping | Derive from current item blockers/warnings |
| Detail behavior | Use existing side panel/drawer pattern where practical |
| Modals | Only if short and low-risk; otherwise use existing forms/links |
| Blocked state | Payroll Inputs action should be visually blocked or route with explanation |
| Warning state | Proceed action should be confirmation-gated when feasible |
| Ready state | Primary action should be Open payroll inputs |
| Evidence | Separate tab, not first-screen content |

### Phase 4 Implementation Guardrails

- Do not introduce broad payroll logic changes.
- Do not change payroll calculation, input lock, review, output, or handoff behavior.
- Do not convert source master pages in this phase.
- Preserve the existing data contract unless a very small derived client-side transform is enough.
- Keep labels business-friendly and avoid internal profile/config language outside Evidence.
- Every action button should either fix, review, export, change scope, or proceed.
- If an action is a placeholder, do not show it as a primary enabled button.

## Phase Plan

### Phase 0: Design Principles Lock

Status: Complete

Scope:

- Confirm page purpose.
- Confirm first-screen goal.
- Confirm tab split.
- Confirm modal/drawer rules.
- Confirm that readiness is an evaluator/router, not a master editor.

Output:

- Approved UX rules.
- Approved redesign scope.

### Phase 1: Responsibility Split

Status: Complete

Scope:

- Split current responsibilities into Summary, Issues, Employees, Setup Health, and Evidence.
- Define purpose, user type, content, actions, and exclusions for each tab.

Output:

- This document section becomes the baseline for the prototype.

### Phase 2: Low-Fidelity Prototype

Status: Complete

Scope:

- Create wireframe for the five tabs.
- Include period/pay group selector.
- Include examples for drawer and modal behavior.

Output:

- Approved wireframe before implementation.

### Phase 3: UX Review Before Code

Status: Complete

Review questions:

- Can the user understand readiness status in 10 seconds?
- Is the top blocker obvious?
- Does every issue have a fix path?
- Is the employee table secondary?
- Are setup/master checks separated?
- Is evidence available but not distracting?

Review method:

- Review the Summary tab first without reading other tabs.
- Confirm whether a new payroll user can explain the page purpose in one sentence.
- Confirm whether the first recommended action is obvious.
- Review Issues, Employees, Setup Health, and Evidence in order.
- Decide whether each tab is useful enough for the first implementation.
- Mark anything that should move to a later phase.

Output:

- Final approved design for implementation.

### Phase 4: Implementation

Status: Complete

Scope:

- Add tab structure.
- Redesign Summary first viewport.
- Move current employee table into Employees tab.
- Add Issues tab using existing readiness data where possible.
- Add Setup Health tab using available readiness/setup data where possible.
- Add Evidence tab.
- Preserve current functionality and routes where possible.

Output:

- Working redesigned Payroll Readiness page.

Implementation notes:

- Implemented URL-addressable tabs in `/hr-admin/payroll-readiness`: Summary, Issues, Employees, Setup Health, and Evidence.
- Summary is now the default view and focuses on the readiness decision, next action, top blockers, and key metrics.
- Current employee table and employee trace panel were preserved inside the Employees tab.
- Issues are grouped from the existing readiness item `blockers` and `warnings` arrays.
- Setup Health uses available readiness summary/configuration fields and routes users to source pages for fixes.
- Evidence shows the current period, profile, counts, and readiness summary in a separate audit-focused tab.
- No backend payroll behavior, calculation behavior, lock behavior, or readiness API contract was changed.

Verification:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint -- src/app/hr-admin/payroll-readiness/page.tsx src/app/globals.css` completed with no errors; CSS is ignored by the current ESLint configuration.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts` passed with the new Payroll Readiness tab-flow check.

Known limitations for Phase 5:

- Issue grouping is derived from the current API page of employees, not a backend-wide issue aggregate.
- Fix links route to source screens, but deep filters are limited to what those pages already support.
- Export evidence and warning-confirmation modals remain deferred unless existing endpoints/actions are wired.

### Phase 5: Functional QA

Status: In Progress

Playwright checks:

- Page loads. Complete in payroll cycle certification.
- Tabs work. Complete for Summary, Issues, Employees, Setup Health, and Evidence.
- Period filters work. Complete in local demo certification.
- Status filters work. Complete in local demo certification.
- Employee selection/detail works. Complete in local demo certification.
- Fix links route correctly. Complete for Summary, Issues, Setup Health, and Evidence links in local demo certification.
- Modals open/close. No new modal added in Phase 4.
- Drawers open/close. Existing side panel retained; no new drawer added in Phase 4.
- Export/evidence actions work where present. Evidence report link renders; export endpoint remains deferred.
- Existing payroll flow is not broken. Complete for payroll cycle route certification.

Output:

- Local demo functional certification passed for the redesigned screen and payroll cycle routes.
- Live-backend staging specs that use `staging-auth` still need rerun in a live backend environment; local demo mode fails those before page load because `/api/auth/login` is not backed by the live Django API.

Verification:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts` passed.

Compatibility updates:

- Updated table-focused tests to use `tab=employees`.
- Updated old header expectations from `Admin`/`Reports` to `Review`/`Report`.
- Updated enterprise UI expectation for Payroll Readiness to assert Summary-first content.

### Phase 6: Visual And Responsive QA

Status: Complete for Phase 6A command-center stabilization, Phase 6B payroll-cycle consistency, Phase 6C.0 payroll navigation split, Phase 6C.1 Payroll Setup, Phase 6C.2 Salary Setup, Phase 6C.3 Payroll Rules, Phase 6C.4 Statutory, Phase 6C.5 Providers, and Phase 6C.6 Adjustments & Settlements

Viewports:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

Checks:

- No horizontal overflow.
- No clipped buttons.
- No overlapping cards.
- Tabs remain usable.
- Tables remain readable.
- Modal fits viewport.
- Drawer does not crush content.
- Long names/emails fit.
- Empty states look clean.

Output:

- Payroll Readiness now uses compact command-center typography, right-aligned primary action groups, calmer issue/setup cards, and a reduced payroll cycle journey so Summary owns the primary decision.
- Browser certification now verifies Summary, Issues, Employees, Setup Health, and Evidence navigation plus right-aligned actions on the main decision card, issue cards, employee filter form, and setup cards.
- Phase 6B extends the same compact payroll cycle contract to Inputs, Calculation, Review, Outputs, and Handoff so route-to-route movement does not feel like a different product.
- Phase 6B typography checks protect compact H1 sizing, right-aligned page actions on desktop, hidden duplicate next-action panels, wrapped payroll run names, wrapped cards/chips, and no horizontal overflow.
- Phase 6C.0 changes the sidebar from payroll cycle steps to seven payroll admin areas: Payroll Control, Payroll Setup, Salary Setup, Payroll Rules, Statutory, Providers, and Adjustments & Settlements.
- Payroll cycle steps remain reachable inside Payroll Control, while Settlements is treated as a child workflow under Adjustments & Settlements.
- Payroll Setup, Salary Setup, Payroll Rules, Statutory, Providers, Adjustments, and Settlements now follow focused tabbed workspace patterns so review grids, selected details, and maintenance/action controls no longer compete on the first screen.

Verification:

- `pnpm --dir web typecheck` passed for Phase 6A.
- `pnpm --dir web lint` passed for Phase 6A.
- `pnpm --dir web build` passed for Phase 6A.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts --project=chromium --workers=1` passed for Phase 6A.
- `pnpm --dir web typecheck` passed for Phase 6B.
- `pnpm --dir web lint` passed for Phase 6B.
- `pnpm --dir web build` passed for Phase 6B.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts --project=chromium --workers=1` passed for Phase 6B.
- `pnpm --dir web typecheck` passed for Phase 6C.0.
- `pnpm --dir web lint` passed for Phase 6C.0.
- `pnpm --dir web build` passed for Phase 6C.0.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-navigation-control-center-95.spec.ts --project=chromium --workers=1` passed for Phase 6C.0.
- `pnpm --dir web typecheck` passed for Phase 6C.2.
- `pnpm --dir web lint` passed for Phase 6C.2.
- `pnpm --dir web build` passed for Phase 6C.2.
- `pnpm --dir web exec playwright test tests/e2e/salary-setup-flows.spec.ts --project=chromium --workers=1` passed for Phase 6C.2.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium --workers=1` passed for Phase 6C.2.
- `pnpm --dir web exec playwright test tests/e2e/phase8c-form-keyboard-accessibility.spec.ts --project=chromium --grep "Salary Setup" --workers=1` passed for Phase 6C.2.
- `pnpm --dir web typecheck` passed for Phase 6C.3.
- `pnpm --dir web lint` passed for Phase 6C.3.
- `pnpm --dir web build` passed for Phase 6C.3.
- `pnpm --dir web exec playwright test tests/e2e/payroll-rules-flows.spec.ts --project=chromium --workers=1` passed for Phase 6C.3.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium --workers=1` passed for Phase 6C.3.
- `pnpm --dir web typecheck` passed for Phase 6C.4.
- `pnpm --dir web lint` passed for Phase 6C.4.
- `pnpm --dir web build` passed for Phase 6C.4.
- `pnpm --dir web exec playwright test tests/e2e/payroll-statutory-flows.spec.ts --project=chromium` passed for Phase 6C.4.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium --workers=1` passed for Phase 6C.4.
- `pnpm --dir web exec playwright test tests/e2e/phase8c-form-keyboard-accessibility.spec.ts --project=chromium --grep "Payroll Statutory" --workers=1` passed for Phase 6C.4.
- `pnpm --dir web typecheck` passed for Phase 6C.5.
- `pnpm --dir web lint` passed for Phase 6C.5.
- `pnpm --dir web build` passed for Phase 6C.5.
- `pnpm --dir web exec playwright test tests/e2e/payroll-providers-flows.spec.ts --project=chromium` passed for Phase 6C.5.
- `pnpm --dir web exec playwright test tests/e2e/provider-certification-center-certification.spec.ts --project=chromium --workers=1` passed for Phase 6C.5.
- `pnpm --dir web exec playwright test tests/e2e/phase9e-provider-ready-rehearsal.spec.ts --project=chromium --workers=1` passed for Phase 6C.5.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium --workers=1` passed for Phase 6C.5.
- `pnpm --dir web typecheck` passed for Phase 6C.6.
- `pnpm --dir web lint` passed for Phase 6C.6.
- `pnpm --dir web build` passed for Phase 6C.6.
- `pnpm --dir web exec playwright test tests/e2e/payroll-adjustments-flows.spec.ts --project=chromium` passed for Phase 6C.6.
- `pnpm --dir web exec playwright test tests/e2e/payroll-settlements-flows.spec.ts --project=chromium` passed for Phase 6C.6.
- `pnpm --dir web exec playwright test tests/e2e/pilot-100-adjustments-settlements-close-certification.spec.ts --project=chromium --workers=1` passed for Phase 6C.6.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium --workers=1` passed for Phase 6C.6.
- `backend/.venv/bin/python backend/manage.py check` passed after the setup payload ordering fix.

### Phase 7: Manual User Review

Status: Pending

Checklist:

- Does the page feel easier than the current one?
- Is the next action obvious?
- Are issue groups understandable?
- Is Setup Health understandable?
- Is Evidence useful but not distracting?
- Are button labels clear?

Output:

- Product feedback list.

### Phase 8: Stabilization

Status: Pending

Scope:

- Fix findings from functional QA, visual QA, and manual review.
- Update labels, spacing, empty states, routes, and modal/drawer wording.

Output:

- Payroll Readiness certified as reference design.

### Phase 9: Reusable UX Pattern

Status: Pending

Pattern:

```text
Complex operational page pattern:
1. Summary
2. Issues/Queue
3. Records
4. Setup/Config Health
5. Evidence
```

Output:

- Pattern to apply to Payroll Inputs, Payroll Calculations, Payroll Review, Employee Master, Tenant Admin, ESS, MSS, and Platform Admin screens.

## Success Criteria

Payroll Readiness is complete only when:

- The user understands readiness status in 10 seconds.
- The top blocker is obvious.
- Every blocker has a fix path.
- The employee table no longer dominates the first screen.
- Master/setup checks are separated.
- Evidence is available but not distracting.
- Playwright functional checks pass.
- Playwright visual checks pass.
- Manual user review is approved.

## Decision Log

| Date | Decision |
| --- | --- |
| 2026-09-24 | Payroll Readiness selected as first pilot screen. |
| 2026-09-24 | Use tabs first instead of new sidebar routes. |
| 2026-09-24 | Treat page as readiness evaluator and action router, not a master editor. |
| 2026-09-24 | Use drawers for inspection and modals for short decisions only. |
| 2026-09-24 | Phase 2 low-fidelity wireframe drafted for Summary, Issues, Employees, Setup Health, Evidence, modal, drawer, empty, and responsive behavior. |
| 2026-09-24 | Phase 3 UX review approved the wireframe for a first implementation pass. |
| 2026-09-24 | Issues remain a tab in the first pass; separate deep-link routes can come later. |
| 2026-09-24 | Setup Health can show provider readiness as a linked source health item, but detailed provider status stays on Payroll Providers. |
| 2026-09-24 | Blocked payroll should not proceed directly; Warning can proceed only with confirmation when feasible. |
| 2026-09-24 | Historical readiness snapshots and owner assignment are deferred from the first implementation pass. |
| 2026-09-24 | Summary should show the top three blockers and link to Issues for the full list. |
| 2026-09-26 | Payroll sidebar should show seven admin areas, not every cycle step; cycle pages should highlight Payroll Control, and settlements should highlight Adjustments & Settlements. |
| 2026-09-26 | Phase 6C.1 Payroll Setup should open as a review-first workspace with tabs for Overview, Calendars & Periods, Pay Groups, Assignments, and Setup Actions; long grids require pagination and CRUD forms should not crowd the default screen. |
| 2026-09-26 | Phase 6C.2 Salary Setup should use the same review-first pattern: Overview, Components, Structures, Assignments, and Setup Actions; salary import and CRUD controls belong behind Setup Actions with stable anchors. |
| 2026-09-26 | Phase 6C.3 Payroll Rules should separate rule definitions, versions, and trace evidence into tabs; rule/version forms should live behind Setup Actions with stable anchors. |
| 2026-09-26 | Phase 6C.4 Statutory should separate readiness, proof declarations, compliance filings, component catalog, and maintenance controls into tabs; statutory import and CRUD controls belong behind Setup Actions with stable anchors. |
| 2026-09-27 | Phase 6C.5 Providers should separate provider launch readiness, connection certification, schema mapping, delivery failure evidence, and adapter/client/storage registry into tabs so certification actions remain clear without overcrowding the default page. |
| 2026-09-27 | Phase 6C.6 Adjustments & Settlements should separate overview, register, selected detail, and lifecycle actions so exception review and F&F certification do not crowd one screen. |
| 2026-09-27 | Phase 6C.7 Setup Actions hardening should split dense maintenance consoles into second-level action tabs so setup forms are handled one responsibility at a time: calendars, periods, pay groups, salary components, structures, versions, lines, rules, statutory catalog, compliance, profiles, declarations, and imports. |
| 2026-09-27 | Phase 6C.8 should certify payroll cycle child pages after setup-action hardening: Inputs, Calculations, Review, Outputs, and Handoff must keep links, buttons, run selections, and setup-driven helper flows aligned with the new tabbed setup actions. |

## Phase 6C.1 Payroll Setup Outcome

Status: Passed

What changed:

- Default screen is now a setup overview with clear coverage metrics and right-aligned next actions.
- Calendars, periods, pay groups, and assignments are separated into focused tabs.
- Long setup tables include page-size controls and first/previous/next/last pagination.
- Create/edit forms remain browser-operable under Setup Actions and have stable anchors for direct links.
- Payroll Setup tests now enter Setup Actions for form workflows instead of expecting every form on the first screen.

Quality checks:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint` passed.
- `pnpm --dir web build` passed.
- `payroll-setup-flows.spec.ts` passed: 3/3.
- `hr-admin-payroll-ui-audit.spec.ts` passed: 1/1.
- `phase8c-form-keyboard-accessibility.spec.ts --grep "Payroll Setup"` passed: 1/1.
- Full `phase8c-form-keyboard-accessibility.spec.ts` had Payroll Setup pass, but the total suite still has unrelated failures on Attendance records review window and Tenant Admin Console heading expectations.

## Phase 6C.2 Salary Setup Outcome

Status: Passed

What changed:

- Default screen is now a compact salary setup overview with coverage metrics and clear next actions.
- Components, structures, versions, lines, and employee assignments are separated into focused review tabs.
- Long salary setup grids have page-size controls and first/previous/next/last pagination.
- Salary import and all component/structure/version/line/assignment forms live under Setup Actions with stable anchors.
- Existing salary setup form workflows now open Setup Actions directly, keeping the first screen review-oriented.

Quality checks:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint` passed.
- `pnpm --dir web build` passed.
- `salary-setup-flows.spec.ts` passed: 4/4.
- `hr-admin-payroll-ui-audit.spec.ts` passed: 1/1.
- `phase8c-form-keyboard-accessibility.spec.ts --grep "Salary Setup"` passed: 1/1.

## Phase 6C.3 Payroll Rules Outcome

Status: Passed

What changed:

- Default screen is now a compact rule engine overview with governance metrics and clear next actions.
- Rule definitions, effective-dated versions, locked input snapshots, and evaluation traces are separated into focused tabs.
- Rule and version grids include pagination where they can grow.
- Rule definition and rule version forms live under Setup Actions with stable anchors.
- Existing payroll rule creation workflows now open Setup Actions directly, keeping the first screen review-oriented.

Quality checks:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint` passed.
- `pnpm --dir web build` passed.
- `payroll-rules-flows.spec.ts` passed: 2/2.
- `hr-admin-payroll-ui-audit.spec.ts` passed: 1/1.

## Phase 6C.4 Statutory Outcome

Status: Passed

What changed:

- Default screen is now a compact statutory overview with setup coverage, proof lock, filing risk, and clear next actions.
- Declarations, compliance filings, component catalog, and maintenance controls are separated into focused tabs.
- Declaration, component, registration, and filing lists have page-size controls and first/previous/next/last pagination.
- Statutory profile import and all pack/component/slab/registration/filing/profile/declaration/proof forms live under Setup Actions with stable anchors.
- Existing statutory browser workflows now open Setup Actions directly, keeping the first screen review-oriented.

Quality checks:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint` passed.
- `pnpm --dir web build` passed.
- `payroll-statutory-flows.spec.ts` passed: 4/4.
- `hr-admin-payroll-ui-audit.spec.ts` passed: 1/1.
- `phase8c-form-keyboard-accessibility.spec.ts --grep "Payroll Statutory"` passed: 1/1.

## Phase 6C.5 Providers Outcome

Status: Passed

What changed:

- Default screen is now a compact provider overview focused on launch rehearsal and certification gates.
- Connections, Mapping, Delivery, and Registry are separated into focused tabs so provider certification, schema packs, callback/retry failures, and adapter/client/storage readiness do not crowd one page.
- Provider connection links preserve the selected provider context across tabs.
- Certification, launch rehearsal, evidence export, guarded recovery endpoints, and unauthorized-access checks remain browser-covered.
- Existing provider launch rehearsal workflows now open the Connections tab for provider selection before returning to Overview for rehearsal.

Quality checks:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint` passed.
- `pnpm --dir web build` passed.
- `payroll-providers-flows.spec.ts` passed: 1/1.
- `provider-certification-center-certification.spec.ts` passed: 2/2.
- `phase9e-provider-ready-rehearsal.spec.ts` passed: 1/1.
- `hr-admin-payroll-ui-audit.spec.ts` passed: 1/1.

## Phase 6C.6 Adjustments & Settlements Outcome

Status: Passed

What changed:

- Payroll Adjustments now opens to a compact overview focused on run profile, exception totals, and next actions.
- Adjustment register, selected adjustment detail, and certification actions are separated into URL-addressable tabs.
- Payroll Settlements now opens to a compact overview focused on full-and-final orchestration, package totals, and next actions.
- Settlement register, selected settlement detail/lines, and certification actions are separated into URL-addressable tabs.
- Create actions now route to the Detail tab for immediate inspection, while submit/approve/apply controls remain in Actions.

Quality checks:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint` passed.
- `pnpm --dir web build` passed.
- `payroll-adjustments-flows.spec.ts` passed: 1/1.
- `payroll-settlements-flows.spec.ts` passed: 1/1.
- `pilot-100-adjustments-settlements-close-certification.spec.ts` passed: 1/1.
- `hr-admin-payroll-ui-audit.spec.ts` passed: 1/1.
- `backend/.venv/bin/python backend/manage.py check` passed.

## Phase 6C.7 Setup Actions Hardening Outcome

Status: Passed

What changed:

- Payroll Setup actions now use second-level tabs for Calendars, Periods, Pay Groups, and Assignments.
- Salary Setup actions now use second-level tabs for Import, Components, Structures, Versions, Lines, and Assignments.
- Payroll Rules actions now use second-level tabs for Definitions and Versions.
- Statutory Setup actions now use second-level tabs for Import, Catalog, Compliance, Profiles, and Declarations.
- Existing form anchors and test IDs remain stable, so direct links and browser automation still work while the UI is less crowded.

Quality checks:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint` passed.
- Focused Playwright setup/action suite passed: 13/13.
- Covered specs: `payroll-setup-flows.spec.ts`, `salary-setup-flows.spec.ts`, `payroll-rules-flows.spec.ts`, and `payroll-statutory-flows.spec.ts`.

## Phase 6C.8 Payroll Cycle Certification Sweep Outcome

Status: Passed

What changed:

- Payroll core UI audit passed across the payroll route set without requiring cycle-page UI changes.
- Payroll Inputs browser setup helper now opens the Periods action tab before creating a payroll period, matching the new tabbed setup UX.
- Inputs, Calculations, Review, Outputs, and Handoff remain browser-covered after setup-action hardening.

Quality checks:

- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint` passed.
- `pnpm --dir web build` passed.
- `hr-admin-payroll-ui-audit.spec.ts` passed: 1/1.
- Payroll cycle flow pack passed: 6/6.

## Phase 6C.9 Salary Setup Action Guidance Outcome

Status: Passed

What changed:

- Salary Setup action tabs now expose the active action in markup and use the shared three-step setup workflow strip.
- Import, versions, lines, and assignments now show dependency guidance before users hit disabled or confusing form states.
- Component, structure, version, line, and assignment forms keep the same action-panel rhythm: focused tab, short workflow guidance, form, paginated record list, and right-aligned action area.
- Salary Setup action tab structure is now protected by a browser test that clicks every action tab and checks fields, sidecar, workflow region, record list, and no horizontal overflow.

Quality checks:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.
- `pnpm --dir web exec playwright test tests/e2e/salary-setup-flows.spec.ts --project=chromium` passed: 5/5.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium` passed: 1/1.

## Phase 6C.10 Payroll Rules Versions And Trace Outcome

Status: Passed

What changed:

- Payroll Rules Versions now opens with a compact workbench guide that explains the rule rail, version inspection, and edit path.
- Payroll Rules Trace now opens with a compact workbench guide that explains locked inputs, stored evaluations, and evidence validation.
- Version and evaluation cards now mark the record currently driving the detail panel, reducing ambiguity in the drilldown flow.
- The versions and trace tabs keep pagination and selected-detail behavior while using the shared payroll typography and compact card rhythm.

Quality checks:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.
- `pnpm --dir web exec playwright test tests/e2e/payroll-rules-flows.spec.ts --project=chromium` passed: 2/2.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium` passed: 1/1.

## Phase 6C.11 Payroll Inputs, Calculations, And Review Outcome

Status: Passed

What changed:

- Payroll Inputs now opens with a compact three-step guide for selecting a run, inspecting employee snapshots, and locking inputs.
- Payroll Calculations now opens with a compact three-step guide for selecting a run, checking readiness, and inspecting calculated lines.
- Payroll Review now opens with a compact three-step guide for selecting a review, resolving exceptions, and approving or final-locking the run.
- Selected run, snapshot, calculation line, review, and exception context is now explicitly labeled so the active drilldown is easier to understand.
- The guide styling reuses the shared payroll workbench typography instead of introducing page-specific font treatment.

Quality checks:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.
- `pnpm --dir web exec playwright test tests/e2e/payroll-inputs-flows.spec.ts --project=chromium` passed: 2/2.
- `pnpm --dir web exec playwright test tests/e2e/payroll-calculations-flows.spec.ts --project=chromium` passed: 1/1.
- `pnpm --dir web exec playwright test tests/e2e/payroll-review-flows.spec.ts --project=chromium` passed: 1/1.
- `pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium` passed: 1/1.

## Phase 6C.12 Payroll Outputs And Handoff Outcome

Status: Passed

What changed:

- Payroll Outputs now opens with a compact workflow guide for selecting batches, inspecting artifacts, and publishing or creating finance handoff.
- Payroll Handoff now opens with a compact workflow guide for selecting finance packages, reviewing provider evidence, and closing the handoff.
- Selected batch, handoff, and artifact context is explicitly labeled so the active drilldown is visible in the rail and detail panel.
- Existing pagination, publish, handoff, provider evidence, and audit-pack controls remain in their current workflow positions.

Quality checks:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.
- `HRMS_API_BASE_URL=http://127.0.0.1:8010/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-outputs-flows.spec.ts --project=chromium` passed: 1/1.
- `HRMS_API_BASE_URL=http://127.0.0.1:8010/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-handoff-flows.spec.ts --project=chromium` passed: 1/1.
- `HRMS_API_BASE_URL=http://127.0.0.1:8010/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium` passed: 1/1.

## Phase 6C.13 Payroll Smoothness Audit Outcome

Status: Passed

What changed:

- Payroll core UI audit now includes a section smoothness gate across every payroll route.
- The new audit checks compact heading scale, safe heading line-height, unclipped button/badge/workflow text, wrap-capable action rows, table pagination for long grids, and scroll containment for wide tables.
- The smoothness check sits alongside existing font-family, tab-structure, link, control-collision, and horizontal-overflow checks so future payroll screens inherit the same quality bar.

Quality checks:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.
- `HRMS_API_BASE_URL=http://127.0.0.1:8010/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium` passed: 1/1.

## Phase 6C.14 Browser Screenshot Payroll Review Outcome

Status: Passed

What changed:

- Captured browser screenshots for the payroll page family at `web/qa-artifacts/payroll-visual-review-20260928/`.
- Reviewed each payroll page from an HR-admin/finance-manager lens for typography consistency, grid alignment, page density, action placement, selected-state clarity, and drilldown smoothness.
- Fixed Payroll Statutory metric cards, which were visually rendering as oversized stacked rows instead of the shared compact payroll metric grid.
- Confirmed Payroll Control, Payroll Setup, Salary Setup, Payroll Rules, Statutory, Providers, Adjustments, Settlements, Inputs, Calculations, Review, Outputs, and Handoff now follow the shared compact payroll typography and section rhythm.

Quality checks:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.
- `HRMS_API_BASE_URL=http://127.0.0.1:8010/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium` passed: 1/1.

## Phase 6C.15 Payroll Workflow Certification Outcome

Status: Passed

What changed:

- Payroll Rules and Payroll Statutory empty states now stay inside their table shells, preserving headers and pagination affordances even when the selected filter has no records.
- Payroll Adjustment tabs now keep `adjustmentId` only on detail/action routes, so run-level tabs no longer look like record drilldowns.
- Payroll Adjustment browser coverage now verifies `Source hash` inside the actual detail panel instead of matching hidden navigation copy.
- Local certification data was prepared with realistic pilot payroll states: setup masters, provider governance, adjustments, settlements, calculation-review, and close-gate runs.

Quality checks:

- Setup masters passed: `payroll-setup-flows`, `salary-setup-flows`, `payroll-rules-flows`, and `payroll-statutory-flows`: 15/15.
- Provider governance passed: `payroll-providers-flows`, `provider-certification-center-certification`, and provider rehearsal: 4/4.
- Adjustments, settlements, and close-gate certification passed: 3/3.
- Payroll cycle child pages passed: inputs, calculations, review, outputs, and handoff: 6/6.
- Broad payroll UI audit passed: `HRMS_API_BASE_URL=http://127.0.0.1:8010/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-ui-audit.spec.ts --project=chromium --workers=1`: 1/1.
- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.

## Open Questions

- Should mobile tables become card rows immediately, or is desktop/laptop certification enough for the first implementation pass?
- Is the existing readiness API sufficient for useful Setup Health, or do we need a later backend addition for richer master health?
- Should Evidence export be a real endpoint in this phase, or a visible placeholder/action routed to existing reports?
