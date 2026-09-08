# Targeted Production Readiness Test Plan

Generated: 2026-09-08

## 1. Purpose

The broad final app audit passed for navigation, page rendering, console stability, request health, screenshots, and basic accessibility inventory across 240 screen/persona visits and 171 discovered URLs.

This plan covers the next layer: launch-critical proof for payroll, SaaS tenancy, access control, storage, provider callbacks, notifications, and controlled mutation workflows.

The goal is not to click every destructive button in shared demo data. The goal is to prove risky workflows using disposable records, isolated payroll periods, fixture providers, and auditable evidence.

## 2. Readiness Position

Current recommendation remains:

`NOT READY - MAJOR FIXES REQUIRED`

Reason:

- the UI crawl found no blocking defects
- targeted e2e suites exist for many payroll and SaaS workspaces
- production launch still requires controlled mutation coverage, provider execution coverage, identity/session coverage, notification-provider proof, storage-policy proof, and tenant-isolation negative tests

## 3. Test Principles

- Use `PW_TEST_` records for all mutation and destructive workflow tests.
- Never mutate canonical demo records unless a test explicitly creates and owns the data.
- Use dedicated disposable payroll calendars, pay groups, periods, runs, employees, salary structures, rules, statutory profiles, output batches, and handoff packages.
- Keep payroll behavior configuration-driven through refs, profiles, snapshots, policies, and effective dates.
- Assert both UI behavior and backend evidence for payroll-critical steps.
- Treat external services through fixture, sandbox, or contract-mode providers until production credentials exist.
- Capture screenshots for every launch-gate workflow at laptop and mobile sizes.

## 4. Launch Gate Matrix

| Gate | Objective | Evidence Required | Launch Status |
|---|---|---|---|
| Payroll close dry-run | Prove payroll can move from readiness to final lock and outputs on disposable data. | Playwright flow, backend assertions, final-lock evidence, immutable lines, checksums. | Required |
| Payroll negative controls | Prove blockers prevent unsafe calculation, late changes, unpaid/unpublished downloads, and mismatched tenant access. | API denial tests, UI disabled states, validation issue rows. | Required |
| Finance handoff | Prove bank/accounting/statutory artifacts generate and route through provider delivery evidence. | Provider delivery rows, route refs, reconciliation snapshots, retry evidence. | Required |
| Provider callbacks | Prove signed, idempotent, replay-safe callback ingestion. | Valid callback accepted, replay rejected, bad signature rejected, event ledger. | Required |
| Storage governance | Prove configured storage policy, credential-ref resolution, signed URL grants, revocation, and audit export. | Storage headers, no persisted secrets, revoked grant denial, audit CSV. | Required |
| Tenant isolation | Prove cross-tenant reads/writes/downloads are denied across HR, payroll, ESS, MSS, tenant admin, and support. | API tests and browser negative route checks. | Required |
| Role boundaries | Prove employee, manager, HR admin, tenant admin, platform admin, support, and auditor roles only see intended surfaces. | Route denial matrix, action denial matrix. | Required |
| Enterprise identity | Prove MFA/SSO/SCIM readiness is reflected and runtime stubs fail closed when not configured. | Readiness API, UI posture, config negative tests. | Required before enterprise launch |
| Notifications | Prove payroll publish, reminders, escalations, retries, and read receipts work with provider or fixture evidence. | Notification queue rows, delivery attempts, inbox/read state. | Required |
| SaaS operations | Prove launch audit, remediation, commercial enforcement, support access, resilience, SLA, and trust audit surfaces are coherent. | Command outputs, audit pack checksums, tenant-admin review. | Required |
| Visual regression | Prove key screens stay modern, non-overflowing, and usable at target viewports. | Playwright screenshots and visual baselines. | Required |

## 5. Playwright Suite Plan

### Suite A: `production-payroll-close-flows.spec.ts`

Scope:

- create or select disposable payroll period/run
- lock source input snapshots
- run draft calculation
- verify validation warnings and no blockers
- open review
- create or inspect exception decision path
- submit review
- approve review
- final lock run
- generate payslips/register
- publish output batch
- verify employee ESS payslip visibility
- acknowledge read receipt

Key assertions:

- payroll totals are visible and stable after final lock
- locked snapshots cannot be edited from UI
- final-locked calculation lines remain traceable
- payslip and register checksums are visible
- ESS shows only the signed-in employee's published payslip
- read acknowledgement updates access evidence

### Suite B: `production-payroll-negative-controls.spec.ts`

Scope:

- blocked source snapshot prevents calculation
- unlocked input snapshot prevents calculation
- missing salary payload prevents calculation
- missing statutory profile blocks configured statutory run
- late adjustment and late settlement are blocked after review starts
- unpublished output cannot be downloaded
- revoked signed grant cannot be used
- employee cannot access another employee payslip

Key assertions:

