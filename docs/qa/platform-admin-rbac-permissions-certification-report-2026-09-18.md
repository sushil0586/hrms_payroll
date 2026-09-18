# Platform Admin RBAC and Permissions Certification Report

Date: 2026-09-18  
Environment: staging, `https://hrms.accerio.in`  
Browser: Playwright Chromium  
Primary spec: `web/tests/e2e/platform-admin-rbac-permissions-certification.spec.ts`  
Supporting spec: `web/tests/e2e/platform-admin-permission-catalog-certification.spec.ts`

## Executive Summary

Platform Admin RBAC is certified for the currently implemented authorization model: Platform Admin users can access Platform Admin modules and execute Platform Admin actions; non-platform tenant/HR users are denied at both UI route and backend/API layers.

The product currently exposes Platform Admin as a platform-operator-only workspace. No separate read-only Platform Admin or restricted Platform Admin role is currently exposed in the application, so view-vs-edit separation inside Platform Admin is not applicable yet. If enterprise customers require delegated platform support roles, that should be a future RBAC phase.

## Automated Evidence

| Spec | Environment | Result | Notes |
| --- | --- | --- | --- |
| `platform-admin-rbac-permissions-certification.spec.ts` | Staging | Passed, 3/3 | Menu visibility, direct URL denial, hidden-control backend denial, session/history/new-tab denial |
| `platform-admin-permission-catalog-certification.spec.ts` | Staging | Passed, 2/2 | Catalog visibility, filters, protected keys, edit validation, save, refresh persistence, restore |

## Role Matrix

| Role | Module | View | Create | Edit | Delete | Special Action | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Platform Admin | Dashboard | Allowed | N/A | N/A | N/A | Open action queues and evidence shortcuts | Passed |
| Platform Admin | Leads | Allowed | N/A | Allowed status changes | N/A | Convert lead to tenant | Passed by existing lead specs; API gate covered by RBAC denial test |
| Platform Admin | Tenants | Allowed | Allowed | Allowed | Not exposed | Tenant selection and lifecycle setup | Passed |
| Platform Admin | Launch Readiness | Allowed | N/A | Allowed metadata/setup | N/A | Baseline, handoff, activate | Passed |
| Platform Admin | Admin Access | Allowed | Allowed contact/login | Allowed contact/membership | Not exposed | Provision tenant admin login | Passed |
| Platform Admin | Setup Templates | Allowed | Allowed | Allowed on draft | Allowed on draft item | Publish, clone, adopt, preview, upgrade | Passed |
| Platform Admin | Permission Catalog | Allowed | Not exposed | Allowed metadata | Not exposed | Save/refresh/restore catalog metadata | Passed |
| Platform Admin | Audit Logs | Allowed | N/A | N/A | N/A | View redacted evidence payload | Passed by audit evidence spec; route access covered |
| HR Admin / Tenant-level admin | All Platform Admin modules | Denied | Denied | Denied | Denied | Denied | Passed |
| Unauthenticated user | All Platform Admin modules | Redirect to login / denied API | Denied | Denied | Denied | Denied | Passed |

## Direct URL Matrix

| Role | Protected Route | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| Platform Admin | `/platform-admin` | Dashboard visible | Dashboard visible | Passed |
| Platform Admin | `/platform-admin/leads` | Leads visible | Leads visible | Passed |
| Platform Admin | `/platform-admin/tenants` | Tenants visible | Tenants visible | Passed |
| Platform Admin | `/platform-admin/onboarding` | Launch Readiness visible | Launch Readiness visible | Passed |
| Platform Admin | `/platform-admin/admins` | Admin Access visible | Admin Access visible | Passed |
| Platform Admin | `/platform-admin/policy-packs` | Setup Templates visible | Setup Templates visible | Passed |
| Platform Admin | `/platform-admin/permissions` | Permission Catalog visible | Permission Catalog visible | Passed |
| Platform Admin | `/platform-admin/audit-logs` | Audit Logs visible | Audit Logs visible | Passed |
| HR Admin | All routes above | Safe redirect or unauthorized state | Redirected to `/`, no Platform Admin data rendered | Passed |
| Tenant Admin persona | All routes above | Safe redirect or unauthorized state | Redirected to `/`, no Platform Admin data rendered | Passed |
| Unauthenticated user | `/platform-admin` | Login redirect | Redirected to `/login` | Passed |

