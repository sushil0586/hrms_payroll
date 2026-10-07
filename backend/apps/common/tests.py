from django.test import TestCase
from rest_framework.test import APIClient

from apps.common.selectors import evaluate_saas_commercial_access
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, RolePermission, TenantMembership, User
from apps.organizations.models import Branch, BusinessUnit, Department, LegalEntity, Location
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
