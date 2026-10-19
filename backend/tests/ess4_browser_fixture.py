"""Synthetic ESS4 display fixtures, restricted to the disposable loopback database."""
import json
from datetime import date
from django.conf import settings
from django.utils import timezone
from apps.tenants.models import Tenant
from apps.payroll.models import PayrollRun, PayrollRunCalculation, PayrollRunReview, PayrollOutputBatch, PayrollOutputArtifact
from apps.documents.models import DocumentCategory, DocumentRequirementRule, EmployeeDocument
from tests.ess2_browser_fixture import prepare as attendance_prepare


def prepare(manifest_path):
    if settings.DATABASES['default']['NAME'] != 'hrms_ess2' or settings.DATABASES['default']['HOST'] != '127.0.0.1':
        raise RuntimeError('ESS4 requires dedicated loopback database')
    closed = attendance_prepare(manifest_path)
    with open(manifest_path) as handle:
        manifest = json.load(handle)
    tenant = Tenant.objects.get(pk=manifest['tenant']['id'], code__startswith='pw-qa-')
    employee = tenant.employees.get(pk=manifest['credentials']['employee']['employee_id'])
    run = PayrollRun.objects.get(pk=manifest['fixtures']['payroll_run_id'], tenant=tenant)
    calculation = PayrollRunCalculation.objects.create(tenant=tenant, payroll_run=run, status='completed', calculated_at=timezone.now())
    review = PayrollRunReview.objects.create(tenant=tenant, payroll_run=run, calculation=calculation, status='locked', locked_at=timezone.now())
    run.status = 'locked'
    run.save()
    batch = PayrollOutputBatch.objects.create(tenant=tenant, payroll_run=run, review=review)
    lines = [{'component_code': f'QA{i}', 'component_name': f'Synthetic line {i}', 'amount': '100.25', 'line_type': 'earning'} for i in range(8)]
    for i in range(7):
        PayrollOutputArtifact.objects.create(tenant=tenant, output_batch=batch, payroll_run=run, review=review,
            employee=employee, artifact_key=f'ess4-{i}', title=f'QA Published Payslip {i}', file_name=f'qa-payslip-{i}.html',
            content_type='text/html', mime_type='text/html', file_payload='<html><body>Synthetic private payroll document</body></html>',
            status='published', totals_snapshot={'gross_earnings': '30000.75', 'employee_deductions': '1800.25', 'net_pay': '28200.50'}, line_snapshot=lines)
    PayrollOutputArtifact.objects.create(tenant=tenant, output_batch=batch, payroll_run=run, review=review,
        employee=employee, artifact_key='unpublished', title='QA Unpublished Secret', status='generated')
    for code, name, allowed in [('ess4-upload', 'QA Employee Evidence', True), ('ess4-hr-only', 'QA HR Controlled', False)]:
        category = DocumentCategory.objects.create(tenant=tenant, code=code, name=name, allow_employee_upload=allowed, requires_expiry_date=allowed)
        DocumentRequirementRule.objects.create(tenant=tenant, category=category)
    category = tenant.document_categories.get(code='ess4-upload')
    for i in range(11):
        EmployeeDocument.objects.create(tenant=tenant, employee=employee, category=category, title=f'QA Archived Evidence {i}',
            verification_status='verified', status='archived', expires_on=date(2020, 1, 1))
    return closed


def verify_outputs(tenant_id):
    import hashlib
    tenant = Tenant.objects.get(pk=tenant_id, code__startswith='pw-qa-')
    items = list(PayrollOutputArtifact.objects.filter(tenant=tenant, status='published'))
    assert len(items) == 7
    for item in items:
        assert item.source_hash == item._artifact_digest()
        assert item.totals_snapshot == {'gross_earnings': '30000.75', 'employee_deductions': '1800.25', 'net_pay': '28200.50'}
        assert len(item.line_snapshot) == 8
        assert item.checksum_sha256 == hashlib.sha256(item.file_payload.encode()).hexdigest()
    return True
