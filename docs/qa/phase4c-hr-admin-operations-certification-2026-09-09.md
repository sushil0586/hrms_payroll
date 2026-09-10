# Phase 4C HR Admin Operations Certification

Date: 2026-09-09

Environment:

- Frontend: `http://127.0.0.1:3216`
- Backend: `http://127.0.0.1:8011/api/v1`
- HR admin persona: `nisha.rao`
- Employee persona: `riya.sharma`
- Test data: disposable `PW_` leave balance reasons and attendance regularization reasons.

## Scope

Phase 4C certifies HR-admin leave and attendance operations through the browser.

Touched and certified pages:

- `/hr-admin/attendance-regularizations`
- `/hr-admin/attendance-regularizations?status=pending&q=[reason]`
- `/hr-admin/attendance-regularizations?status=approved&q=[reason]`
- `/hr-admin/attendance-regularizations/[regularizationId]/review`
- `/hr-admin/attendance-records?page_size=10`
- `/hr-admin/leave-balances`

## Product Fix

Playwright exposed a real HR-admin action-state bug:

- After a successful attendance bulk action, `isSubmitting` was not reset.
- Result: the toolbar stayed disabled and follow-up bulk actions could not be completed without a full page reload.

Fix applied:

- Reset `isSubmitting` after successful bulk attendance actions before refreshing the route.

File:

- `web/src/app/hr-admin/attendance-records/attendance-record-bulk-manager.tsx`

## Browser Evidence

Suite:

- `web/tests/e2e/phase4c-hr-admin-operations-flows.spec.ts`

Command:

```bash
PLAYWRIGHT_PORT=3216 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3216 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test web/tests/e2e/phase4c-hr-admin-operations-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result:

- `3 passed`

Validation:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.

## Certified Behaviors

Attendance regularization HR oversight:

- Employee creates pending attendance regularizations through ESS.
- HR-admin pending queue loads exact request via status and search filters.
- Queue metrics, search, request status, requested attendance status, current attendance status, rows per page, apply, clear, quick review, and full review links are visible and functional.
- HR admin rejects through inline quick review with a decision note.
- Browser payload contains the decision note.
- API returns rejected status.
- HR admin approves a separate request through the full review page.
- Full review page shows request context, employee reason, HR decision note, approve, reject, and back controls.
- Approved terminal state disables queue approve/reject controls.
- Rows-per-page and clear filters update the URL and page state.

Attendance record bulk operations:

- HR-admin attendance records page loads live metrics and all operation controls.
- Search, status, source, lock state, regularization state, rows per page, late-only focus, bulk attendance status, apply, clear, select, lock, unlock, set status, mark regularized, clear regularized, and edit link controls are visible.
- Empty-selection bulk buttons are disabled.
- Selecting a row enables action buttons and updates selected count.
- Lock action sends the correct browser payload.
- Unlock action sends the correct browser payload.
- Set status action sends selected status in the payload.
- Mark regularized and clear regularized actions send the correct payloads.
- Late-only, lock state, regularization state, and rows-per-page filters update URL state.
- Horizontal overflow check passes after operations.

Leave balance operations:

- Leave balances page loads live metrics and navigation links.
- Employee, leave policy, action, units, effective date, reason, search, employee filter, policy filter, and transaction status controls are visible.
- Blank/invalid action submission returns browser-visible failure.
- HR admin applies a disposable credit adjustment through the browser.
- Browser payload contains action, units, and reason.
- Success message is displayed.
- Transaction card appears with exact reason, units, status, before/after values, performed-by/reviewer metadata, and projected impact.
- Transaction filtering by search and status keeps the exact transaction visible.
- Pending maker-checker state is handled honestly: if current actor can review, review controls are asserted; if not, the alternate reviewer message is asserted.

## Residual Gaps

- Insufficient leave balance debit should be certified with an isolated disposable balance fixture.
- Locked attendance record employee submission behavior should be certified by locking a specific attendance row, then attempting ESS regularization against that row.
- HR-admin notification generation after leave/attendance decisions still needs source-linked proof.
- HR-admin audit center needs source-specific proof for attendance bulk action, regularization decision, and leave balance adjustment events.
- Responsive screenshots for these exact HR-admin operation pages should be added to Phase 8 visual gates.

## Confidence Update

- HR-admin attendance regularization oversight confidence: `88%`
- Attendance bulk operations confidence: `86%`
- Leave balance operations confidence: `86%`
- Phase 4 confidence after Phase 4C: `87%`
