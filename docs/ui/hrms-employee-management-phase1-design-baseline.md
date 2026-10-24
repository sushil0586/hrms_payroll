# Employee Management makeover — Phase 1 baseline and design direction

Date: 22 October 2026. Phase 1 complete for baseline discovery and design decisions. This is the discovery-stage record; see the [makeover plan](hrms-employee-management-makeover-plan.md) for current phase progress and later implementation evidence.

## Baseline and evidence

Fresh local captures use the retained production Next build `tSAvdxZ6M4oHcmdmURgbl`. All 794 application source hashes match its recorded manifest; no application source was changed for discovery. [Provenance](../qa/evidence/employee-makeover-phase1-2026-10-22/provenance.json) identifies that artifact. The worktree already contains the earlier shared rollout; it was preserved.

An isolated PostgreSQL 16 database (`hrms_employee_phase1`, port 55463), Django on 8064 and Next on 3264 served real authorized reads with demo data disabled. One owned synthetic workspace supplied six employees and the HR Admin persona. No employee/access/bank/import mutation was exercised; fixture provisioning and authentication are setup operations.

The [capture suite](../../web/tests/employee-makeover/baseline.spec.ts) completed **1 passed, 0 failed, 0 skipped**, retries disabled, in Chromium. It produced **41 viewport screenshots**: 13 states at 1440/390/320 widths, plus default directory at 1024/768. The 39 detailed observations report no page errors or document-level horizontal overflow. This is baseline capture, not 41 distinct tested business workflows, full-browser certification or a new accessibility certificate.

[Evidence folder](../qa/evidence/employee-makeover-phase1-2026-10-22/): `results.json`, `capture.txt`, per-run trace and `observations.json`. Screenshots are viewport captures after the specified scroll/focus, not complete coverage of long pages or all form steps. Imports were expanded programmatically for capture; that does not verify the disclosure's keyboard behavior.

Fifteen images were individually inspected: directory 1440/390/320; selected detail 1440/390; create dialog 1440; create page 390; edit page 1440; access dialog/page 1440; bank dialog/page 390; imports 1440/390; no matches 1440. Other captures are retained but not claimed as individually reviewed.

## Route, state and action inventory

| Surface | Current entry / captured state | Existing task and preservation boundary |
| --- | --- | --- |
| Directory | `/hr-admin/employees` | Full authorized employee collection; search, department, status, manager/readiness filters, sort and page size; create entry gated by permission |
| Advanced filters | `?managerView=managers` | Manager/readiness filters remain visible when active; counts and results retain their declared scope |
| No matches | `?q=unmatched-phase1` | Current empty-result guidance and reset; not evidence of a genuinely empty tenant |
| Selected employee | `?employeeId=[employeeId]` | Identity, Profile, Structure, Access and Dates; independent client detail loading/retry and stale-response protection; selected row context |
| Create | `?create=1` and `/new` | Same `EmployeeForm`, existing Identity → Contact → Structure → Review steps; preserve fields, defaults, dependencies and payload |
| Edit | `?employeeId=[employeeId]&action=edit` and `/[employeeId]/edit` | Existing values and four-step form; save/cancel/dirty behavior must be verified in Phase 3 |
| Access | `?employeeId=[employeeId]&action=access` and `/[employeeId]/access` | Identity, membership, login controls and role assignment; `employees.access.manage` remains authoritative |
| Bank | `?employeeId=[employeeId]&action=bank` and `/[employeeId]/bank-accounts` | Existing accounts and create/edit form; captured seeded employee has no account; masking, permissions and primary-account behavior remain domain-owned |
| Imports | Expanded `#employee-imports` | Employee, bank and reporting-manager workbenches; existing template/upload, preview and commit operations; captured initial state only |

Source ownership is mapped in the plan. Directory query keys are `q`, `department`, `status`, `managerView`, `readiness`, `sort`, `page`, `page_size`; selected/action context uses `employeeId`, `action`, `create`. Preserve the actual query adapters, native document-navigation convention and standalone routes.

