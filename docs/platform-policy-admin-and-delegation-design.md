# Platform Policy Admin And Delegation Design

## 1. Purpose

This document turns the platform-policy-admin idea into an implementation design.

It answers:

- how a platform-level user should publish first-time policy baselines
- how platform-side onboarding responsibility can be held by one SaaS admin or split across multiple platform roles
- how tenants should adopt those baselines safely
- which parts of policy should remain platform-governed versus tenant-editable
- how this should fit the current backend model direction without breaking tenant-scoped runtime execution

This is a design target, not yet fully implemented behavior.

---

## 2. Problem To Solve

Today, the actual runtime policy records are tenant-scoped:

- `LeavePolicy`
- `LeavePolicyAssignment`
- `AttendancePolicy`
- `AttendancePolicyAssignment`
- `WorkflowTemplate`
- document and notification configuration surfaces

That is correct for operational execution.

But for implementation and onboarding, there is a missing owner above the tenant:

- someone should be able to publish the first safe baseline
- some policy dimensions should be delegated to the tenant
- some policy dimensions should remain locked or platform-governed

Without this layer:

- every tenant must be configured manually from scratch
- seeded defaults are hard to version and govern
- there is no formal distinction between baseline policy and tenant override
- protected policy areas cannot be expressed cleanly

---

## 3. Current Relevant Foundation

The codebase already has useful groundwork:

### IAM

- `User` is global
- `TenantMembership` is tenant-contextual
- tenant business roles are modeled in `Role`
- platform roles are currently a documentation expectation, not a complete runtime policy-ownership implementation

### Platform Configuration

The `platform_config` app already provides:

- `ConfigurationDefinition`
- `SeedPackTemplate`
- `SeedPackItem`
- `TenantConfiguration`
- `ScopedConfigurationOverride`
- `ConfigurationChangeLog`

This is a good base for:

- generic configuration definitions
- simple publishable values
- scoped overrides
- audit history

But this is not enough by itself for complex policy records such as:

- leave policy plus assignment sets
- attendance policy plus assignment sets
- workflow templates and their scoped rollouts

Those still need a concrete baseline-to-tenant policy adoption model.

---

## 4. Design Principles

The implementation should follow these rules:

- runtime execution must remain tenant-scoped
- platform users should publish baselines, not directly become runtime owners of tenant transactions
- tenants should be able to adopt a baseline as-is or clone it into tenant-owned policy records
- delegation should be explicit, auditable, and field-aware where needed
- policy inheritance must be understandable by operators
- platform-admin visibility should not automatically imply unrestricted HR-data access

---

## 5. Role Model

The platform-side model should stay configurable.

The SaaS operator responsible for onboarding may be:

- one combined platform admin holding both tenant-preparation and policy-baseline authority
- or multiple platform roles with those responsibilities split cleanly

Recommended platform role set:

- `Platform Super Admin`
- `Platform Policy Admin`

Recommended `Platform Policy Admin` responsibility:

- prepare baseline leave policies
- prepare baseline attendance policies
- prepare baseline workflow templates
- prepare baseline document-policy packs
- publish first-time tenant policy packs
- define what is delegated to tenant admins
- lock protected policy dimensions when required

This role is different from:

- `Platform Super Admin`
  SaaS-side tenant creation, tenant preparation, platform operations, and emergency ownership
- `Platform Support`
  Operational support and troubleshooting
- tenant roles such as `HR Admin` or `Tenant Admin`
  Customer-side operational ownership

Recommended onboarding handoff:

1. platform admin creates and prepares the tenant
2. platform policy admin publishes the starting baseline
3. tenant admin or HR admin takes over day-to-day tenant operations

Configurable deployment option:

- the same person may hold both platform roles
- the separation should be policy-driven, not hardcoded as a mandatory staffing model

Recommended permission examples:

- `platform.tenant.create`
- `platform.tenant.prepare`
- `platform.policy.seed`
- `platform.policy.publish`
- `platform.policy.delegate`
- `platform.policy.lock`
- `platform.policy.clone_to_tenant`

---

## 6. Ownership Model

The clean model is:

