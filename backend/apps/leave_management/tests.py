from types import SimpleNamespace
from datetime import date, time, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.attendance.models import (
    AttendancePolicy,
    AttendancePolicyAssignment,
    AttendancePolicyStatus,
    EmployeeShiftAssignment,
    EmployeeShiftAssignmentKind,
    Holiday,
    HolidayCalendar,
    HolidayType,
    Shift,
)
from apps.common.api_views import save_hr_admin_leave_policy_assignment
from apps.common.selectors import get_employee_leave_requests, get_manager_pending_leave_requests
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipStatus, TenantMembership, User
from apps.leave_management.models import LeaveBalance, LeaveBalanceTransaction, LeavePolicy, LeavePolicyAssignment, LeavePolicyStatus, LeaveType, LeaveRequestStatus
from apps.leave_management.services import apply_leave_balance_admin_action, cancel_leave_request, ensure_employee_leave_balances, preview_leave_policy_assignment_conflicts, preview_leave_policy_assignment_resolution, preview_leave_policy_configuration, resolve_leave_request, review_leave_balance_transaction, submit_leave_request, withdraw_leave_request
from apps.notifications.models import Notification
from apps.organizations.models import Department, EmploymentType, Grade
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus
from apps.workflows.models import WorkflowAssignment


class LeavePolicyAssignmentConflictTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            code="acme",
            name="Acme India",
            legal_name="Acme India Pvt Ltd",
            status=TenantStatus.ACTIVE,
            subscription_plan=SubscriptionPlan.GROWTH,
            country_code="IN",
            timezone="Asia/Kolkata",
        )
        self.department = Department.objects.create(
            tenant=self.tenant,
            code="engineering",
            name="Engineering",
        )
        self.employee_grade = Grade.objects.create(
            tenant=self.tenant,
            code="level-3",
            name="Level 3",
        )
        self.other_grade = Grade.objects.create(
            tenant=self.tenant,
            code="level-4",
            name="Level 4",
        )
        self.employee_type = EmploymentType.objects.create(
            tenant=self.tenant,
            code="full-time",
            name="Full Time",
        )
        self.other_employee_type = EmploymentType.objects.create(
            tenant=self.tenant,
            code="contractor",
            name="Contractor",
        )
        self.leave_type = LeaveType.objects.create(
            tenant=self.tenant,
            code="earned-leave",
            name="Earned Leave",
            is_active=True,
        )
        self.default_policy = LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=self.leave_type,
            code="default-earned-leave",
            name="Default Earned Leave",
            status=LeavePolicyStatus.ACTIVE,
        )
        self.department_policy = LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=self.leave_type,
            code="engineering-earned-leave",
            name="Engineering Earned Leave",
            status=LeavePolicyStatus.ACTIVE,
        )
        self.employee = Employee.objects.create(
            tenant=self.tenant,
            employee_code="E001",
            first_name="Anika",
            department=self.department,
            grade=self.employee_grade,
            employment_type=self.employee_type,
        )

    def test_department_scoped_conflict_preview_handles_existing_assignment_without_employee(self):
        LeavePolicyAssignment.objects.create(
            tenant=self.tenant,
            leave_policy=self.default_policy,
            priority=100,
            is_active=True,
        )

        preview = preview_leave_policy_assignment_conflicts(
            tenant=self.tenant,
            leave_policy=self.department_policy,
            scope_data={
                "legal_entity_id": None,
                "branch_id": None,
                "department_id": self.department.id,
                "grade_id": None,
                "employment_type_id": None,
                "employee_id": None,
            },
            priority=90,
        )

        self.assertTrue(preview["has_conflicts"])
        self.assertFalse(preview["has_blocking_conflict"])
        self.assertEqual(preview["candidate_scope"], ["Department: Engineering"])
        self.assertEqual(preview["conflicts"][0]["policy_name"], "Default Earned Leave")

    def test_broad_and_department_scoped_leave_assignments_overlap_without_blocking_at_same_priority(self):
        LeavePolicyAssignment.objects.create(
            tenant=self.tenant,
            leave_policy=self.default_policy,
            priority=100,
            is_active=True,
        )

        preview = preview_leave_policy_assignment_conflicts(
            tenant=self.tenant,
            leave_policy=self.department_policy,
            scope_data={
                "legal_entity_id": None,
                "branch_id": None,
                "department_id": self.department.id,
                "grade_id": None,
                "employment_type_id": None,
                "employee_id": None,
            },
            priority=100,
        )

        self.assertTrue(preview["has_conflicts"])
        self.assertFalse(preview["has_blocking_conflict"])
        self.assertEqual(preview["conflicts"][0]["overlap_kind"], "draft_narrower")
        self.assertFalse(preview["conflicts"][0]["is_same_granularity"])

    def test_same_level_same_priority_leave_assignments_block_ambiguous_department_routes(self):
        LeavePolicyAssignment.objects.create(
            tenant=self.tenant,
            leave_policy=self.default_policy,
            department=self.department,
            priority=100,
            is_active=True,
        )

        preview = preview_leave_policy_assignment_conflicts(
            tenant=self.tenant,
            leave_policy=self.department_policy,
            scope_data={
                "legal_entity_id": None,
                "branch_id": None,
                "department_id": self.department.id,
                "grade_id": None,
                "employment_type_id": None,
                "employee_id": None,
            },
            priority=100,
        )

        self.assertTrue(preview["has_blocking_conflict"])
        self.assertEqual(preview["conflicts"][0]["overlap_kind"], "exact_scope")
        self.assertTrue(preview["conflicts"][0]["is_same_granularity"])

    def test_leave_resolution_prefers_narrower_department_scope_when_priority_matches(self):
        LeavePolicyAssignment.objects.create(
            tenant=self.tenant,
            leave_policy=self.default_policy,
            priority=100,
            is_active=True,
        )
        department_assignment = LeavePolicyAssignment.objects.create(
            tenant=self.tenant,
            leave_policy=self.department_policy,
            department=self.department,
            priority=100,
            is_active=True,
        )

        resolution = preview_leave_policy_assignment_resolution(
            employee=self.employee,
            leave_type=self.leave_type,
        )

        self.assertTrue(resolution["has_resolution"])
        self.assertEqual(resolution["policy_name"], "Engineering Earned Leave")
        self.assertEqual(resolution["assignment_id"], str(department_assignment.id))

    def test_leave_employee_override_ignores_stale_mismatched_scope_filters(self):
        override_assignment = LeavePolicyAssignment.objects.create(
            tenant=self.tenant,
            leave_policy=self.department_policy,
            employee=self.employee,
            department=self.department,
            grade=self.other_grade,
            employment_type=self.other_employee_type,
            priority=100,
            is_active=True,
        )

        resolution = preview_leave_policy_assignment_resolution(
            employee=self.employee,
            leave_type=self.leave_type,
        )

        self.assertTrue(resolution["has_resolution"])
        self.assertEqual(resolution["assignment_id"], str(override_assignment.id))
        self.assertEqual(resolution["scope_labels"], ["Employee: E001"])

    def test_saving_leave_employee_override_clears_other_scope_filters(self):
        actor = SimpleNamespace(tenant=self.tenant)

        assignment = save_hr_admin_leave_policy_assignment(
            actor,
            {
                "leave_policy_id": self.department_policy.id,
                "employee_id": self.employee.id,
                "department_id": self.department.id,
                "grade_id": self.other_grade.id,
                "employment_type_id": self.other_employee_type.id,
                "priority": 100,
                "is_active": True,
            },
        )

        self.assertEqual(assignment.employee_id, self.employee.id)
        self.assertIsNone(assignment.legal_entity_id)
        self.assertIsNone(assignment.branch_id)
        self.assertIsNone(assignment.department_id)
        self.assertIsNone(assignment.grade_id)
        self.assertIsNone(assignment.employment_type_id)


class EssLeaveTypeAssignmentVisibilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="employee",
            email="employee@example.com",
            password="test-pass",
        )
        self.tenant = Tenant.objects.create(
            code="visibility-co",
            name="Visibility Co",
            legal_name="Visibility Co Pvt Ltd",
            status=TenantStatus.ACTIVE,
            subscription_plan=SubscriptionPlan.GROWTH,
            country_code="IN",
            timezone="Asia/Kolkata",
        )
        self.membership = TenantMembership.objects.create(
            tenant=self.tenant,
            user=self.user,
            status=MembershipStatus.ACTIVE,
            is_default=True,
            employee_code="EMP-0001",
        )
        self.employee = Employee.objects.create(
            tenant=self.tenant,
            membership=self.membership,
            employee_code="EMP-0001",
            first_name="Aditi",
            employment_status=EmploymentStatus.ACTIVE,
        )
        self.assigned_type = LeaveType.objects.create(
            tenant=self.tenant,
            code="sick-leave",
            name="Sick Leave",
            is_active=True,
        )
        self.optional_type = LeaveType.objects.create(
            tenant=self.tenant,
            code="jury-duty",
            name="Jury Duty Leave",
            is_active=True,
        )
        self.assigned_policy = LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=self.assigned_type,
            code="sick-policy",
            name="Sick Policy",
            status=LeavePolicyStatus.ACTIVE,
            annual_entitlement="12.00",
        )
        LeavePolicyAssignment.objects.create(
            tenant=self.tenant,
            leave_policy=self.assigned_policy,
            employee=self.employee,
            priority=100,
            is_active=True,
        )
        LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=self.optional_type,
            code="jury-policy",
            name="Jury Duty Policy",
            status=LeavePolicyStatus.ACTIVE,
            annual_entitlement="10.00",
        )
        self.client.force_authenticate(self.user)

    def test_ess_leave_types_only_include_employee_assigned_leave_types(self):
        response = self.client.get("/api/v1/me/leave-types/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual([item["code"] for item in payload], ["sick-leave"])
        self.assertEqual(payload[0]["name"], "Sick Leave")


def _next_weekday(target_weekday: int) -> date:
    today = timezone.localdate()
    days_ahead = (target_weekday - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


class LeaveRequestWorkflowPolicyRuntimeTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            code="runtime-co",
            name="Runtime Co",
            legal_name="Runtime Co Pvt Ltd",
            status=TenantStatus.ACTIVE,
            subscription_plan=SubscriptionPlan.GROWTH,
            country_code="IN",
            timezone="Asia/Kolkata",
        )
        self.employee_user = User.objects.create_user(username="employee-runtime", email="employee-runtime@example.com", password="test-pass")
        self.manager_user = User.objects.create_user(
            username="manager-runtime",
            email="manager-runtime@example.com",
            password="test-pass",
            first_name="Meera",
            last_name="Manager",
        )
        self.second_manager_user = User.objects.create_user(
            username="second-manager-runtime",
            email="second-manager-runtime@example.com",
            password="test-pass",
            first_name="Rohan",
            last_name="Director",
        )
        self.employee_membership = TenantMembership.objects.create(
            tenant=self.tenant,
            user=self.employee_user,
            status=MembershipStatus.ACTIVE,
            is_default=True,
            employee_code="EMP-100",
        )
        self.manager_membership = TenantMembership.objects.create(
            tenant=self.tenant,
            user=self.manager_user,
            status=MembershipStatus.ACTIVE,
            employee_code="MGR-100",
        )
        self.second_manager_membership = TenantMembership.objects.create(
            tenant=self.tenant,
            user=self.second_manager_user,
            status=MembershipStatus.ACTIVE,
            employee_code="DIR-100",
        )
        self.second_manager = Employee.objects.create(
            tenant=self.tenant,
            membership=self.second_manager_membership,
            employee_code="DIR-100",
            first_name="Rohan",
            last_name="Director",
            employment_status=EmploymentStatus.ACTIVE,
        )
        self.manager = Employee.objects.create(
            tenant=self.tenant,
            membership=self.manager_membership,
            employee_code="MGR-100",
            first_name="Meera",
            last_name="Manager",
            reporting_manager=self.second_manager,
            employment_status=EmploymentStatus.ACTIVE,
        )
        self.employee = Employee.objects.create(
            tenant=self.tenant,
            membership=self.employee_membership,
            employee_code="EMP-100",
            first_name="Aditi",
            reporting_manager=self.manager,
            employment_status=EmploymentStatus.ACTIVE,
        )
        self.shift = Shift.objects.create(
            tenant=self.tenant,
            code="general-shift",
            name="General Shift",
            start_time=time(9, 0),
            end_time=time(18, 0),
            working_hours="8.00",
            weekly_off_days=["saturday", "sunday"],
        )
        self.attendance_policy = AttendancePolicy.objects.create(
            tenant=self.tenant,
            code="general-attendance",
            name="General Attendance",
            status=AttendancePolicyStatus.ACTIVE,
            default_shift=self.shift,
        )
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.attendance_policy,
            employee=self.employee,
            priority=100,
            is_active=True,
        )
        self.leave_type = LeaveType.objects.create(
            tenant=self.tenant,
            code="casual-leave",
            name="Casual Leave",
            is_active=True,
        )
        self.leave_policy = LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=self.leave_type,
            code="casual-policy",
            name="Casual Policy",
            status=LeavePolicyStatus.ACTIVE,
            annual_entitlement="5.00",
            allow_backdated_application=False,
            allow_weekend_holiday_overlap=False,
            config_snapshot={
                "approval": {
                    "default_route": "manager_then_second_level",
                }
            },
        )
        LeavePolicyAssignment.objects.create(
            tenant=self.tenant,
            leave_policy=self.leave_policy,
            employee=self.employee,
            priority=100,
            is_active=True,
        )

    def test_leave_units_follow_resolved_attendance_policy_weekly_off_and_holidays(self):
        monday = _next_weekday(0)
        calendar = HolidayCalendar.objects.create(
            tenant=self.tenant,
            code="runtime-calendar",
            name="Runtime Calendar",
            year=monday.year,
            is_active=True,
        )
        Holiday.objects.create(
            calendar=calendar,
            date=monday + timedelta(days=2),
            name="Midweek Holiday",
            holiday_type=HolidayType.COMPULSORY,
        )
        self.attendance_policy.holiday_calendar = calendar
        self.attendance_policy.save(update_fields=["holiday_calendar", "updated_at"])

        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=monday,
            end_date=monday + timedelta(days=6),
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Family travel",
        )

        self.assertEqual(leave_request.requested_units, 4)
        self.assertEqual(leave_request.metadata["unit_breakdown"]["count_basis"], "working_days")
        self.assertEqual(leave_request.metadata["unit_breakdown"]["requested_units"], "4.00")

    def test_friday_to_monday_excludes_weekend_when_policy_disallows_overlap(self):
        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=date(2026, 10, 9),
            end_date=date(2026, 10, 12),
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Long weekend without sandwich rule",
        )

        self.assertEqual(leave_request.requested_units, 2)
        breakdown = leave_request.metadata["unit_breakdown"]
        self.assertEqual(breakdown["count_basis"], "working_days")
        self.assertEqual(
            [(item["date"], item["counted"], item["reason"], item["units"]) for item in breakdown["days"]],
            [
                ("2026-10-09", True, "working_day", "1.00"),
                ("2026-10-10", False, "weekly_off", "0.00"),
                ("2026-10-11", False, "weekly_off", "0.00"),
                ("2026-10-12", True, "working_day", "1.00"),
            ],
        )

    def test_weekend_only_leave_request_is_rejected_when_policy_excludes_weekly_off(self):
        with self.assertRaises(ValidationError) as context:
            submit_leave_request(
                employee=self.employee,
                leave_type=self.leave_type,
                start_date=date(2026, 10, 10),
                end_date=date(2026, 10, 11),
                start_day_portion="full_day",
                end_day_portion="full_day",
                reason="Weekend only",
            )

        self.assertEqual(
            context.exception.message_dict["start_date"],
            ["Selected dates do not include working leave days under this policy."],
        )

    def test_weekend_exclusion_uses_standard_weekend_when_attendance_policy_is_missing(self):
        AttendancePolicyAssignment.objects.filter(employee=self.employee).delete()

        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=date(2026, 10, 23),
            end_date=date(2026, 10, 25),
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Weekend fallback",
        )

        self.assertEqual(leave_request.requested_units, 1)
        breakdown = leave_request.metadata["unit_breakdown"]
        self.assertEqual(breakdown["requested_units"], "1.00")
        self.assertEqual(
            [(item["date"], item["counted"], item["reason"], item["units"]) for item in breakdown["days"]],
            [
                ("2026-10-23", True, "working_day", "1.00"),
                ("2026-10-24", False, "weekly_off", "0.00"),
                ("2026-10-25", False, "weekly_off", "0.00"),
            ],
        )

    def test_weekly_off_exclusion_follows_custom_roster_not_standard_weekend(self):
        self.shift.weekly_off_days = ["tuesday", "wednesday"]
        self.shift.save(update_fields=["weekly_off_days", "updated_at"])

        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=date(2026, 10, 31),
            end_date=date(2026, 11, 4),
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Custom roster weekly off",
        )

        self.assertEqual(leave_request.requested_units, 3)
        breakdown = leave_request.metadata["unit_breakdown"]
        self.assertEqual(breakdown["requested_units"], "3.00")
        self.assertEqual(
            [(item["date"], item["day"], item["counted"], item["reason"], item["units"]) for item in breakdown["days"]],
            [
                ("2026-10-31", "Saturday", True, "working_day", "1.00"),
                ("2026-11-01", "Sunday", True, "working_day", "1.00"),
                ("2026-11-02", "Monday", True, "working_day", "1.00"),
                ("2026-11-03", "Tuesday", False, "weekly_off", "0.00"),
                ("2026-11-04", "Wednesday", False, "weekly_off", "0.00"),
            ],
        )

    def test_leave_units_follow_employee_shift_assignment_over_policy_default_shift(self):
        roster_shift = Shift.objects.create(
            tenant=self.tenant,
            code="employee-roster-shift",
            name="Employee Roster Shift",
            start_time=time(10, 0),
            end_time=time(19, 0),
            working_hours="8.00",
            weekly_off_days=["monday", "tuesday"],
        )
        EmployeeShiftAssignment.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            shift=roster_shift,
            assignment_kind=EmployeeShiftAssignmentKind.FIXED,
            effective_from=date(2026, 10, 1),
            is_primary=True,
        )

        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=date(2026, 10, 31),
            end_date=date(2026, 11, 3),
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Employee-specific roster",
        )

        self.assertEqual(leave_request.requested_units, 2)
        breakdown = leave_request.metadata["unit_breakdown"]
        self.assertEqual(breakdown["requested_units"], "2.00")
        self.assertEqual(
            [
                (
                    item["date"],
                    item["day"],
                    item["counted"],
                    item["reason"],
                    item["shift_name"],
                    item["weekly_off_source"],
                    item["assignment_kind"],
                )
                for item in breakdown["days"]
            ],
            [
                ("2026-10-31", "Saturday", True, "working_day", "Employee Roster Shift", "shift_assignment", "fixed"),
                ("2026-11-01", "Sunday", True, "working_day", "Employee Roster Shift", "shift_assignment", "fixed"),
                ("2026-11-02", "Monday", False, "weekly_off", "Employee Roster Shift", "shift_assignment", "fixed"),
                ("2026-11-03", "Tuesday", False, "weekly_off", "Employee Roster Shift", "shift_assignment", "fixed"),
            ],
        )

    def test_sandwich_rule_counts_weekly_off_between_leave_dates(self):
        friday = _next_weekday(4)
        self.leave_policy.sandwich_rule_enabled = True
        self.leave_policy.save(update_fields=["sandwich_rule_enabled", "updated_at"])

        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=friday,
            end_date=friday + timedelta(days=3),
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Long weekend travel",
        )

        self.assertEqual(leave_request.requested_units, 4)

    def test_leave_entitlement_uses_service_tier_after_three_years(self):
        self.employee.date_of_joining = date(2023, 4, 1)
        self.employee.save(update_fields=["date_of_joining", "updated_at"])
        self.leave_policy.annual_entitlement = "20.00"
        self.leave_policy.accrual_frequency = "yearly"
        self.leave_policy.config_snapshot = {
            "entitlement": {
                "grant_mode": "upfront",
                "service_tiers": [
                    {"min_service_years": 3, "annual_entitlement": "22.00", "label": "3+ years"},
                ],
            }
        }
        self.leave_policy.save(update_fields=["annual_entitlement", "accrual_frequency", "config_snapshot", "updated_at"])

        before_anniversary_balance = ensure_employee_leave_balances(self.employee, as_of=date(2026, 3, 31))[0]
        self.assertEqual(before_anniversary_balance.accrued_amount, 20)

        after_anniversary_balance = ensure_employee_leave_balances(self.employee, as_of=date(2026, 4, 1))[0]
        self.assertEqual(after_anniversary_balance.accrued_amount, 22)

    def test_template_shaped_service_tier_policy_reserves_against_resolved_entitlement(self):
        self.employee.date_of_joining = date(2023, 4, 1)
        self.employee.save(update_fields=["date_of_joining", "updated_at"])
        self.leave_policy.annual_entitlement = "20.00"
        self.leave_policy.accrual_frequency = "yearly"
        self.leave_policy.notice_days_required = 0
        self.leave_policy.max_consecutive_days = "15.00"
        self.leave_policy.config_snapshot = {
            "approval": {
                "default_route": "manager_only",
                "escalation_route": "manager_then_hr",
                "escalate_when_units_gte": "10.00",
            },
            "entitlement": {
                "grant_mode": "upfront",
                "proration_mode": "by_join_month",
                "service_tiers": [
                    {"min_service_months": 36, "annual_entitlement": "22.00", "label": "3+ years"},
                    {"min_service_months": 60, "annual_entitlement": "25.00", "label": "5+ years"},
                ],
                "carry_forward_mode": "limited",
                "carry_forward_cap": "10.00",
                "encashment_allowed": True,
                "encashment_cap": "5.00",
                "probation_accrual_mode": "accrue",
            },
        }
        self.leave_policy.save(
            update_fields=[
                "annual_entitlement",
                "accrual_frequency",
                "notice_days_required",
                "max_consecutive_days",
                "config_snapshot",
                "updated_at",
            ]
        )
        request_date = timezone.localdate() + timedelta(days=14)

        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=request_date,
            end_date=request_date,
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Template tier runtime check",
        )

        balance = ensure_employee_leave_balances(self.employee, as_of=request_date)[0]
        self.assertEqual(leave_request.requested_units, 1)
        self.assertEqual(balance.accrued_amount, 22)
        self.assertEqual(balance.reserved_amount, 1)
        self.assertEqual(balance.closing_balance, 21)

    def test_carry_forward_is_capped_from_previous_policy_period(self):
        self.leave_policy.annual_entitlement = "20.00"
        self.leave_policy.accrual_frequency = "yearly"
        self.leave_policy.max_carry_forward = "10.00"
        self.leave_policy.config_snapshot = {
            "entitlement": {
                "grant_mode": "upfront",
                "carry_forward_mode": "limited",
                "carry_forward_cap": "5.00",
            }
        }
        self.leave_policy.save(update_fields=["annual_entitlement", "accrual_frequency", "max_carry_forward", "config_snapshot", "updated_at"])
        LeaveBalance.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            leave_policy=self.leave_policy,
            period_year=2025,
            accrued_amount="20.00",
            closing_balance="12.00",
        )

        balance = ensure_employee_leave_balances(self.employee, as_of=date(2026, 1, 1))[0]

        self.assertEqual(balance.accrued_amount, 20)
        self.assertEqual(balance.carry_forward_amount, 5)
        self.assertEqual(balance.closing_balance, 25)

    def test_carry_forward_can_be_disabled_even_when_previous_balance_exists(self):
        self.leave_policy.annual_entitlement = "20.00"
        self.leave_policy.accrual_frequency = "yearly"
        self.leave_policy.max_carry_forward = "10.00"
        self.leave_policy.config_snapshot = {
            "entitlement": {
                "grant_mode": "upfront",
                "carry_forward_mode": "none",
                "carry_forward_cap": "10.00",
            }
        }
        self.leave_policy.save(update_fields=["annual_entitlement", "accrual_frequency", "max_carry_forward", "config_snapshot", "updated_at"])
        LeaveBalance.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            leave_policy=self.leave_policy,
            period_year=2025,
            accrued_amount="20.00",
            closing_balance="12.00",
        )

        balance = ensure_employee_leave_balances(self.employee, as_of=date(2026, 1, 1))[0]

        self.assertEqual(balance.carry_forward_amount, 0)
        self.assertEqual(balance.closing_balance, 20)

    def test_encashment_is_blocked_when_policy_disallows_it(self):
        balance = ensure_employee_leave_balances(self.employee, as_of=date(2026, 1, 1))[0]

        with self.assertRaises(ValidationError) as error:
            apply_leave_balance_admin_action(
                actor=self.manager,
                employee=self.employee,
                leave_policy=self.leave_policy,
                action="encashment",
                units=1,
                effective_date=date(2026, 1, 1),
                reason="Policy disallows encashment",
            )

        self.assertIn("Encashment is not allowed", str(error.exception))
        balance.refresh_from_db()
        self.assertEqual(balance.encashed_amount, 0)

    def test_encashment_cap_is_enforced_before_balance_mutation(self):
        self.leave_policy.annual_entitlement = "20.00"
        self.leave_policy.accrual_frequency = "yearly"
        self.leave_policy.config_snapshot = {
            "entitlement": {
                "grant_mode": "upfront",
                "encashment_allowed": True,
                "encashment_cap": "5.00",
            }
        }
        self.leave_policy.save(update_fields=["annual_entitlement", "accrual_frequency", "config_snapshot", "updated_at"])
        balance = ensure_employee_leave_balances(self.employee, as_of=date(2026, 1, 1))[0]

        with self.assertRaises(ValidationError) as error:
            apply_leave_balance_admin_action(
                actor=self.manager,
                employee=self.employee,
                leave_policy=self.leave_policy,
                action="encashment",
                units=6,
                effective_date=date(2026, 1, 1),
                reason="Too much encashment",
            )

        self.assertIn("configured cap of 5.00", str(error.exception))
        balance.refresh_from_db()
        self.assertEqual(balance.encashed_amount, 0)
        self.assertEqual(balance.closing_balance, 20)

    def test_encashment_requiring_approval_stays_pending_until_reviewer_approves(self):
        self.leave_policy.annual_entitlement = "20.00"
        self.leave_policy.accrual_frequency = "yearly"
        self.leave_policy.config_snapshot = {
            "entitlement": {
                "grant_mode": "upfront",
                "encashment_allowed": True,
                "encashment_cap": "5.00",
            },
            "operations": {
                "reviewer_employee_id": str(self.second_manager.id),
                "approval_required_for_encashment": True,
                "encashment_requires_approval_over_units": "1.00",
            },
        }
        self.leave_policy.save(update_fields=["annual_entitlement", "accrual_frequency", "config_snapshot", "updated_at"])

        result = apply_leave_balance_admin_action(
            actor=self.manager,
            employee=self.employee,
            leave_policy=self.leave_policy,
            action="encashment",
            units=2,
            effective_date=date(2026, 1, 1),
            reason="Annual encashment",
        )

        self.assertFalse(result["applied"])
        self.assertTrue(result["requires_review"])
        self.assertEqual(result["transaction"].status, LeaveBalanceTransaction.Status.PENDING)
        result["balance"].refresh_from_db()
        self.assertEqual(result["balance"].encashed_amount, 0)
        self.assertEqual(result["balance"].closing_balance, 20)

        reviewed = review_leave_balance_transaction(
            actor=self.second_manager,
            transaction_item=result["transaction"],
            decision="approve",
        )

        self.assertTrue(reviewed["applied"])
        self.assertEqual(reviewed["transaction"].status, LeaveBalanceTransaction.Status.APPLIED)
        self.assertEqual(reviewed["balance"].encashed_amount, 2)
        self.assertEqual(reviewed["balance"].closing_balance, 18)

    def test_balance_operation_review_notifies_reviewer_and_employee(self):
        self.leave_policy.annual_entitlement = "20.00"
        self.leave_policy.accrual_frequency = "yearly"
        self.leave_policy.config_snapshot = {
            "entitlement": {
                "grant_mode": "upfront",
                "encashment_allowed": True,
                "encashment_cap": "5.00",
            },
            "operations": {
                "reviewer_employee_id": str(self.second_manager.id),
                "approval_required_for_encashment": True,
            },
        }
        self.leave_policy.save(update_fields=["annual_entitlement", "accrual_frequency", "config_snapshot", "updated_at"])

        result = apply_leave_balance_admin_action(
            actor=self.manager,
            employee=self.employee,
            leave_policy=self.leave_policy,
            action="encashment",
            units=2,
            effective_date=date(2026, 1, 1),
            reason="Annual encashment",
        )

        reviewer_notification = Notification.objects.get(
            tenant=self.tenant,
            subject_type="leave_balance_transaction",
            subject_identifier=str(result["transaction"].id),
            recipient_membership=self.second_manager_membership,
        )
        self.assertEqual(reviewer_notification.payload["action"], "encashment")
        self.assertIn("pending review", reviewer_notification.title.lower())

        review_leave_balance_transaction(
            actor=self.second_manager,
            transaction_item=result["transaction"],
            decision="approve",
        )

        employee_notification = Notification.objects.filter(
            tenant=self.tenant,
            subject_type="leave_balance_transaction",
            subject_identifier=str(result["transaction"].id),
            recipient_membership=self.employee_membership,
        ).latest("created_at")
        self.assertEqual(employee_notification.payload["status"], LeaveBalanceTransaction.Status.APPLIED)
        self.assertIn("approved", employee_notification.title.lower())

    def test_leave_policy_preview_explains_matched_service_tier(self):
        self.employee.date_of_joining = date(2023, 4, 1)
        self.employee.save(update_fields=["date_of_joining", "updated_at"])

        preview = preview_leave_policy_configuration(
            employee=self.employee,
            leave_type=self.leave_type,
            requested_units=1,
            annual_entitlement=20,
            config_snapshot={
                "entitlement": {
                    "grant_mode": "upfront",
                    "service_tiers": [
                        {"min_service_months": 36, "annual_entitlement": "22.00", "label": "3+ years"},
                    ],
                }
            },
        )

        resolution = preview["entitlement_preview"]["entitlement_resolution"]
        self.assertEqual(resolution["base_annual_entitlement"], "20.00")
        self.assertEqual(resolution["resolved_annual_entitlement"], "22.00")
        self.assertEqual(resolution["matched_service_tier"]["label"], "3+ years")
        self.assertGreaterEqual(resolution["service_months"], 36)

    def test_partially_approved_leave_moves_to_second_level_mss_queue_with_track(self):
        monday = _next_weekday(0)
        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=monday,
            end_date=monday + timedelta(days=1),
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Personal work",
        )

        first_level_items = get_manager_pending_leave_requests(self.manager)
        self.assertEqual([str(item["id"]) for item in first_level_items], [str(leave_request.id)])

        leave_request = resolve_leave_request(
            leave_request=leave_request,
            actor_employee=self.manager,
            approve=True,
            comment="Approved by manager",
        )

        self.assertEqual(leave_request.status, LeaveRequestStatus.PARTIALLY_APPROVED)
        second_level_items = get_manager_pending_leave_requests(self.second_manager)
        self.assertEqual([str(item["id"]) for item in second_level_items], [str(leave_request.id)])
        self.assertEqual(second_level_items[0]["approval_steps"][0]["status"], "approved")
        self.assertEqual(second_level_items[0]["approval_steps"][1]["is_current"], True)

        employee_history = get_employee_leave_requests(self.employee)
        self.assertEqual(employee_history[0]["status"], LeaveRequestStatus.PARTIALLY_APPROVED)
        self.assertEqual(employee_history[0]["approval_steps"][1]["manager_name"], "Rohan Director")

    def test_active_leave_request_blocks_exact_day_and_range_overlap(self):
        monday = _next_weekday(0)
        existing_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=monday + timedelta(days=3),
            end_date=monday + timedelta(days=3),
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Existing leave",
        )

        with self.assertRaises(ValidationError) as exact_error:
            submit_leave_request(
                employee=self.employee,
                leave_type=self.leave_type,
                start_date=monday + timedelta(days=3),
                end_date=monday + timedelta(days=3),
                start_day_portion="full_day",
                end_day_portion="full_day",
                reason="Duplicate date",
            )
        self.assertIn("overlap", str(exact_error.exception).lower())

        with self.assertRaises(ValidationError) as range_error:
            submit_leave_request(
                employee=self.employee,
                leave_type=self.leave_type,
                start_date=monday + timedelta(days=2),
                end_date=monday + timedelta(days=4),
                start_day_portion="full_day",
                end_day_portion="full_day",
                reason="Range includes existing date",
            )
        self.assertIn(str(existing_request.start_date), str(range_error.exception))

    def test_legacy_leave_workflow_without_assignment_still_shows_pending_manager(self):
        monday = _next_weekday(0)
        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=monday,
            end_date=monday,
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Legacy workflow approval visibility",
        )
        WorkflowAssignment.objects.filter(step_instance__workflow_instance__id=leave_request.workflow_reference).delete()

        employee_history = get_employee_leave_requests(self.employee)

        self.assertEqual(employee_history[0]["approval_steps"][0]["manager_name"], "Meera Manager")
        self.assertTrue(employee_history[0]["approval_steps"][0]["is_current"])

    def test_withdraw_leave_request_notifies_manager(self):
        monday = _next_weekday(0)
        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=monday,
            end_date=monday,
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Plans changed",
        )

        withdrawn = withdraw_leave_request(
            leave_request=leave_request,
            actor_employee=self.employee,
            reason="No longer needed",
        )

        notification = Notification.objects.get(
            tenant=self.tenant,
            subject_type="leave_request",
            subject_identifier=str(withdrawn.id),
            recipient_membership=self.manager_membership,
            title="Leave request withdrawn",
        )
        self.assertEqual(notification.payload["status"], LeaveRequestStatus.WITHDRAWN)

    def test_immediate_approved_leave_cancellation_notifies_manager(self):
        self.leave_policy.config_snapshot = {
            "approval": {
                "default_route": "manager_only",
            },
            "lifecycle": {
                "allow_employee_cancel_approved": True,
                "cancel_approved_requires_reapproval": False,
            },
        }
        self.leave_policy.save(update_fields=["config_snapshot", "updated_at"])
        monday = _next_weekday(0)
        leave_request = submit_leave_request(
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=monday,
            end_date=monday,
            start_day_portion="full_day",
            end_day_portion="full_day",
            reason="Personal work",
        )
        approved = resolve_leave_request(
            leave_request=leave_request,
            actor_employee=self.manager,
            approve=True,
            comment="Approved",
        )

        cancelled = cancel_leave_request(
            leave_request=approved,
            actor_employee=self.employee,
            reason="Plans changed",
        )

        notification = Notification.objects.get(
            tenant=self.tenant,
            subject_type="leave_request",
            subject_identifier=str(cancelled.id),
            recipient_membership=self.manager_membership,
            title="Approved leave cancelled",
        )
        self.assertEqual(notification.payload["status"], LeaveRequestStatus.CANCELLED)
