"""Scoped PostgreSQL concurrency and rollback regression for the Shift gate."""
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier
from unittest.mock import patch
import pytest
from django.db import close_old_connections, connection
from rest_framework.test import APIClient
from apps.attendance.models import EmployeeShiftAssignment
from apps.common.models import SaasCommercialAuditEvent
from apps.notifications.models import Notification, NotificationDeliveryLog
from test_shift_p5_closure import scope, snapshot, AS

pytestmark = pytest.mark.django_db(transaction=True)

def concurrent(actor, operations):
    barrier = Barrier(len(operations))
    def run(operation):
        close_old_connections()
        try:
            client = APIClient(); client.force_authenticate(actor.membership.user)
            barrier.wait(timeout=15)
            method, url, data = operation
            response = getattr(client, method)(url, data, format="json")
            return response.status_code
        finally:
            close_old_connections()
    with ThreadPoolExecutor(max_workers=len(operations)) as pool:
        return list(pool.map(run, operations))

@pytest.mark.parametrize("repeat", range(5))
@pytest.mark.parametrize("mode", ["create-create", "update-update", "create-update", "move-create"])
def test_competing_primary_writes_have_one_effect(scope, mode, repeat, record_property):
    tenant, actor, client = scope
    assert connection.vendor == "postgresql"
    employee = tenant.employees.get(employee_code="QA-EMP-001")
    EmployeeShiftAssignment.objects.filter(tenant=tenant).delete()
    shift = tenant.shifts.first()
    body = dict(employee_id=str(employee.id), shift_id=str(shift.id), effective_from="2043-01-01", effective_to="2043-01-31", is_primary=True)
    ops=[]
    if mode == "move-create":
        other = tenant.employees.get(employee_code="QA-MGR-001")
        item=EmployeeShiftAssignment.objects.create(tenant=tenant,employee=other,shift=shift,effective_from=date(2043,1,1),effective_to=date(2043,1,31),is_primary=True)
        ops.append(("patch",f"{AS}{item.id}/",{"employee_id":str(employee.id)}))
    elif mode in ("update-update", "create-update"):
        for _ in range(2 if mode=="update-update" else 1):
            item=EmployeeShiftAssignment.objects.create(tenant=tenant,employee=employee,shift=shift,effective_from=date(2043,1,1),effective_to=date(2043,1,31),is_primary=False)
            ops.append(("patch",f"{AS}{item.id}/",{"is_primary":True}))
    while len(ops)<2: ops.append(("post",AS,body))
    before=SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()
    notifications=(Notification.objects.filter(tenant=tenant).count(),NotificationDeliveryLog.objects.filter(notification__tenant=tenant).count())
    statuses=concurrent(actor,ops)
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database(),current_user,current_schema(),current_setting('transaction_isolation'),version()")
        identity=cursor.fetchone()
    record_property("postgresql_reconciliation",json.dumps(dict(mode=mode,repeat=repeat,identity=identity,tenant=str(tenant.id),employee=str(employee.id),statuses=statuses,primary_rows=list(EmployeeShiftAssignment.objects.filter(tenant=tenant,employee=employee,is_primary=True).values('id','effective_from','effective_to')),audit_before=before,audit_after=SaasCommercialAuditEvent.objects.filter(tenant=tenant).count(),notifications_before=notifications,notifications_after=(Notification.objects.filter(tenant=tenant).count(),NotificationDeliveryLog.objects.filter(notification__tenant=tenant).count())),default=str))
    assert (Notification.objects.filter(tenant=tenant).count(),NotificationDeliveryLog.objects.filter(notification__tenant=tenant).count())==notifications
    assert sum(status in (200,201) for status in statuses)==1, statuses
    assert sum(status in (400,409) for status in statuses)==1, statuses
    assert EmployeeShiftAssignment.objects.filter(tenant=tenant,employee=employee,is_primary=True).count()==1
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()==before+1

