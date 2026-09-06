"""Payroll artifact storage adapters.

The default adapter stores generated payroll files on the artifact row for local
development. External object stores can implement the same contract later.
"""

from __future__ import annotations

import hashlib
import importlib
import json
import os
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Protocol
from urllib.parse import quote, urlencode, urlparse

from django.conf import settings
from django.utils import timezone


DEFAULT_STORAGE_PROVIDER_REF = "payroll.storage.local.generated.v1"
DEFAULT_DOWNLOAD_STRATEGY_REF = "payroll.download.stream.local.v1"
DEFAULT_SIGNED_DOWNLOAD_STRATEGY_REF = "payroll.download.signed_url.v1"
DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 900
PAYROLL_STORAGE_CREDENTIALS_ENV = "HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON"
PAYROLL_STORAGE_POLICIES_ENV = "HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON"
DEFAULT_STORAGE_POLICY_REF = "payroll.storage.policy.default.v1"
RAW_CREDENTIAL_KEYS = {
    "access_key",
    "access_key_id",
    "account_key",
    "client_secret",
    "connection_string",
    "password",
    "private_key",
    "secret",
    "secret_access_key",
    "secret_key",
    "token",
}
OBJECT_STORE_PROVIDER_FAMILIES = {
    "s3": {
        "bucket_field": "bucket_name",
        "required_fields": ("bucket_name", "region", "credential_ref"),
        "download_strategy_ref": "payroll.download.s3.signed_url.v1",
    },
    "gcs": {
        "bucket_field": "bucket_name",
        "required_fields": ("bucket_name", "project_ref", "credential_ref"),
        "download_strategy_ref": "payroll.download.gcs.signed_url.v1",
    },
    "azure": {
        "bucket_field": "container_name",
        "required_fields": ("account_name", "container_name", "credential_ref"),
        "download_strategy_ref": "payroll.download.azure.signed_url.v1",
    },
}


