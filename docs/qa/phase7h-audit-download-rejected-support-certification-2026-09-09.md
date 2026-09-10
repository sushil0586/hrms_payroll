# Phase 7H Audit Download And Rejected Support Certification

Date: 2026-09-09

Environment: local dev

## Scope

Phase 7H certifies rejected support-grant lifecycle evidence and the tenant-admin commercial/support audit export.

## Browser Coverage

- Tenant admin opens `/tenant-admin`.
- Support access form fields are visible: support agent, duration, reason, account posture, and configuration health.
- Tenant admin creates a disposable support access request through the browser.
- Created request row shows requested status, selected scope, decision note, and lifecycle buttons.
- `Reject` is disabled until a decision note is entered.
- `Reject` saves successfully and transitions the row to `Rejected`.
- Rejected row disables approve, start session, and revoke actions.
- Tenant admin opens `/tenant-admin/trust-audit` filtered to `support_access_rejected`.
- Trust audit shows rejected support evidence, actor/source details, and `Download audit`.
- Tenant admin clicks `Download audit` through the browser.
- Downloaded audit pack is parsed and validated as JSON.
- Touched pages pass horizontal overflow checks.

## Export Evidence

- Downloaded filename is `northstar-foods-commercial-support-audit-pack.json`.
- Audit pack includes:
  - `tenant.code = northstar-foods`
  - `audit_pack_ref`
  - `evidence_checksum_sha256`
  - `integrity.source_hashes.support_access_grants`
  - `integrity.source_hashes.commercial_events`
  - `support_access.grants`
  - `commercial_events`
- Export content includes the rejected support event, disposable reason, and source ref `saas.support_access.grant.v1`.

## Suite

- `web/tests/e2e/phase7h-audit-download-rejected-support.spec.ts`

Result:

- `1 passed`

## Note

The tenant-admin `Download audit` artifact is JSON, not CSV. Payroll artifact access audit CSV parsing remains a separate payroll-output evidence slice.

## Residual Risks

- Payroll artifact access CSV export content parsing remains pending.
- Meter-specific payroll run and provider connection usage-limit slices remain pending.
