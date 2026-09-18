# Setup Templates Production-Grade Development and QA Plan

Date: 2026-09-18  
Module: Platform Admin > Setup Templates  
Target: Enterprise-grade tenant setup template lifecycle, adoption, auditability, and quality certification

## Objective

Make Setup Templates a production-grade SaaS onboarding accelerator:

- Platform Admin can create reusable setup templates.
- Templates contain real cloneable setup items.
- Published templates are controlled, versioned, and auditable.
- Tenants can adopt templates safely with preview/dry-run evidence.
- Adoption creates tenant runtime records where applicable.
- Operators can verify what was created, skipped, blocked, or needs remediation.

## Current State

Implemented:

- Template header create.
- Template publish.
- Tenant adoption.
- Adoption evidence in onboarding history.
- Template items are returned by API.
- Browser item authoring for leave type, leave policy, shift, holiday calendar, and attendance policy.
- Adoption preview in Platform Admin.
- Header-only publish requires explicit confirmation.
- Backend validation for duplicate item keys, dependencies, and required payload fields.
- Draft item edit/delete from Platform Admin.
- Published template item create/edit/delete lock.
- Published template clone-to-new-version workflow.
- Adoption impact preview before Apply.
- Adoption result report after Apply.

Current limitations:

- No known critical/high Setup Templates defects remain from this focused lifecycle certification.
- Broader cross-browser/mobile certification is still recommended before public launch signoff.

## Enterprise Design Principles

- Published templates must be immutable.
- Draft templates can be edited.
- Every adoption must be auditable.
- Header-only templates are allowed only by explicit confirmation.
- Tenant data must never leak across tenants.
- Runtime records created from templates must retain source traceability.
- Operators must see what will happen before applying a template.
- Bad payloads must fail with clear validation messages.
- The UI should guide non-technical operators and still allow advanced configuration.

## Phase Plan

### Phase 0 - Baseline and Guardrails

Status: Completed

Scope:

- Expose template items in API.
- Add adoption preview in Platform Admin.
- Add browser item authoring.
- Validate item payloads and dependencies.
- Require explicit confirmation for header-only publish.

Exit criteria:

- Template list shows item count and content status.
- Adoption preview shows item types and records.
- Header-only publish has clear warning.
- Backend tests cover validation and header-only guard.
- Focused Platform Admin browser tests pass.

Evidence:

- `backend/tests/test_tenant_onboarding_api.py`: 18 passed.
- `platform-admin-tabs-pagination-certification.spec.ts` and `platform-admin-audit-evidence-certification.spec.ts`: 2 passed.

### Phase 1 - Draft Item Edit/Delete

Priority: High
Status: Completed

Scope:

- Add backend item update endpoint.
- Add backend item delete endpoint.
- Allow edit/delete only for draft templates.
- Block edit/delete on published templates.
- Add Platform Admin edit item form/dialog.
- Add delete confirmation.
- Refresh and verify list/preview after each mutation.

Backend endpoints:

- `PATCH /api/v1/platform-policy-packs/{pack_id}/items/{item_id}/`
- `DELETE /api/v1/platform-policy-packs/{pack_id}/items/{item_id}/`

QA scenarios:

- Create item, edit name/payload/sort order, refresh, verify persistence.
- Delete draft item, refresh, verify removed.
- Try edit/delete after publish, verify denied.
- Duplicate item key validation.
- Invalid payload validation.
- Missing dependency validation.
- Keyboard and modal focus behavior.

Exit criteria:

- Draft templates are maintainable without database/admin console access.
- Published template contents cannot be silently changed.
- Browser and backend tests pass.

Implementation notes:

- Added `PATCH /api/v1/platform-policy-packs/{pack_id}/items/{item_id}/`.
- Added `DELETE /api/v1/platform-policy-packs/{pack_id}/items/{item_id}/`.
- Added draft-only API guard for item create/update/delete.
- Added item payload to list serialization so UI can reopen and edit records.
- Added inline Platform Admin edit form for draft items.
- Added delete confirmation for draft items.
- Added disabled locked reason for published templates.
- Changed template selector to show draft and published templates; adoption remains restricted to published templates.

Evidence:

- `./backend/.venv/bin/python -m pytest backend/tests/test_tenant_onboarding_api.py -q`: 19 passed.
- `pnpm --dir web exec tsc --noEmit`: passed.
- `pnpm --dir web lint`: passed.
- Focused Playwright Platform Admin run was attempted, but blocked before page load because `/api/auth/login` returned non-OK with the current local browser-test credentials/env.

