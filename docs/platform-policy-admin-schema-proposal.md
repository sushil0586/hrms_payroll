# Platform Policy Admin Schema Proposal

## 1. Purpose

This document converts the platform policy ownership design into a concrete first-version schema proposal.

It is intended to answer:

- which Django models should be added first
- which existing models should change first
- what migration sequence is safest
- what API and admin surfaces should be introduced
- what should remain out of scope for the first implementation

This proposal is intentionally narrow.

It focuses on:

- leave baseline ownership
- attendance baseline ownership
- tenant adoption traceability
- delegation and locking metadata

It does not attempt a full workflow or document-policy rollout in version 1.

Implementation status note:

- the codebase now contains the first implementation slice of this proposal
- `platform_policies` app exists
- tenant adoption records exist
- runtime cloning for leave and attendance baseline records exists
- source traceability and policy-governance metadata now exist on tenant runtime leave and attendance policy records
- detach flow now exists for clone-only leave and attendance policies

The remaining sections of this document should now be read as:

- partly implemented for leave and attendance baseline ownership
- still planned for broader workflow, document, and richer governance coverage

---

## 2. Current Baseline

The current backend already has:

- tenant-scoped runtime policy models in `leave_management`, `attendance`, and `workflows`
- tenant-scoped access and role structures in `iam`
- generic configuration publication support in `platform_config`

The current runtime policy anchors are:

- `leave_management.LeaveType`
- `leave_management.LeavePolicy`
- `leave_management.LeavePolicyAssignment`
- `attendance.AttendancePolicy`
- `attendance.AttendancePolicyAssignment`
- `attendance.Shift`
- `attendance.HolidayCalendar`

These should remain the records used by runtime engines.

The new schema should sit above them as a publishing and traceability layer.

---

## 3. Version 1 Scope

Version 1 should implement:

1. platform-level policy-pack models
2. tenant adoption models
3. source-traceability metadata on tenant runtime policy models
4. minimal permission strategy for platform tenant onboarding and policy administration
5. leave and attendance baseline publishing only

Current implementation state:

- completed:
  - platform-level policy-pack models
  - tenant adoption models
  - source-traceability metadata on leave and attendance runtime models
  - minimal platform staff API strategy for onboarding and policy publication
  - runtime cloning for leave and attendance baseline records
  - detach flow for clone-only leave and attendance policies
- still pending:
  - workflow baseline publication
  - document baseline publication
  - richer field-aware governance enforcement outside current leave and attendance policy edit flows

Version 1 should not implement:

- workflow baseline publication
- document baseline publication
- field-level edit enforcement in every admin API
- runtime policy resolution directly from platform tables
- cross-version auto-upgrade of tenant policies

---

## 4. Recommended App Placement

Create a dedicated app:

- `backend/apps/platform_policies`

Why a separate app:

- this is more specific than generic config
- it will hold publishable baseline artifacts, tenant adoption records, and delegation rules
- it avoids overloading `platform_config` with complex policy snapshots

`platform_config` should still be reused for generic configuration definitions and simple seeded values.

---

## 5. New Model Set

## 5.1 PlatformPolicyPack

Suggested model name:

- `platform_policies.PlatformPolicyPack`

Purpose:

- one publishable baseline pack for a policy family and rollout context

Suggested fields:

- `code`
  `models.SlugField(max_length=80, unique=True)`
- `name`
  `models.CharField(max_length=255)`
- `domain`
  `models.CharField(max_length=30, choices=PlatformPolicyDomain.choices)`
- `country_code`
  `models.CharField(max_length=2, blank=True)`
- `industry_tag`
  `models.CharField(max_length=80, blank=True)`
- `description`
  `models.TextField(blank=True)`
- `status`
  `models.CharField(max_length=20, choices=PlatformPolicyPackStatus.choices, default=PlatformPolicyPackStatus.DRAFT)`
- `version`
  `models.PositiveIntegerField(default=1)`
- `is_active`
  `models.BooleanField(default=True)`
- `published_at`
  `models.DateTimeField(blank=True, null=True)`
- `published_by_identifier`
  `models.CharField(max_length=120, blank=True)`

Recommended enums:

- `PlatformPolicyDomain`
  - `leave`
  - `attendance`
  - `workflow`
  - `document`
- `PlatformPolicyPackStatus`
  - `draft`
  - `published`
  - `archived`

Recommended constraints:

- unique on `code`
- index on `domain`, `status`, `is_active`

Reasoning:

