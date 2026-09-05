"""Serializers for platform policy pack APIs."""

from rest_framework import serializers

from apps.platform_policies.models import AdoptionMode, PlatformPolicyDomain, PlatformPolicyPackStatus, TenantPolicyAdoptionStatus


class PlatformPolicyPackListItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    domain = serializers.CharField()
    country_code = serializers.CharField(allow_blank=True)
    industry_tag = serializers.CharField(allow_blank=True)
    description = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    version = serializers.IntegerField()
    is_active = serializers.BooleanField()
    published_at = serializers.DateTimeField(allow_null=True)
    published_by_identifier = serializers.CharField(allow_blank=True)
    item_count = serializers.IntegerField()
    adoption_count = serializers.IntegerField()


class PlatformPolicyPackWriteSerializer(serializers.Serializer):
    code = serializers.SlugField(max_length=80)
    name = serializers.CharField(max_length=255)
    domain = serializers.ChoiceField(choices=PlatformPolicyDomain.values)
    country_code = serializers.CharField(max_length=2, required=False, allow_blank=True)
    industry_tag = serializers.CharField(max_length=80, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=PlatformPolicyPackStatus.values, required=False, default=PlatformPolicyPackStatus.DRAFT)
    version = serializers.IntegerField(required=False, min_value=1, default=1)
    is_active = serializers.BooleanField(required=False, default=True)


class PlatformPolicyPackPublishSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[PlatformPolicyPackStatus.PUBLISHED], required=False, default=PlatformPolicyPackStatus.PUBLISHED)


class TenantPolicyPackAdoptionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    tenant_id = serializers.UUIDField()
    tenant_code = serializers.CharField()
    policy_pack_id = serializers.UUIDField()
    policy_pack_code = serializers.CharField()
    policy_pack_name = serializers.CharField()
    status = serializers.CharField()
    adoption_mode = serializers.CharField()
    adopted_at = serializers.DateTimeField(allow_null=True)
    adopted_by_identifier = serializers.CharField(allow_blank=True)
    notes = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()


class TenantPolicyPackAdoptionWriteSerializer(serializers.Serializer):
    tenant_id = serializers.UUIDField()
    adoption_mode = serializers.ChoiceField(choices=AdoptionMode.values, required=False, default=AdoptionMode.CLONE_TO_TENANT_RECORDS)
    notes = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=[TenantPolicyAdoptionStatus.ADOPTED], required=False, default=TenantPolicyAdoptionStatus.ADOPTED)
