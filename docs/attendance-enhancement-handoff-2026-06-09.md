# Attendance Enhancement Handoff

Date: 2026-06-09

This document is the working handoff for the latest attendance-module enhancement pass. It is narrower than the broader [attendance-management-feature-summary.md](./attendance-management-feature-summary.md) and focuses on what was implemented in the most recent attendance and shift-governance stream, what needs migration locally, and where to resume next.

## What Was Completed

### 1. Attendance Policy Runtime Derivation

The attendance policy layer is no longer just static configuration. It now drives runtime derivation behavior.

Completed:
- structured `config_snapshot` support for attendance runtime behavior
- policy-driven derivation settings for:
  - automatic derivation on or off
  - automatic holiday marking
  - automatic weekly-off marking
  - missing-punch treatment
  - late handling mode
  - overtime derivation
- runtime evaluation wired into:
  - attendance record updates
  - attendance regularization approval flow

Main files:
- `backend/apps/attendance/services.py`
- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `web/src/app/hr-admin/attendance-policies/attendance-policy-form.tsx`
- `web/src/app/hr-admin/attendance-policies/form-values.ts`

### 2. Attendance Policy Preview

HR can now test how a draft attendance policy will behave before rollout.

Completed:
- preview endpoint for attendance policy simulation
- preview inputs for:
  - employee
  - attendance date
  - check-in and check-out
  - optional shift override
  - optional requested status
- preview output for:
  - derived status
  - resolved shift
  - matched holiday
  - work duration
  - overtime
  - late and early-exit minutes
  - currently resolved policy and assignment context

Main files:
- `backend/apps/attendance/services.py`
- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `backend/apps/common/api_urls.py`
- `web/src/app/api/hr-admin/attendance-policies/preview/route.ts`
- `web/src/app/hr-admin/attendance-policies/attendance-policy-form.tsx`

### 3. Attendance Policy Assignment Governance

Attendance policy assignment now has the same governance direction as leave policy assignment.

Completed:
- active overlap detection
- blocking of ambiguous same-scope same-priority active assignments
- assignment-resolution inspector for “which attendance policy resolves for this employee”
- governance visibility on the attendance policy assignment list
- live conflict feedback inside the assignment form

Main files:
- `backend/apps/attendance/services.py`
- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `backend/apps/common/api_urls.py`
- `web/src/app/hr-admin/attendance-policy-assignments/page.tsx`
- `web/src/app/hr-admin/attendance-policy-assignments/attendance-policy-assignment-form.tsx`
- `web/src/app/hr-admin/attendance-policy-assignments/attendance-policy-assignment-governance-panel.tsx`

### 4. Employee Shift Assignment Governance

Shift assignment is now a first-class operational surface, not just a model behind the scenes.

Completed:
- HR admin employee shift assignment workspace
- create and edit flows for employee shift assignments
- overlap detection by employee and date window
- blocking when overlapping assignments are both primary
- resolution inspector for:
  - which shift resolves for one employee on one date
  - which shift sequence resolves across a date range

Main files:
- `backend/apps/attendance/services.py`
- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `backend/apps/common/api_urls.py`
- `web/src/app/hr-admin/employee-shift-assignments/page.tsx`
- `web/src/app/hr-admin/employee-shift-assignments/employee-shift-assignment-form.tsx`
- `web/src/app/hr-admin/employee-shift-assignments/employee-shift-assignment-governance-panel.tsx`

### 5. Shift Runtime Modes

Shift resolution is no longer limited to one fixed date-window assignment.

Completed:
- support for employee shift assignment kinds:
  - `fixed`
  - `weekly_rotation`
  - `temporary_override`
- JSON-backed runtime config for rotation logic
- rotation support using:
  - anchor date
  - ordered steps
  - per-step span days
- runtime precedence behavior where temporary overrides outrank ordinary windows
- range preview support for shift resolution across multiple days

Main files:
- `backend/apps/attendance/models.py`
- `backend/apps/attendance/migrations/0003_employeeshiftassignment_runtime_config.py`
- `backend/apps/attendance/services.py`
- `web/src/app/hr-admin/employee-shift-assignments/form-values.ts`
- `web/src/app/hr-admin/employee-shift-assignments/employee-shift-assignment-form.tsx`

### 6. Shift Roster Templates

A reusable execution layer now exists above direct employee shift assignments.

Completed:
- `ShiftRosterTemplate` model
- template statuses:
  - `draft`
  - `published`
  - `locked`