- UI shows clear blocker messages
- backend returns non-success status for unsafe actions
- no calculation/output/download artifact is created after blocked actions

### Suite C: `production-provider-callback-flows.spec.ts`

Scope:

- submit fixture/sandbox provider package
- ingest signed callback
- reconcile delivery
- replay same callback
- send bad-signature callback
- trigger retry/dead-letter evidence for transient failure

Key assertions:

- valid callbacks persist event and reconciliation evidence
- idempotency prevents duplicate effects
- bad signatures are rejected
- retry ledger records attempt policy refs and next-action state

### Suite D: `production-storage-governance-flows.spec.ts`

Scope:

- generate artifacts under strict storage policy fixture
- verify credential refs resolve without persisted secrets
- issue signed access grant
- download through token-bound grant
- exceed max access count
- revoke grant
- export access audit

Key assertions:

- storage metadata includes provider ref, object version, strategy ref, retention ref, and checksum
- no raw credential-shaped values appear in browser payloads or API snapshots
- revoked or expired grants fail closed
- audit export includes publish, issued, downloaded, read, and revoked evidence

### Suite E: `production-tenant-role-isolation.spec.ts`

Scope:

- employee route denial for HR/payroll/provider/admin URLs
- manager denial for HR admin mutation and cross-employee payroll assets
- tenant admin denial for HR admin payroll close actions unless explicitly entitled
- support session denial without active approved grant
- support scope denial for unsupported domain
- cross-tenant API and artifact denial using fixture tenant data

Key assertions:

- route-level and API-level denials match permission matrix
- no sensitive salary, provider, credential, or employee payload leaks in denied responses
- support access is session-ref, scope, and expiry bound

### Suite F: `production-notification-flows.spec.ts`

Scope:

- payslip publish notification
- employee read state
- failed notification retry
- reminder/escalation notification from remediation SLA
- delivery diagnostics drilldown

Key assertions:

- queue state, delivery state, inbox state, and source workflow link stay consistent
- retries do not duplicate employee-visible notifications incorrectly
- delivery evidence uses provider refs and redacted snapshots

### Suite G: `production-responsive-visual-gate.spec.ts`

Scope:

- key launch screens at 1920x1080, 1440x900, 1366x768, 1280x720, tablet, and mobile
- payroll close, outputs, handoff, providers, ESS payslips, statutory declarations, tenant admin, trust audit, security readiness, support console, SaaS operations

Key assertions:

- no horizontal overflow
- no overlapping controls
- primary actions visible without layout breakage
- dense tables remain usable in modern workspace style

### Suite H: `production-live-mutation-readiness.spec.ts`

Scope:

- mutation proxy guard behavior without backend URL or browser session
- mutation-capable browser controls on HR, tenant-admin, provider, notification, and ESS screens
- explicit staging handles for disposable live mutations
- backend disposable create/update/lock/retry workflows

Key assertions:

- mutation routes fail closed before live API/session setup and do not leak sensitive payloads
- local demo mode does not silently mutate seeded evidence
- staging live mutation execution requires opt-in env flags and disposable record IDs
- backend disposable mutations create audit/source evidence and enforce lock/retry/role rules

### Suite I: `production-launch-release-gate.spec.ts`

Scope:

- HR launch cockpit, SaaS launch audit, remediation assignments, and audit export entry points
- SaaS operations, resilience, SLA, and commercial control-plane release signals
- tenant-admin trust/security evidence and support-domain diagnostics
- provider launch rehearsal, route package, storage policy, handoff, and audit-pack evidence
- guarded launch/commercial audit export routes without authenticated backend session

Key assertions:

- launch decision signals are visible from HR, tenant, support, and provider perspectives
- release blockers/actions remain owner, module, and evidence oriented
- commercial gates stay plan, entitlement, usage-limit, and audit-ledger driven
- provider launch readiness ties bank, accounting, statutory, storage, and handoff gates together
- release evidence exports fail closed before live API/session setup and do not leak sensitive payloads

### Suite J: `scripts/run-production-launch-signoff.py`

Scope:

- repeatable launch sign-off command for one tenant
- Django system checks and migration dry-run
- HRMS launch audit command, provider launch rehearsal command, and commercial usage snapshot command
- focused backend launch/rehearsal test subset
- web typecheck, lint, and production Playwright Suites A-I
- environment posture report based on the production env template
- markdown/JSON sign-off artifact with command logs, management outputs, decision, and production exceptions

Key assertions:

- launch evidence can be regenerated from commands, not only viewed in the browser
- migration drift, backend launch regression, frontend type/lint regression, and production browser regression are caught in one command
- local runs can pass without real provider/cloud/identity credentials while clearly listing those as production exceptions
- staging/production modes can enforce stricter env posture without code changes

### Suite K: Staging launch preflight

Scope:

- sanitized staging env key template
- quick staging preflight without running backend/browser suites
- full staging sign-off command once live handles are configured
- staging report decision that distinguishes env blockers from local test regressions

