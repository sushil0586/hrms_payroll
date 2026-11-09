"""Bounded API Shift -> schedule/attendance/leave -> payroll input reconciliation.
No payroll calculation, payment, notification delivery or shared database is used.
"""
import json
from datetime import date
from decimal import Decimal
import pytest
from django.utils import timezone
from apps.attendance.models import AttendanceRecord, AttendanceStatus, AttendanceSource
from apps.attendance.services import resolve_employee_work_day, build_attendance_derivation_summary, reconcile_attendance_period, transition_attendance_close
from apps.leave_management.models import LeaveRequest, LeaveRequestStatus
from apps.leave_management.services import build_leave_attendance_collision_summary
from apps.payroll.models import PayrollRun, PayrollPeriod, PayrollInputSnapshotStatus
from apps.common.api_views import save_hr_admin_payroll_input_snapshot
from apps.common.models import SaasCommercialAuditEvent
from test_shift_p5_closure import scope, SH, AS, body

pytestmark=pytest.mark.django_db(transaction=True)

@pytest.mark.parametrize('with_leave',[False,True])
def test_assignment_schedule_leave_close_and_payroll_input_share_same_source(scope,with_leave,record_property):
    tenant,actor,client=scope;employee=tenant.employees.get(employee_code='QA-MGR-002');day=date(2027,1,4)
    data=body();data.update(start_time='09:00',end_time='17:00',is_night_shift=False,weekly_off_days=['sunday'])
    shift=client.post(SH,data,format='json');assert shift.status_code==201
    assignment=client.post(AS,dict(employee_id=str(employee.id),shift_id=shift.data['id'],effective_from=day.isoformat(),effective_to=day.isoformat(),is_primary=True),format='json');assert assignment.status_code==201
    schedule=resolve_employee_work_day(employee=employee,work_date=day)
    assert schedule['shift_id']==str(shift.data['id'])
    assert schedule['roster_assignment_id']==str(assignment.data['id'])
    assert schedule['day_type']=='working_day' and schedule['expected_hours']=='8.00'
    record=AttendanceRecord.objects.create(tenant=tenant,employee=employee,attendance_date=day,status=AttendanceStatus.PRESENT,source=AttendanceSource.MANUAL,shift_id=shift.data['id'],work_duration_hours=Decimal('8'))
    leave_summary=None
    if with_leave:
        policy=tenant.leave_policies.first()
        leave=LeaveRequest.objects.create(tenant=tenant,employee=employee,leave_type=policy.leave_type,leave_policy=policy,status=LeaveRequestStatus.APPROVED,start_date=day,end_date=day,requested_units=Decimal('1'),approved_units=Decimal('1'),approved_at=timezone.now())
        leave_summary=build_leave_attendance_collision_summary(leave)
        assert leave_summary['status']=='conflict' and leave_summary['payroll_blocking'] is True
    derived=build_attendance_derivation_summary(record)
    assert derived['leave_collision_count']==int(with_leave)
    close=reconcile_attendance_period(tenant=tenant,legal_entity=employee.legal_entity,period_start=day,period_end=day,actor=actor,idempotency_key='p6-joined-close')
    for action in ('submit','approve','close'):close=transition_attendance_close(close=close,actor=actor,action=action)
    record.refresh_from_db();assert record.is_locked
    original=PayrollRun.objects.filter(tenant=tenant).select_related('period','pay_group').first()
    period=PayrollPeriod.objects.create(tenant=tenant,calendar=original.period.calendar,code='p6-joined',name='Synthetic bounded input period',start_date=day,end_date=day,pay_date=day,status='open')
    run=PayrollRun.objects.create(tenant=tenant,period=period,pay_group=original.pay_group,code='p6-joined',name='Synthetic input only')
    snapshot=save_hr_admin_payroll_input_snapshot(actor,dict(payroll_run_id=run.id,employee_id=employee.id,snapshot_status=PayrollInputSnapshotStatus.READY,validation_snapshot={'blockers':[],'warnings':[]}))
    assert snapshot.attendance_close_id==close.id
    assert snapshot.attendance_snapshot['schedule_spine']['working_days']==1
    assert snapshot.leave_snapshot['schedule_spine']['working_days']==1
    assert snapshot.leave_snapshot['attendance_collisions']['collision_count']==int(with_leave)
    before=SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()
    rejected=client.patch(f"{AS}{assignment.data['id']}/",{'is_primary':False},format='json')
    assert rejected.status_code==400
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()==before
    future=client.post(AS,dict(employee_id=str(employee.id),shift_id=shift.data['id'],effective_from='2027-01-05',effective_to='2027-01-05',is_primary=True),format='json')
    assert future.status_code==201
    record.refresh_from_db();assert record.is_locked and str(record.shift_id)==str(shift.data['id'])
    record_property('joined_reconciliation',json.dumps(dict(tenant=str(tenant.id),employee=str(employee.id),assignment=str(assignment.data['id']),schedule=schedule,attendance=derived,leave=leave_summary,close_id=str(close.id),close_snapshot=close.reconciliation_snapshot,payroll_input_id=str(snapshot.id),payroll_attendance=snapshot.attendance_snapshot,payroll_leave=snapshot.leave_snapshot,historical_patch_status=rejected.status_code,future_create_status=future.status_code),default=str))
