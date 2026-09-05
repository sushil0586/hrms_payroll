# Phase 1 HR Admin Backbone Matrix

## 1. Purpose

This document defines exactly what Phase 1 is expected to complete.

It translates the broader HRMS plan into a practical matrix for execution.

Use this document to answer:

- what belongs inside Phase 1
- what has already been completed
- what is still pending
- what outcome marks each workstream as done

Phase 1 focus:

- complete the HR admin backbone first
- make employee and organization administration operationally trustworthy
- close usability and validation gaps before moving into deeper policy execution work

---

## 2. Phase 1 Outcome

Phase 1 should end with this result:

- HR can create, review, update, and govern employee masters without engineering support
- HR can manage organization masters with safe edit and deactivation rules
- employee access provisioning is aligned with employee status and role expectations
- admin screens surface enough review context to catch bad records early
- core HR admin flows are stable enough for real tenant onboarding and daily operation

---

## 3. Matrix

| Workstream | Scope In Phase 1 | Already Complete | Remaining In Phase 1 | Done Signal |
| --- | --- | --- | --- | --- |
| Employee master validation safety | Keep employee create/edit reliable and prevent obvious bad records | Duplicate employee code blocking, self-manager blocking, employee status versus live-access guardrails, structural mapping consistency checks, and richer date/lifecycle consistency checks | Closed in current pass. Monitor only for newly discovered edge cases during broader Phase 1 usage. | HR cannot save structurally invalid or status-inconsistent employee masters |
| Employee access provisioning discipline | Make employee-to-user provisioning safe and consistent | Role requirement enforced, active access blocked for inactive/exited employees, inactive/exited employee cannot be moved while live access still exists, and offboarding-safe recovery defaults are now available in the access form | Closed in current pass. Future work is only deeper offboarding automation if Phase 1 still needs it. | Employee access state stays aligned with employee status and role assignment rules |
| Employee review usability | Make the employee directory usable as a review surface | Directory exposes access status, membership state, assigned-role counts, structural completeness warnings, and access-readiness warnings | Closed in current pass. Future polish is optional unless real HR usage exposes visibility gaps. | HR can identify incomplete or risky employee records without opening every subflow |
| Employee form guidance | Guide users away from invalid structure combinations before submit | Relation-aware employee form options, dependent selects narrow automatically, incompatible dependent values get cleared, and inline helper hints explain the narrowing behavior | Closed in current pass. Remaining work is polish-only unless users still hit avoidable mapping confusion. | HR is guided into valid employee org mappings with minimal trial-and-error |
| Organization master validation safety | Make organization writes safe and predictable | Duplicate code blocking, self-parent hierarchy blocking, grade-level validation, deactivation dependency blocking | Add any missing validation on deeper org scenarios discovered during real usage | Organization masters cannot be saved into invalid hierarchy or dependency states |
| Organization review usability | Make organization setup auditable from one place | Search, active/inactive filtering, selected-record detail panel, dependency counts in selected detail, list-level warning states, and edit-impact messaging in review surfaces | Closed in current pass. Further work is optional polish unless real usage exposes missing review context. | HR can inspect structural setup and understand downstream impact before editing |
| Organization change control | Prevent unsafe structural changes | Deactivation blocked when employees, children, or linked mappings still depend on a record, and edit forms now surface guided cleanup links before inactivation | Closed in current pass. Future work is only deeper reassignment automation if Phase 1 still needs it. | Structural masters cannot be quietly disabled while still operationally in use |
| Access and manager assignment operability | Ensure employee administration flows work end to end, not only as isolated screens | Employee detail, access page, manager assignment logic, role-aware admin gating, direct-report visibility, manager-only review filtering, and reassignment warnings for inactive or exited managers | Keep monitoring edge-case reassignment scenarios during broader Phase 1 usage, but the main review visibility gap is closed in the current pass. | HR can confidently assign managers and provision access as part of normal employee administration |
| Admin UX reliability | Reduce friction across key HR admin paths | Failure states, demo-mode discipline, consistent page-level admin behavior, directory/list filtering improvements, form-level recovery guidance, and field-specific validation feedback across employee, access, and organization flows | Closed in current pass. Future work is only iterative polish from real HR usage, not Phase 1 backbone scope. | Core HR admin workflows feel stable, predictable, and operationally ready |
| Test and release confidence for Phase 1 | Keep the backbone safe while iterating | Smoke suite expanded repeatedly across employee, access, and organization flows; lint, typecheck, Django check all green; final Phase 1 regression pass revalidated the backbone after UX and operability polish | Closed in current pass. Broader test expansion now belongs to later release-readiness work, not Phase 1 backbone completion. | Phase 1 closes with reliable automated coverage on major HR admin backbone risks |

---

## 4. Recommended Completion Order

Recommended order for the rest of Phase 1:

1. employee review usability completion
2. remaining employee master validation and consistency polish
3. organization review and change-control polish
4. manager assignment and access-operability cleanup
5. final Phase 1 regression pass and doc closeout

This order keeps the work aligned with the current implementation state and avoids jumping early into Phase 2 concerns.

---

## 5. What Is Explicitly Out Of Phase 1

These do not need to be completed to close Phase 1:

- leave runtime rule enforcement
- attendance runtime rule enforcement
- lifecycle automation depth
- document workflow maturity
- notification-center completion
- reporting/export completion
- payroll behavior

Those belong to later phases even if some supporting groundwork appears during Phase 1.

---

## 6. Phase 1 Closeout Checklist

Phase 1 can be considered complete when all of the following are true:

- employee master flows are safe and operationally usable
- employee access and employee status cannot drift into contradictory states
- organization masters are editable with trustworthy validation and change-control rules
- employee and organization review screens provide enough context for daily HR operations
- major Phase 1 risks are covered by backend smoke tests and core quality checks
- Phase 1 documentation is updated with completed backend, model, frontend, and testing changes
