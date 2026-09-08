# Payroll Production Readiness Runbook

## 1. Purpose

This runbook explains how to prepare payroll provider delivery for a SaaS tenant without hardcoding bank, accounting, statutory, credential, transport, or storage behavior in payroll core.

Use it when moving a tenant from sandbox certification to production payroll handoff.

---

## 2. Launch Principle

Every production integration must be reference-driven:

- provider connections store refs, status, readiness, and certification evidence
- provider routes select package refs and route-specific settings
- credentials resolve by `credential_ref`
- HTTP/SDK/portal execution resolves through configured transports or client registries
- storage policies declare required controls and verifier refs
- audit evidence stores checksums, refs, status, and redacted provider responses

Do not place bearer tokens, API keys, passwords, private keys, connection strings, or provider secrets in tenant records, route snapshots, package manifests, logs, browser payloads, or committed env files.

---

## 3. Required Runtime Settings

Configure these in the deployment settings module or secret manager backed settings loader.

| Setting | Purpose |
|---|---|
| `PAYROLL_PROVIDER_CREDENTIALS` or `HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON` | Resolves provider `credential_ref` to runtime-only credential material. |
| `PAYROLL_PROVIDER_HTTP_TRANSPORTS` | Maps `transport_ref` to HTTP, SDK bridge, or portal automation transport callables. |
| `PAYROLL_PROVIDER_PACKAGES` | Adds tenant/vendor package manifests when built-ins are not enough. |
| `PAYROLL_BANK_PAYOUT_CLIENTS` | Registers custom bank payout clients. |
| `PAYROLL_ACCOUNTING_JOURNAL_CLIENTS` | Registers custom accounting journal clients. |
| `PAYROLL_STATUTORY_FILING_CLIENTS` | Registers custom statutory filing clients. |
| `PAYROLL_ARTIFACT_STORAGE_CREDENTIALS` or `HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON` | Resolves object storage `credential_ref` values. |
| `PAYROLL_ARTIFACT_STORAGE_POLICIES` or `HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON` | Declares tenant storage policy gates. |
| `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFIERS` | Maps storage control refs/kinds to verifier callables. |
| `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE` | Use `strict` for launch-blocking verification, `declaration` for non-blocking evidence. |

See `docs/payroll-production-env-template.md` for sanitized examples.

---

## 4. Built-In Production Package Refs

Use these package refs unless a tenant needs a custom package manifest:

| Domain | Package Ref | Client Ref |
|---|---|---|
| Bank payout | `payroll.provider_package.bank.razorpayx_http.v1` | `payroll.provider_client.bank.razorpayx_http.v1` |
| Accounting journal | `payroll.provider_package.accounting.tallyprime_http.v1` | `payroll.provider_client.accounting.tallyprime_http.v1` |
| Statutory filing | `payroll.provider_package.statutory.epfo_ecr_http.v1` | `payroll.provider_client.statutory.epfo_ecr_http.v1` |

The generic SDK HTTP package refs remain available for tenants whose provider response shape is fully configured through route response paths:

- `payroll.provider_package.bank.sdk_http.v1`
- `payroll.provider_package.accounting.sdk_http.v1`
- `payroll.provider_package.statutory.sdk_http.v1`

Fixture package refs are for certification and local validation only.

---

## 5. Tenant Connection Checklist

For each provider family, create or update a `PayrollProviderConnection` through `/hr-admin/payroll-providers`.

Required fields:

- `provider_kind`
- `provider_ref`
- `environment_ref`
- `adapter_ref`
- `sandbox_adapter_ref`
- `channel_ref`
- `credential_ref` when `credential_required` is true
- `credential_profile_ref`
- `callback_profile_ref`
- `callback_verification_ref`
- `retry_policy_ref`
- `certification_profile_ref`
- `config_snapshot` with package refs, certification scenarios, and route defaults

Launch gates must show:

- adapter configured
- channel configured
- credential reference configured when required
- callback contract configured
- retry policy configured
- certification passed
- no package registry blockers
- no client registry blockers
- no storage policy blockers
- no strict storage verifier blockers

---

## 6. Route Configuration Checklist

Provider routes must include a `provider_package_ref` and the matching domain adapter config.

Bank payout route:

- `adapter_ref`: `payroll.provider_adapter.bank.live_payout.v1`
- `provider_package_ref`: bank package ref
- `bank_payout_adapter.client_ref`
- `bank_payout_adapter.endpoint_url`
- `bank_payout_adapter.transport_ref`
- `bank_payout_adapter.auth_scheme`
- `bank_payout_adapter.debit_account_ref`
- `bank_payout_adapter.payment_date`
- optional response path overrides

Accounting journal route:

- `adapter_ref`: `payroll.provider_adapter.accounting.live_journal.v1`
- `provider_package_ref`: accounting package ref
- `accounting_journal_adapter.client_ref`
- `accounting_journal_adapter.endpoint_url`
- `accounting_journal_adapter.transport_ref`
- `accounting_journal_adapter.auth_scheme`
- `accounting_journal_adapter.company_ref`
- `accounting_journal_adapter.books_ref`
- `accounting_journal_adapter.posting_date`
- optional response path overrides

Statutory filing route:

