"""Services for platform-led tenant onboarding operations."""

from __future__ import annotations

import secrets

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership, User
from apps.tenant_onboarding.models import (
    AdminProvisioningStatus,
    ChecklistStatus,
    TenantOnboarding,
    TenantOnboardingAdminContact,
    TenantOnboardingChecklistItem,
    TenantOnboardingEvent,
)


ROLE_NAME_BY_CODE = {
    "tenant-admin": "Tenant Admin",
    "hr-admin": "HR Admin",
}


def add_onboarding_event(
    onboarding: TenantOnboarding,
    *,
    event_type: str,
    summary: str = "",
    actor_identifier: str = "",
    payload: dict | None = None,
) -> TenantOnboardingEvent:
    return TenantOnboardingEvent.objects.create(
        onboarding=onboarding,
        event_type=event_type,
        summary=summary,
        actor_identifier=actor_identifier,
        payload=payload or {},
    )


def set_checklist_item_status(
    onboarding: TenantOnboarding,
    *,
    code: str,
    status: str,
    actor_identifier: str = "",
) -> None:
    item = onboarding.checklist_items.filter(code=code).first()
    if not item:
        return
    item.status = status
    if status == ChecklistStatus.COMPLETED:
        item.completed_at = timezone.now()
        item.completed_by_identifier = actor_identifier
    item.save(update_fields=["status", "completed_at", "completed_by_identifier", "updated_at"])


def _ensure_single_primary_contact(contact: TenantOnboardingAdminContact) -> None:
    if not contact.is_primary:
        return
    contact.onboarding.admin_contacts.exclude(id=contact.id).filter(is_primary=True).update(is_primary=False)


def _ensure_tenant_role(tenant, *, role_code: str, role_name: str = "") -> Role:
    default_name = role_name or ROLE_NAME_BY_CODE.get(role_code, role_code.replace("-", " ").title())
    role, _ = Role.objects.get_or_create(
        tenant=tenant,
        code=role_code,
        defaults={
            "name": default_name,
            "is_system_role": True,
            "is_active": True,
        },
    )
    if not role.is_active:
        role.is_active = True
        role.save(update_fields=["is_active", "updated_at"])
    return role


def _next_admin_employee_code(tenant) -> str:
    existing_count = Employee.objects.filter(tenant=tenant, employee_code__startswith="ADMIN-").count()
    while True:
        next_code = f"ADMIN-{existing_count + 1:04d}"
        if not Employee.objects.filter(tenant=tenant, employee_code=next_code).exists():
            return next_code
        existing_count += 1


def _ensure_first_admin_employee_context(contact: TenantOnboardingAdminContact, membership: TenantMembership) -> Employee:
    employee_code = membership.employee_code or _next_admin_employee_code(contact.onboarding.tenant)
    if membership.employee_code != employee_code:
        membership.employee_code = employee_code
        membership.save(update_fields=["employee_code", "updated_at"])

    name_parts = contact.full_name.split(" ", 1)
    employee, created = Employee.objects.get_or_create(
        tenant=contact.onboarding.tenant,
        membership=membership,
        defaults={
            "employee_code": employee_code,
            "first_name": name_parts[0],
            "last_name": name_parts[1] if len(name_parts) > 1 else "",
            "preferred_name": name_parts[0],
            "work_email": contact.email,
            "phone_number": contact.phone_number,
            "employment_status": EmploymentStatus.ACTIVE,
        },
    )
    if not created and employee.employment_status != EmploymentStatus.ACTIVE:
        employee.employment_status = EmploymentStatus.ACTIVE
        employee.save(update_fields=["employment_status", "updated_at"])
    return employee


@transaction.atomic
def provision_tenant_admin_contact(
    contact: TenantOnboardingAdminContact,
    *,
    username: str,
    role_code: str,
    role_name: str,
    password: str,
    must_change_password: bool,
    is_user_active: bool,
    membership_status: str,
    actor_identifier: str = "",
) -> tuple[User, TenantMembership, Role, str]:
    onboarding = contact.onboarding
    tenant = onboarding.tenant

    if contact.user_id or contact.membership_id:
        raise serializers.ValidationError("This contact has already been provisioned.")
    if User.objects.filter(username__iexact=username).exists():
        raise serializers.ValidationError({"username": "A user with this username already exists."})
    if User.objects.filter(email__iexact=contact.email).exists():
        raise serializers.ValidationError({"email": "A user with this email already exists."})

    generated_password = password or secrets.token_urlsafe(10)
    user = User.objects.create_user(
        username=username,
        email=contact.email,
        password=generated_password,
        first_name=contact.full_name.split(" ", 1)[0],
        last_name=contact.full_name.split(" ", 1)[1] if " " in contact.full_name else "",
        display_name=contact.full_name,
        phone_number=contact.phone_number,
        is_active=is_user_active,
        must_change_password=must_change_password,
    )
    membership = TenantMembership.objects.create(
        tenant=tenant,
        user=user,
        status=membership_status or MembershipStatus.ACTIVE,
        is_default=True,
    )
    role = _ensure_tenant_role(tenant, role_code=role_code, role_name=role_name)
    MembershipRole.objects.create(
        membership=membership,
        role=role,
        is_primary=True,
    )
    employee = _ensure_first_admin_employee_context(contact, membership)

    contact.user = user
    contact.membership = membership
    contact.provisioning_status = AdminProvisioningStatus.PROVISIONED
    contact.save(update_fields=["user", "membership", "provisioning_status", "updated_at"])
    _ensure_single_primary_contact(contact)

    set_checklist_item_status(
        onboarding,
        code="first_admin_provisioned",
        status=ChecklistStatus.COMPLETED,
        actor_identifier=actor_identifier,
    )
    add_onboarding_event(
        onboarding,
        event_type="first_admin_provisioned",
        summary=f"Provisioned {contact.email} as {role.code}.",
        actor_identifier=actor_identifier,
        payload={
            "contact_id": str(contact.id),
            "user_id": str(user.id),
            "membership_id": str(membership.id),
            "employee_id": str(employee.id),
            "employee_code": employee.employee_code,
            "role_code": role.code,
        },
    )
    return user, membership, role, generated_password