- baseline packs should be globally identifiable across tenants
- version should be explicit because future republishing is expected

## 5.2 PlatformPolicyPackItem

Suggested model name:

- `platform_policies.PlatformPolicyPackItem`

Purpose:

- stores the actual baseline artifact snapshot inside a pack

Suggested fields:

- `policy_pack`
  `models.ForeignKey(PlatformPolicyPack, on_delete=models.CASCADE, related_name="items")`
- `item_type`
  `models.CharField(max_length=50, choices=PlatformPolicyItemType.choices)`
- `item_key`
  `models.CharField(max_length=120)`
- `name`
  `models.CharField(max_length=255, blank=True)`
- `payload`
  `models.JSONField(default=dict, blank=True)`
- `dependency_keys`
  `models.JSONField(default=list, blank=True)`
- `sort_order`
  `models.PositiveIntegerField(default=0)`
- `is_required`
  `models.BooleanField(default=True)`

Recommended enum values for `PlatformPolicyItemType` in v1:

- `leave_type`
- `leave_policy`
- `leave_policy_assignment_rule`
- `shift`
- `holiday_calendar`
- `attendance_policy`
- `attendance_policy_assignment_rule`

Recommended constraints:

- unique on `("policy_pack", "item_key")`
- index on `item_type`, `sort_order`

Reasoning:

- `payload` keeps the baseline portable without forcing every baseline concept into relational child tables immediately
- `dependency_keys` allows deterministic creation order during tenant adoption

## 5.3 PlatformPolicyDelegationRule

Suggested model name:

- `platform_policies.PlatformPolicyDelegationRule`

Purpose:

- defines which items or fields are tenant-editable versus locked

Suggested fields:

- `policy_pack`
  `models.ForeignKey(PlatformPolicyPack, on_delete=models.CASCADE, related_name="delegation_rules")`
- `item_key`
  `models.CharField(max_length=120, blank=True)`
- `delegation_mode`
  `models.CharField(max_length=40, choices=DelegationMode.choices)`
- `editable_paths`
  `models.JSONField(default=list, blank=True)`
- `locked_paths`
  `models.JSONField(default=list, blank=True)`
- `notes`
  `models.TextField(blank=True)`

Recommended enum values for `DelegationMode`:

- `locked`
- `tenant_editable`
- `tenant_editable_after_clone`
- `platform_approval_required`

Recommended constraints:

- allow one pack-level rule using blank `item_key`
- unique on `("policy_pack", "item_key")`

Reasoning:

- v1 can start with simple path lists and later evolve into richer JSONPath semantics

## 5.4 TenantPolicyPackAdoption

Suggested model name:

- `platform_policies.TenantPolicyPackAdoption`

Purpose:

- records that a tenant adopted a specific baseline pack

Suggested fields:

- `tenant`
  `models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="policy_pack_adoptions")`
- `policy_pack`
  `models.ForeignKey(PlatformPolicyPack, on_delete=models.CASCADE, related_name="tenant_adoptions")`
- `status`
  `models.CharField(max_length=20, choices=TenantPolicyAdoptionStatus.choices, default=TenantPolicyAdoptionStatus.DRAFT)`
- `adoption_mode`
  `models.CharField(max_length=40, choices=AdoptionMode.choices, default=AdoptionMode.CLONE_TO_TENANT_RECORDS)`
- `adopted_at`
  `models.DateTimeField(blank=True, null=True)`
- `adopted_by_identifier`
  `models.CharField(max_length=120, blank=True)`
- `superseded_by`
  `models.ForeignKey("self", on_delete=models.SET_NULL, related_name="superseded_adoptions", blank=True, null=True)`
- `notes`
  `models.TextField(blank=True)`

Recommended enum values:

- `TenantPolicyAdoptionStatus`
  - `draft`
  - `adopted`
  - `superseded`
- `AdoptionMode`
  - `baseline_only`
  - `baseline_plus_tenant_overrides`
  - `clone_to_tenant_records`

Recommended constraints:

- index on `tenant`, `policy_pack`, `status`

Reasoning:

- v1 should default to `clone_to_tenant_records` because the current runtime architecture already expects tenant-owned rows

## 5.5 TenantPolicyPackItemLink

Suggested model name:

- `platform_policies.TenantPolicyPackItemLink`

Purpose:

- links a baseline item to the tenant-owned runtime record created from it

Suggested fields:

- `tenant_adoption`
  `models.ForeignKey(TenantPolicyPackAdoption, on_delete=models.CASCADE, related_name="item_links")`
