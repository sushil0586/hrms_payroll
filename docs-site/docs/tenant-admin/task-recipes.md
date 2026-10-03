# Tenant Admin Task Recipes

Use these recipes when you know the job you need to finish but are not sure which Tenant Admin page to open.

## On This Page

- [Access recipes](#access-recipes)
- [Role recipes](#role-recipes)
- [Support recipes](#support-recipes)
- [Plan and setup recipes](#plan-and-setup-recipes)
- [Security and audit recipes](#security-and-audit-recipes)

## Access Recipes

### Add A Tenant User

1. Open **Tenant Admin > Users**.
2. Search by email to confirm the user does not already exist.
3. Choose **Invite** or **Add user**.
4. Enter the user details.
5. Assign the minimum role required for the work.
6. Save the user.
7. Confirm the user appears as active or invited.
8. Ask the user to sign in and confirm the correct workspace opens.

If the user does not receive email, ask them to use forgot password or check the notification delivery evidence.

### Fix Wrong Landing Page After Login

1. Open **Tenant Admin > Users**.
2. Search for the user.
3. Confirm the user is active.
4. Confirm at least one valid role is assigned.
5. If the role is wrong, choose **Update roles**.
6. Save the corrected role assignment.
7. Ask the user to sign out and sign in again.
8. If ESS or MSS is expected, verify employee and manager mapping in HR Admin.

### Suspend A User

1. Open **Users**.
2. Search for the user.
3. Confirm this is the correct person.
4. Confirm another user owns any critical admin duty.
5. Choose **Suspend**.
6. Confirm the status changes away from active.
7. Review **Trust Audit** if evidence is required.

## Role Recipes

### Create A Custom Role

1. Open **Roles**.
2. Check whether a system role already covers the need.
3. Choose **Add role**.
4. Give the role a clear business name.
5. Add a description with owner and purpose.
6. Select only the permissions needed.
7. Review risk badges before saving.
8. Save the role.
9. Assign it from **Users**.

### Review High-Risk Access

1. Open **Roles**.
2. Review the permission matrix.
3. Look for high or critical risk badges.
4. Open the related role.
5. Confirm why the permission is needed.
6. Remove permissions that are not required.
7. Check **Users** to confirm who holds the role.
8. Review **Trust Audit** for role change evidence.

## Support Recipes

### Approve Support Access

1. Open **Support Access**.
2. Review requester, support agent, reason, scope, and expiry.
3. Confirm the request is narrow enough.
4. Approve only if the request is valid.
5. Start the session only when support is ready to work.
6. After the session, end or revoke access.
7. Check **Trust Audit** for support activity.

### Revoke Support Access

1. Open **Support Access**.
2. Find the active or approved grant.
3. Confirm it should no longer be available.
4. Choose **Revoke** or **End** based on the state.
5. Confirm the grant is no longer active.
6. Review **Trust Audit** for evidence.

## Plan And Setup Recipes

### Check Plan Limits

1. Open **Plan and Billing**.
2. Review subscription status.
3. Check usage meters for users, employees, payroll runs, documents, and support sessions.
4. If a limit is near capacity, avoid adding more data until the commercial action is clear.
5. Submit a plan change request when needed.

### Complete Tenant Setup

1. Open **Setup Guide**.
2. Review incomplete setup areas.
3. Open the linked page for each incomplete item.
4. Complete the missing setup.
5. Return to **Setup Guide**.
6. Confirm the setup state improves.
7. Use **Security Readiness** before production handoff.

### Request Tenant Profile Change

1. Open **Settings**.
2. Identify the field that needs a governed change.
3. Choose **Request profile change**.
4. Enter current value, requested value, and reason.
5. Submit the request.
6. Track the request from **Plan and Billing**.

## Security And Audit Recipes

### Review Security Readiness

1. Open **Security Readiness**.
2. Review blocked items first.
3. Open the linked page for each blocker.
4. Resolve active support, risky roles, or missing audit evidence.
5. Review warning items before customer handoff.
6. Use **Trust Audit** for evidence.

### Export Trust Evidence

1. Open **Trust Audit**.
2. Filter by event group, actor, date, or support session.
3. Review the visible events.
4. Export only when policy allows.
5. Store the export as sensitive account evidence.

## Practical Troubleshooting

| Problem | Start here | What to verify |
| --- | --- | --- |
| User cannot access workspace | Users | Active user, tenant role, employee mapping. |
| Add user is blocked | Plan and Billing | Active user limit and subscription state. |
| Role cannot be deactivated | Roles | System role or assigned users. |
| Support request is too broad | Support Access | Scope, duration, and reason. |
| Security remains blocked | Security Readiness | Exact readiness domain and linked action. |
| Evidence not found | Trust Audit | Filters, event group, pagination, and date range. |
