# Phase 0 Backend Decomposition Targets

## 1. Purpose

This document closes the remaining Phase 0 refactoring question:

- which oversized backend surfaces should be split first
- why they should be split
- what boundary should be introduced before broader HRMS expansion

The goal is not to refactor everything now.

The goal is to define the first safe decomposition targets so Phase 1 work does not make the current aggregation layer harder to maintain.

---

## 2. Current Pressure Point

Primary hotspot:

- `backend/apps/common/api_views.py`

Observed size:

- about `5,300+` lines

Observed problems:

- too many domains in one file
- ESS, MSS, and HR admin views share one aggregation layer
- permission logic and request handling are too close together
- domain-level changes increase merge and regression risk
- onboarding for new contributors is slower than it should be

This file is still functional, but it is now clearly beyond a healthy long-term size.

---

## 3. First Decomposition Targets

## 3.1 Extract Workspace Access And Context Helpers

Move first:

- `EmployeeContextMixin`
- `HrAdminContextMixin`
- `ManagerDecisionMixin`
- related helper methods for workspace role gating and manager scope checks

Suggested destination:

- `backend/apps/common/api/workspace_access.py`

Why first:

- this logic is now business-critical
- it should be easy to test in isolation
- future modules will reuse the same access patterns

Expected result:

- API views become thinner
- access-control behavior is easier to review and test

## 3.2 Split HR Admin Views By Domain

Create separate modules for:

- employees and access
- organization masters
- attendance and attendance regularizations
- leave and leave balances
- policy assignments
- workflows
- documents
- lifecycle
- notifications
- reports

Suggested destination pattern:

- `backend/apps/common/api/hr_admin/employees.py`
- `backend/apps/common/api/hr_admin/organization.py`
- `backend/apps/common/api/hr_admin/attendance.py`
- `backend/apps/common/api/hr_admin/leave.py`
- `backend/apps/common/api/hr_admin/workflows.py`
- `backend/apps/common/api/hr_admin/documents.py`
- `backend/apps/common/api/hr_admin/lifecycle.py`
- `backend/apps/common/api/hr_admin/notifications.py`

Why this is the main refactor target:

- HR admin is the largest surface area
- Phase 1 will mostly change HR admin behavior
- splitting here gives the biggest reduction in future delivery risk

Expected result:

- smaller review units
- easier ownership by domain
- lower regression risk when Phase 1 admin work begins

## 3.3 Split ESS And MSS Views From HR Admin Views

Separate:

- ESS views
- MSS views
- HR admin views

Suggested destination pattern:

- `backend/apps/common/api/ess.py`
- `backend/apps/common/api/mss.py`
- `backend/apps/common/api/hr_admin/...`

Why:

- these workspaces now have distinct permission and UX expectations
- access-control rules are clearer when workspaces are not mixed in one file

Expected result:

- cleaner workspace boundaries
- easier future session and permission testing

---

## 4. What We Should Not Refactor Yet

Do not do these in the first decomposition pass:

- rewrite all serializers
- redesign selectors across all domains
- move every common helper into a new package at once
- replace DRF views with a new API pattern during Phase 1

Why:

- that would slow HR admin completion
- the immediate win is file and responsibility separation, not framework change

---

## 5. Recommended Execution Order

1. extract workspace access and manager-scope helpers
2. split HR admin views by domain without changing behavior
3. split ESS and MSS views into workspace-specific modules
4. update imports and URL wiring without changing API contracts
5. add focused tests around extracted access helpers where useful

---

## 6. Phase 1 Rule

During Phase 1:

- do not keep growing `backend/apps/common/api_views.py`
- any material new HR admin work should prefer the split domain modules

That keeps the refactor directional and prevents the aggregation layer from regrowing immediately.
