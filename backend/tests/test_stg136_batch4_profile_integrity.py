from contextlib import redirect_stdout
from io import StringIO

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.employee_lifecycle.models import EmployeeLifecycleEvent
from apps.tenants.models import Tenant


@pytest.fixture
def profile_workspace(db):
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref="stg4-profile")
    tenant = Tenant.objects.get(code="pw-qa-stg4-profile")
    employee = tenant.employees.select_related("membership__user").get(employee_code="QA-EMP-001")
    return tenant, employee


@pytest.mark.django_db
def test_employee_can_update_only_permitted_profile_fields_with_audit(profile_workspace):
    tenant, employee = profile_workspace
    original_department_id = employee.department_id
    client = APIClient()
    client.force_authenticate(employee.membership.user)

    response = client.patch(
        "/api/v1/me/profile/",
        {"preferred_name": "Esha QA", "personal_email": "esha.qa@example.test", "phone_number": "+91 90000 04007"},
        format="json",
    )

    assert response.status_code == 200
    employee.refresh_from_db()
    assert employee.preferred_name == "Esha QA"
    assert employee.personal_email == "esha.qa@example.test"
    assert employee.phone_number == "+91 90000 04007"
    assert employee.department_id == original_department_id
    event = EmployeeLifecycleEvent.objects.get(tenant=tenant, employee=employee, title="Employee self-service profile updated")
    assert set(event.payload["changes"]) == {"preferred_name", "personal_email", "phone_number"}
    assert event.payload["actor_membership_id"] == str(employee.membership_id)


@pytest.mark.django_db
def test_employee_profile_patch_rejects_hr_controlled_fields(profile_workspace):
    _, employee = profile_workspace
    original_first_name = employee.first_name
    original_department_id = employee.department_id
    client = APIClient()
    client.force_authenticate(employee.membership.user)

    response = client.patch(
        "/api/v1/me/profile/",
        {"first_name": "Forbidden", "department_id": str(employee.department_id)},
        format="json",
    )

    assert response.status_code == 400
    employee.refresh_from_db()
    assert employee.first_name == original_first_name
    assert employee.department_id == original_department_id
    assert not EmployeeLifecycleEvent.objects.filter(employee=employee, title="Employee self-service profile updated").exists()
