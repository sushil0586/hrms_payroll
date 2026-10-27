# HRMS STG-1F Tenant-Safe Evidence API

Date: 2026-10-26\
Scope: `STG-E2E-0101` through `STG-E2E-0106` only\
Decision: **IMPLEMENTED AND VERIFIED LOCALLY; NOT DEPLOYED**

## Contract

`GET /api/v1/platform/qa/staging-onboarding-evidence/` is a deliberately bounded evidence contract. It is not a database browser and accepts no SQL, table names, arbitrary filters, mutation methods, employee fields, payroll fields, or unbounded result requests.

The endpoint requires all of the following:

- `HRMS_ENVIRONMENT=staging`;
- `HRMS_STAGING_EVIDENCE_API_ENABLED=true` (default is `false`);
- Django token authentication for an active superuser whose exact username is in `HRMS_STAGING_EVIDENCE_API_ACTORS`;
- the non-tenant-assignable permission definition `platform.qa_evidence.view`;
- exact frozen scenario ID, run ID, tenant UUID and run-owned tenant code;
- exact resource UUIDs required by the selected scenario;
- matching `X-HRMS-Environment-Fingerprint`;
- a syntactically valid ownership-manifest SHA-256 header.

The run contract enforces `tenant_code == pw-qa-<run_id>` and a sandbox tenant. Membership and contact lookups include the tenant in the queryset. Scenario `0106` requires the administrator identity and membership IDs rather than allowing an empty negative assertion. The database work runs inside `SET TRANSACTION READ ONLY`.

## Supported Assertions

| ID | Bounded evidence |
|---|---|
| `0101` | Owned sandbox tenant, Enterprise plan, primary domain count, creation audit |
| `0102` | Exactly one tenant for the run-owned code after duplicate rejection |
| `0103` | Exact same-tenant membership, one provisioned contact, rejected contact remains unprovisioned, provisioning audit |
| `0104` | Active Enterprise state and update audit |
| `0105` | Exact membership is active/default and has the tenant-admin role |
| `0106` | Denied tenant code is absent and the exact administrator has no foreign membership |

Responses contain the run/scenario references, manifest hash, hashed environment fingerprint, limited tenant state, named booleans and aggregate pass state. They do not contain usernames, email addresses, passwords, tokens, contact rows, employee data, payroll data or unrestricted audit payloads. Contact input is capped at ten exact UUIDs; there is no list endpoint or pagination surface.

Allowed and denied attempts emit `staging_evidence_access` structured security events with actor, run, scenario, tenant, path, outcome and reason. The event excludes request payloads and credentials. Central log retention/alert delivery remains a staging gate.

## Playwright Integration

The frozen serial Batch-1 suite retains browser-initiated business actions. When `STG_EVIDENCE_API_REQUIRED=1`, the harness:

1. requires the environment fingerprint and append-only ownership manifest;
2. hashes the current manifest with SHA-256;
3. signs in through the existing Platform Admin browser flow;
4. submits the exact run-owned IDs to the bounded API through the Next.js authenticated proxy;
5. requires HTTP 200, matching run/scenario IDs and every returned assertion to be true.

No database credential is introduced into Playwright. Existing exact-ID ownership registration and cleanup planning remain unchanged. Local runs that do not enable the flag retain their previous behavior.

## Source

- `backend/apps/common/staging_evidence_api.py`
- `backend/apps/tenant_onboarding/api_urls.py`
- `backend/apps/iam/permission_catalog.py`
- `backend/config/settings/base.py`
- `web/tests/helpers/staging-run-manifest.ts`
- `web/tests/e2e/stg0d-batch1-onboarding.spec.ts`
- `backend/tests/test_stg1f_staging_evidence_api.py`

All 136 staging scenarios remain `Not Run`. This local API verification is not staging execution evidence.
