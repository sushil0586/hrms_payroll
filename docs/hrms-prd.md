# HRMS Product Requirements Document

## 1. Document Purpose

This PRD defines the first major product scope for the HRMS SaaS platform.

It is intended to align:

- product direction
- business requirements
- user experience boundaries
- technical planning
- MVP scope
- future payroll readiness

The product is `HRMS-first`, with payroll added on the same foundation later.

## 2. Product Summary

Build a configurable multi-tenant HRMS SaaS platform that supports:

- employee master management
- organization structure management
- attendance and leave
- employee self-service
- manager self-service
- approvals and workflows
- documents and records
- operational reporting

The platform should work for different client sizes and industries by using:

- seeded defaults
- layered configuration
- role-based access
- workflow-driven operations

## 3. Product Vision

Create a modern HRMS platform that helps organizations move away from spreadsheets and fragmented tools by giving them:

- a configurable HR operating system
- a self-service layer for employees and managers
- auditable and structured workflows
- a future-ready base for payroll and compliance

## 4. Product Goals

### Business Goals

- onboard different client types without custom code for every customer
- reduce implementation time through seeded setup packs
- support SaaS scale with one configurable platform
- establish a reusable base for payroll, compliance, and future HR modules

### Product Goals

- make most HR business rules configurable
- support tenant-level, entity-level, and branch-level variation
- support both web and mobile channels with clear responsibilities
- ensure strong auditability and permission safety

### User Goals

- HR teams can manage people operations efficiently
- employees can complete common HR tasks through self-service
- managers can respond to approvals quickly
- customer admins can adapt the product without engineering intervention

## 5. Target Customers

### Primary Market

- SMB and mid-sized companies
- India-first launch market
- companies with 20 to 500 employees initially

### Expansion Market

- multi-entity organizations
- shift-based companies
- field workforce organizations
- enterprise customers with more complex hierarchy and approval needs

## 6. Product Principles

- configuration first
- seed by default
- multi-tenant by design
- mobile for daily actions
- web for administration and advanced operations
- workflow-driven approvals
- strict permission and audit controls
- payroll-ready data foundation

## 7. Supported Channels

### Web Application

Use web for:

- tenant onboarding
- master setup
- organization configuration
- employee administration
- leave and attendance setup
- workflow configuration
- reporting
- document rules
- audit and support operations

### Mobile Application

Use mobile for:

- ESS
- MSS
- attendance actions
- leave flows
- approvals
- notifications
- quick profile and document interactions

## 8. Key Personas

### Tenant Admin

Responsible for:

- tenant setup
- organization master management
- role assignment
- operational administration

### HR Admin

Responsible for:

- employee records
- HR policies
- lifecycle operations
- document compliance
- workflows and day-to-day HR operations

### HR Executive

Responsible for:

- onboarding/offboarding operations
- employee record updates
- document follow-up
- attendance and leave operations within assigned scope

### Manager

Responsible for:

- team oversight
- leave approvals
- attendance regularization approvals
- team-level daily HR actions

### Employee

Responsible for:

- self-service actions
- leave requests
- attendance interactions
- profile updates
- document uploads

### Auditor

Responsible for:

- read-only access to audit-relevant records and reports

## 9. Problem Statement

Many organizations face these issues:

- employee records spread across spreadsheets and emails
- leave and attendance handled manually
- approvals delayed because they are not workflow-driven
- poor self-service for employees
- inconsistent policy enforcement across branches or departments
- difficult audit and change tracking

The product should solve these through configurable workflows, structured master data, and self-service experiences.

## 10. Product Scope

## 10.1 Tenant Setup and Onboarding

The system must support:

- tenant creation
- subscription/module enablement
- initial admin user creation
- onboarding wizard
- seeded setup pack selection
- onboarding checklist and progress tracking
- initial import templates for organization and employee data

## 10.2 Organization Structure Management

The system must support:

- legal entities
- branches
- locations
- departments
- business units
- cost centers
- designations
- grades/bands
- employment types
- reporting structures

Everything should be configurable and tenant-owned.

## 10.3 Employee Master

The system must support:

- employee identifiers
- personal details
- contact details
- employment details
- organizational assignment
- government/KYC details
- emergency contacts
- education and experience
- skills/certifications
- bank details
- identity documents
- custom fields

The employee profile must support:

- section-level visibility
- field-level permissions
- tenant-configurable custom fields

## 10.4 Employee Lifecycle

The system must support:

- onboarding
- probation tracking
- confirmation
- transfer
- promotion
- role/designation change
- exit initiation
- notice period tracking
- clearance workflows
- relieving/experience document support

## 10.5 Employee Self-Service

The platform must allow employees to:

- view profile
- edit allowed fields
- submit profile change requests
- upload documents
- apply leave
- view leave balances
- view attendance summary
- submit attendance regularization
- view announcements
- access letters and records

These flows should work on web and mobile.

## 10.6 Manager Self-Service

The platform must allow managers to:

- view direct report summaries
- approve or reject leave
- approve or reject attendance regularization
- see team exceptions
- see employees on leave
- see pending team actions

These flows should work on web and mobile, with mobile optimized for quick action.

## 10.7 Attendance Management

The system must support:

