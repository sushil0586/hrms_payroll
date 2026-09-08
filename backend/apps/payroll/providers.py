"""Payroll provider submission adapter boundary.

The default adapters are deterministic contract adapters for local/sandbox use.
Real bank, accounting, and statutory SDK adapters can implement the same shape.
"""

from __future__ import annotations

import hashlib
import importlib
import json
import os
from dataclasses import dataclass, field
from typing import Any, Protocol
from urllib import error as urllib_error
from urllib import request as urllib_request

from django.conf import settings

from apps.payroll.storage import DEFAULT_STORAGE_POLICY_REF, describe_payroll_artifact_storage_policy_registry


PAYROLL_PROVIDER_CREDENTIALS_ENV = "HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON"
RAW_PROVIDER_CREDENTIAL_KEYS = {
    "access_key",
    "access_key_id",
    "api_key",
    "client_secret",
    "connection_string",
    "password",
    "private_key",
    "secret",
    "secret_access_key",
    "secret_key",
    "token",
    "authorization",
    "proxy_authorization",
    "x-api-key",
    "x-api-token",
}


class PayrollProviderAdapterError(ValueError):
    """Raised when a payroll provider adapter cannot submit a delivery."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "payroll_provider_adapter_error",
        provider_ref: str = "",
        retryable: bool = False,
    ):
        super().__init__(message)
        self.code = code
        self.provider_ref = provider_ref
        self.retryable = retryable


@dataclass(frozen=True)
class PayrollProviderCredential:
    credential_ref: str
    provider_ref: str
    source_ref: str
    use_sandbox: bool
    metadata: dict[str, Any]
    material: dict[str, Any]

    def snapshot(self) -> dict[str, Any]:
        return {
            "credential_ref": self.credential_ref,
            "provider_ref": self.provider_ref,
            "source_ref": self.source_ref,
            "use_sandbox": self.use_sandbox,
            "metadata": self.metadata,
        }


@dataclass(frozen=True)
class PayrollProviderSubmissionRequest:
    tenant_id: str
    delivery_id: str
    handoff_id: str
    output_artifact_id: str
    artifact_kind: str
    provider_ref: str
    channel_ref: str
    adapter_ref: str
    submission_mode: str
    submission_profile_ref: str
    request_schema_ref: str
    response_schema_ref: str
    callback_profile_ref: str
    callback_verification_ref: str
    idempotency_key: str
    external_reference: str
    payload_checksum_sha256: str
    artifact_snapshot: dict[str, Any]
    route_snapshot: dict[str, Any]
    credential_snapshot: dict[str, Any]

    def snapshot(self) -> dict[str, Any]:
        return {
            "tenant_id": self.tenant_id,
            "delivery_id": self.delivery_id,
            "handoff_id": self.handoff_id,
            "output_artifact_id": self.output_artifact_id,
            "artifact_kind": self.artifact_kind,
            "provider_ref": self.provider_ref,
            "channel_ref": self.channel_ref,
            "adapter_ref": self.adapter_ref,
            "submission_mode": self.submission_mode,
            "submission_profile_ref": self.submission_profile_ref,
            "request_schema_ref": self.request_schema_ref,
            "response_schema_ref": self.response_schema_ref,
            "callback_profile_ref": self.callback_profile_ref,
            "callback_verification_ref": self.callback_verification_ref,
            "idempotency_key": self.idempotency_key,
            "external_reference": self.external_reference,
            "payload_checksum_sha256": self.payload_checksum_sha256,
            "artifact_snapshot": self.artifact_snapshot,
            "route_snapshot": self.route_snapshot,
            "credential_snapshot": self.credential_snapshot,
        }


@dataclass(frozen=True)
class PayrollProviderSubmissionResult:
    provider_status: str
    external_reference: str
    provider_batch_ref: str
    response_snapshot: dict[str, Any]
    certification_evidence_refs: list[str] = field(default_factory=list)
    failure_code: str = ""
    failure_reason: str = ""
    retryable: bool = False

    def snapshot(self) -> dict[str, Any]:
        return {
            "provider_status": self.provider_status,
            "external_reference": self.external_reference,
            "provider_batch_ref": self.provider_batch_ref,
            "response_snapshot": self.response_snapshot,
            "certification_evidence_refs": self.certification_evidence_refs,
            "failure_code": self.failure_code,
            "failure_reason": self.failure_reason,
            "retryable": self.retryable,
        }


@dataclass(frozen=True)
class PayrollProviderHttpTransportResult:
    status_code: int
    response_body: str
    response_headers: dict[str, Any] = field(default_factory=dict)


class PayrollProviderAdapter(Protocol):
    adapter_ref: str

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        ...


PROVIDER_ADAPTER_CONTRACT_REQUIRED_REQUEST_FIELDS = [
    "tenant_id",
    "delivery_id",
    "artifact_kind",
    "provider_ref",
    "channel_ref",
    "adapter_ref",
    "submission_mode",
    "submission_profile_ref",
    "request_schema_ref",
    "response_schema_ref",
    "idempotency_key",
    "payload_checksum_sha256",
]

PROVIDER_ADAPTER_CONTRACT_REQUIRED_RESULT_FIELDS = [
    "provider_status",
    "external_reference",
    "provider_batch_ref",
]

PROVIDER_ADAPTER_CONTRACT_ALLOWED_STATUSES = [
    "submitted",
    "acknowledged",
    "reconciled",
    "rejected",
    "failed",
]

PRODUCTION_PROVIDER_ADAPTER_REFS = {
    "payroll.provider_adapter.bank.production_pack.v1",
    "payroll.provider_adapter.accounting.production_pack.v1",
    "payroll.provider_adapter.statutory.production_pack.v1",
}
PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF = "payroll.provider_adapter.bank.live_payout.v1"
PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF = "payroll.provider_adapter.accounting.live_journal.v1"
PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF = "payroll.provider_adapter.statutory.live_filing.v1"
PAYROLL_BANK_FIXTURE_CLIENT_REF = "payroll.provider_client.bank.fixture.v1"
PAYROLL_ACCOUNTING_FIXTURE_CLIENT_REF = "payroll.provider_client.accounting.fixture.v1"
PAYROLL_STATUTORY_FIXTURE_CLIENT_REF = "payroll.provider_client.statutory.fixture.v1"
PAYROLL_BANK_SDK_HTTP_CLIENT_REF = "payroll.provider_client.bank.sdk_http.v1"
PAYROLL_BANK_RAZORPAYX_HTTP_CLIENT_REF = "payroll.provider_client.bank.razorpayx_http.v1"
PAYROLL_ACCOUNTING_SDK_HTTP_CLIENT_REF = "payroll.provider_client.accounting.sdk_http.v1"
PAYROLL_ACCOUNTING_TALLYPRIME_HTTP_CLIENT_REF = "payroll.provider_client.accounting.tallyprime_http.v1"
PAYROLL_STATUTORY_SDK_HTTP_CLIENT_REF = "payroll.provider_client.statutory.sdk_http.v1"
PAYROLL_STATUTORY_EPFO_ECR_HTTP_CLIENT_REF = "payroll.provider_client.statutory.epfo_ecr_http.v1"
PAYROLL_BANK_FIXTURE_PACKAGE_REF = "payroll.provider_package.bank.fixture.v1"
PAYROLL_ACCOUNTING_FIXTURE_PACKAGE_REF = "payroll.provider_package.accounting.fixture.v1"
PAYROLL_STATUTORY_FIXTURE_PACKAGE_REF = "payroll.provider_package.statutory.fixture.v1"
PAYROLL_BANK_SDK_HTTP_PACKAGE_REF = "payroll.provider_package.bank.sdk_http.v1"
PAYROLL_BANK_RAZORPAYX_HTTP_PACKAGE_REF = "payroll.provider_package.bank.razorpayx_http.v1"
PAYROLL_ACCOUNTING_SDK_HTTP_PACKAGE_REF = "payroll.provider_package.accounting.sdk_http.v1"
PAYROLL_ACCOUNTING_TALLYPRIME_HTTP_PACKAGE_REF = "payroll.provider_package.accounting.tallyprime_http.v1"
PAYROLL_STATUTORY_SDK_HTTP_PACKAGE_REF = "payroll.provider_package.statutory.sdk_http.v1"
PAYROLL_STATUTORY_EPFO_ECR_HTTP_PACKAGE_REF = "payroll.provider_package.statutory.epfo_ecr_http.v1"

PRODUCTION_PROVIDER_TRANSPORT_MODES = {
    "api",
    "file_export",
    "portal",
    "portal_automation",
    "sftp",
}


def _snapshot_path_value(payload: dict[str, Any], path: str) -> Any:
    value: Any = payload
    for part in str(path).split("."):
        if isinstance(value, dict) and part in value:
            value = value[part]
        else:
            return None
    return value


def _contract_config(request: PayrollProviderSubmissionRequest) -> dict[str, Any]:
    configured = request.route_snapshot.get("adapter_contract")
    configured_contract = configured if isinstance(configured, dict) else {}
    enforcement_mode = str(configured_contract.get("enforcement_mode") or "warn").strip().lower()
    if enforcement_mode not in {"disabled", "warn", "strict"}:
        enforcement_mode = "warn"
    return {
        "contract_profile_ref": str(
            configured_contract.get("contract_profile_ref")
            or f"payroll.provider_contract.{request.artifact_kind}.adapter.v1"
        ),
        "enforcement_mode": enforcement_mode,
        "request_required_fields": configured_contract.get(
            "request_required_fields",
            PROVIDER_ADAPTER_CONTRACT_REQUIRED_REQUEST_FIELDS,
        ),
        "result_required_fields": configured_contract.get(
            "result_required_fields",
            PROVIDER_ADAPTER_CONTRACT_REQUIRED_RESULT_FIELDS,
        ),
        "response_snapshot_required_fields": configured_contract.get("response_snapshot_required_fields", []),
        "allowed_provider_statuses": configured_contract.get(
            "allowed_provider_statuses",
            PROVIDER_ADAPTER_CONTRACT_ALLOWED_STATUSES,
        ),
        "expected_adapter_ref": str(configured_contract.get("expected_adapter_ref") or request.adapter_ref),
        "expected_provider_ref": str(configured_contract.get("expected_provider_ref") or request.provider_ref),
        "require_credential_resolution": bool(configured_contract.get("require_credential_resolution", False)),
        "configured": configured_contract,
    }


def _contract_gate(ref: str, label: str, passed: bool, value: Any = "") -> dict[str, Any]:
    return {
        "ref": ref,
        "label": label,
        "passed": bool(passed),
        "value": "" if value is None else str(value),
    }


def validate_payroll_provider_adapter_request_contract(request: PayrollProviderSubmissionRequest) -> dict[str, Any]:
    """Validate the outbound provider adapter request against a configurable contract."""

    contract = _contract_config(request)
    if contract["enforcement_mode"] == "disabled":
        return {
            "contract_profile_ref": contract["contract_profile_ref"],
            "enforcement_mode": contract["enforcement_mode"],
            "status": "disabled",
            "gates": [],
            "blocking_gate_refs": [],
        }

    request_snapshot = request.snapshot()
    required_fields = [
        str(item)
        for item in contract["request_required_fields"]
        if str(item).strip()
    ] if isinstance(contract["request_required_fields"], list) else PROVIDER_ADAPTER_CONTRACT_REQUIRED_REQUEST_FIELDS
    gates = [
        _contract_gate(f"request_field:{field}", f"Request field {field}", _contract_value_present(_snapshot_path_value(request_snapshot, field)), field)
        for field in required_fields
    ]
    gates.extend(
        [
            _contract_gate("adapter_ref_match", "Adapter ref matches contract", request.adapter_ref == contract["expected_adapter_ref"], request.adapter_ref),
            _contract_gate("provider_ref_match", "Provider ref matches contract", request.provider_ref == contract["expected_provider_ref"], request.provider_ref),
        ]
    )
    if contract["require_credential_resolution"]:
        gates.append(
            _contract_gate(
                "credential_resolved",
                "Credential resolved",
                bool(request.credential_snapshot.get("resolved")),
                request.credential_snapshot.get("credential_ref", ""),
            )
        )
    blocking = [gate["ref"] for gate in gates if not gate["passed"]]
    snapshot = {
        "contract_profile_ref": contract["contract_profile_ref"],
        "enforcement_mode": contract["enforcement_mode"],
        "status": "passed" if not blocking else "blocked",
        "phase": "request",
        "gates": gates,
        "blocking_gate_refs": blocking,
    }
    if blocking and contract["enforcement_mode"] == "strict":
        raise PayrollProviderAdapterError(
            "Payroll provider adapter request failed strict contract validation: " + ", ".join(blocking),
            code="provider_adapter_request_contract_failed",
            provider_ref=request.provider_ref,
            retryable=False,
        )
    return snapshot


def _contract_value_present(value: Any) -> bool:
    if value is None or value == "":
        return False
    if isinstance(value, (dict, list, tuple, set)):
        return bool(value)
    return True


def validate_payroll_provider_adapter_result_contract(
    request: PayrollProviderSubmissionRequest,
    result: PayrollProviderSubmissionResult,
) -> dict[str, Any]:
    """Validate a provider adapter result against a configurable production contract."""

    contract = _contract_config(request)
    if contract["enforcement_mode"] == "disabled":
        return {
            "contract_profile_ref": contract["contract_profile_ref"],
            "enforcement_mode": contract["enforcement_mode"],
            "status": "disabled",
            "gates": [],
            "blocking_gate_refs": [],
        }

    result_snapshot = result.snapshot()
    required_fields = [
        str(item)
        for item in contract["result_required_fields"]
        if str(item).strip()
    ] if isinstance(contract["result_required_fields"], list) else PROVIDER_ADAPTER_CONTRACT_REQUIRED_RESULT_FIELDS
    response_required_fields = [
        str(item)
        for item in contract["response_snapshot_required_fields"]
        if str(item).strip()
    ] if isinstance(contract["response_snapshot_required_fields"], list) else []
    allowed_statuses = {
        str(item)
        for item in contract["allowed_provider_statuses"]
        if str(item).strip()
    } if isinstance(contract["allowed_provider_statuses"], list) else set(PROVIDER_ADAPTER_CONTRACT_ALLOWED_STATUSES)
    gates = [
        _contract_gate(f"result_field:{field}", f"Result field {field}", _contract_value_present(_snapshot_path_value(result_snapshot, field)), field)
        for field in required_fields
    ]
    gates.append(
        _contract_gate("provider_status_allowed", "Provider status allowed", result.provider_status in allowed_statuses, result.provider_status)
    )
    gates.extend(
        _contract_gate(
            f"response_snapshot:{field}",
            f"Response snapshot {field}",
            _contract_value_present(_snapshot_path_value(result.response_snapshot, field)),
            field,
        )
        for field in response_required_fields
    )
    blocking = [gate["ref"] for gate in gates if not gate["passed"]]
    snapshot = {
        "contract_profile_ref": contract["contract_profile_ref"],
        "enforcement_mode": contract["enforcement_mode"],
        "status": "passed" if not blocking else "blocked",
        "phase": "result",
        "gates": gates,
        "blocking_gate_refs": blocking,
    }
    if blocking and contract["enforcement_mode"] == "strict":
        raise PayrollProviderAdapterError(
            "Payroll provider adapter result failed strict contract validation: " + ", ".join(blocking),
            code="provider_adapter_result_contract_failed",
            provider_ref=request.provider_ref,
            retryable=False,
        )
    return snapshot


def _has_raw_provider_credential_key(value: Any) -> bool:
    if isinstance(value, dict):
        for key, nested_value in value.items():
            if str(key).lower() in RAW_PROVIDER_CREDENTIAL_KEYS:
                return True
            if _has_raw_provider_credential_key(nested_value):
                return True
    if isinstance(value, (list, tuple)):
        return any(_has_raw_provider_credential_key(item) for item in value)
    return False


def validate_payroll_provider_route_config(config: dict[str, Any]) -> None:
    if _has_raw_provider_credential_key(config):
        raise PayrollProviderAdapterError(
            "Payroll provider routes must reference credentials by credential_ref; raw credentials are not allowed.",
            code="raw_provider_credentials_not_allowed",
        )
    adapter_ref = str(config.get("adapter_ref") or "").strip()
    provider_package_ref = config.get("provider_package_ref")
    if provider_package_ref is not None and not isinstance(provider_package_ref, str):
        raise PayrollProviderAdapterError(
            "Payroll provider_package_ref must be a string reference.",
            code="provider_package_ref_invalid",
        )
    production_adapter = config.get("production_adapter")
    if production_adapter is not None and not isinstance(production_adapter, dict):
        raise PayrollProviderAdapterError(
            "Payroll provider production_adapter must be a configuration object.",
            code="provider_production_adapter_config_invalid",
        )
    if adapter_ref in PRODUCTION_PROVIDER_ADAPTER_REFS and not isinstance(production_adapter, dict):
        raise PayrollProviderAdapterError(
            "Payroll provider production adapter packs require production_adapter configuration.",
            code="provider_production_adapter_config_required",
        )
    bank_payout_adapter = config.get("bank_payout_adapter")
    if bank_payout_adapter is not None and not isinstance(bank_payout_adapter, dict):
        raise PayrollProviderAdapterError(
            "Payroll bank payout adapter must be a configuration object.",
            code="provider_bank_payout_adapter_config_invalid",
        )
    if adapter_ref == PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF and not isinstance(bank_payout_adapter, dict):
        raise PayrollProviderAdapterError(
            "Payroll bank live payout adapter requires bank_payout_adapter configuration.",
            code="provider_bank_payout_adapter_config_required",
        )
    accounting_journal_adapter = config.get("accounting_journal_adapter")
    if accounting_journal_adapter is not None and not isinstance(accounting_journal_adapter, dict):
        raise PayrollProviderAdapterError(
            "Payroll accounting journal adapter must be a configuration object.",
            code="provider_accounting_journal_adapter_config_invalid",
        )
    if adapter_ref == PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF and not isinstance(accounting_journal_adapter, dict):
        raise PayrollProviderAdapterError(
            "Payroll accounting live journal adapter requires accounting_journal_adapter configuration.",
            code="provider_accounting_journal_adapter_config_required",
        )
    statutory_filing_adapter = config.get("statutory_filing_adapter")
    if statutory_filing_adapter is not None and not isinstance(statutory_filing_adapter, dict):
        raise PayrollProviderAdapterError(
            "Payroll statutory filing adapter must be a configuration object.",
            code="provider_statutory_filing_adapter_config_invalid",
        )
    if adapter_ref == PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF and not isinstance(statutory_filing_adapter, dict):
        raise PayrollProviderAdapterError(
            "Payroll statutory live filing adapter requires statutory_filing_adapter configuration.",
            code="provider_statutory_filing_adapter_config_required",
        )
    if isinstance(production_adapter, dict):
        transport_mode = str(production_adapter.get("transport_mode") or "").strip()
        if transport_mode and transport_mode not in PRODUCTION_PROVIDER_TRANSPORT_MODES:
            raise PayrollProviderAdapterError(
                f"Payroll provider production transport_mode {transport_mode} is not supported.",
                code="provider_production_transport_mode_unsupported",
            )
        endpoint_url = str(production_adapter.get("endpoint_url") or "").strip()
        if endpoint_url.startswith("http://") and not production_adapter.get("allow_insecure_http"):
            raise PayrollProviderAdapterError(
                "Payroll provider production adapter requires HTTPS endpoints unless allow_insecure_http is enabled.",
                code="provider_production_endpoint_https_required",
            )


def _credential_entries_from_settings() -> dict[str, Any]:
    entries = getattr(settings, "PAYROLL_PROVIDER_CREDENTIALS", None)
    if entries is None:
        raw_json = os.getenv(PAYROLL_PROVIDER_CREDENTIALS_ENV, "").strip()
        if raw_json:
            try:
                entries = json.loads(raw_json)
            except json.JSONDecodeError as exc:
                raise PayrollProviderAdapterError(
                    f"Payroll provider credential resolver could not parse {PAYROLL_PROVIDER_CREDENTIALS_ENV}.",
                    code="provider_credential_resolver_invalid_json",
                ) from exc
    return entries if isinstance(entries, dict) else {}


def resolve_payroll_provider_credential(credential_ref: str, *, provider_ref: str) -> PayrollProviderCredential:
    credential_ref = str(credential_ref or "").strip()
    if not credential_ref:
        raise PayrollProviderAdapterError(
            "Payroll provider adapter requires a credential_ref.",
            code="provider_credential_ref_required",
            provider_ref=provider_ref,
        )
    entries = _credential_entries_from_settings()
    entry = entries.get(credential_ref)
    if not isinstance(entry, dict):
        raise PayrollProviderAdapterError(
            f"Payroll provider credential_ref {credential_ref} is not configured.",
            code="provider_credential_ref_not_configured",
            provider_ref=provider_ref,
        )
    if entry.get("enabled") is False:
        raise PayrollProviderAdapterError(
            f"Payroll provider credential_ref {credential_ref} is disabled.",
            code="provider_credential_ref_disabled",
            provider_ref=provider_ref,
        )
    entry_provider_ref = str(entry.get("provider_ref") or "")
    if entry_provider_ref and entry_provider_ref != provider_ref:
        raise PayrollProviderAdapterError(
            f"Payroll provider credential_ref {credential_ref} is configured for {entry_provider_ref}, not {provider_ref}.",
            code="provider_credential_provider_mismatch",
            provider_ref=provider_ref,
        )
    material = entry.get("credentials") if isinstance(entry.get("credentials"), dict) else {}
    use_sandbox = bool(entry.get("use_sandbox", False))
    if not material and not use_sandbox:
        raise PayrollProviderAdapterError(
            f"Payroll provider credential_ref {credential_ref} has no credential material or sandbox mode.",
            code="provider_credential_material_missing",
            provider_ref=provider_ref,
        )
    metadata = entry.get("metadata") if isinstance(entry.get("metadata"), dict) else {}
    return PayrollProviderCredential(
        credential_ref=credential_ref,
        provider_ref=provider_ref,
        source_ref=str(entry.get("source_ref") or "settings.PAYROLL_PROVIDER_CREDENTIALS"),
        use_sandbox=use_sandbox,
        metadata=metadata,
        material=material,
    )


def normalize_payroll_provider_submission_request(delivery) -> PayrollProviderSubmissionRequest:
    delivery_config = delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}
    route = delivery_config.get("provider_route") if isinstance(delivery_config.get("provider_route"), dict) else {}
    contract = delivery_config.get("submission_contract") if isinstance(delivery_config.get("submission_contract"), dict) else {}
    validate_payroll_provider_route_config(route)
    credential_ref = str(route.get("credential_ref") or contract.get("credential_ref") or "")
    credential_required = bool(route.get("credential_required") or credential_ref)
    credential_snapshot: dict[str, Any] = {
        "credential_ref": credential_ref,
        "provider_ref": delivery.provider_ref,
        "required": credential_required,
        "resolved": False,
    }
    if credential_ref:
        credential_snapshot = {
            **resolve_payroll_provider_credential(credential_ref, provider_ref=delivery.provider_ref).snapshot(),
            "required": credential_required,
            "resolved": True,
        }
    elif credential_required:
        raise PayrollProviderAdapterError(
            "Payroll provider route requires runtime credentials but no credential_ref was configured.",
            code="provider_credential_ref_required",
            provider_ref=delivery.provider_ref,
        )
    return PayrollProviderSubmissionRequest(
        tenant_id=str(delivery.tenant_id),
        delivery_id=str(delivery.id),
        handoff_id=str(delivery.handoff_id),
        output_artifact_id=str(delivery.output_artifact_id),
        artifact_kind=delivery.artifact_kind,
        provider_ref=delivery.provider_ref,
        channel_ref=delivery.channel_ref,
        adapter_ref=str(contract.get("adapter_ref") or route.get("adapter_ref") or "payroll.provider_adapter.manual.v1"),
        submission_mode=str(contract.get("submission_mode") or route.get("submission_mode") or "manual"),
        submission_profile_ref=str(contract.get("submission_profile_ref") or route.get("submission_profile_ref") or ""),
        request_schema_ref=str(contract.get("request_schema_ref") or route.get("request_schema_ref") or ""),
        response_schema_ref=str(contract.get("response_schema_ref") or route.get("response_schema_ref") or ""),
        callback_profile_ref=str(contract.get("callback_profile_ref") or route.get("callback_profile_ref") or ""),
        callback_verification_ref=str(contract.get("callback_verification_ref") or route.get("callback_verification_ref") or ""),
        idempotency_key=str(contract.get("idempotency_key") or ""),
        external_reference=delivery.external_reference,
        payload_checksum_sha256=delivery.payload_checksum_sha256,
        artifact_snapshot={
            "file_name": delivery.output_artifact.file_name,
            "title": delivery.output_artifact.title,
            "output_profile_ref": delivery.output_artifact.output_profile_ref,
            "storage_provider_ref": delivery.output_artifact.storage_provider_ref,
            "storage_key": delivery.output_artifact.storage_key,
            "storage_object_version": delivery.output_artifact.storage_object_version,
            "download_strategy_ref": delivery.output_artifact.download_strategy_ref,
            "mime_type": delivery.output_artifact.mime_type,
            "file_size_bytes": delivery.output_artifact.file_size_bytes,
            "checksum_sha256": delivery.output_artifact.checksum_sha256,
            "totals_snapshot": delivery.output_artifact.totals_snapshot,
            "line_snapshot": delivery.output_artifact.line_snapshot,
            "config_snapshot": delivery.output_artifact.config_snapshot,
        },
        route_snapshot=route,
        credential_snapshot=credential_snapshot,
    )


class ManualPayrollProviderAdapter:
    adapter_ref = "payroll.provider_adapter.manual.v1"

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        material = ":".join([
            request.provider_ref,
            request.delivery_id,
            request.idempotency_key,
            request.payload_checksum_sha256,
        ])
        provider_batch_ref = f"MANUAL-{hashlib.sha256(material.encode('utf-8')).hexdigest()[:16]}"
        return PayrollProviderSubmissionResult(
            provider_status="submitted",
            external_reference=request.external_reference,
            provider_batch_ref=provider_batch_ref,
            response_snapshot={
                "adapter_ref": request.adapter_ref,
                "submission_mode": request.submission_mode,
                "submission_profile_ref": request.submission_profile_ref,
                "response_schema_ref": request.response_schema_ref,
                "dispatch_mode": "manual",
                "provider_payload": request.route_snapshot.get("provider_payload", {}),
                "schema_mapping": request.route_snapshot.get("schema_mapping", {}),
            },
        )


class SandboxPayrollProviderAdapter:
    adapter_ref = "payroll.provider_adapter.sandbox.v1"
    adapter_family = "generic"
    supported_artifact_kinds: tuple[str, ...] = ()

    def _validate_request(self, request: PayrollProviderSubmissionRequest) -> None:
        if self.supported_artifact_kinds and request.artifact_kind not in self.supported_artifact_kinds:
            raise PayrollProviderAdapterError(
                f"Payroll provider adapter {self.adapter_ref} does not support {request.artifact_kind} artifacts.",
                code="provider_adapter_artifact_kind_unsupported",
                provider_ref=request.provider_ref,
            )

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        self._validate_request(request)
        sandbox_config = request.route_snapshot.get("sandbox_response") if isinstance(request.route_snapshot.get("sandbox_response"), dict) else {}
        provider_status = str(sandbox_config.get("provider_status") or "submitted")
        failure_code = str(sandbox_config.get("failure_code") or "")
        failure_reason = str(sandbox_config.get("failure_reason") or "")
        certification_refs = sandbox_config.get("certification_evidence_refs") if isinstance(sandbox_config.get("certification_evidence_refs"), list) else []
        provider_batch_ref = str(sandbox_config.get("provider_batch_ref") or f"SANDBOX-{request.payload_checksum_sha256[:16]}")
        return PayrollProviderSubmissionResult(
            provider_status=provider_status,
            external_reference=str(sandbox_config.get("external_reference") or request.external_reference),
            provider_batch_ref=provider_batch_ref,
            response_snapshot={
                "adapter_ref": request.adapter_ref,
                "adapter_family": self.adapter_family,
                "artifact_kind": request.artifact_kind,
                "submission_mode": request.submission_mode,
                "submission_profile_ref": request.submission_profile_ref,
                "response_schema_ref": request.response_schema_ref,
                "dispatch_mode": "sandbox",
                "sandbox_response": sandbox_config,
                "provider_payload": request.route_snapshot.get("provider_payload", {}),
                "schema_mapping": request.route_snapshot.get("schema_mapping", {}),
            },
            certification_evidence_refs=[str(item) for item in certification_refs],
            failure_code=failure_code,
            failure_reason=failure_reason,
            retryable=bool(sandbox_config.get("retryable", False)),
        )


class BankPayrollProviderSandboxAdapter(SandboxPayrollProviderAdapter):
    adapter_ref = "payroll.provider_adapter.bank.sandbox.v1"
    adapter_family = "bank"
    supported_artifact_kinds = ("bank_advice",)

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        result = super().submit(request)
        return PayrollProviderSubmissionResult(
            provider_status=result.provider_status,
            external_reference=result.external_reference,
            provider_batch_ref=result.provider_batch_ref,
            response_snapshot={
                **result.response_snapshot,
                "domain_contract_ref": "payroll.provider_contract.bank_payment_instruction.v1",
                "payment_file_name": request.artifact_snapshot.get("file_name", ""),
                "payment_checksum_sha256": request.payload_checksum_sha256,
            },
            certification_evidence_refs=result.certification_evidence_refs,
            failure_code=result.failure_code,
            failure_reason=result.failure_reason,
            retryable=result.retryable,
        )


class AccountingPayrollProviderSandboxAdapter(SandboxPayrollProviderAdapter):
    adapter_ref = "payroll.provider_adapter.accounting.sandbox.v1"
    adapter_family = "accounting"
    supported_artifact_kinds = ("accounting_export",)

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        result = super().submit(request)
        return PayrollProviderSubmissionResult(
            provider_status=result.provider_status,
            external_reference=result.external_reference,
            provider_batch_ref=result.provider_batch_ref,
            response_snapshot={
                **result.response_snapshot,
                "domain_contract_ref": "payroll.provider_contract.accounting_journal_import.v1",
                "ledger_file_name": request.artifact_snapshot.get("file_name", ""),
                "ledger_checksum_sha256": request.payload_checksum_sha256,
            },
            certification_evidence_refs=result.certification_evidence_refs,
            failure_code=result.failure_code,
            failure_reason=result.failure_reason,
            retryable=result.retryable,
        )


class StatutoryPayrollProviderSandboxAdapter(SandboxPayrollProviderAdapter):
    adapter_ref = "payroll.provider_adapter.statutory.sandbox.v1"
    adapter_family = "statutory"
    supported_artifact_kinds = ("statutory_report",)

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        result = super().submit(request)
        return PayrollProviderSubmissionResult(
            provider_status=result.provider_status,
            external_reference=result.external_reference,
            provider_batch_ref=result.provider_batch_ref,
            response_snapshot={
                **result.response_snapshot,
                "domain_contract_ref": "payroll.provider_contract.statutory_filing_upload.v1",
                "filing_file_name": request.artifact_snapshot.get("file_name", ""),
                "filing_checksum_sha256": request.payload_checksum_sha256,
                "filing_context": request.route_snapshot.get("route_key", request.artifact_kind),
            },
            certification_evidence_refs=result.certification_evidence_refs,
            failure_code=result.failure_code,
            failure_reason=result.failure_reason,
            retryable=result.retryable,
        )


def _production_adapter_config(
    request: PayrollProviderSubmissionRequest,
    *,
    adapter_family: str,
    default_transport_mode: str,
    default_domain_contract_ref: str,
) -> dict[str, Any]:
    configured = request.route_snapshot.get("production_adapter")
    configured = configured if isinstance(configured, dict) else {}
    transport_mode = str(configured.get("transport_mode") or default_transport_mode).strip()
    if transport_mode not in PRODUCTION_PROVIDER_TRANSPORT_MODES:
        raise PayrollProviderAdapterError(
            f"Payroll provider production transport_mode {transport_mode} is not supported.",
            code="provider_production_transport_mode_unsupported",
            provider_ref=request.provider_ref,
        )
    provider_status = str(configured.get("provider_status") or "acknowledged").strip()
    if provider_status not in PROVIDER_ADAPTER_CONTRACT_ALLOWED_STATUSES:
        raise PayrollProviderAdapterError(
            f"Payroll provider production status {provider_status} is not supported.",
            code="provider_production_status_unsupported",
            provider_ref=request.provider_ref,
        )
    evidence_refs = configured.get("certification_evidence_refs") if isinstance(configured.get("certification_evidence_refs"), list) else []
    return {
        "adapter_pack_ref": str(configured.get("adapter_pack_ref") or f"payroll.provider_adapter_pack.{adapter_family}.production.v1"),
        "adapter_profile_ref": str(configured.get("adapter_profile_ref") or f"payroll.provider_adapter_profile.{adapter_family}.production.v1"),
        "environment_ref": str(configured.get("environment_ref") or "production"),
        "transport_mode": transport_mode,
        "transport_ref": str(configured.get("transport_ref") or request.channel_ref),
        "operation_ref": str(configured.get("operation_ref") or f"payroll.provider_operation.{adapter_family}.{request.artifact_kind}.submit.v1"),
        "domain_contract_ref": str(configured.get("domain_contract_ref") or default_domain_contract_ref),
        "evidence_profile_ref": str(configured.get("evidence_profile_ref") or f"payroll.provider_evidence.{adapter_family}.production.v1"),
        "acknowledgement_path": str(configured.get("acknowledgement_path") or "external_reference"),
        "endpoint_url": str(configured.get("endpoint_url") or ""),
        "timeout_seconds": int(configured.get("timeout_seconds") or 30),
        "provider_status": provider_status,
        "provider_batch_ref": str(configured.get("provider_batch_ref") or ""),
        "external_reference": str(configured.get("external_reference") or ""),
        "failure_code": str(configured.get("failure_code") or ""),
        "failure_reason": str(configured.get("failure_reason") or ""),
        "retryable": bool(configured.get("retryable", False)),
        "requires_credential_ref": bool(configured.get("requires_credential_ref", True)),
        "requires_certified_connection": bool(configured.get("requires_certified_connection", True)),
        "certification_evidence_required": bool(configured.get("certification_evidence_required", request.artifact_kind == "statutory_report")),
        "certification_evidence_refs": [str(item) for item in evidence_refs if str(item or "").strip()],
        "secret_material_policy_ref": str(configured.get("secret_material_policy_ref") or "payroll.provider_secret_material.reference_only.v1"),
        "idempotency_strategy_ref": str(configured.get("idempotency_strategy_ref") or "payroll.provider_idempotency.sha256_artifact.v1"),
        "checksum_policy_ref": str(configured.get("checksum_policy_ref") or "payroll.provider_checksum.sha256_required.v1"),
        "callback_policy_ref": str(configured.get("callback_policy_ref") or request.callback_verification_ref),
        "storage_policy_ref": str(configured.get("storage_policy_ref") or request.artifact_snapshot.get("storage_provider_ref") or ""),
    }


class ProductionPayrollProviderPackAdapter:
    adapter_ref = "payroll.provider_adapter.production_pack.v1"
    adapter_family = "provider"
    supported_artifact_kinds: tuple[str, ...] = ()
    default_transport_mode = "api"
    default_domain_contract_ref = "payroll.provider_contract.production_submission.v1"

    def _validate_request(self, request: PayrollProviderSubmissionRequest, config: dict[str, Any]) -> None:
        if self.supported_artifact_kinds and request.artifact_kind not in self.supported_artifact_kinds:
            raise PayrollProviderAdapterError(
                f"Payroll provider adapter {self.adapter_ref} does not support {request.artifact_kind} artifacts.",
                code="provider_adapter_artifact_kind_unsupported",
                provider_ref=request.provider_ref,
            )
        if config["requires_credential_ref"] and not request.credential_snapshot.get("resolved"):
            raise PayrollProviderAdapterError(
                "Payroll provider production adapter pack requires a resolved credential_ref.",
                code="provider_production_credential_required",
                provider_ref=request.provider_ref,
                retryable=False,
            )
        provider_connection_gate = request.route_snapshot.get("provider_connection_gate")
        provider_connection_gate = provider_connection_gate if isinstance(provider_connection_gate, dict) else {}
        if config["requires_certified_connection"] and not provider_connection_gate.get("active_allowed"):
            raise PayrollProviderAdapterError(
                "Payroll provider production adapter pack requires an active certified provider connection.",
                code="provider_production_connection_not_certified",
                provider_ref=request.provider_ref,
                retryable=False,
            )

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        config = _production_adapter_config(
            request,
            adapter_family=self.adapter_family,
            default_transport_mode=self.default_transport_mode,
            default_domain_contract_ref=self.default_domain_contract_ref,
        )
        self._validate_request(request, config)
        provider_batch_ref = config["provider_batch_ref"] or f"{self.adapter_family.upper()}-PROD-{request.payload_checksum_sha256[:16]}"
        external_reference = config["external_reference"] or request.external_reference
        provider_payload = request.route_snapshot.get("provider_payload") if isinstance(request.route_snapshot.get("provider_payload"), dict) else {}
        schema_mapping = request.route_snapshot.get("schema_mapping") if isinstance(request.route_snapshot.get("schema_mapping"), dict) else {}
        provider_connection_gate = request.route_snapshot.get("provider_connection_gate") if isinstance(request.route_snapshot.get("provider_connection_gate"), dict) else {}
        return PayrollProviderSubmissionResult(
            provider_status=config["provider_status"],
            external_reference=external_reference,
            provider_batch_ref=provider_batch_ref,
            response_snapshot={
                "adapter_ref": request.adapter_ref,
                "adapter_family": self.adapter_family,
                "adapter_pack_ref": config["adapter_pack_ref"],
                "adapter_profile_ref": config["adapter_profile_ref"],
                "artifact_kind": request.artifact_kind,
                "response_schema_ref": request.response_schema_ref,
                "domain_contract_ref": config["domain_contract_ref"],
                "dispatch_mode": "production_adapter_pack",
                "environment_ref": config["environment_ref"],
                "transport_mode": config["transport_mode"],
                "transport_ref": config["transport_ref"],
                "operation_ref": config["operation_ref"],
                "endpoint_url": config["endpoint_url"],
                "timeout_seconds": config["timeout_seconds"],
                "acknowledgement_path": config["acknowledgement_path"],
                "evidence_profile_ref": config["evidence_profile_ref"],
                "production_controls": {
                    "secret_material_policy_ref": config["secret_material_policy_ref"],
                    "idempotency_strategy_ref": config["idempotency_strategy_ref"],
                    "checksum_policy_ref": config["checksum_policy_ref"],
                    "callback_policy_ref": config["callback_policy_ref"],
                    "storage_policy_ref": config["storage_policy_ref"],
                    "requires_credential_ref": config["requires_credential_ref"],
                    "requires_certified_connection": config["requires_certified_connection"],
                    "certification_evidence_required": config["certification_evidence_required"],
                },
                "credential_snapshot": request.credential_snapshot,
                "provider_connection_gate": provider_connection_gate,
                "provider_artifact": {
                    "file_name": request.artifact_snapshot.get("file_name", ""),
                    "checksum_sha256": request.payload_checksum_sha256,
                    "storage_provider_ref": request.artifact_snapshot.get("storage_provider_ref", ""),
                    "storage_object_version": request.artifact_snapshot.get("storage_object_version", ""),
                    "download_strategy_ref": request.artifact_snapshot.get("download_strategy_ref", ""),
                },
                "provider_payload": provider_payload,
                "schema_mapping": schema_mapping,
            },
            certification_evidence_refs=config["certification_evidence_refs"],
            failure_code=config["failure_code"],
            failure_reason=config["failure_reason"],
            retryable=config["retryable"],
        )


class BankPayrollProviderProductionPackAdapter(ProductionPayrollProviderPackAdapter):
    adapter_ref = "payroll.provider_adapter.bank.production_pack.v1"
    adapter_family = "bank"
    supported_artifact_kinds = ("bank_advice",)
    default_transport_mode = "api"
    default_domain_contract_ref = "payroll.provider_contract.bank_payment_instruction.production.v1"


class AccountingPayrollProviderProductionPackAdapter(ProductionPayrollProviderPackAdapter):
    adapter_ref = "payroll.provider_adapter.accounting.production_pack.v1"
    adapter_family = "accounting"
    supported_artifact_kinds = ("accounting_export",)
    default_transport_mode = "file_export"
    default_domain_contract_ref = "payroll.provider_contract.accounting_journal_import.production.v1"


class StatutoryPayrollProviderProductionPackAdapter(ProductionPayrollProviderPackAdapter):
    adapter_ref = "payroll.provider_adapter.statutory.production_pack.v1"
    adapter_family = "statutory"
    supported_artifact_kinds = ("statutory_report",)
    default_transport_mode = "portal_automation"
    default_domain_contract_ref = "payroll.provider_contract.statutory_filing_upload.production.v1"


def _redacted_provider_snapshot(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): ("[redacted]" if str(key).lower() in RAW_PROVIDER_CREDENTIAL_KEYS else _redacted_provider_snapshot(nested_value))
            for key, nested_value in value.items()
        }
    if isinstance(value, list):
        return [_redacted_provider_snapshot(item) for item in value]
    if isinstance(value, tuple):
        return [_redacted_provider_snapshot(item) for item in value]
    return value


def _bank_payout_adapter_config(request: PayrollProviderSubmissionRequest) -> dict[str, Any]:
    configured = request.route_snapshot.get("bank_payout_adapter") if isinstance(request.route_snapshot.get("bank_payout_adapter"), dict) else {}
    production_adapter = request.route_snapshot.get("production_adapter") if isinstance(request.route_snapshot.get("production_adapter"), dict) else {}
    payment_operation_ref = str(
        configured.get("payment_operation_ref")
        or production_adapter.get("operation_ref")
        or "payroll.bank_payout.operation.bulk_payment.v1"
    )
    payment_network_ref = str(configured.get("payment_network_ref") or "")
    if not payment_network_ref:
        payment_network_ref = payment_operation_ref.split(".")[-2] if "." in payment_operation_ref else payment_operation_ref
    return {
        "adapter_profile_ref": str(configured.get("adapter_profile_ref") or "payroll.bank_payout_adapter.profile.v1"),
        "provider_package_ref": str(configured.get("provider_package_ref") or request.route_snapshot.get("provider_package_ref") or ""),
        "client_ref": str(configured.get("client_ref") or production_adapter.get("transport_ref") or request.channel_ref),
        "payout_profile_ref": str(configured.get("payout_profile_ref") or request.submission_profile_ref),
        "payment_operation_ref": payment_operation_ref,
        "payment_network_ref": payment_network_ref,
        "debit_account_ref": str(configured.get("debit_account_ref") or ""),
        "payment_date": str(configured.get("payment_date") or configured.get("value_date") or ""),
        "total_amount_path": str(configured.get("total_amount_path") or "payment.total_amount"),
        "payout_rows_path": str(configured.get("payout_rows_path") or "payment.employee_rows"),
        "accepted_count_path": str(configured.get("accepted_count_path") or "accepted_count"),
        "rejected_count_path": str(configured.get("rejected_count_path") or "rejected_count"),
        "utr_refs_path": str(configured.get("utr_refs_path") or "utr_refs"),
        "transaction_refs_path": str(configured.get("transaction_refs_path") or "transaction_refs"),
        "evidence_refs_path": str(configured.get("evidence_refs_path") or "evidence_refs"),
        "provider_status_path": str(configured.get("provider_status_path") or "provider_status"),
        "external_reference_path": str(configured.get("external_reference_path") or "external_reference"),
        "provider_batch_ref_path": str(configured.get("provider_batch_ref_path") or "provider_batch_ref"),
        "failure_code_path": str(configured.get("failure_code_path") or "failure_code"),
        "failure_reason_path": str(configured.get("failure_reason_path") or "failure_reason"),
        "failure_taxonomy_ref": str(configured.get("failure_taxonomy_ref") or "payroll.bank_payout.failure_taxonomy.v1"),
        "failure_categories": configured.get("failure_categories") if isinstance(configured.get("failure_categories"), dict) else {},
        "partial_acceptance_policy_ref": str(configured.get("partial_acceptance_policy_ref") or "payroll.bank_payout.partial_acceptance.review_required.v1"),
        "idempotency_strategy_ref": str(configured.get("idempotency_strategy_ref") or "payroll.bank_payout.idempotency.handoff_artifact_sha256.v1"),
        "checksum_policy_ref": str(configured.get("checksum_policy_ref") or "payroll.bank_payout.checksum.sha256_required.v1"),
        "secret_material_policy_ref": str(configured.get("secret_material_policy_ref") or "payroll.provider_secret_material.reference_only.v1"),
        "requires_credential_ref": bool(configured.get("requires_credential_ref", True)),
        "endpoint_url": str(configured.get("endpoint_url") or production_adapter.get("endpoint_url") or ""),
        "transport_ref": str(configured.get("transport_ref") or production_adapter.get("transport_ref") or "default"),
        "timeout_seconds": int(configured.get("timeout_seconds") or production_adapter.get("timeout_seconds") or 30),
        "auth_scheme": str(configured.get("auth_scheme") or production_adapter.get("auth_scheme") or "none").lower(),
        "api_key_header_name": str(configured.get("api_key_header_name") or production_adapter.get("api_key_header_name") or "X-API-Key"),
        "static_headers": configured.get("static_headers") if isinstance(configured.get("static_headers"), dict) else {},
        "allow_insecure_http": bool(configured.get("allow_insecure_http") or production_adapter.get("allow_insecure_http", False)),
    }


def _bank_payout_client_for_ref(client_ref: str):
    clients = getattr(settings, "PAYROLL_BANK_PAYOUT_CLIENTS", {}) or {}
    client = clients.get(client_ref) if isinstance(clients, dict) else None
    if client is None and client_ref in BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES:
        client = BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES[client_ref]
    if client is None:
        raise PayrollProviderAdapterError(
            f"Payroll bank payout client_ref {client_ref} is not configured.",
            code="provider_bank_payout_client_not_configured",
            retryable=False,
        )
    return _configured_provider_client(client)


def _bank_payout_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _bank_payout_decimal_present(value: Any) -> bool:
    return value not in {None, "", "0", "0.00", 0}


def _bank_payout_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


class BankPayrollProviderLivePayoutAdapter:
    adapter_ref = PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF
    adapter_family = "bank"
    supported_artifact_kinds = ("bank_advice",)

    def _request_gates(self, request: PayrollProviderSubmissionRequest, config: dict[str, Any], provider_payload: dict[str, Any]) -> list[dict[str, Any]]:
        payout_rows = _bank_payout_list(_snapshot_path_value(provider_payload, config["payout_rows_path"]))
        total_amount = _snapshot_path_value(provider_payload, config["total_amount_path"])
        gates = [
            _contract_gate("artifact_kind_bank_advice", "Bank advice artifact", request.artifact_kind == "bank_advice", request.artifact_kind),
            _contract_gate("credential_resolved", "Runtime credential resolved", not config["requires_credential_ref"] or bool(request.credential_snapshot.get("resolved")), request.credential_snapshot.get("credential_ref", "")),
            _contract_gate("client_ref_configured", "Bank payout client configured", bool(config["client_ref"]), config["client_ref"]),
            _contract_gate("debit_account_ref_configured", "Debit account ref configured", bool(config["debit_account_ref"]), config["debit_account_ref"]),
            _contract_gate("payment_date_configured", "Payment date configured", bool(config["payment_date"]), config["payment_date"]),
            _contract_gate("payment_operation_ref_configured", "Payment operation configured", bool(config["payment_operation_ref"]), config["payment_operation_ref"]),
            _contract_gate("payout_total_mapped", "Payout total mapped", _bank_payout_decimal_present(total_amount), total_amount),
            _contract_gate("payout_rows_mapped", "Payout rows mapped", bool(payout_rows), len(payout_rows)),
            _contract_gate("artifact_checksum_present", "Artifact checksum present", bool(request.payload_checksum_sha256), request.payload_checksum_sha256),
            _contract_gate("idempotency_key_present", "Idempotency key present", bool(request.idempotency_key), request.idempotency_key),
        ]
        return gates

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        config = _bank_payout_adapter_config(request)
        provider_payload = request.route_snapshot.get("provider_payload") if isinstance(request.route_snapshot.get("provider_payload"), dict) else {}
        gates = self._request_gates(request, config, provider_payload)
        blocking_gate_refs = [gate["ref"] for gate in gates if not gate["passed"]]
        if blocking_gate_refs:
            raise PayrollProviderAdapterError(
                "Payroll bank live payout request failed validation: " + ", ".join(blocking_gate_refs),
                code="provider_bank_payout_request_invalid",
                provider_ref=request.provider_ref,
                retryable=False,
            )

        credential_ref = str(request.credential_snapshot.get("credential_ref") or "")
        credential = resolve_payroll_provider_credential(credential_ref, provider_ref=request.provider_ref) if credential_ref else None
        payout_rows = _bank_payout_list(_snapshot_path_value(provider_payload, config["payout_rows_path"]))
        total_amount = _snapshot_path_value(provider_payload, config["total_amount_path"])
        bank_request = {
            "provider_ref": request.provider_ref,
            "adapter_ref": request.adapter_ref,
            "payout_profile_ref": config["payout_profile_ref"],
            "payment_operation_ref": config["payment_operation_ref"],
            "payment_network_ref": config["payment_network_ref"],
            "debit_account_ref": config["debit_account_ref"],
            "payment_date": config["payment_date"],
            "idempotency_key": request.idempotency_key,
            "payload_checksum_sha256": request.payload_checksum_sha256,
            "external_reference": request.external_reference,
            "total_amount": total_amount,
            "payout_row_count": len(payout_rows),
            "payout_rows": payout_rows,
            "artifact": request.artifact_snapshot,
            "provider_payload": provider_payload,
        }
        client = _bank_payout_client_for_ref(config["client_ref"])
        if callable(getattr(client, "submit_payout", None)):
            client_response = client.submit_payout(request=bank_request, credential=credential, config=config)
        elif callable(client):
            client_response = client(request=bank_request, credential=credential, config=config)
        else:
            raise PayrollProviderAdapterError(
                f"Payroll bank payout client_ref {config['client_ref']} is not callable.",
                code="provider_bank_payout_client_invalid",
                provider_ref=request.provider_ref,
                retryable=False,
            )
        client_response = client_response if isinstance(client_response, dict) else {}
        provider_status = str(_snapshot_path_value(client_response, config["provider_status_path"]) or "acknowledged")
        external_reference = str(_snapshot_path_value(client_response, config["external_reference_path"]) or request.external_reference)
        provider_batch_ref = str(_snapshot_path_value(client_response, config["provider_batch_ref_path"]) or f"BANK-LIVE-{request.payload_checksum_sha256[:16]}")
        failure_code = str(_snapshot_path_value(client_response, config["failure_code_path"]) or "")
        failure_reason = str(_snapshot_path_value(client_response, config["failure_reason_path"]) or "")
        accepted_count = _snapshot_path_value(client_response, config["accepted_count_path"])
        rejected_count = _snapshot_path_value(client_response, config["rejected_count_path"])
        utr_refs = _bank_payout_list(_snapshot_path_value(client_response, config["utr_refs_path"]))
        transaction_refs = _bank_payout_list(_snapshot_path_value(client_response, config["transaction_refs_path"]))
        evidence_refs = _bank_payout_list(_snapshot_path_value(client_response, config["evidence_refs_path"]))
        failure_categories = config["failure_categories"]
        failure_category_ref = str(failure_categories.get(failure_code) or ("partial_acceptance" if _bank_payout_int(rejected_count) > 0 else ""))
        return PayrollProviderSubmissionResult(
            provider_status=provider_status,
            external_reference=external_reference,
            provider_batch_ref=provider_batch_ref,
            response_snapshot={
                "adapter_ref": request.adapter_ref,
                "adapter_family": self.adapter_family,
                "adapter_profile_ref": config["adapter_profile_ref"],
                "dispatch_mode": "bank_live_payout",
                "domain_contract_ref": "payroll.provider_contract.bank_payout.live.v1",
                "response_schema_ref": request.response_schema_ref,
                "bank_payout": {
                    "client_ref": config["client_ref"],
                    "payout_profile_ref": config["payout_profile_ref"],
                    "payment_operation_ref": config["payment_operation_ref"],
                    "payment_network_ref": config["payment_network_ref"],
                    "debit_account_ref": config["debit_account_ref"],
                    "payment_date": config["payment_date"],
                    "total_amount": total_amount,
                    "payout_row_count": len(payout_rows),
                    "accepted_count": accepted_count,
                    "rejected_count": rejected_count,
                    "utr_refs": [str(item) for item in utr_refs],
                    "transaction_refs": [str(item) for item in transaction_refs],
                    "evidence_refs": [str(item) for item in evidence_refs],
                    "request_gates": gates,
                    "blocking_gate_refs": blocking_gate_refs,
                    "failure_taxonomy_ref": config["failure_taxonomy_ref"],
                    "failure_category_ref": failure_category_ref,
                    "partial_acceptance_policy_ref": config["partial_acceptance_policy_ref"],
                    "idempotency_strategy_ref": config["idempotency_strategy_ref"],
                    "checksum_policy_ref": config["checksum_policy_ref"],
                    "secret_material_policy_ref": config["secret_material_policy_ref"],
                    "credential_snapshot": credential.snapshot() if credential else request.credential_snapshot,
                    "provider_response": _redacted_provider_snapshot(client_response),
                },
                "provider_payload": provider_payload,
                "schema_mapping": request.route_snapshot.get("schema_mapping", {}),
            },
            certification_evidence_refs=[str(item) for item in evidence_refs],
            failure_code=failure_code,
            failure_reason=failure_reason,
            retryable=provider_status == "failed" and failure_category_ref in {"transient_network", "provider_timeout", "temporary_provider_error"},
        )


def _accounting_journal_adapter_config(request: PayrollProviderSubmissionRequest) -> dict[str, Any]:
    configured = request.route_snapshot.get("accounting_journal_adapter") if isinstance(request.route_snapshot.get("accounting_journal_adapter"), dict) else {}
    production_adapter = request.route_snapshot.get("production_adapter") if isinstance(request.route_snapshot.get("production_adapter"), dict) else {}
    journal_operation_ref = str(
        configured.get("journal_operation_ref")
        or production_adapter.get("operation_ref")
        or "payroll.accounting_journal.operation.post.v1"
    )
    return {
        "adapter_profile_ref": str(configured.get("adapter_profile_ref") or "payroll.accounting_journal_adapter.profile.v1"),
        "provider_package_ref": str(configured.get("provider_package_ref") or request.route_snapshot.get("provider_package_ref") or ""),
        "client_ref": str(configured.get("client_ref") or production_adapter.get("transport_ref") or request.channel_ref),
        "ledger_profile_ref": str(configured.get("ledger_profile_ref") or request.submission_profile_ref),
        "posting_profile_ref": str(configured.get("posting_profile_ref") or request.submission_profile_ref),
        "journal_operation_ref": journal_operation_ref,
        "company_ref": str(configured.get("company_ref") or configured.get("books_ref") or ""),
        "books_ref": str(configured.get("books_ref") or configured.get("company_ref") or ""),
        "posting_date": str(configured.get("posting_date") or configured.get("transaction_date") or ""),
        "total_amount_path": str(configured.get("total_amount_path") or "journal.total_amount"),
        "journal_rows_path": str(configured.get("journal_rows_path") or "journal.entries"),
        "posted_count_path": str(configured.get("posted_count_path") or "posted_count"),
        "rejected_count_path": str(configured.get("rejected_count_path") or "rejected_count"),
        "voucher_refs_path": str(configured.get("voucher_refs_path") or "voucher_refs"),
        "document_refs_path": str(configured.get("document_refs_path") or "document_refs"),
        "evidence_refs_path": str(configured.get("evidence_refs_path") or "evidence_refs"),
        "provider_status_path": str(configured.get("provider_status_path") or "provider_status"),
        "external_reference_path": str(configured.get("external_reference_path") or "external_reference"),
        "provider_batch_ref_path": str(configured.get("provider_batch_ref_path") or "provider_batch_ref"),
        "failure_code_path": str(configured.get("failure_code_path") or "failure_code"),
        "failure_reason_path": str(configured.get("failure_reason_path") or "failure_reason"),
        "failure_taxonomy_ref": str(configured.get("failure_taxonomy_ref") or "payroll.accounting_journal.failure_taxonomy.v1"),
        "failure_categories": configured.get("failure_categories") if isinstance(configured.get("failure_categories"), dict) else {},
        "balancing_policy_ref": str(configured.get("balancing_policy_ref") or "payroll.accounting_journal.balancing.required.v1"),
        "idempotency_strategy_ref": str(configured.get("idempotency_strategy_ref") or "payroll.accounting_journal.idempotency.handoff_artifact_sha256.v1"),
        "checksum_policy_ref": str(configured.get("checksum_policy_ref") or "payroll.accounting_journal.checksum.sha256_required.v1"),
        "secret_material_policy_ref": str(configured.get("secret_material_policy_ref") or "payroll.provider_secret_material.reference_only.v1"),
        "requires_credential_ref": bool(configured.get("requires_credential_ref", False)),
        "endpoint_url": str(configured.get("endpoint_url") or production_adapter.get("endpoint_url") or ""),
        "transport_ref": str(configured.get("transport_ref") or production_adapter.get("transport_ref") or "default"),
        "timeout_seconds": int(configured.get("timeout_seconds") or production_adapter.get("timeout_seconds") or 30),
        "auth_scheme": str(configured.get("auth_scheme") or production_adapter.get("auth_scheme") or "none").lower(),
        "api_key_header_name": str(configured.get("api_key_header_name") or production_adapter.get("api_key_header_name") or "X-API-Key"),
        "static_headers": configured.get("static_headers") if isinstance(configured.get("static_headers"), dict) else {},
        "allow_insecure_http": bool(configured.get("allow_insecure_http") or production_adapter.get("allow_insecure_http", False)),
    }


def _accounting_journal_client_for_ref(client_ref: str):
    clients = getattr(settings, "PAYROLL_ACCOUNTING_JOURNAL_CLIENTS", {}) or {}
    client = clients.get(client_ref) if isinstance(clients, dict) else None
    if client is None and client_ref in BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES:
        client = BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES[client_ref]
    if client is None:
        raise PayrollProviderAdapterError(
            f"Payroll accounting journal client_ref {client_ref} is not configured.",
            code="provider_accounting_journal_client_not_configured",
            retryable=False,
        )
    return _configured_provider_client(client)


class AccountingPayrollProviderLiveJournalAdapter:
    adapter_ref = PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF
    adapter_family = "accounting"
    supported_artifact_kinds = ("accounting_export",)

    def _request_gates(self, request: PayrollProviderSubmissionRequest, config: dict[str, Any], provider_payload: dict[str, Any]) -> list[dict[str, Any]]:
        journal_rows = _bank_payout_list(_snapshot_path_value(provider_payload, config["journal_rows_path"]))
        total_amount = _snapshot_path_value(provider_payload, config["total_amount_path"])
        return [
            _contract_gate("artifact_kind_accounting_export", "Accounting export artifact", request.artifact_kind == "accounting_export", request.artifact_kind),
            _contract_gate("credential_resolved", "Runtime credential resolved", not config["requires_credential_ref"] or bool(request.credential_snapshot.get("resolved")), request.credential_snapshot.get("credential_ref", "")),
            _contract_gate("client_ref_configured", "Accounting client configured", bool(config["client_ref"]), config["client_ref"]),
            _contract_gate("company_ref_configured", "Accounting company ref configured", bool(config["company_ref"]), config["company_ref"]),
            _contract_gate("posting_date_configured", "Posting date configured", bool(config["posting_date"]), config["posting_date"]),
            _contract_gate("journal_operation_ref_configured", "Journal operation configured", bool(config["journal_operation_ref"]), config["journal_operation_ref"]),
            _contract_gate("journal_total_mapped", "Journal total mapped", _bank_payout_decimal_present(total_amount), total_amount),
            _contract_gate("journal_rows_mapped", "Journal rows mapped", bool(journal_rows), len(journal_rows)),
            _contract_gate("artifact_checksum_present", "Artifact checksum present", bool(request.payload_checksum_sha256), request.payload_checksum_sha256),
            _contract_gate("idempotency_key_present", "Idempotency key present", bool(request.idempotency_key), request.idempotency_key),
        ]

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        config = _accounting_journal_adapter_config(request)
        provider_payload = request.route_snapshot.get("provider_payload") if isinstance(request.route_snapshot.get("provider_payload"), dict) else {}
        gates = self._request_gates(request, config, provider_payload)
        blocking_gate_refs = [gate["ref"] for gate in gates if not gate["passed"]]
        if blocking_gate_refs:
            raise PayrollProviderAdapterError(
                "Payroll accounting live journal request failed validation: " + ", ".join(blocking_gate_refs),
                code="provider_accounting_journal_request_invalid",
                provider_ref=request.provider_ref,
                retryable=False,
            )

        credential_ref = str(request.credential_snapshot.get("credential_ref") or "")
        credential = resolve_payroll_provider_credential(credential_ref, provider_ref=request.provider_ref) if credential_ref else None
        journal_rows = _bank_payout_list(_snapshot_path_value(provider_payload, config["journal_rows_path"]))
        total_amount = _snapshot_path_value(provider_payload, config["total_amount_path"])
        accounting_request = {
            "provider_ref": request.provider_ref,
            "adapter_ref": request.adapter_ref,
            "ledger_profile_ref": config["ledger_profile_ref"],
            "posting_profile_ref": config["posting_profile_ref"],
            "journal_operation_ref": config["journal_operation_ref"],
            "company_ref": config["company_ref"],
            "books_ref": config["books_ref"],
            "posting_date": config["posting_date"],
            "idempotency_key": request.idempotency_key,
            "payload_checksum_sha256": request.payload_checksum_sha256,
            "external_reference": request.external_reference,
            "total_amount": total_amount,
            "journal_row_count": len(journal_rows),
            "journal_rows": journal_rows,
            "artifact": request.artifact_snapshot,
            "provider_payload": provider_payload,
        }
        client = _accounting_journal_client_for_ref(config["client_ref"])
        if callable(getattr(client, "post_journal", None)):
            client_response = client.post_journal(request=accounting_request, credential=credential, config=config)
        elif callable(getattr(client, "submit_journal", None)):
            client_response = client.submit_journal(request=accounting_request, credential=credential, config=config)
        elif callable(client):
            client_response = client(request=accounting_request, credential=credential, config=config)
        else:
            raise PayrollProviderAdapterError(
                f"Payroll accounting journal client_ref {config['client_ref']} is not callable.",
                code="provider_accounting_journal_client_invalid",
                provider_ref=request.provider_ref,
                retryable=False,
            )
        client_response = client_response if isinstance(client_response, dict) else {}
        provider_status = str(_snapshot_path_value(client_response, config["provider_status_path"]) or "reconciled")
        external_reference = str(_snapshot_path_value(client_response, config["external_reference_path"]) or request.external_reference)
        provider_batch_ref = str(_snapshot_path_value(client_response, config["provider_batch_ref_path"]) or f"ACCOUNTING-LIVE-{request.payload_checksum_sha256[:16]}")
        failure_code = str(_snapshot_path_value(client_response, config["failure_code_path"]) or "")
        failure_reason = str(_snapshot_path_value(client_response, config["failure_reason_path"]) or "")
        posted_count = _snapshot_path_value(client_response, config["posted_count_path"])
        rejected_count = _snapshot_path_value(client_response, config["rejected_count_path"])
        voucher_refs = _bank_payout_list(_snapshot_path_value(client_response, config["voucher_refs_path"]))
        document_refs = _bank_payout_list(_snapshot_path_value(client_response, config["document_refs_path"]))
        evidence_refs = _bank_payout_list(_snapshot_path_value(client_response, config["evidence_refs_path"]))
        failure_categories = config["failure_categories"]
        failure_category_ref = str(failure_categories.get(failure_code) or ("partial_rejection" if _bank_payout_int(rejected_count) > 0 else ""))
        return PayrollProviderSubmissionResult(
            provider_status=provider_status,
            external_reference=external_reference,
            provider_batch_ref=provider_batch_ref,
            response_snapshot={
                "adapter_ref": request.adapter_ref,
                "adapter_family": self.adapter_family,
                "adapter_profile_ref": config["adapter_profile_ref"],
                "dispatch_mode": "accounting_live_journal",
                "domain_contract_ref": "payroll.provider_contract.accounting_journal.live.v1",
                "response_schema_ref": request.response_schema_ref,
                "accounting_journal": {
                    "client_ref": config["client_ref"],
                    "ledger_profile_ref": config["ledger_profile_ref"],
                    "posting_profile_ref": config["posting_profile_ref"],
                    "journal_operation_ref": config["journal_operation_ref"],
                    "company_ref": config["company_ref"],
                    "books_ref": config["books_ref"],
                    "posting_date": config["posting_date"],
                    "total_amount": total_amount,
                    "journal_row_count": len(journal_rows),
                    "posted_count": posted_count,
                    "rejected_count": rejected_count,
                    "voucher_refs": [str(item) for item in voucher_refs],
                    "document_refs": [str(item) for item in document_refs],
                    "evidence_refs": [str(item) for item in evidence_refs],
                    "request_gates": gates,
                    "blocking_gate_refs": blocking_gate_refs,
                    "failure_taxonomy_ref": config["failure_taxonomy_ref"],
                    "failure_category_ref": failure_category_ref,
                    "balancing_policy_ref": config["balancing_policy_ref"],
                    "idempotency_strategy_ref": config["idempotency_strategy_ref"],
                    "checksum_policy_ref": config["checksum_policy_ref"],
                    "secret_material_policy_ref": config["secret_material_policy_ref"],
                    "credential_snapshot": credential.snapshot() if credential else request.credential_snapshot,
                    "provider_response": _redacted_provider_snapshot(client_response),
                },
                "provider_payload": provider_payload,
                "schema_mapping": request.route_snapshot.get("schema_mapping", {}),
            },
            certification_evidence_refs=[str(item) for item in evidence_refs],
            failure_code=failure_code,
            failure_reason=failure_reason,
            retryable=provider_status == "failed" and failure_category_ref in {"transient_network", "provider_timeout", "temporary_provider_error"},
        )


def _statutory_filing_adapter_config(request: PayrollProviderSubmissionRequest) -> dict[str, Any]:
    configured = request.route_snapshot.get("statutory_filing_adapter") if isinstance(request.route_snapshot.get("statutory_filing_adapter"), dict) else {}
    production_adapter = request.route_snapshot.get("production_adapter") if isinstance(request.route_snapshot.get("production_adapter"), dict) else {}
    statutory_context = request.route_snapshot.get("statutory_context") if isinstance(request.route_snapshot.get("statutory_context"), dict) else {}
    artifact_config = request.artifact_snapshot.get("config_snapshot") if isinstance(request.artifact_snapshot.get("config_snapshot"), dict) else {}
    filing_operation_ref = str(
        configured.get("filing_operation_ref")
        or production_adapter.get("operation_ref")
        or "payroll.statutory_filing.operation.upload.v1"
    )
    return {
        "adapter_profile_ref": str(configured.get("adapter_profile_ref") or "payroll.statutory_filing_adapter.profile.v1"),
        "provider_package_ref": str(configured.get("provider_package_ref") or request.route_snapshot.get("provider_package_ref") or ""),
        "client_ref": str(configured.get("client_ref") or production_adapter.get("transport_ref") or request.channel_ref),
        "filing_profile_ref": str(configured.get("filing_profile_ref") or request.submission_profile_ref),
        "filing_operation_ref": filing_operation_ref,
        "filing_type_ref": str(configured.get("filing_type_ref") or statutory_context.get("filing_type_ref") or artifact_config.get("filing_type_ref") or ""),
        "authority_ref": str(configured.get("authority_ref") or statutory_context.get("filing_authority_ref") or artifact_config.get("filing_authority_ref") or ""),
        "registration_ref": str(configured.get("registration_ref") or statutory_context.get("employer_registration_number") or artifact_config.get("employer_registration_number") or ""),
        "filing_calendar_ref": str(configured.get("filing_calendar_ref") or statutory_context.get("statutory_filing_calendar_code") or artifact_config.get("statutory_filing_calendar_code") or ""),
        "due_date": str(configured.get("due_date") or artifact_config.get("due_date") or ""),
        "total_amount_path": str(configured.get("total_amount_path") or "filing.total_amount"),
        "filing_rows_path": str(configured.get("filing_rows_path") or "filing.rows"),
        "accepted_count_path": str(configured.get("accepted_count_path") or "accepted_count"),
        "rejected_count_path": str(configured.get("rejected_count_path") or "rejected_count"),
        "receipt_refs_path": str(configured.get("receipt_refs_path") or "receipt_refs"),
        "challan_refs_path": str(configured.get("challan_refs_path") or "challan_refs"),
        "acknowledgement_refs_path": str(configured.get("acknowledgement_refs_path") or "acknowledgement_refs"),
        "evidence_refs_path": str(configured.get("evidence_refs_path") or "evidence_refs"),
        "provider_status_path": str(configured.get("provider_status_path") or "provider_status"),
        "external_reference_path": str(configured.get("external_reference_path") or "external_reference"),
        "provider_batch_ref_path": str(configured.get("provider_batch_ref_path") or "provider_batch_ref"),
        "failure_code_path": str(configured.get("failure_code_path") or "failure_code"),
        "failure_reason_path": str(configured.get("failure_reason_path") or "failure_reason"),
        "failure_taxonomy_ref": str(configured.get("failure_taxonomy_ref") or "payroll.statutory_filing.failure_taxonomy.v1"),
        "failure_categories": configured.get("failure_categories") if isinstance(configured.get("failure_categories"), dict) else {},
        "receipt_policy_ref": str(configured.get("receipt_policy_ref") or "payroll.statutory_filing.receipt.required.v1"),
        "idempotency_strategy_ref": str(configured.get("idempotency_strategy_ref") or "payroll.statutory_filing.idempotency.handoff_artifact_sha256.v1"),
        "checksum_policy_ref": str(configured.get("checksum_policy_ref") or "payroll.statutory_filing.checksum.sha256_required.v1"),
        "secret_material_policy_ref": str(configured.get("secret_material_policy_ref") or "payroll.provider_secret_material.reference_only.v1"),
        "requires_credential_ref": bool(configured.get("requires_credential_ref", True)),
        "endpoint_url": str(configured.get("endpoint_url") or production_adapter.get("endpoint_url") or ""),
        "transport_ref": str(configured.get("transport_ref") or production_adapter.get("transport_ref") or "default"),
        "timeout_seconds": int(configured.get("timeout_seconds") or production_adapter.get("timeout_seconds") or 30),
        "auth_scheme": str(configured.get("auth_scheme") or production_adapter.get("auth_scheme") or "none").lower(),
        "api_key_header_name": str(configured.get("api_key_header_name") or production_adapter.get("api_key_header_name") or "X-API-Key"),
        "static_headers": configured.get("static_headers") if isinstance(configured.get("static_headers"), dict) else {},
        "allow_insecure_http": bool(configured.get("allow_insecure_http") or production_adapter.get("allow_insecure_http", False)),
    }


def _statutory_filing_client_for_ref(client_ref: str):
    clients = getattr(settings, "PAYROLL_STATUTORY_FILING_CLIENTS", {}) or {}
    client = clients.get(client_ref) if isinstance(clients, dict) else None
    if client is None and client_ref in BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES:
        client = BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES[client_ref]
    if client is None:
        raise PayrollProviderAdapterError(
            f"Payroll statutory filing client_ref {client_ref} is not configured.",
            code="provider_statutory_filing_client_not_configured",
            retryable=False,
        )
    return _configured_provider_client(client)


class StatutoryPayrollProviderLiveFilingAdapter:
    adapter_ref = PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF
    adapter_family = "statutory"
    supported_artifact_kinds = ("statutory_report",)

    def _request_gates(self, request: PayrollProviderSubmissionRequest, config: dict[str, Any], provider_payload: dict[str, Any]) -> list[dict[str, Any]]:
        filing_rows = _bank_payout_list(_snapshot_path_value(provider_payload, config["filing_rows_path"]))
        total_amount = _snapshot_path_value(provider_payload, config["total_amount_path"])
        return [
            _contract_gate("artifact_kind_statutory_report", "Statutory report artifact", request.artifact_kind == "statutory_report", request.artifact_kind),
            _contract_gate("credential_resolved", "Runtime credential resolved", not config["requires_credential_ref"] or bool(request.credential_snapshot.get("resolved")), request.credential_snapshot.get("credential_ref", "")),
            _contract_gate("client_ref_configured", "Statutory client configured", bool(config["client_ref"]), config["client_ref"]),
            _contract_gate("authority_ref_configured", "Filing authority configured", bool(config["authority_ref"]), config["authority_ref"]),
            _contract_gate("registration_ref_configured", "Employer registration configured", bool(config["registration_ref"]), config["registration_ref"]),
            _contract_gate("filing_type_ref_configured", "Filing type configured", bool(config["filing_type_ref"]), config["filing_type_ref"]),
            _contract_gate("filing_operation_ref_configured", "Filing operation configured", bool(config["filing_operation_ref"]), config["filing_operation_ref"]),
            _contract_gate("filing_total_mapped", "Filing total mapped", _bank_payout_decimal_present(total_amount), total_amount),
            _contract_gate("filing_rows_mapped", "Filing rows mapped", bool(filing_rows), len(filing_rows)),
            _contract_gate("artifact_checksum_present", "Artifact checksum present", bool(request.payload_checksum_sha256), request.payload_checksum_sha256),
            _contract_gate("idempotency_key_present", "Idempotency key present", bool(request.idempotency_key), request.idempotency_key),
        ]

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        config = _statutory_filing_adapter_config(request)
        provider_payload = request.route_snapshot.get("provider_payload") if isinstance(request.route_snapshot.get("provider_payload"), dict) else {}
        gates = self._request_gates(request, config, provider_payload)
        blocking_gate_refs = [gate["ref"] for gate in gates if not gate["passed"]]
        if blocking_gate_refs:
            raise PayrollProviderAdapterError(
                "Payroll statutory live filing request failed validation: " + ", ".join(blocking_gate_refs),
                code="provider_statutory_filing_request_invalid",
                provider_ref=request.provider_ref,
                retryable=False,
            )

        credential_ref = str(request.credential_snapshot.get("credential_ref") or "")
        credential = resolve_payroll_provider_credential(credential_ref, provider_ref=request.provider_ref) if credential_ref else None
        filing_rows = _bank_payout_list(_snapshot_path_value(provider_payload, config["filing_rows_path"]))
        total_amount = _snapshot_path_value(provider_payload, config["total_amount_path"])
        filing_request = {
            "provider_ref": request.provider_ref,
            "adapter_ref": request.adapter_ref,
            "filing_profile_ref": config["filing_profile_ref"],
            "filing_operation_ref": config["filing_operation_ref"],
            "filing_type_ref": config["filing_type_ref"],
            "authority_ref": config["authority_ref"],
            "registration_ref": config["registration_ref"],
            "filing_calendar_ref": config["filing_calendar_ref"],
            "due_date": config["due_date"],
            "idempotency_key": request.idempotency_key,
            "payload_checksum_sha256": request.payload_checksum_sha256,
            "external_reference": request.external_reference,
            "total_amount": total_amount,
            "filing_row_count": len(filing_rows),
            "filing_rows": filing_rows,
            "artifact": request.artifact_snapshot,
            "provider_payload": provider_payload,
        }
        client = _statutory_filing_client_for_ref(config["client_ref"])
        if callable(getattr(client, "submit_filing", None)):
            client_response = client.submit_filing(request=filing_request, credential=credential, config=config)
        elif callable(getattr(client, "upload_filing", None)):
            client_response = client.upload_filing(request=filing_request, credential=credential, config=config)
        elif callable(client):
            client_response = client(request=filing_request, credential=credential, config=config)
        else:
            raise PayrollProviderAdapterError(
                f"Payroll statutory filing client_ref {config['client_ref']} is not callable.",
                code="provider_statutory_filing_client_invalid",
                provider_ref=request.provider_ref,
                retryable=False,
            )
        client_response = client_response if isinstance(client_response, dict) else {}
        provider_status = str(_snapshot_path_value(client_response, config["provider_status_path"]) or "reconciled")
        external_reference = str(_snapshot_path_value(client_response, config["external_reference_path"]) or request.external_reference)
        provider_batch_ref = str(_snapshot_path_value(client_response, config["provider_batch_ref_path"]) or f"STATUTORY-LIVE-{request.payload_checksum_sha256[:16]}")
        failure_code = str(_snapshot_path_value(client_response, config["failure_code_path"]) or "")
        failure_reason = str(_snapshot_path_value(client_response, config["failure_reason_path"]) or "")
        accepted_count = _snapshot_path_value(client_response, config["accepted_count_path"])
        rejected_count = _snapshot_path_value(client_response, config["rejected_count_path"])
        receipt_refs = _bank_payout_list(_snapshot_path_value(client_response, config["receipt_refs_path"]))
        challan_refs = _bank_payout_list(_snapshot_path_value(client_response, config["challan_refs_path"]))
        acknowledgement_refs = _bank_payout_list(_snapshot_path_value(client_response, config["acknowledgement_refs_path"]))
        evidence_refs = _bank_payout_list(_snapshot_path_value(client_response, config["evidence_refs_path"]))
        certification_evidence_refs = [str(item) for item in [*evidence_refs, *receipt_refs, *challan_refs, *acknowledgement_refs]]
        failure_categories = config["failure_categories"]
        failure_category_ref = str(failure_categories.get(failure_code) or ("partial_rejection" if _bank_payout_int(rejected_count) > 0 else ""))
        return PayrollProviderSubmissionResult(
            provider_status=provider_status,
            external_reference=external_reference,
            provider_batch_ref=provider_batch_ref,
            response_snapshot={
                "adapter_ref": request.adapter_ref,
                "adapter_family": self.adapter_family,
                "adapter_profile_ref": config["adapter_profile_ref"],
                "dispatch_mode": "statutory_live_filing",
                "domain_contract_ref": "payroll.provider_contract.statutory_filing.live.v1",
                "response_schema_ref": request.response_schema_ref,
                "statutory_filing": {
                    "client_ref": config["client_ref"],
                    "filing_profile_ref": config["filing_profile_ref"],
                    "filing_operation_ref": config["filing_operation_ref"],
                    "filing_type_ref": config["filing_type_ref"],
                    "authority_ref": config["authority_ref"],
                    "registration_ref": config["registration_ref"],
                    "filing_calendar_ref": config["filing_calendar_ref"],
                    "due_date": config["due_date"],
                    "total_amount": total_amount,
                    "filing_row_count": len(filing_rows),
                    "accepted_count": accepted_count,
                    "rejected_count": rejected_count,
                    "receipt_refs": [str(item) for item in receipt_refs],
                    "challan_refs": [str(item) for item in challan_refs],
                    "acknowledgement_refs": [str(item) for item in acknowledgement_refs],
                    "evidence_refs": [str(item) for item in evidence_refs],
                    "request_gates": gates,
                    "blocking_gate_refs": blocking_gate_refs,
                    "failure_taxonomy_ref": config["failure_taxonomy_ref"],
                    "failure_category_ref": failure_category_ref,
                    "receipt_policy_ref": config["receipt_policy_ref"],
                    "idempotency_strategy_ref": config["idempotency_strategy_ref"],
                    "checksum_policy_ref": config["checksum_policy_ref"],
                    "secret_material_policy_ref": config["secret_material_policy_ref"],
                    "credential_snapshot": credential.snapshot() if credential else request.credential_snapshot,
                    "provider_response": _redacted_provider_snapshot(client_response),
                },
                "provider_payload": provider_payload,
                "schema_mapping": request.route_snapshot.get("schema_mapping", {}),
            },
            certification_evidence_refs=certification_evidence_refs,
            failure_code=failure_code,
            failure_reason=failure_reason,
            retryable=provider_status == "failed" and failure_category_ref in {"transient_network", "provider_timeout", "temporary_provider_error"},
        )


def _fixture_ref(prefix: str, request: dict[str, Any], suffix: str) -> str:
    checksum = str(request.get("payload_checksum_sha256") or "fixture")[:12] or "fixture"
    return f"{prefix}-{checksum}-{suffix}"


class BankPayrollProviderFixtureClient:
    client_ref = PAYROLL_BANK_FIXTURE_CLIENT_REF
    client_family = "bank"
    supported_adapter_refs = (PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF,)
    certification_fixture = True

    def submit_payout(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        row_count = _bank_payout_int(request.get("payout_row_count"))
        checksum = str(request.get("payload_checksum_sha256") or "fixture")
        batch_ref = _fixture_ref("BANK-FIXTURE", request, "BATCH")
        return {
            "provider_status": "acknowledged",
            "external_reference": request.get("external_reference") or request.get("idempotency_key"),
            "provider_batch_ref": batch_ref,
            "accepted_count": row_count,
            "rejected_count": 0,
            "utr_refs": [_fixture_ref("UTR-FIXTURE", request, "001")] if row_count else [],
            "transaction_refs": [
                {"row_index": index + 1, "transaction_ref": f"TXN-FIXTURE-{checksum[:8]}-{index + 1:03d}"}
                for index in range(row_count)
            ],
            "evidence_refs": [f"fixture://bank-payout/{batch_ref}"],
            "credential_ref": credential.credential_ref if credential else "",
        }


def _bank_sdk_http_headers(
    request: dict[str, Any],
    *,
    config: dict[str, Any],
    credential: PayrollProviderCredential | None,
) -> dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Idempotency-Key": str(request.get("idempotency_key") or ""),
        "X-Payload-Checksum-SHA256": str(request.get("payload_checksum_sha256") or ""),
        **{str(key): str(value) for key, value in config.get("static_headers", {}).items()},
    }
    auth_scheme = str(config.get("auth_scheme") or "none").lower()
    material = credential.material if credential else {}
    if auth_scheme == "none":
        return headers
    if credential is None:
        raise PayrollProviderAdapterError(
            "Payroll bank SDK HTTP client auth requires a credential_ref.",
            code="provider_bank_sdk_http_credential_required",
            provider_ref=str(request.get("provider_ref") or ""),
        )
    if auth_scheme == "bearer":
        token = str(material.get("bearer_token") or material.get("token") or "")
        if not token:
            raise PayrollProviderAdapterError(
                "Payroll bank SDK HTTP bearer auth requires bearer_token material.",
                code="provider_bank_sdk_http_bearer_token_missing",
                provider_ref=str(request.get("provider_ref") or ""),
            )
        headers["Authorization"] = f"Bearer {token}"
        return headers
    if auth_scheme == "api_key_header":
        api_key = str(material.get("api_key") or material.get("token") or "")
        if not api_key:
            raise PayrollProviderAdapterError(
                "Payroll bank SDK HTTP API-key auth requires api_key material.",
                code="provider_bank_sdk_http_api_key_missing",
                provider_ref=str(request.get("provider_ref") or ""),
            )
        headers[str(config.get("api_key_header_name") or "X-API-Key")] = api_key
        return headers
    raise PayrollProviderAdapterError(
        f"Payroll bank SDK HTTP auth scheme {auth_scheme} is not supported.",
        code="provider_bank_sdk_http_auth_scheme_unsupported",
        provider_ref=str(request.get("provider_ref") or ""),
    )


class BankPayrollProviderSdkHttpClient:
    client_ref = PAYROLL_BANK_SDK_HTTP_CLIENT_REF
    client_family = "bank"
    supported_adapter_refs = (PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF,)
    supported_artifact_kinds = ("bank_advice",)
    certification_fixture = False
    package_ref = PAYROLL_BANK_SDK_HTTP_PACKAGE_REF

    def submit_payout(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        endpoint_url = str(config.get("endpoint_url") or "").strip()
        if not endpoint_url:
            raise PayrollProviderAdapterError(
                "Payroll bank SDK HTTP client requires bank_payout_adapter.endpoint_url.",
                code="provider_bank_sdk_http_endpoint_required",
                provider_ref=str(request.get("provider_ref") or ""),
                retryable=False,
            )
        if endpoint_url.startswith("http://") and not config.get("allow_insecure_http"):
            raise PayrollProviderAdapterError(
                "Payroll bank SDK HTTP client requires HTTPS endpoints unless allow_insecure_http is enabled.",
                code="provider_bank_sdk_http_endpoint_https_required",
                provider_ref=str(request.get("provider_ref") or ""),
                retryable=False,
            )
        transport = _http_transport_for_ref(str(config.get("transport_ref") or "default"))
        headers = _bank_sdk_http_headers(request, config=config, credential=credential)
        body = {
            "provider_ref": request.get("provider_ref"),
            "adapter_ref": request.get("adapter_ref"),
            "provider_package_ref": config.get("provider_package_ref"),
            "payout_profile_ref": request.get("payout_profile_ref"),
            "payment_operation_ref": request.get("payment_operation_ref"),
            "payment_network_ref": request.get("payment_network_ref"),
            "debit_account_ref": request.get("debit_account_ref"),
            "payment_date": request.get("payment_date"),
            "idempotency_key": request.get("idempotency_key"),
            "payload_checksum_sha256": request.get("payload_checksum_sha256"),
            "external_reference": request.get("external_reference"),
            "total_amount": request.get("total_amount"),
            "payout_rows": request.get("payout_rows", []),
            "artifact": request.get("artifact", {}),
        }
        response = transport(
            method="POST",
            url=endpoint_url,
            headers=headers,
            body=body,
            timeout_seconds=int(config.get("timeout_seconds") or 30),
        )
        if isinstance(response, dict):
            response = PayrollProviderHttpTransportResult(
                status_code=int(response.get("status_code") or 0),
                response_body=str(response.get("response_body") or ""),
                response_headers=response.get("response_headers") if isinstance(response.get("response_headers"), dict) else {},
            )
        response_json = _json_response_body(response.response_body)
        successful = 200 <= response.status_code < 300
        provider_batch_ref = str(_snapshot_path_value(response_json, config["provider_batch_ref_path"]) or f"BANK-SDK-{str(request.get('payload_checksum_sha256') or '')[:16]}")
        return {
            "provider_status": str(_snapshot_path_value(response_json, config["provider_status_path"]) or ("acknowledged" if successful else "failed")),
            "external_reference": str(_snapshot_path_value(response_json, config["external_reference_path"]) or request.get("external_reference") or ""),
            "provider_batch_ref": provider_batch_ref,
            "failure_code": str(_snapshot_path_value(response_json, config["failure_code_path"]) or ("" if successful else f"HTTP_{response.status_code}")),
            "failure_reason": str(_snapshot_path_value(response_json, config["failure_reason_path"]) or ("" if successful else "Bank provider endpoint returned a non-success status.")),
            "accepted_count": _snapshot_path_value(response_json, config["accepted_count_path"]),
            "rejected_count": _snapshot_path_value(response_json, config["rejected_count_path"]),
            "utr_refs": _bank_payout_list(_snapshot_path_value(response_json, config["utr_refs_path"])),
            "transaction_refs": _bank_payout_list(_snapshot_path_value(response_json, config["transaction_refs_path"])),
            "evidence_refs": _bank_payout_list(_snapshot_path_value(response_json, config["evidence_refs_path"])) or [f"bank-sdk://batch/{provider_batch_ref}"],
            "sdk_client": {
                "client_ref": self.client_ref,
                "package_ref": self.package_ref,
                "transport_ref": str(config.get("transport_ref") or "default"),
                "endpoint_url": endpoint_url,
                "timeout_seconds": int(config.get("timeout_seconds") or 30),
                "auth_scheme": str(config.get("auth_scheme") or "none").lower(),
                "header_refs": sorted(headers),
                "response_status_code": response.status_code,
                "response_body_checksum_sha256": hashlib.sha256(response.response_body.encode("utf-8")).hexdigest(),
            },
            "provider_response": response_json,
        }


class BankRazorpayXHttpPayrollProviderClient(BankPayrollProviderSdkHttpClient):
    client_ref = PAYROLL_BANK_RAZORPAYX_HTTP_CLIENT_REF
    package_ref = PAYROLL_BANK_RAZORPAYX_HTTP_PACKAGE_REF
    package_module_ref = "payroll.provider_package_module.bank.razorpayx_http.v1"
    vendor_profile_ref = "payroll.provider_vendor.bank.razorpayx.v1"
    provider_contract_ref = "payroll.provider_contract.bank.razorpayx_payout.v1"

    response_path_defaults = {
        "provider_status_path": "status",
        "external_reference_path": "id",
        "provider_batch_ref_path": "batch_id",
        "failure_code_path": "error.code",
        "failure_reason_path": "error.description",
        "accepted_count_path": "accepted_count",
        "rejected_count_path": "rejected_count",
        "utr_refs_path": "utr_refs",
        "transaction_refs_path": "transaction_refs",
        "evidence_refs_path": "evidence_refs",
    }

    def submit_payout(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        merged_config = {**config}
        for key, value in self.response_path_defaults.items():
            if str(config.get(key) or "").strip() in {"", "provider_status", "external_reference", "provider_batch_ref", "failure_code", "failure_reason"}:
                merged_config[key] = value
            elif key in {"accepted_count_path", "rejected_count_path", "utr_refs_path", "transaction_refs_path", "evidence_refs_path"} and str(config.get(key) or "").strip() in {
                "accepted_count",
                "rejected_count",
                "utr_refs",
                "transaction_refs",
                "evidence_refs",
            }:
                merged_config[key] = value
        merged_config["provider_package_ref"] = merged_config.get("provider_package_ref") or self.package_ref
        result = super().submit_payout(request=request, credential=credential, config=merged_config)
        sdk_client = result.get("sdk_client") if isinstance(result.get("sdk_client"), dict) else {}
        result["sdk_client"] = {
            **sdk_client,
            "package_module_ref": self.package_module_ref,
            "vendor_profile_ref": self.vendor_profile_ref,
            "provider_contract_ref": self.provider_contract_ref,
            "response_path_profile_ref": "payroll.provider_response_paths.bank.razorpayx_http.v1",
        }
        result["package_module"] = {
            "package_module_ref": self.package_module_ref,
            "vendor_profile_ref": self.vendor_profile_ref,
            "provider_contract_ref": self.provider_contract_ref,
            "configuration_mode": "route_configured",
            "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        }
        return result


class AccountingPayrollProviderFixtureClient:
    client_ref = PAYROLL_ACCOUNTING_FIXTURE_CLIENT_REF
    client_family = "accounting"
    supported_adapter_refs = (PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF,)
    certification_fixture = True

    def post_journal(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        row_count = _bank_payout_int(request.get("journal_row_count"))
        batch_ref = _fixture_ref("ACCOUNTING-FIXTURE", request, "BATCH")
        return {
            "provider_status": "reconciled",
            "external_reference": request.get("external_reference") or request.get("idempotency_key"),
            "provider_batch_ref": batch_ref,
            "posted_count": row_count,
            "rejected_count": 0,
            "voucher_refs": [_fixture_ref("VCH-FIXTURE", request, "001")] if row_count else [],
            "document_refs": [_fixture_ref("DOC-FIXTURE", request, "001")] if row_count else [],
            "evidence_refs": [f"fixture://accounting-journal/{batch_ref}"],
            "credential_ref": credential.credential_ref if credential else "",
        }


def _accounting_sdk_http_headers(
    request: dict[str, Any],
    *,
    config: dict[str, Any],
    credential: PayrollProviderCredential | None,
) -> dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Idempotency-Key": str(request.get("idempotency_key") or ""),
        "X-Payload-Checksum-SHA256": str(request.get("payload_checksum_sha256") or ""),
        **{str(key): str(value) for key, value in config.get("static_headers", {}).items()},
    }
    auth_scheme = str(config.get("auth_scheme") or "none").lower()
    material = credential.material if credential else {}
    if auth_scheme == "none":
        return headers
    if credential is None:
        raise PayrollProviderAdapterError(
            "Payroll accounting SDK HTTP client auth requires a credential_ref.",
            code="provider_accounting_sdk_http_credential_required",
            provider_ref=str(request.get("provider_ref") or ""),
        )
    if auth_scheme == "bearer":
        token = str(material.get("bearer_token") or material.get("token") or "")
        if not token:
            raise PayrollProviderAdapterError(
                "Payroll accounting SDK HTTP bearer auth requires bearer_token material.",
                code="provider_accounting_sdk_http_bearer_token_missing",
                provider_ref=str(request.get("provider_ref") or ""),
            )
        headers["Authorization"] = f"Bearer {token}"
        return headers
    if auth_scheme == "api_key_header":
        api_key = str(material.get("api_key") or material.get("token") or "")
        if not api_key:
            raise PayrollProviderAdapterError(
                "Payroll accounting SDK HTTP API-key auth requires api_key material.",
                code="provider_accounting_sdk_http_api_key_missing",
                provider_ref=str(request.get("provider_ref") or ""),
            )
        headers[str(config.get("api_key_header_name") or "X-API-Key")] = api_key
        return headers
    raise PayrollProviderAdapterError(
        f"Payroll accounting SDK HTTP auth scheme {auth_scheme} is not supported.",
        code="provider_accounting_sdk_http_auth_scheme_unsupported",
        provider_ref=str(request.get("provider_ref") or ""),
    )


class AccountingPayrollProviderSdkHttpClient:
    client_ref = PAYROLL_ACCOUNTING_SDK_HTTP_CLIENT_REF
    client_family = "accounting"
    supported_adapter_refs = (PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF,)
    supported_artifact_kinds = ("accounting_export",)
    certification_fixture = False
    package_ref = PAYROLL_ACCOUNTING_SDK_HTTP_PACKAGE_REF

    def post_journal(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        endpoint_url = str(config.get("endpoint_url") or "").strip()
        if not endpoint_url:
            raise PayrollProviderAdapterError(
                "Payroll accounting SDK HTTP client requires accounting_journal_adapter.endpoint_url.",
                code="provider_accounting_sdk_http_endpoint_required",
                provider_ref=str(request.get("provider_ref") or ""),
                retryable=False,
            )
        if endpoint_url.startswith("http://") and not config.get("allow_insecure_http"):
            raise PayrollProviderAdapterError(
                "Payroll accounting SDK HTTP client requires HTTPS endpoints unless allow_insecure_http is enabled.",
                code="provider_accounting_sdk_http_endpoint_https_required",
                provider_ref=str(request.get("provider_ref") or ""),
                retryable=False,
            )
        transport = _http_transport_for_ref(str(config.get("transport_ref") or "default"))
        headers = _accounting_sdk_http_headers(request, config=config, credential=credential)
        body = {
            "provider_ref": request.get("provider_ref"),
            "adapter_ref": request.get("adapter_ref"),
            "provider_package_ref": config.get("provider_package_ref"),
            "ledger_profile_ref": request.get("ledger_profile_ref"),
            "posting_profile_ref": request.get("posting_profile_ref"),
            "journal_operation_ref": request.get("journal_operation_ref"),
            "company_ref": request.get("company_ref"),
            "books_ref": request.get("books_ref"),
            "posting_date": request.get("posting_date"),
            "idempotency_key": request.get("idempotency_key"),
            "payload_checksum_sha256": request.get("payload_checksum_sha256"),
            "external_reference": request.get("external_reference"),
            "total_amount": request.get("total_amount"),
            "journal_rows": request.get("journal_rows", []),
            "artifact": request.get("artifact", {}),
        }
        response = transport(
            method="POST",
            url=endpoint_url,
            headers=headers,
            body=body,
            timeout_seconds=int(config.get("timeout_seconds") or 30),
        )
        if isinstance(response, dict):
            response = PayrollProviderHttpTransportResult(
                status_code=int(response.get("status_code") or 0),
                response_body=str(response.get("response_body") or ""),
                response_headers=response.get("response_headers") if isinstance(response.get("response_headers"), dict) else {},
            )
        response_json = _json_response_body(response.response_body)
        successful = 200 <= response.status_code < 300
        provider_batch_ref = str(_snapshot_path_value(response_json, config["provider_batch_ref_path"]) or f"ACCOUNTING-SDK-{str(request.get('payload_checksum_sha256') or '')[:16]}")
        return {
            "provider_status": str(_snapshot_path_value(response_json, config["provider_status_path"]) or ("reconciled" if successful else "failed")),
            "external_reference": str(_snapshot_path_value(response_json, config["external_reference_path"]) or request.get("external_reference") or ""),
            "provider_batch_ref": provider_batch_ref,
            "failure_code": str(_snapshot_path_value(response_json, config["failure_code_path"]) or ("" if successful else f"HTTP_{response.status_code}")),
            "failure_reason": str(_snapshot_path_value(response_json, config["failure_reason_path"]) or ("" if successful else "Accounting provider endpoint returned a non-success status.")),
            "posted_count": _snapshot_path_value(response_json, config["posted_count_path"]),
            "rejected_count": _snapshot_path_value(response_json, config["rejected_count_path"]),
            "voucher_refs": _bank_payout_list(_snapshot_path_value(response_json, config["voucher_refs_path"])),
            "document_refs": _bank_payout_list(_snapshot_path_value(response_json, config["document_refs_path"])),
            "evidence_refs": _bank_payout_list(_snapshot_path_value(response_json, config["evidence_refs_path"])) or [f"accounting-sdk://journal/{provider_batch_ref}"],
            "sdk_client": {
                "client_ref": self.client_ref,
                "package_ref": self.package_ref,
                "transport_ref": str(config.get("transport_ref") or "default"),
                "endpoint_url": endpoint_url,
                "timeout_seconds": int(config.get("timeout_seconds") or 30),
                "auth_scheme": str(config.get("auth_scheme") or "none").lower(),
                "header_refs": sorted(headers),
                "response_status_code": response.status_code,
                "response_body_checksum_sha256": hashlib.sha256(response.response_body.encode("utf-8")).hexdigest(),
            },
            "provider_response": response_json,
        }


class AccountingTallyPrimeHttpPayrollProviderClient(AccountingPayrollProviderSdkHttpClient):
    client_ref = PAYROLL_ACCOUNTING_TALLYPRIME_HTTP_CLIENT_REF
    package_ref = PAYROLL_ACCOUNTING_TALLYPRIME_HTTP_PACKAGE_REF
    package_module_ref = "payroll.provider_package_module.accounting.tallyprime_http.v1"
    vendor_profile_ref = "payroll.provider_vendor.accounting.tallyprime.v1"
    provider_contract_ref = "payroll.provider_contract.accounting.tallyprime_journal_import.v1"

    response_path_defaults = {
        "provider_status_path": "result.status",
        "external_reference_path": "result.guid",
        "provider_batch_ref_path": "result.import_id",
        "failure_code_path": "error.code",
        "failure_reason_path": "error.message",
        "posted_count_path": "result.posted",
        "rejected_count_path": "result.rejected",
        "voucher_refs_path": "result.vouchers",
        "document_refs_path": "result.documents",
        "evidence_refs_path": "audit.evidence_refs",
    }

    def post_journal(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        merged_config = {**config}
        default_path_values = {
            "provider_status_path": "provider_status",
            "external_reference_path": "external_reference",
            "provider_batch_ref_path": "provider_batch_ref",
            "failure_code_path": "failure_code",
            "failure_reason_path": "failure_reason",
            "posted_count_path": "posted_count",
            "rejected_count_path": "rejected_count",
            "voucher_refs_path": "voucher_refs",
            "document_refs_path": "document_refs",
            "evidence_refs_path": "evidence_refs",
        }
        for key, value in self.response_path_defaults.items():
            if str(config.get(key) or "").strip() in {"", default_path_values[key]}:
                merged_config[key] = value
        merged_config["provider_package_ref"] = merged_config.get("provider_package_ref") or self.package_ref
        result = super().post_journal(request=request, credential=credential, config=merged_config)
        sdk_client = result.get("sdk_client") if isinstance(result.get("sdk_client"), dict) else {}
        result["sdk_client"] = {
            **sdk_client,
            "package_module_ref": self.package_module_ref,
            "vendor_profile_ref": self.vendor_profile_ref,
            "provider_contract_ref": self.provider_contract_ref,
            "response_path_profile_ref": "payroll.provider_response_paths.accounting.tallyprime_http.v1",
        }
        result["package_module"] = {
            "package_module_ref": self.package_module_ref,
            "vendor_profile_ref": self.vendor_profile_ref,
            "provider_contract_ref": self.provider_contract_ref,
            "configuration_mode": "route_configured",
            "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        }
        return result


class StatutoryPayrollProviderFixtureClient:
    client_ref = PAYROLL_STATUTORY_FIXTURE_CLIENT_REF
    client_family = "statutory"
    supported_adapter_refs = (PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF,)
    certification_fixture = True

    def submit_filing(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        row_count = _bank_payout_int(request.get("filing_row_count"))
        batch_ref = _fixture_ref("STATUTORY-FIXTURE", request, "BATCH")
        return {
            "provider_status": "reconciled",
            "external_reference": request.get("external_reference") or request.get("idempotency_key"),
            "provider_batch_ref": batch_ref,
            "accepted_count": row_count,
            "rejected_count": 0,
            "receipt_refs": [_fixture_ref("RCPT-FIXTURE", request, "001")] if row_count else [],
            "challan_refs": [_fixture_ref("CHLN-FIXTURE", request, "001")] if row_count else [],
            "acknowledgement_refs": [_fixture_ref("ACK-FIXTURE", request, "001")] if row_count else [],
            "evidence_refs": [f"fixture://statutory-filing/{batch_ref}"],
            "credential_ref": credential.credential_ref if credential else "",
        }


def _statutory_sdk_http_headers(
    request: dict[str, Any],
    *,
    config: dict[str, Any],
    credential: PayrollProviderCredential | None,
) -> dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Idempotency-Key": str(request.get("idempotency_key") or ""),
        "X-Payload-Checksum-SHA256": str(request.get("payload_checksum_sha256") or ""),
        **{str(key): str(value) for key, value in config.get("static_headers", {}).items()},
    }
    auth_scheme = str(config.get("auth_scheme") or "none").lower()
    material = credential.material if credential else {}
    if auth_scheme == "none":
        return headers
    if credential is None:
        raise PayrollProviderAdapterError(
            "Payroll statutory SDK HTTP client auth requires a credential_ref.",
            code="provider_statutory_sdk_http_credential_required",
            provider_ref=str(request.get("provider_ref") or ""),
        )
    if auth_scheme == "bearer":
        token = str(material.get("bearer_token") or material.get("token") or "")
        if not token:
            raise PayrollProviderAdapterError(
                "Payroll statutory SDK HTTP bearer auth requires bearer_token material.",
                code="provider_statutory_sdk_http_bearer_token_missing",
                provider_ref=str(request.get("provider_ref") or ""),
            )
        headers["Authorization"] = f"Bearer {token}"
        return headers
    if auth_scheme == "api_key_header":
        api_key = str(material.get("api_key") or material.get("token") or "")
        if not api_key:
            raise PayrollProviderAdapterError(
                "Payroll statutory SDK HTTP API-key auth requires api_key material.",
                code="provider_statutory_sdk_http_api_key_missing",
                provider_ref=str(request.get("provider_ref") or ""),
            )
        headers[str(config.get("api_key_header_name") or "X-API-Key")] = api_key
        return headers
    raise PayrollProviderAdapterError(
        f"Payroll statutory SDK HTTP auth scheme {auth_scheme} is not supported.",
        code="provider_statutory_sdk_http_auth_scheme_unsupported",
        provider_ref=str(request.get("provider_ref") or ""),
    )


class StatutoryPayrollProviderSdkHttpClient:
    client_ref = PAYROLL_STATUTORY_SDK_HTTP_CLIENT_REF
    client_family = "statutory"
    supported_adapter_refs = (PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF,)
    supported_artifact_kinds = ("statutory_report",)
    certification_fixture = False
    package_ref = PAYROLL_STATUTORY_SDK_HTTP_PACKAGE_REF

    def submit_filing(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        endpoint_url = str(config.get("endpoint_url") or "").strip()
        if not endpoint_url:
            raise PayrollProviderAdapterError(
                "Payroll statutory SDK HTTP client requires statutory_filing_adapter.endpoint_url.",
                code="provider_statutory_sdk_http_endpoint_required",
                provider_ref=str(request.get("provider_ref") or ""),
                retryable=False,
            )
        if endpoint_url.startswith("http://") and not config.get("allow_insecure_http"):
            raise PayrollProviderAdapterError(
                "Payroll statutory SDK HTTP client requires HTTPS endpoints unless allow_insecure_http is enabled.",
                code="provider_statutory_sdk_http_endpoint_https_required",
                provider_ref=str(request.get("provider_ref") or ""),
                retryable=False,
            )
        transport = _http_transport_for_ref(str(config.get("transport_ref") or "default"))
        headers = _statutory_sdk_http_headers(request, config=config, credential=credential)
        body = {
            "provider_ref": request.get("provider_ref"),
            "adapter_ref": request.get("adapter_ref"),
            "provider_package_ref": config.get("provider_package_ref"),
            "filing_profile_ref": request.get("filing_profile_ref"),
            "filing_operation_ref": request.get("filing_operation_ref"),
            "filing_type_ref": request.get("filing_type_ref"),
            "authority_ref": request.get("authority_ref"),
            "registration_ref": request.get("registration_ref"),
            "filing_calendar_ref": request.get("filing_calendar_ref"),
            "due_date": request.get("due_date"),
            "idempotency_key": request.get("idempotency_key"),
            "payload_checksum_sha256": request.get("payload_checksum_sha256"),
            "external_reference": request.get("external_reference"),
            "total_amount": request.get("total_amount"),
            "filing_rows": request.get("filing_rows", []),
            "artifact": request.get("artifact", {}),
        }
        response = transport(
            method="POST",
            url=endpoint_url,
            headers=headers,
            body=body,
            timeout_seconds=int(config.get("timeout_seconds") or 30),
        )
        if isinstance(response, dict):
            response = PayrollProviderHttpTransportResult(
                status_code=int(response.get("status_code") or 0),
                response_body=str(response.get("response_body") or ""),
                response_headers=response.get("response_headers") if isinstance(response.get("response_headers"), dict) else {},
            )
        response_json = _json_response_body(response.response_body)
        successful = 200 <= response.status_code < 300
        provider_batch_ref = str(_snapshot_path_value(response_json, config["provider_batch_ref_path"]) or f"STATUTORY-SDK-{str(request.get('payload_checksum_sha256') or '')[:16]}")
        return {
            "provider_status": str(_snapshot_path_value(response_json, config["provider_status_path"]) or ("reconciled" if successful else "failed")),
            "external_reference": str(_snapshot_path_value(response_json, config["external_reference_path"]) or request.get("external_reference") or ""),
            "provider_batch_ref": provider_batch_ref,
            "failure_code": str(_snapshot_path_value(response_json, config["failure_code_path"]) or ("" if successful else f"HTTP_{response.status_code}")),
            "failure_reason": str(_snapshot_path_value(response_json, config["failure_reason_path"]) or ("" if successful else "Statutory provider endpoint returned a non-success status.")),
            "accepted_count": _snapshot_path_value(response_json, config["accepted_count_path"]),
            "rejected_count": _snapshot_path_value(response_json, config["rejected_count_path"]),
            "receipt_refs": _bank_payout_list(_snapshot_path_value(response_json, config["receipt_refs_path"])),
            "challan_refs": _bank_payout_list(_snapshot_path_value(response_json, config["challan_refs_path"])),
            "acknowledgement_refs": _bank_payout_list(_snapshot_path_value(response_json, config["acknowledgement_refs_path"])),
            "evidence_refs": _bank_payout_list(_snapshot_path_value(response_json, config["evidence_refs_path"])) or [f"statutory-sdk://filing/{provider_batch_ref}"],
            "sdk_client": {
                "client_ref": self.client_ref,
                "package_ref": self.package_ref,
                "transport_ref": str(config.get("transport_ref") or "default"),
                "endpoint_url": endpoint_url,
                "timeout_seconds": int(config.get("timeout_seconds") or 30),
                "auth_scheme": str(config.get("auth_scheme") or "none").lower(),
                "header_refs": sorted(headers),
                "response_status_code": response.status_code,
                "response_body_checksum_sha256": hashlib.sha256(response.response_body.encode("utf-8")).hexdigest(),
            },
            "provider_response": response_json,
        }

    def upload_filing(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        return self.submit_filing(request=request, credential=credential, config=config)


class StatutoryEpfoEcrHttpPayrollProviderClient(StatutoryPayrollProviderSdkHttpClient):
    client_ref = PAYROLL_STATUTORY_EPFO_ECR_HTTP_CLIENT_REF
    package_ref = PAYROLL_STATUTORY_EPFO_ECR_HTTP_PACKAGE_REF
    package_module_ref = "payroll.provider_package_module.statutory.epfo_ecr_http.v1"
    vendor_profile_ref = "payroll.provider_vendor.statutory.epfo.v1"
    provider_contract_ref = "payroll.provider_contract.statutory.epfo_ecr_upload.v1"

    response_path_defaults = {
        "provider_status_path": "filing.status",
        "external_reference_path": "filing.trrn",
        "provider_batch_ref_path": "filing.ecr_id",
        "failure_code_path": "error.code",
        "failure_reason_path": "error.message",
        "accepted_count_path": "filing.accepted_count",
        "rejected_count_path": "filing.rejected_count",
        "receipt_refs_path": "filing.receipts",
        "challan_refs_path": "filing.challans",
        "acknowledgement_refs_path": "filing.acknowledgements",
        "evidence_refs_path": "audit.evidence_refs",
    }

    def submit_filing(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        merged_config = {**config}
        default_path_values = {
            "provider_status_path": "provider_status",
            "external_reference_path": "external_reference",
            "provider_batch_ref_path": "provider_batch_ref",
            "failure_code_path": "failure_code",
            "failure_reason_path": "failure_reason",
            "accepted_count_path": "accepted_count",
            "rejected_count_path": "rejected_count",
            "receipt_refs_path": "receipt_refs",
            "challan_refs_path": "challan_refs",
            "acknowledgement_refs_path": "acknowledgement_refs",
            "evidence_refs_path": "evidence_refs",
        }
        for key, value in self.response_path_defaults.items():
            if str(config.get(key) or "").strip() in {"", default_path_values[key]}:
                merged_config[key] = value
        merged_config["provider_package_ref"] = merged_config.get("provider_package_ref") or self.package_ref
        result = super().submit_filing(request=request, credential=credential, config=merged_config)
        sdk_client = result.get("sdk_client") if isinstance(result.get("sdk_client"), dict) else {}
        result["sdk_client"] = {
            **sdk_client,
            "package_module_ref": self.package_module_ref,
            "vendor_profile_ref": self.vendor_profile_ref,
            "provider_contract_ref": self.provider_contract_ref,
            "response_path_profile_ref": "payroll.provider_response_paths.statutory.epfo_ecr_http.v1",
        }
        result["package_module"] = {
            "package_module_ref": self.package_module_ref,
            "vendor_profile_ref": self.vendor_profile_ref,
            "provider_contract_ref": self.provider_contract_ref,
            "configuration_mode": "route_configured",
            "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        }
        return result

    def upload_filing(self, *, request: dict[str, Any], credential: PayrollProviderCredential | None, config: dict[str, Any]) -> dict[str, Any]:
        return self.submit_filing(request=request, credential=credential, config=config)


def _http_adapter_config(request: PayrollProviderSubmissionRequest) -> dict[str, Any]:
    configured = request.route_snapshot.get("http_adapter") if isinstance(request.route_snapshot.get("http_adapter"), dict) else {}
    method = str(configured.get("method") or "POST").upper()
    if method not in {"POST", "PUT", "PATCH"}:
        raise PayrollProviderAdapterError(
            f"Payroll provider HTTP adapter method {method} is not supported.",
            code="provider_http_method_unsupported",
            provider_ref=request.provider_ref,
        )
    endpoint_url = str(configured.get("endpoint_url") or "").strip()
    if not endpoint_url:
        raise PayrollProviderAdapterError(
            "Payroll provider HTTP adapter requires endpoint_url.",
            code="provider_http_endpoint_required",
            provider_ref=request.provider_ref,
        )
    if endpoint_url.startswith("http://") and not configured.get("allow_insecure_http"):
        raise PayrollProviderAdapterError(
            "Payroll provider HTTP adapter requires HTTPS endpoints unless allow_insecure_http is enabled.",
            code="provider_http_endpoint_https_required",
            provider_ref=request.provider_ref,
        )
    return {
        "adapter_profile_ref": str(configured.get("adapter_profile_ref") or "payroll.provider_http_adapter.profile.v1"),
        "method": method,
        "endpoint_url": endpoint_url,
        "transport_ref": str(configured.get("transport_ref") or "default"),
        "timeout_seconds": int(configured.get("timeout_seconds") or 30),
        "auth_scheme": str(configured.get("auth_scheme") or "none").lower(),
        "api_key_header_name": str(configured.get("api_key_header_name") or "X-API-Key"),
        "static_headers": configured.get("static_headers") if isinstance(configured.get("static_headers"), dict) else {},
        "success_statuses": configured.get("success_statuses") if isinstance(configured.get("success_statuses"), list) else [200, 201, 202],
        "provider_status_path": str(configured.get("provider_status_path") or "status"),
        "external_reference_path": str(configured.get("external_reference_path") or "external_reference"),
        "provider_batch_ref_path": str(configured.get("provider_batch_ref_path") or "provider_batch_ref"),
        "failure_code_path": str(configured.get("failure_code_path") or "failure_code"),
        "failure_reason_path": str(configured.get("failure_reason_path") or "failure_reason"),
        "certification_evidence_refs_path": str(configured.get("certification_evidence_refs_path") or "certification_evidence_refs"),
        "domain_contract_ref": str(configured.get("domain_contract_ref") or f"payroll.provider_contract.{request.artifact_kind}.http_json.v1"),
    }


def _json_response_body(value: str) -> dict[str, Any]:
    try:
        parsed = json.loads(value or "{}")
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _http_transport_for_ref(transport_ref: str):
    transports = getattr(settings, "PAYROLL_PROVIDER_HTTP_TRANSPORTS", {}) or {}
    transport = transports.get(transport_ref)
    return transport or _default_http_json_transport


def _default_http_json_transport(
    *,
    method: str,
    url: str,
    headers: dict[str, str],
    body: dict[str, Any],
    timeout_seconds: int,
) -> PayrollProviderHttpTransportResult:
    payload = json.dumps(body, sort_keys=True, default=str).encode("utf-8")
    request = urllib_request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib_request.urlopen(request, timeout=timeout_seconds) as response:
            return PayrollProviderHttpTransportResult(
                status_code=int(response.status),
                response_body=response.read().decode("utf-8"),
                response_headers=dict(response.headers.items()),
            )
    except urllib_error.HTTPError as exc:
        return PayrollProviderHttpTransportResult(
            status_code=int(exc.code),
            response_body=exc.read().decode("utf-8"),
            response_headers=dict(exc.headers.items()),
        )
    except urllib_error.URLError as exc:
        raise PayrollProviderAdapterError(
            f"Payroll provider HTTP adapter could not reach endpoint: {exc.reason}",
            code="provider_http_transport_failed",
            provider_ref="",
            retryable=True,
        ) from exc


def _http_adapter_headers(
    request: PayrollProviderSubmissionRequest,
    *,
    config: dict[str, Any],
    credential: PayrollProviderCredential | None,
) -> dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Idempotency-Key": request.idempotency_key,
        "X-Payload-Checksum-SHA256": request.payload_checksum_sha256,
        **{str(key): str(value) for key, value in config["static_headers"].items()},
    }
    auth_scheme = config["auth_scheme"]
    material = credential.material if credential else {}
    if auth_scheme == "none":
        return headers
    if credential is None:
        raise PayrollProviderAdapterError(
            "Payroll provider HTTP adapter auth requires a credential_ref.",
            code="provider_http_credential_required",
            provider_ref=request.provider_ref,
        )
    if auth_scheme == "bearer":
        token = str(material.get("bearer_token") or material.get("token") or "")
        if not token:
            raise PayrollProviderAdapterError(
                "Payroll provider HTTP bearer auth requires bearer_token material.",
                code="provider_http_bearer_token_missing",
                provider_ref=request.provider_ref,
            )
        headers["Authorization"] = f"Bearer {token}"
        return headers
    if auth_scheme == "api_key_header":
        api_key = str(material.get("api_key") or material.get("token") or "")
        if not api_key:
            raise PayrollProviderAdapterError(
                "Payroll provider HTTP API-key auth requires api_key material.",
                code="provider_http_api_key_missing",
                provider_ref=request.provider_ref,
            )
        headers[config["api_key_header_name"]] = api_key
        return headers
    raise PayrollProviderAdapterError(
        f"Payroll provider HTTP auth scheme {auth_scheme} is not supported.",
        code="provider_http_auth_scheme_unsupported",
        provider_ref=request.provider_ref,
    )


class HttpJsonPayrollProviderAdapter:
    adapter_ref = "payroll.provider_adapter.http_json.v1"

    def submit(self, request: PayrollProviderSubmissionRequest) -> PayrollProviderSubmissionResult:
        config = _http_adapter_config(request)
        credential_ref = str(request.credential_snapshot.get("credential_ref") or "")
        credential = resolve_payroll_provider_credential(credential_ref, provider_ref=request.provider_ref) if credential_ref else None
        provider_payload = request.route_snapshot.get("provider_payload") if isinstance(request.route_snapshot.get("provider_payload"), dict) else {}
        body = {
            "provider_ref": request.provider_ref,
            "submission_profile_ref": request.submission_profile_ref,
            "request_schema_ref": request.request_schema_ref,
            "idempotency_key": request.idempotency_key,
            "payload_checksum_sha256": request.payload_checksum_sha256,
            "artifact": request.artifact_snapshot,
            "provider_payload": provider_payload,
        }
        headers = _http_adapter_headers(request, config=config, credential=credential)
        transport = _http_transport_for_ref(config["transport_ref"])
        response = transport(
            method=config["method"],
            url=config["endpoint_url"],
            headers=headers,
            body=body,
            timeout_seconds=config["timeout_seconds"],
        )
        if isinstance(response, dict):
            response = PayrollProviderHttpTransportResult(
                status_code=int(response.get("status_code") or 0),
                response_body=str(response.get("response_body") or ""),
                response_headers=response.get("response_headers") if isinstance(response.get("response_headers"), dict) else {},
            )
        response_json = _json_response_body(response.response_body)
        success_statuses = {int(item) for item in config["success_statuses"]}
        successful = response.status_code in success_statuses
        provider_status = str(_snapshot_path_value(response_json, config["provider_status_path"]) or ("acknowledged" if successful else "failed"))
        external_reference = str(_snapshot_path_value(response_json, config["external_reference_path"]) or request.external_reference)
        provider_batch_ref = str(_snapshot_path_value(response_json, config["provider_batch_ref_path"]) or f"HTTP-{request.payload_checksum_sha256[:16]}")
        failure_code = str(_snapshot_path_value(response_json, config["failure_code_path"]) or ("" if successful else f"HTTP_{response.status_code}"))
        failure_reason = str(_snapshot_path_value(response_json, config["failure_reason_path"]) or ("" if successful else "Provider HTTP endpoint returned a non-success status."))
        certification_refs = _snapshot_path_value(response_json, config["certification_evidence_refs_path"])
        certification_evidence_refs = [str(item) for item in certification_refs] if isinstance(certification_refs, list) else []
        return PayrollProviderSubmissionResult(
            provider_status=provider_status,
            external_reference=external_reference,
            provider_batch_ref=provider_batch_ref,
            response_snapshot={
                "adapter_ref": request.adapter_ref,
                "adapter_profile_ref": config["adapter_profile_ref"],
                "domain_contract_ref": config["domain_contract_ref"],
                "dispatch_mode": "http_json",
                "http_request": {
                    "method": config["method"],
                    "endpoint_url": config["endpoint_url"],
                    "transport_ref": config["transport_ref"],
                    "timeout_seconds": config["timeout_seconds"],
                    "auth_scheme": config["auth_scheme"],
                    "credential_snapshot": credential.snapshot() if credential else request.credential_snapshot,
                    "headers": {
                        key: ("configured" if key in {"Authorization", config["api_key_header_name"]} else value)
                        for key, value in headers.items()
                    },
                },
                "http_response": {
                    "status_code": response.status_code,
                    "headers": response.response_headers,
                    "body_checksum_sha256": hashlib.sha256(response.response_body.encode("utf-8")).hexdigest(),
                    "json": response_json,
                },
                "provider_payload": provider_payload,
                "schema_mapping": request.route_snapshot.get("schema_mapping", {}),
            },
            certification_evidence_refs=certification_evidence_refs,
            failure_code=failure_code,
            failure_reason=failure_reason,
            retryable=not successful and response.status_code >= 500,
        )


def _load_provider_adapter(path: str) -> PayrollProviderAdapter:
    module_name, _, attr = path.partition(":")
    if not module_name or not attr:
        raise PayrollProviderAdapterError("Custom payroll provider adapter paths must use module:attribute format.")
    module = importlib.import_module(module_name)
    adapter = getattr(module, attr)
    return adapter() if isinstance(adapter, type) else adapter


BUILTIN_PAYROLL_PROVIDER_ADAPTER_CLASSES = {
    ManualPayrollProviderAdapter.adapter_ref: ManualPayrollProviderAdapter,
    SandboxPayrollProviderAdapter.adapter_ref: SandboxPayrollProviderAdapter,
    BankPayrollProviderSandboxAdapter.adapter_ref: BankPayrollProviderSandboxAdapter,
    AccountingPayrollProviderSandboxAdapter.adapter_ref: AccountingPayrollProviderSandboxAdapter,
    StatutoryPayrollProviderSandboxAdapter.adapter_ref: StatutoryPayrollProviderSandboxAdapter,
    BankPayrollProviderProductionPackAdapter.adapter_ref: BankPayrollProviderProductionPackAdapter,
    AccountingPayrollProviderProductionPackAdapter.adapter_ref: AccountingPayrollProviderProductionPackAdapter,
    StatutoryPayrollProviderProductionPackAdapter.adapter_ref: StatutoryPayrollProviderProductionPackAdapter,
    BankPayrollProviderLivePayoutAdapter.adapter_ref: BankPayrollProviderLivePayoutAdapter,
    AccountingPayrollProviderLiveJournalAdapter.adapter_ref: AccountingPayrollProviderLiveJournalAdapter,
    StatutoryPayrollProviderLiveFilingAdapter.adapter_ref: StatutoryPayrollProviderLiveFilingAdapter,
    HttpJsonPayrollProviderAdapter.adapter_ref: HttpJsonPayrollProviderAdapter,
}

BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES = {
    BankPayrollProviderFixtureClient.client_ref: BankPayrollProviderFixtureClient,
    BankPayrollProviderSdkHttpClient.client_ref: BankPayrollProviderSdkHttpClient,
    BankRazorpayXHttpPayrollProviderClient.client_ref: BankRazorpayXHttpPayrollProviderClient,
    AccountingPayrollProviderFixtureClient.client_ref: AccountingPayrollProviderFixtureClient,
    AccountingPayrollProviderSdkHttpClient.client_ref: AccountingPayrollProviderSdkHttpClient,
    AccountingTallyPrimeHttpPayrollProviderClient.client_ref: AccountingTallyPrimeHttpPayrollProviderClient,
    StatutoryPayrollProviderFixtureClient.client_ref: StatutoryPayrollProviderFixtureClient,
    StatutoryPayrollProviderSdkHttpClient.client_ref: StatutoryPayrollProviderSdkHttpClient,
    StatutoryEpfoEcrHttpPayrollProviderClient.client_ref: StatutoryEpfoEcrHttpPayrollProviderClient,
}


def _load_provider_client(path: str):
    module_name, _, attr = path.partition(":")
    if not module_name or not attr:
        raise PayrollProviderAdapterError("Custom payroll provider client paths must use module:attribute format.")
    module = importlib.import_module(module_name)
    client = getattr(module, attr)
    return client() if isinstance(client, type) else client


def _configured_provider_client(configured: Any):
    if isinstance(configured, str):
        return _load_provider_client(configured)
    if isinstance(configured, type):
        return configured()
    return configured


PAYROLL_PROVIDER_CLIENT_REGISTRIES = {
    "bank": {
        "settings_ref": "settings.PAYROLL_BANK_PAYOUT_CLIENTS",
        "setting_name": "PAYROLL_BANK_PAYOUT_CLIENTS",
        "supported_adapter_refs": [PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF],
        "supported_artifact_kinds": ["bank_advice"],
        "ready_methods": ["submit_payout", "__call__"],
    },
    "accounting": {
        "settings_ref": "settings.PAYROLL_ACCOUNTING_JOURNAL_CLIENTS",
        "setting_name": "PAYROLL_ACCOUNTING_JOURNAL_CLIENTS",
        "supported_adapter_refs": [PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF],
        "supported_artifact_kinds": ["accounting_export"],
        "ready_methods": ["post_journal", "submit_journal", "__call__"],
    },
    "statutory": {
        "settings_ref": "settings.PAYROLL_STATUTORY_FILING_CLIENTS",
        "setting_name": "PAYROLL_STATUTORY_FILING_CLIENTS",
        "supported_adapter_refs": [PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF],
        "supported_artifact_kinds": ["statutory_report"],
        "ready_methods": ["submit_filing", "upload_filing", "__call__"],
    },
}

BUILTIN_PAYROLL_PROVIDER_PACKAGE_MANIFESTS = {
    PAYROLL_BANK_FIXTURE_PACKAGE_REF: {
        "package_ref": PAYROLL_BANK_FIXTURE_PACKAGE_REF,
        "package_profile_ref": "payroll.provider_package_manifest.bank.fixture.v1",
        "provider_kind": "bank",
        "provider_name": "Bank payout certification fixture",
        "adapter_ref": PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF,
        "client_ref": PAYROLL_BANK_FIXTURE_CLIENT_REF,
        "certification_fixture_client_ref": PAYROLL_BANK_FIXTURE_CLIENT_REF,
        "supported_artifact_kinds": ["bank_advice"],
        "supported_transport_modes": ["api"],
        "required_route_config_refs": [
            "bank_payout_adapter.client_ref",
            "bank_payout_adapter.debit_account_ref",
            "bank_payout_adapter.payment_date",
        ],
        "certification_scenario_refs": [
            "bank_payout_acknowledged",
            "bank_payout_partial_acceptance",
            "bank_payout_idempotent_replay",
        ],
        "evidence_path_refs": [
            "bank_payout.utr_refs",
            "bank_payout.transaction_refs",
            "bank_payout.evidence_refs",
        ],
        "failure_taxonomy_ref": "payroll.bank_payout.failure_taxonomy.v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": [DEFAULT_STORAGE_POLICY_REF],
        "sandbox_ready": True,
    },
    PAYROLL_BANK_SDK_HTTP_PACKAGE_REF: {
        "package_ref": PAYROLL_BANK_SDK_HTTP_PACKAGE_REF,
        "package_profile_ref": "payroll.provider_package_manifest.bank.sdk_http.v1",
        "provider_kind": "bank",
        "provider_name": "Bank payout SDK HTTP skeleton",
        "adapter_ref": PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF,
        "client_ref": PAYROLL_BANK_SDK_HTTP_CLIENT_REF,
        "certification_fixture_client_ref": PAYROLL_BANK_FIXTURE_CLIENT_REF,
        "supported_artifact_kinds": ["bank_advice"],
        "supported_transport_modes": ["api"],
        "required_route_config_refs": [
            "provider_package_ref",
            "bank_payout_adapter.client_ref",
            "bank_payout_adapter.endpoint_url",
            "bank_payout_adapter.transport_ref",
            "bank_payout_adapter.auth_scheme",
            "bank_payout_adapter.debit_account_ref",
            "bank_payout_adapter.payment_date",
        ],
        "certification_scenario_refs": [
            "bank_sdk_http_acknowledged",
            "bank_sdk_http_provider_timeout",
            "bank_sdk_http_idempotent_replay",
        ],
        "evidence_path_refs": [
            "bank_payout.provider_response.sdk_client.response_status_code",
            "bank_payout.utr_refs",
            "bank_payout.transaction_refs",
            "bank_payout.evidence_refs",
        ],
        "schema_mapping_profile_ref": "payroll.provider_mapping.bank.bank_advice.sdk_http.v1",
        "credential_profile_ref": "payroll.provider_credentials.bank.sdk_http.reference.v1",
        "failure_taxonomy_ref": "payroll.bank_payout.failure_taxonomy.v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": [DEFAULT_STORAGE_POLICY_REF],
        "sandbox_ready": False,
    },
    PAYROLL_BANK_RAZORPAYX_HTTP_PACKAGE_REF: {
        "package_ref": PAYROLL_BANK_RAZORPAYX_HTTP_PACKAGE_REF,
        "package_profile_ref": "payroll.provider_package_manifest.bank.razorpayx_http.v1",
        "package_module_ref": "payroll.provider_package_module.bank.razorpayx_http.v1",
        "vendor_profile_ref": "payroll.provider_vendor.bank.razorpayx.v1",
        "provider_contract_ref": "payroll.provider_contract.bank.razorpayx_payout.v1",
        "provider_kind": "bank",
        "provider_name": "RazorpayX-compatible bank payout package",
        "adapter_ref": PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF,
        "client_ref": PAYROLL_BANK_RAZORPAYX_HTTP_CLIENT_REF,
        "certification_fixture_client_ref": PAYROLL_BANK_FIXTURE_CLIENT_REF,
        "supported_artifact_kinds": ["bank_advice"],
        "supported_transport_modes": ["api"],
        "required_route_config_refs": [
            "provider_package_ref",
            "bank_payout_adapter.client_ref",
            "bank_payout_adapter.endpoint_url",
            "bank_payout_adapter.transport_ref",
            "bank_payout_adapter.auth_scheme",
            "bank_payout_adapter.debit_account_ref",
            "bank_payout_adapter.payment_date",
            "bank_payout_adapter.payout_profile_ref",
            "bank_payout_adapter.payment_operation_ref",
        ],
        "certification_scenario_refs": [
            "razorpayx_http_payout_accepted",
            "razorpayx_http_partial_failure",
            "razorpayx_http_idempotent_replay",
            "razorpayx_http_callback_reconcile",
        ],
        "evidence_path_refs": [
            "bank_payout.provider_response.sdk_client.response_status_code",
            "bank_payout.provider_response.sdk_client.package_module_ref",
            "bank_payout.provider_response.package_module.provider_contract_ref",
            "bank_payout.utr_refs",
            "bank_payout.transaction_refs",
            "bank_payout.evidence_refs",
        ],
        "schema_mapping_profile_ref": "payroll.provider_mapping.bank.bank_advice.razorpayx_http.v1",
        "credential_profile_ref": "payroll.provider_credentials.bank.razorpayx_http.reference.v1",
        "failure_taxonomy_ref": "payroll.bank_payout.razorpayx_http.failure_taxonomy.v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": [DEFAULT_STORAGE_POLICY_REF],
        "sandbox_ready": False,
    },
    PAYROLL_ACCOUNTING_FIXTURE_PACKAGE_REF: {
        "package_ref": PAYROLL_ACCOUNTING_FIXTURE_PACKAGE_REF,
        "package_profile_ref": "payroll.provider_package_manifest.accounting.fixture.v1",
        "provider_kind": "accounting",
        "provider_name": "Accounting journal certification fixture",
        "adapter_ref": PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF,
        "client_ref": PAYROLL_ACCOUNTING_FIXTURE_CLIENT_REF,
        "certification_fixture_client_ref": PAYROLL_ACCOUNTING_FIXTURE_CLIENT_REF,
        "supported_artifact_kinds": ["accounting_export"],
        "supported_transport_modes": ["api"],
        "required_route_config_refs": [
            "accounting_journal_adapter.client_ref",
            "accounting_journal_adapter.company_ref",
            "accounting_journal_adapter.posting_date",
        ],
        "certification_scenario_refs": [
            "accounting_journal_posted",
            "accounting_journal_period_closed",
            "accounting_journal_idempotent_replay",
        ],
        "evidence_path_refs": [
            "accounting_journal.voucher_refs",
            "accounting_journal.document_refs",
            "accounting_journal.evidence_refs",
        ],
        "failure_taxonomy_ref": "payroll.accounting_journal.failure_taxonomy.v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": [DEFAULT_STORAGE_POLICY_REF],
        "sandbox_ready": True,
    },
    PAYROLL_ACCOUNTING_SDK_HTTP_PACKAGE_REF: {
        "package_ref": PAYROLL_ACCOUNTING_SDK_HTTP_PACKAGE_REF,
        "package_profile_ref": "payroll.provider_package_manifest.accounting.sdk_http.v1",
        "provider_kind": "accounting",
        "provider_name": "Accounting journal SDK HTTP skeleton",
        "adapter_ref": PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF,
        "client_ref": PAYROLL_ACCOUNTING_SDK_HTTP_CLIENT_REF,
        "certification_fixture_client_ref": PAYROLL_ACCOUNTING_FIXTURE_CLIENT_REF,
        "supported_artifact_kinds": ["accounting_export"],
        "supported_transport_modes": ["api"],
        "required_route_config_refs": [
            "provider_package_ref",
            "accounting_journal_adapter.client_ref",
            "accounting_journal_adapter.endpoint_url",
            "accounting_journal_adapter.transport_ref",
            "accounting_journal_adapter.auth_scheme",
            "accounting_journal_adapter.company_ref",
            "accounting_journal_adapter.posting_date",
        ],
        "certification_scenario_refs": [
            "accounting_sdk_http_posted",
            "accounting_sdk_http_period_closed",
            "accounting_sdk_http_idempotent_replay",
        ],
        "evidence_path_refs": [
            "accounting_journal.provider_response.sdk_client.response_status_code",
            "accounting_journal.voucher_refs",
            "accounting_journal.document_refs",
            "accounting_journal.evidence_refs",
        ],
        "schema_mapping_profile_ref": "payroll.provider_mapping.accounting.accounting_export.sdk_http.v1",
        "credential_profile_ref": "payroll.provider_credentials.accounting.sdk_http.reference.v1",
        "failure_taxonomy_ref": "payroll.accounting_journal.failure_taxonomy.v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": [DEFAULT_STORAGE_POLICY_REF],
        "sandbox_ready": False,
    },
    PAYROLL_ACCOUNTING_TALLYPRIME_HTTP_PACKAGE_REF: {
        "package_ref": PAYROLL_ACCOUNTING_TALLYPRIME_HTTP_PACKAGE_REF,
        "package_profile_ref": "payroll.provider_package_manifest.accounting.tallyprime_http.v1",
        "package_module_ref": "payroll.provider_package_module.accounting.tallyprime_http.v1",
        "vendor_profile_ref": "payroll.provider_vendor.accounting.tallyprime.v1",
        "provider_contract_ref": "payroll.provider_contract.accounting.tallyprime_journal_import.v1",
        "provider_kind": "accounting",
        "provider_name": "TallyPrime-compatible accounting journal package",
        "adapter_ref": PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF,
        "client_ref": PAYROLL_ACCOUNTING_TALLYPRIME_HTTP_CLIENT_REF,
        "certification_fixture_client_ref": PAYROLL_ACCOUNTING_FIXTURE_CLIENT_REF,
        "supported_artifact_kinds": ["accounting_export"],
        "supported_transport_modes": ["api", "file_export"],
        "required_route_config_refs": [
            "provider_package_ref",
            "accounting_journal_adapter.client_ref",
            "accounting_journal_adapter.endpoint_url",
            "accounting_journal_adapter.transport_ref",
            "accounting_journal_adapter.auth_scheme",
            "accounting_journal_adapter.company_ref",
            "accounting_journal_adapter.books_ref",
            "accounting_journal_adapter.posting_date",
            "accounting_journal_adapter.journal_operation_ref",
        ],
        "certification_scenario_refs": [
            "tallyprime_http_journal_import_posted",
            "tallyprime_http_period_closed",
            "tallyprime_http_idempotent_replay",
            "tallyprime_http_voucher_reconcile",
        ],
        "evidence_path_refs": [
            "accounting_journal.provider_response.sdk_client.response_status_code",
            "accounting_journal.provider_response.sdk_client.response_body_checksum_sha256",
            "accounting_journal.provider_response.sdk_client.package_module_ref",
            "accounting_journal.voucher_refs",
            "accounting_journal.document_refs",
            "accounting_journal.evidence_refs",
        ],
        "schema_mapping_profile_ref": "payroll.provider_mapping.accounting.accounting_export.tallyprime_http.v1",
        "credential_profile_ref": "payroll.provider_credentials.accounting.tallyprime_http.reference.v1",
        "failure_taxonomy_ref": "payroll.accounting_journal.tallyprime_http.failure_taxonomy.v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": [DEFAULT_STORAGE_POLICY_REF],
        "sandbox_ready": False,
    },
    PAYROLL_STATUTORY_FIXTURE_PACKAGE_REF: {
        "package_ref": PAYROLL_STATUTORY_FIXTURE_PACKAGE_REF,
        "package_profile_ref": "payroll.provider_package_manifest.statutory.fixture.v1",
        "provider_kind": "statutory",
        "provider_name": "Statutory filing certification fixture",
        "adapter_ref": PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF,
        "client_ref": PAYROLL_STATUTORY_FIXTURE_CLIENT_REF,
        "certification_fixture_client_ref": PAYROLL_STATUTORY_FIXTURE_CLIENT_REF,
        "supported_artifact_kinds": ["statutory_report"],
        "supported_transport_modes": ["api", "portal_automation"],
        "required_route_config_refs": [
            "statutory_filing_adapter.client_ref",
            "statutory_filing_adapter.authority_ref",
            "statutory_filing_adapter.registration_ref",
            "statutory_filing_adapter.filing_type_ref",
        ],
        "certification_scenario_refs": [
            "statutory_filing_receipt",
            "statutory_filing_schema_rejected",
            "statutory_filing_idempotent_replay",
        ],
        "evidence_path_refs": [
            "statutory_filing.receipt_refs",
            "statutory_filing.challan_refs",
            "statutory_filing.acknowledgement_refs",
            "statutory_filing.evidence_refs",
        ],
        "failure_taxonomy_ref": "payroll.statutory_filing.failure_taxonomy.v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": [DEFAULT_STORAGE_POLICY_REF],
        "sandbox_ready": True,
    },
    PAYROLL_STATUTORY_SDK_HTTP_PACKAGE_REF: {
        "package_ref": PAYROLL_STATUTORY_SDK_HTTP_PACKAGE_REF,
        "package_profile_ref": "payroll.provider_package_manifest.statutory.sdk_http.v1",
        "provider_kind": "statutory",
        "provider_name": "Statutory filing SDK HTTP skeleton",
        "adapter_ref": PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF,
        "client_ref": PAYROLL_STATUTORY_SDK_HTTP_CLIENT_REF,
        "certification_fixture_client_ref": PAYROLL_STATUTORY_FIXTURE_CLIENT_REF,
        "supported_artifact_kinds": ["statutory_report"],
        "supported_transport_modes": ["api", "portal_automation"],
        "required_route_config_refs": [
            "provider_package_ref",
            "statutory_filing_adapter.client_ref",
            "statutory_filing_adapter.endpoint_url",
            "statutory_filing_adapter.transport_ref",
            "statutory_filing_adapter.auth_scheme",
            "statutory_filing_adapter.authority_ref",
            "statutory_filing_adapter.registration_ref",
            "statutory_filing_adapter.filing_type_ref",
        ],
        "certification_scenario_refs": [
            "statutory_sdk_http_receipt",
            "statutory_sdk_http_schema_rejected",
            "statutory_sdk_http_idempotent_replay",
        ],
        "evidence_path_refs": [
            "statutory_filing.provider_response.sdk_client.response_status_code",
            "statutory_filing.receipt_refs",
            "statutory_filing.challan_refs",
            "statutory_filing.acknowledgement_refs",
            "statutory_filing.evidence_refs",
        ],
        "schema_mapping_profile_ref": "payroll.provider_mapping.statutory.statutory_report.sdk_http.v1",
        "credential_profile_ref": "payroll.provider_credentials.statutory.sdk_http.reference.v1",
        "failure_taxonomy_ref": "payroll.statutory_filing.failure_taxonomy.v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": [DEFAULT_STORAGE_POLICY_REF],
        "sandbox_ready": False,
    },
    PAYROLL_STATUTORY_EPFO_ECR_HTTP_PACKAGE_REF: {
        "package_ref": PAYROLL_STATUTORY_EPFO_ECR_HTTP_PACKAGE_REF,
        "package_profile_ref": "payroll.provider_package_manifest.statutory.epfo_ecr_http.v1",
        "package_module_ref": "payroll.provider_package_module.statutory.epfo_ecr_http.v1",
        "vendor_profile_ref": "payroll.provider_vendor.statutory.epfo.v1",
        "provider_contract_ref": "payroll.provider_contract.statutory.epfo_ecr_upload.v1",
        "provider_kind": "statutory",
        "provider_name": "EPFO ECR-compatible statutory filing package",
        "adapter_ref": PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF,
        "client_ref": PAYROLL_STATUTORY_EPFO_ECR_HTTP_CLIENT_REF,
        "certification_fixture_client_ref": PAYROLL_STATUTORY_FIXTURE_CLIENT_REF,
        "supported_artifact_kinds": ["statutory_report"],
        "supported_transport_modes": ["api", "portal_automation"],
        "required_route_config_refs": [
            "provider_package_ref",
            "statutory_filing_adapter.client_ref",
            "statutory_filing_adapter.endpoint_url",
            "statutory_filing_adapter.transport_ref",
            "statutory_filing_adapter.auth_scheme",
            "statutory_filing_adapter.authority_ref",
            "statutory_filing_adapter.registration_ref",
            "statutory_filing_adapter.filing_type_ref",
            "statutory_filing_adapter.filing_calendar_ref",
        ],
        "certification_scenario_refs": [
            "epfo_ecr_http_receipt",
            "epfo_ecr_http_challan_generated",
            "epfo_ecr_http_schema_rejected",
            "epfo_ecr_http_idempotent_replay",
        ],
        "evidence_path_refs": [
            "statutory_filing.provider_response.sdk_client.response_status_code",
            "statutory_filing.provider_response.sdk_client.response_body_checksum_sha256",
            "statutory_filing.provider_response.sdk_client.package_module_ref",
            "statutory_filing.receipt_refs",
            "statutory_filing.challan_refs",
            "statutory_filing.acknowledgement_refs",
            "statutory_filing.evidence_refs",
        ],
        "schema_mapping_profile_ref": "payroll.provider_mapping.statutory.statutory_report.epfo_ecr_http.v1",
        "credential_profile_ref": "payroll.provider_credentials.statutory.epfo_ecr_http.reference.v1",
        "failure_taxonomy_ref": "payroll.statutory_filing.epfo_ecr_http.failure_taxonomy.v1",
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
        "storage_policy_refs": [DEFAULT_STORAGE_POLICY_REF],
        "sandbox_ready": False,
    },
}


def _payroll_provider_client_family_for_ref(client_ref: str) -> str:
    builtin = BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES.get(client_ref)
    if builtin is not None:
        return str(getattr(builtin, "client_family", "provider"))
    for family, registry in PAYROLL_PROVIDER_CLIENT_REGISTRIES.items():
        configured_registry = getattr(settings, registry["setting_name"], {}) or {}
        if isinstance(configured_registry, dict) and client_ref in configured_registry:
            return family
    return "provider"


def _payroll_provider_client_capabilities(client: Any, client_ref: str, family: str) -> dict[str, Any]:
    registry = PAYROLL_PROVIDER_CLIENT_REGISTRIES.get(family, {})
    supported_adapter_refs = getattr(client, "supported_adapter_refs", registry.get("supported_adapter_refs", []))
    supported_artifact_kinds = getattr(client, "supported_artifact_kinds", registry.get("supported_artifact_kinds", []))
    ready_methods = registry.get("ready_methods", ["__call__"])
    implemented_methods = [
        method
        for method in ready_methods
        if (method == "__call__" and callable(client)) or callable(getattr(client, method, None))
    ]
    return {
        "client_family": family,
        "supported_adapter_refs": [str(item) for item in supported_adapter_refs],
        "supported_artifact_kinds": [str(item) for item in supported_artifact_kinds],
        "implemented_methods": implemented_methods,
        "expected_methods": [str(item) for item in ready_methods],
        "is_fixture_client": bool(getattr(client, "certification_fixture", False)),
        "is_live_provider_client": not bool(getattr(client, "certification_fixture", False)),
        "secret_material_policy_ref": "payroll.provider_secret_material.reference_only.v1",
    }


def _normalized_required_provider_client_refs(client_refs: Any) -> dict[str, str]:
    if isinstance(client_refs, dict):
        return {
            str(client_ref).strip(): str(family or "").strip()
            for client_ref, family in client_refs.items()
            if str(client_ref or "").strip()
        }
    return {
        str(item).strip(): ""
        for item in (client_refs or [])
        if str(item or "").strip()
    }


def describe_payroll_provider_client_registry(client_refs: list[str] | tuple[str, ...] | set[str] | dict[str, str] | None = None) -> dict[str, Any]:
    """Return deployment-specific provider client readiness without exposing credential material."""

    required_refs = _normalized_required_provider_client_refs(client_refs)
    client_ref_set = set(BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES)
    configured_by_ref: dict[str, tuple[str, Any]] = {}
    for family, registry in PAYROLL_PROVIDER_CLIENT_REGISTRIES.items():
        configured_registry = getattr(settings, registry["setting_name"], {}) or {}
        if not isinstance(configured_registry, dict):
            continue
        for client_ref, configured in configured_registry.items():
            normalized_ref = str(client_ref).strip()
            if not normalized_ref:
                continue
            client_ref_set.add(normalized_ref)
            configured_by_ref[normalized_ref] = (family, configured)
    client_ref_set.update(required_refs)

    clients = []
    for client_ref in sorted(client_ref_set):
        blocking_gate_refs: list[str] = []
        client = None
        source_ref = "missing"
        loader_ref = ""
        family = required_refs.get(client_ref) or _payroll_provider_client_family_for_ref(client_ref)
        if client_ref in configured_by_ref:
            family, configured = configured_by_ref[client_ref]
            source_ref = PAYROLL_PROVIDER_CLIENT_REGISTRIES[family]["settings_ref"]
            loader_ref = configured if isinstance(configured, str) else f"{configured.__class__.__module__}:{configured.__class__.__name__}"
            try:
                client = _configured_provider_client(configured)
            except Exception as exc:  # pragma: no cover - exact import errors vary by deployment.
                blocking_gate_refs.append(f"load_failed:{exc.__class__.__name__}")
        elif client_ref in BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES:
            source_ref = "builtin"
            client = BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES[client_ref]()
            family = str(getattr(client, "client_family", family or "provider"))
            loader_ref = f"{client.__class__.__module__}:{client.__class__.__name__}"
        else:
            blocking_gate_refs.append("provider_client_ref_not_registered")

        capabilities = _payroll_provider_client_capabilities(client, client_ref, family) if client is not None else {}
        if client is not None and not capabilities.get("implemented_methods"):
            blocking_gate_refs.append("provider_client_method_missing")
        status = "ready" if not blocking_gate_refs else "blocked"
        clients.append({
            "client_ref": client_ref,
            "source_ref": source_ref,
            "loader_ref": loader_ref,
            "status": status,
            "required_by_connection": client_ref in required_refs,
            "blocking_gate_refs": blocking_gate_refs,
            "capabilities": capabilities,
        })

    ready_count = sum(1 for item in clients if item["status"] == "ready")
    fixture_count = sum(1 for item in clients if item.get("capabilities", {}).get("is_fixture_client"))
    configured_count = sum(1 for item in clients if item["source_ref"].startswith("settings."))
    blocked_refs = [item["client_ref"] for item in clients if item["status"] != "ready"]
    return {
        "registry_profile_ref": "payroll.provider_client_registry.readiness.v1",
        "client_count": len(clients),
        "ready_client_count": ready_count,
        "blocked_client_count": len(clients) - ready_count,
        "configured_client_count": configured_count,
        "builtin_client_count": sum(1 for item in clients if item["source_ref"] == "builtin"),
        "fixture_client_count": fixture_count,
        "required_client_count": len(required_refs),
        "blocked_client_refs": blocked_refs,
        "clients": clients,
    }


def _normalized_provider_package_manifest(package_ref: str, manifest: Any) -> dict[str, Any]:
    manifest = manifest if isinstance(manifest, dict) else {}
    package_ref = str(manifest.get("package_ref") or package_ref).strip()
    provider_kind = str(manifest.get("provider_kind") or "").strip()
    return {
        "package_ref": package_ref,
        "package_profile_ref": str(manifest.get("package_profile_ref") or "payroll.provider_package_manifest.v1"),
        "package_module_ref": str(manifest.get("package_module_ref") or ""),
        "vendor_profile_ref": str(manifest.get("vendor_profile_ref") or ""),
        "provider_contract_ref": str(manifest.get("provider_contract_ref") or ""),
        "provider_kind": provider_kind,
        "provider_name": str(manifest.get("provider_name") or package_ref),
        "adapter_ref": str(manifest.get("adapter_ref") or "").strip(),
        "client_ref": str(manifest.get("client_ref") or "").strip(),
        "certification_fixture_client_ref": str(manifest.get("certification_fixture_client_ref") or "").strip(),
        "supported_artifact_kinds": [
            str(item) for item in manifest.get("supported_artifact_kinds", []) if str(item or "").strip()
        ] if isinstance(manifest.get("supported_artifact_kinds"), list) else [],
        "supported_transport_modes": [
            str(item) for item in manifest.get("supported_transport_modes", []) if str(item or "").strip()
        ] if isinstance(manifest.get("supported_transport_modes"), list) else [],
        "required_route_config_refs": [
            str(item) for item in manifest.get("required_route_config_refs", []) if str(item or "").strip()
        ] if isinstance(manifest.get("required_route_config_refs"), list) else [],
        "certification_scenario_refs": [
            str(item) for item in manifest.get("certification_scenario_refs", []) if str(item or "").strip()
        ] if isinstance(manifest.get("certification_scenario_refs"), list) else [],
        "evidence_path_refs": [
            str(item) for item in manifest.get("evidence_path_refs", []) if str(item or "").strip()
        ] if isinstance(manifest.get("evidence_path_refs"), list) else [],
        "schema_mapping_profile_ref": str(manifest.get("schema_mapping_profile_ref") or ""),
        "credential_profile_ref": str(manifest.get("credential_profile_ref") or ""),
        "failure_taxonomy_ref": str(manifest.get("failure_taxonomy_ref") or ""),
        "secret_material_policy_ref": str(
            manifest.get("secret_material_policy_ref") or "payroll.provider_secret_material.reference_only.v1"
        ),
        "storage_policy_refs": [
            str(item) for item in manifest.get("storage_policy_refs", []) if str(item or "").strip()
        ] if isinstance(manifest.get("storage_policy_refs"), list) else [],
        "sandbox_ready": bool(manifest.get("sandbox_ready", False)),
        "raw_manifest": manifest,
    }


def _payroll_provider_client_registered(client_ref: str, provider_kind: str) -> bool:
    if not client_ref:
        return False
    if client_ref in BUILTIN_PAYROLL_PROVIDER_CLIENT_CLASSES:
        return True
    registry = PAYROLL_PROVIDER_CLIENT_REGISTRIES.get(provider_kind, {})
    configured_registry = getattr(settings, registry.get("setting_name", ""), {}) or {}
    return isinstance(configured_registry, dict) and client_ref in configured_registry


def _payroll_provider_package_route_client_ref(route: dict[str, Any], provider_kind: str) -> str:
    config_key = {
        "bank": "bank_payout_adapter",
        "accounting": "accounting_journal_adapter",
        "statutory": "statutory_filing_adapter",
    }.get(provider_kind, "")
    adapter_config = route.get(config_key) if config_key and isinstance(route.get(config_key), dict) else {}
    return str(adapter_config.get("client_ref") or "").strip()


def _required_provider_package_refs_from_routes(routes: Any, manifests: dict[str, dict[str, Any]]) -> set[str]:
    required_refs: set[str] = set()
    for route in routes or []:
        if not isinstance(route, dict):
            continue
        package_ref = str(route.get("provider_package_ref") or "").strip()
        if package_ref:
            required_refs.add(package_ref)
            continue
        adapter_ref = str(route.get("adapter_ref") or "").strip()
        for candidate_ref, manifest in manifests.items():
            provider_kind = str(manifest.get("provider_kind") or "")
            if (
                adapter_ref
                and adapter_ref == manifest.get("adapter_ref")
                and _payroll_provider_package_route_client_ref(route, provider_kind) == manifest.get("client_ref")
            ):
                required_refs.add(candidate_ref)
    return required_refs


def _provider_package_manifest_blockers(manifest: dict[str, Any]) -> list[str]:
    blockers: list[str] = []
    if _has_raw_provider_credential_key(manifest["raw_manifest"]):
        blockers.append("raw_provider_credentials_not_allowed")
    if not manifest["package_ref"]:
        blockers.append("package_ref_required")
    if manifest["provider_kind"] not in PAYROLL_PROVIDER_CLIENT_REGISTRIES:
        blockers.append("provider_kind_unsupported")
    if not manifest["adapter_ref"]:
        blockers.append("adapter_ref_required")
    elif manifest["adapter_ref"] not in BUILTIN_PAYROLL_PROVIDER_ADAPTER_CLASSES and manifest["adapter_ref"] not in (getattr(settings, "PAYROLL_PROVIDER_ADAPTERS", {}) or {}):
        blockers.append("adapter_ref_not_registered")
    if not manifest["client_ref"]:
        blockers.append("client_ref_required")
    elif not _payroll_provider_client_registered(manifest["client_ref"], manifest["provider_kind"]):
        blockers.append("client_ref_not_registered")
    fixture_client_ref = manifest.get("certification_fixture_client_ref")
    if fixture_client_ref and not _payroll_provider_client_registered(fixture_client_ref, manifest["provider_kind"]):
        blockers.append("certification_fixture_client_ref_not_registered")
    if not manifest["supported_artifact_kinds"]:
        blockers.append("supported_artifact_kinds_required")
    if not manifest["required_route_config_refs"]:
        blockers.append("required_route_config_refs_required")
    if not manifest["certification_scenario_refs"]:
        blockers.append("certification_scenario_refs_required")
    if not manifest["evidence_path_refs"]:
        blockers.append("evidence_path_refs_required")
    if manifest["secret_material_policy_ref"] != "payroll.provider_secret_material.reference_only.v1":
        blockers.append("secret_material_policy_ref_invalid")
    if not manifest["storage_policy_refs"]:
        blockers.append("storage_policy_refs_required")
    else:
        storage_policy_registry = describe_payroll_artifact_storage_policy_registry(manifest["storage_policy_refs"])
        blocked_required_policy_refs = [
            item["storage_policy_ref"]
            for item in storage_policy_registry["policies"]
            if item["required_by_package"] and item["status"] != "ready"
        ]
        if blocked_required_policy_refs:
            blockers.append("storage_policy_ref_blocked")
    return blockers


def describe_payroll_provider_package_registry(
    package_refs: list[str] | tuple[str, ...] | set[str] | None = None,
    *,
    route_snapshots: list[dict[str, Any]] | tuple[dict[str, Any], ...] | None = None,
) -> dict[str, Any]:
    """Return provider package manifest readiness for SaaS deployment onboarding."""

    configured_registry = getattr(settings, "PAYROLL_PROVIDER_PACKAGES", {}) or {}
    configured_registry = configured_registry if isinstance(configured_registry, dict) else {}
    manifests = {
        ref: _normalized_provider_package_manifest(ref, manifest)
        for ref, manifest in BUILTIN_PAYROLL_PROVIDER_PACKAGE_MANIFESTS.items()
    }
    configured_manifest_refs = set()
    for package_ref, manifest in configured_registry.items():
        normalized_ref = str(package_ref).strip()
        if not normalized_ref:
            continue
        manifests[normalized_ref] = _normalized_provider_package_manifest(normalized_ref, manifest)
        configured_manifest_refs.add(normalized_ref)

    required_refs = {str(item).strip() for item in (package_refs or []) if str(item or "").strip()}
    required_refs.update(_required_provider_package_refs_from_routes(route_snapshots, manifests))
    for package_ref in required_refs:
        if package_ref not in manifests:
            manifests[package_ref] = _normalized_provider_package_manifest(package_ref, {})

    packages = []
    for package_ref in sorted(manifests):
        manifest = manifests[package_ref]
        source_ref = "settings.PAYROLL_PROVIDER_PACKAGES" if package_ref in configured_manifest_refs else "builtin"
        if package_ref in required_refs and package_ref not in configured_manifest_refs and package_ref not in BUILTIN_PAYROLL_PROVIDER_PACKAGE_MANIFESTS:
            source_ref = "missing"
        blocking_gate_refs = ["provider_package_ref_not_registered"] if source_ref == "missing" else _provider_package_manifest_blockers(manifest)
        status = "ready" if not blocking_gate_refs else "blocked"
        packages.append({
            "package_ref": package_ref,
            "source_ref": source_ref,
            "status": status,
            "required_by_connection": package_ref in required_refs,
            "blocking_gate_refs": blocking_gate_refs,
            "manifest": {key: value for key, value in manifest.items() if key != "raw_manifest"},
            "capabilities": {
                "provider_kind": manifest["provider_kind"],
                "package_module_ref": manifest["package_module_ref"],
                "vendor_profile_ref": manifest["vendor_profile_ref"],
                "provider_contract_ref": manifest["provider_contract_ref"],
                "adapter_ref": manifest["adapter_ref"],
                "client_ref": manifest["client_ref"],
                "certification_fixture_client_ref": manifest["certification_fixture_client_ref"],
                "supported_artifact_kinds": manifest["supported_artifact_kinds"],
                "supported_transport_modes": manifest["supported_transport_modes"],
                "certification_scenario_count": len(manifest["certification_scenario_refs"]),
                "evidence_path_count": len(manifest["evidence_path_refs"]),
                "required_route_config_count": len(manifest["required_route_config_refs"]),
                "is_fixture_package": manifest["client_ref"] in {
                    PAYROLL_BANK_FIXTURE_CLIENT_REF,
                    PAYROLL_ACCOUNTING_FIXTURE_CLIENT_REF,
                    PAYROLL_STATUTORY_FIXTURE_CLIENT_REF,
                },
                "sandbox_ready": manifest["sandbox_ready"],
                "secret_material_policy_ref": manifest["secret_material_policy_ref"],
                "storage_policy_refs": manifest["storage_policy_refs"],
                "storage_policy_ref_count": len(manifest["storage_policy_refs"]),
            },
        })

    ready_count = sum(1 for item in packages if item["status"] == "ready")
    configured_count = sum(1 for item in packages if item["source_ref"] == "settings.PAYROLL_PROVIDER_PACKAGES")
    fixture_count = sum(1 for item in packages if item.get("capabilities", {}).get("is_fixture_package"))
    blocked_refs = [item["package_ref"] for item in packages if item["status"] != "ready"]
    return {
        "registry_profile_ref": "payroll.provider_package_registry.readiness.v1",
        "package_count": len(packages),
        "ready_package_count": ready_count,
        "blocked_package_count": len(packages) - ready_count,
        "configured_package_count": configured_count,
        "builtin_package_count": sum(1 for item in packages if item["source_ref"] == "builtin"),
        "fixture_package_count": fixture_count,
        "required_package_count": len(required_refs),
        "blocked_package_refs": blocked_refs,
        "packages": packages,
    }


PAYROLL_PROVIDER_LAUNCH_REHEARSAL_REQUIRED_KINDS = ("bank", "accounting", "statutory")
PAYROLL_PROVIDER_LAUNCH_READINESS_AUDIT_PACK_REF = "payroll.provider_launch_readiness.audit_pack.v1"
PAYROLL_PROVIDER_LAUNCH_READINESS_COMMAND_REF = "payroll.provider_launch_readiness.management_command.v1"


def _registry_entries_by_ref(registry: dict[str, Any], list_key: str, ref_key: str) -> dict[str, dict[str, Any]]:
    entries = registry.get(list_key) if isinstance(registry, dict) else []
    return {
        str(item.get(ref_key) or ""): item
        for item in entries
        if isinstance(item, dict) and str(item.get(ref_key) or "").strip()
    }


def _provider_route_policy_mode(route: dict[str, Any]) -> str:
    policy = route.get("provider_connection_policy") if isinstance(route.get("provider_connection_policy"), dict) else {}
    mode = str(
        route.get("provider_connection_enforcement")
        or policy.get("enforcement_mode")
        or ("active" if route.get("require_active_provider_connection") else "")
        or ("certified" if route.get("provider_connection_required") else "")
        or "warn"
    ).strip().lower()
    return mode if mode in {"disabled", "warn", "certified", "active"} else "warn"


def _launch_rehearsal_route_kind(route: dict[str, Any], package_by_ref: dict[str, dict[str, Any]]) -> str:
    package_ref = str(route.get("provider_package_ref") or "").strip()
    package = package_by_ref.get(package_ref, {})
    manifest = package.get("manifest") if isinstance(package.get("manifest"), dict) else {}
    provider_kind = str(manifest.get("provider_kind") or "").strip()
    if provider_kind:
        return provider_kind
    adapter_ref = str(route.get("adapter_ref") or "").strip()
    if adapter_ref == PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF or isinstance(route.get("bank_payout_adapter"), dict):
        return "bank"
    if adapter_ref == PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF or isinstance(route.get("accounting_journal_adapter"), dict):
        return "accounting"
    if adapter_ref == PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF or isinstance(route.get("statutory_filing_adapter"), dict):
        return "statutory"
    return ""


def _launch_rehearsal_route_client_ref(route: dict[str, Any], provider_kind: str) -> str:
    config_key = {
        "bank": "bank_payout_adapter",
        "accounting": "accounting_journal_adapter",
        "statutory": "statutory_filing_adapter",
    }.get(provider_kind, "")
    adapter_config = route.get(config_key) if config_key and isinstance(route.get(config_key), dict) else {}
    return str(adapter_config.get("client_ref") or "").strip()


def _launch_rehearsal_connection_ready(connection: dict[str, Any]) -> bool:
    readiness = connection.get("readiness_snapshot") if isinstance(connection.get("readiness_snapshot"), dict) else {}
    status = str(connection.get("status") or "").strip()
    certification_status = str(connection.get("certification_status") or "").strip()
    return bool(readiness.get("active_allowed")) and certification_status == "passed" and status in {"certified", "active"}


def describe_payroll_provider_launch_rehearsal(
    *,
    connections: list[dict[str, Any]] | tuple[dict[str, Any], ...] | None = None,
    route_snapshots: list[dict[str, Any]] | tuple[dict[str, Any], ...] | None = None,
    adapter_registry: dict[str, Any] | None = None,
    client_registry: dict[str, Any] | None = None,
    package_registry: dict[str, Any] | None = None,
    storage_policy_registry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Aggregate provider launch readiness across SaaS routes and registries."""

    connections = [item for item in (connections or []) if isinstance(item, dict)]
    route_snapshots = [item for item in (route_snapshots or []) if isinstance(item, dict)]
    adapter_registry = adapter_registry if isinstance(adapter_registry, dict) else describe_payroll_provider_adapter_registry()
    client_registry = client_registry if isinstance(client_registry, dict) else describe_payroll_provider_client_registry()
    package_registry = package_registry if isinstance(package_registry, dict) else describe_payroll_provider_package_registry(route_snapshots=route_snapshots)
    storage_policy_registry = (
        storage_policy_registry
        if isinstance(storage_policy_registry, dict)
        else describe_payroll_artifact_storage_policy_registry()
    )
    adapter_by_ref = _registry_entries_by_ref(adapter_registry, "adapters", "adapter_ref")
    client_by_ref = _registry_entries_by_ref(client_registry, "clients", "client_ref")
    package_by_ref = _registry_entries_by_ref(package_registry, "packages", "package_ref")
    storage_by_ref = _registry_entries_by_ref(storage_policy_registry, "policies", "storage_policy_ref")
    connections_by_kind: dict[str, list[dict[str, Any]]] = {}
    for connection in connections:
        connections_by_kind.setdefault(str(connection.get("provider_kind") or "").strip(), []).append(connection)
    routes_by_kind: dict[str, list[dict[str, Any]]] = {}
    for route in route_snapshots:
        provider_kind = _launch_rehearsal_route_kind(route, package_by_ref)
        if provider_kind:
            routes_by_kind.setdefault(provider_kind, []).append(route)

    lanes = []
    launch_blockers: list[str] = []
    for provider_kind in PAYROLL_PROVIDER_LAUNCH_REHEARSAL_REQUIRED_KINDS:
        kind_connections = connections_by_kind.get(provider_kind, [])
        ready_connections = [item for item in kind_connections if _launch_rehearsal_connection_ready(item)]
        route = (routes_by_kind.get(provider_kind) or [{}])[0]
        package_ref = str(route.get("provider_package_ref") or "").strip()
        package = package_by_ref.get(package_ref, {})
        package_status = str(package.get("status") or "missing").strip()
        manifest = package.get("manifest") if isinstance(package.get("manifest"), dict) else {}
        client_ref = _launch_rehearsal_route_client_ref(route, provider_kind) or str(manifest.get("client_ref") or "").strip()
        client_status = str(client_by_ref.get(client_ref, {}).get("status") or "missing").strip()
        adapter_ref = str(route.get("adapter_ref") or manifest.get("adapter_ref") or "").strip()
        adapter_status = str(adapter_by_ref.get(adapter_ref, {}).get("status") or "missing").strip()
        storage_policy_refs = [
            str(item).strip()
            for item in manifest.get("storage_policy_refs", [])
            if str(item or "").strip()
        ] if isinstance(manifest.get("storage_policy_refs"), list) else []
        blocked_storage_policy_refs = [
            ref
            for ref in storage_policy_refs
            if storage_by_ref.get(ref, {}).get("status") != "ready"
        ]
        enforcement_mode = _provider_route_policy_mode(route)
        gates = [
            {
                "ref": "provider_connection_present",
                "label": "Provider connection present",
                "passed": bool(kind_connections),
                "value": len(kind_connections),
            },
            {
                "ref": "provider_connection_launch_ready",
                "label": "Provider connection launch ready",
                "passed": bool(ready_connections),
                "value": ready_connections[0].get("status") if ready_connections else "not_ready",
            },
            {
                "ref": "provider_route_present",
                "label": "Provider route present",
                "passed": bool(route),
                "value": route.get("provider_ref", ""),
            },
            {
                "ref": "provider_adapter_ready",
                "label": "Provider adapter ready",
                "passed": bool(adapter_ref) and adapter_status == "ready",
                "value": adapter_ref,
            },
            {
                "ref": "provider_package_ready",
                "label": "Provider package ready",
                "passed": bool(package_ref) and package_status == "ready",
                "value": package_ref,
            },
            {
                "ref": "provider_client_ready",
                "label": "Provider client ready",
                "passed": bool(client_ref) and client_status == "ready",
                "value": client_ref,
            },
            {
                "ref": "storage_policy_ready",
                "label": "Storage policy ready",
                "passed": bool(storage_policy_refs) and not blocked_storage_policy_refs,
                "value": storage_policy_refs,
            },
            {
                "ref": "finance_handoff_gate_enforced",
                "label": "Finance handoff gate enforced",
                "passed": enforcement_mode in {"certified", "active"},
                "value": enforcement_mode,
            },
        ]
        blocking_gate_refs = [gate["ref"] for gate in gates if not gate["passed"]]
        lane = {
            "provider_kind": provider_kind,
            "status": "ready" if not blocking_gate_refs else "blocked",
            "connection_count": len(kind_connections),
            "launch_ready_connection_count": len(ready_connections),
            "route_count": len(routes_by_kind.get(provider_kind, [])),
            "adapter_ref": adapter_ref,
            "client_ref": client_ref,
            "package_ref": package_ref,
            "storage_policy_refs": storage_policy_refs,
            "blocked_storage_policy_refs": blocked_storage_policy_refs,
            "provider_connection_enforcement": enforcement_mode,
            "package_module_ref": str(manifest.get("package_module_ref") or ""),
            "vendor_profile_ref": str(manifest.get("vendor_profile_ref") or ""),
            "provider_contract_ref": str(manifest.get("provider_contract_ref") or ""),
            "gates": gates,
            "blocking_gate_refs": blocking_gate_refs,
        }
        if blocking_gate_refs:
            launch_blockers.extend(f"{provider_kind}:{gate_ref}" for gate_ref in blocking_gate_refs)
        lanes.append(lane)

    required_package_count = sum(1 for lane in lanes if lane["package_ref"])
    ready_lane_count = sum(1 for lane in lanes if lane["status"] == "ready")
    return {
        "rehearsal_profile_ref": "payroll.provider_launch_rehearsal.v1",
        "status": "ready" if not launch_blockers else "blocked",
        "required_provider_kinds": list(PAYROLL_PROVIDER_LAUNCH_REHEARSAL_REQUIRED_KINDS),
        "lane_count": len(lanes),
        "ready_lane_count": ready_lane_count,
        "blocked_lane_count": len(lanes) - ready_lane_count,
        "required_package_count": required_package_count,
        "ready_required_package_count": sum(1 for lane in lanes if lane["package_ref"] and not any(ref in lane["blocking_gate_refs"] for ref in {"provider_package_ready"})),
        "launch_blocker_count": len(launch_blockers),
        "launch_blocking_gate_refs": launch_blockers,
        "registry_snapshot": {
            "adapter_registry_status": "ready" if not adapter_registry.get("blocked_adapter_count", 0) else "blocked",
            "client_registry_status": "ready" if not client_registry.get("blocked_client_count", 0) else "blocked",
            "package_registry_status": "ready" if not package_registry.get("blocked_package_count", 0) else "blocked",
            "storage_policy_registry_status": "ready" if not storage_policy_registry.get("blocked_storage_policy_count", 0) else "blocked",
        },
        "lanes": lanes,
    }


