# Employee Management UI/UX makeover plan

Status: Phases 1–6 complete within their recorded makeover scopes; remaining capability and assessment limits are recorded in the family closure. Prepared: 22 October 2026. See the [Phase 1 baseline and design direction](hrms-employee-management-phase1-design-baseline.md) for fresh captures, findings and implementation decisions.

## Purpose and reference

Give Employee Management the same task-focused UI/UX treatment as Leave Management: compact layout, clear information hierarchy, useful summaries, consistent filters and tables, readable forms, deliberate dialogs and reliable feedback. This is a screen-by-screen makeover, including interaction design and actual rendered review. Applying shared CSS or collecting workflow test results alone does not complete it.

Use the [shared UI/UX standard](hrms-ui-ux-standard.md), [Leave/Attendance implementation reference](hrms-leave-attendance-makeover-reference.md) and [adoption checklist](hrms-ui-ux-screen-adoption-checklist.md). Reuse their patterns while retaining employee-specific tasks and terminology. An employee directory does not need to look like a leave calendar.

The directory already has substantial standardization and bounded verification in the [Employees certificate](hrms-hr-admin-employees-standardization-certification.md). The [shared rollout](hrms-ui-ux-rollout-certification.md) adds later presentation coverage. Preserve those improvements and compare current rendered screens before deciding what needs redesign. Items below are planned review requirements, not a declaration that every item is currently defective.

## Six-phase delivery plan

Employee Management is the first family. Complete the phases in order, with the preceding phase's recorded result informing the next. Phase 1 establishes the design direction; Phases 2–5 each include design refinement, implementation, visual review and interaction checks. Phase 6 closes the joined family rather than postponing all review until the end.

| Phase | Scope and entry points | Deliverables | Completion criteria |
| --- | --- | --- | --- |
| 1 — Baseline and design direction | All Employee Management routes, directory query/dialog entry points and three import workbenches | Current desktop/mobile screenshots; route/state/action inventory; comparison with Leave patterns; prioritized issues; proposed hierarchy and layouts | Concrete decisions documented for directory/detail composition, action hierarchy, form grouping and page/dialog use; dependencies and existing behavior to preserve identified |
| 2 — Directory and employee details | `/hr-admin/employees`; selected-detail query state | Refined header, summaries, filters/status navigation, table, row actions, pagination and selected-detail composition | Before/after desktop/mobile review completed; filters/history, selection, detail recovery and keyboard/pointer behavior verified; accepted composition becomes the family reference |
| 3 — Create and edit | `/hr-admin/employees/new`; `/hr-admin/employees/[employeeId]/edit`; directory create/edit dialogs | Consistent field groups, long-form layout, help, review/save/cancel flow, validation and return context | Standalone and directory entry points visually reviewed; relevant validation, preserved-input, dirty/busy, save and return behaviors verified |
| 4 — Access and bank accounts | `/hr-admin/employees/[employeeId]/access`; `/hr-admin/employees/[employeeId]/bank-accounts`; corresponding directory dialogs | Clear identity/state, sensitive information, permission-aware controls, confirmations and outcomes | Both entry-point types reviewed on desktop/mobile; relevant permissions, masking, validation, action impact and dialog lifecycle verified with existing domain protections preserved |
| 5 — Imports | Existing employee, bank and manager import workbenches on the directory | Clear secondary entry, instructions/input, preview, correction, commit and results | Each supported import journey visually reviewed and appropriately verified, including relevant identity/conflict errors, stale preview, partial outcomes and retry behavior |
| 6 — Family closure | All preceding routes/query entry points and affected shared consumers | Cross-screen consistency review, focused regression results, evidence index, cleanup record and scoped acceptance | Phase findings reconciled; joined navigation and responsive/keyboard behavior verified; remaining limitations explicitly recorded; family result published |

### Phase entry and exit rules

- Start Phase 1 with the current application and existing evidence, not assumptions that all listed requirements are defects. Its completion records a design direction, not implemented-screen acceptance.
- Before each implementation phase, identify exact routes, states, design changes, shared consumers and checks. Use the detailed responsibilities below to refine the scope.
- For each of Phases 2–5, follow **design → implementation → visual review → interaction checks → scoped closure**. Revise the design if rendered review exposes a problem.
- Record the phase result and any carried-forward item with its impact and intended resolution. A blocking design, correctness or access issue must be resolved before dependent work proceeds; unrelated follow-ups can remain explicitly bounded.
- Phase 6 checks consistency and integration across completed phases. It does not replace their visual reviews or retroactively turn unexecuted assessments into passes.
- This plan authorizes no deployment and sets no delivery dates. Updating it does not start or complete Phase 1 execution.

