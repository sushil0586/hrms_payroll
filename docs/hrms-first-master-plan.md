# HRMS-First Master Plan

## 1. Objective

Start the product with HRMS as the foundation and design it so payroll can plug into the same employee, policy, attendance, workflow, and organizational models later.

The HRMS platform should be:

- Multi-tenant
- Highly configurable
- Easy to onboard with seeded defaults
- Suitable for SMB, mid-market, and enterprise clients
- Capable of supporting different industries, structures, and approval styles

The key principle is:

Seed by default, configure as needed, hardcode as little as possible.

## 2. Product Direction

The first release should not try to solve every payroll scenario immediately. Instead, it should build a strong HRMS base that supports:

- Employee data management
- Organization and policy management
- Attendance and leave
- Employee and manager self-service
- Workflows and approvals
- Document and compliance record management
- Reporting and operational controls

This base will later power:

- Payroll processing
- Full and final settlement
- Tax and statutory workflows
- Reimbursements, loans, benefits, and compensation operations

The delivery model should include:

- web applications for admin, HR, and advanced operations
- Android and iOS mobile apps for ESS and MSS use cases

## 3. Platform Goals

### Business Goals

- Serve many customer types with the same platform
- Reduce implementation effort through configuration and seeded templates
- Allow customers to go live quickly with standard defaults
- Allow advanced customers to deeply adapt policies and workflows
- Build a reusable core for future payroll and compliance modules

### User Goals

- HR teams can onboard and manage employees without depending on engineering
- Managers can approve routine requests easily
- Employees can use self-service for common HR tasks
- Auditors and admins can trace who changed what and when

### Product Goals

- Every major HR policy should be configurable
- Every important master data object should support custom fields
- Every approval-heavy action should support configurable workflow routing
- Every client should have a seeded setup pack to reduce onboarding friction

## 4. Ideal Customer Types To Support

### SMBs

- Simpler hierarchies
- Fewer approval layers
- Standard working hours
- Basic leave and attendance rules

### Mid-Sized Companies

- Multiple locations and departments
- Shift-based attendance
- Several leave types
- More formal document, onboarding, and exit workflows

### Enterprises

- Multi-entity and multi-branch structures
- Complex role hierarchies
- Department, grade, and business-unit-based policy variation
- Multiple approval chains
- Strong audit and access control requirements

### Industry Patterns To Support

- IT and services companies
- Retail and field workforce teams
- Manufacturing and shift-driven organizations
- Consulting and project-based teams
- Staffing or contractor-heavy organizations
- Hybrid and remote-first companies

## 5. Product Scope For HRMS Phase

### 5.1 Tenant Setup and Onboarding

- Tenant creation
- Subscription plan and module enablement
- Default seeded configuration pack
- Guided onboarding wizard
- Organization setup checklist
- Admin user creation
- Initial data import templates

### 5.2 Organization Management

- Company and legal entity setup
- Branch and location setup
- Department hierarchy
- Business units
- Cost centers
- Designations and job levels
- Grades and bands
- Reporting structure models
- Employment types

Everything above should be configurable, with seed data available for standard setups.

### 5.3 Employee Master

- Personal details
- Employment details
- Organizational assignment
- Contact details
- Government/KYC details
- Emergency contacts
- Education and experience
- Skills and certifications
- Bank details
- Identity documents
- Custom customer-defined fields

The employee profile should be section-based and permission-controlled so clients can decide who can see or edit each block.

### 5.4 Employee Lifecycle Management

- Candidate-to-employee conversion support for future recruitment integration
- Pre-joining document collection
- Onboarding task management
- Probation tracking
- Confirmation workflows
- Transfer and department change
- Promotion and designation change
- Salary revision placeholder integration for later payroll module
- Exit initiation
- Notice period tracking
- Clearance and asset return
- Experience/relieving document generation

### 5.5 Employee Self-Service