class PayrollArtifactStorageError(ValueError):
    """Raised when a payroll artifact cannot be stored or read."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "payroll_storage_error",
        provider_ref: str = "",
        retryable: bool = False,
    ):
        super().__init__(message)
        self.code = code
        self.provider_ref = provider_ref
        self.retryable = retryable


@dataclass(frozen=True)
class PayrollArtifactPayload:
    file_name: str
    content_type: str
    payload: str

    @property
    def payload_bytes(self) -> bytes:
        return self.payload.encode("utf-8")

    @property
    def file_size_bytes(self) -> int:
        return len(self.payload_bytes)

    @property
    def checksum_sha256(self) -> str:
        return hashlib.sha256(self.payload_bytes).hexdigest()


@dataclass(frozen=True)
class PayrollArtifactStorageResult:
    storage_provider_ref: str
    storage_key: str
    storage_object_version: str
    download_strategy_ref: str
    supports_signed_url: bool
    signed_url_expires_in_seconds: int
    file_size_bytes: int
    checksum_sha256: str
    file_payload: str


@dataclass(frozen=True)
class PayrollArtifactReadResult:
    payload: bytes
    checksum_sha256: str
    content_type: str
    file_name: str


@dataclass(frozen=True)
class PayrollArtifactSignedUrl:
    url: str
    expires_at: Any
    strategy_ref: str


@dataclass(frozen=True)
class PayrollArtifactStorageProfile:
    provider_ref: str
    provider_family: str
    bucket_name: str
    container_name: str
    region: str
    project_ref: str
    account_name: str
    credential_ref: str
    key_prefix: str
    retention_policy_ref: str
    download_strategy_ref: str
    signed_url_expires_in_seconds: int
    encryption_ref: str
    endpoint_url: str
    contract_test_mode: bool
    storage_policy_ref: str
    lifecycle_policy_ref: str
    malware_scan_profile_ref: str
    durability_policy_ref: str

    def snapshot(self) -> dict[str, Any]:
        return {
            "provider_ref": self.provider_ref,
            "provider_family": self.provider_family,
            "bucket_name": self.bucket_name,
            "container_name": self.container_name,
            "region": self.region,
            "project_ref": self.project_ref,
            "account_name": self.account_name,
            "credential_ref": self.credential_ref,
            "key_prefix": self.key_prefix,
            "retention_policy_ref": self.retention_policy_ref,
            "download_strategy_ref": self.download_strategy_ref,
            "signed_url_expires_in_seconds": self.signed_url_expires_in_seconds,
            "encryption_ref": self.encryption_ref,
            "endpoint_url": self.endpoint_url,
            "contract_test_mode": self.contract_test_mode,
            "storage_policy_ref": self.storage_policy_ref,
            "lifecycle_policy_ref": self.lifecycle_policy_ref,
            "malware_scan_profile_ref": self.malware_scan_profile_ref,
            "durability_policy_ref": self.durability_policy_ref,
        }


@dataclass(frozen=True)
class PayrollArtifactStorageCredential:
    credential_ref: str
    provider_family: str
    material: dict[str, Any]
    source_ref: str
    use_default_credentials: bool
    metadata: dict[str, Any]

    def snapshot(self) -> dict[str, Any]:
        return {
            "credential_ref": self.credential_ref,
            "provider_family": self.provider_family,
            "source_ref": self.source_ref,
            "use_default_credentials": self.use_default_credentials,
            "metadata": self.metadata,
        }


@dataclass(frozen=True)
class PayrollArtifactStoragePolicy:
    storage_policy_ref: str
    enabled: bool
    allowed_provider_families: tuple[str, ...]
    allowed_provider_refs: tuple[str, ...]
    allowed_credential_refs: tuple[str, ...]
    allowed_bucket_names: tuple[str, ...]
    allowed_container_names: tuple[str, ...]
    allowed_retention_policy_refs: tuple[str, ...]
    allowed_encryption_refs: tuple[str, ...]
    allowed_endpoint_hosts: tuple[str, ...]
    required_key_prefix: str
    require_encryption_ref: bool
    require_private_endpoint: bool
    require_runtime_credentials: bool
    min_signed_url_expires_in_seconds: int
    max_signed_url_expires_in_seconds: int
    max_file_size_bytes: int
    lifecycle_policy_ref: str
    malware_scan_profile_ref: str
    durability_policy_ref: str
    metadata: dict[str, Any]

    def snapshot(self) -> dict[str, Any]:
        return {
            "storage_policy_ref": self.storage_policy_ref,
            "enabled": self.enabled,
            "allowed_provider_families": list(self.allowed_provider_families),
            "allowed_provider_refs": list(self.allowed_provider_refs),
            "allowed_credential_refs": list(self.allowed_credential_refs),
            "allowed_bucket_names": list(self.allowed_bucket_names),
            "allowed_container_names": list(self.allowed_container_names),
            "allowed_retention_policy_refs": list(self.allowed_retention_policy_refs),
            "allowed_encryption_refs": list(self.allowed_encryption_refs),
            "allowed_endpoint_hosts": list(self.allowed_endpoint_hosts),
            "required_key_prefix": self.required_key_prefix,
            "require_encryption_ref": self.require_encryption_ref,
            "require_private_endpoint": self.require_private_endpoint,
            "require_runtime_credentials": self.require_runtime_credentials,
            "min_signed_url_expires_in_seconds": self.min_signed_url_expires_in_seconds,
            "max_signed_url_expires_in_seconds": self.max_signed_url_expires_in_seconds,
            "max_file_size_bytes": self.max_file_size_bytes,
            "lifecycle_policy_ref": self.lifecycle_policy_ref,
            "malware_scan_profile_ref": self.malware_scan_profile_ref,
            "durability_policy_ref": self.durability_policy_ref,
            "metadata": self.metadata,
        }


class PayrollArtifactStorageAdapter(Protocol):
    provider_ref: str
    download_strategy_ref: str
    supports_signed_url: bool

    def store(self, *, storage_key: str, payload: PayrollArtifactPayload, config: dict[str, Any]) -> PayrollArtifactStorageResult:
        ...

    def read(self, artifact) -> PayrollArtifactReadResult:
        ...

    def signed_url(self, artifact, *, expires_in_seconds: int) -> PayrollArtifactSignedUrl | None:
        ...


class LocalGeneratedPayrollArtifactStorageAdapter:
    provider_ref = DEFAULT_STORAGE_PROVIDER_REF
    download_strategy_ref = DEFAULT_DOWNLOAD_STRATEGY_REF
    supports_signed_url = False

    def store(self, *, storage_key: str, payload: PayrollArtifactPayload, config: dict[str, Any]) -> PayrollArtifactStorageResult:
        profile_config = config.get("storage_profile") if isinstance(config.get("storage_profile"), dict) else config
        profile = normalize_payroll_artifact_storage_profile(self.provider_ref, profile_config)
        validate_payroll_artifact_storage_policy(profile, storage_key=storage_key, payload=payload)
        version = hashlib.sha256(f"{storage_key}:{payload.checksum_sha256}".encode("utf-8")).hexdigest()[:24]
        return PayrollArtifactStorageResult(
            storage_provider_ref=self.provider_ref,
            storage_key=storage_key,
            storage_object_version=version,
            download_strategy_ref=self.download_strategy_ref,
            supports_signed_url=self.supports_signed_url,
            signed_url_expires_in_seconds=int(config.get("signed_url_expires_in_seconds") or DEFAULT_SIGNED_URL_EXPIRY_SECONDS),
            file_size_bytes=payload.file_size_bytes,
            checksum_sha256=payload.checksum_sha256,
            file_payload=payload.payload,
        )

    def read(self, artifact) -> PayrollArtifactReadResult:
        profile = storage_profile_from_artifact(artifact)
        validate_payroll_artifact_storage_policy(profile, storage_key=artifact.storage_key)
        if not artifact.file_payload:
            raise PayrollArtifactStorageError("Payroll artifact file is not available for download.")
        payload = artifact.file_payload.encode("utf-8")
        checksum = hashlib.sha256(payload).hexdigest()
        return PayrollArtifactReadResult(
            payload=payload,
            checksum_sha256=checksum,
            content_type=artifact.mime_type or artifact.content_type or "application/octet-stream",
            file_name=artifact.file_name or "payroll-artifact.txt",
        )

    def signed_url(self, artifact, *, expires_in_seconds: int) -> PayrollArtifactSignedUrl | None:
        return None


def _provider_family(provider_ref: str) -> str:
    lowered = (provider_ref or "").lower()
    for family in OBJECT_STORE_PROVIDER_FAMILIES:
        if f".{family}." in lowered or lowered.endswith(f".{family}") or lowered.startswith(f"{family}."):
            return family
    return "local" if provider_ref in {"", DEFAULT_STORAGE_PROVIDER_REF, "local", "payroll.storage.signed_url.placeholder.v1"} else "unknown"


def _has_raw_credential_key(value: Any) -> bool:
    if isinstance(value, dict):
        for key, nested_value in value.items():
            if str(key).lower() in RAW_CREDENTIAL_KEYS:
                return True
            if _has_raw_credential_key(nested_value):
                return True
    if isinstance(value, list):
        return any(_has_raw_credential_key(item) for item in value)
    return False


def normalize_payroll_artifact_storage_profile(provider_ref: str | None, config: dict[str, Any] | None) -> PayrollArtifactStorageProfile:
    """Validate and sanitize storage profile config before artifact metadata is persisted."""

    config = config or {}
    provider_ref = provider_ref or config.get("storage_provider_ref") or config.get("provider_ref") or DEFAULT_STORAGE_PROVIDER_REF
    family = _provider_family(provider_ref)
    if _has_raw_credential_key(config):
        raise PayrollArtifactStorageError(
            "Payroll storage profiles must reference credentials by credential_ref; raw credentials are not allowed in configuration snapshots.",
            code="raw_credentials_not_allowed",
            provider_ref=provider_ref,
        )
    try:
        signed_url_expires_in_seconds = int(config.get("signed_url_expires_in_seconds") or DEFAULT_SIGNED_URL_EXPIRY_SECONDS)
    except (TypeError, ValueError):
        signed_url_expires_in_seconds = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
    if family == "unknown":
        raise PayrollArtifactStorageError(
            f"Payroll storage adapter {provider_ref} is not supported.",
            code="unsupported_storage_adapter",
            provider_ref=provider_ref,
        )
    family_config = OBJECT_STORE_PROVIDER_FAMILIES.get(family)
    if family_config:
        missing_fields = [
            field
            for field in family_config["required_fields"]
            if not str(config.get(field) or "").strip()
        ]
        if missing_fields:
            raise PayrollArtifactStorageError(
                f"Payroll object storage profile {provider_ref} is missing required field(s): {', '.join(missing_fields)}.",
                code="storage_profile_incomplete",
                provider_ref=provider_ref,
            )
        download_strategy_ref = config.get("download_strategy_ref") or family_config["download_strategy_ref"]
    else:
        download_strategy_ref = config.get("download_strategy_ref") or (
            DEFAULT_SIGNED_DOWNLOAD_STRATEGY_REF if provider_ref == "payroll.storage.signed_url.placeholder.v1" else DEFAULT_DOWNLOAD_STRATEGY_REF
        )
    return PayrollArtifactStorageProfile(
        provider_ref=provider_ref,
        provider_family=family,
        bucket_name=str(config.get("bucket_name") or ""),
        container_name=str(config.get("container_name") or ""),
        region=str(config.get("region") or ""),
        project_ref=str(config.get("project_ref") or ""),
        account_name=str(config.get("account_name") or ""),
        credential_ref=str(config.get("credential_ref") or ""),
        key_prefix=str(config.get("key_prefix") or config.get("storage_key_prefix") or "payroll"),
        retention_policy_ref=str(config.get("retention_policy_ref") or "payroll.retention.7y.v1"),
        download_strategy_ref=str(download_strategy_ref),
        signed_url_expires_in_seconds=signed_url_expires_in_seconds,
        encryption_ref=str(config.get("encryption_ref") or ""),
        endpoint_url=str(config.get("endpoint_url") or ""),
        contract_test_mode=bool(config.get("contract_test_mode")),
        storage_policy_ref=str(config.get("storage_policy_ref") or DEFAULT_STORAGE_POLICY_REF),
        lifecycle_policy_ref=str(config.get("lifecycle_policy_ref") or ""),
        malware_scan_profile_ref=str(config.get("malware_scan_profile_ref") or ""),
        durability_policy_ref=str(config.get("durability_policy_ref") or ""),
    )


def _as_tuple(value: Any) -> tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, str) and not value.strip():
        return ()
    if isinstance(value, str):
        return (value,)
    if isinstance(value, (list, tuple, set)):
        return tuple(str(item) for item in value if str(item or "").strip())
    return ()


def _positive_int(value: Any, default: int = 0) -> int:
    try:
        parsed = int(value or default)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def _policy_entries_from_settings() -> dict[str, Any]:
    entries = getattr(settings, "PAYROLL_ARTIFACT_STORAGE_POLICIES", None)
    if entries is None:
        raw_json = os.getenv(PAYROLL_STORAGE_POLICIES_ENV, "").strip()
        if raw_json:
            try:
                entries = json.loads(raw_json)
            except json.JSONDecodeError as exc:
                raise PayrollArtifactStorageError(
                    f"Payroll artifact storage policy resolver could not parse {PAYROLL_STORAGE_POLICIES_ENV}.",
                    code="storage_policy_invalid_json",
                    retryable=False,
                ) from exc
    return entries if isinstance(entries, dict) else {}


def resolve_payroll_artifact_storage_policy(storage_policy_ref: str | None) -> PayrollArtifactStoragePolicy:
    """Resolve storage policy constraints without embedding them in code paths."""

    storage_policy_ref = str(storage_policy_ref or DEFAULT_STORAGE_POLICY_REF).strip() or DEFAULT_STORAGE_POLICY_REF
    entries = _policy_entries_from_settings()
    entry = entries.get(storage_policy_ref)
    if not isinstance(entry, dict):
        if storage_policy_ref == DEFAULT_STORAGE_POLICY_REF:
            entry = {}
        else:
            raise PayrollArtifactStorageError(
                f"Payroll artifact storage policy {storage_policy_ref} is not configured.",
                code="storage_policy_not_configured",
                retryable=False,
            )
    return PayrollArtifactStoragePolicy(
        storage_policy_ref=storage_policy_ref,
        enabled=bool(entry.get("enabled", True)),
        allowed_provider_families=_as_tuple(entry.get("allowed_provider_families")),
        allowed_provider_refs=_as_tuple(entry.get("allowed_provider_refs")),
        allowed_credential_refs=_as_tuple(entry.get("allowed_credential_refs")),
        allowed_bucket_names=_as_tuple(entry.get("allowed_bucket_names")),
        allowed_container_names=_as_tuple(entry.get("allowed_container_names")),
        allowed_retention_policy_refs=_as_tuple(entry.get("allowed_retention_policy_refs")),
        allowed_encryption_refs=_as_tuple(entry.get("allowed_encryption_refs")),
        allowed_endpoint_hosts=_as_tuple(entry.get("allowed_endpoint_hosts")),
        required_key_prefix=str(entry.get("required_key_prefix") or "").strip("/"),
        require_encryption_ref=bool(entry.get("require_encryption_ref", False)),
        require_private_endpoint=bool(entry.get("require_private_endpoint", False)),
        require_runtime_credentials=bool(entry.get("require_runtime_credentials", False)),
        min_signed_url_expires_in_seconds=_positive_int(entry.get("min_signed_url_expires_in_seconds"), 0),
        max_signed_url_expires_in_seconds=_positive_int(entry.get("max_signed_url_expires_in_seconds"), 0),
        max_file_size_bytes=_positive_int(entry.get("max_file_size_bytes"), 0),
        lifecycle_policy_ref=str(entry.get("lifecycle_policy_ref") or ""),
        malware_scan_profile_ref=str(entry.get("malware_scan_profile_ref") or ""),
        durability_policy_ref=str(entry.get("durability_policy_ref") or ""),
        metadata=entry.get("metadata") if isinstance(entry.get("metadata"), dict) else {},
    )


def _assert_allowed(policy: PayrollArtifactStoragePolicy, value: str, allowed_values: tuple[str, ...], label: str) -> None:
    if allowed_values and value not in allowed_values:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} does not allow {label} {value}.",
            code="storage_policy_violation",
            retryable=False,
        )


def _endpoint_host(endpoint_url: str) -> str:
    if not endpoint_url:
        return ""
    parsed = urlparse(endpoint_url)
    return parsed.hostname or ""


def validate_payroll_artifact_storage_policy(
    profile: PayrollArtifactStorageProfile,
    *,
    storage_key: str = "",
    payload: PayrollArtifactPayload | None = None,
    credential: PayrollArtifactStorageCredential | None = None,
) -> PayrollArtifactStoragePolicy:
    """Apply configurable storage governance before object-store operations."""

    policy = resolve_payroll_artifact_storage_policy(profile.storage_policy_ref)
    if not policy.enabled:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} is disabled.",
            code="storage_policy_disabled",
            retryable=False,
        )
    _assert_allowed(policy, profile.provider_family, policy.allowed_provider_families, "provider family")
    _assert_allowed(policy, profile.provider_ref, policy.allowed_provider_refs, "provider")
    if profile.credential_ref:
        _assert_allowed(policy, profile.credential_ref, policy.allowed_credential_refs, "credential ref")
    if profile.bucket_name:
        _assert_allowed(policy, profile.bucket_name, policy.allowed_bucket_names, "bucket")
    if profile.container_name:
        _assert_allowed(policy, profile.container_name, policy.allowed_container_names, "container")
    _assert_allowed(policy, profile.retention_policy_ref, policy.allowed_retention_policy_refs, "retention policy")
    if profile.encryption_ref:
        _assert_allowed(policy, profile.encryption_ref, policy.allowed_encryption_refs, "encryption ref")
    if policy.require_encryption_ref and not profile.encryption_ref:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} requires encryption_ref.",
            code="storage_policy_violation",
            retryable=False,
        )
    if policy.require_runtime_credentials and credential is None:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} requires runtime credential resolution.",
            code="storage_policy_violation",
            retryable=False,
        )
    if policy.required_key_prefix:
        key_value = storage_key.strip("/") if storage_key else profile.key_prefix.strip("/")
        if key_value != policy.required_key_prefix and not key_value.startswith(f"{policy.required_key_prefix}/"):
            raise PayrollArtifactStorageError(
                f"Payroll artifact storage policy {policy.storage_policy_ref} requires storage keys under {policy.required_key_prefix}.",
                code="storage_policy_violation",
                retryable=False,
            )
    if policy.min_signed_url_expires_in_seconds and profile.signed_url_expires_in_seconds < policy.min_signed_url_expires_in_seconds:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} requires signed URL expiry of at least {policy.min_signed_url_expires_in_seconds} seconds.",
            code="storage_policy_violation",
            retryable=False,
        )
    if policy.max_signed_url_expires_in_seconds and profile.signed_url_expires_in_seconds > policy.max_signed_url_expires_in_seconds:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} allows signed URL expiry of at most {policy.max_signed_url_expires_in_seconds} seconds.",
            code="storage_policy_violation",
            retryable=False,
        )
    if policy.max_file_size_bytes and payload and payload.file_size_bytes > policy.max_file_size_bytes:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} allows files up to {policy.max_file_size_bytes} bytes.",
            code="storage_policy_violation",
            retryable=False,
        )
    if policy.require_private_endpoint and not profile.endpoint_url:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} requires a private endpoint_url.",
            code="storage_policy_violation",
            retryable=False,
        )
    if profile.endpoint_url:
        _assert_allowed(policy, _endpoint_host(profile.endpoint_url), policy.allowed_endpoint_hosts, "endpoint host")
    if policy.lifecycle_policy_ref and profile.lifecycle_policy_ref != policy.lifecycle_policy_ref:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} requires lifecycle_policy_ref {policy.lifecycle_policy_ref}.",
            code="storage_policy_violation",
            retryable=False,
        )
    if policy.malware_scan_profile_ref and profile.malware_scan_profile_ref != policy.malware_scan_profile_ref:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} requires malware_scan_profile_ref {policy.malware_scan_profile_ref}.",
            code="storage_policy_violation",
            retryable=False,
        )
    if policy.durability_policy_ref and profile.durability_policy_ref != policy.durability_policy_ref:
        raise PayrollArtifactStorageError(
            f"Payroll artifact storage policy {policy.storage_policy_ref} requires durability_policy_ref {policy.durability_policy_ref}.",
            code="storage_policy_violation",
            retryable=False,
        )
    return policy


def _credential_entries_from_settings() -> dict[str, Any]:
    entries = getattr(settings, "PAYROLL_ARTIFACT_STORAGE_CREDENTIALS", None)
    if entries is None:
        raw_json = os.getenv(PAYROLL_STORAGE_CREDENTIALS_ENV, "").strip()
        if raw_json:
            try:
                entries = json.loads(raw_json)
            except json.JSONDecodeError as exc:
                raise PayrollArtifactStorageError(
                    f"Payroll artifact storage credential resolver could not parse {PAYROLL_STORAGE_CREDENTIALS_ENV}.",
                    code="credential_resolver_invalid_json",
                    retryable=False,
                ) from exc
    return entries if isinstance(entries, dict) else {}


def resolve_payroll_artifact_storage_credential(
    credential_ref: str,
    *,
    provider_family: str,
) -> PayrollArtifactStorageCredential:
    """Resolve a credential reference without persisting secret material on artifacts."""

    credential_ref = str(credential_ref or "").strip()
    if not credential_ref:
        raise PayrollArtifactStorageError(
            "Payroll object storage profile requires a credential_ref.",
            code="credential_ref_required",
            retryable=False,
        )
    entries = _credential_entries_from_settings()
    entry = entries.get(credential_ref)
    if not isinstance(entry, dict):
        raise PayrollArtifactStorageError(
            f"Payroll object storage credential_ref {credential_ref} is not configured in the runtime credential resolver.",
            code="credential_ref_not_configured",
            retryable=False,
        )
    if entry.get("enabled") is False:
        raise PayrollArtifactStorageError(
            f"Payroll object storage credential_ref {credential_ref} is disabled.",
            code="credential_ref_disabled",
            retryable=False,
        )
    entry_family = str(entry.get("provider_family") or entry.get("family") or provider_family).strip().lower()
    if entry_family != provider_family:
        raise PayrollArtifactStorageError(
            f"Payroll object storage credential_ref {credential_ref} is configured for {entry_family}, not {provider_family}.",
            code="credential_provider_mismatch",
            retryable=False,
        )
    material = entry.get("credentials") if isinstance(entry.get("credentials"), dict) else {}
    use_default_credentials = bool(entry.get("use_default_credentials"))
    if not material and not use_default_credentials:
        raise PayrollArtifactStorageError(
            f"Payroll object storage credential_ref {credential_ref} has no credential material or default credential mode.",
            code="credential_material_missing",
            retryable=False,
        )
    metadata = entry.get("metadata") if isinstance(entry.get("metadata"), dict) else {}
    return PayrollArtifactStorageCredential(
        credential_ref=credential_ref,
        provider_family=provider_family,
        material=material,
        source_ref=str(entry.get("source_ref") or "django-settings"),
        use_default_credentials=use_default_credentials,
        metadata=metadata,
    )


def _resolve_callable(value: Any):
    if callable(value):
        return value
    if isinstance(value, str) and value.strip():
        module_name, _, attr_name = value.strip().rpartition(".")
        if module_name and attr_name:
            module = importlib.import_module(module_name)
            return getattr(module, attr_name)
    return None


def _client_factory_for_profile(profile: PayrollArtifactStorageProfile):
    factories = getattr(settings, "PAYROLL_ARTIFACT_STORAGE_CLIENT_FACTORIES", {})
    factories = factories if isinstance(factories, dict) else {}
    return _resolve_callable(factories.get(profile.provider_ref) or factories.get(profile.provider_family))


def _read_stream(value: Any) -> bytes:
    if hasattr(value, "read"):
        return value.read()
    if isinstance(value, bytes):
        return value
    if isinstance(value, str):
        return value.encode("utf-8")
    return bytes(value or b"")


def storage_profile_from_artifact(artifact) -> PayrollArtifactStorageProfile:
    config = artifact.config_snapshot if isinstance(artifact.config_snapshot, dict) else {}
    storage_profile = config.get("storage_profile") if isinstance(config.get("storage_profile"), dict) else {}
    if not storage_profile:
        storage_profile = {
            "provider_ref": artifact.storage_provider_ref,
            "download_strategy_ref": artifact.download_strategy_ref,
            "signed_url_expires_in_seconds": artifact.signed_url_expires_in_seconds,
            "retention_policy_ref": artifact.retention_policy_ref,
        }
    return normalize_payroll_artifact_storage_profile(artifact.storage_provider_ref, storage_profile)


class ObjectStoreContractPayrollArtifactStorageAdapter:
    """Contract adapter for S3/GCS/Azure profiles before SDK-backed storage is installed."""

    supports_signed_url = True

    def __init__(self, provider_ref: str, provider_family: str):
        self.provider_ref = provider_ref
        self.provider_family = provider_family
        self.download_strategy_ref = OBJECT_STORE_PROVIDER_FAMILIES[provider_family]["download_strategy_ref"]

    def store(self, *, storage_key: str, payload: PayrollArtifactPayload, config: dict[str, Any]) -> PayrollArtifactStorageResult:
        profile_config = config.get("storage_profile") if isinstance(config.get("storage_profile"), dict) else config
        profile = normalize_payroll_artifact_storage_profile(self.provider_ref, profile_config)
        validate_payroll_artifact_storage_policy(profile, storage_key=storage_key, payload=payload)
        if not profile.contract_test_mode:
            raise PayrollArtifactStorageError(
                f"Payroll storage adapter {self.provider_ref} passed profile validation but requires an installed SDK-backed backend.",
                code="storage_backend_not_installed",
                provider_ref=self.provider_ref,
                retryable=False,
            )
        version = hashlib.sha256(f"{profile.provider_ref}:{storage_key}:{payload.checksum_sha256}".encode("utf-8")).hexdigest()[:32]
        return PayrollArtifactStorageResult(
            storage_provider_ref=self.provider_ref,
            storage_key=storage_key,
            storage_object_version=f"{profile.provider_family}-{version}",
            download_strategy_ref=profile.download_strategy_ref,
            supports_signed_url=self.supports_signed_url,
            signed_url_expires_in_seconds=profile.signed_url_expires_in_seconds,
            file_size_bytes=payload.file_size_bytes,
            checksum_sha256=payload.checksum_sha256,
            file_payload=payload.payload,
        )

    def read(self, artifact) -> PayrollArtifactReadResult:
        profile = storage_profile_from_artifact(artifact)
        validate_payroll_artifact_storage_policy(profile, storage_key=artifact.storage_key)
        if not artifact.file_payload:
            raise PayrollArtifactStorageError(
                f"Payroll storage adapter {self.provider_ref} requires an installed SDK-backed backend to read object-store files.",
                code="storage_backend_not_installed",
                provider_ref=self.provider_ref,
            )
        payload = artifact.file_payload.encode("utf-8")
        checksum = hashlib.sha256(payload).hexdigest()
        return PayrollArtifactReadResult(
            payload=payload,
            checksum_sha256=checksum,
            content_type=artifact.mime_type or artifact.content_type or "application/octet-stream",
            file_name=artifact.file_name or "payroll-artifact.txt",
        )

    def signed_url(self, artifact, *, expires_in_seconds: int) -> PayrollArtifactSignedUrl | None:
        profile = storage_profile_from_artifact(artifact)
        validate_payroll_artifact_storage_policy(profile, storage_key=artifact.storage_key)
        expires_at = timezone.now() + timedelta(seconds=expires_in_seconds)
        encoded_key = quote(artifact.storage_key, safe="/")
        query = urlencode({
            "expires": str(expires_in_seconds),
            "credential_ref": profile.credential_ref,
            "version": artifact.storage_object_version,
            "signature": "contract",
        })
        if profile.provider_family == "s3":
            host = profile.endpoint_url or f"https://{profile.bucket_name}.s3.{profile.region}.amazonaws.com"
            url = f"{host.rstrip('/')}/{encoded_key}?X-Amz-Expires={expires_in_seconds}&X-Amz-Credential={quote(profile.credential_ref)}&X-Amz-Signature=contract"
        elif profile.provider_family == "gcs":
            host = profile.endpoint_url or f"https://storage.googleapis.com/{profile.bucket_name}"
            url = f"{host.rstrip('/')}/{encoded_key}?X-Goog-Expires={expires_in_seconds}&X-Goog-Credential={quote(profile.credential_ref)}&X-Goog-Signature=contract"
        else:
            host = profile.endpoint_url or f"https://{profile.account_name}.blob.core.windows.net/{profile.container_name}"
            url = f"{host.rstrip('/')}/{encoded_key}?{query}"
        return PayrollArtifactSignedUrl(url=url, expires_at=expires_at, strategy_ref=profile.download_strategy_ref)


class ObjectStoreSdkPayrollArtifactStorageAdapter:
    """Runtime object-store adapter with lazy SDK imports and injectable clients."""

    supports_signed_url = True

    def __init__(self, provider_ref: str, provider_family: str):
        self.provider_ref = provider_ref
        self.provider_family = provider_family
        self.download_strategy_ref = OBJECT_STORE_PROVIDER_FAMILIES[provider_family]["download_strategy_ref"]

    def _profile(self, config: dict[str, Any]) -> PayrollArtifactStorageProfile:
        profile_config = config.get("storage_profile") if isinstance(config.get("storage_profile"), dict) else config
        return normalize_payroll_artifact_storage_profile(self.provider_ref, profile_config)

    def _contract_adapter(self) -> ObjectStoreContractPayrollArtifactStorageAdapter:
        return ObjectStoreContractPayrollArtifactStorageAdapter(self.provider_ref, self.provider_family)

    def _credential(self, profile: PayrollArtifactStorageProfile) -> PayrollArtifactStorageCredential:
        return resolve_payroll_artifact_storage_credential(profile.credential_ref, provider_family=profile.provider_family)

    def _client(self, profile: PayrollArtifactStorageProfile, credential: PayrollArtifactStorageCredential):
        factory = _client_factory_for_profile(profile)
        if factory:
            return factory(profile=profile, credential=credential)
        if profile.provider_family == "s3":
            return self._s3_client(profile, credential)
        if profile.provider_family == "gcs":
            return self._gcs_client(profile, credential)
        if profile.provider_family == "azure":
            return self._azure_client(profile, credential)
        raise PayrollArtifactStorageError(
            f"Payroll storage provider family {profile.provider_family} is not supported.",
            code="unsupported_storage_adapter",
            provider_ref=profile.provider_ref,
        )

    def _s3_client(self, profile: PayrollArtifactStorageProfile, credential: PayrollArtifactStorageCredential):
        try:
            import boto3
        except ImportError as exc:
            raise PayrollArtifactStorageError(
                "Payroll S3 storage requires boto3 to be installed.",
                code="storage_sdk_not_installed",
                provider_ref=profile.provider_ref,
            ) from exc
        kwargs: dict[str, Any] = {}
        if profile.region:
            kwargs["region_name"] = profile.region
        if profile.endpoint_url:
            kwargs["endpoint_url"] = profile.endpoint_url
        material = credential.material
        if not credential.use_default_credentials:
            if material.get("access_key_id") or material.get("access_key"):
                kwargs["aws_access_key_id"] = material.get("access_key_id") or material.get("access_key")
            if material.get("secret_access_key") or material.get("secret_key"):
                kwargs["aws_secret_access_key"] = material.get("secret_access_key") or material.get("secret_key")
            if material.get("session_token") or material.get("token"):
                kwargs["aws_session_token"] = material.get("session_token") or material.get("token")
        return boto3.client("s3", **kwargs)

    def _gcs_client(self, profile: PayrollArtifactStorageProfile, credential: PayrollArtifactStorageCredential):
        try:
            from google.cloud import storage as gcs_storage
        except ImportError as exc:
            raise PayrollArtifactStorageError(
                "Payroll GCS storage requires google-cloud-storage to be installed.",
                code="storage_sdk_not_installed",
                provider_ref=profile.provider_ref,
            ) from exc
        material = credential.material
        if credential.use_default_credentials:
            return gcs_storage.Client(project=profile.project_ref or None)
        if material.get("service_account_info"):
            return gcs_storage.Client.from_service_account_info(material["service_account_info"], project=profile.project_ref or None)
        if material.get("service_account_json"):
            service_account_info = json.loads(material["service_account_json"])
            return gcs_storage.Client.from_service_account_info(service_account_info, project=profile.project_ref or None)
        raise PayrollArtifactStorageError(
            f"Payroll GCS credential_ref {credential.credential_ref} requires service account material or default credentials.",
            code="credential_material_incomplete",
            provider_ref=profile.provider_ref,
        )

    def _azure_client(self, profile: PayrollArtifactStorageProfile, credential: PayrollArtifactStorageCredential):
        try:
            from azure.storage.blob import BlobServiceClient
        except ImportError as exc:
            raise PayrollArtifactStorageError(
                "Payroll Azure Blob storage requires azure-storage-blob to be installed.",
                code="storage_sdk_not_installed",
                provider_ref=profile.provider_ref,
            ) from exc
        material = credential.material
        if material.get("connection_string"):
            return BlobServiceClient.from_connection_string(material["connection_string"])
        account_url = profile.endpoint_url or f"https://{profile.account_name}.blob.core.windows.net"
        credential_value = None if credential.use_default_credentials else (
            material.get("account_key")
            or material.get("sas_token")
            or material.get("credential")
        )
        return BlobServiceClient(account_url=account_url, credential=credential_value)

    def store(self, *, storage_key: str, payload: PayrollArtifactPayload, config: dict[str, Any]) -> PayrollArtifactStorageResult:
        profile = self._profile(config)
        if profile.contract_test_mode:
            return self._contract_adapter().store(storage_key=storage_key, payload=payload, config=config)
        credential = self._credential(profile)
        validate_payroll_artifact_storage_policy(profile, storage_key=storage_key, payload=payload, credential=credential)
        client = self._client(profile, credential)
        if profile.provider_family == "s3":
            response = client.put_object(
                Bucket=profile.bucket_name,
                Key=storage_key,
                Body=payload.payload_bytes,
                ContentType=payload.content_type,
                Metadata={
                    "checksum-sha256": payload.checksum_sha256,
                    "credential-ref": credential.credential_ref,
                },
            )
            version = str(response.get("VersionId") or response.get("ETag") or payload.checksum_sha256[:32]).strip('"')
        elif profile.provider_family == "gcs":
            bucket = client.bucket(profile.bucket_name)
            blob = bucket.blob(storage_key)
            blob.upload_from_string(payload.payload_bytes, content_type=payload.content_type)
            version = str(getattr(blob, "generation", "") or getattr(blob, "metageneration", "") or payload.checksum_sha256[:32])
        else:
            blob_client = client.get_blob_client(container=profile.container_name, blob=storage_key)
            response = blob_client.upload_blob(payload.payload_bytes, overwrite=True, content_type=payload.content_type)
            version = str(getattr(response, "version_id", "") or getattr(response, "etag", "") or payload.checksum_sha256[:32]).strip('"')
        return PayrollArtifactStorageResult(
            storage_provider_ref=self.provider_ref,
            storage_key=storage_key,
            storage_object_version=f"{profile.provider_family}-{version}",
            download_strategy_ref=profile.download_strategy_ref,
            supports_signed_url=self.supports_signed_url,
            signed_url_expires_in_seconds=profile.signed_url_expires_in_seconds,
            file_size_bytes=payload.file_size_bytes,
            checksum_sha256=payload.checksum_sha256,
            file_payload="",
        )

    def read(self, artifact) -> PayrollArtifactReadResult:
        profile = storage_profile_from_artifact(artifact)
        if profile.contract_test_mode and artifact.file_payload:
            return self._contract_adapter().read(artifact)
        credential = self._credential(profile)
        validate_payroll_artifact_storage_policy(profile, storage_key=artifact.storage_key, credential=credential)
        client = self._client(profile, credential)
        if profile.provider_family == "s3":
            response = client.get_object(Bucket=profile.bucket_name, Key=artifact.storage_key)
            payload = _read_stream(response.get("Body"))
            content_type = response.get("ContentType") or artifact.mime_type or artifact.content_type or "application/octet-stream"
        elif profile.provider_family == "gcs":
            bucket = client.bucket(profile.bucket_name)
            blob = bucket.blob(artifact.storage_key)
            payload = blob.download_as_bytes()
            content_type = getattr(blob, "content_type", "") or artifact.mime_type or artifact.content_type or "application/octet-stream"
        else:
            blob_client = client.get_blob_client(container=profile.container_name, blob=artifact.storage_key)
            downloader = blob_client.download_blob()
            payload = downloader.readall()
            content_type = artifact.mime_type or artifact.content_type or "application/octet-stream"
        return PayrollArtifactReadResult(
            payload=payload,
            checksum_sha256=hashlib.sha256(payload).hexdigest(),
            content_type=content_type,
            file_name=artifact.file_name or "payroll-artifact.txt",
        )

    def signed_url(self, artifact, *, expires_in_seconds: int) -> PayrollArtifactSignedUrl | None:
        profile = storage_profile_from_artifact(artifact)
        if profile.contract_test_mode:
            return self._contract_adapter().signed_url(artifact, expires_in_seconds=expires_in_seconds)
        credential = self._credential(profile)
        validate_payroll_artifact_storage_policy(profile, storage_key=artifact.storage_key, credential=credential)
        client = self._client(profile, credential)
        expires_at = timezone.now() + timedelta(seconds=expires_in_seconds)
        if profile.provider_family == "s3":
            url = client.generate_presigned_url(
                "get_object",
                Params={"Bucket": profile.bucket_name, "Key": artifact.storage_key},
                ExpiresIn=expires_in_seconds,
            )
        elif profile.provider_family == "gcs":
            bucket = client.bucket(profile.bucket_name)
            blob = bucket.blob(artifact.storage_key)
            url = blob.generate_signed_url(expiration=timedelta(seconds=expires_in_seconds), method="GET")
        else:
            try:
                from azure.storage.blob import BlobSasPermissions, generate_blob_sas
            except ImportError as exc:
                raise PayrollArtifactStorageError(
                    "Payroll Azure signed URLs require azure-storage-blob to be installed.",
                    code="storage_sdk_not_installed",
                    provider_ref=profile.provider_ref,
                ) from exc
            account_key = credential.material.get("account_key")
            if not account_key:
                raise PayrollArtifactStorageError(
                    f"Payroll Azure credential_ref {credential.credential_ref} requires account_key for signed URL generation.",
                    code="credential_material_incomplete",
                    provider_ref=profile.provider_ref,
                )
            sas_token = generate_blob_sas(
                account_name=profile.account_name,
                container_name=profile.container_name,
                blob_name=artifact.storage_key,
                account_key=account_key,
                permission=BlobSasPermissions(read=True),
                expiry=expires_at,
            )
            host = profile.endpoint_url or f"https://{profile.account_name}.blob.core.windows.net/{profile.container_name}"
            url = f"{host.rstrip('/')}/{quote(artifact.storage_key, safe='/')}?{sas_token}"
        return PayrollArtifactSignedUrl(url=url, expires_at=expires_at, strategy_ref=profile.download_strategy_ref)


class PlaceholderSignedUrlPayrollArtifactStorageAdapter(LocalGeneratedPayrollArtifactStorageAdapter):
    """Local test adapter that exercises signed-url metadata without an external object store."""

    provider_ref = "payroll.storage.signed_url.placeholder.v1"
    download_strategy_ref = DEFAULT_SIGNED_DOWNLOAD_STRATEGY_REF
    supports_signed_url = True

    def signed_url(self, artifact, *, expires_in_seconds: int) -> PayrollArtifactSignedUrl | None:
        expires_at = timezone.now() + timedelta(seconds=expires_in_seconds)
        return PayrollArtifactSignedUrl(
            url=f"/api/v1/hr-admin/payroll-output-artifacts/{artifact.id}/download/?signature=placeholder",
            expires_at=expires_at,
            strategy_ref=self.download_strategy_ref,
        )


_ADAPTERS: dict[str, PayrollArtifactStorageAdapter] = {
    DEFAULT_STORAGE_PROVIDER_REF: LocalGeneratedPayrollArtifactStorageAdapter(),
    "local": LocalGeneratedPayrollArtifactStorageAdapter(),
    "payroll.storage.signed_url.placeholder.v1": PlaceholderSignedUrlPayrollArtifactStorageAdapter(),
}


def get_payroll_artifact_storage_adapter(provider_ref: str | None) -> PayrollArtifactStorageAdapter:
    key = provider_ref or DEFAULT_STORAGE_PROVIDER_REF
    adapter = _ADAPTERS.get(key)
    if adapter:
        return adapter
    family = _provider_family(key)
    if family in OBJECT_STORE_PROVIDER_FAMILIES:
        return ObjectStoreSdkPayrollArtifactStorageAdapter(key, family)
    raise PayrollArtifactStorageError(
        f"Payroll storage adapter {key} is not supported.",
        code="unsupported_storage_adapter",
        provider_ref=key,
    )


def store_payroll_artifact_payload(
    *,
    storage_provider_ref: str,
    storage_key: str,
    file_name: str,
    content_type: str,
    payload: str,
    config: dict[str, Any] | None = None,
) -> PayrollArtifactStorageResult:
    adapter = get_payroll_artifact_storage_adapter(storage_provider_ref)
    artifact_payload = PayrollArtifactPayload(file_name=file_name, content_type=content_type, payload=payload)
    return adapter.store(storage_key=storage_key, payload=artifact_payload, config=config or {})


def read_payroll_artifact_payload(artifact) -> PayrollArtifactReadResult:
    adapter = get_payroll_artifact_storage_adapter(artifact.storage_provider_ref)
    result = adapter.read(artifact)
    if artifact.checksum_sha256 and result.checksum_sha256 != artifact.checksum_sha256:
        raise PayrollArtifactStorageError("Payroll artifact checksum verification failed.")
    return result


def get_payroll_artifact_signed_url(artifact) -> PayrollArtifactSignedUrl | None:
    try:
        adapter = get_payroll_artifact_storage_adapter(artifact.storage_provider_ref)
    except PayrollArtifactStorageError:
        return None
    if not adapter.supports_signed_url:
        return None
    expires_in = artifact.signed_url_expires_in_seconds or DEFAULT_SIGNED_URL_EXPIRY_SECONDS
    try:
        return adapter.signed_url(artifact, expires_in_seconds=expires_in)
    except PayrollArtifactStorageError:
        return None
