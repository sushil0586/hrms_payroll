# Platform Admin Audit Evidence Deep Certification Report

Date: 2026-09-18  
Module: Platform Admin -> Audit Logs / Audit Evidence  
Routes: `/platform-admin/audit-logs?tenantId=...`, related Platform Admin onboarding/admin/setup routes  
Automation: `web/tests/e2e/platform-admin-audit-evidence-certification.spec.ts`

## QA Result

Status: Certified locally. Deployed staging rerun is pending the next check-in/deployment because this pass includes a backend audit payload fix and Audit Logs UI enhancement.

This certification verifies that controlled Platform Admin mutations create attributable, tenant-scoped, operator-visible evidence. The test now checks the event stream API and the browser Audit Logs evidence dialog, not just row visibility.

## Mutation Evidence Matrix

| Mutation | Expected Event | Event Found | Tenant | Actor | Payload | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Tenant create | `tenant_created` | Yes | Correct QA tenant | `platform.admin` | Tenant id and primary domain | Passed |
| Tenant onboarding edit | `tenant_prepared` | Yes | Correct QA tenant | `platform.admin` | Updated field list includes notes, owner mode, setup style | Passed |
| Admin contact create | `admin_contact_added` | Yes | Correct QA tenant | `platform.admin` | Contact id and primary flag | Passed |
| Admin contact edit | `admin_contact_updated` | Yes | Correct QA tenant | `platform.admin` | Contact id and changed fields | Passed |
| Login provisioning | `first_admin_provisioned` | Yes | Correct QA tenant | `platform.admin` | Contact/user/membership/employee ids and role code; no password | Passed |
| Setup template adoption | `baseline_published` | Yes | Correct QA tenant | `platform.admin` | Pack id/code, domain, adoption id, adoption mode, result summary counts | Passed |
| No-op upgrade attempt | No successful upgrade event | No misleading event written | Correct QA tenant | `platform.admin` request rejected | Existing events unchanged | Passed |
| Go-live handoff | `handoff_marked_ready` | Yes | Correct QA tenant | `platform.admin` | Primary contact id | Passed |
| Repeated handoff | `handoff_marked_ready` | Yes | Correct QA tenant | `platform.admin` | Creates a second handoff-ready evidence row | Observation |
| Tenant activation | `tenant_activated` | Yes | Correct QA tenant | `platform.admin` | Tenant id/code/status/onboarding status/actor/completion timestamp | Passed |
| Repeated activation | No successful activation event | Rejected with 400 | Correct QA tenant | `platform.admin` request rejected | No misleading successful activation evidence | Passed |

## Template Evidence Reconciliation

Header-only setup template adoption was used in this audit evidence pass.

| Metric | Preview | Apply Result | Audit Payload | Match |
| --- | ---: | ---: | ---: | --- |
| Created | 0 | 0 | 0 | Yes |
| Updated | 0 | 0 | 0 | Yes |
| Skipped | 0 | 0 | 0 | Yes |
| Failed | 0 | 0 | 0 | Yes |
| Evidence-only | 0 | 0 | 0 | Yes |

Deep multi-item Setup Templates preview/apply/upgrade reconciliation remains covered separately by `platform-admin-setup-templates-deep-regression.spec.ts`.

## UI Evidence Review

Audit Logs now exposes a read-only evidence dialog per event row.

Certified:

- Event type, summary, actor, tenant, timestamp, event id, and payload are visible.
- Payload JSON wraps and scrolls within the modal.
- Escape, close button, and overlay click close the dialog.
- Search includes payload text, so operators can find contact ids, tenant ids, pack codes, and other evidence values.
- Sensitive credential-like keys are redacted before display.

## Tenant Isolation Result

The audit evidence is scoped through the selected tenant onboarding payload. The browser test uses a unique QA tenant code and verifies that event payloads and visible evidence reference that tenant only.

Dedicated cross-tenant isolation remains covered by `platform-admin-tenant-isolation-certification.spec.ts`.

## Sensitive Data Result

Passed.

The provisioning evidence payload was inspected through API and UI. Passwords, generated passwords, authorization values, SMTP passwords, secrets, and tokens were not present in the audit payload or browser evidence dialog.

## Product Corrections Included

- `tenant_activated` audit payload was upgraded from `{}` to include tenant id, tenant code, tenant status, onboarding status, actor, and completion timestamp.
- Audit Logs UI now provides a read-only evidence dialog with redacted payload JSON.
- Audit search now includes redacted payload text.

## Defects / Observations

| ID | Severity | Type | Scenario | Expected | Actual | Evidence | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PA-AUD-001 | Low | Audit/Workflow | Mark handoff ready twice through API after readiness is already set | Product may either reject repeat handoff or record repeat handoff as intentional evidence | Current API records a second `handoff_marked_ready` event | `platform-admin-audit-evidence-certification.spec.ts` found two handoff rows | Consider making handoff idempotent with a no-op response, or include `previous_handoff_completed_at` in repeated handoff evidence |
| PA-AUD-002 | Medium | Audit Coverage | Permission catalog edit | Permission changes should eventually produce explicit audit evidence | Current certification does not prove permission edit audit event because permission catalog API does not write onboarding events | Inventory gap remains partially open | Add platform-level audit event stream for non-tenant-specific platform mutations |

## Validation Run

Local:

- `HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-audit-evidence-certification.spec.ts --project=chromium --workers=1` -> 1 passed
- `cd backend && ./.venv/bin/python -m pytest tests/test_tenant_onboarding_api.py -q` -> 24 passed
- `pnpm --dir web exec tsc --noEmit` -> passed
- `pnpm --dir web lint` -> passed
- `cd backend && ./.venv/bin/python manage.py check` -> passed

## Final Status

Certified locally with minor observations.

Do not mark deployed certification complete until the latest backend/UI changes are checked in, deployed, and rerun against `https://hrms.accerio.in`.
