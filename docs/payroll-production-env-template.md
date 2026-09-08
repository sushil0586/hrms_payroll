# Payroll Production Environment Template

This template shows the shape of production payroll provider configuration. It is intentionally sanitized: keep real secrets in a secret manager, not in this repository.

Use stable refs everywhere. The value behind a ref can change during rotation, but persisted payroll evidence should continue to contain only refs, checksums, and redacted descriptors.

---

## 1. Backend Env Pointers

`backend/.env.example` exposes only pointers:

```bash
HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON={}
HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON={}
HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON={}
```

For production, prefer a deployment settings module that loads these dictionaries from a secret manager instead of raw shell env.

---

## 2. Provider Credentials

Shape for `PAYROLL_PROVIDER_CREDENTIALS` or `HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON`:

```json
{
  "tenant:northstar:provider/bank/razorpayx/runtime": {
    "enabled": true,
    "provider_ref": "tenant:northstar:provider/bank/razorpayx",
    "source_ref": "secret-manager://tenant/northstar/payroll/bank/razorpayx",
    "credentials": {
      "bearer_token": "${SECRET_MANAGER_VALUE}"
    },
    "metadata": {
      "environment": "production",
      "rotation_ref": "payroll.rotation.monthly.v1"
    }
  },
  "tenant:northstar:provider/accounting/tallyprime/runtime": {
    "enabled": true,
    "provider_ref": "tenant:northstar:provider/accounting/tallyprime",
    "source_ref": "secret-manager://tenant/northstar/payroll/accounting/tallyprime",
    "credentials": {
      "api_key": "${SECRET_MANAGER_VALUE}"
    },
    "metadata": {
      "environment": "production",
      "rotation_ref": "payroll.rotation.monthly.v1"
    }
  },
  "tenant:northstar:provider/statutory/epfo/runtime": {
    "enabled": true,
    "provider_ref": "tenant:northstar:provider/statutory/epfo",
    "source_ref": "secret-manager://tenant/northstar/payroll/statutory/epfo",
    "credentials": {
      "bearer_token": "${SECRET_MANAGER_VALUE}"
    },
    "metadata": {
      "environment": "production",
      "rotation_ref": "payroll.rotation.monthly.v1"
    }
  }
}
```

Do not paste actual tokens into committed files.

---

## 3. Provider Transports

`PAYROLL_PROVIDER_HTTP_TRANSPORTS` is a Python settings dictionary because values are callables.

```python
from tenant_integrations.payroll.transports import (
    razorpayx_transport,
    tallyprime_transport,
    epfo_ecr_transport,
)

PAYROLL_PROVIDER_HTTP_TRANSPORTS = {
    "tenant:northstar:transport/bank/razorpayx/api": razorpayx_transport,
    "tenant:northstar:transport/accounting/tallyprime/bridge": tallyprime_transport,
    "tenant:northstar:transport/statutory/epfo/ecr": epfo_ecr_transport,
}
```

Each transport must accept:

```python
def transport(*, method, url, headers, body, timeout_seconds):
    ...
```

And return either:

```python
{
    "status_code": 202,
    "response_body": "{\"status\":\"accepted\"}",
    "response_headers": {"x-provider-request-id": "provider-request-ref"}
}
```

or the equivalent `PayrollProviderHttpTransportResult`.

---

## 4. Built-In Package Selection

Recommended package refs:

```json
{
  "bank_package_ref": "payroll.provider_package.bank.razorpayx_http.v1",
  "accounting_package_ref": "payroll.provider_package.accounting.tallyprime_http.v1",
  "statutory_package_ref": "payroll.provider_package.statutory.epfo_ecr_http.v1"
}
```

Only use `PAYROLL_PROVIDER_PACKAGES` when a tenant needs a package not covered by built-ins.

Custom package manifest shape:

