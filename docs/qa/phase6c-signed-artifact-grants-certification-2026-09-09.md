# Phase 6C Signed Artifact Grants Certification

Date: 2026-09-09

## Scope

Certified signed payroll artifact grant lifecycle through Playwright on local dev:

- HR admin Payroll Outputs page renders storage governance and access governance elements.
- Disposable signed-url payroll output is created when the tenant seed only has stream downloads.
- Signed access grant issue returns an active grant, token prefix, signed URL, expiry, permission scope, and max access count.
- Signed grant URL downloads the artifact and records access.
- Revoke without reason is rejected.
- Revoke with reason succeeds and stores revocation metadata.
- The same grant URL is blocked after revocation.
- Access audit export includes signed URL issue and revoke evidence.
- Payroll Outputs page remains free of horizontal overflow.

## Defects Closed

- HR and ESS download proxies were dropping query parameters, so `grant_id` and `token` never reached the backend validator. Query forwarding is now preserved for both download proxies.
- Storage governance browser assertions were overly tied to the default local stream profile. They now validate configurable storage, download, and retention refs.

## Verification

```bash
PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase6c-signed-artifact-grants.spec.ts tests/e2e/production-storage-governance-flows.spec.ts --project=chromium
```

Result: `4 passed`.

Backend expiry regression:

```bash
source .venv/bin/activate && pytest backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_outputs_support_configured_signed_url_storage_strategy -q
```

Result: `1 passed`.

Static checks:

- `source .venv/bin/activate && python backend/manage.py check`: passed.
- `pnpm --dir web exec tsc --noEmit`: passed.

## Coverage Confidence

- Signed grant issue confidence: 90%.
- Signed grant use confidence: 90%.
- Signed grant revoke confidence: 92%.
- Signed grant post-revoke blocking confidence: 92%.
- Signed grant expiry confidence: 88% through backend regression.
- Storage governance configurability confidence: 90%.

Phase 6 confidence after this slice: 91%.

## Residual Phase 6 Work

- Provider retry/dead-letter queue execution proof.
- Broader notification provider delivery failure/retry proof.
