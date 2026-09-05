# HRMS Release Notes

## HRMS Pilot Candidate

Date: September 5, 2026

Status:

- Pilot candidate, web-first.
- Backend, web, mobile typecheck, browser, visual, and live-backend gates are green.
- Payroll foundation work is now active beyond the original HRMS pilot scope, with configurable readiness, setup, snapshots, rules, draft calculation, applied adjustments, review, outputs, and finance handoff tracked in the payroll planning docs.

---

## 1. What Is Included

### HR Admin

- Employee master review, create/edit flows, access provisioning, status/access discipline, manager-risk visibility, and structural consistency validation.
- Organization master setup across legal entities, branches, locations, departments, business units, cost centers, designations, grades, and employment types.
- Policy governance for leave, attendance, shifts, holidays, assignments, baseline lineage, clone/detach paths, and locked platform-managed records.
- Attendance operations for records, regularization queues, review actions, shift setup, roster templates, and assignment governance.
- Lifecycle operations for onboarding, probation, movements, exits, rehire readiness, checklist/clearance ownership, due dates, escalations, and workflow template seeding.
- Document operations for employee document review, re-upload requests, expiry context, reminders, document requirements, categories, and generated HR letters.
- Notification operations for event definitions, templates, channel configuration, diagnostics, queues, retry flows, and ESS/MSS notification centers.
- Audit, reports, workflow trace, and operational export surfaces for trust-layer review.

### Employee Self-Service

- ESS dashboard, leave requests, attendance regularizations, document center, notification inbox, source-link navigation, and request history.

### Manager Self-Service

- MSS approval inbox for leave and attendance regularization decisions.
- MSS notification inbox with source-link navigation.
- Live manager rejection flow verified through backend state and HR admin workflow trace visibility.

### Browser And Visual Coverage

- Chromium route smoke coverage across Tier 0, Tier 1, and Tier 2 HRMS routes.
- Browser workflow coverage for operational queues, filters, form validation, governance controls, generated letters, workflow traces, ESS navigation, and MSS queue switching.
- Visual baselines across laptop and mobile viewports for first-route, operational, governance, generated-letter, form, and workflow trace surfaces.
- Live-backend Playwright coverage for seeded auth, role routing, HR admin denial, manager MSS access, and persisted manager rejection workflow state.

---

## 2. Release-Readiness Validation

Latest full gate:

- `DJANGO_DB_ENGINE=django.db.backends.sqlite3 .venv/bin/python backend/manage.py check`
- `DJANGO_DB_ENGINE=django.db.backends.sqlite3 ../.venv/bin/python -m pytest -q`
- `.venv/bin/python -m pip check`
- `pnpm audit --prod --audit-level critical`
- `pnpm --dir web lint`
- `pnpm --dir web typecheck`
- `pnpm --dir web build`
- `pnpm --dir mobile typecheck`
- `pnpm --dir web test:e2e`
- `pnpm --dir web test:visual`
- `pnpm --dir web test:e2e:live`

Latest results:

- Backend tests: `178 passed`.
- Web browser behavior: `42 passed`.
- Web visual regression: `62 passed`.
- Live-backend browser suite: `4 passed`.
- No critical JavaScript production audit findings remain.
- Remaining audit item: two high-severity instances of one unpatched mobile Metro `image-size` advisory.

---

## 3. Dependency Updates In This Candidate

- `next` upgraded to `15.5.21`.
- Root `pnpm.overrides` added for patched transitive dependencies used by web and mobile tooling.
- Critical JavaScript production audit findings cleared.
- Remaining mobile `image-size` risk documented in `docs/hrms-release-risk-register.md`.

---

## 4. Pilot Recommendation

Recommended pilot scope:

- Proceed with web HRMS internal pilot after accepting or excluding the mobile dependency risk.
- Keep mobile app production distribution out of scope until the `image-size` dependency path is removed or explicitly accepted by a security owner.
- Use `docs/hrms-pilot-setup-notes.md` as the setup and verification checklist.
- Use `docs/hrms-known-limitations.md` for stakeholder expectations.

---

## 5. Payroll Handoff Status

Payroll foundation work can begin after:

- the remaining mobile dependency risk is remediated, excluded from scope, or formally accepted
- pilot setup notes are acknowledged
- known limitations are accepted
- release owner confirms HRMS is the stable source of employee, organization, attendance, leave, document, workflow, notification, audit, and report data for payroll design
