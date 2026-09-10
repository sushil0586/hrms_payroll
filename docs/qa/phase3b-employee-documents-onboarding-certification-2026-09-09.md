# Phase 3B Employee Documents and Onboarding Certification

Date: 2026-09-09

Environment:

- Frontend: `http://localhost:3211`
- Backend: `http://127.0.0.1:8011/api/v1`
- Browser: Playwright Chromium
- Persona: HR Admin `nisha.rao`

## Touched Pages Certified

- `/hr-admin/employee-documents/new`
- `/hr-admin/employee-documents`
- `/hr-admin/onboardings/new`
- `/hr-admin/onboardings/[itemId]/edit`
- `/hr-admin/onboardings`

## Browser Evidence

Command:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/employee-documents-onboarding-certification-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `2 passed`.

## Granular Coverage

Employee document upload:

- Page shell, H1, upload card, no app error, no horizontal overflow.
- Fields: employee, category, title, document number, issued on, expires on, file.
- Dropdowns load live employee and document category options.
- Required validation: employee, category, title, file.
- Disposable employee is created for upload isolation.
- PDF-like file is uploaded through the browser file input.
- Upload mutation: browser POST to `/api/hr-admin/employee-documents`.
- Successful upload redirects to document review queue.

Employee document queue:

- Page shell, H1, metrics, no horizontal overflow.
- Metrics: documents in queue, categories configured, expiring on page, expired on page.
- Filters: search, verification status, record status, category, expiry focus, rows per page.
- Actions: apply filters, clear filters, select page, send reminder.
- Created document card appears with review action.
- Search filter narrows to the created document.
- Clear filters resets the queue route.

Onboarding create:

- Page shell, H1, onboarding form card, no app error, no horizontal overflow.
- Sections: joiner and status, routing and ownership, checklist and notes, checklist items.
- Fields: employee, status, expected joining date, actual joining date, lifecycle template trigger, assigned owner, workflow reference, notes.
- Dropdowns load live employee, status, and lifecycle owner options.
- Lifecycle template trigger is certified as optional because the current seed has no lifecycle template trigger options beyond `No template`.
- Disposable employee is created for onboarding isolation.
- Checklist item add/remove is tested.
- Checklist fields: code, label, owner, escalation owner, due on, escalate after days, notes.
- Checklist toggles: required, blocking, done, auto reassign on escalation.
- Readiness preview updates after checklist completion.
- Create mutation: browser POST to `/api/hr-admin/onboardings`.
- Successful create redirects to onboarding queue.

Onboarding queue and edit:

- Page shell, H1, metrics, no horizontal overflow.
- Metrics: onboarding records, rows on current page, document blockers, future due docs.
- Filters: search, status, owner, rows per page.
- Bulk controls: bulk owner, bulk status, assign owner, clear owner, set status.
- Created onboarding appears in queue.
- Search filter narrows to workflow reference.
- Edit link opens the created onboarding.
- Edit form is fully re-certified.
- Status and notes are updated through browser PATCH to `/api/hr-admin/onboardings/[itemId]`.
- Clear filters resets the queue route.

## Quality Checks

```bash
pnpm --dir web lint
pnpm --dir web typecheck
```

Results:

- Web lint: passed.
- Web typecheck: passed.

## Findings

- Document upload is sensitive to selected employee/category state. The certification now creates a disposable employee before upload so it does not collide with existing active documents.
- Onboarding creation is sensitive to employees that already have onboarding records. The certification now creates a disposable employee for onboarding isolation.
- Lifecycle template trigger is optional in the current seed data. Full template-driven checklist seeding should be certified after at least one active lifecycle workflow template is present.

## Confidence Update

| Area | Confidence | Notes |
|---|---:|---|
| Employee document upload | 84% | Full upload and queue certification passed; review decision page remains for the next slice. |
| Employee document queue | 86% | Filters and queue actions are certified; reminder send is visible but not mutated in this slice. |
| Onboarding create/edit | 86% | Checklist controls, readiness preview, create, edit, search, and route reset pass. |
| Phase 3 overall | 50% | Employee master/access plus documents/onboarding are certified. Movement, exit, audit, ESS, MSS, and document review remain. |

## Next Gate

Continue Phase 3C with employee document review decisions plus movement and exit lifecycle certification.
