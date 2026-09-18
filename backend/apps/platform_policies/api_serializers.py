"""Serializers for platform policy pack APIs."""

from rest_framework import serializers

from apps.platform_policies.models import (
    AdoptionMode,
    PlatformPolicyDomain,
    PlatformPolicyItemType,
    PlatformPolicyPackStatus,
    TenantPolicyAdoptionStatus,
)


class PlatformPolicyPackItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    item_type = serializers.CharField()
    item_key = serializers.CharField()
    name = serializers.CharField(allow_blank=True)
    payload = serializers.JSONField()
    dependency_keys = serializers.JSONField()
    sort_order = serializers.IntegerField()
    is_required = serializers.BooleanField()


class PlatformPolicyPackListItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    source_pack_id = serializers.UUIDField(allow_null=True)
    source_pack_code = serializers.CharField(allow_blank=True)
    source_pack_version = serializers.IntegerField(allow_null=True)
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
    items = PlatformPolicyPackItemSerializer(many=True)


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


class PlatformPolicyPackItemWriteSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=PlatformPolicyItemType.values)
    item_key = serializers.SlugField(max_length=120)
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    payload = serializers.JSONField(required=False, default=dict)
    dependency_keys = serializers.ListField(
        child=serializers.CharField(max_length=120),
        required=False,
        default=list,
        allow_empty=True,
    )
    sort_order = serializers.IntegerField(required=False, min_value=0, default=0)
    is_required = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        policy_pack = self.context.get("policy_pack")
        current_item = self.context.get("current_item")
        item_type = attrs.get("item_type") or getattr(current_item, "item_type", None)
        item_key = attrs.get("item_key") or getattr(current_item, "item_key", None)
        payload = attrs.get("payload", getattr(current_item, "payload", {})) or {}
        dependency_keys = attrs.get("dependency_keys", getattr(current_item, "dependency_keys", [])) or []

        if not item_type:
            raise serializers.ValidationError({"item_type": "This field is required."})
        if not item_key:
            raise serializers.ValidationError({"item_key": "This field is required."})

        if not isinstance(payload, dict):
            raise serializers.ValidationError({"payload": "Payload must be a JSON object."})

        if policy_pack:
            duplicate_items = policy_pack.items.filter(item_key=item_key)
            if current_item:
                duplicate_items = duplicate_items.exclude(id=current_item.id)
            if duplicate_items.exists():
                raise serializers.ValidationError({"item_key": "Item key already exists in this template."})

        if policy_pack and dependency_keys:
            if item_key in dependency_keys:
                raise serializers.ValidationError({"dependency_keys": "An item cannot depend on itself."})
            existing_keys = set(policy_pack.items.filter(item_key__in=dependency_keys).values_list("item_key", flat=True))
            missing_keys = [key for key in dependency_keys if key not in existing_keys]
            if missing_keys:
                raise serializers.ValidationError({"dependency_keys": f"Unknown dependency keys: {', '.join(missing_keys)}."})

        required_by_type = {
            PlatformPolicyItemType.LEAVE_TYPE: ("code", "name"),
            PlatformPolicyItemType.LEAVE_POLICY: ("code", "name", "leave_type_item_key"),
            PlatformPolicyItemType.SHIFT: ("code", "name", "start_time", "end_time", "working_hours"),
            PlatformPolicyItemType.HOLIDAY_CALENDAR: ("code", "name", "year"),
            PlatformPolicyItemType.ATTENDANCE_POLICY: ("code", "name"),
        }
        missing_fields = [field for field in required_by_type.get(item_type, ()) if payload.get(field) in (None, "")]
        if missing_fields:
            raise serializers.ValidationError({"payload": f"Missing required payload fields for {item_type}: {', '.join(missing_fields)}."})

        if item_type == PlatformPolicyItemType.LEAVE_POLICY:
            leave_type_key = payload.get("leave_type_item_key")
            if item_key and leave_type_key == item_key:
                raise serializers.ValidationError({"payload": "leave_type_item_key cannot reference the same item."})
            if policy_pack and not policy_pack.items.filter(item_key=leave_type_key, item_type=PlatformPolicyItemType.LEAVE_TYPE).exists():
                raise serializers.ValidationError({"payload": "leave_type_item_key must reference an existing Leave Type item in this template."})

        if item_type == PlatformPolicyItemType.ATTENDANCE_POLICY:
            default_shift_key = payload.get("default_shift_item_key")
            holiday_calendar_key = payload.get("holiday_calendar_item_key")
            if default_shift_key and policy_pack and not policy_pack.items.filter(item_key=default_shift_key, item_type=PlatformPolicyItemType.SHIFT).exists():
                raise serializers.ValidationError({"payload": "default_shift_item_key must reference an existing Shift item in this template."})
            if holiday_calendar_key and policy_pack and not policy_pack.items.filter(item_key=holiday_calendar_key, item_type=PlatformPolicyItemType.HOLIDAY_CALENDAR).exists():
                raise serializers.ValidationError({"payload": "holiday_calendar_item_key must reference an existing Holiday Calendar item in this template."})

        return attrs


class PlatformPolicyPackPublishSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[PlatformPolicyPackStatus.PUBLISHED], required=False, default=PlatformPolicyPackStatus.PUBLISHED)
    allow_header_only = serializers.BooleanField(required=False, default=False)


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
    result_summary = serializers.JSONField()
    created_at = serializers.DateTimeField()


class TenantPolicyPackAdoptionWriteSerializer(serializers.Serializer):
    tenant_id = serializers.UUIDField()
    adoption_mode = serializers.ChoiceField(choices=AdoptionMode.values, required=False, default=AdoptionMode.CLONE_TO_TENANT_RECORDS)
    notes = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=[TenantPolicyAdoptionStatus.ADOPTED], required=False, default=TenantPolicyAdoptionStatus.ADOPTED)


class PolicyPackAdoptionPreviewItemSerializer(serializers.Serializer):
    item_key = serializers.CharField()
    item_type = serializers.CharField()
    name = serializers.CharField(allow_blank=True)
    action = serializers.CharField()
    target_model = serializers.CharField(allow_blank=True)
    target_key = serializers.CharField(allow_blank=True)
    message = serializers.CharField()
    severity = serializers.CharField()


class PolicyPackAdoptionPreviewSerializer(serializers.Serializer):
    tenant_id = serializers.UUIDField()
    tenant_code = serializers.CharField()
    policy_pack_id = serializers.UUIDField()
    policy_pack_code = serializers.CharField()
    policy_pack_name = serializers.CharField()
    policy_pack_version = serializers.IntegerField()
    adoption_mode = serializers.CharField()
    can_apply = serializers.BooleanField()
    counts = serializers.JSONField()
    items = PolicyPackAdoptionPreviewItemSerializer(many=True)


class PolicyPackUpgradeCompareItemSerializer(serializers.Serializer):
    item_key = serializers.CharField()
    item_type = serializers.CharField()
    name = serializers.CharField(allow_blank=True)
    action = serializers.CharField()
    current_version = serializers.IntegerField(allow_null=True)
    target_version = serializers.IntegerField()
    message = serializers.CharField()
    severity = serializers.CharField()


class PolicyPackUpgradeCompareSerializer(serializers.Serializer):
    tenant_id = serializers.UUIDField()
    tenant_code = serializers.CharField()
    current_policy_pack_id = serializers.CharField(allow_blank=True)
    current_policy_pack_code = serializers.CharField(allow_blank=True)
    current_policy_pack_version = serializers.IntegerField(allow_null=True)
    target_policy_pack_id = serializers.UUIDField()
    target_policy_pack_code = serializers.CharField()
    target_policy_pack_name = serializers.CharField()
    target_policy_pack_version = serializers.IntegerField()
    has_current_adoption = serializers.BooleanField()
    can_upgrade = serializers.BooleanField()
    counts = serializers.JSONField()
    items = PolicyPackUpgradeCompareItemSerializer(many=True)
