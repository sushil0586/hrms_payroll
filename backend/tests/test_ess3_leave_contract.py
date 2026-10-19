"""Employee leave isolation against PostgreSQL, using genuine self endpoints."""
from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from apps.leave_management.models import LeaveRequest, LeaveType, LeaveBalanceTransaction


class Ess3LeaveContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from tests.test_ess1_profile_contract import Ess1SelfProfileContractTests
        Ess1SelfProfileContractTests.setUpTestData.__func__(cls)
        cls.requests = []
        for _, employee in cls.actors:
            leave_type, _ = LeaveType.objects.get_or_create(tenant=employee.tenant, code="ess3", defaults={"name": "Synthetic leave"})
            cls.requests.append(LeaveRequest.objects.create(tenant=employee.tenant, employee=employee, leave_type=leave_type,
                start_date=date(2026, 11, 2), end_date=date(2026, 11, 2), requested_units=1, reason=f"Private {employee.employee_code}", status="rejected"))

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.actors[0][0])

    def test_list_cannot_be_retargeted_to_another_employee_or_tenant(self):
        for item in self.requests[1:]:
            result = self.client.get('/api/v1/me/leave-requests/', {'employee_id': item.employee_id, 'tenant_id': item.tenant_id})
            self.assertEqual(result.status_code, 200)
            self.assertEqual([row['id'] for row in result.json()['items']], [str(self.requests[0].id)])

    def test_detail_and_lifecycle_actions_reject_foreign_ids(self):
        for item in self.requests[1:]:
            path = f'/api/v1/me/leave-requests/{item.id}/'
            self.assertEqual(self.client.get(path).status_code, 404)
            for action in ('withdraw', 'cancel'):
                self.assertEqual(self.client.post(f'{path}{action}/', {'reason': 'unauthorized'}, format='json').status_code, 404)
            item.refresh_from_db()
            self.assertEqual(item.status, 'rejected')

    def test_read_and_unsupported_edits_preserve_request_and_ledger(self):
        item = self.requests[0]
        before = LeaveBalanceTransaction.objects.count()
        path = f'/api/v1/me/leave-requests/{item.id}/'
        self.assertEqual(self.client.get(path).json()['reason'], item.reason)
        for method in (self.client.patch, self.client.put, self.client.delete):
            self.assertEqual(method(path, {'status': 'approved'}, format='json').status_code, 405)
        item.refresh_from_db()
        self.assertEqual(item.status, 'rejected')
        self.assertEqual(LeaveBalanceTransaction.objects.count(), before)

    def test_rejected_request_cannot_be_withdrawn_or_cancelled(self):
        for action in ('withdraw', 'cancel'):
            result = self.client.post(f'/api/v1/me/leave-requests/{self.requests[0].id}/{action}/', {'reason': 'invalid'}, format='json')
            self.assertEqual(result.status_code, 400)

    def test_anonymous_reads_and_mutations_are_denied(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get('/api/v1/me/leave-requests/').status_code, (401, 403))
        self.assertIn(self.client.post('/api/v1/me/leave-requests/', {}, format='json').status_code, (401, 403))

    def test_evidence_download_requires_matching_request_employee_and_tenant(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.documents.services import store_document_artifact
        from apps.common.api_views import _append_leave_attachment_metadata
        for index, (user, employee) in enumerate(self.actors):
            artifact = store_document_artifact(tenant=employee.tenant, employee=employee,
                uploaded_file=SimpleUploadedFile('ess3-synthetic.txt', b'Synthetic private evidence', content_type='text/plain'),
                actor_identifier=str(user.pk))
            try:
                _append_leave_attachment_metadata(leave_request=self.requests[index], artifact=artifact, action='leave_request')
                path = f'/api/v1/me/leave-requests/{self.requests[index].id}/attachments/{artifact.id}/download/'
                self.client.force_authenticate(self.actors[0][0])
                result = self.client.get(path)
                self.assertEqual(result.status_code, 200 if index == 0 else 404)
                if index == 0:
                    self.assertEqual(b''.join(result.streaming_content), b'Synthetic private evidence')
                # An owned request ID cannot be paired with someone else's artifact.
                if index:
                    result = self.client.get(f'/api/v1/me/leave-requests/{self.requests[0].id}/attachments/{artifact.id}/download/')
                    self.assertEqual(result.status_code, 404)
            finally:
                storage, key = artifact.stored_file.storage, artifact.stored_file.name
                artifact.stored_file.delete(save=False)
                self.assertFalse(storage.exists(key))
