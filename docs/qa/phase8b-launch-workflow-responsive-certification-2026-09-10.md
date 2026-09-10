# Phase 8B Launch Workflow Responsive Certification

Date: 2026-09-10

## Scope

Phase 8B certified launch-critical workspaces through the browser across the responsive viewport matrix.

Routes covered:

- `/`
- `/hr-admin`
- `/hr-admin/payroll-readiness`
- `/hr-admin/payroll-inputs`
- `/hr-admin/payroll-calculations`
- `/hr-admin/payroll-review`
- `/hr-admin/payroll-outputs`
- `/hr-admin/payroll-handoff`
- `/hr-admin/payroll-providers`
- `/hr-admin/notifications?retry_state=retry_ready`
- `/hr-admin/notification-delivery`
- `/tenant-admin`
- `/tenant-admin/security-readiness`
- `/support`
- `/ess/payslips`
- `/ess/notifications?subject_type=payroll_payslip`
- `/mss/approvals`

Viewports covered:

- Wide desktop: `1920x1080`
- Desktop: `1440x900`
- Launch laptop: `1366x768`
- Compact laptop: `1280x720`
- Tablet: `820x1180`
- Mobile: `390x844`

## Browser Assertions

- Each route loaded with the expected heading.
- No production app error appeared.
- No horizontal page overflow was allowed.
- Interactive controls stayed within viewport or inside intentional horizontal scrollers.
- Overlapping visible controls were rejected.
- Tiny unusable controls were rejected.
- Full-page screenshots were captured by Playwright for each route and viewport.

## Defects Found And Fixed

### Payroll Input Rail Mobile Overflow

Issue:

- Long seeded payroll run names on `/hr-admin/payroll-inputs` stretched the run card content beyond the mobile viewport.
- At `390px`, the page width expanded to `419px`.

Fix:

- Added shrink-safe layout rules for payroll mini-card inner content in `web/src/app/globals.css`.
- Long mini-card labels now wrap within their parent rather than expanding the shell.

### Responsive Gate Scroll-Clipping False Positives

Issue:

- The layout checker counted controls clipped inside scrollable record lists as if they were fully visible.
- This produced false overlap reports between offscreen record buttons and visible save buttons.

Fix:

- Updated `web/tests/e2e/production-responsive-visual-gate.spec.ts` to evaluate each control's visible rectangle after scroll-container clipping.
- The gate remains strict for real overlaps while avoiding false positives for intentionally clipped scroll-list rows.

## Evidence

Command:

```bash
PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/production-responsive-visual-gate.spec.ts --project=chromium --workers=1
```

Result:

- `6 passed`
- Runtime: `2.7m`

Additional targeted confirmation:

```bash
PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/production-responsive-visual-gate.spec.ts --project=chromium --grep "mobile" --workers=1
```

Result:

- `1 passed`

## Certification

Phase 8B is locally certified for broad launch workflow responsive stability.

Residual Phase 8 work:

- Keyboard tab-order certification for large CRUD and payroll forms.
- Performance timing budgets on local and staging.
- Visual screenshot review against launch design expectations after the next full staging deployment.
