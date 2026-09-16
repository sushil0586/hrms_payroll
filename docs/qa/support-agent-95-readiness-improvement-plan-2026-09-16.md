# Support Agent 95% Readiness Improvement Plan

Date: 2026-09-16  
Environment target: local first, then staging at `https://hrms.accerio.in`  
Primary role: Support Agent / scoped support operator  
Purpose: make Support workspace launch-ready for tenant-approved, time-boxed diagnostics with strict scope enforcement, audit visibility, and fail-closed behavior.

## Baseline

| Area | Current Rating | Target | Reason |
| --- | ---: | ---: | --- |
| Support functionality readiness | 88-92% | 95% | Support console, domain snapshot, tenant grants, and lifecycle controls exist, but the 95% gate needs consolidated role-level certification. |
| Support QA/browser coverage | 86-90% | 95% | Positive scope, lifecycle, and tenant-admin support grant specs exist; support landing and final role-menu regression need to run as one pack. |
| Support user-friendliness | 86-90% | 95% | Support pages show allowed/denied states clearly, but final certification must prove navigation, domain snapshot, and mobile/no-overflow behavior. |
| Support public launch readiness | 86-90% | 95% | Support can touch sensitive tenant diagnostics; launch needs strong evidence of tenant approval, scope denial, session end/revoke/expire, and audit traceability. |

## SUP-95-0 Inventory

Current routes:

| Route | Responsibility | Visible controls |
| --- | --- | --- |
| `/support` | Support session console | Runtime gate, session status, tenant posture, granted scopes, tenant console link, domain snapshot link. |
| `/support/domain-snapshot` | Read-only domain diagnostics | Scope-bound snapshot, available domains, status counts, denied-state fallback. |
| `/tenant-admin/support-access` | Tenant-approved support grants | Request, validation, approve/reject/start/end/revoke, search, pagination. |
| `/tenant-admin/trust-audit` | Customer-visible support audit | Support session checks, denied events, lifecycle event visibility, audit download. |

Current APIs and evidence surfaces:

| API/source | Purpose | Certification obligation |
| --- | --- | --- |
| `/support/tenant-console` | Scoped support session runtime check | Allowed only with active tenant-approved session and granted scope. |
| `/support/domain-snapshot` | Scoped diagnostic snapshot | Denies ungranted domains; returns read-only tenant diagnostics for granted scopes. |
| `/tenant-admin/support-access-grants` | Tenant support lifecycle | Request, approve, reject, start, end, revoke remain tenant-admin controlled. |
| `/tenant-admin/trust-audit` | Customer-visible support audit | Lifecycle and runtime decisions are visible and exportable. |

## Phase SUP-95-1: Support Console And Denied-State Certification

Goal:
- Certify `/support` and `/support/domain-snapshot` render clear allowed/denied states and stay usable on mobile.

Scope:
- Support console loads.
- Runtime enforcement card and support session gate render.
- Allowed/denied state is explicit.
- Domain snapshot route opens and exposes scope-bound state.
- Unscoped API calls fail closed without leaking sensitive fields.
- Mobile/no-overflow proof.

Target confidence after phase:

| Area | Target |
| --- | ---: |
| Functionality | 91-93% |
| Browser QA | 91-93% |
| UX | 90-92% |
| Launch readiness | 90-92% |

## Phase SUP-95-2: Tenant Grant Workflow Certification

Goal:
- Certify tenant-admin support access workflows.

Scope:
- Required field validation.
- Scope selection validation.
- Create/reject closed-state proof.
- Search and pagination.
- Unauthorized mutation denial.

## Phase SUP-95-3: Positive Scope And Lifecycle Certification

Goal:
- Certify support can read only tenant-approved scopes and lifecycle closures deny access.

Scope:
- Active grant allows only granted scope.
- Ungranted scopes deny with explicit reason.
- Domain snapshot allowed/denied proof.
- Ended, revoked, and expired sessions deny.
- Trust audit records lifecycle and runtime decisions.