- View profile
- Update allowed profile fields
- Upload documents
- Apply leave
- View leave balances
- View attendance summary
- Raise attendance regularization
- Download letters and HR documents
- Submit requests such as address change, bank update, or document correction

These flows should be available on both web and mobile, with mobile optimized for quick daily actions.

### 5.6 Manager Self-Service

- Team dashboard
- Approve leave
- Approve attendance requests
- View reporting team profiles
- Trigger transfer/promotion recommendations
- View basic team analytics
- Track onboarding and exit tasks for direct reports

The first mobile manager experience should prioritize approvals, team alerts, and quick team visibility rather than deep administration.

### 5.7 Attendance Management

- Attendance policy setup
- Shift definitions
- Weekly off configuration
- Holiday calendars
- Manual attendance entry
- Attendance import
- Biometric integration-ready model
- API-ready attendance ingestion
- Late marks and grace rules
- Half day and absent logic
- Overtime rules
- Regularization requests
- Geo-tag or remote attendance readiness for later expansion

### 5.8 Leave Management

- Leave type master
- Leave accrual rules
- Leave eligibility rules
- Carry-forward rules
- Encashment policy support
- Sandwich rules
- Negative balance policy
- Probation leave restrictions
- Gender/marital/tenure-based eligibility support where legally or operationally needed
- Leave application and approval flows
- Leave calendar and team view

### 5.9 Documents and Records

- Employee document categories
- Mandatory document rules
- Expiry tracking
- Document reminders
- HR letter templates
- Downloadable policy acknowledgements
- Document verification status

### 5.10 Workflow and Approvals

- Configurable workflow engine
- Multi-level approvals
- Rule-based routing by employee attributes, location, department, request type, or amount
- Escalation rules
- Delegation rules
- SLA tracking for pending approvals
- Approval history and audit log

### 5.11 Communication and Notifications

- In-app notifications
- Email notifications
- SMS or WhatsApp extensibility for later
- Trigger templates by event
- Reminder schedules
- Announcement board

### 5.12 Reports and Operational Insights

- Employee directory
- Headcount by location/department/designation
- Joiners and exits report
- Probation due report
- Missing document report
- Leave balance and leave utilization reports
- Attendance exception report
- Approval pending aging report
- Custom exportable reports

## 6. Configuration-First Model

The product should be designed so each customer can adjust the system to their operating style with minimal engineering support.

### Configurable Domains

- Organization structure labels and hierarchies
- Employment types
- Employee profile sections and field visibility
- Custom fields and validation rules
- Document categories and mandatory rules
- Leave types and leave policies
- Attendance rules
- Shift policies
- Holiday calendars
- Approval workflows
- Notification templates
- User roles and permissions
- Letter templates
- Report columns and saved filters

### Configuration Levels

Configuration should be possible at multiple levels:

- Global product defaults
- Country/localization defaults
- Tenant defaults
- Legal entity
- Branch/location
- Department/business unit
- Grade/band
- Employment type
- Employee-specific override where needed

### Seeded Defaults

Each tenant should start with a default setup pack so they are not forced to configure everything from zero.

Seed examples:

- Standard departments
- Common designations
- Employment types such as full-time, part-time, intern, consultant, contractor
- Standard leave types such as casual leave, sick leave, earned leave
- Basic attendance rules
- Default approval chains
- Standard document categories
- Basic notification templates
- Default employee roles and permissions

## 7. Roles and Permission Strategy

The system should support both standard roles and configurable custom roles.

### Seeded Roles

- Super admin
- Tenant admin
- HR admin
- HR executive
- Manager
- Employee
- Auditor
- Support or implementation partner

### Permission Design

Permissions should be:

- Module-based
- Action-based
- Data-scope-based
- Field-level for sensitive information
- Workflow-step-aware for approvals and edits

Examples:

- A manager can view only direct and indirect reports
- An HR executive can edit employee records but not salary-sensitive sections
- An auditor can view records and logs but not modify data

