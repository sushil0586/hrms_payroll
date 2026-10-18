from concurrent.futures import ThreadPoolExecutor

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import close_old_connections
from rest_framework.exceptions import ValidationError

from apps.common.api_views import create_hr_admin_employee_document
from apps.documents.models import DocumentArtifact, DocumentCategory, EmployeeDocument, EmployeeDocumentStatus
from apps.employees.models import Employee, EmploymentStatus
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus


@pytest.mark.django_db(transaction=True)
def test_concurrent_single_file_uploads_create_one_active_version(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    tenant = Tenant.objects.create(
        code="dd2-concurrency",
        name="DD2 Concurrency",
        legal_name="DD2 Concurrency Pvt Ltd",
        status=TenantStatus.ACTIVE,
        subscription_plan=SubscriptionPlan.ENTERPRISE,
        country_code="IN",
        timezone="Asia/Kolkata",
    )
    actor = Employee.objects.create(
        tenant=tenant,
        employee_code="HR-DD2",
        first_name="HR",
        work_email="hr-dd2@example.test",
        employment_status=EmploymentStatus.ACTIVE,
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-DD2",
        first_name="Employee",
        work_email="employee-dd2@example.test",
        employment_status=EmploymentStatus.ACTIVE,
    )
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="single-identity",
        name="Single identity",
        allow_employee_upload=True,
        allow_multiple_files=False,
        visibility_rules={"accepted_mime_types": ["application/pdf"]},
    )

    def upload(suffix: str):
        close_old_connections()
        try:
            thread_actor = Employee.objects.get(pk=actor.pk)
            return create_hr_admin_employee_document(
                thread_actor,
                {
                    "employee_id": employee.id,
                    "category_id": category.id,
                    "title": f"Concurrent {suffix}",
                    "file": SimpleUploadedFile(
                        f"concurrent-{suffix}.pdf",
                        f"content-{suffix}".encode(),
                        content_type="application/pdf",
                    ),
                    "document_number": suffix,
                    "issued_on": None,
                    "expires_on": None,
                },
            ).id
        except ValidationError as exc:
            return str(exc)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(upload, ["A", "B"]))

    assert sum("active document already exists" in str(result).lower() for result in results) == 1
    assert EmployeeDocument.objects.filter(
        tenant=tenant,
        employee=employee,
        category=category,
        status=EmployeeDocumentStatus.ACTIVE,
    ).count() == 1
    assert DocumentArtifact.objects.filter(tenant=tenant, employee=employee).count() == 1
