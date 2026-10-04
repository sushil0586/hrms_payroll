# HRMS Known Limitations

## 1. Purpose

This document lists known limitations for the current HRMS pilot candidate.

It should be reviewed before any pilot, internal beta, payroll handoff, or customer-facing release.

---

## 2. Release Gate Status

Current status as of October 4, 2026:

- Local functional and browser gates have broad coverage, but public launch still requires deployed role-login/RBAC proof.
- Production runtime now has a fail-fast `production_preflight` gate for DB, Redis, email, workers, provider credentials, storage controls, auth posture, and demo-mode isolation.
- One mobile dependency advisory remains open through React Native Metro `image-size`.
- HRMS remains suitable only for a web-first controlled pilot until the current tenant payroll, provider, storage, backup/restore, alerting, and deployed-access gates are evidenced.

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
- Demo fallback behavior is intentionally explicit and environment-driven. Production runtime must keep `HRMS_ENABLE_DEMO_DATA=false`; the web app and production preflight now fail fast if demo mode is enabled in production.

---

## 4. Product Scope Limitations

### Payroll

- Payroll domain models, setup, calculation, outputs, payslips, provider delivery, storage governance, and finance handoff flows exist in code and automated certification suites.
- Public launch still requires one clean real-tenant payroll run from input lock through calculation, review, output generation, payslip publication, finance handoff, provider receipts, and audit evidence.
- Payroll must not be treated as production-certified until provider credentials, storage policy controls, worker runtime, backup/restore, and alerting evidence pass `production_preflight` and launch signoff.

### Mobile

- Mobile currently has typecheck coverage.
- Mobile does not yet have the same browser/visual/live workflow coverage as web.
- Mobile includes explicit seeded demo entry and placeholder quick actions for mobile punch/history. Demo entry is out of production scope; mobile punch/history are fix-now only if mobile attendance is included in launch.
- Mobile production readiness is blocked or exception-based until the `image-size` advisory decision is closed and the mobile launch scope is signed off.

### Provider Integrations

- Notification delivery has an extensible backend and operational diagnostics.
- Production-grade provider onboarding, credentials, provider-specific failure taxonomy, and delivery SLA monitoring require environment-specific configuration and validation.
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

- Production must run notification and payroll provider workers. `production_preflight --strict` requires notification processing and declared payroll provider worker deployment before launch.
- Observability, alerting, backups, restore rehearsal, and secrets management need environment-specific setup and evidence. Versioned Docker Compose and backup/restore scripts exist under `docker-compose.production.yml` and `ops/`, but a production launch still requires target-environment proof.
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
