"""Services for platform policy pack publication and tenant adoption."""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_time
from rest_framework import serializers

from apps.attendance.models import AttendancePolicy, AttendancePolicyStatus, Holiday, HolidayCalendar, Shift
from apps.leave_management.models import (
    AccrualFrequency,
    LeaveCategory,
    LeavePolicy,
    LeavePolicyStatus,
    LeaveType,
    LeaveUnit,
)
from apps.platform_policies.models import (
    DelegationMode,
    PlatformPolicyItemType,
    PlatformPolicyPack,
    PlatformPolicyPackStatus,
    PolicySourceKind,
    TenantPolicyPackAdoption,
    TenantPolicyAdoptionStatus,
    TenantPolicyPackItemLink,
)
from apps.tenant_onboarding.models import ChecklistStatus
from apps.tenant_onboarding.services import add_onboarding_event, set_checklist_item_status
from apps.tenants.models import TenantOnboardingStatus


def _decimal(value, default="0"):
    if value in (None, ""):
        return Decimal(default)
    return Decimal(str(value))


def _item_delegation_metadata(policy_pack: PlatformPolicyPack, item_key: str) -> tuple[str, list]:
    item_rule = policy_pack.delegation_rules.filter(item_key=item_key).first()
    pack_rule = policy_pack.delegation_rules.filter(item_key="").first()
    rule = item_rule or pack_rule
    if not rule:
        return DelegationMode.TENANT_EDITABLE, []
    return rule.delegation_mode, list(rule.locked_paths or [])


def _clone_leave_type_for_tenant(*, tenant, policy_pack, item, delegation_mode: str, locked_fields: list):
    payload = item.payload or {}
    return LeaveType.objects.create(
        tenant=tenant,
        code=payload.get("code", item.item_key),
        name=payload.get("name", item.name or item.item_key.replace("-", " ").title()),
        short_code=payload.get("short_code", ""),
        category=payload.get("category", LeaveCategory.PAID),
        unit=payload.get("unit", LeaveUnit.DAY),
        color_code=payload.get("color_code", ""),
        description=payload.get("description", ""),
        is_active=payload.get("is_active", True),
        is_system_seeded=True,
        requires_attachment=payload.get("requires_attachment", False),
        allow_negative_balance=payload.get("allow_negative_balance", False),
        is_approval_required=payload.get("is_approval_required", True),
        source_kind=PolicySourceKind.PLATFORM_PACK,
        source_pack_code=policy_pack.code,
        source_item_key=item.item_key,
        source_version=policy_pack.version,
        delegation_mode=delegation_mode,
        managed_by_platform=True,
        platform_locked_fields=locked_fields,
    )


def _clone_leave_policy_for_tenant(*, tenant, policy_pack, item, leave_type_map: dict, delegation_mode: str, locked_fields: list):
    payload = item.payload or {}
    leave_type_key = payload.get("leave_type_item_key")
    leave_type = leave_type_map.get(leave_type_key)
    if leave_type is None:
        raise serializers.ValidationError({"detail": f"Leave policy item '{item.item_key}' references unknown leave type '{leave_type_key}'."})
    return LeavePolicy.objects.create(
        tenant=tenant,
        leave_type=leave_type,
        code=payload.get("code", item.item_key),
        name=payload.get("name", item.name or item.item_key.replace("-", " ").title()),
        status=payload.get("status", LeavePolicyStatus.DRAFT),
        effective_from=payload.get("effective_from"),
        effective_to=payload.get("effective_to"),
        accrual_frequency=payload.get("accrual_frequency", AccrualFrequency.NONE),
        annual_entitlement=_decimal(payload.get("annual_entitlement")),
        max_carry_forward=_decimal(payload.get("max_carry_forward")),
        max_consecutive_days=_decimal(payload.get("max_consecutive_days")) if payload.get("max_consecutive_days") not in (None, "") else None,
        min_days_per_request=_decimal(payload.get("min_days_per_request"), default="0.5"),
        notice_days_required=payload.get("notice_days_required", 0),
        allow_half_day=payload.get("allow_half_day", False),
        allow_backdated_application=payload.get("allow_backdated_application", False),
        allow_weekend_holiday_overlap=payload.get("allow_weekend_holiday_overlap", False),
        sandwich_rule_enabled=payload.get("sandwich_rule_enabled", False),
        is_probation_eligible=payload.get("is_probation_eligible", True),
        gender_restriction=payload.get("gender_restriction", ""),
        marital_status_restriction=payload.get("marital_status_restriction", ""),
        minimum_service_days=payload.get("minimum_service_days", 0),
        config_snapshot=payload.get("config_snapshot", {}),
        source_kind=PolicySourceKind.PLATFORM_PACK,
        source_pack_code=policy_pack.code,
        source_item_key=item.item_key,
        source_version=policy_pack.version,
        delegation_mode=delegation_mode,
        managed_by_platform=True,
        platform_locked_fields=locked_fields,
    )


