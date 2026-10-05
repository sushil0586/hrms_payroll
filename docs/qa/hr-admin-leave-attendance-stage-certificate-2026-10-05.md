# HR Admin Leave and Attendance Stage Certificate

Generated: 2026-10-05

Environment: `https://hrms.accerio.in`

Scope: HR Admin leave/attendance configuration, ESS leave balance visibility, ESS attendance record availability, optional global leave template readiness, and browser certification evidence.

Payroll impact is out of scope for this certificate.

## Certificate Result

Status: PASS WITH CONTROLLED PENDING ITEMS

The HR Admin leave and attendance baseline is certified for the assigned employee flow on stage. Optional/global leave templates are configured and extendable, and they are gated from ESS until intentionally enabled by a tenant blueprint or employee/organization assignment.

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
- Casual Leave: closing balance `11.00`, reserved `1.00`.
- Sick Leave: closing balance `11.00`, consumed `1.00`, reserved `0.00`.

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

### Browser Manager Approval

Certified through ESS and MSS browser on stage:

- Employee: `sushilbansal86@gmail.com`.
- Reporting manager: `sushil@accerio.in`.
- Leave type: `sick leave`.
- Policy: `Stage certification sick leave`.
- Date: `2026-12-04`.
- Requested units: `1.00`.
- Request ID: `cd7405fa-ab04-4b17-a1a5-a6d50acfda27`.
- Workflow reference: `44132782-c315-434d-b027-2b740007852f`.
- Final status: `approved`.
- MSS pending queue for this request after approval: `0`.
- Sick Leave balance after approval: closing `11.00`, consumed `1.00`, reserved `0.00`.

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

## Deployed Code Fix

Fixed and verified on stage:

- ESS leave type options now derive from employee-resolved leave balances/assignments instead of all active tenant leave types.
- This prevents optional templates such as Jury Duty or Maternity Leave from appearing in ESS unless assigned.

Stage verification for `sushilbansal86@gmail.com`:

- Before optional certification assignment, ESS leave types returned only Earned Leave, Casual Leave, and Sick Leave.
- Optional leak detected before assignment: `false`.
- After optional certification assignment, ESS intentionally returns Comp Off, Jury Duty, Loss of Pay, and Maternity for Sushil.

### Optional Flow Browser Certification

Certified through ESS browser submission and MSS browser manager approval:

- Maternity Leave: request `8fe1c0fb-0216-48f0-97ad-f0906d170187`, workflow `a714e78f-d24f-443a-91a9-86053ea09590`, date `2027-01-05`, status `approved`, approved units `1.00`.
- Jury Duty Leave: request `5c600784-49dc-44da-a541-e8613dd78ef9`, workflow `c1b82d30-4a30-4258-bf25-0b26bec11af6`, date `2026-12-07`, status `approved`, approved units `1.00`.
- Comp Off Leave: request `b71bb7f0-5930-4abb-8efc-94307df564c1`, workflow `8b7d5768-7bb9-4634-a2e4-9326d804b27d`, date `2026-12-10`, status `approved`, approved units `1.00`.
- Loss of Pay Leave: request `4352733a-821f-45d8-986c-7c1d3955dd5d`, workflow `e9cc5742-7e9b-4543-a7d7-9b9a450c17d2`, date `2026-12-11`, status `approved`, approved units `1.00`.
- MSS pending queue for all four certified optional requests after approval: `0`.

Post-approval balance evidence for `sushilbansal86@gmail.com`:

- Maternity Leave, year `2027`: closing `181.00`, consumed `1.00`, reserved `0.00`.
- Jury Duty Leave, year `2026`: closing `9.00`, consumed `1.00`, reserved `0.00`.
- Comp Off Leave, year `2026`: adjustment `1.00`, consumed `1.00`, closing `0.00`.
- Loss of Pay Leave, year `2026`: closing `-1.00`, consumed `1.00`, reserved `0.00`.

Stage configuration corrected during certification:

- Loss of Pay Leave now allows negative balance so unpaid leave can be requested without paid entitlement.

## Local Code Fixes Pending Deploy

Prepared locally:

- India launch seed defaults now create Loss of Pay as an unpaid leave type that allows negative balance.
- Platform Admin launch blueprints now expose optional leave add-ons as checkbox toggles.
- Blueprint apply now creates only selected optional leave templates, policies, assignments, and current employee balances.
- ESS leave request copy was simplified around evidence, balance warnings, and approval routing.
- ESS attendance correction copy was simplified around record selection, manager approval, and submit actions.

Regression test:

```bash
.venv/bin/python backend/manage.py test apps.leave_management.tests apps.tenant_onboarding.tests
```

Result: `39 tests OK`

Additional checks:

```bash
pnpm --dir web typecheck
pnpm --dir web lint
git diff --check
```

Result: all passed.

## Controlled Pending Items

### P2: LOP Payroll Impact Handoff

LOP leave request and approval are certified. Payroll impact is still out of current scope.

Acceptance:

- Verify payroll input/pay-days impact after payroll scope resumes.

### P2: Platform Admin Blueprint Toggles

Implemented locally and pending deployment/stage verification.

Acceptance:

- Platform Admin can choose India default vs optional global add-ons.
- Blueprint apply creates only selected templates and assignments.
- Optional add-ons initialize mapped current employee balances only when selected.
- Post-onboarding changes remain role-governed.
