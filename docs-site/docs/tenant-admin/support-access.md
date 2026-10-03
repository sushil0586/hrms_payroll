# Support Access

Support Access controls temporary assisted operations access for support or implementation teams. It should always be scoped, time-bound, approved, and auditable.

![Support access grants](../assets/screenshots/tenant-admin/support-access.png)

## On This Page

- [When to use this page](#when-to-use-this-page)
- [Page sections](#page-sections)
- [Screen labels to recognize](#screen-labels-to-recognize)
- [Controls and actions](#controls-and-actions)
- [Grant states](#grant-states)
- [Example: request payroll setup support](#example-request-payroll-setup-support)
- [Example: approve, start, and end a grant](#example-approve-start-and-end-a-grant)
- [Example: reject or revoke access](#example-reject-or-revoke-access)
- [Validation and negative cases](#validation-and-negative-cases)
- [Signoff checklist](#signoff-checklist)

## When To Use This Page

- Support needs temporary access to investigate a tenant issue.
- A pending support grant needs approval or rejection.
- An approved support grant needs to be started.
- An active support grant must be ended or revoked.
- You need evidence of who accessed the tenant, why, and for how long.

## Page Sections

| Section | Meaning | What to check |
| --- | --- | --- |
| Workflow band | Shows the support access lifecycle. | Current grant should have one clear next action. |
| Support request form | Creates a scoped request. | Support agent, reason, duration, and scope must be clear. |
| Grant list | Shows requested, approved, active, ended, revoked, or expired grants. | Use filters and pagination for old grants. |
| Decision actions | Approve, reject, start, end, or revoke depending on state. | Add decision note where required. |
| Scope guide | Explains what each scope allows. | Choose the narrowest possible scope. |
| Support audit link | Opens Trust Audit for support evidence. | Use after every session. |

## Screen Labels To Recognize

| Screen label | Meaning |
| --- | --- |
| Scoped support grants | Temporary support access requests with explicit scope and duration. |
| What support can access | Plain-language explanation of support visibility. |
| Scope guide | Rules that help the tenant decide whether a support request is acceptable. |

## Controls And Actions

| Control | Meaning | Expected result |
| --- | --- | --- |
| Support agent | Person or team that needs temporary access. | Grant clearly identifies who is receiving access. |
| Duration | Time window for support access. | Access expires automatically after the configured window. |
| Reason | Business justification. | Audit evidence explains why support was needed. |
| Scope | Functional access boundary. | Support can only work inside the selected scope. |
| Request access | Creates the support grant request. | Grant appears as requested or pending. |
| Approve | Allows the grant to move forward. | Grant becomes approved. |
| Reject | Denies the request. | Grant closes with rejection evidence. |
| Start | Activates an approved grant. | Grant becomes active for the support window. |
| End | Ends an active session normally. | Grant becomes ended. |
| Revoke | Stops an approved or active grant early. | Grant becomes revoked and cannot be used. |
| Support audit | Opens evidence for support activity. | Trust Audit shows request, decision, and session events. |

## Grant States

| State | Meaning | Next action |
| --- | --- | --- |
| Requested | Support access has been requested and needs a decision. | Approve or reject. |
| Approved | Tenant admin approved the request but session is not active yet. | Start or revoke. |
| Active | Support session can be used. | End or revoke. |
| Ended | Session completed normally. | Review Trust Audit. |
| Revoked | Access was stopped before completion. | Review Trust Audit and create a new request if needed. |
| Expired | Time window ended. | Review Trust Audit and create a new request if more time is needed. |

## Scope Decision Guide

| Need | Preferred scope |
| --- | --- |
| Investigate login or role issue | Account/user access scope only. |
| Investigate payroll setup | Payroll setup or payroll readiness scope only. |
| Investigate employee data issue | HR employee scope with limited duration. |
| Review audit evidence | Trust audit scope only. |
| General troubleshooting | Start narrow, then request broader access only if evidence proves it is needed. |

## Example: Request Payroll Setup Support

1. Open **Tenant Admin > Support Access**.
2. Choose the support agent.
3. Set a short duration, such as 2 hours.
4. Enter a reason, such as "Investigate payroll calendar setup issue for September payroll".
5. Select only the payroll setup scope.
6. Submit the request.
7. Confirm the grant appears in the list.

Expected result: support access is pending approval with a clear reason, scope, and expiry.

## Example: Approve, Start, And End A Grant

1. Open the pending grant.
2. Review requester, reason, scope, and expiry.
3. Add an approval note if the page asks for one.
4. Approve the grant.
5. Start the session only when support is ready to work.
6. After the issue is resolved, end the session.
7. Open **Support audit** and confirm request, approval, start, and end events exist.

## Example: Reject Or Revoke Access

Use **Reject** when the request should not be approved. Use **Revoke** when an approved or active grant must be stopped early.

Common reasons:

- Scope is too broad.
- Reason is unclear.
- Wrong support agent selected.
- Issue is already resolved.
- Customer owner asks to stop access.

## Validation And Negative Cases

| Case | Expected behavior | What to do |
| --- | --- | --- |
| No support agent | Request should be blocked. | Select a valid support agent. |
| Missing reason | Request should be blocked or treated as incomplete. | Add a business reason. |
| No scope selected | Request should be blocked. | Choose the minimum required scope. |
| Duration too long | Request may be blocked or flagged. | Shorten duration and request extension later if needed. |
| Approve button missing | User lacks permission or grant is not requested. | Check current role and grant state. |
| End button missing | Grant is not active. | Start the grant first or review state. |
| Audit event not visible | Filter may be hiding the evidence. | Open Trust Audit and clear filters or use support event filters. |

## Signoff Checklist

- Every support grant has a named support agent.
- Every support grant has a clear reason.
- Scope is narrow and appropriate.
- Duration is time-bound.
- Active grants are ended or revoked after work is complete.
- Trust Audit shows request, approval/rejection, start, end/revoke, and actor details.

## Related Guides

- [Trust Audit](trust-audit.md)
- [Security Readiness](security.md)
- [Tenant Dashboard](dashboard.md)
