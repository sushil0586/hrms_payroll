# Phase 7D Support Session Positive Scope Certification

Date: 2026-09-09

## Scope

Phase 7D proves that a tenant-approved support session lets the approved support operator access only the granted read-only support scope, while unapproved scopes remain denied.

## Product Fix

- Updated `web/src/app/support/layout.tsx` so the support workspace requires authentication only.
- The support page and support APIs remain responsible for tenant code, active session, support-agent match, read-only method enforcement, expiry, and scope checks.
- This fixes the bug where an approved platform/support operator was redirected away before the runtime support gate could evaluate the active grant.

## Browser Coverage

Suite:

- `web/tests/e2e/phase7d-support-session-positive-scope.spec.ts`

Touched pages certified:

- `/tenant-admin`
- `/support?tenant_code=northstar-foods&scope_ref=configuration_health&session_ref=<session>`
- `/support/domain-snapshot?tenant_code=northstar-foods&session_ref=<session>&domain_ref=configuration_health`
- `/support/domain-snapshot?tenant_code=northstar-foods&session_ref=<session>&domain_ref=payroll_readiness`

Controls and elements certified:

- Support agent textbox.
- Duration number input.
- Reason textbox.
- Account posture scope checkbox.
- Configuration health scope checkbox.
- Request access button disabled/enabled states.
- Requested grant row.
- Decision note textbox.
- Session ref textbox.
- Approve button disabled/enabled states.
- Start session button disabled/enabled states.
- Active grant status.
- Support session allowed badge.
- Support session denied state for ungranted payroll domain.

API/runtime gates certified through Playwright request context:

- `configuration_health` tenant console access is allowed for the active approved session.
- Allowed payload includes the granted scope and configuration health data.
- Allowed payload excludes commercial evidence when `commercial_evidence` is not granted.
- `commercial_evidence`, `payroll_support`, and `read_only_account` are denied with `support_scope_denied`.
- Denied payloads preserve the requested `required_scope_ref` and show only the actual granted scope list.

## Result

- Local Playwright Phase 7D run: passed.

## Residuals

- Expired-session behavior and end/revoke transitions need a dedicated browser mutation test.
- Support audit evidence filtering remains Phase 7E.
- UI cleanup opportunity: support access grant rows can accumulate from prior test runs; tests use unique reasons/session refs to avoid ambiguity.
