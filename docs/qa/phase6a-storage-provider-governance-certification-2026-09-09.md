# Phase 6A Storage and Provider Governance Certification - 2026-09-09

## Scope

Certified launch-critical storage governance and provider readiness visibility through local browser UI:

- `/hr-admin/payroll-outputs`
- `/ess/payslips`
- `/hr-admin/payroll-providers`

## Browser Path Certified

1. HR payroll outputs expose storage metadata, artifact readiness, access governance counters, source hash, and access audit export.
2. HR artifact download and audit export links use same-origin app proxy routes.
3. Employee payslip surface remains published-only and employee-scoped with storage metadata and read/download evidence.
4. Provider workspace exposes connections, certification checklist, scenario evidence, adapter contract, schema mapping, launch rehearsal, and certification controls.
5. Provider storage policy registry exposes strict storage controls, credential references, no-raw-secret posture, required package policy, retention, and verification status.
6. Browser text was scanned for raw secret leakage patterns.

## Product/Test Updates

- Updated `production-storage-governance-flows.spec.ts` to expect the same-origin HR artifact proxy links introduced in Phase 5H.
- Removed an obsolete demo-only `Seed Ref` assertion from live storage governance proof.

## Element Coverage

- HR outputs: download link, access audit export link, storage provider, object version, download strategy, retention, access counters, source hash, template/config section.
- ESS payslips: download link, access trail, read receipt, payment summary, storage governance, checksum, recent access events, calculation lines.
- Payroll providers: connections, certification controls, scenario evidence, storage policy readiness, credential refs, raw-secret redaction, launch rehearsal.
- Layout: horizontal overflow guard on all touched pages.

## Test Commands

```bash
source .venv/bin/activate && python backend/manage.py check
```

Result: passed.

```bash
pnpm --dir web exec tsc --noEmit
```

Result: passed.

```bash
PLAYWRIGHT_PORT=3223 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 \
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test \
  web/tests/e2e/production-storage-governance-flows.spec.ts \
  web/tests/e2e/payroll-providers-flows.spec.ts \
  --project=chromium --workers=1 --timeout=300000
```

Result: `4 passed`.

## Confidence

- Storage governance browser confidence: 88%.
- Provider readiness visibility confidence: 86%.
- Raw secret redaction confidence: 88%.
- Current Phase 6 confidence: 86%.

## Residual Risks

- Valid callback acceptance, replay idempotency, and invalid signature rejection need mutation proof.
- Signed grant issue/use/revocation/expiry needs dedicated browser-authenticated proof.
- Retry/dead-letter queue execution needs positive and negative proof.
