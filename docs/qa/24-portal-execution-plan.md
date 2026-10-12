# Phase 3D Portal Execution Plan

Date: 2026-10-10  
Created by Phase 3D.1 audit.  
Execution status: Not started.

## Entry Criteria

| Criterion | Requirement |
| --- | --- |
| Environment | Isolated local QA database for functional portal certification; staging only for explicitly approved deployed-security checks. |
| Data safety | Use disposable tenants, employees, managers, payroll artifacts, documents and support grants. Do not mutate customer data. |
| Personas | ESS employee, MSS manager, Tenant Admin, limited Tenant Admin, Platform Admin, HR Admin, restricted/no-access, and second-tenant identities. |
| Integrations | External email/SMS/payment/provider operations disabled, mocked or sandboxed unless Phase 4 explicitly approves live proof. |
| Phase 4B persistence | Confirm deployed security fixes are in source files before relying on staging redeploy behavior. |
| Evidence | Screenshots/traces/logs/API/database proof for every P0 mutation and RBAC denial. |

## Execution Sequence

| Phase | Batch | Scope | Primary test IDs | Exit criteria |
| --- | --- | --- | --- | --- |
| `3D.2` | Environment and portal fixtures | Build deterministic portal fixtures, confirm roles, two tenants, documents, payslips, approvals, tenant and platform data | `P3D-TC-SEC-001` setup, `P3D-TC-DEPLOY-001` audit-only | Personas authenticate; fixture IDs documented; 3D business tests still Not Run. |
| `3D.3` | ESS certification | Dashboard, leave, attendance, documents, payslips, statutory declarations, notifications | `P3D-TC-ESS-001..004` plus mapped ESS specs | All P0 ESS actions pass; no own-data leakage or artifact authorization defect. |
| `3D.4` | MSS certification | Manager control center, approval queues, direct-report RBAC, notifications | `P3D-TC-MSS-001..003` plus mapped MSS specs | Leave/attendance approvals and negative scope checks pass. |
| `3D.5` | Tenant Admin certification | Users, roles, plan/change requests, setup/settings, support access, security, trust audit | `P3D-TC-TADM-001..006` plus mapped tenant-admin specs | Tenant admin lifecycle, audit and tenant-boundary P0 checks pass. |
| `3D.6` | Platform Admin certification | Dashboard, leads, tenants, launch, onboarding, admins, policy packs, permissions, audit logs | `P3D-TC-PADM-001..008` plus mapped platform specs | Platform control-plane P0 lifecycle/RBAC/two-tenant checks pass. |
| `3D.7` | Cross-portal final regression | Role matrix, stale sessions, cross-portal navigation, responsive smoke, documentation sync | `P3D-TC-SEC-001`, selected P1/P2 UX specs | One status per portal scenario; no open P0/P1 release blockers. |

## Batch Detail

### Phase 3D.2 Environment and Fixture Certification

Actions:

- Confirm isolated DB and target base URLs.
- Create/reuse two disposable tenants with distinct users and records.
- Prepare one ESS employee with leave balance, attendance records, document requirements, published payslip and tax declaration eligibility.
- Prepare one manager with direct-report leave/attendance approvals and one non-direct-report negative record.
- Prepare Tenant Admin data: roles, memberships, change requests, support grants and audit events.
- Prepare Platform Admin data: public lead, tenant registry rows, onboarding state, policy pack and permission catalog metadata.
- Confirm external email/SMS/payment/provider calls are disabled or sandboxed.

Exit: fixture manifest created; no portal scenario marked Passed yet.

### Phase 3D.3 ESS Certification

Required checks:

- Dashboard navigation and personal summary.
- Leave positive/negative submission, attachment, overlap, holiday/working-day and balance behavior.
- Attendance regularization validation, locked row denial and manager downstream state.
- Document upload, re-upload, download, HR review state visibility and unauthorized denial.
- Payslip own download/read audit and other-employee/register denial.
- Statutory declaration draft/proof/submit/locked-state behavior.
- Notification filtering, read/unread and source link scope.
- Desktop/tablet/mobile compact UX.

### Phase 3D.4 MSS Certification

Required checks:

- Manager dashboard and permission-specific queue visibility.
- Leave approval/rejection with note requirement and downstream leave state.
- Attendance approval/rejection with note requirement and downstream attendance state.
- Non-manager and non-direct-report API/UI denials.
- Notification source links to approval contexts.
- Queue pagination, refresh/back-forward and compact modal UX.

### Phase 3D.5 Tenant Admin Certification

Required checks:

- User invite, role assignment, suspend/reactivate/revoke, seat/last-admin guards and audit.
- Role create/edit/activate/deactivate, protected system roles and unavailable permissions.
- Plan/settings change request create/approve/reject/apply/cancel with note and JSON validation.
- Support access request/approve/start/end/reject/revoke with scope and audit.
- Security-readiness values, trust-audit filters, pagination and export integrity.
- Tenant boundary and unauthorized mutation checks.
- Responsive dialogs and validation copy.

### Phase 3D.6 Platform Admin Certification

Required checks:

- Dashboard count reconciliation and selected tenant context.
- Public lead review/qualification/conversion and duplicate prevention.
- Tenant create/update/suspend/reactivate and audit.
- Launch blueprint validation, preview non-mutation and safe apply.
- Onboarding metadata, admin provisioning, handoff and activation gates.
- Policy pack lifecycle: create/edit/publish/clone/adopt/compare/upgrade/drift/repair.
- Permission catalog edit/restore and runtime-contract warning.
- Platform audit filters and evidence.
- Non-platform denial and two-tenant isolation.

### Phase 3D.7 Final Portal Regression

Required checks:

- Reconcile every portal test ID with latest status.
- Run role matrix and stale-session checks across all four portals.
- Run selected desktop/tablet/mobile compact UX sweeps.
- Preserve historical evidence separately from fresh Phase 3D results.
- Update final portal certification verdict.

## Release-Blocking Criteria

| Severity | Blocks release when |
| --- | --- |
| P0 | Unauthorized access, cross-tenant leakage, failed P0 portal mutation, financial/artifact leakage, support session over-scope, platform tenant mutation defect, or deployed BasicAuth regression. |
| P1 | Broken required filters/pagination/export/audit evidence, stale session not fail-closed, compact UI blocks required work, or deployment security fixes do not persist through redeploy. |
| P2 | Documentation mismatch, cosmetic layout issue with workaround, non-critical visual drift. |

## Evidence Requirements

| Scenario type | Minimum evidence |
| --- | --- |
| Portal mutation | Browser trace or screenshot, API response, database state or supported backend evidence, audit event where applicable. |
| RBAC/tenant isolation | Frontend denial plus backend/API denial with sanitized IDs; two-tenant negative proof where relevant. |
| Artifact/download | HTTP status, file metadata/hash when available, access audit event and unauthorized denial. |
| Validation | Screenshot or trace of field-level validation and proof no backend mutation occurred when applicable. |
| Responsive | Screenshots at desktop, tablet and mobile widths for representative high-density screens. |

## Known Gates Carried Forward

| Gate | Status |
| --- | --- |
| `HRADM-DEF-20261009-013` missing bank account readiness | Remains Phase 4/product decision gate; do not silently certify payment-dependent flows. |
| Provider conditional scenarios `3C-GATE-PROV-001/002` | Remain conditional until sandbox/provider evidence or approved exclusion. |
| Real external email/SMS delivery | Phase 4 launch gate, not claimed by local portal certification. |
| Backup/restore and monitoring/alerting | Phase 4 operations gates. |
| Production HSTS policy hardening | Phase 4 security/ops decision; staging pilot HSTS proof exists. |