@pytest.mark.parametrize("end,start,wanted", [("2043-01-31","2043-01-31",400),("2043-01-31","2043-02-01",201),(None,"2044-01-01",400)])
def test_inclusive_adjacency_and_open_end(scope,end,start,wanted):
    tenant,actor,client=scope; employee=tenant.employees.get(employee_code="QA-EMP-001");shift=tenant.shifts.first()
    EmployeeShiftAssignment.objects.filter(employee=employee).delete()
    data=dict(employee_id=str(employee.id),shift_id=str(shift.id),effective_from="2043-01-01",effective_to=end,is_primary=True)
    assert client.post(AS,data,format="json").status_code==201
    before=snapshot(tenant);data.update(effective_from=start,effective_to=None)
    assert client.post(AS,data,format="json").status_code==wanted
    if wanted==400: assert snapshot(tenant)==before


def test_success_audit_failure_rolls_back_assignment(scope):
    tenant,actor,client=scope;employee=tenant.employees.get(employee_code="QA-EMP-001")
    EmployeeShiftAssignment.objects.filter(employee=employee).delete();before=snapshot(tenant)
    with patch("apps.common.api_views._record_hr_admin_setup_audit_event",side_effect=RuntimeError("synthetic audit outage")):
        with pytest.raises(RuntimeError,match="synthetic audit outage"):
            client.post(AS,dict(employee_id=str(employee.id),shift_id=str(tenant.shifts.first().id),effective_from="2043-01-01"),format="json")
    assert snapshot(tenant)==before

@pytest.mark.parametrize('secondary', [False, True])
def test_admin_form_uses_same_overlap_contract(scope,secondary):
    from django.db import transaction
    from apps.attendance.admin import EmployeeShiftAssignmentAdminForm
    tenant, actor, client=scope; employee=tenant.employees.get(employee_code='QA-EMP-001')
    item=tenant.employee_shift_assignments.filter(employee=employee).first()
    data=dict(tenant=str(tenant.id),employee=str(employee.id),shift=str(item.shift_id),effective_from='2043-01-01',effective_to='2043-01-31',is_primary=not secondary,assignment_kind='fixed',config_snapshot='{}')
    before=snapshot(tenant)
    with transaction.atomic():
        form=EmployeeShiftAssignmentAdminForm(data=data)
        assert form.is_valid()==secondary, form.errors
        if secondary:form.save()
    if not secondary:assert snapshot(tenant)==before

@pytest.mark.parametrize('repeat',range(3))
def test_admin_and_api_share_parent_serialization(scope,repeat):
    from django.db import transaction
    from apps.attendance.admin import EmployeeShiftAssignmentAdminForm
    tenant,actor,_=scope;employee=tenant.employees.get(employee_code='QA-MGR-002');shift=tenant.shifts.first();barrier=Barrier(2)
    EmployeeShiftAssignment.objects.filter(employee=employee).delete()
    body=dict(employee_id=str(employee.id),shift_id=str(shift.id),effective_from='2043-01-01',effective_to='2043-01-31',is_primary=True)
    def write(admin):
        close_old_connections()
        try:
            barrier.wait(timeout=15)
            if admin:
                with transaction.atomic():
                    form=EmployeeShiftAssignmentAdminForm(data=dict(tenant=str(tenant.id),employee=str(employee.id),shift=str(shift.id),effective_from=body['effective_from'],effective_to=body['effective_to'],is_primary=True,assignment_kind='fixed',config_snapshot='{}'))
                    if not form.is_valid():return 400
                    form.save();return 201
            client=APIClient();client.force_authenticate(actor.membership.user)
            return client.post(AS,body,format='json').status_code
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=2) as pool:statuses=list(pool.map(write,[True,False]))
    assert sorted(statuses)==[201,400], statuses
    assert EmployeeShiftAssignment.objects.filter(employee=employee,is_primary=True).count()==1

