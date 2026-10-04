# Tenant Launch Blueprint Phase Plan

## Purpose

Build a production-grade SaaS customer launch system for the Indian HRMS/payroll market. The goal is not to create demo seed data. The goal is to let Platform Admin select a launch blueprint for a customer and automatically prepare a usable tenant with subscription-aware defaults, role-safe ownership, readiness evidence, and repair/upgrade paths.

The initial customer should start with configured HRMS/payroll foundations and then only need to import/onboard real employees, complete company-specific statutory/provider details, review defaults, and run launch rehearsal.

## Product Model

The product capability is a **Launch Blueprint**.

A launch blueprint defines:

- Country, plan, industry, workforce, and payroll scope compatibility.
- Default configuration by module.
- Required customer inputs.
- Ownership/editability rules.
- Readiness gates.
- Notification copy.
- Launch checklist.
- Evidence and audit behavior.
- Preview, apply, verify, repair, and upgrade behavior.

Seed scripts are only the execution mechanism behind this platform feature.

## High-Level Flow

1. Platform Admin creates or selects a customer tenant.
2. Platform Admin selects a launch blueprint, such as `india-standard-sme.v1`.
3. System previews what will be created, updated, skipped, or blocked.
4. Platform Admin applies the blueprint.
5. Backend launch engine runs child seeders in order.
6. System records launch evidence and readiness status.
7. Customer admins log in and complete the setup checklist through normal role-based screens.
8. Platform Admin or authorized customer admins repair missing setup if needed.
9. Tenant moves from stage-ready to production-ready only after real credentials, employees, payroll rehearsal, backup/monitoring, and audit evidence are complete.

## Readiness Levels

- **Configured:** Blueprint applied and baseline records exist.
- **Stage Ready:** Admin users, roles, core setup, smoke checks, and non-production contract gates are present.
- **Customer Ready:** Customer has reviewed company profile, org masters, policies, and imported or started onboarding employees.
- **Payroll Rehearsal Ready:** Payroll calendar, pay groups, salary structures, statutory placeholders, and required employee payroll data are ready for a rehearsal.
- **Production Ready:** Real email, storage, provider credentials, backup/restore, monitoring, payroll rehearsal, and final audit evidence pass.

## Blueprint Dimensions

Blueprint selection should consider:

- Country: India first.
- Subscription: Starter, Growth, Enterprise.
- Industry: services, retail, manufacturing, IT/professional services, HR-only.
- Workforce style: office, shift, field, hybrid, factory.
- Payroll scope: HR-only, basic payroll, full payroll, provider-integrated payroll.
- Implementation style: platform-assisted, customer-led, partner-led.

## Initial Blueprint Catalog

Initial Indian-market templates:

- `india-standard-sme.v1`
- `india-services-company.v1`
- `india-retail-shift-workforce.v1`
- `india-manufacturing-factory.v1`
- `india-hr-only.v1`

Each template must declare:

- Supported subscription plans.
- Required modules.
- Optional modules.
- Required customer inputs.
- Defaults per setup area.
- Ownership mode per setup area.
- Readiness blockers and warnings.

## Subscription Awareness

Every blueprint and child seeder must check plan compatibility.

Starter defaults:

- Tenant identity.
- Core users and roles.
- Org masters.
- Basic documents.
- Basic leave and attendance.
- ESS/MSS basics.
- Limited reports.

Growth defaults:

- Starter plus payroll defaults.
- Notifications.
- Standard workflows.
- Finance handoff placeholders.
- Compliance reports.
- Support access setup.

Enterprise defaults:

- Growth plus advanced RBAC.
- Audit evidence exports.
- SSO/MFA/SCIM readiness checklist.
- Advanced workflows.
- Provider integration readiness.
- Multi-entity or multi-branch controls.
- Stricter governance and ownership locks.

Seeders must not create advanced setup for a tenant that cannot use it.

## Ownership Modes

Every seeded item must have an ownership mode:

- `platform_locked`: customer cannot edit; Platform Admin controls it.
- `platform_managed`: Platform Admin owns the baseline; customer can request changes or edit selected delegated fields.
- `customer_owned`: customer role owns it after onboarding.
- `delegated`: platform created it, but specific customer roles can maintain it.

Examples:

- Tenant users and role assignment: Tenant Admin.
- Org masters: HR Admin, sometimes Tenant Admin.
- Leave and attendance: HR Admin.
- Salary components and payroll calendars: Payroll Admin or HR Admin depending on tenant policy.
- Provider credentials: Platform Admin plus Payroll Admin depending on environment.
- Launch evidence and template version: Platform Admin.

## Data Strategy

Production launch defaults must be separated from demo/sample data.

