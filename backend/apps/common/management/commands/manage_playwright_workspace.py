"""Provision disposable, manifest-backed Playwright workspaces."""

from __future__ import annotations

import json
import re
from datetime import date, time
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.attendance.models import (
    AttendanceRecord,
    AttendanceRegularization,
    AttendancePolicy,
    AttendancePolicyAssignment,
    AttendancePolicyStatus,
    EmployeeShiftAssignment,
    Shift,
    AttendanceSource,
    AttendanceStatus,
    RegularizationStatus,
)
from apps.documents.models import DocumentCategory, DocumentCategoryType
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, RolePermission, TenantMembership, User
from apps.iam.permission_catalog import get_permission_catalog
from apps.leave_management.models import (
    AccrualFrequency,
    LeaveBalance,
    LeaveCategory,
    LeavePolicy,
    LeavePolicyAssignment,
    LeavePolicyStatus,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
)
from apps.organizations.models import (
    Branch,
    BusinessUnit,
    CostCenter,
    Department,
    Designation,
    EmploymentType,
    Grade,
    LegalEntity,
    Location,
)
from apps.payroll.models import (
    EmployeeSalaryAssignment,
    EmployeeStatutoryDeclaration,
    EmployeeStatutoryProfile,
    PayrollArtifactAccessEvent,
    PayrollArtifactSignedAccessGrant,
    PayrollBackgroundJob,
    PayrollCalculationLine,
    PayrollFinanceHandoff,
    PayrollInputSnapshot,
    PayrollOutputArtifact,
    PayrollOutputBatch,
    PayGroup,
    PayGroupAssignment,
    PayGroupStatus,
    PayrollCalendar,
    PayrollConfigStatus,
    PayrollCalculationStatus,
    PayrollInputSnapshotStatus,
    PayrollPeriod,
    PayrollPeriodStatus,
    PayrollRuleDefinition,
    PayrollRuleType,
    PayrollRuleVersion,
    PayrollRuleVersionStatus,
    PayrollRun,
    PayrollRunStatus,
    PayrollRunCalculation,
    PayrollRunReview,
    PayrollReviewStatus,
    PayrollStatutoryComponent,
    PayrollStatutoryComponentKind,
    PayrollStatutoryEmployerRegistration,
    PayrollStatutoryFilingCalendar,
    PayrollStatutoryPack,
    PayrollStatutorySlab,
    SalaryComponent,
    SalaryComponentType,
    SalaryComponentValueType,
    SalaryStructure,
    SalaryStructureComponent,
    SalaryStructureVersion,
)
from apps.platform_policies.models import PlatformPolicyDomain, PlatformPolicyPack, PlatformPolicyPackStatus
from apps.tenant_onboarding.models import TenantOnboarding, TenantOnboardingAdminContact
from apps.tenants.models import SubscriptionPlan, Tenant, TenantOnboardingStatus, TenantStatus


TENANT_PREFIX = "pw-qa-"
OWNER_EMAIL_DOMAIN = "playwright.qa.invalid"


