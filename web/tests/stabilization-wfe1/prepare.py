import django
django.setup()
import json
import os
from datetime import timedelta
from pathlib import Path

from django.core.files.base import ContentFile
from django.utils import timezone

from apps.documents.models import DocumentArtifact, DocumentCategory, DocumentRequirementRule, EmployeeDocument, EmployeeDocumentStatus, VerificationStatus
from apps.documents.services import store_document_artifact
from apps.employees.models import Employee

import sys,hashlib,django
django.setup()
from django.apps import apps
from apps.common.management.commands.manage_playwright_workspace import Command
manifest = json.loads(Path(sys.argv[1]).read_text())
employee = Employee.objects.get(id=manifest["credentials"]["employee"]["employee_id"])
tenant = employee.tenant
assert tenant.code == manifest["tenant"]["code"] and tenant.code.startswith("pw-qa-")
Command()._assert_owned(tenant,sys.argv[2])
evidence_root = Path("/unused")

if False:
    artifacts = []
    for artifact in DocumentArtifact.objects.filter(tenant=tenant):
        stored = artifact.stored_file
        if not stored.name:
            continue
        assert tenant.code in stored.name
        stored.storage.delete(stored.name)
        artifacts.append({"id": str(artifact.id), "storage_key": stored.name, "absent": not stored.storage.exists(stored.name)})
    with (evidence_root / "artifact-cleanup.jsonl").open("a") as output:
        output.write(json.dumps({"tenant": tenant.code, "artifacts": artifacts}) + "\n")
else:
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="phase7-governed-identity",
        name="QA Governed Identity",
        requires_verification=True,
        allow_employee_upload=True,
        allow_multiple_files=False,
        accepted_mime_types=["text/plain"],
        max_upload_size_bytes=1024 * 1024,
        replacement_policy="allowed",
    )
    DocumentRequirementRule.objects.create(
        tenant=tenant,
        category=category,
        employment_type=employee.employment_type,
        is_mandatory=True,
    )
    artifact = store_document_artifact(
        tenant=tenant,
        employee=employee,
        uploaded_file=ContentFile(b"Phase 7 approved evidence.\n", name="phase7-approved.txt"),
        actor_identifier="qa-phase7",
    )
    base = EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        artifact=artifact,
        title="QA Approved Identity",
        file_name=artifact.original_filename,
        file_path=artifact.storage_key,
        mime_type=artifact.mime_type,
        file_size_bytes=artifact.file_size_bytes,
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        version_number=1,
        uploaded_by_identifier=employee.employee_code,
        verified_by_identifier="qa-phase7-hr",
    )
    reminder_category = DocumentCategory.objects.create(
        tenant=tenant,
        code="phase7-expiry-reminder",
        name="QA Expiry Reminder",
        requires_expiry_date=True,
        requires_verification=True,
        allow_employee_upload=True,
        accepted_mime_types=["text/plain"],
        max_upload_size_bytes=1024 * 1024,
    )
    reminder_artifact = store_document_artifact(
        tenant=tenant,
        employee=employee,
        uploaded_file=ContentFile(b"Phase 7 expiring evidence.\n", name="phase7-expiring.txt"),
        actor_identifier="qa-phase7",
    )
    reminder_document = EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=reminder_category,
        artifact=reminder_artifact,
        title="QA Expiring Evidence",
        file_name=reminder_artifact.original_filename,
        file_path=reminder_artifact.storage_key,
        mime_type=reminder_artifact.mime_type,
        file_size_bytes=reminder_artifact.file_size_bytes,
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        version_number=1,
        expires_on=timezone.localdate() + timedelta(days=10),
        uploaded_by_identifier=employee.employee_code,
        verified_by_identifier="qa-phase7-hr",
    )
    context = {
        "category": str(category.id),
        "base": str(base.id),
        "employee": str(employee.id),
        "reminder_document": str(reminder_document.id),
    }
    Path(sys.argv[1]).with_name("wfe-context.json").write_text(json.dumps(context))
    protected={}
    for model in apps.get_app_config("payroll").get_models():
        if any(f.name=="tenant" for f in model._meta.fields):protected[model._meta.label]=hashlib.sha256(json.dumps(list(model.objects.filter(tenant=tenant).order_by("pk").values()),sort_keys=True,default=str).encode()).hexdigest()
    Path(sys.argv[1]).with_name("wfe-protected.json").write_text(json.dumps(protected))
    print(json.dumps(context))

if len(sys.argv)>3 and sys.argv[3].startswith('E1-03'):
    for index in range(40):
        EmployeeDocument.objects.create(tenant=tenant,employee=employee,category=category,title=f"WF-E.1 print row {index:02d} - "+"Long synthetic evidence title requiring wrapping and preserving every word "*2,file_name=f"long-synthetic-print-evidence-{index:02d}-filename.txt",mime_type="text/plain",file_size_bytes=2048,status=EmployeeDocumentStatus.ARCHIVED,verification_status=VerificationStatus.REJECTED,uploaded_by_identifier="WF-E.1 synthetic report fixture")
