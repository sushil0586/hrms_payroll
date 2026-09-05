# Backend

This directory will host the Django + Django REST Framework backend for the HRMS SaaS.

## Structure

- `config/`: Django project config, settings, URL routing, ASGI/WSGI, Celery
- `apps/`: domain apps such as tenants, employees, attendance, workflows
- `requirements/`: Python dependency files
- `tests/`: cross-app backend tests

## First Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements/local.txt
python manage.py check
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Local development uses `SQLite` by default through `config.settings.local`.
If you want local Postgres instead, set `DJANGO_DB_ENGINE=django.db.backends.postgresql`
and provide the `POSTGRES_*` environment variables from `.env.example`.

## Auth Endpoints

The backend now exposes a first auth/session API layer:

- `POST /api/v1/auth/login/`
- `GET /api/v1/auth/session/`
- `POST /api/v1/auth/logout/`

Login accepts:

```json
{
  "identifier": "username-or-email",
  "password": "your-password"
}
```

The response returns a DRF token plus a session user payload. The web app uses that token
through an HTTP-only cookie.

## Demo Bootstrap

To create a ready-to-use demo workspace for web and mobile testing:

```bash
cd backend
source .venv/bin/activate
python manage.py bootstrap_demo_workspace
```

Seeded demo credentials:

- `riya.sharma / Password@123`
- `karan.mehta / Password@123`
- `nisha.rao / Password@123`
- `platform.admin / Password@123`

## Domain Apps

- `common`
- `tenants`
- `iam`
- `platform_config`
- `organizations`
- `employees`
- `employee_lifecycle`
- `documents`
- `leave_management`
- `attendance`
- `workflows`
- `notifications`
- `reports`
- `audit`
