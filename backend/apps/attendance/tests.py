from django.test import TestCase

from apps.attendance.models import AttendancePolicy, AttendancePolicyAssignment, AttendancePolicyStatus
from apps.attendance.services import (
    preview_attendance_policy_assignment_conflicts,
    preview_attendance_policy_assignment_resolution,
)
from apps.employees.models import Employee
from apps.organizations.models import Department
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

