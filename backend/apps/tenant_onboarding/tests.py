from types import SimpleNamespace

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from apps.common.api_views import (
    get_hr_admin_payroll_provider_connection_setup_payload_for_tenant,
    save_hr_admin_payroll_provider_connection,
)
from apps.attendance.models import AttendancePolicy, AttendancePolicyAssignment, Holiday, HolidayCalendar, Shift
from apps.documents.models import DocumentCategory, DocumentRequirementRule
from apps.iam.models import Role, User
from apps.leave_management.models import LeavePolicy, LeavePolicyAssignment, LeaveType
from apps.notifications.models import NotificationEventDefinition, NotificationTemplate
from apps.organizations.models import Branch, Department, EmploymentType, Grade, LegalEntity, Location
from apps.payroll.models import (
    EmployeeSalaryAssignment,
    PayGroup,
    PayGroupAssignment,
    PayrollCalendar,
    PayrollPeriod,
    PayrollProviderCertificationRun,
    PayrollProviderCertificationRunStatus,
    PayrollProviderCertificationStatus,
    PayrollProviderConnection,
    PayrollProviderConnectionStatus,
    PayrollProviderDelivery,
    PayrollProviderJob,
    PayrollProviderLaunchRehearsal,
    PayrollProviderSchemaMappingPack,
    PayrollProviderSchemaMappingPackStatus,
    PayrollRun,
    PayrollStatutoryComponent,
    PayrollStatutoryEmployerRegistration,
    PayrollStatutoryFilingCalendar,
    PayrollStatutoryPack,
    PayrollStatutorySlab,
    SalaryComponent,
    SalaryStructure,
    SalaryStructureComponent,
    SalaryStructureVersion,
)
from apps.payroll.services import (
    PayrollProviderConnectionError,
    PayrollProviderSchemaMappingPackError,
    _default_provider_schema_mapping_transform_rules,
    _default_provider_schema_mapping_validation_rules,
    activate_payroll_provider_schema_mapping_pack_for_actor,
    record_payroll_provider_connection_certification,
    run_payroll_provider_connection_certification,
    save_payroll_provider_schema_mapping_pack_for_actor,
)
from apps.tenant_onboarding.models import (
    ChecklistStatus,
    LaunchReadinessStatus,
    TenantLaunchItemStatus,
    TenantLaunchRun,
    TenantLaunchRunStatus,
    TenantLaunchRunType,
    TenantOnboardingChecklistItem,
)
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus
from apps.workflows.models import WorkflowStep, WorkflowTemplate, WorkflowTemplateAssignment


class PlatformLaunchBlueprintApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.platform_admin = User.objects.create_superuser(
            username="platform-admin",
            email="platform-admin@example.com",
            password="test-pass",
        )
        self.tenant = Tenant.objects.create(
            code="acme",
            name="Acme India",
            legal_name="Acme India Pvt Ltd",
            status=TenantStatus.DRAFT,
            subscription_plan=SubscriptionPlan.STARTER,
            country_code="IN",
            timezone="Asia/Kolkata",
        )

    def _preview_payload(self):
        return {
            "blueprint_ref": "india-standard-sme",
            "input_payload": {
                "legal_name": "Acme India Pvt Ltd",
                "registered_address": "Bengaluru",
                "primary_contact": "admin@example.com",
                "tenant_admin_contact": "admin@example.com",
                "legal_entity": "Acme India Pvt Ltd",
                "default_branch": "Bengaluru",
                "default_department": "Operations",
                "work_week": "mon_fri",
                "holiday_region": "KA",
            },
            "idempotency_key": "preview-acme-standard",
        }

    def _growth_preview_payload(self):
        payload = self._preview_payload()
        payload["idempotency_key"] = "preview-acme-growth-standard"
        payload["input_payload"] = {
            **payload["input_payload"],
            "pay_frequency": "monthly",
            "salary_structure_style": "simple_ctc",
            "financial_year": "2026-2027",
            "provider_strategy": "none",
        }
        return payload

    def test_platform_admin_can_list_india_launch_blueprints(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.get("/api/v1/platform/launch-blueprints/?country_code=IN&subscription_plan=starter")

        self.assertEqual(response.status_code, 200)
        blueprints = response.json()
        refs = {item["ref"] for item in blueprints}
        self.assertIn("india-standard-sme", refs)
        self.assertIn("india-hr-only", refs)
        standard = next(item for item in blueprints if item["ref"] == "india-standard-sme")
        input_keys = {item["key"] for item in standard["input_schema"]}
        self.assertIn("legal_name", input_keys)
        self.assertIn("tenant_admin_contact", input_keys)
        self.assertEqual(standard["compatibility"]["safe_apply_module_count"], 7)
        self.assertEqual(standard["compatibility"]["plan_gated_module_count"], 2)
        payroll_module = next(item for item in standard["modules"] if item["ref"] == "payroll_defaults")
        self.assertFalse(payroll_module["plan_allowed"])
        self.assertEqual(payroll_module["gating_reason"], "Requires Growth plan.")

    def test_launch_preview_records_audit_run_and_subscription_skips(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(body["preview"]["can_apply"])
        self.assertEqual(
            set(body["preview"]["safe_apply_modules"]),
            {"documents", "launch_checklist", "leave_attendance", "notifications", "org_masters", "roles_users", "workflows"},
        )
        self.assertEqual(
            set(body["preview"]["plan_gated_modules"]),
            {"payroll_defaults", "provider_placeholders"},
        )
        self.assertNotIn("org_masters", body["preview"]["uncertified_modules"])
        skipped_refs = {item["ref"] for item in body["preview"]["skipped_modules"]}
        self.assertIn("payroll_defaults", skipped_refs)
        skipped_payroll = next(item for item in body["preview"]["skipped_modules"] if item["ref"] == "payroll_defaults")
        self.assertFalse(skipped_payroll["plan_allowed"])
        self.assertFalse(skipped_payroll["apply_allowed"])
        self.assertEqual(body["launch_run"]["status"], TenantLaunchRunStatus.SUCCEEDED)
        item_statuses = {item["item_key"]: item["status"] for item in body["launch_run"]["seeded_items"]}
        self.assertEqual(item_statuses["tenant_identity"], TenantLaunchItemStatus.PLANNED)
        self.assertEqual(item_statuses["payroll_defaults"], TenantLaunchItemStatus.SKIPPED)

        self.tenant.onboarding_record.refresh_from_db()
        self.assertEqual(self.tenant.onboarding_record.launch_blueprint_ref, "india-standard-sme")
        self.assertEqual(self.tenant.onboarding_record.launch_readiness_status, LaunchReadinessStatus.CONFIGURED)
        self.assertEqual(TenantLaunchRun.objects.filter(tenant=self.tenant).count(), 1)
        self.assertEqual(TenantLaunchRun.objects.get(tenant=self.tenant).seeded_items.count(), 10)

    def test_growth_launch_apply_can_seed_payroll_defaults_without_runtime_payroll(self):
        self.client.force_authenticate(self.platform_admin)
        self.tenant.subscription_plan = SubscriptionPlan.GROWTH
        self.tenant.save(update_fields=["subscription_plan", "updated_at"])

        preview_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._growth_preview_payload(),
            format="json",
        )

        self.assertEqual(preview_response.status_code, 201)
        preview_body = preview_response.json()
        self.assertTrue(preview_body["preview"]["can_apply"])
        self.assertIn("payroll_defaults", preview_body["preview"]["safe_apply_modules"])
        self.assertIn("provider_placeholders", preview_body["preview"]["safe_apply_modules"])
        self.assertEqual(preview_body["preview"]["plan_gated_modules"], [])

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"requested_modules": ["payroll_defaults"], "idempotency_key": "apply-growth-payroll-defaults"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], TenantLaunchRunStatus.SUCCEEDED)
        self.assertEqual(body["result_payload"]["applied_modules"], ["payroll_defaults"])
        result = body["result_payload"]["results"][0]
        self.assertEqual(result["module_ref"], "payroll_defaults")
        self.assertIn("statutory_registration_numbers_not_seeded", result["skipped"])
        self.assertIn("provider_credentials_not_seeded", result["skipped"])

        self.assertTrue(PayrollCalendar.objects.filter(tenant=self.tenant, code="india-monthly-payroll").exists())
        self.assertTrue(PayGroup.objects.filter(tenant=self.tenant, code="default-pay-group").exists())
        self.assertEqual(SalaryComponent.objects.filter(tenant=self.tenant).count(), 11)
        self.assertTrue(SalaryComponent.objects.filter(tenant=self.tenant, code="basic").exists())
        self.assertTrue(SalaryStructure.objects.filter(tenant=self.tenant, code="standard-ctc-structure").exists())
        self.assertEqual(SalaryStructureVersion.objects.filter(tenant=self.tenant).count(), 1)
        self.assertEqual(SalaryStructureComponent.objects.filter(tenant=self.tenant).count(), 11)
        self.assertTrue(
            PayrollStatutoryPack.objects.filter(tenant=self.tenant, code="india-default-statutory-pack").exists()
        )
        self.assertEqual(PayrollStatutoryComponent.objects.filter(tenant=self.tenant).count(), 6)

        self.assertEqual(PayrollPeriod.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayGroupAssignment.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(EmployeeSalaryAssignment.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayrollStatutorySlab.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayrollStatutoryEmployerRegistration.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayrollStatutoryFilingCalendar.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayrollRun.objects.filter(tenant=self.tenant).count(), 0)

    def test_growth_launch_apply_can_seed_blocked_provider_placeholders(self):
        self.client.force_authenticate(self.platform_admin)
        self.tenant.subscription_plan = SubscriptionPlan.GROWTH
        self.tenant.save(update_fields=["subscription_plan", "updated_at"])
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._growth_preview_payload(),
            format="json",
        )

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"requested_modules": ["provider_placeholders"], "idempotency_key": "apply-growth-provider-placeholders"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], TenantLaunchRunStatus.SUCCEEDED)
        self.assertEqual(body["result_payload"]["applied_modules"], ["provider_placeholders"])
        result = body["result_payload"]["results"][0]
        self.assertEqual(result["module_ref"], "provider_placeholders")
        self.assertIn("real_provider_credentials_not_seeded", result["skipped"])
        self.assertIn("live_provider_submission_disabled", result["skipped"])

        self.assertEqual(PayrollProviderConnection.objects.filter(tenant=self.tenant).count(), 3)
        self.assertEqual(
            PayrollProviderConnection.objects.filter(
                tenant=self.tenant,
                status=PayrollProviderConnectionStatus.BLOCKED,
                credential_ref="",
            ).count(),
            3,
        )
        bank_connection = PayrollProviderConnection.objects.get(
            tenant=self.tenant,
            provider_ref="payroll.provider.bank.placeholder.v1",
        )
        self.assertFalse(bank_connection.readiness_snapshot["active_allowed"])
        self.assertIn("credential_reference_configured", bank_connection.readiness_snapshot["blocking_gate_refs"])
        self.assertFalse(bank_connection.config_snapshot["live_delivery_enabled"])

        self.assertEqual(PayrollProviderSchemaMappingPack.objects.filter(tenant=self.tenant).count(), 3)
        self.assertEqual(
            PayrollProviderSchemaMappingPack.objects.filter(
                tenant=self.tenant,
                status=PayrollProviderSchemaMappingPackStatus.DRAFT,
                enforcement_mode="disabled",
            ).count(),
            3,
        )
        self.assertEqual(PayrollProviderCertificationRun.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayrollProviderJob.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayrollProviderDelivery.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayrollProviderLaunchRehearsal.objects.filter(tenant=self.tenant).count(), 0)

        setup_payload = get_hr_admin_payroll_provider_connection_setup_payload_for_tenant(self.tenant)
        summary = setup_payload["summary"]
        self.assertEqual(summary["connection_count"], 3)
        self.assertEqual(summary["blocked_connection_count"], 3)
        self.assertEqual(summary["sandbox_ready_connection_count"], 0)
        self.assertEqual(summary["active_connection_count"], 0)
        self.assertEqual(summary["certified_connection_count"], 0)
        self.assertEqual(summary["active_allowed_count"], 0)
        self.assertEqual(summary["schema_mapping_pack_count"], 3)
        self.assertEqual(summary["draft_schema_mapping_pack_count"], 3)
        self.assertEqual(summary["active_schema_mapping_pack_count"], 0)
        self.assertEqual(summary["certification_run_count"], 0)
        self.assertEqual(summary["launch_rehearsal_status"], "blocked")
        self.assertEqual(summary["launch_rehearsal_ready_lane_count"], 0)
        self.assertEqual(summary["launch_rehearsal_blocked_lane_count"], 3)

        connection_payloads = setup_payload["connections"]
        self.assertEqual({item["provider_kind"] for item in connection_payloads}, {"bank", "accounting", "statutory"})
        for connection_payload in connection_payloads:
            self.assertEqual(connection_payload["status"], PayrollProviderConnectionStatus.BLOCKED)
            self.assertEqual(connection_payload["credential_ref"], "")
            self.assertEqual(connection_payload["adapter_ref"], "")
            self.assertEqual(connection_payload["sandbox_adapter_ref"], "")
            self.assertFalse(connection_payload["readiness_snapshot"]["active_allowed"])
            self.assertIn("credential_reference_configured", connection_payload["readiness_snapshot"]["blocking_gate_refs"])
            self.assertTrue(connection_payload["config_snapshot"]["placeholder"])
            self.assertFalse(connection_payload["config_snapshot"]["live_delivery_enabled"])
            self.assertTrue(connection_payload["config_snapshot"]["requires_real_credentials"])
            self.assertTrue(connection_payload["config_snapshot"]["requires_provider_certification"])

        mapping_payloads = setup_payload["schema_mapping_packs"]
        self.assertEqual(len(mapping_payloads), 3)
        for mapping_payload in mapping_payloads:
            self.assertEqual(mapping_payload["status"], PayrollProviderSchemaMappingPackStatus.DRAFT)
            self.assertEqual(mapping_payload["enforcement_mode"], "disabled")
            self.assertEqual(mapping_payload["transform_rules"], [])
            self.assertTrue(mapping_payload["evidence_snapshot"]["placeholder"])
            self.assertTrue(mapping_payload["evidence_snapshot"]["activation_required"])

        self.assertEqual(PayrollProviderConnection.objects.filter(tenant=self.tenant).count(), 3)
        self.assertEqual(PayrollProviderSchemaMappingPack.objects.filter(tenant=self.tenant).count(), 3)

    def test_growth_provider_placeholders_cannot_go_live_without_real_setup(self):
        self.client.force_authenticate(self.platform_admin)
        self.tenant.subscription_plan = SubscriptionPlan.GROWTH
        self.tenant.save(update_fields=["subscription_plan", "updated_at"])
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._growth_preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"requested_modules": ["provider_placeholders"], "idempotency_key": "apply-growth-provider-placeholders-negative"},
            format="json",
        )

        bank_connection = PayrollProviderConnection.objects.get(
            tenant=self.tenant,
            provider_ref="payroll.provider.bank.placeholder.v1",
        )

        with self.assertRaisesMessage(PayrollProviderConnectionError, "credential_reference_configured"):
            record_payroll_provider_connection_certification(
                bank_connection,
                certification_status=PayrollProviderCertificationStatus.PASSED,
                evidence_snapshot={"manual_override": True},
                tested_by=self.platform_admin,
            )
        bank_connection.refresh_from_db()
        self.assertEqual(bank_connection.status, PayrollProviderConnectionStatus.BLOCKED)
        self.assertEqual(bank_connection.certification_status, PayrollProviderCertificationStatus.NOT_STARTED)

        certification_run = run_payroll_provider_connection_certification(
            bank_connection,
            requested_by=self.platform_admin,
            executed_by=self.platform_admin,
        )
        self.assertEqual(certification_run.status, PayrollProviderCertificationRunStatus.FAILED)
        self.assertGreater(certification_run.blocker_count, 0)
        self.assertIn("credential_reference_configured", certification_run.evidence_snapshot["blocking_gate_refs"])
        self.assertIn("sandbox_adapter_required", certification_run.evidence_snapshot["blocking_gate_refs"])
        bank_connection.refresh_from_db()
        self.assertEqual(bank_connection.status, PayrollProviderConnectionStatus.BLOCKED)
        self.assertEqual(bank_connection.certification_status, PayrollProviderCertificationStatus.FAILED)

        actor = SimpleNamespace(tenant=self.tenant, tenant_id=self.tenant.id, user=self.platform_admin)
        mapping_pack = PayrollProviderSchemaMappingPack.objects.get(
            tenant=self.tenant,
            provider_ref="payroll.provider.bank.placeholder.v1",
        )
        with self.assertRaisesMessage(PayrollProviderSchemaMappingPackError, "Active mapping packs require"):
            activate_payroll_provider_schema_mapping_pack_for_actor(
                actor,
                mapping_pack,
                approval_snapshot={"approval_reason": "negative certification"},
            )
        mapping_pack.refresh_from_db()
        self.assertEqual(mapping_pack.status, PayrollProviderSchemaMappingPackStatus.DRAFT)
        self.assertEqual(mapping_pack.transform_rules, [])

        with self.assertRaisesMessage(DjangoValidationError, "Active provider connections require"):
            save_hr_admin_payroll_provider_connection(
                actor,
                {"status": PayrollProviderConnectionStatus.ACTIVE},
                item=bank_connection,
            )
        bank_connection.refresh_from_db()
        self.assertEqual(bank_connection.status, PayrollProviderConnectionStatus.BLOCKED)

        bank_connection.status = PayrollProviderConnectionStatus.ACTIVE
        with self.assertRaisesMessage(DjangoValidationError, "Active provider connections require"):
            bank_connection.save()
        bank_connection.refresh_from_db()
        self.assertEqual(bank_connection.status, PayrollProviderConnectionStatus.BLOCKED)
        self.assertFalse(bank_connection.readiness_snapshot["active_allowed"])
        self.assertEqual(PayrollProviderDelivery.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayrollProviderJob.objects.filter(tenant=self.tenant).count(), 0)

    def test_growth_provider_placeholder_can_be_configured_certified_and_explicitly_activated(self):
        self.client.force_authenticate(self.platform_admin)
        self.tenant.subscription_plan = SubscriptionPlan.GROWTH
        self.tenant.save(update_fields=["subscription_plan", "updated_at"])
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._growth_preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"requested_modules": ["provider_placeholders"], "idempotency_key": "apply-growth-provider-placeholders-positive"},
            format="json",
        )

        actor = SimpleNamespace(tenant=self.tenant, tenant_id=self.tenant.id, user=self.platform_admin)
        bank_connection = PayrollProviderConnection.objects.get(
            tenant=self.tenant,
            provider_ref="payroll.provider.bank.placeholder.v1",
        )
        configured_connection = save_hr_admin_payroll_provider_connection(
            actor,
            {
                "provider_name": "Acme Bank Sandbox",
                "status": PayrollProviderConnectionStatus.CONFIGURED,
                "adapter_ref": "payroll.provider_adapter.bank.sandbox.v1",
                "sandbox_adapter_ref": "payroll.provider_adapter.bank.sandbox.v1",
                "channel_ref": "bank.sftp.channel.primary.v1",
                "credential_ref": "secret://stage/acme/bank-sandbox",
                "credential_profile_ref": "bank.credentials.sandbox.v1",
                "credential_required": True,
                "callback_profile_ref": "bank.sftp.callback.v1",
                "callback_verification_ref": "bank.sftp.callback.hmac.v1",
                "retry_policy_ref": "payroll.delivery.retry.bank.v1",
                "certification_profile_ref": "bank.neft.certification.v1",
                "config_snapshot": {
                    **bank_connection.config_snapshot,
                    "placeholder": False,
                    "live_delivery_enabled": True,
                    "requires_real_credentials": True,
                    "provider_setup_profile_ref": "payroll.provider_setup.bank.sandbox.qa.v1",
                },
            },
            item=bank_connection,
        )

        self.assertEqual(configured_connection.status, PayrollProviderConnectionStatus.SANDBOX_READY)
        self.assertTrue(configured_connection.readiness_snapshot["credential_required"])
        self.assertNotIn("credential_reference_configured", configured_connection.readiness_snapshot["blocking_gate_refs"])
        self.assertIn("certification_passed", configured_connection.readiness_snapshot["blocking_gate_refs"])

        mapping_pack = PayrollProviderSchemaMappingPack.objects.get(
            tenant=self.tenant,
            provider_ref="payroll.provider.bank.placeholder.v1",
        )
        mapping_pack = save_payroll_provider_schema_mapping_pack_for_actor(
            actor,
            {
                "provider_connection_id": configured_connection.id,
                "source_schema_ref": "payroll.internal.bank_advice.submission.v1",
                "target_schema_ref": "acme.bank.sandbox.bank_advice.payload.v1",
                "enforcement_mode": "warn",
                "transform_rules": _default_provider_schema_mapping_transform_rules(mapping_pack.artifact_kind),
                "validation_rules": _default_provider_schema_mapping_validation_rules(mapping_pack.artifact_kind),
                "change_reason": "Configure sandbox bank provider mapping for launch certification.",
            },
            item=mapping_pack,
        )

        certification_run = run_payroll_provider_connection_certification(
            configured_connection,
            requested_by=self.platform_admin,
            executed_by=self.platform_admin,
        )
        self.assertEqual(certification_run.status, PayrollProviderCertificationRunStatus.PASSED)
        self.assertEqual(certification_run.failed_count, 0)
        configured_connection.refresh_from_db()
        self.assertEqual(configured_connection.status, PayrollProviderConnectionStatus.CERTIFIED)
        self.assertEqual(configured_connection.certification_status, PayrollProviderCertificationStatus.PASSED)
        self.assertTrue(configured_connection.readiness_snapshot["active_allowed"])

        with self.assertRaisesMessage(DjangoValidationError, "active schema mapping pack"):
            save_hr_admin_payroll_provider_connection(
                actor,
                {"status": PayrollProviderConnectionStatus.ACTIVE},
                item=configured_connection,
            )
        configured_connection.refresh_from_db()
        self.assertEqual(configured_connection.status, PayrollProviderConnectionStatus.CERTIFIED)

        mapping_pack = activate_payroll_provider_schema_mapping_pack_for_actor(
            actor,
            mapping_pack,
            approval_snapshot={"approval_reason": "QA sandbox mapping certification passed."},
        )
        self.assertEqual(mapping_pack.status, PayrollProviderSchemaMappingPackStatus.ACTIVE)

        activated_connection = save_hr_admin_payroll_provider_connection(
            actor,
            {"status": PayrollProviderConnectionStatus.ACTIVE},
            item=configured_connection,
        )
        self.assertEqual(activated_connection.status, PayrollProviderConnectionStatus.ACTIVE)
        self.assertTrue(activated_connection.readiness_snapshot["active_allowed"])

        setup_payload = get_hr_admin_payroll_provider_connection_setup_payload_for_tenant(self.tenant)
        summary = setup_payload["summary"]
        self.assertEqual(summary["active_connection_count"], 1)
        self.assertEqual(summary["certified_connection_count"], 1)
        self.assertEqual(summary["active_allowed_count"], 1)
        self.assertEqual(summary["active_schema_mapping_pack_count"], 1)
        self.assertEqual(summary["certification_run_count"], 1)
        self.assertEqual(PayrollProviderDelivery.objects.filter(tenant=self.tenant).count(), 0)
        self.assertEqual(PayrollProviderJob.objects.filter(tenant=self.tenant).count(), 0)

    def test_launch_preview_reports_missing_inputs_without_applying(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            {"blueprint_ref": "india-standard-sme", "input_payload": {}},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertFalse(body["preview"]["can_apply"])
        self.assertIn("registered_address", body["preview"]["missing_inputs"])
        self.assertEqual(body["launch_run"]["status"], TenantLaunchRunStatus.SUCCEEDED)
        blocked_items = [
            item
            for item in body["launch_run"]["seeded_items"]
            if item["status"] == TenantLaunchItemStatus.BLOCKED
        ]
        self.assertTrue(blocked_items)

        self.tenant.onboarding_record.refresh_from_db()
        self.assertEqual(self.tenant.onboarding_record.launch_readiness_status, LaunchReadinessStatus.BLOCKED)

    def test_launch_apply_requires_apply_ready_preview(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.post(f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/", {}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("Run an apply-ready launch preview", str(response.json()))

    def test_launch_apply_runs_only_certified_safe_seeders(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-safe-acme"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["run_type"], TenantLaunchRunType.APPLY)
        self.assertEqual(body["status"], TenantLaunchRunStatus.SUCCEEDED)
        self.assertEqual(
            set(body["result_payload"]["applied_modules"]),
            {"documents", "launch_checklist", "leave_attendance", "notifications", "org_masters", "roles_users", "workflows"},
        )
        self.assertEqual(
            set(body["result_payload"]["plan_gated_modules"]),
            {"payroll_defaults", "provider_placeholders"},
        )
        item_statuses = {item["item_key"]: item["status"] for item in body["seeded_items"]}
        self.assertEqual(item_statuses["documents"], TenantLaunchItemStatus.SUCCEEDED)
        self.assertEqual(item_statuses["leave_attendance"], TenantLaunchItemStatus.SUCCEEDED)
        self.assertEqual(item_statuses["roles_users"], TenantLaunchItemStatus.SUCCEEDED)
        self.assertEqual(item_statuses["org_masters"], TenantLaunchItemStatus.SUCCEEDED)
        self.assertEqual(item_statuses["workflows"], TenantLaunchItemStatus.SUCCEEDED)

        self.assertEqual(Role.objects.filter(tenant=self.tenant).count(), 4)
        self.assertTrue(Role.objects.filter(tenant=self.tenant, code="tenant-admin").exists())
        self.assertFalse(Role.objects.filter(tenant=self.tenant, code="payroll-finance-manager").exists())
        self.assertEqual(NotificationTemplate.objects.filter(tenant=self.tenant).count(), 5)
        self.assertEqual(NotificationEventDefinition.objects.filter(tenant=self.tenant).count(), 5)
        self.assertTrue(LegalEntity.objects.filter(tenant=self.tenant, code="default-legal-entity").exists())
        self.assertTrue(Location.objects.filter(tenant=self.tenant, code="head-office", city="Bengaluru").exists())
        self.assertTrue(Branch.objects.filter(tenant=self.tenant, code="default-branch").exists())
        self.assertTrue(Department.objects.filter(tenant=self.tenant, code="operations").exists())
        self.assertEqual(Grade.objects.filter(tenant=self.tenant).count(), 3)
        self.assertEqual(EmploymentType.objects.filter(tenant=self.tenant).count(), 4)
        self.assertEqual(LeaveType.objects.filter(tenant=self.tenant).count(), 4)
        self.assertEqual(LeavePolicy.objects.filter(tenant=self.tenant).count(), 4)
        self.assertEqual(LeavePolicyAssignment.objects.filter(tenant=self.tenant).count(), 4)
        self.assertTrue(Shift.objects.filter(tenant=self.tenant, code="general-shift").exists())
        self.assertEqual(HolidayCalendar.objects.filter(tenant=self.tenant, code="in-ka-holidays").count(), 2)
        self.assertEqual(Holiday.objects.filter(calendar__tenant=self.tenant).count(), 8)
        self.assertTrue(AttendancePolicy.objects.filter(tenant=self.tenant, code="standard-attendance-policy").exists())
        self.assertEqual(AttendancePolicyAssignment.objects.filter(tenant=self.tenant).count(), 1)
        self.assertEqual(DocumentCategory.objects.filter(tenant=self.tenant).count(), 7)
        self.assertEqual(DocumentRequirementRule.objects.filter(tenant=self.tenant).count(), 7)
        self.assertTrue(DocumentCategory.objects.filter(tenant=self.tenant, code="identity-pan").exists())
        self.assertFalse(DocumentCategory.objects.filter(tenant=self.tenant, code="form-11").exists())
        self.assertEqual(WorkflowTemplate.objects.filter(tenant=self.tenant).count(), 5)
        self.assertEqual(WorkflowStep.objects.filter(template__tenant=self.tenant).count(), 10)
        self.assertEqual(WorkflowTemplateAssignment.objects.filter(tenant=self.tenant).count(), 5)
        self.assertTrue(
            WorkflowTemplate.objects.filter(
                tenant=self.tenant,
                code="leave-approval-standard",
                trigger_key="leave.request",
            ).exists()
        )
        self.assertFalse(WorkflowTemplate.objects.filter(tenant=self.tenant, code="payroll-review-standard").exists())
        self.assertTrue(
            TenantOnboardingChecklistItem.objects.filter(
                onboarding=self.tenant.onboarding_record,
                code="launch_roles_reviewed",
                status=ChecklistStatus.PENDING,
            ).exists()
        )
        self.assertFalse(
            TenantOnboardingChecklistItem.objects.filter(
                onboarding=self.tenant.onboarding_record,
                code="launch_payroll_credentials_pending",
            ).exists()
        )

        self.tenant.onboarding_record.refresh_from_db()
        self.assertEqual(self.tenant.onboarding_record.launch_readiness_status, LaunchReadinessStatus.STAGE_READY)

        second_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-safe-acme"},
            format="json",
        )
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(Role.objects.filter(tenant=self.tenant).count(), 4)
        self.assertEqual(NotificationTemplate.objects.filter(tenant=self.tenant).count(), 5)
        self.assertEqual(LegalEntity.objects.filter(tenant=self.tenant).count(), 1)
        self.assertEqual(EmploymentType.objects.filter(tenant=self.tenant).count(), 4)
        self.assertEqual(LeavePolicy.objects.filter(tenant=self.tenant).count(), 4)
        self.assertEqual(AttendancePolicy.objects.filter(tenant=self.tenant).count(), 1)
        self.assertEqual(DocumentCategory.objects.filter(tenant=self.tenant).count(), 7)
        self.assertEqual(WorkflowTemplate.objects.filter(tenant=self.tenant).count(), 5)

    def test_launch_apply_can_request_certified_org_masters_only(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"requested_modules": ["org_masters"]},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], TenantLaunchRunStatus.SUCCEEDED)
        self.assertEqual(body["result_payload"]["applied_modules"], ["org_masters"])
        self.assertTrue(Department.objects.filter(tenant=self.tenant, code="operations").exists())

    def test_launch_preview_after_safe_apply_requires_change_reason_for_changed_inputs(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-change"},
            format="json",
        )
        changed_payload = self._preview_payload()
        changed_payload["idempotency_key"] = "preview-change-no-reason"
        changed_payload["input_payload"]["default_branch"] = "Mumbai"

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            changed_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("change_reason", response.json())

        changed_payload["idempotency_key"] = "preview-change-with-reason"
        changed_payload["change_reason"] = "Customer moved the default launch branch to Mumbai before handoff."
        approved_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            changed_payload,
            format="json",
        )
        self.assertEqual(approved_response.status_code, 201)
        self.assertEqual(
            approved_response.json()["launch_run"]["evidence"]["change_reason"],
            "Customer moved the default launch branch to Mumbai before handoff.",
        )
        self.assertIn("launch input payload changed after safe apply", approved_response.json()["launch_run"]["evidence"]["change_reasons"])

    def test_launch_apply_rejects_stale_preview_after_subscription_change(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.tenant.subscription_plan = SubscriptionPlan.GROWTH
        self.tenant.save(update_fields=["subscription_plan", "updated_at"])

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-stale-plan"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Tenant subscription changed after preview", str(response.json()))

    def test_launch_handoff_requires_safe_apply_and_notes(self):
        self.client.force_authenticate(self.platform_admin)

        no_apply_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-handoff/",
            {"handoff_notes": "Customer admin briefed."},
            format="json",
        )
        self.assertEqual(no_apply_response.status_code, 400)
        self.assertIn("Certified safe launch setup must be applied", str(no_apply_response.json()))

        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-handoff"},
            format="json",
        )
        no_notes_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-handoff/",
            {"handoff_notes": ""},
            format="json",
        )
        self.assertEqual(no_notes_response.status_code, 400)
        self.assertIn("handoff_notes", no_notes_response.json())

    def test_launch_handoff_marks_customer_ready_with_audit_notes(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-successful-handoff"},
            format="json",
        )

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-handoff/",
            {"handoff_notes": "Tenant admin briefed. Customer owns org masters, employee import, and gated payroll setup."},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["launch_readiness_status"], LaunchReadinessStatus.CUSTOMER_READY)
        self.assertIsNotNone(body["handoff_completed_at"])
        self.assertEqual(
            body["customer_handoff_notes"],
            "Tenant admin briefed. Customer owns org masters, employee import, and gated payroll setup.",
        )
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.onboarding_status, "handoff_ready")