Status totals are directory-wide. Matching counts, paging and applied filters refer to the current view. Readiness aggregates existing structural, access and manager warnings; it is not a payroll eligibility or policy approval calculation. No export or bulk selection is introduced.

## Prioritized findings

These are observed design issues or explicitly labelled review risks, not assumed failures of unexecuted workflows.

| ID / phase | Evidence and impact | Design response |
| --- | --- | --- |
| EM-01 / Phase 2 | Mobile directory 390/320 spends the first viewport on shell, repeated page/directory hierarchy, stacked summary and filters; results remain below it | Condense page context, summary and directory metadata; keep search prominent and move less frequent controls into an accessible in-flow disclosure |
| EM-02 / Phase 2 | Desktop renders both a Status select and a separate status-count chip row for the same predicate | Keep the committed Status select as the single editable status control; retain directory totals in a compact labelled summary, removing duplicate quick-filter links while preserving existing URLs |
| EM-03 / Phase 2 | Selecting an employee at 1440 compresses the table and opens a narrow right column; manager/structure values truncate and email wraps heavily | Use a full-width non-modal detail section below results, preserving the directory width and all columns; deliberately reveal/focus its heading on selection |
| EM-04 / Phase 2 | Mobile detail begins with a tall Close/Edit/Access stack plus an Actions menu; desktop also duplicates Edit/Access inside that menu (source-confirmed) | One Edit action, one secondary Actions menu for access/bank, and a distinct Close affordance; no duplicate menu entries for the inline action |
| EM-05 / Phase 3 | Standalone create/edit has browser-default step buttons and repeated form heading/meta; modal create has a styled stepper | Share the styled four-step navigation and form composition across both entry types; reduce duplicate headings without changing the existing step model |
| EM-06 / Phase 4 | Access page/dialog repeats section framing and large explanatory cards; dialogs also carry static section-caption strips | Keep one meaningful employee context and concise section help; remove redundant captions where they add no navigation; retain explicit login/role consequences |
| EM-07 / Phase 4 | Mobile bank dialog devotes substantial height to footer/copy and stacked actions while fields scroll; screenshot alone does not establish unreachable controls | Compact the action area and verify body/footer clearance, every field and final action at short heights before accepting the design |
| EM-08 / Phase 5 | Expanded imports renders three full CSV workbenches; each exposes six actions with repeated template operations, especially tall on mobile | Keep the outer secondary disclosure, then choose one named import workbench at a time; group template helpers separately from Preview and guarded Commit |
| EM-09 / Phases 2–4 | Labels such as “Ready” and “payroll readiness” can be read as broader guarantees than the displayed prerequisites establish | Use scoped data-review/payout wording based on existing predicates; preserve calculations and avoid claiming payroll approval |

Useful existing patterns to retain: compact Accerio shell, legible desktop table, explicit search placeholder, in-flow advanced filters, document GET navigation, page-scoped result counts, no-match guidance, import disclosure, shared dialog lifecycle and existing four-step form.

## Concrete composition decisions

### Phase 2 — directory and detail

| Area | Desktop/tablet direction | Mobile direction |
| --- | --- | --- |
| Page context | One Employees title and concise description; New employee primary; shell supplies dashboard navigation | Short header with New employee; remove duplicate Back to dashboard from page content |
| Summary | Single wrapping strip explicitly labelled directory totals: employees, access provisioned, data review | Same compact wrapping content, not three stacked metric blocks; readable labels and numbers |
| Filters | Search and Department prominent; committed Status and Sort retained; manager/readiness in More filters; Apply/Reset clear | Search visible; remaining fields in one named in-flow Filters disclosure with active count, auto-expanded when non-default filters are active; keep Apply/Reset usable and preserve GET serialization |
| Results | Compact matching count/filter context without another competing page heading; existing six table columns and named scroll region | Same semantic table in its own scroll region; no document overflow or silent loss of columns |
| Selected detail | Full-width section below results, before imports; employee identity as its heading, one action group, responsive Profile/Structure/Access-and-Dates layout | Same non-modal section, concise action row that wraps, vertically readable fields; no new nested focus trap |
| Paging/imports | Existing committed paging and row-size semantics; imports secondary | Compact paging controls; imports remain collapsed by default |