Key assertions:

- missing `HRMS_API_BASE_URL` and seeded operator password block staging sign-off before expensive tests run
- disposable mutation handles become required only when `PLAYWRIGHT_LIVE_MUTATIONS=true`
- preflight-only runs never claim pilot/production readiness
- staging command names stay consistent with the full Suite J sign-off runner

### Suite L: Staging disposable seed handles

Scope:

- repeatable staging seed command for disposable launch-signoff records
- safe cleanup that deletes only command-owned records tagged with `PW_TEST_STAGING_LAUNCH`
- manifest output with live mutation handles for notification retry, employee notification read state, and ESS payslip read receipt
- staging sign-off runner manifest ingestion so generated handles do not need to be copied into scripts
- backend proof that seeded records are usable through HR and ESS APIs before browser mutation tests run

Key assertions:

- staging live mutation IDs are generated from tenant data, not hardcoded into tests
- seed data is config-tagged and cleanup-scoped so it can coexist with real tenant data
- failed notification, delivered employee notification, and published payslip handles are ready for Suite H live mode
- staging mode can enable `PLAYWRIGHT_LIVE_MUTATIONS=true` from a seed manifest without hardcoded UUIDs
- the staging sign-off sequence can be run as seed, preflight, full gate, and cleanup

## 6. Backend Test Plan

Add focused backend tests for:

- full disposable payroll close path and immutable post-lock state
- negative payroll validation blockers
- output publish and download state transitions
- signed grant token hash, expiry, max-access, target-user, and revocation checks
- provider callback signature, replay, idempotency, and reconciliation behavior
- provider retry/dead-letter state transitions
- strict storage policy failure and success paths
- role and tenant isolation for payroll, provider, tenant admin, and support APIs
- launch rehearsal command output and persisted history
- audit pack checksum stability

## 7. Data Strategy

Use deterministic test refs:

- tenant code: `PW_TEST_TENANT`
- employee code prefix: `PW_TEST_EMP_`
- payroll calendar ref: `pw.test.calendar.monthly.v1`
- pay group ref: `pw.test.pay_group.core.v1`
- payroll period ref: `pw.test.period.2026-08.v1`
- calculation profile ref: `pw.test.calculation.profile.v1`
- validation profile ref: `pw.test.validation.profile.v1`
- output profile ref: `pw.test.output.profile.v1`
- storage policy ref: `pw.test.storage.policy.strict.v1`
- provider package refs: `pw.test.provider.package.bank|accounting|statutory.v1`

Cleanup rule:

- tests should prefer isolated setup and status transitions over deletion
- if cleanup is needed, only delete records with `PW_TEST_` refs created by that test run

## 8. Execution Order

1. Add backend fixture helpers for disposable payroll close data.
2. Add `production-payroll-close-flows.spec.ts` with one end-to-end happy path.
3. Add backend negative tests for calculation/output/download blockers.
4. Add `production-payroll-negative-controls.spec.ts`.
5. Add provider callback and retry backend tests.
6. Add `production-provider-callback-flows.spec.ts`.
7. Add storage governance backend tests and Playwright signed-grant coverage.
8. Add role/tenant isolation negative matrix.
9. Add notification delivery/read/retry suite.
10. Add responsive visual launch gate.
11. Run full backend, typecheck, e2e, visual, final crawl, and launch rehearsal commands.
12. Produce a final launch sign-off report with pass/fail evidence and remaining explicit business risks.

## 9. Acceptance Criteria

The product can move from `NOT READY` to `PILOT READY` only when:

- all required launch gates pass in local/staging-like test mode
- no critical or high defects remain open
- every payroll close artifact has traceable source hashes, immutable lock state, and checksum evidence
- every salary/payslip/download path is tenant-scoped and role-scoped
- all production-only dependencies have either real environment proof or an explicit launch exception
- all secrets remain runtime-only through credential refs
- screenshots show no broken launch-critical screens at supported viewports

The product can move from `PILOT READY` to `PRODUCTION READY` only when:

- real production provider integrations or officially accepted provider runbooks are validated
- real identity provider integration is validated for enabled tenants
- real notification provider delivery is validated
- object storage IAM/KMS/lifecycle/malware/durability controls are verified in the deployed environment
- backup/restore, monitoring, alerting, and incident runbooks are executed in the target environment

## 10. Immediate Next Implementation

Start with Suite A.

Reason:

- payroll close is the highest-value workflow
- it exercises HR source data, configuration, snapshots, rules, calculation, review, output, ESS, notifications, storage evidence, and audit trace
- once the happy path is stable, the negative-control suites can target the exact state transitions that must fail closed

First deliverable:

- `web/tests/e2e/production-payroll-close-flows.spec.ts`
- supporting backend fixture/API test updates if needed
- screenshots for the payroll close surfaces
- updated QA report section summarizing the payroll close proof

