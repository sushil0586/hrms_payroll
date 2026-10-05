# HR Admin Leave and Attendance Stage Certificate

Generated: 2026-10-05

Environment: `https://hrms.accerio.in`

Scope: HR Admin leave/attendance configuration, ESS leave balance visibility, ESS attendance record availability, optional global leave template readiness, and browser certification evidence.

Payroll impact is out of scope for this certificate.

## Certificate Result

Status: PASS WITH CONTROLLED PENDING ITEMS

The HR Admin leave and attendance baseline is certified for the assigned employee flow on stage. Optional/global leave templates are configured and extendable, but not certified as assigned employee flows until intentionally enabled by a tenant blueprint or employee/organization assignment.

## Passed Evidence

### Browser Gate

Command:

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME='sushil@accerio.in' \
PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME='sushilbansal86@gmail.com' \
PLAYWRIGHT_LIVE_MANAGER_USERNAME='sushil@accerio.in' \
pnpm qa:hr-admin-browser
```

Result: `4 passed`

Covered:

- HR Admin section route sweep.
- Leave and attendance setup workspaces.
- ESS leave balances are mapped.
- ESS attendance records are available for regularization.
- MSS approval workspace loads.

### Sushil Employee Assignment

Employee: `sushilbansal86@gmail.com`

Leave assignments created:

- `Stage certification Earned Leave`, priority `900`, active.
- `Stage certification casual leave`, priority `900`, active.
- `Stage certification sick leave`, priority `900`, active.

Attendance assignment created:

- `AT-001`, priority `900`, active.

### ESS Balances

Verified for `sushilbansal86@gmail.com`:

- Earned Leave: closing balance `12.00`.
- Casual Leave: closing balance `12.00`.
- Sick Leave: closing balance `12.00`.

### ESS Attendance

Verified for `sushilbansal86@gmail.com`:

- Attendance records available: `5`.
- Regularization modal no longer shows the empty attendance-record blocker.

### Browser Leave Request

Submitted through ESS browser:

- Leave type: `casual leave`.
- Policy: `Stage certification casual leave`.
- Date: `2026-12-01`.
- Requested units: `1.00`.
- Status: `pending`.
- Workflow reference created: `b8c1e706-9a6c-4398-9229-65f437281a4d`.
- Request ID: `548d6712-bc24-44d7-b177-27016cc11020`.

### Optional Leave Templates

Created as configurable, extendable templates:

- Maternity Leave: active policy, `182.00` entitlement, evidence required.
- Paternity Leave: active policy, `15.00` entitlement, evidence required.
- Bereavement Leave: active policy, `5.00` entitlement.
- Marriage Leave: active policy, `5.00` entitlement, evidence required.
- Comp Off Leave: active policy, `0.00` entitlement.
- Loss of Pay Leave: active policy, `0.00` entitlement.
- Jury Duty Leave: active policy, `10.00` entitlement, evidence required.

Jury Duty is certified as configuration-ready and optional. It is not a mandatory India default and should only affect a tenant/employee when assigned by blueprint or HR Admin.

## Local Code Fix

Fixed locally:

- ESS leave type options now derive from employee-resolved leave balances/assignments instead of all active tenant leave types.
- This prevents optional templates such as Jury Duty or Maternity Leave from appearing in ESS unless assigned.

Regression test:

```bash
.venv/bin/python backend/manage.py test apps.leave_management.tests
```

Result: `7 tests OK`

Additional checks:

```bash
pnpm --dir web typecheck
pnpm --dir web lint
git diff --check
```

Result: all passed.

Deployment note: this ESS leave-type visibility fix must be deployed before stage reflects the new gating behavior.

## Controlled Pending Items

### P1: Deploy ESS Leave-Type Visibility Fix

Current stage is configured correctly, but optional leave types can still appear in ESS until the local API fix is deployed.

Acceptance:

- `/me/leave-types/` returns only employee-assigned/resolved leave types.
- Optional templates remain available in HR Admin.
- Optional templates do not appear in ESS until assigned.

### P1: Manager Approval Certification

Sushil currently has no reporting manager, so the submitted casual leave request is pending but not fully certified through manager approval.

Acceptance:

- Assign reporting manager or use a managed employee.
- Submit leave request from ESS.
- Approve/reject from MSS browser.
- Verify ESS status update.

### P1: Maternity Scenario With Eligible Employee

Maternity policy is configured, but needs an eligible employee/persona for a true E2E test.

Acceptance:

- Assign Maternity policy to a female employee meeting eligibility.
- Submit request with evidence.
- Verify balance/reservation and approval routing.

### P1: Jury Duty Optional Flow

Jury Duty is configuration-ready but intentionally unassigned by default.

Acceptance:

- Enable Jury Duty through assignment or blueprint add-on.
- Verify ESS visibility only after assignment.
- Submit request with evidence reference or file.
- Verify approval routing.

### P2: Comp-Off Earn/Consume Workflow

Comp Off policy is configured, but comp-off credit earning is not certified.

Acceptance:

- Credit comp-off entitlement through HR Admin or attendance workflow.
- Verify ESS availability.
- Submit comp-off leave request.

### P2: LOP Payroll Impact

LOP leave is configured but payroll impact is out of current scope.

Acceptance:

- Submit LOP request.
- Verify payroll input/pay-days impact after payroll scope resumes.

### P2: Platform Admin Blueprint Toggles

Optional leave templates are currently stage-configured manually.

Acceptance:

- Platform Admin can choose India default vs optional global add-ons.
- Blueprint apply creates only selected templates and assignments.
- Post-onboarding changes remain role-governed.
