"""Global employee reads and exact import identity; real PostgreSQL, no policy changes."""
from datetime import date, datetime, timezone
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.employees.models import Employee
from apps.leave_management.models import LeaveRequest, LeavePolicyAssignment, LeaveType, LeaveBalanceTransaction
from tests.test_hr_admin_leave_report_population import source

pytestmark = pytest.mark.django_db
URL = "/api/v1/me/leave-requests/"


@pytest.fixture
def scope():
    tenant, policy, client = source("history-completion")
    employee = tenant.employees.get()
    other = Employee.objects.create(tenant=tenant, employee_code="OTHER", first_name="Other")
    def request(reason="Global history", start="2026-10-01", end="2026-10-01", owner=None, kind=None, status="rejected"):
        return LeaveRequest.objects.create(tenant=tenant, employee=owner or employee, leave_policy=policy,
            leave_type=kind or policy.leave_type, reason=reason, start_date=start, end_date=end, status=status)
    return tenant, policy, employee, other, client, request


def test_global_search_and_filters_precede_pagination(scope):
    tenant, policy, employee, other, client, make = scope
    old = make(reason="Needle beyond first page", start="2026-01-15", end="2026-01-17")
    for _ in range(24): make()
    make(reason=old.reason, owner=other)
    assert str(old.id) not in [i["id"] for i in client.get(URL, {"page_size": 10}).data["items"]]
    result = client.get(URL, {"q": "needle", "leave_type": policy.leave_type.code,
        "date_from": "2026-01-17", "date_to": "2026-01-18"})
    assert result.status_code == 200
    assert result.data["total_count"] == 1
    assert result.data["items"][0]["id"] == str(old.id)
    assert result.data["status_counts"]["all"] == 25
    assert result.data["filter_types"] == [{"code": policy.leave_type.code, "name": policy.leave_type.name}]
    assert "calendar_days" not in result.data


def test_calendar_complete_month_leap_day_boundaries_and_day_pagination(scope):
    tenant, policy, employee, other, client, make = scope
    for _ in range(14): make(start="2024-02-28", end="2024-03-01")
    make(start="2024-02-29", end="2024-02-29", status="cancelled")
    make(start="2024-01-31", end="2024-02-01")
    make(start="2024-02-29", end="2024-03-01", owner=other)
    response = client.get(URL, {"month": "2024-02", "day": "2024-02-29", "page_size": 10})
    assert response.status_code == 200
    days = response.data["calendar_days"]
    assert len(days) == 29 and days[0] == {"date": "2024-02-01", "count": 1}
    assert days[-1] == {"date": "2024-02-29", "count": 15}
    assert response.data["total_count"] == 15 and len(response.data["items"]) == 10
    assert response.data["has_next"] is True
    page2 = client.get(URL, {"month": "2024-02", "day": "2024-02-29", "page_size": 10, "page": 2}).data
    assert page2["calendar_days"] == days and len(page2["items"]) == 5
    assert not {x["id"] for x in response.data["items"]} & {x["id"] for x in page2["items"]}


@pytest.mark.parametrize("period,expected", [("upcoming", "future"), ("past", "past"), ("current", "today")])
def test_utc_period_boundaries_include_today_only_in_current(scope, period, expected):
    *_, client, make = scope
    make(reason="past", start="2026-10-20", end="2026-10-20")
    make(reason="today", start="2026-10-21", end="2026-10-21")
    make(reason="future", start="2026-10-22", end="2026-10-22")
    with patch("django.utils.timezone.now", return_value=datetime(2026, 10, 21, 0, 1, tzinfo=timezone.utc)):
        result = client.get(URL, {"period": period})
    assert result.status_code == 200
    assert [x["reason"] for x in result.data["items"]] == [expected]


@pytest.mark.parametrize("query", [
    {"month": "0000-01"}, {"month": "2026-13"}, {"day": "2026-02-30"},
    {"date_from": "bad"}, {"date_from": "2026-10-22", "date_to": "2026-10-21"},
    {"q": "x" * 201}, {"period": "tenant-policy-year"}, {"leave_type": "x" * 51},
])
def test_invalid_read_filters_return_explainable_400_without_writes(scope, query):
    *_, client, make = scope
    make()
    before = LeaveBalanceTransaction.objects.count(), LeaveRequest.objects.count()
    result = client.get(URL, query)
    assert result.status_code == 400 and result.data
    assert (LeaveBalanceTransaction.objects.count(), LeaveRequest.objects.count()) == before


