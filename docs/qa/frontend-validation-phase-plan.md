# Frontend Validation Phase Plan

## Objective

Make avoidable validation fail fast in the browser, render all validation consistently, and leave backend-only controls on the server.

## Global Standard

- Field validation uses `.field-error-text`, `role="alert"`, and `aria-invalid` where the control is known.
- Form or action failures use `.notice.notice--error` with `role="alert"`.
- Success outcomes use `.notice.notice--success` with `role="status"`.
- Frontend-blocked validation must not call the API.
- Backend remains the source of truth for permissions, workflow state, tenant policy, duplicate conflicts, malware scanning, storage policy, and server-side MIME sniffing.

## Current Implementation Snapshot

Updated: 2026-10-07

Current status:
- Phase 1 is complete.
- Phase 2 is complete for frontend blocking and focused browser proof.
- Phase 3 is implemented for ESS documents, leave, attendance, and statutory declarations with focused browser proof for leave, attendance, and statutory declarations; document upload proof remains covered in the ESS documents launch certification spec.
- Phase 4 is implemented for MSS manager decision validation with focused browser proof.
- Phase 5 is complete for the current HR Admin Core validation scope: employee master, employee access, employee document upload, and employee bank account validation.
- Phase 6 has focused proof for HR Admin setup/policy validation across attendance policies, leave types, document categories, and workflow templates.
- Phase 7 has focused proof for payroll setup, salary setup, salary assignment imports, payroll rules, payroll inputs, provider setup, statutory setup, output close-action validation, and payroll adjustment/settlement lifecycle validation.
- Phase 8 has focused proof for tenant users, tenant roles, tenant support access, tenant change requests, and platform-admin tenant/lead/contact/template/onboarding/admin-login/launch-readiness/permission-catalog validation.
- Phase 9 global QA sweep is complete for the focused frontend validation suite.
- Phase 10 launch certification documentation is complete for the focused frontend validation scope.

Latest local gate:
- `pnpm --dir web typecheck` passed.
- `pnpm --dir web lint` passed.
- `pnpm --dir web build` passed.
- `pnpm --dir web exec playwright test tests/e2e/auth-public-frontend-validation.spec.ts tests/e2e/global-feedback-styling.spec.ts` passed: 6/6.
- `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/ess-frontend-validation.spec.ts` passed: 3/3.
- `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/mss-frontend-validation.spec.ts` passed: 2/2.
- `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/hr-admin-core-frontend-validation.spec.ts` passed: 4/4.
- `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/hr-admin-setup-policy-frontend-validation.spec.ts` passed: 4/4.
- `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/hr-admin-payroll-frontend-validation.spec.ts` passed: 14/14.
- `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/tenant-admin-frontend-validation.spec.ts` passed: 4/4.
- `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/platform-admin-frontend-validation.spec.ts` passed: 11/11.
- `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/auth-public-frontend-validation.spec.ts tests/e2e/global-feedback-styling.spec.ts tests/e2e/ess-frontend-validation.spec.ts tests/e2e/mss-frontend-validation.spec.ts tests/e2e/hr-admin-core-frontend-validation.spec.ts tests/e2e/hr-admin-setup-policy-frontend-validation.spec.ts tests/e2e/hr-admin-payroll-frontend-validation.spec.ts tests/e2e/tenant-admin-frontend-validation.spec.ts tests/e2e/platform-admin-frontend-validation.spec.ts --workers=1` passed: 48/48.

Note:
- An earlier package-script invocation was interrupted because the script argument shape expanded into the wider E2E suite. The directly invoked Playwright command above is the accepted focused result.
- The aggregate focused validation suite is stable with `--workers=1`. A high-concurrency aggregate run produced `page.goto net::ERR_ABORTED`/hydration timing failures in setup-policy/MSS after long payroll runs, while the same buckets passed independently and in the serial aggregate run.

## Phase 1 - Foundation

Status: Complete

Scope:
- Add shared validation helpers in `web/src/lib/ui/validation.ts`.
- Migrate one real workflow onto shared helpers to prove the pattern.
- Establish QA commands for each phase.

Implemented:
- Shared helpers for required fields, email format, date order, past/future dates, file size, and executable/script file blocking.
- ESS Documents upload uses the shared validation helper.
- Global `.field-error-text`, `.notice--error`, and `.notice--success` styling is present.

QA:
- `pnpm --dir web typecheck`
- `pnpm --dir web lint`
- `pnpm --dir web build`
- Focused Playwright for the migrated workflow when backend/auth is available.

## Phase 2 - Auth And Public Forms

Status: Complete

Scope:
- Login
- Forgot password
- Reset password
- Public lead form