- reusable roster patterns for:
  - fixed rollout
  - weekly rotation rollout
  - temporary override rollout
- HR admin roster template workspace
- create and edit flows for roster templates

Main files:
- `backend/apps/attendance/models.py`
- `backend/apps/attendance/migrations/0004_shiftrostertemplate.py`
- `backend/apps/attendance/admin.py`
- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `backend/apps/common/api_urls.py`
- `web/src/app/hr-admin/shift-roster-templates/page.tsx`
- `web/src/app/hr-admin/shift-roster-templates/shift-roster-template-form.tsx`

### 7. Roster Rollout Engine

Operations can now stamp reusable roster templates into employee shift assignments instead of manually creating every assignment.

Completed:
- rollout endpoint for roster templates
- dry-run preview before apply
- rollout targeting by:
  - selected employees
  - legal entity
  - branch
  - location
  - department
- primary-assignment rollout support
- conflict-aware skipping during rollout

Main files:
- `backend/apps/attendance/services.py`
- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `backend/apps/common/api_urls.py`
- `web/src/app/hr-admin/shift-roster-templates/shift-roster-rollout-panel.tsx`
- `web/src/app/api/hr-admin/shift-roster-templates/rollout/route.ts`

### 8. Roster Rollout Audit Trail

Real rollout execution now leaves an operational ledger behind.

Completed:
- `ShiftRosterRollout` audit model
- `ShiftRosterRolloutItem` per-employee result model
- persisted rollout scope snapshot
- persisted created and skipped counts
- persisted per-employee outcome and reason
- recent rollout history shown on the roster template page

Main files:
- `backend/apps/attendance/models.py`
- `backend/apps/attendance/migrations/0005_shiftrosterrollout.py`
- `backend/apps/attendance/services.py`
- `backend/apps/attendance/admin.py`
- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `backend/apps/common/api_urls.py`
- `web/src/lib/types.ts`
- `web/src/lib/api.ts`
- `web/src/app/hr-admin/shift-roster-templates/page.tsx`
- `web/src/app/hr-admin/shift-roster-templates/shift-roster-rollout-panel.tsx`

### 9. Attendance Operations Hub Updates

The attendance operations hub now reflects the richer shift-governance stack.

Completed:
- employee shift assignment workspace linked into attendance operations
- shift roster template workspace linked into attendance operations
- updated admin copy to reflect:
  - fixed shifts
  - weekly rotations
  - temporary overrides
  - reusable roster rollout

Main file:
- `web/src/app/hr-admin/attendance-operations/page.tsx`

## Backend Migrations Added

Run these locally before further testing:

- `attendance/0003_employeeshiftassignment_runtime_config.py`
- `attendance/0004_shiftrostertemplate.py`
- `attendance/0005_shiftrosterrollout.py`

Recommended local command:

```bash
cd backend
source .venv/bin/activate
python manage.py migrate
```

## Validation Completed

The following validations passed during this enhancement stream:

- `python3 -m py_compile backend/apps/attendance/models.py backend/apps/attendance/services.py backend/apps/attendance/admin.py backend/apps/common/api_serializers.py backend/apps/common/api_views.py backend/apps/common/api_urls.py`
- `corepack pnpm --dir web typecheck`
- `corepack pnpm --dir web build`

## Current Functional State

As of this handoff, the attendance and shift stack now supports:

- policy-driven attendance derivation
- attendance policy simulation before rollout
- governed attendance policy assignment precedence
- governed employee shift assignment precedence
- fixed shift resolution
- weekly rotation shift resolution
- temporary override resolution
- reusable roster templates
- previewable bulk roster rollout
- auditable applied roster rollout history

## Best Place To Resume Tomorrow

The strongest next continuation point is:

### Roster Template Versioning And Publish Governance

Recommended next work:
- add explicit template versioning
- support publish windows and effective publish states
- prevent rollout from stale draft versions when a newer published version exists
- show active published version vs draft working copy in the roster template UI

After that, the next operational layer would be:
- roster rollback or rollback preview
- per-rollout detail page
- bulk reopen or supersede logic for older employee shift assignments
- stronger attendance lock and payroll-cutoff interplay with roster changes

## Tomorrow Start Checklist

When resuming:

1. Run backend migrations.
2. Open `/hr-admin/shift-roster-templates`.
3. Review:
   - template statuses
   - rollout panel scope selectors
   - recent rollout history
4. Start the next pass with roster-template versioning and publish governance.