## Phase SUP-95-4: Final Staging Certification

Goal:
- Run Support workspace as a final staging launch candidate.

Exit criteria:
- Focused support browser suite passes.
- Tenant-admin support access, positive support scope, lifecycle, credential matrix, and role-menu regressions remain green.
- Lint/build pass after changes.
- Documentation records environment, evidence, confidence, and non-blocking gaps.

## Execution Log

| Date | Phase | Environment | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-16 | SUP-95-0 inventory | Local documentation | Created Support Agent 95% plan and mapped route/API/workflow obligations. | Functionality 88-92%, QA 86-90%, UX 86-90%, launch 86-90% | Next phase is SUP-95-1 support console and denied-state certification. |
| 2026-09-16 | SUP-95-1 support console and denied-state certification | Local web with live staging API | Expanded and ran `support-console-flows.spec.ts`: 3/3 passed. Certified support console runtime gate, allowed/denied state visibility, configuration/commercial scope messaging, tenant/domain links, mobile/no-overflow, domain snapshot route, and support runtime APIs fail closed without leaking sensitive fields when no valid tenant-approved session exists. `pnpm --dir web lint` passed. | Functionality 91-93%, QA 91-93%, UX 90-92%, launch 90-92% | Next phase is SUP-95-2 tenant grant workflow certification. |
| 2026-09-16 | SUP-95-2 tenant grant workflow certification | Local web with live staging API | Ran `tenant-admin-support-access-certification.spec.ts`: 4/4 passed. Certified support access field validation, duration validation, scope selection validation, request creation, rejected grant closed-state, grant search, pagination, unauthenticated denial, and employee denial for support grant mutation. | Functionality 93-94%, QA 93-94%, UX 92-93%, launch 92-94% | Next phase is SUP-95-3 positive support scope and lifecycle certification. |
| 2026-09-16 | SUP-95-3 positive scope and lifecycle certification | Local web with live staging API plus backend semantic expiry tests | Updated stale tenant-admin route expectations, then ran `phase7d-support-session-positive-scope.spec.ts` and `phase7f-support-session-lifecycle.spec.ts`: 2/2 passed. Certified tenant-approved support scope, granted configuration health access, ungranted scope denial, domain snapshot allow/deny states, ended session denial, revoked session denial, lifecycle audit visibility, screenshots, and no horizontal overflow. Ran backend expiry/lifecycle proof: `.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "support_session_console_expires_stale_active_grant or tenant_admin_can_control_support_access_grant_lifecycle" -q`: 2/2 passed, including stale active grant auto-expiry and `support_access_session_expired` audit creation. | Functionality 94-95%, QA 94-95%, UX 93-94%, launch 94-95% | Browser expiry is intentionally not faked through local DB mutation against staging; expiry is covered at backend semantics where stale grants can be created deterministically. Next phase is SUP-95-4 final consolidated staging pack. |
| 2026-09-16 | SUP-95-4 final consolidated support certification | Local web with live staging API | Ran final pack: `support-console-flows.spec.ts`, `tenant-admin-support-access-certification.spec.ts`, `phase7d-support-session-positive-scope.spec.ts`, `phase7f-support-session-lifecycle.spec.ts`, `pilot-credential-matrix-certification.spec.ts`, and `public-launch-role-menu-certification.spec.ts`: 26/26 passed. This covers support console, support domain snapshot, tenant-admin grant validation/search/pagination/mutations, tenant-approved scoped access, ungranted scope denial, end/revoke denial, role-menu reachability, credential matrix role isolation, and support fail-closed without active tenant-approved session. `pnpm --dir web lint` passed. | Functionality 95%, QA 95%, UX 94-95%, launch 95% | Support Agent workspace is at the 95% launch-readiness gate. Remaining UX improvement is non-blocking polish: replace expected denied-route server noise in cross-role probes with quieter boundary pages/logging. |