### Phase 2 - Template Versioning

Priority: High
Status: Completed

Scope:

- Published templates become immutable.
- Add “Create new version” action.
- New version clones header and items into draft version.
- Tenant adoption stores exact pack version.
- UI shows version lineage and published/draft state.

Backend model/API expectations:

- Add source/parent version reference if needed.
- Enforce unique code/version pair or derived version code.
- Clone items with payload and dependencies.

QA scenarios:

- Publish v1.
- Create v2 draft from v1.
- Edit v2 without changing v1.
- Adopt v1 and verify adoption records version 1.
- Adopt v2 and verify adoption records version 2.
- Ensure v1 published remains unchanged.

Exit criteria:

- Operators can evolve templates safely.
- Adopted tenants remain traceable to exact version.

Implementation notes:

- Added `source_pack` lineage on platform policy packs.
- Added `POST /api/v1/platform-policy-packs/{pack_id}/clone-version/`.
- Clone action is allowed only for published templates.
- New version is created as draft with derived code, next version number, copied items, copied payloads, copied dependencies, and copied delegation rules.
- Published source template remains locked and adoption history stays tied to the original pack/version.
- Platform Admin now shows “New version” for published templates and derives the selected draft after cloning.
- Template rows show lineage when a draft was derived from a prior published pack.

Evidence:

- `./backend/.venv/bin/python -m pytest backend/tests/test_tenant_onboarding_api.py -q`: 21 passed.
- `./backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run`: no changes detected.
- `./backend/.venv/bin/python backend/manage.py check`: passed.
- `pnpm --dir web exec tsc --noEmit`: passed.
- `pnpm --dir web lint`: passed.

### Phase 3 - Adoption Dry Run

Priority: High
Status: Completed

Scope:

- Add dry-run endpoint before Apply.
- Show records that will be created.
- Show dependency failures.
- Show duplicate/conflict risks.
- Show unsupported item types.
- Show header-only/evidence-only behavior.

Backend endpoint:

- `POST /api/v1/platform-policy-packs/{pack_id}/adoption-preview/`

QA scenarios:

- Preview cloneable template.
- Preview header-only template.
- Preview missing dependency.
- Preview duplicate tenant runtime records.
- Preview unsupported item type.
- Verify Apply uses same selected mode as preview.

Exit criteria:

- Operator can understand impact before adoption.
- Bad templates cannot surprise tenant setup.

Implementation notes:

- Added `POST /api/v1/platform-policy-packs/{pack_id}/adoption-preview/`.
- Preview is allowed only for published templates.
- Preview accepts tenant and adoption mode.
- Preview returns `can_apply`, counts, and item-level results.
- Preview detects create-ready records.
- Preview detects tenant runtime record conflicts by code or code/year.
- Preview reports baseline-only/evidence-only behavior.
- Preview blocks unsupported item types and missing dependencies.
- Platform Admin now requires a clean matching impact preview before Apply.
- Apply is disabled until preview succeeds for the selected tenant/template/mode.

Evidence:

- `./backend/.venv/bin/python -m pytest backend/tests/test_tenant_onboarding_api.py -q`: 22 passed.
- `./backend/.venv/bin/python backend/manage.py check`: passed.
- `pnpm --dir web exec tsc --noEmit`: passed.
- `pnpm --dir web lint`: passed.

### Phase 4 - Adoption Result Report

Priority: Medium-High
Status: Completed

Scope:

- Return created/skipped/failed item result after adoption.
- Store adoption result summary in audit payload.
- Show result report in UI after Apply.
- Link created runtime records where supported.

QA scenarios:

- Adopt template with multiple item types.
- Verify result counts.
- Verify tenant runtime records exist.
- Verify audit event payload includes result summary.
- Refresh and reopen tenant audit logs.

Exit criteria:

- Adoption outcome is transparent and reviewable.

Implementation notes:

- Adoption now returns a `result_summary` in the API response.
- Result summary includes created/skipped/failed/evidence-only counts.
- Result summary includes item-level action, target model, target record ID, message, and severity.
- Onboarding audit event payload now stores the same result summary.
- Baseline-only adoption now records evidence without creating tenant runtime records.
- Platform Admin now shows an Apply result panel after successful adoption.

