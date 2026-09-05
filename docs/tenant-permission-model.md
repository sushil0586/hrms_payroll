# Tenant and Permission Model

## 1. Objective

Define a tenant-aware access model for the HRMS SaaS that is:

- secure by default
- flexible for different customer structures
- configuration-friendly
- ready for future payroll and compliance modules

This model should support:

- SaaS multi-tenancy
- role-based access control
- scope-based data visibility
- field-level restrictions
- workflow-specific permissions
- auditability of access and changes

## 2. Core Principles

- Tenant isolation is non-negotiable
- Access should be granted by role and constrained by scope
- Sensitive data should support field-level restrictions
- Permissions should be additive by role but resolved safely
- Workflow actions should require both module permission and step-level authority
- Customers should be able to configure roles and scopes without breaking core security rules

## 3. Tenant Model

### 3.1 Recommended SaaS Tenant Shape

Use:

- shared application
- shared database
- logical row-level tenant isolation

Every major business entity should belong to one tenant directly or through a tenant-owned parent.

### 3.2 Tenant Definition

A tenant represents one subscribing customer organization in the SaaS platform.

A tenant may contain:

- one or more legal entities
- one or more branches or locations
- multiple departments and business units
- many users with different access scopes
- multiple policies and workflow variations

### 3.3 Tenant Ownership Rule

All business records must be tenant-bound, including:

- employee records
- organization structure
- leave and attendance policies
- requests and approvals
- documents
- notifications
- reports
- config overrides
- audit entries

No cross-tenant record access should be possible from application logic, admin screens, APIs, exports, or background jobs.

## 4. Recommended Access Model

Use a hybrid access model:

- RBAC for standard permissions
- scope-based access control for data boundaries
- field-level access for sensitive data
- workflow-step access for approvals and business actions

This avoids both extremes:

- simple role-only access that is too broad
- fully custom policy engines that are too complex too early

## 5. Access Building Blocks

### 5.1 User

A user is a login identity that can access the platform.

A user may be:

- employee user
- manager user
- HR user
- admin user
- auditor user
- implementation/support user

### 5.2 Tenant Membership

Each user must be linked to one tenant membership record for each tenant they can access.

The membership should define:

- tenant
- user
- status
- primary role set
- access scopes
- allowed legal entities
- allowed branches
- allowed departments if restricted
- effective start/end dates where needed

### 5.3 Role

A role is a named bundle of permissions.

Examples:

- Tenant Admin
- HR Admin
- HR Executive
- Manager
- Employee
- Auditor
- Support Partner

### 5.4 Permission

A permission is a granular action, such as:

- view employee profile
- edit employee profile
- approve leave request
- configure leave policy
- view attendance records
- export reports

Permissions should be action-based and module-aware.

### 5.5 Scope

Scope limits which records a user can act on.

Common scopes:

- self
- direct reports
- indirect reports
- own department
- own branch
- own legal entity
- assigned business units
- tenant-wide

### 5.6 Field Policy

Field policy controls whether a user can:

- view
- edit
- hide
- request change

for individual fields or profile sections.

### 5.7 Workflow Authority

Workflow authority controls whether a user can act at a specific approval step based on:

- assigned role
- assigned scope
- request attributes
- delegation rules

## 6. Role Strategy

The system should ship with seeded roles and also support tenant-defined custom roles.

### 6.1 Seeded Platform Roles

- Platform Super Admin
- Platform Support
- Platform Policy Admin

These are internal platform roles, not customer business roles.

They must never bypass audit logging and should have tightly restricted production access procedures.

Recommended operating model:

- keep platform responsibilities configurable
- one SaaS-side operator may hold both tenant-onboarding and policy-baseline authority
- or those responsibilities may be split across multiple platform roles

Typical split:

- `Platform Super Admin`
  Creates and prepares the tenant, handles SaaS operations, and manages internal platform controls.
- `Platform Policy Admin`
  Publishes the starting policy baseline, defines delegation, and locks protected policy areas.

Combined option:

- a single platform admin may perform both responsibilities in smaller implementations or early-stage operations