```python
PAYROLL_PROVIDER_PACKAGES = {
    "tenant:northstar:provider_package/bank/custom_api/v1": {
        "package_profile_ref": "tenant:northstar:provider_package_manifest/bank/custom_api/v1",
        "package_module_ref": "tenant:northstar:provider_package_module/bank/custom_api/v1",
        "vendor_profile_ref": "tenant:northstar:provider_vendor/bank/custom/v1",
        "provider_contract_ref": "tenant:northstar:provider_contract/bank/custom_payout/v1",
        "provider_kind": "bank",
        "provider_name": "Northstar custom bank payout package",
        "adapter_ref": "payroll.provider_adapter.bank.live_payout.v1",
        "client_ref": "payroll.provider_client.bank.sdk_http.v1",
        "certification_fixture_client_ref": "payroll.provider_client.bank.fixture.v1",
        "supported_artifact_kinds": ["bank_advice"],
        "supported_transport_modes": ["api"],
        "required_route_config_refs": [
            "provider_package_ref",
            "bank_payout_adapter.client_ref",
            "bank_payout_adapter.endpoint_url",
            "bank_payout_adapter.transport_ref",
            "bank_payout_adapter.auth_scheme",
            "bank_payout_adapter.debit_account_ref",
            "bank_payout_adapter.payment_date"
        ],
        "certification_scenario_refs": [
            "custom_bank_payout_acknowledged",
            "custom_bank_payout_idempotent_replay"
        ],
        "evidence_path_refs": [
            "bank_payout.provider_response.sdk_client.response_status_code",
            "bank_payout.utr_refs",
            "bank_payout.evidence_refs"
        ],
        "schema_mapping_profile_ref": "tenant:northstar:provider_mapping/bank/custom_api/v1",
        "credential_profile_ref": "tenant:northstar:provider_credentials/bank/custom_api/reference/v1",
        "failure_taxonomy_ref": "tenant:northstar:bank_payout/custom_api/failure_taxonomy/v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": ["tenant:northstar:storage_policy/payroll/private/v1"],
        "sandbox_ready": false
    }
}
```

---

## 5. Tenant Route Snapshot Examples

Bank payout:

```json
{
  "provider_package_ref": "payroll.provider_package.bank.razorpayx_http.v1",
  "adapter_ref": "payroll.provider_adapter.bank.live_payout.v1",
  "credential_ref": "tenant:northstar:provider/bank/razorpayx/runtime",
  "bank_payout_adapter": {
    "provider_package_ref": "payroll.provider_package.bank.razorpayx_http.v1",
    "client_ref": "payroll.provider_client.bank.razorpayx_http.v1",
    "endpoint_url": "https://provider.example.com/payouts/bulk",
    "transport_ref": "tenant:northstar:transport/bank/razorpayx/api",
    "timeout_seconds": 30,
    "auth_scheme": "bearer",
    "static_headers": {
      "X-Tenant-Program": "northstar-payroll"
    },
    "debit_account_ref": "tenant:northstar:bank/debit/payroll",
    "payment_operation_ref": "bank.payout.bulk.v1",
    "payment_network_ref": "imps",
    "payment_date": "YYYY-MM-DD"
  }
}
```

Accounting journal:

```json
{
  "provider_package_ref": "payroll.provider_package.accounting.tallyprime_http.v1",
  "adapter_ref": "payroll.provider_adapter.accounting.live_journal.v1",
  "credential_ref": "tenant:northstar:provider/accounting/tallyprime/runtime",
  "accounting_journal_adapter": {
    "provider_package_ref": "payroll.provider_package.accounting.tallyprime_http.v1",
    "client_ref": "payroll.provider_client.accounting.tallyprime_http.v1",
    "endpoint_url": "https://accounting-bridge.example.com/payroll/journals/import",
    "transport_ref": "tenant:northstar:transport/accounting/tallyprime/bridge",
    "timeout_seconds": 30,
    "auth_scheme": "api_key_header",
    "api_key_header_name": "X-API-Key",
    "company_ref": "tenant:northstar:accounting/company/main",
    "books_ref": "tenant:northstar:accounting/books/payroll",
    "posting_profile_ref": "accounting.payroll.monthly_posting.v1",
    "journal_operation_ref": "tallyprime.voucher.import.v1",
    "posting_date": "YYYY-MM-DD"
  }
}
```

Statutory filing:

```json
{
  "provider_package_ref": "payroll.provider_package.statutory.epfo_ecr_http.v1",
  "adapter_ref": "payroll.provider_adapter.statutory.live_filing.v1",
  "credential_ref": "tenant:northstar:provider/statutory/epfo/runtime",
  "statutory_filing_adapter": {
    "provider_package_ref": "payroll.provider_package.statutory.epfo_ecr_http.v1",
    "client_ref": "payroll.provider_client.statutory.epfo_ecr_http.v1",
    "endpoint_url": "https://statutory-bridge.example.com/epfo/ecr/upload",
    "transport_ref": "tenant:northstar:transport/statutory/epfo/ecr",
    "timeout_seconds": 45,
    "auth_scheme": "bearer",
    "authority_ref": "india.epfo.portal.v1",
    "registration_ref": "tenant:northstar:statutory/epfo/registration/main",
    "filing_type_ref": "india.epfo.ecr.monthly.v1",
    "filing_calendar_ref": "tenant:northstar:statutory/epfo/calendar/monthly",
    "filing_operation_ref": "epfo.ecr.upload.v1",
    "due_date": "YYYY-MM-DD"
  }
}
```