## Critical Action Matrix

| Action | Platform Admin | Restricted User API Attempt | Result |
| --- | --- | --- | --- |
| Lead list/status update/conversion | Allowed by Platform Admin workflows | `GET/PATCH/POST /api/platform/leads...` denied | Passed |
| Tenant create/edit/list | Allowed by Platform Admin workflows | `GET/POST/PATCH /api/platform/tenants...` denied | Passed |
| Launch metadata/update | Allowed by Platform Admin workflows | `GET/PATCH /api/platform/tenants/{id}/onboarding` denied | Passed |
| Baseline publish | Allowed only after gates | `POST mark-baseline-published` denied for restricted user | Passed |
| Handoff ready | Allowed only after gates | `POST mark-handoff-ready` denied for restricted user | Passed |
| Tenant activation | Allowed only after gates | `POST activate` denied for restricted user | Passed |
| Admin contact creation | Allowed | `POST admin-contacts` denied for restricted user | Passed |
| Tenant admin provisioning | Allowed | `POST provision-user` denied for restricted user | Passed |
| Setup template create/list | Allowed | `GET/POST platform-policy-packs` denied for restricted user | Passed |
| Setup template publish | Allowed on valid draft | `POST publish` denied for restricted user | Passed |
| Setup template adoption/preview | Allowed on valid tenant/template | `POST adoption-preview/adopt-for-tenant` denied for restricted user | Passed |
| Setup template upgrade | Allowed on valid tenant/template | `POST upgrade-compare/upgrade-apply` denied for restricted user | Passed |
| Permission catalog list/edit | Allowed for Platform Admin | `GET/PATCH permission-catalog` denied for restricted user | Passed |

## Permission Catalog Certification

Verified:

- Catalog loads and renders Platform Admin summary metrics.
- Permission keys are unique.
- Every returned permission has key, label, and module.
- Search, assignable scope, and risk filters work.
- Platform-only permissions such as `platform.permission_catalog.manage` are visible as platform-only and high/critical governance entries.
- Edit dialog protects immutable keys.
- Required label validation appears.
- Controlled metadata edit persists after refresh.
- Original values are restored and verified after refresh.

## Session, History, and Responsive Authorization

Verified:

- Restricted user opening a Platform Admin route is redirected safely to `/`.
- Browser Back does not reveal protected Platform Admin content.
- Refresh on the denied landing state does not reveal protected content.
- Opening a protected Platform Admin URL in a second tab remains denied.
- Desktop and tablet viewports do not expose hidden Platform Admin controls for restricted users.
- Unauthenticated browser context redirects to `/login`.
- Unauthorized API responses did not expose passwords, tokens, secrets, or tracebacks.

## Product Boundary / Enterprise Gap

Current Platform Admin RBAC is binary:

- `Platform Admin`: full Platform Admin access.
- `Non-Platform Admin`: no Platform Admin access.

There is no exposed delegated Platform Admin role such as:

- Platform Support Read-only
- Platform Billing Operator
- Platform Setup Template Manager
- Platform Audit Viewer
- Platform RBAC Manager

Recommendation for future enterprise SaaS maturity: add platform-scoped roles only if operational separation is required. Until then, the current binary gate is simpler and correctly enforced.

## Final Status

RBAC and Permissions status: Certified for current Platform Admin authorization model.

Residual risk: medium, product-design level only. Fine-grained Platform Admin delegation is not implemented, but no bypass was found for tenant/HR users against Platform Admin routes or mutation APIs.
