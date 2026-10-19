"""ESS4 direct self/tenant document authorization with genuine stored evidence."""
from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from apps.documents.models import DocumentCategory, DocumentRequirementRule, EmployeeDocument
from apps.documents.services import store_document_artifact


class Ess4DocumentContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from tests.test_ess1_profile_contract import Ess1SelfProfileContractTests
        Ess1SelfProfileContractTests.setUpTestData.__func__(cls)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.actors[0][0])

    def test_center_cannot_be_retargeted_to_foreign_employee_or_tenant(self):
        for index, (_, employee) in enumerate(self.actors):
            category, _ = DocumentCategory.objects.get_or_create(tenant=employee.tenant, code='ess4-private', defaults={'name': 'Private evidence'})
            EmployeeDocument.objects.create(tenant=employee.tenant, employee=employee, category=category, title=f'Private {index}')
        for _, other in self.actors[1:]:
            result = self.client.get('/api/v1/me/document-center/', {'employee_id': other.id, 'tenant_id': other.tenant_id})
            self.assertEqual(result.status_code, 200)
            self.assertEqual([item['title'] for item in result.json()['items']], ['Private 0'])

    def test_download_owns_employee_and_tenant_and_deletes_physical_files(self):
        for index, (user, employee) in enumerate(self.actors):
            category, _ = DocumentCategory.objects.get_or_create(tenant=employee.tenant, code='ess4-file', defaults={'name': 'Private file'})
            artifact = store_document_artifact(tenant=employee.tenant, employee=employee,
                uploaded_file=SimpleUploadedFile('ess4-private.txt', b'Private ESS4 file', content_type='text/plain'), actor_identifier=str(user.pk))
            try:
                document = EmployeeDocument.objects.create(tenant=employee.tenant, employee=employee, category=category, artifact=artifact, title='Private file')
                result = self.client.get(f'/api/v1/me/employee-documents/{document.id}/download/')
                self.assertEqual(result.status_code, 200 if index == 0 else 404)
                if index == 0:
                    self.assertEqual(b''.join(result.streaming_content), b'Private ESS4 file')
            finally:
                storage, key = artifact.stored_file.storage, artifact.stored_file.name
                storage.delete(key)
                self.assertFalse(storage.exists(key))

    def test_foreign_category_and_disabled_self_upload_are_rejected_without_artifacts(self):
        own = self.actors[0][1]
        foreign = self.actors[-1][1]
        for employee, allowed in [(foreign, True), (own, False)]:
            category = DocumentCategory.objects.create(tenant=employee.tenant, code='ess4-blocked', name='Blocked', allow_employee_upload=allowed)
            DocumentRequirementRule.objects.create(tenant=employee.tenant, category=category)
            result = self.client.post('/api/v1/me/employee-documents/', {'category_id': str(category.id), 'title': 'Unsafe', 'file': SimpleUploadedFile('proof.txt', b'No')}, format='multipart')
            self.assertEqual(result.status_code, 400)
        self.assertEqual(EmployeeDocument.objects.count(), 0)

    def test_anonymous_documents_and_payroll_fail_closed(self):
        self.client.force_authenticate(None)
        for path in ['/api/v1/me/document-center/', '/api/v1/me/payroll-payslips/']:
            self.assertIn(self.client.get(path).status_code, (401, 403))
        self.assertIn(self.client.post('/api/v1/me/employee-documents/', {}, format='multipart').status_code, (401, 403))

    def test_document_center_and_history_do_not_grant_edit_or_delete(self):
        for method in [self.client.patch, self.client.put, self.client.delete]:
            self.assertEqual(method('/api/v1/me/document-center/', {}, format='json').status_code, 405)
        self.assertEqual(EmployeeDocument.objects.count(), 0)

    def test_payroll_self_scope_and_unpublished_read_download_signed_actions(self):
        from datetime import date
        from django.core.exceptions import ValidationError
        from apps.payroll.models import PayrollCalendar, PayrollPeriod, PayrollRun, PayrollRunCalculation, PayrollRunReview, PayrollOutputBatch, PayrollOutputArtifact
        artifacts = []
        for index, (_, employee) in enumerate(self.actors):
            calendar, _ = PayrollCalendar.objects.get_or_create(tenant=employee.tenant, code=f'ess4-{index}', defaults={'name':'Synthetic calendar'})
            period = PayrollPeriod.objects.create(tenant=employee.tenant, calendar=calendar, code=f'ess4-{index}', name='Synthetic period', start_date=date(2026,9,1), end_date=date(2026,9,30), pay_date=date(2026,10,1))
            run = PayrollRun.objects.create(tenant=employee.tenant, period=period, code=f'ess4-{index}', name='Synthetic run')
            calculation = PayrollRunCalculation.objects.create(tenant=employee.tenant, payroll_run=run, status='completed', calculated_at=timezone.now())
            review = PayrollRunReview.objects.create(tenant=employee.tenant, payroll_run=run, calculation=calculation, status='locked', locked_at=timezone.now())
            run.status = 'locked'
            run.save()
            batch = PayrollOutputBatch.objects.create(tenant=employee.tenant, payroll_run=run, review=review)
            artifact = PayrollOutputArtifact.objects.create(tenant=employee.tenant, payroll_run=run, review=review, output_batch=batch, employee=employee,
                artifact_key=f'ess4-{index}', title=f'Private payroll {index}', status='published', supports_signed_url=True, download_strategy_ref='payroll.download.signed_url.v1', file_payload='Synthetic payroll', totals_snapshot={'net_pay':'12.25'})
            artifacts.append(artifact)
        for index, artifact in enumerate(artifacts):
            listing = self.client.get('/api/v1/me/payroll-payslips/', {'employee_id': artifact.employee_id, 'tenant_id': artifact.tenant_id})
            self.assertEqual(listing.status_code, 200)
            self.assertEqual([item['id'] for item in listing.json()['items']], [str(artifacts[0].id)])
            path = f'/api/v1/me/payroll-payslips/{artifact.id}/'
            self.assertEqual(self.client.get(f'{path}download/').status_code, 200 if index == 0 else 404)
            self.assertEqual(self.client.post(f'{path}read/', {}, format='json').status_code, 200 if index == 0 else 404)
            if index:
                self.assertEqual(self.client.post(f'{path}signed-access/', {}, format='json').status_code, 404)
        own = artifacts[0]
        from datetime import timedelta
        from apps.payroll.models import PayrollArtifactSignedAccessGrant
        path = f'/api/v1/me/payroll-payslips/{own.id}/'
        issue = self.client.post(f'{path}signed-access/', {'max_access_count':1}, format='json')
        self.assertEqual(issue.status_code, 201)
        self.assertEqual(self.client.get(issue.json()['signed_url']).status_code, 200)
        self.assertEqual(self.client.get(issue.json()['signed_url']).status_code, 403)
        issue = self.client.post(f'{path}signed-access/', {}, format='json')
        self.assertEqual(issue.status_code, 201)
        grant = PayrollArtifactSignedAccessGrant.objects.get(pk=issue.json()['grant']['id'])
        grant.expires_at = timezone.now() - timedelta(seconds=1)
        grant.save(update_fields=['expires_at', 'updated_at'])
        self.assertEqual(self.client.get(issue.json()['signed_url']).status_code, 403)
        own.totals_snapshot = {'net_pay':'999999.99'}
        with self.assertRaises(ValidationError):
            own.save()
        own.refresh_from_db()
        self.assertEqual(own.totals_snapshot, {'net_pay':'12.25'})
        unpublished = PayrollOutputArtifact.objects.create(tenant=own.tenant, payroll_run=own.payroll_run, review=own.review, output_batch=own.output_batch, employee=own.employee, artifact_key='unpublished', title='Hidden', status='generated')
        path = f'/api/v1/me/payroll-payslips/{unpublished.id}/'
        self.assertEqual(self.client.get(f'{path}download/').status_code, 404)
        self.assertEqual(self.client.post(f'{path}read/', {}, format='json').status_code, 404)
        self.assertEqual(self.client.post(f'{path}signed-access/', {}, format='json').status_code, 404)
