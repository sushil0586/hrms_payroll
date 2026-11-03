"""Storage and artifact services for documents."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path

from django.core.files.uploadedfile import UploadedFile
from django.utils import timezone

from apps.documents.models import DocumentArtifact, DocumentArtifactSourceKind, DocumentMalwareScanStatus, DocumentStorageProvider
from apps.employees.models import Employee
from apps.tenants.models import Tenant


DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
BLOCKED_DOCUMENT_EXTENSIONS = {
    ".bat",
    ".cmd",
    ".com",
    ".exe",
    ".js",
    ".msi",
    ".ps1",
    ".sh",
}
BLOCKED_DOCUMENT_SIGNATURES = (b"MZ", b"\x7fELF", b"#!")
DOCUMENT_SIGNATURES = {
    ".pdf": (b"%PDF-",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".doc": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
    ".docx": (b"PK\x03\x04",),
}
LOCAL_MALWARE_SIGNATURES = (b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE",)


def get_document_malware_scan_mode() -> str:
    mode = os.getenv("HRMS_DOCUMENT_MALWARE_SCAN_MODE", "disabled").strip().lower()
    return mode if mode in {"disabled", "local_signature", "required_external"} else "required_external"


def document_artifact_is_downloadable(artifact: DocumentArtifact | None) -> bool:
    if not artifact:
        return False
    return artifact.malware_scan_status in {
        DocumentMalwareScanStatus.NOT_REQUIRED,
        DocumentMalwareScanStatus.CLEAN,
    }


def scan_document_artifact(artifact: DocumentArtifact) -> DocumentArtifact:
    mode = get_document_malware_scan_mode()
    if mode == "disabled":
        artifact.malware_scan_status = DocumentMalwareScanStatus.NOT_REQUIRED
        artifact.malware_scanner_ref = "disabled-by-local-policy"
        artifact.malware_scanned_at = timezone.now()
        artifact.quarantine_reason = ""
    elif mode == "required_external":
        artifact.malware_scan_status = DocumentMalwareScanStatus.ERROR
        artifact.malware_scanner_ref = os.getenv("HRMS_DOCUMENT_MALWARE_SCANNER_REF", "").strip()
        artifact.malware_scanned_at = timezone.now()
        artifact.quarantine_reason = "Required malware scanner is unavailable."
    else:
        artifact.malware_scanner_ref = "local-signature-v1"
        artifact.malware_scanned_at = timezone.now()
        try:
            with artifact.stored_file.open("rb") as stored_file:
                content = stored_file.read()
                infected = any(signature in content for signature in LOCAL_MALWARE_SIGNATURES)
        except Exception:
            artifact.malware_scan_status = DocumentMalwareScanStatus.ERROR
            artifact.quarantine_reason = "Stored object could not be scanned."
        else:
            artifact.malware_scan_status = (
                DocumentMalwareScanStatus.QUARANTINED if infected else DocumentMalwareScanStatus.CLEAN
            )
            artifact.quarantine_reason = "Malware test signature detected." if infected else ""
    metadata = dict(artifact.metadata or {})
    metadata["malware_scan"] = {
        "status": artifact.malware_scan_status,
        "scanner_ref": artifact.malware_scanner_ref,
        "scanned_at": artifact.malware_scanned_at.isoformat() if artifact.malware_scanned_at else "",
    }
    artifact.metadata = metadata
    artifact.save(update_fields=[
        "malware_scan_status", "malware_scanner_ref", "malware_scanned_at",
        "quarantine_reason", "metadata", "updated_at",
    ])
    return artifact


def get_document_upload_max_bytes() -> int:
    raw_value = os.getenv("HRMS_DOCUMENT_UPLOAD_MAX_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES)).strip()
    try:
        parsed = int(raw_value)
    except ValueError:
        return DEFAULT_MAX_UPLOAD_BYTES
    return parsed if parsed > 0 else DEFAULT_MAX_UPLOAD_BYTES


def get_document_storage_provider() -> str:
    configured = os.getenv("HRMS_DOCUMENT_STORAGE_PROVIDER", DocumentStorageProvider.LOCAL).strip().lower()
    if configured in DocumentStorageProvider.values:
        return configured
    if configured in {"s3", "s3-compatible", "s3_compatible"}:
        return DocumentStorageProvider.S3_COMPATIBLE
    return DocumentStorageProvider.OTHER if configured else DocumentStorageProvider.LOCAL


def validate_uploaded_document_file(
    uploaded_file: UploadedFile,
    *,
    accepted_mime_types: list[str] | None = None,
    max_upload_bytes: int | None = None,
) -> None:
    max_upload_bytes = max_upload_bytes or get_document_upload_max_bytes()
    file_size = int(getattr(uploaded_file, "size", 0) or 0)
    if file_size <= 0:
        raise ValueError("Uploaded file is empty.")
    if file_size > max_upload_bytes:
        raise ValueError(f"Uploaded file exceeds the {max_upload_bytes} byte limit.")

    filename = str(getattr(uploaded_file, "name", "") or "")
    extension = Path(filename).suffix.lower()
    if extension in BLOCKED_DOCUMENT_EXTENSIONS:
        raise ValueError("Executable or script files are not allowed.")

    original_position = uploaded_file.tell() if hasattr(uploaded_file, "tell") else None
    header = uploaded_file.read(8)
    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(original_position or 0)
    if any(header.startswith(signature) for signature in BLOCKED_DOCUMENT_SIGNATURES):
        raise ValueError("Executable or script file content is not allowed.")
    expected_signatures = DOCUMENT_SIGNATURES.get(extension)
    if expected_signatures and not any(header.startswith(signature) for signature in expected_signatures):
        raise ValueError("Uploaded file content does not match its filename.")

    if accepted_mime_types:
        normalized = [value.strip().lower() for value in accepted_mime_types if value and value.strip()]
        content_type = str(getattr(uploaded_file, "content_type", "") or "").strip().lower()
        if normalized and content_type not in normalized:
            raise ValueError("Uploaded file type is not allowed for this document category.")


def store_document_artifact(
    *,
    tenant: Tenant,
    employee: Employee | None,
    uploaded_file: UploadedFile,
    actor_identifier: str,
    source_kind: str = DocumentArtifactSourceKind.UPLOADED,
    metadata: dict | None = None,
) -> DocumentArtifact:
    checksum = hashlib.sha256()
    for chunk in uploaded_file.chunks():
        checksum.update(chunk)

    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    artifact = DocumentArtifact(
        tenant=tenant,
        employee=employee,
        source_kind=source_kind,
        storage_provider=get_document_storage_provider(),
        original_filename=str(getattr(uploaded_file, "name", "") or "artifact"),
        mime_type=str(getattr(uploaded_file, "content_type", "") or ""),
        file_size_bytes=int(getattr(uploaded_file, "size", 0) or 0),
        checksum_sha256=checksum.hexdigest(),
        created_by_identifier=actor_identifier,
        metadata=metadata or {},
    )
    try:
        artifact.stored_file.save(artifact.original_filename, uploaded_file, save=False)
        artifact.storage_key = artifact.stored_file.name
        artifact.save()
        scan_document_artifact(artifact)
    except Exception:
        if artifact.stored_file.name:
            artifact.stored_file.storage.delete(artifact.stored_file.name)
        raise
    return artifact
