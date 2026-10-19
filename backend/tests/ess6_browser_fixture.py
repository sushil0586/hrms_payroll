"""ESS-6 combined synthetic workspace. Existing domain policies; loopback only."""
import json
from datetime import date
from django.conf import settings
from apps.tenants.models import Tenant
from apps.leave_management.models import LeaveType, LeavePolicy, LeavePolicyAssignment, LeavePolicyPeriod
from apps.notifications.models import Notification
from apps.payroll.models import EmployeeStatutoryProfile, PayrollStatutoryPack
from tests.ess4_browser_fixture import prepare as prepare_documents


def prepare(manifest_path):
    db = settings.DATABASES['default']
    if db['NAME'] != 'hrms_ess2' or db['HOST'] != '127.0.0.1' or str(db['PORT']) != '55441':
        raise RuntimeError('ESS6 requires the owned loopback PostgreSQL instance')
    closed = prepare_documents(manifest_path)
    with open(manifest_path) as handle:
        manifest = json.load(handle)
    tenant = Tenant.objects.get(pk=manifest['tenant']['id'], code__startswith='pw-qa-')
    employee = tenant.employees.get(pk=manifest['credentials']['employee']['employee_id'])
    kind = LeaveType.objects.create(tenant=tenant, code='ess6-direct', name='QA ESS6 Direct Leave')
    policy = LeavePolicy.objects.create(tenant=tenant, leave_type=kind, code='ess6-direct', name='QA ESS6 configured policy',
        status='active', effective_from=date(2026,1,1), effective_to=date(2026,12,31), annual_entitlement='12.00', accrual_frequency='yearly',
        config_snapshot={'lifecycle':{'allow_employee_cancel_approved':True,'cancel_approved_requires_reapproval':False}})
    LeavePolicyPeriod.objects.create(tenant=tenant,leave_policy=policy,code='ess6-2026',start_date=date(2026,1,1),end_date=date(2026,12,31),status='open',policy_snapshot=policy.config_snapshot)
    LeavePolicyAssignment.objects.create(tenant=tenant,leave_policy=policy,employee=employee,priority=1)
    from apps.documents.models import DocumentCategory
    DocumentCategory.objects.create(tenant=tenant,code='ess6-tax-proof',name='QA ESS6 Tax Proof',allow_employee_upload=True,requires_expiry_date=False)
    # Synthetic pack/profile explicitly cover the additional test fiscal year; no history is removed.
    PayrollStatutoryPack.objects.filter(tenant=tenant).update(effective_to=None)
    EmployeeStatutoryProfile.objects.filter(tenant=tenant,employee=employee).update(effective_to=None,pan_number='ABCDE1234F',uan_number='123456789012',pf_applicable=True)
    Notification.objects.create(tenant=tenant,recipient_membership=employee.membership,channel='in_app',audience_type='employee',
        title='ESS6 leave update',body='Synthetic workflow update; no provider dispatch',subject_type='leave_request',subject_identifier=manifest['fixtures']['leave_request_id'],status='delivered')
    return closed


def verify_journey(tenant_id, employee_id, kind, identifier):
    """Independent real-database read for browser-created state; never called by production."""
    from apps.attendance.models import AttendanceRegularization, AttendanceRecord
    from apps.leave_management.models import LeaveRequest, LeaveBalance
    from apps.documents.models import EmployeeDocument
    from apps.payroll.models import EmployeeStatutoryDeclaration, PayrollOutputArtifact, PayrollArtifactAccessEvent
    tenant = Tenant.objects.get(pk=tenant_id, code__startswith='pw-qa-')
    employee = tenant.employees.get(pk=employee_id)
    result = {'kind':kind,'id':identifier,'employee_id':str(employee.id),'database':settings.DATABASES['default']['NAME']}
    if kind == 'attendance':
        row = AttendanceRegularization.objects.get(tenant=tenant,employee=employee,pk=identifier)
        result.update(status=row.status,reason=row.reason)
    elif kind == 'attendance_day':
        row = AttendanceRecord.objects.get(tenant=tenant,employee=employee,pk=identifier)
        result.update(status=row.status,check_in_at=str(row.check_in_at),check_out_at=str(row.check_out_at))
    elif kind == 'leave':
        row = LeaveRequest.objects.get(tenant=tenant,employee=employee,pk=identifier)
        balance = LeaveBalance.objects.get(tenant=tenant,employee=employee,leave_policy=row.leave_policy,period_year=row.start_date.year)
        result.update(status=row.status,reason=row.reason,requested_units=str(row.requested_units),consumed=str(balance.consumed_amount),reserved=str(balance.reserved_amount),closing=str(balance.closing_balance),ledger_actions=list(row.balance_transactions.values_list('action',flat=True)))
    elif kind == 'document':
        row = EmployeeDocument.objects.get(tenant=tenant,employee=employee,pk=identifier)
        result.update(title=row.title,verification_status=row.verification_status,artifact_present=bool(row.artifact_id))
    elif kind == 'notification':
        row = Notification.objects.get(tenant=tenant,recipient_membership=employee.membership,pk=identifier)
        result.update(read_at=str(row.read_at) if row.read_at else None,delivery_status=row.status)
    elif kind == 'payslip':
        row = PayrollOutputArtifact.objects.get(tenant=tenant,employee=employee,pk=identifier,status='published')
        result.update(source_hash_valid=row.source_hash==row._artifact_digest(),read_events=PayrollArtifactAccessEvent.objects.filter(output_artifact=row,event_type='read_acknowledged').count())
    elif kind == 'statutory':
        row = EmployeeStatutoryDeclaration.objects.get(tenant=tenant,employee=employee,pk=identifier)
        result.update(status=row.status,submitted_by=row.submitted_by.username if row.submitted_by else None,amounts=[str(i.declared_amount) for i in row.items.all()],verified_amounts=[str(i.verified_amount) for i in row.items.all()])
    else:
        raise RuntimeError('Unsupported ESS6 state probe')
    return result


def cleanup_ledger(tenant_id, seed_ref):
    """Remove only this owned QA ledger graph, children first, under existing teardown authorization."""
    from django.db import transaction
    from apps.tenants.retention import authorized_synthetic_tenant_teardown
    from apps.common.management.commands.manage_playwright_workspace import Command
    from apps.leave_management.models import LeaveRequestAllocation, LeaveEntitlementLot, LeaveBalanceTransaction
    db=settings.DATABASES['default']
    if db['NAME']!='hrms_ess2' or db['HOST']!='127.0.0.1' or str(db['PORT'])!='55441':
        raise RuntimeError('ESS6 teardown requires the owned loopback database')
    tenant=Tenant.objects.get(pk=tenant_id,code=f'pw-qa-{seed_ref}')
    command=Command(); command._assert_owned(tenant,seed_ref)
    with transaction.atomic(), authorized_synthetic_tenant_teardown(tenant,expected_owner_email=command._owner_email(seed_ref)):
        LeaveRequestAllocation.objects.filter(tenant=tenant).delete()
        LeaveEntitlementLot.objects.filter(tenant=tenant).delete()
        rows=LeaveBalanceTransaction.objects.filter(tenant=tenant)
        while rows.exists():
            leaves=rows.filter(compensating_transactions__isnull=True)
            if not leaves.exists():
                raise RuntimeError('QA ledger contains a non-leaf cycle; refusing broad deletion')
            leaves.delete()
    return {'owned_ledger_rows_remaining':rows.count()}
