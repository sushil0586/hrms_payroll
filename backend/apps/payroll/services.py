"""Safe payroll rule evaluation services."""

from __future__ import annotations

import ast
import base64
import csv
import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from io import StringIO
from typing import Any
from urllib.parse import urlencode

from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from apps.notifications.models import NotificationChannel, NotificationStatus
from apps.notifications.services import trigger_notification_event
from apps.payroll.models import (
    EmployeeStatutoryDeclaration,
    EmployeeStatutoryDeclarationItem,
    PayrollCalculationLine,
    PayrollCalculationLineSource,
    PayrollCalculationLineStatus,
    PayrollCalculationStatus,
    PayrollConfigStatus,
    PayrollAdjustment,
    PayrollAdjustmentDirection,
    PayrollAdjustmentStatus,
    PayrollApprovalStatus,
    PayrollArtifactAccessEvent,
    PayrollArtifactAccessEventStatus,
    PayrollArtifactAccessEventType,
    PayrollArtifactSignedAccessGrant,
    PayrollArtifactSignedAccessGrantStatus,
    PayrollExceptionSeverity,
    PayrollExceptionStatus,
    PayrollFinanceHandoff,
    PayrollFinanceHandoffStatus,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollOutputArtifact,
    PayrollOutputArtifactKind,
    PayrollOutputArtifactStatus,
    PayrollOutputBatch,
    PayrollOutputBatchStatus,
    PayrollProviderCallbackEvent,
    PayrollProviderCallbackEventStatus,
    PayrollProviderCertificationStatus,
    PayrollProviderCertificationRun,
    PayrollProviderCertificationRunStatus,
    PayrollProviderConnection,
    PayrollProviderConnectionKind,
    PayrollProviderConnectionStatus,
    PayrollProviderDelivery,
    PayrollProviderDeliveryStatus,
    PayrollProviderJob,
    PayrollProviderJobKind,
    PayrollProviderJobStatus,
    PayrollProviderLaunchRehearsal,
    PayrollProviderRetryEvent,
    PayrollProviderRetryEventStatus,
    PayrollProviderSchemaMappingSimulation,
    PayrollProviderSchemaMappingSimulationStatus,
    PayrollProviderSchemaMappingPack,
    PayrollProviderSchemaMappingPackStatus,
    PayrollReviewStatus,
    EmployeeStatutoryProfile,
    PayrollRuleVersion,
    PayrollRuleVersionStatus,
    PayrollRun,
    PayrollRunApproval,
    PayrollRunStatus,
    PayrollRunCalculation,
    PayrollRunException,
    PayrollRunReview,
    PayrollSettlement,
    PayrollSettlementLine,
    PayrollSettlementLineKind,
    PayrollSettlementStatus,
    PayrollStatutoryCalculationMethod,
    PayrollStatutoryComponent,
    PayrollStatutoryComponentKind,
    PayrollStatutoryContributionOwner,
    PayrollStatutoryDeclarationStatus,
    PayrollStatutoryFilingCalendar,
    PayrollStatutoryFilingStatus,
    PayrollStatutoryPack,
    PayrollStatutoryProofStatus,
    PayrollStatutorySlab,
    PayrollTaxRegime,
    PayrollValidationCategory,
    PayrollValidationIssue,
    PayrollValidationIssueStatus,
    PayrollValidationSeverity,
)
from apps.payroll.providers import (
    PAYROLL_PROVIDER_LAUNCH_READINESS_COMMAND_REF,
    PayrollProviderAdapterError,
    PayrollProviderSubmissionRequest,
    PayrollProviderSubmissionResult,
    describe_payroll_provider_launch_readiness_audit_pack,
    get_payroll_provider_adapter,
    normalize_payroll_provider_submission_request,
    resolve_payroll_provider_credential,
    validate_payroll_provider_adapter_request_contract,
    validate_payroll_provider_adapter_result_contract,
    validate_payroll_provider_route_config,
)
from apps.payroll.storage import (
    PayrollArtifactStorageError,
    normalize_payroll_artifact_storage_profile,
    store_payroll_artifact_payload,
)


class PayrollRuleEvaluationError(ValueError):
    """Raised when a payroll rule expression cannot be evaluated safely."""


class PayrollCalculationError(ValueError):
    """Raised when a payroll run cannot be calculated from its locked inputs."""


class PayrollAdjustmentError(ValueError):
    """Raised when a payroll adjustment transition is not allowed."""


class PayrollSettlementError(ValueError):
    """Raised when a payroll settlement transition is not allowed."""


class PayrollReviewError(ValueError):
    """Raised when a payroll run review transition is not allowed."""


class PayrollOutputError(ValueError):
    """Raised when payroll outputs cannot be generated or published."""


class PayrollFinanceHandoffError(ValueError):
    """Raised when payroll finance handoff generation or transmission is not allowed."""


class PayrollProviderCallbackError(ValueError):
    """Raised when provider callback ingestion fails validation or verification."""


class PayrollProviderSignatureAdapterError(ValueError):
    """Raised when provider callback signatures cannot be calculated."""


class PayrollProviderRetryError(ValueError):
    """Raised when provider delivery retry planning or execution is not allowed."""


class PayrollProviderJobError(ValueError):
    """Raised when provider queue jobs cannot be scheduled or executed."""


class PayrollProviderConnectionError(ValueError):
    """Raised when provider onboarding or certification cannot be updated."""


class PayrollProviderSchemaMappingPackError(ValueError):
    """Raised when provider schema mapping packs cannot be changed."""


def record_payroll_provider_launch_rehearsal(
    tenant,
    *,
    setup_payload: dict[str, Any],
    generated_by=None,
    generated_by_ref: str = PAYROLL_PROVIDER_LAUNCH_READINESS_COMMAND_REF,
    generated_at=None,
) -> PayrollProviderLaunchRehearsal:
    """Persist a tenant launch-readiness rehearsal from a sanitized setup snapshot."""

    generated_at = generated_at or timezone.now()
    audit_pack = describe_payroll_provider_launch_readiness_audit_pack(
        tenant_snapshot={
            "tenant_id": str(tenant.id),
            "tenant_code": tenant.code,
            "tenant_name": tenant.name,
            "tenant_status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
            "country_code": tenant.country_code,
            "timezone": tenant.timezone,
            "is_sandbox": tenant.is_sandbox,
            "go_live_at": tenant.go_live_at,
        },
        setup_payload=setup_payload,
        generated_at=generated_at,
        generated_by_ref=generated_by_ref,
    )
    return PayrollProviderLaunchRehearsal.objects.create(
        tenant=tenant,
        generated_by=generated_by,
        generated_by_ref=generated_by_ref,
        generated_at=generated_at,
        audit_pack_snapshot=audit_pack,
    )


@dataclass(frozen=True)
class PayrollProviderRetryWorkerResult:
    processed_events: list[PayrollProviderRetryEvent]
    executed_count: int
    skipped_count: int


@dataclass(frozen=True)
class PayrollProviderJobWorkerResult:
    processed_jobs: list[PayrollProviderJob]
    completed_count: int
    failed_count: int
    skipped_count: int
    dead_lettered_count: int
    recovered_count: int = 0


@dataclass(frozen=True)
class PayrollArtifactSignedAccessGrantIssue:
    grant: PayrollArtifactSignedAccessGrant
    signed_url: str
    token: str


ARTIFACT_MIME_TYPES = {
    PayrollOutputArtifactKind.PAYSLIP: "text/html",
    PayrollOutputArtifactKind.REGISTER: "text/csv",
    PayrollOutputArtifactKind.BANK_ADVICE: "text/csv",
    PayrollOutputArtifactKind.ACCOUNTING_EXPORT: "text/csv",
    PayrollOutputArtifactKind.STATUTORY_REPORT: "text/csv",
    PayrollOutputArtifactKind.PROVIDER_AUDIT_PACK: "application/json",
}

ARTIFACT_FILE_EXTENSIONS = {
    "application/json": "json",
    "text/csv": "csv",
    "text/html": "html",
}

FINANCE_ARTIFACT_KINDS = {
    PayrollOutputArtifactKind.BANK_ADVICE,
    PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
    PayrollOutputArtifactKind.STATUTORY_REPORT,
}
DEFAULT_ARTIFACT_ACCESS_PROFILE_REF = "payroll.artifact_access.profile.default.v1"


DEFAULT_PAYROLL_PROVIDER_CONNECTION_BLUEPRINTS = [
    {
        "provider_ref": "payroll.provider.bank.sandbox.v1",
        "provider_name": "Bank payout sandbox",
        "provider_kind": PayrollProviderConnectionKind.BANK,
        "environment_ref": "sandbox",
        "adapter_ref": "payroll.provider_adapter.bank.sandbox.v1",
        "sandbox_adapter_ref": "payroll.provider_adapter.bank.sandbox.v1",
        "channel_ref": "bank.sftp.channel.primary.v1",
        "credential_ref": "bank-sandbox-credential",
        "credential_profile_ref": "bank.credentials.sandbox.v1",
        "credential_required": True,
        "callback_profile_ref": "bank.sftp.callback.v1",
        "callback_verification_ref": "bank.sftp.callback.hmac.v1",
        "retry_policy_ref": "payroll.delivery.retry.bank.v1",
        "certification_profile_ref": "bank.neft.certification.v1",
    },
    {
        "provider_ref": "payroll.provider.accounting.sandbox.v1",
        "provider_name": "Accounting ledger sandbox",
        "provider_kind": PayrollProviderConnectionKind.ACCOUNTING,
        "environment_ref": "sandbox",
        "adapter_ref": "payroll.provider_adapter.accounting.sandbox.v1",
        "sandbox_adapter_ref": "payroll.provider_adapter.accounting.sandbox.v1",
        "channel_ref": "tally.import.channel.v1",
        "credential_ref": "",
        "credential_profile_ref": "tally.credentials.sandbox.v1",
        "credential_required": False,
        "callback_profile_ref": "tally.import.callback.manual.v1",
        "callback_verification_ref": "tally.import.audit.v1",
        "retry_policy_ref": "payroll.delivery.retry.standard.v1",
        "certification_profile_ref": "tally.import.certification.v1",
    },
    {
        "provider_ref": "clear-statutory.portal.v1",
        "provider_name": "Clear statutory sandbox",
        "provider_kind": PayrollProviderConnectionKind.STATUTORY,
        "environment_ref": "sandbox",
        "adapter_ref": "payroll.provider_adapter.statutory.sandbox.v1",
        "sandbox_adapter_ref": "payroll.provider_adapter.statutory.sandbox.v1",
        "channel_ref": "clear-statutory.api.challan.v1",
        "credential_ref": "clear-statutory-sandbox-credential",
        "credential_profile_ref": "clear-statutory.credentials.sandbox.v1",
        "credential_required": True,
        "callback_profile_ref": "clear-statutory.callback.v1",
        "callback_verification_ref": "clear-statutory.callback.hmac.v1",
        "retry_policy_ref": "payroll.delivery.retry.statutory.v1",
        "certification_profile_ref": "clear-statutory.pt.challan.receipt.v1",
    },
]

DEFAULT_PAYROLL_PROVIDER_CERTIFICATION_SCENARIOS = {
    PayrollProviderConnectionKind.BANK: [
        {
            "scenario_ref": "bank_advice_submission",
            "label": "Bank advice submission",
            "artifact_kind": PayrollOutputArtifactKind.BANK_ADVICE,
            "route_key": "bank_advice",
            "request_schema_ref": "payroll.provider_certification.bank_advice.request.v1",
            "response_schema_ref": "payroll.provider_certification.bank_advice.response.v1",
            "expected_provider_status": "submitted",
        },
        {
            "scenario_ref": "bank_callback_contract",
            "label": "Bank callback contract",
            "artifact_kind": PayrollOutputArtifactKind.BANK_ADVICE,
            "route_key": "bank_advice:callback",
            "request_schema_ref": "payroll.provider_certification.bank_callback.request.v1",
            "response_schema_ref": "payroll.provider_certification.bank_callback.response.v1",
            "expected_provider_status": "acknowledged",
        },
    ],
    PayrollProviderConnectionKind.ACCOUNTING: [
        {
            "scenario_ref": "accounting_export_submission",
            "label": "Accounting export submission",
            "artifact_kind": PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
            "route_key": "accounting_export",
            "request_schema_ref": "payroll.provider_certification.accounting_export.request.v1",
            "response_schema_ref": "payroll.provider_certification.accounting_export.response.v1",
            "expected_provider_status": "submitted",
        },
        {
            "scenario_ref": "accounting_audit_acknowledgement",
            "label": "Accounting audit acknowledgement",
            "artifact_kind": PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
            "route_key": "accounting_export:audit",
            "request_schema_ref": "payroll.provider_certification.accounting_audit.request.v1",
            "response_schema_ref": "payroll.provider_certification.accounting_audit.response.v1",
            "expected_provider_status": "acknowledged",
        },
    ],
    PayrollProviderConnectionKind.STATUTORY: [
        {
            "scenario_ref": "statutory_return_upload",
            "label": "Statutory return upload",
            "artifact_kind": PayrollOutputArtifactKind.STATUTORY_REPORT,
            "route_key": "statutory_report:statutory_return",
            "request_schema_ref": "payroll.provider_certification.statutory_return.request.v1",
            "response_schema_ref": "payroll.provider_certification.statutory_return.response.v1",
            "expected_provider_status": "submitted",
        },
        {
            "scenario_ref": "statutory_challan_receipt",
            "label": "Statutory challan receipt",
            "artifact_kind": PayrollOutputArtifactKind.STATUTORY_REPORT,
            "route_key": "statutory_report:statutory_challan",
            "request_schema_ref": "payroll.provider_certification.statutory_challan.request.v1",
            "response_schema_ref": "payroll.provider_certification.statutory_challan.response.v1",
            "expected_provider_status": "reconciled",
        },
        {
            "scenario_ref": "statutory_callback_replay_guard",
            "label": "Callback replay guard",
            "artifact_kind": PayrollOutputArtifactKind.STATUTORY_REPORT,
            "route_key": "statutory_report:callback_replay",
            "request_schema_ref": "payroll.provider_certification.statutory_callback.request.v1",
            "response_schema_ref": "payroll.provider_certification.statutory_callback.response.v1",
            "expected_provider_status": "acknowledged",
        },
    ],
}


def payroll_provider_connection_readiness_snapshot(connection: PayrollProviderConnection) -> dict[str, Any]:
    """Build deterministic onboarding gates for a provider connection."""

    certification_passed = connection.certification_status == PayrollProviderCertificationStatus.PASSED
    gates = [
        {
            "ref": "adapter_configured",
            "label": "Adapter configured",
            "passed": bool(connection.adapter_ref),
            "value": connection.adapter_ref,
        },
        {
            "ref": "channel_configured",
            "label": "Channel configured",
            "passed": bool(connection.channel_ref),
            "value": connection.channel_ref,
        },
        {
            "ref": "credential_reference_configured",
            "label": "Credential reference configured",
            "passed": bool(connection.credential_ref) if connection.credential_required else True,
            "value": connection.credential_ref or "not_required",
        },
        {
            "ref": "callback_contract_configured",
            "label": "Callback contract configured",
            "passed": bool(connection.callback_profile_ref and connection.callback_verification_ref),
            "value": connection.callback_verification_ref,
        },
        {
            "ref": "retry_policy_configured",
            "label": "Retry policy configured",
            "passed": bool(connection.retry_policy_ref),
            "value": connection.retry_policy_ref,
        },
        {
            "ref": "certification_passed",
            "label": "Certification passed",
            "passed": certification_passed,
            "value": connection.certification_status,
        },
    ]
    total = len(gates)
    passed = sum(1 for gate in gates if gate["passed"])
    active_allowed = passed == total
    return {
        "provider_ref": connection.provider_ref,
        "provider_kind": connection.provider_kind,
        "environment_ref": connection.environment_ref,
        "readiness_profile_ref": f"payroll.provider_connection.{connection.provider_kind}.readiness.v1",
        "gates": gates,
        "ready_gate_count": passed,
        "total_gate_count": total,
        "blocking_gate_refs": [gate["ref"] for gate in gates if not gate["passed"]],
        "active_allowed": active_allowed,
        "credential_required": connection.credential_required,
        "uses_credential_ref": bool(connection.credential_ref),
        "updated_at": timezone.now().isoformat(),
    }


def sync_payroll_provider_connection_readiness(connection: PayrollProviderConnection) -> PayrollProviderConnection:
    connection.readiness_snapshot = payroll_provider_connection_readiness_snapshot(connection)
    if connection.status == PayrollProviderConnectionStatus.DRAFT and connection.readiness_snapshot["ready_gate_count"] >= 4:
        connection.status = PayrollProviderConnectionStatus.CONFIGURED
    if connection.status == PayrollProviderConnectionStatus.CONFIGURED and connection.sandbox_adapter_ref:
        connection.status = PayrollProviderConnectionStatus.SANDBOX_READY
    if (
        connection.status == PayrollProviderConnectionStatus.SANDBOX_READY
        and connection.certification_status == PayrollProviderCertificationStatus.PASSED
    ):
        connection.status = PayrollProviderConnectionStatus.CERTIFIED
    connection.save(update_fields=["status", "readiness_snapshot", "updated_at"])
    return connection


def record_payroll_provider_connection_certification(
    connection: PayrollProviderConnection,
    *,
    certification_status: str,
    evidence_snapshot: dict[str, Any] | None = None,
    tested_by=None,
) -> PayrollProviderConnection:
    if certification_status not in PayrollProviderCertificationStatus.values:
        raise PayrollProviderConnectionError("Unsupported payroll provider certification status.")
    evidence = evidence_snapshot if isinstance(evidence_snapshot, dict) else {}
    now = timezone.now()
    material = json.dumps(evidence, sort_keys=True, default=str)
    connection.certification_status = certification_status
    connection.last_tested_at = now
    connection.last_tested_by = tested_by
    if certification_status == PayrollProviderCertificationStatus.PASSED:
        connection.certified_at = now
        connection.certified_by = tested_by
        if connection.status in {
            PayrollProviderConnectionStatus.DRAFT,
            PayrollProviderConnectionStatus.CONFIGURED,
            PayrollProviderConnectionStatus.SANDBOX_READY,
            PayrollProviderConnectionStatus.BLOCKED,
        }:
            connection.status = PayrollProviderConnectionStatus.CERTIFIED
    elif certification_status == PayrollProviderCertificationStatus.FAILED:
        connection.status = PayrollProviderConnectionStatus.BLOCKED
    connection.certification_snapshot = {
        **(connection.certification_snapshot if isinstance(connection.certification_snapshot, dict) else {}),
        "latest_result": certification_status,
        "certification_profile_ref": connection.certification_profile_ref,
        "provider_ref": connection.provider_ref,
        "adapter_ref": connection.adapter_ref,
        "channel_ref": connection.channel_ref,
        "tested_at": now.isoformat(),
        "tested_by": str(tested_by) if tested_by else "",
        "evidence_snapshot": evidence,
        "evidence_hash": hashlib.sha256(material.encode("utf-8")).hexdigest(),
    }
    connection.readiness_snapshot = payroll_provider_connection_readiness_snapshot(connection)
    connection.save()
    return connection


def payroll_provider_connection_certification_scenarios(connection: PayrollProviderConnection) -> list[dict[str, Any]]:
    """Resolve certification scenarios from tenant config with provider-kind defaults."""

    config = connection.config_snapshot if isinstance(connection.config_snapshot, dict) else {}
    configured = config.get("certification_scenarios")
    if isinstance(configured, list) and configured:
        scenarios = configured
    else:
        scenarios = DEFAULT_PAYROLL_PROVIDER_CERTIFICATION_SCENARIOS.get(
            connection.provider_kind,
            DEFAULT_PAYROLL_PROVIDER_CERTIFICATION_SCENARIOS[PayrollProviderConnectionKind.BANK],
        )
    normalized: list[dict[str, Any]] = []
    for index, scenario in enumerate(scenarios, start=1):
        if not isinstance(scenario, dict):
            continue
        scenario_ref = str(scenario.get("scenario_ref") or f"scenario_{index}")
        artifact_kind = str(scenario.get("artifact_kind") or _default_certification_artifact_kind(connection))
        normalized.append(
            {
                **scenario,
                "scenario_ref": scenario_ref,
                "label": str(scenario.get("label") or scenario_ref.replace("_", " ").title()),
                "artifact_kind": artifact_kind,
                "route_key": str(scenario.get("route_key") or artifact_kind),
                "request_schema_ref": str(
                    scenario.get("request_schema_ref") or f"payroll.provider_certification.{scenario_ref}.request.v1"
                ),
                "response_schema_ref": str(
                    scenario.get("response_schema_ref") or f"payroll.provider_certification.{scenario_ref}.response.v1"
                ),
                "expected_provider_status": str(scenario.get("expected_provider_status") or "submitted"),
                "submission_profile_ref": str(scenario.get("submission_profile_ref") or connection.certification_profile_ref),
            }
        )
    return normalized


def _default_certification_artifact_kind(connection: PayrollProviderConnection) -> str:
    if connection.provider_kind == PayrollProviderConnectionKind.ACCOUNTING:
        return PayrollOutputArtifactKind.ACCOUNTING_EXPORT
    if connection.provider_kind == PayrollProviderConnectionKind.STATUTORY:
        return PayrollOutputArtifactKind.STATUTORY_REPORT
    return PayrollOutputArtifactKind.BANK_ADVICE


def _certification_preflight_blockers(connection: PayrollProviderConnection) -> list[dict[str, Any]]:
    readiness = payroll_provider_connection_readiness_snapshot(connection)
    blockers = []
    for gate in readiness.get("gates", []):
        if isinstance(gate, dict) and gate.get("ref") != "certification_passed" and not gate.get("passed"):
            blockers.append(
                {
                    "ref": gate.get("ref"),
                    "label": gate.get("label"),
                    "value": gate.get("value"),
                }
            )
    adapter_ref = connection.sandbox_adapter_ref or connection.adapter_ref
    if not adapter_ref:
        blockers.append({"ref": "sandbox_adapter_required", "label": "Sandbox adapter required", "value": ""})
    return blockers


def _certification_payload_checksum(connection: PayrollProviderConnection, scenario: dict[str, Any]) -> str:
    payload = {
        "tenant_id": str(connection.tenant_id),
        "provider_ref": connection.provider_ref,
        "provider_kind": connection.provider_kind,
        "environment_ref": connection.environment_ref,
        "scenario_ref": scenario["scenario_ref"],
        "artifact_kind": scenario["artifact_kind"],
        "route_key": scenario["route_key"],
        "certification_profile_ref": connection.certification_profile_ref,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def _build_certification_submission_request(
    connection: PayrollProviderConnection,
    run: PayrollProviderCertificationRun,
    scenario: dict[str, Any],
) -> PayrollProviderSubmissionRequest:
    adapter_ref = connection.sandbox_adapter_ref or connection.adapter_ref
    checksum = _certification_payload_checksum(connection, scenario)
    scenario_ref = scenario["scenario_ref"]
    sandbox_response = scenario.get("sandbox_response") if isinstance(scenario.get("sandbox_response"), dict) else {}
    provider_status = str(sandbox_response.get("provider_status") or scenario["expected_provider_status"])
    route_snapshot = {
        "route_key": scenario["route_key"],
        "provider_ref": connection.provider_ref,
        "provider_kind": connection.provider_kind,
        "adapter_ref": adapter_ref,
        "channel_ref": connection.channel_ref,
        "credential_ref": connection.credential_ref,
        "credential_required": connection.credential_required,
        "credential_profile_ref": connection.credential_profile_ref,
        "callback_profile_ref": connection.callback_profile_ref,
        "callback_verification_ref": connection.callback_verification_ref,
        "retry_policy_ref": connection.retry_policy_ref,
        "certification_profile_ref": connection.certification_profile_ref,
        "certification_run_id": str(run.id),
        "certification_scenario_ref": scenario_ref,
        "adapter_contract": {
            **(scenario.get("adapter_contract") if isinstance(scenario.get("adapter_contract"), dict) else {}),
            "contract_profile_ref": str(
                (scenario.get("adapter_contract") if isinstance(scenario.get("adapter_contract"), dict) else {}).get("contract_profile_ref")
                or f"payroll.provider_contract.{scenario['artifact_kind']}.certification_adapter.v1"
            ),
            "enforcement_mode": str(
                (scenario.get("adapter_contract") if isinstance(scenario.get("adapter_contract"), dict) else {}).get("enforcement_mode")
                or "strict"
            ),
            "expected_adapter_ref": adapter_ref,
            "expected_provider_ref": connection.provider_ref,
            "response_snapshot_required_fields": (
                (scenario.get("adapter_contract") if isinstance(scenario.get("adapter_contract"), dict) else {}).get("response_snapshot_required_fields")
                or ["adapter_ref", "response_schema_ref", "domain_contract_ref"]
            ),
        },
        "sandbox_response": {
            "provider_status": provider_status,
            "provider_batch_ref": str(sandbox_response.get("provider_batch_ref") or f"CERT-{checksum[:16]}"),
            "external_reference": str(sandbox_response.get("external_reference") or f"CERT-{scenario_ref}-{checksum[:10]}"),
            "certification_evidence_refs": sandbox_response.get(
                "certification_evidence_refs",
                [f"sandbox://{connection.provider_kind}/{scenario_ref}/{checksum[:12]}"],
            ),
            "failure_code": str(sandbox_response.get("failure_code") or ""),
            "failure_reason": str(sandbox_response.get("failure_reason") or ""),
            "retryable": bool(sandbox_response.get("retryable", False)),
        },
    }
    validate_payroll_provider_route_config(route_snapshot)
    return PayrollProviderSubmissionRequest(
        tenant_id=str(connection.tenant_id),
        delivery_id=f"certification:{run.id}:{scenario_ref}",
        handoff_id="",
        output_artifact_id="",
        artifact_kind=scenario["artifact_kind"],
        provider_ref=connection.provider_ref,
        channel_ref=connection.channel_ref,
        adapter_ref=adapter_ref,
        submission_mode="sandbox_certification",
        submission_profile_ref=scenario["submission_profile_ref"],
        request_schema_ref=scenario["request_schema_ref"],
        response_schema_ref=scenario["response_schema_ref"],
        callback_profile_ref=connection.callback_profile_ref,
        callback_verification_ref=connection.callback_verification_ref,
        idempotency_key=hashlib.sha256(f"{run.id}:{scenario_ref}:{checksum}".encode("utf-8")).hexdigest(),
        external_reference=f"CERT-{scenario_ref}-{checksum[:10]}",
        payload_checksum_sha256=checksum,
        artifact_snapshot={
            "file_name": f"{scenario_ref}.{ARTIFACT_FILE_EXTENSIONS.get(ARTIFACT_MIME_TYPES.get(scenario['artifact_kind'], 'text/csv'), 'csv')}",
            "storage_provider_ref": "payroll.certification.synthetic.v1",
            "storage_key": f"certification/{connection.provider_ref}/{scenario_ref}",
            "storage_object_version": "synthetic-v1",
            "download_strategy_ref": "payroll.certification.synthetic_download.v1",
            "mime_type": ARTIFACT_MIME_TYPES.get(scenario["artifact_kind"], "text/csv"),
            "file_size_bytes": 0,
            "checksum_sha256": checksum,
        },
        route_snapshot=route_snapshot,
        credential_snapshot={
            "credential_ref": connection.credential_ref,
            "credential_profile_ref": connection.credential_profile_ref,
            "provider_ref": connection.provider_ref,
            "required": connection.credential_required,
            "resolved": bool(connection.credential_ref),
            "source_ref": "payroll_provider_connection",
        },
    )


def run_payroll_provider_connection_certification(
    connection: PayrollProviderConnection,
    *,
    requested_by=None,
    executed_by=None,
    scenario_refs: list[str] | None = None,
) -> PayrollProviderCertificationRun:
    """Execute configured sandbox certification scenarios and update connection evidence."""

    connection = sync_payroll_provider_connection_readiness(connection)
    requested_refs = {str(item) for item in scenario_refs or [] if str(item).strip()}
    scenarios = payroll_provider_connection_certification_scenarios(connection)
    if requested_refs:
        scenarios = [scenario for scenario in scenarios if scenario["scenario_ref"] in requested_refs]
    if not scenarios:
        raise PayrollProviderConnectionError("No provider certification scenarios are configured for this connection.")

    config = connection.config_snapshot if isinstance(connection.config_snapshot, dict) else {}
    run = PayrollProviderCertificationRun.objects.create(
        tenant=connection.tenant,
        provider_connection=connection,
        provider_ref=connection.provider_ref,
        provider_kind=connection.provider_kind,
        environment_ref=connection.environment_ref,
        run_profile_ref=str(config.get("certification_run_profile_ref") or "payroll.provider_connection.certification_run.sandbox.v1"),
        certification_profile_ref=connection.certification_profile_ref,
        scenario_profile_ref=str(
            config.get("certification_scenario_profile_ref")
            or f"payroll.provider_connection.{connection.provider_kind}.certification_scenarios.v1"
        ),
        status=PayrollProviderCertificationRunStatus.RUNNING,
        scenario_count=len(scenarios),
        requested_by=requested_by,
        executed_by=executed_by or requested_by,
        started_at=timezone.now(),
        request_snapshot={
            "provider_ref": connection.provider_ref,
            "adapter_ref": connection.adapter_ref,
            "sandbox_adapter_ref": connection.sandbox_adapter_ref,
            "channel_ref": connection.channel_ref,
            "credential_ref": connection.credential_ref,
            "credential_required": connection.credential_required,
            "certification_profile_ref": connection.certification_profile_ref,
            "scenario_refs": [scenario["scenario_ref"] for scenario in scenarios],
        },
    )

    preflight_blockers = _certification_preflight_blockers(connection)
    scenario_results: list[dict[str, Any]] = []
    if preflight_blockers:
        run.status = PayrollProviderCertificationRunStatus.FAILED
        run.failed_count = len(scenarios)
        run.blocker_count = len(preflight_blockers)
        run.completed_at = timezone.now()
        run.error_snapshot = {"preflight_blockers": preflight_blockers}
        run.evidence_snapshot = {
            "test_pack_ref": run.scenario_profile_ref,
            "provider_ref": connection.provider_ref,
            "scenario_results": scenario_results,
            "blocking_gate_refs": [item["ref"] for item in preflight_blockers],
        }
        run.save()
        record_payroll_provider_connection_certification(
            connection,
            certification_status=PayrollProviderCertificationStatus.FAILED,
            evidence_snapshot={**run.evidence_snapshot, "certification_run_id": str(run.id)},
            tested_by=run.executed_by,
        )
        return run

    adapter_ref = connection.sandbox_adapter_ref or connection.adapter_ref
    adapter = get_payroll_provider_adapter(adapter_ref)
    for scenario in scenarios:
        try:
            request = _build_certification_submission_request(connection, run, scenario)
            request_contract_validation = validate_payroll_provider_adapter_request_contract(request)
            result = adapter.submit(request)
            result_contract_validation = validate_payroll_provider_adapter_result_contract(request, result)
            expected_status = scenario["expected_provider_status"]
            passed = result.provider_status == expected_status
            scenario_results.append(
                {
                    "scenario_ref": scenario["scenario_ref"],
                    "label": scenario["label"],
                    "status": "passed" if passed else "failed",
                    "artifact_kind": scenario["artifact_kind"],
                    "route_key": scenario["route_key"],
                    "expected_provider_status": expected_status,
                    "provider_status": result.provider_status,
                    "adapter_ref": request.adapter_ref,
                    "channel_ref": request.channel_ref,
                    "request_schema_ref": request.request_schema_ref,
                    "response_schema_ref": request.response_schema_ref,
                    "adapter_contract_validation": {
                        "request": request_contract_validation,
                        "result": result_contract_validation,
                    },
                    "payload_checksum_sha256": request.payload_checksum_sha256,
                    "provider_batch_ref": result.provider_batch_ref,
                    "external_reference": result.external_reference,
                    "certification_evidence_refs": result.certification_evidence_refs,
                    "response_snapshot": result.response_snapshot,
                    "failure_code": result.failure_code,
                    "failure_reason": result.failure_reason,
                    "retryable": result.retryable,
                }
            )
        except PayrollProviderAdapterError as exc:
            scenario_results.append(
                {
                    "scenario_ref": scenario["scenario_ref"],
                    "label": scenario["label"],
                    "status": "failed",
                    "artifact_kind": scenario["artifact_kind"],
                    "route_key": scenario["route_key"],
                    "expected_provider_status": scenario["expected_provider_status"],
                    "provider_status": "adapter_error",
                    "adapter_ref": adapter_ref,
                    "failure_code": exc.code,
                    "failure_reason": str(exc),
                    "retryable": exc.retryable,
                }
            )

    passed_count = sum(1 for item in scenario_results if item["status"] == "passed")
    failed_count = len(scenario_results) - passed_count
    completed_at = timezone.now()
    final_status = (
        PayrollProviderCertificationRunStatus.PASSED
        if failed_count == 0 and passed_count == len(scenarios)
        else PayrollProviderCertificationRunStatus.FAILED
    )
    evidence_refs = [
        ref
        for item in scenario_results
        for ref in item.get("certification_evidence_refs", [])
        if ref
    ]
    run.status = final_status
    run.passed_count = passed_count
    run.failed_count = failed_count
    run.blocker_count = failed_count
    run.completed_at = completed_at
    run.response_snapshot = {
        "adapter_ref": adapter_ref,
        "provider_ref": connection.provider_ref,
        "scenario_count": len(scenario_results),
        "passed_count": passed_count,
        "failed_count": failed_count,
    }
    run.evidence_snapshot = {
        "test_pack_ref": run.scenario_profile_ref,
        "provider_ref": connection.provider_ref,
        "provider_kind": connection.provider_kind,
        "environment_ref": connection.environment_ref,
        "certification_profile_ref": connection.certification_profile_ref,
        "sandbox_delivery_count": len(scenario_results),
        "callback_verified": any(
            "callback" in item["scenario_ref"] and item["status"] == "passed"
            for item in scenario_results
        ),
        "replay_guard_checked": any(
            "replay" in item["scenario_ref"] and item["status"] == "passed"
            for item in scenario_results
        ),
        "scenario_results": scenario_results,
        "evidence_refs": evidence_refs,
        "certification_run_id": str(run.id),
        "executed_at": completed_at.isoformat(),
    }
    if failed_count:
        run.error_snapshot = {
            "failed_scenario_refs": [item["scenario_ref"] for item in scenario_results if item["status"] == "failed"],
            "failure_reasons": [
                {
                    "scenario_ref": item["scenario_ref"],
                    "failure_code": item.get("failure_code", ""),
                    "failure_reason": item.get("failure_reason", ""),
                    "provider_status": item.get("provider_status", ""),
                }
                for item in scenario_results
                if item["status"] == "failed"
            ],
        }
    run.save()
    record_payroll_provider_connection_certification(
        connection,
        certification_status=PayrollProviderCertificationStatus.PASSED
        if final_status == PayrollProviderCertificationRunStatus.PASSED
        else PayrollProviderCertificationStatus.FAILED,
        evidence_snapshot=run.evidence_snapshot,
        tested_by=run.executed_by,
    )
    return run


def _default_provider_schema_mapping_transform_rules(artifact_kind: str) -> list[dict[str, Any]]:
    rules = [
        {
            "source_path": "provider_ref",
            "target_path": "provider.provider_ref",
            "required": True,
            "value_type": "string",
        },
        {
            "source_path": "external_reference",
            "target_path": "submission.external_reference",
            "required": True,
            "value_type": "string",
        },
        {
            "source_path": "idempotency_key",
            "target_path": "submission.idempotency_key",
            "required": True,
            "value_type": "string",
        },
        {
            "source_path": "artifact_snapshot.file_name",
            "target_path": "file.name",
            "required": True,
            "value_type": "string",
        },
        {
            "source_path": "artifact_snapshot.checksum_sha256",
            "target_path": "file.checksum_sha256",
            "required": True,
            "value_type": "string",
        },
        {
            "source_path": "artifact_snapshot.file_size_bytes",
            "target_path": "file.size_bytes",
            "required": True,
            "value_type": "integer",
        },
    ]
    if artifact_kind == PayrollOutputArtifactKind.BANK_ADVICE:
        rules.append({
            "source_path": "artifact_snapshot.totals_snapshot.net_pay",
            "target_path": "payment.total_amount",
            "required": True,
            "value_type": "decimal_string",
        })
    elif artifact_kind == PayrollOutputArtifactKind.ACCOUNTING_EXPORT:
        rules.append({
            "source_path": "artifact_snapshot.totals_snapshot.gross_earnings",
            "target_path": "ledger.gross_earnings",
            "required": False,
            "value_type": "decimal_string",
        })
    elif artifact_kind == PayrollOutputArtifactKind.STATUTORY_REPORT:
        rules.extend([
            {
                "source_path": "artifact_snapshot.config_snapshot.filing_type_ref",
                "target_path": "filing.filing_type_ref",
                "required": False,
                "value_type": "string",
            },
            {
                "source_path": "artifact_snapshot.config_snapshot.employer_registration_number",
                "target_path": "filing.employer_registration_number",
                "required": False,
                "value_type": "string",
            },
        ])
    return rules


def _default_provider_schema_mapping_validation_rules(artifact_kind: str) -> list[dict[str, Any]]:
    rules = [
        {"path": "provider.provider_ref", "required": True, "gate_ref": "provider_ref_mapped"},
        {"path": "submission.external_reference", "required": True, "gate_ref": "external_reference_mapped"},
        {"path": "submission.idempotency_key", "required": True, "gate_ref": "idempotency_key_mapped"},
        {"path": "file.name", "required": True, "gate_ref": "file_name_mapped"},
        {"path": "file.checksum_sha256", "required": True, "gate_ref": "file_checksum_mapped"},
    ]
    if artifact_kind == PayrollOutputArtifactKind.BANK_ADVICE:
        rules.append({"path": "payment.total_amount", "required": True, "gate_ref": "payment_total_mapped"})
    return rules


def ensure_default_payroll_provider_connections(tenant, *, created_by=None) -> list[PayrollProviderConnection]:
    connections: list[PayrollProviderConnection] = []
    for blueprint in DEFAULT_PAYROLL_PROVIDER_CONNECTION_BLUEPRINTS:
        connection, created = PayrollProviderConnection.objects.get_or_create(
            tenant=tenant,
            provider_ref=blueprint["provider_ref"],
            defaults={
                **blueprint,
                "status": PayrollProviderConnectionStatus.SANDBOX_READY,
                "certification_status": PayrollProviderCertificationStatus.PENDING,
                "config_snapshot": {
                    "source": "payroll_provider_connection_blueprint.v1",
                    "provider_route": {
                        "provider_ref": blueprint["provider_ref"],
                        "adapter_ref": blueprint["adapter_ref"],
                        "channel_ref": blueprint["channel_ref"],
                        "credential_ref": blueprint["credential_ref"],
                        "credential_required": blueprint["credential_required"],
                        "credential_profile_ref": blueprint["credential_profile_ref"],
                        "callback_profile_ref": blueprint["callback_profile_ref"],
                        "callback_verification_ref": blueprint["callback_verification_ref"],
                        "callback_security_policy": {
                            "security_policy_ref": f"payroll.callback_security.{blueprint['provider_kind']}.standard.v1",
                            "enforcement_mode": "warn",
                            "signature_algorithm_ref": PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ALGORITHM_REF,
                            "signature_adapter_ref": PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ADAPTER_REF,
                            "signature_material_fields": list(DEFAULT_PROVIDER_CALLBACK_SIGNATURE_MATERIAL_FIELDS),
                            "signature_key_ref": f"payroll.callback_signature_key.{blueprint['provider_kind']}.configured.v1",
                            "signature_key_resolution_mode": "reference",
                            "require_runtime_signature_key": False,
                            "signature_encoding": "hex",
                            "secret_rotation_ref": f"payroll.callback_secret_rotation.{blueprint['provider_kind']}.standard.v1",
                            "replay_window_seconds": 900,
                            "timestamp_required": False,
                            "source_ip_required": False,
                            "allowed_ip_refs": [f"payroll.provider_ip_allowlist.{blueprint['provider_kind']}.managed.v1"],
                            "rate_limit_policy_ref": f"payroll.callback_rate_limit.{blueprint['provider_kind']}.standard.v1",
                            "rate_limit_window_seconds": 60,
                            "rate_limit_max_events": 60,
                        },
                        "retry_policy_ref": blueprint["retry_policy_ref"],
                        "certification_profile_ref": blueprint["certification_profile_ref"],
                        "adapter_contract": {
                            "contract_profile_ref": f"payroll.provider_contract.{blueprint['provider_kind']}.sandbox_adapter.v1",
                            "enforcement_mode": "warn",
                            "expected_adapter_ref": blueprint["adapter_ref"],
                            "expected_provider_ref": blueprint["provider_ref"],
                            "response_snapshot_required_fields": ["adapter_ref", "response_schema_ref", "domain_contract_ref"],
                        },
                    },
                },
                "created_by": created_by,
                "updated_by": created_by,
            },
        )
        artifact_kind = {
            PayrollProviderConnectionKind.BANK: PayrollOutputArtifactKind.BANK_ADVICE,
            PayrollProviderConnectionKind.ACCOUNTING: PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
            PayrollProviderConnectionKind.STATUTORY: PayrollOutputArtifactKind.STATUTORY_REPORT,
        }.get(blueprint["provider_kind"], PayrollOutputArtifactKind.STATUTORY_REPORT)
        mapping_profile_ref = f"payroll.provider_mapping.{blueprint['provider_kind']}.{artifact_kind}.default.v1"
        PayrollProviderSchemaMappingPack.objects.get_or_create(
            tenant=tenant,
            mapping_profile_ref=mapping_profile_ref,
            version=1,
            defaults={
                "provider_connection": connection,
                "provider_ref": connection.provider_ref,
                "provider_kind": connection.provider_kind,
                "environment_ref": connection.environment_ref,
                "artifact_kind": artifact_kind,
                "status": PayrollProviderSchemaMappingPackStatus.ACTIVE,
                "source_schema_ref": f"payroll.internal.{artifact_kind}.submission.v1",
                "target_schema_ref": f"{connection.provider_ref}.{artifact_kind}.payload.v1",
                "enforcement_mode": "warn",
                "transform_rules": _default_provider_schema_mapping_transform_rules(artifact_kind),
                "validation_rules": _default_provider_schema_mapping_validation_rules(artifact_kind),
                "evidence_snapshot": {
                    "source": "payroll_provider_schema_mapping_blueprint.v1",
                    "provider_ref": connection.provider_ref,
                    "artifact_kind": artifact_kind,
                },
                "created_by": created_by,
                "updated_by": created_by,
            },
        )
        if created or not isinstance(connection.readiness_snapshot, dict) or not connection.readiness_snapshot:
            connection = sync_payroll_provider_connection_readiness(connection)
        connections.append(connection)
    return connections


PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_EXPORT_VERSION = "payroll.provider_schema_mapping_pack.export.v1"
PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_LIFECYCLE_PROFILE_REF = "payroll.provider_schema_mapping_pack.lifecycle.v1"
PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_SIMULATION_PROFILE_REF = "payroll.provider_schema_mapping_pack.simulation.v1"
PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_COMPARISON_PROFILE_REF = "payroll.provider_schema_mapping_pack.comparison.v1"
PAYROLL_PROVIDER_CALLBACK_SIGNATURE_PROFILE_REF = "payroll.provider_callback.signature.framework.v1"
PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ALGORITHM_REF = "payroll.callback.signature.sha256.v1"
PAYROLL_PROVIDER_CALLBACK_SIGNATURE_HMAC_SHA256_ALGORITHM_REF = "payroll.callback.signature.hmac_sha256_ref.v1"
PAYROLL_PROVIDER_CALLBACK_SIGNATURE_RSA_SHA256_ALGORITHM_REF = "payroll.callback.signature.rsa_sha256.v1"
PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ADAPTER_REF = "payroll.provider_signature_adapter.deterministic_sha256.v1"
PAYROLL_PROVIDER_CALLBACK_SIGNATURE_HMAC_SHA256_ADAPTER_REF = "payroll.provider_signature_adapter.hmac_sha256_ref.v1"
PAYROLL_PROVIDER_CALLBACK_SIGNATURE_RSA_SHA256_ADAPTER_REF = "payroll.provider_signature_adapter.rsa_sha256_public_key.v1"
PAYROLL_PROVIDER_AUDIT_PACK_PROFILE_REF = "payroll.provider_audit_pack.standard.v1"
PAYROLL_PROVIDER_AUDIT_PACK_SCHEMA_REF = "payroll.provider_audit_pack.schema.v1"
PAYROLL_PROVIDER_AUDIT_PACK_RETENTION_REF = "payroll.retention.provider_audit.10y.v1"
RAW_PAYROLL_AUDIT_PACK_KEYS = {
    "access_key",
    "access_key_id",
    "account_key",
    "api_key",
    "authorization",
    "bearer_token",
    "client_secret",
    "connection_string",
    "hmac_secret",
    "password",
    "private_key",
    "proxy_authorization",
    "secret",
    "secret_access_key",
    "secret_key",
    "signing_secret",
    "token",
    "webhook_secret",
    "x-api-key",
    "x-api-token",
}
DEFAULT_PROVIDER_CALLBACK_SIGNATURE_MATERIAL_FIELDS = [
    "provider_ref",
    "external_reference",
    "idempotency_key",
    "payload_checksum_sha256",
    "artifact_checksum_sha256",
    "callback_verification_ref",
]
DEFAULT_PROVIDER_CALLBACK_SIGNATURE_KEY_MATERIAL_FIELDS = [
    "signing_secret",
    "webhook_secret",
    "hmac_secret",
    "hmac_key",
    "secret",
    "key",
]
DEFAULT_PROVIDER_CALLBACK_PUBLIC_KEY_MATERIAL_FIELDS = [
    "public_key",
    "rsa_public_key",
    "webhook_public_key",
    "signing_public_key",
]


def _provider_schema_mapping_pack_audit_entry(*, action: str, actor=None, reason: str = "", evidence: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "action": action,
        "actor_id": str(getattr(actor, "id", "") or ""),
        "actor_name": str(actor) if actor else "",
        "reason": reason,
        "evidence": evidence or {},
        "recorded_at": timezone.now().isoformat(),
    }


def _append_provider_schema_mapping_pack_audit(
    item: PayrollProviderSchemaMappingPack,
    *,
    action: str,
    actor=None,
    reason: str = "",
    evidence: dict[str, Any] | None = None,
) -> None:
    snapshot = item.evidence_snapshot if isinstance(item.evidence_snapshot, dict) else {}
    history = snapshot.get("lifecycle_history") if isinstance(snapshot.get("lifecycle_history"), list) else []
    item.evidence_snapshot = {
        **snapshot,
        "lifecycle_profile_ref": PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_LIFECYCLE_PROFILE_REF,
        "last_lifecycle_action": action,
        "last_lifecycle_actor": str(actor) if actor else "",
        "last_lifecycle_at": timezone.now().isoformat(),
        "lifecycle_history": [
            *history[-24:],
            _provider_schema_mapping_pack_audit_entry(action=action, actor=actor, reason=reason, evidence=evidence),
        ],
    }


def _provider_schema_mapping_pack_connection_for_actor(actor, provider_connection_id: Any) -> PayrollProviderConnection | None:
    if not provider_connection_id:
        return None
    connection = PayrollProviderConnection.objects.filter(tenant=actor.tenant, id=provider_connection_id).first()
    if not connection:
        raise PayrollProviderSchemaMappingPackError("Payroll provider connection not found for mapping pack.")
    return connection


def _provider_schema_mapping_pack_next_version(tenant, mapping_profile_ref: str) -> int:
    current = PayrollProviderSchemaMappingPack.objects.filter(
        tenant=tenant,
        mapping_profile_ref=mapping_profile_ref,
    ).aggregate(max_version=Max("version"))["max_version"]
    return int(current or 0) + 1


def save_payroll_provider_schema_mapping_pack_for_actor(
    actor,
    data: dict[str, Any],
    *,
    item: PayrollProviderSchemaMappingPack | None = None,
) -> PayrollProviderSchemaMappingPack:
    create = item is None
    if create:
        mapping_profile_ref = str(data.get("mapping_profile_ref") or "").strip()
        if not mapping_profile_ref:
            raise PayrollProviderSchemaMappingPackError("Mapping profile ref is required.")
        item = PayrollProviderSchemaMappingPack(
            tenant=actor.tenant,
            mapping_profile_ref=mapping_profile_ref,
            version=int(data.get("version") or _provider_schema_mapping_pack_next_version(actor.tenant, mapping_profile_ref)),
            status=PayrollProviderSchemaMappingPackStatus.DRAFT,
            created_by=getattr(actor, "user", None),
        )
    elif item.status == PayrollProviderSchemaMappingPackStatus.ACTIVE:
        raise PayrollProviderSchemaMappingPackError("Active mapping packs must be cloned before editing.")

    if "provider_connection_id" in data:
        item.provider_connection = _provider_schema_mapping_pack_connection_for_actor(actor, data.get("provider_connection_id"))
    for field_name in [
        "provider_ref",
        "provider_kind",
        "environment_ref",
        "artifact_kind",
        "mapping_profile_ref",
        "version",
        "source_schema_ref",
        "target_schema_ref",
        "transform_profile_ref",
        "validation_profile_ref",
        "enforcement_mode",
        "transform_rules",
        "validation_rules",
        "sample_request_snapshot",
        "sample_output_snapshot",
    ]:
        if field_name in data:
            setattr(item, field_name, data[field_name])
    if create and item.provider_connection_id:
        item.provider_ref = item.provider_ref or item.provider_connection.provider_ref
        item.provider_kind = item.provider_kind or item.provider_connection.provider_kind
        item.environment_ref = item.environment_ref or item.provider_connection.environment_ref
    if not item.provider_ref:
        raise PayrollProviderSchemaMappingPackError("Provider ref is required.")
    if not item.artifact_kind:
        raise PayrollProviderSchemaMappingPackError("Artifact kind is required.")
    _append_provider_schema_mapping_pack_audit(
        item,
        action="created" if create else "updated",
        actor=getattr(actor, "user", None),
        reason=str(data.get("change_reason") or ""),
        evidence={"status": item.status},
    )
    item.updated_by = getattr(actor, "user", None)
    try:
        item.save()
    except Exception as exc:
        raise PayrollProviderSchemaMappingPackError(str(exc)) from exc
    return item


def clone_payroll_provider_schema_mapping_pack_for_actor(
    actor,
    item: PayrollProviderSchemaMappingPack,
    *,
    overrides: dict[str, Any] | None = None,
) -> PayrollProviderSchemaMappingPack:
    if item.tenant_id != actor.tenant_id:
        raise PayrollProviderSchemaMappingPackError("Payroll provider schema mapping pack not found.")
    overrides = overrides or {}
    mapping_profile_ref = str(overrides.get("mapping_profile_ref") or item.mapping_profile_ref).strip()
    clone = PayrollProviderSchemaMappingPack(
        tenant=item.tenant,
        provider_connection=item.provider_connection,
        provider_ref=item.provider_ref,
        provider_kind=item.provider_kind,
        environment_ref=item.environment_ref,
        artifact_kind=item.artifact_kind,
        mapping_profile_ref=mapping_profile_ref,
        version=_provider_schema_mapping_pack_next_version(item.tenant, mapping_profile_ref),
        status=PayrollProviderSchemaMappingPackStatus.DRAFT,
        source_schema_ref=item.source_schema_ref,
        target_schema_ref=item.target_schema_ref,
        transform_profile_ref=item.transform_profile_ref,
        validation_profile_ref=item.validation_profile_ref,
        enforcement_mode=item.enforcement_mode,
        transform_rules=item.transform_rules,
        validation_rules=item.validation_rules,
        sample_request_snapshot=item.sample_request_snapshot,
        sample_output_snapshot=item.sample_output_snapshot,
        evidence_snapshot={
            "source": "payroll_provider_schema_mapping_pack_clone",
            "source_mapping_pack_id": str(item.id),
            "source_mapping_profile_ref": item.mapping_profile_ref,
            "source_version": item.version,
            "source_hash": item.source_hash,
        },
        created_by=getattr(actor, "user", None),
        updated_by=getattr(actor, "user", None),
    )
    mutable_overrides = {key: value for key, value in overrides.items() if key not in {"status", "version", "provider_connection_id"}}
    for field_name, value in mutable_overrides.items():
        if hasattr(clone, field_name):
            setattr(clone, field_name, value)
    if "provider_connection_id" in overrides:
        clone.provider_connection = _provider_schema_mapping_pack_connection_for_actor(actor, overrides.get("provider_connection_id"))
    _append_provider_schema_mapping_pack_audit(
        clone,
        action="cloned",
        actor=getattr(actor, "user", None),
        reason=str(overrides.get("change_reason") or ""),
        evidence={"source_mapping_pack_id": str(item.id), "source_version": item.version},
    )
    try:
        clone.save()
    except Exception as exc:
        raise PayrollProviderSchemaMappingPackError(str(exc)) from exc
    return clone


def activate_payroll_provider_schema_mapping_pack_for_actor(
    actor,
    item: PayrollProviderSchemaMappingPack,
    *,
    approval_snapshot: dict[str, Any] | None = None,
) -> PayrollProviderSchemaMappingPack:
    if item.tenant_id != actor.tenant_id:
        raise PayrollProviderSchemaMappingPackError("Payroll provider schema mapping pack not found.")
    with transaction.atomic():
        item = PayrollProviderSchemaMappingPack.objects.select_for_update().get(id=item.id)
        previous_active = list(
            PayrollProviderSchemaMappingPack.objects.select_for_update().filter(
                tenant=item.tenant,
                mapping_profile_ref=item.mapping_profile_ref,
                status=PayrollProviderSchemaMappingPackStatus.ACTIVE,
            ).exclude(id=item.id)
        )
        for previous in previous_active:
            previous.status = PayrollProviderSchemaMappingPackStatus.INACTIVE
            _append_provider_schema_mapping_pack_audit(
                previous,
                action="superseded",
                actor=getattr(actor, "user", None),
                evidence={"active_mapping_pack_id": str(item.id), "active_version": item.version},
            )
            previous.updated_by = getattr(actor, "user", None)
            previous.save()
        item.status = PayrollProviderSchemaMappingPackStatus.ACTIVE
        _append_provider_schema_mapping_pack_audit(
            item,
            action="activated",
            actor=getattr(actor, "user", None),
            reason=str((approval_snapshot or {}).get("approval_reason") or ""),
            evidence={
                "approval_snapshot": approval_snapshot or {},
                "superseded_mapping_pack_ids": [str(previous.id) for previous in previous_active],
            },
        )
        item.updated_by = getattr(actor, "user", None)
        try:
            item.save()
        except Exception as exc:
            raise PayrollProviderSchemaMappingPackError(str(exc)) from exc
    return item


def archive_payroll_provider_schema_mapping_pack_for_actor(
    actor,
    item: PayrollProviderSchemaMappingPack,
    *,
    archive_reason: str = "",
) -> PayrollProviderSchemaMappingPack:
    if item.tenant_id != actor.tenant_id:
        raise PayrollProviderSchemaMappingPackError("Payroll provider schema mapping pack not found.")
    item.status = PayrollProviderSchemaMappingPackStatus.ARCHIVED
    _append_provider_schema_mapping_pack_audit(
        item,
        action="archived",
        actor=getattr(actor, "user", None),
        reason=archive_reason,
    )
    item.updated_by = getattr(actor, "user", None)
    try:
        item.save()
    except Exception as exc:
        raise PayrollProviderSchemaMappingPackError(str(exc)) from exc
    return item


def export_payroll_provider_schema_mapping_pack(item: PayrollProviderSchemaMappingPack) -> dict[str, Any]:
    return {
        "export_version": PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_EXPORT_VERSION,
        "mapping_profile_ref": item.mapping_profile_ref,
        "version": item.version,
        "provider_ref": item.provider_ref,
        "provider_kind": item.provider_kind,
        "environment_ref": item.environment_ref,
        "artifact_kind": item.artifact_kind,
        "source_schema_ref": item.source_schema_ref,
        "target_schema_ref": item.target_schema_ref,
        "transform_profile_ref": item.transform_profile_ref,
        "validation_profile_ref": item.validation_profile_ref,
        "enforcement_mode": item.enforcement_mode,
        "transform_rules": item.transform_rules,
        "validation_rules": item.validation_rules,
        "sample_request_snapshot": item.sample_request_snapshot,
        "sample_output_snapshot": item.sample_output_snapshot,
        "source_hash": item.source_hash,
        "exported_at": timezone.now().isoformat(),
    }


def _provider_schema_mapping_pack_contract(item: PayrollProviderSchemaMappingPack) -> dict[str, Any]:
    return {
        "mapping_pack_id": str(item.id),
        "mapping_profile_ref": item.mapping_profile_ref,
        "version": item.version,
        "provider_ref": item.provider_ref,
        "provider_kind": item.provider_kind,
        "environment_ref": item.environment_ref,
        "artifact_kind": item.artifact_kind,
        "source_schema_ref": item.source_schema_ref,
        "target_schema_ref": item.target_schema_ref,
        "transform_profile_ref": item.transform_profile_ref,
        "validation_profile_ref": item.validation_profile_ref,
        "enforcement_mode": item.enforcement_mode,
        "transform_rules": item.transform_rules,
        "validation_rules": item.validation_rules,
        "source_hash": item.source_hash,
    }


def _flatten_mapping_payload(value: Any, *, prefix: str = "") -> dict[str, Any]:
    if isinstance(value, dict):
        flattened: dict[str, Any] = {}
        for key, child in sorted(value.items(), key=lambda pair: str(pair[0])):
            child_prefix = f"{prefix}.{key}" if prefix else str(key)
            flattened.update(_flatten_mapping_payload(child, prefix=child_prefix))
        return flattened
    if isinstance(value, list):
        flattened = {}
        for index, child in enumerate(value):
            child_prefix = f"{prefix}[{index}]" if prefix else f"[{index}]"
            flattened.update(_flatten_mapping_payload(child, prefix=child_prefix))
        return flattened
    return {prefix or "$": value}


def _provider_schema_mapping_pack_active_baseline(item: PayrollProviderSchemaMappingPack) -> PayrollProviderSchemaMappingPack | None:
    return (
        PayrollProviderSchemaMappingPack.objects.filter(
            tenant=item.tenant,
            provider_ref=item.provider_ref,
            artifact_kind=item.artifact_kind,
            status=PayrollProviderSchemaMappingPackStatus.ACTIVE,
        )
        .exclude(id=item.id)
        .order_by("-version", "-updated_at")
        .first()
    )


def _compare_provider_schema_mapping_payloads(
    *,
    item: PayrollProviderSchemaMappingPack,
    baseline: PayrollProviderSchemaMappingPack | None,
    request_snapshot: dict[str, Any],
    mapping_contract: dict[str, Any],
    provider_payload: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    if not baseline:
        return {}, {
            "comparison_profile_ref": PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_COMPARISON_PROFILE_REF,
            "status": "no_baseline",
            "mapping_pack_id": str(item.id),
            "mapping_pack_version": item.version,
            "baseline_mapping_pack_id": "",
            "baseline_mapping_pack_version": 0,
            "changed_path_count": 0,
            "added_path_count": 0,
            "removed_path_count": 0,
            "unchanged_path_count": 0,
            "diffs": [],
        }
    baseline_contract = _provider_schema_mapping_pack_contract(baseline)
    baseline_validation = apply_payroll_provider_schema_mapping(
        request_snapshot=request_snapshot,
        mapping_contract=baseline_contract,
    )
    baseline_payload = baseline_validation.get("provider_payload", {})
    baseline_payload = baseline_payload if isinstance(baseline_payload, dict) else {}
    active_paths = _flatten_mapping_payload(provider_payload)
    baseline_paths = _flatten_mapping_payload(baseline_payload)
    all_paths = sorted(set(active_paths) | set(baseline_paths))
    diffs: list[dict[str, Any]] = []
    added_count = 0
    removed_count = 0
    changed_count = 0
    unchanged_count = 0
    for path in all_paths:
        left_missing = path not in baseline_paths
        right_missing = path not in active_paths
        if left_missing:
            added_count += 1
            change_type = "added"
        elif right_missing:
            removed_count += 1
            change_type = "removed"
        elif baseline_paths[path] != active_paths[path]:
            changed_count += 1
            change_type = "changed"
        else:
            unchanged_count += 1
            continue
        if len(diffs) < 50:
            diffs.append({
                "path": path,
                "change_type": change_type,
                "baseline_value": None if left_missing else baseline_paths.get(path),
                "candidate_value": None if right_missing else active_paths.get(path),
            })
    total_changes = added_count + removed_count + changed_count
    return baseline_payload, {
        "comparison_profile_ref": PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_COMPARISON_PROFILE_REF,
        "status": "changed" if total_changes else "unchanged",
        "mapping_pack_id": str(item.id),
        "mapping_profile_ref": item.mapping_profile_ref,
        "mapping_pack_version": item.version,
        "mapping_source_hash": str(mapping_contract.get("source_hash") or item.source_hash),
        "baseline_mapping_pack_id": str(baseline.id),
        "baseline_mapping_profile_ref": baseline.mapping_profile_ref,
        "baseline_mapping_pack_version": baseline.version,
        "baseline_source_hash": baseline.source_hash,
        "changed_path_count": changed_count,
        "added_path_count": added_count,
        "removed_path_count": removed_count,
        "unchanged_path_count": unchanged_count,
        "diffs": diffs,
    }


def build_payroll_provider_schema_mapping_simulation_payload(item: PayrollProviderSchemaMappingSimulation) -> dict[str, Any]:
    return {
        "id": item.id,
        "mapping_pack_id": item.mapping_pack_id,
        "baseline_mapping_pack_id": item.baseline_mapping_pack_id,
        "provider_connection_id": item.provider_connection_id,
        "provider_ref": item.provider_ref,
        "provider_kind": item.provider_kind,
        "provider_kind_label": item.get_provider_kind_display(),
        "environment_ref": item.environment_ref,
        "artifact_kind": item.artifact_kind,
        "artifact_kind_label": item.get_artifact_kind_display(),
        "mapping_profile_ref": item.mapping_profile_ref,
        "mapping_pack_version": item.mapping_pack_version,
        "baseline_mapping_pack_version": item.baseline_mapping_pack_version,
        "simulation_profile_ref": item.simulation_profile_ref,
        "comparison_profile_ref": item.comparison_profile_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "comparison_status": item.comparison_status,
        "gate_count": item.gate_count,
        "passed_gate_count": item.passed_gate_count,
        "blocker_count": item.blocker_count,
        "changed_path_count": item.changed_path_count,
        "added_path_count": item.added_path_count,
        "removed_path_count": item.removed_path_count,
        "request_snapshot": item.request_snapshot,
        "provider_payload_snapshot": item.provider_payload_snapshot,
        "baseline_payload_snapshot": item.baseline_payload_snapshot,
        "gate_snapshot": item.gate_snapshot,
        "blocking_gate_refs": item.blocking_gate_refs,
        "comparison_snapshot": item.comparison_snapshot,
        "evidence_snapshot": item.evidence_snapshot,
        "source_hash": item.source_hash,
        "simulated_by_name": str(item.simulated_by) if item.simulated_by else None,
        "simulated_at": item.simulated_at,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def simulate_payroll_provider_schema_mapping_pack_for_actor(
    actor,
    item: PayrollProviderSchemaMappingPack,
    *,
    request_snapshot: dict[str, Any] | None = None,
    mapping_contract_overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if item.tenant_id != actor.tenant_id:
        raise PayrollProviderSchemaMappingPackError("Payroll provider schema mapping pack not found.")
    sample = request_snapshot if request_snapshot is not None else item.sample_request_snapshot
    if not isinstance(sample, dict):
        raise PayrollProviderSchemaMappingPackError("Mapping simulation request snapshot must be an object.")
    try:
        validate_payroll_provider_route_config(sample)
    except PayrollProviderAdapterError as exc:
        raise PayrollProviderSchemaMappingPackError(str(exc)) from exc
    mapping_contract = _provider_schema_mapping_pack_contract(item)
    if mapping_contract_overrides:
        for field_name in [
            "target_schema_ref",
            "transform_profile_ref",
            "validation_profile_ref",
            "enforcement_mode",
            "transform_rules",
            "validation_rules",
        ]:
            if field_name in mapping_contract_overrides:
                mapping_contract[field_name] = mapping_contract_overrides[field_name]
    validation = apply_payroll_provider_schema_mapping(
        request_snapshot=sample,
        mapping_contract=mapping_contract,
    )
    gate_count = len(validation.get("gates", [])) if isinstance(validation.get("gates"), list) else 0
    blocking = validation.get("blocking_gate_refs") if isinstance(validation.get("blocking_gate_refs"), list) else []
    provider_payload = validation.get("provider_payload", {})
    provider_payload = provider_payload if isinstance(provider_payload, dict) else {}
    baseline = _provider_schema_mapping_pack_active_baseline(item)
    baseline_payload, comparison = _compare_provider_schema_mapping_payloads(
        item=item,
        baseline=baseline,
        request_snapshot=sample,
        mapping_contract=mapping_contract,
        provider_payload=provider_payload,
    )
    simulation_record = PayrollProviderSchemaMappingSimulation.objects.create(
        tenant=item.tenant,
        mapping_pack=item,
        baseline_mapping_pack=baseline,
        provider_connection=item.provider_connection,
        provider_ref=item.provider_ref,
        provider_kind=item.provider_kind,
        environment_ref=item.environment_ref,
        artifact_kind=item.artifact_kind,
        mapping_profile_ref=item.mapping_profile_ref,
        mapping_pack_version=item.version,
        baseline_mapping_pack_version=baseline.version if baseline else 0,
        simulation_profile_ref=PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_SIMULATION_PROFILE_REF,
        comparison_profile_ref=PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_COMPARISON_PROFILE_REF,
        status=PayrollProviderSchemaMappingSimulationStatus.BLOCKED if blocking else PayrollProviderSchemaMappingSimulationStatus.PASSED,
        comparison_status=str(comparison.get("status") or "no_baseline"),
        gate_count=gate_count,
        passed_gate_count=gate_count - len(blocking),
        blocker_count=len(blocking),
        changed_path_count=int(comparison.get("changed_path_count") or 0),
        added_path_count=int(comparison.get("added_path_count") or 0),
        removed_path_count=int(comparison.get("removed_path_count") or 0),
        request_snapshot=sample,
        provider_payload_snapshot=provider_payload,
        baseline_payload_snapshot=baseline_payload,
        gate_snapshot=validation.get("gates", []) if isinstance(validation.get("gates"), list) else [],
        blocking_gate_refs=blocking,
        comparison_snapshot=comparison,
        evidence_snapshot={
            "source": "payroll_provider_schema_mapping_pack_simulation",
            "mapping_contract": mapping_contract,
            "baseline_mapping_pack_id": str(baseline.id) if baseline else "",
            "baseline_source_hash": baseline.source_hash if baseline else "",
            "persisted": True,
        },
        simulated_by=getattr(actor, "user", None),
    )
    simulation = {
        "simulation_profile_ref": PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_SIMULATION_PROFILE_REF,
        "comparison_profile_ref": PAYROLL_PROVIDER_SCHEMA_MAPPING_PACK_COMPARISON_PROFILE_REF,
        "simulation_run_id": str(simulation_record.id),
        "mapping_pack_id": str(item.id),
        "baseline_mapping_pack_id": str(baseline.id) if baseline else "",
        "mapping_profile_ref": item.mapping_profile_ref,
        "version": item.version,
        "provider_ref": item.provider_ref,
        "artifact_kind": item.artifact_kind,
        "source_schema_ref": item.source_schema_ref,
        "target_schema_ref": mapping_contract.get("target_schema_ref", item.target_schema_ref),
        "enforcement_mode": mapping_contract.get("enforcement_mode", item.enforcement_mode),
        "status": validation.get("status", "blocked"),
        "gate_count": gate_count,
        "passed_gate_count": gate_count - len(blocking),
        "blocking_gate_refs": blocking,
        "provider_payload": provider_payload,
        "baseline_provider_payload": baseline_payload,
        "comparison": comparison,
        "gates": validation.get("gates", []) if isinstance(validation.get("gates"), list) else [],
        "request_snapshot": sample,
        "source_hash": item.source_hash,
        "simulation_source_hash": simulation_record.source_hash,
        "simulated_at": timezone.now().isoformat(),
    }
    return simulation


def import_payroll_provider_schema_mapping_pack_for_actor(
    actor,
    payload: dict[str, Any],
    *,
    provider_connection_id: Any = None,
) -> PayrollProviderSchemaMappingPack:
    if not isinstance(payload, dict):
        raise PayrollProviderSchemaMappingPackError("Mapping pack import payload must be an object.")
    mapping_profile_ref = str(payload.get("mapping_profile_ref") or "").strip()
    if not mapping_profile_ref:
        raise PayrollProviderSchemaMappingPackError("Imported mapping pack requires mapping_profile_ref.")
    data = {
        "provider_connection_id": provider_connection_id,
        "provider_ref": payload.get("provider_ref", ""),
        "provider_kind": payload.get("provider_kind", PayrollProviderConnectionKind.OTHER),
        "environment_ref": payload.get("environment_ref", "sandbox"),
        "artifact_kind": payload.get("artifact_kind", ""),
        "mapping_profile_ref": mapping_profile_ref,
        "version": _provider_schema_mapping_pack_next_version(actor.tenant, mapping_profile_ref),
        "source_schema_ref": payload.get("source_schema_ref", ""),
        "target_schema_ref": payload.get("target_schema_ref", ""),
        "transform_profile_ref": payload.get("transform_profile_ref", "payroll.provider_mapping.transform.safe_paths.v1"),
        "validation_profile_ref": payload.get("validation_profile_ref", "payroll.provider_mapping.validation.standard.v1"),
        "enforcement_mode": payload.get("enforcement_mode", "warn"),
        "transform_rules": payload.get("transform_rules") if isinstance(payload.get("transform_rules"), list) else [],
        "validation_rules": payload.get("validation_rules") if isinstance(payload.get("validation_rules"), list) else [],
        "sample_request_snapshot": payload.get("sample_request_snapshot") if isinstance(payload.get("sample_request_snapshot"), dict) else {},
        "sample_output_snapshot": payload.get("sample_output_snapshot") if isinstance(payload.get("sample_output_snapshot"), dict) else {},
        "change_reason": "Imported mapping pack.",
    }
    item = save_payroll_provider_schema_mapping_pack_for_actor(actor, data)
    snapshot = item.evidence_snapshot if isinstance(item.evidence_snapshot, dict) else {}
    item.evidence_snapshot = {
        **snapshot,
        "import_snapshot": {
            "export_version": payload.get("export_version", ""),
            "source_version": payload.get("version", ""),
            "source_hash": payload.get("source_hash", ""),
            "imported_at": timezone.now().isoformat(),
        },
    }
    item.save()
    return item
DEFAULT_SIGNED_ACCESS_GRANT_PROFILE_REF = "payroll.signed_access.profile.default.v1"
DEFAULT_EMPLOYEE_PORTAL_CHANNEL_REF = "employee.portal.v1"
DEFAULT_HR_ADMIN_CHANNEL_REF = "hr_admin.payroll_outputs.v1"
DEFAULT_PAYSLIP_PUBLISH_NOTIFICATION_TRIGGER_KEY = "payroll_payslip_published"
DEFAULT_SIGNED_ACCESS_PERMISSION_SCOPE = "download"


def _to_decimal(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool) or value is None:
        raise PayrollRuleEvaluationError("Boolean and null values cannot be used as numbers.")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise PayrollRuleEvaluationError(f"Value {value!r} is not numeric.") from exc


def _json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value


def _normalized_key(value: str) -> str:
    normalized = "".join(character if character.isalnum() else "_" for character in str(value).lower()).strip("_")
    return normalized or "value"


def _round_decimal(value: Any, places: Any = 2) -> Decimal:
    numeric_value = _to_decimal(value)
    numeric_places = int(_to_decimal(places))
    quantizer = Decimal("1").scaleb(-numeric_places)
    return numeric_value.quantize(quantizer, rounding=ROUND_HALF_UP)


def _coalesce(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return None


def _if_else(condition: Any, truthy: Any, falsey: Any) -> Any:
    return truthy if bool(condition) else falsey


def _cap_between(value: Any, minimum: Any, maximum: Any) -> Decimal:
    numeric_value = _to_decimal(value)
    return min(max(numeric_value, _to_decimal(minimum)), _to_decimal(maximum))


@dataclass
class PayrollRuleEvaluationResult:
    result: Any
    dependencies: list[str]
    trace: list[dict[str, Any]]

    def as_payload(self) -> dict[str, Any]:
        return {
            "result": _json_safe(self.result),
            "dependencies": self.dependencies,
            "trace": _json_safe(self.trace),
        }


class SafePayrollExpressionEvaluator:
    """Whitelisted expression evaluator for payroll formula and rule previews."""

    ALLOWED_FUNCTIONS = {
        "abs": lambda value: abs(_to_decimal(value)),
        "min": lambda *values: min(_to_decimal(value) for value in values),
        "max": lambda *values: max(_to_decimal(value) for value in values),
        "round_decimal": _round_decimal,
        "coalesce": _coalesce,
        "if_else": _if_else,
        "cap_between": _cap_between,
    }

    def __init__(self, context: dict[str, Any]):
        self.context = context
        self.dependencies: set[str] = set()
        self.trace: list[dict[str, Any]] = []

    def evaluate(self, expression: str) -> PayrollRuleEvaluationResult:
        try:
            tree = ast.parse(expression, mode="eval")
        except SyntaxError as exc:
            raise PayrollRuleEvaluationError("Expression syntax is invalid.") from exc
        result = self._eval(tree.body)
        return PayrollRuleEvaluationResult(
            result=result,
            dependencies=sorted(self.dependencies),
            trace=self.trace,
        )

    def _eval(self, node: ast.AST) -> Any:
        if isinstance(node, ast.Constant):
            if isinstance(node.value, float):
                return Decimal(str(node.value))
            return node.value

        if isinstance(node, ast.Name):
            if node.id not in self.context:
                raise PayrollRuleEvaluationError(f"Unknown input '{node.id}'.")
            self.dependencies.add(node.id)
            return self.context[node.id]

        if isinstance(node, ast.Attribute):
            value, path = self._resolve_path(node)
            self.dependencies.add(path)
            return value

        if isinstance(node, ast.UnaryOp):
            operand = self._eval(node.operand)
            if isinstance(node.op, ast.USub):
                return -_to_decimal(operand)
            if isinstance(node.op, ast.UAdd):
                return _to_decimal(operand)
            if isinstance(node.op, ast.Not):
                return not bool(operand)
            raise PayrollRuleEvaluationError("Unsupported unary operator.")

        if isinstance(node, ast.BinOp):
            left = self._eval(node.left)
            right = self._eval(node.right)
            result = self._eval_binop(node.op, left, right)
            self.trace.append({"operation": type(node.op).__name__, "left": _json_safe(left), "right": _json_safe(right), "result": _json_safe(result)})
            return result

        if isinstance(node, ast.BoolOp):
            values = [bool(self._eval(value)) for value in node.values]
            if isinstance(node.op, ast.And):
                return all(values)
            if isinstance(node.op, ast.Or):
                return any(values)
            raise PayrollRuleEvaluationError("Unsupported boolean operator.")

        if isinstance(node, ast.Compare):
            left = self._eval(node.left)
            for operator, comparator in zip(node.ops, node.comparators):
                right = self._eval(comparator)
                if not self._compare(operator, left, right):
                    return False
                left = right
            return True

        if isinstance(node, ast.IfExp):
            return self._eval(node.body) if bool(self._eval(node.test)) else self._eval(node.orelse)

        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise PayrollRuleEvaluationError("Only named helper functions are allowed; arbitrary calls are not allowed.")
            function_name = node.func.id
            if function_name not in self.ALLOWED_FUNCTIONS:
                raise PayrollRuleEvaluationError(f"Function '{function_name}' is not allowed.")
            if node.keywords:
                raise PayrollRuleEvaluationError("Keyword arguments are not supported.")
            args = [self._eval(arg) for arg in node.args]
            result = self.ALLOWED_FUNCTIONS[function_name](*args)
            self.trace.append({"function": function_name, "args": _json_safe(args), "result": _json_safe(result)})
            return result

        raise PayrollRuleEvaluationError(f"Unsupported expression element: {type(node).__name__}.")

    def _eval_binop(self, operator: ast.operator, left: Any, right: Any) -> Decimal:
        left_value = _to_decimal(left)
        right_value = _to_decimal(right)
        if isinstance(operator, ast.Add):
            return left_value + right_value
        if isinstance(operator, ast.Sub):
            return left_value - right_value
        if isinstance(operator, ast.Mult):
            return left_value * right_value
        if isinstance(operator, ast.Div):
            if right_value == 0:
                raise PayrollRuleEvaluationError("Division by zero is not allowed.")
            return left_value / right_value
        if isinstance(operator, ast.Mod):
            if right_value == 0:
                raise PayrollRuleEvaluationError("Modulo by zero is not allowed.")
            return left_value % right_value
        raise PayrollRuleEvaluationError("Unsupported arithmetic operator.")

    def _compare(self, operator: ast.cmpop, left: Any, right: Any) -> bool:
        if isinstance(operator, ast.Eq):
            return left == right
        if isinstance(operator, ast.NotEq):
            return left != right
        left_value = _to_decimal(left)
        right_value = _to_decimal(right)
        if isinstance(operator, ast.Lt):
            return left_value < right_value
        if isinstance(operator, ast.LtE):
            return left_value <= right_value
        if isinstance(operator, ast.Gt):
            return left_value > right_value
        if isinstance(operator, ast.GtE):
            return left_value >= right_value
        raise PayrollRuleEvaluationError("Unsupported comparison operator.")

    def _resolve_path(self, node: ast.Attribute) -> tuple[Any, str]:
        parts: list[str] = []
        current: ast.AST = node
        while isinstance(current, ast.Attribute):
            parts.append(current.attr)
            current = current.value
        if not isinstance(current, ast.Name):
            raise PayrollRuleEvaluationError("Only dotted input paths are allowed.")
        parts.append(current.id)
        path_parts = list(reversed(parts))
        value: Any = self.context
        traversed: list[str] = []
        for part in path_parts:
            traversed.append(part)
            if not isinstance(value, dict) or part not in value:
                raise PayrollRuleEvaluationError(f"Unknown input '{'.'.join(traversed)}'.")
            value = value[part]
        return value, ".".join(path_parts)


def build_payroll_rule_context_from_snapshot(snapshot: PayrollInputSnapshot) -> dict[str, Any]:
    """Build the namespaced formula context from a locked payroll input snapshot."""

    return {
        "employee": snapshot.employee_snapshot or {},
        "organization": snapshot.organization_snapshot or {},
        "salary": snapshot.salary_snapshot or {},
        "attendance": snapshot.attendance_snapshot or {},
        "leave": snapshot.leave_snapshot or {},
        "lifecycle": snapshot.lifecycle_snapshot or {},
        "document": snapshot.document_snapshot or {},
        "banking": snapshot.banking_snapshot or {},
        "validation": snapshot.validation_snapshot or {},
        "config": snapshot.config_snapshot or {},
    }


def evaluate_payroll_rule_version(
    rule_version: PayrollRuleVersion,
    *,
    context: dict[str, Any] | None = None,
    input_snapshot: PayrollInputSnapshot | None = None,
) -> PayrollRuleEvaluationResult:
    """Evaluate a rule version against explicit context or a payroll input snapshot."""

    if input_snapshot is not None:
        context = build_payroll_rule_context_from_snapshot(input_snapshot)
    if context is None:
        context = {}
    evaluator = SafePayrollExpressionEvaluator(context)
    return evaluator.evaluate(rule_version.expression)


def _config_for_rule_version(rule_version: PayrollRuleVersion) -> dict[str, Any]:
    config: dict[str, Any] = {}
    if isinstance(rule_version.rule.config_snapshot, dict):
        config.update(rule_version.rule.config_snapshot)
    if isinstance(rule_version.config_snapshot, dict):
        config.update(rule_version.config_snapshot)
    return config


def _calculation_order(rule_version: PayrollRuleVersion) -> int:
    config = _config_for_rule_version(rule_version)
    try:
        return int(config.get("calculation_order", 100))
    except (TypeError, ValueError):
        return 100


def _valid_context_path(path: str) -> bool:
    parts = [part for part in str(path or "").split(".") if part]
    return bool(parts) and all(part.isidentifier() for part in parts)


def _set_context_path(context: dict[str, Any], path: str, value: Any) -> None:
    if not _valid_context_path(path):
        return
    parts = path.split(".")
    current = context
    for part in parts[:-1]:
        next_value = current.get(part)
        if not isinstance(next_value, dict):
            next_value = {}
            current[part] = next_value
        current = next_value
    current[parts[-1]] = value


def _get_context_path(context: dict[str, Any], path: str) -> Any:
    if not _valid_context_path(path):
        return None
    current: Any = context
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def _selected_rule_versions(payroll_run: PayrollRun) -> list[PayrollRuleVersion]:
    profile = payroll_run.config_snapshot.get("calculation_profile", {}) if isinstance(payroll_run.config_snapshot, dict) else {}
    selected_rule_codes = {str(value) for value in profile.get("rule_codes", []) if str(value)} if isinstance(profile, dict) else set()
    excluded_rule_codes = {str(value) for value in profile.get("excluded_rule_codes", []) if str(value)} if isinstance(profile, dict) else set()

    versions = PayrollRuleVersion.objects.filter(
        tenant=payroll_run.tenant,
        status=PayrollRuleVersionStatus.ACTIVE,
        effective_from__lte=payroll_run.period.end_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=payroll_run.period.start_date)).select_related("rule")
    if selected_rule_codes:
        versions = versions.filter(rule__code__in=selected_rule_codes)
    if excluded_rule_codes:
        versions = versions.exclude(rule__code__in=excluded_rule_codes)
    return sorted(versions, key=lambda item: (_calculation_order(item), item.rule.code, item.version))


def _line_type(rule_version: PayrollRuleVersion, config: dict[str, Any]) -> str:
    return str(config.get("line_type") or config.get("component_type") or rule_version.rule.rule_type)


def _component_code(rule_version: PayrollRuleVersion, config: dict[str, Any]) -> str:
    return str(config.get("component_code") or config.get("component_ref") or rule_version.rule.code)


def _component_name(rule_version: PayrollRuleVersion, config: dict[str, Any]) -> str:
    return str(config.get("component_name") or rule_version.rule.name)


def _currency_code(payroll_run: PayrollRun, config: dict[str, Any]) -> str:
    return str(
        config.get("currency_code")
        or (payroll_run.pay_group.default_currency_code if payroll_run.pay_group else "")
        or payroll_run.period.calendar.currency_code
        or "INR"
    )[:3]


def _apply_line_to_totals(totals: dict[str, Decimal], line_type: str, amount: Decimal) -> None:
    normalized_type = _normalized_key(line_type)
    if normalized_type in {"earning", "reimbursement"}:
        totals["gross_earnings"] += amount
        totals["net_pay"] += amount
    elif normalized_type in {"deduction", "tax"}:
        totals["employee_deductions"] += amount
        totals["net_pay"] -= amount
    elif normalized_type == "employer_contribution":
        totals["employer_contributions"] += amount


def _totals_payload(totals: dict[str, Decimal], *, employee_count: int, line_count: int, error_count: int) -> dict[str, Any]:
    payload = {key: str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) for key, value in totals.items()}
    payload.update({
        "employee_count": employee_count,
        "line_count": line_count,
        "error_count": error_count,
    })
    return payload


def _adjustment_order(adjustment: PayrollAdjustment, index: int) -> int:
    config = adjustment.config_snapshot if isinstance(adjustment.config_snapshot, dict) else {}
    try:
        return int(config.get("calculation_order", 900)) + index
    except (TypeError, ValueError):
        return 900 + index


def _applied_adjustments_by_snapshot(payroll_run: PayrollRun, snapshots: list[PayrollInputSnapshot]) -> dict[str, list[PayrollAdjustment]]:
    snapshots_by_employee_id = {snapshot.employee_id: snapshot for snapshot in snapshots}
    adjustments = PayrollAdjustment.objects.filter(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        status=PayrollAdjustmentStatus.APPLIED,
    ).select_related("employee", "input_snapshot", "salary_component").order_by("employee__employee_code", "effective_date", "component_code")
    grouped: dict[str, list[PayrollAdjustment]] = {}
    for adjustment in adjustments:
        snapshot = adjustment.input_snapshot or snapshots_by_employee_id.get(adjustment.employee_id)
        if not snapshot or snapshot.snapshot_status != PayrollInputSnapshotStatus.LOCKED:
            raise PayrollCalculationError("Applied payroll adjustments require locked input snapshots for the same payroll run.")
        grouped.setdefault(str(snapshot.id), []).append(adjustment)
    return grouped


def _statutory_calculation_profile(payroll_run: PayrollRun) -> dict[str, Any]:
    config = payroll_run.config_snapshot if isinstance(payroll_run.config_snapshot, dict) else {}
    calculation_profile = config.get("calculation_profile", {})
    if not isinstance(calculation_profile, dict):
        return {}
    statutory_profile = calculation_profile.get("statutory_profile", {})
    return statutory_profile if isinstance(statutory_profile, dict) else {}


def _statutory_calculation_enabled(payroll_run: PayrollRun) -> bool:
    profile = _statutory_calculation_profile(payroll_run)
    if not profile:
        return False
    return _profile_flag(profile, "enabled", False) or bool(
        _profile_list(profile, "pack_codes")
        or _profile_list(profile, "statutory_pack_refs")
        or _profile_list(profile, "component_codes")
    )


def _selected_statutory_components(payroll_run: PayrollRun) -> list[PayrollStatutoryComponent]:
    if not _statutory_calculation_enabled(payroll_run):
        return []

    profile = _statutory_calculation_profile(payroll_run)
    pack_codes = set(_profile_list(profile, "pack_codes"))
    pack_refs = set(_profile_list(profile, "statutory_pack_refs"))
    component_codes = set(_profile_list(profile, "component_codes"))
    excluded_component_codes = set(_profile_list(profile, "excluded_component_codes"))
    statutory_types = set(_profile_list(profile, "statutory_types"))

    packs = PayrollStatutoryPack.objects.filter(
        tenant=payroll_run.tenant,
        status=PayrollConfigStatus.ACTIVE,
        effective_from__lte=payroll_run.period.end_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=payroll_run.period.start_date))
    if pack_codes:
        packs = packs.filter(code__in=pack_codes)
    if pack_refs:
        packs = packs.filter(statutory_profile_ref__in=pack_refs)

    components = PayrollStatutoryComponent.objects.filter(
        tenant=payroll_run.tenant,
        statutory_pack__in=packs,
        status=PayrollConfigStatus.ACTIVE,
    ).select_related("statutory_pack", "salary_component").prefetch_related("slabs")
    if component_codes:
        components = components.filter(code__in=component_codes)
    if excluded_component_codes:
        components = components.exclude(code__in=excluded_component_codes)
    if statutory_types:
        components = components.filter(statutory_type__in=statutory_types)

    return sorted(
        components,
        key=lambda item: (
            _statutory_calculation_order(item),
            item.statutory_pack.code,
            item.statutory_type,
            item.code,
        ),
    )


def _employee_statutory_profiles_by_employee(
    payroll_run: PayrollRun,
    snapshots: list[PayrollInputSnapshot],
    components: list[PayrollStatutoryComponent],
) -> dict[str, EmployeeStatutoryProfile]:
    if not components:
        return {}

    selected_pack_ids = {component.statutory_pack_id for component in components}
    employee_ids = [snapshot.employee_id for snapshot in snapshots]
    profiles = EmployeeStatutoryProfile.objects.filter(
        tenant=payroll_run.tenant,
        employee_id__in=employee_ids,
        status=PayrollConfigStatus.ACTIVE,
        effective_from__lte=payroll_run.period.end_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=payroll_run.period.start_date)).select_related("employee", "statutory_pack").order_by(
        "employee_id",
        "-effective_from",
    )

    grouped: dict[str, EmployeeStatutoryProfile] = {}
    for profile in profiles:
        employee_key = str(profile.employee_id)
        if employee_key in grouped:
            continue
        if profile.statutory_pack_id and selected_pack_ids and profile.statutory_pack_id not in selected_pack_ids:
            continue
        grouped[employee_key] = profile
    return grouped


def _statutory_component_config(component: PayrollStatutoryComponent) -> dict[str, Any]:
    return component.config_snapshot if isinstance(component.config_snapshot, dict) else {}


def _statutory_slab_config(slab: PayrollStatutorySlab | None) -> dict[str, Any]:
    return slab.config_snapshot if slab and isinstance(slab.config_snapshot, dict) else {}


def _statutory_calculation_order(component: PayrollStatutoryComponent) -> int:
    config = _statutory_component_config(component)
    try:
        return int(config.get("calculation_order", 700))
    except (TypeError, ValueError):
        return 700


def _statutory_profile_payload(profile: EmployeeStatutoryProfile | None) -> dict[str, Any]:
    if profile is None:
        return {}
    return {
        "profile_id": str(profile.id),
        "profile_ref": profile.profile_ref,
        "statutory_pack_id": str(profile.statutory_pack_id or ""),
        "statutory_pack_code": profile.statutory_pack.code if profile.statutory_pack_id else "",
        "pan_number": profile.pan_number,
        "uan_number": profile.uan_number,
        "pf_applicable": profile.pf_applicable,
        "esi_applicable": profile.esi_applicable,
        "professional_tax_state": profile.professional_tax_state,
        "lwf_state": profile.lwf_state,
        "tax_regime": profile.tax_regime,
        "declaration_status": profile.declaration_status,
        "previous_employment_income": str(profile.previous_employment_income),
        "previous_employment_tax_deducted": str(profile.previous_employment_tax_deducted),
        "source_ref": profile.source_ref,
        "source_hash": profile.source_hash,
        "config_snapshot": profile.config_snapshot,
    }


def _employee_statutory_profile_value(profile: EmployeeStatutoryProfile | None, path: str) -> Any:
    if profile is None:
        return None
    normalized_path = str(path or "").removeprefix("statutory_profile.").strip(".")
    if not normalized_path:
        return None
    if "." not in normalized_path and hasattr(profile, normalized_path):
        return getattr(profile, normalized_path)
    return _get_context_path(_statutory_profile_payload(profile), normalized_path)


def _statutory_component_is_applicable(
    component: PayrollStatutoryComponent,
    employee_profile: EmployeeStatutoryProfile | None,
    statutory_profile: dict[str, Any],
) -> bool:
    config = _statutory_component_config(component)
    if config.get("applicable") is False:
        return False

    applicability_paths = statutory_profile.get("applicability_paths", {})
    if not isinstance(applicability_paths, dict):
        applicability_paths = {}
    applicability_path = (
        config.get("employee_profile_applicability_path")
        or applicability_paths.get(component.code)
        or applicability_paths.get(component.statutory_type)
    )
    if applicability_path:
        return bool(_employee_statutory_profile_value(employee_profile, str(applicability_path)))

    required_values = config.get("required_employee_profile_values", {})
    if isinstance(required_values, dict):
        for path, expected in required_values.items():
            if _employee_statutory_profile_value(employee_profile, str(path)) != expected:
                return False

    return True


def _statutory_wage_base_path(component: PayrollStatutoryComponent, statutory_profile: dict[str, Any]) -> str:
    config = _statutory_component_config(component)
    wage_base_paths = statutory_profile.get("wage_base_paths", {})
    if not isinstance(wage_base_paths, dict):
        wage_base_paths = {}
    return str(
        config.get("wage_base_path")
        or wage_base_paths.get(component.code)
        or wage_base_paths.get(component.wage_base_ref)
        or wage_base_paths.get(component.statutory_type)
        or ""
    )


def _statutory_state_value(
    component: PayrollStatutoryComponent,
    slab: PayrollStatutorySlab,
    employee_profile: EmployeeStatutoryProfile | None,
    statutory_profile: dict[str, Any],
) -> str:
    component_config = _statutory_component_config(component)
    slab_config = _statutory_slab_config(slab)
    state_profile_fields = statutory_profile.get("state_profile_fields", {})
    if not isinstance(state_profile_fields, dict):
        state_profile_fields = {}
    state_path = (
        slab_config.get("employee_profile_state_path")
        or component_config.get("employee_profile_state_path")
        or state_profile_fields.get(component.code)
        or state_profile_fields.get(component.statutory_type)
    )
    return str(_employee_statutory_profile_value(employee_profile, str(state_path)) or "").upper() if state_path else ""


def _active_statutory_slab(
    component: PayrollStatutoryComponent,
    payroll_run: PayrollRun,
    employee_profile: EmployeeStatutoryProfile | None,
    statutory_profile: dict[str, Any],
    wage_base: Decimal,
) -> PayrollStatutorySlab | None:
    slabs = [
        slab
        for slab in component.slabs.all()
        if slab.status == PayrollConfigStatus.ACTIVE
        and slab.effective_from <= payroll_run.period.end_date
        and (slab.effective_to is None or slab.effective_to >= payroll_run.period.start_date)
    ]
    for slab in sorted(slabs, key=lambda item: (item.slab_order, item.min_amount)):
        if slab.state_code and _statutory_state_value(component, slab, employee_profile, statutory_profile) != slab.state_code.upper():
            continue
        if slab.min_amount is not None and wage_base < slab.min_amount:
            continue
        if slab.max_amount is not None and wage_base > slab.max_amount:
            continue
        return slab
    return None


def _decimal_from_config(config: dict[str, Any], key: str, default: str = "0") -> Decimal:
    return _to_decimal(config.get(key, default) or default)


def _statutory_owner_line_specs(
    component: PayrollStatutoryComponent,
    slab: PayrollStatutorySlab | None,
    wage_base: Decimal,
    statutory_profile: dict[str, Any],
) -> list[dict[str, Any]]:
    component_config = _statutory_component_config(component)
    slab_config = _statutory_slab_config(slab)
    source_config = {**component_config, **slab_config}
    method = component.calculation_method
    rate_base = wage_base
    wage_ceiling = slab.wage_ceiling_amount if slab and slab.wage_ceiling_amount is not None else source_config.get("wage_ceiling_amount")
    if wage_ceiling is not None and wage_ceiling != "":
        rate_base = min(rate_base, _to_decimal(wage_ceiling))

    employee_rate = slab.employee_rate_percent if slab else _decimal_from_config(source_config, "employee_rate_percent")
    employer_rate = slab.employer_rate_percent if slab else _decimal_from_config(source_config, "employer_rate_percent")
    fixed_employee = slab.fixed_employee_amount if slab else _decimal_from_config(source_config, "fixed_employee_amount")
    fixed_employer = slab.fixed_employer_amount if slab else _decimal_from_config(source_config, "fixed_employer_amount")

    if method == PayrollStatutoryCalculationMethod.FIXED_AMOUNT:
        employee_amount = fixed_employee
        employer_amount = fixed_employer
    elif method in {PayrollStatutoryCalculationMethod.PERCENTAGE, PayrollStatutoryCalculationMethod.SLAB}:
        employee_amount = fixed_employee + (rate_base * employee_rate / Decimal("100"))
        employer_amount = fixed_employer + (rate_base * employer_rate / Decimal("100"))
    else:
        return []

    emit_zero_lines = _profile_flag(statutory_profile, "emit_zero_statutory_lines", False) or bool(component_config.get("emit_zero_lines"))
    default_code = component.code.upper().replace("-", "_")
    owner_specs = {
        PayrollStatutoryContributionOwner.EMPLOYEE: [
            {
                "owner": PayrollStatutoryContributionOwner.EMPLOYEE,
                "amount": employee_amount,
                "component_code": source_config.get("employee_component_code") or default_code,
                "component_name": source_config.get("employee_component_name") or component.name,
                "line_type": source_config.get("employee_line_type") or "deduction",
            }
        ],
        PayrollStatutoryContributionOwner.EMPLOYER: [
            {
                "owner": PayrollStatutoryContributionOwner.EMPLOYER,
                "amount": employer_amount,
                "component_code": source_config.get("employer_component_code") or f"{default_code}_EMPLOYER",
                "component_name": source_config.get("employer_component_name") or f"{component.name} Employer",
                "line_type": source_config.get("employer_line_type") or "employer_contribution",
            }
        ],
        PayrollStatutoryContributionOwner.BOTH: [
            {
                "owner": PayrollStatutoryContributionOwner.EMPLOYEE,
                "amount": employee_amount,
                "component_code": source_config.get("employee_component_code") or f"{default_code}_EMPLOYEE",
                "component_name": source_config.get("employee_component_name") or f"{component.name} Employee",
                "line_type": source_config.get("employee_line_type") or "deduction",
            },
            {
                "owner": PayrollStatutoryContributionOwner.EMPLOYER,
                "amount": employer_amount,
                "component_code": source_config.get("employer_component_code") or f"{default_code}_EMPLOYER",
                "component_name": source_config.get("employer_component_name") or f"{component.name} Employer",
                "line_type": source_config.get("employer_line_type") or "employer_contribution",
            },
        ],
        PayrollStatutoryContributionOwner.INFORMATIONAL: [
            {
                "owner": PayrollStatutoryContributionOwner.INFORMATIONAL,
                "amount": employee_amount or employer_amount,
                "component_code": source_config.get("informational_component_code") or default_code,
                "component_name": source_config.get("informational_component_name") or component.name,
                "line_type": source_config.get("informational_line_type") or "informational",
            }
        ],
    }
    return [
        {**item, "amount": _round_decimal(item["amount"], 2)}
        for item in owner_specs.get(component.contribution_owner, [])
        if emit_zero_lines or _round_decimal(item["amount"], 2) != Decimal("0.00")
    ]


def _statutory_annualization_config(
    component: PayrollStatutoryComponent,
    statutory_profile: dict[str, Any],
) -> dict[str, Any]:
    component_config = _statutory_component_config(component)
    profile_config = statutory_profile.get("annualization_profile", {})
    component_annualization = component_config.get("annualization_profile", {})
    if not isinstance(profile_config, dict):
        profile_config = {}
    if not isinstance(component_annualization, dict):
        component_annualization = {}

    merged = {**profile_config, **component_annualization}
    passthrough_keys = [
        "enabled",
        "financial_year_code",
        "annualization_multiplier",
        "annual_period_count",
        "remaining_period_count",
        "tax_method",
        "tax_regime_candidates",
        "comparison_tax_regimes",
        "selected_tax_regime",
        "tax_regime_selection_mode",
        "compare_tax_regimes",
        "declaration_cap_rules",
        "declaration_statuses",
        "declaration_profile_refs",
        "proof_statuses",
        "allow_declared_when_unverified",
        "allow_declared_amount_for_not_required",
        "employee_component_code",
        "employee_component_name",
        "employee_line_type",
        "calculation_order",
        "emit_zero_lines",
    ]
    for key in passthrough_keys:
        if key in component_config:
            merged[key] = component_config[key]
        elif key in statutory_profile:
            merged.setdefault(key, statutory_profile[key])
    return merged


def _tds_annualization_enabled(component: PayrollStatutoryComponent, statutory_profile: dict[str, Any]) -> bool:
    if component.statutory_type != PayrollStatutoryComponentKind.TAX_DEDUCTED_AT_SOURCE:
        return False
    annualization_config = _statutory_annualization_config(component, statutory_profile)
    return _profile_flag(annualization_config, "enabled", False) or _profile_flag(statutory_profile, "tds_annualization_enabled", False)


def _effective_statutory_slabs(
    component: PayrollStatutoryComponent,
    payroll_run: PayrollRun,
    employee_profile: EmployeeStatutoryProfile | None,
    statutory_profile: dict[str, Any],
) -> list[PayrollStatutorySlab]:
    slabs = [
        slab
        for slab in component.slabs.all()
        if slab.status == PayrollConfigStatus.ACTIVE
        and slab.effective_from <= payroll_run.period.end_date
        and (slab.effective_to is None or slab.effective_to >= payroll_run.period.start_date)
    ]
    return [
        slab
        for slab in sorted(slabs, key=lambda item: (item.slab_order, item.min_amount))
        if not slab.state_code or _statutory_state_value(component, slab, employee_profile, statutory_profile) == slab.state_code.upper()
    ]


def _payroll_financial_year_code(payroll_run: PayrollRun, annualization_config: dict[str, Any]) -> str:
    run_config = payroll_run.config_snapshot if isinstance(payroll_run.config_snapshot, dict) else {}
    calculation_profile = run_config.get("calculation_profile", {})
    if not isinstance(calculation_profile, dict):
        calculation_profile = {}
    return str(
        annualization_config.get("financial_year_code")
        or calculation_profile.get("financial_year_code")
        or run_config.get("financial_year_code")
        or ""
    ).strip().upper()


def _code_value(value: Any) -> str:
    return str(value or "").strip().upper()


def _declaration_rule_matches(
    item: EmployeeStatutoryDeclarationItem,
    rule: dict[str, Any],
    *,
    tax_regime: str,
) -> bool:
    section_codes = {_code_value(value) for value in _profile_list(rule, "section_codes")}
    section_code = _code_value(rule.get("section_code"))
    if section_code:
        section_codes.add(section_code)
    if section_codes and _code_value(item.section_code) not in section_codes:
        return False

    component_codes = {_code_value(value) for value in _profile_list(rule, "component_codes")}
    component_code = _code_value(rule.get("component_code"))
    if component_code:
        component_codes.add(component_code)
    if component_codes and _code_value(item.component_code) not in component_codes:
        return False

    item_kinds = {str(value).strip().lower() for value in _profile_list(rule, "item_kinds")}
    item_kind = str(rule.get("item_kind") or "").strip().lower()
    if item_kind:
        item_kinds.add(item_kind)
    if item_kinds and str(item.item_kind).lower() not in item_kinds:
        return False

    tax_regimes = {str(value).strip().lower() for value in _profile_list(rule, "tax_regimes")}
    if tax_regimes and str(tax_regime or PayrollTaxRegime.NOT_DECLARED).lower() not in tax_regimes:
        return False

    return True


def _declaration_item_amount(item: EmployeeStatutoryDeclarationItem, annualization_config: dict[str, Any]) -> Decimal:
    if item.proof_status == PayrollStatutoryProofStatus.VERIFIED:
        return _round_decimal(item.verified_amount, 2)
    if item.proof_status == PayrollStatutoryProofStatus.NOT_REQUIRED and _profile_flag(
        annualization_config,
        "allow_declared_amount_for_not_required",
        True,
    ):
        return _round_decimal(item.verified_amount or item.declared_amount, 2)
    if _profile_flag(annualization_config, "allow_declared_when_unverified", False):
        return _round_decimal(item.declared_amount, 2)
    return Decimal("0.00")


def _tds_declaration_cap_adjustments(
    *,
    payroll_run: PayrollRun,
    employee_profile: EmployeeStatutoryProfile | None,
    annualization_config: dict[str, Any],
    tax_regime_override: str | None = None,
) -> tuple[Decimal, list[dict[str, Any]]]:
    if employee_profile is None:
        return Decimal("0.00"), []

    financial_year_code = _payroll_financial_year_code(payroll_run, annualization_config)
    if not financial_year_code:
        return Decimal("0.00"), []

    declaration_statuses = _profile_list(annualization_config, "declaration_statuses") or [
        PayrollStatutoryDeclarationStatus.VERIFIED,
        PayrollStatutoryDeclarationStatus.LOCKED,
    ]
    proof_statuses = _profile_list(annualization_config, "proof_statuses") or [
        PayrollStatutoryProofStatus.VERIFIED,
        PayrollStatutoryProofStatus.NOT_REQUIRED,
    ]
    declaration_profile_refs = set(_profile_list(annualization_config, "declaration_profile_refs"))
    cap_rules = annualization_config.get("declaration_cap_rules", [])
    if not isinstance(cap_rules, list):
        cap_rules = []

    declarations = EmployeeStatutoryDeclaration.objects.filter(
        tenant=payroll_run.tenant,
        employee=employee_profile.employee,
        employee_statutory_profile=employee_profile,
        financial_year_code=financial_year_code,
        status__in=declaration_statuses,
    ).prefetch_related("items")
    if declaration_profile_refs:
        declarations = declarations.filter(declaration_profile_ref__in=declaration_profile_refs)

    candidate_items = [
        item
        for declaration in declarations
        for item in declaration.items.all()
        if item.proof_status in proof_statuses
    ]

    tax_regime = str(tax_regime_override or employee_profile.tax_regime or PayrollTaxRegime.NOT_DECLARED)
    consumed_item_ids: set[str] = set()
    total_adjustment = Decimal("0.00")
    evidence: list[dict[str, Any]] = []
    for index, raw_rule in enumerate(cap_rules):
        if not isinstance(raw_rule, dict):
            continue
        matched_items = [
            item
            for item in candidate_items
            if str(item.id) not in consumed_item_ids and _declaration_rule_matches(item, raw_rule, tax_regime=tax_regime)
        ]
        if not matched_items:
            continue
        raw_total = sum((_declaration_item_amount(item, annualization_config) for item in matched_items), Decimal("0.00"))
        max_amount = raw_rule.get("max_amount")
        capped_amount = min(raw_total, _to_decimal(max_amount)) if max_amount not in {None, ""} else raw_total
        capped_amount = _round_decimal(max(capped_amount, Decimal("0.00")), 2)
        for item in matched_items:
            consumed_item_ids.add(str(item.id))
        total_adjustment += capped_amount
        evidence.append({
            "rule_index": index,
            "cap_ref": raw_rule.get("cap_ref") or raw_rule.get("section_code") or raw_rule.get("component_code") or f"cap_rule:{index}",
            "raw_amount": str(_round_decimal(raw_total, 2)),
            "capped_amount": str(capped_amount),
            "max_amount": str(max_amount or ""),
            "item_ids": [str(item.id) for item in matched_items],
            "section_codes": sorted({_code_value(item.section_code) for item in matched_items if item.section_code}),
            "component_codes": sorted({_code_value(item.component_code) for item in matched_items if item.component_code}),
        })

    return _round_decimal(total_adjustment, 2), evidence


def _progressive_tds_annual_tax(
    *,
    component: PayrollStatutoryComponent,
    payroll_run: PayrollRun,
    employee_profile: EmployeeStatutoryProfile | None,
    statutory_profile: dict[str, Any],
    taxable_annual_amount: Decimal,
    tax_regime_override: str | None = None,
) -> tuple[Decimal, list[dict[str, Any]]]:
    annual_tax = Decimal("0.00")
    slab_trace: list[dict[str, Any]] = []
    tax_regime = str(tax_regime_override or (employee_profile.tax_regime if employee_profile else PayrollTaxRegime.NOT_DECLARED))
    for slab in _effective_statutory_slabs(component, payroll_run, employee_profile, statutory_profile):
        slab_config = _statutory_slab_config(slab)
        tax_regimes = {str(value).strip().lower() for value in _profile_list(slab_config, "tax_regimes")}
        if tax_regimes and str(tax_regime).lower() not in tax_regimes:
            continue
        lower_bound = slab.min_amount or Decimal("0.00")
        upper_bound = slab.max_amount
        if taxable_annual_amount <= lower_bound:
            continue
        band_limit = min(taxable_annual_amount, upper_bound) if upper_bound is not None else taxable_annual_amount
        band_amount = max(band_limit - lower_bound, Decimal("0.00"))
        if band_amount == Decimal("0.00"):
            continue
        tax_amount = _round_decimal(slab.fixed_employee_amount + (band_amount * slab.employee_rate_percent / Decimal("100")), 2)
        annual_tax += tax_amount
        slab_trace.append({
            "slab_id": str(slab.id),
            "slab_code": slab.code,
            "min_amount": str(lower_bound),
            "max_amount": str(upper_bound or ""),
            "taxable_band_amount": str(_round_decimal(band_amount, 2)),
            "employee_rate_percent": str(slab.employee_rate_percent),
            "fixed_employee_amount": str(slab.fixed_employee_amount),
            "tax_amount": str(tax_amount),
        })
    return _round_decimal(annual_tax, 2), slab_trace


def _single_slab_tds_annual_tax(
    *,
    component: PayrollStatutoryComponent,
    payroll_run: PayrollRun,
    employee_profile: EmployeeStatutoryProfile | None,
    statutory_profile: dict[str, Any],
    taxable_annual_amount: Decimal,
    tax_regime_override: str | None = None,
) -> tuple[Decimal, list[dict[str, Any]]]:
    tax_regime = str(tax_regime_override or (employee_profile.tax_regime if employee_profile else PayrollTaxRegime.NOT_DECLARED))
    slab = next(
        (
            item
            for item in _effective_statutory_slabs(component, payroll_run, employee_profile, statutory_profile)
            if (item.min_amount is None or taxable_annual_amount >= item.min_amount)
            and (item.max_amount is None or taxable_annual_amount <= item.max_amount)
            and (
                not _profile_list(_statutory_slab_config(item), "tax_regimes")
                or tax_regime.lower() in {str(value).strip().lower() for value in _profile_list(_statutory_slab_config(item), "tax_regimes")}
            )
        ),
        None,
    )
    if component.calculation_method == PayrollStatutoryCalculationMethod.SLAB and slab is None:
        return Decimal("0.00"), []
    source_config = {**_statutory_component_config(component), **_statutory_slab_config(slab)}
    employee_rate = slab.employee_rate_percent if slab else _decimal_from_config(source_config, "employee_rate_percent")
    fixed_employee = slab.fixed_employee_amount if slab else _decimal_from_config(source_config, "fixed_employee_amount")
    annual_tax = _round_decimal(fixed_employee + (taxable_annual_amount * employee_rate / Decimal("100")), 2)
    return annual_tax, [{
        "slab_id": str(slab.id) if slab else "",
        "slab_code": slab.code if slab else "",
        "taxable_amount": str(_round_decimal(taxable_annual_amount, 2)),
        "tax_regime": tax_regime,
        "employee_rate_percent": str(employee_rate),
        "fixed_employee_amount": str(fixed_employee),
        "tax_amount": str(annual_tax),
    }]


def _selected_tds_tax_regime(employee_profile: EmployeeStatutoryProfile | None, annualization_config: dict[str, Any]) -> str:
    return str(
        annualization_config.get("selected_tax_regime")
        or (employee_profile.tax_regime if employee_profile else "")
        or PayrollTaxRegime.NOT_DECLARED
    )


def _tds_regime_projection(
    *,
    component: PayrollStatutoryComponent,
    payroll_run: PayrollRun,
    employee_profile: EmployeeStatutoryProfile | None,
    statutory_profile: dict[str, Any],
    annualization_config: dict[str, Any],
    tax_regime: str,
    wage_base_path: str,
    wage_base: Decimal,
    annualized_wage_base: Decimal,
    previous_income: Decimal,
    previous_tax_deducted: Decimal,
    annualization_multiplier: Decimal,
    remaining_period_count: Decimal,
) -> dict[str, Any]:
    declaration_adjustment, declaration_evidence = _tds_declaration_cap_adjustments(
        payroll_run=payroll_run,
        employee_profile=employee_profile,
        annualization_config=annualization_config,
        tax_regime_override=tax_regime,
    )
    taxable_annual_amount = _round_decimal(max(annualized_wage_base + previous_income - declaration_adjustment, Decimal("0.00")), 2)
    if str(annualization_config.get("tax_method") or "").lower() == "progressive_slabs":
        annual_tax, slab_trace = _progressive_tds_annual_tax(
            component=component,
            payroll_run=payroll_run,
            employee_profile=employee_profile,
            statutory_profile=statutory_profile,
            taxable_annual_amount=taxable_annual_amount,
            tax_regime_override=tax_regime,
        )
    else:
        annual_tax, slab_trace = _single_slab_tds_annual_tax(
            component=component,
            payroll_run=payroll_run,
            employee_profile=employee_profile,
            statutory_profile=statutory_profile,
            taxable_annual_amount=taxable_annual_amount,
            tax_regime_override=tax_regime,
        )

    remaining_tax = _round_decimal(max(annual_tax - previous_tax_deducted, Decimal("0.00")), 2)
    period_tax_amount = _round_decimal(remaining_tax / remaining_period_count, 2)
    return {
        "financial_year_code": _payroll_financial_year_code(payroll_run, annualization_config),
        "tax_regime": tax_regime,
        "wage_base_path": wage_base_path,
        "period_wage_base": str(_round_decimal(wage_base, 2)),
        "annualization_multiplier": str(annualization_multiplier),
        "annualized_wage_base": str(annualized_wage_base),
        "previous_employment_income": str(previous_income),
        "declaration_adjustment": str(declaration_adjustment),
        "taxable_annual_amount": str(taxable_annual_amount),
        "annual_tax": str(annual_tax),
        "previous_employment_tax_deducted": str(previous_tax_deducted),
        "remaining_tax": str(remaining_tax),
        "remaining_period_count": str(remaining_period_count),
        "period_tax_amount": str(period_tax_amount),
        "declaration_cap_evidence": declaration_evidence,
        "slab_trace": slab_trace,
    }


def _tds_regime_projection_amount(projection: dict[str, Any]) -> Decimal:
    return _to_decimal(projection.get("period_tax_amount") or "0")


def _tds_regime_comparisons(
    *,
    component: PayrollStatutoryComponent,
    payroll_run: PayrollRun,
    employee_profile: EmployeeStatutoryProfile | None,
    statutory_profile: dict[str, Any],
    annualization_config: dict[str, Any],
    selected_tax_regime: str,
    wage_base_path: str,
    wage_base: Decimal,
    annualized_wage_base: Decimal,
    previous_income: Decimal,
    previous_tax_deducted: Decimal,
    annualization_multiplier: Decimal,
    remaining_period_count: Decimal,
) -> list[dict[str, Any]]:
    if not _profile_flag(annualization_config, "compare_tax_regimes", False):
        return []

    candidate_regimes = _profile_list(annualization_config, "tax_regime_candidates") or _profile_list(annualization_config, "comparison_tax_regimes")
    if selected_tax_regime and selected_tax_regime not in candidate_regimes:
        candidate_regimes.insert(0, selected_tax_regime)

    projections: list[dict[str, Any]] = []
    seen_regimes: set[str] = set()
    for candidate_regime in candidate_regimes:
        normalized_regime = str(candidate_regime or "").strip()
        if not normalized_regime or normalized_regime.lower() in seen_regimes:
            continue
        seen_regimes.add(normalized_regime.lower())
        projections.append(_tds_regime_projection(
            component=component,
            payroll_run=payroll_run,
            employee_profile=employee_profile,
            statutory_profile=statutory_profile,
            annualization_config=annualization_config,
            tax_regime=normalized_regime,
            wage_base_path=wage_base_path,
            wage_base=wage_base,
            annualized_wage_base=annualized_wage_base,
            previous_income=previous_income,
            previous_tax_deducted=previous_tax_deducted,
            annualization_multiplier=annualization_multiplier,
            remaining_period_count=remaining_period_count,
        ))
    return projections


def _tds_annualized_line_specs(
    *,
    component: PayrollStatutoryComponent,
    payroll_run: PayrollRun,
    snapshot: PayrollInputSnapshot,
    employee_profile: EmployeeStatutoryProfile | None,
    statutory_profile: dict[str, Any],
    wage_base_path: str,
    wage_base: Decimal,
) -> list[dict[str, Any]]:
    annualization_config = _statutory_annualization_config(component, statutory_profile)
    annualization_multiplier = _to_decimal(annualization_config.get("annualization_multiplier") or annualization_config.get("annual_period_count") or "1")
    remaining_period_count = _to_decimal(
        annualization_config.get("remaining_period_count")
        or annualization_config.get("annual_period_count")
        or annualization_multiplier
        or "1"
    )
    if remaining_period_count <= 0:
        remaining_period_count = Decimal("1")

    previous_income = _round_decimal(employee_profile.previous_employment_income, 2) if employee_profile else Decimal("0.00")
    previous_tax_deducted = _round_decimal(employee_profile.previous_employment_tax_deducted, 2) if employee_profile else Decimal("0.00")
    annualized_wage_base = _round_decimal(wage_base * annualization_multiplier, 2)
    selected_tax_regime = _selected_tds_tax_regime(employee_profile, annualization_config)
    selected_projection = _tds_regime_projection(
        component=component,
        payroll_run=payroll_run,
        employee_profile=employee_profile,
        statutory_profile=statutory_profile,
        annualization_config=annualization_config,
        tax_regime=selected_tax_regime,
        wage_base_path=wage_base_path,
        wage_base=wage_base,
        annualized_wage_base=annualized_wage_base,
        previous_income=previous_income,
        previous_tax_deducted=previous_tax_deducted,
        annualization_multiplier=annualization_multiplier,
        remaining_period_count=remaining_period_count,
    )
    regime_comparisons = _tds_regime_comparisons(
        component=component,
        payroll_run=payroll_run,
        employee_profile=employee_profile,
        statutory_profile=statutory_profile,
        annualization_config=annualization_config,
        selected_tax_regime=selected_tax_regime,
        wage_base_path=wage_base_path,
        wage_base=wage_base,
        annualized_wage_base=annualized_wage_base,
        previous_income=previous_income,
        previous_tax_deducted=previous_tax_deducted,
        annualization_multiplier=annualization_multiplier,
        remaining_period_count=remaining_period_count,
    )
    if str(annualization_config.get("tax_regime_selection_mode") or "").lower() == "lowest_tax" and regime_comparisons:
        selected_projection = min(regime_comparisons, key=_tds_regime_projection_amount)
        selected_tax_regime = str(selected_projection.get("tax_regime") or selected_tax_regime)

    amount = _tds_regime_projection_amount(selected_projection)
    comparison_baseline_amount = amount
    regime_comparison_payload = [
        {
            **projection,
            "is_selected": str(projection.get("tax_regime") or "").lower() == selected_tax_regime.lower(),
            "period_tax_delta": str(_round_decimal(_tds_regime_projection_amount(projection) - comparison_baseline_amount, 2)),
        }
        for projection in regime_comparisons
    ]
    emit_zero_lines = _profile_flag(statutory_profile, "emit_zero_statutory_lines", False) or _profile_flag(annualization_config, "emit_zero_lines", False)
    if amount == Decimal("0.00") and not emit_zero_lines:
        return []

    default_code = component.code.upper().replace("-", "_")
    trace_payload = {
        **selected_projection,
        "selected_tax_regime": selected_tax_regime,
        "tax_regime_selection_mode": str(annualization_config.get("tax_regime_selection_mode") or "profile"),
        "regime_comparisons": regime_comparison_payload,
    }
    source_hash_payload = {
        **trace_payload,
        "employee_statutory_profile_hash": employee_profile.source_hash if employee_profile else "",
            "declaration_item_ids": [
                item_id
                for cap in selected_projection.get("declaration_cap_evidence", [])
                for item_id in cap.get("item_ids", [])
            ],
        }
    return [{
        "owner": PayrollStatutoryContributionOwner.EMPLOYEE,
        "amount": amount,
        "component_code": annualization_config.get("employee_component_code") or default_code,
        "component_name": annualization_config.get("employee_component_name") or component.name,
        "line_type": annualization_config.get("employee_line_type") or "tax",
        "context_snapshot": {
            "wage_base_path": wage_base_path,
            "wage_base": wage_base,
            "statutory_profile": _statutory_profile_payload(employee_profile),
            "annualization": trace_payload,
            "source_snapshot_hash": snapshot.source_hash,
        },
        "trace_snapshot": {
            "dependencies": [wage_base_path, "employee_statutory_profile", "employee_statutory_declarations"],
            "trace": [{
                "source": "payroll_statutory_tds_annualization",
                "statutory_pack_code": component.statutory_pack.code,
                "statutory_component_code": component.code,
                **trace_payload,
            }],
            "employee_statutory_profile_hash": employee_profile.source_hash if employee_profile else "",
        },
        "config_snapshot": {
            "annualization": trace_payload,
        },
        "source_hash_payload": source_hash_payload,
    }]


def _statutory_source_hash(
    *,
    snapshot: PayrollInputSnapshot,
    employee_profile: EmployeeStatutoryProfile | None,
    component: PayrollStatutoryComponent,
    slab: PayrollStatutorySlab | None,
    owner: str,
    amount: Decimal,
    extra_payload: dict[str, Any] | None = None,
) -> str:
    payload = {
        "snapshot_hash": snapshot.source_hash,
        "employee_statutory_profile_hash": employee_profile.source_hash if employee_profile else "",
        "statutory_pack_id": str(component.statutory_pack_id),
        "statutory_component_id": str(component.id),
        "statutory_component_updated_at": component.updated_at.isoformat() if component.updated_at else "",
        "statutory_slab_id": str(slab.id) if slab else "",
        "statutory_slab_updated_at": slab.updated_at.isoformat() if slab and slab.updated_at else "",
        "owner": owner,
        "amount": str(amount),
    }
    if extra_payload:
        payload["extra_payload"] = _json_safe(extra_payload)
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def _statutory_component_catalog(
    components: list[PayrollStatutoryComponent],
    statutory_profile: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    statutory_profile = statutory_profile or {}
    catalog = []
    for component in components:
        component_config = _statutory_component_config(component)
        default_code = component.code.upper().replace("-", "_")
        codes = []
        if component.contribution_owner == PayrollStatutoryContributionOwner.BOTH:
            codes.extend([
                str(component_config.get("employee_component_code") or f"{default_code}_EMPLOYEE"),
                str(component_config.get("employer_component_code") or f"{default_code}_EMPLOYER"),
            ])
        elif component.contribution_owner == PayrollStatutoryContributionOwner.EMPLOYER:
            codes.append(str(component_config.get("employer_component_code") or f"{default_code}_EMPLOYER"))
        elif component.contribution_owner == PayrollStatutoryContributionOwner.INFORMATIONAL:
            codes.append(str(component_config.get("informational_component_code") or default_code))
        else:
            codes.append(str(component_config.get("employee_component_code") or default_code))
        catalog.append({
            "statutory_pack_code": component.statutory_pack.code,
            "statutory_pack_ref": component.statutory_pack.statutory_profile_ref,
            "statutory_component_code": component.code,
            "statutory_type": component.statutory_type,
            "component_codes": codes,
            "calculation_method": component.calculation_method,
            "contribution_owner": component.contribution_owner,
            "calculation_order": _statutory_calculation_order(component),
            "wage_base_ref": component.wage_base_ref,
            "wage_base_path": _statutory_wage_base_path(component, statutory_profile),
            "statutory_treatment_ref": component.statutory_treatment_ref,
            "config": component_config,
        })
    return catalog


def _create_statutory_calculation_lines(
    *,
    payroll_run: PayrollRun,
    calculation: PayrollRunCalculation,
    snapshot: PayrollInputSnapshot,
    context: dict[str, Any],
    employee_totals: dict[str, Decimal],
    total_values: dict[str, Decimal],
    components: list[PayrollStatutoryComponent],
    employee_profiles: dict[str, EmployeeStatutoryProfile],
    statutory_profile: dict[str, Any],
) -> int:
    employee_profile = employee_profiles.get(str(snapshot.employee_id))
    context["statutory_profile"] = _statutory_profile_payload(employee_profile)
    created_count = 0

    for component_index, component in enumerate(components):
        if not _statutory_component_is_applicable(component, employee_profile, statutory_profile):
            continue
        wage_base_path = _statutory_wage_base_path(component, statutory_profile)
        if not wage_base_path:
            continue
        wage_base_value = _get_context_path(context, wage_base_path)
        if wage_base_value is None or wage_base_value == "":
            continue
        wage_base = _to_decimal(wage_base_value)
        if _tds_annualization_enabled(component, statutory_profile):
            slab = None
            line_specs = _tds_annualized_line_specs(
                component=component,
                payroll_run=payroll_run,
                snapshot=snapshot,
                employee_profile=employee_profile,
                statutory_profile=statutory_profile,
                wage_base_path=wage_base_path,
                wage_base=wage_base,
            )
        else:
            slab = _active_statutory_slab(component, payroll_run, employee_profile, statutory_profile, wage_base)
            if component.calculation_method == PayrollStatutoryCalculationMethod.SLAB and slab is None:
                continue
            line_specs = _statutory_owner_line_specs(component, slab, wage_base, statutory_profile)

        for owner_index, line_spec in enumerate(line_specs):
            amount = line_spec["amount"]
            line_type = str(line_spec["line_type"])
            line_slab = line_spec.get("slab") or slab
            _apply_line_to_totals(employee_totals, line_type, amount)
            _apply_line_to_totals(total_values, line_type, amount)
            context["components"][_normalized_key(str(line_spec["component_code"]))] = amount
            source_hash = _statutory_source_hash(
                snapshot=snapshot,
                employee_profile=employee_profile,
                component=component,
                slab=line_slab,
                owner=str(line_spec["owner"]),
                amount=amount,
                extra_payload=line_spec.get("source_hash_payload"),
            )
            context_snapshot = line_spec.get("context_snapshot") or {
                "wage_base_path": wage_base_path,
                "wage_base": wage_base,
                "statutory_profile": _statutory_profile_payload(employee_profile),
                "source_snapshot_hash": snapshot.source_hash,
            }
            trace_snapshot = line_spec.get("trace_snapshot") or {
                "dependencies": [wage_base_path, "employee_statutory_profile"],
                "trace": [
                    {
                        "source": "payroll_statutory_component",
                        "statutory_pack_code": component.statutory_pack.code,
                        "statutory_component_code": component.code,
                        "statutory_slab_code": line_slab.code if line_slab else "",
                        "wage_base": str(wage_base),
                        "amount": str(amount),
                        "owner": line_spec["owner"],
                    }
                ],
                "employee_statutory_profile_hash": employee_profile.source_hash if employee_profile else "",
            }
            trace_snapshot = {**trace_snapshot, "source_hash": source_hash}
            line_config_snapshot = {
                **_statutory_component_config(component),
                **_statutory_slab_config(line_slab),
                **(line_spec.get("config_snapshot") or {}),
            }
            PayrollCalculationLine.objects.create(
                tenant=payroll_run.tenant,
                calculation=calculation,
                payroll_run=payroll_run,
                input_snapshot=snapshot,
                employee=snapshot.employee,
                line_source=PayrollCalculationLineSource.STATUTORY,
                component_code=str(line_spec["component_code"]),
                component_name=str(line_spec["component_name"]),
                line_type=line_type,
                calculation_order=_statutory_calculation_order(component) + component_index + owner_index,
                amount=amount,
                currency_code=component.statutory_pack.currency_code,
                status=PayrollCalculationLineStatus.CALCULATED,
                expression="",
                source_hash=source_hash,
                context_snapshot=_json_safe(context_snapshot),
                result_snapshot={"result": str(amount)},
                trace_snapshot=_json_safe(trace_snapshot),
                error_message="",
                config_snapshot={
                    **line_config_snapshot,
                    "line_source": PayrollCalculationLineSource.STATUTORY,
                    "statutory_pack_id": str(component.statutory_pack_id),
                    "statutory_pack_code": component.statutory_pack.code,
                    "statutory_pack_ref": component.statutory_pack.statutory_profile_ref,
                    "statutory_component_id": str(component.id),
                    "statutory_component_code": component.code,
                    "statutory_type": component.statutory_type,
                    "statutory_treatment_ref": component.statutory_treatment_ref,
                    "statutory_slab_id": str(line_slab.id) if line_slab else "",
                    "statutory_slab_code": line_slab.code if line_slab else "",
                    "wage_base_ref": component.wage_base_ref,
                    "wage_base_path": wage_base_path,
                    "contribution_owner": component.contribution_owner,
                    "calculation_method": component.calculation_method,
                    "employee_statutory_profile_id": str(employee_profile.id) if employee_profile else "",
                    "employee_statutory_profile_hash": employee_profile.source_hash if employee_profile else "",
                },
            )
            created_count += 1

    return created_count


def _validation_profile(payroll_run: PayrollRun) -> dict[str, Any]:
    config = payroll_run.config_snapshot if isinstance(payroll_run.config_snapshot, dict) else {}
    profile = config.get("validation_profile", {})
    return profile if isinstance(profile, dict) else {}


def _validation_profile_ref(payroll_run: PayrollRun) -> str:
    config = payroll_run.config_snapshot if isinstance(payroll_run.config_snapshot, dict) else {}
    return str(config.get("validation_profile_ref") or "payroll.validation.profile.default.v1")


def _profile_flag(profile: dict[str, Any], key: str, default: bool) -> bool:
    value = profile.get(key, default)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _profile_list(profile: dict[str, Any], key: str) -> list[str]:
    value = profile.get(key, [])
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _profile_severity(profile: dict[str, Any], key: str, default: str) -> str:
    value = str(profile.get(key) or default)
    return value if value in PayrollValidationSeverity.values else default


def _profile_category(profile: dict[str, Any], key: str, default: str) -> str:
    value = str(profile.get(key) or default)
    return value if value in PayrollValidationCategory.values else default


def _create_validation_issue(
    payroll_run: PayrollRun,
    *,
    severity: str,
    category: str,
    issue_code: str,
    title: str,
    detail: str = "",
    input_snapshot: PayrollInputSnapshot | None = None,
    employee=None,
    source_ref: str = "",
    context_snapshot: dict[str, Any] | None = None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollValidationIssue:
    return PayrollValidationIssue.objects.create(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        input_snapshot=input_snapshot,
        employee=employee or (input_snapshot.employee if input_snapshot else None),
        severity=severity,
        category=category,
        status=PayrollValidationIssueStatus.OPEN,
        issue_code=issue_code,
        title=title,
        detail=detail,
        source_ref=source_ref,
        validation_profile_ref=_validation_profile_ref(payroll_run),
        context_snapshot=_json_safe(context_snapshot or {}),
        config_snapshot=_json_safe(config_snapshot or {}),
    )


def _expression_dependency_paths(expression: str) -> list[str]:
    try:
        tree = ast.parse(expression or "", mode="eval")
    except SyntaxError:
        return []

    dependencies: set[str] = set()
    allowed_functions = set(SafePayrollExpressionEvaluator.ALLOWED_FUNCTIONS)

    def attribute_path(node: ast.AST) -> str | None:
        parts: list[str] = []
        current = node
        while isinstance(current, ast.Attribute):
            parts.append(current.attr)
            current = current.value
        if isinstance(current, ast.Name):
            parts.append(current.id)
            return ".".join(reversed(parts))
        return None

    class DependencyVisitor(ast.NodeVisitor):
        def visit_Call(self, node: ast.Call) -> None:
            for arg in node.args:
                self.visit(arg)
            for keyword in node.keywords:
                self.visit(keyword.value)

        def visit_Attribute(self, node: ast.Attribute) -> None:
            path = attribute_path(node)
            if path:
                root = path.split(".", 1)[0]
                if root not in allowed_functions:
                    dependencies.add(path)

        def visit_Name(self, node: ast.Name) -> None:
            if node.id not in allowed_functions:
                dependencies.add(node.id)

    DependencyVisitor().visit(tree.body)
    return sorted(dependencies)


def _context_has_path(context: dict[str, Any], path: str) -> bool:
    current: Any = context
    for part in [item for item in str(path or "").split(".") if item]:
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return current is not None and current != ""


def _rule_output_paths(rule_version: PayrollRuleVersion, config: dict[str, Any]) -> list[str]:
    paths = [
        str(value)
        for value in [config.get("output_path"), config.get("result_path")]
        if value
    ]
    paths.append(f"components.{_normalized_key(rule_version.rule.code)}")
    paths.append(f"components.{_normalized_key(_component_code(rule_version, config))}")
    return sorted(set(paths))


def _rule_catalog(rule_versions: list[PayrollRuleVersion]) -> list[dict[str, Any]]:
    catalog = []
    for rule_version in rule_versions:
        config = _config_for_rule_version(rule_version)
        catalog.append({
            "rule_version": rule_version,
            "rule_code": rule_version.rule.code,
            "rule_name": rule_version.rule.name,
            "rule_type": rule_version.rule.rule_type,
            "component_code": _component_code(rule_version, config),
            "component_name": _component_name(rule_version, config),
            "line_type": _line_type(rule_version, config),
            "calculation_order": _calculation_order(rule_version),
            "output_paths": _rule_output_paths(rule_version, config),
            "dependencies": _expression_dependency_paths(rule_version.expression),
            "config": config,
        })
    return catalog


def validate_payroll_run_for_calculation(
    payroll_run: PayrollRun,
    *,
    snapshots: list[PayrollInputSnapshot],
    rule_versions: list[PayrollRuleVersion],
) -> list[PayrollValidationIssue]:
    """Persist configurable pre-calculation issues for a payroll run."""

    profile = _validation_profile(payroll_run)
    PayrollValidationIssue.objects.filter(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        calculation__isnull=True,
        status=PayrollValidationIssueStatus.OPEN,
    ).delete()

    issues: list[PayrollValidationIssue] = []
    profile_snapshot = {
        "validation_profile_ref": _validation_profile_ref(payroll_run),
        "validation_profile": profile,
    }

    def add_issue(**kwargs) -> None:
        issues.append(_create_validation_issue(payroll_run, config_snapshot=profile_snapshot, **kwargs))

    if not snapshots:
        add_issue(
            severity=PayrollValidationSeverity.BLOCKER,
            category=PayrollValidationCategory.SOURCE_DATA,
            issue_code="NO_INPUT_SNAPSHOTS",
            title="No payroll input snapshots found",
            detail="Collect and lock payroll input snapshots before draft calculation.",
            source_ref=f"payroll_run:{payroll_run.code}:input_snapshots",
        )

    require_locked_inputs = _profile_flag(profile, "require_locked_inputs", True)
    require_salary_payload = _profile_flag(profile, "require_salary_payload", True)
    require_salary_assignment = _profile_flag(profile, "require_salary_assignment", False)
    block_snapshot_blockers = _profile_flag(profile, "block_snapshot_blockers", True)
    warn_snapshot_warnings = _profile_flag(profile, "warn_snapshot_warnings", True)

    for snapshot in snapshots:
        if require_locked_inputs and snapshot.snapshot_status != PayrollInputSnapshotStatus.LOCKED:
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.SOURCE_DATA,
                issue_code="SNAPSHOT_NOT_LOCKED",
                title="Input snapshot is not locked",
                detail="Every employee input snapshot must be locked before draft calculation.",
                input_snapshot=snapshot,
                source_ref=f"input_snapshot:{snapshot.employee.employee_code}:{snapshot.snapshot_status}",
                context_snapshot={"snapshot_status": snapshot.snapshot_status, "source_hash": snapshot.source_hash},
            )

        salary_snapshot = snapshot.salary_snapshot if isinstance(snapshot.salary_snapshot, dict) else {}
        if require_salary_payload and not salary_snapshot.get("annual_ctc"):
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.SALARY_SETUP,
                issue_code="MISSING_SALARY_PAYLOAD",
                title="Missing salary payload",
                detail="Locked payroll calculation requires annual CTC or equivalent salary values in the input snapshot.",
                input_snapshot=snapshot,
                source_ref=f"salary_snapshot:{snapshot.employee.employee_code}",
                context_snapshot={"salary_snapshot_keys": sorted(str(key) for key in salary_snapshot.keys())},
            )

        if require_salary_assignment and not snapshot.salary_assignment_id:
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.SALARY_SETUP,
                issue_code="MISSING_SALARY_ASSIGNMENT",
                title="Missing salary assignment",
                detail="The active validation profile requires each payroll input snapshot to link to a salary assignment.",
                input_snapshot=snapshot,
                source_ref=f"salary_assignment:{snapshot.employee.employee_code}",
            )

        validation_snapshot = snapshot.validation_snapshot if isinstance(snapshot.validation_snapshot, dict) else {}
        blockers = validation_snapshot.get("blockers", [])
        warnings = validation_snapshot.get("warnings", [])
        blockers = blockers if isinstance(blockers, list) else [blockers]
        warnings = warnings if isinstance(warnings, list) else [warnings]

        if block_snapshot_blockers and blockers:
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.SOURCE_DATA,
                issue_code="SNAPSHOT_BLOCKERS",
                title="Snapshot has source-data blockers",
                detail="Resolve blocker items captured during payroll input collection before calculation.",
                input_snapshot=snapshot,
                source_ref=f"validation_snapshot:{snapshot.employee.employee_code}:blockers",
                context_snapshot={"blockers": blockers, "source_hash": snapshot.source_hash},
            )

        if warn_snapshot_warnings and warnings:
            add_issue(
                severity=PayrollValidationSeverity.WARNING,
                category=PayrollValidationCategory.SOURCE_DATA,
                issue_code="SNAPSHOT_WARNINGS",
                title="Snapshot has source-data warnings",
                detail="Review warning items captured during payroll input collection before approving payroll.",
                input_snapshot=snapshot,
                source_ref=f"validation_snapshot:{snapshot.employee.employee_code}:warnings",
                context_snapshot={"warnings": warnings, "source_hash": snapshot.source_hash},
            )

    if _profile_flag(profile, "require_rule_versions", True) and not rule_versions:
        add_issue(
            severity=PayrollValidationSeverity.BLOCKER,
            category=PayrollValidationCategory.RULE_SETUP,
            issue_code="NO_ACTIVE_RULE_VERSIONS",
            title="No active payroll rules matched the run",
            detail="Activate effective-dated payroll rule versions or update the calculation profile rule selection.",
            source_ref=f"payroll_run:{payroll_run.code}:rule_versions",
        )

    component_codes: dict[str, list[str]] = {}
    for rule_version in rule_versions:
        component_codes.setdefault(_component_code(rule_version, _config_for_rule_version(rule_version)), []).append(rule_version.rule.code)
    duplicate_components = {code: rules for code, rules in component_codes.items() if len(rules) > 1}
    if duplicate_components and _profile_flag(profile, "warn_duplicate_component_rules", True):
        add_issue(
            severity=PayrollValidationSeverity.WARNING,
            category=PayrollValidationCategory.RULE_SETUP,
            issue_code="DUPLICATE_COMPONENT_RULES",
            title="Multiple active rules target the same component",
            detail="Review calculation ordering and component mapping before approval.",
            source_ref=f"payroll_run:{payroll_run.code}:component_rules",
            context_snapshot={"component_rules": duplicate_components},
        )

    catalog = _rule_catalog(rule_versions)
    statutory_profile = _statutory_calculation_profile(payroll_run)
    statutory_components = _selected_statutory_components(payroll_run)
    statutory_catalog = _statutory_component_catalog(statutory_components, statutory_profile)
    component_codes = {str(item["component_code"]) for item in catalog}
    component_codes.update(str(component_code) for item in statutory_catalog for component_code in item["component_codes"])
    output_paths_by_rule = {
        output_path: item
        for item in catalog
        for output_path in item["output_paths"]
    }
    produced_paths: set[str] = set()
    duplicate_output_paths = sorted(
        {
            output_path
            for output_path in output_paths_by_rule
            if sum(1 for item in catalog if output_path in item["output_paths"]) > 1 and not output_path.startswith("components.")
        }
    )

    for component_code in _profile_list(profile, "required_component_codes"):
        if component_code not in component_codes:
            add_issue(
                severity=_profile_severity(profile, "required_component_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.RULE_SETUP,
                issue_code="REQUIRED_COMPONENT_MISSING",
                title="Required payroll component is not produced",
                detail="The active validation profile requires a component that no matched active rule version currently produces.",
                source_ref=f"payroll_run:{payroll_run.code}:component:{component_code}",
                context_snapshot={"required_component_code": component_code, "available_component_codes": sorted(component_codes)},
            )

    output_path_set = set(output_paths_by_rule)
    for output_path in _profile_list(profile, "required_output_paths"):
        if output_path not in output_path_set:
            add_issue(
                severity=_profile_severity(profile, "required_output_path_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.RULE_SETUP,
                issue_code="REQUIRED_OUTPUT_PATH_MISSING",
                title="Required payroll output path is not produced",
                detail="The active validation profile requires an output path that no matched active rule version currently writes.",
                source_ref=f"payroll_run:{payroll_run.code}:output_path:{output_path}",
                context_snapshot={"required_output_path": output_path, "available_output_paths": sorted(output_path_set)},
            )

    if duplicate_output_paths and _profile_flag(profile, "warn_duplicate_output_paths", True):
        add_issue(
            severity=PayrollValidationSeverity.WARNING,
            category=PayrollValidationCategory.RULE_SETUP,
            issue_code="DUPLICATE_OUTPUT_PATHS",
            title="Multiple rules write the same output path",
            detail="Review calculation order and output mapping so downstream formulas consume the intended value.",
            source_ref=f"payroll_run:{payroll_run.code}:output_paths",
            context_snapshot={"duplicate_output_paths": duplicate_output_paths},
        )

    allowed_line_types = set(_profile_list(profile, "allowed_line_types"))
    if allowed_line_types:
        invalid_lines = [
            {"rule_code": item["rule_code"], "component_code": item["component_code"], "line_type": item["line_type"]}
            for item in catalog
            if str(item["line_type"]) not in allowed_line_types
        ]
        if invalid_lines:
            add_issue(
                severity=_profile_severity(profile, "invalid_line_type_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.RULE_SETUP,
                issue_code="INVALID_LINE_TYPE",
                title="Rule has a line type outside the validation profile",
                detail="Update the rule component mapping or the tenant validation profile allowed line types.",
                source_ref=f"payroll_run:{payroll_run.code}:line_types",
                context_snapshot={"invalid_lines": invalid_lines, "allowed_line_types": sorted(allowed_line_types)},
            )

    if _statutory_calculation_enabled(payroll_run):
        if _profile_flag(statutory_profile, "require_statutory_components", False) and not statutory_components:
            add_issue(
                severity=_profile_severity(statutory_profile, "missing_component_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.STATUTORY_SETUP,
                issue_code="NO_ACTIVE_STATUTORY_COMPONENTS",
                title="No active statutory components matched the run",
                detail="Activate effective-dated statutory packs/components or update the calculation profile filters.",
                source_ref=f"payroll_run:{payroll_run.code}:statutory_components",
                context_snapshot={"statutory_profile": statutory_profile},
            )

        employee_profiles = _employee_statutory_profiles_by_employee(payroll_run, snapshots, statutory_components)
        if _profile_flag(statutory_profile, "require_employee_statutory_profile", False):
            for snapshot in snapshots:
                if str(snapshot.employee_id) not in employee_profiles:
                    add_issue(
                        severity=_profile_severity(statutory_profile, "missing_employee_profile_severity", PayrollValidationSeverity.BLOCKER),
                        category=PayrollValidationCategory.STATUTORY_SETUP,
                        issue_code="MISSING_EMPLOYEE_STATUTORY_PROFILE",
                        title="Missing employee statutory profile",
                        detail="The statutory calculation profile requires an active employee statutory profile for every calculated employee.",
                        input_snapshot=snapshot,
                        source_ref=f"employee_statutory_profile:{snapshot.employee.employee_code}",
                        context_snapshot={"employee_code": snapshot.employee.employee_code},
                    )

        sample_context = build_payroll_rule_context_from_snapshot(snapshots[0]) if snapshots else {}
        sample_context.setdefault("components", {})
        rule_output_paths = set(output_paths_by_rule)
        for item in statutory_catalog:
            wage_base_path = str(item["wage_base_path"] or "")
            if not wage_base_path:
                add_issue(
                    severity=_profile_severity(statutory_profile, "missing_wage_base_severity", PayrollValidationSeverity.BLOCKER),
                    category=PayrollValidationCategory.STATUTORY_SETUP,
                    issue_code="STATUTORY_WAGE_BASE_NOT_CONFIGURED",
                    title="Statutory component has no wage-base path",
                    detail="Configure a wage-base path on the statutory component or calculation profile before statutory calculation.",
                    source_ref=f"payroll_statutory_component:{item['statutory_component_code']}:wage_base",
                    context_snapshot={"statutory_component": item},
                )
            elif not _context_has_path(sample_context, wage_base_path) and wage_base_path not in rule_output_paths:
                add_issue(
                    severity=_profile_severity(statutory_profile, "missing_wage_base_severity", PayrollValidationSeverity.BLOCKER),
                    category=PayrollValidationCategory.STATUTORY_SETUP,
                    issue_code="STATUTORY_WAGE_BASE_NOT_FOUND",
                    title="Statutory wage-base path is not available",
                    detail="The configured statutory wage-base path is not present in locked input snapshots or prior rule outputs.",
                    source_ref=f"payroll_statutory_component:{item['statutory_component_code']}:wage_base",
                    context_snapshot={"wage_base_path": wage_base_path, "statutory_component": item},
                )

        for component in statutory_components:
            if component.calculation_method == PayrollStatutoryCalculationMethod.SLAB:
                has_active_slab = any(
                    slab.status == PayrollConfigStatus.ACTIVE
                    and slab.effective_from <= payroll_run.period.end_date
                    and (slab.effective_to is None or slab.effective_to >= payroll_run.period.start_date)
                    for slab in component.slabs.all()
                )
                if not has_active_slab and not _statutory_component_config(component).get("allow_missing_slabs"):
                    add_issue(
                        severity=_profile_severity(statutory_profile, "missing_slab_severity", PayrollValidationSeverity.BLOCKER),
                        category=PayrollValidationCategory.STATUTORY_SETUP,
                        issue_code="STATUTORY_SLAB_MISSING",
                        title="Statutory slab is not configured",
                        detail="Slab-based statutory components need at least one active effective-dated slab.",
                        source_ref=f"payroll_statutory_component:{component.code}:slabs",
                        context_snapshot={"statutory_component_code": component.code, "calculation_method": component.calculation_method},
                    )

    required_statutory_refs = _profile_list(profile, "required_statutory_profile_refs")
    if required_statutory_refs:
        available_refs = {
            str(value)
            for item in catalog
            for value in [
                item["config"].get("statutory_pack_ref"),
                item["config"].get("statutory_treatment_ref"),
                item["config"].get("tax_profile_ref"),
            ]
            if value
        }
        available_refs.update(
            str(value)
            for item in statutory_catalog
            for value in [
                item["statutory_pack_ref"],
                item["statutory_treatment_ref"],
            ]
            if value
        )
        missing_refs = [item for item in required_statutory_refs if item not in available_refs]
        if missing_refs:
            add_issue(
                severity=_profile_severity(profile, "required_statutory_profile_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.STATUTORY_SETUP,
                issue_code="REQUIRED_STATUTORY_PROFILE_MISSING",
                title="Required statutory profile is not configured",
                detail="The validation profile requires statutory pack/treatment references that are absent from the matched rules.",
                source_ref=f"payroll_run:{payroll_run.code}:statutory_profiles",
                context_snapshot={"missing_statutory_refs": missing_refs, "available_statutory_refs": sorted(available_refs)},
            )

    required_statutory_line_types = set(_profile_list(profile, "require_statutory_ref_for_line_types"))
    if required_statutory_line_types:
        missing_statutory_mapping = []
        for item in catalog:
            if str(item["line_type"]) not in required_statutory_line_types:
                continue
            config = item["config"]
            if not (config.get("statutory_pack_ref") or config.get("statutory_treatment_ref") or config.get("tax_profile_ref")):
                missing_statutory_mapping.append({
                    "rule_code": item["rule_code"],
                    "component_code": item["component_code"],
                    "line_type": item["line_type"],
                })
        if missing_statutory_mapping:
            add_issue(
                severity=_profile_severity(profile, "missing_statutory_mapping_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.STATUTORY_SETUP,
                issue_code="MISSING_STATUTORY_MAPPING",
                title="Statutory component is missing statutory mapping",
                detail="Add statutory pack, statutory treatment, or tax profile references to rule configuration.",
                source_ref=f"payroll_run:{payroll_run.code}:statutory_mappings",
                context_snapshot={"missing_statutory_mapping": missing_statutory_mapping},
            )

    dependency_severity = _profile_severity(profile, "dependency_order_severity", PayrollValidationSeverity.BLOCKER)
    if _profile_flag(profile, "validate_rule_dependency_order", True) and snapshots:
        sample_context = build_payroll_rule_context_from_snapshot(snapshots[0])
        sample_context.setdefault("components", {})
        for item in catalog:
            missing_dependencies = []
            future_dependencies = []
            for dependency in item["dependencies"]:
                if _context_has_path(sample_context, dependency) or dependency in produced_paths:
                    continue
                producer = output_paths_by_rule.get(dependency)
                if producer:
                    future_dependencies.append({
                        "dependency": dependency,
                        "producer_rule_code": producer["rule_code"],
                        "producer_order": producer["calculation_order"],
                    })
                else:
                    missing_dependencies.append(dependency)

            if future_dependencies:
                add_issue(
                    severity=dependency_severity,
                    category=PayrollValidationCategory.RULE_SETUP,
                    issue_code="RULE_DEPENDENCY_ORDER",
                    title="Rule depends on an output produced later",
                    detail="Move the producing rule earlier or change the consuming rule dependency.",
                    source_ref=f"payroll_rule:{item['rule_code']}:dependencies",
                    context_snapshot={
                        "rule_code": item["rule_code"],
                        "calculation_order": item["calculation_order"],
                        "future_dependencies": future_dependencies,
                    },
                )

            if missing_dependencies:
                add_issue(
                    severity=_profile_severity(profile, "missing_dependency_severity", PayrollValidationSeverity.WARNING),
                    category=_profile_category(profile, "missing_dependency_category", PayrollValidationCategory.RULE_SETUP),
                    issue_code="RULE_DEPENDENCY_NOT_FOUND",
                    title="Rule references inputs not found in snapshot or prior outputs",
                    detail="Confirm the dependency is supplied by locked source data, an integration, or an earlier rule output.",
                    source_ref=f"payroll_rule:{item['rule_code']}:dependencies",
                    context_snapshot={
                        "rule_code": item["rule_code"],
                        "calculation_order": item["calculation_order"],
                        "missing_dependencies": missing_dependencies,
                    },
                )

            produced_paths.update(item["output_paths"])

    snapshots_by_employee_id = {snapshot.employee_id: snapshot for snapshot in snapshots}
    applied_adjustments = PayrollAdjustment.objects.filter(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        status=PayrollAdjustmentStatus.APPLIED,
    ).select_related("employee", "input_snapshot")
    for adjustment in applied_adjustments:
        snapshot = adjustment.input_snapshot or snapshots_by_employee_id.get(adjustment.employee_id)
        if not snapshot or snapshot.snapshot_status != PayrollInputSnapshotStatus.LOCKED:
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.ADJUSTMENT,
                issue_code="APPLIED_ADJUSTMENT_WITHOUT_LOCKED_SNAPSHOT",
                title="Applied adjustment is missing a locked snapshot",
                detail="Applied one-time payroll inputs must resolve to a locked employee input snapshot for the same run.",
                employee=adjustment.employee,
                source_ref=adjustment.source_ref,
                context_snapshot={"adjustment_id": str(adjustment.id), "status": adjustment.status, "source_hash": adjustment.source_hash},
            )

    if _profile_flag(profile, "warn_pending_adjustments", True):
        pending_adjustments = PayrollAdjustment.objects.filter(
            tenant=payroll_run.tenant,
            payroll_run=payroll_run,
            status__in=[PayrollAdjustmentStatus.DRAFT, PayrollAdjustmentStatus.SUBMITTED, PayrollAdjustmentStatus.APPROVED],
        ).select_related("employee").order_by("employee__employee_code", "component_code")
        for adjustment in pending_adjustments[:25]:
            add_issue(
                severity=PayrollValidationSeverity.WARNING,
                category=PayrollValidationCategory.ADJUSTMENT,
                issue_code="PENDING_ADJUSTMENT",
                title="Pending payroll adjustment not applied",
                detail="Draft calculation can continue, but this adjustment will not be consumed until it is applied.",
                employee=adjustment.employee,
                source_ref=adjustment.source_ref,
                context_snapshot={
                    "adjustment_id": str(adjustment.id),
                    "status": adjustment.status,
                    "component_code": adjustment.component_code,
                    "amount": str(adjustment.amount),
                },
            )

    if _profile_flag(profile, "warn_pending_settlements", True):
        pending_settlements = PayrollSettlement.objects.filter(
            tenant=payroll_run.tenant,
            payroll_run=payroll_run,
            status__in=[PayrollSettlementStatus.DRAFT, PayrollSettlementStatus.SUBMITTED, PayrollSettlementStatus.APPROVED],
        ).select_related("employee").order_by("employee__employee_code", "settlement_date")
        for settlement in pending_settlements[:25]:
            add_issue(
                severity=PayrollValidationSeverity.WARNING,
                category=PayrollValidationCategory.SETTLEMENT,
                issue_code="PENDING_SETTLEMENT",
                title="Pending settlement not applied",
                detail="Draft calculation can continue, but this settlement will not be consumed until it is applied.",
                employee=settlement.employee,
                source_ref=settlement.source_ref,
                context_snapshot={
                    "settlement_id": str(settlement.id),
                    "status": settlement.status,
                    "settlement_date": settlement.settlement_date.isoformat() if settlement.settlement_date else None,
                },
            )

    return issues


def calculate_draft_payroll_run(
    payroll_run: PayrollRun,
    *,
    calculated_by=None,
    calculation_profile_ref: str | None = None,
) -> PayrollRunCalculation:
    """Create a draft calculation attempt from locked input snapshots and active rule versions."""

    if payroll_run.status not in {PayrollRunStatus.INPUTS_LOCKED, PayrollRunStatus.CALCULATED}:
        raise PayrollCalculationError("Payroll inputs must be locked before draft calculation.")

    all_snapshots = PayrollInputSnapshot.objects.filter(tenant=payroll_run.tenant, payroll_run=payroll_run)
    snapshot_count = all_snapshots.count()
    if snapshot_count == 0:
        raise PayrollCalculationError("Cannot calculate payroll before input snapshots are collected.")

    snapshots = list(all_snapshots.select_related("employee").order_by("employee__employee_code"))
    rule_versions = _selected_rule_versions(payroll_run)
    validation_issues = validate_payroll_run_for_calculation(
        payroll_run,
        snapshots=snapshots,
        rule_versions=rule_versions,
    )
    blocker_count = sum(1 for issue in validation_issues if issue.severity == PayrollValidationSeverity.BLOCKER)
    if blocker_count:
        raise PayrollCalculationError(f"Payroll run has {blocker_count} blocker validation issue(s) before draft calculation.")

    locked_snapshots = [snapshot for snapshot in snapshots if snapshot.snapshot_status == PayrollInputSnapshotStatus.LOCKED]
    if len(locked_snapshots) != snapshot_count:
        raise PayrollCalculationError("All payroll input snapshots must be locked before draft calculation.")
    if not rule_versions:
        raise PayrollCalculationError("No active payroll rule versions matched this run and period.")
    applied_adjustments = _applied_adjustments_by_snapshot(payroll_run, locked_snapshots)
    statutory_profile = _statutory_calculation_profile(payroll_run)
    statutory_components = _selected_statutory_components(payroll_run)
    employee_statutory_profiles = _employee_statutory_profiles_by_employee(payroll_run, locked_snapshots, statutory_components)

    profile_ref = calculation_profile_ref or (
        payroll_run.config_snapshot.get("calculation_profile_ref") if isinstance(payroll_run.config_snapshot, dict) else None
    ) or "payroll.calculation.profile.default.v1"
    calculated_at = timezone.now()

    with transaction.atomic():
        PayrollRunCalculation.objects.filter(
            tenant=payroll_run.tenant,
            payroll_run=payroll_run,
            status__in=[PayrollCalculationStatus.DRAFT, PayrollCalculationStatus.COMPLETED],
        ).update(status=PayrollCalculationStatus.SUPERSEDED)
        next_attempt = (PayrollRunCalculation.objects.filter(payroll_run=payroll_run).aggregate(Max("attempt_number"))["attempt_number__max"] or 0) + 1
        calculation = PayrollRunCalculation.objects.create(
            tenant=payroll_run.tenant,
            payroll_run=payroll_run,
            attempt_number=next_attempt,
            status=PayrollCalculationStatus.DRAFT,
            calculation_profile_ref=profile_ref,
            calculated_by=calculated_by,
            rule_selection_snapshot={
                "period_start": payroll_run.period.start_date.isoformat(),
                "period_end": payroll_run.period.end_date.isoformat(),
                "validation_profile_ref": _validation_profile_ref(payroll_run),
                "validation_issue_count": len(validation_issues),
                "rule_versions": [
                    {
                        "rule_code": item.rule.code,
                        "rule_name": item.rule.name,
                        "rule_type": item.rule.rule_type,
                        "version": item.version,
                        "calculation_order": _calculation_order(item),
                    }
                    for item in rule_versions
                ],
                "applied_adjustments": [
                    {
                        "adjustment_id": str(adjustment.id),
                        "employee_code": adjustment.employee.employee_code,
                        "kind": adjustment.kind,
                        "direction": adjustment.direction,
                        "component_code": adjustment.component_code,
                        "amount": str(_round_decimal(adjustment.amount, 2)),
                        "source_hash": adjustment.source_hash,
                    }
                    for adjustments in applied_adjustments.values()
                    for adjustment in adjustments
                ],
                "statutory_components": [
                    {
                        "statutory_pack_code": component.statutory_pack.code,
                        "statutory_pack_ref": component.statutory_pack.statutory_profile_ref,
                        "statutory_component_code": component.code,
                        "statutory_type": component.statutory_type,
                        "contribution_owner": component.contribution_owner,
                        "calculation_method": component.calculation_method,
                        "wage_base_ref": component.wage_base_ref,
                        "wage_base_path": _statutory_wage_base_path(component, statutory_profile),
                        "statutory_treatment_ref": component.statutory_treatment_ref,
                        "calculation_order": _statutory_calculation_order(component),
                    }
                    for component in statutory_components
                ],
            },
            config_snapshot={
                "calculation_profile": payroll_run.config_snapshot.get("calculation_profile", {}) if isinstance(payroll_run.config_snapshot, dict) else {},
            },
        )

        total_values = {
            "gross_earnings": Decimal("0.00"),
            "employee_deductions": Decimal("0.00"),
            "employer_contributions": Decimal("0.00"),
            "net_pay": Decimal("0.00"),
        }
        error_count = 0
        line_count = 0
        statutory_line_count = 0

        for snapshot in locked_snapshots:
            context = build_payroll_rule_context_from_snapshot(snapshot)
            context.setdefault("components", {})
            employee_totals = {
                "gross_earnings": Decimal("0.00"),
                "employee_deductions": Decimal("0.00"),
                "employer_contributions": Decimal("0.00"),
                "net_pay": Decimal("0.00"),
            }
            for rule_version in rule_versions:
                config = _config_for_rule_version(rule_version)
                component_code = _component_code(rule_version, config)
                component_name = _component_name(rule_version, config)
                line_type = _line_type(rule_version, config)
                calculation_order = _calculation_order(rule_version)
                currency_code = _currency_code(payroll_run, config)

                try:
                    evaluation_result = evaluate_payroll_rule_version(rule_version, context=context)
                    amount = _round_decimal(evaluation_result.result, 2)
                    status = PayrollCalculationLineStatus.CALCULATED
                    error_message = ""
                    result_payload = {"result": _json_safe(amount)}
                    trace_payload = {
                        "dependencies": evaluation_result.dependencies,
                        "trace": evaluation_result.as_payload()["trace"],
                        "source_hash": snapshot.source_hash,
                        "rule_code": rule_version.rule.code,
                        "rule_version": rule_version.version,
                    }
                    _apply_line_to_totals(employee_totals, line_type, amount)
                    _apply_line_to_totals(total_values, line_type, amount)
                    for output_path in [
                        config.get("output_path"),
                        config.get("result_path"),
                    ]:
                        if output_path:
                            _set_context_path(context, str(output_path), amount)
                    context["components"][_normalized_key(rule_version.rule.code)] = amount
                    context["components"][_normalized_key(component_code)] = amount
                except PayrollRuleEvaluationError as exc:
                    amount = Decimal("0.00")
                    status = PayrollCalculationLineStatus.ERROR
                    error_message = str(exc)
                    result_payload = {"result": "0.00"}
                    trace_payload = {
                        "dependencies": [],
                        "trace": [],
                        "source_hash": snapshot.source_hash,
                        "rule_code": rule_version.rule.code,
                        "rule_version": rule_version.version,
                        "error": str(exc),
                    }
                    error_count += 1

                PayrollCalculationLine.objects.create(
                    tenant=payroll_run.tenant,
                    calculation=calculation,
                    payroll_run=payroll_run,
                    input_snapshot=snapshot,
                    employee=snapshot.employee,
                    rule_version=rule_version,
                    line_source=PayrollCalculationLineSource.RULE,
                    component_code=component_code,
                    component_name=component_name,
                    line_type=line_type,
                    calculation_order=calculation_order,
                    amount=amount,
                    currency_code=currency_code,
                    status=status,
                    expression=rule_version.expression,
                    source_hash=snapshot.source_hash,
                    context_snapshot=_json_safe(context),
                    result_snapshot=result_payload,
                    trace_snapshot=trace_payload,
                    error_message=error_message,
                    config_snapshot=config,
                )
                line_count += 1

            for adjustment_index, adjustment in enumerate(applied_adjustments.get(str(snapshot.id), [])):
                amount = _round_decimal(adjustment.amount, 2)
                line_type = adjustment.direction
                _apply_line_to_totals(employee_totals, line_type, amount)
                _apply_line_to_totals(total_values, line_type, amount)
                context["components"][_normalized_key(adjustment.component_code)] = amount
                PayrollCalculationLine.objects.create(
                    tenant=payroll_run.tenant,
                    calculation=calculation,
                    payroll_run=payroll_run,
                    input_snapshot=snapshot,
                    employee=snapshot.employee,
                    adjustment=adjustment,
                    line_source=PayrollCalculationLineSource.ADJUSTMENT,
                    component_code=adjustment.component_code,
                    component_name=adjustment.component_name,
                    line_type=line_type,
                    calculation_order=_adjustment_order(adjustment, adjustment_index),
                    amount=amount,
                    currency_code=adjustment.currency_code,
                    status=PayrollCalculationLineStatus.CALCULATED,
                    expression="",
                    source_hash=adjustment.source_hash,
                    context_snapshot=_json_safe({
                        "adjustment": {
                            "adjustment_id": str(adjustment.id),
                            "kind": adjustment.kind,
                            "direction": adjustment.direction,
                            "profile_ref": adjustment.adjustment_profile_ref,
                            "source_ref": adjustment.source_ref,
                        },
                        "source_snapshot_hash": snapshot.source_hash,
                    }),
                    result_snapshot={"result": str(amount)},
                    trace_snapshot={
                        "dependencies": ["payroll_adjustment.amount"],
                        "trace": [{"source": "payroll_adjustment", "amount": str(amount)}],
                        "source_hash": adjustment.source_hash,
                        "adjustment_id": str(adjustment.id),
                        "adjustment_profile_ref": adjustment.adjustment_profile_ref,
                    },
                    error_message="",
                    config_snapshot={
                        **(adjustment.config_snapshot if isinstance(adjustment.config_snapshot, dict) else {}),
                        "line_source": PayrollCalculationLineSource.ADJUSTMENT,
                        "adjustment_kind": adjustment.kind,
                        "adjustment_profile_ref": adjustment.adjustment_profile_ref,
                        "approval_profile_ref": adjustment.approval_profile_ref,
                        "source_ref": adjustment.source_ref,
                    },
                )
                line_count += 1

            created_statutory_lines = _create_statutory_calculation_lines(
                payroll_run=payroll_run,
                calculation=calculation,
                snapshot=snapshot,
                context=context,
                employee_totals=employee_totals,
                total_values=total_values,
                components=statutory_components,
                employee_profiles=employee_statutory_profiles,
                statutory_profile=statutory_profile,
            )
            statutory_line_count += created_statutory_lines
            line_count += created_statutory_lines

            context["totals"] = employee_totals

        calculation.status = PayrollCalculationStatus.FAILED if error_count else PayrollCalculationStatus.COMPLETED
        calculation.calculated_at = calculated_at
        calculation.totals_snapshot = _totals_payload(
            total_values,
            employee_count=len(locked_snapshots),
            line_count=line_count,
            error_count=error_count,
        )
        calculation.error_snapshot = {
            "error_count": error_count,
            "applied_adjustment_count": sum(len(items) for items in applied_adjustments.values()),
            "statutory_component_count": len(statutory_components),
            "statutory_line_count": statutory_line_count,
            "validation_issue_count": len(validation_issues),
            "validation_warning_count": sum(1 for issue in validation_issues if issue.severity == PayrollValidationSeverity.WARNING),
            "validation_blocker_count": sum(1 for issue in validation_issues if issue.severity == PayrollValidationSeverity.BLOCKER),
        }
        calculation.save()
        if validation_issues:
            PayrollValidationIssue.objects.filter(id__in=[issue.id for issue in validation_issues]).exclude(
                severity=PayrollValidationSeverity.BLOCKER,
            ).update(calculation=calculation)

        if error_count == 0:
            payroll_run.status = PayrollRunStatus.CALCULATED
            payroll_run.save()

    return calculation


def create_payroll_adjustment(
    payroll_run: PayrollRun,
    *,
    employee,
    kind: str,
    direction: str,
    component_code: str,
    component_name: str,
    amount: Decimal,
    effective_date,
    input_snapshot: PayrollInputSnapshot | None = None,
    salary_component=None,
    currency_code: str | None = None,
    source_period_start=None,
    source_period_end=None,
    adjustment_profile_ref: str | None = None,
    approval_profile_ref: str = "",
    source_ref: str = "",
    reason: str = "",
    created_by=None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollAdjustment:
    """Create a configurable one-time payroll adjustment input."""

    if payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollAdjustmentError("Payroll adjustments cannot be created after run review starts.")
    return PayrollAdjustment.objects.create(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        employee=employee,
        input_snapshot=input_snapshot,
        salary_component=salary_component,
        kind=kind,
        status=PayrollAdjustmentStatus.DRAFT,
        direction=direction,
        component_code=component_code,
        component_name=component_name,
        amount=_round_decimal(amount, 2),
        currency_code=(currency_code or payroll_run.period.calendar.currency_code or "INR")[:3],
        effective_date=effective_date,
        source_period_start=source_period_start,
        source_period_end=source_period_end,
        adjustment_profile_ref=adjustment_profile_ref or "payroll.adjustment.profile.default.v1",
        approval_profile_ref=approval_profile_ref,
        source_ref=source_ref or f"{kind}:{employee.employee_code}:{component_code}:{effective_date}",
        reason=reason,
        config_snapshot={**(config_snapshot or {}), "created_by": str(created_by) if created_by else ""},
    )


def submit_payroll_adjustment(adjustment: PayrollAdjustment, *, submitted_by=None) -> PayrollAdjustment:
    """Submit a draft or rejected payroll adjustment for approval."""

    if adjustment.status not in {PayrollAdjustmentStatus.DRAFT, PayrollAdjustmentStatus.REJECTED}:
        raise PayrollAdjustmentError("Only draft or rejected payroll adjustments can be submitted.")
    if adjustment.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollAdjustmentError("Payroll adjustments cannot be submitted after run review starts.")
    adjustment.status = PayrollAdjustmentStatus.SUBMITTED
    adjustment.submitted_at = timezone.now()
    adjustment.submitted_by = submitted_by
    adjustment.rejected_at = None
    adjustment.rejected_by = None
    adjustment.save()
    return adjustment


def approve_payroll_adjustment(
    adjustment: PayrollAdjustment,
    *,
    approved_by=None,
    approval_profile_ref: str | None = None,
) -> PayrollAdjustment:
    """Approve a submitted payroll adjustment."""

    if adjustment.status != PayrollAdjustmentStatus.SUBMITTED:
        raise PayrollAdjustmentError("Payroll adjustment must be submitted before approval.")
    if adjustment.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollAdjustmentError("Payroll adjustments cannot be approved after run review starts.")
    adjustment.status = PayrollAdjustmentStatus.APPROVED
    adjustment.approved_at = timezone.now()
    adjustment.approved_by = approved_by
    if approval_profile_ref:
        adjustment.approval_profile_ref = approval_profile_ref
    adjustment.save()
    return adjustment


def reject_payroll_adjustment(adjustment: PayrollAdjustment, *, rejected_by=None, reason: str = "") -> PayrollAdjustment:
    """Reject a submitted payroll adjustment."""

    if adjustment.status != PayrollAdjustmentStatus.SUBMITTED:
        raise PayrollAdjustmentError("Payroll adjustment must be submitted before rejection.")
    adjustment.status = PayrollAdjustmentStatus.REJECTED
    adjustment.rejected_at = timezone.now()
    adjustment.rejected_by = rejected_by
    if reason:
        adjustment.reason = f"{adjustment.reason}\n\nRejection: {reason}".strip()
    adjustment.save()
    return adjustment


def apply_payroll_adjustment(adjustment: PayrollAdjustment, *, applied_by=None) -> PayrollAdjustment:
    """Mark an approved adjustment as consumed by payroll input/calculation preparation."""

    if adjustment.status != PayrollAdjustmentStatus.APPROVED:
        raise PayrollAdjustmentError("Only approved payroll adjustments can be applied.")
    if adjustment.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollAdjustmentError("Payroll adjustments cannot be applied after run review starts.")
    adjustment.status = PayrollAdjustmentStatus.APPLIED
    adjustment.applied_at = timezone.now()
    adjustment.applied_by = applied_by
    adjustment.save()
    return adjustment


def _settlement_adjustment_kind(line_kind: str) -> str:
    mapping = {
        PayrollSettlementLineKind.LEAVE_ENCASHMENT: "settlement",
        PayrollSettlementLineKind.NOTICE_RECOVERY: "settlement",
        PayrollSettlementLineKind.LOAN_RECOVERY: "loan",
        PayrollSettlementLineKind.ADVANCE_RECOVERY: "advance",
        PayrollSettlementLineKind.BONUS: "bonus",
        PayrollSettlementLineKind.ARREAR: "arrear",
        PayrollSettlementLineKind.GRATUITY: "settlement",
        PayrollSettlementLineKind.STATUTORY: "settlement",
        PayrollSettlementLineKind.SALARY_PRORATION: "settlement",
    }
    return mapping.get(line_kind, "settlement")


def _settlement_totals(settlement: PayrollSettlement) -> dict[str, Any]:
    lines = list(settlement.lines.all())
    gross_dues = Decimal("0.00")
    deductions = Decimal("0.00")
    reimbursements = Decimal("0.00")
    employer_contributions = Decimal("0.00")
    taxes = Decimal("0.00")
    informational = Decimal("0.00")
    for line in lines:
        amount = _round_decimal(line.amount, 2)
        if line.direction == PayrollAdjustmentDirection.EARNING:
            gross_dues += amount
        elif line.direction == PayrollAdjustmentDirection.DEDUCTION:
            deductions += amount
        elif line.direction == PayrollAdjustmentDirection.REIMBURSEMENT:
            reimbursements += amount
        elif line.direction == PayrollAdjustmentDirection.EMPLOYER_CONTRIBUTION:
            employer_contributions += amount
        elif line.direction == PayrollAdjustmentDirection.TAX:
            taxes += amount
        elif line.direction == PayrollAdjustmentDirection.INFORMATIONAL:
            informational += amount
    net_settlement = gross_dues + reimbursements - deductions - taxes
    return {
        "gross_dues": str(_round_decimal(gross_dues, 2)),
        "deductions": str(_round_decimal(deductions, 2)),
        "reimbursements": str(_round_decimal(reimbursements, 2)),
        "employer_contributions": str(_round_decimal(employer_contributions, 2)),
        "taxes": str(_round_decimal(taxes, 2)),
        "informational": str(_round_decimal(informational, 2)),
        "net_settlement": str(_round_decimal(net_settlement, 2)),
        "line_count": len(lines),
    }


def sync_payroll_settlement_totals(settlement: PayrollSettlement) -> PayrollSettlement:
    settlement.totals_snapshot = _settlement_totals(settlement)
    settlement.save()
    return settlement


def create_payroll_settlement(
    payroll_run: PayrollRun,
    *,
    employee,
    exit_record=None,
    input_snapshot: PayrollInputSnapshot | None = None,
    settlement_date: date,
    last_working_date: date | None = None,
    currency_code: str = "",
    settlement_profile_ref: str | None = None,
    approval_profile_ref: str = "",
    calculation_profile_ref: str = "",
    source_ref: str = "",
    reason: str = "",
    created_by=None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollSettlement:
    """Create a configurable full-and-final settlement package."""

    if payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Payroll settlements cannot be created after run review starts.")
    settlement = PayrollSettlement.objects.create(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        employee=employee,
        exit_record=exit_record,
        input_snapshot=input_snapshot,
        status=PayrollSettlementStatus.DRAFT,
        settlement_profile_ref=settlement_profile_ref or "payroll.settlement.profile.default.v1",
        approval_profile_ref=approval_profile_ref,
        calculation_profile_ref=calculation_profile_ref,
        source_ref=source_ref or f"settlement:{employee.employee_code}:{settlement_date}",
        reason=reason,
        settlement_date=settlement_date,
        last_working_date=last_working_date,
        currency_code=(currency_code or payroll_run.period.calendar.currency_code or "INR")[:3],
        config_snapshot={**(config_snapshot or {}), "created_by": str(created_by) if created_by else ""},
    )
    return sync_payroll_settlement_totals(settlement)


def create_payroll_settlement_line(
    settlement: PayrollSettlement,
    *,
    line_kind: str,
    direction: str,
    component_code: str,
    component_name: str,
    amount: Decimal,
    salary_component=None,
    currency_code: str = "",
    calculation_order: int = 900,
    source_ref: str = "",
    trace_snapshot: dict[str, Any] | None = None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollSettlementLine:
    """Create a settlement component line and refresh package totals."""

    if settlement.status not in {PayrollSettlementStatus.DRAFT, PayrollSettlementStatus.REJECTED}:
        raise PayrollSettlementError("Settlement lines can only be changed while a settlement is draft or rejected.")
    if settlement.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Settlement lines cannot be changed after run review starts.")
    line = PayrollSettlementLine.objects.create(
        tenant=settlement.tenant,
        settlement=settlement,
        salary_component=salary_component,
        line_kind=line_kind,
        direction=direction,
        component_code=component_code,
        component_name=component_name,
        amount=_round_decimal(amount, 2),
        currency_code=(currency_code or settlement.currency_code or "INR")[:3],
        calculation_order=calculation_order,
        source_ref=source_ref or f"{settlement.source_ref}:{line_kind}:{component_code}",
        trace_snapshot=trace_snapshot or {},
        config_snapshot=config_snapshot or {},
    )
    sync_payroll_settlement_totals(settlement)
    return line


def submit_payroll_settlement(settlement: PayrollSettlement, *, submitted_by=None) -> PayrollSettlement:
    """Submit a full-and-final settlement package for approval."""

    if settlement.status not in {PayrollSettlementStatus.DRAFT, PayrollSettlementStatus.REJECTED}:
        raise PayrollSettlementError("Only draft or rejected payroll settlements can be submitted.")
    if settlement.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Payroll settlements cannot be submitted after run review starts.")
    if not settlement.lines.exists():
        raise PayrollSettlementError("Payroll settlements require at least one settlement line before submission.")
    settlement.status = PayrollSettlementStatus.SUBMITTED
    settlement.submitted_at = timezone.now()
    settlement.submitted_by = submitted_by
    settlement.rejected_at = None
    settlement.rejected_by = None
    settlement.totals_snapshot = _settlement_totals(settlement)
    settlement.save()
    return settlement


def approve_payroll_settlement(
    settlement: PayrollSettlement,
    *,
    approved_by=None,
    approval_profile_ref: str | None = None,
) -> PayrollSettlement:
    """Approve a submitted full-and-final settlement package."""

    if settlement.status != PayrollSettlementStatus.SUBMITTED:
        raise PayrollSettlementError("Payroll settlement must be submitted before approval.")
    if settlement.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Payroll settlements cannot be approved after run review starts.")
    settlement.status = PayrollSettlementStatus.APPROVED
    settlement.approved_at = timezone.now()
    settlement.approved_by = approved_by
    if approval_profile_ref:
        settlement.approval_profile_ref = approval_profile_ref
    settlement.totals_snapshot = _settlement_totals(settlement)
    settlement.save()
    return settlement


def reject_payroll_settlement(settlement: PayrollSettlement, *, rejected_by=None, reason: str = "") -> PayrollSettlement:
    """Reject a submitted full-and-final settlement package."""

    if settlement.status != PayrollSettlementStatus.SUBMITTED:
        raise PayrollSettlementError("Payroll settlement must be submitted before rejection.")
    settlement.status = PayrollSettlementStatus.REJECTED
    settlement.rejected_at = timezone.now()
    settlement.rejected_by = rejected_by
    if reason:
        settlement.reason = f"{settlement.reason}\n\nRejection: {reason}".strip()
    settlement.save()
    return settlement


@transaction.atomic
def apply_payroll_settlement(settlement: PayrollSettlement, *, applied_by=None) -> PayrollSettlement:
    """Apply approved settlement lines as payroll adjustments for calculation consumption."""

    if settlement.status != PayrollSettlementStatus.APPROVED:
        raise PayrollSettlementError("Only approved payroll settlements can be applied.")
    if settlement.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Payroll settlements cannot be applied after run review starts.")
    if settlement.input_snapshot_id and settlement.input_snapshot.snapshot_status != PayrollInputSnapshotStatus.LOCKED:
        raise PayrollSettlementError("Payroll settlement application requires a locked input snapshot.")
    lines = list(settlement.lines.select_related("salary_component").all())
    if not lines:
        raise PayrollSettlementError("Payroll settlements require at least one settlement line before application.")
    for line in lines:
        source_ref = f"settlement-line:{line.id}"
        adjustment, created = PayrollAdjustment.objects.get_or_create(
            tenant=settlement.tenant,
            payroll_run=settlement.payroll_run,
            employee=settlement.employee,
            source_ref=source_ref,
            component_code=line.component_code,
            defaults={
                "input_snapshot": settlement.input_snapshot,
                "salary_component": line.salary_component,
                "kind": _settlement_adjustment_kind(line.line_kind),
                "status": PayrollAdjustmentStatus.APPLIED,
                "direction": line.direction,
                "component_name": line.component_name,
                "amount": line.amount,
                "currency_code": line.currency_code,
                "effective_date": settlement.settlement_date,
                "source_period_start": settlement.payroll_run.period.start_date,
                "source_period_end": settlement.payroll_run.period.end_date,
                "adjustment_profile_ref": settlement.settlement_profile_ref,
                "approval_profile_ref": settlement.approval_profile_ref,
                "reason": f"Applied from settlement {settlement.source_ref}. {settlement.reason}".strip(),
                "submitted_at": settlement.submitted_at or timezone.now(),
                "submitted_by": settlement.submitted_by,
                "approved_at": settlement.approved_at or timezone.now(),
                "approved_by": settlement.approved_by,
                "applied_at": timezone.now(),
                "applied_by": applied_by,
                "source_hash": line.source_hash,
                "config_snapshot": {
                    **line.config_snapshot,
                    "source_system_ref": "payroll.settlement.v1",
                    "settlement_id": str(settlement.id),
                    "settlement_line_id": str(line.id),
                    "settlement_profile_ref": settlement.settlement_profile_ref,
                    "calculation_order": line.calculation_order,
                    "trace_snapshot": line.trace_snapshot,
                },
            },
        )
        if not created and adjustment.status != PayrollAdjustmentStatus.APPLIED:
            raise PayrollSettlementError("Existing settlement adjustment must be applied before settlement application can continue.")
    settlement.status = PayrollSettlementStatus.APPLIED
    settlement.applied_at = timezone.now()
    settlement.applied_by = applied_by
    settlement.totals_snapshot = _settlement_totals(settlement)
    settlement.save()
    return settlement


def _review_profile(payroll_run: PayrollRun) -> dict[str, Any]:
    if not isinstance(payroll_run.config_snapshot, dict):
        return {}
    profile = payroll_run.config_snapshot.get("review_profile", {})
    return profile if isinstance(profile, dict) else {}


def _exception_summary(review: PayrollRunReview) -> dict[str, Any]:
    exceptions = review.exceptions.all()
    open_items = exceptions.filter(status=PayrollExceptionStatus.OPEN)
    return {
        "exception_count": exceptions.count(),
        "open_count": open_items.count(),
        "open_blocker_count": open_items.filter(severity=PayrollExceptionSeverity.BLOCKER).count(),
        "accepted_count": exceptions.filter(status=PayrollExceptionStatus.ACCEPTED).count(),
        "resolved_count": exceptions.filter(status=PayrollExceptionStatus.RESOLVED).count(),
        "rejected_count": exceptions.filter(status=PayrollExceptionStatus.REJECTED).count(),
    }


def _sync_review_snapshots(review: PayrollRunReview) -> PayrollRunReview:
    review.totals_snapshot = review.calculation.totals_snapshot
    review.exception_summary_snapshot = _exception_summary(review)
    review.approval_snapshot = {
        "approval_count": review.approvals.count(),
        "approved_count": review.approvals.filter(status=PayrollApprovalStatus.APPROVED).count(),
        "rejected_count": review.approvals.filter(status=PayrollApprovalStatus.REJECTED).count(),
    }
    review.save()
    return review


def open_payroll_run_review(
    calculation: PayrollRunCalculation,
    *,
    opened_by=None,
    review_profile_ref: str | None = None,
) -> PayrollRunReview:
    """Open or return the review cycle for a completed calculation."""

    if calculation.status != PayrollCalculationStatus.COMPLETED:
        raise PayrollReviewError("Payroll review requires a completed draft calculation.")
    payroll_run = calculation.payroll_run
    if payroll_run.status == PayrollRunStatus.LOCKED:
        raise PayrollReviewError("Final locked payroll runs cannot be reopened for review.")

    profile = _review_profile(payroll_run)
    profile_ref = review_profile_ref or profile.get("review_profile_ref") or "payroll.review.profile.default.v1"
    with transaction.atomic():
        review, created = PayrollRunReview.objects.get_or_create(
            tenant=calculation.tenant,
            payroll_run=payroll_run,
            calculation=calculation,
            defaults={
                "status": PayrollReviewStatus.OPEN,
                "review_profile_ref": profile_ref,
                "opened_by": opened_by,
                "totals_snapshot": calculation.totals_snapshot,
                "config_snapshot": {"review_profile": profile},
            },
        )
        if created:
            for line in calculation.lines.filter(status=PayrollCalculationLineStatus.ERROR).select_related("employee", "input_snapshot"):
                PayrollRunException.objects.create(
                    tenant=calculation.tenant,
                    review=review,
                    payroll_run=payroll_run,
                    calculation_line=line,
                    severity=PayrollExceptionSeverity.BLOCKER,
                    status=PayrollExceptionStatus.OPEN,
                    category="calculation_error",
                    title=f"{line.component_code} calculation failed",
                    detail=line.error_message or "Calculation line failed.",
                    config_snapshot={"source": "calculation_line"},
                )
            warning_count = 0
            for snapshot in payroll_run.input_snapshots.filter(validation_snapshot__isnull=False).select_related("employee"):
                warnings = snapshot.validation_snapshot.get("warnings", []) if isinstance(snapshot.validation_snapshot, dict) else []
                for warning in warnings:
                    if warning_count >= int(profile.get("max_auto_snapshot_warnings", 100)):
                        break
                    PayrollRunException.objects.create(
                        tenant=calculation.tenant,
                        review=review,
                        payroll_run=payroll_run,
                        input_snapshot=snapshot,
                        employee=snapshot.employee,
                        severity=PayrollExceptionSeverity.WARNING,
                        status=PayrollExceptionStatus.OPEN,
                        category="input_warning",
                        title="Input snapshot warning",
                        detail=str(warning),
                        config_snapshot={"source": "input_snapshot.validation_snapshot"},
                    )
                    warning_count += 1
        payroll_run.status = PayrollRunStatus.REVIEW
        payroll_run.save()
        review = _sync_review_snapshots(review)
    return review


def create_payroll_run_exception(
    review: PayrollRunReview,
    *,
    title: str,
    detail: str = "",
    category: str = "manual_review",
    severity: str = PayrollExceptionSeverity.WARNING,
    calculation_line: PayrollCalculationLine | None = None,
    input_snapshot: PayrollInputSnapshot | None = None,
    employee=None,
    created_by=None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollRunException:
    """Create a manual review exception without changing calculation amounts."""

    if review.status == PayrollReviewStatus.LOCKED:
        raise PayrollReviewError("Locked payroll reviews cannot accept new exceptions.")
    exception = PayrollRunException.objects.create(
        tenant=review.tenant,
        review=review,
        payroll_run=review.payroll_run,
        calculation_line=calculation_line,
        input_snapshot=input_snapshot,
        employee=employee,
        category=category,
        severity=severity,
        status=PayrollExceptionStatus.OPEN,
        title=title,
        detail=detail,
        config_snapshot={**(config_snapshot or {}), "created_by": str(created_by) if created_by else ""},
    )
    _sync_review_snapshots(review)
    return exception


def decide_payroll_run_exception(
    exception: PayrollRunException,
    *,
    decision: str,
    reason: str,
    decided_by=None,
) -> PayrollRunException:
    """Accept, resolve, or reject a payroll review exception."""

    if exception.review.status == PayrollReviewStatus.LOCKED:
        raise PayrollReviewError("Locked payroll reviews cannot be changed.")
    if decision not in {
        PayrollExceptionStatus.ACCEPTED,
        PayrollExceptionStatus.RESOLVED,
        PayrollExceptionStatus.REJECTED,
    }:
        raise PayrollReviewError("Unsupported payroll exception decision.")
    exception.status = decision
    exception.decision_reason = reason
    exception.decided_at = timezone.now()
    exception.decided_by = decided_by
    exception.save()
    _sync_review_snapshots(exception.review)
    return exception


def submit_payroll_run_review(review: PayrollRunReview, *, submitted_by=None) -> PayrollRunReview:
    """Mark a payroll review ready for approval after open blockers are cleared."""

    if review.status not in {PayrollReviewStatus.OPEN, PayrollReviewStatus.REJECTED}:
        raise PayrollReviewError("Only open or rejected payroll reviews can be submitted for approval.")
    summary = _exception_summary(review)
    if summary["open_blocker_count"]:
        raise PayrollReviewError("Cannot submit payroll review while blocker exceptions are open.")
    review.status = PayrollReviewStatus.READY_FOR_APPROVAL
    review.submitted_at = timezone.now()
    review.submitted_by = submitted_by
    review.save()
    review.payroll_run.status = PayrollRunStatus.REVIEW
    review.payroll_run.save()
    return _sync_review_snapshots(review)


def approve_payroll_run_review(
    review: PayrollRunReview,
    *,
    approved_by=None,
    comment: str = "",
    approval_profile_ref: str | None = None,
) -> PayrollRunApproval:
    """Approve a submitted payroll review."""

    if review.status != PayrollReviewStatus.READY_FOR_APPROVAL:
        raise PayrollReviewError("Payroll review must be ready for approval before approval.")
    summary = _exception_summary(review)
    if summary["open_blocker_count"]:
        raise PayrollReviewError("Cannot approve payroll review while blocker exceptions are open.")
    approval = PayrollRunApproval.objects.create(
        tenant=review.tenant,
        review=review,
        payroll_run=review.payroll_run,
        approver=approved_by,
        status=PayrollApprovalStatus.APPROVED,
        comment=comment,
        decided_at=timezone.now(),
        approval_profile_ref=approval_profile_ref or "payroll.approval.profile.default.v1",
    )
    review.status = PayrollReviewStatus.APPROVED
    review.approved_at = approval.decided_at
    review.approved_by = approved_by
    review.payroll_run.status = PayrollRunStatus.APPROVED
    review.payroll_run.save()
    _sync_review_snapshots(review)
    return approval


def reject_payroll_run_review(
    review: PayrollRunReview,
    *,
    rejected_by=None,
    comment: str = "",
    approval_profile_ref: str | None = None,
) -> PayrollRunApproval:
    """Reject a submitted payroll review and return it to exception handling."""

    if review.status != PayrollReviewStatus.READY_FOR_APPROVAL:
        raise PayrollReviewError("Payroll review must be ready for approval before rejection.")
    approval = PayrollRunApproval.objects.create(
        tenant=review.tenant,
        review=review,
        payroll_run=review.payroll_run,
        approver=rejected_by,
        status=PayrollApprovalStatus.REJECTED,
        comment=comment,
        decided_at=timezone.now(),
        approval_profile_ref=approval_profile_ref or "payroll.approval.profile.default.v1",
    )
    review.status = PayrollReviewStatus.REJECTED
    review.payroll_run.status = PayrollRunStatus.REVIEW
    review.payroll_run.save()
    _sync_review_snapshots(review)
    return approval


def lock_approved_payroll_run_review(review: PayrollRunReview, *, locked_by=None) -> PayrollRunReview:
    """Final-lock an approved payroll review and payroll run."""

    if review.status != PayrollReviewStatus.APPROVED:
        raise PayrollReviewError("Payroll review must be approved before final lock.")
    summary = _exception_summary(review)
    if summary["open_blocker_count"]:
        raise PayrollReviewError("Cannot lock payroll review while blocker exceptions are open.")
    lock_time = timezone.now()
    review.status = PayrollReviewStatus.LOCKED
    review.locked_at = lock_time
    review.locked_by = locked_by
    review.payroll_run.status = PayrollRunStatus.LOCKED
    review.payroll_run.final_locked_at = lock_time
    review.payroll_run.final_locked_by = locked_by
    review.payroll_run.save()
    return _sync_review_snapshots(review)


def _output_profile(review: PayrollRunReview) -> dict[str, Any]:
    config = review.payroll_run.config_snapshot if isinstance(review.payroll_run.config_snapshot, dict) else {}
    profile = config.get("output_profile", {})
    return profile if isinstance(profile, dict) else {}


def _line_payload(line: PayrollCalculationLine) -> dict[str, Any]:
    return {
        "line_id": str(line.id),
        "line_source": line.line_source,
        "adjustment_id": str(line.adjustment_id) if line.adjustment_id else None,
        "component_code": line.component_code,
        "component_name": line.component_name,
        "line_type": line.line_type,
        "calculation_order": line.calculation_order,
        "amount": str(_round_decimal(line.amount, 2)),
        "currency_code": line.currency_code,
        "rule_code": line.rule_version.rule.code if line.rule_version_id else "",
        "rule_version": line.rule_version.version if line.rule_version_id else None,
        "source_hash": line.source_hash,
        "trace_snapshot": line.trace_snapshot,
        "config_snapshot": line.config_snapshot,
    }


def _employee_totals(lines: list[PayrollCalculationLine]) -> dict[str, Any]:
    totals = {
        "gross_earnings": Decimal("0.00"),
        "employee_deductions": Decimal("0.00"),
        "employer_contributions": Decimal("0.00"),
        "net_pay": Decimal("0.00"),
    }
    for line in lines:
        _apply_line_to_totals(totals, line.line_type, _round_decimal(line.amount, 2))
    return {key: str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) for key, value in totals.items()}


def _artifact_mime_type(kind: str, profile: dict[str, Any]) -> str:
    mime_types = profile.get("mime_types") if isinstance(profile, dict) else {}
    configured = mime_types.get(kind) if isinstance(mime_types, dict) else None
    return configured or ARTIFACT_MIME_TYPES.get(kind, "application/json")


def _artifact_extension(mime_type: str) -> str:
    return ARTIFACT_FILE_EXTENSIONS.get(mime_type, "json")


def _artifact_storage_config(profile: dict[str, Any]) -> dict[str, Any]:
    storage_profile = profile.get("storage_profile") if isinstance(profile, dict) else {}
    storage_profile = storage_profile if isinstance(storage_profile, dict) else {}
    provider_ref = storage_profile.get("provider_ref") or profile.get("storage_provider_ref") or "payroll.storage.local.generated.v1"
    try:
        signed_url_expires_in_seconds = int(
            storage_profile.get("signed_url_expires_in_seconds")
            or profile.get("signed_url_expires_in_seconds")
            or 900
        )
    except (TypeError, ValueError):
        signed_url_expires_in_seconds = 900
    merged_storage_profile = {
        **storage_profile,
        "provider_ref": provider_ref,
        "key_prefix": storage_profile.get("key_prefix") or profile.get("storage_key_prefix") or "payroll",
        "retention_policy_ref": storage_profile.get("retention_policy_ref") or profile.get("retention_policy_ref") or "payroll.retention.7y.v1",
        "download_strategy_ref": storage_profile.get("download_strategy_ref") or profile.get("download_strategy_ref") or "",
        "signed_url_expires_in_seconds": signed_url_expires_in_seconds,
    }
    normalized_profile = normalize_payroll_artifact_storage_profile(provider_ref, merged_storage_profile)
    profile_snapshot = normalized_profile.snapshot()
    return {
        "storage_provider_ref": profile_snapshot["provider_ref"],
        "storage_key_prefix": profile_snapshot["key_prefix"],
        "retention_policy_ref": profile_snapshot["retention_policy_ref"],
        "download_strategy_ref": profile_snapshot["download_strategy_ref"],
        "signed_url_expires_in_seconds": profile_snapshot["signed_url_expires_in_seconds"],
        "storage_profile": profile_snapshot,
    }


def _artifact_config_with_storage(config_snapshot: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    try:
        storage_config = _artifact_storage_config(profile)
    except PayrollArtifactStorageError as exc:
        raise PayrollOutputError(str(exc)) from exc
    return {**config_snapshot, "storage_profile": storage_config["storage_profile"]}


def _artifact_storage_key(batch: PayrollOutputBatch, kind: str, file_name: str, profile: dict[str, Any]) -> str:
    storage_config = _artifact_storage_config(profile)
    prefix = str(storage_config["storage_key_prefix"]).strip("/") or "payroll"
    profile_ref = batch.output_profile_ref.replace(":", "-").replace("/", "-")
    return f"{prefix}/{batch.payroll_run.code}/{profile_ref}/{kind}/{file_name}"


def _csv_payload(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""
    fieldnames: list[str] = []
    for row in rows:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({
            key: json.dumps(_json_safe(value), sort_keys=True) if isinstance(value, (dict, list)) else _json_safe(value)
            for key, value in row.items()
        })
    return output.getvalue()


def _json_payload(title: str, totals_snapshot: dict[str, Any], line_snapshot: list[dict[str, Any]], config_snapshot: dict[str, Any]) -> str:
    return json.dumps(
        {
            "title": title,
            "totals_snapshot": _json_safe(totals_snapshot),
            "line_snapshot": _json_safe(line_snapshot),
            "config_snapshot": _json_safe(config_snapshot),
        },
        sort_keys=True,
        indent=2,
        default=str,
    )


def _html_payslip_payload(
    *,
    title: str,
    employee_name: str,
    employee_code: str,
    payroll_run_name: str,
    totals_snapshot: dict[str, Any],
    line_snapshot: list[dict[str, Any]],
) -> str:
    rows = "\n".join(
        (
            "<tr>"
            f"<td>{line.get('component_code', '')}</td>"
            f"<td>{line.get('component_name', '')}</td>"
            f"<td>{line.get('line_type', '')}</td>"
            f"<td>{line.get('amount', '')}</td>"
            "</tr>"
        )
        for line in line_snapshot
    )
    total_rows = "\n".join(
        f"<tr><th>{key.replace('_', ' ').title()}</th><td>{value}</td></tr>"
        for key, value in totals_snapshot.items()
    )
    return (
        "<!doctype html><html><head><meta charset=\"utf-8\">"
        f"<title>{title}</title>"
        "<style>body{font-family:Arial,sans-serif;color:#111827;padding:24px}"
        "table{border-collapse:collapse;width:100%;margin-top:16px}"
        "th,td{border:1px solid #dbe3ef;padding:8px;text-align:left}"
        "th{background:#f8fafc}</style></head><body>"
        f"<h1>{title}</h1><p>{payroll_run_name}</p>"
        f"<p><strong>{employee_name}</strong> / {employee_code}</p>"
        f"<h2>Totals</h2><table>{total_rows}</table>"
        "<h2>Pay lines</h2><table><thead><tr><th>Component</th><th>Name</th><th>Type</th><th>Amount</th></tr></thead>"
        f"<tbody>{rows}</tbody></table></body></html>"
    )


def _artifact_file_payload(
    *,
    kind: str,
    title: str,
    totals_snapshot: dict[str, Any],
    line_snapshot: list[dict[str, Any]],
    config_snapshot: dict[str, Any],
    mime_type: str,
    employee_name: str = "",
    employee_code: str = "",
    payroll_run_name: str = "",
) -> str:
    if kind == PayrollOutputArtifactKind.PAYSLIP and mime_type == "text/html":
        return _html_payslip_payload(
            title=title,
            employee_name=employee_name,
            employee_code=employee_code,
            payroll_run_name=payroll_run_name,
            totals_snapshot=totals_snapshot,
            line_snapshot=line_snapshot,
        )
    if mime_type == "text/csv":
        return _csv_payload(line_snapshot)
    return _json_payload(title, totals_snapshot, line_snapshot, config_snapshot)


def _artifact_file_kwargs(
    *,
    batch: PayrollOutputBatch,
    kind: str,
    title: str,
    file_name: str,
    totals_snapshot: dict[str, Any],
    line_snapshot: list[dict[str, Any]],
    config_snapshot: dict[str, Any],
    profile: dict[str, Any],
    employee_name: str = "",
    employee_code: str = "",
) -> dict[str, Any]:
    mime_type = _artifact_mime_type(kind, profile)
    try:
        storage_config = _artifact_storage_config(profile)
    except PayrollArtifactStorageError as exc:
        raise PayrollOutputError(str(exc)) from exc
    payload = _artifact_file_payload(
        kind=kind,
        title=title,
        totals_snapshot=totals_snapshot,
        line_snapshot=line_snapshot,
        config_snapshot=config_snapshot,
        mime_type=mime_type,
        employee_name=employee_name,
        employee_code=employee_code,
        payroll_run_name=batch.payroll_run.name,
    )
    try:
        stored = store_payroll_artifact_payload(
            storage_provider_ref=storage_config["storage_provider_ref"],
            storage_key=_artifact_storage_key(batch, kind, file_name, profile),
            file_name=file_name,
            content_type=mime_type,
            payload=payload,
            config=storage_config,
        )
    except PayrollArtifactStorageError as exc:
        raise PayrollOutputError(str(exc)) from exc
    return {
        "file_name": file_name,
        "content_type": mime_type,
        "storage_provider_ref": stored.storage_provider_ref,
        "storage_key": stored.storage_key,
        "storage_object_version": stored.storage_object_version,
        "mime_type": mime_type,
        "file_size_bytes": stored.file_size_bytes,
        "checksum_sha256": stored.checksum_sha256,
        "is_downloadable": True,
        "download_strategy_ref": storage_config["download_strategy_ref"] or stored.download_strategy_ref,
        "supports_signed_url": stored.supports_signed_url,
        "signed_url_expires_in_seconds": stored.signed_url_expires_in_seconds,
        "retention_policy_ref": storage_config["retention_policy_ref"],
        "file_payload": stored.file_payload,
    }


def _sync_output_batch_summary(batch: PayrollOutputBatch) -> PayrollOutputBatch:
    artifacts = batch.artifacts.all()
    batch.artifact_summary_snapshot = {
        "artifact_count": artifacts.count(),
        "payslip_count": artifacts.filter(kind=PayrollOutputArtifactKind.PAYSLIP).count(),
        "register_count": artifacts.filter(kind=PayrollOutputArtifactKind.REGISTER).count(),
        "published_count": artifacts.filter(status=PayrollOutputArtifactStatus.PUBLISHED).count(),
        "voided_count": artifacts.filter(status=PayrollOutputArtifactStatus.VOIDED).count(),
    }
    batch.save()
    return batch


def _artifact_access_profile(artifact: PayrollOutputArtifact) -> dict[str, Any]:
    artifact_config = artifact.config_snapshot if isinstance(artifact.config_snapshot, dict) else {}
    batch_config = artifact.output_batch.config_snapshot if artifact.output_batch_id and isinstance(artifact.output_batch.config_snapshot, dict) else {}
    batch_profile = batch_config.get("output_profile") if isinstance(batch_config, dict) else {}
    profile = artifact_config.get("artifact_access_profile") or batch_config.get("artifact_access_profile") or {}
    if not profile and isinstance(batch_profile, dict):
        profile = batch_profile.get("artifact_access_profile") or batch_profile.get("payslip_delivery_profile") or {}
    return profile if isinstance(profile, dict) else {}


def _artifact_event_profile_ref(artifact: PayrollOutputArtifact, event_type: str) -> str:
    profile = _artifact_access_profile(artifact)
    return (
        profile.get(f"{event_type}_event_profile_ref")
        or profile.get("event_profile_ref")
        or DEFAULT_ARTIFACT_ACCESS_PROFILE_REF
    )


def _artifact_source_channel_ref(artifact: PayrollOutputArtifact, event_type: str, default: str = DEFAULT_EMPLOYEE_PORTAL_CHANNEL_REF) -> str:
    profile = _artifact_access_profile(artifact)
    return (
        profile.get(f"{event_type}_source_channel_ref")
        or profile.get("source_channel_ref")
        or default
    )


def create_payroll_artifact_access_event(
    artifact: PayrollOutputArtifact,
    *,
    event_type: str,
    actor_user=None,
    actor_membership=None,
    actor_identifier: str = "",
    notification=None,
    signed_access_grant: PayrollArtifactSignedAccessGrant | None = None,
    request_identifier: str = "",
    ip_address: str | None = None,
    user_agent: str = "",
    source_channel_ref: str | None = None,
    event_profile_ref: str | None = None,
    status: str = PayrollArtifactAccessEventStatus.RECORDED,
    read_at=None,
    metadata_snapshot: dict[str, Any] | None = None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollArtifactAccessEvent:
    """Record an immutable payroll artifact access event with storage evidence."""

    return PayrollArtifactAccessEvent.objects.create(
        tenant=artifact.tenant,
        output_artifact=artifact,
        output_batch=artifact.output_batch,
        payroll_run=artifact.payroll_run,
        review=artifact.review,
        employee=artifact.employee,
        actor_user=actor_user,
        actor_membership=actor_membership,
        actor_identifier=actor_identifier,
        notification=notification,
        signed_access_grant=signed_access_grant,
        event_type=event_type,
        status=status,
        event_profile_ref=event_profile_ref or _artifact_event_profile_ref(artifact, event_type),
        source_channel_ref=source_channel_ref or _artifact_source_channel_ref(artifact, event_type),
        request_identifier=request_identifier,
        ip_address=ip_address or None,
        user_agent=user_agent,
        storage_provider_ref=artifact.storage_provider_ref,
        storage_key=artifact.storage_key,
        storage_object_version=artifact.storage_object_version,
        download_strategy_ref=artifact.download_strategy_ref,
        checksum_sha256=artifact.checksum_sha256,
        read_at=read_at,
        metadata_snapshot=metadata_snapshot or {},
        config_snapshot=config_snapshot or {},
    )


def _artifact_signed_access_profile(artifact: PayrollOutputArtifact) -> dict[str, Any]:
    access_profile = _artifact_access_profile(artifact)
    profile = access_profile.get("signed_access_profile") if isinstance(access_profile, dict) else {}
    return profile if isinstance(profile, dict) else access_profile


def _signed_access_download_path(artifact: PayrollOutputArtifact, *, source_channel_ref: str) -> str:
    profile = _artifact_signed_access_profile(artifact)
    if source_channel_ref == DEFAULT_EMPLOYEE_PORTAL_CHANNEL_REF and artifact.kind == PayrollOutputArtifactKind.PAYSLIP:
        template = profile.get("employee_download_path_template") or "/api/v1/me/payroll-payslips/{artifact_id}/download/"
    else:
        template = profile.get("hr_admin_download_path_template") or "/api/v1/hr-admin/payroll-output-artifacts/{artifact_id}/download/"
    return template.format(artifact_id=artifact.id)


def _build_signed_access_url(
    artifact: PayrollOutputArtifact,
    *,
    grant: PayrollArtifactSignedAccessGrant,
    token: str,
    source_channel_ref: str,
) -> str:
    path = _signed_access_download_path(artifact, source_channel_ref=source_channel_ref)
    separator = "&" if "?" in path else "?"
    return f"{path}{separator}{urlencode({'grant_id': str(grant.id), 'token': token})}"


def _assert_artifact_can_issue_signed_access(artifact: PayrollOutputArtifact) -> None:
    if artifact.status != PayrollOutputArtifactStatus.PUBLISHED:
        raise PayrollOutputError("Signed access grants require a published payroll artifact.")
    if not artifact.is_downloadable:
        raise PayrollOutputError("Signed access grants require a downloadable payroll artifact.")
    if not artifact.supports_signed_url:
        raise PayrollOutputError("The configured payroll artifact storage strategy does not support signed access grants.")


def issue_payroll_artifact_signed_access_grant(
    artifact: PayrollOutputArtifact,
    *,
    issued_by_user=None,
    issued_by_membership=None,
    issued_to_user=None,
    issued_to_membership=None,
    actor_identifier: str = "",
    source_channel_ref: str = DEFAULT_HR_ADMIN_CHANNEL_REF,
    request_identifier: str = "",
    ip_address: str | None = None,
    user_agent: str = "",
    expires_in_seconds: int | None = None,
    max_access_count: int | None = None,
    permission_scope: str = DEFAULT_SIGNED_ACCESS_PERMISSION_SCOPE,
    metadata_snapshot: dict[str, Any] | None = None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollArtifactSignedAccessGrantIssue:
    """Issue a token-bound signed access grant and record an issuance event."""

    _assert_artifact_can_issue_signed_access(artifact)
    profile = _artifact_signed_access_profile(artifact)
    requested_expiry = expires_in_seconds or int(profile.get("signed_url_expires_in_seconds") or artifact.signed_url_expires_in_seconds or 900)
    min_expiry = int(profile.get("min_signed_url_expires_in_seconds") or 60)
    max_expiry = int(profile.get("max_signed_url_expires_in_seconds") or artifact.signed_url_expires_in_seconds or 900)
    bounded_expiry = max(min_expiry, min(requested_expiry, max_expiry))
    configured_max_access_count = max_access_count if max_access_count is not None else profile.get("max_access_count")
    max_access_count_value = int(configured_max_access_count) if configured_max_access_count not in {None, ""} else None
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    token_prefix = token[:12]
    expires_at = timezone.now() + timedelta(seconds=bounded_expiry)
    grant = PayrollArtifactSignedAccessGrant.objects.create(
        tenant=artifact.tenant,
        output_artifact=artifact,
        output_batch=artifact.output_batch,
        payroll_run=artifact.payroll_run,
        review=artifact.review,
        employee=artifact.employee,
        issued_to_user=issued_to_user,
        issued_to_membership=issued_to_membership,
        issued_by_user=issued_by_user,
        issued_by_membership=issued_by_membership,
        status=PayrollArtifactSignedAccessGrantStatus.ACTIVE,
        permission_scope=permission_scope or DEFAULT_SIGNED_ACCESS_PERMISSION_SCOPE,
        grant_profile_ref=profile.get("grant_profile_ref") or DEFAULT_SIGNED_ACCESS_GRANT_PROFILE_REF,
        source_channel_ref=source_channel_ref,
        token_hash=token_hash,
        token_prefix=token_prefix,
        expires_at=expires_at,
        max_access_count=max_access_count_value,
        storage_provider_ref=artifact.storage_provider_ref,
        storage_key=artifact.storage_key,
        storage_object_version=artifact.storage_object_version,
        download_strategy_ref=artifact.download_strategy_ref,
        checksum_sha256=artifact.checksum_sha256,
        metadata_snapshot={
            "request_identifier": request_identifier,
            "ip_address": ip_address or "",
            "user_agent": user_agent,
            **(metadata_snapshot or {}),
        },
        config_snapshot=config_snapshot or profile,
    )
    signed_url = _build_signed_access_url(artifact, grant=grant, token=token, source_channel_ref=source_channel_ref)
    grant.signed_url = signed_url.replace(token, f"{token_prefix}...")
    grant.save(update_fields=["signed_url", "updated_at"])
    create_payroll_artifact_access_event(
        artifact,
        event_type=PayrollArtifactAccessEventType.SIGNED_URL_ISSUED,
        actor_user=issued_by_user,
        actor_membership=issued_by_membership,
        actor_identifier=actor_identifier,
        signed_access_grant=grant,
        request_identifier=request_identifier,
        ip_address=ip_address,
        user_agent=user_agent,
        source_channel_ref=source_channel_ref,
        event_profile_ref=_artifact_event_profile_ref(artifact, PayrollArtifactAccessEventType.SIGNED_URL_ISSUED),
        metadata_snapshot={
            "signed_access_grant_id": str(grant.id),
            "permission_scope": grant.permission_scope,
            "expires_at": expires_at.isoformat(),
            "issued_to_user_id": str(issued_to_user.id) if issued_to_user else "",
            "issued_to_membership_id": str(issued_to_membership.id) if issued_to_membership else "",
            "max_access_count": grant.max_access_count,
            **(metadata_snapshot or {}),
        },
    )
    return PayrollArtifactSignedAccessGrantIssue(grant=grant, signed_url=signed_url, token=token)


def validate_payroll_artifact_signed_access_grant(
    artifact: PayrollOutputArtifact,
    *,
    grant_id: str,
    token: str,
    actor_user=None,
    actor_membership=None,
) -> PayrollArtifactSignedAccessGrant:
    """Validate an incoming signed access grant against artifact, token, expiry, and recipient binding."""

    if not grant_id or not token:
        raise PayrollOutputError("Signed access grant id and token are required.")
    grant = PayrollArtifactSignedAccessGrant.objects.filter(
        tenant=artifact.tenant,
        output_artifact=artifact,
        id=grant_id,
    ).first()
    if not grant:
        raise PayrollOutputError("Signed access grant was not found for this payroll artifact.")
    if grant.token_hash != hashlib.sha256(token.encode("utf-8")).hexdigest():
        raise PayrollOutputError("Signed access grant token is invalid.")
    now = timezone.now()
    if grant.status == PayrollArtifactSignedAccessGrantStatus.REVOKED:
        raise PayrollOutputError("Signed access grant has been revoked.")
    if grant.expires_at <= now:
        grant.status = PayrollArtifactSignedAccessGrantStatus.EXPIRED
        grant.save(update_fields=["status", "updated_at"])
        raise PayrollOutputError("Signed access grant has expired.")
    if grant.max_access_count is not None and grant.access_count >= grant.max_access_count:
        raise PayrollOutputError("Signed access grant access limit has been reached.")
    if grant.issued_to_user_id and (not actor_user or grant.issued_to_user_id != actor_user.id):
        raise PayrollOutputError("Signed access grant is not issued to this user.")
    if grant.issued_to_membership_id and (not actor_membership or grant.issued_to_membership_id != actor_membership.id):
        raise PayrollOutputError("Signed access grant is not issued to this membership.")
    return grant


def mark_payroll_artifact_signed_access_grant_used(grant: PayrollArtifactSignedAccessGrant) -> PayrollArtifactSignedAccessGrant:
    grant.access_count += 1
    grant.last_accessed_at = timezone.now()
    grant.save(update_fields=["access_count", "last_accessed_at", "updated_at"])
    return grant


def revoke_payroll_artifact_signed_access_grant(
    grant: PayrollArtifactSignedAccessGrant,
    *,
    revoked_by_user=None,
    revoked_by_membership=None,
    actor_identifier: str = "",
    reason: str,
    request_identifier: str = "",
    ip_address: str | None = None,
    user_agent: str = "",
) -> PayrollArtifactSignedAccessGrant:
    """Revoke an active signed access grant and record a revocation event."""

    if grant.status == PayrollArtifactSignedAccessGrantStatus.REVOKED:
        return grant
    if not reason:
        raise PayrollOutputError("Revoking a signed access grant requires a reason.")
    grant.status = PayrollArtifactSignedAccessGrantStatus.REVOKED
    grant.revoked_at = timezone.now()
    grant.revoked_by_user = revoked_by_user
    grant.revoked_by_membership = revoked_by_membership
    grant.revocation_reason = reason
    grant.save()
    create_payroll_artifact_access_event(
        grant.output_artifact,
        event_type=PayrollArtifactAccessEventType.REVOKED,
        actor_user=revoked_by_user,
        actor_membership=revoked_by_membership,
        actor_identifier=actor_identifier,
        signed_access_grant=grant,
        request_identifier=request_identifier,
        ip_address=ip_address,
        user_agent=user_agent,
        source_channel_ref=grant.source_channel_ref,
        status=PayrollArtifactAccessEventStatus.REVOKED,
        metadata_snapshot={
            "signed_access_grant_id": str(grant.id),
            "revocation_reason": reason,
        },
    )
    return grant


def payroll_artifact_access_audit_rows(artifact: PayrollOutputArtifact) -> list[dict[str, Any]]:
    """Build exportable access audit rows for one payroll output artifact."""

    rows: list[dict[str, Any]] = []
    for event in artifact.access_events.select_related("signed_access_grant", "notification", "actor_user", "actor_membership").order_by("created_at"):
        rows.append({
            "row_type": "event",
            "artifact_id": str(artifact.id),
            "artifact_key": artifact.artifact_key,
            "event_or_grant_id": str(event.id),
            "event_type": event.event_type,
            "status": event.status,
            "source_channel_ref": event.source_channel_ref,
            "actor_identifier": event.actor_identifier,
            "request_identifier": event.request_identifier,
            "signed_access_grant_id": str(event.signed_access_grant_id or ""),
            "notification_id": str(event.notification_id or ""),
            "storage_provider_ref": event.storage_provider_ref,
            "storage_object_version": event.storage_object_version,
            "download_strategy_ref": event.download_strategy_ref,
            "checksum_sha256": event.checksum_sha256,
            "occurred_at": event.created_at.isoformat(),
            "expires_at": "",
            "revoked_at": "",
            "access_count": "",
            "metadata_snapshot": json.dumps(event.metadata_snapshot, sort_keys=True, default=str),
        })
    for grant in artifact.signed_access_grants.select_related("issued_to_user", "issued_to_membership", "issued_by_user", "revoked_by_user").order_by("created_at"):
        rows.append({
            "row_type": "signed_access_grant",
            "artifact_id": str(artifact.id),
            "artifact_key": artifact.artifact_key,
            "event_or_grant_id": str(grant.id),
            "event_type": "signed_access_grant",
            "status": grant.status,
            "source_channel_ref": grant.source_channel_ref,
            "actor_identifier": str(grant.issued_by_user or ""),
            "request_identifier": str((grant.metadata_snapshot or {}).get("request_identifier") or ""),
            "signed_access_grant_id": str(grant.id),
            "notification_id": "",
            "storage_provider_ref": grant.storage_provider_ref,
            "storage_object_version": grant.storage_object_version,
            "download_strategy_ref": grant.download_strategy_ref,
            "checksum_sha256": grant.checksum_sha256,
            "occurred_at": grant.created_at.isoformat(),
            "expires_at": grant.expires_at.isoformat(),
            "revoked_at": grant.revoked_at.isoformat() if grant.revoked_at else "",
            "access_count": str(grant.access_count),
            "metadata_snapshot": json.dumps(grant.metadata_snapshot, sort_keys=True, default=str),
        })
    return sorted(rows, key=lambda row: (row["occurred_at"], row["row_type"], row["event_or_grant_id"]))


def notify_published_payroll_payslip(artifact: PayrollOutputArtifact, *, published_by=None):
    """Create configured employee notifications for a newly published payslip artifact."""

    if artifact.kind != PayrollOutputArtifactKind.PAYSLIP or not artifact.employee_id:
        return []
    membership = getattr(artifact.employee, "membership", None)
    if not membership:
        return []

    profile = _artifact_access_profile(artifact)
    trigger_key = profile.get("publish_notification_trigger_key") or DEFAULT_PAYSLIP_PUBLISH_NOTIFICATION_TRIGGER_KEY
    payload = {
        "artifact_id": str(artifact.id),
        "payroll_run_id": str(artifact.payroll_run_id),
        "payroll_run_name": artifact.payroll_run.name,
        "period_name": artifact.payroll_run.period.name if artifact.payroll_run.period_id else "",
        "pay_date": artifact.payroll_run.period.pay_date.isoformat() if artifact.payroll_run.period_id and artifact.payroll_run.period.pay_date else "",
        "employee_id": str(artifact.employee_id),
        "employee_code": artifact.employee.employee_code,
        "employee_name": str(artifact.employee),
        "file_name": artifact.file_name,
        "storage_provider_ref": artifact.storage_provider_ref,
        "storage_object_version": artifact.storage_object_version,
        "download_strategy_ref": artifact.download_strategy_ref,
        "retention_policy_ref": artifact.retention_policy_ref,
        "checksum_sha256": artifact.checksum_sha256,
        "source_hash": artifact.source_hash,
        "download_path": f"/ess/payslips?payslipId={artifact.id}",
        "published_by": str(published_by) if published_by else "",
    }
    notifications = trigger_notification_event(
        tenant=artifact.tenant,
        module=profile.get("notification_module") or "payroll",
        trigger_key=trigger_key,
        subject_type=profile.get("notification_subject_type") or "payroll_payslip",
        subject_identifier=str(artifact.id),
        recipient_membership=membership,
        recipient_identifier=getattr(membership.user, "username", "") if membership.user_id else artifact.employee.employee_code,
        fallback_title=profile.get("fallback_title") or f"{artifact.payroll_run.period.name} payslip is available",
        fallback_subject=profile.get("fallback_subject") or "Payslip published",
        fallback_body=profile.get("fallback_body") or "Your payroll payslip has been published and is available in self service.",
        payload=payload,
    )
    delivered_at = timezone.now()
    for notification in notifications:
        if notification.channel == NotificationChannel.IN_APP and notification.status == NotificationStatus.PENDING:
            notification.status = NotificationStatus.DELIVERED
            notification.sent_at = notification.sent_at or delivered_at
            notification.delivered_at = notification.delivered_at or delivered_at
            notification.save(update_fields=["status", "sent_at", "delivered_at", "updated_at"])
        create_payroll_artifact_access_event(
            artifact,
            event_type=PayrollArtifactAccessEventType.NOTIFIED,
            actor_user=published_by,
            actor_identifier=str(published_by) if published_by else "",
            notification=notification,
            source_channel_ref=_artifact_source_channel_ref(artifact, PayrollArtifactAccessEventType.NOTIFIED, DEFAULT_EMPLOYEE_PORTAL_CHANNEL_REF),
            metadata_snapshot={
                "notification_id": str(notification.id),
                "channel": notification.channel,
                "status": notification.status,
                "trigger_key": trigger_key,
            },
        )
    return notifications


def generate_payroll_outputs(
    review: PayrollRunReview,
    *,
    generated_by=None,
    output_profile_ref: str | None = None,
) -> PayrollOutputBatch:
    """Generate payslip and register artifact snapshots for a final-locked payroll review."""

    if review.status != PayrollReviewStatus.LOCKED:
        raise PayrollOutputError("Payroll outputs require a final-locked payroll review.")
    if review.payroll_run.status != PayrollRunStatus.LOCKED:
        raise PayrollOutputError("Payroll outputs require a final-locked payroll run.")

    profile = _output_profile(review)
    profile_ref = output_profile_ref or profile.get("output_profile_ref") or "payroll.output.profile.default.v1"
    existing = PayrollOutputBatch.objects.filter(
        tenant=review.tenant,
        review=review,
        output_profile_ref=profile_ref,
    ).first()
    if existing:
        if existing.status == PayrollOutputBatchStatus.PUBLISHED:
            raise PayrollOutputError("Published payroll output batches cannot be regenerated.")
        return _sync_output_batch_summary(existing)

    calculation = review.calculation
    lines = list(
        calculation.lines.select_related("employee", "input_snapshot", "rule_version__rule").order_by(
            "employee__employee_code",
            "calculation_order",
            "component_code",
        )
    )
    if not lines:
        raise PayrollOutputError("Payroll outputs require calculation lines.")

    generated_at = timezone.now()
    with transaction.atomic():
        batch = PayrollOutputBatch.objects.create(
            tenant=review.tenant,
            payroll_run=review.payroll_run,
            review=review,
            status=PayrollOutputBatchStatus.GENERATED,
            output_profile_ref=profile_ref,
            generated_at=generated_at,
            generated_by=generated_by,
            totals_snapshot=review.totals_snapshot,
            config_snapshot={
                "output_profile": profile,
                "calculation_id": str(calculation.id),
                "review_id": str(review.id),
            },
        )
        employee_groups: dict[str, list[PayrollCalculationLine]] = {}
        for line in lines:
            employee_groups.setdefault(str(line.employee_id), []).append(line)

        register_rows = []
        for employee_lines in employee_groups.values():
            first_line = employee_lines[0]
            totals = _employee_totals(employee_lines)
            line_payloads = [_line_payload(line) for line in employee_lines]
            employee_code = first_line.employee.employee_code
            artifact_key = f"payslip:{employee_code}"
            payslip_title = f"Payslip - {first_line.employee}"
            payslip_file_name = f"{review.payroll_run.code}-{employee_code}-payslip.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.PAYSLIP, profile))}"
            payslip_config = {
                "artifact_template_ref": profile.get("payslip_template_ref", "payroll.payslip.template.default.v1"),
                "source_hashes": sorted({line.source_hash for line in employee_lines if line.source_hash}),
            }
            payslip_config = _artifact_config_with_storage(payslip_config, profile)
            PayrollOutputArtifact.objects.create(
                tenant=review.tenant,
                output_batch=batch,
                payroll_run=review.payroll_run,
                review=review,
                employee=first_line.employee,
                input_snapshot=first_line.input_snapshot,
                kind=PayrollOutputArtifactKind.PAYSLIP,
                status=PayrollOutputArtifactStatus.GENERATED,
                artifact_key=artifact_key,
                title=payslip_title,
                output_profile_ref=profile_ref,
                totals_snapshot=totals,
                line_snapshot=line_payloads,
                config_snapshot=payslip_config,
                **_artifact_file_kwargs(
                    batch=batch,
                    kind=PayrollOutputArtifactKind.PAYSLIP,
                    title=payslip_title,
                    file_name=payslip_file_name,
                    totals_snapshot=totals,
                    line_snapshot=line_payloads,
                    config_snapshot=payslip_config,
                    profile=profile,
                    employee_name=str(first_line.employee),
                    employee_code=employee_code,
                ),
            )
            register_rows.append({
                "employee_id": str(first_line.employee_id),
                "employee_code": employee_code,
                "employee_name": str(first_line.employee),
                "input_snapshot_id": str(first_line.input_snapshot_id),
                "source_hash": first_line.source_hash,
                **totals,
            })

        register_title = f"Payroll Register - {review.payroll_run.name}"
        register_file_name = f"{review.payroll_run.code}-payroll-register.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.REGISTER, profile))}"
        register_config = {
            "artifact_template_ref": profile.get("register_template_ref", "payroll.register.template.default.v1"),
            "employee_count": len(register_rows),
        }
        register_config = _artifact_config_with_storage(register_config, profile)
        PayrollOutputArtifact.objects.create(
            tenant=review.tenant,
            output_batch=batch,
            payroll_run=review.payroll_run,
            review=review,
            kind=PayrollOutputArtifactKind.REGISTER,
            status=PayrollOutputArtifactStatus.GENERATED,
            artifact_key=f"register:{review.payroll_run.code}",
            title=register_title,
            output_profile_ref=profile_ref,
            totals_snapshot=review.totals_snapshot,
            line_snapshot=register_rows,
            config_snapshot=register_config,
            **_artifact_file_kwargs(
                batch=batch,
                kind=PayrollOutputArtifactKind.REGISTER,
                title=register_title,
                file_name=register_file_name,
                totals_snapshot=review.totals_snapshot,
                line_snapshot=register_rows,
                config_snapshot=register_config,
                profile=profile,
            ),
        )
        batch = _sync_output_batch_summary(batch)
    return batch


def publish_payroll_output_batch(batch: PayrollOutputBatch, *, published_by=None) -> PayrollOutputBatch:
    """Publish generated payroll output artifacts."""

    if batch.status == PayrollOutputBatchStatus.PUBLISHED:
        return batch
    if batch.status != PayrollOutputBatchStatus.GENERATED:
        raise PayrollOutputError("Only generated payroll output batches can be published.")
    if batch.review.status != PayrollReviewStatus.LOCKED or batch.payroll_run.status != PayrollRunStatus.LOCKED:
        raise PayrollOutputError("Payroll outputs can only be published for final-locked payroll.")
    publish_time = timezone.now()
    with transaction.atomic():
        for artifact in batch.artifacts.filter(status=PayrollOutputArtifactStatus.GENERATED):
            artifact.status = PayrollOutputArtifactStatus.PUBLISHED
            artifact.published_at = publish_time
            artifact.published_by = published_by
            artifact.save()
            if artifact.kind == PayrollOutputArtifactKind.PAYSLIP:
                create_payroll_artifact_access_event(
                    artifact,
                    event_type=PayrollArtifactAccessEventType.PUBLISHED,
                    actor_user=published_by,
                    actor_identifier=str(published_by) if published_by else "",
                    source_channel_ref=_artifact_source_channel_ref(artifact, PayrollArtifactAccessEventType.PUBLISHED, DEFAULT_HR_ADMIN_CHANNEL_REF),
                    metadata_snapshot={
                        "output_batch_id": str(batch.id),
                        "published_at": publish_time.isoformat(),
                        "published_by": str(published_by) if published_by else "",
                    },
                )
                notify_published_payroll_payslip(artifact, published_by=published_by)
        batch.status = PayrollOutputBatchStatus.PUBLISHED
        batch.published_at = publish_time
        batch.published_by = published_by
        batch = _sync_output_batch_summary(batch)
    return batch


def _finance_handoff_profile(batch: PayrollOutputBatch) -> dict[str, Any]:
    batch_config = batch.config_snapshot if isinstance(batch.config_snapshot, dict) else {}
    run_config = batch.payroll_run.config_snapshot if isinstance(batch.payroll_run.config_snapshot, dict) else {}
    run_profile = run_config.get("finance_handoff_profile") if isinstance(run_config.get("finance_handoff_profile"), dict) else {}
    batch_profile = batch_config.get("finance_handoff_profile") if isinstance(batch_config.get("finance_handoff_profile"), dict) else {}
    profile = {**run_profile, **batch_profile}
    run_routes = run_profile.get("provider_routes") if isinstance(run_profile.get("provider_routes"), dict) else {}
    batch_routes = batch_profile.get("provider_routes") if isinstance(batch_profile.get("provider_routes"), dict) else {}
    if run_routes or batch_routes:
        profile["provider_routes"] = {**run_routes, **batch_routes}
    return profile


def _money_from_payload(value: Any) -> Decimal:
    try:
        return _round_decimal(value or "0.00", 2)
    except (PayrollRuleEvaluationError, ValueError):
        return Decimal("0.00")


def _statutory_filing_profile(profile: dict[str, Any]) -> dict[str, Any]:
    filing_profile = profile.get("statutory_filing_profile") if isinstance(profile, dict) else {}
    return filing_profile if isinstance(filing_profile, dict) else {}


def _profile_string_set(profile: dict[str, Any], key: str) -> set[str]:
    value = profile.get(key)
    if value is None or value == "":
        return set()
    if isinstance(value, (list, tuple, set)):
        return {str(item).strip().lower() for item in value if str(item).strip()}
    return {str(value).strip().lower()}


def _statutory_filing_calendars(batch: PayrollOutputBatch, profile: dict[str, Any]) -> list[PayrollStatutoryFilingCalendar]:
    filing_profile = _statutory_filing_profile(profile)
    if filing_profile.get("enabled") is False:
        return []
    statuses = _profile_string_set(filing_profile, "statuses") or {
        PayrollStatutoryFilingStatus.DRAFT,
        PayrollStatutoryFilingStatus.UPCOMING,
        PayrollStatutoryFilingStatus.DUE,
        PayrollStatutoryFilingStatus.OVERDUE,
    }
    calendars = PayrollStatutoryFilingCalendar.objects.filter(
        tenant=batch.tenant,
        period_start__lte=batch.payroll_run.period.end_date,
        period_end__gte=batch.payroll_run.period.start_date,
        status__in=statuses,
    ).select_related("statutory_pack", "statutory_component", "employer_registration").order_by("due_date", "filing_type_ref")

    filing_type_refs = _profile_string_set(filing_profile, "filing_type_refs")
    output_profile_refs = _profile_string_set(filing_profile, "output_profile_refs")
    statutory_pack_codes = _profile_string_set(filing_profile, "statutory_pack_codes")
    statutory_component_codes = _profile_string_set(filing_profile, "statutory_component_codes")
    calendar_list = list(calendars)
    if filing_type_refs:
        calendar_list = [item for item in calendar_list if item.filing_type_ref.lower() in filing_type_refs]
    if output_profile_refs:
        calendar_list = [item for item in calendar_list if item.output_profile_ref.lower() in output_profile_refs]
    if statutory_pack_codes:
        calendar_list = [item for item in calendar_list if item.statutory_pack.code.lower() in statutory_pack_codes]
    if statutory_component_codes:
        calendar_list = [
            item
            for item in calendar_list
            if item.statutory_component_id and item.statutory_component.code.lower() in statutory_component_codes
        ]
    return calendar_list


def _statutory_line_matches_filing(row: dict[str, Any], filing: PayrollStatutoryFilingCalendar) -> bool:
    config = row.get("config_snapshot") if isinstance(row.get("config_snapshot"), dict) else {}
    row_component_id = str(row.get("statutory_component_id") or config.get("statutory_component_id") or "")
    row_component_code = str(row.get("statutory_component_code") or config.get("statutory_component_code") or "").lower()
    row_pack_id = str(row.get("statutory_pack_id") or config.get("statutory_pack_id") or "")
    row_pack_code = str(row.get("statutory_pack_code") or config.get("statutory_pack_code") or "").lower()
    row_treatment_ref = str(row.get("statutory_treatment_ref") or config.get("statutory_treatment_ref") or "").lower()
    if filing.statutory_component_id:
        return (
            row_component_id == str(filing.statutory_component_id)
            or row_component_code == filing.statutory_component.code.lower()
            or row_treatment_ref == filing.statutory_component.statutory_treatment_ref.lower()
        )
    return row_pack_id == str(filing.statutory_pack_id) or row_pack_code == filing.statutory_pack.code.lower()


def _statutory_filing_rows(
    *,
    filing: PayrollStatutoryFilingCalendar,
    statutory_rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], Decimal]:
    matched_rows = [row for row in statutory_rows if _statutory_line_matches_filing(row, filing)]
    filing_total = Decimal("0.00")
    rows = []
    for row in matched_rows:
        amount = _money_from_payload(row.get("amount"))
        filing_total += amount
        rows.append({
            "filing_calendar_id": str(filing.id),
            "filing_code": filing.code,
            "filing_type_ref": filing.filing_type_ref,
            "period_start": filing.period_start.isoformat(),
            "period_end": filing.period_end.isoformat(),
            "due_date": filing.due_date.isoformat(),
            "registration_number": filing.employer_registration.registration_number if filing.employer_registration_id else "",
            "employer_identifier": filing.employer_registration.employer_identifier if filing.employer_registration_id else "",
            "filing_authority_ref": filing.filing_authority_ref,
            "provider_ref": filing.provider_ref,
            "employee_code": row.get("employee_code", ""),
            "component_code": row.get("component_code", ""),
            "component_name": row.get("component_name", ""),
            "statutory_component_code": row.get("statutory_component_code", ""),
            "statutory_treatment_ref": row.get("statutory_treatment_ref", ""),
            "line_type": row.get("line_type", ""),
            "amount": str(amount),
            "source_line_id": row.get("source_line_id", ""),
            "source_hash": row.get("source_hash", ""),
        })
    return rows, filing_total


def _statutory_challan_rows(
    *,
    filing: PayrollStatutoryFilingCalendar,
    filing_total: Decimal,
    source_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return [{
        "filing_calendar_id": str(filing.id),
        "filing_code": filing.code,
        "filing_type_ref": filing.filing_type_ref,
        "period_start": filing.period_start.isoformat(),
        "period_end": filing.period_end.isoformat(),
        "due_date": filing.due_date.isoformat(),
        "grace_due_date": filing.grace_due_date.isoformat() if filing.grace_due_date else "",
        "registration_number": filing.employer_registration.registration_number if filing.employer_registration_id else "",
        "employer_identifier": filing.employer_registration.employer_identifier if filing.employer_registration_id else "",
        "filing_authority_ref": filing.filing_authority_ref,
        "provider_ref": filing.provider_ref,
        "payable_amount": str(filing_total),
        "source_row_count": len(source_rows),
        "source_hashes": sorted({str(row.get("source_hash", "")) for row in source_rows if row.get("source_hash")}),
    }]


def _create_statutory_filing_artifacts(
    *,
    batch: PayrollOutputBatch,
    handoff: PayrollFinanceHandoff,
    statutory_rows: list[dict[str, Any]],
    generated_by=None,
    profile: dict[str, Any],
    artifact_key_prefix: str,
) -> list[PayrollOutputArtifact]:
    filing_profile = _statutory_filing_profile(profile)
    if filing_profile.get("enabled") is False:
        return []
    generate_returns = filing_profile.get("generate_return_artifacts", True) is not False
    generate_challans = filing_profile.get("generate_challan_artifacts", True) is not False
    if not (generate_returns or generate_challans):
        return []

    artifacts: list[PayrollOutputArtifact] = []
    for filing in _statutory_filing_calendars(batch, profile):
        filing_rows, filing_total = _statutory_filing_rows(filing=filing, statutory_rows=statutory_rows)
        if not filing_rows and filing_profile.get("generate_empty_filings") is not True:
            continue
        base_profile_ref = filing.output_profile_ref or filing_profile.get("return_output_profile_ref") or handoff.statutory_pack_ref
        base_config = {
            "handoff_id": str(handoff.id),
            "handoff_profile_ref": handoff.handoff_profile_ref,
            "statutory_filing_calendar_id": str(filing.id),
            "statutory_filing_calendar_code": filing.code,
            "statutory_pack_id": str(filing.statutory_pack_id),
            "statutory_pack_code": filing.statutory_pack.code,
            "statutory_component_id": str(filing.statutory_component_id) if filing.statutory_component_id else "",
            "statutory_component_code": filing.statutory_component.code if filing.statutory_component_id else "",
            "employer_registration_id": str(filing.employer_registration_id) if filing.employer_registration_id else "",
            "employer_registration_number": filing.employer_registration.registration_number if filing.employer_registration_id else "",
            "filing_type_ref": filing.filing_type_ref,
            "filing_frequency": filing.filing_frequency,
            "filing_authority_ref": filing.filing_authority_ref,
            "provider_ref": filing.provider_ref,
            "output_profile_ref": base_profile_ref,
            "source_filing_hash": filing.source_hash,
            "source_hashes": sorted({str(row.get("source_hash", "")) for row in filing_rows if row.get("source_hash")}),
        }
        generated_for_filing: list[PayrollOutputArtifact] = []
        if generate_returns:
            return_file_name = f"{batch.payroll_run.code}-{filing.code}-statutory-return.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.STATUTORY_REPORT, profile))}"
            generated_for_filing.append(_finance_artifact(
                batch=batch,
                kind=PayrollOutputArtifactKind.STATUTORY_REPORT,
                artifact_key=f"{artifact_key_prefix}-statutory-return-{filing.code}",
                title=f"{batch.payroll_run.name} {filing.name} Return",
                file_name=return_file_name,
                output_profile_ref=base_profile_ref,
                totals_snapshot={
                    "statutory_total": str(filing_total),
                    "line_count": len(filing_rows),
                    "filing_calendar_id": str(filing.id),
                    "filing_type_ref": filing.filing_type_ref,
                },
                line_snapshot=filing_rows,
                generated_by=generated_by,
                config_snapshot={**base_config, "artifact_subtype": "statutory_return"},
            ))
        if generate_challans:
            challan_rows = _statutory_challan_rows(filing=filing, filing_total=filing_total, source_rows=filing_rows)
            challan_profile_ref = filing_profile.get("challan_output_profile_ref") or f"{base_profile_ref}.challan"
            challan_file_name = f"{batch.payroll_run.code}-{filing.code}-statutory-challan.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.STATUTORY_REPORT, profile))}"
            generated_for_filing.append(_finance_artifact(
                batch=batch,
                kind=PayrollOutputArtifactKind.STATUTORY_REPORT,
                artifact_key=f"{artifact_key_prefix}-statutory-challan-{filing.code}",
                title=f"{batch.payroll_run.name} {filing.name} Challan",
                file_name=challan_file_name,
                output_profile_ref=challan_profile_ref,
                totals_snapshot={
                    "payable_amount": str(filing_total),
                    "source_row_count": len(filing_rows),
                    "filing_calendar_id": str(filing.id),
                    "filing_type_ref": filing.filing_type_ref,
                },
                line_snapshot=challan_rows,
                generated_by=generated_by,
                config_snapshot={**base_config, "artifact_subtype": "statutory_challan", "output_profile_ref": challan_profile_ref},
            ))
        artifacts.extend(generated_for_filing)
        latest_generation = {
            "handoff_id": str(handoff.id),
            "output_batch_id": str(batch.id),
            "generated_at": timezone.now().isoformat(),
            "artifact_ids": [str(artifact.id) for artifact in generated_for_filing],
            "artifact_keys": [artifact.artifact_key for artifact in generated_for_filing],
            "statutory_total": str(filing_total),
            "line_count": len(filing_rows),
        }
        filing.config_snapshot = {**(filing.config_snapshot if isinstance(filing.config_snapshot, dict) else {}), "latest_generation": latest_generation}
        filing.save()
    return artifacts


def _payslip_employee_name(artifact: PayrollOutputArtifact) -> str:
    if not artifact.employee_id:
        return ""
    return " ".join(part for part in [artifact.employee.first_name, artifact.employee.last_name] if part).strip() or artifact.employee.employee_code


def _finance_artifact(
    *,
    batch: PayrollOutputBatch,
    kind: str,
    artifact_key: str,
    title: str,
    file_name: str,
    output_profile_ref: str,
    totals_snapshot: dict[str, Any],
    line_snapshot: list[dict[str, Any]],
    generated_by=None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollOutputArtifact:
    artifact = PayrollOutputArtifact.objects.filter(output_batch=batch, kind=kind, artifact_key=artifact_key).first()
    if artifact:
        return artifact
    profile = _finance_handoff_profile(batch)
    artifact_config = _artifact_config_with_storage(
        {**(config_snapshot or {}), "generated_by": str(generated_by) if generated_by else ""},
        profile,
    )
    return PayrollOutputArtifact.objects.create(
        tenant=batch.tenant,
        output_batch=batch,
        payroll_run=batch.payroll_run,
        review=batch.review,
        kind=kind,
        status=PayrollOutputArtifactStatus.GENERATED,
        artifact_key=artifact_key,
        title=title,
        output_profile_ref=output_profile_ref,
        totals_snapshot=totals_snapshot,
        line_snapshot=line_snapshot,
        config_snapshot=artifact_config,
        **_artifact_file_kwargs(
            batch=batch,
            kind=kind,
            title=title,
            file_name=file_name,
            totals_snapshot=totals_snapshot,
            line_snapshot=line_snapshot,
            config_snapshot=artifact_config,
            profile=profile,
        ),
    )


def _sync_finance_handoff_summary(handoff: PayrollFinanceHandoff) -> PayrollFinanceHandoff:
    artifacts = list(PayrollOutputArtifact.objects.filter(
        output_batch=handoff.output_batch,
        kind__in=FINANCE_ARTIFACT_KINDS,
    ))
    statutory_filing_artifacts = [
        artifact for artifact in artifacts
        if artifact.kind == PayrollOutputArtifactKind.STATUTORY_REPORT
        and (artifact.config_snapshot or {}).get("artifact_subtype") in {"statutory_return", "statutory_challan"}
    ]
    artifacts_by_status = {
        "published": sum(1 for artifact in artifacts if artifact.status == PayrollOutputArtifactStatus.PUBLISHED),
        "generated": sum(1 for artifact in artifacts if artifact.status == PayrollOutputArtifactStatus.GENERATED),
    }
    deliveries = handoff.provider_deliveries.all()
    handoff.handoff_summary_snapshot = {
        "artifact_count": len(artifacts),
        "bank_advice_count": sum(1 for artifact in artifacts if artifact.kind == PayrollOutputArtifactKind.BANK_ADVICE),
        "accounting_export_count": sum(1 for artifact in artifacts if artifact.kind == PayrollOutputArtifactKind.ACCOUNTING_EXPORT),
        "statutory_report_count": sum(1 for artifact in artifacts if artifact.kind == PayrollOutputArtifactKind.STATUTORY_REPORT),
        "statutory_filing_artifact_count": len(statutory_filing_artifacts),
        "statutory_filing_count": len({
            artifact.config_snapshot.get("statutory_filing_calendar_id")
            for artifact in statutory_filing_artifacts
            if artifact.config_snapshot.get("statutory_filing_calendar_id")
        }),
        "published_count": artifacts_by_status["published"],
        "generated_count": artifacts_by_status["generated"],
        "delivery_count": deliveries.count(),
        "submitted_delivery_count": deliveries.filter(status=PayrollProviderDeliveryStatus.SUBMITTED).count(),
        "acknowledged_delivery_count": deliveries.filter(status=PayrollProviderDeliveryStatus.ACKNOWLEDGED).count(),
        "reconciled_delivery_count": deliveries.filter(status=PayrollProviderDeliveryStatus.RECONCILED).count(),
        "failed_delivery_count": deliveries.filter(status=PayrollProviderDeliveryStatus.FAILED).count(),
        "rejected_delivery_count": deliveries.filter(status=PayrollProviderDeliveryStatus.REJECTED).count(),
    }
    handoff.save()
    return handoff


def _payroll_audit_pack_redacted(value: Any) -> Any:
    if isinstance(value, dict):
        redacted: dict[str, Any] = {}
        for key, nested_value in value.items():
            if str(key).lower() in RAW_PAYROLL_AUDIT_PACK_KEYS:
                redacted[str(key)] = "[redacted]"
            else:
                redacted[str(key)] = _payroll_audit_pack_redacted(nested_value)
        return redacted
    if isinstance(value, list):
        return [_payroll_audit_pack_redacted(item) for item in value]
    return _json_safe(value)


def _payroll_provider_audit_artifact_payload(artifact: PayrollOutputArtifact) -> dict[str, Any]:
    return _payroll_audit_pack_redacted({
        "id": str(artifact.id),
        "artifact_key": artifact.artifact_key,
        "kind": artifact.kind,
        "status": artifact.status,
        "title": artifact.title,
        "file_name": artifact.file_name,
        "storage_provider_ref": artifact.storage_provider_ref,
        "storage_key": artifact.storage_key,
        "storage_object_version": artifact.storage_object_version,
        "mime_type": artifact.mime_type,
        "file_size_bytes": artifact.file_size_bytes,
        "checksum_sha256": artifact.checksum_sha256,
        "download_strategy_ref": artifact.download_strategy_ref,
        "retention_policy_ref": artifact.retention_policy_ref,
        "output_profile_ref": artifact.output_profile_ref,
        "totals_snapshot": artifact.totals_snapshot,
        "source_hash": artifact.source_hash,
        "published_at": artifact.published_at.isoformat() if artifact.published_at else "",
        "published_by": str(artifact.published_by) if artifact.published_by_id else "",
        "config_snapshot": artifact.config_snapshot,
    })


def _payroll_provider_audit_delivery_payload(delivery: PayrollProviderDelivery) -> dict[str, Any]:
    return _payroll_audit_pack_redacted({
        "id": str(delivery.id),
        "output_artifact_id": str(delivery.output_artifact_id),
        "artifact_kind": delivery.artifact_kind,
        "status": delivery.status,
        "provider_ref": delivery.provider_ref,
        "channel_ref": delivery.channel_ref,
        "external_reference": delivery.external_reference,
        "retry_policy_ref": delivery.retry_policy_ref,
        "attempt_count": delivery.attempt_count,
        "submitted_at": delivery.submitted_at.isoformat() if delivery.submitted_at else "",
        "acknowledged_at": delivery.acknowledged_at.isoformat() if delivery.acknowledged_at else "",
        "reconciled_at": delivery.reconciled_at.isoformat() if delivery.reconciled_at else "",
        "failure_code": delivery.failure_code,
        "failure_reason": delivery.failure_reason,
        "payload_checksum_sha256": delivery.payload_checksum_sha256,
        "request_snapshot": delivery.request_snapshot,
        "response_snapshot": delivery.response_snapshot,
        "reconciliation_snapshot": delivery.reconciliation_snapshot,
        "config_snapshot": delivery.config_snapshot,
    })


def _payroll_provider_audit_callback_payload(event: PayrollProviderCallbackEvent) -> dict[str, Any]:
    return _payroll_audit_pack_redacted({
        "id": str(event.id),
        "provider_delivery_id": str(event.provider_delivery_id),
        "output_artifact_id": str(event.output_artifact_id),
        "provider_ref": event.provider_ref,
        "external_reference": event.external_reference,
        "external_event_id": event.external_event_id,
        "idempotency_key": event.idempotency_key,
        "callback_profile_ref": event.callback_profile_ref,
        "callback_verification_ref": event.callback_verification_ref,
        "status": event.status,
        "provider_status": event.provider_status,
        "payload_checksum_sha256": event.payload_checksum_sha256,
        "verification_snapshot": event.verification_snapshot,
        "payload_snapshot": event.payload_snapshot,
        "processing_snapshot": event.processing_snapshot,
        "received_at": event.received_at.isoformat() if event.received_at else "",
        "processed_at": event.processed_at.isoformat() if event.processed_at else "",
        "failure_code": event.failure_code,
        "failure_reason": event.failure_reason,
    })


def _payroll_provider_audit_retry_payload(event: PayrollProviderRetryEvent) -> dict[str, Any]:
    return _payroll_audit_pack_redacted({
        "id": str(event.id),
        "provider_delivery_id": str(event.provider_delivery_id),
        "output_artifact_id": str(event.output_artifact_id),
        "status": event.status,
        "retry_policy_ref": event.retry_policy_ref,
        "failure_taxonomy_ref": event.failure_taxonomy_ref,
        "failure_category_ref": event.failure_category_ref,
        "retry_reason": event.retry_reason,
        "attempt_number": event.attempt_number,
        "scheduled_for": event.scheduled_for.isoformat() if event.scheduled_for else "",
        "executed_at": event.executed_at.isoformat() if event.executed_at else "",
        "requested_by": str(event.requested_by) if event.requested_by_id else "",
        "executed_by": str(event.executed_by) if event.executed_by_id else "",
        "decision_snapshot": event.decision_snapshot,
        "request_snapshot": event.request_snapshot,
        "response_snapshot": event.response_snapshot,
        "failure_code": event.failure_code,
        "failure_reason": event.failure_reason,
    })


def _payroll_provider_audit_job_payload(job: PayrollProviderJob) -> dict[str, Any]:
    return _payroll_audit_pack_redacted({
        "id": str(job.id),
        "job_kind": job.job_kind,
        "status": job.status,
        "queue_policy_ref": job.queue_policy_ref,
        "worker_profile_ref": job.worker_profile_ref,
        "idempotency_key": job.idempotency_key,
        "provider_ref": job.provider_ref,
        "provider_delivery_id": str(job.provider_delivery_id or ""),
        "provider_connection_id": str(job.provider_connection_id or ""),
        "retry_event_id": str(job.retry_event_id or ""),
        "callback_event_id": str(job.callback_event_id or ""),
        "certification_run_id": str(job.certification_run_id or ""),
        "priority": job.priority,
        "attempt_count": job.attempt_count,
        "max_attempts": job.max_attempts,
        "scheduled_for": job.scheduled_for.isoformat() if job.scheduled_for else "",
        "leased_at": job.leased_at.isoformat() if job.leased_at else "",
        "leased_until": job.leased_until.isoformat() if job.leased_until else "",
        "lease_owner_ref": job.lease_owner_ref,
        "heartbeat_at": job.heartbeat_at.isoformat() if job.heartbeat_at else "",
        "heartbeat_count": job.heartbeat_count,
        "recovery_count": job.recovery_count,
        "last_recovered_at": job.last_recovered_at.isoformat() if job.last_recovered_at else "",
        "started_at": job.started_at.isoformat() if job.started_at else "",
        "completed_at": job.completed_at.isoformat() if job.completed_at else "",
        "request_snapshot": job.request_snapshot,
        "lease_snapshot": job.lease_snapshot,
        "response_snapshot": job.response_snapshot,
        "failure_code": job.failure_code,
        "failure_reason": job.failure_reason,
    })


def build_payroll_provider_audit_pack_snapshot(handoff: PayrollFinanceHandoff) -> dict[str, Any]:
    """Build a deterministic provider audit evidence package for one finance handoff."""

    artifacts = PayrollOutputArtifact.objects.filter(
        output_batch=handoff.output_batch,
        kind__in=FINANCE_ARTIFACT_KINDS,
    ).select_related("published_by").order_by("kind", "artifact_key")
    deliveries = handoff.provider_deliveries.select_related("output_artifact").order_by("artifact_kind", "provider_ref", "created_at")
    callback_events = handoff.provider_callback_events.select_related("provider_delivery", "output_artifact").order_by("provider_ref", "external_event_id", "created_at")
    retry_events = PayrollProviderRetryEvent.objects.filter(handoff=handoff).select_related("requested_by", "executed_by").order_by("scheduled_for", "created_at")
    provider_jobs = PayrollProviderJob.objects.filter(
        tenant=handoff.tenant,
        provider_delivery__handoff=handoff,
    ).order_by("scheduled_for", "priority", "created_at")
    payload = {
        "audit_pack_profile_ref": PAYROLL_PROVIDER_AUDIT_PACK_PROFILE_REF,
        "audit_pack_schema_ref": PAYROLL_PROVIDER_AUDIT_PACK_SCHEMA_REF,
        "handoff": {
            "id": str(handoff.id),
            "status": handoff.status,
            "handoff_profile_ref": handoff.handoff_profile_ref,
            "bank_file_profile_ref": handoff.bank_file_profile_ref,
            "accounting_export_profile_ref": handoff.accounting_export_profile_ref,
            "statutory_pack_ref": handoff.statutory_pack_ref,
            "generated_at": handoff.generated_at.isoformat() if handoff.generated_at else "",
            "transmitted_at": handoff.transmitted_at.isoformat() if handoff.transmitted_at else "",
            "accepted_at": handoff.accepted_at.isoformat() if handoff.accepted_at else "",
            "totals_snapshot": handoff.totals_snapshot,
            "handoff_summary_snapshot": handoff.handoff_summary_snapshot,
            "config_snapshot": handoff.config_snapshot,
        },
        "payroll_run": {
            "id": str(handoff.payroll_run_id),
            "code": handoff.payroll_run.code,
            "name": handoff.payroll_run.name,
            "status": handoff.payroll_run.status,
        },
        "output_batch": {
            "id": str(handoff.output_batch_id),
            "status": handoff.output_batch.status,
            "output_profile_ref": handoff.output_batch.output_profile_ref,
            "artifact_summary_snapshot": handoff.output_batch.artifact_summary_snapshot,
            "config_snapshot": handoff.output_batch.config_snapshot,
        },
        "evidence_counts": {
            "artifact_count": artifacts.count(),
            "delivery_count": deliveries.count(),
            "callback_event_count": callback_events.count(),
            "retry_event_count": retry_events.count(),
            "provider_job_count": provider_jobs.count(),
            "reconciled_delivery_count": deliveries.filter(status=PayrollProviderDeliveryStatus.RECONCILED).count(),
            "failed_delivery_count": deliveries.filter(status=PayrollProviderDeliveryStatus.FAILED).count(),
            "dead_lettered_job_count": provider_jobs.filter(status=PayrollProviderJobStatus.DEAD_LETTERED).count(),
            "recovered_job_count": provider_jobs.filter(recovery_count__gt=0).count(),
        },
        "artifacts": [_payroll_provider_audit_artifact_payload(artifact) for artifact in artifacts],
        "provider_deliveries": [_payroll_provider_audit_delivery_payload(delivery) for delivery in deliveries],
        "provider_callback_events": [_payroll_provider_audit_callback_payload(event) for event in callback_events],
        "provider_retry_events": [_payroll_provider_audit_retry_payload(event) for event in retry_events],
        "provider_jobs": [_payroll_provider_audit_job_payload(job) for job in provider_jobs],
    }
    return _payroll_audit_pack_redacted(payload)


def generate_payroll_provider_audit_pack(
    handoff: PayrollFinanceHandoff,
    *,
    generated_by=None,
    audit_pack_profile_ref: str | None = None,
) -> PayrollOutputArtifact:
    """Generate a locked, downloadable provider audit pack artifact for a terminal handoff."""

    if handoff.status not in {PayrollFinanceHandoffStatus.ACCEPTED, PayrollFinanceHandoffStatus.FAILED}:
        raise PayrollFinanceHandoffError("Provider audit packs require an accepted or failed finance handoff.")
    open_deliveries = handoff.provider_deliveries.filter(status__in=[
        PayrollProviderDeliveryStatus.QUEUED,
        PayrollProviderDeliveryStatus.SUBMITTED,
        PayrollProviderDeliveryStatus.ACKNOWLEDGED,
    ])
    if open_deliveries.exists():
        raise PayrollFinanceHandoffError("Provider audit packs require terminal provider delivery evidence.")

    profile = _finance_handoff_profile(handoff.output_batch)
    snapshot = build_payroll_provider_audit_pack_snapshot(handoff)
    pack_profile_ref = audit_pack_profile_ref or str(profile.get("provider_audit_pack_profile_ref") or PAYROLL_PROVIDER_AUDIT_PACK_PROFILE_REF)
    evidence_checksum = hashlib.sha256(json.dumps(snapshot, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    artifact_key_prefix = profile.get("artifact_key_prefix") or f"{handoff.payroll_run.code}-{handoff.handoff_profile_ref}"
    artifact_key = f"{artifact_key_prefix}-provider-audit-pack-{evidence_checksum[:12]}"
    existing = PayrollOutputArtifact.objects.filter(
        output_batch=handoff.output_batch,
        kind=PayrollOutputArtifactKind.PROVIDER_AUDIT_PACK,
        artifact_key=artifact_key,
    ).first()
    if existing:
        return existing

    audit_profile = {
        **profile,
        "retention_policy_ref": PAYROLL_PROVIDER_AUDIT_PACK_RETENTION_REF,
        "mime_types": {
            **(profile.get("mime_types") if isinstance(profile.get("mime_types"), dict) else {}),
            PayrollOutputArtifactKind.PROVIDER_AUDIT_PACK: "application/json",
        },
    }
    totals_snapshot = {
        **snapshot["evidence_counts"],
        "evidence_checksum_sha256": evidence_checksum,
    }
    line_snapshot = [
        {"section": "artifacts", "record_count": snapshot["evidence_counts"]["artifact_count"]},
        {"section": "provider_deliveries", "record_count": snapshot["evidence_counts"]["delivery_count"]},
        {"section": "provider_callback_events", "record_count": snapshot["evidence_counts"]["callback_event_count"]},
        {"section": "provider_retry_events", "record_count": snapshot["evidence_counts"]["retry_event_count"]},
        {"section": "provider_jobs", "record_count": snapshot["evidence_counts"]["provider_job_count"]},
    ]
    config_snapshot = {
        "handoff_id": str(handoff.id),
        "handoff_profile_ref": handoff.handoff_profile_ref,
        "audit_pack_profile_ref": pack_profile_ref,
        "audit_pack_schema_ref": PAYROLL_PROVIDER_AUDIT_PACK_SCHEMA_REF,
        "evidence_checksum_sha256": evidence_checksum,
        "evidence_snapshot": snapshot,
        "lock_profile_ref": "payroll.provider_audit_pack.locked_artifact.v1",
        "generated_by": str(generated_by) if generated_by else "",
    }
    artifact_config = _artifact_config_with_storage(config_snapshot, audit_profile)
    artifact = PayrollOutputArtifact.objects.create(
        tenant=handoff.tenant,
        output_batch=handoff.output_batch,
        payroll_run=handoff.payroll_run,
        review=handoff.review,
        kind=PayrollOutputArtifactKind.PROVIDER_AUDIT_PACK,
        status=PayrollOutputArtifactStatus.PUBLISHED,
        artifact_key=artifact_key,
        title=f"{handoff.payroll_run.name} Provider Audit Pack",
        output_profile_ref=pack_profile_ref,
        totals_snapshot=totals_snapshot,
        line_snapshot=line_snapshot,
        config_snapshot=artifact_config,
        published_by=generated_by,
        **_artifact_file_kwargs(
            batch=handoff.output_batch,
            kind=PayrollOutputArtifactKind.PROVIDER_AUDIT_PACK,
            title=f"{handoff.payroll_run.name} Provider Audit Pack",
            file_name=f"{handoff.payroll_run.code}-provider-audit-pack-{evidence_checksum[:12]}.json",
            totals_snapshot=totals_snapshot,
            line_snapshot=[{"audit_pack": snapshot}],
            config_snapshot=artifact_config,
            profile=audit_profile,
        ),
    )
    create_payroll_artifact_access_event(
        artifact,
        event_type=PayrollArtifactAccessEventType.PUBLISHED,
        actor_user=generated_by,
        actor_identifier=str(generated_by) if generated_by else "",
        source_channel_ref="hr_admin.payroll_handoff.audit_pack.v1",
        metadata_snapshot={
            "handoff_id": str(handoff.id),
            "audit_pack_profile_ref": pack_profile_ref,
            "evidence_checksum_sha256": evidence_checksum,
            "lock_profile_ref": "payroll.provider_audit_pack.locked_artifact.v1",
        },
    )
    return artifact


def _provider_route_keys(artifact: PayrollOutputArtifact) -> list[str]:
    config = artifact.config_snapshot if isinstance(artifact.config_snapshot, dict) else {}
    subtype = str(config.get("artifact_subtype") or "").strip()
    filing_type_ref = str(config.get("filing_type_ref") or "").strip()
    route_keys = [
        artifact.artifact_key,
        f"output_profile:{artifact.output_profile_ref}",
    ]
    if filing_type_ref:
        route_keys.append(f"filing_type:{filing_type_ref}")
    if subtype:
        route_keys.extend([f"{artifact.kind}:{subtype}", subtype])
    route_keys.append(artifact.kind)
    return route_keys


def _provider_connection_policy(profile: dict[str, Any], route: dict[str, Any]) -> dict[str, Any]:
    profile_policy = profile.get("provider_connection_policy") if isinstance(profile.get("provider_connection_policy"), dict) else {}
    route_policy = route.get("provider_connection_policy") if isinstance(route.get("provider_connection_policy"), dict) else {}
    policy = {**profile_policy, **route_policy}
    enforcement_mode = str(
        route.get("provider_connection_enforcement")
        or policy.get("enforcement_mode")
        or ("active" if route.get("require_active_provider_connection") else "")
        or ("certified" if route.get("provider_connection_required") else "")
        or "warn"
    ).strip().lower()
    if enforcement_mode not in {"disabled", "warn", "certified", "active"}:
        enforcement_mode = "warn"
    return {
        **policy,
        "enforcement_mode": enforcement_mode,
        "required": enforcement_mode in {"certified", "active"} or bool(route.get("provider_connection_required")),
    }


def _provider_adapter_contract(profile: dict[str, Any], route: dict[str, Any], *, artifact_kind: str, adapter_ref: str, provider_ref: str) -> dict[str, Any]:
    profile_contract = profile.get("adapter_contract") if isinstance(profile.get("adapter_contract"), dict) else {}
    route_contract = route.get("adapter_contract") if isinstance(route.get("adapter_contract"), dict) else {}
    contract = {**profile_contract, **route_contract}
    enforcement_mode = str(contract.get("enforcement_mode") or "warn").strip().lower()
    if enforcement_mode not in {"disabled", "warn", "strict"}:
        enforcement_mode = "warn"
    return {
        **contract,
        "contract_profile_ref": str(
            contract.get("contract_profile_ref")
            or f"payroll.provider_contract.{artifact_kind}.adapter.v1"
        ),
        "enforcement_mode": enforcement_mode,
        "expected_adapter_ref": str(contract.get("expected_adapter_ref") or adapter_ref),
        "expected_provider_ref": str(contract.get("expected_provider_ref") or provider_ref),
        "request_required_fields": contract.get(
            "request_required_fields",
            [
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
                "artifact_snapshot.checksum_sha256",
            ],
        ),
        "result_required_fields": contract.get(
            "result_required_fields",
            ["provider_status", "external_reference", "provider_batch_ref"],
        ),
        "response_snapshot_required_fields": contract.get(
            "response_snapshot_required_fields",
            ["adapter_ref", "response_schema_ref"],
        ),
        "allowed_provider_statuses": contract.get(
            "allowed_provider_statuses",
            [
                PayrollProviderDeliveryStatus.SUBMITTED,
                PayrollProviderDeliveryStatus.ACKNOWLEDGED,
                PayrollProviderDeliveryStatus.RECONCILED,
                PayrollProviderDeliveryStatus.REJECTED,
                PayrollProviderDeliveryStatus.FAILED,
            ],
        ),
        "require_credential_resolution": bool(contract.get("require_credential_resolution", False)),
    }


def _snapshot_path_value(payload: dict[str, Any], path: str) -> Any:
    value: Any = payload
    for part in str(path).split("."):
        if isinstance(value, dict) and part in value:
            value = value[part]
        elif isinstance(value, list) and part.isdigit():
            index = int(part)
            if 0 <= index < len(value):
                value = value[index]
            else:
                return None
        else:
            return None
    return value


def _set_snapshot_path_value(payload: dict[str, Any], path: str, value: Any) -> None:
    parts = [part for part in str(path).split(".") if part]
    if not parts:
        return
    cursor = payload
    for part in parts[:-1]:
        nested = cursor.get(part)
        if not isinstance(nested, dict):
            nested = {}
            cursor[part] = nested
        cursor = nested
    cursor[parts[-1]] = value


def _append_snapshot_path_values(payload: dict[str, Any], path: str, values: list[Any]) -> None:
    parts = [part for part in str(path).split(".") if part]
    if not parts:
        return
    cursor = payload
    for part in parts[:-1]:
        nested = cursor.get(part)
        if not isinstance(nested, dict):
            nested = {}
            cursor[part] = nested
        cursor = nested
    existing = cursor.get(parts[-1])
    if not isinstance(existing, list):
        existing = []
        cursor[parts[-1]] = existing
    existing.extend(values)


def _provider_mapping_format(value: Any, value_type: str) -> Any:
    if value is None:
        return None
    if value_type == "string":
        return str(value)
    if value_type == "integer":
        try:
            return int(value)
        except (TypeError, ValueError):
            return value
    if value_type in {"decimal_string", "money_string"}:
        try:
            return str(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        except (InvalidOperation, TypeError, ValueError):
            return str(value)
    if value_type == "boolean":
        return bool(value)
    return value


def _provider_mapping_value_missing(value: Any) -> bool:
    return value is None or value == ""


def _provider_mapping_row_payload(
    *,
    source_row: Any,
    row_mappings: list[Any],
    rule_gate_ref: str,
    row_index: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload: dict[str, Any] = {}
    gates: list[dict[str, Any]] = []
    source = source_row if isinstance(source_row, dict) else {"value": source_row}
    for mapping_index, mapping in enumerate(row_mappings):
        if not isinstance(mapping, dict):
            continue
        source_path = str(mapping.get("source_path") or "").strip()
        target_path = str(mapping.get("target_path") or "").strip()
        required = bool(mapping.get("required", False))
        value = source if not source_path else _snapshot_path_value(source, source_path)
        if _provider_mapping_value_missing(value) and "default" in mapping:
            value = mapping.get("default")
        value = _provider_mapping_format(value, str(mapping.get("value_type") or ""))
        passed = bool(target_path and (not _provider_mapping_value_missing(value) or not required))
        mapping_gate_ref = str(mapping.get("gate_ref") or target_path or f"row_mapping:{mapping_index + 1}")
        gates.append({
            "ref": f"mapping_rule:{rule_gate_ref}:row:{row_index + 1}:{mapping_gate_ref}",
            "source_path": source_path,
            "target_path": target_path,
            "required": required,
            "row_index": row_index,
            "passed": passed,
        })
        if target_path and not _provider_mapping_value_missing(value):
            _set_snapshot_path_value(payload, target_path, value)
    return payload, gates


def _provider_mapping_decimal(value: Any) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _apply_provider_mapping_aggregate_rules(
    *,
    target_payload: dict[str, Any],
    source_rows: list[Any],
    aggregate_rules: list[Any],
) -> None:
    for rule in aggregate_rules:
        if not isinstance(rule, dict):
            continue
        target_path = str(rule.get("target_path") or "").strip()
        if not target_path:
            continue
        operation = str(rule.get("operation") or "sum").strip().lower()
        source_path = str(rule.get("source_path") or "").strip()
        value_type = str(rule.get("value_type") or "decimal_string")
        if operation == "count":
            value: Any = len(source_rows)
        elif operation == "sum":
            total = Decimal("0")
            for source_row in source_rows:
                row = source_row if isinstance(source_row, dict) else {"value": source_row}
                total += _provider_mapping_decimal(_snapshot_path_value(row, source_path) if source_path else row.get("value"))
            value = total
        else:
            continue
        _set_snapshot_path_value(target_payload, target_path, _provider_mapping_format(value, value_type))


def _provider_schema_mapping_pack_for_route(
    *,
    artifact: PayrollOutputArtifact,
    provider_ref: str,
    route: dict[str, Any],
    connection: PayrollProviderConnection | None,
) -> PayrollProviderSchemaMappingPack | None:
    mapping_profile_ref = str(route.get("schema_mapping_profile_ref") or route.get("mapping_profile_ref") or "").strip()
    queryset = PayrollProviderSchemaMappingPack.objects.filter(
        tenant=artifact.tenant,
        status=PayrollProviderSchemaMappingPackStatus.ACTIVE,
    )
    if mapping_profile_ref:
        return queryset.filter(mapping_profile_ref=mapping_profile_ref).order_by("-version").first()
    if connection:
        connected = queryset.filter(provider_connection=connection, artifact_kind=artifact.kind).order_by("-version").first()
        if connected:
            return connected
    return queryset.filter(provider_ref=provider_ref, artifact_kind=artifact.kind).order_by("-version").first()


def _provider_schema_mapping_contract(
    *,
    artifact: PayrollOutputArtifact,
    provider_ref: str,
    route: dict[str, Any],
    connection: PayrollProviderConnection | None,
) -> dict[str, Any]:
    configured = route.get("schema_mapping") if isinstance(route.get("schema_mapping"), dict) else {}
    mapping_pack = _provider_schema_mapping_pack_for_route(
        artifact=artifact,
        provider_ref=provider_ref,
        route=route,
        connection=connection,
    )
    if mapping_pack:
        return {
            "mapping_pack_id": str(mapping_pack.id),
            "mapping_profile_ref": mapping_pack.mapping_profile_ref,
            "version": mapping_pack.version,
            "provider_ref": mapping_pack.provider_ref,
            "provider_kind": mapping_pack.provider_kind,
            "environment_ref": mapping_pack.environment_ref,
            "artifact_kind": mapping_pack.artifact_kind,
            "source_schema_ref": mapping_pack.source_schema_ref,
            "target_schema_ref": mapping_pack.target_schema_ref,
            "transform_profile_ref": mapping_pack.transform_profile_ref,
            "validation_profile_ref": mapping_pack.validation_profile_ref,
            "enforcement_mode": mapping_pack.enforcement_mode,
            "transform_rules": mapping_pack.transform_rules,
            "validation_rules": mapping_pack.validation_rules,
            "source_hash": mapping_pack.source_hash,
        }
    enforcement_mode = str(configured.get("enforcement_mode") or "warn").strip().lower()
    if enforcement_mode not in {"disabled", "warn", "strict"}:
        enforcement_mode = "warn"
    transform_rules = configured.get("transform_rules") if isinstance(configured.get("transform_rules"), list) else []
    validation_rules = configured.get("validation_rules") if isinstance(configured.get("validation_rules"), list) else []
    if not transform_rules:
        transform_rules = _default_provider_schema_mapping_transform_rules(artifact.kind)
    if not validation_rules:
        validation_rules = _default_provider_schema_mapping_validation_rules(artifact.kind)
    return {
        "mapping_pack_id": "",
        "mapping_profile_ref": configured.get("mapping_profile_ref") or route.get("schema_mapping_profile_ref") or f"payroll.provider_mapping.{artifact.kind}.default.v1",
        "version": int(configured.get("version") or 1),
        "provider_ref": provider_ref,
        "provider_kind": connection.provider_kind if connection else "",
        "environment_ref": connection.environment_ref if connection else "sandbox",
        "artifact_kind": artifact.kind,
        "source_schema_ref": configured.get("source_schema_ref") or route.get("request_schema_ref") or "",
        "target_schema_ref": configured.get("target_schema_ref") or route.get("target_schema_ref") or route.get("request_schema_ref") or "",
        "transform_profile_ref": configured.get("transform_profile_ref") or "payroll.provider_mapping.transform.safe_paths.v1",
        "validation_profile_ref": configured.get("validation_profile_ref") or "payroll.provider_mapping.validation.standard.v1",
        "enforcement_mode": enforcement_mode,
        "transform_rules": transform_rules,
        "validation_rules": validation_rules,
        "source_hash": "",
    }


def apply_payroll_provider_schema_mapping(
    *,
    request_snapshot: dict[str, Any],
    mapping_contract: dict[str, Any],
) -> dict[str, Any]:
    enforcement_mode = str(mapping_contract.get("enforcement_mode") or "warn").strip().lower()
    if enforcement_mode not in {"disabled", "warn", "strict"}:
        enforcement_mode = "warn"
    transform_rules = mapping_contract.get("transform_rules") if isinstance(mapping_contract.get("transform_rules"), list) else []
    validation_rules = mapping_contract.get("validation_rules") if isinstance(mapping_contract.get("validation_rules"), list) else []
    provider_payload: dict[str, Any] = {}
    gates: list[dict[str, Any]] = []
    if enforcement_mode == "disabled":
        return {
            "mapping_profile_ref": mapping_contract.get("mapping_profile_ref", ""),
            "target_schema_ref": mapping_contract.get("target_schema_ref", ""),
            "enforcement_mode": enforcement_mode,
            "status": "disabled",
            "provider_payload": provider_payload,
            "gates": gates,
            "blocking_gate_refs": [],
        }
    for index, rule in enumerate(transform_rules):
        if not isinstance(rule, dict):
            continue
        source_path = str(rule.get("source_path") or "").strip()
        target_path = str(rule.get("target_path") or "").strip()
        required = bool(rule.get("required", False))
        mode = str(rule.get("mode") or rule.get("transform_mode") or "copy").strip().lower()
        gate_ref = str(rule.get("gate_ref") or target_path or f"transform_rule:{index + 1}")
        if mode in {"expand_rows", "group_rows"}:
            source_rows = _snapshot_path_value(request_snapshot, source_path) if source_path else []
            source_rows = source_rows if isinstance(source_rows, list) else []
            row_mappings = rule.get("row_mappings") if isinstance(rule.get("row_mappings"), list) else []
            passed = bool(target_path and row_mappings and (source_rows or not required))
            gates.append({
                "ref": f"mapping_rule:{gate_ref}",
                "source_path": source_path,
                "target_path": target_path,
                "required": required,
                "mode": mode,
                "row_count": len(source_rows),
                "row_mapping_count": len(row_mappings),
                "passed": passed,
            })
            if not target_path or not row_mappings:
                continue
            if mode == "expand_rows":
                expanded_rows: list[dict[str, Any]] = []
                for row_index, source_row in enumerate(source_rows):
                    row_payload, row_gates = _provider_mapping_row_payload(
                        source_row=source_row,
                        row_mappings=row_mappings,
                        rule_gate_ref=gate_ref,
                        row_index=row_index,
                    )
                    gates.extend(row_gates)
                    expanded_rows.append(row_payload)
                if expanded_rows:
                    _append_snapshot_path_values(provider_payload, target_path, expanded_rows)
                continue
            group_by_path = str(rule.get("group_by_path") or "").strip()
            group_key_target_path = str(rule.get("group_key_target_path") or "group_key").strip()
            rows_target_path = str(rule.get("rows_target_path") or "rows").strip()
            aggregate_rules = rule.get("aggregate_rules") if isinstance(rule.get("aggregate_rules"), list) else []
            grouped_rows: dict[str, list[Any]] = {}
            for source_row in source_rows:
                row = source_row if isinstance(source_row, dict) else {"value": source_row}
                group_key = _snapshot_path_value(row, group_by_path) if group_by_path else "default"
                grouped_rows.setdefault(str(group_key or "unassigned"), []).append(source_row)
            group_payloads: list[dict[str, Any]] = []
            for group_key, group_source_rows in grouped_rows.items():
                item_payload: dict[str, Any] = {}
                if group_key_target_path:
                    _set_snapshot_path_value(item_payload, group_key_target_path, group_key)
                row_payloads: list[dict[str, Any]] = []
                for row_index, source_row in enumerate(group_source_rows):
                    row_payload, row_gates = _provider_mapping_row_payload(
                        source_row=source_row,
                        row_mappings=row_mappings,
                        rule_gate_ref=f"{gate_ref}:{group_key}",
                        row_index=row_index,
                    )
                    gates.extend(row_gates)
                    row_payloads.append(row_payload)
                if rows_target_path:
                    _set_snapshot_path_value(item_payload, rows_target_path, row_payloads)
                _apply_provider_mapping_aggregate_rules(
                    target_payload=item_payload,
                    source_rows=group_source_rows,
                    aggregate_rules=aggregate_rules,
                )
                group_payloads.append(item_payload)
            if group_payloads:
                _append_snapshot_path_values(provider_payload, target_path, group_payloads)
            continue
        value = _snapshot_path_value(request_snapshot, source_path) if source_path else None
        if _provider_mapping_value_missing(value) and "default" in rule:
            value = rule.get("default")
        value = _provider_mapping_format(value, str(rule.get("value_type") or ""))
        passed = bool(target_path and (not _provider_mapping_value_missing(value) or not required))
        gates.append({
            "ref": f"mapping_rule:{gate_ref}",
            "source_path": source_path,
            "target_path": target_path,
            "required": required,
            "mode": mode,
            "passed": passed,
        })
        if target_path and value is not None:
            _set_snapshot_path_value(provider_payload, target_path, value)
    for index, rule in enumerate(validation_rules):
        if not isinstance(rule, dict):
            continue
        path = str(rule.get("path") or "").strip()
        required = bool(rule.get("required", True))
        value = _snapshot_path_value(provider_payload, path) if path else None
        passed = bool(not _provider_mapping_value_missing(value) or not required)
        gates.append({
            "ref": str(rule.get("gate_ref") or f"provider_payload:{path or index + 1}"),
            "path": path,
            "required": required,
            "passed": passed,
        })
    blocking = [gate["ref"] for gate in gates if not gate["passed"]]
    snapshot = {
        "mapping_pack_id": mapping_contract.get("mapping_pack_id", ""),
        "mapping_profile_ref": mapping_contract.get("mapping_profile_ref", ""),
        "version": mapping_contract.get("version", 1),
        "source_schema_ref": mapping_contract.get("source_schema_ref", ""),
        "target_schema_ref": mapping_contract.get("target_schema_ref", ""),
        "transform_profile_ref": mapping_contract.get("transform_profile_ref", ""),
        "validation_profile_ref": mapping_contract.get("validation_profile_ref", ""),
        "source_hash": mapping_contract.get("source_hash", ""),
        "enforcement_mode": enforcement_mode,
        "status": "passed" if not blocking else "blocked",
        "provider_payload": provider_payload,
        "gates": gates,
        "blocking_gate_refs": blocking,
    }
    return snapshot


def _provider_connection_for_route(artifact: PayrollOutputArtifact, provider_ref: str) -> PayrollProviderConnection | None:
    connection = PayrollProviderConnection.objects.filter(
        tenant=artifact.tenant,
        provider_ref=provider_ref,
    ).first()
    if connection and not isinstance(connection.readiness_snapshot, dict):
        connection = sync_payroll_provider_connection_readiness(connection)
    if connection and not connection.readiness_snapshot:
        connection = sync_payroll_provider_connection_readiness(connection)
    return connection


def _provider_connection_gate(
    *,
    profile: dict[str, Any],
    route: dict[str, Any],
    artifact: PayrollOutputArtifact,
    provider_ref: str,
    adapter_ref: str,
    channel_ref: str,
    credential_ref: str,
    callback_verification_ref: str,
    retry_policy_ref: str,
) -> dict[str, Any]:
    policy = _provider_connection_policy(profile, route)
    enforcement_mode = policy["enforcement_mode"]
    connection = _provider_connection_for_route(artifact, provider_ref)
    gate: dict[str, Any] = {
        "policy_ref": str(policy.get("policy_ref") or "payroll.provider_connection.policy.default.v1"),
        "enforcement_mode": enforcement_mode,
        "required": bool(policy["required"]),
        "provider_ref": provider_ref,
        "matched": connection is not None,
        "status": "not_configured",
        "certification_status": PayrollProviderCertificationStatus.NOT_STARTED,
        "active_allowed": False,
        "blocking_gate_refs": [],
        "mismatch_refs": [],
    }
    if enforcement_mode == "disabled":
        gate["status"] = "disabled"
        return gate
    if connection is None:
        gate["blocking_gate_refs"] = ["provider_connection_missing"] if gate["required"] else []
        if gate["required"]:
            raise PayrollFinanceHandoffError(f"Payroll provider connection {provider_ref} must be configured before finance handoff transmission.")
        return gate

    readiness = connection.readiness_snapshot if isinstance(connection.readiness_snapshot, dict) else {}
    active_allowed = bool(readiness.get("active_allowed")) and connection.certification_status == PayrollProviderCertificationStatus.PASSED
    mismatches = []
    expected_refs = {
        "adapter_ref": (connection.adapter_ref, adapter_ref),
        "channel_ref": (connection.channel_ref, channel_ref),
        "credential_ref": (connection.credential_ref, credential_ref),
        "callback_verification_ref": (connection.callback_verification_ref, callback_verification_ref),
        "retry_policy_ref": (connection.retry_policy_ref, retry_policy_ref),
    }
    for field_name, (connection_value, route_value) in expected_refs.items():
        if str(connection_value or "").strip() and str(route_value or "").strip() and str(connection_value) != str(route_value):
            mismatches.append(field_name)
    gate = {
        **gate,
        "provider_connection_id": str(connection.id),
        "provider_name": connection.provider_name,
        "provider_kind": connection.provider_kind,
        "environment_ref": connection.environment_ref,
        "status": connection.status,
        "certification_status": connection.certification_status,
        "active_allowed": active_allowed,
        "ready_gate_count": readiness.get("ready_gate_count", 0),
        "total_gate_count": readiness.get("total_gate_count", 0),
        "blocking_gate_refs": list(readiness.get("blocking_gate_refs", [])) if isinstance(readiness.get("blocking_gate_refs"), list) else [],
        "mismatch_refs": mismatches,
    }
    if enforcement_mode == "certified" and not active_allowed:
        raise PayrollFinanceHandoffError(f"Payroll provider connection {provider_ref} must pass certification before finance handoff transmission.")
    if enforcement_mode == "active" and (connection.status != PayrollProviderConnectionStatus.ACTIVE or not active_allowed):
        raise PayrollFinanceHandoffError(f"Payroll provider connection {provider_ref} must be active and certified before finance handoff transmission.")
    if enforcement_mode in {"certified", "active"} and mismatches:
        raise PayrollFinanceHandoffError(f"Payroll provider connection {provider_ref} does not match route refs: {', '.join(mismatches)}.")
    return gate


def _positive_int(value: Any, default: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return number if number > 0 else default


def _provider_callback_security_policy_config(
    *,
    profile: dict[str, Any],
    route: dict[str, Any],
    callback_verification_ref: str,
) -> dict[str, Any]:
    profile_policy = profile.get("callback_security_policy") if isinstance(profile.get("callback_security_policy"), dict) else {}
    route_policy = route.get("callback_security_policy") if isinstance(route.get("callback_security_policy"), dict) else {}
    policy = {**profile_policy, **route_policy}
    allowed_ip_refs = policy.get("allowed_ip_refs") if isinstance(policy.get("allowed_ip_refs"), list) else []
    allowed_source_ips = policy.get("allowed_source_ips") if isinstance(policy.get("allowed_source_ips"), list) else []
    return {
        "security_policy_ref": policy.get("security_policy_ref") or "payroll.callback.security.standard.v1",
        "enforcement_mode": policy.get("enforcement_mode") or "warn",
        "signature_algorithm_ref": policy.get("signature_algorithm_ref") or PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ALGORITHM_REF,
        "signature_adapter_ref": policy.get("signature_adapter_ref") or "",
        "signature_material_fields": (
            [str(item) for item in policy["signature_material_fields"] if str(item or "").strip()]
            if isinstance(policy.get("signature_material_fields"), list)
            else list(DEFAULT_PROVIDER_CALLBACK_SIGNATURE_MATERIAL_FIELDS)
        ),
        "signature_material_delimiter": str(policy.get("signature_material_delimiter") or ":"),
        "signature_key_ref": str(policy.get("signature_key_ref") or ""),
        "signature_key_resolution_mode": str(policy.get("signature_key_resolution_mode") or "reference"),
        "signature_key_material_field": str(policy.get("signature_key_material_field") or ""),
        "require_runtime_signature_key": bool(policy.get("require_runtime_signature_key", False)),
        "signature_encoding": str(policy.get("signature_encoding") or "hex"),
        "signature_digest_format": str(policy.get("signature_digest_format") or "hex"),
        "callback_verification_ref": callback_verification_ref,
        "secret_rotation_ref": policy.get("secret_rotation_ref") or "payroll.callback.secret_rotation.configured.v1",
        "replay_window_seconds": _positive_int(policy.get("replay_window_seconds"), 900),
        "timestamp_required": bool(policy.get("timestamp_required", False)),
        "source_ip_required": bool(policy.get("source_ip_required", False)),
        "allowed_ip_refs": [str(item) for item in allowed_ip_refs if str(item or "").strip()],
        "allowed_source_ips": [str(item) for item in allowed_source_ips if str(item or "").strip()],
        "rate_limit_policy_ref": policy.get("rate_limit_policy_ref") or "payroll.callback.rate_limit.standard.v1",
        "rate_limit_window_seconds": _positive_int(policy.get("rate_limit_window_seconds"), 60),
        "rate_limit_max_events": _positive_int(policy.get("rate_limit_max_events"), 60),
    }


def _provider_delivery_route(profile: dict[str, Any], artifact: PayrollOutputArtifact) -> dict[str, Any]:
    routes = profile.get("provider_routes") if isinstance(profile, dict) else {}
    route: dict[str, Any] = {}
    route_key = artifact.kind
    if isinstance(routes, dict):
        for candidate_key in _provider_route_keys(artifact):
            candidate = routes.get(candidate_key)
            if isinstance(candidate, dict):
                route = candidate
                route_key = candidate_key
                break
    try:
        validate_payroll_provider_route_config(route)
    except PayrollProviderAdapterError as exc:
        raise PayrollFinanceHandoffError(str(exc)) from exc
    provider_ref = route.get("provider_ref") or f"payroll.provider.{artifact.kind}.manual.v1"
    connection = _provider_connection_for_route(artifact, provider_ref)
    adapter_ref = route.get("adapter_ref") or (connection.adapter_ref if connection else "") or f"payroll.provider_adapter.{artifact.kind}.manual.v1"
    channel_ref = route.get("channel_ref") or (connection.channel_ref if connection else "") or f"payroll.channel.{artifact.kind}.manual.v1"
    submission_profile_ref = route.get("submission_profile_ref") or f"payroll.submission.{artifact.kind}.manual.v1"
    callback_profile_ref = route.get("callback_profile_ref") or (connection.callback_profile_ref if connection else "") or profile.get("callback_profile_ref") or "payroll.callback.manual.v1"
    callback_verification_ref = route.get("callback_verification_ref") or (connection.callback_verification_ref if connection else "") or profile.get("callback_verification_ref") or "payroll.callback.verification.manual.v1"
    retry_policy_ref = route.get("retry_policy_ref") or (connection.retry_policy_ref if connection else "") or profile.get("retry_policy_ref") or "payroll.delivery.retry.standard.v1"
    credential_ref = route.get("credential_ref") or (connection.credential_ref if connection else "") or ""
    credential_required = bool(route.get("credential_required", connection.credential_required if connection else False))
    credential_profile_ref = route.get("credential_profile_ref") or (connection.credential_profile_ref if connection else "") or ""
    certification_profile_ref = route.get("certification_profile_ref") or (connection.certification_profile_ref if connection else "") or f"{submission_profile_ref}.certification"
    certification_required = route.get("certification_required")
    if certification_required is None:
        certification_required = artifact.kind == PayrollOutputArtifactKind.STATUTORY_REPORT
    provider_connection_gate = _provider_connection_gate(
        profile=profile,
        route=route,
        artifact=artifact,
        provider_ref=provider_ref,
        adapter_ref=adapter_ref,
        channel_ref=channel_ref,
        credential_ref=credential_ref,
        callback_verification_ref=callback_verification_ref,
        retry_policy_ref=retry_policy_ref,
    )
    return {
        "provider_ref": provider_ref,
        "channel_ref": channel_ref,
        "retry_policy_ref": retry_policy_ref,
        "acknowledgement_profile_ref": route.get("acknowledgement_profile_ref") or profile.get("acknowledgement_profile_ref") or "payroll.acknowledgement.profile.manual.v1",
        "route_key": route_key,
        "adapter_ref": adapter_ref,
        "submission_mode": route.get("submission_mode") or "manual",
        "submission_profile_ref": submission_profile_ref,
        "request_schema_ref": route.get("request_schema_ref") or f"{submission_profile_ref}.request",
        "response_schema_ref": route.get("response_schema_ref") or f"{submission_profile_ref}.response",
        "callback_profile_ref": callback_profile_ref,
        "callback_verification_ref": callback_verification_ref,
        "callback_security_policy": _provider_callback_security_policy_config(
            profile=profile,
            route=route,
            callback_verification_ref=callback_verification_ref,
        ),
        "credential_ref": credential_ref,
        "credential_required": credential_required,
        "credential_profile_ref": credential_profile_ref,
        "retry_policy": route.get("retry_policy") if isinstance(route.get("retry_policy"), dict) else {},
        "execution_adapter": route.get("execution_adapter") if isinstance(route.get("execution_adapter"), dict) else {},
        "http_adapter": route.get("http_adapter") if isinstance(route.get("http_adapter"), dict) else {},
        "production_adapter": route.get("production_adapter") if isinstance(route.get("production_adapter"), dict) else {},
        "bank_payout_adapter": route.get("bank_payout_adapter") if isinstance(route.get("bank_payout_adapter"), dict) else {},
        "accounting_journal_adapter": route.get("accounting_journal_adapter") if isinstance(route.get("accounting_journal_adapter"), dict) else {},
        "statutory_filing_adapter": route.get("statutory_filing_adapter") if isinstance(route.get("statutory_filing_adapter"), dict) else {},
        "sandbox_response": route.get("sandbox_response") if isinstance(route.get("sandbox_response"), dict) else {},
        "provider_connection_gate": provider_connection_gate,
        "schema_mapping": _provider_schema_mapping_contract(
            artifact=artifact,
            provider_ref=provider_ref,
            route=route,
            connection=connection,
        ),
        "adapter_contract": _provider_adapter_contract(
            profile,
            route,
            artifact_kind=artifact.kind,
            adapter_ref=adapter_ref,
            provider_ref=provider_ref,
        ),
        "certification_profile_ref": certification_profile_ref,
        "certification_required": bool(certification_required),
    }


def _provider_submission_contract(
    *,
    handoff: PayrollFinanceHandoff,
    artifact: PayrollOutputArtifact,
    route: dict[str, Any],
) -> dict[str, Any]:
    config = artifact.config_snapshot if isinstance(artifact.config_snapshot, dict) else {}
    idempotency_material = ":".join([
        str(handoff.id),
        str(artifact.id),
        str(route["provider_ref"]),
        artifact.checksum_sha256,
        artifact.storage_object_version,
    ])
    contract = {
        "adapter_ref": route["adapter_ref"],
        "provider_ref": route["provider_ref"],
        "channel_ref": route["channel_ref"],
        "route_key": route["route_key"],
        "submission_mode": route["submission_mode"],
        "submission_profile_ref": route["submission_profile_ref"],
        "request_schema_ref": route["request_schema_ref"],
        "response_schema_ref": route["response_schema_ref"],
        "callback_profile_ref": route["callback_profile_ref"],
        "callback_verification_ref": route["callback_verification_ref"],
        "callback_security_policy": route.get("callback_security_policy", {}),
        "certification_profile_ref": route["certification_profile_ref"],
        "certification_required": route["certification_required"],
        "credential_ref": route.get("credential_ref", ""),
        "credential_profile_ref": route.get("credential_profile_ref", ""),
        "provider_connection_gate": route.get("provider_connection_gate", {}),
        "adapter_contract": route.get("adapter_contract", {}),
        "schema_mapping": route.get("schema_mapping", {}),
        "production_adapter": route.get("production_adapter", {}),
        "bank_payout_adapter": route.get("bank_payout_adapter", {}),
        "accounting_journal_adapter": route.get("accounting_journal_adapter", {}),
        "statutory_filing_adapter": route.get("statutory_filing_adapter", {}),
        "idempotency_key": hashlib.sha256(idempotency_material.encode("utf-8")).hexdigest(),
    }
    if artifact.kind == PayrollOutputArtifactKind.STATUTORY_REPORT:
        contract["statutory_context"] = {
            "artifact_subtype": config.get("artifact_subtype", ""),
            "statutory_filing_calendar_id": config.get("statutory_filing_calendar_id", ""),
            "statutory_filing_calendar_code": config.get("statutory_filing_calendar_code", ""),
            "filing_type_ref": config.get("filing_type_ref", ""),
            "filing_authority_ref": config.get("filing_authority_ref", ""),
            "employer_registration_id": config.get("employer_registration_id", ""),
            "employer_registration_number": config.get("employer_registration_number", ""),
            "output_profile_ref": artifact.output_profile_ref,
        }
    return contract


def _provider_delivery_request_snapshot(
    *,
    handoff: PayrollFinanceHandoff,
    artifact: PayrollOutputArtifact,
    route: dict[str, Any],
) -> dict[str, Any]:
    contract = _provider_submission_contract(handoff=handoff, artifact=artifact, route=route)
    return {
        "artifact_id": str(artifact.id),
        "artifact_key": artifact.artifact_key,
        "artifact_kind": artifact.kind,
        "file_name": artifact.file_name,
        "storage_key": artifact.storage_key,
        "storage_object_version": artifact.storage_object_version,
        "storage_provider_ref": artifact.storage_provider_ref,
        "download_strategy_ref": artifact.download_strategy_ref,
        "supports_signed_url": artifact.supports_signed_url,
        "mime_type": artifact.mime_type,
        "file_size_bytes": artifact.file_size_bytes,
        "checksum_sha256": artifact.checksum_sha256,
        "retention_policy_ref": artifact.retention_policy_ref,
        "line_count": len(artifact.line_snapshot) if isinstance(artifact.line_snapshot, list) else 0,
        "totals_snapshot": artifact.totals_snapshot,
        "submission_contract": contract,
    }


def _provider_certification_evidence(contract: dict[str, Any], *, status: str = "pending") -> dict[str, Any]:
    return {
        "status": status if contract.get("certification_required") else "not_required",
        "certification_profile_ref": contract.get("certification_profile_ref", ""),
        "provider_ref": contract.get("provider_ref", ""),
        "adapter_ref": contract.get("adapter_ref", ""),
        "evidence_refs": [],
    }


def _provider_retry_policy_config(delivery: PayrollProviderDelivery) -> dict[str, Any]:
    delivery_config = delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}
    route = delivery_config.get("provider_route") if isinstance(delivery_config.get("provider_route"), dict) else {}
    retry_policy = route.get("retry_policy") if isinstance(route.get("retry_policy"), dict) else {}
    return retry_policy


def _provider_retry_decision(delivery: PayrollProviderDelivery, *, requested_for=None) -> dict[str, Any]:
    policy = _provider_retry_policy_config(delivery)
    max_attempts = int(policy.get("max_attempts") or 3)
    backoff_seconds = int(policy.get("backoff_seconds") or 300)
    failure_taxonomy_ref = str(policy.get("failure_taxonomy_ref") or "payroll.delivery.failure_taxonomy.default.v1")
    failure_categories = policy.get("failure_categories") if isinstance(policy.get("failure_categories"), dict) else {}
    failure_category_ref = str(failure_categories.get(delivery.failure_code) or policy.get("default_failure_category_ref") or "provider_failure")
    current_attempt = max(delivery.attempt_count, 0)
    next_attempt = current_attempt + 1
    eligible_statuses = {
        PayrollProviderDeliveryStatus.FAILED,
        PayrollProviderDeliveryStatus.REJECTED,
    }
    eligible = delivery.status in eligible_statuses and current_attempt < max_attempts
    scheduled_for = requested_for or timezone.now() + timedelta(seconds=backoff_seconds)
    return {
        "eligible": eligible,
        "state": "scheduled" if eligible else "dead_lettered",
        "retry_policy_ref": delivery.retry_policy_ref,
        "failure_taxonomy_ref": failure_taxonomy_ref,
        "failure_category_ref": failure_category_ref,
        "max_attempts": max_attempts,
        "current_attempt_count": current_attempt,
        "next_attempt_number": next_attempt,
        "backoff_seconds": backoff_seconds,
        "scheduled_for": scheduled_for.isoformat(),
        "failure_code": delivery.failure_code,
        "failure_reason": delivery.failure_reason,
    }


def schedule_payroll_provider_delivery_retry(
    delivery: PayrollProviderDelivery,
    *,
    requested_by=None,
    retry_reason: str = "",
    scheduled_for=None,
) -> PayrollProviderRetryEvent:
    """Schedule retry or dead-letter a failed/rejected provider delivery."""

    if delivery.status == PayrollProviderDeliveryStatus.RECONCILED:
        raise PayrollProviderRetryError("Reconciled provider deliveries cannot be retried.")
    decision = _provider_retry_decision(delivery, requested_for=scheduled_for)
    status = PayrollProviderRetryEventStatus.SCHEDULED if decision["eligible"] else PayrollProviderRetryEventStatus.DEAD_LETTERED
    now = timezone.now()
    with transaction.atomic():
        event = PayrollProviderRetryEvent.objects.create(
            tenant=delivery.tenant,
            provider_delivery=delivery,
            handoff=delivery.handoff,
            output_artifact=delivery.output_artifact,
            status=status,
            retry_policy_ref=delivery.retry_policy_ref,
            failure_taxonomy_ref=decision["failure_taxonomy_ref"],
            failure_category_ref=decision["failure_category_ref"],
            retry_reason=retry_reason,
            attempt_number=decision["next_attempt_number"],
            scheduled_for=scheduled_for or now + timedelta(seconds=int(decision["backoff_seconds"])),
            requested_by=requested_by,
            decision_snapshot=decision,
            request_snapshot=delivery.request_snapshot,
            failure_code="" if decision["eligible"] else "retry_exhausted",
            failure_reason="" if decision["eligible"] else "Provider delivery reached the configured retry limit.",
        )
        retry_state = {
            **decision,
            "latest_retry_event_id": str(event.id),
            "updated_at": now.isoformat(),
        }
        if not decision["eligible"]:
            retry_state["dead_lettered_at"] = now.isoformat()
        delivery.config_snapshot = {
            **(delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}),
            "retry_state": retry_state,
        }
        delivery.save()
        _sync_finance_handoff_summary(delivery.handoff)
        provider_job = None
        if event.status == PayrollProviderRetryEventStatus.SCHEDULED:
            provider_job, _created = enqueue_payroll_provider_retry_job(event, requested_by=requested_by)
        if provider_job:
            event.decision_snapshot = {
                **(event.decision_snapshot if isinstance(event.decision_snapshot, dict) else {}),
                "provider_job_id": str(provider_job.id),
                "queue_policy_ref": provider_job.queue_policy_ref,
                "worker_profile_ref": provider_job.worker_profile_ref,
            }
            event.save()
    return event


def requeue_payroll_provider_delivery(
    delivery: PayrollProviderDelivery,
    *,
    executed_by=None,
    retry_event: PayrollProviderRetryEvent | None = None,
) -> PayrollProviderRetryEvent:
    """Execute a scheduled retry by moving the delivery back to submitted state."""

    if delivery.status == PayrollProviderDeliveryStatus.RECONCILED:
        raise PayrollProviderRetryError("Reconciled provider deliveries cannot be requeued.")
    if retry_event is None:
        retry_event = schedule_payroll_provider_delivery_retry(delivery, requested_by=executed_by, scheduled_for=timezone.now())
    if retry_event.status != PayrollProviderRetryEventStatus.SCHEDULED:
        raise PayrollProviderRetryError("Only scheduled provider retries can be requeued.")
    now = timezone.now()
    with transaction.atomic():
        delivery.attempt_count = max(delivery.attempt_count + 1, retry_event.attempt_number)
        delivery.status = PayrollProviderDeliveryStatus.SUBMITTED
        delivery.submitted_at = now
        delivery.submitted_by = executed_by or delivery.submitted_by
        delivery.acknowledged_at = None
        delivery.acknowledged_by = None
        delivery.reconciled_at = None
        delivery.reconciled_by = None
        delivery.failure_code = ""
        delivery.failure_reason = ""
        retry_state = {
            **(delivery.config_snapshot.get("retry_state", {}) if isinstance(delivery.config_snapshot, dict) and isinstance(delivery.config_snapshot.get("retry_state"), dict) else {}),
            "state": "requeued",
            "latest_retry_event_id": str(retry_event.id),
            "last_requeued_at": now.isoformat(),
            "attempt_count": delivery.attempt_count,
        }
        delivery.request_snapshot = {
            **(delivery.request_snapshot if isinstance(delivery.request_snapshot, dict) else {}),
            "retry_context": retry_state,
        }
        delivery.config_snapshot = {
            **(delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}),
            "retry_state": retry_state,
        }
        delivery.save()

        retry_event.status = PayrollProviderRetryEventStatus.EXECUTED
        retry_event.executed_at = now
        retry_event.executed_by = executed_by
        retry_event.response_snapshot = {
            "delivery_status": delivery.status,
            "attempt_count": delivery.attempt_count,
            "executed_at": now.isoformat(),
            "request_snapshot": delivery.request_snapshot,
        }
        retry_event.save()
        handoff = _sync_finance_handoff_summary(delivery.handoff)
        if handoff.status == PayrollFinanceHandoffStatus.FAILED:
            handoff.status = PayrollFinanceHandoffStatus.TRANSMITTED
            handoff.save()
    return retry_event


def _provider_retry_execution_config(delivery: PayrollProviderDelivery) -> dict[str, Any]:
    delivery_config = delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}
    route = delivery_config.get("provider_route") if isinstance(delivery_config.get("provider_route"), dict) else {}
    submission_contract = delivery_config.get("submission_contract") if isinstance(delivery_config.get("submission_contract"), dict) else {}
    execution_adapter = route.get("execution_adapter") if isinstance(route.get("execution_adapter"), dict) else {}
    return {
        "worker_profile_ref": execution_adapter.get("worker_profile_ref") or route.get("worker_profile_ref") or "payroll.provider_retry.worker.default.v1",
        "adapter_ref": execution_adapter.get("adapter_ref") or submission_contract.get("adapter_ref") or route.get("adapter_ref") or "payroll.provider_adapter.manual.v1",
        "execution_mode": execution_adapter.get("execution_mode") or "manual_requeue",
        "execution_strategy_ref": execution_adapter.get("execution_strategy_ref") or "payroll.provider_retry.execution.manual_requeue.v1",
        "dispatch_mode": execution_adapter.get("dispatch_mode") or "submitted_then_callback",
        "provider_ref": delivery.provider_ref,
        "channel_ref": delivery.channel_ref,
        "submission_profile_ref": submission_contract.get("submission_profile_ref", ""),
        "request_schema_ref": submission_contract.get("request_schema_ref", ""),
        "response_schema_ref": submission_contract.get("response_schema_ref", ""),
        "callback_profile_ref": submission_contract.get("callback_profile_ref", ""),
        "callback_verification_ref": submission_contract.get("callback_verification_ref", ""),
        "idempotency_key": submission_contract.get("idempotency_key", ""),
    }


def _skip_payroll_provider_retry_event(
    retry_event: PayrollProviderRetryEvent,
    *,
    failure_code: str,
    failure_reason: str,
    executed_by=None,
    response_snapshot: dict[str, Any] | None = None,
) -> PayrollProviderRetryEvent:
    now = timezone.now()
    with transaction.atomic():
        retry_event.status = PayrollProviderRetryEventStatus.SKIPPED
        retry_event.executed_at = now
        retry_event.executed_by = executed_by
        retry_event.failure_code = failure_code
        retry_event.failure_reason = failure_reason
        retry_event.response_snapshot = {
            **(retry_event.response_snapshot if isinstance(retry_event.response_snapshot, dict) else {}),
            **(response_snapshot or {}),
            "skipped_at": now.isoformat(),
            "failure_code": failure_code,
            "failure_reason": failure_reason,
        }
        retry_event.save()
    return retry_event


def execute_payroll_provider_retry_event(
    retry_event: PayrollProviderRetryEvent,
    *,
    executed_by=None,
    now=None,
) -> PayrollProviderRetryEvent:
    """Execute one due provider retry through the configured adapter shell."""

    now = now or timezone.now()
    if retry_event.status != PayrollProviderRetryEventStatus.SCHEDULED:
        raise PayrollProviderRetryError("Only scheduled provider retry events can be executed.")
    if retry_event.scheduled_for and retry_event.scheduled_for > now:
        raise PayrollProviderRetryError("Provider retry event is not due yet.")

    delivery = retry_event.provider_delivery
    adapter_config = _provider_retry_execution_config(delivery)
    execution_snapshot = {
        "worker_profile_ref": adapter_config["worker_profile_ref"],
        "adapter_ref": adapter_config["adapter_ref"],
        "execution_mode": adapter_config["execution_mode"],
        "execution_strategy_ref": adapter_config["execution_strategy_ref"],
        "dispatch_mode": adapter_config["dispatch_mode"],
        "provider_ref": adapter_config["provider_ref"],
        "channel_ref": adapter_config["channel_ref"],
        "submission_profile_ref": adapter_config["submission_profile_ref"],
        "request_schema_ref": adapter_config["request_schema_ref"],
        "response_schema_ref": adapter_config["response_schema_ref"],
        "callback_profile_ref": adapter_config["callback_profile_ref"],
        "callback_verification_ref": adapter_config["callback_verification_ref"],
        "idempotency_key": adapter_config["idempotency_key"],
        "retry_event_id": str(retry_event.id),
        "provider_delivery_id": str(delivery.id),
        "attempt_number": retry_event.attempt_number,
        "executed_at": now.isoformat(),
    }

    if delivery.status == PayrollProviderDeliveryStatus.RECONCILED:
        return _skip_payroll_provider_retry_event(
            retry_event,
            failure_code="delivery_already_reconciled",
            failure_reason="Provider delivery was reconciled before the retry worker executed.",
            executed_by=executed_by,
            response_snapshot={"adapter_execution": execution_snapshot},
        )
    if delivery.status not in {PayrollProviderDeliveryStatus.FAILED, PayrollProviderDeliveryStatus.REJECTED}:
        return _skip_payroll_provider_retry_event(
            retry_event,
            failure_code="delivery_not_retryable",
            failure_reason="Provider delivery is no longer in a failed or rejected state.",
            executed_by=executed_by,
            response_snapshot={"adapter_execution": execution_snapshot},
        )

    executed_event = requeue_payroll_provider_delivery(delivery, executed_by=executed_by, retry_event=retry_event)
    delivery.refresh_from_db()
    if _delivery_needs_provider_adapter_submission(delivery):
        submit_payroll_provider_delivery(delivery, submitted_by=executed_by, retry_event=executed_event)
    executed_event.response_snapshot = {
        **(executed_event.response_snapshot if isinstance(executed_event.response_snapshot, dict) else {}),
        "adapter_execution": execution_snapshot,
        "provider_submission": delivery.response_snapshot.get("adapter_submission", {}) if isinstance(delivery.response_snapshot, dict) else {},
    }
    executed_event.save()
    return executed_event


def process_due_payroll_provider_retries(
    *,
    tenant=None,
    limit: int = 100,
    now=None,
    executed_by=None,
) -> PayrollProviderRetryWorkerResult:
    """Process due provider retry events through the adapter shell."""

    now = now or timezone.now()
    queryset = PayrollProviderRetryEvent.objects.filter(
        status=PayrollProviderRetryEventStatus.SCHEDULED,
        scheduled_for__lte=now,
    ).select_related("provider_delivery", "handoff", "output_artifact")
    if tenant is not None:
        queryset = queryset.filter(tenant=tenant)

    processed_events: list[PayrollProviderRetryEvent] = []
    executed_count = 0
    skipped_count = 0
    for retry_event in queryset.order_by("scheduled_for", "created_at")[: max(1, limit)]:
        try:
            processed_event = execute_payroll_provider_retry_event(
                retry_event,
                executed_by=executed_by,
                now=now,
            )
        except PayrollProviderRetryError as exc:
            processed_event = _skip_payroll_provider_retry_event(
                retry_event,
                failure_code="retry_execution_error",
                failure_reason=str(exc),
                executed_by=executed_by,
            )
        processed_events.append(processed_event)
        if processed_event.status == PayrollProviderRetryEventStatus.EXECUTED:
            executed_count += 1
        elif processed_event.status == PayrollProviderRetryEventStatus.SKIPPED:
            skipped_count += 1

    return PayrollProviderRetryWorkerResult(
        processed_events=processed_events,
        executed_count=executed_count,
        skipped_count=skipped_count,
    )


def _provider_job_policy_from_snapshot(snapshot: dict[str, Any], *, job_kind: str) -> dict[str, Any]:
    route = snapshot.get("provider_route") if isinstance(snapshot.get("provider_route"), dict) else {}
    submission_contract = snapshot.get("submission_contract") if isinstance(snapshot.get("submission_contract"), dict) else {}
    policy = route.get("provider_job_policy") if isinstance(route.get("provider_job_policy"), dict) else {}
    if not policy and isinstance(submission_contract.get("provider_job_policy"), dict):
        policy = submission_contract["provider_job_policy"]
    return {
        "queue_policy_ref": policy.get("queue_policy_ref") or f"payroll.provider_queue.{job_kind}.standard.v1",
        "worker_profile_ref": policy.get("worker_profile_ref") or f"payroll.provider_worker.{job_kind}.standard.v1",
        "max_attempts": _positive_int(policy.get("max_attempts"), 3),
        "lease_seconds": _positive_int(policy.get("lease_seconds"), 300),
        "heartbeat_seconds": _positive_int(policy.get("heartbeat_seconds"), 60),
        "max_recoveries": _positive_int(policy.get("max_recoveries"), 3),
        "stale_recovery_backoff_seconds": _positive_int(policy.get("stale_recovery_backoff_seconds"), 60),
        "backoff_seconds": _positive_int(policy.get("backoff_seconds"), 300),
        "priority": _positive_int(policy.get("priority"), 100),
    }


def _provider_job_policy_for_delivery(delivery: PayrollProviderDelivery, *, job_kind: str) -> dict[str, Any]:
    snapshot = delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}
    return _provider_job_policy_from_snapshot(snapshot, job_kind=job_kind)


def _provider_job_policy_for_connection(connection: PayrollProviderConnection, *, job_kind: str) -> dict[str, Any]:
    snapshot = connection.config_snapshot if isinstance(connection.config_snapshot, dict) else {}
    provider_route = snapshot.get("provider_route") if isinstance(snapshot.get("provider_route"), dict) else snapshot
    return _provider_job_policy_from_snapshot({"provider_route": provider_route}, job_kind=job_kind)


def enqueue_payroll_provider_job(
    *,
    tenant,
    job_kind: str,
    idempotency_key: str,
    queue_policy_ref: str = "",
    worker_profile_ref: str = "",
    provider_ref: str = "",
    provider_delivery: PayrollProviderDelivery | None = None,
    provider_connection: PayrollProviderConnection | None = None,
    retry_event: PayrollProviderRetryEvent | None = None,
    callback_event: PayrollProviderCallbackEvent | None = None,
    certification_run: PayrollProviderCertificationRun | None = None,
    scheduled_for=None,
    priority: int = 100,
    max_attempts: int = 3,
    requested_by=None,
    request_snapshot: dict[str, Any] | None = None,
) -> tuple[PayrollProviderJob, bool]:
    idempotency_key = str(idempotency_key or "").strip()
    if not idempotency_key:
        raise PayrollProviderJobError("Provider queue jobs require an idempotency key.")
    if job_kind not in {choice for choice, _label in PayrollProviderJobKind.choices}:
        raise PayrollProviderJobError("Unsupported provider queue job kind.")
    defaults = {
        "job_kind": job_kind,
        "status": PayrollProviderJobStatus.QUEUED,
        "queue_policy_ref": queue_policy_ref or f"payroll.provider_queue.{job_kind}.standard.v1",
        "worker_profile_ref": worker_profile_ref or f"payroll.provider_worker.{job_kind}.standard.v1",
        "provider_ref": provider_ref,
        "provider_delivery": provider_delivery,
        "provider_connection": provider_connection,
        "retry_event": retry_event,
        "callback_event": callback_event,
        "certification_run": certification_run,
        "scheduled_for": scheduled_for or timezone.now(),
        "priority": max(1, int(priority or 100)),
        "max_attempts": max(1, int(max_attempts or 3)),
        "requested_by": requested_by,
        "request_snapshot": request_snapshot or {},
    }
    job, created = PayrollProviderJob.objects.get_or_create(
        tenant=tenant,
        idempotency_key=idempotency_key,
        defaults=defaults,
    )
    return job, created


def enqueue_payroll_provider_delivery_submission_job(
    delivery: PayrollProviderDelivery,
    *,
    requested_by=None,
    scheduled_for=None,
) -> tuple[PayrollProviderJob, bool]:
    policy = _provider_job_policy_for_delivery(delivery, job_kind=PayrollProviderJobKind.PROVIDER_SUBMISSION)
    return enqueue_payroll_provider_job(
        tenant=delivery.tenant,
        job_kind=PayrollProviderJobKind.PROVIDER_SUBMISSION,
        idempotency_key=f"provider-submission:{delivery.id}",
        queue_policy_ref=policy["queue_policy_ref"],
        worker_profile_ref=policy["worker_profile_ref"],
        provider_ref=delivery.provider_ref,
        provider_delivery=delivery,
        scheduled_for=scheduled_for,
        priority=policy["priority"],
        max_attempts=policy["max_attempts"],
        requested_by=requested_by,
        request_snapshot={
            "provider_delivery_id": str(delivery.id),
            "provider_ref": delivery.provider_ref,
            "artifact_kind": delivery.artifact_kind,
            "queue_policy": policy,
        },
    )


def enqueue_payroll_provider_retry_job(
    retry_event: PayrollProviderRetryEvent,
    *,
    requested_by=None,
) -> tuple[PayrollProviderJob, bool]:
    delivery = retry_event.provider_delivery
    policy = _provider_job_policy_for_delivery(delivery, job_kind=PayrollProviderJobKind.PROVIDER_RETRY)
    return enqueue_payroll_provider_job(
        tenant=retry_event.tenant,
        job_kind=PayrollProviderJobKind.PROVIDER_RETRY,
        idempotency_key=f"provider-retry:{retry_event.id}",
        queue_policy_ref=policy["queue_policy_ref"],
        worker_profile_ref=policy["worker_profile_ref"],
        provider_ref=delivery.provider_ref,
        provider_delivery=delivery,
        retry_event=retry_event,
        scheduled_for=retry_event.scheduled_for,
        priority=policy["priority"],
        max_attempts=policy["max_attempts"],
        requested_by=requested_by or retry_event.requested_by,
        request_snapshot={
            "retry_event_id": str(retry_event.id),
            "provider_delivery_id": str(delivery.id),
            "provider_ref": delivery.provider_ref,
            "retry_policy_ref": retry_event.retry_policy_ref,
            "queue_policy": policy,
        },
    )


def enqueue_payroll_provider_certification_job(
    connection: PayrollProviderConnection,
    *,
    requested_by=None,
    scheduled_for=None,
    run_profile_ref: str | None = None,
    scenario_profile_ref: str | None = None,
) -> tuple[PayrollProviderJob, bool]:
    policy = _provider_job_policy_for_connection(connection, job_kind=PayrollProviderJobKind.PROVIDER_CERTIFICATION)
    material = ":".join([
        "provider-certification",
        str(connection.id),
        run_profile_ref or "payroll.provider_connection.certification_run.sandbox.v1",
        scenario_profile_ref or "",
        str(scheduled_for.isoformat() if hasattr(scheduled_for, "isoformat") else scheduled_for or "now"),
    ])
    idempotency_key = hashlib.sha256(material.encode("utf-8")).hexdigest()
    return enqueue_payroll_provider_job(
        tenant=connection.tenant,
        job_kind=PayrollProviderJobKind.PROVIDER_CERTIFICATION,
        idempotency_key=idempotency_key,
        queue_policy_ref=policy["queue_policy_ref"],
        worker_profile_ref=policy["worker_profile_ref"],
        provider_ref=connection.provider_ref,
        provider_connection=connection,
        scheduled_for=scheduled_for,
        priority=policy["priority"],
        max_attempts=policy["max_attempts"],
        requested_by=requested_by,
        request_snapshot={
            "provider_connection_id": str(connection.id),
            "provider_ref": connection.provider_ref,
            "run_profile_ref": run_profile_ref or "payroll.provider_connection.certification_run.sandbox.v1",
            "scenario_profile_ref": scenario_profile_ref or "",
            "queue_policy": policy,
        },
    )


def enqueue_payroll_provider_callback_reconciliation_job(
    callback_event: PayrollProviderCallbackEvent,
    *,
    requested_by=None,
    scheduled_for=None,
) -> tuple[PayrollProviderJob, bool]:
    delivery = callback_event.provider_delivery
    policy = _provider_job_policy_for_delivery(delivery, job_kind=PayrollProviderJobKind.CALLBACK_RECONCILIATION)
    return enqueue_payroll_provider_job(
        tenant=callback_event.tenant,
        job_kind=PayrollProviderJobKind.CALLBACK_RECONCILIATION,
        idempotency_key=f"callback-reconciliation:{callback_event.id}",
        queue_policy_ref=policy["queue_policy_ref"],
        worker_profile_ref=policy["worker_profile_ref"],
        provider_ref=callback_event.provider_ref,
        provider_delivery=delivery,
        callback_event=callback_event,
        scheduled_for=scheduled_for,
        priority=policy["priority"],
        max_attempts=policy["max_attempts"],
        requested_by=requested_by,
        request_snapshot={
            "callback_event_id": str(callback_event.id),
            "provider_delivery_id": str(delivery.id),
            "provider_ref": callback_event.provider_ref,
            "callback_status": callback_event.status,
            "queue_policy": policy,
        },
    )


def _payroll_provider_job_runtime_policy(job: PayrollProviderJob) -> dict[str, Any]:
    request_snapshot = job.request_snapshot if isinstance(job.request_snapshot, dict) else {}
    policy = request_snapshot.get("queue_policy") if isinstance(request_snapshot.get("queue_policy"), dict) else {}
    return {
        "lease_seconds": _positive_int(policy.get("lease_seconds"), 300),
        "heartbeat_seconds": _positive_int(policy.get("heartbeat_seconds"), 60),
        "max_recoveries": _positive_int(policy.get("max_recoveries"), 3),
        "stale_recovery_backoff_seconds": _positive_int(policy.get("stale_recovery_backoff_seconds"), 60),
        "backoff_seconds": _positive_int(policy.get("backoff_seconds"), 300),
    }


def _append_payroll_provider_job_runtime_event(
    job: PayrollProviderJob,
    *,
    event_type: str,
    recorded_at,
    evidence: dict[str, Any] | None = None,
) -> None:
    snapshot = job.response_snapshot if isinstance(job.response_snapshot, dict) else {}
    events = snapshot.get("runtime_events") if isinstance(snapshot.get("runtime_events"), list) else []
    job.response_snapshot = {
        **snapshot,
        "queue_runtime_profile_ref": "payroll.provider_queue.runtime.standard.v1",
        "last_runtime_event": event_type,
        "last_runtime_event_at": recorded_at.isoformat() if hasattr(recorded_at, "isoformat") else str(recorded_at),
        "runtime_events": [
            *events[-49:],
            {
                "event_type": event_type,
                "recorded_at": recorded_at.isoformat() if hasattr(recorded_at, "isoformat") else str(recorded_at),
                "evidence": evidence or {},
            },
        ],
    }


def heartbeat_payroll_provider_job(
    job: PayrollProviderJob,
    *,
    lease_owner_ref: str,
    now=None,
    extend_seconds: int | None = None,
) -> PayrollProviderJob:
    now = now or timezone.now()
    lease_owner_ref = str(lease_owner_ref or "").strip()
    if job.status not in {PayrollProviderJobStatus.LEASED, PayrollProviderJobStatus.RUNNING}:
        raise PayrollProviderJobError("Only leased or running provider jobs can be heartbeated.")
    if not lease_owner_ref or job.lease_owner_ref != lease_owner_ref:
        raise PayrollProviderJobError("Provider job heartbeat lease owner does not match.")
    if job.leased_until and job.leased_until <= now:
        raise PayrollProviderJobError("Provider job lease has expired and must be recovered.")
    policy = _payroll_provider_job_runtime_policy(job)
    lease_seconds = _positive_int(extend_seconds, policy["lease_seconds"])
    job.heartbeat_at = now
    job.heartbeat_count += 1
    job.leased_until = now + timedelta(seconds=lease_seconds)
    lease_snapshot = job.lease_snapshot if isinstance(job.lease_snapshot, dict) else {}
    heartbeats = lease_snapshot.get("heartbeats") if isinstance(lease_snapshot.get("heartbeats"), list) else []
    job.lease_snapshot = {
        **lease_snapshot,
        "heartbeat_profile_ref": "payroll.provider_queue.heartbeat.standard.v1",
        "heartbeat_owner_ref": lease_owner_ref,
        "heartbeat_count": job.heartbeat_count,
        "last_heartbeat_at": now.isoformat(),
        "leased_until": job.leased_until.isoformat(),
        "heartbeats": [
            *heartbeats[-9:],
            {
                "heartbeat_at": now.isoformat(),
                "lease_owner_ref": lease_owner_ref,
                "leased_until": job.leased_until.isoformat(),
                "heartbeat_seconds": policy["heartbeat_seconds"],
            },
        ],
    }
    _append_payroll_provider_job_runtime_event(
        job,
        event_type="heartbeat",
        recorded_at=now,
        evidence={"lease_owner_ref": lease_owner_ref, "leased_until": job.leased_until.isoformat()},
    )
    job.save()
    return job


def recover_stale_payroll_provider_jobs(
    *,
    tenant=None,
    limit: int = 100,
    now=None,
    recovery_owner_ref: str = "payroll.provider_worker.recovery.v1",
) -> list[PayrollProviderJob]:
    now = now or timezone.now()
    queryset = PayrollProviderJob.objects.filter(
        status__in=[PayrollProviderJobStatus.LEASED, PayrollProviderJobStatus.RUNNING],
        leased_until__lte=now,
    ).select_related("provider_delivery", "provider_connection", "retry_event", "callback_event", "certification_run")
    if tenant is not None:
        queryset = queryset.filter(tenant=tenant)
    recovered_jobs: list[PayrollProviderJob] = []
    for job in queryset.order_by("leased_until", "priority", "created_at")[: max(1, limit)]:
        with transaction.atomic():
            job = PayrollProviderJob.objects.select_for_update().get(id=job.id)
            if job.status not in {PayrollProviderJobStatus.LEASED, PayrollProviderJobStatus.RUNNING}:
                continue
            if not job.leased_until or job.leased_until > now:
                continue
            policy = _payroll_provider_job_runtime_policy(job)
            job.recovery_count += 1
            job.last_recovered_at = now
            failure_code = "provider_job_stale_lease_recovered"
            failure_reason = "Provider queue job lease expired before completion and was recovered for a future attempt."
            terminal = job.recovery_count >= policy["max_recoveries"] or job.attempt_count >= job.max_attempts
            if terminal:
                job.status = PayrollProviderJobStatus.DEAD_LETTERED
                job.completed_at = now
                failure_code = "provider_job_stale_lease_dead_lettered"
                failure_reason = "Provider queue job exceeded stale lease recovery limits."
            else:
                job.status = PayrollProviderJobStatus.QUEUED
                job.scheduled_for = now + timedelta(seconds=policy["stale_recovery_backoff_seconds"])
                job.completed_at = None
            _append_payroll_provider_job_runtime_event(
                job,
                event_type="stale_lease_recovered",
                recorded_at=now,
                evidence={
                    "recovery_owner_ref": recovery_owner_ref,
                    "previous_lease_owner_ref": job.lease_owner_ref,
                    "previous_leased_until": job.leased_until.isoformat() if job.leased_until else "",
                    "attempt_count": job.attempt_count,
                    "max_attempts": job.max_attempts,
                    "recovery_count": job.recovery_count,
                    "max_recoveries": policy["max_recoveries"],
                    "next_scheduled_for": job.scheduled_for.isoformat() if job.status == PayrollProviderJobStatus.QUEUED and job.scheduled_for else "",
                },
            )
            job.failure_code = failure_code
            job.failure_reason = failure_reason
            job.lease_owner_ref = ""
            job.leased_at = None
            job.leased_until = None
            job.save()
            recovered_jobs.append(job)
    return recovered_jobs


def _complete_payroll_provider_job(
    job: PayrollProviderJob,
    *,
    status: str,
    response_snapshot: dict[str, Any],
    failure_code: str = "",
    failure_reason: str = "",
) -> PayrollProviderJob:
    now = timezone.now()
    job.status = status
    job.completed_at = now
    job.response_snapshot = {
        **(job.response_snapshot if isinstance(job.response_snapshot, dict) else {}),
        **response_snapshot,
        "completed_at": now.isoformat(),
    }
    job.failure_code = failure_code
    job.failure_reason = failure_reason
    job.lease_owner_ref = ""
    job.leased_at = None
    job.leased_until = None
    job.save()
    return job


def execute_payroll_provider_job(
    job: PayrollProviderJob,
    *,
    executed_by=None,
    lease_owner_ref: str = "payroll.provider_worker.local.v1",
    now=None,
) -> PayrollProviderJob:
    """Lease and execute one provider queue job through the configured service seam."""

    now = now or timezone.now()
    if job.status not in {PayrollProviderJobStatus.QUEUED, PayrollProviderJobStatus.LEASED}:
        raise PayrollProviderJobError("Only queued or expired leased provider jobs can be executed.")
    if job.scheduled_for and job.scheduled_for > now:
        raise PayrollProviderJobError("Provider queue job is not due yet.")
    if job.status == PayrollProviderJobStatus.LEASED and job.leased_until and job.leased_until > now:
        raise PayrollProviderJobError("Provider queue job is leased by another worker.")

    lease_seconds = _positive_int((job.request_snapshot or {}).get("queue_policy", {}).get("lease_seconds") if isinstance(job.request_snapshot, dict) and isinstance(job.request_snapshot.get("queue_policy"), dict) else None, 300)
    with transaction.atomic():
        job.status = PayrollProviderJobStatus.RUNNING
        job.attempt_count += 1
        job.started_at = now
        job.executed_by = executed_by
        job.leased_at = now
        job.leased_until = now + timedelta(seconds=lease_seconds)
        job.lease_owner_ref = lease_owner_ref
        job.lease_snapshot = {
            "lease_owner_ref": lease_owner_ref,
            "leased_at": now.isoformat(),
            "leased_until": job.leased_until.isoformat(),
            "attempt_number": job.attempt_count,
            "worker_profile_ref": job.worker_profile_ref,
            "heartbeat_seconds": _payroll_provider_job_runtime_policy(job)["heartbeat_seconds"],
        }
        _append_payroll_provider_job_runtime_event(
            job,
            event_type="lease_acquired",
            recorded_at=now,
            evidence={
                "lease_owner_ref": lease_owner_ref,
                "worker_profile_ref": job.worker_profile_ref,
                "attempt_number": job.attempt_count,
                "leased_until": job.leased_until.isoformat(),
            },
        )
        job.save()

    try:
        if job.job_kind == PayrollProviderJobKind.PROVIDER_RETRY:
            if not job.retry_event_id:
                raise PayrollProviderJobError("Provider retry jobs require a retry event.")
            retry_event = execute_payroll_provider_retry_event(job.retry_event, executed_by=executed_by, now=now)
            return _complete_payroll_provider_job(
                job,
                status=PayrollProviderJobStatus.COMPLETED if retry_event.status == PayrollProviderRetryEventStatus.EXECUTED else PayrollProviderJobStatus.SKIPPED,
                response_snapshot={
                    "retry_event_id": str(retry_event.id),
                    "retry_event_status": retry_event.status,
                    "provider_delivery_id": str(retry_event.provider_delivery_id),
                    "provider_delivery_status": retry_event.provider_delivery.status,
                },
                failure_code="" if retry_event.status == PayrollProviderRetryEventStatus.EXECUTED else retry_event.failure_code,
                failure_reason="" if retry_event.status == PayrollProviderRetryEventStatus.EXECUTED else retry_event.failure_reason,
            )
        if job.job_kind == PayrollProviderJobKind.PROVIDER_SUBMISSION:
            if not job.provider_delivery_id:
                raise PayrollProviderJobError("Provider submission jobs require a provider delivery.")
            delivery = submit_payroll_provider_delivery(job.provider_delivery, submitted_by=executed_by)
            return _complete_payroll_provider_job(
                job,
                status=PayrollProviderJobStatus.COMPLETED,
                response_snapshot={
                    "provider_delivery_id": str(delivery.id),
                    "provider_delivery_status": delivery.status,
                    "adapter_submission": delivery.response_snapshot.get("adapter_submission", {}) if isinstance(delivery.response_snapshot, dict) else {},
                },
            )
        if job.job_kind == PayrollProviderJobKind.PROVIDER_CERTIFICATION:
            if not job.provider_connection_id:
                raise PayrollProviderJobError("Provider certification jobs require a provider connection.")
            request_snapshot = job.request_snapshot if isinstance(job.request_snapshot, dict) else {}
            run = run_payroll_provider_connection_certification(
                job.provider_connection,
                requested_by=job.requested_by,
                executed_by=executed_by,
                run_profile_ref=str(request_snapshot.get("run_profile_ref") or "payroll.provider_connection.certification_run.sandbox.v1"),
                scenario_profile_ref=str(request_snapshot.get("scenario_profile_ref") or ""),
            )
            job.certification_run = run
            return _complete_payroll_provider_job(
                job,
                status=PayrollProviderJobStatus.COMPLETED if run.status == PayrollProviderCertificationRunStatus.PASSED else PayrollProviderJobStatus.FAILED,
                response_snapshot={
                    "certification_run_id": str(run.id),
                    "certification_status": run.status,
                    "passed_count": run.passed_count,
                    "failed_count": run.failed_count,
                    "blocker_count": run.blocker_count,
                },
                failure_code="" if run.status == PayrollProviderCertificationRunStatus.PASSED else "provider_certification_failed",
                failure_reason="" if run.status == PayrollProviderCertificationRunStatus.PASSED else "Provider certification run failed.",
            )
        if job.job_kind == PayrollProviderJobKind.CALLBACK_RECONCILIATION:
            if not job.callback_event_id:
                raise PayrollProviderJobError("Callback reconciliation jobs require a callback event.")
            callback_event = job.callback_event
            return _complete_payroll_provider_job(
                job,
                status=PayrollProviderJobStatus.COMPLETED,
                response_snapshot={
                    "callback_event_id": str(callback_event.id),
                    "callback_event_status": callback_event.status,
                    "provider_delivery_id": str(callback_event.provider_delivery_id),
                    "provider_delivery_status": callback_event.provider_delivery.status,
                    "handoff_status": callback_event.handoff.status,
                },
            )
        raise PayrollProviderJobError("Unsupported provider queue job kind.")
    except Exception as exc:
        retry_policy = job.request_snapshot.get("queue_policy", {}) if isinstance(job.request_snapshot, dict) and isinstance(job.request_snapshot.get("queue_policy"), dict) else {}
        backoff_seconds = _positive_int(retry_policy.get("backoff_seconds"), 300)
        now = timezone.now()
        if job.attempt_count >= job.max_attempts:
            job.status = PayrollProviderJobStatus.DEAD_LETTERED
            job.completed_at = now
        else:
            job.status = PayrollProviderJobStatus.QUEUED
            job.scheduled_for = now + timedelta(seconds=backoff_seconds)
            job.completed_at = None
        job.failure_code = "provider_job_execution_failed"
        job.failure_reason = str(exc)
        job.response_snapshot = {
            **(job.response_snapshot if isinstance(job.response_snapshot, dict) else {}),
            "error": {
                "code": job.failure_code,
                "message": str(exc),
                "attempt_count": job.attempt_count,
                "max_attempts": job.max_attempts,
                "retry_scheduled_for": job.scheduled_for.isoformat() if job.status == PayrollProviderJobStatus.QUEUED and job.scheduled_for else "",
            },
        }
        job.lease_owner_ref = ""
        job.leased_at = None
        job.leased_until = None
        job.save()
        return job


def process_due_payroll_provider_jobs(
    *,
    tenant=None,
    limit: int = 100,
    now=None,
    executed_by=None,
    lease_owner_ref: str = "payroll.provider_worker.local.v1",
) -> PayrollProviderJobWorkerResult:
    """Process due generic provider jobs through the portable job ledger."""

    now = now or timezone.now()
    recovered_jobs = recover_stale_payroll_provider_jobs(
        tenant=tenant,
        limit=limit,
        now=now,
        recovery_owner_ref=lease_owner_ref,
    )
    remaining_limit = max(0, max(1, limit) - len(recovered_jobs))
    if remaining_limit == 0:
        return PayrollProviderJobWorkerResult(
            processed_jobs=[],
            completed_count=0,
            failed_count=0,
            skipped_count=0,
            dead_lettered_count=0,
            recovered_count=len(recovered_jobs),
        )
    queryset = PayrollProviderJob.objects.filter(
        status=PayrollProviderJobStatus.QUEUED,
        scheduled_for__lte=now,
    ).select_related(
        "provider_delivery",
        "provider_connection",
        "retry_event",
        "callback_event",
        "certification_run",
    )
    if tenant is not None:
        queryset = queryset.filter(tenant=tenant)

    processed_jobs: list[PayrollProviderJob] = []
    completed_count = 0
    failed_count = 0
    skipped_count = 0
    dead_lettered_count = 0
    for job in queryset.order_by("scheduled_for", "priority", "created_at")[:remaining_limit]:
        processed_job = execute_payroll_provider_job(
            job,
            executed_by=executed_by,
            lease_owner_ref=lease_owner_ref,
            now=now,
        )
        processed_jobs.append(processed_job)
        if processed_job.status == PayrollProviderJobStatus.COMPLETED:
            completed_count += 1
        elif processed_job.status == PayrollProviderJobStatus.FAILED:
            failed_count += 1
        elif processed_job.status == PayrollProviderJobStatus.SKIPPED:
            skipped_count += 1
        elif processed_job.status == PayrollProviderJobStatus.DEAD_LETTERED:
            dead_lettered_count += 1

    return PayrollProviderJobWorkerResult(
        processed_jobs=processed_jobs,
        completed_count=completed_count,
        failed_count=failed_count,
        skipped_count=skipped_count,
        dead_lettered_count=dead_lettered_count,
        recovered_count=len(recovered_jobs),
    )


def _json_checksum(payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _provider_callback_signature_adapter_ref(policy: dict[str, Any]) -> str:
    adapter_ref = str(policy.get("signature_adapter_ref") or "").strip()
    if adapter_ref:
        return adapter_ref
    algorithm_ref = str(policy.get("signature_algorithm_ref") or PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ALGORITHM_REF)
    if algorithm_ref == PAYROLL_PROVIDER_CALLBACK_SIGNATURE_RSA_SHA256_ALGORITHM_REF:
        return PAYROLL_PROVIDER_CALLBACK_SIGNATURE_RSA_SHA256_ADAPTER_REF
    if algorithm_ref == PAYROLL_PROVIDER_CALLBACK_SIGNATURE_HMAC_SHA256_ALGORITHM_REF:
        return PAYROLL_PROVIDER_CALLBACK_SIGNATURE_HMAC_SHA256_ADAPTER_REF
    return PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ADAPTER_REF


def _provider_callback_signature_field_values(
    delivery: PayrollProviderDelivery,
    *,
    idempotency_key: str,
    payload_checksum_sha256: str,
    callback_verification_ref: str,
) -> dict[str, str]:
    return {
        "provider_ref": delivery.provider_ref,
        "provider_delivery_id": str(delivery.id),
        "handoff_id": str(delivery.handoff_id),
        "output_artifact_id": str(delivery.output_artifact_id),
        "artifact_kind": delivery.artifact_kind,
        "channel_ref": delivery.channel_ref,
        "external_reference": delivery.external_reference,
        "idempotency_key": idempotency_key,
        "payload_checksum_sha256": payload_checksum_sha256,
        "artifact_checksum_sha256": delivery.payload_checksum_sha256,
        "callback_verification_ref": callback_verification_ref,
    }


def _provider_callback_signature_material(
    delivery: PayrollProviderDelivery,
    *,
    idempotency_key: str,
    payload_checksum_sha256: str,
    policy: dict[str, Any],
) -> tuple[str, list[str], list[str]]:
    callback_verification_ref = str(policy.get("callback_verification_ref") or "payroll.callback.verification.manual.v1")
    configured_fields = policy.get("signature_material_fields")
    material_fields = (
        [str(item) for item in configured_fields if str(item or "").strip()]
        if isinstance(configured_fields, list)
        else list(DEFAULT_PROVIDER_CALLBACK_SIGNATURE_MATERIAL_FIELDS)
    )
    if not material_fields:
        material_fields = list(DEFAULT_PROVIDER_CALLBACK_SIGNATURE_MATERIAL_FIELDS)
    values = _provider_callback_signature_field_values(
        delivery,
        idempotency_key=idempotency_key,
        payload_checksum_sha256=payload_checksum_sha256,
        callback_verification_ref=callback_verification_ref,
    )
    unknown_fields = [field for field in material_fields if field not in values]
    delimiter = str(policy.get("signature_material_delimiter") or ":")
    material = delimiter.join(str(values.get(field, "")) for field in material_fields)
    return material, material_fields, unknown_fields


def _provider_callback_runtime_signature_key(
    *,
    signature_key_ref: str,
    provider_ref: str,
    policy: dict[str, Any],
) -> tuple[str, dict[str, Any]]:
    try:
        credential = resolve_payroll_provider_credential(signature_key_ref, provider_ref=provider_ref)
    except PayrollProviderAdapterError as exc:
        raise PayrollProviderSignatureAdapterError(str(exc)) from exc

    configured_field = str(policy.get("signature_key_material_field") or "").strip()
    candidate_fields = [configured_field] if configured_field else list(DEFAULT_PROVIDER_CALLBACK_SIGNATURE_KEY_MATERIAL_FIELDS)
    for field_name in candidate_fields:
        if field_name and credential.material.get(field_name) not in {None, ""}:
            return str(credential.material[field_name]), {
                "key_material_mode": "runtime_secret_ref",
                "signature_key_ref": signature_key_ref,
                "signature_key_material_field": field_name,
                "credential_snapshot": {
                    **credential.snapshot(),
                    "resolved": True,
                    "material_field_ref": field_name,
                },
            }
    raise PayrollProviderSignatureAdapterError(
        f"Payroll provider credential_ref {signature_key_ref} has no callback signature key material."
    )


def _provider_callback_runtime_public_key(
    *,
    signature_key_ref: str,
    provider_ref: str,
    policy: dict[str, Any],
) -> tuple[str, dict[str, Any]]:
    try:
        credential = resolve_payroll_provider_credential(signature_key_ref, provider_ref=provider_ref)
    except PayrollProviderAdapterError as exc:
        raise PayrollProviderSignatureAdapterError(str(exc)) from exc

    configured_field = str(policy.get("signature_key_material_field") or "").strip()
    candidate_fields = [configured_field] if configured_field else list(DEFAULT_PROVIDER_CALLBACK_PUBLIC_KEY_MATERIAL_FIELDS)
    for field_name in candidate_fields:
        if field_name and credential.material.get(field_name) not in {None, ""}:
            return str(credential.material[field_name]), {
                "key_material_mode": "runtime_public_key_ref",
                "signature_key_ref": signature_key_ref,
                "signature_key_material_field": field_name,
                "credential_snapshot": {
                    **credential.snapshot(),
                    "resolved": True,
                    "material_field_ref": field_name,
                },
            }
    raise PayrollProviderSignatureAdapterError(
        f"Payroll provider credential_ref {signature_key_ref} has no callback public key material."
    )


def _decode_provider_callback_signature(signature: str, *, encoding: str) -> bytes:
    normalized_encoding = str(encoding or "base64").strip().lower()
    signature_value = str(signature or "").strip()
    try:
        if normalized_encoding == "base64":
            return base64.b64decode(signature_value.encode("utf-8"), validate=True)
        if normalized_encoding == "hex":
            return bytes.fromhex(signature_value)
    except (ValueError, TypeError) as exc:
        raise PayrollProviderSignatureAdapterError("Provider callback signature could not be decoded.") from exc
    raise PayrollProviderSignatureAdapterError(f"Unsupported callback signature encoding: {encoding}.")


def _verify_provider_callback_rsa_sha256_signature(
    *,
    material: str,
    signature: str,
    policy: dict[str, Any],
    provider_ref: str,
) -> dict[str, Any]:
    signature_key_ref = str(policy.get("signature_key_ref") or "").strip()
    if not signature_key_ref:
        raise PayrollProviderSignatureAdapterError("RSA callback signatures require a public key ref.")
    public_key_pem, key_evidence = _provider_callback_runtime_public_key(
        signature_key_ref=signature_key_ref,
        provider_ref=provider_ref,
        policy=policy,
    )
    try:
        public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
    except ValueError as exc:
        raise PayrollProviderSignatureAdapterError("Provider callback public key material is not a valid PEM public key.") from exc

    signature_encoding = str(policy.get("signature_encoding") or "base64")
    signature_bytes = _decode_provider_callback_signature(signature, encoding=signature_encoding)
    try:
        public_key.verify(
            signature_bytes,
            material.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        signature_valid = True
    except InvalidSignature:
        signature_valid = False
    return {
        "algorithm_ref": PAYROLL_PROVIDER_CALLBACK_SIGNATURE_RSA_SHA256_ALGORITHM_REF,
        "signature_key_resolution_mode": "runtime",
        "signature_encoding": signature_encoding,
        "signature_valid": signature_valid,
        **key_evidence,
    }


def _compute_provider_callback_signature(
    *,
    material: str,
    policy: dict[str, Any],
    adapter_ref: str,
    provider_ref: str,
) -> tuple[str, dict[str, Any]]:
    algorithm_ref = str(policy.get("signature_algorithm_ref") or PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ALGORITHM_REF)
    digest_format = str(policy.get("signature_digest_format") or "hex")
    if digest_format != "hex":
        raise PayrollProviderSignatureAdapterError("Only hex callback signature digests are currently supported.")

    if adapter_ref == PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ADAPTER_REF:
        return hashlib.sha256(material.encode("utf-8")).hexdigest(), {
            "key_material_mode": "none",
            "algorithm_ref": PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ALGORITHM_REF,
        }
    if adapter_ref == PAYROLL_PROVIDER_CALLBACK_SIGNATURE_HMAC_SHA256_ADAPTER_REF:
        signature_key_ref = str(
            policy.get("signature_key_ref")
            or policy.get("secret_rotation_ref")
            or policy.get("callback_verification_ref")
            or ""
        ).strip()
        if not signature_key_ref:
            raise PayrollProviderSignatureAdapterError("HMAC callback signatures require a signature key ref.")
        key_resolution_mode = str(policy.get("signature_key_resolution_mode") or "reference").strip().lower()
        if policy.get("require_runtime_signature_key"):
            key_resolution_mode = "runtime"
        if key_resolution_mode == "runtime":
            signing_key, key_evidence = _provider_callback_runtime_signature_key(
                signature_key_ref=signature_key_ref,
                provider_ref=provider_ref,
                policy=policy,
            )
        else:
            signing_key = signature_key_ref
            key_evidence = {
                "key_material_mode": "reference_derived",
                "signature_key_ref": signature_key_ref,
            }
        digest = hmac.new(signing_key.encode("utf-8"), material.encode("utf-8"), hashlib.sha256).hexdigest()
        return digest, {
            "algorithm_ref": PAYROLL_PROVIDER_CALLBACK_SIGNATURE_HMAC_SHA256_ALGORITHM_REF,
            "signature_key_resolution_mode": key_resolution_mode,
            **key_evidence,
        }

    if algorithm_ref == PAYROLL_PROVIDER_CALLBACK_SIGNATURE_HMAC_SHA256_ALGORITHM_REF:
        raise PayrollProviderSignatureAdapterError(f"Unsupported HMAC callback signature adapter: {adapter_ref}.")
    raise PayrollProviderSignatureAdapterError(f"Unsupported callback signature adapter: {adapter_ref}.")


def verify_provider_callback_signature(
    delivery: PayrollProviderDelivery,
    *,
    idempotency_key: str,
    payload_checksum_sha256: str,
    signature: str,
) -> dict[str, Any]:
    policy = _provider_callback_security_policy(delivery)
    adapter_ref = _provider_callback_signature_adapter_ref(policy)
    material, material_fields, unknown_fields = _provider_callback_signature_material(
        delivery,
        idempotency_key=idempotency_key,
        payload_checksum_sha256=payload_checksum_sha256,
        policy=policy,
    )
    received_signature = str(signature or "")
    if adapter_ref == PAYROLL_PROVIDER_CALLBACK_SIGNATURE_RSA_SHA256_ADAPTER_REF:
        adapter_evidence = _verify_provider_callback_rsa_sha256_signature(
            material=material,
            signature=received_signature,
            policy=policy,
            provider_ref=delivery.provider_ref,
        )
        expected_signature = ""
        signature_valid = not unknown_fields and bool(adapter_evidence.get("signature_valid"))
    else:
        expected_signature, adapter_evidence = _compute_provider_callback_signature(
            material=material,
            policy=policy,
            adapter_ref=adapter_ref,
            provider_ref=delivery.provider_ref,
        )
        signature_valid = not unknown_fields and secrets.compare_digest(received_signature, expected_signature)
    return {
        "signature_profile_ref": PAYROLL_PROVIDER_CALLBACK_SIGNATURE_PROFILE_REF,
        "signature_algorithm_ref": adapter_evidence["algorithm_ref"],
        "signature_adapter_ref": adapter_ref,
        "callback_verification_ref": policy["callback_verification_ref"],
        "signature_material_fields": material_fields,
        "unknown_material_fields": unknown_fields,
        "signature_material_delimiter": str(policy.get("signature_material_delimiter") or ":"),
        "signature_material_hash_sha256": hashlib.sha256(material.encode("utf-8")).hexdigest(),
        "signature_encoding": adapter_evidence.get("signature_encoding", policy.get("signature_encoding", "hex")),
        "signature_digest_format": str(policy.get("signature_digest_format") or "hex"),
        "compare_mode": "constant_time",
        "expected_signature": expected_signature,
        "received_signature": received_signature,
        "signature_valid": signature_valid,
        "verification_mode": "provider_signature_adapter",
        **adapter_evidence,
    }


def expected_provider_callback_signature(
    delivery: PayrollProviderDelivery,
    *,
    idempotency_key: str,
    payload_checksum_sha256: str,
) -> str:
    policy = _provider_callback_security_policy(delivery)
    adapter_ref = _provider_callback_signature_adapter_ref(policy)
    if adapter_ref == PAYROLL_PROVIDER_CALLBACK_SIGNATURE_RSA_SHA256_ADAPTER_REF:
        raise PayrollProviderSignatureAdapterError("RSA callback signatures are verified with a public key and cannot produce an expected signature.")
    material, _, unknown_fields = _provider_callback_signature_material(
        delivery,
        idempotency_key=idempotency_key,
        payload_checksum_sha256=payload_checksum_sha256,
        policy=policy,
    )
    if unknown_fields:
        raise PayrollProviderSignatureAdapterError(f"Unknown callback signature material fields: {', '.join(unknown_fields)}.")
    expected_signature, _ = _compute_provider_callback_signature(
        material=material,
        policy=policy,
        adapter_ref=adapter_ref,
        provider_ref=delivery.provider_ref,
    )
    return expected_signature


def _coerce_callback_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str) and value.strip():
        parsed = parse_datetime(value.strip())
    else:
        parsed = None
    if not parsed:
        return None
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _callback_security_gate(ref: str, passed: bool, **evidence: Any) -> dict[str, Any]:
    return {"ref": ref, "passed": bool(passed), **evidence}


def _provider_callback_security_policy(delivery: PayrollProviderDelivery) -> dict[str, Any]:
    config = delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}
    contract = config.get("submission_contract") if isinstance(config.get("submission_contract"), dict) else {}
    policy = contract.get("callback_security_policy") if isinstance(contract.get("callback_security_policy"), dict) else {}
    callback_verification_ref = contract.get("callback_verification_ref") or "payroll.callback.verification.manual.v1"
    return {
        "security_policy_ref": policy.get("security_policy_ref") or "payroll.callback.security.standard.v1",
        "enforcement_mode": policy.get("enforcement_mode") or "warn",
        "signature_algorithm_ref": policy.get("signature_algorithm_ref") or PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ALGORITHM_REF,
        "signature_adapter_ref": policy.get("signature_adapter_ref") or "",
        "signature_material_fields": (
            [str(item) for item in policy["signature_material_fields"] if str(item or "").strip()]
            if isinstance(policy.get("signature_material_fields"), list)
            else list(DEFAULT_PROVIDER_CALLBACK_SIGNATURE_MATERIAL_FIELDS)
        ),
        "signature_material_delimiter": str(policy.get("signature_material_delimiter") or ":"),
        "signature_key_ref": str(policy.get("signature_key_ref") or ""),
        "signature_key_resolution_mode": str(policy.get("signature_key_resolution_mode") or "reference"),
        "signature_key_material_field": str(policy.get("signature_key_material_field") or ""),
        "require_runtime_signature_key": bool(policy.get("require_runtime_signature_key", False)),
        "signature_encoding": str(policy.get("signature_encoding") or "hex"),
        "signature_digest_format": str(policy.get("signature_digest_format") or "hex"),
        "callback_verification_ref": callback_verification_ref,
        "secret_rotation_ref": policy.get("secret_rotation_ref") or "payroll.callback.secret_rotation.configured.v1",
        "replay_window_seconds": _positive_int(policy.get("replay_window_seconds"), 900),
        "timestamp_required": bool(policy.get("timestamp_required", False)),
        "source_ip_required": bool(policy.get("source_ip_required", False)),
        "allowed_ip_refs": policy.get("allowed_ip_refs") if isinstance(policy.get("allowed_ip_refs"), list) else [],
        "allowed_source_ips": policy.get("allowed_source_ips") if isinstance(policy.get("allowed_source_ips"), list) else [],
        "rate_limit_policy_ref": policy.get("rate_limit_policy_ref") or "payroll.callback.rate_limit.standard.v1",
        "rate_limit_window_seconds": _positive_int(policy.get("rate_limit_window_seconds"), 60),
        "rate_limit_max_events": _positive_int(policy.get("rate_limit_max_events"), 60),
    }


def _validate_provider_callback_security(
    *,
    delivery: PayrollProviderDelivery,
    signature_valid: bool,
    signature_verification: dict[str, Any] | None = None,
    source_ip: str,
    received_at: datetime,
    event_timestamp: datetime | None,
    idempotency_key: str,
) -> dict[str, Any]:
    policy = _provider_callback_security_policy(delivery)
    allowed_source_ips = [str(item) for item in policy.get("allowed_source_ips", []) if str(item or "").strip()]
    allowed_ip_refs = [str(item) for item in policy.get("allowed_ip_refs", []) if str(item or "").strip()]
    replay_window_seconds = _positive_int(policy.get("replay_window_seconds"), 900)
    event_age_seconds = abs((received_at - event_timestamp).total_seconds()) if event_timestamp else None
    rate_limit_window_seconds = _positive_int(policy.get("rate_limit_window_seconds"), 60)
    rate_limit_max_events = _positive_int(policy.get("rate_limit_max_events"), 60)
    observed_events = PayrollProviderCallbackEvent.objects.filter(
        tenant=delivery.tenant,
        provider_ref=delivery.provider_ref,
        received_at__gte=received_at - timedelta(seconds=rate_limit_window_seconds),
    ).count()
    source_ip = str(source_ip or "").strip()
    source_ip_configured = bool(allowed_source_ips or allowed_ip_refs)
    source_ip_passed = True
    source_ip_mode = "not_configured"
    if allowed_source_ips:
        source_ip_passed = source_ip in allowed_source_ips
        source_ip_mode = "literal_allowlist"
    elif allowed_ip_refs:
        source_ip_passed = bool(source_ip) or not policy.get("source_ip_required")
        source_ip_mode = "referenced_policy"
    elif policy.get("source_ip_required"):
        source_ip_passed = bool(source_ip)
        source_ip_mode = "required"

    timestamp_passed = True
    timestamp_mode = "not_required"
    if event_timestamp:
        timestamp_passed = bool(event_age_seconds is not None and event_age_seconds <= replay_window_seconds)
        timestamp_mode = "bounded"
    elif policy.get("timestamp_required"):
        timestamp_passed = False
        timestamp_mode = "required"

    gates = [
        _callback_security_gate(
            "callback_signature_matched",
            signature_valid,
            algorithm_ref=(signature_verification or {}).get("signature_algorithm_ref", policy["signature_algorithm_ref"]),
            adapter_ref=(signature_verification or {}).get("signature_adapter_ref", _provider_callback_signature_adapter_ref(policy)),
            callback_verification_ref=policy["callback_verification_ref"],
            signature_material_fields=(signature_verification or {}).get("signature_material_fields", policy["signature_material_fields"]),
            signature_material_hash_sha256=(signature_verification or {}).get("signature_material_hash_sha256", ""),
            unknown_material_fields=(signature_verification or {}).get("unknown_material_fields", []),
        ),
        _callback_security_gate(
            "callback_secret_rotation_ref",
            bool(policy.get("secret_rotation_ref")),
            secret_rotation_ref=policy.get("secret_rotation_ref", ""),
        ),
        _callback_security_gate(
            "callback_replay_window",
            timestamp_passed,
            mode=timestamp_mode,
            replay_window_seconds=replay_window_seconds,
            event_timestamp=event_timestamp.isoformat() if event_timestamp else "",
            event_age_seconds=event_age_seconds,
        ),
        _callback_security_gate(
            "callback_source_policy",
            source_ip_passed,
            mode=source_ip_mode,
            source_ip=source_ip,
            allowed_ip_refs=allowed_ip_refs,
            literal_allowlist_configured=bool(allowed_source_ips),
            configured=source_ip_configured,
        ),
        _callback_security_gate(
            "callback_rate_limit",
            observed_events < rate_limit_max_events,
            rate_limit_policy_ref=policy["rate_limit_policy_ref"],
            window_seconds=rate_limit_window_seconds,
            max_events=rate_limit_max_events,
            observed_events=observed_events,
        ),
        _callback_security_gate(
            "callback_idempotency_replay_guard",
            not PayrollProviderCallbackEvent.objects.filter(provider_ref=delivery.provider_ref, idempotency_key=idempotency_key).exists(),
            idempotency_key=idempotency_key,
        ),
    ]
    blocking_gate_refs = [gate["ref"] for gate in gates if not gate["passed"]]
    return {
        "security_policy_ref": policy["security_policy_ref"],
        "enforcement_mode": policy["enforcement_mode"],
        "received_at": received_at.isoformat(),
        "source_ip": source_ip,
        "passed": not blocking_gate_refs,
        "blocking_gate_refs": blocking_gate_refs,
        "gates": gates,
    }


def _find_provider_callback_delivery(
    *,
    provider_ref: str,
    external_reference: str = "",
    provider_delivery_id: str = "",
) -> PayrollProviderDelivery:
    deliveries = PayrollProviderDelivery.objects.select_related("handoff", "output_artifact").filter(provider_ref=provider_ref)
    if provider_delivery_id:
        deliveries = deliveries.filter(id=provider_delivery_id)
    elif external_reference:
        deliveries = deliveries.filter(external_reference=external_reference)
    else:
        raise PayrollProviderCallbackError("Provider callbacks require a delivery id or external reference.")
    delivery = deliveries.first()
    if not delivery:
        raise PayrollProviderCallbackError("Provider callback delivery was not found.")
    return delivery


def ingest_payroll_provider_callback(
    *,
    provider_ref: str,
    idempotency_key: str,
    provider_status: str,
    payload_snapshot: dict[str, Any],
    signature: str,
    external_reference: str = "",
    external_event_id: str = "",
    provider_delivery_id: str = "",
    source_ip: str = "",
    event_timestamp: datetime | str | None = None,
) -> tuple[PayrollProviderCallbackEvent, bool]:
    """Verify and record a provider callback, then update the matching delivery."""

    idempotency_key = str(idempotency_key or "").strip()
    provider_ref = str(provider_ref or "").strip()
    if not provider_ref or not idempotency_key:
        raise PayrollProviderCallbackError("Provider callbacks require provider ref and idempotency key.")
    if provider_status not in {
        PayrollProviderDeliveryStatus.ACKNOWLEDGED,
        PayrollProviderDeliveryStatus.RECONCILED,
        PayrollProviderDeliveryStatus.REJECTED,
        PayrollProviderDeliveryStatus.FAILED,
    }:
        raise PayrollProviderCallbackError("Unsupported provider callback status.")

    existing = PayrollProviderCallbackEvent.objects.filter(provider_ref=provider_ref, idempotency_key=idempotency_key).first()
    if existing:
        return existing, True

    payload_snapshot = payload_snapshot if isinstance(payload_snapshot, dict) else {}
    payload_checksum = _json_checksum(payload_snapshot)
    delivery = _find_provider_callback_delivery(
        provider_ref=provider_ref,
        external_reference=external_reference,
        provider_delivery_id=provider_delivery_id,
    )
    delivery_config = delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}
    submission_contract = delivery_config.get("submission_contract") if isinstance(delivery_config.get("submission_contract"), dict) else {}
    callback_profile_ref = str(submission_contract.get("callback_profile_ref") or "payroll.callback.manual.v1")
    callback_verification_ref = str(submission_contract.get("callback_verification_ref") or "payroll.callback.verification.manual.v1")
    try:
        signature_verification = verify_provider_callback_signature(
            delivery,
            idempotency_key=idempotency_key,
            payload_checksum_sha256=payload_checksum,
            signature=signature,
        )
    except PayrollProviderSignatureAdapterError as exc:
        signature_verification = {
            "signature_profile_ref": PAYROLL_PROVIDER_CALLBACK_SIGNATURE_PROFILE_REF,
            "signature_algorithm_ref": PAYROLL_PROVIDER_CALLBACK_SIGNATURE_SHA256_ALGORITHM_REF,
            "signature_adapter_ref": "",
            "callback_verification_ref": callback_verification_ref,
            "expected_signature": "",
            "received_signature": str(signature or ""),
            "signature_valid": False,
            "verification_mode": "provider_signature_adapter",
            "failure_code": "signature_adapter_failed",
            "failure_reason": str(exc),
        }
    expected_signature = str(signature_verification.get("expected_signature", ""))
    signature_valid = bool(signature_verification.get("signature_valid"))
    received_at = timezone.now()
    callback_event_timestamp = _coerce_callback_datetime(event_timestamp) or _coerce_callback_datetime(payload_snapshot.get("event_timestamp")) or _coerce_callback_datetime(payload_snapshot.get("sent_at"))
    security_snapshot = _validate_provider_callback_security(
        delivery=delivery,
        signature_valid=signature_valid,
        signature_verification=signature_verification,
        source_ip=source_ip,
        received_at=received_at,
        event_timestamp=callback_event_timestamp,
        idempotency_key=idempotency_key,
    )
    security_blocked = security_snapshot["enforcement_mode"] == "strict" and not security_snapshot["passed"]
    accepted = signature_valid and not security_blocked

    with transaction.atomic():
        event = PayrollProviderCallbackEvent.objects.create(
            tenant=delivery.tenant,
            provider_delivery=delivery,
            handoff=delivery.handoff,
            output_artifact=delivery.output_artifact,
            provider_ref=provider_ref,
            external_reference=external_reference or delivery.external_reference,
            external_event_id=external_event_id,
            idempotency_key=idempotency_key,
            callback_profile_ref=callback_profile_ref,
            callback_verification_ref=callback_verification_ref,
            status=PayrollProviderCallbackEventStatus.RECEIVED if accepted else PayrollProviderCallbackEventStatus.REJECTED,
            provider_status=provider_status,
            payload_checksum_sha256=payload_checksum,
            signature=signature,
            verification_snapshot={
                "callback_profile_ref": callback_profile_ref,
                "callback_verification_ref": callback_verification_ref,
                "expected_signature": expected_signature,
                "signature_valid": signature_valid,
                "verification_mode": signature_verification.get("verification_mode", "provider_signature_adapter"),
                "signature_adapter": signature_verification,
                "callback_security": security_snapshot,
                "received_at": received_at.isoformat(),
            },
            payload_snapshot=payload_snapshot,
            failure_code="" if accepted else ("signature_verification_failed" if not signature_valid else "callback_security_policy_failed"),
            failure_reason="" if accepted else (
                "Provider callback signature did not match the delivery contract."
                if not signature_valid
                else "Provider callback failed the configured webhook security policy."
            ),
            received_at=received_at,
        )
        if not accepted:
            return event, False

        delivery.status = provider_status
        if provider_status in {PayrollProviderDeliveryStatus.ACKNOWLEDGED, PayrollProviderDeliveryStatus.RECONCILED}:
            delivery.acknowledged_at = received_at
        if provider_status == PayrollProviderDeliveryStatus.RECONCILED:
            delivery.reconciled_at = received_at
        if provider_status in {PayrollProviderDeliveryStatus.REJECTED, PayrollProviderDeliveryStatus.FAILED}:
            delivery.failure_code = str(payload_snapshot.get("failure_code") or "provider_callback_failure")
            delivery.failure_reason = str(payload_snapshot.get("failure_reason") or "Provider callback reported a failed delivery.")
        else:
            delivery.failure_code = ""
            delivery.failure_reason = ""

        delivery.response_snapshot = {
            **(delivery.response_snapshot if isinstance(delivery.response_snapshot, dict) else {}),
            "provider_status": provider_status,
            "external_reference": delivery.external_reference,
            "external_event_id": external_event_id,
            "callback_profile_ref": callback_profile_ref,
            "callback_verification_ref": callback_verification_ref,
            "payload_checksum_sha256": payload_checksum,
            "callback_security": security_snapshot,
            "received_at": received_at.isoformat(),
            "payload": payload_snapshot,
        }
        certification_evidence = delivery_config.get("certification_evidence") if isinstance(delivery_config.get("certification_evidence"), dict) else {}
        certification_evidence = {
            **certification_evidence,
            "status": "recorded" if provider_status == PayrollProviderDeliveryStatus.RECONCILED and submission_contract.get("certification_required") else certification_evidence.get("status", "not_required"),
            "recorded_at": received_at.isoformat() if provider_status == PayrollProviderDeliveryStatus.RECONCILED and submission_contract.get("certification_required") else certification_evidence.get("recorded_at", ""),
            "external_reference": delivery.external_reference,
            "provider_status": provider_status,
            "evidence_refs": payload_snapshot.get("certification_evidence_refs", certification_evidence.get("evidence_refs", [])),
        }
        delivery.config_snapshot = {**delivery_config, "certification_evidence": certification_evidence}
        if provider_status == PayrollProviderDeliveryStatus.RECONCILED:
            delivery.reconciliation_snapshot = {
                "callback_event_id": str(event.id),
                "callback_profile_ref": callback_profile_ref,
                "callback_verification_ref": callback_verification_ref,
                "certification_profile_ref": submission_contract.get("certification_profile_ref", ""),
                "checksum_matched": delivery.payload_checksum_sha256 == delivery.output_artifact.checksum_sha256,
                "payload_checksum_sha256": delivery.payload_checksum_sha256,
                "artifact_checksum_sha256": delivery.output_artifact.checksum_sha256,
                "callback_payload_checksum_sha256": payload_checksum,
                "file_size_bytes": delivery.output_artifact.file_size_bytes,
                "line_count": len(delivery.output_artifact.line_snapshot) if isinstance(delivery.output_artifact.line_snapshot, list) else 0,
                "reconciled_at": received_at.isoformat(),
            }
        delivery.save()

        handoff = _sync_finance_handoff_summary(delivery.handoff)
        if provider_status in {PayrollProviderDeliveryStatus.REJECTED, PayrollProviderDeliveryStatus.FAILED}:
            handoff.status = PayrollFinanceHandoffStatus.FAILED
        elif provider_status == PayrollProviderDeliveryStatus.RECONCILED and not PayrollProviderDelivery.objects.filter(
            handoff=handoff,
            status__in=[
                PayrollProviderDeliveryStatus.QUEUED,
                PayrollProviderDeliveryStatus.SUBMITTED,
                PayrollProviderDeliveryStatus.ACKNOWLEDGED,
                PayrollProviderDeliveryStatus.REJECTED,
                PayrollProviderDeliveryStatus.FAILED,
            ],
        ).exists():
            handoff.status = PayrollFinanceHandoffStatus.ACCEPTED
            handoff.accepted_at = received_at
        handoff.save()
        event.status = PayrollProviderCallbackEventStatus.PROCESSED
        event.processed_at = received_at
        event.processing_snapshot = {
            "delivery_id": str(delivery.id),
            "handoff_id": str(handoff.id),
            "delivery_status": delivery.status,
            "handoff_status": handoff.status,
            "processed_at": received_at.isoformat(),
        }
        event.save()
    return event, False


def _ensure_provider_delivery(
    *,
    handoff: PayrollFinanceHandoff,
    artifact: PayrollOutputArtifact,
    submitted_by=None,
) -> PayrollProviderDelivery:
    profile = _finance_handoff_profile(handoff.output_batch)
    route = _provider_delivery_route(profile, artifact)
    request_snapshot = _provider_delivery_request_snapshot(handoff=handoff, artifact=artifact, route=route)
    submission_contract = request_snapshot["submission_contract"]
    external_reference = f"{handoff.payroll_run.code}-{artifact.kind}-{artifact.id}"
    delivery, created = PayrollProviderDelivery.objects.get_or_create(
        handoff=handoff,
        output_artifact=artifact,
        provider_ref=route["provider_ref"],
        defaults={
            "tenant": handoff.tenant,
            "output_batch": handoff.output_batch,
            "payroll_run": handoff.payroll_run,
            "review": handoff.review,
            "artifact_kind": artifact.kind,
            "status": PayrollProviderDeliveryStatus.SUBMITTED,
            "channel_ref": route["channel_ref"],
            "external_reference": external_reference,
            "retry_policy_ref": route["retry_policy_ref"],
            "attempt_count": 1,
            "submitted_by": submitted_by,
            "payload_checksum_sha256": artifact.checksum_sha256,
            "request_snapshot": request_snapshot,
            "config_snapshot": {
                "provider_route": route,
                "submission_contract": submission_contract,
                "certification_evidence": _provider_certification_evidence(submission_contract),
                "handoff_profile_ref": handoff.handoff_profile_ref,
                "source_output_profile_ref": handoff.output_batch.output_profile_ref,
            },
        },
    )
    if created or delivery.status == PayrollProviderDeliveryStatus.RECONCILED:
        return delivery
    if delivery.status in {PayrollProviderDeliveryStatus.FAILED, PayrollProviderDeliveryStatus.REJECTED}:
        delivery.attempt_count += 1
    delivery.status = PayrollProviderDeliveryStatus.SUBMITTED
    delivery.submitted_by = submitted_by or delivery.submitted_by
    delivery.failure_code = ""
    delivery.failure_reason = ""
    delivery.request_snapshot = request_snapshot
    delivery.config_snapshot = {
        **(delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}),
        "provider_route": route,
        "submission_contract": submission_contract,
        "certification_evidence": _provider_certification_evidence(submission_contract),
        "handoff_profile_ref": handoff.handoff_profile_ref,
        "source_output_profile_ref": handoff.output_batch.output_profile_ref,
    }
    delivery.save()
    return delivery


def _failure_result_from_provider_adapter_error(
    delivery: PayrollProviderDelivery,
    exc: PayrollProviderAdapterError,
) -> PayrollProviderSubmissionResult:
    return PayrollProviderSubmissionResult(
        provider_status=PayrollProviderDeliveryStatus.FAILED,
        external_reference=delivery.external_reference,
        provider_batch_ref="",
        response_snapshot={
            "adapter_error": {
                "code": exc.code,
                "message": str(exc),
                "provider_ref": exc.provider_ref or delivery.provider_ref,
                "retryable": exc.retryable,
            },
        },
        certification_evidence_refs=[],
        failure_code=exc.code,
        failure_reason=str(exc),
        retryable=exc.retryable,
    )


def _apply_provider_submission_result(
    delivery: PayrollProviderDelivery,
    *,
    request_snapshot: dict[str, Any],
    result: PayrollProviderSubmissionResult,
    submitted_by=None,
    retry_event: PayrollProviderRetryEvent | None = None,
) -> PayrollProviderDelivery:
    provider_status = result.provider_status
    if provider_status not in {
        PayrollProviderDeliveryStatus.SUBMITTED,
        PayrollProviderDeliveryStatus.ACKNOWLEDGED,
        PayrollProviderDeliveryStatus.RECONCILED,
        PayrollProviderDeliveryStatus.REJECTED,
        PayrollProviderDeliveryStatus.FAILED,
    }:
        raise PayrollFinanceHandoffError("Payroll provider adapter returned an unsupported delivery status.")

    now = timezone.now()
    delivery_config = delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}
    submission_contract = delivery_config.get("submission_contract") if isinstance(delivery_config.get("submission_contract"), dict) else {}
    adapter_submission = {
        "request": request_snapshot,
        "result": result.snapshot(),
        "submitted_at": now.isoformat(),
    }
    if retry_event is not None:
        adapter_submission["retry_event_id"] = str(retry_event.id)
        adapter_submission["retry_attempt_number"] = retry_event.attempt_number

    delivery.status = provider_status
    delivery.external_reference = result.external_reference or delivery.external_reference
    delivery.submitted_at = now
    delivery.submitted_by = submitted_by or delivery.submitted_by
    if provider_status in {PayrollProviderDeliveryStatus.ACKNOWLEDGED, PayrollProviderDeliveryStatus.RECONCILED}:
        delivery.acknowledged_at = now
        delivery.acknowledged_by = submitted_by or delivery.acknowledged_by
    else:
        delivery.acknowledged_at = None
        delivery.acknowledged_by = None
    if provider_status == PayrollProviderDeliveryStatus.RECONCILED:
        delivery.reconciled_at = now
        delivery.reconciled_by = submitted_by or delivery.reconciled_by
    else:
        delivery.reconciled_at = None
        delivery.reconciled_by = None
    if provider_status in {PayrollProviderDeliveryStatus.REJECTED, PayrollProviderDeliveryStatus.FAILED}:
        delivery.failure_code = result.failure_code or "provider_adapter_failure"
        delivery.failure_reason = result.failure_reason or "Provider adapter returned a failed delivery status."
    else:
        delivery.failure_code = ""
        delivery.failure_reason = ""

    delivery.request_snapshot = {
        **(delivery.request_snapshot if isinstance(delivery.request_snapshot, dict) else {}),
        "provider_submission_request": request_snapshot,
    }
    delivery.response_snapshot = {
        **(delivery.response_snapshot if isinstance(delivery.response_snapshot, dict) else {}),
        "provider_status": provider_status,
        "external_reference": delivery.external_reference,
        "provider_batch_ref": result.provider_batch_ref,
        "adapter_submission": adapter_submission,
        **result.response_snapshot,
    }

    certification_evidence = delivery_config.get("certification_evidence") if isinstance(delivery_config.get("certification_evidence"), dict) else {}
    certification_evidence = {
        **certification_evidence,
        "status": "recorded" if provider_status == PayrollProviderDeliveryStatus.RECONCILED and submission_contract.get("certification_required") else certification_evidence.get("status", "not_required"),
        "recorded_at": now.isoformat() if provider_status == PayrollProviderDeliveryStatus.RECONCILED and submission_contract.get("certification_required") else certification_evidence.get("recorded_at", ""),
        "external_reference": delivery.external_reference,
        "provider_status": provider_status,
        "evidence_refs": result.certification_evidence_refs or certification_evidence.get("evidence_refs", []),
    }
    delivery.config_snapshot = {
        **delivery_config,
        "credential_snapshot": request_snapshot.get("credential_snapshot", {}),
        "certification_evidence": certification_evidence,
    }

    if provider_status == PayrollProviderDeliveryStatus.RECONCILED:
        delivery.reconciliation_snapshot = {
            "adapter_submission": adapter_submission,
            "callback_profile_ref": submission_contract.get("callback_profile_ref", ""),
            "callback_verification_ref": submission_contract.get("callback_verification_ref", ""),
            "certification_profile_ref": submission_contract.get("certification_profile_ref", ""),
            "checksum_matched": delivery.payload_checksum_sha256 == delivery.output_artifact.checksum_sha256,
            "payload_checksum_sha256": delivery.payload_checksum_sha256,
            "artifact_checksum_sha256": delivery.output_artifact.checksum_sha256,
            "file_size_bytes": delivery.output_artifact.file_size_bytes,
            "line_count": len(delivery.output_artifact.line_snapshot) if isinstance(delivery.output_artifact.line_snapshot, list) else 0,
            "reconciled_at": now.isoformat(),
        }
    delivery.save()

    handoff = _sync_finance_handoff_summary(delivery.handoff)
    if provider_status in {PayrollProviderDeliveryStatus.REJECTED, PayrollProviderDeliveryStatus.FAILED}:
        handoff.status = PayrollFinanceHandoffStatus.FAILED
    elif provider_status == PayrollProviderDeliveryStatus.RECONCILED and not PayrollProviderDelivery.objects.filter(
        handoff=handoff,
        status__in=[
            PayrollProviderDeliveryStatus.QUEUED,
            PayrollProviderDeliveryStatus.SUBMITTED,
            PayrollProviderDeliveryStatus.ACKNOWLEDGED,
            PayrollProviderDeliveryStatus.REJECTED,
            PayrollProviderDeliveryStatus.FAILED,
        ],
    ).exists():
        handoff.status = PayrollFinanceHandoffStatus.ACCEPTED
        handoff.accepted_at = now
        handoff.accepted_by = submitted_by or handoff.accepted_by
    elif handoff.status == PayrollFinanceHandoffStatus.FAILED and provider_status == PayrollProviderDeliveryStatus.SUBMITTED:
        handoff.status = PayrollFinanceHandoffStatus.TRANSMITTED
    handoff.save()
    return delivery


def submit_payroll_provider_delivery(
    delivery: PayrollProviderDelivery,
    *,
    submitted_by=None,
    retry_event: PayrollProviderRetryEvent | None = None,
) -> PayrollProviderDelivery:
    """Submit a provider delivery through the configured adapter boundary."""

    request_contract_validation: dict[str, Any] = {}
    result_contract_validation: dict[str, Any] = {}
    schema_mapping_validation: dict[str, Any] = {}
    try:
        request = normalize_payroll_provider_submission_request(delivery)
        request_snapshot = request.snapshot()
        mapping_contract = request.route_snapshot.get("schema_mapping") if isinstance(request.route_snapshot.get("schema_mapping"), dict) else {}
        schema_mapping_validation = apply_payroll_provider_schema_mapping(
            request_snapshot=request_snapshot,
            mapping_contract=mapping_contract,
        )
        if schema_mapping_validation.get("status") == "blocked" and schema_mapping_validation.get("enforcement_mode") == "strict":
            raise PayrollProviderAdapterError(
                "Payroll provider schema mapping failed strict validation: "
                + ", ".join(schema_mapping_validation.get("blocking_gate_refs", [])),
                code="provider_schema_mapping_failed",
                provider_ref=request.provider_ref,
                retryable=False,
            )
        request = PayrollProviderSubmissionRequest(
            **{
                **request.__dict__,
                "route_snapshot": {
                    **request.route_snapshot,
                    "schema_mapping": {
                        **mapping_contract,
                        "validation": {
                            key: value
                            for key, value in schema_mapping_validation.items()
                            if key != "provider_payload"
                        },
                    },
                    "provider_payload": schema_mapping_validation.get("provider_payload", {}),
                },
            }
        )
        request_contract_validation = validate_payroll_provider_adapter_request_contract(request)
        adapter = get_payroll_provider_adapter(request.adapter_ref)
        result = adapter.submit(request)
        result_contract_validation = validate_payroll_provider_adapter_result_contract(request, result)
        request_snapshot = {
            **request.snapshot(),
            "schema_mapping": schema_mapping_validation,
            "adapter_contract_validation": {
                "request": request_contract_validation,
                "result": result_contract_validation,
            },
        }
    except PayrollProviderAdapterError as exc:
        request_snapshot = {
            "delivery_id": str(delivery.id),
            "provider_ref": delivery.provider_ref,
            "schema_mapping": schema_mapping_validation,
            "adapter_contract_validation": {
                "request": request_contract_validation,
                "result": result_contract_validation,
            },
            "adapter_error": {
                "code": exc.code,
                "message": str(exc),
                "provider_ref": exc.provider_ref or delivery.provider_ref,
                "retryable": exc.retryable,
            },
        }
        result = _failure_result_from_provider_adapter_error(delivery, exc)
    with transaction.atomic():
        return _apply_provider_submission_result(
            delivery,
            request_snapshot=request_snapshot,
            result=result,
            submitted_by=submitted_by,
            retry_event=retry_event,
        )


def _delivery_needs_provider_adapter_submission(delivery: PayrollProviderDelivery) -> bool:
    response_snapshot = delivery.response_snapshot if isinstance(delivery.response_snapshot, dict) else {}
    return delivery.status == PayrollProviderDeliveryStatus.SUBMITTED and not isinstance(response_snapshot.get("adapter_submission"), dict)


def generate_payroll_finance_handoff(
    batch: PayrollOutputBatch,
    *,
    generated_by=None,
    handoff_profile_ref: str | None = None,
) -> PayrollFinanceHandoff:
    """Generate finance handoff artifacts for a published payroll output batch."""

    if batch.status != PayrollOutputBatchStatus.PUBLISHED:
        raise PayrollFinanceHandoffError("Payroll finance handoff requires a published payroll output batch.")

    profile = _finance_handoff_profile(batch)
    profile_ref = handoff_profile_ref or profile.get("handoff_profile_ref") or "payroll.finance_handoff.profile.default.v1"
    existing = PayrollFinanceHandoff.objects.filter(output_batch=batch, handoff_profile_ref=profile_ref).first()
    if existing:
        return _sync_finance_handoff_summary(existing)

    bank_profile_ref = profile.get("bank_file_profile_ref") or "payroll.bank_file.profile.default.v1"
    accounting_profile_ref = profile.get("accounting_export_profile_ref") or "payroll.accounting_export.profile.default.v1"
    statutory_pack_ref = profile.get("statutory_pack_ref") or "payroll.statutory_pack.default.v1"
    artifact_key_prefix = profile.get("artifact_key_prefix") or f"{batch.payroll_run.code}-{profile_ref}"
    bank_file_name = f"{batch.payroll_run.code}-bank-advice.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.BANK_ADVICE, profile))}"
    accounting_file_name = f"{batch.payroll_run.code}-accounting-export.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.ACCOUNTING_EXPORT, profile))}"
    statutory_file_name = f"{batch.payroll_run.code}-statutory-summary.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.STATUTORY_REPORT, profile))}"

    payslips = list(
        batch.artifacts.filter(
            kind=PayrollOutputArtifactKind.PAYSLIP,
            status=PayrollOutputArtifactStatus.PUBLISHED,
        ).select_related("employee", "input_snapshot").order_by("employee__employee_code")
    )
    if not payslips:
        raise PayrollFinanceHandoffError("Payroll finance handoff requires published payslip artifacts.")

    bank_rows = []
    accounting_rows = []
    statutory_rows = []
    bank_total = Decimal("0.00")
    accounting_gross = Decimal("0.00")
    accounting_deductions = Decimal("0.00")
    accounting_net = Decimal("0.00")
    statutory_total = Decimal("0.00")

    for payslip in payslips:
        totals = payslip.totals_snapshot if isinstance(payslip.totals_snapshot, dict) else {}
        net_pay = _money_from_payload(totals.get("net_pay"))
        gross_earnings = _money_from_payload(totals.get("gross_earnings"))
        deductions = _money_from_payload(totals.get("employee_deductions"))
        banking = payslip.input_snapshot.banking_snapshot if payslip.input_snapshot_id and isinstance(payslip.input_snapshot.banking_snapshot, dict) else {}
        bank_rows.append({
            "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
            "employee_name": _payslip_employee_name(payslip),
            "net_pay": str(net_pay),
            "currency_code": totals.get("currency_code") or batch.payroll_run.period.calendar.currency_code,
            "banking_snapshot": banking,
            "source_artifact_id": str(payslip.id),
            "source_hash": payslip.source_hash,
        })
        accounting_rows.extend([
            {
                "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
                "line_type": "earning",
                "amount": str(gross_earnings),
                "source_artifact_id": str(payslip.id),
                "source_hash": payslip.source_hash,
            },
            {
                "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
                "line_type": "deduction",
                "amount": str(deductions),
                "source_artifact_id": str(payslip.id),
                "source_hash": payslip.source_hash,
            },
            {
                "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
                "line_type": "net_pay",
                "amount": str(net_pay),
                "source_artifact_id": str(payslip.id),
                "source_hash": payslip.source_hash,
            },
        ])
        for line in payslip.line_snapshot if isinstance(payslip.line_snapshot, list) else []:
            line_type = _normalized_key(line.get("line_type", ""))
            if line_type in {"deduction", "tax", "employer_contribution"}:
                amount = _money_from_payload(line.get("amount"))
                line_config = line.get("config_snapshot") if isinstance(line.get("config_snapshot"), dict) else {}
                statutory_total += amount
                statutory_rows.append({
                    "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
                    "component_code": line.get("component_code", ""),
                    "component_name": line.get("component_name", ""),
                    "line_type": line.get("line_type", ""),
                    "amount": str(amount),
                    "statutory_pack_id": line_config.get("statutory_pack_id", ""),
                    "statutory_pack_code": line_config.get("statutory_pack_code", ""),
                    "statutory_component_id": line_config.get("statutory_component_id", ""),
                    "statutory_component_code": line_config.get("statutory_component_code", ""),
                    "statutory_type": line_config.get("statutory_type", ""),
                    "statutory_treatment_ref": line_config.get("statutory_treatment_ref", ""),
                    "source_line_id": line.get("line_id", ""),
                    "source_hash": line.get("source_hash") or payslip.source_hash,
                    "config_snapshot": line_config,
                })
        bank_total += net_pay
        accounting_gross += gross_earnings
        accounting_deductions += deductions
        accounting_net += net_pay

    with transaction.atomic():
        handoff = PayrollFinanceHandoff.objects.create(
            tenant=batch.tenant,
            output_batch=batch,
            payroll_run=batch.payroll_run,
            review=batch.review,
            status=PayrollFinanceHandoffStatus.GENERATED,
            handoff_profile_ref=profile_ref,
            bank_file_profile_ref=bank_profile_ref,
            accounting_export_profile_ref=accounting_profile_ref,
            statutory_pack_ref=statutory_pack_ref,
            generated_by=generated_by,
            totals_snapshot={
                "gross_earnings": str(accounting_gross),
                "employee_deductions": str(accounting_deductions),
                "net_pay": str(accounting_net),
                "bank_advice_total": str(bank_total),
                "statutory_total": str(statutory_total),
                "employee_count": len(payslips),
            },
            config_snapshot={
                "finance_handoff_profile": profile,
                "source_output_batch_id": str(batch.id),
                "source_output_profile_ref": batch.output_profile_ref,
            },
        )
        _finance_artifact(
            batch=batch,
            kind=PayrollOutputArtifactKind.BANK_ADVICE,
            artifact_key=f"{artifact_key_prefix}-bank-advice",
            title=f"{batch.payroll_run.name} Bank Advice",
            file_name=bank_file_name,
            output_profile_ref=bank_profile_ref,
            totals_snapshot={"net_pay": str(bank_total), "employee_count": len(bank_rows)},
            line_snapshot=bank_rows,
            generated_by=generated_by,
            config_snapshot={"handoff_id": str(handoff.id), "handoff_profile_ref": profile_ref},
        )
        _finance_artifact(
            batch=batch,
            kind=PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
            artifact_key=f"{artifact_key_prefix}-accounting-export",
            title=f"{batch.payroll_run.name} Accounting Export",
            file_name=accounting_file_name,
            output_profile_ref=accounting_profile_ref,
            totals_snapshot={
                "gross_earnings": str(accounting_gross),
                "employee_deductions": str(accounting_deductions),
                "net_pay": str(accounting_net),
                "employee_count": len(payslips),
            },
            line_snapshot=accounting_rows,
            generated_by=generated_by,
            config_snapshot={"handoff_id": str(handoff.id), "handoff_profile_ref": profile_ref},
        )
        _finance_artifact(
            batch=batch,
            kind=PayrollOutputArtifactKind.STATUTORY_REPORT,
            artifact_key=f"{artifact_key_prefix}-statutory-report",
            title=f"{batch.payroll_run.name} Statutory Summary",
            file_name=statutory_file_name,
            output_profile_ref=statutory_pack_ref,
            totals_snapshot={"statutory_total": str(statutory_total), "line_count": len(statutory_rows)},
            line_snapshot=statutory_rows,
            generated_by=generated_by,
            config_snapshot={"handoff_id": str(handoff.id), "handoff_profile_ref": profile_ref},
        )
        statutory_filing_artifacts = _create_statutory_filing_artifacts(
            batch=batch,
            handoff=handoff,
            statutory_rows=statutory_rows,
            generated_by=generated_by,
            profile=profile,
            artifact_key_prefix=artifact_key_prefix,
        )
        if statutory_filing_artifacts:
            handoff.totals_snapshot = {
                **handoff.totals_snapshot,
                "statutory_filing_artifact_count": len(statutory_filing_artifacts),
                "statutory_filing_count": len({
                    artifact.config_snapshot.get("statutory_filing_calendar_id")
                    for artifact in statutory_filing_artifacts
                    if artifact.config_snapshot.get("statutory_filing_calendar_id")
                }),
            }
            handoff.save()
        handoff = _sync_finance_handoff_summary(handoff)
    return handoff


def transmit_payroll_finance_handoff(handoff: PayrollFinanceHandoff, *, transmitted_by=None) -> PayrollFinanceHandoff:
    """Mark a generated finance handoff as transmitted and publish its finance artifacts."""

    if handoff.status == PayrollFinanceHandoffStatus.TRANSMITTED:
        deliveries = [
            _ensure_provider_delivery(handoff=handoff, artifact=artifact, submitted_by=transmitted_by)
            for artifact in PayrollOutputArtifact.objects.filter(
                output_batch=handoff.output_batch,
                kind__in=FINANCE_ARTIFACT_KINDS,
                status=PayrollOutputArtifactStatus.PUBLISHED,
            )
        ]
        for delivery in deliveries:
            if _delivery_needs_provider_adapter_submission(delivery):
                submit_payroll_provider_delivery(delivery, submitted_by=transmitted_by)
        _sync_finance_handoff_summary(handoff)
        return handoff
    if handoff.status != PayrollFinanceHandoffStatus.GENERATED:
        raise PayrollFinanceHandoffError("Only generated payroll finance handoffs can be transmitted.")
    if handoff.output_batch.status != PayrollOutputBatchStatus.PUBLISHED:
        raise PayrollFinanceHandoffError("Payroll finance handoff requires a published payroll output batch.")

    with transaction.atomic():
        for artifact in PayrollOutputArtifact.objects.filter(
            output_batch=handoff.output_batch,
            kind__in=FINANCE_ARTIFACT_KINDS,
            status=PayrollOutputArtifactStatus.GENERATED,
        ):
            artifact.status = PayrollOutputArtifactStatus.PUBLISHED
            artifact.published_by = transmitted_by
            artifact.save()
        handoff.status = PayrollFinanceHandoffStatus.TRANSMITTED
        handoff.transmitted_at = timezone.now()
        handoff.transmitted_by = transmitted_by
        handoff.save()
        deliveries = [
            _ensure_provider_delivery(handoff=handoff, artifact=artifact, submitted_by=transmitted_by)
            for artifact in PayrollOutputArtifact.objects.filter(
                output_batch=handoff.output_batch,
                kind__in=FINANCE_ARTIFACT_KINDS,
                status=PayrollOutputArtifactStatus.PUBLISHED,
            )
        ]
        for delivery in deliveries:
            if _delivery_needs_provider_adapter_submission(delivery):
                submit_payroll_provider_delivery(delivery, submitted_by=transmitted_by)
        handoff = _sync_finance_handoff_summary(handoff)
    return handoff


def reconcile_payroll_finance_handoff(
    handoff: PayrollFinanceHandoff,
    *,
    reconciled_by=None,
    acknowledgement_profile_ref: str | None = None,
    provider_status: str = PayrollProviderDeliveryStatus.RECONCILED,
    failure_code: str = "",
    failure_reason: str = "",
    response_snapshot: dict[str, Any] | None = None,
) -> PayrollFinanceHandoff:
    """Record external provider acknowledgements and reconcile a transmitted handoff."""

    if handoff.status == PayrollFinanceHandoffStatus.ACCEPTED:
        return handoff
    if handoff.status != PayrollFinanceHandoffStatus.TRANSMITTED:
        raise PayrollFinanceHandoffError("Only transmitted payroll finance handoffs can be acknowledged.")
    if provider_status not in {
        PayrollProviderDeliveryStatus.ACKNOWLEDGED,
        PayrollProviderDeliveryStatus.RECONCILED,
        PayrollProviderDeliveryStatus.REJECTED,
        PayrollProviderDeliveryStatus.FAILED,
    }:
        raise PayrollFinanceHandoffError("Unsupported provider acknowledgement status.")
    if provider_status in {PayrollProviderDeliveryStatus.REJECTED, PayrollProviderDeliveryStatus.FAILED} and not (failure_code or failure_reason):
        raise PayrollFinanceHandoffError("Failed provider acknowledgements require failure evidence.")

    profile = _finance_handoff_profile(handoff.output_batch)
    profile_ref = acknowledgement_profile_ref or profile.get("acknowledgement_profile_ref") or "payroll.acknowledgement.profile.manual.v1"
    artifacts = list(
        PayrollOutputArtifact.objects.filter(
            output_batch=handoff.output_batch,
            kind__in=FINANCE_ARTIFACT_KINDS,
            status=PayrollOutputArtifactStatus.PUBLISHED,
        ).order_by("kind", "artifact_key")
    )
    if not artifacts:
        raise PayrollFinanceHandoffError("Provider acknowledgements require published finance artifacts.")

    acknowledged_at = timezone.now()
    with transaction.atomic():
        deliveries = [_ensure_provider_delivery(handoff=handoff, artifact=artifact, submitted_by=handoff.transmitted_by) for artifact in artifacts]
        for delivery in deliveries:
            if delivery.status == PayrollProviderDeliveryStatus.RECONCILED:
                continue
            delivery_config = delivery.config_snapshot if isinstance(delivery.config_snapshot, dict) else {}
            submission_contract = delivery_config.get("submission_contract") if isinstance(delivery_config.get("submission_contract"), dict) else {}
            delivery.status = provider_status
            delivery.acknowledged_at = acknowledged_at if provider_status in {
                PayrollProviderDeliveryStatus.ACKNOWLEDGED,
                PayrollProviderDeliveryStatus.RECONCILED,
            } else None
            delivery.acknowledged_by = reconciled_by if provider_status in {
                PayrollProviderDeliveryStatus.ACKNOWLEDGED,
                PayrollProviderDeliveryStatus.RECONCILED,
            } else None
            delivery.reconciled_at = acknowledged_at if provider_status == PayrollProviderDeliveryStatus.RECONCILED else None
            delivery.reconciled_by = reconciled_by if provider_status == PayrollProviderDeliveryStatus.RECONCILED else None
            delivery.failure_code = failure_code if provider_status in {
                PayrollProviderDeliveryStatus.REJECTED,
                PayrollProviderDeliveryStatus.FAILED,
            } else ""
            delivery.failure_reason = failure_reason if provider_status in {
                PayrollProviderDeliveryStatus.REJECTED,
                PayrollProviderDeliveryStatus.FAILED,
            } else ""
            delivery.response_snapshot = {
                "acknowledgement_profile_ref": profile_ref,
                "callback_profile_ref": submission_contract.get("callback_profile_ref", profile.get("callback_profile_ref") or "payroll.callback.manual.v1"),
                "callback_verification_ref": submission_contract.get("callback_verification_ref", profile.get("callback_verification_ref") or "payroll.callback.verification.manual.v1"),
                "response_schema_ref": submission_contract.get("response_schema_ref", ""),
                "provider_status": provider_status,
                "recorded_at": acknowledged_at.isoformat(),
                "external_reference": delivery.external_reference,
                **(response_snapshot or {}),
            }
            certification_evidence = delivery_config.get("certification_evidence") if isinstance(delivery_config.get("certification_evidence"), dict) else {}
            certification_evidence = {
                **certification_evidence,
                "status": "recorded" if provider_status == PayrollProviderDeliveryStatus.RECONCILED and submission_contract.get("certification_required") else certification_evidence.get("status", "not_required"),
                "recorded_at": acknowledged_at.isoformat() if provider_status == PayrollProviderDeliveryStatus.RECONCILED and submission_contract.get("certification_required") else certification_evidence.get("recorded_at", ""),
                "external_reference": delivery.external_reference,
                "provider_status": provider_status,
                "evidence_refs": response_snapshot.get("certification_evidence_refs", []) if isinstance(response_snapshot, dict) else certification_evidence.get("evidence_refs", []),
            }
            if provider_status == PayrollProviderDeliveryStatus.RECONCILED:
                delivery.reconciliation_snapshot = {
                    "acknowledgement_profile_ref": profile_ref,
                    "callback_profile_ref": submission_contract.get("callback_profile_ref", ""),
                    "callback_verification_ref": submission_contract.get("callback_verification_ref", ""),
                    "certification_profile_ref": submission_contract.get("certification_profile_ref", ""),
                    "checksum_matched": delivery.payload_checksum_sha256 == delivery.output_artifact.checksum_sha256,
                    "payload_checksum_sha256": delivery.payload_checksum_sha256,
                    "artifact_checksum_sha256": delivery.output_artifact.checksum_sha256,
                    "file_size_bytes": delivery.output_artifact.file_size_bytes,
                    "line_count": len(delivery.output_artifact.line_snapshot) if isinstance(delivery.output_artifact.line_snapshot, list) else 0,
                    "reconciled_at": acknowledged_at.isoformat(),
                }
            delivery.config_snapshot = {**delivery_config, "certification_evidence": certification_evidence}
            delivery.save()

        handoff = _sync_finance_handoff_summary(handoff)
        if provider_status in {PayrollProviderDeliveryStatus.REJECTED, PayrollProviderDeliveryStatus.FAILED}:
            handoff.status = PayrollFinanceHandoffStatus.FAILED
        elif provider_status == PayrollProviderDeliveryStatus.RECONCILED:
            handoff.status = PayrollFinanceHandoffStatus.ACCEPTED
            handoff.accepted_at = acknowledged_at
            handoff.accepted_by = reconciled_by
        handoff.save()
        handoff = PayrollFinanceHandoff.objects.get(id=handoff.id)
    return handoff
