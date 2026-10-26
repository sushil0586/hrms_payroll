# Manager Self-Service UI/UX makeover inventory

Prepared: 26 October 2026. Status: source inventory complete; fresh runtime baseline pending. This inventory is the scope boundary for the remaining ESS/MSS makeover.

## Reconciled boundary

The current repository supersedes the early statement in `accerio-design-system-certification.md` that only a shared MSS shell example existed and later ESS phases had not started. All ten current ESS routes are implemented and reconciled by the ESS-1 through ESS-6A records in [the ESS coverage tracker](hrms-ess-coverage-tracker.md). The Workflow/Notification makeover also completed the current ESS and MSS inbox presentation and read-state slice.

The remaining family is therefore the three-route MSS workspace plus its shared decision dialogs, route boundaries and cross-workspace journeys. ESS is a regression consumer. This work must not redesign completed ESS pages or invent employee/manager capabilities.

## Route inventory

| ID | Route or state | Current task | Important UI/state | Data and mutation boundary | Makeover focus |
| --- | --- | --- | --- | --- | --- |
| `MSS-SCR-001` | `/mss` | Manager control center | Live/demo eyebrow, permission-scoped summary, daily priority, manager action table, team snapshot, ESS links | `getMssApprovalInbox`; visible counts and links depend on leave-approval and attendance-review permissions | Remove repeated signals, prove count/action meaning, prioritize the next decision, keep personal ESS secondary |
| `MSS-SCR-002` | `/mss/approvals?queue=leave` | Review leave requests | Queue tabs, summary, paged table, selected detail and decision action | Manager leave list/detail and approve/reject endpoints; manager/team/tenant scope; backend owns eligibility | Committed URL state, useful row identity, detail continuity, guarded decision dialog, exact feedback and refresh |
| `MSS-SCR-003` | `/mss/approvals?queue=attendance` | Review attendance regularizations | Queue tabs, summary, paged table, selected detail and decision action | Manager regularization list/detail and approve/reject endpoints; attendance-review permission; backend owns transition | Same queue contract as Leave while retaining attendance-specific evidence and downstream meaning |
| `MSS-SCR-004` | `/mss/approvals?queue=history` | Explain completed-decision availability | Explicit unavailable state and links back to active queues | No approved completed-decision projection exists | Preserve an honest unavailable state; do not fabricate history from current pages or browser state |
| `MSS-SCR-005` | `/mss/notifications` | Read manager notifications and follow authorized sources | Search/status/priority filters, paging, detail dialog, read/unread mutation, approval/history shortcuts | Manager notification list/detail/read-state endpoints; safe local action destinations only | Retain accepted Workflow/Notification Phase 5 behavior and verify handoff/return continuity with approvals |
| `MSS-SCR-006` | MSS shell and route boundaries | Navigate, load, recover and enforce access | Accerio shell, mobile menu, `loading.tsx`, `error.tsx`, workspace access | `requireWorkspaceAccess({ workspace: "mss" })`; server menu and session permissions | Active ancestry, compact navigation, useful loading/error recovery, role denial and ESS switching |

## Shared interaction inventory

| Area | Current implementation | Required acceptance |
| --- | --- | --- |
| Queue selection | `queue=leave|attendance|history` in the URL | Reload, copied link and Back/Forward restore the same permitted queue; unsupported values fail to a truthful permitted default |
| Paging and selection | Queue-specific page parameters and optional selected detail | Paging never selects a foreign/off-page record silently; selected detail remains addressable or shows a deliberate stale/denied state |
| Decision dialog | `ManagerApprovalReviewAction` and `ManagerDecisionPanel` | Approve/reject eligibility, required rejection note, duplicate guard, busy state, exact error, uncertain outcome, focus containment and return |
| Outcome reconciliation | Mutation followed by authoritative queue/detail refresh | Confirm only server-confirmed outcomes; preserve queue context; disclose confirmed write plus failed refresh separately |
| Notification handoff | Shared `UserNotificationCenter` with MSS endpoints | Read state persists; safe source link reaches an authorized manager destination; return retains inbox filter/page context where supported |
| Tables | Shared named scroll regions and status badges | Keyboard reachable scroll region, stable row identity, responsive action access, no document overflow at 320px |
| Empty/error states | Page and route-specific notices plus shared boundaries | Distinguish clear queue, no match, no permission, stale item and unavailable service |

## Permissions and security matrix

| Persona | Dashboard | Leave queue/decision | Attendance queue/decision | Notifications | Required negative proof |
| --- | --- | --- | --- | --- | --- |
| Manager with both permissions | Both queue summaries/actions | Allowed within reporting scope | Allowed within reporting scope | Own manager projection | Foreign tenant, out-of-scope employee and terminal record denied |
| Leave-only manager | Leave signals only | Allowed within reporting scope | Hidden/denied | Own manager projection | Direct attendance URL and mutation remain denied |
| Attendance-only manager | Attendance signals only | Hidden/denied | Allowed within reporting scope | Own manager projection | Direct leave URL and mutation remain denied |
| Manager without decision permissions | No approval queue action | Hidden/denied | Hidden/denied | Only if separately authorized by workspace contract | Query parameters cannot reveal queue data |
| ESS/HR-only or unauthenticated user | Denied or redirected by workspace policy | Denied | Denied | Denied | Direct routes and APIs disclose no manager/team data |

## Existing evidence to reuse carefully

The strongest mapped suites are `mss-control-center-certification.spec.ts`, `mss-rbac-approver-certification.spec.ts`, `mss-frontend-validation.spec.ts`, the ESS/MSS workflow and modal suites, and Workflow/Notification Phase 5–6. They establish useful historical contracts, but they are not fresh acceptance for the final MSS makeover build.

The portal inventory records one approved product limitation: completed decision history has no live backend projection. Keep `queue=history` as an explicit unavailable state until a separately approved API and retention policy exist.

## Scope exclusions

- No completed-decision API, team calendar, raw-punch editor, delegation engine or universal approval workflow.
- No change to leave calculation, attendance derivation, payroll effects, reporting hierarchy, transition eligibility or audit semantics.
- No reopening of accepted ESS presentation except regressions caused by shared MSS work.
- No production, provider, physical-device, native-zoom, screen-reader or formal WCAG claim from local browser evidence.
