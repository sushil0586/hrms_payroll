"""ESS-1 self projection and presentation safety against the real database."""

from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from apps.employees.models import Employee, EmployeeBankAccount, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership, User
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus


class Ess1SelfProfileContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.actors = []
        for index in range(2):
            tenant = Tenant.objects.create(code=f"ess1-contract-{index}", name=f"ESS1 Synthetic {index}", status=TenantStatus.ACTIVE, subscription_plan=SubscriptionPlan.ENTERPRISE)
            for person in range(2):
                user = User.objects.create_user(username=f"ess1-{index}-{person}", email=f"ess1-{index}-{person}@example.test", password="Synthetic-Test-Only-123")
                membership = TenantMembership.objects.create(tenant=tenant, user=user, status=MembershipStatus.ACTIVE, is_default=True)
                role, _ = Role.objects.get_or_create(tenant=tenant, code="employee", defaults={"name": "Employee", "is_active": True})
                MembershipRole.objects.create(membership=membership, role=role, is_primary=True)
                employee = Employee.objects.create(tenant=tenant, membership=membership, employee_code=f"ESS1-{index}-{person}", first_name=f"Synthetic {index} {person}", personal_email=f"person-{index}-{person}@example.test", phone_number=f"90000000{index}{person}", date_of_birth=date(1990, 1, 1), employment_status=EmploymentStatus.ACTIVE)
                EmployeeBankAccount.objects.create(employee=employee, account_holder_name=employee.first_name, bank_name="Synthetic Bank", account_number=f"PRIVATE-ACCOUNT-{index}-{person}")
                cls.actors.append((user, employee))

    def setUp(self):
        self.client = APIClient()

    def test_anonymous_profile_and_dashboard_are_denied(self):
        for path in ["/api/v1/me/profile/", "/api/v1/me/dashboard/"]:
            self.assertIn(self.client.get(path).status_code, [401, 403])

    def test_projection_is_allowlisted_and_cannot_be_retargeted(self):
        user, own = self.actors[0]
        self.client.force_authenticate(user)
        expected = {"id", "employee_code", "full_name", "preferred_name", "work_email", "personal_email", "phone_number", "employment_status", "date_of_joining", "department", "designation", "legal_entity", "branch", "location", "reporting_manager"}
        for _, other in self.actors[1:]:
            response = self.client.get("/api/v1/me/profile/", {"employee_id": str(other.id), "tenant_id": str(other.tenant_id)})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(set(response.json()), expected)
            self.assertEqual(response.json()["id"], str(own.id))
            self.assertNotIn(other.personal_email, response.content.decode())
            self.assertNotIn("PRIVATE-ACCOUNT", response.content.decode())
            self.assertNotIn("date_of_birth", response.json())

    def test_self_profile_is_read_only_and_preserves_employee_and_bank(self):
        user, employee = self.actors[0]
        self.client.force_authenticate(user)
        for method in [self.client.patch, self.client.post, self.client.put, self.client.delete]:
            result = method("/api/v1/me/profile/", {"first_name": "Unauthorized", "account_number": "changed"}, format="json")
            self.assertEqual(result.status_code, 405)
        employee.refresh_from_db()
        self.assertEqual(employee.first_name, "Synthetic 0 0")
        self.assertEqual(employee.bank_accounts.get().account_number, "PRIVATE-ACCOUNT-0-0")

    def test_employee_cannot_read_privileged_hr_manager_or_platform_surfaces(self):
        self.client.force_authenticate(self.actors[0][0])
        for path in ["/api/v1/hr-admin/employees/", "/api/v1/manager/leave-requests/pending/", "/api/v1/platform/tenants/"]:
            response = self.client.get(path)
            if path.startswith("/api/v1/manager/") and response.status_code == 200:
                self.assertEqual(response.json()["items"], [])
            else:
                self.assertIn(response.status_code, [403, 404])

    def test_missing_employee_context_fails_without_placeholder(self):
        user = User.objects.create_user(username="ess1-unmapped", email="ess1-unmapped@example.test", password="Synthetic-Test-Only-123")
        self.client.force_authenticate(user)
        for path in ["/api/v1/me/profile/", "/api/v1/me/dashboard/"]:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json(), {"detail": "No active employee context found."})

    def test_dashboard_profile_matches_self_read_without_mutation(self):
        self.client.force_authenticate(self.actors[0][0])
        before = list(Employee.objects.values())
        profile = self.client.get("/api/v1/me/profile/")
        dashboard = self.client.get("/api/v1/me/dashboard/")
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.json()["profile"], profile.json())
        self.assertEqual(list(Employee.objects.values()), before)

    def test_suspended_or_revoked_membership_loses_self_context(self):
        user, employee = self.actors[0]
        self.client.force_authenticate(user)
        for membership_status in [MembershipStatus.SUSPENDED, MembershipStatus.REVOKED]:
            TenantMembership.objects.filter(id=employee.membership_id).update(status=membership_status)
            for path in ["/api/v1/me/profile/", "/api/v1/me/dashboard/"]:
                result = self.client.get(path)
                self.assertEqual(result.status_code, 404)
                self.assertNotIn(employee.personal_email, result.content.decode())