Frontend checks:
- Required username/email/password.
- Email format where the field expects email.
- Password confirmation match.
- Phone and lead form basics.

QA:
- Empty submit blocks before API.
- Invalid email blocks before API.
- API failure is red.
- Success is green.
- Focused Playwright coverage is in `web/tests/e2e/auth-public-frontend-validation.spec.ts`.
- Feedback tone coverage is in `web/tests/e2e/global-feedback-styling.spec.ts`.

## Phase 3 - ESS

Status: Complete for current ESS validation scope.

Scope:
- Documents
- Leave
- Attendance
- Statutory declarations and proof upload

Frontend checks:
- Required fields.
- Date ranges.
- File size/type.
- Leave end date after start date.
- Attendance reason required.
- Proof amount/date/file checks.

QA:
- Desktop and mobile modal stability.
- No horizontal overflow.
- No API call for frontend-blocked validation.
- Focused frontend validation coverage is in `web/tests/e2e/ess-frontend-validation.spec.ts`.
- ESS document upload validation coverage remains in `web/tests/e2e/ess-documents-launch-certification.spec.ts`.
- Run local demo-mode validation with `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/ess-frontend-validation.spec.ts` when the live backend is unavailable.

## Phase 4 - MSS

Status: Complete for current MSS decision validation scope.

Scope:
- Manager approvals.
- Leave decisions.
- Attendance decisions.

Frontend checks:
- Reject reason required where needed.
- Decision note rules.
- Double-submit protection.
- Read-only states remain clear.

QA:
- Approve success green.
- Reject missing reason red field error.
- API failure red.
- Focused frontend validation coverage is in `web/tests/e2e/mss-frontend-validation.spec.ts`.
- Run local demo-mode validation with `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/mss-frontend-validation.spec.ts` when the live backend is unavailable.

## Phase 5 - HR Admin Core

Status: Complete for current HR Admin Core validation scope.

Scope:
- Employees.
- Employee access.
- Bank accounts.
- Employee documents.
- Organization.
- Movement, exit, and probation forms.

Frontend checks:
- Date ordering.
- Email, username, and password basics.
- IFSC/account fields.
- File validation.
- Known dependent select requirements.

QA:
- Existing employee/document specs updated.
- Duplicate and server-only checks remain backend controlled.
- Focused frontend validation coverage is in `web/tests/e2e/hr-admin-core-frontend-validation.spec.ts`.
- Current proof covers employee master, employee access, employee document upload, and employee bank account validation.
- Duplicate, uniqueness, authorization, lifecycle-state conflicts, and server-side file policy checks remain backend controlled.

## Phase 6 - HR Admin Setup And Policy

Status: Focused slice complete; broader setup/policy certification pending.

Scope:
- Attendance policies.
- Leave policies.
- Shifts and rosters.
- Workflow templates and assignments.
- Document categories and requirements.
- Notification events and templates.

Frontend checks:
- Required codes/names.
- Numeric bounds.
- Date order.
- JSON/template payload parse checks.

QA:
- Invalid JSON/template tests.
- API not called when frontend validation fails.
- Focused frontend validation coverage is in `web/tests/e2e/hr-admin-setup-policy-frontend-validation.spec.ts`.
- Current proof covers attendance policy numeric/required checks, leave type identity/color checks, document category JSON checks, and workflow template required/date/JSON/step checks.
- Remaining Phase 6 coverage should add leave policies, shifts/rosters, workflow assignments, document requirements, and notification events/templates.

## Phase 7 - Payroll And Statutory Admin

Status: Focused payroll/statutory foundation and known transition slice complete; provider-specific transition expansion remains optional.

Scope:
- Payroll setup.
- Salary setup.
- Payroll inputs and rules.
- Payroll statutory setup.
- Payroll providers.

Frontend checks:
- Required configuration fields.
- Amount/rate numeric checks.
- Effective date order.
- JSON/profile config parse checks.
- UI-known state transition blockers.

QA:
- High-risk payroll validation specs.
- Build and targeted E2E.
- Focused frontend validation coverage is in `web/tests/e2e/hr-admin-payroll-frontend-validation.spec.ts`.
- Current proof covers payroll calendar currency/start-day checks, payroll period date sequencing, salary component line amount/formula requirements, salary assignment import row date/amount/reason checks, payroll rule definition required/JSON checks, payroll rule version numeric/date/expression/JSON checks, payroll input run required identity/profile checks, payroll input snapshot JSON/profile checks, provider connection required route/credential/config JSON checks, statutory slab numeric range checks, employee statutory profile identity/amount checks, shared output close-action profile blockers, payroll adjustment create amount/source checks, and payroll settlement create amount/source checks.
- Remaining Phase 7 coverage can expand provider-specific lifecycle transitions, but the known payroll/statutory frontend validation foundation is covered by focused browser proof.