Selecting an employee must reveal the detail heading and announce context without a stale response or unwanted history entry. Closing detail restores a meaningful row/link target if still available; filter/page navigation clears or reconciles selection. Direct query entry and same-document selection require separate focus checks. Keep document-navigation action close behavior distinct; do not claim a focus guarantee until tested.

Phase 2 will preserve the existing six columns and review predicates. It changes hierarchy and selection layout, not API pagination or dataset scope. A Filters disclosure must keep controls inside the GET form, submit collapsed controls correctly, and retain active advanced state. Do not use hidden duplicated inputs with conflicting names.

### Phases 3–5 — forms, sensitive controls and imports

- Retain the existing four functional employee steps. Use the same section navigator, field styling and action placement on standalone pages and dialogs. The modal remains a quick entry; standalone URLs remain valid focused workspaces. No new wizard or forced route migration is planned.
- Use the existing wide dialog for create/edit and the full-page form for direct entry. Provide one visible task title per context, a responsive field grid and a single usable body scroll area. Phase 3 must review Contact, Structure, Review and validation states, not just the initial Identity captures.
- Access keeps explicit identity/membership, login controls and roles as meaningful sections. Bank management keeps readable existing accounts and the selected/new account form; a short-height dialog may direct the user to the existing full-page route if all fields/actions cannot remain usable. Do not remove fields or protections to make it fit.
- Imports keep the existing three workbenches and data contracts. A named selector/disclosure exposes one workbench at a time; switching must preserve drafts/results or warn before discard. Template utilities become secondary, Preview leads the preparation stage, and Commit remains clearly separate and disabled until eligible. Phase 5 must execute actual preview/error/result states before choosing the final feedback layout.

The proposed structure is the implementation direction, not a rendered after-design or user approval record. Compare actual after screenshots to this baseline in each implementation phase; revise and record a decision if task evidence warrants it.

## Verification scope and open cases

Fresh evidence here is Chromium render/capture only. No save, access update, bank write, import preview/commit, negative authorization, transient read failure, dirty/busy interaction, cross-browser keyboard or formal accessibility execution is claimed. Earlier certificates remain historical within their stated scope.

Required targeted cases for upcoming phases include genuine empty tenant, populated warning states, long identity/structure text, invalid fields in every form step, pending/uncertain mutations, configured bank accounts, roles with restricted actions, detail failure/retry, history/paging after unsaved filters, 320px and short-height dialogs. Native zoom, actual assistive technology and physical-device assessments remain explicitly unexecuted until performed.

Phase 6 closes consistency across executed work; it cannot erase these omissions by inheriting this baseline pass.

## Phase 1 result

Baseline route/state/action inventory, current captures, representative visual review, prioritized issues and concrete layout/action/form decisions are complete. Proceed to Phase 2 implementation using EM-01 through EM-04 and the scoped wording review. No application makeover changes, deployment or domain certification occurred in this phase.

Owned fixture cleanup and environment disposal are recorded in [cleanup evidence](../qa/evidence/employee-makeover-phase1-2026-10-22/cleanup.json). Existing audit history is preserved. TypeScript and targeted ESLint checks passed; documentation links and whitespace checks passed. [Review and validation manifest](../qa/evidence/employee-makeover-phase1-2026-10-22/review-and-validation.json) records screenshot hashes, the 15 inspected images and unchanged application source. Phase 1 does not reset or replace the prior shared rollout evidence.
