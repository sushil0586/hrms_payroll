"""Isolated synthetic leave pagination, with existing closed attendance snapshot."""
import json
from datetime import date
from django.conf import settings
from apps.tenants.models import Tenant
from apps.leave_management.models import LeaveRequest, LeavePolicy, LeavePolicyAssignment, LeaveType
from tests.ess2_browser_fixture import prepare as attendance_prepare


def prepare(manifest_path):
    if settings.DATABASES['default']['NAME'] != 'hrms_ess2' or settings.DATABASES['default']['HOST'] != '127.0.0.1':
        raise RuntimeError('ESS3 requires dedicated loopback database')
    closed = attendance_prepare(manifest_path)
    with open(manifest_path) as handle:
        manifest = json.load(handle)
    tenant = Tenant.objects.get(pk=manifest['tenant']['id'], code__startswith='pw-qa-')
    employee = tenant.employees.get(pk=manifest['credentials']['employee']['employee_id'])
    seed = LeaveRequest.objects.get(pk=manifest['fixtures']['leave_request_id'])
    for day in range(1, 17):
        LeaveRequest.objects.create(tenant=tenant, employee=employee, leave_type=seed.leave_type,
            leave_policy=seed.leave_policy, start_date=date(2026, 9, day), end_date=date(2026, 9, day),
            requested_units='1.00', status='rejected', reason=f'Synthetic history {day}')
    for code, name, reapproval in [("ess3-direct", "QA Direct Leave", False), ("ess3-reapproval", "QA Governed Leave", True)]:
        leave_type = LeaveType.objects.create(tenant=tenant, code=code, name=name)
        policy = LeavePolicy.objects.create(tenant=tenant, leave_type=leave_type, code=code, name=f"{name} 2026",
            status="active", effective_from=date(2026, 1, 1), effective_to=date(2026, 12, 31), annual_entitlement="12.25" if reapproval else "12.00",
            accrual_frequency="yearly", config_snapshot={"lifecycle": {"allow_employee_cancel_approved": True,
            "cancel_approved_requires_reapproval": reapproval, "cancel_approval_route": "manager_only"}})
        LeavePolicyAssignment.objects.create(tenant=tenant, leave_policy=policy, employee=employee, priority=1)
    return closed
