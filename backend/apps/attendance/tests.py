from types import SimpleNamespace

from django.test import TestCase

from apps.attendance.models import AttendancePolicy, AttendancePolicyAssignment, AttendancePolicyStatus
from apps.attendance.services import (
    preview_attendance_policy_assignment_conflicts,
    preview_attendance_policy_assignment_resolution,
)
from apps.common.api_views import save_hr_admin_attendance_policy_assignment
from apps.employees.models import Employee
from apps.organizations.models import Department, EmploymentType, Grade
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus


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
