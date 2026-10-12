# Phase 3D.1 Portal Test Mapping

Date: 2026-10-10  
Scope: static mapping of existing tests to ESS, MSS, Tenant Admin and Platform Admin functionality. No tests were executed.

## Mapping Summary

| Portal | Existing mapped files | Existing mapped scenarios | Strong functional assertions | Partial / adjacent assertions | Fresh 3D status |
| --- | ---: | ---: | ---: | ---: | --- |
| ESS | 24 | 67 | 41 | 26 | Not Run |
| MSS | 9 | 24 | 17 | 7 | Not Run |
| Tenant Admin | 22 | 68 | 50 | 18 | Not Run |
| Platform Admin | 20 | 53 | 42 | 11 | Not Run |
| Cross-portal security | 8 | 31 | 23 | 8 | Not Run for Phase 3D; Phase 4B staging evidence preserved |
| Total | 83 | 243 | 173 | 70 | Not Run |

Scenario counts are static discovery counts, not execution results. Historical Phase 3B/3C/4B evidence is referenced where useful but does not automatically certify Phase 3D functionality.

## ESS Test Mapping

| Test Map ID | Screen / functionality IDs | Test file | Existing scenario focus | Assertion strength | Phase 3D status |
| --- | --- | --- | --- | --- | --- |
| `P3D-MAP-ESS-001` | `P3D-ESS-SCR-001`, `FNC-001/011` | `web/tests/e2e/ess-control-center-certification.spec.ts` | Dashboard priorities, navigation to every ESS child workspace, personal API fail-closed checks | Strong for navigation/API scope; partial for downstream persistence | Not Run |
| `P3D-MAP-ESS-002` | `P3D-ESS-SCR-002`, `FNC-002/003` | `web/tests/e2e/ess-leave-launch-certification.spec.ts` | Leave page, validation, submission, lifecycle display | Strong for UX/validation; needs current fresh run | Not Run |
| `P3D-MAP-ESS-003` | `P3D-ESS-SCR-002`, `FNC-002` | `web/tests/e2e/ess-leave-policy-resolution-certification.spec.ts` | Balance-backed employee can submit without raw assignment error | Strong regression for policy-resolution path | Not Run |
| `P3D-MAP-ESS-004` | `P3D-ESS-SCR-003`, `FNC-004/005` | `web/tests/e2e/ess-attendance-launch-certification.spec.ts` | Attendance workspace and regularization behavior | Strong for regularization UX; persistence evidence should be refreshed | Not Run |
| `P3D-MAP-ESS-005` | `P3D-ESS-SCR-004`, `FNC-006/007` | `web/tests/e2e/ess-documents-launch-certification.spec.ts` | Document center, upload, requirement, filters and download controls | Strong UI coverage; Phase 3D should add database/audit verification if absent | Not Run |
| `P3D-MAP-ESS-006` | `P3D-ESS-SCR-005`, `FNC-008` | `web/tests/e2e/ess-payslip-flows.spec.ts` | Published payslip downloads and storage evidence | Strong for own-payslip path in local fixtures | Not Run |
| `P3D-MAP-ESS-007` | `P3D-ESS-SCR-005`, `FNC-008` | `web/tests/e2e/ess-payslips-launch-certification.spec.ts` | Payslip list/detail/filter/download/read state | Strong for UI; download audit proof should be confirmed | Not Run |
| `P3D-MAP-ESS-008` | `P3D-ESS-SCR-005`, `FNC-008` | `web/tests/e2e/pilot-100-output-payslip-ess-certification.spec.ts` | 100 payslips and employee own-payslip scope | Strong boundary/security proof | Not Run |
| `P3D-MAP-ESS-009` | `P3D-ESS-SCR-006`, `FNC-009` | `web/tests/e2e/ess-statutory-declarations-flows.spec.ts` | Declaration/proof workflows | Strong if fixture exists; fresh run required | Not Run |
| `P3D-MAP-ESS-010` | `P3D-ESS-SCR-007`, `FNC-010` | `web/tests/e2e/ess-notifications-launch-certification.spec.ts` | Inbox filters, list, summary, detail/source links and mobile | Strong in-app notification UX; external delivery excluded | Not Run |
| `P3D-MAP-ESS-011` | All ESS | `web/tests/e2e/ess-frontend-validation.spec.ts` | ESS validation without unnecessary API calls | Strong validation-only assertions | Not Run |
| `P3D-MAP-ESS-012` | ESS/MSS cross | `web/tests/e2e/ess-mss-workflow-certification.spec.ts`, `ess-mss-modal-certification.spec.ts`, `ess-mss-visual-functional-audit.spec.ts` | Cross-workspace workflow, modal and visual assertions | Mixed; useful for UX/regression, not complete business proof | Not Run |
| `P3D-MAP-ESS-013` | ESS access | `web/tests/e2e/user-journey-phase3-hr-admin-operations.spec.ts`, `phase3c3-employee-lifecycle-workforce-e2e.spec.ts` | Provision ESS access, employee login, admin denial and revocation | Strong cross-module proof; preserve as historical reference | Not Run |
| `P3D-MAP-ESS-014` | ESS isolation | `web/tests/e2e/production-tenant-role-isolation.spec.ts`, `pilot-100-security-isolation-certification.spec.ts` | Employee scope, payslip screen no HR/provider leakage, API denials | Strong security scope; Phase 4B staging evidence eligible for security reuse | Not Run |

