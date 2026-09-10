# Platform Admin Onboarding Functional Spec

This document defines what the Platform Admin can do today, what each function must prove, and how we should validate onboarding five new tenants end to end.

## 1. Purpose

Platform Admin is the SaaS-side operator persona responsible for creating and preparing customer tenants before handoff to the customer's tenant admin or HR admin.

This role is not a substitute for a customer's HR team. It should not perform day-to-day employee, leave, attendance, payroll, or lifecycle operations inside a tenant unless explicitly provisioned with a tenant membership and tenant role.

## 2. Current Implementation Status

Current state:

- Backend/API platform-admin onboarding capability exists.
- Backend/API platform policy-pack publication and tenant adoption capability exists.
- `platform.admin` is seeded as a staff/bootstrap user.
- A dedicated `/platform-admin` Next.js workspace now exists for browser-led tenant onboarding.
- Platform Admin operations should be validated through the browser first, with API tests used as contract coverage underneath.

Primary implementation references:

- Tenant onboarding models: `backend/apps/tenant_onboarding/models.py`
- Tenant onboarding APIs: `backend/apps/tenant_onboarding/api_views.py`
- Tenant onboarding serializers: `backend/apps/tenant_onboarding/api_serializers.py`
- Tenant onboarding services: `backend/apps/tenant_onboarding/services.py`
- Platform policy models: `backend/apps/platform_policies/models.py`
- Platform policy APIs: `backend/apps/platform_policies/api_views.py`
- Platform Admin workspace: `web/src/app/platform-admin/page.tsx`
- Platform Admin browser console: `web/src/app/platform-admin/platform-admin-console.tsx`
- Platform Admin browser test: `web/tests/e2e/production-platform-admin-onboarding-flows.spec.ts`
- Current backend tests: `backend/tests/test_tenant_onboarding_api.py`

## 3. Platform Admin Identity and Access

Seeded staging identity:

- Username: `platform.admin`
- Password: `Password@123`
- Expected backend condition: authenticated user with `is_staff=true`

Authorization rule:

- Platform onboarding APIs require `IsPlatformStaff`.
- `IsPlatformStaff` allows authenticated staff users only.
- Tenant roles such as `hr-admin`, `tenant-admin`, `manager`, and `employee` do not automatically grant platform-admin API access.

Critical expectations:

- Unauthenticated requests must fail.
- Non-staff authenticated users must fail.
- Staff users can call platform onboarding and policy-pack APIs.
- Platform Admin actions must write onboarding state and event evidence.

## 4. Platform Admin Capability Map

### 4.1 Tenant List

Endpoint:

- `GET /api/v1/platform/tenants/`

Purpose:

- Lists all tenants visible to platform staff.

Expected returned fields per tenant:

- `id`
- `code`
- `name`
- `legal_name`
- `status`
- `onboarding_status`
- `subscription_plan`
- `seed_pack`
- `primary_email`
- `primary_phone`
- `timezone`
- `country_code`
- `is_sandbox`
- `go_live_at`
- `primary_domain`
- `created_at`
- `updated_at`

Acceptance checks:

- Only staff users can list tenants.
- Result includes every created tenant.
- Tenants are ordered consistently by name.
- Primary domain is resolved from `TenantDomain`.
- Response does not leak employee payroll data.

### 4.2 Tenant Creation

Endpoint:

- `POST /api/v1/platform/tenants/`

Purpose:

- Creates a new customer tenant and starts onboarding.

Request fields:

- `code`: required slug, unique customer identifier.
- `name`: required display name.
- `legal_name`: optional legal name.
- `status`: optional, defaults to `draft`.
- `subscription_plan`: optional, defaults to `starter`.
- `seed_pack`: optional, defaults to `standard_office`.
- `primary_email`: optional.
- `primary_phone`: optional.
- `timezone`: optional, defaults to `UTC`.
- `country_code`: optional, defaults to `IN`.
- `is_sandbox`: optional, defaults to `false`.
- `primary_domain`: optional tenant domain.

System behavior:

- Creates `Tenant`.
- Sets `tenant.onboarding_status=created`.
- Sets `tenant.onboarding_started_at`.
- Sets `tenant.prepared_by_identifier` from platform actor.
- Creates primary `TenantDomain` when `primary_domain` is provided.
- Creates or uses the one-to-one `TenantOnboarding` record.
- Marks checklist item `tenant_created` as completed.
- Marks checklist item `domain_mapped` as completed when a domain is provided.
- Writes onboarding event `tenant_created`.