## 11. Suite A Implementation Status

Status: `IMPLEMENTED - DEMO MODE PASS`

Implemented file:

- `web/tests/e2e/production-payroll-close-flows.spec.ts`

Validated journey:

- payroll source readiness
- locked input snapshots
- configurable payroll rule evidence
- draft calculation trace and validation register
- review, approval trail, and final-lock evidence
- published output governance
- finance handoff and provider evidence
- employee ESS payslip distribution, storage governance, access trail, and read-receipt control

Validation run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-payroll-close-flows.spec.ts --workers=1
pnpm --dir web typecheck
```

Result:

- `1 passed`
- `tsc --noEmit` passed
- eight payroll-close screenshots were captured in the Playwright `test-results` folder for the run

Live-mode note:

- when `HRMS_API_BASE_URL` and live seeded credentials are active, the same suite attempts the employee payslip read-receipt mutation and requires the `/api/me/payroll-payslips/<id>/read` response to succeed
- in demo mode, the suite verifies the read-receipt control without clicking it because the mutation route correctly has no backend API URL

## 12. Suite B Implementation Status

Status: `IMPLEMENTED - DEMO MODE PASS`

Implemented file:

- `web/tests/e2e/production-payroll-negative-controls.spec.ts`

Validated negative controls:

- blocked payroll readiness row for missing cost center and missing primary bank account
- blocked input snapshot evidence before payroll input lock
- unsafe collecting-input run posture before calculation
- calculation validation warning register for source-data and statutory setup issues
- employee ESS published-only boundary and tenant-scoped download messaging
- HR output access governance for download readiness, signed URL mode, grant counts, revoked/expired counts, and access audit export

Validation run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-payroll-negative-controls.spec.ts --workers=1
pnpm --dir web exec playwright test tests/e2e/production-payroll-close-flows.spec.ts tests/e2e/production-payroll-negative-controls.spec.ts --workers=1
```

Result:

- Suite B: `4 passed`
- Suite A + Suite B: `5 passed`
- five negative-control screenshots were captured in the Playwright `test-results` folder for the run

Remaining Suite B depth:

- add backend/API denial tests for mutating payroll close endpoints using disposable records
- add revoked signed-grant and unpublished-download live API checks once stable UUID-backed fixture data is available
- add cross-tenant payroll artifact denial using a second fixture tenant

## 13. Suite C Implementation Status

Status: `IMPLEMENTED - DEMO MODE PASS`

Implemented file:

- `web/tests/e2e/production-provider-callback-flows.spec.ts`

Validated provider controls:

- provider callback ledger exposes webhook security, signature adapter, idempotency, replay-window, and rate-limit evidence
- callback evidence drilldown preserves webhook identity, credential source, and policy checks
- retry controls expose schedule/requeue actions, retry reason, attempt state, provider adapter refs, credential refs, and sandbox certification gates
- retry evidence drilldown preserves decision snapshot and configured backoff evidence
- queue runtime evidence exposes heartbeat policy, stale-lease recovery, and worker event trail
- delivery evidence and locked provider audit pack preserve provider chain, checksums, retention policy, and audit-pack schema refs

Validation run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-provider-callback-flows.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "payroll_provider_callback_endpoint or payroll_provider_callback_signature_adapter or provider_delivery_retry_and_dead_letter_contract"
```

Result:

- Suite C browser flow: `3 passed`
- backend callback/retry contract subset: `6 passed, 312 deselected`
- seven provider-callback screenshots were captured in the Playwright `test-results` folder for the run

Environment note:

- `backend/.venv` is missing `cryptography`, so the backend focused run was executed through the repo root `.venv`, where the signature dependencies are installed

Remaining Suite C depth:

- execute live/sandbox provider callback requests against a deployed endpoint with real ingress headers
- add disposable provider package mutation coverage when provider sandbox credentials are configured
- include cross-tenant callback rejection with a second tenant fixture

## 14. Suite D Implementation Status

Status: `IMPLEMENTED - DEMO MODE PASS`

Implemented file:

- `web/tests/e2e/production-storage-governance-flows.spec.ts`

Validated storage controls:

- HR payroll output artifact exposes storage provider ref, object version, download strategy, retention policy, download readiness, grant counts, and access audit export
- employee payslip surface remains published-only and employee-scoped while showing storage provider, object version, download strategy, retention, checksum, access trail, and calculation evidence
- provider storage policy registry exposes strict storage/IAM readiness with runtime credential, private endpoint, KMS, lifecycle, malware scan, durability, verified-control, and blocked-policy evidence
- browser surfaces do not expose raw credential-shaped keys such as `secret_key`, `secret_access_key`, `access_key_id`, or known test secret values

Validation run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-storage-governance-flows.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "configured_signed_url_storage_strategy or uninstalled_object_storage_adapter or s3_object_storage_contract_profile or raw_object_storage_credentials or missing_storage_policy_ref or storage_policy_encryption or unresolved_object_storage_credential_ref or store_read_and_sign_with_s3_sdk_runtime or storage_policy_registry_readiness or storage_control_verifiers or storage_control_verification_blocks"
```

