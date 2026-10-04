"""Serializers for platform-side tenant onboarding APIs."""

from rest_framework import serializers

from apps.tenant_onboarding.models import (
    AdminProvisioningStatus,
    DataSetupStyle,
    LaunchReadinessStatus,
    OnboardingOwnerMode,
    OnboardingSetupStyle,
    PolicyControlStyle,
    PublicLeadIntent,
    PublicLeadStatus,
    TenantLaunchRunStatus,
    TenantLaunchRunType,
)
from apps.tenants.models import SeedPack, SubscriptionPlan, TenantOnboardingStatus, TenantStatus


class PlatformTenantListItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    legal_name = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    onboarding_status = serializers.CharField()
    subscription_plan = serializers.CharField()
    seed_pack = serializers.CharField()
    primary_email = serializers.EmailField(allow_blank=True)
    primary_phone = serializers.CharField(allow_blank=True)
    timezone = serializers.CharField()
    country_code = serializers.CharField()
    is_sandbox = serializers.BooleanField()
    go_live_at = serializers.DateTimeField(allow_null=True)
    primary_domain = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PlatformTenantWriteSerializer(serializers.Serializer):
    code = serializers.SlugField(max_length=50)
    name = serializers.CharField(max_length=255)
    legal_name = serializers.CharField(max_length=255, allow_blank=True, required=False)
    status = serializers.ChoiceField(choices=TenantStatus.values, required=False, default=TenantStatus.DRAFT)
    subscription_plan = serializers.ChoiceField(
        choices=SubscriptionPlan.values,
        required=False,
        default=SubscriptionPlan.STARTER,
    )
    seed_pack = serializers.ChoiceField(choices=SeedPack.values, required=False, default=SeedPack.STANDARD_OFFICE)
    primary_email = serializers.EmailField(required=False, allow_blank=True)
    primary_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    timezone = serializers.CharField(max_length=64, required=False, default="UTC")
    country_code = serializers.CharField(max_length=2, required=False, default="IN")
    is_sandbox = serializers.BooleanField(required=False, default=False)
    primary_domain = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_primary_email(self, value):
        return value.strip().lower()

    def validate_primary_domain(self, value):
        return value.strip().lower()


class PlatformOnboardingChecklistItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    label = serializers.CharField()
    status = serializers.CharField()
    completed_at = serializers.DateTimeField(allow_null=True)
    completed_by_identifier = serializers.CharField(allow_blank=True)
    notes = serializers.CharField(allow_blank=True)
    sort_order = serializers.IntegerField()


class PlatformOnboardingAdminContactSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone_number = serializers.CharField(allow_blank=True)
    job_title = serializers.CharField(allow_blank=True)
    is_primary = serializers.BooleanField()
    provisioning_status = serializers.CharField()
    user_id = serializers.UUIDField(allow_null=True)
    user_is_active = serializers.BooleanField(allow_null=True)
    membership_id = serializers.UUIDField(allow_null=True)
    membership_status = serializers.CharField(allow_blank=True)
    invited_at = serializers.DateTimeField(allow_null=True)
    first_login_at = serializers.DateTimeField(allow_null=True)
    notes = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PlatformOnboardingEventSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    event_type = serializers.CharField()
    summary = serializers.CharField(allow_blank=True)
    payload = serializers.JSONField()
    actor_identifier = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()


class PlatformTenantOnboardingSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    tenant_id = serializers.UUIDField()
    tenant_code = serializers.CharField()
    tenant_name = serializers.CharField()
    tenant_status = serializers.CharField()
    tenant_onboarding_status = serializers.CharField()
    owner_mode = serializers.CharField()
    setup_style = serializers.CharField()
    data_setup_style = serializers.CharField()
    policy_control_style = serializers.CharField()
    launch_blueprint_ref = serializers.CharField(allow_blank=True)
    launch_blueprint_version = serializers.CharField(allow_blank=True)
    launch_readiness_status = serializers.CharField()
    launch_subscription_plan_snapshot = serializers.CharField(allow_blank=True)
    launch_preview_payload = serializers.JSONField()
    launch_selected_at = serializers.DateTimeField(allow_null=True)
    launch_applied_at = serializers.DateTimeField(allow_null=True)
    launch_verified_at = serializers.DateTimeField(allow_null=True)
    launch_status_notes = serializers.CharField(allow_blank=True)
    country_context = serializers.CharField(allow_blank=True)
    industry_context = serializers.CharField(allow_blank=True)
    notes = serializers.CharField(allow_blank=True)
    internal_handoff_notes = serializers.CharField(allow_blank=True)
    customer_handoff_notes = serializers.CharField(allow_blank=True)
    first_login_verified_at = serializers.DateTimeField(allow_null=True)
    baseline_published_at = serializers.DateTimeField(allow_null=True)
    handoff_completed_at = serializers.DateTimeField(allow_null=True)
    admin_contacts = PlatformOnboardingAdminContactSerializer(many=True)
    checklist_items = PlatformOnboardingChecklistItemSerializer(many=True)
    recent_events = PlatformOnboardingEventSerializer(many=True)


