# Enterprise-Grade Product Experience Plan

Date: 2026-09-18
Owner: Product / QA / Engineering
Scope: Full HRMS SaaS experience across public site, Platform Admin, Tenant Admin, HR Admin, Finance Manager, Manager Self Service, Employee Self Service, and Support.

## Objective

Move the product from launch-ready to enterprise-grade: clear workflows, premium visual consistency, strong governance, configurable SaaS behavior, robust RBAC, strong auditability, professional UX, and predictable performance.

Enterprise-grade means:

- The user always understands where they are, what needs attention, and what action is safe to take.
- Every critical action is permission-controlled, validated, confirmed when risky, and audit-backed.
- Every page has one clear responsibility.
- Menus, permissions, and access behavior are driven by configuration/catalogs instead of scattered static UI logic.
- UI is calm, dense, consistent, accessible, and fast.
- Empty, loading, error, success, and blocked states are designed, not accidental.
- Workflows are hard to misuse and easy to recover from.

## Product Experience Standard

### Visual Direction

Target visual language:

- Enterprise neutral palette: white, gray, slate/navy, with restrained blue/purple accent.
- Accent colors only for hierarchy, actions, status, and focus.
- Avoid one-note purple-heavy screens.
- Cards only for repeated records, modals, and framed tools; avoid nested card-on-card layouts.
- Tables and operational lists should be dense, aligned, and scan-friendly.
- Buttons must have consistent hierarchy:
  - Primary: one dominant action per panel.
  - Secondary: supportive actions.
  - Danger: destructive/risky actions only.
  - Disabled: always paired with visible reason or nearby validation note.

### Typography And Spacing

- Keep dashboard/card headings smaller and tighter than hero/public pages.
- Use consistent section heading, form label, helper text, chip, and table text sizes.
- No negative letter spacing.
- No viewport-width font scaling.
- Text must never overflow or overlap buttons/cards.
- Compact operational pages should use clear grouping, not oversized marketing composition.

### Workflow Language

Use business-readable terms by default:

| Current/Internal Term | Enterprise-Friendly Term |
| --- | --- |
| Baseline | Initial setup |
| Handoff | Go-live handoff |
| Policy packs | Setup templates |
| Tenant Admin Users | Admin access |
| Activation gates | Launch readiness |
| Provision admin | Create login access |

Internal terms may remain in audit/details where needed, but primary UI should be understandable without training.

### Navigation Standard

- Sidebar menus must come from the menu catalog/DB where supported.
- Every menu item must map to permissions.
- Hidden menus and backend denial must agree.
- Direct URL access must be denied if permission is missing.
- Every role should see a control center, not a blank or generic landing page.

### Validation Standard

Every create/update/action flow must cover:

- Required fields.
- Invalid format.
- Duplicate records.
- Boundary length.
- Long input.
- State mismatch.
- Permission denied.
- Risky action confirmation.
- Clear success state.
- Durable persistence after refresh.

Validation messages should be visible inline near the field/action, not only as generic top errors.

### Audit And Trust Standard

Every critical workflow should record and display:

- Actor.
- Timestamp.
- Entity.
- Previous state.
- New state.
- Notes/reason where applicable.
- Evidence/action source.

Critical workflows:

- Tenant create/edit/suspend/reactivate/activate.
- Admin contact create/edit/provision/deactivate.
- Role/permission changes.
- Payroll setup, calculation, review, publish, handoff.
- Statutory filing actions.
- Data import/export.
- Support access.

## Phase Plan

## Phase 0: Experience Baseline And Non-Negotiables

Status: In progress

Goal: Lock the standard and make every future screen measurable.

Deliverables:

- Enterprise-grade experience plan created.
- Each persona has a target control center definition.
- Each major module has a launch/premium readiness score.
- Current known defects and UX gaps are tracked in QA docs.
- Test evidence continues to be attached after each phase.

Acceptance:

- Plan exists and is updated after every phase.
- Any new screen must meet navigation, validation, RBAC, audit, and UI standards.

## Phase 1: Platform Admin Premium Finish

Goal: Make Platform Admin the model for the rest of the app.

Implementation targets:

- Convert terminology to enterprise-friendly labels where user-facing.
- Add/archive/default filters for long Leads and Setup Templates lists.
- Add row action menus for long record rows where actions crowd the UI.
- Standardize status chips and action buttons.
- Add confirmation modals for suspend, reactivate, activate, destructive, and risky actions.
- Add visible disabled-action reasons.
- Add guided readiness panel:
  - Lead review.
  - Tenant record.
  - Admin access.
  - Initial setup.
  - Go-live handoff.
  - Activation.
- Keep permission catalog and menu catalog as configuration-backed evidence.

Verification:

- Platform Admin comprehensive QA pack.
- Public signup to tenant provisioning.
- Five-tenant browser onboarding proof.
- Permission catalog certification.
- Negative direct URL/RBAC tests.
- Screenshot pass at desktop, laptop, tablet, and mobile widths.

Target readiness:

- UI/UX: 95%+
- Functional: 97%+
- Workflow clarity: 95%+

## Phase 2: Tenant Admin Control Center Premium Finish

Goal: Tenant Admin should be simple, role-aware, and focused on tenant setup/control.

Implementation targets:

- Split each page into single-responsibility workflows.
- Add setup checklist with direct actions.
- Make Settings, Plan, Users/Roles, Security, Audit, and Usage clear and non-overlapping.
- Use modals/drawers for add/update flows.
- Add role/permission matrix view.
- Add user lifecycle actions:
  - invite/create login.
  - reset password.
  - deactivate/reactivate.
  - assign roles.
  - audit changes.
- Add clear tenant readiness status.

Verification:

- Tenant Admin E2E certification.
- Tenant boundary/security certification.
- Role/permission CRUD certification.
- Direct URL denial tests.
- Screenshot and responsive pass.

Target readiness:

- UI/UX: 95%+
- Functional: 97%+
- Workflow clarity: 95%+

## Phase 3: Full RBAC And Dynamic Menu Governance

Goal: Menus, permissions, roles, and backend enforcement must behave like SaaS infrastructure, not static code.

Implementation targets:

- Permission catalog is DB-backed and syncable.
- Menu catalog is DB-backed and syncable.
- Role-permission assignment UI.
- System roles protected from unsafe edits.
- Tenant-created custom roles.
- Last-admin lockout protection.
- Permission dependency warnings.
- Backend permission checks for protected APIs.
- UI menu filtering from effective permissions.
- Audit logs for RBAC changes.

Verification:

- Tenant Admin role certification.
- Permission catalog certification.
- Menu catalog certification.
- Negative API denial tests.
- Limited-role browser tests.

Target readiness:

- RBAC correctness: 98%+
- SaaS configurability: 95%+

## Phase 4: HR Admin Premium Workflow Finish

Goal: HR Admin should feel like a real operating console for HR/payroll teams.

Implementation targets:

- Employee directory and lifecycle flow polish.
- Employee onboarding checklist.
- Payroll setup readiness checklist.
- Payroll input, calculation, review, exception, output, and handoff guided flow.
- Clear disabled-action reasons for payroll gates.
- Import/export UX with validation summaries and rollback evidence.
- Statutory setup and filing status premium views.
- Leave/shift/assignment governance polish.
- Email notification evidence for employee/admin creation and password setup.

Verification:

- HR Admin readiness suite.
- Payroll RBAC suite.
- Payroll full-cycle pilot.
- Employee lifecycle browser proof.
- Import/export certification.

Target readiness:

- UI/UX: 95%+
- Payroll workflow confidence: 97%+

## Phase 5: ESS, MSS, Finance, And Support Premium Finish

Goal: Every user type gets a real control center with role-specific actions.

Implementation targets:

- ESS:
  - profile, payslip, leave, attendance, documents, requests.
  - password/reset/self-service notifications.
- MSS:
  - approvals, team calendar, exceptions, pending actions.
  - approval/rejection comments and evidence.
- Finance:
  - payroll handoff, bank files, acknowledgements, audit packs.
  - read-only and action-role separation.
- Support:
  - scoped tenant support access.
  - session lifecycle.
  - access expiry and evidence.

Verification:

- ESS/MSS/Finance/Support certification packs.
- Cross-role denial tests.
- Audit evidence checks.

Target readiness:

- Role control centers: 95%+
- Cross-role security: 98%+

## Phase 6: Public Site, Signup, Billing, And Operations

Goal: Public launch should look credible and convert visitors safely into approved tenants.

Implementation targets:

- Public homepage premium visual pass.
- Contact/signup flow with email confirmations.
- Platform Admin lead queue polish.
- Billing/payment provider readiness.
- Plan and subscription management.
- AWS production hardening.
- SES/email deliverability.
- Monitoring, backup, alerting.
- Incident runbooks.
- Statutory/e-file provider integration plan.

Verification:

- Public signup to tenant conversion.
- Email delivery tests.
- Billing sandbox tests when provider is connected.
- Production hardening checklist.

Target readiness:

- Public launch confidence: 95%+
- Operational confidence: 95%+

## Cross-Cutting Enterprise Requirements

### Confirmation Rules

Confirmation required for:

- Delete.
- Suspend/deactivate.
- Reactivate where it changes access.
- Activate tenant.
- Publish payroll output.
- Generate or transmit finance handoff.
- Permission/role changes affecting access.
- Support impersonation/access.

### Empty State Rules

Every empty state must show:

- What is missing.
- Why it matters.
- What action to take next.
- Link/button to perform the action if permitted.

### Loading State Rules

Every network-heavy page must show:

- Skeleton or quiet loading state.
- Disabled repeated submits during mutation.
- Clear retry/error state on failure.

### Performance Targets

- Initial route render: under 2 seconds on normal broadband after warm deploy.
- Search/filter feedback: under 500 ms for UI response.
- Mutation feedback: visible within 1 second.
- No unnecessary full data fetch on pages that only need summary data.

### Accessibility Targets

- Every page has one page-level `h1`.
- Keyboard navigation works for dialogs/forms.
- Focus is visible.
- Inputs have accessible labels.
- Buttons/icons have accessible names.
- Dialogs trap focus where appropriate.
- No critical color-only status indicators.

## Progress Log

| Date | Phase | Update | Evidence |
| --- | --- | --- | --- |
| 2026-09-18 | Phase 0 | Enterprise-grade product experience standard created. | This document |
| 2026-09-18 | Platform Admin | Current Platform Admin QA confidence at 96%; fixed tenant-admin routing, permissions heading, and brittle Platform Admin test cases. | `docs/qa/platform-admin-comprehensive-qa-report-2026-09-17.md` |
| 2026-09-18 | Phase 1 | Platform Admin premium finish slice completed: enterprise labels, active lead default filter, risky-action confirmation dialogs, disabled-action reasons, setup-template row/form spacing fix, and updated certification specs. | `platform-admin-*` focused browser pack: `7 passed (2.8m)`; `pnpm --dir web exec tsc --noEmit`; `pnpm --dir web lint` |
| 2026-09-18 | Phase 1 | Platform Admin list polish completed: Leads, Tenants, Setup Templates, and Audit Logs now show visible/total counts, current filter context, and reset actions while preserving default workflow views. | `platform-admin-tabs-pagination-certification.spec.ts` + `platform-admin-visual-accessibility-certification.spec.ts`: `3 passed (1.2m)`; negative/security + CRUD/state + audit evidence: `4 passed (1.7m)`; `pnpm --dir web exec tsc --noEmit`; `pnpm --dir web lint` |

## Immediate Next Work

Recommended next execution order:

1. Platform Admin premium finish, because it is already closest to enterprise-ready and can become the reference design.
2. Tenant Admin simplification and premium finish.
3. Full RBAC and dynamic menu governance completion.
4. HR Admin payroll workflow premium pass.
5. ESS/MSS/Finance/Support control center polish.
6. Public site, billing, email, and operations hardening.

For the next engineering run, start with Phase 1:

- Standardize Platform Admin terminology.
- Add confirmation modals for risky actions.
- Add disabled-action reasons.
- Add active/default filters for noisy lists.
- Add row action menu pattern where record actions are crowded.
- Rerun Platform Admin comprehensive QA.
