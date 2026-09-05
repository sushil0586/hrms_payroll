# Django Project Architecture

## 1. Objective

Define a Django backend architecture that is modular, tenant-aware, configuration-first, and ready for future payroll expansion.

The backend should support:

- HRMS-first delivery
- future payroll integration
- multi-tenant SaaS operations
- heavy configuration
- strong permissions and auditability

## 2. Architecture Style

Use a modular monolith for the first major phase.

### Why

- Faster to build than microservices
- Easier to debug
- Simpler deployment and operations
- Good fit for tightly connected HRMS domains
- Still allows strong internal domain boundaries

This means:

- one Django project
- multiple domain apps
- clear separation of models, services, APIs, and background jobs

## 3. Recommended Top-Level Structure

```text
hrms-payroll-saas/
  backend/
    manage.py
    config/
      settings/
        base.py
        local.py
        staging.py
        production.py
      urls.py
      asgi.py
      wsgi.py
      celery.py
    apps/
      tenants/
      iam/
      platform_config/
      organizations/
      employees/
      employee_lifecycle/
      documents/
      leave_management/
      attendance/
      workflows/
      notifications/
      reports/
      audit/
      common/
    requirements/
      base.txt
      local.txt
      production.txt
    tests/
  frontend/
    ...
  docs/
    ...
```

## 4. Core Django Apps

### 4.1 `tenants`

Responsible for:

- tenant master
- subscription metadata
- tenant status
- tenant-level settings
- tenant onboarding state
- seed pack selection

### 4.2 `iam`

Responsible for:

- users
- roles
- permission mappings
- role assignment
- access scope rules
- authentication support hooks

This app should handle domain-level RBAC, not just Django default auth.

### 4.3 `platform_config`

Responsible for:

- configuration definitions
- seed packs
- tenant overrides
- scoped overrides
- effective configuration resolution
- config versioning and publishing

This is one of the most important apps for the product.

### 4.4 `organizations`

Responsible for:

- legal entities
- branches
- locations
- departments
- designations
- grades
- business units
- cost centers
- reporting structure definitions

### 4.5 `employees`

Responsible for:

- employee master profile
- employee identifiers
- personal details
- employment details
- profile custom fields
- bank and contact details
- reporting manager links

### 4.6 `employee_lifecycle`

Responsible for:

- onboarding
- probation
- confirmation
- transfer
- promotion
- exit
- clearance
- status transitions

### 4.7 `documents`

Responsible for:

- document categories
- employee document uploads
- mandatory document requirements
- verification status
- expiry reminders
- generated HR letters

### 4.8 `leave_management`

Responsible for:

- leave types
- leave policies
- accrual logic
- leave balances
- leave requests
- approval routing integration
- holiday linkage where required

### 4.9 `attendance`

Responsible for:

- shifts
- attendance policies
- attendance records
- attendance imports
- regularization requests
- holiday calendars
- weekly offs
- overtime-related readiness

### 4.10 `workflows`

Responsible for:

- workflow templates
- approval steps
- routing rules
- escalation rules
- delegated approvals
- workflow instances
- action history

This app should be generic and reused across modules.

### 4.11 `notifications`

Responsible for:

- email templates
- in-app notifications
- scheduled reminders
- event-based message triggers
- delivery logs

### 4.12 `reports`

Responsible for:

- report definitions
- export jobs
- saved filters
- report scheduling later

### 4.13 `audit`

Responsible for:

- activity logs
- change history
- approval logs
- config change history
- access history where required

### 4.14 `common`

Responsible for:

- shared utilities
- base models
- enums
- exceptions
- validators
- pagination helpers
- reusable mixins

## 5. Suggested Internal Structure Per App

Each app should stay organized and avoid business logic sprawl.

```text
apps/employees/
  admin.py
  apps.py
  models/
  api/
    serializers/
    views/
    urls.py
  services/
  selectors/
  tasks.py
  permissions.py
  filters.py
  signals.py
  tests/
```

### Notes

- `models/` for data models only
- `api/serializers/` for API validation and transformation
- `api/views/` for thin controllers
- `services/` for business logic
- `selectors/` for reusable query logic
- `tasks.py` for Celery tasks
- `permissions.py` for domain access checks

## 6. Service Layer Guidance

Do not place major business rules directly in:

- views
- serializers
- model save methods
- admin actions

Prefer a service layer for flows like:

- onboarding an employee
- confirming probation
- applying leave
- importing attendance
- publishing configuration
- triggering workflow instances

This will keep logic testable and reusable.

## 7. Tenant-Aware Data Design

Every business model should be tenant-aware either directly or through strong parent ownership.

### Recommended Pattern

- direct `tenant` foreign key on major models
- clear query filtering by tenant
- service and selector helpers that always scope queries properly

### Important Rule

Never rely on frontend filtering for tenant separation.

Tenant separation must be guaranteed in backend query logic.

## 8. Configuration-Driven Architecture

The product should not hardcode customer-specific rules in domain apps.

Instead:

- configuration definitions live in `platform_config`
- domain apps consume effective configuration
- workflows use stored rule definitions
- leave and attendance engines use tenant policy data

This is essential for SaaS scale.

## 9. API Design Recommendation

Use REST APIs first.

### Suggested URL Style

```text
/api/v1/tenants/
/api/v1/employees/
/api/v1/leave/
/api/v1/attendance/
/api/v1/workflows/
```

### API Principles

- versioned from day one
- tenant-aware
- predictable resource naming
- filtering, pagination, sorting supported
- bulk import endpoints where operationally needed

## 10. Background Job Architecture

Use Celery tasks for:

- imports
- exports
- email delivery
- reminders
- document expiry checks
- leave accrual processing
- attendance anomaly scans
- future payroll batch work

Keep heavy jobs outside synchronous requests.

## 11. Django Admin Strategy

Use Django Admin as:

- internal support console
- implementation console
- seed data manager
- audit lookup console
- operational maintenance interface

Do not depend on it as the main customer-facing HRMS interface.

## 12. Settings Strategy

Split settings by environment:

- `base.py`
- `local.py`
- `staging.py`
- `production.py`

Also keep:

- environment variables for secrets
- feature flags for module rollout
- clear separation of optional integrations

## 13. Testing Strategy

Testing should be layered.

### Unit and Domain Tests

- service tests
- selector tests
- model validation tests
- permission tests

### API Tests

- endpoint behavior
- auth and RBAC coverage
- tenant scoping coverage

### Job Tests

- Celery task behavior
- import/export workflows

### End-to-End Tests

- critical employee and leave journeys
- login and approval flows

## 14. Payroll Readiness Considerations

Even before payroll is built, the architecture should leave space for:

- pay groups
- compensation structures
- payroll calendars
- attendance outputs for payroll
- leave payable/unpaid indicators
- final settlement dependencies

That is why employee, leave, attendance, workflow, and config models should be designed cleanly from the start.

## 15. Recommended First Apps To Build

Build in this order:

1. `common`
2. `tenants`
3. `iam`
4. `platform_config`
5. `organizations`
6. `employees`
7. `documents`
8. `workflows`
9. `leave_management`
10. `attendance`

This order supports a strong HRMS-first foundation.

## 16. Final Recommendation

Use a modular Django monolith with:

- DRF APIs
- service-layer business logic
- tenant-aware data scoping
- a first-class configuration app
- Celery for operational jobs
- Django Admin for internal operations

This will give us a clean base for HRMS first, and a safe path into payroll later.