---

## 6. Storage Credentials

Shape for `PAYROLL_ARTIFACT_STORAGE_CREDENTIALS` or `HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON`:

```json
{
  "tenant:northstar:storage/payroll/private/runtime": {
    "enabled": true,
    "provider_family": "s3",
    "source_ref": "secret-manager://tenant/northstar/payroll/storage/private",
    "use_default_credentials": false,
    "credentials": {
      "access_key_id": "${SECRET_MANAGER_VALUE}",
      "secret_access_key": "${SECRET_MANAGER_VALUE}"
    },
    "metadata": {
      "environment": "production",
      "rotation_ref": "payroll.storage.rotation.quarterly.v1"
    }
  }
}
```

---

## 7. Storage Policy

Shape for `PAYROLL_ARTIFACT_STORAGE_POLICIES` or `HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON`:

```json
{
  "tenant:northstar:storage_policy/payroll/private/v1": {
    "enabled": true,
    "allowed_provider_families": ["s3"],
    "allowed_provider_refs": ["tenant:northstar:storage/s3/private"],
    "allowed_credential_refs": ["tenant:northstar:storage/payroll/private/runtime"],
    "allowed_bucket_names": ["tenant-northstar-payroll-private"],
    "allowed_retention_policy_refs": ["payroll.retention.10y.v1"],
    "allowed_encryption_refs": ["tenant:northstar:kms/payroll/private"],
    "allowed_endpoint_hosts": ["s3.private.example.com"],
    "required_key_prefix": "tenant/northstar/payroll/",
    "require_encryption_ref": true,
    "require_private_endpoint": true,
    "require_runtime_credentials": true,
    "min_signed_url_expires_in_seconds": 60,
    "max_signed_url_expires_in_seconds": 900,
    "max_file_size_bytes": 52428800,
    "lifecycle_policy_ref": "tenant:northstar:lifecycle/payroll/10y",
    "malware_scan_profile_ref": "tenant:northstar:malware_scan/payroll",
    "durability_policy_ref": "tenant:northstar:durability/payroll/standard",
    "metadata": {
      "control_owner": "platform-security"
    }
  }
}
```

---

## 8. Storage Control Verifiers

`PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFIERS` is a Python settings dictionary because values are callables.

```python
from tenant_integrations.payroll.storage_verifiers import (
    verify_private_endpoint,
    verify_kms_key,
    verify_lifecycle_policy,
    verify_malware_scan_profile,
    verify_durability_policy,
    verify_runtime_storage_credentials,
)

PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE = "strict"

PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFIERS = {
    "private_endpoint": verify_private_endpoint,
    "kms": verify_kms_key,
    "lifecycle": verify_lifecycle_policy,
    "malware_scan": verify_malware_scan_profile,
    "durability": verify_durability_policy,
    "runtime_credentials": verify_runtime_storage_credentials,
}
```

Verifier callable shape:

```python
def verify_private_endpoint(*, policy, control_ref, control_kind):
    return {
        "status": "verified",
        "verified": True,
        "evidence_snapshot": {
            "checked_at": "runtime-generated-iso8601",
            "control_ref": control_ref,
            "control_kind": control_kind
        }
    }
```

Never include provider tokens, storage keys, passwords, private keys, or connection strings in verifier evidence.

---

## 9. Launch Verification Commands

```bash
cd backend
../.venv/bin/python manage.py check
../.venv/bin/python manage.py makemigrations --check --dry-run
../.venv/bin/python -m pytest tests/test_phase0_api_smoke.py -k "provider_client_registry_readiness or provider_package_registry_readiness or storage_policy_registry or storage_control_verifiers"
```

```bash
cd web
npm run typecheck
npx playwright test tests/e2e/payroll-providers-flows.spec.ts
npx playwright test tests/visual/operational-baseline.visual.spec.ts -g "payroll-providers"
```
