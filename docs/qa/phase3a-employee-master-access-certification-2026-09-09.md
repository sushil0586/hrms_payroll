# Phase 3A Employee Master and Access Certification

Date: 2026-09-09

Environment:

- Frontend: `http://localhost:3211`
- Backend: `http://127.0.0.1:8011/api/v1`
- Browser: Playwright Chromium
- Persona: HR Admin `nisha.rao`

## Touched Pages Certified

- `/hr-admin/employees/new`
- `/hr-admin/employees/[employeeId]/edit`
- `/hr-admin/employees?employeeId=[employeeId]`
- `/hr-admin/employees/[employeeId]/access`

## Browser Evidence

Command:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/employee-lifecycle-certification-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `1 passed`.

## Granular Coverage

Employee create page:

- Page shell, H1, modern form card, no app error, no horizontal overflow.
- Sections: Identity and employment, Contact and dates, Structural mapping.
- Text fields: employee code, first name, middle name, last name, preferred name, work email, personal email, phone number.
- Date fields: date of birth, date of joining, probation end date, confirmation date.
- Dropdowns: employment status, legal entity, branch, location, business unit, department, cost center, designation, grade, employment type, reporting manager.
- Actions: Create employee, Cancel.
- Required validation: employee code and first name.
- Date warning validation: date of birth before joining, probation after joining, confirmation after probation.
- Dependent dropdown behavior: legal entity to branch/cost center, branch to location, department to business unit, designation to grade.
- Create mutation: browser POST to `/api/hr-admin/employees`.
- Duplicate employee code rejection.

Employee directory/detail page:

- Page shell, H1, directory, detail panel, metrics, status tabs, filters, no horizontal overflow.
- Created employee appears in directory.
- Selected employee detail reflects saved identity, contact, status, structure, reporting manager, and access warnings.
- Action menu exposes Edit employee and Manage access.

Employee edit page:

- Page shell, H1, edit form card, no app error, no horizontal overflow.
- Same field inventory as create page.
- Existing employee code loads into edit form.
- Edit mutation: browser PATCH to `/api/hr-admin/employees/[employeeId]`.
- Updated preferred name, phone number, and employment status persist back to directory/detail.

Employee access page:

- Page shell, H1, access metrics, no app error, no horizontal overflow.
- Sections: Identity and membership, Access controls, Role assignment.
- Fields: username, email, first name, last name, display name, phone number, membership status, temporary password.
- Toggles: user active, must change password, default membership.
- Role assignment checkboxes are visible and selectable.
- Create access stays disabled until at least one role is selected.
- Access mutation: browser POST to `/api/hr-admin/employees/[employeeId]/access`.
- Success notice appears after provisioning.

## Quality Checks

```bash
pnpm --dir web lint
pnpm --dir web typecheck
```

Results:

- Web lint: passed.
- Web typecheck: passed.

## Findings

- The current EmployeeForm uses visual text inside labels, but some controls are not discoverable by Playwright `getByLabel`. The browser flow works, but accessibility should be improved by adding explicit `htmlFor`/`id` wiring or `aria-label` on every form control.
- Employee full-name rendering currently uses first and last name in directory/detail display. Middle name is captured by the form but is not shown in the directory full name.

## Confidence Update

| Area | Confidence | Notes |
|---|---:|---|
| Employee master create/edit | 86% | Full touched-page field and mutation certification passed locally. |
| Employee structural mapping | 90% | Dependent dropdown behavior already proven in Phase 1 and rechecked in Phase 3A. |
| Employee access provisioning | 82% | Create access and role requirement pass; update/suspend/revoke paths remain. |
| Phase 3 overall | 35% | First vertical slice is certified; documents, onboarding, movement, exit, ESS login, MSS visibility, and audit remain. |

## Next Gate

Continue Phase 3B with employee documents and onboarding lifecycle certification. Every touched document/onboarding page must receive the same full page certification standard.
