# HR Admin Mutation QA Matrix

Date: 2026-10-09  
Purpose: browser-based mutation evidence after the unified HR Admin UI/UX render certification.

## Pass Model

A mutation flow is marked `Pass` only when browser automation proves the user can reach the screen, interact with compact professional controls, submit the action, receive clear success/error feedback, and verify persisted state through the UI or an API-backed browser response.

## Executed Evidence

| Area | Spec | Scope | Result |
| --- | --- | --- | --- |
| Policy/setup validation | `web/tests/e2e/hr-admin-setup-policy-frontend-validation.spec.ts` | Attendance policy, leave type, leave policy, leave assignment, document category, workflow template validation; save failure/success feedback; dialogs; filters; no overflow | Pass, 9/9 |
| Employee bank accounts | `web/tests/e2e/employee-bank-accounts-certification.spec.ts` | Browser create employee, open dynamic bank-account child page, validate form, create secondary account, create primary account, update account, switch primary, verify persisted account list | Pass, 1/1 |
| Notification setup CRUD | `web/tests/e2e/notification-setup-crud-flows.spec.ts` | Notification template create/preview/test-send/update/archive/duplicate rejection; notification event create/preview/test-send/update/duplicate rejection; delivery channel JSON validation and save | Pass, 3/3 |

## Coverage Status

| Module family | Current mutation confidence | Evidence | Remaining work |
| --- | --- | --- | --- |
| Policies and setup | High for validation and save feedback, medium for every edit variant | Policy/setup validation spec | Add destructive remove/deactivate state-transition coverage where allowed by governance. |
| Employee master/access | Medium-high | Existing employee production certification plus bank-account certification | Run full employee production certification in the next long pass to revalidate access/offboarding state transitions end to end. |
| Employee bank accounts | High | Bank-account certification | Add negative duplicate/account-format checks if product requires stricter banking validation. |
| Notifications | High | Notification setup CRUD spec | Add queue retry/bulk retry destructive mutation pass separately. |
| Documents | Medium | Document category validation and existing document/onboarding specs | Add employee document review submit mutation as a focused browser certification. |
| Lifecycle | Medium | Existing onboarding/probation/movement/exit specs in suite | Run lifecycle mutation suite in the next long pass and record per workflow. |
| Roster/shift/attendance | Medium | Existing time/leave/policy and attendance specs in suite | Add representative edit-save mutation for shift, roster template, attendance record, and regularization review. |
| Payroll | Medium | Existing payroll setup/salary/statutory/provider specs in suite | Run payroll mutation bundle phase-wise because those flows are heavier and data-sensitive. |
| Organization | Medium | Existing organization production certification in suite | Run organization mutation certification after policy/setup cleanup. |

## Fixes Made During This Pass

- Tightened `notification-setup-crud-flows.spec.ts` to assert current validation copy and invalid field state instead of brittle focus behavior.
- Made notification mutation persistence checks use durable edit-page verification and defensive payload ID extraction, avoiding list-position assumptions.

## Next Mutation Phase

Run a focused `E90-9 Mutation QA` sequence:

1. Documents: employee document review submit, re-upload requested, verified/rejected states.
2. Lifecycle: onboarding, probation review, movement, exit edit-save and queue return.
3. Time/Roster: shift, roster template, shift assignment, attendance record, regularization review.
4. Payroll: setup, salary, statutory, provider, inputs/review/outputs/handoff mutation bundles.
5. Organization: section create/edit and guided setup save.
