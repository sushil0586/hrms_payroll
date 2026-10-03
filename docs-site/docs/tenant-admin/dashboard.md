# Tenant Dashboard

The Tenant Dashboard is the account control center. It gives the tenant owner one place to review access, plan posture, setup readiness, support activity, security blockers, and audit evidence.

![Tenant Admin dashboard](../assets/screenshots/tenant-admin/dashboard.png)

## On This Page

- [When to use this page](#when-to-use-this-page)
- [Dashboard map](#dashboard-map)
- [Screen labels to recognize](#screen-labels-to-recognize)
- [Top actions](#top-actions)
- [Example: daily account check](#example-daily-account-check)
- [Example: resolve an action queue item](#example-resolve-an-action-queue-item)
- [Negative and edge cases](#negative-and-edge-cases)
- [Signoff checklist](#signoff-checklist)

## When To Use This Page

Use this page when you need to answer:

- Is the tenant account healthy enough for daily operations?
- Are users, roles, support access, setup, and security in a safe state?
- Which page should I open next?
- Is there any commercial, launch, or audit evidence that needs attention?

## Dashboard Map

| Area | What it shows | What the user should do |
| --- | --- | --- |
| Account posture cards | Plan, users, roles, setup, support, and security status. | Check if any card shows blocked, warning, or limit exceeded. |
| Action queue | Tenant admin items that need attention. | Open the linked page and finish the pending action. |
| Tenant readiness | Operational readiness across setup, access, support, and security. | Use it before launch or after major access changes. |
| Workspace router | Quick links into Users, Roles, Plan, Setup, Security, Support, and Audit. | Use it as a safe navigation map. |
| Trust and launch evidence | Account-level evidence for support, commercial, and security work. | Export or review before governance signoff. |

## Screen Labels To Recognize

| Screen label | Meaning |
| --- | --- |
| Tenant Status | High-level account status, usually ready, warning, or blocked. |
| Items that need your attention | The action queue for tenant-admin work. |
| Launch checklist | Setup and security areas that must be reviewed before live use. |
| Open the right workspace | Router area that helps the user move to the correct workspace. |

## Top Actions

| Action | Meaning | Use it when |
| --- | --- | --- |
| Invite user | Opens the Tenant Users invite flow. | You need to add an account owner, HR admin, payroll user, finance user, or reviewer. |
| Request account change | Opens the governed account change flow. | You need to change sensitive tenant profile, commercial, or setup values. |
| Download audit | Downloads commercial or tenant audit evidence when allowed. | A customer owner or internal reviewer asks for evidence. |

If an action is hidden or disabled, the logged-in user does not have the required permission or the current account state does not allow that operation.

## Example: Daily Account Check

1. Open **Tenant Admin > Dashboard**.
2. Check the account posture cards at the top.
3. Review **Action queue** for blocked or warning rows.
4. Open each row from the right aligned action button.
5. Return to Dashboard and confirm the count has reduced or the status has changed.
6. If the count remains the same, open **Trust Audit** and confirm whether the action produced evidence.

Expected result: the dashboard shows the current account status, and every open action has a clear next page.

## Example: Resolve An Action Queue Item

| Queue item | Open this page | Expected resolution |
| --- | --- | --- |
| User has no role | Users | Assign the correct role or suspend the account. |
| Role risk needs review | Roles | Review permissions and seat ownership. |
| Support access pending | Support Access | Approve, reject, start, end, or revoke the grant. |
| Security readiness blocked | Security | Review blocker and collect evidence. |
| Setup incomplete | Setup Guide | Finish the linked setup area. |
| Plan or limit issue | Plan and Billing | Review limit usage and submit a change request if required. |

## Negative And Edge Cases

| Situation | What it means | What to do |
| --- | --- | --- |
| User lands on Workspace Access after login | The user is authenticated but has no active route. | Open Users and check tenant membership, role, and employee profile mapping. |
| Download audit is hidden | The user lacks export permission. | Ask a tenant admin with audit export access to download it. |
| Count looks high but no row is visible | Filters, pagination, or role visibility may be hiding rows. | Open the linked detail page and clear filters. |
| Support access remains active | A support grant was not ended or revoked. | Open Support Access, end the session, then verify in Trust Audit. |
| Security is blocked after setup is complete | Setup and security are separate readiness dimensions. | Open Security and resolve the exact blocker. |

## Signoff Checklist

- Dashboard opens without a live workspace load error.
- Every action button routes to the matching tenant-admin page.
- Users, roles, plan, setup, support, security, and audit pages are reachable from the dashboard.
- Blocked or warning counts match the child pages after filters are cleared.
- Audit downloads are available only to authorized users.

## Related Guides

- [Tenant Users](users.md)
- [Roles](roles.md)
- [Support Access](support-access.md)
- [Security Readiness](security.md)
- [Trust Audit](trust-audit.md)
