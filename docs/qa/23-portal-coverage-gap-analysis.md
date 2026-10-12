# Phase 3D.1 Portal Coverage Gap Analysis

Date: 2026-10-10  
Scope: ESS, MSS, Tenant Admin and Platform Admin.  
Execution status: audit/planning only. All new Phase 3D cases are initialized as Not Run unless separately supported by current release evidence.

## Coverage Summary

| Portal | Functionality groups | Fully covered by existing automation design | Partially covered | Uncovered / spec needed | Highest open priority |
| --- | ---: | ---: | ---: | ---: | --- |
| ESS | 11 | 5 | 5 | 1 | P0 |
| MSS | 8 | 4 | 3 | 1 | P0 |
| Tenant Admin | 13 | 8 | 4 | 1 | P0 |
| Platform Admin | 11 | 7 | 3 | 1 | P0 |
| Cross-portal security | 5 | 3 | 2 | 0 | P0 |

“Fully covered by existing automation design” means suitable existing tests are present. It does not mean the test has passed in Phase 3D.

## P0 Gaps

| Gap ID | Portal | Affected IDs | Gap | Current evidence | Required test specification |
| --- | --- | --- | --- | --- | --- |
| `P3D-GAP-P0-ESS-001` | ESS | `P3D-ESS-FNC-006/007/008/009` | Need one fresh employee-owned artifact bundle proving document upload/download, own payslip download/read audit and statutory proof upload with API/database evidence in the same current release fixture. | Existing individual tests and Phase 3C evidence; staging ESS payslip fixture absent in Phase 4B.3. | `P3D-TC-ESS-001`, `P3D-TC-ESS-002`, `P3D-TC-ESS-003`. |
| `P3D-GAP-P0-MSS-001` | MSS | `P3D-MSS-FNC-003/004/007` | Need fresh direct-report and non-direct-report negative proof for leave and attendance approval APIs, not just queue rendering. | Existing MSS RBAC tests; fresh Phase 3D evidence required. | `P3D-TC-MSS-001`, `P3D-TC-MSS-002`. |
| `P3D-GAP-P0-TADM-001` | Tenant Admin | `P3D-TADM-FNC-002/004/007/009/012` | Need end-to-end tenant admin mutation proof with audit evidence for user invite/access, role lifecycle, change request lifecycle and support grant lifecycle under one tenant. | Existing tests exist but not fresh 3D; Phase 4B focused tenant security was not full functional certification. | `P3D-TC-TADM-001` through `P3D-TC-TADM-005`. |
| `P3D-GAP-P0-PADM-001` | Platform Admin | `P3D-PADM-FNC-002/003/004/005/006/007/010` | Need current-release platform control-plane run covering lead conversion, tenant lifecycle, admin provisioning, blueprint safe apply, onboarding handoff/activation, policy-pack adoption and two-tenant isolation. | Many existing tests; Phase 4B.3 platform proof focused on auth/RBAC. | `P3D-TC-PADM-001` through `P3D-TC-PADM-007`. |
| `P3D-GAP-P0-SEC-001` | All | Portal RBAC/isolation groups | Need portal-specific API allow/deny matrix for ESS, MSS, Tenant Admin and Platform Admin using fresh current-release credentials and two tenants. | Phase 4B.3 verified deployed staging security scope; local portal functions still need action-level proof. | `P3D-TC-SEC-001`. |

## P1 Gaps

| Gap ID | Portal | Affected IDs | Gap | Required test specification |
| --- | --- | --- | --- | --- |
| `P3D-GAP-P1-ESS-001` | ESS | `P3D-ESS-FNC-003/005/010/011` | Full pagination/filter/back-forward/empty/error/responsive evidence across all ESS child pages. | `P3D-TC-ESS-004`. |
| `P3D-GAP-P1-MSS-001` | MSS | `P3D-MSS-FNC-002/005/006/008` | Manager notification source links, queue pagination and compact decision modal require a fresh combined pass. | `P3D-TC-MSS-003`. |
| `P3D-GAP-P1-TADM-001` | Tenant Admin | `P3D-TADM-FNC-010/011/013` | Security-readiness/trust-audit report values and audit export should be reconciled with backend data in current release. | `P3D-TC-TADM-006`. |
| `P3D-GAP-P1-PADM-001` | Platform Admin | `P3D-PADM-FNC-001/008/009/011` | Platform dashboard counts, audit log filters, permission catalog edit/restore and responsive panels need current full run. | `P3D-TC-PADM-008`. |
| `P3D-GAP-P1-DEPLOY-001` | Deployment persistence | Phase 4B fixes | Verify source-controlled staging auth and HSTS fixes persist through normal staging redeployment, including nginx active-site naming/runbook. | `P3D-TC-DEPLOY-001` audit/check, no production mutation. |

