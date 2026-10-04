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

Provider placeholders can move forward only through explicit provider setup. A connection must be
updated with adapter, sandbox adapter, channel, credential, callback, retry, certification profile,
and non-placeholder config before certification can pass. Mapping packs must be configured with
source schema, target schema, transform rules, validation rules, and approval evidence before they
can be activated. `ACTIVE` provider connections require passed certification and cannot use
placeholder config or `live_delivery_enabled=false`.

## UI Guidance

Use customer-facing labels:

- Will configure
- Needs input
- Skipped by subscription
- Customer editable
- Platform managed
- Platform locked

Avoid showing raw seeder names, JSON payloads, or model names outside an Audit/Evidence view.