def _launch_readiness_registry_snapshot(setup_payload: dict[str, Any]) -> dict[str, Any]:
    launch_rehearsal = setup_payload.get("launch_rehearsal") if isinstance(setup_payload.get("launch_rehearsal"), dict) else {}
    registry_snapshot = (
        launch_rehearsal.get("registry_snapshot")
        if isinstance(launch_rehearsal.get("registry_snapshot"), dict)
        else {}
    )
    summary = setup_payload.get("summary") if isinstance(setup_payload.get("summary"), dict) else {}
    return {
        "adapter_registry_status": registry_snapshot.get("adapter_registry_status", "blocked"),
        "client_registry_status": registry_snapshot.get("client_registry_status", "blocked"),
        "package_registry_status": registry_snapshot.get("package_registry_status", "blocked"),
        "storage_policy_registry_status": registry_snapshot.get("storage_policy_registry_status", "blocked"),
        "adapter_registry_count": int(summary.get("adapter_registry_count") or 0),
        "client_registry_count": int(summary.get("client_registry_count") or 0),
        "package_registry_count": int(summary.get("package_registry_count") or 0),
        "storage_policy_registry_count": int(summary.get("storage_policy_registry_count") or 0),
        "blocked_adapter_registry_count": int(summary.get("blocked_adapter_registry_count") or 0),
        "blocked_client_registry_count": int(summary.get("blocked_client_registry_count") or 0),
        "blocked_package_registry_count": int(summary.get("blocked_package_registry_count") or 0),
        "blocked_storage_policy_registry_count": int(summary.get("blocked_storage_policy_registry_count") or 0),
    }