Inspect the actual route/query adapters and preserve supported deep links. Do not remove standalone routes because a dialog also exists. Review the directory and standalone entry points together so the same operation does not acquire two conflicting experiences.

Employee Documents and Lifecycle are adjacent families. The Employee Management makeover checks their entry points, employee context and return navigation where present. Redesigning their review queues, uploads, movements, onboarding or exits requires a separately enumerated follow-up slice. If a demonstrated shared defect crosses that boundary, document and fix the affected shared behavior with consumer regression.

## What the makeover will take care of

### 1. Page structure and visual hierarchy

- One clear task heading and concise description; role/workspace context stays in the shared shell.
- A clear primary action, with secondary and occasional actions positioned by frequency and impact.
- Review repeated banners, decorative pills, duplicate navigation and oversized cards. Remove or condense elements only when their task value is absent.
- Consistent typography, spacing, borders, surfaces, status colors, control heights and visible focus using existing semantic tokens.
- Useful summaries with explicit scope: directory totals, matching results and current-page values must be distinguishable. Do not invent readiness scores or imply payroll eligibility from descriptive employee data.
- A coherent reading order from task/context through filters and results to employee detail and actions.

### 2. Directory, search and filters

- Make supported search fields understandable; preserve actual matching semantics rather than promising unsupported search.
- Keep frequent filters visible and advanced filters discoverable without a floating panel obscuring results. Active advanced filters remain evident.
- Make status navigation, applied filters, result counts, reset and sorting easy to understand together.
- Preserve committed GET behavior: drafts change results only on Apply/Enter; pagination uses committed values; applying a new scope resets the page.
- Preserve refresh, copied links, Back/Forward, valid page-size choices and out-of-range recovery. Clearing filters must not resurrect stale values or selected actions.
- Retain full authorized collection semantics and deterministic sorting. Do not migrate to a paginated endpoint without resolving summaries and import lookup completeness.

### 3. Results, row actions and pagination

- Prioritize identity, employee code, employment state and the information needed for the directory task; decide column order from actual use.
- Keep long names, missing values, organizational labels and warning explanations readable.
- Use restrained, labelled status treatments. Distinguish employment state, login/access state and data completeness.
- Keep row actions discoverable and descriptive; avoid a repeated wall of equal-weight buttons. Choose inline actions versus a menu after reviewing frequency, keyboard access and permissions.
- Keep necessary wide-table overflow inside the named keyboard-accessible region. Any hidden mobile column needs an accessible equivalent in detail.
- Show truthful result/page scope and consistent pagination. Do not add selection checkboxes, cross-page bulk actions, export or sorting options without a supported task and data contract.

### 4. Selected employee detail

- Establish a clear identity header and relevant action group, then readable Profile, Structure, Access and Dates information.
- Choose the desktop panel and narrow-screen detail composition from rendered review; retain useful directory context without squeezing details into an unusable column.
- Make selection and dismissal understandable. Preserve independent authorized detail lookup, loading, failure/retry, stale-response protection and reconciliation on directory scope changes.
- Show accurate missing-data wording and formatted dates; do not expose technical IDs as primary identity.
- Preserve meaningful return context after editing or closing. Specify focus behavior separately for same-document dismissal and existing document-navigation transitions; do not promise restoration that has not been executed.

### 5. Create/edit forms

- Group existing fields into a clear sequence: identity/employment, contact/dates, structural mapping and review. Confirm group order against actual field dependencies.
- Review whether each form belongs in a full page or a wide dialog. Long forms require usable space and one clear body scroll owner; a wizard requires evidence of a real task benefit.
- Keep visible labels, required/optional guidance, help, dependent options and existing defaults. Do not hide configured fields to simplify the screenshot.
- Use consistent field widths and alignment; keep actions reachable on narrow and short screens without covering inputs.
- Present field and form errors clearly, focus the first actionable error, retain entered values after rejection and protect unsaved changes.
- Explain confirmed save outcomes and the resulting destination. Loading and duplicate-submit protection must reflect the actual request lifecycle.

