import json
import os
from datetime import timedelta
from pathlib import Path

from django.utils import timezone

from apps.documents.models import (
    DocumentCategory,
    DocumentCategoryType,
    DocumentRequirementRule,
    EmployeeDocument,
    EmployeeDocumentStatus,
    VerificationStatus,
)
from apps.employees.models import Employee

manifest_path = Path(os.environ["QA_DOCUMENT_CERT_MANIFEST"])
manifest = json.loads(manifest_path.read_text())
employee = Employee.objects.get(id=manifest["credentials"]["employee"]["employee_id"])
seed_ref = os.environ["QA_DOCUMENT_CERT_SEED_REF"]

categories = []
for index, name in enumerate(["Certification identity", "Certification policy"]):
    category = DocumentCategory.objects.create(
        tenant=employee.tenant,
        code=f"doc-cert-{seed_ref[-12:]}-{index}",
        name=name,
        category_type=DocumentCategoryType.IDENTITY if index == 0 else DocumentCategoryType.POLICY,
        requires_expiry_date=True,
        requires_verification=True,
        allow_employee_upload=True,
        is_active=True,
        visibility_rules={"accepted_mime_types": ["application/pdf"]},
    )
    DocumentRequirementRule.objects.create(
        tenant=employee.tenant,
        category=category,
        is_mandatory=True,
        required_within_days_of_joining=0,
        priority=index + 1,
        is_active=True,
    )
    categories.append(category)

statuses = [VerificationStatus.PENDING, VerificationStatus.VERIFIED, VerificationStatus.REJECTED]
for index in range(30):
    EmployeeDocument.objects.create(
        tenant=employee.tenant,
        employee=employee,
        category=categories[index % len(categories)],
        title=f"Certification document {29 - index:02d}",
        file_name=f"document-{index:02d}.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=statuses[index % len(statuses)],
        expires_on=timezone.localdate() + timedelta(days=index + 1),
        uploaded_by_identifier=employee.employee_code,
    )

(manifest_path.parent / "document-certification-context.json").write_text(json.dumps({
    "employee_id": str(employee.id),
    "category_names": [category.name for category in categories],
}))