1. platform creates and prepares the tenant
2. platform creates baseline policy templates
3. platform publishes a tenant baseline pack
4. tenant adopts that baseline
5. tenant edits only delegated policy dimensions
6. runtime engines continue reading tenant-owned effective records

Important boundary:

- the effective records used by leave and attendance engines should still be tenant-scoped database rows
- platform-owned templates should not be queried directly by runtime engines in day-to-day policy resolution

That keeps runtime simple and safe.

---

## 7. Recommended Data Model

## 7.1 Keep Existing Generic Configuration Layer

Keep `platform_config` for:

- product-wide config definitions
- seed packs for generic settings
- tenant-level configuration values
- simple scoped overrides
- audit trail

This remains useful for:

- feature flags
- labels
- simple policy parameters
- publish metadata

## 7.2 Add A Dedicated Policy Baseline Layer

Recommended new models:

### `PlatformPolicyPack`

Purpose:

- represents one publishable baseline pack for a policy family

Suggested fields:

- `code`
- `name`
- `domain`
  Examples: `leave`, `attendance`, `workflow`, `document`
- `country_code`
- `industry_tag`
- `description`
- `status`
  Examples: `draft`, `published`, `archived`
- `version`
- `is_active`
- `published_at`
- `published_by_identifier`

### `PlatformPolicyPackItem`

Purpose:

- stores the concrete artifacts inside a pack

Suggested fields:

- `policy_pack`
- `item_type`
  Examples:
  - `leave_type`
  - `leave_policy`
  - `leave_policy_assignment_rule`
  - `attendance_policy`
  - `attendance_policy_assignment_rule`
  - `workflow_template`
  - `document_rule`
- `item_key`
- `payload`
  JSON snapshot for the baseline artifact
- `dependency_keys`
  Ordered references to related items in the same pack
- `sort_order`

### `PlatformPolicyDelegationRule`

Purpose:

- defines what the tenant may or may not change after adoption

Suggested fields:

- `policy_pack`
- `item_key`
  Nullable if rule applies to the whole pack or family
- `delegation_mode`
  Examples:
  - `locked`
  - `tenant_editable`
  - `tenant_editable_after_clone`
  - `platform_approval_required`
- `editable_paths`
  JSON paths or field keys the tenant can edit
- `locked_paths`
  JSON paths or field keys protected from tenant editing
- `notes`

## 7.3 Add A Tenant Adoption Layer

### `TenantPolicyPackAdoption`

Purpose:

- records that a tenant adopted a specific platform baseline

Suggested fields:

- `tenant`
- `policy_pack`
- `status`
  Examples: `draft`, `adopted`, `superseded`
- `adopted_at`
- `adopted_by_identifier`
- `adoption_mode`
  Examples:
  - `baseline_only`
  - `baseline_plus_tenant_overrides`
  - `clone_to_tenant_records`
- `notes`

### `TenantPolicyPackItemLink`

Purpose:

- connects a platform baseline item to the actual tenant-owned runtime record created from it

Suggested fields:

- `tenant_adoption`
- `platform_item`
- `target_model`
  Example values:
  - `leave_management.LeavePolicy`
  - `leave_management.LeaveType`
  - `attendance.AttendancePolicy`
  - `workflows.WorkflowTemplate`
- `target_record_id`
- `source_version`
- `is_detached_from_source`

This gives traceability without changing runtime ownership.

---

## 8. Recommended Changes To Existing Runtime Models

Instead of replacing tenant-scoped policy records, add source-traceability metadata.

Recommended additions on tenant runtime policy models such as `LeavePolicy`, `AttendancePolicy`, and possibly `WorkflowTemplate`:

- `source_kind`
  Examples:
  - `tenant_native`
  - `platform_pack`
  - `tenant_clone`
- `source_pack_code`
- `source_item_key`
- `source_version`
- `delegation_mode`
- `managed_by_platform`
- `platform_locked_fields`
  JSON array or JSON object

This makes it possible to:

- know whether a policy came from a platform baseline
- know which baseline version it came from
- know whether the tenant can edit it directly

Recommended constraint:

- runtime services should still ignore platform ownership metadata during rule evaluation
- those services should only read the resolved tenant record values

