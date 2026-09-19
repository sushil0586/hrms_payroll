# HR Admin Enterprise UI Phase 1 Shell Progress

Date: 2026-09-19  
Parent plan: `docs/qa/hr-admin-enterprise-ui-phase-plan-2026-09-19.md`  
Approved design baseline: `docs/qa/hr-admin-enterprise-ui-prototype-2026-09-19.html`

## Scope Completed

Phase 1 first implementation slice is complete for code-level validation.

Implemented:

- Added a dedicated HR Admin workspace tone: `workspaceTone="hr"`.
- Kept Platform Admin on existing `workspaceTone="admin"` so Platform Admin styling is not disturbed.
- Updated HR Admin shell brand from generic Nexora/admin wording to HRMS People Operations wording.
- Added HR-only dark navy sidebar and light workspace styling.
- Standardized HR Admin shell radius, topbar, search, sidebar, buttons, cards, and page intro treatment toward the approved prototype.
- Reworked HR Admin fallback navigation into approved enterprise groups:
  - Command
  - Workforce
  - Time & Leave
  - Payroll
  - Compliance
  - Insights
  - Setup
  - Operations
- Updated DB-backed default menu catalog to match the new HR Admin grouping.
- Updated HR Admin navigation/control-center Playwright expectations to the new approved menu labels.

## Files Changed

- `web/src/components/shell/workspace-chrome.tsx`
- `web/src/components/shell/hr-admin-chrome.tsx`
- `web/src/lib/ui/navigation.ts`
- `web/src/app/globals.css`
- `backend/apps/iam/menu_catalog.py`
- `web/tests/e2e/hr-admin-navigation-control-center-95.spec.ts`

## Validation

Passed:

```bash
pnpm --dir web typecheck
pnpm --dir web lint
cd backend && ./.venv/bin/python manage.py check
cd backend && ./.venv/bin/python manage.py sync_menu_catalog --dry-run
```

Menu catalog dry-run:

```text
Menu catalog sync complete: created=8, updated=15, deactivated=0, dry_run=True
```

This means deployed environments using DB-backed menus should run:

```bash
cd backend
./.venv/bin/python manage.py sync_menu_catalog
```

after deployment, otherwise the code fallback will be updated but existing DB menu rows may still show the old HR Admin grouping.

Attempted browser verification:

```bash
pnpm --dir web exec playwright test \
  tests/e2e/hr-admin-navigation-control-center-95.spec.ts \
  tests/e2e/hr-admin-control-center-certification.spec.ts \
  --project=chromium --workers=1
```

Result:

```text
3 failed before UI assertions at tests/helpers/staging-auth.ts:91
Reason: /api/auth/login response was not ok for the configured local persona.
```

Interpretation:

- The browser server started.
- Tests did not reach the HR Admin UI.
- No layout, route, or visual assertion failed.
- Browser verification remains pending until the local/stage test auth fixture is available.

## Remaining Phase 1 Work

Still pending:

- Browser screenshot verification at 1440px.
- Browser screenshot verification at 1366px.
- Tablet-width shell verification.
- Check sidebar scroll behavior with all groups expanded.
- Verify old SaaS pages still accessible by direct URL even though not all are exposed in the new sidebar.
- Verify DB-synced menu after staging deployment.

## Phase 1 Status

Status: Code-level shell implementation complete; browser verification pending.

Recommended next step:

Run browser verification locally or on stage, then move to Phase 2 dashboard redesign.