## P2 Gaps

| Gap ID | Portal | Gap | Treatment |
| --- | --- | --- | --- |
| `P3D-GAP-P2-UX-001` | All | Portal-wide compact UX visual comparison should be refreshed after any new functional fixes. | Run after P0/P1 functional passes. |
| `P3D-GAP-P2-DOC-001` | All | Documentation sync tests exist but should be refreshed after final portal certification. | Run near release sign-off. |

## Obsolete, Placeholder or Inapplicable Areas

| ID | Area | Classification | Release treatment |
| --- | --- | --- | --- |
| `P3D-OBS-MSS-001` | `/mss/approvals?queue=history` | Placeholder/partial implementation | Do not fail certification if product confirms completed-decision feed is out of scope; otherwise create P1 implementation/test requirement. |
| `P3D-OBS-TADM-001` | Tenant settings direct save | Unknown requirement | Current UI appears to route settings changes to change requests. Verify product intent before creating direct CRUD tests. |
| `P3D-OBS-PADM-001` | Platform permission metadata edits | Product behavior verified in code | Edits catalog metadata only; runtime permission enforcement is unchanged. Tests must not expect runtime permission semantics to mutate immediately. |
| `P3D-OBS-NOTIF-001` | Real email/SMS delivery | Phase 4 gate | In-app/sandbox notification tests can pass Phase 3D; real delivery remains outside local certification. |

## Phase 4B Deployment Persistence Risks

| Risk ID | Evidence | Risk | Severity | Required action |
| --- | --- | --- | --- | --- |
| `P3D-RISK-PERSIST-001` | `backend/config/settings/staging.py`, `backend/tests/test_production_like_settings.py`, Phase 4B.3 evidence | BasicAuthentication removal is source-controlled and regression-tested locally, but must be included in the next normal staging release package. | P0 | Confirm commit and redeploy path use the updated staging settings. |
| `P3D-RISK-PERSIST-002` | `ops/ec2/nginx/hrms.conf`, `docs/qa/evidence/phase4b2/18-stage-security-headers-after-hsts.json` | HSTS was deployed to active nginx; repo file contains the header, but active site filename/runbook alignment should be checked to avoid drift. | P1 | Reconcile nginx install path and capture post-redeploy header evidence. |
| `P3D-RISK-PERSIST-003` | Phase 4B.3 cleanup evidence | Disposable platform admin users were deactivated; future reruns require approved provisioning. | P1 | Keep provisioning runbook and avoid relying on deleted/deactivated credentials. |

## Recommended New Test Specifications