def test_global_type_options_and_calendar_obey_employee_and_tenant_scope(scope):
    tenant, policy, employee, other, client, make = scope
    own_type = LeaveType.objects.create(tenant=tenant, code="historical", name="Retired type", is_active=False)
    make(kind=own_type)
    other_type = LeaveType.objects.create(tenant=tenant, code="other-only", name="Hidden other")
    make(owner=other, kind=other_type)
    foreign, fp, _ = source("history-foreign")
    LeaveRequest.objects.create(tenant=foreign, employee=foreign.employees.get(), leave_type=fp.leave_type,
        start_date=date(2026, 10, 1), end_date=date(2026, 10, 1), reason="Hidden foreign")
    result = client.get(URL, {"month": "2026-10", "employee_id": other.pk, "tenant_id": foreign.pk}).data
    assert result["status_counts"]["all"] == 1 and result["total_count"] == 1
    assert result["filter_types"] == [{"code": "historical", "name": "Retired type"}]
    assert result["calendar_days"][0]["count"] == 1
    assert client.get(URL, {"q": "Hidden"}).data["total_count"] == 0
    assert APIClient().get(URL).status_code == 401


def test_tied_creation_dates_have_stable_pagination_and_only_page_details_are_built(scope):
    from apps.common.selectors import get_employee_leave_requests
    *_, client, make = scope
    rows = [make() for _ in range(23)]
    LeaveRequest.objects.all().update(created_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
    with patch("apps.common.api_views.get_employee_leave_requests", wraps=get_employee_leave_requests) as detail:
        pages = [client.get(URL, {"page": page, "page_size": 10}).data for page in (1, 2, 3)]
    assert [len(call.kwargs["request_ids"]) for call in detail.call_args_list] == [10, 10, 3]
    ids = [item["id"] for page in pages for item in page["items"]]
    assert ids == sorted([str(row.pk) for row in rows], reverse=True)
    assert client.get(URL, {"page": 999}).data["items"] == []


def test_exact_code_lookup_never_falls_back_to_similar_names_or_other_tenants(scope):
    tenant, _, _, _, client, _ = scope
    for i in range(30): Employee.objects.create(tenant=tenant, employee_code=f"MATCH-{i:02}", first_name="MATCH")
    expected = Employee.objects.create(tenant=tenant, employee_code="MATCH", first_name="Exact")
    foreign, _, _ = source("exact-foreign")
    Employee.objects.create(tenant=foreign, employee_code="MATCH", first_name="Foreign")
    response = client.get("/api/v1/hr-admin/employees/option-search/", {"employee_code": " match ", "limit": 2})
    assert response.status_code == 200 and response.data["total_count"] == 1
    assert [x["id"] for x in response.data["items"]] == [str(expected.pk)]
    assert client.get("/api/v1/hr-admin/employees/option-search/", {"employee_code": "MATC"}).data["total_count"] == 0
    assert client.get("/api/v1/hr-admin/employees/option-search/", {"employee_code": ""}).status_code == 400
    Employee.objects.create(tenant=tenant, employee_code="match", first_name="Ambiguous")
    assert client.get("/api/v1/hr-admin/employees/option-search/", {"employee_code": "MATCH", "limit": 2}).data["total_count"] == 2


def test_assignment_exact_pair_lookup_ignores_visible_page_and_foreign_ids(scope):
    tenant, policy, employee, other, client, _ = scope
    for index in range(30):
        LeavePolicyAssignment.objects.create(tenant=tenant, employee=other, leave_policy=policy, priority=index + 1)
    target = LeavePolicyAssignment.objects.create(tenant=tenant, employee=employee, leave_policy=policy, priority=99)
    url = "/api/v1/hr-admin/leave-policy-assignments/"
    response = client.get(url, {"employee_id": employee.pk, "leave_policy_id": policy.pk, "page_size": 1})
    assert response.status_code == 200 and response.data["total_count"] == 1
    assert response.data["items"][0]["id"] == str(target.pk)
    foreign, fp, _ = source("pair-foreign")
    assert client.get(url, {"leave_policy_id": fp.pk}).data["total_count"] == 0
    assert client.get(url, {"employee_id": "not-a-uuid"}).status_code == 400


def test_exact_lookup_retains_role_denial(scope):
    tenant, policy, employee, _, client, _ = scope
    from apps.iam.models import RolePermission
    # An empty legacy HR role intentionally falls back to catalog defaults.
    # Keep an explicit unrelated grant to exercise a genuine least-privilege denial.
    RolePermission.objects.filter(role__tenant=tenant).update(permission_key="tenant.settings.view")
    assert client.get("/api/v1/hr-admin/employees/option-search/", {"employee_code": employee.employee_code}).status_code == 403
    assert client.get("/api/v1/hr-admin/leave-policy-assignments/", {"employee_id": employee.pk}).status_code == 403

@pytest.mark.parametrize('new_from,priority,blocked', [('2026-07-01',99,False),('2026-06-01',99,True),('2026-06-01',100,False),('2026-06-01',0,False)])
def test_conflict_preview_matches_existing_save_rules_for_dates_and_priorities(scope,new_from,priority,blocked):
    tenant,policy,employee,_,client,_=scope
    from apps.iam.models import RolePermission,Role
    RolePermission.objects.create(role=Role.objects.get(tenant=tenant,code='hr-admin'),permission_key='leave.policies.manage')
    LeavePolicyAssignment.objects.create(tenant=tenant,employee=employee,leave_policy=policy,priority=99,effective_from=date(2026,1,1),effective_to=date(2026,6,30))
    payload={'employee_id':str(employee.pk),'leave_policy_id':str(policy.pk),'priority':priority,'is_active':True,'effective_from':new_from,'effective_to':'2026-12-31'}
    preview=client.post('/api/v1/hr-admin/leave-policy-assignments/conflicts/',payload,format='json')
    assert preview.status_code==200 and preview.data['has_blocking_conflict'] is blocked
    before=LeavePolicyAssignment.objects.count()
    saved=client.post('/api/v1/hr-admin/leave-policy-assignments/',payload,format='json')
    assert saved.status_code==(400 if blocked else 201)
    assert LeavePolicyAssignment.objects.count()==before+(0 if blocked else 1)


def test_excess_decimal_precision_is_rejected_by_existing_balance_api_without_rounding(scope):
    tenant,policy,employee,_,client,_=scope
    from apps.iam.models import RolePermission,Role
    RolePermission.objects.create(role=Role.objects.get(tenant=tenant,code='hr-admin'),permission_key='leave.balances.manage')
    before=LeaveBalanceTransaction.objects.count()
    response=client.post('/api/v1/hr-admin/leave-balances/actions/',{'employee_id':str(employee.pk),'leave_policy_id':str(policy.pk),'action':'credit_adjustment','units':'0.005','effective_date':'2026-10-21','reason':'Synthetic precision rejection'},format='json')
    assert response.status_code==400 and 'units' in response.data
    assert LeaveBalanceTransaction.objects.count()==before


@pytest.mark.parametrize('priority',[-1,2147483648])
def test_assignment_priority_outside_database_range_returns_400_without_writes(scope,priority):
    tenant,policy,employee,_,client,_=scope
    from apps.iam.models import RolePermission,Role
    RolePermission.objects.create(role=Role.objects.get(tenant=tenant,code='hr-admin'),permission_key='leave.policies.manage')
    payload={'employee_id':str(employee.pk),'leave_policy_id':str(policy.pk),'priority':priority,'is_active':True}
    before=LeavePolicyAssignment.objects.count()
    for suffix in ['','conflicts/']:
        result=client.post('/api/v1/hr-admin/leave-policy-assignments/'+suffix,payload,format='json')
        assert result.status_code==400 and 'priority' in result.data
    assert LeavePolicyAssignment.objects.count()==before


def test_bulk_assignment_import_preserves_effective_dates_and_uses_save_conflict_policy(scope):
    tenant,policy,employee,_,client,_=scope
    from apps.iam.models import RolePermission,Role
    RolePermission.objects.create(role=Role.objects.get(tenant=tenant,code='hr-admin'),permission_key='leave.policies.manage')
    prior=LeavePolicyAssignment.objects.create(tenant=tenant,employee=employee,leave_policy=policy,priority=777,effective_from=date(2026,1,1),effective_to=date(2026,6,30))
    payload={'employee_id':str(employee.pk),'leave_policy_id':str(policy.pk),'priority':777,'is_active':True,'effective_from':'2026-10-21','effective_to':None}
    response=client.post('/api/v1/hr-admin/leave-policy-assignments/bulk-import/',{'rows':[payload]},format='json')
    assert response.status_code==201,response.data
    assert response.data['created_count']==1
    created=LeavePolicyAssignment.objects.get(pk=response.data['created_ids'][0])
    assert created.effective_from==date(2026,10,21) and created.effective_to is None
    prior.refresh_from_db();assert prior.effective_to==date(2026,6,30)
    duplicate=client.post('/api/v1/hr-admin/leave-policy-assignments/bulk-import/',{'rows':[payload]},format='json')
    assert duplicate.status_code==207 and duplicate.data['failed_count']==1
    assert LeavePolicyAssignment.objects.filter(tenant=tenant).count()==2


def test_bulk_assignment_partial_results_keep_valid_dates_and_reject_only_invalid_rows(scope):
    tenant,policy,employee,other,client,_=scope
    from apps.iam.models import RolePermission,Role
    RolePermission.objects.create(role=Role.objects.get(tenant=tenant,code='hr-admin'),permission_key='leave.policies.manage')
    row={'employee_id':str(employee.pk),'leave_policy_id':str(policy.pk),'priority':777,'is_active':True,'effective_from':'2026-10-21','effective_to':None}
    response=client.post('/api/v1/hr-admin/leave-policy-assignments/bulk-import/',{'rows':[row,row,{**row,'employee_id':str(other.pk),'priority':-1}]},format='json')
    assert response.status_code==207 and response.data['created_count']==1 and response.data['failed_count']==2
    assert [error['row'] for error in response.data['errors']]==[2,3]
    saved=LeavePolicyAssignment.objects.get(tenant=tenant)
    assert saved.employee_id==employee.pk and saved.effective_from==date(2026,10,21)


@pytest.mark.django_db(transaction=True)
def test_competing_bulk_assignment_imports_preserve_overlap_guard_and_return_row_outcomes():
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from django.db import close_old_connections
    from django.contrib.auth import get_user_model
    from apps.common.api_views import preview_leave_policy_assignment_conflicts
    from apps.iam.models import RolePermission,Role
    tenant,policy,client=source('bulk-concurrent')
    employee=tenant.employees.get()
    RolePermission.objects.create(role=Role.objects.get(tenant=tenant,code='hr-admin'),permission_key='leave.policies.manage')
    user_id=employee.membership.user_id;gate=Barrier(2)
    payload={'employee_id':str(employee.pk),'leave_policy_id':str(policy.pk),'priority':777,'is_active':True,'effective_from':'2026-10-21','effective_to':None}
    def synchronized(*args,**kwargs):
        result=preview_leave_policy_assignment_conflicts(*args,**kwargs)
        gate.wait(timeout=20)
        return result
    def worker():
        close_old_connections()
        try:
            api=APIClient();api.force_authenticate(get_user_model().objects.get(pk=user_id))
            result=api.post('/api/v1/hr-admin/leave-policy-assignments/bulk-import/',{'rows':[payload]},format='json')
            return result.status_code,result.data
        finally:close_old_connections()
    with patch('apps.common.api_views.preview_leave_policy_assignment_conflicts',side_effect=synchronized):
        with ThreadPoolExecutor(max_workers=2)as pool:results=list(pool.map(lambda _:worker(),range(2)))
    assert sorted(status for status,_ in results)==[201,207]
    assert sum(body['created_count']for _,body in results)==1
    assert sum(body['failed_count']for _,body in results)==1
    assert LeavePolicyAssignment.objects.filter(tenant=tenant).count()==1



def test_bulk_assignment_retains_tenant_and_permission_boundaries(scope):
    tenant,policy,employee,_,client,_=scope
    from apps.iam.models import RolePermission,Role
    role=Role.objects.get(tenant=tenant,code='hr-admin')
    grant=RolePermission.objects.create(role=role,permission_key='leave.policies.manage')
    foreign,foreign_policy,_=source('bulk-foreign')
    row={'employee_id':str(employee.pk),'leave_policy_id':str(policy.pk),'priority':777,'is_active':True,'effective_from':'2026-10-21'}
    url='/api/v1/hr-admin/leave-policy-assignments/bulk-import/'
    response=client.post(url,{'rows':[{**row,'employee_id':str(foreign.employees.get().pk)},{**row,'leave_policy_id':str(foreign_policy.pk)}]},format='json')
    assert response.status_code==207 and response.data['created_count']==0 and response.data['failed_count']==2
    assert LeavePolicyAssignment.objects.count()==0
    grant.delete()
    assert client.post(url,{'rows':[row]},format='json').status_code==403
    assert APIClient().post(url,{'rows':[row]},format='json').status_code==401
    assert LeavePolicyAssignment.objects.count()==0


def test_bulk_assignment_does_not_hide_unrelated_integrity_errors(scope):
    tenant,policy,employee,_,client,_=scope
    from apps.iam.models import RolePermission,Role
    from django.db import IntegrityError
    RolePermission.objects.create(role=Role.objects.get(tenant=tenant,code='hr-admin'),permission_key='leave.policies.manage')
    payload={'rows':[{'employee_id':str(employee.pk),'leave_policy_id':str(policy.pk),'priority':777,'is_active':True}]}
    with patch('apps.common.api_views.save_hr_admin_leave_policy_assignment',side_effect=IntegrityError('Unexpected integrity failure')):
        with pytest.raises(IntegrityError):client.post('/api/v1/hr-admin/leave-policy-assignments/bulk-import/',payload,format='json')
    assert LeavePolicyAssignment.objects.count()==0
