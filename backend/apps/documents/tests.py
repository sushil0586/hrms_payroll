from datetime import date, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.common.api_views import (
    _get_employee_document_expiry_runtime,
    _send_document_expiry_attention_reminder,
    create_self_service_employee_document,
    save_hr_admin_employee_document,
)
from apps.documents.models import DocumentArtifact, DocumentCategory, DocumentVerificationLog, EmployeeDocument, EmployeeDocumentStatus, VerificationStatus
from apps.documents.services import validate_uploaded_document_file
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership, User
from apps.notifications.models import Notification
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus


def _upload(name="proof.pdf", content=b"%PDF-1.4\ndocument-bytes\n%%EOF", content_type="application/pdf"):
    return SimpleUploadedFile(name, content, content_type=content_type)


class EmployeeDocumentWorkflowTests(TestCase):
    def setUp(self):
        self.employee_user = User.objects.create_user(
            username="doc-employee",
            email="doc-employee@example.com",
            password="test-pass",
        )
        self.hr_user = User.objects.create_user(
            username="doc-hr",
            email="doc-hr@example.com",
            password="test-pass",
        )
        self.tenant = Tenant.objects.create(
            code="docs-co",
            name="Docs Co",
            legal_name="Docs Co Pvt Ltd",
            status=TenantStatus.ACTIVE,
            subscription_plan=SubscriptionPlan.GROWTH,
            country_code="IN",
            timezone="Asia/Kolkata",
        )
        self.employee_membership = TenantMembership.objects.create(
            tenant=self.tenant,
            user=self.employee_user,
            status=MembershipStatus.ACTIVE,
            is_default=True,
            employee_code="EMP-200",
        )
        self.hr_membership = TenantMembership.objects.create(
            tenant=self.tenant,
            user=self.hr_user,
            status=MembershipStatus.ACTIVE,
            employee_code="HR-200",
        )
        role = Role.objects.create(
            tenant=self.tenant,
            code="hr-admin",
            name="HR Admin",
            is_system_role=True,
            is_active=True,
        )
        MembershipRole.objects.create(membership=self.hr_membership, role=role, is_primary=True)
        self.employee = Employee.objects.create(
            tenant=self.tenant,
            membership=self.employee_membership,
            employee_code="EMP-200",
            first_name="Aditi",
            work_email=self.employee_user.email,
            employment_status=EmploymentStatus.ACTIVE,
        )
        self.hr_employee = Employee.objects.create(
            tenant=self.tenant,
            membership=self.hr_membership,
            employee_code="HR-200",
            first_name="Meera",
            work_email=self.hr_user.email,
            employment_status=EmploymentStatus.ACTIVE,
        )
        self.category = DocumentCategory.objects.create(
            tenant=self.tenant,
            code="identity-pan",
            name="PAN Card",
            requires_expiry_date=False,
            requires_verification=True,
            allow_employee_upload=True,
            allow_multiple_files=False,
            visibility_rules={"accepted_mime_types": ["application/pdf"]},
        )

    def test_employee_upload_notifies_hr_and_sets_pending_verification(self):
        document = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "title": "PAN upload",
                "file": _upload(),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )

        self.assertEqual(document.verification_status, VerificationStatus.PENDING)
        notification = Notification.objects.get(
            tenant=self.tenant,
            subject_type="employee_document",
            subject_identifier=str(document.id),
            recipient_membership=self.hr_membership,
        )
        self.assertEqual(notification.payload["verification_status"], VerificationStatus.PENDING)
        self.assertEqual(notification.payload["uploaded_by_identifier"], "EMP-200")

    def test_hr_verification_notifies_employee_and_writes_audit_log(self):
        document = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "title": "PAN upload",
                "file": _upload(),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )

        updated = save_hr_admin_employee_document(
            self.hr_employee,
            {"verification_status": VerificationStatus.VERIFIED},
            item=document,
        )

        self.assertEqual(updated.verification_status, VerificationStatus.VERIFIED)
        self.assertEqual(updated.verified_by_identifier, "HR-200")
        self.assertTrue(DocumentVerificationLog.objects.filter(employee_document=updated, new_status=VerificationStatus.VERIFIED).exists())
        notification = Notification.objects.filter(
            tenant=self.tenant,
            subject_type="employee_document",
            subject_identifier=str(document.id),
            recipient_membership=self.employee_membership,
        ).latest("created_at")
        self.assertEqual(notification.payload["verification_status"], VerificationStatus.VERIFIED)
        self.assertIn("verified", notification.title.lower())

    def test_rejection_requests_reupload_and_replacement_versions_document(self):
        document = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "title": "PAN upload",
                "file": _upload(),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )
        rejected = save_hr_admin_employee_document(
            self.hr_employee,
            {
                "verification_status": VerificationStatus.REJECTED,
                "rejection_reason": "Image is not readable.",
            },
            item=document,
        )

        self.assertTrue(rejected.reupload_requested)
        reupload_notifications = Notification.objects.filter(
            tenant=self.tenant,
            subject_type="employee_document",
            subject_identifier=str(rejected.id),
            recipient_membership=self.employee_membership,
        )
        self.assertTrue(reupload_notifications.filter(payload__reupload_requested=True).exists())

        replacement = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "title": "PAN replacement",
                "file": _upload(name="replacement.pdf", content=b"%PDF-1.4\nreplacement\n%%EOF"),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )
        rejected.refresh_from_db()

        self.assertEqual(rejected.status, EmployeeDocumentStatus.REPLACED)
        self.assertFalse(rejected.reupload_requested)
        self.assertEqual(replacement.previous_document_id, rejected.id)
        self.assertEqual(replacement.version_number, 2)
        self.assertEqual(replacement.verification_status, VerificationStatus.PENDING)

    def test_expiry_attention_reminder_notifies_employee_with_runtime_state(self):
        expiring_category = DocumentCategory.objects.create(
            tenant=self.tenant,
            code="passport",
            name="Passport",
            requires_expiry_date=True,
            requires_verification=True,
            allow_employee_upload=True,
        )
        document = create_self_service_employee_document(
            self.employee,
            {
                "category_id": expiring_category.id,
                "title": "Passport",
                "file": _upload(),
                "document_number": "P123456",
                "issued_on": date(2020, 1, 1),
                "expires_on": timezone.localdate() + timedelta(days=10),
            },
        )

        sent = _send_document_expiry_attention_reminder(document=document, reminder_source="test")

        self.assertTrue(sent)
        notification = Notification.objects.filter(
            tenant=self.tenant,
            subject_type="employee_document",
            subject_identifier=str(document.id),
            recipient_membership=self.employee_membership,
        ).latest("created_at")
        self.assertEqual(notification.payload["expiry_state"], "expiring_soon")
        self.assertEqual(notification.payload["reminder_source"], "test")

    def test_expiry_attention_reminder_is_idempotent_per_document_state_and_day(self):
        expiring_category = DocumentCategory.objects.create(
            tenant=self.tenant,
            code="passport-idempotent",
            name="Passport Idempotent",
            requires_expiry_date=True,
            requires_verification=True,
            allow_employee_upload=True,
        )
        document = create_self_service_employee_document(
            self.employee,
            {
                "category_id": expiring_category.id,
                "title": "Passport",
                "file": _upload(),
                "document_number": "P1234567",
                "issued_on": date(2020, 1, 1),
                "expires_on": timezone.localdate() + timedelta(days=10),
            },
        )

        self.assertTrue(_send_document_expiry_attention_reminder(document=document, reminder_source="system_scan"))
        self.assertFalse(_send_document_expiry_attention_reminder(document=document, reminder_source="system_scan_retry"))
        reminders = Notification.objects.filter(
            tenant=self.tenant,
            subject_type="employee_document",
            subject_identifier=str(document.id),
            payload__reminder_key__isnull=False,
        )
        self.assertEqual(reminders.count(), 1)

    def test_expiry_runtime_has_deterministic_day_boundaries(self):
        document = EmployeeDocument(expires_on=date(2026, 10, 18))

        expired = _get_employee_document_expiry_runtime(document, today=date(2026, 10, 19))
        due_today = _get_employee_document_expiry_runtime(document, today=date(2026, 10, 18))
        day_30 = _get_employee_document_expiry_runtime(document, today=date(2026, 9, 18))
        day_31 = _get_employee_document_expiry_runtime(document, today=date(2026, 9, 17))

        self.assertEqual((expired["state"], expired["days_until_expiry"]), ("expired", -1))
        self.assertEqual((due_today["state"], due_today["days_until_expiry"]), ("expiring_soon", 0))
        self.assertEqual((day_30["state"], day_30["days_until_expiry"]), ("expiring_soon", 30))
        self.assertEqual((day_31["state"], day_31["days_until_expiry"]), ("valid", 31))

    def test_storage_file_is_removed_when_document_row_creation_fails(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            with patch.object(EmployeeDocument.objects, "create", side_effect=RuntimeError("document row failure")):
                with self.assertRaisesMessage(RuntimeError, "document row failure"):
                    create_self_service_employee_document(
                        self.employee,
                        {
                            "category_id": self.category.id,
                            "title": "Failed upload",
                            "file": _upload(name="failed.pdf", content=b"%PDF-1.4\nfailed-content\n%%EOF"),
                            "document_number": "FAILED-1",
                            "issued_on": None,
                            "expires_on": None,
                        },
                    )

            self.assertFalse(DocumentArtifact.objects.filter(tenant=self.tenant, original_filename="failed.pdf").exists())
            self.assertEqual([path for path in Path(media_root).rglob("*") if path.is_file()], [])

    def test_expiry_date_is_required_when_category_demands_it(self):
        expiring_category = DocumentCategory.objects.create(
            tenant=self.tenant,
            code="visa",
            name="Visa",
            requires_expiry_date=True,
            requires_verification=True,
            allow_employee_upload=True,
        )

        with self.assertRaisesMessage(Exception, "Expiry date is required"):
            create_self_service_employee_document(
                self.employee,
                {
                    "category_id": expiring_category.id,
                    "title": "Visa",
                    "file": _upload(),
                    "document_number": "V123",
                    "issued_on": None,
                    "expires_on": None,
                },
            )

    def test_server_rejects_executable_extension_even_with_allowed_pdf_mime(self):
        uploaded_file = _upload(name="misleading.exe", content=b"%PDF-1.4\nsynthetic", content_type="application/pdf")

        with self.assertRaisesMessage(ValueError, "Executable or script files are not allowed"):
            validate_uploaded_document_file(uploaded_file, accepted_mime_types=["application/pdf"])

    def test_server_rejects_executable_signature_even_with_pdf_name_and_mime(self):
        uploaded_file = _upload(name="misleading.pdf", content=b"MZsynthetic-executable", content_type="application/pdf")

        with self.assertRaisesMessage(ValueError, "Executable or script file content is not allowed"):
            validate_uploaded_document_file(uploaded_file, accepted_mime_types=["application/pdf"])

        self.assertEqual(uploaded_file.tell(), 0)

    def test_server_enforces_empty_and_configured_size_boundaries(self):
        with self.assertRaisesMessage(ValueError, "Uploaded file is empty"):
            validate_uploaded_document_file(_upload(content=b""))

        with patch.dict("os.environ", {"HRMS_DOCUMENT_UPLOAD_MAX_BYTES": "16"}):
            validate_uploaded_document_file(_upload(content=b"%PDF-" + b"x" * 11))
            with self.assertRaisesMessage(ValueError, "exceeds the 16 byte limit"):
                validate_uploaded_document_file(_upload(content=b"%PDF-" + b"x" * 12))

    def test_server_enforces_default_maximum_size_boundaries(self):
        maximum = 10 * 1024 * 1024
        validate_uploaded_document_file(_upload(content=b"%PDF-" + b"x" * (maximum - 6)))
        validate_uploaded_document_file(_upload(content=b"%PDF-" + b"x" * (maximum - 5)))
        with self.assertRaisesMessage(ValueError, f"exceeds the {maximum} byte limit"):
            validate_uploaded_document_file(_upload(content=b"%PDF-" + b"x" * (maximum - 4)))

    def test_server_rejects_corrupt_known_document_content(self):
        with self.assertRaisesMessage(ValueError, "content does not match its filename"):
            validate_uploaded_document_file(_upload(name="corrupt.pdf", content=b"not-a-pdf", content_type="application/pdf"))

        with self.assertRaisesMessage(ValueError, "content does not match its filename"):
            validate_uploaded_document_file(_upload(name="corrupt.png", content=b"not-a-png", content_type="image/png"))

    def test_server_accepts_supported_document_signatures(self):
        samples = [
            ("valid.pdf", "application/pdf", b"%PDF-1.7\n%%EOF"),
            ("valid.png", "image/png", b"\x89PNG\r\n\x1a\ncontent"),
            ("valid.jpg", "image/jpeg", b"\xff\xd8\xffcontent"),
            ("valid.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", b"PK\x03\x04content"),
        ]
        for name, content_type, content in samples:
            with self.subTest(name=name):
                validate_uploaded_document_file(_upload(name=name, content=content, content_type=content_type))