Evidence:

- `./backend/.venv/bin/python -m pytest backend/tests/test_tenant_onboarding_api.py -q`: 23 passed.
- `./backend/.venv/bin/python backend/manage.py check`: passed.
- `pnpm --dir web exec tsc --noEmit`: passed.
- `pnpm --dir web lint`: passed.

### Phase 5 - Guided Item Forms

Priority: Medium
Status: Completed

Scope:

- Replace raw JSON-only authoring with guided forms for common item types.
- Keep advanced JSON override for platform super users.
- Add inline field-level validation.

Item forms:

- Leave Type.
- Leave Policy.
- Shift.
- Holiday Calendar.
- Attendance Policy.

QA scenarios:

- Create each item type through guided fields.
- Boundary values for dates, numbers, times.
- Invalid field errors.
- Payload preview correctness.
- Keyboard accessibility.

Exit criteria:

- Non-technical operators can author templates safely.

Implementation notes:

- Added guided browser forms for Leave Type, Leave Policy, Shift, Holiday Calendar, and Attendance Policy payloads.
- Kept an Advanced JSON override for platform super users who need to author richer payloads.
- Added browser-level required fields for runtime code/name and key item fields.
- Draft item edit now reopens existing payload values in guided fields.
- Item type is locked during edit so operators do not accidentally mutate a record into a different runtime model.
- Existing draft/published guards remain intact: draft items are editable, published items stay locked.

Evidence:

- `pnpm --dir web exec tsc --noEmit`: passed.
- `pnpm --dir web lint`: passed.
- `./backend/.venv/bin/python -m pytest backend/tests/test_tenant_onboarding_api.py -q`: 23 passed.
- `./backend/.venv/bin/python backend/manage.py check`: passed.

### Phase 6 - Tenant Upgrade and Compare

Priority: Medium
Status: Completed

Scope:

- Compare tenant adopted version vs latest published template.
- Show drift, detached records, and upgrade options.
- Upgrade tenant from v1 to v2 using preview/dry-run.

QA scenarios:

- Tenant adopted v1, template v2 exists.
- Compare shows new/changed items.
- Upgrade applies only expected changes.
- Detached tenant records are respected.

Exit criteria:

- Template lifecycle supports real SaaS operations after initial onboarding.

Implementation notes:

- Added `POST /api/v1/platform-policy-packs/{pack_id}/upgrade-compare/`.
- Comparison uses the selected published template as the target version.
- Backend finds the tenant's latest adoption in the same template lineage.
- Comparison reports add, change, remove, unchanged, and detached item states.
- Detached tenant records force manual review before upgrade.
- Platform Admin now has a Compare version action in the Apply setup template workflow.
- UI shows current adopted version, target version, counts, and item-level messages.

- Added `POST /api/v1/platform-policy-packs/{pack_id}/upgrade-apply/`.
- Upgrade apply is gated by comparison rules and blocks detached tenant records.
- Upgrade apply creates a fresh adoption evidence record for the target template version.
- Existing platform-managed runtime records are updated for changed items.
- New target-version items create tenant runtime records.
- Removed items are retained and reported as skipped/manual-review rather than deleted.
- Upgrade audit payload includes source version, target version, adoption ID, and result summary.
- Apply result now shows updated, created, skipped, failed, and evidence-only counts.

Conservative safety behavior:

- Tenant-detached records cannot be upgraded automatically.
- Removed template items do not delete tenant runtime records.
- Unsupported item types are skipped with warning evidence.

Evidence:

- `./backend/.venv/bin/python -m pytest backend/tests/test_tenant_onboarding_api.py -q`: 24 passed.
- `./backend/.venv/bin/python backend/manage.py check`: passed.
- `pnpm --dir web exec tsc --noEmit`: passed.
- `pnpm --dir web lint`: passed.

### Phase 7 - Comprehensive Certification

Priority: Required before public launch
Status: Completed - focused lifecycle certification passed in real browser

Scope:

- Full Platform Admin Setup Templates certification.
- Backend API certification.
- Tenant isolation certification.
- Security/permission certification.
- Browser UX/accessibility certification.
- Performance check.

Test coverage:

- Positive CRUD.
- Negative validation.
- Unauthorized access.
- Draft vs published restrictions.
- Versioning.
- Adoption preview.
- Adoption result report.
- Audit evidence.
- Browser refresh/reopen/search persistence.
- Responsive layout.