Result:

- Suite D browser flow: `3 passed`
- backend storage-governance contract subset: `11 passed, 307 deselected`
- three storage-governance screenshots were captured in the Playwright `test-results` folder for the run

Remaining Suite D depth:

- execute signed-grant issue/download/revoke through Playwright against live seeded UUID-backed artifact data
- validate deployed object-storage headers and signed URL behavior with real provider credentials
- add cross-tenant artifact download denial using a second fixture tenant

## 15. Suite E Implementation Status

Status: `IMPLEMENTED - DEMO MODE PASS`

Implemented file:

- `web/tests/e2e/production-tenant-role-isolation.spec.ts`

Validated browser controls:

- public workspace chooser presents role-scoped entry points before privileged access
- employee payslip surface stays published-only and employee-scoped and does not expose HR output registers, provider callback sections, or provider account refs
- privileged HR, tenant-admin, support, and employee payroll proxy routes fail closed without a valid browser session
- tenant admin and support workspaces expose scoped member, role, support-grant, session, and commercial-evidence controls

Validated backend controls:

- employee tokens are denied HR dashboard, launch remediation, tenant admin, commercial audit, SaaS ops, SaaS resilience, SaaS SLA, payroll readiness, payroll setup, salary setup, statutory setup, input snapshots, and payroll rules APIs
- tenant-admin session exposes tenant workspace access while withholding HR admin workspace access
- employee tokens cannot mutate tenant-admin memberships, change requests, or support access grants
- employee tokens cannot use manager approval endpoints outside manager scope
- support sessions deny ungranted payroll scope, unsupported domains, wrong support agent, stale/expired grants, and ungranted console scopes

Validation run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-tenant-role-isolation.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "auth_login_session_logout_round_trip or tenant_admin_session_exposes_tenant_workspace_access or employee_cannot_access_hr_admin_dashboard or employee_cannot_access_hr_admin_launch_remediations or employee_cannot_access_tenant_admin_console or employee_cannot_mutate_tenant_admin_memberships or employee_cannot_create_tenant_admin_change_request or employee_cannot_create_support_access_grant or support_session_domain_snapshot_denies_ungranted_payroll_scope or support_session_domain_snapshot_respects_configured_domains or support_session_console_denies_ungranted_scope or support_session_console_denies_wrong_agent or support_session_console_expires_stale_active_grant or employee_cannot_review_tenant_admin_trust_audit or employee_cannot_review_enterprise_security_readiness or employee_cannot_download_commercial_support_audit_pack or employee_cannot_access_saas_operational_health or employee_cannot_access_saas_resilience_readiness or employee_cannot_access_saas_sla_operations or employee_cannot_access_hr_admin_payroll_readiness or employee_cannot_access_hr_admin_payroll_setup or employee_cannot_access_hr_admin_salary_setup or employee_cannot_access_hr_admin_payroll_statutory_setup or employee_cannot_access_hr_admin_payroll_input_snapshot_setup or employee_cannot_access_hr_admin_payroll_rules_setup or employee_cannot_use_manager_approval_actions"
```

Result:

- Suite E browser flow: `4 passed`
- backend role/support isolation subset: `26 passed, 292 deselected`
- four tenant/role isolation screenshots were captured in the Playwright `test-results` folder for the run

Remaining Suite E depth:

- run live-browser role redirect tests against `HRMS_API_BASE_URL` with seeded employee, manager, tenant-admin, support-agent, and HR-admin users
- add second-tenant fixture data for explicit cross-tenant artifact/API denial assertions
- expand action-denial matrix for payroll close mutations after disposable payroll fixtures exist

## 16. Suite F Implementation Status

Status: `IMPLEMENTED - DEMO MODE PASS`

Implemented file:

- `web/tests/e2e/production-notification-flows.spec.ts`

Validated browser controls:

- HR notification queue exposes retry-ready filtering, batch selection, retry policy text, inline review, and full-review entry
- HR notification review exposes payroll payslip notification payload, retry action, provider attempt log, provider reference, and backend response evidence
- notification diagnostics links operators into failed, retry-ready, and retry-capped queues while showing template, event, channel, and test-send health
- notification delivery control exposes configurable channel routing, backend choices, sender identity, provider JSON, retry policy JSON, and operator notes for `process_notifications`
- ESS payroll notification opens the source payslip page and shows published payslip, download, read receipt, notification count, access event, retention, and download strategy evidence

Validated backend controls:

- employee notification center lists only employee-scoped notifications and updates read state
- manager notification center stays scoped to manager notifications
- `process_notifications` delivers email and console-backed channels and writes delivery logs
- HR admin retry and bulk retry actions recover failed notifications when policy allows
- retry-state filters separate retry-ready and retry-capped notifications
- retry limit policy blocks single and bulk retry after max attempts
- employee document upload creates HR review notification evidence

Validation run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-notification-flows.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "employee_notification_center_lists_and_updates_read_state or manager_notification_center_shows_manager_scope_only or process_notifications_command_delivers_email_and_console_channels or hr_admin_can_retry_notification_delivery or hr_admin_can_bulk_retry_notification_delivery or hr_admin_notification_list_can_filter_by_retry_state or hr_admin_retry_respects_notification_retry_limit or hr_admin_bulk_retry_returns_error_when_all_selected_notifications_hit_retry_limit or employee_upload_creates_hr_document_review_notification"
```