Acceptance checks:

- Created tenant appears in tenant list.
- Tenant detail returns the same values.
- Domain is lower-cased and marked primary.
- `tenant_created` checklist item is completed.
- `domain_mapped` is completed only when domain exists.
- Duplicate `code` should be rejected by persistence constraints or serializer/database validation.
- Invalid email should be rejected.
- Invalid status/plan/seed pack should be rejected.
- Non-staff user cannot create tenant.

### 4.3 Tenant Detail

Endpoint:

- `GET /api/v1/platform/tenants/{tenant_id}/`

Purpose:

- Reads a single tenant setup record.

Acceptance checks:

- Existing tenant returns full detail.
- Missing tenant returns `404`.
- Non-staff user cannot read tenant detail.
- Primary domain reflects the active primary domain.

### 4.4 Tenant Update

Endpoint:

- `PATCH /api/v1/platform/tenants/{tenant_id}/`

Purpose:

- Updates platform-visible tenant setup metadata.

Editable fields:

- `code`
- `name`
- `legal_name`
- `status`
- `subscription_plan`
- `seed_pack`
- `primary_email`
- `primary_phone`
- `timezone`
- `country_code`
- `is_sandbox`
- `primary_domain`

System behavior:

- Updates simple tenant fields.
- If `primary_domain` changes, old primary domain is unset.
- New primary domain is created or updated and marked primary.
- Marks `domain_mapped` checklist item completed when domain is set.
- Writes onboarding event `tenant_updated` with changed fields.

Acceptance checks:

- Patch returns updated tenant detail.
- Old primary domain is no longer primary after change.
- New primary domain is visible in detail.
- Event stream includes `tenant_updated`.
- Empty or omitted fields are handled according to serializer rules.
- Missing tenant returns `404`.
- Non-staff user cannot patch tenant.

### 4.5 Onboarding Detail

Endpoint:

- `GET /api/v1/platform/tenants/{tenant_id}/onboarding/`

Purpose:

- Reads the onboarding control record for a tenant.

Expected returned fields:

- `id`
- `tenant_id`
- `tenant_code`
- `tenant_name`
- `tenant_status`
- `tenant_onboarding_status`
- `owner_mode`
- `setup_style`
- `data_setup_style`
- `policy_control_style`
- `country_context`
- `industry_context`
- `notes`
- `internal_handoff_notes`
- `customer_handoff_notes`
- `first_login_verified_at`
- `baseline_published_at`
- `handoff_completed_at`
- `admin_contacts`
- `checklist_items`
- `recent_events`

Acceptance checks:

- New tenants have onboarding detail.
- Checklist items are returned in configured order.
- Admin contacts are ordered with primary first.
- Recent events are capped and newest first.
- Missing tenant returns `404`.
- Non-staff user cannot read onboarding detail.

### 4.6 Onboarding Metadata Update

Endpoint:

- `PATCH /api/v1/platform/tenants/{tenant_id}/onboarding/`

Purpose:

- Captures how this tenant will be onboarded and governed.

Editable fields:

- `owner_mode`: `combined_platform_admin` or `split_platform_roles`
- `setup_style`: `platform_assisted`, `shared`, or `customer_led`
- `data_setup_style`: `manual`, `import_led`, or `seeded_demo`
- `policy_control_style`: `mostly_locked`, `mostly_delegated`, or `mixed`
- `country_context`
- `industry_context`
- `notes`
- `internal_handoff_notes`
- `customer_handoff_notes`

System behavior:

- Updates onboarding fields.
- If tenant onboarding status is `created`, moves it to `prepared`.
- Writes onboarding event `tenant_prepared`.

Acceptance checks:

- Valid enum values save.
- Invalid enum values are rejected.
- Created tenant moves to `prepared`.
- Already later-stage tenant should not move backwards.
- Notes remain tenant-onboarding scoped.
- Event contains changed field names.
- Non-staff user cannot update onboarding metadata.

### 4.7 Admin Contact Creation

Endpoint:

- `POST /api/v1/platform/tenants/{tenant_id}/admin-contacts/`

Purpose:

- Records the intended first admin or additional admin contact before provisioning login.

