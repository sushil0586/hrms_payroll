# Configuration Blueprint

## 1. Purpose

This document defines how the HRMS product should remain highly configurable while still being easy to launch through seeded defaults.

The core rule is:

- The platform ships with seed data and standard behaviors
- Every tenant can change most business-facing rules without code changes
- Only core platform behavior and security boundaries remain fixed
- The first baseline can be owned and published by a platform-level policy owner before control is delegated to the tenant

## 2. Configuration Design Principles

- Seed first, configure later
- Keep business rules in configuration, not code
- Support layered overrides
- Preserve audit history for configuration changes
- Make safe defaults available for fast implementation
- Keep configuration understandable for admins and implementation teams

## 3. What Should Be Seeded By Default

### Tenant Starter Pack

- Default organization labels
- Common departments
- Common designations
- Standard employment types
- Standard leave types
- Standard document categories
- Basic attendance policy
- Standard approval flow templates
- Basic notification templates
- Seeded user roles

### Seeded Role Examples

- Super admin
- Tenant admin
- HR admin
- HR executive
- Manager
- Employee
- Auditor

### Seeded Leave Examples

- Casual leave
- Sick leave
- Earned leave
- Loss of pay
- Comp off placeholder

### Seeded Attendance Examples

- General shift
- Weekly off on Sunday
- Standard grace period
- Default full-day and half-day thresholds

## 4. What Should Be Configurable

### Organization Configuration

- Company structure labels
- Branches and locations
- Department hierarchy
- Designations
- Grades and bands
- Cost centers
- Business units
- Reporting hierarchy models

### Employee Data Configuration

- Custom profile sections
- Custom fields
- Field labels
- Required vs optional rules
- Validation rules
- Visibility by role
- Edit permissions by role

### Lifecycle Configuration

- Onboarding checklist templates
- Confirmation/probation duration
- Transfer workflows
- Promotion workflows
- Exit and clearance checklists

### Leave Configuration

- Leave types
- Accrual frequency
- Accrual formulas
- Carry-forward limits
- Encashment rules
- Eligibility rules
- Holiday applicability
- Sandwich rules
- Negative balance policy
- Approval routing

### Attendance Configuration

- Shift definitions
- Work week patterns
- Grace period rules
- Late mark thresholds
- Half day / full day rules
- Overtime eligibility
- Attendance source priorities
- Geo attendance settings
- Regularization rules

### Workflow Configuration

- Workflow triggers
- Approval levels
- Routing conditions
- Escalation timing
- Delegation settings
- Auto-approval rules
- Rejection and correction flow behavior

### Notification Configuration

- Email templates
- In-app templates
- Reminder frequency
- Event triggers
- Recipient groups

### Reporting Configuration

- Visible report columns
- Saved report views
- Export templates
- Report access by role

## 5. Layered Override Model

Configuration should support inheritance with controlled overrides.

### Policy Ownership Model

For policy-heavy areas such as leave, attendance, workflows, and documents, the system should support two operational owners:

- `Platform Policy Admin`
  Owns the first-time baseline policy pack, standard rollout templates, and non-tenant-specific best-practice defaults.
- `Tenant Policy Admin`
  Owns tenant-specific operational policy once delegation is allowed.

The platform-side operating model should stay configurable:

- one SaaS-side admin may both prepare the tenant and publish the starting baseline
- or tenant preparation and baseline publication may be split between `Platform Super Admin` and `Platform Policy Admin`

This means the first working policy for a new tenant does not need to be authored from scratch by the tenant.

The platform team can:

- publish a starter leave policy set
- publish a starter attendance policy set
- publish starter workflow templates
- mark which parts are locked versus tenant-editable

After that, the tenant can:

- adopt the baseline as-is
- clone the baseline into tenant-owned policies
- override only the delegated policy dimensions
- request platform-only changes for protected policy areas

### Recommended Hierarchy

1. Product default
2. Localization default
3. Platform-managed tenant baseline
4. Tenant default
5. Legal entity
6. Branch/location
7. Department/business unit
8. Grade/employment type
9. Employee override

### Example

A tenant may use one leave policy globally, but:

- factory workers can have shift-specific attendance settings
- a branch can have a different holiday calendar
- interns can have a separate leave eligibility rule

Another example:

- the platform implementation team publishes a standard India office leave baseline
- the tenant accepts that as the first live configuration
- the tenant is allowed to edit carry-forward, notice rules, and approval routing
- the tenant is not allowed to edit protected statutory or platform-locked defaults without platform-level action

## 6. What Should Stay Fixed In Core Platform

These areas should not become tenant-editable in unsafe ways:

- Authentication and session security model
- Tenant isolation boundaries
- System audit log integrity
- Core permission evaluation engine
- Core workflow execution framework
- Data retention guardrails where legally required
- Sensitive encryption behavior

Clients can configure behavior around these systems, but not break the safety model itself.

## 7. Configuration Storage Strategy

The platform should maintain configuration as first-class data entities, not ad hoc JSON everywhere.

### Recommended Structure

- Master config definitions
- Tenant config values
- Override records with scope metadata
- Seed packs
- Version history for configuration changes
- Effective value resolution layer

### Important Capabilities

- Draft vs published configuration
- Effective date support for future changes
- Rollback to previous version
- Change audit log
- Compare default vs tenant override
- Policy ownership metadata such as:
  - seeded by platform or tenant
  - delegated to tenant or platform-locked
  - cloned from baseline or independently authored
  - published-by actor and approval trail

## 8. Seed Pack Strategy

Seed packs should help with onboarding different client types.

### Recommended Seed Packs

- Standard office company
- Shift-based operations company
- Retail/field workforce company
- Professional services company

### Each Pack Can Include

- Suggested departments
- Suggested designations
- Suggested leave setup
- Suggested attendance policy
- Suggested workflow templates
- Suggested document categories

## 9. Admin Experience Requirements

Configuration should be manageable by non-technical admins.

### Requirements

- Clear setup wizard
- Basic mode and advanced mode
- Preview effective policy before publish
- Warnings for conflicting rules
- Test scenarios for leave and attendance policies
- Import/export configuration templates

## 10. Governance Requirements

Because configuration will drive product behavior, governance matters.

### Needed Controls

- Maker-checker for critical configuration changes
- Role-restricted access to config areas
- Effective date scheduling
- Mandatory comments for sensitive policy changes
- Config change audit reports
- Platform-to-tenant delegation control for which policy areas are editable locally
- Clear distinction between baseline publication, tenant override, and protected policy zones

## 11. Platform Policy Admin Expectation

The product should explicitly support a platform-level implementation or policy admin user who can prepare first-time tenant policy configuration.

Recommended responsibilities:

- choose and publish the initial tenant policy pack
- decide which policy families are delegated to tenant admins
- keep certain policy families platform-governed when needed
- provide safe starter defaults during implementation

Recommended delegated examples:

- leave approval routing
- leave notice settings
- attendance grace and late thresholds
- shift definitions
- workflow owner assignments

Recommended platform-governed examples:

- protected seed packs
- region-specific default compliance templates
- locked configuration dimensions the tenant should not edit directly

## 12. HRMS-First Configuration Priorities

The first configuration capabilities we should build are:

1. Organization structure
2. Employee custom fields and profile visibility
3. Leave policies
4. Attendance policies
5. Holiday calendars
6. Shift setup
7. Approval workflows
8. Seed roles and permissions
9. Document categories and checklists

## 13. Product Rule

If a client request sounds like a policy, workflow, structure, or field variation, the first question should be:

Can this be solved through configuration instead of custom code?

That principle will keep the SaaS product scalable.