def _clone_shift_for_tenant(*, tenant, policy_pack, item, delegation_mode: str, locked_fields: list):
    payload = item.payload or {}
    start_time = parse_time(payload["start_time"]) if isinstance(payload.get("start_time"), str) else payload["start_time"]
    end_time = parse_time(payload["end_time"]) if isinstance(payload.get("end_time"), str) else payload["end_time"]
    return Shift.objects.create(
        tenant=tenant,
        code=payload.get("code", item.item_key),
        name=payload.get("name", item.name or item.item_key.replace("-", " ").title()),
        start_time=start_time,
        end_time=end_time,
        working_hours=_decimal(payload.get("working_hours")),
        break_minutes=payload.get("break_minutes", 0),
        grace_in_minutes=payload.get("grace_in_minutes", 0),
        grace_out_minutes=payload.get("grace_out_minutes", 0),
        is_night_shift=payload.get("is_night_shift", False),
        is_flexible=payload.get("is_flexible", False),
        weekly_off_days=payload.get("weekly_off_days", []),
        is_active=payload.get("is_active", True),
        source_kind=PolicySourceKind.PLATFORM_PACK,
        source_pack_code=policy_pack.code,
        source_item_key=item.item_key,
        source_version=policy_pack.version,
        delegation_mode=delegation_mode,
        managed_by_platform=True,
        platform_locked_fields=locked_fields,
    )


def _clone_holiday_calendar_for_tenant(*, tenant, policy_pack, item, delegation_mode: str, locked_fields: list):
    payload = item.payload or {}
    calendar = HolidayCalendar.objects.create(
        tenant=tenant,
        code=payload.get("code", item.item_key),
        name=payload.get("name", item.name or item.item_key.replace("-", " ").title()),
        year=payload["year"],
        is_active=payload.get("is_active", True),
        source_kind=PolicySourceKind.PLATFORM_PACK,
        source_pack_code=policy_pack.code,
        source_item_key=item.item_key,
        source_version=policy_pack.version,
        delegation_mode=delegation_mode,
        managed_by_platform=True,
        platform_locked_fields=locked_fields,
    )
    for holiday_payload in payload.get("holidays", []):
        holiday_date = parse_date(holiday_payload["date"]) if isinstance(holiday_payload.get("date"), str) else holiday_payload["date"]
        Holiday.objects.create(
            calendar=calendar,
            date=holiday_date,
            name=holiday_payload["name"],
            description=holiday_payload.get("description", ""),
            holiday_type=holiday_payload.get("holiday_type", "general"),
            is_optional=holiday_payload.get("is_optional", False),
        )
    return calendar