## MSS Test Mapping

| Test Map ID | Screen / functionality IDs | Test file | Existing scenario focus | Assertion strength | Phase 3D status |
| --- | --- | --- | --- | --- | --- |
| `P3D-MAP-MSS-001` | `P3D-MSS-SCR-001`, `FNC-001/008` | `web/tests/e2e/mss-control-center-certification.spec.ts` | Dashboard queues, shortcuts, notifications and compact layout | Strong UI/RBAC assertions | Not Run |
| `P3D-MAP-MSS-002` | `P3D-MSS-SCR-002`, `FNC-002/003/004/005` | `web/tests/e2e/mss-control-center-certification.spec.ts` | Leave/attendance approval queues and decision modals | Strong UI and validation; persistence should be refreshed | Not Run |
| `P3D-MAP-MSS-003` | `P3D-MSS-SCR-002`, `FNC-003/004/007` | `web/tests/e2e/mss-rbac-approver-certification.spec.ts` | Custom approver/reviewer scopes and backend denials | Strong RBAC proof | Not Run |
| `P3D-MAP-MSS-004` | `P3D-MSS-SCR-002`, `FNC-003/004` | `web/tests/e2e/mss-frontend-validation.spec.ts` | Rejection requires decision note | Strong validation-only | Not Run |
| `P3D-MAP-MSS-005` | `P3D-MSS-SCR-003`, `FNC-006` | `web/tests/e2e/user-journey-phase4-manager-workflow.spec.ts` | Manager notifications and approval handoff links | Strong current-user journey proof | Not Run |
| `P3D-MAP-MSS-006` | MSS access | `web/tests/e2e/deployed-readonly-auth-routing.spec.ts`, `user-journey-phase1-access-routing.spec.ts` | Manager reaches MSS without HR escalation | Strong route/RBAC; stale heading was remediated historically | Not Run |
| `P3D-MAP-MSS-007` | MSS workflow | `web/tests/e2e/tier-two-workflow-flows.spec.ts`, `workflow-trace-flows.spec.ts` | Workflow trace, ESS notification and MSS queue switching | Strong after Phase 3B.5A history; fresh 3D run still required | Not Run |

## Tenant Admin Test Mapping