## 8. Workflow Philosophy

Every client operates differently, so workflows must be configurable rather than fixed.

### Workflows To Support Early

- Employee onboarding
- Document verification
- Probation confirmation
- Leave approval
- Attendance regularization approval
- Transfer approval
- Promotion approval
- Exit approval
- Asset clearance
- Profile change request approval

### Workflow Controls

- Single or multi-step approval
- Sequential or parallel approval
- Auto-approval thresholds
- Escalation after time limit
- Delegated approval during leave/absence
- Rejection with comments
- Send back for correction

## 9. Seeded Setup Philosophy

Customers should be able to launch in one of three modes:

### Mode 1: Fast Start

- Minimal setup
- Fully seeded defaults
- Best for small companies

### Mode 2: Guided Configuration

- Seeded defaults plus admin adjustments during onboarding
- Best for mid-sized firms

### Mode 3: Advanced Setup

- Deep configuration before go-live
- Best for enterprise customers

This gives broad market fit without forcing every tenant into the same onboarding complexity.

## 10. HRMS MVP Recommendation

The first usable version should focus on the smallest set of features that still forms a complete HR operating system.

### MVP Scope

- Tenant creation and onboarding
- Organization structure setup
- Employee master
- Employee import
- Employee self-service basics
- Manager approvals basics
- Leave setup and leave transactions
- Attendance setup and attendance import/manual flow
- Holiday calendars and shifts
- Document management
- Workflow engine for common HR requests
- Basic reports
- Audit logs

### Out Of MVP But Designed For

- Performance management
- Recruitment ATS
- Learning management
- Detailed payroll processing
- Benefits administration
- Advanced workforce planning

## 11. Suggested Delivery Phases

### Phase A: Foundation and Setup

- Tenant model
- Auth and access control
- Seed data framework
- Configuration framework
- Organization setup
- User and role management

### Phase B: Employee Core

- Employee master
- Documents
- Lifecycle actions
- ESS/MSS core
- Mobile-ready ESS/MSS APIs

### Phase C: Leave and Attendance

- Leave engine
- Attendance engine
- Holiday calendars
- Shifts and regularization

### Phase D: Workflow, Reports, and Admin Controls

- Approval engine
- Notifications
- Reports
- Audit tools
- Import/export improvements
- Mobile approval inbox and push notification readiness

### Phase E: Payroll Readiness Layer

- Salary-related placeholders in employee data
- Pay group and compensation structures
- Attendance and leave outputs compatible with payroll
- Compliance-ready data model

## 12. UX Direction

The product should feel operationally powerful for HR teams but simple for employees.

### UX Principles

- Guided onboarding for admins
- Clean employee profile sections
- One-click access to approvals and exceptions
- Config screens separated from daily operation screens
- Clear audit and history views
- Simple defaults with expandable advanced settings

## 13. Integration Readiness

Even in the HRMS-first phase, the platform should remain ready for:

- Payroll module
- Accounting systems
- Attendance machines
- Identity providers and SSO
- Email/SMS gateway providers
- Document e-sign tools
- Recruitment systems

## 14. Channel Strategy

The product should be intentionally split by channel:

- Web: admin, HR, configuration, master data, deep reports
- Mobile: ESS and MSS for daily employee and manager actions

This should influence both UX and API design from the beginning.

## 15. Key Risks To Design Around

- Overbuilding custom logic too early
- Mixing seeded defaults with hardcoded behavior
- Weak permission boundaries around sensitive fields
- Attendance and leave logic becoming client-specific code
- Workflow engine not being generic enough
- Reports becoming fixed instead of configurable

## 16. Next Recommended Documents

- HRMS PRD
- Configuration blueprint
- Tenant and permission model
- Employee master schema draft
- Leave policy rule design
- Attendance policy rule design
- Workflow engine design
- Seed data catalog
- MVP story map
- ESS/MSS mobile strategy