def _clone_attendance_policy_for_tenant(*, tenant, policy_pack, item, shift_map: dict, holiday_calendar_map: dict, delegation_mode: str, locked_fields: list):
    payload = item.payload or {}
    default_shift = shift_map.get(payload.get("default_shift_item_key")) if payload.get("default_shift_item_key") else None
    holiday_calendar = holiday_calendar_map.get(payload.get("holiday_calendar_item_key")) if payload.get("holiday_calendar_item_key") else None
    return AttendancePolicy.objects.create(
        tenant=tenant,
        code=payload.get("code", item.item_key),
        name=payload.get("name", item.name or item.item_key.replace("-", " ").title()),
        status=payload.get("status", AttendancePolicyStatus.DRAFT),
        attendance_unit=payload.get("attendance_unit", "day"),
        default_shift=default_shift,
        holiday_calendar=holiday_calendar,
        full_day_min_hours=_decimal(payload.get("full_day_min_hours")),
        half_day_min_hours=_decimal(payload.get("half_day_min_hours")),
        late_mark_after_minutes=payload.get("late_mark_after_minutes", 0),
        max_late_marks_in_period=payload.get("max_late_marks_in_period", 0),
        overtime_threshold_minutes=payload.get("overtime_threshold_minutes", 0),
        allow_manual_entry=payload.get("allow_manual_entry", True),
        allow_web_checkin=payload.get("allow_web_checkin", True),
        allow_mobile_checkin=payload.get("allow_mobile_checkin", True),
        allow_geofenced_checkin=payload.get("allow_geofenced_checkin", False),
        allow_regularization=payload.get("allow_regularization", True),
        require_regularization_reason=payload.get("require_regularization_reason", True),
        config_snapshot=payload.get("config_snapshot", {}),
        source_kind=PolicySourceKind.PLATFORM_PACK,
        source_pack_code=policy_pack.code,
        source_item_key=item.item_key,
        source_version=policy_pack.version,
        delegation_mode=delegation_mode,
        managed_by_platform=True,
        platform_locked_fields=locked_fields,
    )


def _link_adopted_item(*, adoption: TenantPolicyPackAdoption, item, target_model: str, target_record_id):
    TenantPolicyPackItemLink.objects.create(
        tenant_adoption=adoption,
        platform_item=item,
        target_model=target_model,
        target_record_id=target_record_id,
        source_version=adoption.policy_pack.version,
    )


def detach_runtime_item_from_platform_source(*, policy_item, actor_identifier: str = ""):
    if not getattr(policy_item, "managed_by_platform", False):
        raise serializers.ValidationError("This record is already tenant-managed.")
    if getattr(policy_item, "source_kind", "") != PolicySourceKind.PLATFORM_PACK:
        raise serializers.ValidationError("Only platform-pack-backed records can be detached.")

    if isinstance(policy_item, LeaveType):
        target_model = "leave_management.LeaveType"
    elif isinstance(policy_item, LeavePolicy):
        target_model = "leave_management.LeavePolicy"
    elif isinstance(policy_item, Shift):
        target_model = "attendance.Shift"
    elif isinstance(policy_item, HolidayCalendar):
        target_model = "attendance.HolidayCalendar"
    elif isinstance(policy_item, AttendancePolicy):
        target_model = "attendance.AttendancePolicy"
    else:
        raise serializers.ValidationError("Unsupported record type for detach.")

    TenantPolicyPackItemLink.objects.filter(
        target_model=target_model,
        target_record_id=policy_item.id,
        is_detached_from_source=False,
    ).update(is_detached_from_source=True, updated_at=timezone.now())

    policy_item.source_kind = PolicySourceKind.TENANT_CLONE
    policy_item.managed_by_platform = False
    policy_item.delegation_mode = ""
    policy_item.platform_locked_fields = []
    policy_item.save(
        update_fields=[
            "source_kind",
            "managed_by_platform",
            "delegation_mode",
            "platform_locked_fields",
            "updated_at",
        ]
    )
    return policy_item


def detach_runtime_policy_from_platform_source(*, policy_item, actor_identifier: str = ""):
    return detach_runtime_item_from_platform_source(
        policy_item=policy_item,
        actor_identifier=actor_identifier,
    )


@transaction.atomic
def mark_policy_pack_published(policy_pack: PlatformPolicyPack, *, actor_identifier: str = "") -> PlatformPolicyPack:
    policy_pack.status = PlatformPolicyPackStatus.PUBLISHED
    policy_pack.published_at = timezone.now()
    policy_pack.published_by_identifier = actor_identifier
    policy_pack.save(update_fields=["status", "published_at", "published_by_identifier", "updated_at"])
    return policy_pack


