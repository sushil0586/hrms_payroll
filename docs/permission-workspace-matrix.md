# HRMS Workspace Permission Matrix

## 1. Purpose

This document defines the minimum workspace-level access model for the current HRMS product.

It is intentionally lightweight.

The immediate goal is to make access expectations explicit for:

- HR admin workspace
- ESS workspace
- MSS workspace

This is a Phase 0 hardening document, not the final enterprise authorization design.

---

## 2. Current Working Principle

The system already supports:

- authenticated users
- tenant memberships
- employee-linked memberships
- roles
- role permissions
- scopes

The immediate hardening step is to make workspace access follow a simple and consistent rule set before deeper permission granularity is added.

---

## 3. Minimum Workspace Rules

## 3.1 ESS

Workspace:

- employee self service

Minimum access rule:

- authenticated user
- active default tenant membership
- employee context resolved from that membership

Allowed examples:

- employee viewing profile
- employee viewing attendance summary
- employee applying leave
- employee submitting attendance regularization

Denied examples:

- user with no active employee context

## 3.2 MSS

Workspace:

- manager self service

Minimum access rule:

- authenticated user
- active default tenant membership
- employee context resolved
- manager scope or active workflow approver scope for the target action

Allowed examples:

- direct manager approving leave
- direct manager approving attendance regularization
- configured workflow approver acting on a routed request

Denied examples:

- employee trying to approve another employee request without manager or workflow approver scope

## 3.3 HR Admin

Workspace:

- HR admin and operational control surfaces

Minimum access rule:

- authenticated user
- active default tenant membership
- employee context resolved
- active membership role code of `hr-admin`

Allowed examples:

- HR admin dashboard
- employee master administration
- organization masters
- policy administration
- lifecycle admin
- document administration
- notification administration
- reports and exports

Denied examples:

- ordinary employee with valid login
- manager without HR-admin role

---

## 4. Immediate Runtime Mapping

For the current implementation phase, use this mapping:

- `/api/v1/me/*`
  ESS rules
- `/api/v1/manager/*`
  MSS rules
- `/api/v1/hr-admin/*`
  HR admin rules
- `/hr-admin/*`
  should align with HR admin rules at the page level
- `/mss/*`
  should align with MSS rules at the page level, including workflow-approver-aware session access

---

## 5. Near-Term Next Step

This matrix should evolve later into:

- module-level permission keys
- action-level permission checks
- scope-aware admin authorization
- field-level restrictions for sensitive domains

But the current Phase 0 baseline is:

- explicit workspace gating first
- deeper authorization later
