# HRMS Known Limitations

## 1. Purpose

This document lists known limitations for the current HRMS pilot candidate.

It should be reviewed before any pilot, internal beta, payroll handoff, or customer-facing release.

---

## 2. Release Gate Status

Current status as of September 5, 2026:

- Functional and browser release-readiness gates are green.
- Critical JavaScript production audit findings are cleared.
- One mobile dependency advisory remains open through React Native Metro `image-size`.
- HRMS is suitable for a web-first internal pilot after release owner acceptance of the remaining mobile risk.

---

## 3. Security And Dependency Limitations

### Mobile Metro `image-size`

- `pnpm audit --prod` reports two high-severity instances of the same `image-size` advisory through React Native Metro.
- The audit feed currently reports no patched version.
- Mobile production distribution should wait for an upstream Expo, React Native, or Metro dependency update, or for explicit security-owner acceptance.
- Web HRMS pilot scope can proceed if the mobile app is excluded from the pilot.

### Secrets And Environments

- Local seeded credentials are intended for development and pilot verification only.
- Production-like pilots must set environment-specific secrets, API URLs, database credentials, and notification provider credentials outside the repository.
- Demo fallback behavior is intentionally explicit and environment-driven.

---

## 4. Product Scope Limitations

### Payroll

- Payroll engine development has not started.
- Salary structures, payroll runs, statutory filings, payslips, bank files, and compliance calculations remain future payroll scope.
- HRMS data can be used as the payroll foundation only after release-risk acceptance.

### Mobile

- Mobile currently has typecheck coverage.
- Mobile does not yet have the same browser/visual/live workflow coverage as web.
- Mobile production readiness is blocked or exception-based until the `image-size` advisory decision is closed.

### Provider Integrations

- Notification delivery has an extensible backend and operational diagnostics.
- Production-grade provider onboarding, credentials, provider-specific failure taxonomy, and delivery SLA monitoring require environment-specific implementation and validation.
- Email, SMS, push, and WhatsApp provider behavior should be tested with real provider sandboxes before customer pilot use.

### Reporting

- Current reports and exports cover operational review and pilot-level trust.
- Advanced analytics, custom report builders, cross-domain dashboards, and payroll-ready financial reports remain future maturity work.

### Workflow Mutations

- Live-backend browser coverage verifies manager rejection and HR admin workflow trace visibility.
- Additional live mutation coverage for approval, send-back, reassignment, delegation, and HR review actions should be added based on pilot risk.
- HR admin workflow trace is currently a review surface, not a full workflow-control mutation console.

### Audit Depth

- Audit coverage is strong enough for pilot review across lifecycle, document, notification, attendance approval, and workflow trace contexts.
- Deeper leave-request audit feed exploration and broader record-by-record audit drill-downs remain future trust-layer enhancements.

---

## 5. Operational Limitations

- Background commands such as `process_notifications` and `send_document_expiry_reminders` must be scheduled in deployment infrastructure before production-like pilot use.
- Observability, alerting, backups, and secrets management need environment-specific setup outside the app code.
- Cross-browser coverage remains future work; current browser gates are Chromium-based.
- Manual pilot screenshot review should be repeated whenever visual baselines or major UI surfaces change.

---

## 6. Required Acceptance Before Pilot

Before pilot kickoff, record:

- pilot owner
- support owner
- security owner when mobile is in scope
- whether mobile is in or out of pilot scope
- decision on the `image-size` release risk
- notification provider scope
- data import or seeded workspace approach
- rollback and support escalation path

