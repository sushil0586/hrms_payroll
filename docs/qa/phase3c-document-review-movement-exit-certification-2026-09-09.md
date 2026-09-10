# Phase 3C Document Review, Movement, and Exit Certification

Date: 2026-09-09  
Environment: local dev  
Frontend: `http://localhost:3211`  
Backend: `http://127.0.0.1:8011/api/v1`  
Persona: HR admin (`nisha.rao`)

## Scope

Phase 3C continued the employee lifecycle certification depth-first. Every touched page was tested through Playwright at the browser level, including visible fields, dropdowns, buttons, links, list cards, queue filters, validation paths, create/update mutations, and responsive overflow checks.

## Pages Certified

- `/hr-admin/employee-documents/[itemId]/review`
- `/hr-admin/employee-documents`
- `/hr-admin/movements/new`
- `/hr-admin/movements/[itemId]/edit`
- `/hr-admin/movements`
- `/hr-admin/exits/new`
- `/hr-admin/exits/[itemId]/edit`
- `/hr-admin/exits`

## Browser Coverage

### Employee Document Review

- Created a disposable employee and uploaded a disposable PDF through the browser.
- Opened the uploaded document review screen from the document queue.
- Verified document context, review details, version history, review history, and navigation controls.
- Certified title, status, verification status, document number, issued date, expiry date, re-upload requested, and review note fields.
- Saved the review through the browser and verified return to the queue.
- Filtered the queue by updated title and verified the reviewed document remained searchable.

### Movement Operations

- Created a disposable employee for movement coverage.
- Certified create form headings, employee/type/status/date/reason/workflow fields, department/designation routing fields, manager/owner routing, and current snapshot JSON.
- Verified invalid current snapshot JSON blocks save with a visible validation message.
- Created a movement through the browser.
- Certified movement queue metrics, create/back links, search/status/type/owner/page-size filters, bulk owner, bulk status, selection controls, card details, and edit action.
- Applied search filtering and verified shareable URL state.
- Selected the page, assigned owner through bulk action, selected again, and changed status through bulk action.
- Edited the movement and verified updated values save through the browser.
- Cleared filters and verified the queue returns to normal state.

### Exit Operations

- Created a disposable employee for exit coverage.
- Certified create form headings, employee/status/date/reason/workflow fields, notice/LWD dates, lifecycle template trigger, clearance plan notes, handover notes, regrettable and rehire flags.
- Added a clearance item and certified code, label, owner, escalation owner, due date, escalation days, notes, required, blocking, done, and auto-reassign controls.
- Verified clearance preview updates when the item is marked done.
- Added and removed a second clearance item.
- Created an exit record through the browser.
- Certified exit queue metrics, create/back links, search/status/rehire/page-size filters, cards, attention chips, clearance progress, and edit action.
- Applied search and rehire filters and verified shareable URL state.
- Edited the exit record, updated status, handover notes, and rehire eligibility, then saved through the browser.
- Cleared filters and verified the queue returns to normal state.

## Validation

Command:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/employee-review-movement-exit-certification-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `3 passed`

Quality checks:

```bash
pnpm --dir web lint
pnpm --dir web typecheck
```

Result: both passed.

## Observations

- Lifecycle status options are correctly configuration-driven; the test now selects values that exist in the live dropdown instead of assuming unrelated labels.
- Movement create/edit labels one owner selector as `To manager`, while the payload field is `owner_value`. Functionally it works, but the label may confuse users because it behaves as lifecycle owner routing, not a direct reporting manager assignment.
- Movement completion paths should get a later dedicated test with intentionally different source and target structure, because completed movements can apply structural changes to the employee record.

## Confidence Update

- Employee document review confidence: 86%
- Movement operations confidence: 82%
- Exit lifecycle confidence: 84%
- Phase 3 confidence after Phase 3C: 68%

## Remaining Phase 3 Work

- Probation review path.
- Movement completion with employee structural writeback proof.
- Audit trail verification for employee, document, movement, and exit mutations.
- ESS login proof for newly provisioned employee access.
- MSS reporting manager visibility proof for direct reports.