class PlatformTenantOnboardingWriteSerializer(serializers.Serializer):
    owner_mode = serializers.ChoiceField(choices=OnboardingOwnerMode.values, required=False)
    setup_style = serializers.ChoiceField(choices=OnboardingSetupStyle.values, required=False)
    data_setup_style = serializers.ChoiceField(choices=DataSetupStyle.values, required=False)
    policy_control_style = serializers.ChoiceField(choices=PolicyControlStyle.values, required=False)
    launch_readiness_status = serializers.ChoiceField(choices=LaunchReadinessStatus.values, required=False)
    launch_status_notes = serializers.CharField(required=False, allow_blank=True)
    country_context = serializers.CharField(max_length=2, required=False, allow_blank=True)
    industry_context = serializers.CharField(max_length=80, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    internal_handoff_notes = serializers.CharField(required=False, allow_blank=True)
    customer_handoff_notes = serializers.CharField(required=False, allow_blank=True)


class PlatformOnboardingAdminContactWriteSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    job_title = serializers.CharField(max_length=120, required=False, allow_blank=True)
    is_primary = serializers.BooleanField(required=False, default=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        return value.strip().lower()


class PlatformProvisionAdminSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    role_code = serializers.CharField(max_length=60, required=False, default="tenant-admin")
    role_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False)
    must_change_password = serializers.BooleanField(required=False, default=True)
    is_user_active = serializers.BooleanField(required=False, default=True)
    membership_status = serializers.CharField(required=False, default="active")

    def validate_username(self, value):
        return value.strip()


class PlatformProvisionAdminResultSerializer(serializers.Serializer):
    contact_id = serializers.UUIDField()
    user_id = serializers.UUIDField()
    membership_id = serializers.UUIDField()
    role_code = serializers.CharField()
    generated_password = serializers.CharField(allow_blank=True)
    provisioning_status = serializers.CharField()


class PlatformMutationResultSerializer(serializers.Serializer):
    detail = serializers.CharField()
    tenant_status = serializers.CharField(required=False)
    onboarding_status = serializers.CharField(required=False)


class PlatformLaunchModuleSerializer(serializers.Serializer):
    ref = serializers.CharField()
    label = serializers.CharField()
    title = serializers.CharField(required=False)
    minimum_plan = serializers.CharField()
    ownership_mode = serializers.CharField()
    post_onboarding_owner = serializers.CharField(required=False, allow_blank=True)
    editable_by_roles = serializers.ListField(child=serializers.CharField(), required=False)
    customer_editable_after_handoff = serializers.BooleanField(required=False)
    required_inputs = serializers.ListField(child=serializers.CharField())
    child_seeder = serializers.CharField(allow_blank=True)
    description = serializers.CharField(allow_blank=True)
    post_apply_action = serializers.CharField(required=False, allow_blank=True)
    ui_status = serializers.CharField(required=False, allow_blank=True)
    status_label = serializers.CharField(required=False, allow_blank=True)
    action_label = serializers.CharField(required=False, allow_blank=True)
    action_needed = serializers.CharField(required=False, allow_blank=True)
    editability_label = serializers.CharField(required=False, allow_blank=True)
    missing_inputs = serializers.ListField(child=serializers.CharField(), required=False)
    skip_reason = serializers.CharField(required=False, allow_blank=True)
    tenant_plan = serializers.CharField(required=False, allow_blank=True)
    plan_allowed = serializers.BooleanField(required=False)
    safe_apply_enabled = serializers.BooleanField(required=False)
    apply_allowed = serializers.BooleanField(required=False)
    gating_reason = serializers.CharField(required=False, allow_blank=True)


class PlatformLaunchInputDefinitionSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    group = serializers.CharField()
    field_type = serializers.CharField()
    help_text = serializers.CharField()
    owner_role = serializers.CharField()
    placeholder = serializers.CharField(allow_blank=True)
    example = serializers.CharField(allow_blank=True)
    required = serializers.BooleanField()
    sensitive = serializers.BooleanField()
    choices = serializers.JSONField()


class PlatformLaunchBlueprintSerializer(serializers.Serializer):
    ref = serializers.CharField()
    version = serializers.CharField()
    label = serializers.CharField()
    country_code = serializers.CharField()
    industry_refs = serializers.ListField(child=serializers.CharField())
    minimum_plan = serializers.CharField()
    compatible_plans = serializers.ListField(child=serializers.CharField())
    workforce_model = serializers.CharField()
    payroll_scope = serializers.CharField()
    summary = serializers.CharField()
    required_inputs = serializers.ListField(child=serializers.CharField())
    input_schema = PlatformLaunchInputDefinitionSerializer(many=True)
    recommended_for = serializers.ListField(child=serializers.CharField())
    modules = PlatformLaunchModuleSerializer(many=True)
    compatibility = serializers.JSONField(required=False)


class PlatformTenantLaunchPreviewRequestSerializer(serializers.Serializer):
    blueprint_ref = serializers.CharField(max_length=120)
    blueprint_version = serializers.CharField(max_length=40, required=False, allow_blank=True)
    input_payload = serializers.JSONField(required=False, default=dict)
    change_reason = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate_input_payload(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Input payload must be an object.")
        return value


class PlatformTenantLaunchApplyRequestSerializer(serializers.Serializer):
    requested_modules = serializers.ListField(
        child=serializers.CharField(max_length=80),
        required=False,
        allow_empty=True,
        default=list,
    )
    idempotency_key = serializers.CharField(max_length=120, required=False, allow_blank=True)


class PlatformTenantLaunchRepairRequestSerializer(serializers.Serializer):
    requested_modules = serializers.ListField(
        child=serializers.CharField(max_length=80),
        required=False,
        allow_empty=True,
        default=list,
    )
    change_reason = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(max_length=120, required=False, allow_blank=True)


class PlatformTenantLaunchUpgradeRequestSerializer(serializers.Serializer):
    target_blueprint_ref = serializers.CharField(max_length=120, required=False, allow_blank=True)
    target_blueprint_version = serializers.CharField(max_length=40)
    requested_modules = serializers.ListField(
        child=serializers.CharField(max_length=80),
        required=False,
        allow_empty=True,
        default=list,
    )
    change_reason = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(max_length=120, required=False, allow_blank=True)


class PlatformTenantLaunchDriftRequestSerializer(serializers.Serializer):
    idempotency_key = serializers.CharField(max_length=120, required=False, allow_blank=True)


class PlatformTenantLaunchHandoffRequestSerializer(serializers.Serializer):
    handoff_notes = serializers.CharField(max_length=4000, trim_whitespace=True)


class PlatformTenantLaunchPreviewSerializer(serializers.Serializer):
    can_apply = serializers.BooleanField()
    blueprint_ref = serializers.CharField()
    blueprint_version = serializers.CharField()
    tenant_code = serializers.CharField()
    subscription_plan = serializers.CharField()
    country_code = serializers.CharField()
    planned_modules = PlatformLaunchModuleSerializer(many=True)
    skipped_modules = PlatformLaunchModuleSerializer(many=True)
    missing_inputs = serializers.ListField(child=serializers.CharField())
    required_inputs = serializers.ListField(child=serializers.CharField())
    input_schema = PlatformLaunchInputDefinitionSerializer(many=True)
    blockers = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())
    child_seeders = serializers.ListField(child=serializers.CharField())
    safe_apply_modules = serializers.ListField(child=serializers.CharField())
    plan_gated_modules = serializers.ListField(child=serializers.CharField())
    uncertified_modules = serializers.ListField(child=serializers.CharField())
    governance_summary = serializers.JSONField()


class PlatformTenantLaunchSeededItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    item_key = serializers.CharField()
    item_kind = serializers.CharField()
    module_ref = serializers.CharField()
    action = serializers.CharField()
    status = serializers.CharField()
    ownership_mode = serializers.CharField(allow_blank=True)
    object_ref = serializers.CharField(allow_blank=True)
    checksum_sha256 = serializers.CharField(allow_blank=True)
    message = serializers.CharField(allow_blank=True)
    payload = serializers.JSONField()
    evidence = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PlatformTenantLaunchRunSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    tenant_id = serializers.UUIDField()
    blueprint_ref = serializers.CharField()
    blueprint_version = serializers.CharField()
    subscription_plan = serializers.CharField()
    run_type = serializers.ChoiceField(choices=TenantLaunchRunType.values)
    status = serializers.ChoiceField(choices=TenantLaunchRunStatus.values)
    requested_by_identifier = serializers.CharField(allow_blank=True)
    idempotency_key = serializers.CharField(allow_blank=True)
    started_at = serializers.DateTimeField(allow_null=True)
    finished_at = serializers.DateTimeField(allow_null=True)
    input_payload = serializers.JSONField()
    plan_snapshot = serializers.JSONField()
    result_payload = serializers.JSONField()
    errors = serializers.JSONField()
    evidence = serializers.JSONField()
    seeded_items = PlatformTenantLaunchSeededItemSerializer(many=True, required=False)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PlatformPermissionCatalogItemSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    module = serializers.CharField()
    description = serializers.CharField()
    risk_level = serializers.CharField()
    tenant_assignable = serializers.BooleanField()
    required_module = serializers.CharField(allow_blank=True)
    required_plan = serializers.CharField(allow_blank=True)
    default_role_codes = serializers.ListField(child=serializers.CharField())
    catalog_source = serializers.CharField(required=False, default="code")
    is_active = serializers.BooleanField(required=False, default=True)


class PlatformPermissionCatalogUpdateSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=255, required=False, allow_blank=True)
    module = serializers.CharField(max_length=120, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    risk_level = serializers.ChoiceField(choices=["low", "medium", "high", "critical"], required=False)
    tenant_assignable = serializers.BooleanField(required=False)
    required_module = serializers.CharField(max_length=120, required=False, allow_blank=True)
    required_plan = serializers.CharField(max_length=120, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_label(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Permission label is required.")
        return value

    def validate_module(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Module is required.")
        return value

    def validate_required_module(self, value):
        return value.strip()

    def validate_required_plan(self, value):
        return value.strip()


class PublicTenantLeadCreateSerializer(serializers.Serializer):
    intent = serializers.ChoiceField(choices=PublicLeadIntent.values, required=False, default=PublicLeadIntent.SIGNUP)
    company_name = serializers.CharField(max_length=255)
    contact_name = serializers.CharField(max_length=255)
    work_email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    employee_count = serializers.IntegerField(min_value=1, max_value=100000, required=False, allow_null=True)
    industry = serializers.CharField(max_length=80, required=False, allow_blank=True)
    country_code = serializers.CharField(max_length=2, required=False, default="IN")
    preferred_plan = serializers.CharField(max_length=40, required=False, allow_blank=True)
    message = serializers.CharField(required=False, allow_blank=True)
    source_path = serializers.CharField(max_length=255, required=False, allow_blank=True)
    website = serializers.CharField(required=False, allow_blank=True)

    def validate_work_email(self, value):
        return value.strip().lower()

    def validate_website(self, value):
        if value:
            raise serializers.ValidationError("Unable to submit this request.")
        return value


class PublicTenantLeadSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    intent = serializers.CharField()
    status = serializers.CharField()
    company_name = serializers.CharField()
    contact_name = serializers.CharField()
    work_email = serializers.EmailField()
    phone_number = serializers.CharField(allow_blank=True)
    employee_count = serializers.IntegerField(allow_null=True)
    industry = serializers.CharField(allow_blank=True)
    country_code = serializers.CharField()
    preferred_plan = serializers.CharField(allow_blank=True)
    message = serializers.CharField(allow_blank=True)
    source_path = serializers.CharField(allow_blank=True)
    reviewed_by_identifier = serializers.CharField(allow_blank=True)
    reviewed_at = serializers.DateTimeField(allow_null=True)
    converted_tenant_id = serializers.UUIDField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PublicTenantLeadUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=PublicLeadStatus.values)
    reviewed_by_identifier = serializers.CharField(max_length=120, required=False, allow_blank=True)


class PublicTenantLeadConvertSerializer(serializers.Serializer):
    code = serializers.SlugField(max_length=50)
    primary_domain = serializers.CharField(max_length=255, required=False, allow_blank=True)
    subscription_plan = serializers.ChoiceField(
        choices=SubscriptionPlan.values,
        required=False,
        default=SubscriptionPlan.GROWTH,
    )
    seed_pack = serializers.ChoiceField(choices=SeedPack.values, required=False, default=SeedPack.STANDARD_OFFICE)
    is_sandbox = serializers.BooleanField(required=False, default=True)
    owner_mode = serializers.ChoiceField(choices=OnboardingOwnerMode.values, required=False)
    setup_style = serializers.ChoiceField(choices=OnboardingSetupStyle.values, required=False)
    data_setup_style = serializers.ChoiceField(choices=DataSetupStyle.values, required=False)
    policy_control_style = serializers.ChoiceField(choices=PolicyControlStyle.values, required=False)
    admin_job_title = serializers.CharField(max_length=120, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_primary_domain(self, value):
        return value.strip().lower()