- `platform_item`
  `models.ForeignKey(PlatformPolicyPackItem, on_delete=models.CASCADE, related_name="tenant_links")`
- `target_model`
  `models.CharField(max_length=120)`
- `target_record_id`
  `models.UUIDField()`
- `source_version`
  `models.PositiveIntegerField(default=1)`
- `is_detached_from_source`
  `models.BooleanField(default=False)`

Recommended constraints:

- unique on `("tenant_adoption", "platform_item", "target_model", "target_record_id")`
- index on `target_model`, `target_record_id`

Reasoning:

- generic target references are enough in v1
- a generic foreign key is not necessary for the first implementation

---

## 6. Required Changes To Existing Models

## 6.1 LeaveType

Add baseline traceability because leave policies depend on leave types.

Suggested new fields on `leave_management.LeaveType`:

- `source_kind`
  `models.CharField(max_length=30, choices=PolicySourceKind.choices, default=PolicySourceKind.TENANT_NATIVE)`
- `source_pack_code`
  `models.CharField(max_length=80, blank=True)`
- `source_item_key`
  `models.CharField(max_length=120, blank=True)`
- `source_version`
  `models.PositiveIntegerField(default=1)`
- `managed_by_platform`
  `models.BooleanField(default=False)`
- `platform_locked_fields`
  `models.JSONField(default=list, blank=True)`

Why:

- a leave policy baseline is incomplete without baseline leave types

## 6.2 LeavePolicy

Suggested new fields on `leave_management.LeavePolicy`:

- `source_kind`
- `source_pack_code`
- `source_item_key`
- `source_version`
- `delegation_mode`
  `models.CharField(max_length=40, blank=True)`
- `managed_by_platform`
- `platform_locked_fields`

Why:

- this is the main runtime policy row that must preserve baseline traceability without changing runtime reads

## 6.3 AttendancePolicy

Suggested new fields on `attendance.AttendancePolicy`:

- `source_kind`
- `source_pack_code`
- `source_item_key`
- `source_version`
- `delegation_mode`
- `managed_by_platform`
- `platform_locked_fields`

Why:

- this is the attendance runtime anchor

## 6.4 Shift

Add the same baseline traceability fields to `attendance.Shift`.

Why:

- attendance policy baselines usually depend on seeded shifts

## 6.5 HolidayCalendar

Add the same baseline traceability fields to `attendance.HolidayCalendar`.

Why:

- many attendance baselines depend on an initial holiday calendar reference

## 6.6 WorkflowTemplate

Do not change in version 1.

Recommendation:

- leave workflow baseline ownership for version 2 after leave and attendance adoption is stable

---

## 7. Shared Enum Proposal

To avoid repeating inconsistent strings across apps, define a shared enum set in `platform_policies.models` or a small shared module.

Suggested enums:

- `PolicySourceKind`
  - `tenant_native`
  - `platform_pack`
  - `tenant_clone`
- `DelegationMode`
  - `locked`
  - `tenant_editable`
  - `tenant_editable_after_clone`
  - `platform_approval_required`

If import coupling becomes awkward, use plain string constants in v1 and normalize later.

---

## 8. Migration Sequence

Recommended migration order:

### Migration 1

Create `platform_policies` app and add:

- `PlatformPolicyPack`
- `PlatformPolicyPackItem`
- `PlatformPolicyDelegationRule`
- `TenantPolicyPackAdoption`
- `TenantPolicyPackItemLink`

### Migration 2

Add source-traceability fields to:

- `LeaveType`
- `LeavePolicy`
- `Shift`
- `HolidayCalendar`
- `AttendancePolicy`

Default all existing rows to:

- `source_kind = tenant_native`
- `managed_by_platform = False`
- blank `source_pack_code`
- blank `source_item_key`
- `source_version = 1`
- empty `platform_locked_fields`

### Migration 3

Seed initial platform permissions and optional internal role mappings for:

- `platform.policy.seed`
- `platform.policy.publish`
- `platform.policy.delegate`
- `platform.policy.lock`
- `platform.policy.clone_to_tenant`

### Migration 4

Add optional first platform baseline seed data for local/demo environments only.

This should be data migration or bootstrap-script based, not hardcoded in model defaults.

---

## 9. Adoption Flow Mapping To Existing Runtime Models

For v1, adoption should create real tenant rows.

## 9.1 Leave Pack Adoption

Recommended creation order:

1. create `LeaveType`
2. create `LeavePolicy`
3. create `LeavePolicyAssignment`

Suggested link behavior:

