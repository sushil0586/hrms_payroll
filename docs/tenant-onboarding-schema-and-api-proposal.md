# Tenant Onboarding Schema And API Proposal

## 1. Purpose

This document turns the platform-to-tenant onboarding flow into a concrete backend proposal.

It defines:

- which onboarding data should live on `Tenant`
- which onboarding records should be tracked separately
- how first-admin provisioning should work
- which APIs should exist first
- what should stay out of scope for version 1

This proposal is designed to fit the current backend shape without forcing a large rewrite of tenant, IAM, or policy models.

Implementation status note:

- the codebase now contains the first implementation slice of this proposal
- tenant onboarding fields now exist on `Tenant`
- `tenant_onboarding` app exists
- onboarding record, admin-contact, checklist, and event models exist
- platform staff APIs now support tenant creation, onboarding update, first-admin provisioning, handoff readiness, and activation
- onboarding baseline publication state is now linked to real tenant policy-pack adoption

---

## 2. Current Starting Point

The current tenant model already supports the basic shell:

- `Tenant.code`
- `Tenant.name`
- `Tenant.status`
- `Tenant.subscription_plan`
- `Tenant.seed_pack`
- `Tenant.primary_email`
- `Tenant.primary_phone`
- `Tenant.timezone`
- `Tenant.country_code`
- `Tenant.is_sandbox`
- `Tenant.go_live_at`

The current routing model already supports:

- `TenantDomain`

The current identity model already supports:

- global `User`
- tenant-contextual `TenantMembership`
- tenant roles and membership-role assignment

What is missing is a first-class onboarding record that explains:

- where the tenant is in the platform-led setup process
- who the first tenant admin is supposed to be
- whether baseline publication has happened
- whether handoff to the customer is complete

---

## 3. Version 1 Goal

Version 1 should end with:

- a tenant can be created by a platform-side operator
- onboarding state can be tracked explicitly
- the first tenant admin can be provisioned safely
- onboarding notes and handoff status are auditable
- policy baseline publication can be linked to onboarding completion

Current implementation state:

- completed:
  - tenant creation by a platform-side operator
  - explicit onboarding state tracking
  - first tenant admin provisioning
  - auditable onboarding notes, checklist markers, and events
  - linkage between onboarding baseline publication state and actual policy-pack adoption
- still pending:
  - richer partner-led or customer-led onboarding variants
  - broader tenant-side onboarding summary UI and checklist experience
  - deeper onboarding automation around imports and implementation project tracking

Version 1 should not try to become a full implementation project-management system.

---

## 4. Recommended Modeling Strategy

Use a hybrid model:

- keep core business identity on `Tenant`
- add lightweight onboarding state fields to `Tenant`
- add a dedicated `TenantOnboarding` record for process tracking
- add a dedicated `TenantOnboardingAdminContact` record for first-admin provisioning intent

This keeps:

- routing and tenant identity simple
- onboarding process explicit
- first-admin creation auditable

---

## 5. Recommended Changes To Existing Models

## 5.1 Tenant

Recommended additions to `apps.tenants.models.Tenant`:

- `onboarding_status`
  `models.CharField(max_length=30, choices=TenantOnboardingStatus.choices, default=TenantOnboardingStatus.DRAFT)`
- `onboarding_started_at`
  `models.DateTimeField(blank=True, null=True)`
- `onboarding_completed_at`
  `models.DateTimeField(blank=True, null=True)`
- `prepared_by_identifier`
  `models.CharField(max_length=120, blank=True)`
- `activated_by_identifier`
  `models.CharField(max_length=120, blank=True)`

Recommended enum values for `TenantOnboardingStatus`:

- `draft`
- `created`
- `prepared`
- `baseline_published`
- `handoff_ready`
- `active`

Why add status on `Tenant` directly:

- it makes tenant-level filtering and platform operations simple
- it avoids joining another table for every tenant list view
- it matches the importance of onboarding state in SaaS operations

Why not put every onboarding field on `Tenant`:

- notes, contacts, checklist progress, and handoff details belong in a separate process record

## 5.2 TenantDomain

No required schema change in version 1.

Optional future enhancement:

- domain verification status
- domain kind such as `workspace` versus `custom_domain`

That can wait.

---

## 6. New Model Set

Recommended app placement:

- `backend/apps/tenant_onboarding`

This should stay separate from:

- `tenants`
  which remains the tenant identity boundary
- `iam`
  which remains the user and membership boundary
- `platform_policies`
  which remains the baseline publication boundary

## 6.1 TenantOnboarding

Suggested model name:

- `tenant_onboarding.TenantOnboarding`

Purpose:

- tracks the platform-side onboarding process for one tenant

Suggested fields:

- `tenant`
  `models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name="onboarding_record")`
- `owner_mode`
  `models.CharField(max_length=30, choices=OnboardingOwnerMode.choices, default=OnboardingOwnerMode.COMBINED_PLATFORM_ADMIN)`
- `setup_style`
  `models.CharField(max_length=30, choices=OnboardingSetupStyle.choices, default=OnboardingSetupStyle.PLATFORM_ASSISTED)`
