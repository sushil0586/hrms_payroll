# Phase 7F Support Session Lifecycle Certification

Date: 2026-09-09

Environment: local dev

## Scope

Phase 7F certifies that tenant-approved support sessions stop granting access after end, revoke, or expiry transitions, and that those security-sensitive transitions remain visible in Tenant Trust Audit.

## Browser Coverage

- Tenant admin console loads support access management.
- Active grant row shows session reference, status, and lifecycle buttons.
- `End session` button is enabled only for an active grant and transitions the row to `Ended`.
- `Revoke` requires a decision note and transitions the row to `Revoked`.
- Support console denies previously active ended sessions.
- Support console denies previously active revoked sessions.
- Support console denies expired sessions after the real runtime support access evaluator marks them expired.
- Tenant Trust Audit opens with `event_group=support` and exact `support_session_ref` filters for each lifecycle path.
- Audit page shows lifecycle event rows, denied runtime evidence rows, actor/session details, and the `Download audit` entry point.
- Audit page passes horizontal overflow checks.

## API Evidence

- Ended sessions return `403` with `support_session_not_active`.
- Revoked sessions return `403` with `support_session_not_active`.
- Expired sessions return `403` with `support_session_not_active`.
- Trust audit response includes:
  - `support_access_session_ended`
  - `support_access_revoked`
  - `support_access_session_expired`
  - `support_access_session_denied`
- Every filtered audit event has the expected support session reference.
- Every filtered audit event has a non-empty source reference.

## Suite

- `web/tests/e2e/phase7f-support-session-lifecycle.spec.ts`

Result:

- `1 passed`

## Residual Risks

- Audit CSV file content is still not parsed after clicking `Download audit`.
- Rejected requested-grant lifecycle evidence is still pending as a smaller negative path.
- Browser-level copy around expired sessions could be made more explicit if product wants separate `Expired` vs generic denied messaging in the support console.