Default behavior:

- Create admin/operator users only.
- Do not create fake employees.
- Do not create fake payroll runs.
- Do not create fake provider credentials.

Optional sandbox-only behavior:

- `include_sample_employees`
- sample payroll data
- sample leave/attendance events

These optional modes must be blocked or explicitly marked for sandbox/demo environments only.

## Model Strategy

Do not start by changing every business model.

Add launch tracking models above the business records:

### TenantLaunchRun

Tracks each preview/apply/repair/upgrade run.

Key fields:

- tenant
- template_code
- template_version
- mode: preview, apply, repair, upgrade
- status
- requested_by
- started_at
- completed_at
- input_snapshot
- result_snapshot
- created_count
- updated_count
- skipped_count
- warning_count
- blocker_count
- evidence_checksum

### TenantLaunchSeededItem

Tracks which business objects were created or managed by a blueprint.

Key fields:

- launch_run
- tenant
- module
- model_label
- object_id
- object_code
- source_template_code
- source_template_version
- source_item_key
- ownership_mode
- managed_by_platform
- last_applied_hash
- current_hash
- customer_modified_at
- status

### TenantOnboarding Extensions

Add quick lookup fields:

- launch_template_code
- launch_template_version
- launch_template_applied_at
- launch_template_status

Business models can remain mostly unchanged for MVP. Later, add native ownership fields selectively where UI or performance requires it.

## Seeder Architecture

Parent launch engine:

- `bootstrap_tenant_launch`

Child modules:

- `seed_tenant_identity`
- `seed_roles_users`
- `seed_org_masters`
- `seed_documents`
- `seed_leave_attendance`
- `seed_workflows`
- `seed_notifications`
- `seed_payroll_defaults`
- `seed_provider_placeholders`
- `seed_launch_checklist`
- `verify_tenant_launch`

Each child returns:

- created count
- updated count
- skipped count
- warning list
- blocker list
- seeded item refs
- evidence payload

## Core Safety Rules

- Idempotent by default.
- `preview` makes no writes.
- `apply` creates missing baseline setup.
- `repair` fills gaps without overwriting customer-owned changes.
- `upgrade` moves from one template version to another with previewed changes.
- `force` is explicit and audited.
- Customer-modified records are not overwritten silently.
- Evidence must never include secrets.
- Real production credentials are explicit blockers until configured.

## Phase Plan

### Phase 0: Design Lock

Deliverables:

- Blueprint schema.
- Subscription matrix.
- Ownership matrix.
- Readiness status definitions.
- Initial India template list.
- Child seeder list and responsibilities.
- QA acceptance criteria.

QA:

- Review template defaults.
- Confirm no fake employees by default.
- Confirm production blockers are explicit.

### Phase 1: Tracking Models

Deliverables:

- `TenantLaunchRun`
- `TenantLaunchSeededItem`
- Tenant onboarding launch fields.
- Admin visibility for launch run history.

QA:

- Migration passes.
- Launch run can be created.
- Seeded item registry can reference arbitrary business objects.
- Re-run creates new run history without duplicate tracking rows.

### Phase 2: Template Registry

Deliverables:

- Versioned template registry.
- Initial templates:
  - `india-standard-sme.v1`
  - `india-services-company.v1`
  - `india-retail-shift-workforce.v1`
- Template validator.
- Subscription compatibility validator.

QA:

- All templates load.
- Template codes and versions are unique.
- Required sections exist.
- Unsupported plan/template combinations are blocked.

### Phase 3: Launch Engine and Child Seeders

Deliverables:

- Parent launch service.
- Child seeders for tenant identity, roles/users, org masters, documents, leave/attendance, notifications, payroll defaults, checklist.
- Evidence collection.
- Seeded item tracking.

QA:

- Parent run succeeds for each initial template.
- Running parent twice does not duplicate business records.
- Child seeder failures create blockers and preserve evidence.
- Customer-owned records are not overwritten.

### Phase 4: CLI Commands

Deliverables:

- `list_tenant_launch_templates`
- `bootstrap_tenant_launch`
- `verify_tenant_launch`
- `repair_tenant_launch`

QA:

- CLI creates a new tenant.
- CLI repairs missing setup.
- Verification differentiates stage-ready, customer-ready, payroll-rehearsal-ready, and production-blocked.
- Evidence JSON is stable and secret-safe.

### Phase 5: Platform Admin APIs

Deliverables:

- List templates.
- Preview blueprint.
- Apply blueprint.
- View launch runs.
- View readiness.
- Repair launch setup.

API shape:

- `GET /api/v1/platform/tenant-launch/templates/`
- `POST /api/v1/platform/tenant-launch/preview/`
- `POST /api/v1/platform/tenants/{id}/apply-launch-template/`
- `GET /api/v1/platform/tenants/{id}/launch-runs/`
- `GET /api/v1/platform/tenants/{id}/launch-readiness/`
- `POST /api/v1/platform/tenants/{id}/repair-launch-template/`

QA:

- Platform Admin allowed.
- Non-platform roles denied.
- Preview has no database writes.
- Apply records launch run.
- Repair records launch run.
- Evidence payload contains no secrets.

### Phase 6: Platform Admin UI

Deliverables:

- Customer Launch Center.
- Template selector.
- Template preview.
- Customer inputs form.
- Apply blueprint action.
- Launch run evidence page.
- Launch readiness page.
- Repair missing setup action.

QA:

- Platform Admin can onboard a fresh tenant from UI.
- Template differences are visible.
- Failed runs display blockers.
- Rerun/repair does not duplicate setup.
- Mobile layout is usable.

### Phase 7: Role-Based Customer Customization

Deliverables:

- Permission enforcement for post-onboarding changes.
- Ownership/editability display on setup screens.
- Tenant Admin setup checklist.
- HR Admin setup review.
- Payroll Admin setup review.

QA:

- Tenant Admin can manage users and checklist.
- HR Admin can edit allowed HR setup.
- Payroll Admin can edit allowed payroll setup.
- Employee and Manager cannot access setup configuration.
- Platform-locked items cannot be changed by customer roles.

### Phase 8: Indian Template Certification

Deliverables:

- Add remaining templates:
  - `india-manufacturing-factory.v1`
  - `india-hr-only.v1`
- Template-specific defaults for shift, state/industry, document, leave, attendance, and payroll scope.

QA per template:

- Tenant created.
- Admin users can log in.
- Role menus are correct.
- Org masters populated.
- Documents populated.
- Leave/attendance populated.
- Payroll defaults populated where plan allows.
- Notifications populated.
- Checklist populated.
- Verification passes stage readiness.

### Phase 9: Stage Deployment and QA Pack

Deliverables:

- Stage deployment.
- Fresh tenant launch evidence.
- Browser tests for Platform Admin launch flow.
- Browser tests for Tenant Admin/HR Admin/Payroll Admin readiness screens.

QA commands:

```bash
pnpm qa:stage-verification:ec2
python manage.py list_tenant_launch_templates
python manage.py bootstrap_tenant_launch --template india-standard-sme.v1 ...
python manage.py verify_tenant_launch --tenant-code ...
```

Exit criteria:

- QA can create a fresh Indian tenant without manual backend work.
- Tenant is usable without demo fallback.
- Production blockers are visible and correct.

### Phase 10: Production Hardening

Deliverables:

- Launch evidence export.
- Template upgrade workflow.
- Rollback or deactivation strategy for failed launch runs.
- Audit events.
- Final docs.
- Integration with final production audit.

QA:

- Security review.
- Evidence redaction review.
- No demo fallback.
- No secrets in reports.
- Stage sign-off.

## Notification Content Requirements

Notification templates seeded by blueprints must be launch-grade.

Rules:

- No demo wording.
- No internal technical references.
- Correct audience.
- Correct tone for Indian HR/payroll usage.
- Separate email subject/body and in-app title/body where applicable.
- Clear action expected.
- Safe fallback when email provider is not configured.

Seeded notification areas:

- User invite.
- Leave submitted.
- Leave approved/rejected.
- Attendance regularization submitted.
- Document verification required.
- Payroll ready for review.
- Payroll approved.
- Payslip published.
- Payroll exception/blocker.
- Finance handoff ready.

## QA Acceptance Matrix

Each phase must test:

- Idempotency.
- Subscription compatibility.
- Role access boundaries.
- No demo dependency.
- No secret exposure.
- Evidence accuracy.
- Repair safety.
- Template-specific differences.
- Stage readiness vs production readiness distinction.

## MVP Scope

First implementation slice:

- Tracking models.
- Template registry with three India templates.
- Parent launch engine.
- Child seeders:
  - tenant identity
  - roles/users
  - org masters
  - documents
  - leave/attendance
  - notifications
  - payroll defaults
  - launch checklist
- Verification command.
- Basic Platform Admin APIs.

Platform Admin UI follows after backend certification.

## Explicit Non-Goals for MVP

- Real payroll provider credential onboarding.
- Real object-storage credential onboarding.
- Fake employee population by default.
- Multi-country templates.
- Template upgrade UI.
- Automated statutory compliance guarantee.

These remain planned production-hardening items, not blockers for the first stage-ready launch blueprint engine.