| Test Map ID | Screen / functionality IDs | Test file | Existing scenario focus | Assertion strength | Phase 3D status |
| --- | --- | --- | --- | --- | --- |
| `P3D-MAP-TADM-001` | `P3D-TADM-SCR-001`, `FNC-001/012/013` | `web/tests/e2e/tenant-admin-console-flows.spec.ts` | Account, seats, configuration and commercial evidence | Strong dashboard and several child-page proofs | Not Run |
| `P3D-MAP-TADM-002` | `P3D-TADM-SCR-002`, `FNC-002/003` | `web/tests/e2e/tenant-admin-console-flows.spec.ts` | User management invite/access lifecycle | Strong functional proof | Not Run |
| `P3D-MAP-TADM-003` | `P3D-TADM-SCR-002`, `FNC-002/003/013` | `web/tests/e2e/tenant-admin-users-dialog-certification.spec.ts` | Invite/update-role/access dialogs, validation, focus, Escape, pagination | Strong UX/validation; mutation persistence to refresh | Not Run |
| `P3D-MAP-TADM-004` | `P3D-TADM-SCR-002`, `FNC-002` | `backend/tests/test_tenant_admin_membership_invites.py` | Active workspace invite creates employee context | Strong backend integration | Not Run |
| `P3D-MAP-TADM-005` | `P3D-TADM-SCR-003`, `FNC-004/005` | `web/tests/e2e/tenant-admin-roles-certification.spec.ts` | Custom role lifecycle, system role guard, unavailable permissions, last-admin guard | Strong functional/security proof | Not Run |
| `P3D-MAP-TADM-006` | `P3D-TADM-SCR-004/006`, `FNC-006/007` | `web/tests/e2e/tenant-admin-plan-settings-certification.spec.ts` | Settings route to change request; validation; create/cancel; pagination/RBAC | Strong for current indirect settings model | Not Run |
| `P3D-MAP-TADM-007` | `P3D-TADM-SCR-005/006` | `web/tests/e2e/tenant-admin-plan-setup-settings-phase3-polish.spec.ts` | Setup guide, plan/settings desktop/mobile polish | Partial; visual/UX oriented | Not Run |
| `P3D-MAP-TADM-008` | `P3D-TADM-SCR-007`, `FNC-008/009` | `web/tests/e2e/tenant-admin-support-access-certification.spec.ts` | Support request validation, lifecycle, search/pagination, unauthorized denial | Strong functional/RBAC proof | Not Run |
| `P3D-MAP-TADM-009` | `P3D-TADM-SCR-008/009`, `FNC-010/011` | `web/tests/e2e/tenant-admin-security-trust-final-certification.spec.ts` | Security readiness, trust audit filters/pagination/download, employee denial | Strong evidence and RBAC proof | Not Run |
| `P3D-MAP-TADM-010` | `P3D-TADM-SCR-009`, `FNC-011` | `web/tests/e2e/tenant-trust-audit-flows.spec.ts` | Trust audit live evidence, filters, clear filters, pagination, download, employee denial | Strong | Not Run |
| `P3D-MAP-TADM-011` | Tenant admin RBAC | `web/tests/e2e/tenant-admin-boundary-certification.spec.ts` | Unauth redirect, role denial, tenant admin scoped access | Strong security proof | Not Run |
| `P3D-MAP-TADM-012` | Tenant admin validation | `web/tests/e2e/tenant-admin-frontend-validation.spec.ts` | Invite, role, support, change-request validation before API | Strong validation-only | Not Run |
| `P3D-MAP-TADM-013` | Tenant admin UX | `tenant-admin-visual-accessibility-certification.spec.ts`, `tenant-admin-usability-audit.spec.ts` | Desktop/mobile usability and safe dialogs | Partial functional; strong UX | Not Run |
| `P3D-MAP-TADM-014` | Tenant admin integrated | `tenant-admin-final-production-readiness-certification.spec.ts`, `tenant-admin-final-release-gate.spec.ts` | Integrated tenant owner journey | Strong historical release gate; fresh 3D run required | Not Run |

## Platform Admin Test Mapping

| Test Map ID | Screen / functionality IDs | Test file | Existing scenario focus | Assertion strength | Phase 3D status |
| --- | --- | --- | --- | --- | --- |
| `P3D-MAP-PADM-001` | `P3D-PADM-SCR-001`, `FNC-001/010/011` | `web/tests/e2e/platform-admin-dashboard-certification.spec.ts` | Dashboard metrics, widgets, shortcuts, refresh/back-forward, responsive focus | Strong UI/data smoke | Not Run |
| `P3D-MAP-PADM-002` | `P3D-PADM-SCR-002`, `FNC-002` | `web/tests/e2e/platform-admin-leads-certification.spec.ts` | Lead list/search/filter/close/keyboard, qualification/conversion/duplicates/audit | Strong functional proof | Not Run |
| `P3D-MAP-PADM-003` | `P3D-PADM-SCR-003`, `FNC-003` | `web/tests/e2e/platform-admin-tenant-create-browser-certification.spec.ts` | Tenant creation and Indian launch blueprint browser flow | Strong positive flow | Not Run |
| `P3D-MAP-PADM-004` | `P3D-PADM-SCR-003`, `FNC-003` | `web/tests/e2e/platform-admin-crud-state-transition-certification.spec.ts` | Create/update/suspend/reactivate/audit tenant | Strong lifecycle proof | Not Run |
| `P3D-MAP-PADM-005` | `P3D-PADM-SCR-004`, `FNC-004` | `web/tests/e2e/platform-admin-launch-blueprint-certification.spec.ts` | Blueprint preview, missing input guardrail, safe apply, growth placeholders | Strong launch rules proof | Not Run |
| `P3D-MAP-PADM-006` | `P3D-PADM-SCR-005`, `FNC-005` | `web/tests/e2e/platform-admin-launch-readiness-certification.spec.ts` | Gate blocking, handoff, activation, repeat protection, audit evidence | Strong state transition proof | Not Run |
| `P3D-MAP-PADM-007` | `P3D-PADM-SCR-006`, `FNC-006` | `web/tests/e2e/platform-admin-admin-access-certification.spec.ts` | Contact CRUD, login provisioning, readiness dependency, audit, tenant isolation, responsive UX | Strong | Not Run |
| `P3D-MAP-PADM-008` | `P3D-PADM-SCR-007`, `FNC-007` | `platform-admin-setup-templates-lifecycle-certification.spec.ts` | Authoring, publish, adopt, clone, compare, upgrade apply | Strong | Not Run |
| `P3D-MAP-PADM-009` | `P3D-PADM-SCR-007`, `FNC-007` | `platform-admin-setup-templates-deep-regression.spec.ts` | Multi-item lifecycle, preview/apply reconciliation, tenant isolation/version safety, negative validation | Strong regression | Not Run |
| `P3D-MAP-PADM-010` | `P3D-PADM-SCR-008`, `FNC-008` | `platform-admin-audit-evidence-certification.spec.ts` | Onboarding mutation evidence visible after refresh | Strong audit proof | Not Run |
| `P3D-MAP-PADM-011` | `P3D-PADM-SCR-009`, `FNC-009` | `platform-admin-permission-catalog-certification.spec.ts` | Catalog visibility/search/filter/edit/refresh/restore | Strong functional proof | Not Run |
| `P3D-MAP-PADM-012` | Platform RBAC | `platform-admin-rbac-permissions-certification.spec.ts` | Menu/routes/catalog only for platform operators; hidden mutation denials; direct URL denial | Strong security proof; Phase 4B focused staging proof also exists | Not Run |
| `P3D-MAP-PADM-013` | Platform security | `platform-admin-negative-security-certification.spec.ts` | Wrong roles/unauth denied; invalid fields and early activation gates fail visibly | Strong negative proof | Not Run |
| `P3D-MAP-PADM-014` | Platform tenant isolation | `platform-admin-tenant-isolation-certification.spec.ts` | Two-tenant browser lifecycle and context switching | Strong; Phase 4B.3 deployed two-tenant proof eligible | Not Run |
| `P3D-MAP-PADM-015` | Platform integrated | `platform-admin-final-production-readiness-certification.spec.ts`, `production-platform-admin-onboarding-flows.spec.ts` | Public lead to active tenant onboarding / five tenants | Strong broad journey; expensive/destructive-risk fixtures need care | Not Run |
| `P3D-MAP-PADM-016` | Platform validation/UX | `platform-admin-frontend-validation.spec.ts`, `platform-admin-visual-accessibility-certification.spec.ts`, `platform-admin-tabs-pagination-certification.spec.ts` | Required field validation, dialogs, route rendering, tabs/pagination | Strong validation/UX; partial business persistence | Not Run |