Result:

- Suite F browser flow: `5 passed`
- backend notification reliability subset: `9 passed, 309 deselected`
- five notification screenshots were captured in the Playwright `test-results` folder for the run

Remaining Suite F depth:

- seed a failed notification in browser demo fixtures so failed-queue UI can show live failure cards, not only diagnostics links
- run the same notification flow against live `HRMS_API_BASE_URL` with seeded HR, manager, and employee users
- add disposable live-browser mutation checks for retry, bulk retry, read/unread, and delivery-channel save actions

## 17. Suite G Implementation Status

Status: `IMPLEMENTED - DEMO MODE PASS`

Implemented file:

- `web/tests/e2e/production-responsive-visual-gate.spec.ts`

Validated browser controls:

- launch-critical screens render at `1920x1080`, `1440x900`, `1366x768`, `1280x720`, `820x1180`, and `390x844`
- HR admin, payroll close, payroll outputs, payroll handoff, payroll providers, notification queue, notification delivery, tenant admin, support, ESS, and MSS launch routes all pass page-readiness checks
- document-level horizontal overflow is blocked across all tested viewport bands
- interactive controls are checked for off-viewport placement outside intentional scroll containers
- obvious overlapping interactive controls are blocked
- full-page evidence screenshots are captured for every launch route and viewport pair

UI fix included:

- mobile payroll-provider launch rehearsal actions now stack/stretch inside split panel headers instead of extending past the viewport edge

Validation run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-responsive-visual-gate.spec.ts --workers=1
```

Result:

- Suite G responsive visual gate: `6 passed`
- `102` launch route/viewport visits completed
- responsive screenshots were captured in the Playwright `test-results` folder for the run

Remaining Suite G depth:

- add visual snapshot comparisons for the same six launch viewport bands once the UI stabilizes enough to avoid noisy baseline churn
- add authenticated live-browser responsive checks against `HRMS_API_BASE_URL`
- extend overlap detection to text-block clipping once a lower-noise text measurement heuristic is available

## 18. Suite H Implementation Status

Status: `IMPLEMENTED - LOCAL CONTRACT PASS`

Implemented file:

- `web/tests/e2e/production-live-mutation-readiness.spec.ts`

Validated browser controls:

- mutation proxy routes for HR notification retry, bulk retry, notification update, channel config update, provider launch rehearsal, tenant change request, employee notification read-state, and employee payslip read receipt fail closed without backend URL or browser session
- guarded responses do not leak secret-shaped values, salary snapshots, bank debit account refs, or checksum-like sensitive fixture values
- mutation-capable screens expose controls for retry, review save, provider rehearsal, tenant-admin request/access/member actions, and ESS payslip read receipt without silently executing demo mutations
- Playwright web-server config now passes through `HRMS_API_BASE_URL`, `HRMS_API_BEARER_TOKEN`, and `HRMS_ENABLE_DEMO_DATA` for staging runs while keeping demo defaults locally

Live staging contract:

- set `PLAYWRIGHT_LIVE_MUTATIONS=true`
- set `HRMS_API_BASE_URL`
- seed disposable records and set `PLAYWRIGHT_LIVE_RETRY_NOTIFICATION_ID`, `PLAYWRIGHT_LIVE_EMPLOYEE_NOTIFICATION_ID`, and `PLAYWRIGHT_LIVE_PAYSLIP_ID`
- optionally override `PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME`, `PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME`, and `PLAYWRIGHT_LIVE_SEED_PASSWORD`

Validated backend controls:

- tenant-admin change request create/approve/apply with commercial audit evidence
- tenant-admin support access request/approve/start/end lifecycle
- employee statutory declaration create/update/submit and proof upload link
- HR payroll input run/snapshot create, lock, and immutable post-lock guard
- HR payroll adjustment create/submit/approve/apply lifecycle
- provider launch rehearsal history creation
- provider schema mapping pack lifecycle and nested-row simulation
- employee notification read state, HR notification retry/bulk retry, and employee upload notification creation

Validation run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-live-mutation-readiness.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "tenant_admin_can_submit_and_approve_change_request_with_audit or tenant_admin_can_control_support_access_grant_lifecycle or employee_can_create_update_and_submit_own_statutory_declaration or employee_statutory_declaration_proof_upload_creates_document_and_links_item or hr_admin_can_create_and_lock_payroll_input_snapshots or hr_admin_payroll_adjustment_create_approve_and_apply or hr_admin_can_record_payroll_provider_launch_rehearsal_history or hr_admin_payroll_provider_schema_mapping_pack_lifecycle or hr_admin_payroll_provider_schema_mapping_pack_simulates_nested_row_expansion or employee_notification_center_lists_and_updates_read_state or hr_admin_can_retry_notification_delivery or hr_admin_can_bulk_retry_notification_delivery or employee_upload_creates_hr_document_review_notification"
```

