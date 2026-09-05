# Mobile App

This app will host the shared ESS + MSS mobile product for Android and iOS.

Suggested stack:

- React Native
- Expo
- TypeScript

Primary MVP focus:

- login
- employee dashboard
- leave flows
- attendance summary and actions
- manager approval inbox
- notifications

## Current Status

The mobile app now includes a first Expo scaffold with:

- login screen
- demo mode entry
- secure session restore between launches
- shared ESS + MSS shell
- role-aware bottom navigation
- employee home, attendance, leave, approvals, and more tabs
- live-or-demo API integration aligned with the web app contract
- working leave request form
- working attendance regularization form
- working manager approve/reject actions for leave and attendance queues
- pull-to-refresh and retry handling across the mobile workspace
- native date and datetime pickers for mobile action forms

## Run Locally

Set the API base URL in `.env` format:

```bash
EXPO_PUBLIC_HRMS_API_BASE_URL=http://localhost:8000/api/v1
```

Then run:

```bash
corepack pnpm install
corepack pnpm --dir mobile typecheck
corepack pnpm --dir mobile start
```

If the backend is unavailable, the app can still open in seeded demo mode from the login screen.
Live login sessions are stored securely on-device and restored on the next launch when the token is still valid.