## Backend/API Test Mapping

| Test Map ID | Portal / functionality | Test file | Assertions | Fresh 3D status |
| --- | --- | --- | --- | --- |
| `P3D-MAP-API-001` | Tenant Admin console/users/roles/change requests/support/security/trust | `backend/tests/test_phase0_api_smoke.py` | Tenant admin console, employee denial, membership invite/manage with audit, custom roles, security/trust endpoints | Not Run |
| `P3D-MAP-API-002` | Tenant Admin membership invite | `backend/tests/test_tenant_admin_membership_invites.py` | Active workspace invite creates employee context | Not Run |
| `P3D-MAP-API-003` | Platform Admin tenants/leads/policy packs/permission catalog | `backend/tests/test_tenant_onboarding_api.py`, `backend/tests/test_public_lead_intake.py` | Platform permission catalog, tenant creation, first admin, public lead conversion, policy pack lifecycle | Not Run |
| `P3D-MAP-API-004` | ESS leave/attendance/documents/payroll | `backend/apps/leave_management/tests.py`, `backend/apps/attendance/tests.py`, `backend/apps/documents/tests.py`, `backend/apps/payroll/tests.py` | Business calculations and service validations supporting ESS/MSS screens | Not Run |

## Historical Evidence Eligible for Reuse

| Evidence | Eligible use | Limitation |
| --- | --- | --- |
| Phase 3C final baseline: 29 Passed, 3 Conditional, 0 Failed, 0 Blocked | Cross-module lifecycle confidence, ESS/MSS/role revocation reference | Local/sandbox only; does not replace fresh portal action certification. |
| Phase 4B.3 deployed staging report | Staging auth/RBAC/strict preflight/two-tenant proof for security gates | Not a full portal functional pass; ESS payslip was empty-state/no-leakage on staging. |
| Phase 3B module certifications | HR Admin downstream dependencies for documents, leave, payroll, reports, notifications | HR Admin focused; adjacent portal scenarios need own Phase 3D execution. |

## Unmapped / Weak Existing Tests

| Category | Examples | Treatment |
| --- | --- | --- |
| Navigation-only / visual-only | Route smoke, workspace shell, responsive visual gates | Keep as P2/P1 UX coverage; do not count as business action proof. |
| Broad integrated journeys | Final app audit, user journey suites | Map as adjacent support evidence; avoid double-counting as screen-level assertions. |
| Stale/timebox platform menu checks | Broad Phase 4B platform route-menu failures | Retain history; require focused cleanup or replacement before Phase 3D certification. |
| External delivery claims | Email/SMS notification proof | Excluded from local portal certification unless sandbox/real proof is explicitly approved. |