| Test ID | Priority | Portal | Scenario | Expected result | Existing tests to reuse first |
| --- | --- | --- | --- | --- | --- |
| `P3D-TC-ESS-001` | P0 | ESS | Employee uploads document evidence, HR/backend state records pending review, employee downloads own artifact and cross-employee download is denied. | Own document persists and downloads; unauthorized request denied without metadata leakage. | `ess-documents-launch-certification.spec.ts`, documents backend tests. |
| `P3D-TC-ESS-002` | P0 | ESS | Employee opens published payslip, downloads, marks/read acknowledges and API/database access audit records download/read. | Published-only own payslip visible; audit/read state updated. | `ess-payslip-flows.spec.ts`, `pilot-100-output-payslip-ess-certification.spec.ts`. |
| `P3D-TC-ESS-003` | P0 | ESS | Employee creates statutory declaration, uploads proof, submits, then locked/submitted edit is denied. | Draft/proof persists; submit changes state; locked edits blocked. | `ess-statutory-declarations-flows.spec.ts`. |
| `P3D-TC-ESS-004` | P1 | ESS | All ESS child pages pass filters, pagination, empty state and mobile compact checks. | No overlap; URL state/back-forward stable. | ESS launch/responsive specs. |
| `P3D-TC-MSS-001` | P0 | MSS | Manager approves and rejects scoped leave and attendance items with downstream state/audit verification. | Scoped records transition correctly; reject requires note. | `mss-control-center-certification.spec.ts`, `mss-rbac-approver-certification.spec.ts`. |
| `P3D-TC-MSS-002` | P0 | MSS | Non-manager and manager outside reporting scope attempt approval UI/API actions. | UI hides/blocks; APIs deny. | `mss-rbac-approver-certification.spec.ts`, access-routing specs. |
| `P3D-TC-MSS-003` | P1 | MSS | Manager notification source links route to correct approval context; pagination/mobile stable. | Notification source opens authorized context only. | `user-journey-phase4-manager-workflow.spec.ts`. |
| `P3D-TC-TADM-001` | P0 | Tenant Admin | Invite member, assign role, suspend/reactivate/revoke with audit proof. | Membership state transitions and audit evidence persist. | `tenant-admin-console-flows.spec.ts`, backend invite test. |
| `P3D-TC-TADM-002` | P0 | Tenant Admin | Create/edit/deactivate/reactivate custom role; system/assigned role guards. | Custom role lifecycle works; protected roles blocked. | `tenant-admin-roles-certification.spec.ts`. |
| `P3D-TC-TADM-003` | P0 | Tenant Admin | Create/approve/apply/reject/cancel change requests with note requirements. | Valid transitions only; audit evidence persists. | `tenant-admin-plan-settings-certification.spec.ts`. |
| `P3D-TC-TADM-004` | P0 | Tenant Admin | Request/approve/start/end/revoke support access with scoped session evidence. | Scope/time limit enforced; denied after end/revoke. | `tenant-admin-support-access-certification.spec.ts`, Phase 7 support specs. |
| `P3D-TC-TADM-005` | P0 | Tenant Admin | Tenant boundary and unauthorized APIs for employee/manager/HR/platform/support roles. | Denied without tenant data leakage. | `tenant-admin-boundary-certification.spec.ts`, Phase 4B.3 evidence. |
| `P3D-TC-TADM-006` | P1 | Tenant Admin | Security-readiness/trust-audit filters/download reconcile with backend audit source. | Values/export match source and permission gates. | `tenant-admin-security-trust-final-certification.spec.ts`, `tenant-trust-audit-flows.spec.ts`. |
| `P3D-TC-PADM-001` | P0 | Platform Admin | Lead review/qualification/conversion creates tenant/onboarding and audit evidence. | Lead state and tenant mapping persist; duplicate prevented. | `platform-admin-leads-certification.spec.ts`. |
| `P3D-TC-PADM-002` | P0 | Platform Admin | Tenant create/update/suspend/reactivate with audit and no cross-tenant leakage. | Lifecycle states persist and are scoped. | `platform-admin-crud-state-transition-certification.spec.ts`. |
| `P3D-TC-PADM-003` | P0 | Platform Admin | Launch blueprint validate/preview/safe apply; preview non-mutating; apply evidence created. | Certified safe seeders only; missing inputs blocked. | `platform-admin-launch-blueprint-certification.spec.ts`. |
| `P3D-TC-PADM-004` | P0 | Platform Admin | Onboarding metadata, admin provisioning dependency, handoff and activation gates. | Premature activation blocked; valid handoff/activation audited. | `platform-admin-launch-readiness-certification.spec.ts`, admin access spec. |
| `P3D-TC-PADM-005` | P0 | Platform Admin | Policy pack create/edit/publish/clone/adopt/compare/upgrade/drift/repair. | Published locks and adoption/upgrade evidence persist. | Setup-template lifecycle/deep regression specs. |
| `P3D-TC-PADM-006` | P0 | Platform Admin | Permission catalog edit/restore and tenant-assignability metadata. | Metadata persists; runtime permission contract unchanged. | `platform-admin-permission-catalog-certification.spec.ts`. |
| `P3D-TC-PADM-007` | P0 | Platform Admin | Two-tenant platform isolation and non-platform role denial through UI/API. | Platform can switch intended tenant; tenant users denied platform APIs. | `platform-admin-rbac-permissions-certification.spec.ts`, `platform-admin-tenant-isolation-certification.spec.ts`. |
| `P3D-TC-PADM-008` | P1 | Platform Admin | Dashboard counts, audit filters and responsive dialogs. | Counts reconcile; compact UI stable. | Dashboard/audit/visual specs. |
| `P3D-TC-SEC-001` | P0 | Cross-portal | Role matrix across ESS, MSS, Tenant Admin and Platform Admin with frontend and API checks. | Each role sees only intended portal/actions; APIs enforce same. | Phase 4B deployed scenarios, access-routing specs. |
| `P3D-TC-DEPLOY-001` | P1 | Deployment persistence | Confirm staging security fixes are in source-controlled deployment path and survive normal redeploy. | No BasicAuth; HSTS present after redeploy; no secret exposure. | Phase 4B.3 evidence and production-like settings test. |

## Certification Readiness

Phase 3D.1 is ready to proceed to execution planning. The portal surface is mapped, existing automation is reusable, and the highest-risk missing evidence is concentrated in P0 action-level persistence/RBAC checks rather than route discovery.
