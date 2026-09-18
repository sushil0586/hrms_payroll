# Platform Admin Leads Certification Report

Date: 2026-09-18  
Environment: local live API and deployed URL `https://hrms.accerio.in`  
Role: Platform Admin  
Source inventory: `docs/qa/platform-admin-discovery-inventory-2026-09-18.md`

## QA Result

Final Leads Status: Certified with minor findings

Automation added:
- `web/tests/e2e/platform-admin-leads-certification.spec.ts`

Scenarios tested:
- Public lead capture through public intake API.
- Lead visibility in Platform Admin Leads.
- Lead detail readability for company, contact, email, phone, employees, plan, industry, message, intent, status, and created timestamp.
- Search variants: full company, partial uppercase company, uppercase email with leading/trailing spaces, no-match, and special-character no-match.
- Status filters: active, closed, converted.
- Lead status transitions: new to reviewing, reviewing to closed, new to qualified, qualified to converted.
- Close confirmation dialog and persistence after refresh.
- Required tenant code validation during conversion.
- Lead-to-tenant conversion from browser UI.
- Double-click conversion protection by verifying exactly one tenant was created.
- Duplicate conversion prevention through direct API denial after conversion.
- Tenant field mapping: code, name, legal name, email, phone, domain, plan, seed pack, country, sandbox.
- Converted lead traceability back to created tenant.
- Tenant Management search verification for created tenant.
- Admin contact creation from lead conversion.
- Audit evidence via `public_lead_converted` onboarding event, including actor, timestamp, lead id, employee count, tenant code, and contact context.
- Keyboard focus visibility and no horizontal overflow.

Passed:
- Local live API: 2/2 passed.
- Deployed URL: 2/2 passed.
- TypeScript, lint, and whitespace checks passed.

Failed:
- No blocking failures remain.

## Execution Evidence

Local live API:

```bash
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-leads-certification.spec.ts --project=chromium
```

Result: 2 passed.

Deployed URL:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-leads-certification.spec.ts --project=chromium
```

Result: 2 passed.

Static checks:

```bash
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
git diff --check
```

Result: all passed.

## Defects

| ID | Severity | Type | Scenario | Steps | Expected | Actual | Evidence | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PA-LEADS-001 | Low | UX | Filter state persistence | Set Lead status to Closed or Converted, search a lead, refresh page | Operator context is preserved or URL reflects active filters | Page refresh returns to default active-leads filter | Observed while certifying refresh persistence; test reapplies filter before asserting persisted data | Consider URL-backed filters for Leads, matching enterprise expectations for shareable/refresh-safe queues |
| PA-LEADS-002 | Low | Product Gap | Page size/sorting | Review Leads list controls | Page size and sorting available if listed as expected table behaviors | Leads has fixed page size and no explicit sorting control | Current UI exposes search, status filter, record count, and pagination only | Add page-size and sort controls if Leads volume is expected to grow beyond small operator queues |

## Technical Findings

Console errors:
- None observed during successful certification.

Network errors:
- None observed for live API workflows.

Duplicate requests:
- Double-click Convert did not create duplicate tenants; exactly one tenant was present for the generated tenant code.

Broken navigation:
- None observed. Converted lead linked to the correct tenant admin setup route, and tenant was discoverable in Tenant Management.

## UI/UX Findings

Actual defects:
- None blocking.

Recommended improvements:
- Persist Leads filters/search in the URL so refresh/back-forward keeps operator context.
- Add explicit sort/page-size controls if public lead volume grows.
- Add a dedicated `Open tenant` action on converted leads in addition to `Open admin setup`, so operators can choose tenant registry vs admin-access workflow.
- Show a clearer disabled reason on converted leads explaining why Convert and Close are no longer available.

## Remaining Gaps

- Error-state simulation for failed upstream APIs was not forced on deployed environment.
- Sorting and page-size could not be certified because those controls are not currently available in the Leads UI.
- Public-lead edit/update fields are not currently exposed in the Platform Admin Leads UI; status updates and conversion are supported.
