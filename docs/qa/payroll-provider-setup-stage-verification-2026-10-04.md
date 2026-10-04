# Payroll Provider Setup Stage Verification - 2026-10-04

## Scope

Verify that a seeded provider placeholder can be safely moved through the stage setup lane without exposing raw secrets or enabling production delivery by accident.

## Preconditions

- Stage backend, web, Redis/Celery, and Postgres are deployed from the same commit.
- HR Admin user can open `/hr-admin/payroll-providers`.
- Real provider secret material is stored outside the app. The UI receives only credential refs such as `secret-manager://...` or an approved internal alias.
- Live rails remain disabled unless the release owner explicitly enables the production flag.

## Bank Lane Happy Path

1. Open `/hr-admin/payroll-providers`.
2. Confirm the selected lane shows `Selected lane plan`.
3. Confirm seeded placeholders show a blocked next step such as `Replace provider placeholder` or `Complete runtime configuration`.
4. Click `Configure provider`.
5. Confirm the modal warns not to paste raw API keys, passwords, or certificates.
6. Replace placeholder values with the stage bank provider route:
   - `Provider ref`
   - `Provider name`
   - `Adapter ref`
   - `Sandbox adapter ref`
   - `Channel ref`
   - `Credential ref`
   - `Credential profile`
   - `Callback profile`
   - `Callback verification`
   - `Retry policy`
   - `Certification profile`
7. Keep `Real provider route` checked.
8. Keep `Requires real credential reference` checked when the bank lane needs credentials.
9. Save the provider.
10. Refresh `/hr-admin/payroll-providers`.
11. Confirm runtime-route blockers clear in `Selected lane plan`.
12. Open the `Mapping` tab.
13. Activate the bank mapping pack after reviewing simulation evidence.
14. Open the `Connections` tab.
15. Run certification.
16. Confirm certification status moves to passed/certified only after runtime config, credential ref, callback, retry, and non-placeholder config are valid.
17. Run launch rehearsal.
18. Confirm bank lane blockers are either zero or only approved launch-window/activation blockers.

## Negative Checks

- Invalid `Advanced config JSON` must show `Config JSON is invalid.` and must not call save.
- Raw provider secrets must not appear in page text, config JSON, exported evidence, screenshots, or logs.
- Placeholder provider config must not certify.
- `live_delivery_enabled=false` must block certification.
- A provider connection must not become `active` unless certification passed and placeholder config is removed.

## Automation

```bash
cd web
npx playwright test tests/e2e/payroll-providers-flows.spec.ts
```

The automated spec verifies the visible lane plan, safe editor entry point, secret warning, form controls, and invalid JSON guard without mutating provider data.
