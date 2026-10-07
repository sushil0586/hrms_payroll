from datetime import date, timedelta
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone

from apps.common.api_views import (
    _send_document_expiry_attention_reminder,
    create_self_service_employee_document,
    save_hr_admin_employee_document,
)
from apps.documents.models import DocumentCategory, DocumentVerificationLog, EmployeeDocumentStatus, VerificationStatus
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership, User
from apps.notifications.models import Notification
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus


def _upload(name="proof.pdf", content=b"document-bytes", content_type="application/pdf"):
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
                "file": _upload(name="replacement.pdf", content=b"replacement"),
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
