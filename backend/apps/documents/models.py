"""Document categories, employee documents, and generated HR letters."""

import uuid

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.employees.models import Employee
from apps.organizations.models import Branch, Department, EmploymentType, Grade, LegalEntity
from apps.tenants.models import Tenant


class DocumentCategoryType(models.TextChoices):
    IDENTITY = "identity", "Identity"
    ADDRESS = "address", "Address"
    EDUCATION = "education", "Education"
    EXPERIENCE = "experience", "Experience"
    BANK = "bank", "Bank"
    TAX = "tax", "Tax"
    CONTRACT = "contract", "Contract"
    POLICY = "policy", "Policy"
    MEDICAL = "medical", "Medical"
    OTHER = "other", "Other"


class VerificationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    VERIFIED = "verified", "Verified"
    REJECTED = "rejected", "Rejected"
    EXPIRED = "expired", "Expired"


class LetterType(models.TextChoices):
    OFFER = "offer", "Offer Letter"
    APPOINTMENT = "appointment", "Appointment Letter"
    CONFIRMATION = "confirmation", "Confirmation Letter"
    TRANSFER = "transfer", "Transfer Letter"
    PROMOTION = "promotion", "Promotion Letter"
    RELIEVING = "relieving", "Relieving Letter"
    EXPERIENCE = "experience", "Experience Letter"
    OTHER = "other", "Other"


class EmployeeDocumentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"
    REPLACED = "replaced", "Replaced"


class DocumentArtifactSourceKind(models.TextChoices):
    UPLOADED = "uploaded", "Uploaded"
    GENERATED = "generated", "Generated"


class DocumentStorageProvider(models.TextChoices):
    LOCAL = "local", "Local"
    S3_COMPATIBLE = "s3_compatible", "S3 Compatible"
    OTHER = "other", "Other"


def document_artifact_upload_to(instance: "DocumentArtifact", filename: str) -> str:
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    extension = f".{suffix}" if suffix else ""
    tenant_code = getattr(instance.tenant, "code", "tenant")
    employee_segment = str(instance.employee_id) if instance.employee_id else "shared"
    return f"document-artifacts/{tenant_code}/{employee_segment}/{uuid.uuid4().hex}{extension}"


class DocumentCategory(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-defined document category."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="document_categories",
    )
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    category_type = models.CharField(max_length=20, choices=DocumentCategoryType.choices, default=DocumentCategoryType.OTHER)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_system_seeded = models.BooleanField(default=False)
    requires_expiry_date = models.BooleanField(default=False)
    requires_verification = models.BooleanField(default=True)
    allow_employee_upload = models.BooleanField(default=True)
    allow_multiple_files = models.BooleanField(default=False)
    visibility_rules = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Document Category"
        verbose_name_plural = "Document Categories"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.name}"


class DocumentRequirementRule(UUIDPrimaryKeyModel, TimeStampedModel):
    """Defines where a document category is mandatory."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="document_requirement_rules",
    )
    category = models.ForeignKey(
        DocumentCategory,
        on_delete=models.CASCADE,
        related_name="requirement_rules",
    )
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.CASCADE,
        related_name="document_requirement_rules",
        blank=True,
        null=True,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="document_requirement_rules",
        blank=True,
        null=True,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="document_requirement_rules",
        blank=True,
        null=True,
    )
    grade = models.ForeignKey(
        Grade,
        on_delete=models.CASCADE,
        related_name="document_requirement_rules",
        blank=True,
        null=True,
    )
    employment_type = models.ForeignKey(
        EmploymentType,
        on_delete=models.CASCADE,
        related_name="document_requirement_rules",
        blank=True,
        null=True,
    )
    is_mandatory = models.BooleanField(default=True)
    required_within_days_of_joining = models.PositiveIntegerField(default=0)
    priority = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["priority", "created_at"]
        verbose_name = "Document Requirement Rule"
        verbose_name_plural = "Document Requirement Rules"

    def __str__(self) -> str:
        return f"{self.category.name} -> {self.tenant.code}"


class DocumentArtifact(UUIDPrimaryKeyModel, TimeStampedModel):
    """Stored uploaded or generated artifact."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="document_artifacts",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="document_artifacts",
        blank=True,
        null=True,
    )
    source_kind = models.CharField(max_length=20, choices=DocumentArtifactSourceKind.choices, default=DocumentArtifactSourceKind.UPLOADED)
    storage_provider = models.CharField(max_length=30, choices=DocumentStorageProvider.choices, default=DocumentStorageProvider.LOCAL)
    original_filename = models.CharField(max_length=255)
    stored_file = models.FileField(upload_to=document_artifact_upload_to, max_length=512)
    storage_key = models.CharField(max_length=512, blank=True)
    mime_type = models.CharField(max_length=120, blank=True)
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    created_by_identifier = models.CharField(max_length=120, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Document Artifact"
        verbose_name_plural = "Document Artifacts"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.original_filename}"