---

## 9. How Adoption Should Work

Recommended first-time tenant setup flow:

1. platform policy admin selects a baseline pack
2. system previews what will be created for the tenant
3. platform policy admin publishes the pack to the tenant
4. system creates tenant runtime records
5. system creates traceability links from platform items to tenant records
6. system applies delegation rules
7. tenant admin sees which policies are:
   - baseline-managed
   - editable
   - locked
   - cloned and detached

Recommended tenant actions after adoption:

- accept baseline without change
- edit delegated fields in place
- clone a policy into tenant-owned variant
- request platform change for locked policy areas

---

## 10. Delegation Granularity

Delegation should work at more than one level.

### Pack-Level

Examples:

- tenant can manage attendance locally
- tenant cannot manage protected workflow baselines locally

### Artifact-Level

Examples:

- tenant can edit one leave policy but not another
- tenant can edit one attendance policy family for a branch-specific rollout

### Field-Level

Examples:

- tenant can edit:
  - `notice_days_required`
  - `allow_backdated_application`
  - `late_mark_after_minutes`
  - `overtime_threshold_minutes`
- tenant cannot edit:
  - protected approval topology
  - locked seed references
  - platform-governed statutory defaults

Field-level control is especially important for:

- leave policy thresholds
- attendance thresholds
- workflow routes
- document compliance settings

---

## 11. Where To Reuse `platform_config`

Use `platform_config` for:

- metadata about what is configurable
- simple baseline values
- tenant-level publish state for generic settings
- scoped overrides on simple config definitions
- audit trail for configuration changes

Do not force all complex runtime policies into generic JSON config records.

For complex policy families, use:

- dedicated baseline pack models
- dedicated tenant runtime records
- traceability links between them

This hybrid approach is more maintainable than trying to represent every leave or attendance rule as one generic config blob.

---

## 12. Recommended Build Order

### Phase A: Role And Permission Foundation

- add `Platform Policy Admin` permission strategy
- separate platform policy authority from tenant HR operations
- define API guardrails for platform policy actions

### Phase B: Baseline Pack Models

- add `PlatformPolicyPack`
- add `PlatformPolicyPackItem`
- add `PlatformPolicyDelegationRule`

### Phase C: Tenant Adoption Flow

- add `TenantPolicyPackAdoption`
- add `TenantPolicyPackItemLink`
- implement baseline publish-to-tenant flow

### Phase D: Runtime Traceability

- add source metadata to `LeavePolicy`, `AttendancePolicy`, and selected workflow/document runtime models
- keep runtime evaluation unchanged except for reading tenant-owned records

### Phase E: Tenant Editing Rules

- block edits to locked fields
- allow edits to delegated fields
- support clone-and-detach flow for tenant-owned divergence

### Phase F: Admin UX

- platform policy pack workspace
- tenant baseline adoption review
- effective-policy source visibility
- locked versus editable field hints

---

## 13. Recommended First Implementation Scope

The smallest practical first implementation is:

1. `Platform Policy Admin` role and permission concept
2. baseline pack models for:
   - leave policy family
   - attendance policy family
3. tenant adoption model
4. source-traceability fields on:
   - `LeavePolicy`
   - `AttendancePolicy`
5. no runtime-engine rewrite yet

That gives:

- real onboarding ownership
- real baseline traceability
- no unnecessary disruption to current policy execution work

---

## 14. Risks To Avoid

- do not make platform admins implicit tenant HR operators
- do not make runtime engines resolve rules from both platform and tenant tables at request time
- do not hide delegation logic in ad hoc JSON without clear metadata
- do not let tenant overrides silently detach from baseline without audit trace
- do not introduce field locking without clear UI feedback

---

## 15. Recommended Next Step

Before implementation begins, create one more concrete document:

- model-by-model schema proposal for the first version

That follow-up should include:

- exact Django model names
- exact fields
- migration impact
- which existing runtime models get source-traceability columns first
- which policy family to onboard first:
  - leave
  - attendance
  - workflows

Recommended first family:

- leave and attendance

They are already central to Phase 2 policy execution and will benefit most from baseline ownership and delegation clarity.
