"""Bootstrap a reusable demo workspace for local HRMS testing."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.attendance.models import AttendanceRecord, AttendanceSource, AttendanceStatus, RegularizationStatus, Shift
from apps.attendance.services import resolve_regularization, submit_regularization
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipStatus, Role, TenantMembership, User
from apps.leave_management.models import (
    AccrualFrequency,
    LeaveBalance,
    LeaveCategory,
    LeavePolicy,
    LeavePolicyAssignment,
    LeavePolicyStatus,
    LeaveType,
)
from apps.leave_management.services import resolve_leave_request, submit_leave_request
from apps.notifications.models import (
    NotificationAudienceType,
    NotificationChannel,
    NotificationChannelConfiguration,
    NotificationEventDefinition,
    NotificationDeliveryBackend,
    NotificationPriority,
    NotificationTemplate,
    NotificationTemplateStatus,
)
from apps.organizations.models import Branch, BusinessUnit, CostCenter, Department, Designation, EmploymentType, Grade, LegalEntity, Location
from apps.tenants.models import SeedPack, SubscriptionPlan, Tenant, TenantDomain, TenantStatus
from apps.workflows.models import WorkflowModule


class Command(BaseCommand):
    help = "Creates an end-to-end demo tenant with sample users, employees, leave, and attendance data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default="Password@123",
            help="Password assigned to seeded demo users.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]
        today = timezone.localdate()

        tenant = self._seed_tenant()
        org = self._seed_organization(tenant)
        users = self._seed_users(password=password)
        memberships = self._seed_memberships(tenant=tenant, users=users)
        self._seed_roles(tenant=tenant, memberships=memberships)
        employees = self._seed_employees(tenant=tenant, org=org, memberships=memberships, today=today)
        leave_catalog = self._seed_leave_setup(tenant=tenant, employees=employees, today=today)
        self._seed_notification_setup(tenant=tenant)
        shift = self._seed_shift(tenant=tenant)
        self._seed_attendance_and_requests(
            tenant=tenant,
            employees=employees,
            leave_catalog=leave_catalog,
            shift=shift,
            today=today,
        )

        self.stdout.write(self.style.SUCCESS("Demo workspace bootstrapped successfully."))
        self.stdout.write("")
        self.stdout.write("Login credentials:")
        self.stdout.write(f"  Employee: riya.sharma / {password}")
        self.stdout.write(f"  Manager: karan.mehta / {password}")
        self.stdout.write(f"  HR Admin: nisha.rao / {password}")
        self.stdout.write(f"  Platform Admin: platform.admin / {password}")

    def _seed_tenant(self):
        tenant, _ = Tenant.objects.update_or_create(
            code="northstar-foods",
            defaults={
                "name": "Northstar Foods",
                "legal_name": "Northstar Foods Pvt Ltd",
                "status": TenantStatus.ACTIVE,
                "subscription_plan": SubscriptionPlan.GROWTH,
                "seed_pack": SeedPack.STANDARD_OFFICE,
                "primary_email": "hello@northstar.example",
                "primary_phone": "+91-9988776655",
                "timezone": "Asia/Kolkata",
                "country_code": "IN",
                "is_sandbox": True,
            },
        )
        TenantDomain.objects.update_or_create(
            domain="northstar.local",
            defaults={"tenant": tenant, "is_primary": True},
        )
        return tenant

    def _seed_organization(self, tenant):
        legal_entity, _ = LegalEntity.objects.update_or_create(
            tenant=tenant,
            code="northstar-pvt-ltd",
            defaults={
                "name": "Northstar Foods Pvt Ltd",
                "registered_name": "Northstar Foods Pvt Ltd",
                "country_code": "IN",
                "timezone": "Asia/Kolkata",
                "primary_email": "corp@northstar.example",
                "primary_phone": "+91-9988771100",
            },
        )
        location, _ = Location.objects.update_or_create(
            tenant=tenant,
            code="bengaluru-hq",
            defaults={
                "name": "Bengaluru",
                "address_line_1": "Outer Ring Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "postal_code": "560103",
                "country_code": "IN",
            },
        )
        branch, _ = Branch.objects.update_or_create(
            tenant=tenant,
            code="bengaluru-ho",
            defaults={
                "name": "Bengaluru HO",
                "legal_entity": legal_entity,
                "location": location,
                "branch_type": "Head Office",
            },
        )
        business_unit, _ = BusinessUnit.objects.update_or_create(
            tenant=tenant,
            code="corporate",
            defaults={"name": "Corporate"},
        )
        people_ops, _ = Department.objects.update_or_create(
            tenant=tenant,
            code="people-ops",
            defaults={"name": "People Operations", "business_unit": business_unit},
        )
        sales, _ = Department.objects.update_or_create(
            tenant=tenant,
            code="sales",
            defaults={"name": "Sales", "business_unit": business_unit},
        )
        cost_center, _ = CostCenter.objects.update_or_create(
            tenant=tenant,
            code="ho-people",
            defaults={"name": "HO People Ops", "legal_entity": legal_entity},
        )
        grade_manager, _ = Grade.objects.update_or_create(
            tenant=tenant,
            code="m1",
            defaults={"name": "M1", "level": 1},
        )
        grade_individual, _ = Grade.objects.update_or_create(
            tenant=tenant,
            code="ic1",
            defaults={"name": "IC1", "level": 2},
        )
        designation_manager, _ = Designation.objects.update_or_create(
            tenant=tenant,
            code="assistant-manager",
            defaults={"name": "Assistant Manager", "grade": grade_manager},
        )
        designation_sales, _ = Designation.objects.update_or_create(
            tenant=tenant,
            code="sales-executive",
            defaults={"name": "Sales Executive", "grade": grade_individual},
        )
        designation_hr, _ = Designation.objects.update_or_create(
            tenant=tenant,
            code="hr-manager",
            defaults={"name": "HR Manager", "grade": grade_manager},
        )
        employment_type, _ = EmploymentType.objects.update_or_create(
            tenant=tenant,
            code="full-time",
            defaults={"name": "Full Time", "description": "Regular full-time employees"},
        )
        return {
            "legal_entity": legal_entity,
            "location": location,
            "branch": branch,
            "business_unit": business_unit,
            "people_ops": people_ops,
            "sales": sales,
            "cost_center": cost_center,
            "grade_manager": grade_manager,
            "grade_individual": grade_individual,
            "designation_manager": designation_manager,
            "designation_sales": designation_sales,
            "designation_hr": designation_hr,
            "employment_type": employment_type,
        }

    def _seed_users(self, *, password: str):
        users = {}
        definitions = [
            ("platform_admin", "platform.admin", "platform.admin@northstar.example", "Platform", "Admin", True, True),
            ("hr_admin", "nisha.rao", "nisha.rao@northstar.example", "Nisha", "Rao", True, False),
            ("manager", "karan.mehta", "karan.mehta@northstar.example", "Karan", "Mehta", False, False),
            ("employee_riya", "riya.sharma", "riya.sharma@northstar.example", "Riya", "Sharma", False, False),
            ("employee_aman", "aman.verma", "aman.verma@northstar.example", "Aman", "Verma", False, False),
            ("employee_meera", "meera.iyer", "meera.iyer@northstar.example", "Meera", "Iyer", False, False),
        ]
        for key, username, email, first_name, last_name, is_staff, is_superuser in definitions:
            user, _ = User.objects.update_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "display_name": f"{first_name} {last_name}",
                    "is_staff": is_staff,
                    "is_superuser": is_superuser,
                    "is_active": True,
                },
            )
            user.set_password(password)
            user.save(update_fields=["password"])
            users[key] = user
        return users

    def _seed_memberships(self, *, tenant, users):
        memberships = {}
        definitions = [
            ("hr_admin", users["hr_admin"], "EMP-0001"),
            ("manager", users["manager"], "EMP-0002"),
            ("employee_riya", users["employee_riya"], "EMP-0042"),
            ("employee_aman", users["employee_aman"], "EMP-0043"),
            ("employee_meera", users["employee_meera"], "EMP-0044"),
        ]
        for key, user, employee_code in definitions:
            membership, _ = TenantMembership.objects.update_or_create(
                tenant=tenant,
                user=user,
                defaults={
                    "employee_code": employee_code,
                    "status": MembershipStatus.ACTIVE,
                    "is_default": True,
                },
            )
            memberships[key] = membership
        return memberships

    def _seed_roles(self, *, tenant, memberships):
        for code, name, membership_key in [
            ("hr-admin", "HR Admin", "hr_admin"),
            ("manager", "Manager", "manager"),
            ("employee", "Employee", "employee_riya"),
        ]:
            role, _ = Role.objects.update_or_create(
                tenant=tenant,
                code=code,
                defaults={"name": name, "is_system_role": True, "is_active": True},
            )
            memberships[membership_key].membership_roles.update_or_create(
                role=role,
                defaults={"is_primary": True},
            )

    def _seed_employees(self, *, tenant, org, memberships, today):
        manager, _ = Employee.objects.update_or_create(
            tenant=tenant,
            employee_code="EMP-0002",
            defaults={
                "membership": memberships["manager"],
                "first_name": "Karan",
                "last_name": "Mehta",
                "preferred_name": "Karan",
                "work_email": "karan.mehta@northstar.example",
                "personal_email": "karan.personal@example.com",
                "phone_number": "+91-9000000002",
                "date_of_joining": today.replace(year=today.year - 2),
                "employment_status": EmploymentStatus.ACTIVE,
                "legal_entity": org["legal_entity"],
                "branch": org["branch"],
                "location": org["location"],
                "department": org["people_ops"],
                "business_unit": org["business_unit"],
                "cost_center": org["cost_center"],
                "designation": org["designation_manager"],
                "grade": org["grade_manager"],
                "employment_type": org["employment_type"],
            },
        )
        hr_admin, _ = Employee.objects.update_or_create(
            tenant=tenant,
            employee_code="EMP-0001",
            defaults={
                "membership": memberships["hr_admin"],
                "first_name": "Nisha",
                "last_name": "Rao",
                "preferred_name": "Nisha",
                "work_email": "nisha.rao@northstar.example",
                "personal_email": "nisha.personal@example.com",
                "phone_number": "+91-9000000001",
                "date_of_joining": today.replace(year=today.year - 3),
                "employment_status": EmploymentStatus.ACTIVE,
                "legal_entity": org["legal_entity"],
                "branch": org["branch"],
                "location": org["location"],
                "department": org["people_ops"],
                "business_unit": org["business_unit"],
                "cost_center": org["cost_center"],
                "designation": org["designation_hr"],
                "grade": org["grade_manager"],
                "employment_type": org["employment_type"],
            },
        )
        riya, _ = Employee.objects.update_or_create(
            tenant=tenant,
            employee_code="EMP-0042",
            defaults={
                "membership": memberships["employee_riya"],
                "first_name": "Riya",
                "last_name": "Sharma",
                "preferred_name": "Riya",
                "work_email": "riya.sharma@northstar.example",
                "personal_email": "riya.personal@example.com",
                "phone_number": "+91-9876543210",
                "date_of_joining": today.replace(year=today.year - 1, month=4, day=15),
                "employment_status": EmploymentStatus.ACTIVE,
                "legal_entity": org["legal_entity"],
                "branch": org["branch"],
                "location": org["location"],
                "department": org["people_ops"],
                "business_unit": org["business_unit"],
                "cost_center": org["cost_center"],
                "designation": org["designation_manager"],
                "grade": org["grade_manager"],
                "employment_type": org["employment_type"],
                "reporting_manager": manager,
            },
        )
        aman, _ = Employee.objects.update_or_create(
            tenant=tenant,
            employee_code="EMP-0043",
            defaults={
                "membership": memberships["employee_aman"],
                "first_name": "Aman",
                "last_name": "Verma",
                "preferred_name": "Aman",
                "work_email": "aman.verma@northstar.example",
                "personal_email": "aman.personal@example.com",
                "phone_number": "+91-9876500011",
                "date_of_joining": today.replace(year=today.year - 1, month=6, day=1),
                "employment_status": EmploymentStatus.ACTIVE,
                "legal_entity": org["legal_entity"],
                "branch": org["branch"],
                "location": org["location"],
                "department": org["sales"],
                "business_unit": org["business_unit"],
                "cost_center": org["cost_center"],
                "designation": org["designation_sales"],
                "grade": org["grade_individual"],
                "employment_type": org["employment_type"],
                "reporting_manager": manager,
            },
        )
        meera, _ = Employee.objects.update_or_create(
            tenant=tenant,
            employee_code="EMP-0044",
            defaults={
                "membership": memberships["employee_meera"],
                "first_name": "Meera",
                "last_name": "Iyer",
                "preferred_name": "Meera",
                "work_email": "meera.iyer@northstar.example",
                "personal_email": "meera.personal@example.com",
                "phone_number": "+91-9876500012",
                "date_of_joining": today.replace(year=today.year - 1, month=8, day=10),
                "employment_status": EmploymentStatus.ACTIVE,
                "legal_entity": org["legal_entity"],
                "branch": org["branch"],
                "location": org["location"],
                "department": org["sales"],
                "business_unit": org["business_unit"],
                "cost_center": org["cost_center"],
                "designation": org["designation_sales"],
                "grade": org["grade_individual"],
                "employment_type": org["employment_type"],
                "reporting_manager": manager,
            },
        )
        return {"hr_admin": hr_admin, "manager": manager, "riya": riya, "aman": aman, "meera": meera}

    def _seed_leave_setup(self, *, tenant, employees, today):
        leave_types = {}
        for code, name, short_code, category in [
            ("casual-leave", "Casual Leave", "CL", LeaveCategory.PAID),
            ("sick-leave", "Sick Leave", "SL", LeaveCategory.SICK),
            ("earned-leave", "Earned Leave", "EL", LeaveCategory.VACATION),
        ]:
            leave_type, _ = LeaveType.objects.update_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "name": name,
                    "short_code": short_code,
                    "category": category,
                    "unit": "day",
                    "is_active": True,
                    "is_system_seeded": True,
                },
            )
            leave_types[code] = leave_type

        policies = {}
        for code, name, leave_type_code, entitlement in [
            ("cl-standard", "CL Standard", "casual-leave", Decimal("8.00")),
            ("sl-standard", "SL Standard", "sick-leave", Decimal("6.00")),
            ("el-standard", "EL Standard", "earned-leave", Decimal("15.00")),
        ]:
            policy, _ = LeavePolicy.objects.update_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "leave_type": leave_types[leave_type_code],
                    "name": name,
                    "status": LeavePolicyStatus.ACTIVE,
                    "effective_from": today.replace(month=1, day=1),
                    "accrual_frequency": AccrualFrequency.MONTHLY,
                    "annual_entitlement": entitlement,
                    "max_carry_forward": Decimal("5.00"),
                    "min_days_per_request": Decimal("0.50"),
                    "allow_half_day": True,
                    "is_probation_eligible": True,
                },
            )
            LeavePolicyAssignment.objects.update_or_create(
                tenant=tenant,
                leave_policy=policy,
                employee=employees["riya"],
                defaults={"priority": 10, "is_active": True},
            )
            LeavePolicyAssignment.objects.update_or_create(
                tenant=tenant,
                leave_policy=policy,
                employee=employees["aman"],
                defaults={"priority": 10, "is_active": True},
            )
            LeavePolicyAssignment.objects.update_or_create(
                tenant=tenant,
                leave_policy=policy,
                employee=employees["meera"],
                defaults={"priority": 10, "is_active": True},
            )
            policies[code] = policy

        for employee, balances in [
            (employees["riya"], {"cl-standard": "5.50", "sl-standard": "6.00", "el-standard": "12.00"}),
            (employees["aman"], {"cl-standard": "4.00", "sl-standard": "5.00", "el-standard": "10.00"}),
            (employees["meera"], {"cl-standard": "3.50", "sl-standard": "6.00", "el-standard": "9.00"}),
        ]:
            for policy_code, closing_balance in balances.items():
                LeaveBalance.objects.update_or_create(
                    tenant=tenant,
                    employee=employee,
                    leave_policy=policies[policy_code],
                    period_year=today.year,
                    defaults={
                        "opening_balance": Decimal(closing_balance),
                        "accrued_amount": Decimal("0"),
                        "consumed_amount": Decimal("0"),
                        "reserved_amount": Decimal("0"),
                        "carry_forward_amount": Decimal("0"),
                        "encashed_amount": Decimal("0"),
                        "adjustment_amount": Decimal("0"),
                        "closing_balance": Decimal(closing_balance),
                    },
                )
        return {"leave_types": leave_types, "policies": policies}

    def _seed_notification_setup(self, *, tenant):
        for channel, _label in NotificationChannel.choices:
            NotificationChannelConfiguration.objects.update_or_create(
                tenant=tenant,
                channel=channel,
                defaults={
                    "is_enabled": True,
                    "backend_key": {
                        NotificationChannel.IN_APP: NotificationDeliveryBackend.IN_APP_DEFAULT,
                        NotificationChannel.EMAIL: NotificationDeliveryBackend.EMAIL_SMTP,
                        NotificationChannel.SMS: NotificationDeliveryBackend.SMS_CONSOLE,
                        NotificationChannel.PUSH: NotificationDeliveryBackend.PUSH_CONSOLE,
                        NotificationChannel.WHATSAPP: NotificationDeliveryBackend.WHATSAPP_CONSOLE,
                    }[channel],
                    "sender_identifier": "nexora-hrms",
                    "sender_address": "notifications@example.local" if channel == NotificationChannel.EMAIL else "",
                    "provider_config": {},
                    "delivery_policy": {},
                },
            )

        templates = {}
        for code, name, title_template, body_template in [
            (
                "leave-manager-pending",
                "Leave Manager Pending",
                "New leave request pending approval",
                "A team member has submitted a leave request that needs your action.",
            ),
            (
                "attendance-employee-updated",
                "Attendance Employee Updated",
                "Attendance regularization updated",
                "Your attendance regularization status has changed.",
            ),
            (
                "documents-onboarding-attention",
                "Onboarding Document Attention",
                "Onboarding document attention needed",
                "An onboarding record has document blockers or upcoming document attention items.",
            ),
            (
                "documents-employee-upload-submitted",
                "Employee Document Upload Submitted",
                "Employee document uploaded for review",
                "An employee has uploaded a document that is ready for HR review.",
            ),
            (
                "documents-employee-reupload-requested",
                "Employee Document Re-upload Requested",
                "Document re-upload requested",
                "A reviewed employee document needs a fresh upload.",
            ),
            (
                "documents-employee-expiry-attention",
                "Employee Document Expiry Attention",
                "Document expiry attention needed",
                "An employee document is expired, expiring soon, or missing expiry detail.",
            ),
        ]:
            template, _ = NotificationTemplate.objects.update_or_create(
                tenant=tenant,
                code=code,
                channel=NotificationChannel.IN_APP,
                defaults={
                    "name": name,
                    "status": NotificationTemplateStatus.ACTIVE,
                    "subject_template": "",
                    "title_template": title_template,
                    "body_template": body_template,
                    "metadata_template": {},
                    "is_system_seeded": True,
                },
            )
            templates[code] = template

        for code, name, module, trigger_key, audience_type, template_code, priority, recipient_snapshot in [
            (
                "leave-manager-pending",
                "Leave Pending For Manager",
                WorkflowModule.LEAVE,
                "leave.request.manager_pending",
                NotificationAudienceType.MANAGER,
                "leave-manager-pending",
                NotificationPriority.NORMAL,
                {},
            ),
            (
                "attendance-employee-updated",
                "Attendance Updated For Employee",
                WorkflowModule.ATTENDANCE,
                "attendance.regularization.employee_updated",
                NotificationAudienceType.EMPLOYEE,
                "attendance-employee-updated",
                NotificationPriority.NORMAL,
                {},
            ),
            (
                "documents-onboarding-attention",
                "Onboarding Document Attention",
                WorkflowModule.DOCUMENTS,
                "documents.onboarding.attention_required",
                NotificationAudienceType.MEMBERSHIP,
                "documents-onboarding-attention",
                NotificationPriority.HIGH,
                {"routing": "lifecycle_owner_or_hr"},
            ),
            (
                "documents-employee-upload-submitted",
                "Employee Document Upload Submitted",
                WorkflowModule.DOCUMENTS,
                "documents.employee.upload_submitted",
                NotificationAudienceType.MEMBERSHIP,
                "documents-employee-upload-submitted",
                NotificationPriority.NORMAL,
                {"routing": "hr_owner"},
            ),
            (
                "documents-employee-reupload-requested",
                "Employee Document Re-upload Requested",
                WorkflowModule.DOCUMENTS,
                "documents.employee.reupload_requested",
                NotificationAudienceType.EMPLOYEE,
                "documents-employee-reupload-requested",
                NotificationPriority.HIGH,
                {"routing": "employee_membership"},
            ),
            (
                "documents-employee-expiry-attention",
                "Employee Document Expiry Attention",
                WorkflowModule.DOCUMENTS,
                "documents.employee.expiry_attention",
                NotificationAudienceType.EMPLOYEE,
                "documents-employee-expiry-attention",
                NotificationPriority.HIGH,
                {"routing": "employee_membership"},
            ),
        ]:
            NotificationEventDefinition.objects.update_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "name": name,
                    "module": module,
                    "trigger_key": trigger_key,
                    "audience_type": audience_type,
                    "channel": NotificationChannel.IN_APP,
                    "template": templates[template_code],
                    "role": None,
                    "membership": None,
                    "is_active": True,
                    "priority": priority,
                    "delivery_delay_minutes": 0,
                    "recipient_snapshot": recipient_snapshot,
                },
            )

    def _seed_shift(self, *, tenant):
        shift, _ = Shift.objects.update_or_create(
            tenant=tenant,
            code="general-shift",
            defaults={
                "name": "General Shift",
                "start_time": timezone.datetime.strptime("09:00", "%H:%M").time(),
                "end_time": timezone.datetime.strptime("18:00", "%H:%M").time(),
                "working_hours": Decimal("8.50"),
                "break_minutes": 60,
                "grace_in_minutes": 10,
                "grace_out_minutes": 10,
                "weekly_off_days": ["saturday", "sunday"],
                "is_active": True,
            },
        )
        return shift

    def _seed_attendance_and_requests(self, *, tenant, employees, leave_catalog, shift, today):
        AttendanceRecord.objects.filter(
            tenant=tenant,
            employee__in=[employees["riya"], employees["aman"], employees["meera"], employees["manager"]],
        ).delete()
        employees["riya"].leave_requests.all().delete()
        employees["aman"].leave_requests.all().delete()
        employees["meera"].leave_requests.all().delete()
        employees["riya"].attendance_regularizations.all().delete()
        employees["aman"].attendance_regularizations.all().delete()
        employees["meera"].attendance_regularizations.all().delete()

        record_specs = [
            (employees["riya"], today - timedelta(days=3), AttendanceStatus.LATE, "10:14", "18:30", 74),
            (employees["riya"], today - timedelta(days=2), AttendanceStatus.PRESENT, "09:08", "18:22", 0),
            (employees["riya"], today - timedelta(days=1), AttendanceStatus.PRESENT, "09:03", "18:15", 0),
            (employees["riya"], today, AttendanceStatus.PRESENT, "09:12", None, 0),
            (employees["aman"], today, AttendanceStatus.ON_LEAVE, None, None, 0),
            (employees["meera"], today, AttendanceStatus.LATE, "09:58", None, 48),
            (employees["manager"], today, AttendanceStatus.PRESENT, "09:01", None, 0),
        ]
        created_records = {}
        for employee, attendance_date, status, check_in, check_out, late_minutes in record_specs:
            record, _ = AttendanceRecord.objects.update_or_create(
                tenant=tenant,
                employee=employee,
                attendance_date=attendance_date,
                defaults={
                    "status": status,
                    "source": AttendanceSource.MOBILE,
                    "shift": shift,
                    "check_in_at": self._to_datetime(attendance_date, check_in),
                    "check_out_at": self._to_datetime(attendance_date, check_out),
                    "work_duration_hours": Decimal("8.00") if check_in and check_out else Decimal("0"),
                    "overtime_hours": Decimal("0"),
                    "late_minutes": late_minutes,
                    "is_regularized": False,
                    "is_locked": False,
                },
            )
            created_records[(employee.employee_code, attendance_date.isoformat())] = record

        pending_leave = submit_leave_request(
            employee=employees["riya"],
            leave_type=leave_catalog["leave_types"]["casual-leave"],
            start_date=today + timedelta(days=15),
            end_date=today + timedelta(days=16),
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Family event out of town.",
        )
        approved_leave = submit_leave_request(
            employee=employees["aman"],
            leave_type=leave_catalog["leave_types"]["sick-leave"],
            start_date=today,
            end_date=today,
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Medical rest advised.",
        )
        resolve_leave_request(
            leave_request=approved_leave,
            actor_employee=employees["manager"],
            approve=True,
            comment="Please recover well.",
        )
        pending_regularization = submit_regularization(
            employee=employees["meera"],
            attendance_record=created_records[(employees["meera"].employee_code, today.isoformat())],
            requested_status=AttendanceStatus.PRESENT,
            requested_check_in_at=self._to_datetime(today, "09:05"),
            requested_check_out_at=self._to_datetime(today, "18:20"),
            reason="Biometric kiosk was down at entry time.",
        )
        approved_regularization = submit_regularization(
            employee=employees["riya"],
            attendance_record=created_records[(employees["riya"].employee_code, (today - timedelta(days=3)).isoformat())],
            requested_status=AttendanceStatus.PRESENT,
            requested_check_in_at=self._to_datetime(today - timedelta(days=3), "09:05"),
            requested_check_out_at=self._to_datetime(today - timedelta(days=3), "18:30"),
            reason="Biometric kiosk was offline during morning entry.",
        )
        resolve_regularization(
            regularization=approved_regularization,
            actor_employee=employees["manager"],
            approve=True,
            comment="Updated after confirming device outage.",
        )

        pending_leave.metadata = {"seed": "demo"}
        pending_leave.save(update_fields=["metadata", "updated_at"])
        approved_leave.metadata = {"seed": "demo"}
        approved_leave.save(update_fields=["metadata", "updated_at"])
        pending_regularization.evidence_payload = {"seed": "demo"}
        pending_regularization.save(update_fields=["evidence_payload", "updated_at"])
        approved_regularization.evidence_payload = {"seed": "demo"}
        approved_regularization.save(update_fields=["evidence_payload", "updated_at"])

    def _to_datetime(self, date_value, time_value: str | None):
        if not time_value:
            return None
        naive = datetime.strptime(f"{date_value.isoformat()} {time_value}", "%Y-%m-%d %H:%M")
        return timezone.make_aware(naive, timezone.get_current_timezone())