Request fields:

- `full_name`: required.
- `email`: required.
- `phone_number`: optional.
- `job_title`: optional.
- `is_primary`: optional, defaults to `true`.
- `notes`: optional.

System behavior:

- Creates `TenantOnboardingAdminContact`.
- If new contact is primary, existing primary contacts are unset.
- Lower-cases email.
- Sets `provisioning_status=planned`.
- Writes onboarding event `admin_contact_added`.

Acceptance checks:

- Contact appears in onboarding detail.
- Primary contact appears before non-primary contacts.
- Only one primary contact should remain primary.
- Email is normalized to lower-case.
- Invalid email is rejected.
- Missing tenant returns `404`.
- Non-staff user cannot add contacts.

### 4.8 First Tenant Admin Provisioning

Endpoint:

- `POST /api/v1/platform/admin-contacts/{contact_id}/provision-user/`

Purpose:

- Creates the first customer-side admin login and tenant membership from an onboarding contact.

Request fields:

- `username`: required.
- `role_code`: optional, defaults to `hr-admin`.
- `role_name`: optional.
- `password`: optional. If omitted, generated.
- `must_change_password`: optional, defaults to `true`.
- `is_user_active`: optional, defaults to `true`.
- `membership_status`: optional, defaults to `active`.

System behavior:

- Rejects already-provisioned contacts.
- Rejects duplicate username.
- Rejects duplicate email.
- Creates `User`.
- Creates active/default `TenantMembership`.
- Ensures tenant role exists for `role_code`.
- Creates primary `MembershipRole`.
- Links user and membership back to contact.
- Sets contact `provisioning_status=provisioned`.
- Marks checklist item `first_admin_provisioned` completed.
- Writes onboarding event `first_admin_provisioned`.
- Returns generated password only when password was not explicitly provided.

Acceptance checks:

- Provisioned user can login.
- Session payload shows default tenant membership.
- HR admin role should give HR Admin workspace access.
- Tenant admin role should give Tenant Admin workspace access.
- Contact cannot be provisioned twice.
- Duplicate username is rejected.
- Duplicate contact email/user email is rejected.
- Generated password is non-empty when omitted.
- Generated password is blank in response when explicit password is supplied.
- `must_change_password` is saved.
- Non-staff user cannot provision contacts.

### 4.9 Platform Policy Pack List and Creation

Endpoints:

- `GET /api/v1/platform-policy-packs/`
- `POST /api/v1/platform-policy-packs/`

Purpose:

- Lets platform staff manage reusable baseline packs for tenant onboarding.

Policy pack fields:

- `code`
- `name`
- `domain`: `leave`, `attendance`, `workflow`, or `document`
- `country_code`
- `industry_tag`
- `description`
- `status`: `draft`, `published`, or `archived`
- `version`
- `is_active`

Acceptance checks:

- Staff can list policy packs.
- Staff can create a draft or directly published pack when allowed by serializer.
- Duplicate pack codes are rejected by uniqueness.
- Invalid domain/status is rejected.
- Non-staff user cannot list or create packs.

### 4.10 Platform Policy Pack Publication

Endpoint:

- `POST /api/v1/platform-policy-packs/{policy_pack_id}/publish/`

Purpose:

- Marks a platform baseline pack as published.

System behavior:

- Sets status to `published`.
- Sets `published_at`.
- Sets `published_by_identifier`.

Acceptance checks:

- Published pack is visible as `published`.
- Published timestamp is present.
- Actor identifier is present.
- Missing policy pack returns `404`.
- Non-staff user cannot publish packs.

### 4.11 Platform Policy Pack Adoption for Tenant

Endpoint:

- `POST /api/v1/platform-policy-packs/{policy_pack_id}/adopt-for-tenant/`

Purpose:

- Applies a platform baseline into a tenant runtime.

Request fields:

- `tenant_id`: required.
- `adoption_mode`: optional, defaults to `clone_to_tenant_records`.
- `notes`: optional.
- `status`: accepted as `adopted`.

Supported adoption modes:

- `baseline_only`
- `baseline_plus_tenant_overrides`
- `clone_to_tenant_records`

Implemented runtime clone coverage:

- Leave type
- Leave policy
- Shift
- Holiday calendar
- Holiday
- Attendance policy
- Attendance assignment rule where pack data provides it
- Leave assignment rule where pack data provides it

