from types import SimpleNamespace

from django.test import TestCase

from apps.common.api_views import save_hr_admin_leave_policy_assignment
from apps.employees.models import Employee
from apps.leave_management.models import LeavePolicy, LeavePolicyAssignment, LeavePolicyStatus, LeaveType
from apps.leave_management.services import preview_leave_policy_assignment_conflicts, preview_leave_policy_assignment_resolution
from apps.organizations.models import Department, EmploymentType, Grade
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus


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