Result:

- Suite H browser contract: `3 passed`
- backend disposable mutation subset: `13 passed, 305 deselected`

Remaining Suite H depth:

- execute the live mutation path against a staging API with disposable seeded IDs
- add UI-driven form-fill mutations for tenant-admin change requests and notification read/retry after stable live fixtures exist
- add cleanup/teardown command for `PW_TEST_` records to keep staging repeatable

## 19. Suite I Implementation Status

Status: `IMPLEMENTED - LOCAL CONTRACT PASS`

Implemented file:

- `web/tests/e2e/production-launch-release-gate.spec.ts`

Validated browser controls:

- HR control center exposes the `hrms.saas_launch_audit.v1` audit profile, gate counts, assignments, and audit download entry point
- launch remediation exposes open assignments, owner assignment, primary bank coverage, provider launch history, and audit export evidence
- SaaS operations, resilience, and SLA workspaces expose tenant health, queue/support signals, backup/restore/retention posture, incident impact, and configured thresholds
- commercial control plane exposes plan, required entitlements, usage limits, usage snapshot ledger, and commercial audit history
- tenant admin, enterprise security readiness, tenant trust audit, and support domain snapshot expose customer-visible release evidence and scoped support diagnostics
- provider launch rehearsal ties launch audit pack refs, rehearsal profile refs, live adapter/client/package readiness, storage/IAM policy, and finance handoff evidence
- launch audit and commercial support audit export proxy routes fail closed without authenticated backend session and do not leak sensitive payloads

Validated backend controls:

- HR dashboard SaaS launch audit generation
- launch audit command JSON export with checksum and persisted remediation assignments
- HR launch audit download pack with checksum header
- remediation assignment lifecycle and SLA reminder/escalation processor
- SaaS control plane entitlement/usage evidence and missing-entitlement launch blocker
- commercial usage snapshot command
- provider launch rehearsal history creation and three-lane bank/accounting/statutory launch command behavior

