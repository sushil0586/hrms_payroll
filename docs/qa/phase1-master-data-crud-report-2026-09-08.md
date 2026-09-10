# Phase 1 Master Data and Configuration CRUD Report

Generated: 2026-09-08

## 1. Summary

Phase 1 browser testing was started against staging to validate master data, configuration forms, dropdown behavior, safe CRUD paths, and form validation.

Result:

- Environment: `https://hrms.accerio.in`
- API base: `https://hrms.accerio.in/api/v1`
- Browser runner: Playwright Chromium
- Tests executed: `15`
- Passed: `15`
- Failed: `0`
- Skipped: `0`
- Duration: `2.0m`

Current phase status:

- `AMBER`

Reason:

- The available browser suite passed cleanly and gives good confidence for key configuration surfaces.
- Phase 1 is not yet fully signed off because every master-data entity still needs explicit create, read, update, deactivate/archive, dropdown-source, and negative-validation coverage.

## 2. Command Executed

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test \
  tests/e2e/configuration-form-flows.spec.ts \
  tests/e2e/governance-assignment-form-flows.spec.ts \
  tests/e2e/salary-setup-flows.spec.ts \
  tests/e2e/workflow-trace-flows.spec.ts \
  --workers=1
```

## 3. Browser Coverage Completed

### Employee Create Configuration

Validated:

- Employee create page loads.
- Required-field validation is visible for employee code and first name.
- Date-of-birth/date-of-joining warning is visible.
- Page has no horizontal overflow.

Coverage confidence:

- Employee create form baseline: `75%`
- Full employee CRUD remains in Phase 3.

### Organization Department Form

Validated:

- Department create page loads.
- Core identity section is visible.
- Department hierarchy section is visible.
- Required-field validation is visible for code and name.
- Page has no horizontal overflow.

Coverage confidence:

- Department form baseline: `75%`
- Full organization master CRUD remains pending.

### Leave Policy Form

Validated:

- Leave policy create page loads.
- Preview route explains missing leave type before saving.
- Leave type dropdown contains live non-empty options.
- First live leave type can be selected.
- Leave policy edit page can load from an existing live record or browser-created record.
- Governance state is visible when platform-managed.
- Notice-days field is visible.
- Save action is enabled.
- Page has no horizontal overflow.

Coverage confidence:

- Leave policy browser confidence: `82%`
- Pending: duplicate-code validation, update persistence assertion, deactivation/archive behavior.

### Attendance Policy Form

Validated:

- Attendance policy create page loads.
- Preview explains missing attendance date before saving.
- Attendance date textbox accepts a valid date.
- Requested status override dropdown accepts a configured option.
- Attendance policy edit page can load from an existing live record or browser-created record.
- Default shift dropdown is visible.
- Save action is enabled.
- Page has no horizontal overflow.

Coverage confidence:

- Attendance policy browser confidence: `82%`
- Pending: duplicate-code validation, update persistence assertion, deactivation/archive behavior.

### Workflow Template Form

Validated:

- Workflow template create page loads.
- Initial approval step is visible.
- Add-step action creates Step 2.
- Remove-step action removes Step 2.
- Page has no horizontal overflow.

Coverage confidence:

- Workflow template form confidence: `80%`
- Pending: save/update/deactivate coverage and multi-step approval persistence.

### Workflow Assignment Form

Validated:

- Workflow assignment create page loads.
- Server validation errors are surfaced in the browser.
- Missing workflow template returns a visible save failure.
- Page has no horizontal overflow.

Coverage confidence:

- Workflow assignment validation confidence: `78%`
- Pending: positive create/edit/deactivate coverage with live workflow template and scoped assignment.

### Notification Template Form

Validated:

- Notification template create page loads.
- Channel dropdown changes enabled/disabled message fields.
- Email channel enables subject template.
- Email channel disables title template.
- Blank body template is rejected during preview.
- Backend validation message is shown in browser.
- Page has no horizontal overflow.

Coverage confidence:

- Notification template confidence: `85%`
- Pending: positive save/update/deactivate/test-send coverage with fixture provider.

### Leave Policy Assignment

Validated:

- Assignment create page loads.
- Leave policy dropdown has live selectable options.
- Conflict governance summary is visible.
- Active toggle changes guidance state.
- Page has no horizontal overflow.

Coverage confidence:

- Leave assignment confidence: `80%`
- Pending: positive save, edit, conflict-blocking, and inactive filtering.

### Attendance Policy Assignment

Validated:

- Assignment create page loads.
- Attendance policy dropdown has live selectable options or creates a disposable policy first.
- Conflict governance summary is visible.
- Location scope dropdown is visible.
- Page has no horizontal overflow.

Coverage confidence:

- Attendance assignment confidence: `80%`
- Pending: positive save, edit, conflict-blocking, and inactive filtering.

### Document Requirement Form

Validated:

- Document requirement create page loads.
- Category dropdown has live selectable options or creates a disposable category first.
- Required-within-joining-days textbox accepts a value.
- Requirement state section is visible.
- Mandatory checkbox is checked by default.
- Active toggle does not lose selected category.
- Page has no horizontal overflow.

Coverage confidence:

- Document requirement confidence: `80%`
- Pending: positive save, edit, duplicate/scope validation, deactivate/archive.

### Shift Assignment Form

Validated:

- Shift assignment create page loads.
- Assignment mode dropdown can switch to weekly rotation.
- Rotation design section appears.
- Add rotation step creates Step 2.
- Page has no horizontal overflow.

Coverage confidence:

- Shift assignment form confidence: `78%`
- Pending: positive save, edit, overlap validation, inactive assignment behavior.

### Salary Setup

Validated:

- Salary setup page loads.
- Catalog section is visible.
- Version matrix section is visible.
- Structure composition section is visible.
- Employee salary coverage section or salary data is visible.
- Structure detail link works when available.
- Page has no horizontal overflow.

Coverage confidence:

- Salary setup surface confidence: `75%`
- Pending: salary component CRUD, salary structure CRUD, versioning, employee assignment, effective-date validation, duplicate-code validation.

### Workflow Hub Trace

Validated:

- Workflow control page loads.
- Workflow timeline is visible.
- Search textbox accepts a value.
- Module dropdown applies attendance filter.
- Status dropdown applies rejected filter.
- Apply filters updates URL and result context.
- Page has no horizontal overflow.

Coverage confidence:

- Workflow trace confidence: `82%`
- Pending: trace detail drilldown and audit event reconciliation.

## 4. CRUD Matrix Status

| Configuration Area | Create | Read/List | Detail | Update | Deactivate/Archive | Negative Validation | Status |
|---|---|---|---|---|---|---|---|
| Legal entities | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Locations | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Branches | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Business units | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Departments | Form validation covered | Covered by final audit | Pending | Pending | Pending | Required fields covered | Amber |
| Cost centers | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Grades | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Designations | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Employment types | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Leave types | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Leave policies | Disposable create fallback, edit load covered | Covered | Detail/edit covered | Save enabled only | Pending | Preview validation covered | Amber |
| Attendance policies | Disposable create fallback, edit load covered | Covered | Detail/edit covered | Save enabled only | Pending | Preview validation covered | Amber |
| Shifts | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Holiday calendars | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Workflow templates | Add/remove step covered | Covered by final audit | Pending | Pending | Pending | Form behavior covered | Amber |
| Workflow assignments | Pending | Covered by final audit | Pending | Pending | Pending | Server validation covered | Amber |
| Document categories | Disposable create fallback | Covered by final audit | Pending | Pending | Pending | Pending | Amber |
| Document requirements | Form behavior covered | Covered by final audit | Pending | Pending | Pending | Partial | Amber |
| Notification templates | Preview validation covered | Covered by final audit | Pending | Pending | Pending | Blank body validation covered | Amber |
| Notification events | Pending | Covered by final audit | Pending | Pending | Pending | Pending | Red |
| Salary components | Pending | Surface covered | Pending | Pending | Pending | Pending | Red |
| Salary structures | Pending | Surface covered | Detail link covered | Pending | Pending | Pending | Amber |
| Payroll calendars | Pending | Surface covered | Pending | Pending | Pending | Pending | Red |
| Pay groups | Pending | Surface covered | Pending | Pending | Pending | Pending | Red |
| Statutory packs/registrations | Pending | Surface covered | Pending | Pending | Pending | Pending | Red |

## 5. Confidence Update

Before Phase 1 execution:

| Area | Confidence |
|---|---:|
| Safe forms and controls | 75% |
| CRUD workflows | 60% |
| Configuration confidence | 65% |
| Overall product confidence | 60% |

After Phase 1A execution:

| Area | Confidence |
|---|---:|
| Safe forms and controls | 80% |
| CRUD workflows | 64% |
| Configuration confidence | 70% |
| Overall product confidence | 63% |

Interpretation:

- Confidence increased because the current browser suite passed cleanly on staging.
- Confidence is not yet at the Phase 1 target of `85%` because many setup masters still have only page inventory coverage, not full CRUD proof.

## 6. Defects Found

No defects were found in this Phase 1A browser run.

## 7. Pending Phase 1 Work

The next Phase 1 work should expand browser CRUD coverage master by master:

1. Organization masters:
   - legal entities
   - locations
   - branches
   - business units
   - departments
   - cost centers
   - grades
   - designations
   - employment types

2. Policy masters:
   - leave types
   - leave policies
   - attendance policies
   - shifts
   - holiday calendars

3. Governance assignments:
   - leave policy assignments
   - attendance policy assignments
   - shift assignments
   - workflow template assignments
   - document requirements

4. Notification configuration:
   - notification templates
   - notification events
   - delivery diagnostics with fixture provider

5. Salary and payroll setup:
   - salary components
   - salary structures
   - structure versions
   - employee salary assignments
   - payroll calendars
   - pay groups
   - statutory registrations

## 8. Recommended Next Step

Continue with **Phase 1B: Organization Master CRUD Expansion**.

Target:

- Create, edit, filter, deactivate/archive, and verify dropdown use for every organization master.
- Prove dependent dropdown behavior in employee creation:
  - legal entity narrows branch
  - branch can align location
  - business unit narrows department
  - designation can align grade
  - cost center narrows by legal entity

Expected confidence after Phase 1B:

- Configuration confidence: `78%`
- CRUD confidence: `70%`
- Overall product confidence: `68%`

