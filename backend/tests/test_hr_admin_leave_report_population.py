"""Report sources must enumerate tied names deterministically without crossing tenants."""
from decimal import Decimal
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.tenants.models import Tenant
from apps.employees.models import Employee
from apps.iam.models import Role,RolePermission,TenantMembership,MembershipRole
from apps.leave_management.models import LeaveType,LeavePolicy,LeaveBalance

def source(code,permission=True):
    tenant=Tenant.objects.create(code=code,name=code,is_sandbox=True)
    user=get_user_model().objects.create_user(username=code,email=code+'@example.test',password='synthetic-only')
    membership=TenantMembership.objects.create(tenant=tenant,user=user,employee_code=code,status='active',is_default=True)
    role=Role.objects.create(tenant=tenant,code='hr-admin',name='HR Admin')
    RolePermission.objects.create(role=role,permission_key='leave.view' if permission else 'employees.view')
    MembershipRole.objects.create(membership=membership,role=role,is_primary=True)
    Employee.objects.create(tenant=tenant,membership=membership,employee_code=code,first_name='Admin',employment_status='active')
    kind=LeaveType.objects.create(tenant=tenant,code='annual',name='Annual')
    policy=LeavePolicy.objects.create(tenant=tenant,leave_type=kind,code='annual',name='Annual')
    client=APIClient();client.force_authenticate(user)
    return tenant,policy,client

def balances(tenant,policy,count):
    result=[]
    for i in range(count):
        employee=Employee.objects.create(tenant=tenant,employee_code=f'REPORT-{i:03}',first_name='Identical',employment_status='active')
        result.append(LeaveBalance.objects.create(tenant=tenant,employee=employee,leave_policy=policy,period_year=2026,closing_balance=Decimal('10')))
    return result

@pytest.mark.django_db
def test_all_pages_cover_tied_names_once_and_foreign_rows_never_leak():
    tenant,policy,client=source('report-population')
    expected=balances(tenant,policy,57)
    foreign,other,_=source('report-foreign');balances(foreign,other,2)
    pages=[client.get(f'/api/v1/hr-admin/leave-balances/?page={page}&page_size=50') for page in (1,2)]
    assert all(p.status_code==200 and p.data['total_count']==57 for p in pages)
    ids=[item['id'] for p in pages for item in p.data['items']]
    assert len(ids)==len(set(ids))==57
    assert ids==sorted(str(item.id) for item in expected)
    assert [item['id'] for item in client.get('/api/v1/hr-admin/leave-balances/?page=1&page_size=50').data['items']]==ids[:50]
    scoped=client.get(f'/api/v1/hr-admin/leave-balances/?employee_id={expected[-1].employee_id}')
    assert scoped.data['total_count']==1

@pytest.mark.django_db
def test_report_source_requires_leave_permission_even_with_hr_role():
    tenant,policy,client=source('report-denied',permission=False);balances(tenant,policy,1)
    assert client.get('/api/v1/hr-admin/leave-balances/').status_code==403

@pytest.mark.django_db
@pytest.mark.parametrize("reserved", [Decimal("1"), Decimal("2")])
def test_hr_and_ess_closing_projection_already_deducts_reservations(reserved):
    """UI availability must consume this net projection, not reserve again."""
    from datetime import date
    from unittest.mock import patch
    from apps.common.selectors import get_employee_leave_summary
    from apps.leave_management.models import LeavePolicyPeriod, LeaveBalanceTransaction
    from apps.leave_management.year_end_services import ensure_governed_leave_balance, append_leave_ledger_movement
    tenant, policy, client = source("report-net-reservations")
    employee = tenant.employees.get(employee_code=tenant.code)
    period = LeavePolicyPeriod.objects.create(tenant=tenant, leave_policy=policy, code="net-2026",
        start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), status="open")
    balance = ensure_governed_leave_balance(employee=employee, policy_period=period)
    append_leave_ledger_movement(balance=balance, action="opening", units=Decimal("3"),
        effective_date=date(2026, 1, 1), idempotency_key="net-opening", reason="Synthetic projection contract")
    append_leave_ledger_movement(balance=balance, action="reservation", units=reserved,
        effective_date=date(2026, 10, 20), idempotency_key="net-reservation", reason="Synthetic reservation contract")
    expected = Decimal("3") - reserved
    before = LeaveBalanceTransaction.objects.filter(leave_balance=balance).count()
    with patch("django.utils.timezone.localdate", return_value=date(2026, 10, 20)):
        response = client.get("/api/v1/hr-admin/leave-balances/")
        summary = get_employee_leave_summary(employee)
    assert response.status_code == 200
    row = next(item for item in response.data["items"] if item["id"] == str(balance.pk))
    assert Decimal(row["closing_balance"]) == expected
    assert Decimal(row["reserved_amount"]) == reserved
    own = next(item for item in summary["balances"] if item["policy_name"] == policy.name)
    assert own["closing_balance"] == expected
    assert own["reserved_amount"] == reserved
    assert LeaveBalanceTransaction.objects.filter(leave_balance=balance).count() == before == 2
