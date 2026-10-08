from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from apps.attendance.models import AttendancePolicy, AttendancePolicyAssignment, AttendancePolicyStatus, EmployeeShiftAssignment, Shift
from apps.common.selectors import evaluate_saas_commercial_access
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, RolePermission, TenantMembership, User
from apps.leave_management.models import AccrualFrequency, LeaveBalance, LeavePolicy, LeavePolicyAssignment, LeavePolicyStatus, LeaveType
from apps.organizations.models import Branch, BusinessUnit, Department, LegalEntity, Location
from apps.payroll.models import PayrollCalendar, PayrollInputSnapshot, PayrollPeriod, PayrollRun
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus


class HrAdminOptionMetadataTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="hr-admin",
            email="hr-admin@example.com",
            password="test-pass",
        )
        self.tenant = Tenant.objects.create(
            code="metadata-co",
            name="Metadata Co",
            legal_name="Metadata Co Pvt Ltd",
            status=TenantStatus.ACTIVE,
            subscription_plan=SubscriptionPlan.ENTERPRISE,
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
        role = Role.objects.create(
            tenant=self.tenant,
            code="hr-admin",
            name="HR Admin",
            is_system_role=True,
            is_active=True,
        )
        MembershipRole.objects.create(membership=self.membership, role=role, is_primary=True)
        self.legal_entity = LegalEntity.objects.create(
            tenant=self.tenant,
            code="default-legal-entity",
            name="Metadata Co Pvt Ltd",
            registered_name="Metadata Co Pvt Ltd",
            country_code="IN",
            timezone="Asia/Kolkata",
        )
        self.location = Location.objects.create(
            tenant=self.tenant,
            code="head-office",
            name="Head Office",
            city="Mumbai",
            state="Maharashtra",
            country_code="IN",
        )
        self.branch = Branch.objects.create(
            tenant=self.tenant,
            code="mumbai-branch",
            name="Mumbai Branch",
            legal_entity=self.legal_entity,
            location=self.location,
        )
        self.business_unit = BusinessUnit.objects.create(
            tenant=self.tenant,
            code="corporate",
            name="Corporate",
        )
        self.department = Department.objects.create(
            tenant=self.tenant,
            code="people-ops",
            name="People Ops",
            business_unit=self.business_unit,
        )
        Employee.objects.create(
            tenant=self.tenant,
            membership=self.membership,
            employee_code="EMP-0001",
            first_name="Aditi",
            last_name="Gupta",
            preferred_name="Aditi",
            work_email=self.user.email,
            employment_status=EmploymentStatus.ACTIVE,
            legal_entity=self.legal_entity,
            branch=self.branch,
            location=self.location,
            department=self.department,
        )
        self.client.force_authenticate(self.user)

    def _assert_branch_metadata(self, path):
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        branch = next(item for item in response.json()["branches"] if item["id"] == str(self.branch.id))
        self.assertEqual(branch["legal_entity_id"], str(self.legal_entity.id))
        self.assertEqual(branch["location_id"], str(self.location.id))

    def test_policy_options_include_branch_parent_metadata(self):
        self._assert_branch_metadata("/api/v1/hr-admin/policy-options/")

    def test_attendance_operation_options_include_branch_parent_metadata(self):
        self._assert_branch_metadata("/api/v1/hr-admin/attendance-operations/options/")

    def test_workflow_options_include_branch_parent_metadata(self):
        self._assert_branch_metadata("/api/v1/hr-admin/workflow-options/")

    def test_document_options_include_branch_parent_metadata(self):
        self._assert_branch_metadata("/api/v1/hr-admin/document-options/")

    def test_work_schedule_preview_resolves_roster_weekly_off_and_policy_holiday_context(self):
        employee = Employee.objects.get(employee_code="EMP-0001")
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="retail-shift",
            name="Retail Shift",
            start_time="10:00",
            end_time="19:00",
            working_hours="8.00",
            weekly_off_days=["wednesday", "thursday"],
        )
        policy = AttendancePolicy.objects.create(
            tenant=self.tenant,
            code="resolver-policy",
            name="Resolver Policy",
            status=AttendancePolicyStatus.ACTIVE,
            default_shift=shift,
        )
        AttendancePolicyAssignment.objects.create(tenant=self.tenant, attendance_policy=policy, employee=employee, priority=10)
        EmployeeShiftAssignment.objects.create(
            tenant=self.tenant,
            employee=employee,
            shift=shift,
            effective_from=date(2026, 10, 1),
            is_primary=True,
        )

        response = self.client.get(
            "/api/v1/hr-admin/work-schedule-preview/",
            {"employee_id": str(employee.id), "start_date": "2026-10-07", "end_date": "2026-10-09"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["day_count"], 3)
        self.assertEqual(payload["weekly_off_count"], 2)
        self.assertEqual(payload["working_day_count"], 1)
        self.assertEqual([day["day_type"] for day in payload["days"]], ["weekly_off", "weekly_off", "working_day"])
        self.assertEqual(payload["days"][0]["weekly_off_source"], "shift_assignment")
        self.assertEqual(payload["days"][2]["shift_name"], "Retail Shift")

    def test_payroll_input_snapshot_carries_schedule_spine_counts_from_employee_roster(self):
        role = self.membership.membership_roles.get(role__code="hr-admin").role
        RolePermission.objects.create(
            role=role,
            permission_key="payroll.inputs.manage",
            description="Payroll input snapshot write permission.",
        )
        employee = Employee.objects.get(employee_code="EMP-0001")
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="payroll-roster-shift",
            name="Payroll Roster Shift",
            start_time="10:00",
            end_time="19:00",
            working_hours="8.00",
            weekly_off_days=["monday", "tuesday"],
        )
        EmployeeShiftAssignment.objects.create(
            tenant=self.tenant,
            employee=employee,
            shift=shift,
            effective_from=date(2026, 10, 1),
            is_primary=True,
        )
        calendar = PayrollCalendar.objects.create(
            tenant=self.tenant,
            code="monthly-payroll",
            name="Monthly Payroll",
            period_start_day=1,
        )
        period = PayrollPeriod.objects.create(
            tenant=self.tenant,
            calendar=calendar,
            code="nov-2026",
            name="November 2026",
            start_date=date(2026, 10, 31),
            end_date=date(2026, 11, 3),
            pay_date=date(2026, 11, 30),
        )
        payroll_run = PayrollRun.objects.create(
            tenant=self.tenant,
            period=period,
            code="nov-2026-run",
            name="November 2026 Run",
        )

        response = self.client.post(
            "/api/v1/hr-admin/payroll-input-snapshots/",
            {
                "payroll_run_id": str(payroll_run.id),
                "employee_id": str(employee.id),
                "snapshot_status": "ready",
                "attendance_snapshot": {"source": "manual"},
                "leave_snapshot": {"source": "manual"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        snapshot = PayrollInputSnapshot.objects.get(id=response.json()["id"])
        attendance_spine = snapshot.attendance_snapshot["schedule_spine"]
        leave_spine = snapshot.leave_snapshot["schedule_spine"]
        self.assertEqual(attendance_spine["calendar_days"], 4)
        self.assertEqual(attendance_spine["working_days"], 2)
        self.assertEqual(attendance_spine["weekly_off_days"], 2)
        self.assertEqual(attendance_spine["non_working_days"], 2)
        self.assertEqual(leave_spine["working_days"], 2)
        self.assertEqual(
            [(item["date"], item["day_type"], item["shift_name"], item["weekly_off_source"]) for item in attendance_spine["days"]],
            [
                ("2026-10-31", "working_day", "Payroll Roster Shift", "shift_assignment"),
                ("2026-11-01", "working_day", "Payroll Roster Shift", "shift_assignment"),
                ("2026-11-02", "weekly_off", "Payroll Roster Shift", "shift_assignment"),
                ("2026-11-03", "weekly_off", "Payroll Roster Shift", "shift_assignment"),
            ],
        )

    def test_payroll_setup_viewer_can_load_finance_handoff_context_for_provider_workspace(self):
        role = self.membership.membership_roles.get(role__code="hr-admin").role
        RolePermission.objects.create(
            role=role,
            permission_key="payroll.setup.view",
            description="Provider workspace read permission.",
        )

        response = self.client.get("/api/v1/hr-admin/payroll-finance-handoff-setup/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("handoffs", response.json())

    def test_payroll_provider_routes_use_provider_commercial_scope(self):
        provider_access = evaluate_saas_commercial_access(
            self.tenant,
            request_path="/api/v1/hr-admin/payroll-provider-connection-setup/",
            method="GET",
        )
        finance_access = evaluate_saas_commercial_access(
            self.tenant,
            request_path="/api/v1/hr-admin/payroll-finance-handoff-setup/",
            method="GET",
        )
        payroll_access = evaluate_saas_commercial_access(
            self.tenant,
            request_path="/api/v1/hr-admin/payroll-setup/",
            method="GET",
        )

        self.assertEqual([scope["scope_ref"] for scope in provider_access["matched_scopes"]], ["payroll_provider_integrations"])
        self.assertEqual([scope["scope_ref"] for scope in finance_access["matched_scopes"]], ["payroll_provider_integrations"])
        self.assertEqual([scope["scope_ref"] for scope in payroll_access["matched_scopes"]], ["payroll_core"])

    def test_unused_leave_policy_can_be_deleted(self):
        leave_type = LeaveType.objects.create(tenant=self.tenant, code="optional", name="Optional Leave")
        policy = LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=leave_type,
            code="optional-policy",
            name="Optional Policy",
            status=LeavePolicyStatus.DRAFT,
        )

        impact_response = self.client.get(f"/api/v1/hr-admin/leave-policies/{policy.id}/impact/")
        delete_response = self.client.delete(f"/api/v1/hr-admin/leave-policies/{policy.id}/delete/")

        self.assertEqual(impact_response.status_code, 200)
        self.assertTrue(impact_response.json()["can_delete"])
        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(LeavePolicy.objects.filter(id=policy.id).exists())

    def test_used_leave_policy_delete_is_blocked_and_archive_is_allowed(self):
        leave_type = LeaveType.objects.create(tenant=self.tenant, code="earned", name="Earned Leave")
        policy = LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=leave_type,
            code="earned-policy",
            name="Earned Policy",
            status=LeavePolicyStatus.ACTIVE,
            accrual_frequency=AccrualFrequency.YEARLY,
            annual_entitlement="20.00",
        )
        LeavePolicyAssignment.objects.create(tenant=self.tenant, leave_policy=policy, department=self.department, is_active=True)
        LeaveBalance.objects.create(
            tenant=self.tenant,
            employee=Employee.objects.get(employee_code="EMP-0001"),
            leave_policy=policy,
            period_year=2026,
            opening_balance="20.00",
            accrued_amount="20.00",
            closing_balance="20.00",
        )

        delete_response = self.client.delete(f"/api/v1/hr-admin/leave-policies/{policy.id}/delete/")
        archive_response = self.client.post(f"/api/v1/hr-admin/leave-policies/{policy.id}/archive/")

        self.assertEqual(delete_response.status_code, 409)
        self.assertFalse(delete_response.json()["can_delete"])
        self.assertEqual(archive_response.status_code, 200)
        policy.refresh_from_db()
        self.assertEqual(policy.status, LeavePolicyStatus.ARCHIVED)

    def test_leave_policy_assignment_can_be_deleted(self):
        leave_type = LeaveType.objects.create(tenant=self.tenant, code="wellness", name="Wellness Leave")
        policy = LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=leave_type,
            code="wellness-policy",
            name="Wellness Policy",
            status=LeavePolicyStatus.ACTIVE,
        )
        assignment = LeavePolicyAssignment.objects.create(tenant=self.tenant, leave_policy=policy, department=self.department, is_active=True)

        response = self.client.delete(f"/api/v1/hr-admin/leave-policy-assignments/{assignment.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(LeavePolicyAssignment.objects.filter(id=assignment.id).exists())

    def test_unused_leave_type_can_be_deleted(self):
        leave_type = LeaveType.objects.create(tenant=self.tenant, code="optional-type", name="Optional Type")

        impact_response = self.client.get(f"/api/v1/hr-admin/leave-types/{leave_type.id}/impact/")
        delete_response = self.client.delete(f"/api/v1/hr-admin/leave-types/{leave_type.id}/delete/")

        self.assertEqual(impact_response.status_code, 200)
        self.assertTrue(impact_response.json()["can_delete"])
        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(LeaveType.objects.filter(id=leave_type.id).exists())

    def test_used_leave_type_delete_is_blocked_and_deactivate_is_allowed(self):
        leave_type = LeaveType.objects.create(tenant=self.tenant, code="earned-type", name="Earned Type")
        LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=leave_type,
            code="earned-type-policy",
            name="Earned Type Policy",
            status=LeavePolicyStatus.ACTIVE,
            accrual_frequency=AccrualFrequency.YEARLY,
            annual_entitlement="20.00",
        )

        delete_response = self.client.delete(f"/api/v1/hr-admin/leave-types/{leave_type.id}/delete/")
        deactivate_response = self.client.post(f"/api/v1/hr-admin/leave-types/{leave_type.id}/deactivate/")

        self.assertEqual(delete_response.status_code, 409)
        self.assertFalse(delete_response.json()["can_delete"])
        self.assertEqual(deactivate_response.status_code, 200)
        leave_type.refresh_from_db()
        self.assertFalse(leave_type.is_active)