class EmployeeDocument(UUIDPrimaryKeyModel, TimeStampedModel):
    """Uploaded or generated document attached to an employee."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="employee_documents",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    category = models.ForeignKey(
        DocumentCategory,
        on_delete=models.CASCADE,
        related_name="employee_documents",
    )
    artifact = models.ForeignKey(
        DocumentArtifact,
        on_delete=models.SET_NULL,
        related_name="employee_documents",
        blank=True,
        null=True,
    )
    previous_document = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="replacement_versions",
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=20, choices=EmployeeDocumentStatus.choices, default=EmployeeDocumentStatus.ACTIVE)
    verification_status = models.CharField(max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING)
    version_number = models.PositiveIntegerField(default=1)
    title = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255)
    file_url = models.URLField(blank=True)
    file_path = models.CharField(max_length=512, blank=True)
    mime_type = models.CharField(max_length=120, blank=True)
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    document_number = models.CharField(max_length=120, blank=True)
    issued_on = models.DateField(blank=True, null=True)
    expires_on = models.DateField(blank=True, null=True)
    uploaded_by_identifier = models.CharField(max_length=120, blank=True)
    verified_by_identifier = models.CharField(max_length=120, blank=True)
    verified_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True)
    reupload_requested = models.BooleanField(default=False)
    reupload_requested_at = models.DateTimeField(blank=True, null=True)
    reupload_requested_by_identifier = models.CharField(max_length=120, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Employee Document"
        verbose_name_plural = "Employee Documents"

    def __str__(self) -> str:
        return f"{self.employee} - {self.title}"


class DocumentVerificationLog(UUIDPrimaryKeyModel, TimeStampedModel):
    """Audit log of document verification actions."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="document_verification_logs",
    )
    employee_document = models.ForeignKey(
        EmployeeDocument,
        on_delete=models.CASCADE,
        related_name="verification_logs",
    )
    previous_status = models.CharField(max_length=20, choices=VerificationStatus.choices, blank=True)
    new_status = models.CharField(max_length=20, choices=VerificationStatus.choices)
    actor_identifier = models.CharField(max_length=120, blank=True)
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Document Verification Log"
        verbose_name_plural = "Document Verification Logs"

    def __str__(self) -> str:
        return f"{self.employee_document} - {self.new_status}"


class GeneratedLetter(UUIDPrimaryKeyModel, TimeStampedModel):
    """Generated HR letter or downloadable record."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="generated_letters",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="generated_letters",
    )
    artifact = models.ForeignKey(
        DocumentArtifact,
        on_delete=models.SET_NULL,
        related_name="generated_letters",
        blank=True,
        null=True,
    )
    letter_type = models.CharField(max_length=30, choices=LetterType.choices, default=LetterType.OTHER)
    title = models.CharField(max_length=255)
    template_code = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, choices=EmployeeDocumentStatus.choices, default=EmployeeDocumentStatus.ACTIVE)
    issue_date = models.DateField(blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_url = models.URLField(blank=True)
    file_path = models.CharField(max_length=512, blank=True)
    workflow_reference = models.CharField(max_length=120, blank=True)
    payload_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Generated Letter"
        verbose_name_plural = "Generated Letters"

    def __str__(self) -> str:
        return f"{self.employee} - {self.title}"
