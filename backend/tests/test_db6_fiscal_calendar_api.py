from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.iam.models import MembershipRole, MembershipStatus, Role, RolePermission, TenantMembership
from apps.organizations.models import LegalEntity
from apps.payroll.models import AccountingPeriod, AccountingPeriodStatus, FiscalCalendar, FiscalYear
from apps.tenants.models import Tenant


def authorized_client(code, permissions):
    tenant = Tenant.objects.create(code=code, name=code, is_sandbox=True)
    user = get_user_model().objects.create_user(username=f"{code}-admin", password="x")
    membership = TenantMembership.objects.create(
        tenant=tenant, user=user, employee_code=f"{code}-admin", status=MembershipStatus.ACTIVE, is_default=True,
    )
    role = Role.objects.create(tenant=tenant, code="tenant-admin", name="Tenant Admin", is_active=True)
    for permission in permissions:
        RolePermission.objects.create(role=role, permission_key=permission)
    MembershipRole.objects.create(membership=membership, role=role, is_primary=True)
    client = APIClient()
    client.force_authenticate(user)
    return tenant, user, client


@pytest.mark.django_db(transaction=True)
def test_browser_fiscal_api_persists_scoped_calendars_years_periods_and_audit():
    tenant, _, client = authorized_client(
        "db6-fiscal-api",
        ("tenant.settings.view", "tenant.settings.manage", "finance.periods.close", "finance.periods.reopen"),
    )
    entity = LegalEntity.objects.create(tenant=tenant, code="us", name="US Entity", country_code="US")
    tenant_calendar = client.post("/api/v1/tenant-admin/financial-calendars/calendars/", {
        "code": "india-apr", "name": "India April March", "start_month": 4, "start_day": 1,
        "timezone": "Asia/Kolkata", "country_code": "IN", "version": 1, "status": "active",
        "is_default": True, "effective_from": "2026-04-01",
    }, format="json")
    assert tenant_calendar.status_code == 201, tenant_calendar.data
    duplicate_version = client.post("/api/v1/tenant-admin/financial-calendars/calendars/", {
        "code": "india-apr", "name": "Conflicting India Calendar", "start_month": 4, "start_day": 1,
        "timezone": "Asia/Kolkata", "country_code": "IN", "version": 1, "status": "active",
        "is_default": False, "effective_from": "2026-04-01",
    }, format="json")
    assert duplicate_version.status_code == 400
    assert "version" in str(duplicate_version.data).lower()
    entity_calendar = client.post("/api/v1/tenant-admin/financial-calendars/calendars/", {
        "legal_entity_id": str(entity.id), "code": "us-calendar", "name": "US Calendar",
        "start_month": 1, "start_day": 1, "timezone": "America/New_York", "country_code": "US",
        "version": 1, "status": "active", "is_default": True, "effective_from": "2026-01-01",
    }, format="json")
    assert entity_calendar.status_code == 201, entity_calendar.data
    year = client.post("/api/v1/tenant-admin/financial-calendars/years/", {
        "calendar_id": tenant_calendar.data["id"], "code": "FY2026-27", "start_date": "2026-04-01",
        "end_date": "2027-03-31", "status": "open", "version": 1,
    }, format="json")
    assert year.status_code == 201, year.data
    period = client.post("/api/v1/tenant-admin/financial-calendars/periods/", {
        "fiscal_year_id": year.data["id"], "code": "2026-04", "name": "April 2026", "sequence": 1,
        "start_date": "2026-04-01", "end_date": "2026-04-30", "status": "open",
    }, format="json")
    assert period.status_code == 201, period.data

    duplicate = client.post("/api/v1/tenant-admin/financial-calendars/periods/", {
        "fiscal_year_id": year.data["id"], "code": "overlap", "name": "Overlap", "sequence": 2,
        "start_date": "2026-04-15", "end_date": "2026-05-15", "status": "open",
    }, format="json")
    assert duplicate.status_code in {400, 409}
    assert "overlap" in str(duplicate.data).lower()

    close_payload = {"action": "close", "reason": "April finance close", "request_key": "db6-close-april"}
    closed = client.post(f"/api/v1/tenant-admin/financial-calendars/periods/{period.data['id']}/transition/", close_payload, format="json")
    repeated = client.post(f"/api/v1/tenant-admin/financial-calendars/periods/{period.data['id']}/transition/", close_payload, format="json")
    assert closed.status_code == repeated.status_code == 200
    assert closed.data["status"] == repeated.data["status"] == AccountingPeriodStatus.CLOSED
    assert len(repeated.data["status_events"]) == 1
    reopened = client.post(f"/api/v1/tenant-admin/financial-calendars/periods/{period.data['id']}/transition/", {
        "action": "reopen", "reason": "Approved correction window", "request_key": "db6-reopen-april",
    }, format="json")
    assert reopened.status_code == 200
    assert reopened.data["status"] == AccountingPeriodStatus.OPEN
    assert reopened.data["reopen_count"] == 1

    workspace = client.get("/api/v1/tenant-admin/financial-calendars/")
    assert workspace.status_code == 200
    assert len(workspace.data["calendars"]) == 2
    assert FiscalCalendar.objects.filter(tenant=tenant).count() == 2
    assert FiscalYear.objects.filter(tenant=tenant).count() == 1
    assert AccountingPeriod.objects.get(tenant=tenant).status == AccountingPeriodStatus.OPEN


@pytest.mark.django_db(transaction=True)
def test_fiscal_api_rejects_unauthorized_transition_cross_tenant_and_historical_boundary_edit():
    tenant, _, client = authorized_client("db6-fiscal-denied", ("tenant.settings.view", "tenant.settings.manage"))
    other = Tenant.objects.create(code="db6-fiscal-other", name="Other", is_sandbox=True)
    foreign_entity = LegalEntity.objects.create(tenant=other, code="foreign", name="Foreign")
    cross_tenant = client.post("/api/v1/tenant-admin/financial-calendars/calendars/", {
        "legal_entity_id": str(foreign_entity.id), "code": "foreign", "name": "Foreign", "start_month": 1,
        "start_day": 1, "effective_from": "2026-01-01", "status": "active", "is_default": True,
    }, format="json")
    assert cross_tenant.status_code == 400

    calendar = FiscalCalendar.objects.create(
        tenant=tenant, code="history", name="History", start_month=4, start_day=1,
        status="active", is_default=True, effective_from=date(2026, 4, 1),
    )
    year = FiscalYear.objects.create(
        tenant=tenant, calendar=calendar, code="FY2026-27", start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31), status="open",
    )
    period = AccountingPeriod.objects.create(
        tenant=tenant, fiscal_year=year, code="apr", name="April", sequence=1,
        start_date=date(2026, 4, 1), end_date=date(2026, 4, 30), status="open",
    )
    denied = client.post(f"/api/v1/tenant-admin/financial-calendars/periods/{period.id}/transition/", {
        "action": "close", "reason": "Unauthorized close attempt", "request_key": "denied-close",
    }, format="json")
    assert denied.status_code == 403
    edit = client.patch(f"/api/v1/tenant-admin/financial-calendars/calendars/{calendar.id}/", {
        "start_month": 1,
    }, format="json")
    assert edit.status_code == 400
    assert "new fiscal calendar version" in str(edit.data).lower()
    calendar.refresh_from_db()
    assert calendar.start_month == 4
