# STG-0D Batch-1 Automation Implementation

Date: 2026-10-26
Frozen scope: `STG-E2E-0101` through `STG-E2E-0106`
Baseline: 136 scenarios; all staging execution statuses remain `Not Run`

## Implementation

- Browser suite: `web/tests/e2e/stg0d-batch1-onboarding.spec.ts`
- Independent API/PostgreSQL suite: `backend/tests/test_stg0d_batch1_onboarding_integrity.py`
- Execution model: serial Playwright suite, one worker, run-scoped synthetic identifiers, isolated authentication, failure screenshots/video, and disposable PostgreSQL 16.
- No application code, migration, business rule, shared tenant, staging service, payroll workflow, or email delivery was changed.

The browser creates the tenant through Platform Admin UI. Direct API calls are used only for authenticated-session setup and independent verification. The backend suite independently exercises the supported APIs and reads persisted models after each operation.

## Frozen Scenario Mapping

| ID | Exact Playwright title | Browser and API assertions | Independent PostgreSQL assertions |
|---|---|---|---|
| `0101` | `STG-E2E-0101 creates one owned Enterprise tenant through Platform Admin UI` | UI create; HTTP 201; code, Enterprise plan and selected tenant ID | Tenant ownership, sandbox flag, primary domain and `tenant_created` audit payload |
| `0102` | `STG-E2E-0102 rejects duplicate tenant code without a second tenant` | UI duplicate submission; HTTP 400; actionable error; API list has one match | Tenant count remains one; no additional domain |
| `0103` | `STG-E2E-0103 rejects duplicate administrator email without partial identity` | First admin provisioned; duplicate-email provisioning returns HTTP 400 | User/membership counts unchanged; rejected contact has no user or membership link |
| `0104` | `STG-E2E-0104 activates the Enterprise subscription and exposes persisted state` | UI activation; API confirms `active` and `enterprise` | Tenant state and plan persisted; `tenant_updated` audit exists |
| `0105` | `STG-E2E-0105 provisioned Tenant Admin logs in and reaches tenant control center` | New admin authenticates, opens Tenant Admin and receives tenant-scoped console data | One active default membership, one primary `tenant-admin` role, provisioning audit and successful login |
| `0106` | `STG-E2E-0106 non-platform Tenant Admin cannot list or create platform tenants` | Tenant Admin receives HTTP 403 for list/create and cannot render platform tenant pipeline | Tenant count unchanged; denied code absent |

## Design Controls

- Browser operations use stable roles, labels, names and headings.
- Navigation waits for application network readiness instead of fixed sleeps.
- Tenant code, domains, emails and usernames are unique to the run.
- The serial dependency chain retains the same tenant/admin identity across the six connected scenarios.
- No browser shortcut creates the tenant or provisions the administrator outside the supported UI.
- The tests do not rely on shared Northstar, staging, production or customer records.

## Source Changes

STG-0D adds only the two focused test files and QA-document/register updates. The pre-existing four-line repair in `web/tests/e2e/db6-payroll-processing.spec.ts` was not edited or incorporated.
