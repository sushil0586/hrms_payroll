"""Integrity-only shared assignment writer regression; no Rosters certification."""
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier
import pytest
from django.db import close_old_connections
from rest_framework.test import APIClient
from apps.attendance.models import EmployeeShiftAssignment, ShiftRosterTemplate
from apps.attendance.services import preview_shift_roster_template_rollout
from apps.common.models import SaasCommercialAuditEvent
from test_shift_p5_closure import scope, AS

pytestmark=pytest.mark.django_db(transaction=True)

@pytest.mark.parametrize('repeat',range(3))
def test_shared_bulk_writer_and_api_share_employee_lock(scope,repeat,record_property):
    tenant,actor,_=scope;employee=tenant.employees.get(employee_code='QA-MGR-002');shift=tenant.shifts.first();barrier=Barrier(2)
    template=ShiftRosterTemplate.objects.create(tenant=tenant,code='p6-shared',name='Synthetic shared writer',shift=shift)
    before=SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()
    def write(bulk):
        close_old_connections()
        try:
            barrier.wait(timeout=15)
            if bulk:
                result=preview_shift_roster_template_rollout(tenant=tenant,template=template,employee_queryset=tenant.employees.filter(id=employee.id),effective_from=date(2055,1,1),effective_to=date(2055,1,31),is_primary=True,actor=actor,dry_run=False)
                return dict(writer='shared bulk',created=result['created_count'],skipped=result['skipped_count'],rollout_id=result['rollout_id'])
            client=APIClient();client.force_authenticate(actor.membership.user)
            response=client.post(AS,dict(employee_id=str(employee.id),shift_id=str(shift.id),effective_from='2055-01-01',effective_to='2055-01-31',is_primary=True),format='json')
            return dict(writer='api',status=response.status_code,created=int(response.status_code==201))
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(write,[True,False]))
    assert sum(result['created'] for result in results)==1,results
    assert EmployeeShiftAssignment.objects.filter(tenant=tenant,employee=employee,effective_from=date(2055,1,1),is_primary=True).count()==1
    api=next(row for row in results if row['writer']=='api')
    assert api['status'] in (201,400)
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()==before+api['created']
    record_property('shared_writer_reconciliation',json.dumps(results))


def test_shared_writer_preserves_code_order_and_exact_selected_population(scope):
    tenant,actor,_=scope;employees=tenant.employees.filter(employee_code__in=['QA-HR-001','QA-MGR-002']);shift=tenant.shifts.first()
    template=ShiftRosterTemplate.objects.create(tenant=tenant,code='p6-order',name='Synthetic selected population',shift=shift)
    result=preview_shift_roster_template_rollout(tenant=tenant,template=template,employee_queryset=employees,effective_from=date(2056,1,1),effective_to=date(2056,1,31),is_primary=False,actor=actor,dry_run=False)
    assert result['target_count']==2 and result['created_count']==2
    assert [item['employee_code'] for item in result['items']]==['QA-HR-001','QA-MGR-002']
    assert {row['employee_id'] for row in result['items']}=={str(value) for value in employees.values_list('id',flat=True)}