- `data_setup_style`
  `models.CharField(max_length=30, choices=DataSetupStyle.choices, default=DataSetupStyle.MANUAL)`
- `policy_control_style`
  `models.CharField(max_length=30, choices=PolicyControlStyle.choices, default=PolicyControlStyle.MIXED)`
- `country_context`
  `models.CharField(max_length=2, blank=True)`
- `industry_context`
  `models.CharField(max_length=80, blank=True)`
- `notes`
  `models.TextField(blank=True)`
- `internal_handoff_notes`
  `models.TextField(blank=True)`
- `customer_handoff_notes`
  `models.TextField(blank=True)`
- `first_login_verified_at`
  `models.DateTimeField(blank=True, null=True)`
- `baseline_published_at`
  `models.DateTimeField(blank=True, null=True)`
- `handoff_completed_at`
  `models.DateTimeField(blank=True, null=True)`

Recommended enums:

- `OnboardingOwnerMode`
  - `combined_platform_admin`
  - `split_platform_roles`
- `OnboardingSetupStyle`
  - `platform_assisted`
  - `shared`
  - `customer_led`
- `DataSetupStyle`
  - `manual`
  - `import_led`
  - `seeded_demo`
- `PolicyControlStyle`
  - `mostly_locked`
  - `mostly_delegated`
  - `mixed`

Why one-to-one with `Tenant`:

- version 1 only needs one live onboarding record per tenant
- if historical re-onboarding or relaunch tracking is needed later, history can be moved into log records

## 6.2 TenantOnboardingAdminContact

Suggested model name:

- `tenant_onboarding.TenantOnboardingAdminContact`

Purpose:

- stores the intended first tenant admin before or during actual user creation

Suggested fields:

- `onboarding`
  `models.ForeignKey(TenantOnboarding, on_delete=models.CASCADE, related_name="admin_contacts")`
- `full_name`
  `models.CharField(max_length=255)`
- `email`
  `models.EmailField()`
- `phone_number`
  `models.CharField(max_length=30, blank=True)`
- `job_title`
  `models.CharField(max_length=120, blank=True)`
- `is_primary`
  `models.BooleanField(default=False)`
- `provisioning_status`
  `models.CharField(max_length=20, choices=AdminProvisioningStatus.choices, default=AdminProvisioningStatus.PLANNED)`
- `user`
  `models.ForeignKey("iam.User", on_delete=models.SET_NULL, related_name="tenant_onboarding_contacts", blank=True, null=True)`
- `membership`
  `models.ForeignKey("iam.TenantMembership", on_delete=models.SET_NULL, related_name="tenant_onboarding_contacts", blank=True, null=True)`
- `invited_at`
  `models.DateTimeField(blank=True, null=True)`
- `first_login_at`
  `models.DateTimeField(blank=True, null=True)`
- `notes`
  `models.TextField(blank=True)`

Recommended enum values:

- `planned`
- `provisioned`
- `invited`
- `activated`
- `superseded`

Recommended constraints:

- unique primary contact per onboarding record should be enforced in service logic or conditional constraint if the database version supports it

Why not store first-admin intent only on `Tenant`:

- multiple candidate contacts may exist before final handoff
- the process needs separate provisioning state from general tenant metadata

## 6.3 TenantOnboardingChecklistItem

Suggested model name:

- `tenant_onboarding.TenantOnboardingChecklistItem`

Purpose:

- tracks operational completion markers without hardcoding all progress into booleans

Suggested fields:

- `onboarding`
  `models.ForeignKey(TenantOnboarding, on_delete=models.CASCADE, related_name="checklist_items")`
- `code`
  `models.CharField(max_length=80)`
- `label`
  `models.CharField(max_length=255)`
- `status`
  `models.CharField(max_length=20, choices=ChecklistStatus.choices, default=ChecklistStatus.PENDING)`
- `completed_at`
  `models.DateTimeField(blank=True, null=True)`
- `completed_by_identifier`
  `models.CharField(max_length=120, blank=True)`
- `notes`
  `models.TextField(blank=True)`
- `sort_order`
  `models.PositiveIntegerField(default=0)`

Recommended enum values:

- `pending`
- `completed`
- `skipped`

Recommended initial checklist codes:

- `tenant_created`
- `domain_mapped`
- `first_admin_provisioned`
- `baseline_published`
- `handoff_completed`

Why include this in version 1:

- it gives useful implementation visibility without a full onboarding workflow engine

## 6.4 TenantOnboardingEvent

Suggested model name:

- `tenant_onboarding.TenantOnboardingEvent`

Purpose:

- keeps an audit-friendly event stream for major onboarding actions

Suggested fields:

- `onboarding`
  `models.ForeignKey(TenantOnboarding, on_delete=models.CASCADE, related_name="events")`
- `event_type`
  `models.CharField(max_length=50)`
- `summary`
  `models.CharField(max_length=255, blank=True)`
- `payload`
  `models.JSONField(default=dict, blank=True)`
- `actor_identifier`
  `models.CharField(max_length=120, blank=True)`

Suggested event examples:

