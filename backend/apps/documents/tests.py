from datetime import date, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.serializers import ValidationError

from apps.common.api_views import (
    _get_employee_document_requirement_runtime,
    _get_employee_document_expiry_runtime,
    _send_document_expiry_attention_reminder,
    create_self_service_employee_document,
    save_hr_admin_employee_document,
    withdraw_self_service_employee_document,
)
from apps.documents.models import DocumentArtifact, DocumentCategory, DocumentLifecycleAuditEvent, DocumentLifecycleEventType, DocumentMalwareScanStatus, DocumentReplacementPolicy, DocumentRequirementRule, DocumentVerificationLog, EmployeeDocument, EmployeeDocumentStatus, VerificationStatus
from apps.documents.services import document_artifact_is_downloadable, validate_uploaded_document_file
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

        self.assertEqual(rejected.status, EmployeeDocumentStatus.ACTIVE)
        self.assertFalse(rejected.reupload_requested)
        self.assertEqual(replacement.previous_document_id, rejected.id)
        self.assertEqual(replacement.version_number, 2)
        self.assertEqual(replacement.status, EmployeeDocumentStatus.PENDING_REPLACEMENT)
        self.assertEqual(replacement.verification_status, VerificationStatus.PENDING)

    def test_approved_document_remains_active_until_replacement_is_verified(self):
        current = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "title": "Approved PAN",
                "file": _upload(),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )
        save_hr_admin_employee_document(
            self.hr_employee,
            {"verification_status": VerificationStatus.VERIFIED},
            item=current,
        )

        replacement = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "replace_document_id": current.id,
                "title": "Replacement PAN",
                "file": _upload(name="replacement.pdf", content=b"%PDF-1.4\nreplacement\n%%EOF"),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )
        current.refresh_from_db()
        self.assertEqual(current.status, EmployeeDocumentStatus.ACTIVE)
        self.assertEqual(current.verification_status, VerificationStatus.VERIFIED)
        self.assertEqual(replacement.status, EmployeeDocumentStatus.PENDING_REPLACEMENT)

        save_hr_admin_employee_document(
            self.hr_employee,
            {"verification_status": VerificationStatus.VERIFIED},
            item=replacement,
        )
        current.refresh_from_db()
        replacement.refresh_from_db()
        self.assertEqual(current.status, EmployeeDocumentStatus.REPLACED)
        self.assertEqual(replacement.status, EmployeeDocumentStatus.ACTIVE)

    def test_rejected_replacement_preserves_approved_document(self):
        current = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "title": "Approved PAN",
                "file": _upload(),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )
        save_hr_admin_employee_document(
            self.hr_employee,
            {"verification_status": VerificationStatus.VERIFIED},
            item=current,
        )
        replacement = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "replace_document_id": current.id,
                "title": "Replacement PAN",
                "file": _upload(name="replacement.pdf", content=b"%PDF-1.4\nreplacement\n%%EOF"),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )

        save_hr_admin_employee_document(
            self.hr_employee,
            {"verification_status": VerificationStatus.REJECTED, "rejection_reason": "Unreadable."},
            item=replacement,
        )
        current.refresh_from_db()
        replacement.refresh_from_db()
        self.assertEqual(current.status, EmployeeDocumentStatus.ACTIVE)
        self.assertEqual(current.verification_status, VerificationStatus.VERIFIED)
        self.assertEqual(replacement.status, EmployeeDocumentStatus.ARCHIVED)
        self.assertEqual(replacement.verification_status, VerificationStatus.REJECTED)

    def test_employee_can_withdraw_pending_replacement_without_changing_approved_document(self):
        current = create_self_service_employee_document(
            self.employee,
            {"category_id": self.category.id, "title": "Approved PAN", "file": _upload(), "document_number": "ABCDE1234F", "issued_on": None, "expires_on": None},
        )
        save_hr_admin_employee_document(self.hr_employee, {"verification_status": VerificationStatus.VERIFIED}, item=current)
        replacement = create_self_service_employee_document(
            self.employee,
            {"category_id": self.category.id, "replace_document_id": current.id, "title": "Replacement PAN", "file": _upload(name="replacement.pdf"), "document_number": "ABCDE1234F", "issued_on": None, "expires_on": None},
        )

        withdrawn = withdraw_self_service_employee_document(self.employee, item=replacement)

        current.refresh_from_db()
        self.assertEqual(withdrawn.status, EmployeeDocumentStatus.WITHDRAWN)
        self.assertEqual(current.status, EmployeeDocumentStatus.ACTIVE)
        self.assertEqual(current.verification_status, VerificationStatus.VERIFIED)
        self.assertTrue(DocumentLifecycleAuditEvent.objects.filter(employee_document=withdrawn, event_type=DocumentLifecycleEventType.REPLACEMENT_WITHDRAWN, actor_identifier="EMP-200").exists())
        self.assertTrue(Notification.objects.filter(subject_identifier=str(withdrawn.id), recipient_membership=self.hr_membership, payload__record_status=EmployeeDocumentStatus.WITHDRAWN).exists())
        repeated = withdraw_self_service_employee_document(self.employee, item=withdrawn)
        self.assertEqual(repeated.status, EmployeeDocumentStatus.WITHDRAWN)
        self.assertEqual(DocumentLifecycleAuditEvent.objects.filter(employee_document=withdrawn, event_type=DocumentLifecycleEventType.REPLACEMENT_WITHDRAWN).count(), 1)

    def test_employee_cannot_withdraw_approved_or_other_employee_document(self):
        document = create_self_service_employee_document(
            self.employee,
            {"category_id": self.category.id, "title": "PAN", "file": _upload(), "document_number": "ABCDE1234F", "issued_on": None, "expires_on": None},
        )
        with self.assertRaisesMessage(ValidationError, "Only a pending replacement can be withdrawn"):
            withdraw_self_service_employee_document(self.employee, item=document)

        other_user = User.objects.create_user(username="other-doc-user", email="other@example.com", password="test-pass")
        other_membership = TenantMembership.objects.create(tenant=self.tenant, user=other_user, status=MembershipStatus.ACTIVE, employee_code="EMP-201")
        other_employee = Employee.objects.create(tenant=self.tenant, membership=other_membership, employee_code="EMP-201", first_name="Other", employment_status=EmploymentStatus.ACTIVE)
        document.status = EmployeeDocumentStatus.PENDING_REPLACEMENT
        document.save(update_fields=["status", "updated_at"])
        with self.assertRaisesMessage(ValidationError, "Document not found"):
            withdraw_self_service_employee_document(other_employee, item=document)

    def test_rejection_requires_reason_and_does_not_mutate_document(self):
        document = create_self_service_employee_document(
            self.employee,
            {"category_id": self.category.id, "title": "PAN", "file": _upload(), "document_number": "ABCDE1234F", "issued_on": None, "expires_on": None},
        )
        with self.assertRaisesMessage(ValidationError, "A rejection reason is required"):
            save_hr_admin_employee_document(self.hr_employee, {"verification_status": VerificationStatus.REJECTED}, item=document)
        document.refresh_from_db()
        self.assertEqual(document.verification_status, VerificationStatus.PENDING)

    def test_document_lifecycle_events_record_submission_and_review(self):
        document = create_self_service_employee_document(
            self.employee,
            {"category_id": self.category.id, "title": "PAN", "file": _upload(), "document_number": "ABCDE1234F", "issued_on": None, "expires_on": None},
        )
        save_hr_admin_employee_document(self.hr_employee, {"verification_status": VerificationStatus.VERIFIED}, item=document)
        event_types = list(document.lifecycle_events.values_list("event_type", flat=True))
        self.assertIn(DocumentLifecycleEventType.UPLOADED, event_types)
        self.assertIn(DocumentLifecycleEventType.VERIFICATION_UPDATED, event_types)

    def test_second_pending_replacement_is_rejected_without_changing_current_document(self):
        current = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "title": "Approved PAN",
                "file": _upload(),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )
        save_hr_admin_employee_document(
            self.hr_employee,
            {"verification_status": VerificationStatus.VERIFIED},
            item=current,
        )
        create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "replace_document_id": current.id,
                "title": "First replacement",
                "file": _upload(name="first.pdf", content=b"%PDF-1.4\nfirst\n%%EOF"),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )

        with self.assertRaisesMessage(ValidationError, "A replacement is already awaiting review"):
            create_self_service_employee_document(
                self.employee,
                {
                    "category_id": self.category.id,
                    "replace_document_id": current.id,
                    "title": "Second replacement",
                    "file": _upload(name="second.pdf", content=b"%PDF-1.4\nsecond\n%%EOF"),
                    "document_number": "ABCDE1234F",
                    "issued_on": None,
                    "expires_on": None,
                },
            )

        current.refresh_from_db()
        self.assertEqual(current.status, EmployeeDocumentStatus.ACTIVE)
        self.assertEqual(current.verification_status, VerificationStatus.VERIFIED)
        requirement = DocumentRequirementRule.objects.create(
            tenant=self.tenant,
            category=self.category,
            is_mandatory=True,
        )
        runtime = _get_employee_document_requirement_runtime(self.employee)
        self.assertEqual(len(runtime), 1)
        self.assertEqual(runtime[0]["rule_id"], str(requirement.id))
        self.assertEqual(runtime[0]["current_document_id"], current.id)
        self.assertIsNotNone(runtime[0]["pending_replacement_id"])

    def test_employee_replacement_respects_hr_only_category_policy(self):
        current = create_self_service_employee_document(
            self.employee,
            {
                "category_id": self.category.id,
                "title": "PAN",
                "file": _upload(),
                "document_number": "ABCDE1234F",
                "issued_on": None,
                "expires_on": None,
            },
        )
        self.category.replacement_policy = DocumentReplacementPolicy.HR_ONLY
        self.category.save(update_fields=["replacement_policy", "updated_at"])

        with self.assertRaisesMessage(ValidationError, "Only HR can replace documents"):
            create_self_service_employee_document(
                self.employee,
                {
                    "category_id": self.category.id,
                    "replace_document_id": current.id,
                    "title": "Replacement PAN",
                    "file": _upload(name="replacement.pdf", content=b"%PDF-1.4\nreplacement\n%%EOF"),
                    "document_number": "ABCDE1234F",
                    "issued_on": None,
                    "expires_on": None,
                },
            )

        current.refresh_from_db()
        self.assertEqual(current.status, EmployeeDocumentStatus.ACTIVE)

    def test_category_upload_size_limit_is_enforced(self):
        self.category.max_upload_size_bytes = 12
        self.category.save(update_fields=["max_upload_size_bytes", "updated_at"])

        with self.assertRaisesMessage(ValidationError, "Uploaded file exceeds the 12 byte limit"):
            create_self_service_employee_document(
                self.employee,
                {
                    "category_id": self.category.id,
                    "title": "PAN",
                    "file": _upload(),
                    "document_number": "ABCDE1234F",
                    "issued_on": None,
                    "expires_on": None,
                },
            )

        self.assertFalse(EmployeeDocument.objects.filter(employee=self.employee, category=self.category).exists())

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

    def test_local_signature_scan_marks_clean_artifact_downloadable(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root), patch.dict(
            "os.environ", {"HRMS_DOCUMENT_MALWARE_SCAN_MODE": "local_signature"}
        ):
            document = create_self_service_employee_document(
                self.employee,
                {
                    "category_id": self.category.id,
                    "title": "Clean PAN",
                    "file": _upload(),
                    "document_number": "ABCDE1234F",
                    "issued_on": None,
                    "expires_on": None,
                },
            )

        self.assertEqual(document.artifact.malware_scan_status, DocumentMalwareScanStatus.CLEAN)
        self.assertTrue(document_artifact_is_downloadable(document.artifact))

    def test_local_signature_scan_quarantines_detected_artifact(self):
        infected_content = b"%PDF-1.4\nEICAR-STANDARD-ANTIVIRUS-TEST-FILE\n%%EOF"
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root), patch.dict(
            "os.environ", {"HRMS_DOCUMENT_MALWARE_SCAN_MODE": "local_signature"}
        ):
            document = create_self_service_employee_document(
                self.employee,
                {
                    "category_id": self.category.id,
                    "title": "Unsafe PAN",
                    "file": _upload(content=infected_content),
                    "document_number": "ABCDE1234F",
                    "issued_on": None,
                    "expires_on": None,
                },
            )

        self.assertEqual(document.artifact.malware_scan_status, DocumentMalwareScanStatus.QUARANTINED)
        self.assertFalse(document_artifact_is_downloadable(document.artifact))
        self.assertNotIn("EICAR", str(document.artifact.metadata))

    def test_required_external_scanner_fails_closed(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root), patch.dict(
            "os.environ", {"HRMS_DOCUMENT_MALWARE_SCAN_MODE": "required_external"}
        ):
            document = create_self_service_employee_document(
                self.employee,
                {
                    "category_id": self.category.id,
                    "title": "Held PAN",
                    "file": _upload(),
                    "document_number": "ABCDE1234F",
                    "issued_on": None,
                    "expires_on": None,
                },
            )

        self.assertEqual(document.artifact.malware_scan_status, DocumentMalwareScanStatus.ERROR)
        self.assertFalse(document_artifact_is_downloadable(document.artifact))
        with self.assertRaisesMessage(ValidationError, "malware scanning"):
            save_hr_admin_employee_document(
                self.hr_employee,
                {"verification_status": VerificationStatus.VERIFIED},
                item=document,
            )
