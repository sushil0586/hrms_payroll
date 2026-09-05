# Phase 0 Review: Permissions and Live-vs-Demo Behavior

## 1. Purpose

This document captures the Phase 0 review of:

- current permission coverage
- current live-versus-demo behavior
- the highest-risk gaps that should be addressed before deeper HRMS completion work

This is a technical review of the current implementation state as of June 18, 2026.

---

## 2. Executive Summary

The current platform has a usable authentication base, but authorization is still shallow relative to the breadth of the product surface.

At a high level:

- authentication exists and is working
- tenant-linked employee context exists and is working
- manager-scoped approval protection exists in important flows
- role-based HR admin authorization is not yet strongly enforced
- web and mobile demo fallback behavior is helpful for demos but still risky for real operations

The biggest Phase 0 risks are:

- an authenticated employee may be able to reach more HR admin API surface than intended
- some web pages can render demo data instead of failing loudly when live backend access is unavailable
- route-level access expectations are stronger in the UI than they are in the actual authorization model

---

## 3. Current Strengths

## 3.1 Authentication Is Present And Working

What is already solid:

- login, session, and logout endpoints exist
- token authentication is in place
- session user payload includes active memberships
- web route handlers generally require the auth cookie before proxying mutations

## 3.2 Employee Context Resolution Exists

The backend consistently resolves a logged-in user into:

- default active tenant membership
- tenant-linked employee record

This gives the backend a real operating context for:

- ESS flows
- MSS flows
- most HR admin flows

## 3.3 Manager Scope Checks Exist In Critical Approval Flows

Important manager approval endpoints include scope validation for:

- leave request approvals
- attendance regularization approvals

This is a good foundation, especially for ESS/MSS safety.

## 3.4 Web Mutation Route Handlers Usually Enforce Authentication

Most Next route handlers under `web/src/app/api/**` do the right basic thing:

- require `HRMS_API_BASE_URL`
- require `hrms_access_token`
- reject unauthenticated mutation attempts

This is better than silently submitting demo writes.

---

## 4. Permission Findings

## 4.1 HR Admin Endpoints Mostly Require Authentication, Not Strong HR Role Authorization

Current pattern:

- most backend HR admin views inherit `EmployeeContextMixin`
- `EmployeeContextMixin` enforces authentication and employee resolution
- but it does not itself enforce:
  - HR admin role
  - explicit permission key
  - scoped admin authorization policy

Practical impact:

- if a user has an active employee context, many HR admin endpoints may be reachable unless blocked elsewhere in business logic
- this is weaker than the UI and route naming suggest

Risk level: `High`

## 4.2 Role And Scope Models Exist But Are Not Yet The Consistent Runtime Gate

The platform already has:

- roles
- role permissions
- membership roles
- membership scopes

But the runtime API protection pattern is still mostly:

- authenticated user
- active employee context

rather than:

- authenticated user
- active employee context
- required role or permission key
- required scope

Risk level: `High`

## 4.3 Web Workspace Access Is Not Strongly Route-Guarded By Role

Current behavior:

- the home page links to HR admin, ESS, and MSS
- HR admin routes are now gated by workspace role
- ESS routes are now gated by authenticated session
- MSS routes are now gated by session workspace-access hints, including workflow-approver access

Practical impact:

- route access expectations are now enforced at the page boundary for the current workspaces

Risk level: `Reduced`

## 4.4 Manager Scope Checks Are Better Than HR Admin Checks

Manager approval flows do include narrower logic:

- direct-report checks
- workflow-approver checks in leave review paths

This means MSS approval security is currently more intentional than HR admin workspace security.

Risk level: `Observation`

## 4.5 There Is Not Yet A Visible Permission Matrix At Runtime

The system has permission data structures, but the runtime architecture does not yet clearly express:

- which endpoint requires which permission
- which page requires which role
- which mutation requires which scope

This makes it harder to:

- review access safety
- write focused authorization tests
- evolve roles without guesswork

Risk level: `Medium`

---

