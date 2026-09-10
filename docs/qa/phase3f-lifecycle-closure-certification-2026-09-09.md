# Phase 3F Lifecycle Closure Certification

Date: 2026-09-09

Environment:

- Frontend: `http://127.0.0.1:3212`
- Backend: `http://127.0.0.1:8011/api/v1`
- Persona: HR admin `nisha.rao`
- Test data: disposable `PW_` employees, documents, movement references, and audit notes.

## Scope

Phase 3F closed the remaining Employee Lifecycle proof points that were still open after Phase 3E.

Certified pages:

- `/hr-admin/employees/new`
- `/hr-admin/employees?employeeId=[employeeId]`
- `/hr-admin/movements/new`
- `/hr-admin/movements`
- `/hr-admin/employee-documents/new`
- `/hr-admin/employee-documents`
- `/hr-admin/employee-documents/[itemId]/review`
- `/hr-admin/audit`

## Browser Evidence

Suite:

- `web/tests/e2e/employee-phase3f-closure-certification-flows.spec.ts`

Command:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/employee-phase3f-closure-certification-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result:

- `2 passed`

Validation:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.

## Certified Behaviors

Completed movement writeback:

- Created a source manager, target manager, and employee through the browser.
- Created a completed reporting-manager movement through the browser.
- Verified the movement appears in the movement list.
- Verified employee detail changed from source manager to target manager after completion.
- Verified no horizontal overflow on touched detail/list pages.

Document review and audit trace:

- Created a disposable employee by authenticated HR-admin request as setup.
- Uploaded a PDF employee document through the browser.
- Opened the review screen from the document queue.
- Waited for review page hydration before editing controls.
- Changed verification status to `rejected`.
- Entered a unique rejection/review note.
- Verified the status selection is preserved after note entry.
- Verified the browser form payload submits `verification_status: rejected`.
- Verified the API response returns `verification_status: rejected`.
- Verified source review history contains the exact unique note and `rejected` decision.
- Verified Audit center filters by `document_review` source and unique note.
- Verified the audit event links back to the exact document review source record.

## Product Fix

During certification, Playwright exposed a real interaction issue on the employee document review page:

- Selecting `Rejected` and then typing a review note could reset the controlled verification-status dropdown to `Pending` before submit.

Fix applied:

- `web/src/app/hr-admin/employee-documents/employee-document-review-form.tsx` now submits from the browser form values and uses uncontrolled controls for the review edit panel. This prevents one field edit from rewinding another visible selection.

## Residual Gap Moved To Phase 4

Direct-report workflow item proof in MSS still belongs in Phase 4 because the currently visible ESS/MSS surface does not yet expose a fresh browser submit path for leave or attendance regularization from the employee side. Phase 4 should certify employee request submission, manager queue visibility, approve/reject, balance/status updates, notifications, and audit.

## Confidence Update

- Completed movement writeback confidence: `90%`
- Document review source trace confidence: `90%`
- Audit center lifecycle trace confidence: `86%`
- Employee lifecycle confidence: `88%`

Phase 3 is now functionally complete for the HR-admin Employee Lifecycle scope, with leave/attendance workflow proof moving cleanly into Phase 4.
