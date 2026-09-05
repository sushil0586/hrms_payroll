# Django Tech Stack Recommendation

## 1. Stack Decision

Use `Django` as the backend foundation for the HRMS-first SaaS.

This is a strong fit because the product is:

- Data-heavy
- Workflow-heavy
- Configuration-heavy
- Role and permission sensitive
- Rich in admin/backoffice operations

## 2. Recommended Stack

### Frontend

- `Next.js`
- `React`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`

### Mobile

- `React Native`
- `Expo`
- `TypeScript`

### Backend

- `Python 3.12+`
- `Django`
- `Django REST Framework`

### Database

- `PostgreSQL`

### Background Jobs

- `Celery`
- `Redis`

### API and Documentation

- `Django REST Framework`
- `drf-spectacular` for OpenAPI and Swagger docs

### Authentication and Authorization

- Django auth system
- JWT or secure session auth depending on frontend approach
- Role and permission framework built on top of Django groups/permissions plus domain-specific access logic

### File and Document Storage

- `Amazon S3` or `Cloudflare R2`
- `django-storages`

### Infra

- `Docker`
- `Nginx`
- `AWS` for production hosting

### Monitoring and Error Tracking

- `Sentry`
- `OpenTelemetry`
- `Prometheus` / `Grafana` later if needed

### Testing

- `pytest`
- `pytest-django`
- `factory_boy`
- `Playwright` for frontend end-to-end tests
- `Detox` or React Native testing stack for mobile end-to-end coverage later

### Optional Supporting Tools

- `django-filter`
- `django-cors-headers`
- `Celery Beat`
- `WeasyPrint` or another PDF tool for HR letters and exports

## 3. Why Django Fits This Product

### 3.1 Excellent Relational Data Handling

HRMS systems depend heavily on structured relational data:

- employees
- departments
- branches
- managers
- leave policies
- attendance rules
- workflows
- documents
- audit records

`Django + PostgreSQL` is especially strong for this type of model.

### 3.2 Fast Admin and Operations Tooling

`Django Admin` is a major advantage for:

- internal support tooling
- seed data management
- configuration management
- implementation team operations
- audit lookup
- quick master data maintenance

This can save a large amount of development time early on.

### 3.3 Mature Security and Auth Foundation

Django gives a stable base for:

- authentication
- permissions
- sessions
- admin controls
- CSRF protection
- password handling

That matters a lot for HR and payroll-adjacent systems.

### 3.4 Good Fit For Configuration-Driven SaaS

This product needs a lot of:

- forms
- validation
- master setup
- policy storage
- approval workflows
- data import/export

Django is very good at these business application patterns.

## 4. Recommended Frontend + Backend Shape

### Recommended Split

- `Next.js` for customer-facing UI
- `Django REST Framework` for APIs
- `Django Admin` for internal/admin operations
- `React Native` app for ESS/MSS mobile use cases

This gives:

- modern UX for users
- strong backend stability
- fast internal tooling without building every admin screen manually
- one shared API platform for web and mobile

## 5. Authentication Recommendation

For a SaaS product with web frontend:

- use token or cookie-based auth between `Next.js` and `Django`
- keep tenant-aware access checks on the backend
- design for SSO later

### Initial Recommendation

- Email/password login
- Role-based access control
- Optional MFA later
- SSO support later for enterprise plans

## 6. Multi-Tenant Strategy Recommendation

For the first version, prefer:

- shared application
- shared database
- logical tenant isolation at the row level

Every major model should carry tenant ownership or tenant-derived scoping.

### Why This Is Better Initially

- easier SaaS operations
- lower infra cost
- simpler upgrades
- faster onboarding for new customers

### Future Option

Large clients can later be offered:

- isolated databases
- dedicated deployment

But do not start there unless required.

## 7. Background Job Strategy

Use `Celery + Redis` for:

- sending emails and notifications
- processing attendance imports
- generating reports
- running scheduled reminders
- syncing external systems
- future payroll calculations and batch operations

### Scheduled Work

Use `Celery Beat` for:

- leave accrual schedules
- probation reminder jobs
- document expiry reminders
- attendance anomaly checks
- policy-based scheduled tasks

## 8. Reporting and Export Strategy

Do not generate all large reports inline in request/response flow.

Use background jobs for:

- Excel exports
- CSV exports
- PDF letters
- large employee reports
- attendance summary packs

This will improve reliability and user experience.

## 9. File and Document Strategy

Use object storage for:

- employee documents
- HR letters
- policy acknowledgements
- imported files
- export files

Recommended:

- `S3` if on AWS
- `R2` if cost optimization is important

## 10. Recommended Django Ecosystem Choices

### Strong Defaults

- `Django`
- `djangorestframework`
- `psycopg`
- `django-filter`
- `django-cors-headers`
- `drf-spectacular`
- `celery`
- `redis`
- `django-storages`
- `boto3`
- `pytest`
- `pytest-django`
- `factory_boy`

## 11. Architecture Guidance

Even with Django, the codebase should be modular by domain, not one giant app.

Recommended domain modules:

- tenants
- organizations
- employees
- employee_lifecycle
- leave
- attendance
- workflows
- documents
- notifications
- reports
- audit
- platform_config

## 12. Risks To Avoid

- Putting too much business logic directly into views
- Treating Django Admin as the customer-facing product
- Letting tenant scoping be inconsistent
- Hardcoding client-specific rules into models or services
- Mixing configuration storage randomly across tables and JSON blobs
- Building a monolith without domain separation

## 13. Final Recommendation

If we choose Django, the baseline stack should be:

- Frontend: `Next.js + TypeScript + Tailwind + shadcn/ui`
- Backend: `Django + Django REST Framework`
- Database: `PostgreSQL`
- Async: `Celery + Redis`
- Storage: `S3/R2`
- Docs: `drf-spectacular`
- Testing: `pytest + pytest-django`
- Infra: `Docker + Nginx + AWS`

This is a practical, scalable, and enterprise-friendly stack for an HRMS-first SaaS.
