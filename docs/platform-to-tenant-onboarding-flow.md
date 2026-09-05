# Platform To Tenant Onboarding Flow

## 1. Purpose

This document defines the recommended onboarding flow from the SaaS platform team to the tenant team.

It makes three things explicit:

- who creates and prepares the tenant
- who publishes the starting policy baseline
- when tenant-side ownership moves to `Tenant Admin` or `HR Admin`

This flow is intentionally configurable.

The same SaaS-side operator may perform multiple steps, or responsibilities may be split across multiple platform roles.

---

## 2. Core Role Boundary

Recommended roles in the onboarding chain:

- `Platform Super Admin`
  Creates and prepares the tenant, handles platform-level setup, and controls SaaS-side operational access.
- `Platform Policy Admin`
  Publishes the starting leave, attendance, workflow, and document-policy baseline and defines delegation.
- `Tenant Admin`
  Customer-side administrative owner for the tenant.
- `Tenant HR Admin`
  Customer-side HR operational owner after handoff.

Configurable operating model:

- one platform admin may perform both platform-super-admin and platform-policy-admin work
- or those responsibilities may be split between different SaaS-side users

Hard boundary:

- platform roles are internal SaaS roles
- tenant roles are customer roles

---

## 3. Onboarding Goal

The onboarding flow should end with this result:

- tenant exists and is active
- workspace/domain is mapped
- starter configuration is applied
- first tenant admin user can log in
- baseline leave and attendance policies are published
- delegated versus locked policy areas are clear
- tenant HR team can continue daily operations without platform intervention for delegated areas

---

## 4. End-To-End Flow

## 4.1 Stage 1: Tenant Creation

Primary owner:

- `Platform Super Admin`

Main actions:

- create tenant record
- assign subscription or enabled modules
- map domain or workspace
- set tenant status
- choose initial seed-pack strategy
- create internal onboarding record if the product supports tracked implementation

Expected outputs:

- tenant shell exists
- tenant can be identified and routed safely
- product scope for that tenant is known

Suggested permissions:

- `platform.tenant.create`
- `platform.tenant.prepare`

## 4.2 Stage 2: Tenant Preparation

Primary owner:

- `Platform Super Admin`

Optional shared owner:

- `Platform Policy Admin`

Main actions:

- create the first tenant-side admin identity
- configure starter organization metadata if onboarding is assisted
- choose country, industry, and baseline pack context
- confirm whether onboarding is guided, imported, or partner-led
- prepare any required implementation notes

Expected outputs:

- first customer admin exists
- tenant setup context is ready for baseline publication
- the platform team knows which starter configuration path applies

## 4.3 Stage 3: Baseline Selection

Primary owner:

- `Platform Policy Admin`

Main actions:

- select baseline leave pack
- select baseline attendance pack
- optionally select workflow and document baseline packs in future versions
- choose whether the tenant receives one combined baseline or multiple family-specific packs
- review locked fields and delegated fields

Expected outputs:

- baseline strategy is chosen
- delegation posture is defined before any customer-side editing begins

## 4.4 Stage 4: Baseline Publication

Primary owner:

- `Platform Policy Admin`

Main actions:

- publish the starting baseline to the tenant
- create tenant-owned runtime policy records from the selected baseline
- attach traceability metadata to the created runtime records
- record which fields are:
  - locked
  - tenant-editable
  - editable only after clone or detach

Expected outputs:

- tenant has live starting policies
- baseline origin is traceable
- the tenant is not forced to author policies from scratch

Suggested permissions:

- `platform.policy.seed`
- `platform.policy.publish`
- `platform.policy.delegate`
- `platform.policy.lock`

## 4.5 Stage 5: Customer Handoff

Primary owners:

- `Platform Super Admin`
- `Platform Policy Admin`

Receiving owners:

- `Tenant Admin`
- `Tenant HR Admin`

Main actions:

- hand over login access
- confirm which modules are enabled
- explain which policy areas are platform-managed
- explain which policy areas are tenant-editable
- provide import templates or guided setup instructions
- confirm first operational checks

Expected outputs:

- customer team understands what is live
- customer team knows what they can edit
- platform-side assumptions are documented

## 4.6 Stage 6: Tenant Activation

Primary owners:

- `Tenant Admin`
- `Tenant HR Admin`

Main actions:

- complete organization masters
- import or create employees
- review leave and attendance baselines
- configure delegated fields
- assign managers and user access
- validate first operational flows such as leave requests and attendance regularization

Expected outputs:

- tenant is operational
- tenant HR team owns day-to-day administration
- platform intervention is only needed for protected or non-delegated policy areas

---

## 5. Recommended Handoff Checklist

Before onboarding is considered complete, the platform team should verify:

- tenant record exists and routes correctly
- first tenant admin can log in
- core modules are enabled correctly
- leave baseline is published
- attendance baseline is published
- delegated versus locked policy areas are visible
- first org structure is usable or import-ready
- first employee access model is understood
- tenant knows how to request changes for platform-locked areas

---

## 6. Decision Points

The onboarding flow should support these configurable decisions:

### Role Split

- one platform admin performs everything
- tenant creation and policy publication are split between multiple platform roles

### Onboarding Style

- fully platform-assisted onboarding
- shared onboarding between platform and customer
- customer-led onboarding with a prepublished baseline

### Policy Control Style

- mostly locked baseline
- mostly delegated baseline
- mixed baseline with selected protected fields

### Data Setup Style

- manual setup
- import-led setup
- seeded demo or starter setup

---

## 7. Recommended System States

If onboarding state is tracked explicitly, the tenant should move through simple platform-visible states such as:

1. `draft`
2. `created`
3. `prepared`
4. `baseline_published`
5. `handoff_ready`
6. `active`

These states are useful for:

- implementation tracking
- support visibility
- auditability
- future onboarding dashboards

---

## 8. Version 1 Scope Recommendation

For the first implementation, keep onboarding practical.

Version 1 should support:

- tenant creation
- first admin user creation
- baseline leave pack publication
- baseline attendance pack publication
- delegation visibility
- tenant HR handoff

Version 1 does not need:

- a full onboarding wizard
- workflow baseline publication
- document baseline publication
- automated imports for every master
- advanced implementation project tracking

---

## 9. Recommended API and Service Direction

Platform-side flows will likely need these capabilities:

- create tenant
- prepare tenant
- create first tenant admin
- preview baseline publication
- publish baseline pack to tenant
- view tenant onboarding status
- record handoff notes

Tenant-side flows will likely need:

- view effective baseline sources
- view locked versus editable policy areas
- complete setup checklist

---

## 10. Recommended Ownership Rule

Use this simple rule across the product:

- platform creates and prepares the tenant
- platform publishes the starting baseline
- tenant admin and HR admin own daily operations after handoff

This rule should stay configurable in staffing terms:

- one person can hold both platform responsibilities
- but the product should not assume those responsibilities are always performed by the same role

---

## 11. Relationship To Other Docs

This document should be read alongside:

- `docs/tenant-permission-model.md`
- `docs/configuration-blueprint.md`
- `docs/platform-policy-admin-and-delegation-design.md`
- `docs/platform-policy-admin-schema-proposal.md`
- `docs/hrms-execution-plan.md`