## Phase 8 - Tenant And Platform Admin

Status: Focused tenant-admin and platform-admin foundation slice complete.

Scope:
- Tenant members.
- Roles.
- Support access.
- Change requests.
- Platform leads, tenants, contacts, and policy packs.

Frontend checks:
- Email and username.
- Role selection.
- Required reasons/comments.
- JSON payloads.
- Duration and scope.

QA:
- Dialog validation specs.
- Permission/read-only states.
- Success/failure color checks.
- Focused frontend validation coverage is in `web/tests/e2e/tenant-admin-frontend-validation.spec.ts` and `web/tests/e2e/platform-admin-frontend-validation.spec.ts`.
- Current proof covers tenant member invite email/username/role checks, tenant role required name checks, support access required agent/reason/scope/duration checks, change request required title/JSON payload checks, platform tenant required identity/email checks, tenant setup identity/email checks, onboarding metadata context checks, admin contact create/edit identity/email checks, tenant admin login username checks, setup template required/numeric checks, lead conversion tenant-code checks, launch blueprint required-input checks, customer handoff note checks, and platform permission catalog immutable-key/required-field checks.
- Remaining Phase 8 coverage can expand deeper backend-controlled lifecycle transition conflicts.

## Phase 9 - Global QA Sweep

Status: Complete for the focused frontend validation suite.

Static scans:
- Field errors rendered as `.muted`.
- Error notices missing `notice--error`.
- Success notices missing `notice--success`.
- Submit handlers without frontend validation.

Commands:
- `pnpm --dir web typecheck`
- `pnpm --dir web lint`
- `pnpm --dir web build`
- `git diff --check`

Browser buckets:
- Auth/public.
- ESS.
- MSS.
- HR Admin employee/documents.
- HR Admin setup/workflows/notifications.
- Tenant/platform admin.
- Payroll/statutory.

QA result:
- Static gates passed: typecheck, lint, build, and `git diff --check`.
- Focused browser validation buckets passed together serially: 48/48.
- Static scan reviewed notices and field-error usage. Remaining plain `.notice` matches are informational, empty, read-only, or compact guidance notices rather than action failure/success feedback.

## Phase 10 - Launch Certification

Status: Complete for the focused frontend validation scope.

Deliverables:
- Validation coverage matrix by module and form.
- Backend-only validation list.
- E2E coverage map.
- Known limitations.

Launch gate:
- No generic avoidable validation errors.
- No API call for frontend-blocked validation.
- Success and failure messages remain visible after action.
- No disabled-looking active actions.
- No duplicate action paths unless intentional.

### Validation Coverage Matrix

| Area | Forms and actions covered | Frontend validation certified | Browser proof |
| --- | --- | --- | --- |
| Foundation and feedback | Shared validation helpers, global field/form feedback styling | Field errors use `.field-error-text`; action failure/success feedback uses red/green notice styling where action feedback is expected | `global-feedback-styling.spec.ts`, static scan in Phase 9 |
| Auth and public intake | Login, forgot password, reset password, public lead form | Required credentials, email format, password confirmation, lead identity basics, no API call for blocked values | `auth-public-frontend-validation.spec.ts`, `global-feedback-styling.spec.ts` |
| ESS | Leave request, attendance regularization, statutory declaration/proof, document upload | Required reasons, date/file/amount checks, upload safety checks, no API call for blocked values | `ess-frontend-validation.spec.ts`, `ess-documents-launch-certification.spec.ts` |
| MSS | Leave and attendance rejection dialogs | Decision note required before reject API calls; focused review dialogs remain stable | `mss-frontend-validation.spec.ts` |
| HR Admin Core | Employee master, employee access, employee document upload, employee bank account | Required identity, email/date/order checks, role selection, document file checks, IFSC/account checks | `hr-admin-core-frontend-validation.spec.ts` |
| HR Admin Setup and Policy | Attendance policy, leave type, document category, workflow template | Required code/name/trigger values, numeric bounds, date order, color format, JSON parse checks, workflow step name checks | `hr-admin-setup-policy-frontend-validation.spec.ts` |
| Payroll and Statutory | Payroll setup, salary setup, salary assignment import, payroll rules, payroll inputs, provider setup, statutory setup, close actions, adjustments, settlements | Currency/start-day, date sequencing, amount/formula/source/profile, JSON/profile, numeric ranges, lifecycle input blockers | `hr-admin-payroll-frontend-validation.spec.ts` |
| Tenant Admin | Tenant member invite, roles, support access, change requests | Email/username/role, role name, support reason/scope/duration, change request title/JSON checks | `tenant-admin-frontend-validation.spec.ts` |
| Platform Admin | Tenant creation/setup, leads, admin contacts, admin login, setup templates, onboarding metadata, launch readiness, permission catalog | Required tenant/contact/template fields, email/numeric checks, lead tenant code, launch required inputs, handoff notes, immutable permission key and required catalog fields | `platform-admin-frontend-validation.spec.ts` |

