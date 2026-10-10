from datetime import date, datetime, time, timedelta
from decimal import Decimal
from types import SimpleNamespace

from django.test import TestCase
from django.utils import timezone

from apps.attendance.models import (
    AttendancePolicy,
    AttendancePolicyAssignment,
    AttendancePolicyStatus,
    AttendanceRecord,
    AttendanceSource,
    AttendanceStatus,
    EmployeeShiftAssignment,
    EmployeeShiftAssignmentKind,
    Holiday,
    HolidayCalendar,
    HolidayType,
    Shift,
)
from apps.attendance.services import (
    build_attendance_derivation_summary,
    ensure_employee_attendance_records,
    evaluate_attendance_runtime,
    preview_attendance_policy_assignment_conflicts,
    preview_attendance_policy_assignment_resolution,
    resolve_employee_work_day,
    resolve_employee_work_schedule,
    submit_regularization,
)
from apps.common.selectors import get_employee_attendance_regularizations, get_manager_pending_attendance_regularizations
from apps.common.api_views import save_hr_admin_attendance_policy, save_hr_admin_attendance_policy_assignment
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipStatus, TenantMembership, User
from apps.leave_management.models import LeavePolicy, LeaveRequest, LeaveRequestStatus, LeaveType
from apps.leave_management.services import build_leave_attendance_collision_snapshot, build_leave_attendance_collision_summary
from apps.organizations.models import Department, EmploymentType, Grade
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus
from apps.workflows.models import WorkflowAssignment


