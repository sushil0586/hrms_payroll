# HR Admin Browser Workflow Certification Plan

Generated: 2026-10-05

## Purpose

This plan defines browser-only certification for HR Admin functionality. The goal is to stop relying on manual page-by-page checks and prove HR Admin workflows through Playwright as real users: HR Admin, Employee, and Manager.

Payroll is intentionally out of scope for this plan.

## Browser-Only Rule

Certification proof must happen through the UI:

- Open the real route in a browser.
- Fill visible fields.
- Select visible dropdown options.
- Save through visible buttons.
- Reopen or refresh the page.
- Verify visible downstream state.
- Switch personas through browser login where workflow requires ESS or MSS proof.

Backend/API calls may be used only for environment setup, cleanup, or non-functional evidence. They are not accepted as the primary proof of feature correctness.

## Personas

The suite uses environment-driven users:

- HR Admin: `PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME`, `PLAYWRIGHT_LIVE_HR_ADMIN_PASSWORD`
- Employee: `PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME`, `PLAYWRIGHT_LIVE_EMPLOYEE_PASSWORD`
- Manager: `PLAYWRIGHT_LIVE_MANAGER_USERNAME`, `PLAYWRIGHT_LIVE_MANAGER_PASSWORD`

For the Reliance stage tenant, point the employee persona to the employee being certified, for example Aditi, when validating the latest onboarding fixes.

## Run Command

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 \
PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME='<hr-admin-user>' \
PLAYWRIGHT_LIVE_HR_ADMIN_PASSWORD='<password>' \
PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME='<employee-user>' \
PLAYWRIGHT_LIVE_EMPLOYEE_PASSWORD='<password>' \
PLAYWRIGHT_LIVE_MANAGER_USERNAME='<manager-user>' \
PLAYWRIGHT_LIVE_MANAGER_PASSWORD='<password>' \
pnpm --dir web certify:hr-admin:browser
```

The browser proof runs against the web application using live backend data and must not pass via demo fallback.

## Section Plan

### 1. HR Admin Workspace Health

Routes:

- `/hr-admin`
- `/hr-admin/organization`
- `/hr-admin/employees`
- `/hr-admin/policies`
- `/hr-admin/attendance-operations`
- `/hr-admin/documents`
- `/hr-admin/workflows`
- `/hr-admin/lifecycle`
- `/hr-admin/notifications`
- `/hr-admin/reports`

Browser proof:

- Route loads after UI login.
- Expected heading is visible.
- No workspace load error is visible.
- No demo mode/fallback text is visible.
- No horizontal overflow is present.

### 2. Organization Masters Workflow

Browser proof:

- Open Organization masters.
- Create/edit legal entity, location, branch, business unit, department, cost center, grade, designation, and employment type using visible forms.
- Verify dependent dropdowns:
  - Legal entity narrows branch.
  - Branch aligns location.
  - Business unit narrows department.
  - Designation aligns grade.
- Reopen saved records and verify persisted values.

### 3. Employee Master Workflow

Browser proof:

- Create an employee through `/hr-admin/employees/new`.
- Map legal entity, branch, location, department, grade, and employment type.
- Save and reopen employee detail/edit page.
- Verify structure values are visible.
- Verify ESS profile no longer shows missing org mapping.
- Verify mapped employee has leave balances and attendance placeholders downstream.

### 4. Employee Access Workflow

Browser proof:

- Open employee access page.
- Create user access for Employee role.
- Create/assign Manager role for a reporting manager.
- Login through browser as each user.
- Verify allowed workspaces open and unauthorized actions are hidden/blocked.

### 5. Leave Setup Workflow

Browser proof:

- Create leave type.
- Create leave policy.
- Create broad assignment.
- Create employee-specific assignment.
- Verify assignment governance panel shows expected scope.
- Verify employee override wins over mismatched grade/department.
- Verify leave balances page shows mapped employee row.
- Login as employee and verify ESS leave balance appears.
- Change entitlement through UI and verify visible balance refresh.

### 6. Attendance Setup Workflow

Browser proof:

- Create shift.
- Create holiday calendar.
- Create attendance policy.
- Create broad assignment.
- Create employee-specific assignment.
- Verify assignment governance panel shows expected scope.
- Login as employee.
- Open ESS Attendance.
- Open Regularize Attendance modal.
- Verify attendance record dropdown is populated.
- Submit regularization through browser.
- Login as manager and approve/reject through MSS.
- Verify employee sees updated status.

Required regression:

- A mapped active employee must not see `No attendance records available` in the ESS regularization modal.

### 7. Documents Workflow

Browser proof:

- Create document category.
- Create scoped document requirement.
- Login as employee and upload required document.
- Login as HR Admin and verify/reject document.
- Verify employee sees the updated status.

### 8. Workflow/Approval Workflow

Browser proof:

- Create/edit workflow template.
- Create workflow assignment.
- Submit leave request or attendance regularization.
- Verify correct manager/HR approver sees pending item.
- Approve/reject in browser.
- Verify employee-facing status changes.

### 9. Notifications Workflow

Browser proof:

- Trigger leave submission, attendance regularization, and document upload.
- Verify correct in-app notification recipient.
- Verify read/unread behavior.
- Verify unrelated user does not see another employee notification.

### 10. Reports/Evidence Workflow

Browser proof:

- Open HR reports with live data.
- Verify recently created test employee/workflow data appears where expected.
- Verify no report shows demo fallback.
- Verify export actions work where available.

## First Runnable Gate

The initial runnable gate is:

```text
web/tests/e2e/hr-admin-browser-workflow-gate.spec.ts
```

It covers:

- HR Admin section health.
- Time/leave/attendance configuration route health.
- ESS leave balance is mapped.
- ESS attendance regularization has records available.
- MSS approvals route health.

The deeper mutation suites should be added section by section using `QA-HR-<timestamp>` records.

## Done Criteria

HR Admin browser certification is complete only when:

- All HR Admin sections pass route health.
- Organization master create/edit/reopen flows pass.
- Employee create/access flows pass.
- Leave setup affects ESS balances without manual repair.
- Attendance setup affects ESS attendance records without manual repair.
- Documents upload/review flow passes.
- Workflow assignment routes approvals correctly.
- Notifications are delivered to the correct user.
- Reports load live evidence.
- No demo fallback, workspace load issue, or empty seeded-state regression is visible.
