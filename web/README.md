# Web App

This app will host the web experience for:

- tenant admin
- HR admin and HR executive operations
- organization and policy setup
- workflow configuration
- reporting and exports

Suggested stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Current Status

This web app now includes:

- landing page
- ESS dashboard preview
- MSS approval inbox preview
- login page
- Next route handlers that bridge login/logout to the Django backend

## Auth Setup

Set the backend API base in `web/.env.example` style:

```bash
HRMS_API_BASE_URL=http://localhost:8000/api/v1
```

Then make sure the backend has a usable user:

```bash
cd backend
source .venv/bin/activate
python manage.py createsuperuser
```

After that:

```bash
cd web
corepack pnpm dev
```