- `tenant_created`
- `tenant_prepared`
- `first_admin_provisioned`
- `baseline_previewed`
- `baseline_published`
- `handoff_marked_ready`
- `tenant_activated`

Why this helps:

- onboarding changes are high-value implementation events
- this gives traceability without relying only on `updated_at`

---

## 7. First-Admin Provisioning Strategy

Use a safe two-step approach:

1. capture intended admin contact
2. provision actual `User` and `TenantMembership`

Recommended creation flow:

1. platform operator creates `Tenant`
2. system creates `TenantOnboarding`
3. platform operator adds primary admin contact
4. provisioning action creates:
   - `iam.User`
   - `iam.TenantMembership`
   - primary membership-role assignment such as `tenant-admin` or `hr-admin`
5. contact row is updated with linked `user` and `membership`
6. first login verification marks the contact as activated

Important rule:

- do not create the first admin implicitly without a tracked onboarding contact record

Why:

- it makes ownership and invitation intent explicit
- it supports replacement if the first contact changes before go-live

---

## 8. Relationship To Platform Policy Publication

Onboarding and baseline publication should stay connected but separate.

Recommended linkage:

- onboarding tracks whether baseline publication happened
- `platform_policies.TenantPolicyPackAdoption` remains the source of truth for actual policy adoption
- onboarding stores summary timestamps and readiness state only

Recommended version 1 rule:

- `Tenant.onboarding_status` should not move to `baseline_published` until at least one required leave or attendance baseline adoption exists

---

## 9. Recommended API Surface

Version 1 platform-side endpoints:

- `POST /api/platform/tenants/`
- `GET /api/platform/tenants/`
- `GET /api/platform/tenants/{id}/`
- `PATCH /api/platform/tenants/{id}/`

- `GET /api/platform/tenants/{id}/onboarding/`
- `PATCH /api/platform/tenants/{id}/onboarding/`
- `POST /api/platform/tenants/{id}/onboarding/checklist-items/`
- `POST /api/platform/tenants/{id}/onboarding/mark-handoff-ready/`
- `POST /api/platform/tenants/{id}/onboarding/activate/`

- `POST /api/platform/tenants/{id}/admin-contacts/`
- `PATCH /api/platform/admin-contacts/{contact_id}/`
- `POST /api/platform/admin-contacts/{contact_id}/provision-user/`
- `POST /api/platform/admin-contacts/{contact_id}/mark-first-login-verified/`

Expected policy-publication interaction:

- `POST /api/platform-policy-packs/{id}/adopt-for-tenant/`

Version 1 tenant-side informational endpoints:

- `GET /api/admin/onboarding-summary/`
- `GET /api/admin/policy-source-summary/`

Why keep tenant-side endpoints read-focused first:

- customer users do not create their own tenant shell in this model
- most onboarding authority belongs to platform roles until handoff

---

## 10. Service-Layer Rules

Recommended version 1 service rules:

- creating a tenant should also create an onboarding record automatically
- only platform-authorized users can move onboarding states before activation
- only one primary admin contact should exist at a time
- provisioning should fail clearly if the target email is already in conflict
- activation should fail if:
  - first admin is not provisioned
  - baseline is not published
  - handoff is not marked ready
- baseline publication should update onboarding summary fields
- first login verification should update both contact status and onboarding readiness

---

## 11. Migration Plan

Recommended order:

### Migration 1

Add onboarding fields to `Tenant`:

- `onboarding_status`
- `onboarding_started_at`
- `onboarding_completed_at`
- `prepared_by_identifier`
- `activated_by_identifier`

Default existing tenants to:

- `onboarding_status = active` for already-live tenants if appropriate
- or `draft` if the environment is non-production and the rollout prefers manual cleanup

### Migration 2

Create new `tenant_onboarding` app models:

- `TenantOnboarding`
- `TenantOnboardingAdminContact`
- `TenantOnboardingChecklistItem`
- `TenantOnboardingEvent`

### Migration 3

Backfill `TenantOnboarding` records for existing tenants.

### Migration 4

Add optional seed checklist creation for newly created onboarding records.

---

## 12. Out Of Scope For Version 1

Do not include these yet:

- subscription billing lifecycle
- implementation project plans and tasks
- contract management
- domain DNS verification automation
- full customer self-serve signup
- partner-reseller onboarding orchestration
- multi-step invitation campaigns

---

## 13. Recommended First Implementation Scope

The smallest practical backend slice is:

1. add onboarding state fields to `Tenant`
2. create `TenantOnboarding`
3. create `TenantOnboardingAdminContact`
4. auto-create onboarding record when tenant is created
5. add provision-first-admin service action
6. expose platform endpoints for tenant create, onboarding update, and admin provisioning

This is enough to make platform-led onboarding real without blocking on the full policy-publication UI.

---

## 14. Final Recommendation

Keep tenant onboarding simple and explicit:

- `Tenant` stores platform-visible lifecycle state
- `TenantOnboarding` stores process context
- `TenantOnboardingAdminContact` stores first-admin intent and provisioning status
- policy-adoption records remain in the platform-policy layer

That gives a clean boundary between:

- tenant identity
- onboarding process
- policy baseline publication
- tenant operational ownership
