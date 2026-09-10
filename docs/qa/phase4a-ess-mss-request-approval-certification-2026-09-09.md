# Phase 4A ESS/MSS Request Approval Certification

Date: 2026-09-09

Environment:

- Frontend: `http://127.0.0.1:3214`
- Backend: `http://127.0.0.1:8011/api/v1`
- Employee persona: `riya.sharma`
- Manager persona: `karan.mehta`
- Test data: disposable `PW_` leave reasons, attendance regularization reasons, and manager decision notes.

## Scope

Phase 4A certifies the first complete leave and attendance operations loop through the browser.

Touched and certified pages:

- `/ess`
- `/ess?leaveStatus=pending&leaveId=[requestId]`
- `/ess?leaveStatus=approved&leaveId=[requestId]`
- `/ess?regStatus=pending&regId=[regularizationId]`
- `/ess?regStatus=approved&regId=[regularizationId]`
- `/mss/approvals?queue=leave&leaveId=[requestId]`
- `/mss/approvals?queue=attendance&regId=[regularizationId]`

## Product Work

Added employee self-service submit capability:

- Leave request form on ESS.
- Attendance regularization form on ESS.
- Employee-scoped leave type dropdown from `/me/leave-types/`.
- Employee-scoped attendance record dropdown from `/me/attendance-records/`.
- Next API proxy routes for leave type options, attendance record options, leave request create, and attendance regularization create.

Files:

- `web/src/app/ess/ess-request-submission-panel.tsx`
- `web/src/app/ess/page.tsx`
- `web/src/app/api/me/leave-types/route.ts`
- `web/src/app/api/me/attendance-records/route.ts`
- `web/src/app/api/me/leave-requests/route.ts`
- `web/src/app/api/me/attendance-regularizations/route.ts`
- `web/src/lib/api.ts`
- `web/src/lib/types.ts`
- `web/src/app/globals.css`

## Browser Evidence

Suite:

- `web/tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts`

Command:

```bash
PLAYWRIGHT_PORT=3214 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3214 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result:

- `2 passed`

Validation:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.

## Certified Behaviors

Leave request:

- Employee opens ESS in live mode.
- Leave submit panel renders with leave type, start date, end date, day portions, attachment reference, reason, and submit button.
- Employee submits a uniquely identified leave request through the browser.
- Browser payload includes the selected dates and reason.
- API returns `201` and `pending`.
- ESS pending view shows the exact new request.
- Manager opens MSS leave queue directly to the new request.
- MSS shows the exact employee request, pending status, request detail, decision note, and approve/reject actions.
- Manager approves with a unique note through the browser.
- API returns approved status.
- Employee approved view shows the exact request and manager decision note.

Attendance regularization:

- Employee opens ESS in live mode.
- Regularization panel renders with attendance record dropdown, requested status, requested check-in, requested check-out, reason, and submit button.
- Attendance record dropdown uses employee-owned records.
- Employee submits a uniquely identified regularization request through the browser.
- Browser payload includes requested status `remote` and the unique reason.
- API returns `201` and `pending`.
- ESS pending regularization view shows the exact new request.
- Manager opens MSS attendance queue directly to the new request.
- MSS shows the exact request, detail panel, decision note, and approve/reject actions.
- Manager approves with a unique note through the browser.
- API returns approved status.
- Employee approved regularization view shows the exact request and manager decision note.

## Residual Gaps

- Phase 4B should add rejection paths, invalid-date validation, insufficient balance behavior, missing reason behavior, locked attendance record behavior, and duplicate pending regularization behavior through browser-visible feedback.
- Phase 4C should certify HR-admin oversight queues, overrides, bulk attendance actions, leave balance adjustments, and audit/notification evidence after decisions.

## Confidence Update

- ESS leave submit confidence: `86%`
- MSS leave approval confidence: `88%`
- ESS attendance regularization submit confidence: `84%`
- MSS attendance approval confidence: `86%`
- Phase 4 confidence after Phase 4A: `82%`
