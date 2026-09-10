# Phase 4D Edge, Audit, And Notification Certification

Date: 2026-09-09

Environment:

- Frontend: `http://127.0.0.1:3217`
- Backend: `http://127.0.0.1:8011/api/v1`
- HR admin persona: `nisha.rao`
- Employee persona: `riya.sharma`
- Test data: disposable `PW_` attendance regularization reasons and leave balance rejection reasons.

## Scope

Phase 4D closes the main Phase 4 edge and evidence gaps left after HR-admin operations certification.

Touched and certified pages:

- `/hr-admin/attendance-records?page_size=10`
- `/ess`
- `/hr-admin/leave-balances`
- `/hr-admin/attendance-regularizations/[regularizationId]/review`
- `/hr-admin/audit?source=attendance_approval&q=[reason]`
- `/hr-admin/notifications?subject_type=attendance_regularization&q=[regularizationId]`
- `/ess/notifications?subject_type=attendance_regularization&q=[regularizationId]`

## Product Fix

Playwright exposed a backend validation issue:

- HR-admin leave balance over-debit raised a Django validation error from the service layer.
- The API endpoint did not convert that exception to a DRF validation response.
- Result: browser saw `500` instead of a user-correctable validation error.

Fix applied:

- `HrAdminLeaveBalanceActionView` now converts `DjangoValidationError` to `400`.
- `HrAdminLeaveBalanceTransactionReviewView` now does the same for transaction review errors.

File:

- `backend/apps/common/api_views.py`

## Browser Evidence

Suite:

- `web/tests/e2e/phase4d-edge-audit-notification-flows.spec.ts`

Command:

```bash
PLAYWRIGHT_PORT=3217 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3217 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test web/tests/e2e/phase4d-edge-audit-notification-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result:

- `3 passed`

Validation:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.
- `python backend/manage.py check` passed after installing the already-declared `cryptography>=43,<44` dependency into the local backend venv.

## Certified Behaviors

Locked attendance behavior:

- HR admin opens attendance record operations through the browser.
- HR admin selects a row and locks it via bulk action.
- Browser payload sends `action: lock`.
- ESS reloads and confirms the locked attendance record is disabled if it belongs to the employee.
- If the selected HR row belongs to a different employee, ESS correctly does not expose that row.
- HR admin unlocks the row via browser bulk action.
- Browser payload sends `action: unlock`.
- ESS confirms the employee-owned row is enabled again.

Leave balance over-debit:

- HR admin selects employee, leave policy, debit adjustment action, large units, effective date, and reason.
- Browser receives `400`.
- UI shows `Action failed.`
- UI shows `Cannot debit ... units when only ... are available.`
- No transaction card appears for the rejected reason.

Audit and notification evidence:

- Employee submits attendance regularization through ESS.
- HR admin approves through full review.
- HR audit center filters by `attendance_approval` and exact reason.
- Audit event shows the regularization source and deep link back to the HR review page.
- HR notification queue filters by `attendance_regularization` and exact regularization ID.
- HR notification row shows subject type and review link.
- ESS notification inbox filters by `attendance_regularization` and exact regularization ID.
- Employee notification detail shows title, subject type, and `Open source` link back to the ESS regularization context.

## Residual Gaps

- Attendance bulk action audit is not separately source-visible in the current audit center, which derives attendance audit from regularization decisions.
- Leave balance transaction audit is visible on the leave balance transaction ledger, but not yet integrated into the cross-module audit center.
- Phase 8 should add responsive visual screenshots for `/hr-admin/attendance-records`, `/hr-admin/attendance-regularizations`, `/hr-admin/leave-balances`, `/hr-admin/audit`, `/hr-admin/notifications`, and `/ess/notifications`.

## Confidence Update

- Locked attendance behavior confidence: `88%`
- Leave balance validation confidence: `90%`
- Attendance audit evidence confidence: `88%`
- Attendance notification evidence confidence: `87%`
- Phase 4 confidence after Phase 4D: `89%`
