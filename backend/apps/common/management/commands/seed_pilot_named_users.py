"""Seed named pilot users for operational readiness certification."""

from __future__ import annotations

import json

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership, User
from apps.organizations.models import Branch, BusinessUnit, CostCenter, Department, Designation, EmploymentType, Grade, LegalEntity, Location
from apps.tenants.models import Tenant


DEFAULT_TENANT_CODE = "northstar-foods"
DEFAULT_PASSWORD = "Password@123"


class Command(BaseCommand):
    help = "Creates named finance and support pilot users without touching payroll rehearsal data."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", default=DEFAULT_TENANT_CODE, help="Tenant code to seed users into.")
        parser.add_argument("--password", default=DEFAULT_PASSWORD, help="Password assigned to named pilot users.")

    @transaction.atomic
    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(code=options["tenant_code"]).first()
        if tenant is None:
            raise CommandError(f"Tenant not found: {options['tenant_code']}")

        roles = self._resolve_roles(tenant)
        users = [
            self._seed_user(
                tenant=tenant,
                username="payroll.finance",
                email="payroll.finance@northstar.example",
                first_name="Payal",
                last_name="Finance",
                password=options["password"],
                role_codes=["hr-admin", "payroll-finance-manager"],
                primary_role_code="payroll-finance-manager",
                is_staff=False,
                is_superuser=False,
                roles=roles,
                employee_code="PILOT-FIN-001",
            ),
            self._seed_user(
                tenant=tenant,
                username="support.agent",
                email="support.agent@northstar.example",
                first_name="Samir",
                last_name="Support",
                password=options["password"],
                role_codes=["support-agent"],
                primary_role_code="support-agent",
                is_staff=False,
                is_superuser=False,
                roles=roles,
                employee_code="",
            ),
        ]

        payload = {
            "tenant_code": tenant.code,
            "seeded_at": timezone.now().isoformat(),
            "users": users,
        }
        self.stdout.write(json.dumps(payload, sort_keys=True, default=str))
        self.stdout.write(self.style.SUCCESS(f"Seeded named pilot users for {tenant.code}."))

    def _resolve_roles(self, tenant: Tenant) -> dict[str, Role]:
        definitions = {
            "hr-admin": "HR Admin",
            "payroll-finance-manager": "Payroll Finance Manager",
            "support-agent": "Support Agent",
        }
        roles: dict[str, Role] = {}
        for code, name in definitions.items():
            role, _ = Role.objects.update_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "name": name,
                    "description": "Seeded for pilot operational readiness certification.",
                    "is_system_role": True,
                    "is_active": True,
                },
            )
            roles[code] = role
        return roles

    def _seed_user(
        self,
        *,
        tenant: Tenant,
        username: str,
        email: str,
        first_name: str,
        last_name: str,
        password: str,
        role_codes: list[str],
        primary_role_code: str,
        is_staff: bool,
        is_superuser: bool,
        roles: dict[str, Role],
        employee_code: str,
    ) -> dict:
        user, _ = User.objects.update_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "display_name": f"{first_name} {last_name}",
                "is_active": True,
                "is_staff": is_staff,
                "is_superuser": is_superuser,
                "must_change_password": False,
            },
        )
        user.set_password(password)
        user.save(update_fields=["password"])

        membership, _ = TenantMembership.objects.update_or_create(
            tenant=tenant,
            user=user,
            defaults={
                "employee_code": employee_code,
                "status": MembershipStatus.ACTIVE,
                "is_default": True,
            },
        )
        for role_code in role_codes:
            MembershipRole.objects.update_or_create(
                membership=membership,
                role=roles[role_code],
                defaults={"is_primary": role_code == primary_role_code},
            )
        if employee_code:
            self._seed_employee_context(
                tenant=tenant,
                membership=membership,
                employee_code=employee_code,
                first_name=first_name,
                last_name=last_name,
                email=email,
            )

        return {
            "username": username,
            "email": email,
            "role_codes": role_codes,
            "default_membership_id": str(membership.id),
            "employee_code": employee_code,
        }

    def _seed_employee_context(
        self,
        *,
        tenant: Tenant,
        membership: TenantMembership,
        employee_code: str,
        first_name: str,
        last_name: str,
        email: str,
    ) -> None:
        legal_entity = LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("created_at").first()
        branch = Branch.objects.filter(tenant=tenant, is_active=True).order_by("created_at").first()
        location = Location.objects.filter(tenant=tenant, is_active=True).order_by("created_at").first()
        business_unit = BusinessUnit.objects.filter(tenant=tenant, is_active=True).order_by("created_at").first()
        department = Department.objects.filter(tenant=tenant, is_active=True).order_by("created_at").first()
        cost_center = CostCenter.objects.filter(tenant=tenant, is_active=True).order_by("created_at").first()
        designation = Designation.objects.filter(tenant=tenant, is_active=True).order_by("created_at").first()
        grade = Grade.objects.filter(tenant=tenant, is_active=True).order_by("created_at").first()
        employment_type = EmploymentType.objects.filter(tenant=tenant, is_active=True).order_by("created_at").first()

        Employee.objects.update_or_create(
            tenant=tenant,
            employee_code=employee_code,
            defaults={
                "membership": membership,
                "first_name": first_name,
                "last_name": last_name,
                "preferred_name": first_name,
                "work_email": email,
                "personal_email": f"{employee_code.lower()}@pilot100.example",
                "phone_number": "+91 9800000101",
                "date_of_joining": timezone.localdate(),
                "employment_status": EmploymentStatus.ACTIVE,
                "legal_entity": legal_entity,
                "branch": branch,
                "location": location,
                "department": department,
                "business_unit": business_unit,
                "cost_center": cost_center,
                "designation": designation,
                "grade": grade,
                "employment_type": employment_type,
            },
        )