@pytest.mark.parametrize("repeat", range(3))
def test_simultaneous_idempotent_replay_is_one_business_and_audit_effect(scope,repeat,record_property):
    tenant,actor,_=scope;employee=tenant.employees.get(employee_code="QA-MGR-002");shift=tenant.shifts.first();barrier=Barrier(2)
    data=dict(employee_id=str(employee.id),shift_id=str(shift.id),effective_from="2048-01-01",effective_to="2048-01-31",is_primary=True)
    before=snapshot(tenant)
    def create(_):
        close_old_connections()
        try:
            client=APIClient();client.force_authenticate(actor.membership.user);barrier.wait(timeout=15)
            result=client.post(AS,data,format="json",HTTP_IDEMPOTENCY_KEY=f"p6-shift-replay-owned-{tenant.id}-{repeat}")
            return result.status_code,str(result.data.get("id")),result.get("Idempotency-Replayed")
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(create,range(2)))
    record_property("idempotency_reconciliation",json.dumps(results))
    assert [item[0] for item in results]==[201,201]
    assert results[0][1]==results[1][1]
    assert sorted(item[2] for item in results)==["false","true"]
    assert EmployeeShiftAssignment.objects.filter(id=results[0][1],employee=employee).count()==1
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()==before[2]+1

@pytest.mark.parametrize('repeat',range(3))
def test_concurrent_shift_code_duplicate_has_one_row_and_audit(scope,repeat,record_property):
    from test_shift_p5_closure import SH, body
    from apps.attendance.models import Shift
    tenant,actor,_=scope;barrier=Barrier(2);before=SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()
    def create(_):
        close_old_connections()
        try:
            client=APIClient();client.force_authenticate(actor.membership.user);barrier.wait(timeout=15)
            return client.post(SH,body(),format='json').status_code
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=2) as pool:statuses=list(pool.map(create,range(2)))
    record_property('shift_code_reconciliation',json.dumps(dict(statuses=statuses,rows=Shift.objects.filter(tenant=tenant,code='p5-boundary').count(),audit_delta=SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()-before)))
    assert sorted(statuses)==[201,400],statuses
    assert Shift.objects.filter(tenant=tenant,code='p5-boundary').count()==1
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()==before+1

def test_create_waits_on_stable_employee_row_until_transaction_releases(scope,record_property):
    import time
    from threading import Event
    from django.db import transaction
    from apps.employees.models import Employee
    tenant,actor,_=scope;employee=tenant.employees.get(employee_code='QA-MGR-002');ready=Event();worker_pid=[]
    def create():
        close_old_connections()
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_backend_pid()');worker_pid.append(cursor.fetchone()[0])
            ready.set();client=APIClient();client.force_authenticate(actor.membership.user)
            return client.post(AS,dict(employee_id=str(employee.id),shift_id=str(tenant.shifts.first().id),effective_from='2050-01-01',effective_to='2050-01-31',is_primary=True),format='json').status_code
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=1) as pool:
        with transaction.atomic():
            Employee.objects.select_for_update().get(id=employee.id,tenant=tenant)
            future=pool.submit(create);assert ready.wait(timeout=10)
            deadline=time.monotonic()+10; observed=None
            while time.monotonic()<deadline:
                with connection.cursor() as cursor:
                    cursor.execute('SELECT pg_stat_clear_snapshot()')
                    cursor.execute('SELECT wait_event_type,wait_event FROM pg_stat_activity WHERE pid=%s',[worker_pid[0]])
                    observed=cursor.fetchone()
                if observed and observed[0]=='Lock':break
                time.sleep(.02)
            record_property('observed_postgresql_lock_wait',json.dumps(dict(worker_pid=worker_pid[0],wait=observed,future_completed_while_parent_locked=future.done())))
            assert observed and observed[0]=='Lock',observed
            assert not future.done()
        assert future.result(timeout=15)==201