Governance metadata created on cloned runtime records:

- `source_kind=platform_pack`
- `source_pack_code`
- `source_item_key`
- `source_version`
- `managed_by_platform`
- `delegation_mode`
- `platform_locked_fields`

System behavior:

- Creates `TenantPolicyPackAdoption`.
- Creates `TenantPolicyPackItemLink` records for cloned runtime items.
- Moves tenant onboarding toward `baseline_published`.
- Sets onboarding `baseline_published_at`.
- Writes onboarding event `baseline_published`.

Acceptance checks:

- Adoption creates tenant runtime records from pack items.
- Dependencies resolve correctly, such as leave policy to leave type and attendance policy to shift/calendar.
- Governance metadata is visible to tenant HR admin APIs.
- Locked fields cannot be edited by tenant HR admin.
- Clone-required items expose detach guidance.
- Missing tenant is rejected.
- Missing policy pack returns `404`.
- Non-staff user cannot adopt packs.

### 4.12 Mark Baseline Published

Endpoint:

- `POST /api/v1/platform/tenants/{tenant_id}/onboarding/mark-baseline-published/`

Purpose:

- Confirms that tenant baseline policy setup has been published.

System behavior:

- Requires at least one adopted policy pack.
- Uses latest adopted policy pack adoption as evidence.
- Sets onboarding `baseline_published_at` if not already set.
- Sets tenant onboarding status to `baseline_published`.

Acceptance checks:

- Fails when no adopted policy pack exists.
- Succeeds after policy-pack adoption.
- Does not clear previous publication timestamp.
- Non-staff user cannot mark baseline published.

### 4.13 Mark Handoff Ready

Endpoint:

- `POST /api/v1/platform/tenants/{tenant_id}/onboarding/mark-handoff-ready/`

Purpose:

- Confirms that the customer admin handoff is ready.

System behavior:

- Requires `baseline_published_at`.
- Requires a primary admin contact with provisioned membership.
- Sets onboarding `handoff_completed_at`.
- Sets tenant onboarding status to `handoff_ready`.
- Marks checklist item `handoff_completed` completed.
- Writes onboarding event `handoff_marked_ready`.

Acceptance checks:

- Fails before baseline publication.
- Fails without primary admin contact.
- Fails if primary admin contact is not provisioned.
- Succeeds after baseline plus first admin provisioning.
- Event and checklist evidence are present.
- Non-staff user cannot mark handoff ready.

### 4.14 Tenant Activation

Endpoint:

- `POST /api/v1/platform/tenants/{tenant_id}/onboarding/activate/`

Purpose:

- Moves tenant from onboarding into active state.

System behavior:

- Requires tenant onboarding status `handoff_ready`.
- Requires primary admin contact provisioning status `provisioned`, `invited`, or `activated`.
- Sets tenant `status=active`.
- Sets tenant `onboarding_status=active`.
- Sets `onboarding_completed_at`.
- Sets `activated_by_identifier`.
- Writes onboarding event `tenant_activated`.

Acceptance checks:

- Fails before handoff ready.
- Fails without provisioned primary admin.
- Succeeds after full onboarding.
- Activated tenant appears active in tenant list/detail.
- First admin can login and reach their workspace.
- Non-staff user cannot activate tenant.

## 5. Platform Admin Guardrails

Every Platform Admin operation must prove:

- Tenant isolation: records created for Tenant A do not appear under Tenant B.
- Staff-only access: tenant users cannot call platform endpoints.
- Auditability: state-changing actions write onboarding event evidence.
- No hidden demo fallback: staging must use live API data.
- No hardcoding: test tenants, users, domains, and passwords must be generated or configured.
- Idempotence boundaries: operations that should not repeat, such as first-admin provisioning, must reject second execution.
- Activation sequencing: tenant activation cannot skip baseline and handoff gates.
- Role handoff: Platform Admin creates tenant admin capability, but tenant admin/HR admin executes tenant operations after handoff.

## 6. Five-Tenant Onboarding Test Matrix

The five-tenant test should use disposable staging tenants with unique timestamped codes. Suggested logical profiles:

