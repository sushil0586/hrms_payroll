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

## Phase 4: Manager Self-Service Workflow

Purpose: verify a manager can operate MSS from the browser without HR Admin escalation, while keeping stage data read-only.

Run:

```bash
pnpm --dir web certify:users:phase4
```

Checks:

- Manager opens `/mss` and sees the control center with team priorities, pending decisions, and work queue shortcuts.
- Control center links route to approvals, notifications, and ESS.
- Manager opens `/mss/approvals` and can switch between Leave and Attendance queues.
- Leave and Attendance queue detail panels render a selected item or a clear empty state.
- Manager opens `/mss/notifications`, applies inbox filters, and can return to approvals.
- Visible buttons, tabs, and links do not clip text or create horizontal overflow.
- Manager cannot browse Platform Admin, Tenant Admin, or Finance Manager workspaces.

Stage notes:

- This phase is read-only and does not approve or reject live leave or attendance items.
- Set `PLAYWRIGHT_LIVE_MANAGER_USERNAME` and `PLAYWRIGHT_LIVE_MANAGER_PASSWORD` when the default seeded manager is not present on stage.

## Phase 5: Payroll Close Workflow

Purpose: verify an HR/finance user can understand and follow payroll close from source readiness through finance handoff without UI confusion.

Run:

```bash
pnpm --dir web certify:users:phase5
```

Checks:

- Payroll Readiness answers whether payroll inputs can be opened safely.
- Payroll Inputs shows run selection, locked-input context, employee snapshots, guardrails, and snapshot trace.
- Payroll Calculations shows calculation queue, attempts, validation, line trace, and latest net pay context.
- Payroll Review shows review queue, exception register, approval trail, final lock, and trace links.
- Payroll Outputs shows output batches, artifact register, publish state, and handoff readiness.
- Payroll Handoff shows finance artifacts, delivery acknowledgements, provider jobs, and audit evidence.
- The payroll cycle journey links all six close phases and marks the current step.
- Drilldowns preserve context for readiness filters, calculation lines, review exceptions, and output artifacts.
- Visible links are real routes, not placeholder, `undefined`, `null`, or template URLs.
- Headings, chips, table cells, and action buttons do not clip text or create horizontal overflow.

Stage notes:

- This phase is read-only by default and does not approve, publish, transmit, or otherwise mutate stage payroll records.
- Set `PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME` and `PLAYWRIGHT_LIVE_HR_ADMIN_PASSWORD` for the stage HR Admin account.
- Mutation close tests remain in the dedicated payroll suites and should only be run with disposable records.

## Phase 6: ESS and MSS Practical Workflow

Purpose: verify employees and managers can complete daily self-service work without UI confusion, and optionally run live disposable approval mutations.

Run the safe certification:

```bash
pnpm --dir web certify:users:phase6
```

Safe checks:

- Employee opens ESS and understands the action queue, profile, attendance, leave balances, request forms, and history/detail split views.
- Employee can open Payslips, Documents, Statutory Declarations, and Notifications from the ESS workspace.
- Manager opens MSS, follows control-center shortcuts, switches Leave and Attendance queues, and opens Notifications.
- ESS and MSS child pages show meaningful headings, stable controls, real links, and no horizontal overflow.
- Mobile ESS keeps the request panels and history sections usable.

Run the live disposable mutation path only when stage is ready for test records:

```bash
PLAYWRIGHT_PHASE6_MUTATE=true pnpm --dir web certify:users:phase6
```

If the stage employee exists but does not yet have a leave-policy assignment, allow the test to prepare that HR Admin setup first:

```bash
PLAYWRIGHT_PHASE6_MUTATE=true PLAYWRIGHT_PHASE6_PREPARE=true pnpm --dir web certify:users:phase6
```

Mutation checks:

- Employee sees leave date validation for an invalid range.
- Employee submits a disposable leave request with a `PW_PHASE6_` reason.
- Manager opens the specific leave request from MSS and approves it.
- Employee sees the approved leave and manager note in ESS.
- Employee sees attendance regularization validation for invalid check-in/check-out order.
- Employee submits a disposable attendance regularization.
- Manager opens the specific regularization from MSS and rejects it.
- Employee sees the rejected regularization and manager note in ESS.

Stage notes:

- Set `PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME`, `PLAYWRIGHT_LIVE_EMPLOYEE_PASSWORD`, `PLAYWRIGHT_LIVE_MANAGER_USERNAME`, and `PLAYWRIGHT_LIVE_MANAGER_PASSWORD`.
- Set `PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME` and `PLAYWRIGHT_LIVE_HR_ADMIN_PASSWORD` when using `PLAYWRIGHT_PHASE6_PREPARE=true`.
- The mutation path expects the employee to have at least one leave type, at least one attendance record, and a reporting manager who can decide the request.
- `PLAYWRIGHT_PHASE6_PREPARE=true` creates only an active employee-scoped leave-policy assignment for the configured employee when one is missing.
- If the stage employee has no active leave policy assignment, the leave mutation is skipped with an explicit prerequisite message instead of being reported as a product failure.
- If the stage employee has no attendance record options, the attendance mutation is skipped with an explicit prerequisite message.
- Test-created leave and attendance reasons start with `PW_PHASE6_` for audit and cleanup.

## Next Automation Phases

Phase 7: Email and notification verification

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