- attendance policy setup
- shift definitions
- weekly off rules
- holiday calendars
- manual attendance entry
- attendance imports
- API-ready attendance ingestion
- attendance summaries
- grace rules
- late mark rules
- half-day/full-day logic
- overtime readiness
- regularization flows
- optional future geo-attendance support

## 10.8 Leave Management

The system must support:

- leave type master
- leave policy definitions
- accrual logic
- carry-forward rules
- encashment readiness
- leave eligibility rules
- leave request workflows
- leave balance tracking
- leave history
- leave calendar and team view

## 10.9 Documents and Records

The system must support:

- document categories
- mandatory document rules
- employee uploads
- document verification status
- document expiry tracking
- document reminders
- HR letter templates and downloadable records

## 10.10 Workflows and Approvals

The system must support:

- configurable approval workflows
- multi-step approvals
- role-based routing
- scope-aware routing
- escalation rules
- delegation rules
- action history
- send-back/rejection flows

## 10.11 Notifications and Communication

The system must support:

- in-app notifications
- email notifications
- push notifications for mobile
- event-based triggers
- reminder schedules
- announcements

## 10.12 Reporting

The system must support:

- employee directory
- headcount reports
- joiners and exits
- probation due
- leave balances
- attendance exceptions
- approval aging
- configurable exports

## 11. Configuration Requirements

The product must be configurable in these areas:

- organization labels and structure
- employment types
- custom profile fields
- profile section visibility
- leave policies
- attendance policies
- shift setup
- holiday calendars
- workflow routing
- role and permission mappings
- notification templates
- document categories
- report columns and access

### Configuration Model

Use:

- seeded defaults
- tenant overrides
- scoped overrides by entity, branch, department, grade, or employment type

### Fixed Core Areas

These should remain platform-controlled:

- authentication security model
- tenant isolation
- audit integrity
- encryption boundaries
- permission engine behavior

## 12. Permission and Security Requirements

The product must support:

- tenant-aware RBAC
- scope-based access filtering
- field-level visibility controls
- workflow-step authority
- audit logging for changes and approvals
- restricted access to sensitive fields and documents

Permission logic must be consistent across:

- web
- mobile
- admin screens
- APIs
- exports

## 13. Functional Requirements By Channel

## 13.1 Web Functional Requirements

The web application must support:

- full tenant onboarding
- full organization setup
- employee administration
- lifecycle administration
- leave and attendance administration
- workflow setup
- reports and exports
- document verification operations
- admin dashboards

## 13.2 Mobile Functional Requirements

The mobile application must support:

- login
- employee dashboard
- leave apply/status
- attendance view and mark attendance where enabled
- attendance regularization
- manager approval inbox
- notifications
- profile summary
- selected profile edits
- document upload and access in later phases

## 14. MVP Scope

The MVP should be enough for a customer to run core HR operations without payroll.

### MVP In Scope

- tenant onboarding basics
- organization structure setup
- employee master
- employee import
- employee lifecycle basics
- ESS basics
- MSS approval basics
- leave policies and leave transactions
- attendance setup and attendance import/manual operations
- holiday calendars
- shifts
- documents and mandatory document tracking
- workflow engine for common requests
- notifications
- basic reports
- audit logging
- mobile MVP for ESS/MSS

### Mobile MVP In Scope

- login
- home dashboard
- leave balance and leave apply
- leave history/status
- attendance summary
- mark attendance if tenant policy enables it
- manager approval inbox
- approval decision flow
- notifications center
- profile summary

### MVP Out Of Scope

- full payroll processing
- recruitment ATS
- performance management
- learning management
- advanced workforce planning
- compensation processing
- benefits administration
- full finance integrations

## 15. Non-Functional Requirements

The product should prioritize:

- tenant data isolation
- permission safety
- auditability
- responsive performance for common operations
- reliable background processing for imports and notifications
- mobile-ready APIs
- supportability through logs and admin tools

## 16. Success Metrics

Initial success should be measured by:

- time to onboard a new customer
- percentage of setup completed using seeded defaults
- employee self-service adoption
- manager approval turnaround time
- reduction in manual HR tracking
- low support issues caused by configuration gaps

## 17. Risks and Product Constraints

Key risks:

- over-customization that breaks SaaS simplicity
- weak permission design around sensitive data
- hardcoded client-specific workflows
- mobile scope becoming too broad too early
- inconsistent logic between web and mobile
- configuration complexity becoming too hard for admins

## 18. Dependencies

The MVP depends on:

- tenant and permission model
- configuration engine
- workflow engine
- employee and organization master models
- mobile-friendly API design
- notification infrastructure
- document storage and access controls

## 19. Open Product Decisions For Later

These can be decided in later planning rounds:

- exact India-specific compliance depth before payroll phase
- SSO rollout timing
- biometric unlock timing in mobile
- geo-attendance rollout timing
- enterprise dedicated deployment offering
- support access and impersonation policy details

## 20. Recommended Next Documents

- employee-master-schema.md
- workflow-engine-design.md
- leave-policy-rule-design.md
- attendance-policy-rule-design.md
- seed-data-catalog.md
- mvp-user-story-map.md
- api-surface-outline.md

## 21. Final Product Statement

The first product release should deliver a configurable multi-tenant HRMS platform with:

- strong employee and organization master data
- leave and attendance operations
- ESS and MSS across web and mobile
- configurable workflows and permissions
- seeded defaults for fast onboarding
- clean readiness for payroll and compliance expansion later