@transaction.atomic
def adopt_policy_pack_for_tenant(
    *,
    tenant,
    policy_pack: PlatformPolicyPack,
    adoption_mode: str,
    notes: str = "",
    actor_identifier: str = "",
) -> TenantPolicyPackAdoption:
    if policy_pack.status != PlatformPolicyPackStatus.PUBLISHED:
        raise serializers.ValidationError("Only published policy packs can be adopted.")

    adoption = TenantPolicyPackAdoption.objects.create(
        tenant=tenant,
        policy_pack=policy_pack,
        status=TenantPolicyAdoptionStatus.ADOPTED,
        adoption_mode=adoption_mode,
        adopted_at=timezone.now(),
        adopted_by_identifier=actor_identifier,
        notes=notes,
    )

    leave_type_map = {}
    shift_map = {}
    holiday_calendar_map = {}
    ordered_items = list(policy_pack.items.order_by("sort_order", "created_at"))

    for item in ordered_items:
        delegation_mode, locked_fields = _item_delegation_metadata(policy_pack, item.item_key)
        if item.item_type == PlatformPolicyItemType.LEAVE_TYPE:
            leave_type = _clone_leave_type_for_tenant(
                tenant=tenant,
                policy_pack=policy_pack,
                item=item,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            leave_type_map[item.item_key] = leave_type
            _link_adopted_item(
                adoption=adoption,
                item=item,
                target_model="leave_management.LeaveType",
                target_record_id=leave_type.id,
            )
        elif item.item_type == PlatformPolicyItemType.LEAVE_POLICY:
            leave_policy = _clone_leave_policy_for_tenant(
                tenant=tenant,
                policy_pack=policy_pack,
                item=item,
                leave_type_map=leave_type_map,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            _link_adopted_item(
                adoption=adoption,
                item=item,
                target_model="leave_management.LeavePolicy",
                target_record_id=leave_policy.id,
            )
        elif item.item_type == PlatformPolicyItemType.SHIFT:
            shift = _clone_shift_for_tenant(
                tenant=tenant,
                policy_pack=policy_pack,
                item=item,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            shift_map[item.item_key] = shift
            _link_adopted_item(
                adoption=adoption,
                item=item,
                target_model="attendance.Shift",
                target_record_id=shift.id,
            )
        elif item.item_type == PlatformPolicyItemType.HOLIDAY_CALENDAR:
            holiday_calendar = _clone_holiday_calendar_for_tenant(
                tenant=tenant,
                policy_pack=policy_pack,
                item=item,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            holiday_calendar_map[item.item_key] = holiday_calendar
            _link_adopted_item(
                adoption=adoption,
                item=item,
                target_model="attendance.HolidayCalendar",
                target_record_id=holiday_calendar.id,
            )
        elif item.item_type == PlatformPolicyItemType.ATTENDANCE_POLICY:
            attendance_policy = _clone_attendance_policy_for_tenant(
                tenant=tenant,
                policy_pack=policy_pack,
                item=item,
                shift_map=shift_map,
                holiday_calendar_map=holiday_calendar_map,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            _link_adopted_item(
                adoption=adoption,
                item=item,
                target_model="attendance.AttendancePolicy",
                target_record_id=attendance_policy.id,
            )

    onboarding = tenant.onboarding_record
    onboarding.baseline_published_at = adoption.adopted_at
    onboarding.save(update_fields=["baseline_published_at", "updated_at"])
    tenant.onboarding_status = TenantOnboardingStatus.BASELINE_PUBLISHED
    tenant.save(update_fields=["onboarding_status", "updated_at"])

    set_checklist_item_status(
        onboarding,
        code="baseline_published",
        status=ChecklistStatus.COMPLETED,
        actor_identifier=actor_identifier,
    )
    add_onboarding_event(
        onboarding,
        event_type="baseline_published",
        summary=f"Policy pack {policy_pack.code} adopted for {tenant.code}.",
        actor_identifier=actor_identifier,
        payload={
            "policy_pack_id": str(policy_pack.id),
            "policy_pack_code": policy_pack.code,
            "adoption_id": str(adoption.id),
            "domain": policy_pack.domain,
        },
    )
    return adoption
