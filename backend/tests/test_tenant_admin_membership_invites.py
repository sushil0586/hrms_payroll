import pytest

from apps.common.selectors import invite_tenant_admin_membership
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership, User
from apps.notifications.models import Notification
from apps.tenants.models import Tenant, TenantStatus


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("role_code", "expected_prefix"),
    [
        ("hr-admin", "ADMIN-"),
        ("employee", "EMP-"),
        ("manager", "MGR-"),
        ("payroll-finance-manager", "FIN-"),
    ],
)
def test_active_workspace_invite_creates_employee_context(role_code, expected_prefix):
    tenant = Tenant.objects.create(
        code="inviteco",
        name="Invite Co",
        status=TenantStatus.ACTIVE,
        primary_email="owner@inviteco.test",
    )
    role = Role.objects.create(
        tenant=tenant,
        code=role_code,
        name=role_code.replace("-", " ").title(),
        is_system_role=True,
        is_active=True,
    )

    result = invite_tenant_admin_membership(
        tenant,
        actor_identifier="tenant.admin",
        payload={
            "username": "aditi.gupta",
            "email": "aditi.gupta@example.com",
            "first_name": "Aditi",
            "last_name": "Gupta",
            "membership_status": MembershipStatus.ACTIVE,
            "is_default_membership": True,
            "role_ids": [role.id],
        },
    )

    user = User.objects.get(email="aditi.gupta@example.com")
    membership = TenantMembership.objects.get(tenant=tenant, user=user)
    employee = Employee.objects.get(tenant=tenant, membership=membership)

    assert result["membership"]["roles"][0]["code"] == role_code
    assert membership.status == MembershipStatus.ACTIVE
    assert membership.is_default is True
    assert membership.employee_code == employee.employee_code
    assert employee.employee_code.startswith(expected_prefix)
    assert employee.first_name == "Aditi"
    assert employee.last_name == "Gupta"
    assert employee.work_email == "aditi.gupta@example.com"
    assert employee.employment_status == EmploymentStatus.ACTIVE
    assert MembershipRole.objects.filter(membership=membership, role=role, is_primary=True).exists()
    assert Notification.objects.filter(recipient_membership=membership, subject_type="account_invite").exists()
