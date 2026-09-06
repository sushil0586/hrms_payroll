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

from django.conf import settings


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
        _contract_gate(f"request_field:{field}", f"Request field {field}", _snapshot_path_value(request_snapshot, field) not in {None, ""}, field)
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
        _contract_gate(f"result_field:{field}", f"Result field {field}", _snapshot_path_value(result_snapshot, field) not in {None, ""}, field)
        for field in required_fields
    ]
    gates.append(
        _contract_gate("provider_status_allowed", "Provider status allowed", result.provider_status in allowed_statuses, result.provider_status)
    )
    gates.extend(
        _contract_gate(
            f"response_snapshot:{field}",
            f"Response snapshot {field}",
            _snapshot_path_value(result.response_snapshot, field) not in {None, ""},
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
            "storage_provider_ref": delivery.output_artifact.storage_provider_ref,
            "storage_key": delivery.output_artifact.storage_key,
            "storage_object_version": delivery.output_artifact.storage_object_version,
            "download_strategy_ref": delivery.output_artifact.download_strategy_ref,
            "mime_type": delivery.output_artifact.mime_type,
            "file_size_bytes": delivery.output_artifact.file_size_bytes,
            "checksum_sha256": delivery.output_artifact.checksum_sha256,
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


def _load_provider_adapter(path: str) -> PayrollProviderAdapter:
    module_name, _, attr = path.partition(":")
    if not module_name or not attr:
        raise PayrollProviderAdapterError("Custom payroll provider adapter paths must use module:attribute format.")
    module = importlib.import_module(module_name)
    adapter = getattr(module, attr)
    return adapter() if isinstance(adapter, type) else adapter


def get_payroll_provider_adapter(adapter_ref: str) -> PayrollProviderAdapter:
    adapter_ref = str(adapter_ref or "").strip()
    registry = getattr(settings, "PAYROLL_PROVIDER_ADAPTERS", {}) or {}
    if adapter_ref in registry:
        configured = registry[adapter_ref]
        if isinstance(configured, str):
            return _load_provider_adapter(configured)
        if isinstance(configured, type):
            return configured()
        return configured
    if adapter_ref == SandboxPayrollProviderAdapter.adapter_ref:
        return SandboxPayrollProviderAdapter()
    if adapter_ref == BankPayrollProviderSandboxAdapter.adapter_ref:
        return BankPayrollProviderSandboxAdapter()
    if adapter_ref == AccountingPayrollProviderSandboxAdapter.adapter_ref:
        return AccountingPayrollProviderSandboxAdapter()
    if adapter_ref == StatutoryPayrollProviderSandboxAdapter.adapter_ref:
        return StatutoryPayrollProviderSandboxAdapter()
    return ManualPayrollProviderAdapter()