### 6. Access and bank-account management

- Separate employee identity, membership/access state, role assignments and the impact of the permitted action.
- Preserve permission checks, sensitive-data masking, configured restrictions and backend validation. A cleaner presentation must not broaden access or imply a role grants unsupported rights.
- Make bank-account identity, primary/payout meaning and existing effective-date behavior understandable; preserve the established domain contract.
- Make confirmation wording describe actual consequences. Keep dirty/busy guards, validation and success/error feedback consistent with the shared modal lifecycle.
- Review both standalone and directory-dialog forms, including opening, saving, cancelling, reopening and returning to the employee.

### 7. Imports

- Keep imports available as secondary operations without dominating routine directory use.
- Clearly separate instructions/input, preview, correction, commit and results, using existing supported stages.
- Explain required columns and accepted values; display row-level errors and partial outcomes in readable language.
- Preserve employee/manager/bank identity rules, full lookup scope, authorization, audit behavior and existing duplicate/conflict checks. Never silently select the first ambiguous match.
- Invalidate stale previews when supported inputs change; preserve user input and result receipts after failure. Offer retry according to the actual confirmed or uncertain outcome, without automatic repeated writes.

### 8. Dialogs and action feedback

- Reuse `HrAdminActionModal` and established shared fields/feedback components; avoid a separate Employee-only modal system.
- Provide a named title, deliberate initial focus, Tab/Shift+Tab containment, visible focus, scroll lock and explicit dirty/busy closing policy.
- Return focus to the actual trigger where it remains available; verify mouse activation in WebKit as well as keyboard opening. Use a meaningful fallback when navigation removes the opener.
- Use plain section captions unless real tabs with keyboard behavior and associated panels exist.
- Distinguish pending, successful, rejected, partial and unconfirmed outcomes. Preserve persistent errors/receipts; toasts are supplementary.
- Read recovery repeats GET, not a successful or uncertain mutation. Keep technical diagnostics out of operator-facing task instructions.

### 9. Responsive layout, accessibility and content

- Review desktop, tablet and mobile layouts at 1440, 1024, 768, 390 and 320 CSS pixels; document any scoped omission. Include short-height dialogs.
- Check action wrapping, table/detail access, long content, error messages and form/footer overlap. Avoid document-level horizontal overflow.
- Check headings, landmarks, labels, descriptions, semantic tables/groups, keyboard order, focus visibility and status announcements.
- Review empty directory, no matches, loading, unavailable read, permission restriction, disabled action and unsaved/pending states.
- Use concise task language and explicit data scope. Preserve date-only values, timezone meaning and deterministic timestamp presentation.
- Record automated accessibility scan scope and incomplete findings. Viewport reflow is not native zoom; actual screen-reader, native zoom and physical-device checks are separate evidence, and remain open until performed.

## Shared implementation boundaries

Reuse `WorkspaceChrome`, Accerio `PageIntro`, `WorkspaceFilterForm`, `WorkspaceTableScrollRegion`, `PaginationBar`, shared form/status/feedback helpers and the existing action modal where they fit the task. Centralize reusable presentation changes in the existing token/pattern styles; keep employee-specific composition in the owning components.

Primary source map:

| Concern | Source beneath `web/src/app/hr-admin/employees/` |
| --- | --- |
| Directory, filters, summaries, action adapters | `page.tsx` |
| Selected employee detail and request lifetime | `employee-detail-selection.tsx` |
| Create/edit forms and values | `employee-form.tsx`, `form-values.ts`, `new/page.tsx`, `[employeeId]/edit/page.tsx` |
| Access | `[employeeId]/access/page.tsx`, `access-form.tsx`, `form-values.ts` in that directory |
| Bank accounts | `[employeeId]/bank-accounts/page.tsx`, `bank-account-manager.tsx` in that directory |
| Imports | `employee-import-workbench.tsx`, `employee-bank-import-workbench.tsx`, `employee-manager-import-workbench.tsx` |

Presentation work must preserve API payloads, employee/tenant ownership, permissions, historical/effective-date protections, audit, sensitive-data handling and domain calculations. No new component library, fabricated live data, backend policy redesign, production migration or deployment is included. Record a missing API/business capability separately rather than disguising it with a visual control.