- `PlatformPolicyPackItem` of type `leave_type` maps to `LeaveType`
- `PlatformPolicyPackItem` of type `leave_policy` maps to `LeavePolicy`
- `PlatformPolicyPackItem` of type `leave_policy_assignment_rule` maps to `LeavePolicyAssignment`

## 9.2 Attendance Pack Adoption

Recommended creation order:

1. create `Shift`
2. create `HolidayCalendar`
3. create `AttendancePolicy`
4. create `AttendancePolicyAssignment`

Suggested link behavior:

- `shift` item maps to `Shift`
- `holiday_calendar` item maps to `HolidayCalendar`
- `attendance_policy` item maps to `AttendancePolicy`
- `attendance_policy_assignment_rule` item maps to `AttendancePolicyAssignment`

Important rule:

- assignments do not need source metadata fields in v1
- traceability for assignment rows can rely on `TenantPolicyPackItemLink`

---

## 10. Permission Strategy

The current `Role` model is tenant-scoped, so it is not a good place to store global platform roles directly.

Recommended version 1 strategy:

- keep platform-side onboarding responsibility configurable
- allow one SaaS-side admin to hold both tenant-preparation and policy-baseline responsibilities
- also allow those responsibilities to be split across `Platform Super Admin` and `Platform Policy Admin`
- keep `Platform Policy Admin` as an internal application-level access concept
- gate platform-policy endpoints using user-level checks, staff flags, or a dedicated internal-permission mechanism
- do not try to force platform roles into tenant `Role` rows yet

Practical implication:

- tenant creation and preparation can be guarded by platform permissions such as:
  - `platform.tenant.create`
  - `platform.tenant.prepare`
- baseline publication and delegation can be guarded by platform permissions such as:
  - `platform.policy.seed`
  - `platform.policy.publish`
  - `platform.policy.delegate`
  - `platform.policy.lock`
- the first implementation can protect endpoints through explicit permission checks outside tenant role assignment
- tenant-facing adopted records still use tenant roles and permissions as they do today

This keeps the schema change smaller and avoids mixing platform and tenant identity models prematurely.

Current implementation note:

- the code currently uses staff-only platform endpoints for the first implementation slice
- this is intentionally narrower than the longer-term platform-role model described elsewhere

---

## 11. API Surface Proposal

Version 1 recommended platform endpoints:

- `GET /api/platform-policy-packs/`
- `POST /api/platform-policy-packs/`
- `GET /api/platform-policy-packs/{id}/`
- `POST /api/platform-policy-packs/{id}/publish/`
- `GET /api/platform-policy-packs/{id}/preview-tenant-adoption/`
- `POST /api/platform-policy-packs/{id}/adopt-for-tenant/`

Recommended tenant-facing read endpoints:

- `GET /api/admin/policy-adoptions/`
- `GET /api/admin/policy-adoptions/{id}/`
- `GET /api/admin/effective-policy-sources/`

Version 1 recommended edit rule:

- if a tenant edits a platform-managed runtime row, service logic must inspect `managed_by_platform`, `delegation_mode`, and `platform_locked_fields`
- if the attempted field change is locked, reject the write with a clear validation error

---

## 12. Admin UI Proposal

Version 1 web surfaces should be minimal:

- platform pack list
- platform pack detail with items and delegation summary
- tenant adoption preview
- tenant adoption history
- tenant runtime policy badges showing:
  - platform managed
  - tenant editable
  - locked
  - detached

This should be enough to make the model understandable without building a full policy-authoring studio first.

---

## 13. Out Of Scope For Version 1

Leave these out to keep the first release practical:

- policy diff-and-merge between pack versions
- auto-sync tenant policies when platform baselines change
- workflow template publishing
- document rule publishing
- field-level UI hiding across every screen
- approval workflow around platform baseline publication itself

---

## 14. Recommended Implementation Order

1. create `platform_policies` models and migrations
2. add traceability fields to leave and attendance runtime models
3. add basic platform-policy pack CRUD and publish APIs
4. implement tenant adoption service for leave and attendance
5. add locked-field validation during tenant edits
6. add minimal admin UI visibility
7. document the first live adoption flow

---

## 15. Final Recommendation

Build version 1 around:

- `LeaveType`
- `LeavePolicy`
- `AttendancePolicy`
- `Shift`
- `HolidayCalendar`

Do not start with workflows.

Leave and attendance are already the most mature policy-heavy modules in the codebase, and they will deliver the clearest value from platform-owned baselines with tenant-level delegation.