| Tenant | Setup Style | Data Setup | Policy Control | First Admin Role | Validation Purpose |
|---|---|---|---|---|---|
| Tenant 1 | `platform_assisted` | `manual` | `mixed` | `hr-admin` | Standard implementation-led tenant |
| Tenant 2 | `platform_assisted` | `seeded_demo` | `mostly_locked` | `hr-admin` | Platform-governed baseline tenant |
| Tenant 3 | `shared` | `import_led` | `mostly_delegated` | `tenant-admin` | Customer/shared onboarding and tenant-admin handoff |
| Tenant 4 | `customer_led` | `manual` | `mixed` | `hr-admin` | Customer-led onboarding metadata path |
| Tenant 5 | `platform_assisted` | `manual` | `mostly_delegated` | `hr-admin` | Repeatability and cross-tenant isolation proof |

Each tenant must have:

- Unique `code`
- Unique `name`
- Unique `primary_domain`
- Unique `primary_email`
- Unique admin contact email
- Unique first admin username
- Explicit password for browser login validation
- One adopted policy pack
- Onboarding events checked at each stage

Suggested code prefix:

- `qa-pa-YYYYMMDD-HHMM-01`
- `qa-pa-YYYYMMDD-HHMM-02`
- `qa-pa-YYYYMMDD-HHMM-03`
- `qa-pa-YYYYMMDD-HHMM-04`
- `qa-pa-YYYYMMDD-HHMM-05`

Suggested admin username pattern:

- `qa.pa.tenant01.admin.YYYYMMDDHHMM`

Suggested admin email pattern:

- `qa.pa.tenant01.admin+YYYYMMDDHHMM@example.test`

## 7. End-to-End Onboarding Flow Per Tenant

For each of the five tenants, automation must execute:

1. Login/authenticate as `platform.admin`.
2. Create tenant.
3. Confirm tenant appears in platform tenant list.
4. Read tenant detail.
5. Patch tenant metadata and primary domain.
6. Read tenant detail again and confirm patch.
7. Read onboarding detail.
8. Patch onboarding metadata.
9. Create primary admin contact.
10. Read onboarding detail and confirm contact.
11. Provision first tenant admin user.
12. Login as provisioned tenant admin/HR admin.
13. Confirm session has expected tenant membership and workspace access.
14. Adopt policy pack for the tenant.
15. Mark baseline published, if not already moved by adoption.
16. Confirm cloned runtime policy records exist.
17. Confirm governance metadata is visible to HR admin APIs where role allows.
18. Mark handoff ready.
19. Activate tenant.
20. Confirm tenant `status=active` and `onboarding_status=active`.
21. Confirm onboarding events include all expected state-changing actions.
22. Confirm negative access from non-staff user fails.
23. Confirm Tenant A admin cannot see Tenant B data.

## 8. Required Negative Tests

The five-tenant validation must also prove:

- Anonymous platform tenant create fails.
- Employee user cannot call platform tenant create.
- HR admin user cannot call platform tenant create unless staff.
- Tenant activation before handoff fails.
- Handoff before baseline fails.
- Handoff before first-admin provisioning fails.
- Baseline publish before policy adoption fails.
- Provision same contact twice fails.
- Duplicate username fails.
- Duplicate email fails.
- Invalid tenant enum values fail.
- Missing tenant returns `404`.
- Missing policy pack returns `404`.

## 9. Browser and UI Expectations

Browser-first mandate:

- Every platform-admin onboarding function must have a visible, operable browser surface.
- API-only validation is not enough for platform-admin signoff.
- Playwright must drive tenant creation, onboarding metadata, admin contact creation, first-admin provisioning, policy-pack creation/publication/adoption, baseline gate, handoff gate, tenant activation, and first-admin login handoff.
- The UI must expose backend validation failures as visible errors instead of silently succeeding or falling back to placeholders.

Current `/platform-admin` UI surfaces:

- Platform login landing to Platform Admin Console.
- Tenant list table.
- Create tenant form.
- Tenant detail workspace.
- Onboarding checklist panel.
- Admin contacts panel.
- Provision admin action.
- Policy-pack adoption action.
- Baseline publication action.
- Handoff readiness action.
- Activation action.
- Event timeline.
- Negative/blocked state banners.
- Cross-tenant health summary.

Browser acceptance once UI exists:

- Modern SaaS layout matching current HR admin visual language.
- No placeholder/demo fallback in staging.
- Empty states explain the missing setup step.
- Buttons are disabled until prerequisites are met.
- Mutation errors are visible and field-specific.
- All actions have loading and success states.
- Mobile/tablet/desktop layout has no horizontal overflow.
- Playwright screenshots are captured at desktop, launch laptop, tablet, and mobile.

