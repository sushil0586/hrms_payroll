from django.test import TestCase

from apps.employees.models import Employee
from apps.leave_management.models import LeavePolicy, LeavePolicyAssignment, LeavePolicyStatus, LeaveType
from apps.leave_management.services import preview_leave_policy_assignment_conflicts, preview_leave_policy_assignment_resolution
from apps.organizations.models import Department
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
