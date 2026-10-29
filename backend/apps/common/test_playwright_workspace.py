import json
import tempfile
import uuid
from pathlib import Path
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from apps.documents.models import DocumentArtifact
from apps.documents.services import store_document_artifact
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
        self.assertEqual(
            set(manifest["credentials"]),
            {"employee", "hr_admin", "hr_checker", "manager", "manager_b", "tenant_admin"},
        )
        platform_admin = User.objects.get(username=manifest["platform_admin"]["username"])
        self.assertTrue(platform_admin.is_superuser)
        self.assertTrue(manifest["platform_admin"]["platform_only"])
        cleanup_admin = User.objects.get(username=manifest["platform_cleanup_admin"]["username"])
        self.assertTrue(cleanup_admin.is_superuser)
        self.assertNotEqual(cleanup_admin.pk, platform_admin.pk)
        self.assertEqual(manifest["counts"]["platform_users"], 2)

        call_command("manage_playwright_workspace", seed_ref=self.seed_ref, audit=True, output_file=str(self.output))
        self.assertEqual(json.loads(self.output.read_text())["action"], "audit")
        call_command("manage_playwright_workspace", seed_ref=self.seed_ref, cleanup=True, dry_run=True, output_file=str(self.output))
        plan = json.loads(self.output.read_text())
        self.assertEqual(plan["action"], "cleanup_dry_run")
        self.assertTrue(Tenant.objects.filter(code=self.tenant_code).exists())
        call_command(
            "manage_playwright_workspace",
            seed_ref=self.seed_ref,
            cleanup=True,
            confirm_private_file_delete=True,
            output_file=str(self.output),
        )
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

    def test_private_file_cleanup_is_dry_run_by_default_and_exact_when_confirmed(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            call_command("manage_playwright_workspace", seed_ref=self.seed_ref)
            tenant = Tenant.objects.get(code=self.tenant_code)
            employee = tenant.employees.get(employee_code="QA-EMP-001")
            artifact = store_document_artifact(
                tenant=tenant,
                employee=employee,
                uploaded_file=SimpleUploadedFile("cleanup.pdf", b"%PDF-1.4\n%%EOF", content_type="application/pdf"),
                actor_identifier="cleanup-test",
            )
            stored_path = Path(media_root) / artifact.storage_key
            self.assertTrue(stored_path.exists())

            with self.assertRaisesMessage(CommandError, "Dry run"):
                call_command("manage_playwright_workspace", seed_ref=self.seed_ref, cleanup=True)
            self.assertTrue(Tenant.objects.filter(pk=tenant.pk).exists())
            self.assertTrue(stored_path.exists())

            call_command(
                "manage_playwright_workspace",
                seed_ref=self.seed_ref,
                cleanup=True,
                confirm_private_file_delete=True,
                output_file=str(self.output),
            )
            result = json.loads(self.output.read_text())
            self.assertTrue(result["verified_absent"])
            self.assertEqual(len(result["private_file_cleanup"]["deleted"]), 1)
            self.assertEqual(result["private_file_cleanup"]["failed"], [])
            self.assertFalse(stored_path.exists())

    def test_cleanup_replays_exact_plan_after_storage_interruption(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            call_command("manage_playwright_workspace", seed_ref=self.seed_ref)
            tenant = Tenant.objects.get(code=self.tenant_code)
            artifact = store_document_artifact(
                tenant=tenant,
                employee=tenant.employees.get(employee_code="QA-EMP-001"),
                uploaded_file=SimpleUploadedFile("recovery.pdf", b"%PDF-1.4\n%%EOF", content_type="application/pdf"),
                actor_identifier="cleanup-recovery-test",
            )
            stored_path = Path(media_root) / artifact.storage_key
            call_command(
                "manage_playwright_workspace",
                seed_ref=self.seed_ref,
                cleanup=True,
                dry_run=True,
                output_file=str(self.output),
            )

            with patch("apps.common.management.commands.manage_playwright_workspace.default_storage.delete", side_effect=OSError("interrupted")):
                call_command(
                    "manage_playwright_workspace",
                    seed_ref=self.seed_ref,
                    cleanup=True,
                    confirm_private_file_delete=True,
                    output_file=str(self.output),
                )
            interrupted = json.loads(self.output.read_text())
            self.assertFalse(interrupted["verified_absent"])
            self.assertFalse(Tenant.objects.filter(code=self.tenant_code).exists())
            self.assertTrue(stored_path.exists())

            call_command(
                "manage_playwright_workspace",
                seed_ref=self.seed_ref,
                cleanup=True,
                confirm_private_file_delete=True,
                output_file=str(self.output),
            )
            recovered = json.loads(self.output.read_text())
            self.assertTrue(recovered["verified_absent"])
            self.assertEqual(len(recovered["private_file_cleanup"]["deleted"]), 1)
            self.assertFalse(stored_path.exists())
