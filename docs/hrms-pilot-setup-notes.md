# HRMS Pilot Setup Notes

## 1. Purpose

These notes describe how to set up and verify an HRMS pilot workspace before payroll foundation work begins.

The current recommended pilot posture is web-first HRMS. Mobile remains typecheck-validated, but mobile production distribution needs the dependency-risk decision in `docs/hrms-release-risk-register.md`.

---

## 2. Required Local Services

Backend:

```bash
cd backend
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py bootstrap_demo_workspace
../.venv/bin/python manage.py runserver 127.0.0.1:8000
```

Web:

```bash
HRMS_ENABLE_DEMO_DATA=false HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web dev
```

For deterministic live browser testing, prefer:

```bash
pnpm --dir web test:e2e:live
```

That command resets a dedicated SQLite database, runs migrations, seeds the workspace, starts Django, starts Next, and runs the live browser checks.

---

## 3. Seeded Pilot Users

Default seeded credentials:

| Persona | Username | Password | Expected Workspace |
|---|---|---|---|
| Employee | `riya.sharma` | `Password@123` | ESS |
| Manager | `karan.mehta` | `Password@123` | ESS and MSS |
| HR Admin | `nisha.rao` | `Password@123` | ESS and HR Admin |
| Platform Admin | `platform.admin` | `Password@123` | Platform/admin bootstrap context |

Use `--password` on `bootstrap_demo_workspace` or `PLAYWRIGHT_LIVE_SEED_PASSWORD` for live browser tests when a non-default pilot password is required.

---

## 4. Pre-Pilot Quality Gate

Run this full gate before declaring a pilot build ready:

```bash
DJANGO_DB_ENGINE=django.db.backends.sqlite3 .venv/bin/python backend/manage.py check
cd backend && DJANGO_DB_ENGINE=django.db.backends.sqlite3 ../.venv/bin/python -m pytest -q
cd ..
.venv/bin/python -m pip check
pnpm audit --prod --audit-level critical
pnpm --dir web lint
pnpm --dir web typecheck
pnpm --dir web build
pnpm --dir mobile typecheck
pnpm --dir web test:e2e
pnpm --dir web test:visual
pnpm --dir web test:e2e:live
```

Expected current result:

- Backend check passes.
- Backend tests pass.
- Python dependency check passes.
- No critical JavaScript production audit findings remain.
- Web lint, typecheck, build, browser behavior, visual regression, and live-backend browser checks pass.
- Mobile typecheck passes.
- `pnpm audit --prod --audit-level critical` still reports two high-severity `image-size` findings but exits successfully at the critical threshold.

---

## 5. Manual Pilot Smoke Review

Use these checks after seeding:

1. Sign in as `nisha.rao`.
2. Open `/hr-admin`.
3. Confirm live admin mode, employee counts, organization summary, pending approvals, and navigation cards.
4. Open `/hr-admin/employees`, search/filter employees, and inspect an employee detail.
5. Open `/hr-admin/organization`, switch structural sections, and inspect dependency counts before edit.
6. Open `/hr-admin/policies` and verify policy governance states.
7. Open `/hr-admin/attendance-operations` and verify attendance records plus regularization queues.
8. Open `/hr-admin/lifecycle` and verify onboarding, probation, movement, and exit queues.
9. Open `/hr-admin/employee-documents` and verify document review/expiry context.
10. Open `/hr-admin/generated-letters` and preview a generated letter.
11. Open `/hr-admin/notifications-admin`, `/hr-admin/notifications`, and `/hr-admin/notification-diagnostics`.
12. Open `/hr-admin/reports` and confirm operational export surfaces.
13. Open `/hr-admin/audit` and confirm audit source/search filters.
14. Open `/hr-admin/workflows` and confirm trace filters, step trace, and timeline rows.
15. Sign in as `riya.sharma`, open `/ess`, `/ess/documents`, and `/ess/notifications`.
16. Sign in as `karan.mehta`, open `/mss/approvals` and `/mss/notifications`.
17. As `karan.mehta`, reject one pending leave request with a decision note.
18. As `nisha.rao`, verify that request appears in `/hr-admin/workflows` as rejected with timeline context.

---

## 6. Operational Commands

Process notification queue:

```bash
cd backend
../.venv/bin/python manage.py process_notifications
```

Send document expiry reminders:

```bash
cd backend
../.venv/bin/python manage.py send_document_expiry_reminders
```

These commands should be wired into the deployment scheduler before a production pilot that depends on notification delivery or recurring document expiry reminders.

---

## 7. Pilot Entry Criteria

The HRMS pilot can start when:

- the pre-pilot quality gate is green
- seeded or customer-specific workspace setup is complete
- release notes are shared with pilot stakeholders
- known limitations are accepted
- the mobile `image-size` dependency risk is either out of pilot scope or explicitly accepted
- support owner and escalation path are named

