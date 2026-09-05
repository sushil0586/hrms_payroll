"""Serializers for platform-side tenant onboarding APIs."""

from rest_framework import serializers

from apps.tenant_onboarding.models import (
    AdminProvisioningStatus,
    DataSetupStyle,
    OnboardingOwnerMode,
    OnboardingSetupStyle,
    PolicyControlStyle,
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
    membership_id = serializers.UUIDField(allow_null=True)
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
    role_code = serializers.CharField(max_length=60, required=False, default="hr-admin")
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