Validation run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-launch-release-gate.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "hr_admin_dashboard_returns_saas_launch_audit or rehearse_hrms_saas_launch_command_exports_actionable_audit_pack or hr_admin_can_download_hrms_saas_launch_audit_pack or hr_admin_can_manage_launch_remediation_assignment_lifecycle or hrms_launch_remediation_sla_processor_sends_reminders_and_escalations or hr_admin_saas_control_plane_returns_entitlements_and_usage or commercial_profile_override_adds_launch_blocker_for_missing_required_entitlement or snapshot_saas_commercial_usage_command_records_meter_history or hr_admin_can_record_payroll_provider_launch_rehearsal_history or payroll_provider_launch_rehearsal_proves_three_lane_production_readiness or rehearse_payroll_provider_launch_command_exports_blocked_audit_pack or rehearse_payroll_provider_launch_command_passes_ready_three_lane_tenant"
```

Result:

- Suite I browser release gate: `5 passed`
- backend launch/rehearsal subset: `12 passed, 306 deselected`
- release-gate screenshots were captured in the Playwright `test-results` folder for HR, tenant, support, provider, resilience, SLA, and commercial workspaces

Remaining Suite I depth:

- run launch audit and provider rehearsal commands against staging seeded tenant data, archive JSON audit packs, and verify checksums outside the test process
- execute authenticated browser downloads of launch and commercial audit packs once `HRMS_API_BASE_URL` and seeded operator sessions are active
- produce a one-page launch sign-off report that combines Suite A-I status with explicit production-provider, identity, notification, storage, backup/restore, and incident-runbook exceptions

## 20. Suite J Implementation Status

Status: `IMPLEMENTED - LOCAL CONTRACT PASS`

Implemented files:

- `scripts/run-production-launch-signoff.py`
- `package.json`
- `scripts/README.md`

Validated automation:

- `pnpm qa:launch-signoff` runs Django checks, migration dry-run, HRMS launch audit command, payroll provider launch rehearsal command, commercial usage snapshot command, backend launch/rehearsal test subset, web typecheck, web lint, and production Playwright Suites A-I
- the runner writes timestamped artifacts under `web/qa-artifacts/production-launch-signoff-*`
- generated artifacts include command logs, launch audit JSON, provider launch audit JSON, markdown report, JSON report, environment posture, and explicit production exceptions
- default local mode returns `LOCAL CONTRACT PASS` when local contract checks pass and production-only env keys are absent
- staging/production modes can be selected with `--mode staging` or `--mode production`

Validation run:

```bash
python3 scripts/run-production-launch-signoff.py --skip-browser --artifact-dir web/qa-artifacts/production-launch-signoff-validation
pnpm qa:launch-signoff
```

Result:

- fast non-browser runner validation: `LOCAL CONTRACT PASS`
- full launch sign-off runner: `LOCAL CONTRACT PASS`
- full run artifact: `web/qa-artifacts/production-launch-signoff-20260908T054812Z/launch-signoff-report.md`
- Playwright production Suites A-I inside the runner: `34 passed`

Remaining Suite J depth:

- run `python3 scripts/run-production-launch-signoff.py --mode staging` with `HRMS_API_BASE_URL`, seeded user credentials, and disposable mutation handles
- archive the generated sign-off report and audit JSON as immutable release evidence for each pilot tenant
- add a cleanup/teardown command for `PW_TEST_` and disposable staging records before enabling repeated live mutation runs

## 21. Suite K Implementation Status

Status: `IMPLEMENTED - STAGING PREFLIGHT BLOCKED UNTIL ENV IS CONFIGURED`

Implemented files:

- `scripts/run-production-launch-signoff.py`
- `package.json`
- `scripts/README.md`
- `docs/qa/staging-launch-signoff.env.example`

Validated automation:

- `--preflight-only` mode writes a launch report without running backend, frontend, browser, or management-command checks
- `pnpm qa:launch-signoff:staging-preflight` runs the staging env preflight
- `pnpm qa:launch-signoff:staging` runs the full staging sign-off path after env handles are configured
- preflight reports include environment posture, production exceptions, and a decision that cannot be confused with a full launch pass
- missing staging env currently produces `STAGING PREFLIGHT BLOCKED`, which is expected in this local workspace

Validation run:

```bash
python3 -B scripts/run-production-launch-signoff.py --mode staging --preflight-only --artifact-dir web/qa-artifacts/staging-launch-signoff-preflight-validation --allow-command-failures
python3 -B scripts/run-production-launch-signoff.py --skip-browser --artifact-dir web/qa-artifacts/production-launch-signoff-validation
```

Expected staging next step:

- set values from `docs/qa/staging-launch-signoff.env.example` in shell/CI secrets
- rerun `pnpm qa:launch-signoff:staging-preflight`
- after preflight passes, run `pnpm qa:launch-signoff:staging`

## 22. Suite L Implementation Status

Status: `IMPLEMENTED - LOCAL SEED/CLEANUP PASS`

Implemented files:

- `scripts/run-production-launch-signoff.py`
- `backend/apps/common/management/commands/seed_staging_launch_data.py`
- `backend/tests/test_phase0_api_smoke.py`
- `package.json`
- `scripts/README.md`
- `docs/qa/staging-launch-signoff.env.example`

Validated automation:

- `pnpm qa:staging-seed` creates disposable staging launch handles and writes `web/qa-artifacts/staging-launch-seed/manifest.json`
- `pnpm qa:staging-seed:cleanup` removes only records tagged with `PW_TEST_STAGING_LAUNCH`
- staging mode reads the seed manifest, populates the three `PLAYWRIGHT_LIVE_*` handle env vars, and enables `PLAYWRIGHT_LIVE_MUTATIONS=true` for that run
- generated handles cover HR notification retry, employee notification read state, and employee payslip read receipt/live download evidence
- backend tests prove the generated handles work through the intended HR and ESS APIs before live browser mutation mode is enabled

Validation run:

```bash
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "seed_staging_launch_data"
pnpm qa:staging-seed:cleanup
pnpm qa:staging-seed
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 python3 -B scripts/run-production-launch-signoff.py --mode staging --preflight-only --artifact-dir web/qa-artifacts/staging-launch-signoff-manifest-validation
```

Result:

- backend seed command subset: `2 passed`
- cleanup command completed and wrote `web/qa-artifacts/staging-launch-seed/cleanup-manifest.json`
- seed command completed and wrote `web/qa-artifacts/staging-launch-seed/manifest.json`
- staging preflight with manifest ingestion returned `STAGING PREFLIGHT PASS`

Staging sign-off sequence:

1. Configure required values from `docs/qa/staging-launch-signoff.env.example`.
2. Run `pnpm qa:staging-seed`.
3. Run `pnpm qa:launch-signoff:staging-preflight`.
4. Run `pnpm qa:launch-signoff:staging`.
5. Run `pnpm qa:staging-seed:cleanup` after evidence is archived.
