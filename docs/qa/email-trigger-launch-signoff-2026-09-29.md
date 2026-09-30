# Email Trigger Launch Signoff - 2026-09-29

This checklist defines where email is practically required for public launch signoff. It intentionally separates launch-critical email from workflows where in-app notification is acceptable for day one.

## Signoff Rule

Do not treat SMTP configuration alone as complete. Final signoff requires proof that the business trigger creates the right notification, the delivery worker sends it, the recipient receives it, and the user can complete the linked action.

## P0 Launch-Critical Email Paths

| Flow | Why it matters | Required proof | Pass condition | Fallback if email fails |
| --- | --- | --- | --- | --- |
| Password reset | Users cannot recover accounts without it. | Request reset for a real verified recipient, receive email, open link, set new password, confirm old link cannot be reused. | Email delivered; reset succeeds once; reused/expired link fails clearly. | No acceptable self-service fallback. Admin must fix email or manually reset access. |
| User invite / account setup | Tenant, HR, employee, and manager onboarding depends on setup links. | Create or invite a user, receive setup email, open link, complete setup/login. | Email delivered; setup link works; generated password is not exposed in the email body. | Tenant admin or platform admin must resend after fixing delivery. |
| Notification template test send | Proves SMTP/provider settings before real user workflows depend on them. | Send a test email from notification admin/template tooling to a verified recipient. | Test notification is created, sent through SMTP, and visible as delivered in the notification queue. | Fix SMTP/provider/channel config before enabling email-dependent workflows. |
| Payslip published | Employees expect notification when payroll outputs are available. | Publish a payslip/output in a controlled payroll run, confirm employee receives notification, and open ESS payslip. | In-app notification works; email works when email event/template is enabled for the tenant. | If email is not enabled, HR must confirm employees are told to use ESS/in-app. |
| Failed email recovery | Operations must detect and recover provider or recipient issues. | Force or use an existing failed email, review failure, fix root cause, retry, and confirm status changes. | Queue shows failure reason, retry is controlled, status/activity updates after retry. | Manual follow-up must be recorded when the message is time-sensitive. |

## P1 Operational Email Paths

These should be certified before a broad customer rollout, but they can launch as in-app notifications if the customer accepts that behavior.

| Flow | Practical trigger | Required launch decision |
| --- | --- | --- |
| Leave request to manager | Employee submits leave requiring manager action. | Email or in-app-only must be decided per tenant. |
| Leave decision to employee | Manager approves/rejects leave. | Email recommended; in-app acceptable with clear ESS guidance. |
| Attendance regularization to manager | Employee submits regularization. | Email recommended for action latency. |
| Attendance decision to employee | Manager/HR approves/rejects regularization. | Email recommended; in-app acceptable. |
| Document upload to HR | Employee uploads or resubmits a document. | In-app queue can be sufficient if HR reviews daily. |
| Document rejection/reupload to employee | HR asks employee to fix a document. | Email recommended for time-sensitive documents. |
| Expiring document reminders | Document is near expiry or expired. | Email recommended for compliance-heavy tenants. |
| Payroll blocker reminder | HR/payroll admin must fix source data. | In-app acceptable for daily operators; email recommended for escalation. |

## P2 In-App First Paths

These do not block public launch as email, provided the in-app notification and dashboard queues are clear.

- Routine dashboard reminders.
- Audit evidence updates.
- Report/export completion notices.
- Setup/configuration changes.
- Low-priority informational alerts.

## Environment Gate

Before signoff, confirm:

| Area | Expected state |
| --- | --- |
| SMTP backend | `DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` in the target environment. |
| SMTP sender | `DJANGO_DEFAULT_FROM_EMAIL` and `DJANGO_SERVER_EMAIL` use approved sender addresses. |
| SES/provider | Sender domain/address is verified and permitted for target recipients. |
| Worker | Notification processor is enabled through Celery beat, cron, systemd timer, or equivalent. |
| Channel config | Email channel is enabled and mapped to `email_smtp`. |
| Templates/events | P0 triggers have active event definitions and templates for email where email is required. |
| Queue visibility | HR/Admin can open notification queue, delivery health, diagnostics, and review pages. |

## Code Coverage Snapshot

| Area | Current evidence |
| --- | --- |
| Password reset queueing | `backend/tests/test_account_email_flows.py` covers reset request, queued email notification, successful reset, and reused token rejection. |
| Missing reset account privacy | `backend/tests/test_account_email_flows.py` confirms missing accounts return success without creating a notification. |
| Invite queueing | `backend/tests/test_account_email_flows.py` covers setup link creation and confirms generated password is not exposed. |
| HR Admin employee access invite queueing | `backend/tests/test_phase0_api_smoke.py::test_hr_admin_can_assign_employee_role_and_auto_generate_password` confirms HR Admin-created employee access queues a secure invite/setup email and does not expose the generated password. |
| Notification processing | Backend notification services and task/management command exist for queued delivery processing. |
| Notification UI recovery | `web/tests/e2e/production-notification-flows.spec.ts` covers queue triage, review, diagnostics, delivery health, and retry-oriented screens. |

## Manual Stage Certification Script

Use verified recipients only.

