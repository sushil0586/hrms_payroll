from types import SimpleNamespace
from datetime import date, time, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.attendance.models import AttendancePolicy, AttendancePolicyAssignment, AttendancePolicyStatus, Holiday, HolidayCalendar, HolidayType, Shift
from apps.common.api_views import save_hr_admin_leave_policy_assignment
from apps.common.selectors import get_employee_leave_requests, get_manager_pending_leave_requests
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipStatus, TenantMembership, User
from apps.leave_management.models import LeavePolicy, LeavePolicyAssignment, LeavePolicyStatus, LeaveType, LeaveRequestStatus
from apps.leave_management.services import preview_leave_policy_assignment_conflicts, preview_leave_policy_assignment_resolution, resolve_leave_request, submit_leave_request
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
