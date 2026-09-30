# User Journey Certification Automation

This suite certifies HRMS from the point of view of real users, not only route smoke tests. Each phase should be run on local first, then stage, using one account per workspace role.

## Required Personas

Set these environment variables before running stage certification:

```bash
export PLAYWRIGHT_BASE_URL=https://hrms.accerio.in
export PLAYWRIGHT_LIVE_PLATFORM_ADMIN_USERNAME=<platform-admin-user>
export PLAYWRIGHT_LIVE_PLATFORM_ADMIN_PASSWORD=<platform-admin-password>
export PLAYWRIGHT_LIVE_TENANT_ADMIN_USERNAME=<tenant-admin-user>
export PLAYWRIGHT_LIVE_TENANT_ADMIN_PASSWORD=<tenant-admin-password>
export PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME=<hr-admin-user>
export PLAYWRIGHT_LIVE_HR_ADMIN_PASSWORD=<hr-admin-password>
export PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME=<employee-user>
export PLAYWRIGHT_LIVE_EMPLOYEE_PASSWORD=<employee-password>
export PLAYWRIGHT_LIVE_MANAGER_USERNAME=<manager-user>
export PLAYWRIGHT_LIVE_MANAGER_PASSWORD=<manager-password>
export PLAYWRIGHT_LIVE_PAYROLL_FINANCE_USERNAME=<finance-user>
export PLAYWRIGHT_LIVE_PAYROLL_FINANCE_PASSWORD=<finance-password>
export PLAYWRIGHT_LIVE_NO_ACCESS_USERNAME=<active-user-with-no-workspace-role>
export PLAYWRIGHT_LIVE_NO_ACCESS_PASSWORD=<no-access-password>
export PLAYWRIGHT_PHASE3_EMPLOYEE_EMAIL=<disposable-employee-recipient>
export PLAYWRIGHT_PHASE3_EMPLOYEE_LOGIN=<optional-employee-login-or-email>
export PLAYWRIGHT_PHASE3_EMPLOYEE_PASSWORD=<disposable-employee-password>
```

The no-access user is optional. If it is not set, that one negative test is skipped.
The Phase 3 employee email should be a safe test recipient. Use a fresh mailbox or clean disposable recipient when rerunning on stage, because access provisioning may create a login for that address.
The Phase 3 employee password is optional during provisioning. Leave it unset when you want the employee to set the password through the email flow. After the password is set, run the focused Phase 3 login check with `PLAYWRIGHT_PHASE3_EMPLOYEE_PASSWORD`.

## Phase 1: Access and Routing

Purpose: verify every role lands in the correct workspace and does not see the wrong workspace.

Run:

```bash
pnpm --dir web certify:users:phase1
```

Checks:

- Unauthenticated protected route redirects to login.
- Platform Admin opens `/platform-admin`.
- Tenant Admin opens `/tenant-admin`.
- HR Admin opens `/hr-admin`.
- Employee opens `/ess` and cannot stay on `/hr-admin`.
- Manager opens `/mss/approvals`.
- Payroll Finance Manager opens `/finance-manager`.
- No-role user opens `/workspace-access`.

## Phase 2: Workspace Usability

Purpose: verify each user-facing page is usable, readable, and visually stable.

Run:

```bash
pnpm --dir web certify:users:phase2
```

Checks on each page:

- Correct page heading is visible.
- Required business text is visible.
- No app-level error appears.
- No horizontal overflow.
- Visible links are not placeholder, `undefined`, `null`, or dynamic template URLs.
- Buttons, inputs, and links have usable dimensions.
- Button/link text is not clipped.
- Hover states do not introduce overflow.
- Typography stays within the approved app scale.

Current pages covered:

- HR Admin control center, employees, organization, documents, notifications, payroll, salary, reports.
- Tenant Admin dashboard, users, roles, plan, setup, settings, security, support, trust audit.
- ESS dashboard, documents, payslips, notifications, statutory declarations.
- MSS approvals and notifications.
- Finance Manager control center.

## Full Read-Only Certification

Run access and usability phases without creating or editing records:

```bash
pnpm --dir web certify:users:readonly
```

## Phase 3: HR Admin Operational Workflow

Purpose: verify HR Admin can perform practical employee setup from the browser, and the created employee can enter ESS.

Run the browser-based provisioning and email handoff:

```bash
pnpm --dir web certify:users:phase3
```

Checks:

- Employee create form is readable, usable, and validates required fields.
- HR Admin creates a live employee master through the browser.
- HR Admin edits profile fields and returns to the selected employee detail.
- Employee directory/detail remain stable after the mutation.
- HR Admin provisions ESS access with the Employee role.
- HR Admin adds a primary bank account used by payroll readiness.
- The password setup email is requested through the `/forgot-password` browser flow for `PLAYWRIGHT_PHASE3_EMPLOYEE_EMAIL`.
- The test records the created employee code, username, and email as annotations for handoff.
- Each major step checks for app errors and horizontal overflow.

After the recipient sets the password from email, run the focused ESS verification:

```bash
export PLAYWRIGHT_PHASE3_EMPLOYEE_PASSWORD=<password-set-from-email>
pnpm --dir web certify:users:phase3:login
```

If the login identifier differs from the email, set `PLAYWRIGHT_PHASE3_EMPLOYEE_LOGIN` as well.

Focused ESS verification checks:

- Employee can log in and land on ESS.
- ESS Overview, Documents, Payslips, Statutory Declarations, and Notifications render without app errors or horizontal overflow.
- Each ESS child page exposes the expected practical content for an employee.
- The employee cannot browse HR Admin, Tenant Admin, Platform Admin, or Finance Manager workspaces.

Stage data convention:

- Employee code starts with `PW_EMP_STAGE_`.
- Bank name starts with `Stage Certification Bank`.
- Username starts with `pw.aadish.stage`.
- Use a disposable email via `PLAYWRIGHT_PHASE3_EMPLOYEE_EMAIL`.

## Next Automation Phases

Phase 4: Payroll close workflow

- Setup readiness.
- Lock payroll inputs.
- Calculate draft.
- Review exceptions.
- Approve and lock review.
- Generate outputs.
- Publish payslips.
- Generate finance handoff.

Phase 5: ESS and MSS practical workflow

- Employee submits leave.
- Manager approves/rejects leave.
- Employee submits attendance regularization.
- Manager approves/rejects attendance.
- Employee views payslip and document center.

Phase 6: Email and notification verification

- Invite.
- Password reset.
- Template test send.
- Event test send.
- Document reminder.
- Payslip/notification delivery.

Mutation phases should use disposable records with a clear test prefix and cleanup rules.

## Full Certification Including Mutations

Run this only when the stage tenant is ready for disposable test records:

```bash
pnpm --dir web certify:users
```
