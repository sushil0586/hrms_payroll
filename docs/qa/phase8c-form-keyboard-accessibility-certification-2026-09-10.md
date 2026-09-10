# Phase 8C Form Keyboard Accessibility Certification

Date: 2026-09-10

## Scope

Phase 8C certified dense browser forms for keyboard reachability, accessible names, focus behavior, and viewport-safe control layout.

Pages covered:

- `/hr-admin/salary-setup`
- `/hr-admin/payroll-setup`
- `/hr-admin/payroll-inputs`
- `/hr-admin/payroll-statutory`

Form panels covered:

- Salary component form
- Salary structure form
- Salary structure version form
- Salary structure component line form
- Employee salary assignment form
- Payroll calendar form
- Payroll period form
- Pay group form
- Pay group assignment form
- Payroll run form
- Payroll input snapshot form
- Payroll input lock panel
- Statutory pack form
- Statutory component form
- Statutory slab form
- Employer statutory registration form
- Statutory filing calendar form
- Employee statutory profile form
- Employee statutory declaration form
- Employee statutory declaration item form

## Browser Assertions

- Each page loaded with the expected heading and no app error.
- Each dense form panel was visible and had the expected accessible `aria-label`.
- Every enabled visible textbox, dropdown, textarea, checkbox, button, and link inside each form could receive browser focus.
- Keyboard Tab stayed within the active form sample and moved forward without trapping or jumping backward.
- Visible controls had accessible names from text, label nesting, `aria-label`, `aria-labelledby`, or title.
- Visible fields met minimum usable dimensions.
- Controls stayed within the viewport.
- Each certified page had no horizontal overflow.
- Playwright screenshots were captured for each covered page.

## Notes

- Disabled submit/action buttons are intentionally excluded from focusability checks because browsers do not focus disabled controls.
- Native date inputs can consume Tab inside browser-managed date segments, so the certification checks forward non-backtracking movement across distinct controls instead of assuming every native substep is externally observable.

## Evidence

Command:

```bash
PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase8c-form-keyboard-accessibility.spec.ts --project=chromium --workers=1
```

Result:

- `4 passed`
- Runtime: `24.8s`

## Certification

Phase 8C is locally certified for dense payroll/configuration form keyboard accessibility.

Residual Phase 8 work:

- Performance timing budgets on local and staging.
- Staging screenshot review after deployment.
- Broader keyboard certification for non-payroll lifecycle, attendance, notification, and support forms.
