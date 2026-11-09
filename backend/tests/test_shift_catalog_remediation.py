"""Focused unused-shift deletion, history protection and duplicate-code contracts."""
from unittest.mock import patch
from uuid import uuid4
import pytest
from django.db import connection
from apps.attendance.models import Shift, AttendancePolicy, ShiftRosterTemplate
from apps.common.models import SaasCommercialAuditEvent
from apps.tenants.models import Tenant
from test_shift_p5_closure import scope, SH

pytestmark = pytest.mark.django_db(transaction=True)

def unused(tenant):
    return Shift.objects.create(tenant=tenant, code='unused-'+uuid4().hex[:8], name='Synthetic unused', start_time='09:00', end_time='18:00')

def test_unused_delete_audit_and_replay(scope, record_property):
    tenant, actor, client = scope
    with connection.cursor() as cursor:
        cursor.execute('SELECT current_database(), current_user, current_schema(), version()')
        record_property('postgresql_identity', str(cursor.fetchone()))
    item=unused(tenant); identity=str(item.id)
    assert client.delete(f'{SH}{identity}/').status_code==200
    assert not Shift.objects.filter(id=identity).exists()
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_type='attendance_shift_deleted',event_snapshot__shift_id=identity).count()==1
    assert client.delete(f'{SH}{identity}/').status_code==404

@pytest.mark.parametrize('usage',['seeded','policy','roster'])
def test_used_shift_blocked_without_mutation(scope,usage):
    tenant, actor, client=scope
    if usage=='seeded': item=tenant.shifts.first()
    else:
        item=unused(tenant)
        if usage=='policy': AttendancePolicy.objects.create(tenant=tenant,code='ref-policy',name='Reference',default_shift=item)
        else: ShiftRosterTemplate.objects.create(tenant=tenant,code='ref-roster',name='Reference',shift=item)
    before=SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()
    assert client.delete(f'{SH}{item.id}/').status_code==409
    assert Shift.objects.filter(id=item.id).exists()
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()==before

def test_platform_and_foreign_delete_rejected(scope):
    tenant, actor, client=scope; item=unused(tenant);item.managed_by_platform=True;item.save()
    assert client.delete(f'{SH}{item.id}/').status_code==409
    foreign=Tenant.objects.create(code='foreign-'+uuid4().hex[:8],name='Synthetic foreign tenant')
    foreign_item=unused(foreign)
    assert client.delete(f'{SH}{foreign_item.id}/').status_code==404
    assert Shift.objects.filter(id=foreign_item.id).exists()
    assert Shift.objects.filter(id=item.id).exists()

def test_delete_requires_manage_permission(scope):
    tenant, actor, client=scope; item=unused(tenant)
    client.force_authenticate(tenant.employees.get(employee_code='QA-EMP-001').membership.user)
    assert client.delete(f'{SH}{item.id}/').status_code==403
    assert Shift.objects.filter(id=item.id).exists()

def test_delete_audit_failure_rolls_back(scope):
    tenant, actor, client=scope; item=unused(tenant)
    with patch('apps.common.api_views._record_hr_admin_setup_audit_event',side_effect=RuntimeError('synthetic audit outage')):
        with pytest.raises(RuntimeError,match='synthetic audit outage'):client.delete(f'{SH}{item.id}/')
    assert Shift.objects.filter(id=item.id).exists()

def test_duplicate_code_preserves_original(scope):
    tenant, actor, client=scope; item=unused(tenant)
    response=client.post(SH,dict(code=item.code,name='Duplicate',start_time='09:00',end_time='18:00'),format='json')
    assert response.status_code==400
    assert response.data['code']=='A shift with this code already exists.'
    assert Shift.objects.filter(tenant=tenant,code=item.code).count()==1
