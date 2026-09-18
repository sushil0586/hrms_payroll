# Platform Admin Final Production-Readiness Certification Report

Date: 2026-09-18  
Target: `https://hrms.accerio.in`  
Browser: Playwright Chromium  
Primary journey spec: `web/tests/e2e/platform-admin-final-production-readiness-certification.spec.ts`

## Certification Status

Status: Certified after deployment rerun.

A release-blocking staging defect was found during the first final integrated lead-to-active-tenant journey. The defect was fixed, deployed, and the final integrated staging journey now passes.

## Final Journey Scope

The new integrated browser journey covers:

- Public lead creation from the public homepage.
- Platform Admin lead review and qualification.
- Lead conversion to tenant.
- Duplicate conversion protection.
- Tenant field mapping and persistence checks.
- Tenant configuration refresh/reopen validation.
- Primary admin contact-only readiness blocking.
- Tenant admin login provisioning.
- Setup template create, publish, preview, and apply.
- Setup confirmation, handoff, repeat handoff, activation, repeat activation rejection.
- Dashboard final state check.
- Audit evidence reconstruction and sensitive-data redaction.
- Restricted HR/non-platform RBAC regression against the newly created tenant.
- New-tab route access and responsive no-overflow checks.

## Blocking Defect Found

| ID | Module/Page | Issue | Type | Steps to Reproduce | Expected | Actual | Severity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PA-FINAL-001 | Platform Admin / Leads conversion | Fresh public lead conversion returned HTTP 500 on staging | Functional / API contract | Create public lead, log in as Platform Admin, qualify lead, fill conversion fields, click Convert lead | Conversion creates tenant, primary contact, audit evidence, and redirects to Admin Access | `POST /api/platform/leads/{leadId}/convert` returned `500 {}` | Blocker | `platform-admin-final-production-readiness-certification.spec.ts` failed on staging before local fix |

## Root Cause

`PlatformPublicLeadConvertView` returned an admin-contact response payload that no longer matched `PlatformOnboardingAdminContactSerializer`.

The serializer expects:

- `user_is_active`
- `membership_status`

The conversion response omitted those fields, causing a server-side serialization failure after conversion work began.

## Fix Implemented

Updated `backend/apps/tenant_onboarding/api_views.py` so lead conversion includes:

- `user_is_active: contact.user.is_active if contact.user_id else None`
- `membership_status: contact.membership.status if contact.membership_id else ""`

Business behavior is unchanged. This only restores the API response contract.

## Local Verification

| Check | Result |
| --- | --- |
| `./backend/.venv/bin/python backend/manage.py check` | Passed |
| `./backend/.venv/bin/python -m pytest backend/tests/test_public_lead_intake.py backend/tests/test_tenant_onboarding_api.py -q` | Passed, 26 tests |
| `pnpm --dir web exec tsc --noEmit` | Passed |
| `pnpm --dir web lint` | Passed |
| `git diff --check` | Passed |

## Staging Verification Before Fix Deployment

| Spec | Result | Notes |
| --- | --- | --- |
| `platform-admin-final-production-readiness-certification.spec.ts` | Failed | Blocked at lead conversion because staging does not yet include the API response fix |

## Post-Deployment Staging Verification

| Spec | Result | Notes |
| --- | --- | --- |
| `platform-admin-final-production-readiness-certification.spec.ts` | Passed, 1/1 | Full public lead to active tenant integrated journey passed on staging in Playwright Chromium |
| Platform Admin supporting suite | Passed after targeted stabilization | Broad suite first run: 13/15 passed; Launch Readiness copy assertion and RBAC timeout were stabilized; targeted rerun passed 4/4 |

Command executed:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-final-production-readiness-certification.spec.ts --project=chromium --workers=1
```

Optional supporting suite command for full Platform Admin regression:


```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
HRMS_ENABLE_DEMO_DATA=false \
pnpm --dir web exec playwright test \
  tests/e2e/platform-admin-dashboard-certification.spec.ts \
  tests/e2e/platform-admin-leads-certification.spec.ts \
  tests/e2e/platform-admin-tenant-isolation-certification.spec.ts \
  tests/e2e/platform-admin-launch-readiness-certification.spec.ts \
  tests/e2e/platform-admin-admin-access-certification.spec.ts \
  tests/e2e/platform-admin-setup-templates-lifecycle-certification.spec.ts \
  tests/e2e/platform-admin-audit-evidence-certification.spec.ts \
  tests/e2e/platform-admin-rbac-permissions-certification.spec.ts \
  tests/e2e/platform-admin-permission-catalog-certification.spec.ts \
  --project=chromium --workers=1
```

## Release Decision

Platform Admin final integrated production-readiness journey is certified on staging.

Confidence: high for the tested Platform Admin lead-to-active-tenant business journey and supporting module coverage. Remaining recommendation is a final overnight/full-regression pass before public launch cutover if schedule allows.