1. Sign out everywhere or use an incognito session.
2. Request password reset for the verified user.
3. Confirm email arrives.
4. Complete reset and login.
5. Attempt to reuse the same reset link and confirm it fails.
6. As tenant admin, create/invite a disposable user.
7. Confirm invite/setup email arrives.
8. Complete setup and confirm role-based redirect is correct.
9. As HR admin, send notification template test email.
10. Confirm queue status becomes delivered.
11. Publish a controlled payslip or use an existing published payroll output.
12. Confirm employee sees ESS payslip and receives configured notification.
13. Open notification delivery/queue and verify there are no unexpected failed P0 messages.
14. Retry one known safe failed notification only after confirming the failure cause is fixed.

## Signoff Decision

| Decision | Meaning |
| --- | --- |
| Green | All P0 paths pass in stage and production configuration is equivalent. |
| Yellow | Account emails pass; payslip email is in-app-only by approved launch decision; recovery tooling passes. |
| Red | Password reset, invite, SMTP test send, or failed-email recovery does not work. Do not launch. |

## Current Recommendation

Treat password reset, invite/setup, SMTP test send, and failed-email recovery as non-negotiable P0 launch gates. Treat payslip email as P0 if customers are told employees will receive email alerts; otherwise document the day-one behavior as in-app notification plus ESS access.

## Verification Run - 2026-09-29

| Check | Command / method | Result |
| --- | --- | --- |
| Account email backend coverage | `backend/.venv/bin/python -m pytest backend/tests/test_account_email_flows.py -q` | Passed: 3 tests. |
| Notification reliability browser proof | `HRMS_API_BASE_URL=http://127.0.0.1:8020/api/v1 pnpm --dir web exec playwright test tests/e2e/production-notification-flows.spec.ts --workers=1` | Passed: 5 tests. |
| Local backend preparation | `manage.py check`, `manage.py migrate --noinput`, `manage.py bootstrap_demo_workspace` | Passed. |

Notes:

- The browser proof was run against a clean local Django backend on port `8020` because port `8000` was already occupied by another Django process.
- The proof covers queue triage, notification review, diagnostics-to-queue drilldown, delivery health/configuration, and ESS payroll notification to payslip navigation.
- Live SES delivery still requires a manual stage/prod recipient proof because automated tests should not depend on external mailbox delivery timing.

## Stage SMTP Verification - 2026-09-29

| Stage check | Evidence | Result |
| --- | --- | --- |
| Service health | `hrms-payroll-backend` and `hrms-payroll-web` active; Django `manage.py check` passed. | Passed. |
| Notification worker | `hrms-payroll-notification-worker.timer` active and running roughly every minute. | Passed. |
| Direct SMTP smoke | Django `send_mail` accepted message to verified recipients with subject `Accerio SMTP smoke 2026-09-29 03:31:36 UTC`. | SMTP accepted; inbox confirmation required from recipient. |
| Multi-recipient SMTP smoke | Django `send_mail` accepted one message to `sushilbansal86@gmail.com`, `renubansal19611@gmail.com`, and `aditi.gupta1789@gmail.com` with subject `Accerio multi-recipient SMTP trace 2026-09-29 03:57:16 UTC`. | Passed; recipient confirmed all three inboxes received the email. |
| Password reset flow | Public password-reset endpoint returned `200`; notification `ebe14bdb-1499-4651-aeaf-6a004327a58f` delivered to `sushilbansal86@gmail.com` via `email_smtp`. | Passed from app and provider-acceptance side. |
| Template test-send flow | HR Admin template test-send API returned `200`; notification `830c6f03-7a41-4259-a78f-7b40d8a3d0e8` delivered via `email_smtp`; subject `Accerio template test 2026-09-29T03:36:47Z`. | Passed from app and provider-acceptance side. |
| Invite/setup email flow | Existing verified membership invite notification `eeaaed8d-e527-440d-adbf-064d897c682c` processed and delivered via `email_smtp`. | Passed from app and provider-acceptance side. |
| Fresh tenant-admin invite flow | Tenant Admin API created active HR Admin membership `dd8a8cfd-d9b2-4335-a50b-d2f6f2076d26` for `aditi.gupta1789@gmail.com`; notification `5b006dbd-d514-41e4-b252-6e8e76ff19b7` delivered via `email_smtp` with subject `You are invited to Accerio India on Accerio HRMS`. | Passed from app, queue, and provider-acceptance side. |

## HR Admin Employee Access Invite Regression - 2026-09-30

| Check | Evidence | Result |
| --- | --- | --- |
| Stage issue reproduced | User `m4407998@gmail.com` existed with active membership and `must_change_password=True`, but had no invite notification or delivery log. | Confirmed root cause was missing invite queue call in the HR Admin employee-access creation path. |
| Code fix | `save_hr_admin_employee_access` now queues `account_invite` only when new employee access is created. Existing access edits do not resend automatically. | Fixed locally. |
| Backend regression | Focused tests passed: HR Admin employee access invite, account email flows, and tenant-admin invite flows. | Passed: 8 tests. |
| Stage remediation | A one-time setup invite was queued and processed for `m4407998@gmail.com`; notification `e9ae79ba-19a9-4ddb-ad15-efe6c8e1fe27` delivered via `email_smtp`. | Passed from app and provider-acceptance side. |

Operational note:

- If a user was created before this fix and no invite notification exists, resend a password setup/reset email instead of recreating the employee.
- If a notification exists but is failed or retry capped, resolve it through Notification Delivery and queue review.

Stage note:

- The stage application correctly creates and processes P0 email notifications through `email_smtp`.
- Final human confirmation is still needed that the app-generated reset, template test, and fresh invite/setup messages are visible in the recipient inbox or spam/promotions folder. Multi-recipient SMTP inbox delivery was confirmed.