## 5. Live-vs-Demo Findings

## 5.1 Web Server Data Layer Previously Fell Back To Demo Data Too Easily

Original behavior in `web/src/lib/api.ts` fell back to demo data when:

- `HRMS_API_BASE_URL` is missing
- access token is missing
- backend response is not OK
- fetch throws

Practical impact:

- the UI can appear healthy even when the backend is unavailable or auth is broken
- this is useful for demos, but risky for real environments

Risk level: `High`

Current Phase 0 update:

- demo data is now controlled by explicit environment flag: `HRMS_ENABLE_DEMO_DATA=true`
- missing `HRMS_API_BASE_URL` only uses demo data when that flag is enabled
- missing auth no longer auto-converts workspace reads into demo mode
- live API non-OK responses now surface as real failures instead of silently rendering demo data
- workspace demo access is only allowed when demo mode is explicitly enabled and no live API is configured

## 5.2 Mobile Demo Mode Is Explicit But Still Mixed With Live Retry Logic

The mobile app intentionally supports demo mode and communicates it better than the web app.

This is good for demos.

However:

- live and demo behavior still share a lot of UX surface
- the product can shift into seeded data behavior when live calls fail

Risk level: `Medium`

## 5.3 Web Mutation Paths Fail Closed More Reliably Than Read Paths

This is an important difference:

- write routes usually fail when `API_BASE_URL` or token is missing
- read paths in server components may silently render demo data

This inconsistency can confuse operators:

- reads may look valid
- writes may fail immediately

Risk level: `High`

## 5.4 Demo Mode Is Useful, But It Needs Environment Discipline

Demo mode should exist.

But it should be clearly controlled by:

- environment
- route intent
- visible UI state

instead of acting as a generic fallback for most read failures.

Risk level: `High`

---

## 6. Recommended Fix Order

## 6.1 Permission Hardening

Recommended first:

1. define a minimal permission matrix for:
   - HR admin
   - manager approvals
   - ESS self-service
2. add reusable backend permission guards for HR admin endpoints
3. add route-level page guards in web for:
   - HR admin routes
   - MSS routes
4. add authorization-focused tests for:
   - employee denied HR admin routes
   - manager denied out-of-scope approvals
   - unauthenticated users redirected or rejected consistently

## 6.2 Live-vs-Demo Discipline

Recommended first:

1. define when demo mode is allowed
2. separate:
   - explicit demo mode
   - backend unavailable state
   - unauthorized state
3. stop silent fallback to demo data for production-intended HR admin pages
4. make demo state visually unmistakable when it is active

---

## 7. Suggested Policy For Demo Mode

Recommended operating rule:

- demo mode is allowed only when explicitly enabled by environment or user-facing demo entry flow
- missing auth should not auto-convert authenticated workspaces into demo mode
- backend failures should show a failure state, not a fake healthy state
- HR admin pages should prefer fail-closed behavior over demo fallback

This keeps demo usefulness without weakening trust in live operations.

---

## 8. Suggested Policy For Permissions

Recommended operating rule:

- ESS routes require authenticated employee context
- MSS approval routes require manager scope or workflow approver status
- HR admin routes require explicit HR admin role or permission key
- future payroll routes should require stricter role and audit conditions from day one

This is the minimum practical authorization posture before HRMS can be treated as stable.

---

## 9. Immediate Follow-Up Tasks

The best next tasks from this review are:

1. create a simple role-to-workspace permission matrix doc
2. implement backend helper checks for HR admin authorization
3. add web page guards for HR admin and MSS routes
4. refactor server-side read APIs so demo mode is explicit rather than silent
5. add backend tests for unauthorized and out-of-scope access attempts

---

## 10. Summary

The system is not missing authentication.

The bigger issue is that:

- authorization is not yet strong enough for the breadth of the current surface
- demo fallback is too forgiving for production-intended web reads

That makes this Phase 0 work important.

If we harden permission checks and make demo mode explicit, the rest of HRMS completion becomes safer, easier to test, and much more trustworthy.
