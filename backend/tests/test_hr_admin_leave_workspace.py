"""Leave option codes must survive the existing authorized option projection."""
from contextlib import redirect_stdout
from io import StringIO
from uuid import uuid4
import pytest
from django.core.management import call_command
from rest_framework.test import APIClient
from apps.tenants.models import Tenant
from apps.common.api_serializers import HrAdminOptionItemSerializer


def test_generic_options_without_code_keep_their_existing_shape():
    identifier = uuid4()
    assert HrAdminOptionItemSerializer({'id':identifier,'name':'Department'}).data == {'id':str(identifier),'name':'Department','legal_entity_id':None,'location_id':None,'business_unit_id':None,'grade_id':None,'calendar_id':None}


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize('url', ['/api/v1/hr-admin/policy-options/', '/api/v1/hr-admin/policy-workbench-options/?include=leave_types'])
def test_leave_type_codes_and_tenant_scope_survive_option_serialization(url):
    tenants=[]
    for _ in range(2):
        seed=f'leave-ui-{uuid4().hex[:10]}'
        with redirect_stdout(StringIO()):
            call_command('manage_playwright_workspace',seed_ref=seed)
        tenants.append(Tenant.objects.get(code=f'pw-qa-{seed}'))
    tenant, foreign = tenants
    actor=tenant.employees.get(employee_code='QA-HR-001')
    client=APIClient();client.force_authenticate(actor.membership.user)
    result=client.get(url)
    assert result.status_code==200
    own={str(item.id):item.code for item in tenant.leave_types.filter(is_active=True)}
    assert own
    assert {item['id']:item.get('code') for item in result.data['leave_types']}==own
    assert not {str(item.id) for item in foreign.leave_types.all()}.intersection(item['id'] for item in result.data['leave_types'])
