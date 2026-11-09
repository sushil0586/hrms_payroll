"""WF-E isolated current document configuration and reminder contracts."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import patch
import pytest
from django.db import close_old_connections
from django.utils import timezone
from rest_framework.test import APIClient
from apps.documents.models import DocumentCategory, DocumentRequirementRule, EmployeeDocument, VerificationStatus
from apps.employees.models import Employee
from apps.notifications.models import Notification
from apps.common.api_views import _send_document_expiry_attention_reminder
from tests.test_phase0_api_smoke import api_client, bootstrapped_workspace, login

@pytest.mark.django_db
def test_category_duplicate_is_readable_and_does_not_mutate(api_client,bootstrapped_workspace):
    api_client.credentials(HTTP_AUTHORIZATION='Token '+login(api_client,'nisha.rao'))
    payload={'code':'wfe-unique','name':'WF-E category'}
    first=api_client.post('/api/v1/hr-admin/document-categories/',payload,format='json');assert first.status_code==201
    before=DocumentCategory.objects.count()
    api_client.raise_request_exception=False
    second=api_client.post('/api/v1/hr-admin/document-categories/',payload,format='json')
    assert second.status_code==400
    assert 'code' in second.json()
    assert DocumentCategory.objects.count()==before

@pytest.mark.django_db
def test_category_requirement_edit_deactivate_and_tenant_role_denial(api_client,bootstrapped_workspace):
    api_client.credentials(HTTP_AUTHORIZATION='Token '+login(api_client,'nisha.rao'))
    first=api_client.post('/api/v1/hr-admin/document-categories/',{'code':'wfe-life','name':'WF-E lifecycle'},format='json');assert first.status_code==201
    cid=first.json()['id'];r=api_client.post('/api/v1/hr-admin/document-requirements/',{'category_id':cid,'is_mandatory':True},format='json');assert r.status_code==201
    rid=r.json()['id']
    for url in [f'/api/v1/hr-admin/document-categories/{cid}/',f'/api/v1/hr-admin/document-requirements/{rid}/']:
        assert api_client.patch(url,{'is_active':False},format='json').status_code==200
        assert api_client.get(url).json()['is_active'] is False
    assert DocumentCategory.objects.filter(pk=cid).exists() and DocumentRequirementRule.objects.filter(pk=rid).exists()
    api_client.credentials(HTTP_AUTHORIZATION='Token '+login(api_client,'riya.sharma'))
    assert api_client.patch(f'/api/v1/hr-admin/document-categories/{cid}/',{'name':'bad'},format='json').status_code in [403,404]
    assert DocumentCategory.objects.get(pk=cid).name=='WF-E lifecycle'

@pytest.mark.django_db(transaction=True)
def test_concurrent_document_reminder_is_single_targeted_notification(tmp_path,settings):
    from django.core.management import call_command
    call_command('bootstrap_demo_workspace',password='wfe-private-test')
    e=Employee.objects.get(employee_code='EMP-0042')
    c=DocumentCategory.objects.create(tenant=e.tenant,code='wfe-reminder',name='WF-E reminder',requires_expiry_date=True)
    d=EmployeeDocument.objects.create(tenant=e.tenant,employee=e,category=c,title='Synthetic reminder',expires_on=timezone.localdate()+timedelta(days=2),verification_status=VerificationStatus.VERIFIED)
    def send(_):
        close_old_connections()
        try:return _send_document_expiry_attention_reminder(document=EmployeeDocument.objects.get(pk=d.pk),reminder_source='wfe_concurrent')
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=2) as pool:outcomes=list(pool.map(send,range(2)))
    assert sorted(outcomes)==[False,True]
    notifications=Notification.objects.filter(tenant=e.tenant,subject_identifier=str(d.id),payload__reminder_key__isnull=False)
    assert notifications.count()==1
    assert notifications.get().recipient_identifier==e.membership.user.username

@pytest.mark.django_db
def test_category_and_requirement_foreign_tenant_selections_are_denied(api_client,bootstrapped_workspace):
    from apps.tenants.models import Tenant, TenantStatus, SubscriptionPlan
    foreign=Tenant.objects.create(code='wfe-foreign',name='WF-E foreign',legal_name='Synthetic',status=TenantStatus.ACTIVE,subscription_plan=SubscriptionPlan.GROWTH,country_code='IN',timezone='Asia/Kolkata')
    category=DocumentCategory.objects.create(tenant=foreign,code='foreign',name='Private category')
    rule=DocumentRequirementRule.objects.create(tenant=foreign,category=category)
    api_client.credentials(HTTP_AUTHORIZATION='Token '+login(api_client,'nisha.rao'))
    before=DocumentRequirementRule.objects.count()
    for url in [f'/api/v1/hr-admin/document-categories/{category.id}/',f'/api/v1/hr-admin/document-requirements/{rule.id}/']:
        assert api_client.get(url).status_code==404
        assert api_client.patch(url,{'is_active':False},format='json').status_code==404
    denied=api_client.post('/api/v1/hr-admin/document-requirements/',{'category_id':str(category.id)},format='json')
    assert denied.status_code==400
    assert DocumentRequirementRule.objects.count()==before
    category.refresh_from_db();rule.refresh_from_db();assert category.is_active and rule.is_active