Recommended use of `Platform Policy Admin`:

- prepare first-time leave, attendance, workflow, and document-policy baselines for a tenant
- publish starter policy packs during implementation
- decide which policy dimensions are delegated to tenant admins
- keep protected policy areas locked where the platform must retain control

### 6.2 Seeded Tenant Roles

- Tenant Admin
- HR Admin
- HR Executive
- Manager
- Employee
- Auditor

### 6.3 Custom Tenant Roles

Customers should be able to create custom roles such as:

- Branch HR
- Regional Manager
- Document Verification Officer
- Leave Approver
- Attendance Admin
- Compliance Reviewer

## 7. Permission Design

Permissions should be defined as stable action keys rather than informal labels.

### Recommended Permission Pattern

Use a pattern like:

- `employees.view`
- `employees.create`
- `employees.edit`
- `employees.export`
- `employees.view_sensitive`
- `leave.apply`
- `leave.approve`
- `leave.configure`
- `attendance.view`
- `attendance.regularize`
- `attendance.configure`
- `workflows.manage`
- `documents.verify`
- `reports.export`
- `config.publish`
- `config.delegate`
- `config.lock`
- `config.seed`

### Platform Configuration Permission Examples

Platform-only examples:

- `platform.policy.seed`
- `platform.policy.publish`
- `platform.policy.delegate`
- `platform.policy.lock`
- `platform.tenant.create`
- `platform.tenant.prepare`

Tenant examples after delegation:

- `leave.configure`
- `attendance.configure`
- `workflow.configure`
- `documents.configure`

### Permission Categories

- view
- create
- update
- delete
- approve
- configure
- import
- export
- verify
- publish
- audit-view

## 8. Scope Model

Permissions alone are not enough. Data access should always be filtered by scope.

For platform policy administration, scope is different from tenant business scope:

- platform policy admins act across tenants only for implementation and configuration bootstrapping
- they should not automatically gain unrestricted access to day-to-day employee operations
- production use should separate policy publication authority from ordinary HR data review authority whenever possible

### 8.1 Supported Scope Types

- self
- direct_reports
- indirect_reports
- department
- branch
- legal_entity
- business_unit
- grade
- explicit_assignment
- tenant_all

### 8.2 Examples

- An employee can view only self-scoped records
- A manager can approve leave for direct reports
- A branch HR user can manage employees only in allowed branches
- An auditor can view tenant-wide audit logs but cannot edit records

### 8.3 Scope Composition

A user may have multiple overlapping scopes. The system should resolve the effective allowed set safely.

Example:

- role gives `employees.view`
- scope gives `branch = Mumbai`
- field policy hides salary fields

Result:

- user can view employees in Mumbai branch only, without restricted fields

## 9. Field-Level Security

Field-level access is important for HRMS and essential for future payroll.

### Sensitive Fields To Treat Carefully

- bank account details
- personal identity numbers
- government IDs
- compensation placeholders
- medical or sensitive personal information
- disciplinary notes
- confidential HR comments

### Field Access Modes

- hidden
- read-only
- editable
- editable through request workflow only

### Recommended Application

Field-level security should be applied to:

- profile sections
- individual fields
- generated exports
- report column visibility
- admin screens
- API serializers

## 10. Section-Level Profile Access

Employee profile sections should be permission-aware.

Suggested sections:

- personal information
- employment information
- organization assignment
- contact information
- identity documents
- bank information
- education and experience
- emergency contacts
- HR notes
- lifecycle history

Each section should support:

- who can view
- who can edit
- whether employee self-edit is allowed
- whether change request approval is required

## 11. Workflow Permission Model

Workflow actions should not be granted by generic update permission alone.

A user should be able to approve or reject only if:

- the module permission allows the action
- the workflow step is assigned to their role or user
- the request falls inside their access scope
- delegation or substitute rules are valid

### Common Workflow Actions

- approve
- reject
- send back
- escalate
- delegate
- cancel

### Workflow Example

Leave approval can require:

- `leave.approve`
- scope = direct reports or allowed department
- active assignment to the pending step

## 12. Configuration Permissions

