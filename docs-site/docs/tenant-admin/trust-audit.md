# Trust Audit

Trust Audit is the evidence ledger for tenant-admin activity. Use it to review and export proof for user access, role changes, support grants, settings, plan changes, and security decisions.

![Tenant trust audit](../assets/screenshots/tenant-admin/trust-audit.png)

## On This Page

- [When to use this page](#when-to-use-this-page)
- [Page sections](#page-sections)
- [Screen labels to recognize](#screen-labels-to-recognize)
- [Controls and actions](#controls-and-actions)
- [Evidence groups](#evidence-groups)
- [Example: prove support access was controlled](#example-prove-support-access-was-controlled)
- [Example: review user and role changes](#example-review-user-and-role-changes)
- [Validation and negative cases](#validation-and-negative-cases)
- [Signoff checklist](#signoff-checklist)

## When To Use This Page

- A customer owner asks who changed access.
- Support access must be reviewed after a session.
- A plan or setting change needs evidence.
- Security readiness requires proof of control.
- Internal review needs an audit export.

## Page Sections

| Section | Meaning | What to check |
| --- | --- | --- |
| Metrics | Event totals and current evidence posture. | Confirms whether data exists for the selected tenant. |
| Filters | Event group, event type, actor, session, date, or search. | Clear filters if expected events are hidden. |
| Audit ledger | Event rows with actor, subject, time, outcome, and metadata. | Select the exact event before exporting or quoting evidence. |
| Pagination | Moves through long evidence history. | Check all pages when investigating older events. |
| Export | Downloads audit evidence when allowed. | Treat downloaded files as sensitive. |

## Screen Labels To Recognize

| Screen label | Meaning |
| --- | --- |
| Event groups | Filters that group audit records by business area. |
| Audit taxonomy | The catalog of event types, modules, and risk categories. |
| Evidence ledger | The auditable timeline of tenant-admin activity. |

## Controls And Actions

| Control | Meaning | Expected result |
| --- | --- | --- |
| Event group chips | Filter events by area such as users, roles, support, plan, or security. | Ledger narrows to matching evidence. |
| Event type filter | Finds a specific action. | Useful for support approval, role update, or user suspend events. |
| Search | Finds actor, subject, session reference, or text. | Matching events remain visible. |
| Clear filters | Resets the ledger. | Full evidence list returns. |
| Download audit | Exports evidence for authorized users. | Downloaded file contains filtered or scoped evidence. |
| First / Previous / Next / Last | Navigate long event history. | Page changes without losing current filters. |

## Evidence Groups

| Group | Examples |
| --- | --- |
| Users | User invited, activated, suspended, reactivated, role changed. |
| Roles | Role created, edited, activated, deactivated, permission changed. |
| Support | Support requested, approved, rejected, started, ended, revoked, expired. |
| Plan | Plan change requested, approved, applied, rejected, canceled. |
| Settings | Tenant profile change requested or applied. |
| Security | Security readiness decision, warning, blocker, or evidence event. |

## Example: Prove Support Access Was Controlled

1. Open **Tenant Admin > Trust Audit**.
2. Filter by support events.
3. Search for the support session reference or support agent.
4. Confirm request event exists.
5. Confirm approval or rejection event exists.
6. If approved, confirm start and end/revoke events exist.
7. Export evidence if the reviewer needs a file.

Expected result: the support session has a complete chain from request to closure.

## Example: Review User And Role Changes

1. Filter by users or roles.
2. Search the user's email or role code.
3. Review actor and timestamp.
4. Confirm the reason or metadata if available.
5. If the change was incorrect, open **Users** or **Roles** and fix it.
6. Return to Trust Audit and confirm the corrective action appears.

## Validation And Negative Cases

| Case | Expected behavior | What to do |
| --- | --- | --- |
| No events visible | Filters may be too narrow or tenant has no evidence yet. | Clear filters and search again. |
| Export hidden | Current user lacks export permission. | Ask an authorized tenant admin. |
| Event count differs from dashboard | Dashboard may summarize current state while audit shows history. | Use filters and time range to compare. |
| Sensitive event should not be shared widely | Export contains account evidence. | Share only with approved recipients. |
| Support action not visible | Session may not have started or ended yet. | Check Support Access state. |

## Signoff Checklist

- User and role changes are visible.
- Support grant lifecycle events are visible.
- Plan and settings requests are visible.
- Security evidence is searchable.
- Pagination works for long history.
- Audit exports are permission-controlled.

## Related Guides

- [Support Access](support-access.md)
- [Tenant Users](users.md)
- [Security Readiness](security.md)