def _launch_readiness_release_blockers(launch_rehearsal: dict[str, Any]) -> list[dict[str, Any]]:
    blockers = []
    lanes = launch_rehearsal.get("lanes") if isinstance(launch_rehearsal.get("lanes"), list) else []
    for lane in lanes:
        if not isinstance(lane, dict):
            continue
        gates = lane.get("gates") if isinstance(lane.get("gates"), list) else []
        for gate in gates:
            if not isinstance(gate, dict) or gate.get("passed"):
                continue
            gate_ref = str(gate.get("ref") or "").strip()
            provider_kind = str(lane.get("provider_kind") or "").strip()
            blockers.append({
                "ref": f"{provider_kind}:{gate_ref}" if provider_kind and gate_ref else gate_ref,
                "provider_kind": provider_kind,
                "gate_ref": gate_ref,
                "label": str(gate.get("label") or gate_ref),
                "value": gate.get("value"),
            })
    return blockers


def _launch_readiness_release_gates(
    *,
    launch_rehearsal: dict[str, Any],
    registry_snapshot: dict[str, Any],
    release_blockers: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    registry_statuses = [
        registry_snapshot["adapter_registry_status"],
        registry_snapshot["client_registry_status"],
        registry_snapshot["package_registry_status"],
        registry_snapshot["storage_policy_registry_status"],
    ]
    return [
        {
            "ref": "provider_launch_rehearsal_status_ready",
            "label": "Provider launch rehearsal ready",
            "passed": launch_rehearsal.get("status") == "ready",
            "value": launch_rehearsal.get("status", "blocked"),
        },
        {
            "ref": "provider_launch_rehearsal_all_lanes_ready",
            "label": "All required provider lanes ready",
            "passed": int(launch_rehearsal.get("blocked_lane_count") or 0) == 0,
            "value": {
                "ready_lane_count": int(launch_rehearsal.get("ready_lane_count") or 0),
                "blocked_lane_count": int(launch_rehearsal.get("blocked_lane_count") or 0),
            },
        },
        {
            "ref": "provider_launch_rehearsal_no_blockers",
            "label": "No launch-blocking gates",
            "passed": not release_blockers,
            "value": len(release_blockers),
        },
        {
            "ref": "provider_registry_snapshot_ready",
            "label": "Provider registries ready",
            "passed": all(status == "ready" for status in registry_statuses),
            "value": registry_snapshot,
        },
    ]


def describe_payroll_provider_launch_readiness_audit_pack(
    *,
    tenant_snapshot: dict[str, Any] | None = None,
    setup_payload: dict[str, Any] | None = None,
    generated_at: Any = "",
    generated_by_ref: str = PAYROLL_PROVIDER_LAUNCH_READINESS_COMMAND_REF,
) -> dict[str, Any]:
    """Build a portable, sanitized launch-readiness audit pack for a tenant."""

    setup_payload = setup_payload if isinstance(setup_payload, dict) else {}
    launch_rehearsal = (
        setup_payload.get("launch_rehearsal")
        if isinstance(setup_payload.get("launch_rehearsal"), dict)
        else {}
    )
    summary = setup_payload.get("summary") if isinstance(setup_payload.get("summary"), dict) else {}
    registry_snapshot = _launch_readiness_registry_snapshot(setup_payload)
    release_blockers = _launch_readiness_release_blockers(launch_rehearsal)
    release_gates = _launch_readiness_release_gates(
        launch_rehearsal=launch_rehearsal,
        registry_snapshot=registry_snapshot,
        release_blockers=release_blockers,
    )
    can_launch = all(gate["passed"] for gate in release_gates)
    connection_rows = setup_payload.get("connections") if isinstance(setup_payload.get("connections"), list) else []
    lane_rows = launch_rehearsal.get("lanes") if isinstance(launch_rehearsal.get("lanes"), list) else []
    audit_pack = {
        "audit_pack_ref": PAYROLL_PROVIDER_LAUNCH_READINESS_AUDIT_PACK_REF,
        "generated_by_ref": str(generated_by_ref or PAYROLL_PROVIDER_LAUNCH_READINESS_COMMAND_REF),
        "generated_at": generated_at.isoformat() if hasattr(generated_at, "isoformat") else str(generated_at or ""),
        "tenant": _redacted_provider_snapshot(tenant_snapshot if isinstance(tenant_snapshot, dict) else {}),
        "status": "ready" if can_launch else "blocked",
        "can_launch": can_launch,
        "summary": {
            "connection_count": int(summary.get("connection_count") or 0),
            "active_connection_count": int(summary.get("active_connection_count") or 0),
            "certified_connection_count": int(summary.get("certified_connection_count") or 0),
            "active_allowed_count": int(summary.get("active_allowed_count") or 0),
            "launch_rehearsal_status": launch_rehearsal.get("status", "blocked"),
            "ready_lane_count": int(launch_rehearsal.get("ready_lane_count") or 0),
            "blocked_lane_count": int(launch_rehearsal.get("blocked_lane_count") or 0),
            "launch_blocker_count": len(release_blockers),
        },
        "required_provider_kinds": launch_rehearsal.get("required_provider_kinds", []),
        "lane_ledger": [
            {
                "provider_kind": str(lane.get("provider_kind") or ""),
                "status": str(lane.get("status") or "blocked"),
                "connection_count": int(lane.get("connection_count") or 0),
                "launch_ready_connection_count": int(lane.get("launch_ready_connection_count") or 0),
                "route_count": int(lane.get("route_count") or 0),
                "adapter_ref": str(lane.get("adapter_ref") or ""),
                "client_ref": str(lane.get("client_ref") or ""),
                "package_ref": str(lane.get("package_ref") or ""),
                "storage_policy_refs": lane.get("storage_policy_refs", []),
                "blocking_gate_refs": lane.get("blocking_gate_refs", []),
            }
            for lane in lane_rows
            if isinstance(lane, dict)
        ],
        "connection_refs": [
            {
                "provider_ref": str(connection.get("provider_ref") or ""),
                "provider_kind": str(connection.get("provider_kind") or ""),
                "environment_ref": str(connection.get("environment_ref") or ""),
                "status": str(connection.get("status") or ""),
                "certification_status": str(connection.get("certification_status") or ""),
            }
            for connection in connection_rows
            if isinstance(connection, dict)
        ],
        "registry_snapshot": registry_snapshot,
        "registries": {
            "adapter_registry": _redacted_provider_snapshot(setup_payload.get("adapter_registry", {})),
            "client_registry": _redacted_provider_snapshot(setup_payload.get("client_registry", {})),
            "package_registry": _redacted_provider_snapshot(setup_payload.get("package_registry", {})),
            "storage_policy_registry": _redacted_provider_snapshot(setup_payload.get("storage_policy_registry", {})),
        },
        "release_gates": release_gates,
        "release_blockers": release_blockers,
        "launch_rehearsal": _redacted_provider_snapshot(launch_rehearsal),
    }
    checksum_payload = json.dumps(audit_pack, sort_keys=True, default=str).encode("utf-8")
    audit_pack["evidence_checksum_sha256"] = hashlib.sha256(checksum_payload).hexdigest()
    return audit_pack


def _payroll_provider_adapter_capabilities(adapter: PayrollProviderAdapter, adapter_ref: str) -> dict[str, Any]:
    supported_artifact_kinds = getattr(adapter, "supported_artifact_kinds", ())
    return {
        "adapter_family": str(getattr(adapter, "adapter_family", "provider")),
        "supported_artifact_kinds": [str(item) for item in supported_artifact_kinds] if isinstance(supported_artifact_kinds, tuple) else [],
        "is_manual": adapter_ref == ManualPayrollProviderAdapter.adapter_ref,
        "is_sandbox": adapter_ref == SandboxPayrollProviderAdapter.adapter_ref or adapter_ref.endswith(".sandbox.v1"),
        "is_http_json": adapter_ref == HttpJsonPayrollProviderAdapter.adapter_ref,
        "is_production_pack": adapter_ref in PRODUCTION_PROVIDER_ADAPTER_REFS,
        "is_bank_live_payout": adapter_ref == PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF,
        "is_accounting_live_journal": adapter_ref == PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF,
        "is_statutory_live_filing": adapter_ref == PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF,
        "requires_route_config": adapter_ref in PRODUCTION_PROVIDER_ADAPTER_REFS or adapter_ref in {
            HttpJsonPayrollProviderAdapter.adapter_ref,
            PAYROLL_BANK_LIVE_PAYOUT_ADAPTER_REF,
            PAYROLL_ACCOUNTING_LIVE_JOURNAL_ADAPTER_REF,
            PAYROLL_STATUTORY_LIVE_FILING_ADAPTER_REF,
        },
    }


def _configured_provider_adapter(configured: Any) -> PayrollProviderAdapter:
    if isinstance(configured, str):
        return _load_provider_adapter(configured)
    if isinstance(configured, type):
        return configured()
    return configured


def describe_payroll_provider_adapter_registry(adapter_refs: list[str] | tuple[str, ...] | set[str] | None = None) -> dict[str, Any]:
    """Return deployment-specific adapter registry readiness without exposing credential material."""

    configured_registry = getattr(settings, "PAYROLL_PROVIDER_ADAPTERS", {}) or {}
    configured_registry = configured_registry if isinstance(configured_registry, dict) else {}
    required_refs = {
        str(item).strip()
        for item in (adapter_refs or [])
        if str(item or "").strip()
    }
    adapter_ref_set = set(BUILTIN_PAYROLL_PROVIDER_ADAPTER_CLASSES)
    adapter_ref_set.update(str(item).strip() for item in configured_registry if str(item or "").strip())
    adapter_ref_set.update(required_refs)

    adapters = []
    for adapter_ref in sorted(adapter_ref_set):
        blocking_gate_refs: list[str] = []
        adapter = None
        source_ref = "missing"
        loader_ref = ""
        if adapter_ref in configured_registry:
            source_ref = "settings.PAYROLL_PROVIDER_ADAPTERS"
            configured = configured_registry[adapter_ref]
            loader_ref = configured if isinstance(configured, str) else f"{configured.__class__.__module__}:{configured.__class__.__name__}"
            try:
                adapter = _configured_provider_adapter(configured)
            except Exception as exc:  # pragma: no cover - exact import errors vary by deployment.
                blocking_gate_refs.append(f"load_failed:{exc.__class__.__name__}")
        elif adapter_ref in BUILTIN_PAYROLL_PROVIDER_ADAPTER_CLASSES:
            source_ref = "builtin"
            adapter = BUILTIN_PAYROLL_PROVIDER_ADAPTER_CLASSES[adapter_ref]()
            loader_ref = f"{adapter.__class__.__module__}:{adapter.__class__.__name__}"
        else:
            blocking_gate_refs.append("adapter_ref_not_registered")

        if adapter is not None and not callable(getattr(adapter, "submit", None)):
            blocking_gate_refs.append("submit_method_missing")
        status = "ready" if not blocking_gate_refs else "blocked"
        adapters.append({
            "adapter_ref": adapter_ref,
            "source_ref": source_ref,
            "loader_ref": loader_ref,
            "status": status,
            "required_by_connection": adapter_ref in required_refs,
            "blocking_gate_refs": blocking_gate_refs,
            "capabilities": _payroll_provider_adapter_capabilities(adapter, adapter_ref) if adapter is not None else {},
        })

    ready_count = sum(1 for item in adapters if item["status"] == "ready")
    production_pack_count = sum(1 for item in adapters if item.get("capabilities", {}).get("is_production_pack"))
    configured_count = sum(1 for item in adapters if item["source_ref"] == "settings.PAYROLL_PROVIDER_ADAPTERS")
    blocked_refs = [item["adapter_ref"] for item in adapters if item["status"] != "ready"]
    return {
        "registry_profile_ref": "payroll.provider_adapter_registry.readiness.v1",
        "adapter_count": len(adapters),
        "ready_adapter_count": ready_count,
        "blocked_adapter_count": len(adapters) - ready_count,
        "configured_adapter_count": configured_count,
        "builtin_adapter_count": sum(1 for item in adapters if item["source_ref"] == "builtin"),
        "production_pack_adapter_count": production_pack_count,
        "required_adapter_count": len(required_refs),
        "blocked_adapter_refs": blocked_refs,
        "adapters": adapters,
    }


def get_payroll_provider_adapter(adapter_ref: str) -> PayrollProviderAdapter:
    adapter_ref = str(adapter_ref or "").strip()
    registry = getattr(settings, "PAYROLL_PROVIDER_ADAPTERS", {}) or {}
    if adapter_ref in registry:
        return _configured_provider_adapter(registry[adapter_ref])
    if adapter_ref in BUILTIN_PAYROLL_PROVIDER_ADAPTER_CLASSES:
        return BUILTIN_PAYROLL_PROVIDER_ADAPTER_CLASSES[adapter_ref]()
    return ManualPayrollProviderAdapter()
