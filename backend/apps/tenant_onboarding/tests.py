from decimal import Decimal
from types import SimpleNamespace

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from apps.common.api_views import (
    get_hr_admin_payroll_provider_connection_setup_payload_for_tenant,
    save_hr_admin_leave_policy,
    save_hr_admin_leave_policy_assignment,
    save_hr_admin_payroll_provider_connection,
)
from apps.attendance.models import AttendancePolicy, AttendancePolicyAssignment, Holiday, HolidayCalendar, Shift
from apps.documents.models import DocumentCategory, DocumentRequirementRule
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import Role, User
from apps.leave_management.models import LeaveBalance, LeavePolicy, LeavePolicyAssignment, LeaveType
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

    def _enterprise_factory_preview_payload(self):
        return {
            "blueprint_ref": "india-manufacturing-factory",
            "blueprint_version": "v1",
            "input_payload": {
                "legal_name": "Acme Manufacturing Limited",
                "registered_address": "Mumbai, Maharashtra",
                "primary_contact": "admin@example.com",
                "tenant_admin_contact": "admin@example.com",
                "legal_entity": "Acme Manufacturing Limited",
                "default_branch": "Mumbai Plant",
                "default_department": "Operations",
                "factory_location": "Mumbai, Maharashtra",
                "statutory_registration_strategy": "collect_before_launch",
                "shift_patterns": "general_and_rotational",
                "weekly_off_policy": "fixed",
                "work_week": "mon_sat",
                "holiday_region": "MH",
                "pay_frequency": "monthly",
                "salary_structure_style": "simple_ctc",
                "financial_year": "2026-2027",
                "provider_strategy": "none",
            },
            "idempotency_key": "preview-acme-enterprise-factory",
        }

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
        roles_module = next(item for item in standard["modules"] if item["ref"] == "roles_users")
        self.assertEqual(roles_module["post_onboarding_owner"], "Tenant Admin")
        self.assertIn("Tenant Admin", roles_module["editable_by_roles"])
        self.assertTrue(roles_module["customer_editable_after_handoff"])
        provider_module = next(item for item in standard["modules"] if item["ref"] == "provider_placeholders")
        self.assertEqual(provider_module["post_onboarding_owner"], "Platform Admin")
        self.assertFalse(provider_module["customer_editable_after_handoff"])

    def test_launch_preview_reports_governance_summary_for_handoff(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        governance = body["preview"]["governance_summary"]
        self.assertEqual(
            set(governance["customer_editable_modules"]),
            {"documents", "leave_attendance", "org_masters", "roles_users", "workflows"},
        )
        self.assertEqual(
            set(governance["platform_controlled_modules"]),
            {"launch_checklist", "notifications", "tenant_identity"},
        )
        self.assertEqual(set(governance["plan_gated_modules"]), {"payroll_defaults", "provider_placeholders"})
        self.assertEqual(governance["owner_counts"]["HR Admin"], 3)
        self.assertTrue(governance["requires_change_reason_after_apply"])
        self.assertIn("customer-owned modules", governance["repair_policy"])
        self.assertEqual(body["launch_run"]["evidence"]["governance_summary"], governance)
        preview_item = next(item for item in body["launch_run"]["seeded_items"] if item["item_key"] == "org_masters")
        self.assertEqual(preview_item["evidence"]["governance_summary"], governance)

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
        self.assertEqual(skipped_payroll["post_onboarding_owner"], "Payroll Admin")
        self.assertIn("Payroll Admin", skipped_payroll["editable_by_roles"])
        leave_module = next(item for item in body["preview"]["planned_modules"] if item["ref"] == "leave_attendance")
        self.assertEqual(leave_module["post_onboarding_owner"], "HR Admin")
        self.assertTrue(leave_module["post_apply_action"])
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
        admin_employee = Employee.objects.create(
            tenant=self.tenant,
            employee_code="ADMIN-0001",
            first_name="Aditi",
            last_name="Gupta",
            work_email="aditi.gupta1789@example.com",
            employment_status=EmploymentStatus.ACTIVE,
        )
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
        admin_employee.refresh_from_db()
        self.assertIsNotNone(admin_employee.legal_entity_id)
        self.assertIsNotNone(admin_employee.branch_id)
        self.assertIsNotNone(admin_employee.department_id)
        self.assertEqual(
            LeaveBalance.objects.filter(tenant=self.tenant, employee=admin_employee).count(),
            4,
        )
        seeded_items = {item["item_key"]: item for item in body["seeded_items"]}
        org_payload = seeded_items["org_masters"]["payload"]
        self.assertEqual(org_payload["post_onboarding_owner"], "HR Admin")
        self.assertEqual(org_payload["editable_by_roles"], ["Tenant Admin", "HR Admin"])
        self.assertTrue(org_payload["customer_editable_after_handoff"])
        self.assertIn("employee import", org_payload["post_apply_action"])
        self.assertEqual(
            seeded_items["org_masters"]["evidence"]["governance"],
            {
                "post_onboarding_owner": "HR Admin",
                "editable_by_roles": ["Tenant Admin", "HR Admin"],
                "customer_editable_after_handoff": True,
                "post_apply_action": "HR Admin adjusts departments, grades, locations, designations, and cost centers before employee import.",
            },
        )
        self.assertEqual(
            set(body["result_payload"]["governance_summary"]["platform_controlled_modules"]),
            {"launch_checklist", "notifications", "tenant_identity"},
        )

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

    def test_leave_policy_changes_and_new_assignments_refresh_employee_balances(self):
        self.client.force_authenticate(self.platform_admin)
        admin_employee = Employee.objects.create(
            tenant=self.tenant,
            employee_code="ADMIN-0001",
            first_name="Aditi",
            last_name="Gupta",
            work_email="aditi.gupta1789@example.com",
            employment_status=EmploymentStatus.ACTIVE,
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-leave-balance-resync"},
            format="json",
        )
        admin_employee.refresh_from_db()

        casual_policy = LeavePolicy.objects.get(tenant=self.tenant, code="casual-leave-policy")
        casual_balance = LeaveBalance.objects.get(tenant=self.tenant, employee=admin_employee, leave_policy=casual_policy)
        original_accrued_amount = casual_balance.accrued_amount

        save_hr_admin_leave_policy(
            admin_employee,
            {"annual_entitlement": casual_policy.annual_entitlement * Decimal("2.00")},
            item=casual_policy,
        )

        casual_balance.refresh_from_db()
        self.assertEqual(casual_balance.accrued_amount, original_accrued_amount * Decimal("2.00"))
        self.assertEqual(casual_balance.closing_balance, casual_balance.accrued_amount)

        special_policy = LeavePolicy.objects.create(
            tenant=self.tenant,
            leave_type=casual_policy.leave_type,
            code="casual-leave-special-policy",
            name="Casual Leave Special Policy",
            status=casual_policy.status,
            effective_from=casual_policy.effective_from,
            accrual_frequency=casual_policy.accrual_frequency,
            annual_entitlement=Decimal("24.00"),
            max_carry_forward=Decimal("0.00"),
            min_days_per_request=Decimal("0.50"),
            notice_days_required=0,
            allow_half_day=True,
        )
        employee = Employee.objects.create(
            tenant=self.tenant,
            employee_code="EMP-0001",
            first_name="Rahul",
            last_name="Mehta",
            work_email="rahul.mehta@example.com",
            employment_status=EmploymentStatus.ACTIVE,
            legal_entity=admin_employee.legal_entity,
            branch=admin_employee.branch,
            location=admin_employee.location,
            department=admin_employee.department,
            grade=admin_employee.grade,
            employment_type=admin_employee.employment_type,
        )

        save_hr_admin_leave_policy_assignment(
            admin_employee,
            {
                "leave_policy_id": special_policy.id,
                "employee_id": employee.id,
                "priority": 10,
                "is_active": True,
            },
        )

        self.assertTrue(
            LeaveBalance.objects.filter(
                tenant=self.tenant,
                employee=employee,
                leave_policy=special_policy,
            ).exists()
        )

    def test_enterprise_factory_launch_seeds_shift_attendance_policy_baseline(self):
        self.client.force_authenticate(self.platform_admin)
        self.tenant.subscription_plan = SubscriptionPlan.ENTERPRISE
        self.tenant.save(update_fields=["subscription_plan", "updated_at"])

        preview_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._enterprise_factory_preview_payload(),
            format="json",
        )

        self.assertEqual(preview_response.status_code, 201)
        preview_body = preview_response.json()
        self.assertIn("shift_attendance", preview_body["preview"]["safe_apply_modules"])
        self.assertNotIn("shift_attendance", preview_body["preview"]["uncertified_modules"])

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-enterprise-factory"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertIn("shift_attendance", body["result_payload"]["applied_modules"])
        item_statuses = {item["item_key"]: item["status"] for item in body["seeded_items"]}
        self.assertEqual(item_statuses["shift_attendance"], TenantLaunchItemStatus.SUCCEEDED)
        self.assertEqual(LeaveType.objects.filter(tenant=self.tenant).count(), 4)
        self.assertEqual(LeavePolicy.objects.filter(tenant=self.tenant).count(), 4)
        self.assertEqual(LeavePolicyAssignment.objects.filter(tenant=self.tenant).count(), 4)
        self.assertEqual(AttendancePolicy.objects.filter(tenant=self.tenant).count(), 1)
        self.assertEqual(AttendancePolicyAssignment.objects.filter(tenant=self.tenant).count(), 1)
        self.assertTrue(Shift.objects.filter(tenant=self.tenant, code="general-shift").exists())
        self.assertEqual(HolidayCalendar.objects.filter(tenant=self.tenant, code="in-mh-holidays").count(), 2)
        self.assertGreater(Holiday.objects.filter(calendar__tenant=self.tenant).count(), 0)

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

    def test_launch_repair_recreates_missing_seeded_baseline_records(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-repair"},
            format="json",
        )
        DocumentCategory.objects.filter(tenant=self.tenant, code="identity-pan").delete()
        self.assertFalse(DocumentCategory.objects.filter(tenant=self.tenant, code="identity-pan").exists())

        preview_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-repair-preview/",
            {"idempotency_key": "repair-preview-missing-docs"},
            format="json",
        )

        self.assertEqual(preview_response.status_code, 201)
        preview_body = preview_response.json()
        self.assertEqual(preview_body["run_type"], TenantLaunchRunType.REPAIR)
        self.assertEqual(preview_body["result_payload"]["mode"], "preview")
        self.assertTrue(preview_body["result_payload"]["can_repair"])
        self.assertIn("documents", preview_body["result_payload"]["repairable_modules"])
        documents_item = next(item for item in preview_body["seeded_items"] if item["item_key"] == "documents")
        self.assertIn("document_category:identity-pan", documents_item["payload"]["missing_refs"])

        apply_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-repair-apply/",
            {"idempotency_key": "repair-apply-missing-docs"},
            format="json",
        )

        self.assertEqual(apply_response.status_code, 201)
        apply_body = apply_response.json()
        self.assertEqual(apply_body["status"], TenantLaunchRunStatus.SUCCEEDED)
        self.assertEqual(apply_body["result_payload"]["mode"], "apply")
        self.assertIn("documents", apply_body["result_payload"]["repaired_modules"])
        self.assertTrue(DocumentCategory.objects.filter(tenant=self.tenant, code="identity-pan").exists())
        repaired_item = next(item for item in apply_body["seeded_items"] if item["item_key"] == "documents")
        self.assertEqual(repaired_item["evidence"]["source"], "platform_launch_repair_apply")
        self.assertEqual(repaired_item["evidence"]["governance"]["post_onboarding_owner"], "HR Admin")

    def test_launch_drift_check_reports_clean_baseline(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-clean-drift"},
            format="json",
        )

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-drift-check/",
            {"idempotency_key": "drift-clean-baseline"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["run_type"], TenantLaunchRunType.VERIFY)
        self.assertEqual(body["result_payload"]["mode"], "drift_check")
        self.assertEqual(body["result_payload"]["counts"]["missing_ref_count"], 0)
        self.assertEqual(body["result_payload"]["counts"]["modules_missing_baseline"], 0)
        self.assertGreater(body["result_payload"]["counts"]["customer_owned_present_ref_count"], 0)
        self.assertFalse(body["result_payload"]["can_repair"])
        self.assertEqual(body["evidence"]["source"], "platform_launch_drift_check")

    def test_launch_drift_check_reports_missing_seeded_refs(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-missing-drift"},
            format="json",
        )
        DocumentCategory.objects.filter(tenant=self.tenant, code="identity-pan").delete()

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-drift-check/",
            {"idempotency_key": "drift-missing-doc"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(body["result_payload"]["can_repair"])
        self.assertIn("documents", body["result_payload"]["repairable_modules"])
        self.assertGreater(body["result_payload"]["counts"]["missing_ref_count"], 0)
        documents_item = next(item for item in body["seeded_items"] if item["item_key"] == "documents")
        self.assertEqual(documents_item["status"], TenantLaunchItemStatus.BLOCKED)
        self.assertEqual(documents_item["payload"]["drift_status"], "missing_baseline")
        self.assertIn("document_category:identity-pan", documents_item["payload"]["missing_refs"])

    def test_launch_drift_check_reports_document_field_drift(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-document-field-drift"},
            format="json",
        )
        category = DocumentCategory.objects.get(tenant=self.tenant, code="identity-pan")
        category.name = "PAN Document"
        category.save(update_fields=["name", "updated_at"])

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-drift-check/",
            {"idempotency_key": "drift-document-field"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["result_payload"]["counts"]["missing_ref_count"], 0)
        self.assertEqual(body["result_payload"]["counts"]["modules_with_field_drift"], 1)
        self.assertEqual(body["result_payload"]["counts"]["field_drift_count"], 1)
        documents_item = next(item for item in body["seeded_items"] if item["item_key"] == "documents")
        self.assertEqual(documents_item["payload"]["drift_status"], "field_drift")
        self.assertEqual(documents_item["payload"]["drift_action"], "manual_review")
        self.assertEqual(
            documents_item["payload"]["field_drifts"][0],
            {
                "record_ref": "document_category:identity-pan",
                "field": "name",
                "expected": "PAN Card",
                "actual": "PAN Document",
            },
        )

    def test_launch_drift_check_reports_org_master_field_drift(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-org-field-drift"},
            format="json",
        )
        legal_entity = LegalEntity.objects.get(tenant=self.tenant, code="default-legal-entity")
        legal_entity.name = "Acme India Updated"
        legal_entity.save(update_fields=["name", "updated_at"])

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-drift-check/",
            {"idempotency_key": "drift-org-field"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["result_payload"]["counts"]["modules_with_field_drift"], 1)
        org_item = next(item for item in body["seeded_items"] if item["item_key"] == "org_masters")
        self.assertEqual(org_item["payload"]["drift_status"], "field_drift")
        self.assertIn(
            {
                "record_ref": "legal_entity:default-legal-entity",
                "field": "name",
                "expected": "Acme India Pvt Ltd",
                "actual": "Acme India Updated",
            },
            org_item["payload"]["field_drifts"],
        )

    def test_launch_drift_check_reports_leave_attendance_field_drift(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-leave-attendance-field-drift"},
            format="json",
        )
        policy = LeavePolicy.objects.get(tenant=self.tenant, code="casual-leave-policy")
        policy.annual_entitlement = 10
        policy.save(update_fields=["annual_entitlement", "updated_at"])

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-drift-check/",
            {"idempotency_key": "drift-leave-attendance-field"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["result_payload"]["counts"]["modules_with_field_drift"], 1)
        item = next(item for item in body["seeded_items"] if item["item_key"] == "leave_attendance")
        self.assertEqual(item["payload"]["drift_status"], "field_drift")
        self.assertIn(
            {
                "record_ref": "leave_policy:casual-leave-policy",
                "field": "annual_entitlement",
                "expected": "12.00",
                "actual": "10.00",
            },
            item["payload"]["field_drifts"],
        )

    def test_launch_drift_check_reports_workflow_field_drift(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-workflow-field-drift"},
            format="json",
        )
        step = WorkflowStep.objects.get(template__tenant=self.tenant, template__code="leave-approval-standard", step_order=1)
        step.escalate_after_hours = 12
        step.save(update_fields=["escalate_after_hours", "updated_at"])

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-drift-check/",
            {"idempotency_key": "drift-workflow-field"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["result_payload"]["counts"]["modules_with_field_drift"], 1)
        item = next(item for item in body["seeded_items"] if item["item_key"] == "workflows")
        self.assertEqual(item["payload"]["drift_status"], "field_drift")
        self.assertIn(
            {
                "record_ref": "workflow_step:leave-approval-standard:1",
                "field": "escalate_after_hours",
                "expected": 24,
                "actual": 12,
            },
            item["payload"]["field_drifts"],
        )

    def test_launch_certification_report_fails_before_required_evidence(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.get(f"/api/v1/platform/tenants/{self.tenant.id}/launch-certification-report/")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "fail")
        self.assertGreater(body["blocker_count"], 0)
        self.assertIn("No launch blueprint has been selected.", body["blockers"])
        checks = {item["ref"]: item for item in body["checks"]}
        self.assertEqual(checks["blueprint_selected"]["status"], "blocked")
        self.assertEqual(checks["safe_apply"]["status"], "blocked")

    def test_launch_certification_report_passes_after_clean_handoff(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-certification"},
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-drift-check/",
            {"idempotency_key": "drift-before-certification"},
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-handoff/",
            {"handoff_notes": "QA reviewed baseline, drift, and customer-owned setup responsibilities."},
            format="json",
        )

        response = self.client.get(f"/api/v1/platform/tenants/{self.tenant.id}/launch-certification-report/")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "pass")
        self.assertEqual(body["blocker_count"], 0)
        self.assertGreaterEqual(body["info_count"], 1)
        self.assertIn("payroll_defaults", body["info"][0])
        checks = {item["ref"]: item for item in body["checks"]}
        self.assertEqual(checks["preview_apply_ready"]["status"], "passed")
        self.assertEqual(checks["safe_apply"]["status"], "passed")
        self.assertEqual(checks["drift_clear"]["status"], "passed")
        self.assertEqual(checks["customer_handoff"]["status"], "passed")
        self.assertEqual(checks["subscription_scope"]["status"], "info")

    def test_launch_certification_report_blocks_on_field_drift(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-certification-drift"},
            format="json",
        )
        category = DocumentCategory.objects.get(tenant=self.tenant, code="identity-pan")
        category.name = "PAN Document"
        category.save(update_fields=["name", "updated_at"])
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-drift-check/",
            {"idempotency_key": "drift-before-certification-drift"},
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-handoff/",
            {"handoff_notes": "Attempted handoff with field drift."},
            format="json",
        )

        response = self.client.get(f"/api/v1/platform/tenants/{self.tenant.id}/launch-certification-report/")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "fail")
        self.assertIn("field differences", " ".join(body["blockers"]))
        checks = {item["ref"]: item for item in body["checks"]}
        self.assertEqual(checks["drift_clear"]["status"], "blocked")

    def test_launch_repair_forced_module_requires_change_reason(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-forced-repair"},
            format="json",
        )

        response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-repair-apply/",
            {"requested_modules": ["org_masters"], "idempotency_key": "repair-forced-no-reason"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("change reason is required", response.json()["detail"])

        approved_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-repair-apply/",
            {
                "requested_modules": ["org_masters"],
                "change_reason": "Platform admin verified customer-owned org masters should be rechecked.",
                "idempotency_key": "repair-forced-with-reason",
            },
            format="json",
        )
        self.assertEqual(approved_response.status_code, 201)
        approved_body = approved_response.json()
        self.assertEqual(approved_body["result_payload"]["forced_modules"], ["org_masters"])
        self.assertEqual(
            approved_body["evidence"]["change_reason"],
            "Platform admin verified customer-owned org masters should be rechecked.",
        )

    def test_launch_upgrade_compare_and_apply_requires_customer_owned_change_reason(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-upgrade"},
            format="json",
        )

        compare_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-upgrade-compare/",
            {"target_blueprint_version": "v2", "idempotency_key": "upgrade-compare-v2"},
            format="json",
        )

        self.assertEqual(compare_response.status_code, 201)
        compare_body = compare_response.json()
        self.assertEqual(compare_body["run_type"], TenantLaunchRunType.UPGRADE)
        self.assertEqual(compare_body["result_payload"]["mode"], "compare")
        self.assertTrue(compare_body["result_payload"]["can_upgrade"])
        self.assertTrue(compare_body["result_payload"]["requires_change_reason"])
        self.assertEqual(compare_body["result_payload"]["target_blueprint_version"], "v2")
        changed_modules = {
            item["module_ref"]
            for item in compare_body["result_payload"]["items"]
            if item["action"] == "change"
        }
        self.assertEqual(changed_modules, {"documents", "workflows"})

        blocked_apply_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-upgrade-apply/",
            {"target_blueprint_version": "v2", "idempotency_key": "upgrade-apply-v2-no-reason"},
            format="json",
        )
        self.assertEqual(blocked_apply_response.status_code, 409)
        self.assertIn("change reason is required", blocked_apply_response.json()["detail"])

        apply_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-upgrade-apply/",
            {
                "target_blueprint_version": "v2",
                "change_reason": "Customer-owned document and workflow handoff guidance reviewed for v2.",
                "idempotency_key": "upgrade-apply-v2",
            },
            format="json",
        )

        self.assertEqual(apply_response.status_code, 201)
        apply_body = apply_response.json()
        self.assertEqual(apply_body["status"], TenantLaunchRunStatus.SUCCEEDED)
        self.assertEqual(apply_body["run_type"], TenantLaunchRunType.UPGRADE)
        self.assertEqual(apply_body["result_payload"]["target_blueprint_version"], "v2")
        self.assertEqual(set(apply_body["result_payload"]["upgraded_modules"]), {"documents", "workflows"})
        self.tenant.onboarding_record.refresh_from_db()
        self.assertEqual(self.tenant.onboarding_record.launch_blueprint_version, "v2")
        self.assertEqual(self.tenant.onboarding_record.launch_status_notes, "Launch blueprint upgrade applied.")

    def test_launch_upgrade_blocks_when_current_baseline_needs_repair(self):
        self.client.force_authenticate(self.platform_admin)
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-preview/",
            self._preview_payload(),
            format="json",
        )
        self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-apply/",
            {"idempotency_key": "apply-before-upgrade-repair-block"},
            format="json",
        )
        DocumentCategory.objects.filter(tenant=self.tenant, code="identity-pan").delete()

        compare_response = self.client.post(
            f"/api/v1/platform/tenants/{self.tenant.id}/launch-upgrade-compare/",
            {"target_blueprint_version": "v2", "idempotency_key": "upgrade-compare-repair-block"},
            format="json",
        )

        self.assertEqual(compare_response.status_code, 201)
        compare_body = compare_response.json()
        self.assertFalse(compare_body["result_payload"]["can_upgrade"])
        self.assertIn("Repair missing launch baseline records before upgrade.", compare_body["result_payload"]["blockers"])
        documents_item = next(
            item for item in compare_body["result_payload"]["items"] if item["module_ref"] == "documents"
        )
        self.assertTrue(documents_item["baseline_missing"])

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
