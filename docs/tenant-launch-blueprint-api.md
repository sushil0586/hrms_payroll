# Tenant Launch Blueprint API

## Purpose

These APIs let Platform Admin choose an India launch blueprint, collect required customer inputs,
preview the launch plan, and inspect audit evidence before any seeders run.

Launch apply is enabled only for certified safe modules. Runtime payroll, provider credentials,
employee-specific records, and production handoff actions remain gated until separately certified.

## List Blueprints

`GET /api/v1/platform/launch-blueprints/?country_code=IN&subscription_plan=starter`

Returns the available blueprint catalog. Each blueprint includes:

- `label`: user-facing template name.
- `summary`: plain-language purpose.
- `minimum_plan` and `compatible_plans`: subscription fit.
- `modules`: launch sections such as roles, org masters, workflows, payroll defaults.
- module ownership fields:
  - `ownership_mode`: platform/customer control model.
  - `post_onboarding_owner`: role expected to own the module after handoff.
  - `editable_by_roles`: roles allowed to change the seeded configuration.
  - `customer_editable_after_handoff`: whether customer roles can maintain it after handoff.
  - `post_apply_action`: operational next step after safe seeding.
- `input_schema`: UI-ready field definitions grouped by Company Details, Admin Contact,
  Work Schedule, Payroll Setup, Provider Setup, and Compliance Details.

The UI should render `input_schema` as a guided form and hide internal fields such as
`child_seeder` from non-technical users.

## Preview Tenant Launch

`POST /api/v1/platform/tenants/{tenant_id}/launch-preview/`

Example:

```json
{
  "blueprint_ref": "india-standard-sme",
  "blueprint_version": "v1",
  "input_payload": {
    "legal_name": "Acme India Private Limited",
    "registered_address": "Bengaluru, Karnataka",
    "primary_contact": "admin@example.com",
    "tenant_admin_contact": "admin@example.com",
    "legal_entity": "Acme India Private Limited",
    "default_branch": "Bengaluru",
    "default_department": "Operations",
    "work_week": "mon_fri",
    "holiday_region": "KA"
  },
  "idempotency_key": "preview-acme-standard-v1"
}
```

The response includes:

- `preview.can_apply`: true only when country, subscription, and required inputs pass.
- `preview.input_schema`: the same UI-ready field schema for all inputs involved in the selected blueprint.
- `preview.planned_modules`: sections that can be prepared for the tenant plan.
- `preview.skipped_modules`: sections skipped by subscription.
- `preview.missing_inputs`: customer/platform inputs needed before apply.
- per-module handoff metadata so Platform Admin, Tenant Admin, HR Admin, Payroll Admin,
  and Finance Admin responsibilities are visible before apply.
- `preview.governance_summary`: customer-editable modules, platform-controlled modules,
  owner counts, plan-gated modules, and repair/upgrade policy text.
- `launch_run`: auditable preview run with per-module `seeded_items`.

## Planned Item Statuses

Preview creates one `TenantLaunchSeededItem` per module:

- `planned`: ready when launch apply is enabled.
- `blocked`: missing inputs prevent this module from being prepared.
- `skipped`: module is unavailable on the tenant subscription.

These rows are for audit and UI checklist display only. They do not create tenant HR/payroll configuration.

## Apply Certified Safe Modules

`POST /api/v1/platform/tenants/{tenant_id}/launch-apply/`

Apply requires a successful preview where `preview.can_apply` is true.

By default, apply runs only certified safe modules from the latest apply-ready preview:

- `launch_checklist`
- `roles_users`
- `org_masters`
- `documents`
- `leave_attendance`
- `workflows`
- `notifications`
- `payroll_defaults` for Growth and Enterprise tenants only
- `provider_placeholders` for Growth and Enterprise tenants only

Optional request:

```json
{
  "requested_modules": ["launch_checklist", "roles_users"],
  "idempotency_key": "apply-acme-safe-v1"
}
```

If `requested_modules` includes uncertified modules such as `shift_attendance`, the API returns
`409 Conflict`.

Safe apply creates an `apply` launch run and item-level evidence. It does not create employees,
employee documents, document artifacts, employee leave balances, employee attendance records,
payroll periods, employee pay group assignments, employee salary assignments, statutory
registration numbers, statutory rate slabs, provider credentials, workflow instances, runtime
approval actions, payroll runs, or finance handoff runtime records.

Growth and Enterprise `payroll_defaults` creates only tenant-owned payroll setup records:
payroll calendar, default pay group, salary components, salary structure shell/version/lines,
and a DRAFT India statutory pack with DRAFT statutory component references for customer/legal
review.

Growth and Enterprise `provider_placeholders` creates BLOCKED provider connection placeholders
and DRAFT mapping packs for bank payout, accounting export, and statutory filing lanes. It does
not create real credential refs, active mappings, certification runs, provider jobs, provider
deliveries, launch rehearsals, or live submission capability.

After apply, the HR Admin payroll provider setup payload should report those same three BLOCKED
connections and three DRAFT mapping packs. It must not auto-create sandbox-ready provider defaults
when launch-created provider connections already exist.