class AttendancePolicyAssignmentConflictTests(TestCase):
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
        self.default_policy = AttendancePolicy.objects.create(
            tenant=self.tenant,
            code="default-attendance",
            name="Default Attendance",
            status=AttendancePolicyStatus.ACTIVE,
        )
        self.department_policy = AttendancePolicy.objects.create(
            tenant=self.tenant,
            code="engineering-attendance",
            name="Engineering Attendance",
            status=AttendancePolicyStatus.ACTIVE,
        )
        self.employee = Employee.objects.create(
            tenant=self.tenant,
            employee_code="E001",
            first_name="Anika",
            employment_status=EmploymentStatus.ACTIVE,
            department=self.department,
            grade=self.employee_grade,
            employment_type=self.employee_type,
        )

    def test_broad_and_department_scoped_attendance_assignments_overlap_without_blocking_at_same_priority(self):
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )

        preview = preview_attendance_policy_assignment_conflicts(
            tenant=self.tenant,
            attendance_policy=self.department_policy,
            scope_data={
                "legal_entity_id": None,
                "branch_id": None,
                "location_id": None,
                "department_id": self.department.id,
                "grade_id": None,
                "employment_type_id": None,
                "employee_id": None,
            },
            priority=100,
        )

        self.assertTrue(preview["has_conflicts"])
        self.assertFalse(preview["has_blocking_conflict"])
        self.assertEqual(preview["conflicts"][0]["overlap_kind"], "partial_scope_overlap")
        self.assertFalse(preview["conflicts"][0]["is_same_granularity"])

    def test_same_level_same_priority_attendance_assignments_block_ambiguous_department_routes(self):
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            department=self.department,
            priority=100,
            is_active=True,
        )

        preview = preview_attendance_policy_assignment_conflicts(
            tenant=self.tenant,
            attendance_policy=self.department_policy,
            scope_data={
                "legal_entity_id": None,
                "branch_id": None,
                "location_id": None,
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

    def test_attendance_resolution_prefers_narrower_department_scope_when_priority_matches(self):
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )
        department_assignment = AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.department_policy,
            department=self.department,
            priority=100,
            is_active=True,
        )

        resolution = preview_attendance_policy_assignment_resolution(employee=self.employee)

        self.assertTrue(resolution["has_resolution"])
        self.assertEqual(resolution["policy_name"], "Engineering Attendance")
        self.assertEqual(resolution["assignment_id"], str(department_assignment.id))

    def test_attendance_employee_override_ignores_stale_mismatched_scope_filters(self):
        override_assignment = AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.department_policy,
            employee=self.employee,
            department=self.department,
            grade=self.other_grade,
            employment_type=self.other_employee_type,
            priority=100,
            is_active=True,
        )

        resolution = preview_attendance_policy_assignment_resolution(employee=self.employee)

        self.assertTrue(resolution["has_resolution"])
        self.assertEqual(resolution["assignment_id"], str(override_assignment.id))
        self.assertEqual(resolution["scope_labels"], ["Employee: E001"])

    def test_saving_attendance_employee_override_clears_other_scope_filters(self):
        actor = SimpleNamespace(tenant=self.tenant)

        assignment = save_hr_admin_attendance_policy_assignment(
            actor,
            {
                "attendance_policy_id": self.department_policy.id,
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
        self.assertIsNone(assignment.location_id)
        self.assertIsNone(assignment.department_id)
        self.assertIsNone(assignment.grade_id)
        self.assertIsNone(assignment.employment_type_id)

    def test_attendance_policy_change_refreshes_current_unlocked_records(self):
        actor = SimpleNamespace(tenant=self.tenant)
        today = timezone.localdate()
        check_in_at = timezone.make_aware(datetime.combine(today, datetime.min.time())) + timedelta(hours=9)
        check_out_at = check_in_at + timedelta(hours=5)
        self.default_policy.full_day_min_hours = Decimal("8.00")
        self.default_policy.half_day_min_hours = Decimal("4.00")
        self.default_policy.config_snapshot = {"derivation": {"enabled": True}}
        self.default_policy.save(update_fields=["full_day_min_hours", "half_day_min_hours", "config_snapshot", "updated_at"])
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )
        record = AttendanceRecord.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            attendance_date=today,
            status=AttendanceStatus.HALF_DAY,
            source=AttendanceSource.WEB,
            check_in_at=check_in_at,
            check_out_at=check_out_at,
            work_duration_hours=Decimal("5.00"),
        )

        save_hr_admin_attendance_policy(
            actor,
            {"full_day_min_hours": Decimal("4.00")},
            item=self.default_policy,
        )

        record.refresh_from_db()
        self.assertEqual(record.status, AttendanceStatus.PRESENT)
        self.assertEqual(record.work_duration_hours, Decimal("5.00"))

    def test_new_attendance_assignment_refreshes_employee_current_record(self):
        actor = SimpleNamespace(tenant=self.tenant)
        today = timezone.localdate()
        check_in_at = timezone.make_aware(datetime.combine(today, datetime.min.time())) + timedelta(hours=9)
        check_out_at = check_in_at + timedelta(hours=5)
        self.default_policy.full_day_min_hours = Decimal("8.00")
        self.default_policy.half_day_min_hours = Decimal("4.00")
        self.default_policy.config_snapshot = {"derivation": {"enabled": True}}
        self.default_policy.save(update_fields=["full_day_min_hours", "half_day_min_hours", "config_snapshot", "updated_at"])
        self.department_policy.full_day_min_hours = Decimal("4.00")
        self.department_policy.half_day_min_hours = Decimal("2.00")
        self.department_policy.config_snapshot = {"derivation": {"enabled": True}}
        self.department_policy.save(update_fields=["full_day_min_hours", "half_day_min_hours", "config_snapshot", "updated_at"])
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )
        record = AttendanceRecord.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            attendance_date=today,
            status=AttendanceStatus.HALF_DAY,
            source=AttendanceSource.WEB,
            check_in_at=check_in_at,
            check_out_at=check_out_at,
            work_duration_hours=Decimal("5.00"),
        )

        save_hr_admin_attendance_policy_assignment(
            actor,
            {
                "attendance_policy_id": self.department_policy.id,
                "department_id": self.department.id,
                "priority": 10,
                "is_active": True,
            },
        )

        record.refresh_from_db()
        self.assertEqual(record.status, AttendanceStatus.PRESENT)

    def test_active_employee_with_policy_gets_current_month_attendance_placeholders(self):
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )
        today = timezone.localdate()

        records = ensure_employee_attendance_records(self.employee)

        self.assertEqual(len(records), today.day)
        self.assertEqual(
            AttendanceRecord.objects.filter(
                tenant=self.tenant,
                employee=self.employee,
                attendance_date__gte=today.replace(day=1),
                attendance_date__lte=today,
                source=AttendanceSource.SYSTEM,
            ).count(),
            today.day,
        )

    def test_attendance_placeholders_apply_derivation_rules(self):
        self.default_policy.config_snapshot = {"derivation": {"enabled": True, "missing_punch_status": AttendanceStatus.ABSENT}}
        self.default_policy.save(update_fields=["config_snapshot", "updated_at"])
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )

        records = ensure_employee_attendance_records(self.employee, from_date=timezone.localdate(), to_date=timezone.localdate())

        self.assertEqual(len(records), 1)
        records[0].refresh_from_db()
        self.assertEqual(records[0].status, AttendanceStatus.ABSENT)
        self.assertEqual(records[0].source, AttendanceSource.SYSTEM)

    def test_attendance_runtime_marks_policy_holiday_before_missing_punch(self):
        calendar = HolidayCalendar.objects.create(
            tenant=self.tenant,
            code="india-2027",
            name="India Holidays 2027",
            year=2027,
            is_active=True,
        )
        Holiday.objects.create(
            calendar=calendar,
            date=date(2027, 1, 26),
            name="Republic Day",
            holiday_type=HolidayType.COMPULSORY,
        )
        self.default_policy.holiday_calendar = calendar
        self.default_policy.config_snapshot = {"derivation": {"enabled": True, "missing_punch_status": AttendanceStatus.ABSENT}}
        self.default_policy.save(update_fields=["holiday_calendar", "config_snapshot", "updated_at"])
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )

        runtime = evaluate_attendance_runtime(employee=self.employee, attendance_date=date(2027, 1, 26))

        self.assertEqual(runtime["status"], AttendanceStatus.HOLIDAY)
        self.assertEqual(runtime["holiday"].name, "Republic Day")

    def test_attendance_runtime_marks_shift_weekly_off_before_missing_punch(self):
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="general",
            name="General Shift",
            start_time=time(10, 0),
            end_time=time(18, 0),
            working_hours=Decimal("8.00"),
            weekly_off_days=["sunday"],
            is_active=True,
        )
        self.default_policy.default_shift = shift
        self.default_policy.config_snapshot = {"derivation": {"enabled": True, "missing_punch_status": AttendanceStatus.ABSENT}}
        self.default_policy.save(update_fields=["default_shift", "config_snapshot", "updated_at"])
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )

        runtime = evaluate_attendance_runtime(employee=self.employee, attendance_date=date(2027, 1, 3))

        self.assertEqual(runtime["status"], AttendanceStatus.WEEKLY_OFF)
        self.assertEqual(runtime["shift"].name, "General Shift")

    def test_attendance_runtime_derives_late_minutes_and_overtime_from_shift(self):
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="general",
            name="General Shift",
            start_time=time(10, 0),
            end_time=time(18, 0),
            working_hours=Decimal("8.00"),
            grace_in_minutes=10,
            grace_out_minutes=5,
            is_active=True,
        )
        self.default_policy.default_shift = shift
        self.default_policy.full_day_min_hours = Decimal("8.00")
        self.default_policy.half_day_min_hours = Decimal("4.00")
        self.default_policy.overtime_threshold_minutes = 30
        self.default_policy.config_snapshot = {"derivation": {"enabled": True, "late_status_mode": AttendanceStatus.LATE}}
        self.default_policy.save(
            update_fields=[
                "default_shift",
                "full_day_min_hours",
                "half_day_min_hours",
                "overtime_threshold_minutes",
                "config_snapshot",
                "updated_at",
            ],
        )
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )
        attendance_date = date(2027, 1, 4)
        check_in = timezone.make_aware(datetime.combine(attendance_date, time(10, 20)))
        check_out = timezone.make_aware(datetime.combine(attendance_date, time(19, 0)))

        runtime = evaluate_attendance_runtime(
            employee=self.employee,
            attendance_date=attendance_date,
            check_in_at=check_in,
            check_out_at=check_out,
        )

        self.assertEqual(runtime["status"], AttendanceStatus.LATE)
        self.assertEqual(runtime["late_minutes"], 20)
        self.assertEqual(runtime["early_exit_minutes"], 0)
        self.assertEqual(runtime["work_duration_hours"], Decimal("8.67"))
        self.assertEqual(runtime["overtime_hours"], Decimal("0.17"))

    def test_attendance_derivation_summary_explains_absent_working_day_payroll_impact(self):
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="summary-shift",
            name="Summary Shift",
            start_time=time(10, 0),
            end_time=time(18, 0),
            working_hours=Decimal("8.00"),
            weekly_off_days=["sunday"],
            is_active=True,
        )
        self.default_policy.default_shift = shift
        self.default_policy.config_snapshot = {"derivation": {"enabled": True, "missing_punch_status": AttendanceStatus.ABSENT}}
        self.default_policy.save(update_fields=["default_shift", "config_snapshot", "updated_at"])
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )
        record = AttendanceRecord.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            attendance_date=date(2027, 1, 4),
            status=AttendanceStatus.ABSENT,
            source=AttendanceSource.SYSTEM,
            shift=shift,
        )

        summary = build_attendance_derivation_summary(record)

        self.assertEqual(summary["schema_ref"], "attendance.derivation_summary.v1")
        self.assertEqual(summary["schedule_contract_ref"], "schedule_spine.contract.v1")
        self.assertEqual(summary["schedule_day_type"], "working_day")
        self.assertIn("No check-in or check-out", summary["reasons"][0])
        self.assertEqual(summary["payroll_impact"]["payable_units"], "0.00")
        self.assertEqual(summary["payroll_impact"]["lop_units"], "1.00")
        self.assertTrue(summary["payroll_impact"]["payroll_impacting"])

    def test_leave_attendance_collision_summary_flags_approved_leave_with_payable_attendance(self):
        leave_type = LeaveType.objects.create(
            tenant=self.tenant,
            code="earned",
            name="Earned Leave",
        )
        leave_policy = LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=leave_type,
            code="earned-standard",
            name="Earned Standard",
            status="active",
            allow_weekend_holiday_overlap=True,
        )
        attendance_date = date(2027, 1, 4)
        leave_request = LeaveRequest.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            leave_type=leave_type,
            leave_policy=leave_policy,
            status=LeaveRequestStatus.APPROVED,
            start_date=attendance_date,
            end_date=attendance_date,
            requested_units=Decimal("1.00"),
            approved_units=Decimal("1.00"),
            approved_at=timezone.now(),
        )
        record = AttendanceRecord.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            attendance_date=attendance_date,
            status=AttendanceStatus.PRESENT,
            source=AttendanceSource.BIOMETRIC,
        )

        leave_summary = build_leave_attendance_collision_summary(leave_request)
        period_summary = build_leave_attendance_collision_snapshot(
            employee=self.employee,
            period_start=attendance_date,
            period_end=attendance_date,
        )
        attendance_summary = build_attendance_derivation_summary(record)

        self.assertEqual(leave_summary["status"], "conflict")
        self.assertTrue(leave_summary["payroll_blocking"])
        self.assertEqual(leave_summary["collisions"][0]["attendance_status"], AttendanceStatus.PRESENT)
        self.assertEqual(period_summary["collision_count"], 1)
        self.assertEqual(period_summary["items"][0]["leave_request_id"], str(leave_request.id))
        self.assertEqual(attendance_summary["leave_collision_count"], 1)

    def test_work_day_resolver_uses_policy_default_shift_and_custom_weekly_off(self):
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="retail",
            name="Retail Shift",
            start_time=time(11, 0),
            end_time=time(20, 0),
            working_hours=Decimal("8.00"),
            weekly_off_days=["tuesday"],
            is_active=True,
        )
        self.default_policy.default_shift = shift
        self.default_policy.save(update_fields=["default_shift", "updated_at"])
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )

        sunday = resolve_employee_work_day(employee=self.employee, work_date=date(2027, 1, 3))
        tuesday = resolve_employee_work_day(employee=self.employee, work_date=date(2027, 1, 5))

        self.assertEqual(sunday["day_type"], "working_day")
        self.assertEqual(sunday["contract_ref"], "schedule_spine.contract.v1")
        self.assertEqual(sunday["resolver_ref"], "attendance.resolve_employee_work_schedule.v1")
        self.assertEqual(sunday["shift_name"], "Retail Shift")
        self.assertEqual(sunday["resolution_source"], "attendance policy default shift")
        self.assertTrue(sunday["is_payable_schedule_day"])
        self.assertEqual(sunday["payroll_day_weight"], "1.00")
        self.assertEqual(sunday["payroll_impact"]["non_working_reason"], "")
        self.assertEqual(tuesday["day_type"], "weekly_off")
        self.assertEqual(tuesday["weekly_off_source"], "attendance_policy_default_shift")
        self.assertFalse(tuesday["is_payable_schedule_day"])
        self.assertEqual(tuesday["payroll_impact"]["non_working_reason"], "weekly_off")

    def test_work_schedule_resolver_follows_weekly_rotation_assignment(self):
        morning = Shift.objects.create(
            tenant=self.tenant,
            code="morning",
            name="Morning Shift",
            start_time=time(6, 0),
            end_time=time(14, 0),
            working_hours=Decimal("8.00"),
            weekly_off_days=[],
            is_active=True,
        )
        evening = Shift.objects.create(
            tenant=self.tenant,
            code="evening",
            name="Evening Shift",
            start_time=time(14, 0),
            end_time=time(22, 0),
            working_hours=Decimal("8.00"),
            weekly_off_days=[],
            is_active=True,
        )
        assignment = EmployeeShiftAssignment.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            shift=morning,
            assignment_kind=EmployeeShiftAssignmentKind.WEEKLY_ROTATION,
            effective_from=date(2027, 1, 4),
            is_primary=True,
            config_snapshot={
                "rotation": {
                    "anchor_date": "2027-01-04",
                    "entries": [
                        {"shift_id": str(morning.id), "span_days": 2},
                        {"shift_id": str(evening.id), "span_days": 2},
                    ],
                }
            },
        )

        schedule = resolve_employee_work_schedule(
            employee=self.employee,
            start_date=date(2027, 1, 4),
            end_date=date(2027, 1, 7),
        )

        self.assertEqual(schedule["working_day_count"], 4)
        self.assertEqual(schedule["contract_ref"], "schedule_spine.contract.v1")
        self.assertEqual(schedule["resolver_ref"], "attendance.resolve_employee_work_schedule.v1")
        self.assertEqual([item["shift_name"] for item in schedule["days"]], ["Morning Shift", "Morning Shift", "Evening Shift", "Evening Shift"])
        self.assertEqual(schedule["days"][2]["roster_assignment_id"], str(assignment.id))
        self.assertEqual(schedule["days"][2]["assignment_kind"], EmployeeShiftAssignmentKind.WEEKLY_ROTATION)
        self.assertIn("Morning Shift (2d) -> Evening Shift (2d)", schedule["days"][2]["sequence_summary"])

    def test_work_schedule_resolver_supports_enterprise_pattern_off_steps(self):
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="six-one-shift",
            name="Six One Shift",
            start_time=time(9, 0),
            end_time=time(17, 0),
            working_hours=Decimal("8.00"),
            weekly_off_days=[],
            is_active=True,
        )
        EmployeeShiftAssignment.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            shift=shift,
            assignment_kind=EmployeeShiftAssignmentKind.WEEKLY_ROTATION,
            effective_from=date(2027, 1, 4),
            is_primary=True,
            config_snapshot={
                "rotation": {
                    "pattern_type": "six_on_one_off",
                    "anchor_date": "2027-01-04",
                    "entries": [],
                }
            },
        )

        schedule = resolve_employee_work_schedule(
            employee=self.employee,
            start_date=date(2027, 1, 4),
            end_date=date(2027, 1, 10),
        )

        self.assertEqual(schedule["working_day_count"], 6)
        self.assertEqual(schedule["weekly_off_count"], 1)
        self.assertEqual([item["day_type"] for item in schedule["days"]], ["working_day", "working_day", "working_day", "working_day", "working_day", "working_day", "weekly_off"])
        self.assertIn("Six One Shift (6d) -> Off (1d)", schedule["days"][6]["sequence_summary"])
        self.assertEqual(schedule["days"][6]["payroll_impact"]["non_working_reason"], "weekly_off")

    def test_work_day_resolver_marks_holiday_before_shift_working_day(self):
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="general-resolver",
            name="General Resolver Shift",
            start_time=time(10, 0),
            end_time=time(18, 0),
            working_hours=Decimal("8.00"),
            weekly_off_days=["sunday"],
            is_active=True,
        )
        calendar = HolidayCalendar.objects.create(
            tenant=self.tenant,
            code="resolver-holidays",
            name="Resolver Holidays",
            year=2027,
            is_active=True,
        )
        holiday = Holiday.objects.create(
            calendar=calendar,
            date=date(2027, 1, 4),
            name="Factory Holiday",
            holiday_type=HolidayType.COMPULSORY,
        )
        self.default_policy.default_shift = shift
        self.default_policy.holiday_calendar = calendar
        self.default_policy.save(update_fields=["default_shift", "holiday_calendar", "updated_at"])
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )

        resolved = resolve_employee_work_day(employee=self.employee, work_date=date(2027, 1, 4))

        self.assertEqual(resolved["day_type"], "holiday")
        self.assertEqual(resolved["holiday_id"], str(holiday.id))
        self.assertEqual(resolved["shift_name"], "General Resolver Shift")
        self.assertEqual(resolved["expected_hours"], "8.00")
        self.assertFalse(resolved["is_payable_schedule_day"])
        self.assertEqual(resolved["payroll_day_weight"], "0.00")
        self.assertEqual(resolved["payroll_impact"]["non_working_reason"], "holiday")

    def test_work_day_resolver_exposes_night_shift_contract_fields(self):
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="night-resolver",
            name="Night Resolver Shift",
            start_time=time(22, 0),
            end_time=time(6, 0),
            working_hours=Decimal("8.00"),
            break_minutes=30,
            grace_in_minutes=10,
            grace_out_minutes=15,
            is_night_shift=True,
            weekly_off_days=["sunday"],
            is_active=True,
        )
        self.default_policy.default_shift = shift
        self.default_policy.save(update_fields=["default_shift", "updated_at"])
        AttendancePolicyAssignment.objects.create(
            tenant=self.tenant,
            attendance_policy=self.default_policy,
            priority=100,
            is_active=True,
        )

        resolved = resolve_employee_work_day(employee=self.employee, work_date=date(2027, 1, 4))

        self.assertEqual(resolved["day_type"], "working_day")
        self.assertTrue(resolved["crosses_midnight"])
        self.assertTrue(resolved["is_night_shift"])
        self.assertEqual(resolved["expected_break_minutes"], 30)
        self.assertEqual(resolved["grace_in_minutes"], 10)
        self.assertEqual(resolved["grace_out_minutes"], 15)
        self.assertTrue(resolved["payroll_impact"]["expected_payable_day"])


class AttendanceRegularizationApprovalTrackTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            code="attendance-runtime",
            name="Attendance Runtime",
            legal_name="Attendance Runtime Pvt Ltd",
            status=TenantStatus.ACTIVE,
            subscription_plan=SubscriptionPlan.GROWTH,
            country_code="IN",
            timezone="Asia/Kolkata",
        )
        self.employee_user = User.objects.create_user(username="attendance-employee", email="attendance-employee@example.com", password="test-pass")
        self.manager_user = User.objects.create_user(
            username="attendance-manager",
            email="attendance-manager@example.com",
            password="test-pass",
            first_name="Meera",
            last_name="Manager",
        )
        self.employee_membership = TenantMembership.objects.create(
            tenant=self.tenant,
            user=self.employee_user,
            status=MembershipStatus.ACTIVE,
            is_default=True,
            employee_code="EMP-ATT",
        )
        self.manager_membership = TenantMembership.objects.create(
            tenant=self.tenant,
            user=self.manager_user,
            status=MembershipStatus.ACTIVE,
            employee_code="MGR-ATT",
        )
        self.manager = Employee.objects.create(
            tenant=self.tenant,
            membership=self.manager_membership,
            employee_code="MGR-ATT",
            first_name="Meera",
            last_name="Manager",
            employment_status=EmploymentStatus.ACTIVE,
        )
        self.employee = Employee.objects.create(
            tenant=self.tenant,
            membership=self.employee_membership,
            employee_code="EMP-ATT",
            first_name="Aditi",
            reporting_manager=self.manager,
            employment_status=EmploymentStatus.ACTIVE,
        )
        self.attendance_record = AttendanceRecord.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            attendance_date=timezone.localdate() - timedelta(days=1),
            status=AttendanceStatus.ABSENT,
            source=AttendanceSource.SYSTEM,
        )

    def test_regularization_exposes_pending_approval_track_to_ess_and_mss(self):
        regularization = submit_regularization(
            employee=self.employee,
            attendance_record=self.attendance_record,
            requested_status=AttendanceStatus.PRESENT,
            reason="Missed web punch",
        )

        employee_items = get_employee_attendance_regularizations(self.employee)
        manager_items = get_manager_pending_attendance_regularizations(self.manager)

        self.assertEqual(str(employee_items[0]["id"]), str(regularization.id))
        self.assertEqual(employee_items[0]["approval_steps"][0]["manager_name"], "Meera Manager")
        self.assertTrue(employee_items[0]["approval_steps"][0]["is_current"])
        self.assertEqual([str(item["id"]) for item in manager_items], [str(regularization.id)])
        self.assertEqual(manager_items[0]["approval_steps"][0]["manager_email"], "attendance-manager@example.com")

    def test_legacy_regularization_without_assignment_still_shows_pending_manager(self):
        regularization = submit_regularization(
            employee=self.employee,
            attendance_record=self.attendance_record,
            requested_status=AttendanceStatus.PRESENT,
            reason="Legacy regularization without assignment",
        )
        WorkflowAssignment.objects.filter(step_instance__workflow_instance__id=regularization.workflow_reference).delete()

        employee_items = get_employee_attendance_regularizations(self.employee)
        manager_items = get_manager_pending_attendance_regularizations(self.manager)

        self.assertEqual(str(employee_items[0]["id"]), str(regularization.id))
        self.assertEqual(employee_items[0]["approval_steps"][0]["manager_name"], "Meera Manager")
        self.assertEqual(employee_items[0]["approval_steps"][0]["name"], "Manager Approval")
        self.assertEqual([str(item["id"]) for item in manager_items], [str(regularization.id)])
        self.assertEqual(manager_items[0]["approval_steps"][0]["manager_name"], "Meera Manager")
