from datetime import date
from django.utils import timezone

from django.test import TestCase
from rest_framework.test import APIClient

from apps.attendance.models import AttendancePolicy, AttendancePolicyAssignment, AttendancePolicyStatus, EmployeeShiftAssignment, Shift
from apps.common.management.commands.bootstrap_demo_workspace import Command as BootstrapDemoWorkspaceCommand
from apps.common.selectors import evaluate_saas_commercial_access
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, RolePermission, TenantMembership, User
from apps.leave_management.models import AccrualFrequency, LeaveBalance, LeavePolicy, LeavePolicyAssignment, LeavePolicyStatus, LeaveType
from apps.organizations.models import Branch, BusinessUnit, Department, LegalEntity, Location
from apps.payroll.models import (
    PayrollCalculationStatus,
    PayrollCalendar,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollOutputArtifact,
    PayrollOutputArtifactKind,
    PayrollOutputArtifactStatus,
    PayrollOutputBatch,
    PayrollOutputBatchStatus,
    PayrollPeriod,
    PayrollReviewStatus,
    PayrollRun,
    PayrollRunCalculation,
    PayrollRunReview,
    PayrollRunStatus,
)
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

    def test_demo_workspace_pending_leave_seed_dates_skip_weekend(self):
        start_date, end_date = BootstrapDemoWorkspaceCommand._next_contiguous_working_range(
            date(2026, 10, 9),
        )

        self.assertEqual(start_date, date(2026, 10, 26))
        self.assertEqual(end_date, date(2026, 10, 27))
        self.assertLessEqual(start_date.weekday(), 4)
        self.assertLessEqual(end_date.weekday(), 4)

    def test_demo_workspace_single_day_leave_seed_dates_skip_weekend(self):
        start_date, end_date = BootstrapDemoWorkspaceCommand._next_contiguous_working_range(
            date(2026, 10, 10),
            days_ahead=0,
            length=1,
        )

        self.assertEqual(start_date, date(2026, 10, 12))
        self.assertEqual(end_date, date(2026, 10, 12))
        self.assertLessEqual(start_date.weekday(), 4)
        self.assertLessEqual(end_date.weekday(), 4)

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
        self.assertEqual(payload["contract_ref"], "schedule_spine.contract.v1")
        self.assertEqual(payload["resolver_ref"], "attendance.resolve_employee_work_schedule.v1")
        self.assertEqual(payload["weekly_off_count"], 2)
        self.assertEqual(payload["working_day_count"], 1)
        self.assertEqual([day["day_type"] for day in payload["days"]], ["weekly_off", "weekly_off", "working_day"])
        self.assertEqual(payload["days"][0]["weekly_off_source"], "shift_assignment")
        self.assertEqual(payload["days"][0]["contract_ref"], "schedule_spine.contract.v1")
        self.assertFalse(payload["days"][0]["is_payable_schedule_day"])
        self.assertEqual(payload["days"][0]["payroll_impact"]["non_working_reason"], "weekly_off")
        self.assertEqual(payload["days"][2]["shift_name"], "Retail Shift")

    def test_shift_roster_template_normalizes_guided_enterprise_pattern(self):
        role = self.membership.membership_roles.get(role__code="hr-admin").role
        RolePermission.objects.create(
            role=role,
            permission_key="attendance.policies.manage",
            description="Attendance policy write permission.",
        )
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="five-two-shift",
            name="Five Two Shift",
            start_time="09:00",
            end_time="17:00",
            working_hours="8.00",
            weekly_off_days=[],
        )

        response = self.client.post(
            "/api/v1/hr-admin/shift-roster-templates/",
            {
                "code": "five-two-template",
                "name": "Five Two Template",
                "status": "published",
                "shift_id": str(shift.id),
                "assignment_kind": "weekly_rotation",
                "config_snapshot": {
                    "rotation": {
                        "pattern_type": "five_on_two_off",
                        "anchor_date": "2026-10-01",
                        "entries": [],
                    }
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        rotation = response.json()["config_snapshot"]["rotation"]
        self.assertEqual(rotation["pattern_type"], "five_on_two_off")
        self.assertEqual(
            [(item["entry_kind"], item["shift_id"], item["span_days"]) for item in rotation["entries"]],
            [("work", str(shift.id), 5), ("off", None, 2)],
        )

    def test_payroll_input_snapshot_carries_schedule_spine_counts_from_employee_roster(self):
        role = self.membership.membership_roles.get(role__code="hr-admin").role
        RolePermission.objects.create(
            role=role,
            permission_key="payroll.inputs.manage",
            description="Payroll input snapshot write permission.",
        )
        RolePermission.objects.create(
            role=role,
            permission_key="payroll.inputs.view",
            description="Payroll input snapshot read permission.",
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
        self.assertEqual(attendance_spine["contract_ref"], "schedule_spine.contract.v1")
        self.assertEqual(attendance_spine["resolver_ref"], "attendance.resolve_employee_work_schedule.v1")
        self.assertEqual(attendance_spine["working_days"], 2)
        self.assertEqual(attendance_spine["weekly_off_days"], 2)
        self.assertEqual(attendance_spine["non_working_days"], 2)
        self.assertEqual(leave_spine["working_days"], 2)
        self.assertEqual(leave_spine["contract_ref"], "schedule_spine.contract.v1")
        self.assertEqual(leave_spine["resolver_ref"], "attendance.resolve_employee_work_schedule.v1")
        self.assertTrue(attendance_spine["days"][0]["is_payable_schedule_day"])
        self.assertEqual(attendance_spine["days"][0]["payroll_day_weight"], "1.00")
        self.assertEqual(attendance_spine["days"][2]["payroll_impact"]["non_working_reason"], "weekly_off")
        self.assertEqual(
            [(item["date"], item["day_type"], item["shift_name"], item["weekly_off_source"]) for item in attendance_spine["days"]],
            [
                ("2026-10-31", "working_day", "Payroll Roster Shift", "shift_assignment"),
                ("2026-11-01", "working_day", "Payroll Roster Shift", "shift_assignment"),
                ("2026-11-02", "weekly_off", "Payroll Roster Shift", "shift_assignment"),
                ("2026-11-03", "weekly_off", "Payroll Roster Shift", "shift_assignment"),
            ],
        )

    def test_payroll_input_snapshot_payload_flags_attendance_schedule_mismatch(self):
        role = self.membership.membership_roles.get(role__code="hr-admin").role
        RolePermission.objects.create(
            role=role,
            permission_key="payroll.inputs.manage",
            description="Payroll input snapshot write permission.",
        )
        employee = Employee.objects.get(employee_code="EMP-0001")
        shift = Shift.objects.create(
            tenant=self.tenant,
            code="mismatch-shift",
            name="Mismatch Shift",
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
            code="mismatch-payroll",
            name="Mismatch Payroll",
            period_start_day=1,
        )
        period = PayrollPeriod.objects.create(
            tenant=self.tenant,
            calendar=calendar,
            code="dec-2026",
            name="December 2026",
            start_date=date(2026, 10, 31),
            end_date=date(2026, 11, 3),
            pay_date=date(2026, 11, 30),
        )
        payroll_run = PayrollRun.objects.create(
            tenant=self.tenant,
            period=period,
            code="dec-2026-run",
            name="December 2026 Run",
        )

        response = self.client.post(
            "/api/v1/hr-admin/payroll-input-snapshots/",
            {
                "payroll_run_id": str(payroll_run.id),
                "employee_id": str(employee.id),
                "snapshot_status": "warning",
                "attendance_snapshot": {
                    "present_days": "1.00",
                    "lop_days": "0.00",
                },
                "leave_snapshot": {
                    "approved_units": "0.00",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        summary = response.json()["reconciliation_summary"]
        self.assertEqual(summary["status"], "warning")
        self.assertEqual(summary["risk"], "Medium")
        self.assertIn("missing_lop_or_regularization", [item["code"] for item in summary["findings"]])
        self.assertIn("unexplained_working_day_gap", [item["code"] for item in summary["findings"]])
        self.assertEqual(summary["metrics"]["schedule_working_days"], "2")
        self.assertEqual(summary["metrics"]["attendance_present_days"], "1.00")

        from apps.common.api_views import build_hr_admin_payroll_run_payload

        run_summary = build_hr_admin_payroll_run_payload(payroll_run)["reconciliation_summary"]
        self.assertEqual(run_summary["status"], "warning")
        self.assertEqual(run_summary["risk"], "Medium")
        self.assertEqual(run_summary["warning_snapshot_count"], 1)
        self.assertEqual(run_summary["finding_count"], 2)

    def test_payroll_input_lock_blocks_high_reconciliation_findings_even_when_snapshot_not_blocked(self):
        role = self.membership.membership_roles.get(role__code="hr-admin").role
        RolePermission.objects.create(
            role=role,
            permission_key="payroll.lock",
            description="Payroll lock permission.",
        )
        employee = Employee.objects.get(employee_code="EMP-0001")
        calendar = PayrollCalendar.objects.create(
            tenant=self.tenant,
            code="lock-gate-payroll",
            name="Lock Gate Payroll",
            period_start_day=1,
        )
        period = PayrollPeriod.objects.create(
            tenant=self.tenant,
            calendar=calendar,
            code="jan-2027",
            name="January 2027",
            start_date=date(2027, 1, 1),
            end_date=date(2027, 1, 31),
            pay_date=date(2027, 1, 31),
        )
        payroll_run = PayrollRun.objects.create(
            tenant=self.tenant,
            period=period,
            code="jan-2027-run",
            name="January 2027 Run",
        )
        PayrollInputSnapshot.objects.create(
            tenant=self.tenant,
            payroll_run=payroll_run,
            employee=employee,
            snapshot_status=PayrollInputSnapshotStatus.READY,
            attendance_snapshot={
                "schedule_spine": {"working_days": "22"},
                "present_days": "23.00",
            },
            leave_snapshot={},
            validation_snapshot={},
        )

        response = self.client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/lock-inputs/", {}, format="json")

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload["lock_gate"]["status"], "blocked")
        self.assertEqual(payload["reconciliation_blocker_count"], 1)
        self.assertEqual(payload["lock_gate"]["high_findings"][0]["code"], "attendance_exceeds_schedule")
        payroll_run.refresh_from_db()
        self.assertEqual(payroll_run.status, PayrollRunStatus.DRAFT)

    def test_payroll_adjustment_setup_surfaces_locked_snapshot_post_lock_impacts(self):
        employee = Employee.objects.get(employee_code="EMP-0001")
        calendar = PayrollCalendar.objects.create(
            tenant=self.tenant,
            code="post-lock-payroll",
            name="Post Lock Payroll",
            period_start_day=1,
        )
        period = PayrollPeriod.objects.create(
            tenant=self.tenant,
            calendar=calendar,
            code="feb-2027",
            name="February 2027",
            start_date=date(2027, 2, 1),
            end_date=date(2027, 2, 28),
            pay_date=date(2027, 2, 28),
        )
        payroll_run = PayrollRun.objects.create(
            tenant=self.tenant,
            period=period,
            code="feb-2027-run",
            name="February 2027 Run",
            status=PayrollRunStatus.INPUTS_LOCKED,
        )
        snapshot = PayrollInputSnapshot.objects.create(
            tenant=self.tenant,
            payroll_run=payroll_run,
            employee=employee,
            snapshot_status=PayrollInputSnapshotStatus.LOCKED,
            period_start=period.start_date,
            period_end=period.end_date,
            attendance_snapshot={"present_days": "20.00"},
            leave_snapshot={},
            validation_snapshot={},
            source_hash="locked-source-hash",
        )

        response = self.client.get("/api/v1/hr-admin/payroll-adjustment-setup/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["summary"]["post_lock_impact_count"], 1)
        impact = payload["post_lock_impacts"][0]
        self.assertEqual(impact["snapshot_id"], str(snapshot.id))
        self.assertEqual(impact["employee_code"], "EMP-0001")
        self.assertEqual(impact["adjustment_source_ref"], f"post-lock:{snapshot.id}:2027-02-01:2027-02-28")

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

    def test_duplicate_leave_policy_create_returns_field_validation_error(self):
        role = self.membership.membership_roles.get(role__code="hr-admin").role
        RolePermission.objects.create(
            role=role,
            permission_key="leave.policies.manage",
            description="Leave policy write permission.",
        )
        leave_type = LeaveType.objects.create(tenant=self.tenant, code="dup-leave", name="Duplicate Leave")
        LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=leave_type,
            code="duplicate-policy",
            name="Duplicate Policy",
            status=LeavePolicyStatus.ACTIVE,
        )

        response = self.client.post(
            "/api/v1/hr-admin/leave-policies/",
            {
                "leave_type_id": str(leave_type.id),
                "code": "duplicate-policy",
                "name": "Duplicate Policy Copy",
                "status": LeavePolicyStatus.ACTIVE,
                "effective_from": "2027-01-01",
                "accrual_frequency": AccrualFrequency.YEARLY,
                "annual_entitlement": "12.00",
                "max_carry_forward": "0.00",
                "max_consecutive_days": "5.00",
                "min_days_per_request": "1.00",
                "notice_days_required": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "A leave policy with this code already exists.")
        self.assertEqual(LeavePolicy.objects.filter(tenant=self.tenant, code="duplicate-policy").count(), 1)

    def test_payroll_output_setup_can_filter_register_artifact_beyond_first_page(self):
        role = self.membership.membership_roles.get(role__code="hr-admin").role
        RolePermission.objects.create(
            role=role,
            permission_key="payroll.outputs.view",
            description="Payroll output view permission.",
        )
        now = timezone.now()
        calendar = PayrollCalendar.objects.create(
            tenant=self.tenant,
            code="monthly",
            name="Monthly Payroll",
            timezone="Asia/Kolkata",
        )
        period = PayrollPeriod.objects.create(
            tenant=self.tenant,
            calendar=calendar,
            code="sep-2026",
            name="September 2026",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 30),
            pay_date=date(2026, 10, 5),
        )
        run = PayrollRun.objects.create(
            tenant=self.tenant,
            period=period,
            code="sep-2026-output",
            name="September 2026 Output",
            status=PayrollRunStatus.LOCKED,
            locked_at=now,
            final_locked_at=now,
        )
        calculation = PayrollRunCalculation.objects.create(
            tenant=self.tenant,
            payroll_run=run,
            status=PayrollCalculationStatus.COMPLETED,
            calculated_at=now,
        )
        review = PayrollRunReview.objects.create(
            tenant=self.tenant,
            payroll_run=run,
            calculation=calculation,
            status=PayrollReviewStatus.LOCKED,
            locked_at=now,
        )
        batch = PayrollOutputBatch.objects.create(
            tenant=self.tenant,
            payroll_run=run,
            review=review,
            status=PayrollOutputBatchStatus.PUBLISHED,
            generated_at=now,
            published_at=now,
            totals_snapshot={"gross_earnings": "100000.00", "employee_deductions": "10000.00", "net_pay": "90000.00"},
            artifact_summary_snapshot={"artifact_count": 101, "payslip_count": 100, "register_count": 1},
        )
        employee = Employee.objects.get(employee_code="EMP-0001")
        for index in range(100):
            PayrollOutputArtifact.objects.create(
                tenant=self.tenant,
                output_batch=batch,
                payroll_run=run,
                review=review,
                employee=employee,
                kind=PayrollOutputArtifactKind.PAYSLIP,
                status=PayrollOutputArtifactStatus.PUBLISHED,
                artifact_key=f"payslip:{index:03d}",
                title=f"Payslip {index:03d}",
                file_payload=f"employee_code,net_pay\nEMP-0001,{90000 + index}\n",
                published_at=now,
            )
        PayrollOutputArtifact.objects.create(
            tenant=self.tenant,
            output_batch=batch,
            payroll_run=run,
            review=review,
            kind=PayrollOutputArtifactKind.REGISTER,
            status=PayrollOutputArtifactStatus.PUBLISHED,
            artifact_key="register:sep-2026-output",
            title="Payroll Register - September 2026 Output",
            file_payload="employee_code,net_pay\nEMP-0001,90000\n",
            published_at=now,
        )
        older_batch = PayrollOutputBatch.objects.create(
            tenant=self.tenant,
            payroll_run=run,
            review=review,
            status=PayrollOutputBatchStatus.PUBLISHED,
            output_profile_ref="payroll.output.register.archive.v1",
            generated_at=now,
            published_at=now,
            totals_snapshot={"gross_earnings": "80000.00", "employee_deductions": "8000.00", "net_pay": "72000.00"},
            artifact_summary_snapshot={"artifact_count": 1, "payslip_count": 0, "register_count": 1},
        )
        PayrollOutputBatch.objects.filter(id=older_batch.id).update(created_at=now - timezone.timedelta(days=1))
        PayrollOutputArtifact.objects.create(
            tenant=self.tenant,
            output_batch=older_batch,
            payroll_run=run,
            review=review,
            kind=PayrollOutputArtifactKind.REGISTER,
            status=PayrollOutputArtifactStatus.PUBLISHED,
            artifact_key="register:aug-2026-output",
            title="Payroll Register - August 2026 Output",
            file_payload="employee_code,net_pay\nEMP-0001,72000\n",
            published_at=now,
        )

        default_response = self.client.get("/api/v1/hr-admin/payroll-output-setup/")
        filtered_response = self.client.get("/api/v1/hr-admin/payroll-output-setup/?artifact_kind=register&artifact_page_size=100")

        self.assertEqual(default_response.status_code, 200)
        self.assertEqual(filtered_response.status_code, 200)
        self.assertFalse(any(item["kind"] == PayrollOutputArtifactKind.REGISTER for item in default_response.json()["artifacts"]))
        self.assertEqual(filtered_response.json()["summary"]["register_count"], 2)
        self.assertEqual([item["kind"] for item in filtered_response.json()["artifacts"]], [PayrollOutputArtifactKind.REGISTER, PayrollOutputArtifactKind.REGISTER])
        self.assertEqual(
            {item["title"] for item in filtered_response.json()["artifacts"]},
            {"Payroll Register - September 2026 Output", "Payroll Register - August 2026 Output"},
        )
        self.assertIn(str(older_batch.id), {item["id"] for item in filtered_response.json()["output_batches"]})

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