Configuration access must be more restricted than operational access.

### Config Areas That Need Separate Control

- organization masters
- leave policies
- attendance policies
- shifts
- holiday calendars
- workflow templates
- role and permission mappings
- notification templates
- document categories
- seed overrides

### Recommended Config Roles

- Tenant Admin
- HR Admin with restricted config rights
- Specialist config role such as Attendance Admin or Leave Admin

### Governance Controls

For critical configuration changes, support:

- maker-checker flow
- draft vs published configuration
- effective date scheduling
- mandatory comments
- change logs

## 13. Document Access Model

Document access should be more restrictive than general profile access.

### Document Controls

- category-based visibility
- employee self-upload permissions
- verifier-only approval permissions
- expiry management access
- download restrictions for confidential documents

### Example

A manager may view team onboarding status, but not employee identity documents unless explicitly allowed.

## 14. Reporting and Export Permissions

Reporting is a common place for data leakage, so it needs first-class controls.

### Reporting Permissions Should Consider

- report access by module
- report access by scope
- export rights separate from view rights
- sensitive column masking
- bulk download restrictions

### Example

A user may:

- view headcount dashboard
- but not export employee directory
- or may export employee directory without bank details

## 15. Audit and Access Logging

The system should record:

- login events
- failed access attempts where useful
- record changes
- approval actions
- configuration changes
- data exports
- sensitive field views where appropriate

Audit records should include:

- user
- tenant
- timestamp
- action
- target module
- target record
- change summary
- IP/device context where appropriate

## 16. Internal Platform Access

Platform operators may need controlled support access.

### Rules

- internal users should be clearly separated from tenant users
- access should be time-bound or approval-bound for production support where possible
- impersonation, if supported, must be heavily audited
- support access should respect tenant boundaries and least privilege

## 17. Recommended Data Model Concepts

At a high level, the backend should include concepts like:

- `Tenant`
- `User`
- `TenantMembership`
- `Role`
- `Permission`
- `RolePermission`
- `MembershipRole`
- `AccessScope`
- `MembershipScope`
- `FieldPolicy`
- `WorkflowAssignmentRule`
- `AuditLog`

These may be implemented across `tenants`, `iam`, `platform_config`, and `workflows`.

## 18. Access Resolution Order

When checking whether a user can perform an action, use this order:

1. Confirm authenticated user
2. Confirm active tenant membership
3. Confirm role grants required permission
4. Confirm module is enabled for tenant
5. Confirm scope allows target record access
6. Confirm field or section policy allows requested visibility or edit
7. Confirm workflow authority if the action is approval-based
8. Log the action if sensitive or state-changing

This should be implemented centrally where possible.

## 19. Seeded Permission Blueprint

Recommended first seeded access model:

### Employee

- view/edit self profile in allowed sections
- apply leave
- view own attendance
- upload own documents
- submit change requests

### Manager

- employee permissions for self
- view direct reports
- approve leave for direct reports
- approve attendance regularization for direct reports
- view team attendance and leave summaries

### HR Executive

- create and edit employee records within assigned scope
- manage onboarding/offboarding tasks
- manage documents
- view leave and attendance operations
- limited config access if explicitly assigned

### HR Admin

- tenant-wide HR operational control
- policy setup for assigned modules
- broader reporting access
- workflow and template administration where allowed

### Tenant Admin

- full tenant administration except platform-only functions
- role assignment
- organization setup
- module configuration
- subscription/admin settings where exposed

### Auditor

- read-only access
- audit/report visibility as assigned
- no edit, approve, or configure rights

## 20. Future Payroll Readiness

Even though HRMS is first, the permission model must be ready for:

- compensation data visibility
- payroll run permissions
- statutory report access
- finance-only exports
- maker-checker for payroll processing

That means field-level and module-level access must be designed correctly from the beginning.

## 21. Final Recommendation

Implement access control as:

- tenant-aware RBAC
- scope-based record filtering
- field and section-level visibility controls
- workflow-specific approval authority
- strict audit logging

This approach is flexible enough for SaaS customers with very different structures, while still remaining manageable to implement in Django.