Exit criteria:

- No critical/high defects.
- Medium defects have accepted workarounds or are fixed.
- Confidence score at least 95%.

Implementation notes:

- Added focused Playwright certification for Setup Templates lifecycle:
  - guided item authoring,
  - publish,
  - first adoption preview/apply,
  - clone to v2,
  - draft item edit,
  - v2 publish,
  - version compare,
  - gated upgrade apply,
  - refresh/reopen verification.
- Corrected guided Leave Type category options to match backend model choices.
- Fixed the Platform Admin renderer so Launch Readiness loads draft/published setup templates for the item builder.
- Fixed async form reset handling in Platform Admin create flows so success feedback is not replaced by a `currentTarget` null error.
- Replaced invalid nested item edit form markup with a button-driven edit handler so draft template item edits submit reliably inside the Apply setup template card.
- Tightened browser assertions to verify exact visible operator evidence, including `1 created`, `1 updated`, `1 created`, and `2 unchanged` counters.

Evidence:

- `pnpm --dir web exec tsc --noEmit`: passed.
- `pnpm --dir web lint`: passed.
- `./backend/.venv/bin/python -m pytest backend/tests/test_tenant_onboarding_api.py -q`: 24 passed.
- `pnpm --dir web exec playwright test tests/e2e/platform-admin-setup-templates-lifecycle-certification.spec.ts --list`: 1 test discovered.
- Local database migration applied for `platform_policies.0003_platformpolicypack_source_pack`.
- Local Playwright platform admin password reset for certification account `platform.admin`.
- `HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-setup-templates-lifecycle-certification.spec.ts --project=chromium`: 1 passed.

## Quality Checklist

- Every mutation has success and error feedback.
- Every destructive/irreversible action has confirmation.
- Every disabled action explains why.
- Every publish/adopt action is auditable.
- Every tenant adoption is tenant-scoped.
- Every record survives refresh and search/reopen verification.
- Browser console has no unexpected errors.
- API responses avoid 500 for user-correctable validation.
- UI has no horizontal overflow on desktop/mobile.
- Keyboard navigation works for dialogs/forms.

## Progress Log

| Date | Phase | Status | Evidence |
| --- | --- | --- | --- |
| 2026-09-18 | Phase 0 | Completed baseline item exposure, adoption preview, item authoring, header-only publish guard, and item payload validation. | `backend/tests/test_tenant_onboarding_api.py`: 18 passed; Platform Admin focused browser pack: 2 passed |
| 2026-09-18 | Phase 1 | Completed draft item edit/delete with published immutability. | API tests 19 passed; TypeScript passed; lint passed |
| 2026-09-18 | Phase 2 | Completed published-template clone-to-new-version lifecycle. | API tests 21 passed; Django checks passed; TypeScript passed; lint passed |
| 2026-09-18 | Phase 3 | Completed adoption dry-run preview with conflict/dependency visibility and Apply gating. | API tests 22 passed; Django checks passed; TypeScript passed; lint passed |
| 2026-09-18 | Phase 4 | Completed adoption result report and audit payload result summary. | API tests 23 passed; Django checks passed; TypeScript passed; lint passed |
| 2026-09-18 | Phase 5 | Completed guided setup item authoring/editing forms with advanced JSON override. | API tests 23 passed; Django checks passed; TypeScript passed; lint passed |
| 2026-09-18 | Phase 6A | Completed tenant adopted-version vs target-template comparison. | API tests 24 passed; Django checks passed; TypeScript passed; lint passed |
| 2026-09-18 | Phase 6B | Completed gated tenant template upgrade apply with result evidence and safe manual-review handling. | API tests 24 passed; Django checks passed; TypeScript passed; lint passed |
| 2026-09-18 | Phase 7 | Completed focused real-browser setup-template lifecycle certification and fixed discovered UX/reliability issues. | TypeScript passed; lint passed; API tests 24 passed; Playwright lifecycle spec 1 passed |

## Next Recommended Execution

Recommended follow-up:

1. Run the full Platform Admin regression pack against staging after deployment.
2. Add mobile/tablet screenshot assertions for Setup Templates.
3. Add negative browser coverage for duplicate item key, invalid dependency, header-only publish confirmation, and published item lock.
4. Add permission-denial browser coverage for non-platform-admin access.
5. Capture staging audit evidence for create, publish, adopt, clone, compare, and upgrade actions.