Current known UI gap:

- Policy-pack header creation and publication are browser-operated.
- Policy-pack item authoring is still missing as a browser feature, so adopted empty packs prove governance flow and onboarding evidence, not full runtime policy materialization.

## 10. Automation Plan

Backend test additions:

- Add `backend/tests/test_platform_admin_five_tenant_onboarding.py`.
- Use APIClient and authenticated `platform.admin`.
- Generate five unique tenant payloads.
- Execute the flow in section 7 for each tenant.
- Assert negative tests in section 8.
- Assert policy adoption and governance metadata.
- Assert first admin login/session access.

Staging command plan:

```bash
cd /var/www/hrms-payroll-saas/current/backend
set -a
. /var/www/hrms-payroll-saas/shared/backend.env
set +a
.venv/bin/python -m pytest tests/test_platform_admin_five_tenant_onboarding.py -q
```

Optional API smoke script:

- Add `scripts/run-platform-admin-five-tenant-onboarding.py`.
- Purpose: run against a live staging URL with real HTTP auth instead of Django test client.
- Output: JSON manifest with tenant ids, admin ids, onboarding event counts, policy adoption ids, and final status.
- Artifact path: `/var/www/hrms-payroll-saas/shared/qa-artifacts/platform-admin-five-tenant-onboarding/`

Browser validation after backend contract coverage:

- Login as Platform Admin.
- Create and publish a policy pack through `/platform-admin`.
- Create five tenants through `/platform-admin`.
- Save onboarding metadata for each tenant.
- Add each tenant's primary admin contact.
- Provision each tenant's first admin.
- Adopt the published policy pack for each tenant.
- Mark baseline, mark handoff, and activate each tenant.
- Login as each provisioned first admin.
- Confirm `/hr-admin` or `/tenant-admin` workspace access according to role.
- Confirm stale/invalid auth redirects to login.
- Confirm tenant-specific data does not leak across admins.

## 11. Launch Readiness Definition for Platform Admin

Platform Admin onboarding can be called staging-ready when:

- Five disposable tenants can be created and activated in one automated run.
- Each tenant receives exactly one primary provisioned admin.
- Each first admin can login.
- Policy baseline adoption creates runtime records.
- Activation cannot bypass baseline and handoff prerequisites.
- Non-staff users cannot access platform APIs.
- Audit/event evidence is created for every state-changing step.
- No tenant sees another tenant's records.
- Results are written to a durable QA artifact.

It can be called product-ready when:

- The five-tenant flow can be executed and visually verified through Playwright.
- Platform Admin actions are permission-key based, not only `is_staff`.
- Platform policy-pack authoring has a full UI.
- Customer invite/email delivery is provider-backed.
- Tenant deletion/suspension/reactivation lifecycle is explicitly modeled.
- Cross-tenant operational analytics exist.

## 12. Current Gaps

Functional gaps:

- Platform Admin permission model is currently broad `is_staff`, not granular platform permissions.
- Policy-pack item authoring UI is missing.
- Invitation/email delivery for first admin provisioning is not fully provider-backed.
- First login verification endpoint is documented in older planning, but not exposed in current API URLs.
- Tenant suspend/reactivate/archive flows are not yet a complete Platform Admin lifecycle.
- Cross-tenant usage, billing, and operational health are mostly tenant-admin/HR-admin views, not platform-admin views.

Testing gaps:

- Existing tests cover tenant create, first-admin provisioning, activation, policy adoption, and governance basics.
- Browser test coverage now targets five tenants in one onboarding run through `/platform-admin`.
- Existing tests do not yet create a live staging artifact specifically for platform-admin onboarding.
- Browser visual screenshot coverage for `/platform-admin` still needs to be folded into the full production responsive gate.

## 13. Recommended Next Build Step

Deploy `/platform-admin` to staging and run the five-tenant Playwright onboarding proof.

Then add policy-pack item authoring as a browser feature with:

- Leave policy items
- Attendance policy items
- Payroll/pay-group baseline items
- Validation preview before publish
- Tenant adoption dry-run
- Policy baseline adoption
- Handoff and activation controls
- Event timeline
- Playwright visual and functional coverage