### Backend-Only Validation List

These remain intentionally server-owned and are not launch blockers for the frontend validation certification:

- Authorization, workspace access, tenant isolation, role permissions, and permission catalog enforcement.
- Duplicate and uniqueness conflicts, including usernames, emails, employee codes, tenant codes, policy/template codes, and provider identifiers.
- Workflow state transitions, maker-checker rules, terminal-state conflicts, and stale record/version conflicts.
- Tenant policy, subscription entitlement, country/statutory applicability, feature availability, and platform launch gates that require persisted server state.
- Server-side file policy, MIME sniffing, malware scanning, storage policy, signed URL generation, object retention, and download authorization.
- Payroll/statutory calculation correctness, provider certification, provider credentials, real payment/accounting/statutory submissions, and external vendor callbacks.
- Notification delivery, email/SMS provider behavior, password reset token validity, invite token validity, and account lock/session security.
- Backend audit trails, immutable evidence records, source-hash evidence, and tamper-resistant event ordering.

### E2E Coverage Map

| Spec | Count | Purpose |
| --- | ---: | --- |
| `auth-public-frontend-validation.spec.ts` | 4 | Auth/public fail-fast validation and no-API assertions |
| `global-feedback-styling.spec.ts` | 2 | Red failure and green success feedback tone proof |
| `ess-frontend-validation.spec.ts` | 3 | ESS leave, attendance, statutory declaration/proof validation |
| `mss-frontend-validation.spec.ts` | 2 | MSS rejection note blockers |
| `hr-admin-core-frontend-validation.spec.ts` | 4 | Employee/access/document/bank account validation |
| `hr-admin-setup-policy-frontend-validation.spec.ts` | 4 | Setup/policy required, numeric, JSON, date, and step validation |
| `hr-admin-payroll-frontend-validation.spec.ts` | 14 | Payroll/statutory setup and lifecycle input blockers |
| `tenant-admin-frontend-validation.spec.ts` | 4 | Tenant users, roles, support access, and change request validation |
| `platform-admin-frontend-validation.spec.ts` | 11 | Platform tenant, lead, contact, template, launch, and permission catalog validation |
| Serial aggregate command | 48 | Complete focused frontend validation proof across all buckets |

### Known Limitations

- The certification is a focused frontend validation certification, not a full business-process launch certification.
- Some Phase 6 areas remain outside the focused proof: leave policies, shifts/rosters, workflow assignments, document requirements, and notification events/templates.
- Provider-specific payroll lifecycle transitions remain optional expansion beyond the covered provider setup and known payroll/statutory blockers.
- Deeper backend-controlled lifecycle conflicts are intentionally left to API/backend tests.
- The aggregate Playwright validation pack should be run with `--workers=1`; high-concurrency aggregate runs can cause local dev-server hydration/navigation instability after long payroll runs even though the same buckets pass independently and serially.
- Demo-mode browser proof confirms local UX behavior and no-API frontend blockers. Live backend/staging proof is still required for deployment-specific auth, permissions, provider credentials, email/SMS, storage, malware scanning, and statutory filing integrations.

### Certification Result

Launch certification for the focused frontend validation scope is signed off on 2026-10-07.

Accepted command set:

- `pnpm --dir web typecheck`
- `pnpm --dir web lint`
- `pnpm --dir web build`
- `git diff --check`
- `HRMS_API_BASE_URL= pnpm --dir web exec playwright test tests/e2e/auth-public-frontend-validation.spec.ts tests/e2e/global-feedback-styling.spec.ts tests/e2e/ess-frontend-validation.spec.ts tests/e2e/mss-frontend-validation.spec.ts tests/e2e/hr-admin-core-frontend-validation.spec.ts tests/e2e/hr-admin-setup-policy-frontend-validation.spec.ts tests/e2e/hr-admin-payroll-frontend-validation.spec.ts tests/e2e/tenant-admin-frontend-validation.spec.ts tests/e2e/platform-admin-frontend-validation.spec.ts --workers=1`

Final result: static gates passed, production build passed, and focused browser validation passed 48/48.