## Review process within each implementation phase

| Stage | Required output before moving on |
| --- | --- |
| Baseline | Current screenshots, route/query/state inventory, supported actions, existing contract evidence and a short list of demonstrated design issues |
| Design direction | Proposed hierarchy and desktop/mobile composition for the slice; explicit decisions about table/detail, action placement and page/dialog choice |
| Implementation | Working screens using existing shared patterns, with a bounded change list and identified shared consumers |
| Visual review | Before/after rendered comparison of layout, spacing, typography, hierarchy, responsive states and long/error content; record the images actually reviewed |
| Interaction verification | Relevant navigation, filters/history, selection, form/dialog, feedback and permission checks on the built application; real backend cases for affected mutations |
| Closure | Exact results, retained failures and fixes, cleanup, remaining limitations and a scoped acceptance decision in the owning record |

Visual review is a delivery requirement, not an optional activity after tests pass. If screenshots expose a design problem, correct it and review the affected states again. Avoid repeating broad tests unless a new change or unresolved concern warrants them.

## Completion criteria

An implementation phase is complete when all of the following are documented:

- The implemented desktop/mobile composition has been visually reviewed against the Leave-derived standard, including non-happy-path states relevant to the change.
- Its primary tasks have clear entry, context, controls, actions and outcomes; unnecessary repetition and decorative hierarchy have been addressed with recorded reasons.
- Existing supported routes, data scope, permission boundaries and business behavior remain intact, with appropriate regression evidence.
- Changed interactions work with keyboard and pointer in Chromium, Firefox and WebKit; omissions are explicit. Mobile reflow and long/short dialogs have executed evidence.
- Appropriate build, lint and type checks pass; tests target meaningful behavior and preserve historical failure evidence.
- The report names exact route/state coverage, actual image-review scope and unexecuted manual assessments. Earlier certificates are not silently promoted to the changed artifact.
- Task-owned fixtures/services are cleaned up without deleting unrelated data or audit history. No deployment is inferred.

Use the [adoption checklist](hrms-ui-ux-screen-adoption-checklist.md) for the detailed per-slice acceptance record. Formal accessibility and exhaustive domain acceptance remain separate from completing the enumerated makeover scope.

## Following families

After Employee Management, propose a bounded screen inventory for Documents, then remaining ESS/MSS workflows, Tenant/Platform administration and other HR families. Apply the same visual-and-interaction makeover process to each; the sequence can change for a demonstrated blocking defect. This document schedules no dates and does not mark those future families redesigned.

## Phase progress

| Phase | Status | Evidence / result |
| --- | --- | --- |
| 1 — Baseline and design direction | Complete | [Baseline, visual findings and design decisions](hrms-employee-management-phase1-design-baseline.md); scoped capture evidence and remaining assessments recorded |
| 2 — Directory and employee details | Complete | [Implementation and verification record](hrms-employee-management-phase2-makeover.md) |
| 3 — Create and edit | Complete | [Create/edit implementation, visual review and bounded verification](hrms-employee-management-phase3-makeover.md) |
| 4 — Access and bank accounts | Complete | [Access/bank implementation, visual review and 51 passing browser checks](hrms-employee-management-phase4-makeover.md) |
| 5 — Imports | Complete | [Three-workbench makeover, visual review and 78 passing browser checks](hrms-employee-management-phase5-makeover.md) |
| 6 — Family closure | Complete within scope | [Joined acceptance, resolved integration/focus issues and retained limits](hrms-employee-management-phase6-closure.md); 36 scenario/browser combinations verified through main and focused reports |

Planning scope and the six-phase structure are documented. Update this table as work executes, linking each phase's actual design, implementation, reviewed images, verification results and remaining items. Keep planning completion separate from makeover execution.

This is the planning document. Phase 1 has bounded baseline evidence; Phases 2–5 have scoped implementation/verification evidence. [Phase 6](hrms-employee-management-phase6-closure.md) records joined closure and remaining limits. New domain/product-wide certification is not inferred.

Next-family proposal: [Document Management inventory and delivery sequence](hrms-document-management-makeover-inventory.md). This is planning only; its execution has not started.
