import json
import tempfile
import uuid
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.employees.models import Employee
from apps.iam.models import User
from apps.payroll.models import PayGroup, PayrollPeriod
from apps.tenants.models import Tenant, TenantStatus


class PlaywrightWorkspaceCommandTests(TestCase):
    def setUp(self):
        self.seed_ref = f"test-{uuid.uuid4().hex[:8]}"
        self.tenant_code = f"pw-qa-{self.seed_ref}"
        self.output = Path(tempfile.gettempdir()) / f"{self.seed_ref}.json"

    def tearDown(self):
        tenant = Tenant.objects.filter(code=self.tenant_code).first()
        if tenant and tenant.is_sandbox:
            call_command("manage_playwright_workspace", seed_ref=self.seed_ref, cleanup=True)
        self.output.unlink(missing_ok=True)

    def test_provision_audit_and_cleanup_are_manifest_backed(self):
        call_command("manage_playwright_workspace", seed_ref=self.seed_ref, output_file=str(self.output))
        manifest = json.loads(self.output.read_text())
        tenant = Tenant.objects.get(code=self.tenant_code)
        employee = Employee.objects.get(id=manifest["credentials"]["employee"]["employee_id"])
        period = PayrollPeriod.objects.get(id=manifest["payroll"]["period_id"])
        pay_group = PayGroup.objects.get(id=manifest["payroll"]["pay_group_id"])

        self.assertTrue(tenant.is_sandbox)
        self.assertEqual(employee.tenant_id, tenant.id)
        self.assertEqual(period.calendar_id, pay_group.calendar_id)
        self.assertTrue(all(manifest["checks"].values()))
        self.assertEqual(set(manifest["credentials"]), {"employee", "hr_admin", "manager", "tenant_admin"})
        platform_admin = User.objects.get(username=manifest["platform_admin"]["username"])
        self.assertTrue(platform_admin.is_superuser)
        self.assertTrue(manifest["platform_admin"]["platform_only"])

        call_command("manage_playwright_workspace", seed_ref=self.seed_ref, audit=True, output_file=str(self.output))
        self.assertEqual(json.loads(self.output.read_text())["action"], "audit")
        call_command("manage_playwright_workspace", seed_ref=self.seed_ref, cleanup=True, output_file=str(self.output))
        self.assertFalse(Tenant.objects.filter(code=self.tenant_code).exists())
        self.assertTrue(json.loads(self.output.read_text())["verified_absent"])

    def test_cleanup_refuses_unowned_or_shared_tenant(self):
        Tenant.objects.create(code=self.tenant_code, name="Unowned", status=TenantStatus.ACTIVE)
        with self.assertRaisesMessage(CommandError, "ownership markers"):
            call_command("manage_playwright_workspace", seed_ref=self.seed_ref, cleanup=True)
        self.assertTrue(Tenant.objects.filter(code=self.tenant_code).exists())

    def test_tenant_code_must_match_guarded_namespace(self):
        with self.assertRaisesMessage(CommandError, "must be exactly"):
            call_command("manage_playwright_workspace", seed_ref=self.seed_ref, tenant_code="northstar-foods")