- `adapter_ref`: `payroll.provider_adapter.statutory.live_filing.v1`
- `provider_package_ref`: statutory package ref
- `statutory_filing_adapter.client_ref`
- `statutory_filing_adapter.endpoint_url`
- `statutory_filing_adapter.transport_ref`
- `statutory_filing_adapter.auth_scheme`
- `statutory_filing_adapter.authority_ref`
- `statutory_filing_adapter.registration_ref`
- `statutory_filing_adapter.filing_type_ref`
- `statutory_filing_adapter.filing_calendar_ref`
- optional response path overrides

HTTPS is required unless `allow_insecure_http` is enabled for a controlled test environment.

---

## 7. Storage Policy Checklist

Every provider package must reference at least one storage policy.

For production, configure a tenant policy that declares:

- allowed storage provider family and provider ref
- allowed storage credential refs
- allowed bucket/container names
- required payroll key prefix
- allowed retention policy refs
- required encryption ref
- private endpoint requirement
- runtime credential requirement
- lifecycle policy ref
- malware scan profile ref
- durability policy ref
- signed URL expiry window

Use `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE = "strict"` when launch should block on missing or failed verifier evidence.

---

## 8. Certification Flow

1. Configure runtime settings and tenant provider connection refs.
2. Open `/hr-admin/payroll-providers`.
3. Confirm adapter, client, package, and storage policy readiness tables have no blocked required refs.
4. Confirm the `payroll.provider_launch_rehearsal.v1` snapshot shows every bank, accounting, and statutory lane as ready.
5. Run provider certification for each connection.
6. Review scenario evidence, request/response checksums, callback verification refs, and redacted provider responses.
7. Move the connection to `certified`.
8. Activate only after `active_allowed` is true.
9. Configure finance handoff route enforcement to `certified` or `active` for production payroll runs.

Do not bypass failed certification by manually marking a connection active.

The launch rehearsal snapshot is included in `/api/v1/hr-admin/payroll-provider-connection-setup/` as `launch_rehearsal`. It aggregates provider connection status, route presence, adapter registry readiness, package registry readiness, client registry readiness, storage policy readiness, and finance handoff enforcement across the bank, accounting, and statutory lanes.

---

## 9. Pre-Launch Command Gate

Run these before enabling production handoff:

```bash
cd backend
../.venv/bin/python manage.py check
../.venv/bin/python manage.py makemigrations --check --dry-run
../.venv/bin/python manage.py rehearse_payroll_provider_launch --tenant-code <tenant-code> --output-file ../tmp/payroll-provider-launch-audit.json
../.venv/bin/python -m pytest tests/test_phase0_api_smoke.py -k "provider_client_registry_readiness or provider_package_registry_readiness or storage_policy_registry or storage_control_verifiers or bank_razorpayx_http_package_module or accounting_tallyprime_http_package_module or statutory_epfo_ecr_http_package_module"
```

The rehearsal command emits a sanitized `payroll.provider_launch_readiness.audit_pack.v1` JSON pack and persists a `PayrollProviderLaunchRehearsal` history row. It uses the same tenant provider setup path as the admin workspace, includes connection refs, lane ledger, registry evidence, release gates, blockers, and an evidence checksum. A blocked rehearsal exits nonzero unless `--allow-blocked` is passed for diagnostic export.

HR admins can also run and review launch rehearsals from `/hr-admin/payroll-providers`. The workspace records the run through `/api/v1/hr-admin/payroll-provider-launch-rehearsals/run/` and shows recent run status, lane counts, blocker refs, and evidence checksums.

```bash
cd web
npm run typecheck
npx playwright test tests/e2e/payroll-providers-flows.spec.ts
npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"
```

For a wider release gate, also run the pre-pilot quality gate in `docs/hrms-pilot-setup-notes.md`.

---

## 10. Support Triage

When launch readiness is blocked, check in this order:

1. `/hr-admin/payroll-providers` summary metrics.
2. Required provider connection readiness gates.
3. Provider client registry `blocking_gate_refs`.
4. Provider package registry `blocking_gate_refs`.
5. Storage policy registry `blocking_gate_refs`.
6. Storage control verification `blocked_control_refs`.
7. Certification run scenario failures.
8. Provider delivery response snapshot and retry/dead-letter ledger.
9. Callback event signature and idempotency evidence.
10. Locked provider audit pack.

Common blockers:

| Blocker | Meaning | Action |
|---|---|---|
| `provider_client_ref_not_registered` | Route references an unknown client ref. | Register the client or switch to a built-in client ref. |
| `provider_package_ref_not_registered` | Route references an unknown package ref. | Add `PAYROLL_PROVIDER_PACKAGES` or use a built-in package ref. |
| `raw_provider_credentials_not_allowed` | Secret-shaped keys are in route/package config. | Move secret material to credential resolver and keep only refs in config. |
| `storage_policy_ref_blocked` | Package references a storage policy that is missing or blocked. | Fix policy config or verifier failures. |
| `storage_control_verification_blocked` | Strict storage controls failed or lack verifier evidence. | Configure verifier callbacks or repair the underlying control. |
| `provider_credential_ref_not_configured` | Runtime credential resolver lacks the referenced credential. | Add the credential ref to the deployment secret-backed resolver. |

---

## 11. Production Change Control

Treat these as controlled production changes:

- package ref changes
- endpoint or transport ref changes
- credential ref changes
- response path overrides
- callback verification refs
- storage provider, storage policy, retention, encryption, lifecycle, malware scan, or durability refs
- certification scenario changes
- retry/dead-letter policy changes

After any controlled change, rerun certification and record the evidence before the next payroll handoff.
