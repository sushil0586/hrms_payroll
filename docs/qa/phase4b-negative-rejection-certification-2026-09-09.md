# Phase 4B Negative And Rejection Certification

Date: 2026-09-09

Environment:

- Frontend: `http://127.0.0.1:3215`
- Backend: `http://127.0.0.1:8011/api/v1`
- Employee persona: `riya.sharma`
- Manager persona: `karan.mehta`
- Test data: disposable `PW_` leave and attendance request reasons.

## Scope

Phase 4B expands the Phase 4A ESS/MSS workflow certification to negative inputs, rejection outcomes, and duplicate guards.

Touched and certified pages:

- `/ess`
- `/ess?leaveStatus=rejected&leaveId=[requestId]`
- `/ess?regStatus=rejected&regId=[regularizationId]`
- `/mss/approvals?queue=leave&leaveId=[requestId]`
- `/mss/approvals?queue=attendance&regId=[regularizationId]`

## Product Fix

Playwright exposed an employee-facing transparency gap:

- Attendance regularization rejection notes were stored as `rejection_reason`, but ESS only displayed `Manager Comment`.

Fix applied:

- ESS regularization detail now displays `Rejection Reason` separately from manager approval comments.

File:

- `web/src/app/ess/page.tsx`

## Browser Evidence

Suite:

- `web/tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts`

Command:

```bash
PLAYWRIGHT_PORT=3215 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3215 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result:

- `4 passed`

Validation:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.

## Certified Behaviors

Leave negative and rejection coverage:

- Employee submits a leave request with end date before start date.
- Browser receives `400` response.
- ESS displays `Submission failed.`
- ESS displays `End date must be on or after start date.`
- Employee submits a valid leave request.
- Manager opens exact MSS leave request by URL-driven selected ID.
- Manager rejects with a unique decision note.
- Browser payload contains the manager note.
- API returns rejected status.
- ESS rejected leave view shows the exact request and decision note.

Attendance negative and rejection coverage:

- Employee submits attendance regularization with requested checkout earlier than requested check-in.
- Browser receives `400` response.
- ESS displays `Submission failed.`
- ESS displays `Requested check-out cannot be earlier than requested check-in.`
- Employee submits a valid pending regularization for an employee-owned attendance record.
- Employee attempts a second pending regularization against the same attendance record.
- Browser receives `400` response.
- ESS displays `A pending attendance regularization already exists for this attendance record.`
- Manager opens exact MSS attendance request by URL-driven selected ID.
- Manager rejects with a unique decision note.
- Browser payload contains the manager note.
- API returns rejected status.
- ESS rejected regularization view shows the exact request and rejection note.

## Residual Gaps

- Insufficient balance needs a browser setup path or isolated disposable leave policy/balance fixture before it can be certified without mutating seeded employee balances.
- Locked attendance record behavior needs an HR-admin browser setup path to lock a disposable/selected attendance row before employee submission.
- Phase 4C should certify HR-admin oversight queues, HR approve/reject paths, bulk attendance lock/unlock/status actions, leave balance adjustment/review, audit, and notifications.

## Confidence Update

- Leave validation confidence: `88%`
- Leave rejection confidence: `88%`
- Attendance validation confidence: `86%`
- Attendance duplicate guard confidence: `86%`
- Attendance rejection visibility confidence: `88%`
- Current Phase 4 confidence after Phase 4B: `85%`