class Command(BaseCommand):
    help = "Creates, audits, or removes an isolated Playwright-owned QA workspace."

    def add_arguments(self, parser):
        parser.add_argument("--seed-ref", required=True)
        parser.add_argument("--tenant-code", default="")
        parser.add_argument("--password", default="Password@123")
        parser.add_argument("--output-file", default="")
        parser.add_argument("--audit", action="store_true")
        parser.add_argument("--cleanup", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["audit"] and options["cleanup"]:
            raise CommandError("Choose either --audit or --cleanup, not both.")
        seed_ref = self._normalize(options["seed_ref"])
        tenant_code = options["tenant_code"] or f"{TENANT_PREFIX}{seed_ref}"
        self._assert_safe_identity(seed_ref, tenant_code)

        tenant = Tenant.objects.filter(code=tenant_code).first()
        if options["cleanup"]:
            manifest = self._cleanup(tenant, seed_ref, tenant_code)
        elif options["audit"]:
            if tenant is None:
                raise CommandError(f"Workspace does not exist: {tenant_code}")
            self._assert_owned(tenant, seed_ref)
            manifest = self._manifest(tenant, seed_ref, action="audit")
        else:
            if tenant is not None:
                self._assert_owned(tenant, seed_ref)
                raise CommandError("Owned workspace already exists; audit or clean it before reprovisioning.")
            tenant = self._provision(seed_ref, tenant_code, options["password"])
            manifest = self._manifest(tenant, seed_ref, action="provision")

        payload = json.dumps(manifest, indent=2, sort_keys=True)
        if options["output_file"]:
            path = Path(options["output_file"])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(payload + "\n", encoding="utf-8")
        self.stdout.write(payload)

    def _normalize(self, value: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
        if not normalized or len(normalized) > 32:
            raise CommandError("seed-ref must normalize to 1-32 lowercase characters.")
        return normalized

    def _owner_email(self, seed_ref: str) -> str:
        return f"owner+{seed_ref}@{OWNER_EMAIL_DOMAIN}"

    def _assert_safe_identity(self, seed_ref: str, tenant_code: str) -> None:
        if not tenant_code.startswith(TENANT_PREFIX) or tenant_code != f"{TENANT_PREFIX}{seed_ref}":
            raise CommandError(f"tenant-code must be exactly {TENANT_PREFIX}<normalized-seed-ref>.")

    def _assert_owned(self, tenant: Tenant, seed_ref: str) -> None:
        if not tenant.is_sandbox or tenant.primary_email != self._owner_email(seed_ref):
            raise CommandError("Refusing to modify a tenant without matching Playwright ownership markers.")

    def _provision(self, seed_ref: str, tenant_code: str, password: str) -> Tenant:
        marker = {"owner": "playwright", "seed_ref": seed_ref}
        tenant = Tenant.objects.create(
            code=tenant_code,
            name=f"Playwright QA {seed_ref}",
            legal_name=f"Playwright-owned disposable workspace [{seed_ref}]",
            status=TenantStatus.ACTIVE,
            subscription_plan=SubscriptionPlan.ENTERPRISE,
            primary_email=self._owner_email(seed_ref),
            timezone="Asia/Kolkata",
            country_code="IN",
            is_sandbox=True,
            onboarding_status=TenantOnboardingStatus.ACTIVE,
        )
        org = self._create_org(tenant)
        people = self._create_people(tenant, seed_ref, password, org)
        self._create_platform_admin(seed_ref, password)
        self._create_platform_fixture(tenant, seed_ref, people["tenant_admin"])
        self._create_document_fixture(tenant)
        self._create_payroll(tenant, people["employee"], org, marker)
        self._create_leave_and_attendance(tenant, people["employee"], org, marker)
        return tenant

    def _create_org(self, tenant: Tenant) -> dict:
        legal_entity = LegalEntity.objects.create(tenant=tenant, code="qa-entity", name="QA Entity", registered_name="QA Entity Pvt Ltd", timezone=tenant.timezone)
        location = Location.objects.create(tenant=tenant, code="qa-location", name="QA Location", city="Pune", state="Maharashtra")
        branch = Branch.objects.create(tenant=tenant, code="qa-branch", name="QA Branch", legal_entity=legal_entity, location=location)
        business_unit = BusinessUnit.objects.create(tenant=tenant, code="qa-business", name="QA Business")
        department = Department.objects.create(tenant=tenant, code="qa-people", name="QA People", business_unit=business_unit)
        cost_center = CostCenter.objects.create(tenant=tenant, code="qa-cost", name="QA Cost", legal_entity=legal_entity)
        grade = Grade.objects.create(tenant=tenant, code="qa-grade", name="QA Grade", level=1)
        designation = Designation.objects.create(tenant=tenant, code="qa-engineer", name="QA Engineer", grade=grade)
        employment_type = EmploymentType.objects.create(tenant=tenant, code="qa-full-time", name="QA Full Time")
        return locals()

    def _create_people(self, tenant: Tenant, seed_ref: str, password: str, org: dict) -> dict:
        result = {}
        catalog = get_permission_catalog()
        definitions = [
            ("hr_admin", "hr-admin", "HR Admin", "QA-HR-001", "Harini", "Admin"),
            ("manager", "manager", "Manager", "QA-MGR-001", "Manav", "Manager"),
            ("employee", "employee", "Employee", "QA-EMP-001", "Esha", "Employee"),
            ("tenant_admin", "tenant-admin", "Tenant Admin", "QA-TA-001", "Tanvi", "Admin"),
        ]
        manager = None
        for key, role_code, role_name, employee_code, first_name, last_name in definitions:
            username = f"pw_{seed_ref.replace('-', '_')}_{key}"
            user = User.objects.create_user(
                username=username,
                email=f"{username}@{OWNER_EMAIL_DOMAIN}",
                password=password,
                first_name=first_name,
                last_name=last_name,
                display_name=f"{first_name} {last_name}",
            )
            membership = TenantMembership.objects.create(tenant=tenant, user=user, employee_code=employee_code, status=MembershipStatus.ACTIVE, is_default=True)
            role = Role.objects.create(tenant=tenant, code=role_code, name=role_name, is_system_role=True, is_active=True)
            MembershipRole.objects.create(membership=membership, role=role, is_primary=True)
            for permission in catalog:
                if role_code in permission.get("default_role_codes", []):
                    RolePermission.objects.create(role=role, permission_key=permission["key"], description="Playwright workspace default permission.")
            employee = Employee.objects.create(
                tenant=tenant,
                membership=membership,
                employee_code=employee_code,
                first_name=first_name,
                last_name=last_name,
                preferred_name=first_name,
                work_email=user.email,
                date_of_joining=date(2024, 1, 1),
                employment_status=EmploymentStatus.ACTIVE,
                legal_entity=org["legal_entity"], branch=org["branch"], location=org["location"],
                department=org["department"], business_unit=org["business_unit"], cost_center=org["cost_center"],
                designation=org["designation"], grade=org["grade"], employment_type=org["employment_type"],
                reporting_manager=manager,
            )
            if key == "manager":
                manager = employee
            result[key] = {"user": user, "membership": membership, "employee": employee}
        return {key: value["employee"] for key, value in result.items()}

    def _create_platform_admin(self, seed_ref: str, password: str) -> User:
        username = f"pw_{seed_ref.replace('-', '_')}_platform_admin"
        return User.objects.create_superuser(
            username=username,
            email=f"{username}@{OWNER_EMAIL_DOMAIN}",
            password=password,
            first_name="Priya",
            last_name="Platform",
            display_name="Priya Platform",
        )

    def _create_payroll(self, tenant: Tenant, employee: Employee, org: dict, marker: dict) -> None:
        calendar = PayrollCalendar.objects.create(tenant=tenant, code="qa-monthly", name="QA Monthly", timezone=tenant.timezone, config_snapshot=marker)
        period = PayrollPeriod.objects.create(
            tenant=tenant, calendar=calendar, code="2026-10", name="October 2026",
            start_date=date(2026, 10, 1), end_date=date(2026, 10, 31), pay_date=date(2026, 10, 31),
            status=PayrollPeriodStatus.OPEN, config_snapshot=marker,
        )
        pay_group = PayGroup.objects.create(
            tenant=tenant, calendar=calendar, code="qa-monthly", name="QA Monthly", status=PayGroupStatus.ACTIVE,
            legal_entity=org["legal_entity"], branch=org["branch"], location=org["location"],
            department=org["department"], employment_type=org["employment_type"], config_snapshot=marker,
        )
        pay_group_assignment = PayGroupAssignment.objects.create(tenant=tenant, pay_group=pay_group, employee=employee, effective_from=date(2024, 1, 1), config_snapshot=marker)
        component = SalaryComponent.objects.create(
            tenant=tenant, code="qa-basic", name="QA Basic", component_type=SalaryComponentType.EARNING,
            value_type=SalaryComponentValueType.FIXED_AMOUNT, is_taxable=True, status=PayrollConfigStatus.ACTIVE, config_snapshot=marker,
        )
        structure = SalaryStructure.objects.create(tenant=tenant, code="qa-structure", name="QA Structure", pay_group=pay_group, status=PayrollConfigStatus.ACTIVE, config_snapshot=marker)
        version = SalaryStructureVersion.objects.create(
            tenant=tenant, structure=structure, version=1, effective_from=date(2024, 1, 1),
            status=PayrollConfigStatus.ACTIVE, annual_ctc=Decimal("600000.00"), config_snapshot=marker,
        )
        SalaryStructureComponent.objects.create(tenant=tenant, structure_version=version, component=component, amount=Decimal("50000.00"), config_snapshot=marker)
        salary_assignment = EmployeeSalaryAssignment.objects.create(
            tenant=tenant, employee=employee, structure_version=version, effective_from=date(2024, 1, 1),
            status=PayrollConfigStatus.ACTIVE, config_snapshot=marker,
        )
        rule = PayrollRuleDefinition.objects.create(
            tenant=tenant,
            code="qa-monthly-gross",
            name="QA Monthly Gross",
            rule_type=PayrollRuleType.FORMULA,
            config_snapshot={
                **marker,
                "component_code": "QA_GROSS",
                "component_name": "QA Monthly Gross",
                "component_type": "earning",
                "calculation_order": 10,
                "output_path": "components.qa_gross",
            },
        )
        PayrollRuleVersion.objects.create(
            tenant=tenant,
            rule=rule,
            version=1,
            status=PayrollRuleVersionStatus.ACTIVE,
            expression="salary.monthly_gross",
            effective_from=date(2024, 1, 1),
            config_snapshot=rule.config_snapshot,
        )
        if period.calendar_id != pay_group.calendar_id:
            raise CommandError("Provisioned payroll period and pay group calendars differ.")

        statutory_pack = PayrollStatutoryPack.objects.create(
            tenant=tenant, code="qa-india-2026", name="QA India 2026", status=PayrollConfigStatus.ACTIVE,
            effective_from=date(2026, 4, 1), effective_to=date(2027, 3, 31), config_snapshot=marker,
        )
        PayrollStatutoryComponent.objects.create(
            tenant=tenant, statutory_pack=statutory_pack, salary_component=component, code="qa-tds",
            name="QA TDS", statutory_type=PayrollStatutoryComponentKind.TAX_DEDUCTED_AT_SOURCE,
            statutory_treatment_ref="payroll.statutory.tds.qa.v1",
            status=PayrollConfigStatus.ACTIVE, config_snapshot=marker,
        )
        statutory_profile = EmployeeStatutoryProfile.objects.create(
            tenant=tenant, employee=employee, statutory_pack=statutory_pack, effective_from=date(2026, 4, 1),
            effective_to=date(2027, 3, 31), source_ref="playwright:workspace", config_snapshot=marker,
        )
        EmployeeStatutoryDeclaration.objects.create(
            tenant=tenant, employee=employee, employee_statutory_profile=statutory_profile,
            statutory_pack=statutory_pack, financial_year_code="2026-27", source_ref="playwright:workspace",
            config_snapshot=marker,
        )

        run = PayrollRun.objects.create(
            tenant=tenant, period=period, pay_group=pay_group, code="qa-inputs-locked", name="QA Inputs Locked",
            status=PayrollRunStatus.INPUTS_LOCKED, locked_by=employee.membership.user, config_snapshot=marker,
        )
        PayrollInputSnapshot.objects.create(
            tenant=tenant, payroll_run=run, employee=employee, pay_group_assignment=pay_group_assignment,
            salary_assignment=salary_assignment, snapshot_status=PayrollInputSnapshotStatus.LOCKED,
            period_start=period.start_date, period_end=period.end_date, locked_at=timezone.now(),
            salary_snapshot={"annual_ctc": "600000.00", "monthly_gross": "50000.00"}, config_snapshot=marker,
        )

    def _create_leave_and_attendance(self, tenant: Tenant, employee: Employee, org: dict, marker: dict) -> None:
        leave_type = LeaveType.objects.create(tenant=tenant, code="qa-casual", name="QA Casual Leave", short_code="QCL", category=LeaveCategory.PAID)
        leave_policy = LeavePolicy.objects.create(
            tenant=tenant, leave_type=leave_type, code="qa-casual-2026", name="QA Casual 2026",
            status=LeavePolicyStatus.ACTIVE, effective_from=date(2026, 1, 1), effective_to=date(2026, 12, 31),
            accrual_frequency=AccrualFrequency.YEARLY, annual_entitlement=Decimal("12.00"), allow_half_day=True,
            config_snapshot=marker,
        )
        LeavePolicyAssignment.objects.create(tenant=tenant, leave_policy=leave_policy, employee=employee, priority=1)
        LeaveBalance.objects.create(tenant=tenant, employee=employee, leave_policy=leave_policy, period_year=2026, opening_balance=Decimal("12.00"), closing_balance=Decimal("12.00"))
        shift = Shift.objects.create(
            tenant=tenant, code="qa-day", name="QA Day", start_time=time(9), end_time=time(18),
            working_hours=Decimal("8.00"), break_minutes=60, weekly_off_days=["saturday", "sunday"],
        )
        policy = AttendancePolicy.objects.create(
            tenant=tenant, code="qa-attendance", name="QA Attendance", status=AttendancePolicyStatus.ACTIVE,
            default_shift=shift, full_day_min_hours=Decimal("8.00"), half_day_min_hours=Decimal("4.00"), config_snapshot=marker,
        )
        AttendancePolicyAssignment.objects.create(tenant=tenant, attendance_policy=policy, employee=employee, priority=1)
        EmployeeShiftAssignment.objects.create(tenant=tenant, employee=employee, shift=shift, effective_from=date(2024, 1, 1), config_snapshot=marker)
        LeaveRequest.objects.create(
            tenant=tenant, employee=employee, leave_type=leave_type, leave_policy=leave_policy,
            status=LeaveRequestStatus.PENDING, start_date=date(2026, 10, 20), end_date=date(2026, 10, 20),
            requested_units=Decimal("1.00"), reason="Playwright manager queue", applied_at=timezone.now(), metadata=marker,
        )
        record = AttendanceRecord.objects.create(
            tenant=tenant, employee=employee, attendance_date=date(2026, 10, 15), status=AttendanceStatus.ABSENT,
            source=AttendanceSource.SYSTEM, shift=shift, source_payload=marker,
        )
        AttendanceRegularization.objects.create(
            tenant=tenant, employee=employee, attendance_record=record, status=RegularizationStatus.PENDING,
            requested_status=AttendanceStatus.PRESENT, reason="Playwright manager queue", applied_at=timezone.now(),
            evidence_payload=marker,
        )

    def _create_document_fixture(self, tenant: Tenant) -> None:
        DocumentCategory.objects.create(
            tenant=tenant, code="qa-identity", name="QA Identity", category_type=DocumentCategoryType.IDENTITY,
            description="Playwright-owned upload validation category.", allow_employee_upload=True,
        )

    def _create_platform_fixture(self, tenant: Tenant, seed_ref: str, tenant_admin: Employee) -> None:
        onboarding, _ = TenantOnboarding.objects.get_or_create(tenant=tenant)
        onboarding.country_context = "IN"
        onboarding.industry_context = "technology"
        onboarding.launch_blueprint_ref = "india-standard"
        onboarding.launch_blueprint_version = "1"
        onboarding.launch_subscription_plan_snapshot = SubscriptionPlan.ENTERPRISE
        onboarding.notes = f"Playwright-owned fixture [{seed_ref}]"
        onboarding.save(update_fields=[
            "country_context", "industry_context", "launch_blueprint_ref", "launch_blueprint_version",
            "launch_subscription_plan_snapshot", "notes", "updated_at",
        ])
        TenantOnboardingAdminContact.objects.create(
            onboarding=onboarding, full_name="Tanvi Admin", email=tenant_admin.work_email,
            job_title="Tenant Admin", is_primary=True, notes=f"Playwright-owned fixture [{seed_ref}]",
        )
        PlatformPolicyPack.objects.create(
            code=f"pw-qa-{seed_ref}", name=f"Playwright QA {seed_ref}", domain=PlatformPolicyDomain.LEAVE,
            country_code="IN", description=f"Playwright-owned fixture [{seed_ref}]",
            status=PlatformPolicyPackStatus.DRAFT,
        )

    def _manifest(self, tenant: Tenant, seed_ref: str, *, action: str) -> dict:
        employees = {item.employee_code: item for item in tenant.employees.select_related("membership__user").order_by("employee_code")}
        employee = employees["QA-EMP-001"]
        platform_admin = User.objects.get(username=f"pw_{seed_ref.replace('-', '_')}_platform_admin")
        calendar = tenant.payroll_calendars.get(code="qa-monthly")
        period = tenant.payroll_periods.get(code="2026-10")
        pay_group = tenant.pay_groups.get(code="qa-monthly")
        salary_assignment = employee.salary_assignments.get(status=PayrollConfigStatus.ACTIVE)
        checks = {
            "ownership_markers_valid": tenant.is_sandbox and tenant.primary_email == self._owner_email(seed_ref),
            "period_pay_group_calendar_match": period.calendar_id == pay_group.calendar_id == calendar.id,
            "employee_relations_tenant_scoped": all(
                value is None or value.tenant_id == tenant.id
                for value in [employee.legal_entity, employee.branch, employee.location, employee.department]
            ),
            "single_target_leave_balance": employee.leave_balances.filter(period_year=2026).count() == 1,
            "document_category_available": tenant.document_categories.filter(code="qa-identity", is_active=True).exists(),
            "manager_queues_available": tenant.leave_requests.filter(status=LeaveRequestStatus.PENDING).exists()
            and tenant.attendance_regularizations.filter(status=RegularizationStatus.PENDING).exists(),
            "statutory_fixture_available": tenant.payroll_statutory_components.filter(code="qa-tds").exists()
            and employee.statutory_declarations.filter(financial_year_code="2026-27").exists(),
            "locked_payroll_snapshot_available": tenant.payroll_input_snapshots.filter(snapshot_status=PayrollInputSnapshotStatus.LOCKED).exists(),
            "platform_onboarding_available": hasattr(tenant, "onboarding_record")
            and tenant.onboarding_record.admin_contacts.filter(is_primary=True).exists(),
        }
        if not all(checks.values()):
            raise CommandError(f"Workspace integrity check failed: {checks}")
        return {
            "action": action,
            "generated_at": timezone.now().isoformat(),
            "ownership": {"owner": "playwright", "seed_ref": seed_ref, "disposable": True},
            "tenant": {"id": str(tenant.id), "code": tenant.code},
            "credentials": {
                code: {"username": item.membership.user.username, "employee_id": str(item.id), "employee_code": item.employee_code}
                for code, item in [
                    ("hr_admin", employees["QA-HR-001"]),
                    ("manager", employees["QA-MGR-001"]),
                    ("employee", employee),
                    ("tenant_admin", employees["QA-TA-001"]),
                ]
            },
            "payroll": {
                "calendar_id": str(calendar.id),
                "period_id": str(period.id),
                "pay_group_id": str(pay_group.id),
                "salary_assignment_id": str(salary_assignment.id),
            },
            "leave": {"policy_id": str(employee.leave_policy_assignments.get().leave_policy_id), "balance_id": str(employee.leave_balances.get(period_year=2026).id)},
            "attendance": {"policy_id": str(employee.attendance_policy_assignments.get().attendance_policy_id), "shift_id": str(employee.shift_assignments.get().shift_id)},
            "fixtures": {
                "document_category_id": str(tenant.document_categories.get(code="qa-identity").id),
                "leave_request_id": str(tenant.leave_requests.get(status=LeaveRequestStatus.PENDING).id),
                "attendance_regularization_id": str(tenant.attendance_regularizations.get(status=RegularizationStatus.PENDING).id),
                "payroll_run_id": str(tenant.payroll_runs.get(code="qa-inputs-locked").id),
                "platform_onboarding_id": str(tenant.onboarding_record.id),
            },
            "checks": checks,
            "platform_admin": {"username": platform_admin.username, "platform_only": not platform_admin.tenant_memberships.exists()},
            "counts": {"employees": tenant.employees.count(), "tenant_users": tenant.memberships.count(), "platform_users": 1},
        }

    def _cleanup(self, tenant: Tenant | None, seed_ref: str, tenant_code: str) -> dict:
        if tenant is None:
            return {"action": "cleanup", "tenant": {"code": tenant_code}, "deleted": False, "verified_absent": True}
        self._assert_owned(tenant, seed_ref)
        usernames = list(tenant.memberships.values_list("user__username", flat=True))
        usernames.append(f"pw_{seed_ref.replace('-', '_')}_platform_admin")
        platform_pack_code = f"pw-qa-{seed_ref}"
        tenant_id = str(tenant.id)
        # Payroll configuration deliberately uses PROTECT. Remove only this
        # already ownership-verified tenant's graph in dependency order.
        PayrollBackgroundJob.objects.filter(tenant=tenant).delete()
        PayrollArtifactAccessEvent.objects.filter(tenant=tenant).delete()
        PayrollArtifactSignedAccessGrant.objects.filter(tenant=tenant).delete()
        PayrollOutputArtifact.objects.filter(tenant=tenant).delete()
        PayrollFinanceHandoff.objects.filter(tenant=tenant).delete()
        PayrollOutputBatch.objects.filter(tenant=tenant).delete()
        PayrollCalculationLine.objects.filter(tenant=tenant).delete()
        PayrollRunReview.objects.filter(tenant=tenant).delete()
        PayrollRunCalculation.objects.filter(tenant=tenant).delete()
        PayrollInputSnapshot.objects.filter(tenant=tenant).delete()
        PayrollRun.objects.filter(tenant=tenant).delete()
        EmployeeSalaryAssignment.objects.filter(tenant=tenant).delete()
        PayrollStatutoryFilingCalendar.objects.filter(tenant=tenant).delete()
        PayrollStatutoryEmployerRegistration.objects.filter(tenant=tenant).delete()
        PayrollStatutorySlab.objects.filter(tenant=tenant).delete()
        PayrollStatutoryComponent.objects.filter(tenant=tenant).delete()
        EmployeeStatutoryDeclaration.objects.filter(tenant=tenant).delete()
        EmployeeStatutoryProfile.objects.filter(tenant=tenant).delete()
        PayrollStatutoryPack.objects.filter(tenant=tenant).delete()
        SalaryStructureComponent.objects.filter(tenant=tenant).delete()
        SalaryStructureVersion.objects.filter(tenant=tenant).delete()
        SalaryStructure.objects.filter(tenant=tenant).delete()
        PayGroupAssignment.objects.filter(tenant=tenant).delete()
        PayGroup.objects.filter(tenant=tenant).delete()
        PayrollPeriod.objects.filter(tenant=tenant).delete()
        PayrollCalendar.objects.filter(tenant=tenant).delete()
        SalaryComponent.objects.filter(tenant=tenant).delete()
        tenant.delete()
        PlatformPolicyPack.objects.filter(code=platform_pack_code, description=f"Playwright-owned fixture [{seed_ref}]").delete()
        User.objects.filter(username__in=usernames).delete()
        return {
            "action": "cleanup", "tenant": {"id": tenant_id, "code": tenant_code}, "deleted": True,
            "verified_absent": not Tenant.objects.filter(code=tenant_code).exists() and not User.objects.filter(username__in=usernames).exists(),
        }