Preview and apply evidence store `governance_summary`. Apply item evidence also stores each
module's `post_onboarding_owner`, `editable_by_roles`, `customer_editable_after_handoff`, and
`post_apply_action` so QA can prove who owns the seeded configuration after handoff.

Current governance behavior is evidence-first: after safe apply, changed inputs or blueprint choices
require a change reason. Repair and upgrade modes are planned to use the same metadata to prevent
silent overwrites of customer-owned seeded configuration.

Provider placeholders can move forward only through explicit provider setup. A connection must be
updated with adapter, sandbox adapter, channel, credential, callback, retry, certification profile,
and non-placeholder config before certification can pass. Mapping packs must be configured with
source schema, target schema, transform rules, validation rules, and approval evidence before they
can be activated. `ACTIVE` provider connections require passed certification and cannot use
placeholder config or `live_delivery_enabled=false`.

## Repair Launch Baseline

`POST /api/v1/platform/tenants/{tenant_id}/launch-drift-check/`

Drift check is read-only. It records an audited `verify` run comparing the current tenant records
with the latest launch baseline evidence. It reports:

- `modules_in_sync`
- `modules_missing_baseline`
- `modules_with_field_drift`
- `modules_needing_manual_review`
- `missing_ref_count`
- `field_drift_count`
- `unchecked_ref_count`
- `customer_owned_present_ref_count`
- module-level `drift_status` and `drift_action`
- module-level `field_drifts` for selected high-value modules

Drift check verifies structural baseline refs and selected field-level values for high-value launch
modules. Current field-level coverage includes Organization Masters, Document Requirements, Leave
and Attendance, and Approval Workflows. It does not overwrite records and does not claim deep
field-level equivalence for every seeded object.

`POST /api/v1/platform/tenants/{tenant_id}/launch-repair-preview/`

Repair preview compares the last successful safe apply evidence against current tenant records.
It reports:

- `can_repair`
- `repairable_modules`
- `missing_ref_count`
- `unchecked_ref_count`
- per-module `present_refs`, `missing_refs`, and `unchecked_refs`

`POST /api/v1/platform/tenants/{tenant_id}/launch-repair-apply/`

By default, repair apply runs only certified safe modules with missing baseline refs. It recreates
missing launch baseline records using the same child seeders and records `repair` run evidence.
Rerunning a module with no missing baseline refs requires `change_reason`, preventing silent
touches to customer-owned seeded configuration.

Example forced repair:

```json
{
  "requested_modules": ["org_masters"],
  "change_reason": "Platform admin reviewed customer-owned org masters before rerun.",
  "idempotency_key": "repair-acme-org-masters-reviewed"
}
```

## Upgrade Launch Blueprint

`POST /api/v1/platform/tenants/{tenant_id}/launch-upgrade-compare/`

Compares the current launch baseline against a target blueprint version, using the latest successful
safe apply or upgrade apply as the current baseline.

Example:

```json
{
  "target_blueprint_ref": "india-standard-sme",
  "target_blueprint_version": "v2",
  "idempotency_key": "compare-acme-india-standard-v2"
}
```

The response is an audited `upgrade` run with `result_payload.mode=compare`, including:

- `can_upgrade`
- `requires_change_reason`
- `blockers`
- `counts`
- `items` with `add`, `change`, `remove`, or `unchanged`
- `actionable_modules`

`POST /api/v1/platform/tenants/{tenant_id}/launch-upgrade-apply/`

Applies only safe actionable module changes from the target blueprint. Customer-owned module
changes require `change_reason`. Missing current baseline records block upgrade until launch
repair is run.

Example:

```json
{
  "target_blueprint_ref": "india-standard-sme",
  "target_blueprint_version": "v2",
  "change_reason": "Customer-owned document and workflow handoff guidance reviewed.",
  "idempotency_key": "upgrade-acme-india-standard-v2"
}
```

## Certification Report

`GET /api/v1/platform/tenants/{tenant_id}/launch-certification-report/`

Returns the current QA signoff state for production-style tenant launch onboarding.

The report returns:

- `status`: `pass` only when there are no blockers.
- `blockers`: launch items that must be fixed before onboarding signoff.
- `warnings`: non-blocking items such as newer blueprint versions or failed historical runs to review.
- `info`: intentionally non-blocking context, including modules gated by the tenant subscription.
- `checks`: per-gate evidence for blueprint selection, apply-ready preview, safe baseline apply,
  drift status, subscription scope, template version, customer handoff, and failed-run review.
- `latest_baseline_run_id` and `latest_drift_run_id`: evidence links for QA/audit traceability.

Certification fails if the tenant has no selected blueprint, no apply-ready preview, no successful
safe baseline, no current drift check, missing baseline refs, field drift, or missing customer
handoff. Unchecked refs are warnings for QA/manual evidence review because some launch modules do
not expose deterministic object refs. Subscription-gated modules are treated as scope information,
not blockers, so a Starter tenant can pass for Starter functionality while Growth/Enterprise modules
remain locked.

## UI Guidance

Use customer-facing labels:

- Will configure
- Needs input
- Skipped by subscription
- Customer editable
- Platform managed
- Platform locked
- Owner after handoff
- Change access
- Next action

Avoid showing raw seeder names, JSON payloads, or model names outside an Audit/Evidence view.
