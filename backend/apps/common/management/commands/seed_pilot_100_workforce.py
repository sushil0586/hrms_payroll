"""Seed a manifest-backed 100 employee pilot workforce."""

from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee, EmployeeBankAccount, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership, User
from apps.organizations.models import Branch, BusinessUnit, CostCenter, Department, Designation, EmploymentType, Grade, LegalEntity, Location
from apps.payroll.models import (
    EmployeeSalaryAssignment,
    EmployeeStatutoryProfile,
    PayGroup,
    PayGroupAssignment,
    PayGroupStatus,
    PayrollConfigStatus,
    PayrollStatutoryPack,
    SalaryStructureVersion,
)
from apps.tenants.models import Tenant


DEFAULT_TENANT_CODE = "northstar-foods"
DEFAULT_PREFIX = "PILOT100_20260912"


class Command(BaseCommand):
    help = "Creates or cleans a 100-employee pilot workforce with a portable JSON manifest."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", default=DEFAULT_TENANT_CODE, help="Tenant code to seed.")
        parser.add_argument("--prefix", default=DEFAULT_PREFIX, help="Stable run prefix used for user, employee, and manifest ids.")
        parser.add_argument("--password", default="Password@123", help="Password assigned to seeded pilot users.")
        parser.add_argument("--output-file", default="", help="Optional JSON manifest output path.")
        parser.add_argument("--cleanup", action="store_true", help="Delete this prefix's pilot workforce instead of seeding it.")
        parser.add_argument("--skip-bootstrap", action="store_true", help="Do not call bootstrap_demo_workspace before seeding.")

    @transaction.atomic
    def handle(self, *args, **options):
        tenant_code = options["tenant_code"]
        prefix = self._normalize_prefix(options["prefix"])

        if not options["skip_bootstrap"] and not options["cleanup"]:
            call_command("bootstrap_demo_workspace", password=options["password"], stdout=self.stdout)

        tenant = Tenant.objects.filter(code=tenant_code).first()
        if tenant is None:
            raise CommandError(f"Tenant not found: {tenant_code}")

        cleanup_summary = self._cleanup(tenant=tenant, prefix=prefix)
        if options["cleanup"]:
            manifest = {
                "seed_ref": prefix,
                "tenant_code": tenant.code,
                "action": "cleanup",
                "cleanup": cleanup_summary,
                "generated_at": timezone.now().isoformat(),
            }
            self._write_manifest(options["output_file"], manifest)
            self.stdout.write(self.style.SUCCESS(f"Cleaned pilot workforce {prefix} for {tenant.code}."))
            return

        org = self._resolve_org(tenant)
        roles = self._resolve_roles(tenant)
        payroll = self._resolve_payroll_setup(tenant)
        employees = self._seed_people(
            tenant=tenant,
            prefix=prefix,
            password=options["password"],
            org=org,
            roles=roles,
            payroll=payroll,
        )

        manifest = {
            "seed_ref": prefix,
            "tenant_code": tenant.code,
            "generated_at": timezone.now().isoformat(),
            "cleanup": cleanup_summary,
            "counts": {
                "employees": len(employees),
                "managers": len([item for item in employees if item["persona"] == "manager"]),
                "employees_with_bank": len([item for item in employees if item["bank_status"] == "valid"]),
                "employees_missing_bank": len([item for item in employees if item["bank_status"] == "missing"]),
                "pay_group_assignments": len([item for item in employees if item["pay_group_assignment_id"]]),
                "salary_assignments": len([item for item in employees if item["salary_assignment_id"]]),
                "statutory_profiles": len([item for item in employees if item["statutory_profile_id"]]),
            },
            "scenario_distribution": self._scenario_distribution(),
            "payroll_setup": {
                "pay_group_code": payroll["pay_group"].code if payroll["pay_group"] else None,
                "salary_structure_version": str(payroll["salary_version"]) if payroll["salary_version"] else None,
                "statutory_pack_code": payroll["statutory_pack"].code if payroll["statutory_pack"] else None,
            },
            "employees": employees,
        }
        self._write_manifest(options["output_file"], manifest)

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(employees)} pilot employees for {tenant.code} with prefix {prefix}."))
        if options["output_file"]:
            self.stdout.write(f"Manifest: {options['output_file']}")

    def _normalize_prefix(self, value: str) -> str:
        normalized = value.strip().upper().replace("-", "_")
        if not normalized:
            raise CommandError("Prefix cannot be blank.")
        if len(normalized) > 40:
            raise CommandError("Prefix must be 40 characters or fewer.")
        return normalized

    def _cleanup(self, *, tenant: Tenant, prefix: str) -> dict[str, int]:
        employee_codes = [self._employee_code(prefix, index) for index in range(1, 101)]
        employees = Employee.objects.filter(tenant=tenant, employee_code__in=employee_codes)
        memberships = TenantMembership.objects.filter(tenant=tenant, employee_code__in=employee_codes)
        usernames = [self._username(prefix, index) for index in range(1, 101)]
        users = User.objects.filter(username__in=usernames)

        deleted_employees = employees.delete()[0]
        deleted_membership_roles = MembershipRole.objects.filter(membership__in=memberships).delete()[0]
        deleted_memberships = memberships.delete()[0]
        deleted_users = users.delete()[0]
        return {
            "employees": deleted_employees,
            "membership_roles": deleted_membership_roles,
            "memberships": deleted_memberships,
            "users": deleted_users,
        }

    def _resolve_org(self, tenant: Tenant):
        org = {
            "legal_entities": list(LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")),
            "branches": list(Branch.objects.filter(tenant=tenant, is_active=True).select_related("legal_entity", "location").order_by("name")),
            "locations": list(Location.objects.filter(tenant=tenant, is_active=True).order_by("name")),
            "business_units": list(BusinessUnit.objects.filter(tenant=tenant, is_active=True).order_by("name")),
            "departments": list(Department.objects.filter(tenant=tenant, is_active=True).select_related("business_unit").order_by("name")),
            "cost_centers": list(CostCenter.objects.filter(tenant=tenant, is_active=True).select_related("legal_entity").order_by("name")),
            "grades": list(Grade.objects.filter(tenant=tenant, is_active=True).order_by("level", "name")),
            "designations": list(Designation.objects.filter(tenant=tenant, is_active=True).select_related("grade").order_by("name")),
            "employment_types": list(EmploymentType.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        }
        missing = [key for key, values in org.items() if not values]
        if missing:
            raise CommandError(f"Missing active organization masters for pilot seed: {', '.join(missing)}")
        return org

    def _resolve_roles(self, tenant: Tenant):
        roles = {}
        for code, name in [("manager", "Manager"), ("employee", "Employee")]:
            role, _ = Role.objects.update_or_create(
                tenant=tenant,
                code=code,
                defaults={"name": name, "is_system_role": True, "is_active": True},
            )
            roles[code] = role
        return roles

    def _resolve_payroll_setup(self, tenant: Tenant):
        return {
            "pay_group": PayGroup.objects.filter(tenant=tenant, status=PayGroupStatus.ACTIVE).order_by("-created_at").first(),
            "salary_version": SalaryStructureVersion.objects.filter(tenant=tenant, status=PayrollConfigStatus.ACTIVE).order_by("-created_at").first(),
            "statutory_pack": PayrollStatutoryPack.objects.filter(tenant=tenant, status=PayrollConfigStatus.ACTIVE).order_by("-created_at").first(),
        }

    def _seed_people(self, *, tenant: Tenant, prefix: str, password: str, org: dict, roles: dict, payroll: dict) -> list[dict]:
        created: list[dict] = []
        manager_employees: list[Employee] = []
        seed_payload = {"seed_ref": prefix, "surface": "pilot_100_workforce", "seeded_at": timezone.now().isoformat()}
        effective_from = date(2026, 4, 1)

        for index in range(1, 101):
            code = self._employee_code(prefix, index)
            username = self._username(prefix, index)
            first_name, last_name = self._person_name(index)
            persona = "manager" if index <= 10 else "employee"
            scenario = self._scenario_for(index)
            department = org["departments"][(index - 1) % len(org["departments"])]
            business_unit = department.business_unit or org["business_units"][(index - 1) % len(org["business_units"])]
            branch = org["branches"][(index - 1) % len(org["branches"])]
            legal_entity = branch.legal_entity or org["legal_entities"][(index - 1) % len(org["legal_entities"])]
            location = branch.location or org["locations"][(index - 1) % len(org["locations"])]
            matching_cost_centers = [item for item in org["cost_centers"] if not item.legal_entity_id or item.legal_entity_id == legal_entity.id]
            cost_center = matching_cost_centers[(index - 1) % len(matching_cost_centers)] if matching_cost_centers else org["cost_centers"][0]
            designation = org["designations"][(index - 1) % len(org["designations"])]
            grade = designation.grade or org["grades"][(index - 1) % len(org["grades"])]
            employment_type = org["employment_types"][(index - 1) % len(org["employment_types"])]
            manager = None if persona == "manager" else manager_employees[(index - 11) % len(manager_employees)]

            user, _ = User.objects.update_or_create(
                username=username,
                defaults={
                    "email": f"{username}@pilot100.example",
                    "first_name": first_name,
                    "last_name": last_name,
                    "display_name": f"{first_name} {last_name}",
                    "is_active": True,
                    "is_staff": False,
                    "is_superuser": False,
                },
            )
            user.set_password(password)
            user.save(update_fields=["password"])

            membership, _ = TenantMembership.objects.update_or_create(
                tenant=tenant,
                user=user,
                defaults={"employee_code": code, "status": MembershipStatus.ACTIVE, "is_default": True},
            )
            MembershipRole.objects.update_or_create(
                membership=membership,
                role=roles[persona],
                defaults={"is_primary": True},
            )

            employee, _ = Employee.objects.update_or_create(
                tenant=tenant,
                employee_code=code,
                defaults={
                    "membership": membership,
                    "first_name": first_name,
                    "last_name": last_name,
                    "preferred_name": first_name,
                    "work_email": f"{username}@pilot100.example",
                    "personal_email": f"{username}.personal@pilot100.example",
                    "phone_number": f"+91 98{index:08d}",
                    "date_of_birth": date(1990 + (index % 15), ((index - 1) % 12) + 1, min(((index - 1) % 28) + 1, 28)),
                    "date_of_joining": date(2024 + (index % 3), ((index - 1) % 12) + 1, 1),
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
                    "reporting_manager": manager,
                },
            )
            if persona == "manager":
                manager_employees.append(employee)

            bank_status = self._seed_bank(employee=employee, index=index)
            pay_group_assignment = self._seed_pay_group_assignment(employee=employee, pay_group=payroll["pay_group"], effective_from=effective_from, payload=seed_payload)
            salary_assignment = self._seed_salary_assignment(employee=employee, salary_version=payroll["salary_version"], index=index, effective_from=effective_from, payload=seed_payload)
            statutory_profile = self._seed_statutory_profile(employee=employee, statutory_pack=payroll["statutory_pack"], index=index, effective_from=effective_from, payload=seed_payload)

            created.append(
                {
                    "index": index,
                    "employee_id": str(employee.id),
                    "employee_code": employee.employee_code,
                    "username": username,
                    "persona": persona,
                    "scenario": scenario,
                    "manager_employee_code": manager.employee_code if manager else None,
                    "department": department.name,
                    "branch": branch.name,
                    "cost_center": cost_center.name,
                    "bank_status": bank_status,
                    "pay_group_assignment_id": str(pay_group_assignment.id) if pay_group_assignment else None,
                    "salary_assignment_id": str(salary_assignment.id) if salary_assignment else None,
                    "statutory_profile_id": str(statutory_profile.id) if statutory_profile else None,
                }
            )
        return created

    def _seed_bank(self, *, employee: Employee, index: int) -> str:
        EmployeeBankAccount.objects.filter(employee=employee).delete()
        if index > 95:
            return "missing"
        EmployeeBankAccount.objects.create(
            employee=employee,
            account_holder_name=f"{employee.first_name} {employee.last_name}",
            bank_name="Pilot Bank",
            account_number=f"990000{index:06d}",
            ifsc_code=f"PILT0{index:06d}"[-11:],
            branch_name="Pilot Payroll Branch",
            is_primary=True,
        )
        return "valid"

    def _seed_pay_group_assignment(self, *, employee: Employee, pay_group: PayGroup | None, effective_from: date, payload: dict):
        if pay_group is None:
            return None
        PayGroupAssignment.objects.filter(employee=employee).delete()
        return PayGroupAssignment.objects.create(
            tenant=employee.tenant,
            employee=employee,
            pay_group=pay_group,
            effective_from=effective_from,
            status=PayGroupStatus.ACTIVE,
            config_snapshot=payload,
        )

    def _seed_salary_assignment(self, *, employee: Employee, salary_version: SalaryStructureVersion | None, index: int, effective_from: date, payload: dict):
        if salary_version is None:
            return None
        EmployeeSalaryAssignment.objects.filter(employee=employee).delete()
        return EmployeeSalaryAssignment.objects.create(
            tenant=employee.tenant,
            employee=employee,
            structure_version=salary_version,
            effective_from=effective_from,
            status=PayrollConfigStatus.ACTIVE,
            annual_ctc_override=Decimal("600000.00") + Decimal(index * 12000),
            assignment_reason="Pilot 100 workforce scenario distribution",
            config_snapshot=payload,
        )

    def _seed_statutory_profile(self, *, employee: Employee, statutory_pack: PayrollStatutoryPack | None, index: int, effective_from: date, payload: dict):
        if statutory_pack is None:
            return None
        EmployeeStatutoryProfile.objects.filter(employee=employee).delete()
        return EmployeeStatutoryProfile.objects.create(
            tenant=employee.tenant,
            employee=employee,
            statutory_pack=statutory_pack,
            profile_ref="payroll.employee_statutory_profile.pilot100.v1",
            effective_from=effective_from,
            status=PayrollConfigStatus.ACTIVE,
            pan_number=f"ABCDE{index % 10000:04d}F",
            uan_number=f"10000000{index:04d}"[-12:],
            pf_number=f"PF/PILOT/{index:04d}",
            esi_number=f"ESI{index:07d}",
            pf_applicable=index % 5 != 0,
            esi_applicable=index % 4 == 0,
            professional_tax_state="KA",
            lwf_state="KA",
            declaration_status="not_started",
            source_ref=f"{payload['seed_ref']}:{employee.employee_code}:statutory",
            config_snapshot=payload,
        )

    def _scenario_distribution(self):
        return {
            "1-10": "Managers with direct reports",
            "11-40": "Standard active salaried employees",
            "41-60": "Leave/attendance variation candidates",
            "61-75": "Overtime/adjustment candidates",
            "76-85": "Statutory declaration variation candidates",
            "86-90": "Lifecycle/probation/movement candidates",
            "91-95": "Payroll ready employees with bank data",
            "96-100": "Bank-readiness blockers with missing bank account",
        }

    def _scenario_for(self, index: int) -> str:
        if index <= 10:
            return "manager"
        if index <= 40:
            return "standard_active"
        if index <= 60:
            return "leave_attendance_variation"
        if index <= 75:
            return "overtime_adjustment"
        if index <= 85:
            return "statutory_declaration_variation"
        if index <= 90:
            return "lifecycle_variation"
        if index <= 95:
            return "payroll_ready"
        return "missing_bank_blocker"

    def _person_name(self, index: int) -> tuple[str, str]:
        first_names = ["Aarav", "Diya", "Ishaan", "Kavya", "Rohan", "Meera", "Vihaan", "Anika", "Kabir", "Saanvi"]
        last_names = ["Sharma", "Rao", "Mehta", "Iyer", "Patel", "Gupta", "Nair", "Verma", "Bose", "Kulkarni"]
        return first_names[(index - 1) % len(first_names)], f"{last_names[(index - 1) % len(last_names)]}{index:03d}"

    def _employee_code(self, prefix: str, index: int) -> str:
        return f"{prefix}_E{index:03d}"

    def _username(self, prefix: str, index: int) -> str:
        return f"{prefix.lower()}.e{index:03d}"

    def _write_manifest(self, output_file: str, manifest: dict) -> None:
        if not output_file:
            return
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(manifest, indent=2, sort_keys=True, default=str), encoding="utf-8")
