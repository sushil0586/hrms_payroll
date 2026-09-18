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
    AdoptionMode,
    DelegationMode,
    PlatformPolicyDelegationRule,
    PlatformPolicyItemType,
    PlatformPolicyPack,
    PlatformPolicyPackItem,
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


def _set_source_metadata(record, *, policy_pack, item, delegation_mode: str, locked_fields: list):
    record.source_kind = PolicySourceKind.PLATFORM_PACK
    record.source_pack_code = policy_pack.code
    record.source_item_key = item.item_key
    record.source_version = policy_pack.version
    record.delegation_mode = delegation_mode
    record.managed_by_platform = True
    record.platform_locked_fields = locked_fields


def _update_leave_type_from_item(*, record: LeaveType, policy_pack, item, delegation_mode: str, locked_fields: list):
    if not record.managed_by_platform:
        raise serializers.ValidationError({"detail": f"Leave type '{record.code}' is tenant-managed and cannot be upgraded automatically."})
    payload = item.payload or {}
    record.name = payload.get("name", record.name)
    record.short_code = payload.get("short_code", record.short_code)
    record.category = payload.get("category", record.category)
    record.unit = payload.get("unit", record.unit)
    record.color_code = payload.get("color_code", record.color_code)
    record.description = payload.get("description", record.description)
    record.is_active = payload.get("is_active", record.is_active)
    record.requires_attachment = payload.get("requires_attachment", record.requires_attachment)
    record.allow_negative_balance = payload.get("allow_negative_balance", record.allow_negative_balance)
    record.is_approval_required = payload.get("is_approval_required", record.is_approval_required)
    _set_source_metadata(record, policy_pack=policy_pack, item=item, delegation_mode=delegation_mode, locked_fields=locked_fields)
    record.save()
    return record


def _update_leave_policy_from_item(*, record: LeavePolicy, policy_pack, item, leave_type_map: dict, delegation_mode: str, locked_fields: list):
    if not record.managed_by_platform:
        raise serializers.ValidationError({"detail": f"Leave policy '{record.code}' is tenant-managed and cannot be upgraded automatically."})
    payload = item.payload or {}
    leave_type_key = payload.get("leave_type_item_key")
    if leave_type_key:
        leave_type = leave_type_map.get(leave_type_key)
        if leave_type is None:
            raise serializers.ValidationError({"detail": f"Leave policy item '{item.item_key}' references unknown leave type '{leave_type_key}'."})
        record.leave_type = leave_type
    record.name = payload.get("name", record.name)
    record.status = payload.get("status", record.status)
    record.effective_from = payload.get("effective_from", record.effective_from)
    record.effective_to = payload.get("effective_to", record.effective_to)
    record.accrual_frequency = payload.get("accrual_frequency", record.accrual_frequency)
    record.annual_entitlement = _decimal(payload.get("annual_entitlement", record.annual_entitlement))
    record.max_carry_forward = _decimal(payload.get("max_carry_forward", record.max_carry_forward))
    record.max_consecutive_days = _decimal(payload.get("max_consecutive_days")) if payload.get("max_consecutive_days") not in (None, "") else None
    record.min_days_per_request = _decimal(payload.get("min_days_per_request", record.min_days_per_request), default="0.5")
    record.notice_days_required = payload.get("notice_days_required", record.notice_days_required)
    record.allow_half_day = payload.get("allow_half_day", record.allow_half_day)
    record.allow_backdated_application = payload.get("allow_backdated_application", record.allow_backdated_application)
    record.allow_weekend_holiday_overlap = payload.get("allow_weekend_holiday_overlap", record.allow_weekend_holiday_overlap)
    record.sandwich_rule_enabled = payload.get("sandwich_rule_enabled", record.sandwich_rule_enabled)
    record.is_probation_eligible = payload.get("is_probation_eligible", record.is_probation_eligible)
    record.gender_restriction = payload.get("gender_restriction", record.gender_restriction)
    record.marital_status_restriction = payload.get("marital_status_restriction", record.marital_status_restriction)
    record.minimum_service_days = payload.get("minimum_service_days", record.minimum_service_days)
    record.config_snapshot = payload.get("config_snapshot", record.config_snapshot)
    _set_source_metadata(record, policy_pack=policy_pack, item=item, delegation_mode=delegation_mode, locked_fields=locked_fields)
    record.save()
    return record


def _update_shift_from_item(*, record: Shift, policy_pack, item, delegation_mode: str, locked_fields: list):
    if not record.managed_by_platform:
        raise serializers.ValidationError({"detail": f"Shift '{record.code}' is tenant-managed and cannot be upgraded automatically."})
    payload = item.payload or {}
    record.name = payload.get("name", record.name)
    if payload.get("start_time"):
        record.start_time = parse_time(payload["start_time"]) if isinstance(payload.get("start_time"), str) else payload["start_time"]
    if payload.get("end_time"):
        record.end_time = parse_time(payload["end_time"]) if isinstance(payload.get("end_time"), str) else payload["end_time"]
    record.working_hours = _decimal(payload.get("working_hours", record.working_hours))
    record.break_minutes = payload.get("break_minutes", record.break_minutes)
    record.grace_in_minutes = payload.get("grace_in_minutes", record.grace_in_minutes)
    record.grace_out_minutes = payload.get("grace_out_minutes", record.grace_out_minutes)
    record.is_night_shift = payload.get("is_night_shift", record.is_night_shift)
    record.is_flexible = payload.get("is_flexible", record.is_flexible)
    record.weekly_off_days = payload.get("weekly_off_days", record.weekly_off_days)
    record.is_active = payload.get("is_active", record.is_active)
    _set_source_metadata(record, policy_pack=policy_pack, item=item, delegation_mode=delegation_mode, locked_fields=locked_fields)
    record.save()
    return record


def _update_holiday_calendar_from_item(*, record: HolidayCalendar, policy_pack, item, delegation_mode: str, locked_fields: list):
    if not record.managed_by_platform:
        raise serializers.ValidationError({"detail": f"Holiday calendar '{record.code}' is tenant-managed and cannot be upgraded automatically."})
    payload = item.payload or {}
    record.name = payload.get("name", record.name)
    record.year = payload.get("year", record.year)
    record.is_active = payload.get("is_active", record.is_active)
    _set_source_metadata(record, policy_pack=policy_pack, item=item, delegation_mode=delegation_mode, locked_fields=locked_fields)
    record.save()
    if "holidays" in payload:
        record.holidays.all().delete()
        for holiday_payload in payload.get("holidays", []):
            holiday_date = parse_date(holiday_payload["date"]) if isinstance(holiday_payload.get("date"), str) else holiday_payload["date"]
            Holiday.objects.create(
                calendar=record,
                date=holiday_date,
                name=holiday_payload["name"],
                description=holiday_payload.get("description", ""),
                holiday_type=holiday_payload.get("holiday_type", "general"),
                is_optional=holiday_payload.get("is_optional", False),
            )
    return record


def _update_attendance_policy_from_item(*, record: AttendancePolicy, policy_pack, item, shift_map: dict, holiday_calendar_map: dict, delegation_mode: str, locked_fields: list):
    if not record.managed_by_platform:
        raise serializers.ValidationError({"detail": f"Attendance policy '{record.code}' is tenant-managed and cannot be upgraded automatically."})
    payload = item.payload or {}
    if payload.get("default_shift_item_key"):
        record.default_shift = shift_map.get(payload.get("default_shift_item_key"))
    if payload.get("holiday_calendar_item_key"):
        record.holiday_calendar = holiday_calendar_map.get(payload.get("holiday_calendar_item_key"))
    record.name = payload.get("name", record.name)
    record.status = payload.get("status", record.status)
    record.attendance_unit = payload.get("attendance_unit", record.attendance_unit)
    record.full_day_min_hours = _decimal(payload.get("full_day_min_hours", record.full_day_min_hours))
    record.half_day_min_hours = _decimal(payload.get("half_day_min_hours", record.half_day_min_hours))
    record.late_mark_after_minutes = payload.get("late_mark_after_minutes", record.late_mark_after_minutes)
    record.max_late_marks_in_period = payload.get("max_late_marks_in_period", record.max_late_marks_in_period)
    record.overtime_threshold_minutes = payload.get("overtime_threshold_minutes", record.overtime_threshold_minutes)
    record.allow_manual_entry = payload.get("allow_manual_entry", record.allow_manual_entry)
    record.allow_web_checkin = payload.get("allow_web_checkin", record.allow_web_checkin)
    record.allow_mobile_checkin = payload.get("allow_mobile_checkin", record.allow_mobile_checkin)
    record.allow_geofenced_checkin = payload.get("allow_geofenced_checkin", record.allow_geofenced_checkin)
    record.allow_regularization = payload.get("allow_regularization", record.allow_regularization)
    record.require_regularization_reason = payload.get("require_regularization_reason", record.require_regularization_reason)
    record.config_snapshot = payload.get("config_snapshot", record.config_snapshot)
    _set_source_metadata(record, policy_pack=policy_pack, item=item, delegation_mode=delegation_mode, locked_fields=locked_fields)
    record.save()
    return record


def _link_adopted_item(*, adoption: TenantPolicyPackAdoption, item, target_model: str, target_record_id):
    TenantPolicyPackItemLink.objects.create(
        tenant_adoption=adoption,
        platform_item=item,
        target_model=target_model,
        target_record_id=target_record_id,
        source_version=adoption.policy_pack.version,
    )


def _linked_record_for_model(*, target_model: str, target_record_id):
    model_map = {
        "leave_management.LeaveType": LeaveType,
        "leave_management.LeavePolicy": LeavePolicy,
        "attendance.Shift": Shift,
        "attendance.HolidayCalendar": HolidayCalendar,
        "attendance.AttendancePolicy": AttendancePolicy,
    }
    model_class = model_map.get(target_model)
    if not model_class:
        return None
    return model_class.objects.filter(id=target_record_id).first()


def _runtime_links_by_item_key(adoption: TenantPolicyPackAdoption | None) -> dict:
    if not adoption:
        return {}
    return {
        link.platform_item.item_key: link
        for link in adoption.item_links.select_related("platform_item")
        .filter(is_detached_from_source=False)
        .order_by("platform_item__sort_order")
    }


def _runtime_conflict_for_item(*, tenant, item) -> tuple[str, str, str]:
    payload = item.payload or {}
    code = payload.get("code", item.item_key)
    if item.item_type == PlatformPolicyItemType.LEAVE_TYPE:
        return ("leave_management.LeaveType", code, "code already exists") if LeaveType.objects.filter(tenant=tenant, code=code).exists() else ("", code, "")
    if item.item_type == PlatformPolicyItemType.LEAVE_POLICY:
        return ("leave_management.LeavePolicy", code, "code already exists") if LeavePolicy.objects.filter(tenant=tenant, code=code).exists() else ("", code, "")
    if item.item_type == PlatformPolicyItemType.SHIFT:
        return ("attendance.Shift", code, "code already exists") if Shift.objects.filter(tenant=tenant, code=code).exists() else ("", code, "")
    if item.item_type == PlatformPolicyItemType.HOLIDAY_CALENDAR:
        year = payload.get("year")
        exists = HolidayCalendar.objects.filter(tenant=tenant, code=code, year=year).exists()
        return ("attendance.HolidayCalendar", f"{code}/{year}", "code and year already exist") if exists else ("", f"{code}/{year}", "")
    if item.item_type == PlatformPolicyItemType.ATTENDANCE_POLICY:
        return ("attendance.AttendancePolicy", code, "code already exists") if AttendancePolicy.objects.filter(tenant=tenant, code=code).exists() else ("", code, "")
    return ("unsupported", code, "unsupported item type")


def preview_policy_pack_adoption(*, tenant, policy_pack: PlatformPolicyPack, adoption_mode: str) -> dict:
    if policy_pack.status != PlatformPolicyPackStatus.PUBLISHED:
        raise serializers.ValidationError("Only published policy packs can be previewed for adoption.")

    items = list(policy_pack.items.order_by("sort_order", "created_at"))
    if adoption_mode == AdoptionMode.BASELINE_ONLY:
        item_results = [
            {
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "evidence_only",
                "target_model": "",
                "target_key": "",
                "message": "Baseline-only mode records evidence without creating tenant runtime records.",
                "severity": "info",
            }
            for item in items
        ]
    else:
        available_keys: set[str] = set()
        item_results = []
        for item in items:
            missing_dependencies = [key for key in item.dependency_keys if key not in available_keys]
            if missing_dependencies:
                item_results.append({
                    "item_key": item.item_key,
                    "item_type": item.item_type,
                    "name": item.name,
                    "action": "blocked",
                    "target_model": "",
                    "target_key": "",
                    "message": f"Missing dependencies: {', '.join(missing_dependencies)}.",
                    "severity": "error",
                })
                continue

            target_model, target_key, conflict_message = _runtime_conflict_for_item(tenant=tenant, item=item)
            if target_model == "unsupported":
                item_results.append({
                    "item_key": item.item_key,
                    "item_type": item.item_type,
                    "name": item.name,
                    "action": "blocked",
                    "target_model": "",
                    "target_key": target_key,
                    "message": conflict_message,
                    "severity": "error",
                })
                continue
            if conflict_message:
                item_results.append({
                    "item_key": item.item_key,
                    "item_type": item.item_type,
                    "name": item.name,
                    "action": "conflict",
                    "target_model": target_model,
                    "target_key": target_key,
                    "message": conflict_message,
                    "severity": "warning",
                })
                continue

            target_model_by_type = {
                PlatformPolicyItemType.LEAVE_TYPE: "leave_management.LeaveType",
                PlatformPolicyItemType.LEAVE_POLICY: "leave_management.LeavePolicy",
                PlatformPolicyItemType.SHIFT: "attendance.Shift",
                PlatformPolicyItemType.HOLIDAY_CALENDAR: "attendance.HolidayCalendar",
                PlatformPolicyItemType.ATTENDANCE_POLICY: "attendance.AttendancePolicy",
            }
            item_results.append({
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "create",
                "target_model": target_model_by_type.get(item.item_type, ""),
                "target_key": target_key,
                "message": "Ready to create tenant runtime record.",
                "severity": "success",
            })
            available_keys.add(item.item_key)

    counts = {
        "total": len(item_results),
        "create": sum(1 for item in item_results if item["action"] == "create"),
        "conflict": sum(1 for item in item_results if item["action"] == "conflict"),
        "blocked": sum(1 for item in item_results if item["action"] == "blocked"),
        "evidence_only": sum(1 for item in item_results if item["action"] == "evidence_only"),
    }
    return {
        "tenant_id": str(tenant.id),
        "tenant_code": tenant.code,
        "policy_pack_id": str(policy_pack.id),
        "policy_pack_code": policy_pack.code,
        "policy_pack_name": policy_pack.name,
        "policy_pack_version": policy_pack.version,
        "adoption_mode": adoption_mode,
        "can_apply": counts["blocked"] == 0 and counts["conflict"] == 0,
        "counts": counts,
        "items": item_results,
    }


def compare_policy_pack_upgrade(*, tenant, target_policy_pack: PlatformPolicyPack) -> dict:
    if target_policy_pack.status != PlatformPolicyPackStatus.PUBLISHED:
        raise serializers.ValidationError("Only published policy packs can be compared for tenant upgrade.")

    root_pack = _version_root(target_policy_pack)
    lineage_pack_ids = [root_pack.id, *list(root_pack.derived_versions.values_list("id", flat=True))]
    current_adoption = (
        TenantPolicyPackAdoption.objects.select_related("policy_pack")
        .prefetch_related("item_links__platform_item")
        .filter(
            tenant=tenant,
            policy_pack_id__in=lineage_pack_ids,
            status=TenantPolicyAdoptionStatus.ADOPTED,
        )
        .order_by("-adopted_at", "-created_at")
        .first()
    )

    target_items = {
        item.item_key: item
        for item in target_policy_pack.items.order_by("sort_order", "item_key")
    }
    current_items = {
        item.item_key: item
        for item in current_adoption.policy_pack.items.order_by("sort_order", "item_key")
    } if current_adoption else {}
    detached_item_keys = set()
    if current_adoption:
        detached_item_keys = {
            link.platform_item.item_key
            for link in current_adoption.item_links.all()
            if link.is_detached_from_source
        }

    compare_keys = sorted(
        set(target_items) | set(current_items),
        key=lambda key: (
            target_items.get(key).sort_order if key in target_items else current_items[key].sort_order,
            key,
        ),
    )
    item_results = []
    for key in compare_keys:
        target_item = target_items.get(key)
        current_item = current_items.get(key)
        if target_item and not current_item:
            action = "add"
            severity = "success"
            message = "New item exists in the target template version."
            item_type = target_item.item_type
            name = target_item.name
        elif current_item and not target_item:
            action = "remove"
            severity = "warning"
            message = "Current tenant adoption has an item that is not present in the target template version."
            item_type = current_item.item_type
            name = current_item.name
        elif current_item and target_item:
            changed_fields = []
            if current_item.item_type != target_item.item_type:
                changed_fields.append("item_type")
            if current_item.name != target_item.name:
                changed_fields.append("name")
            if current_item.payload != target_item.payload:
                changed_fields.append("payload")
            if current_item.dependency_keys != target_item.dependency_keys:
                changed_fields.append("dependencies")
            if current_item.is_required != target_item.is_required:
                changed_fields.append("required")
            if key in detached_item_keys:
                action = "detached"
                severity = "warning"
                message = "Tenant record was detached from platform management; upgrade should be reviewed manually."
            elif changed_fields:
                action = "change"
                severity = "warning"
                message = f"Target version changes: {', '.join(changed_fields)}."
            else:
                action = "unchanged"
                severity = "info"
                message = "No template item change detected."
            item_type = target_item.item_type
            name = target_item.name or current_item.name
        else:
            continue

        item_results.append({
            "item_key": key,
            "item_type": item_type,
            "name": name,
            "action": action,
            "current_version": current_adoption.policy_pack.version if current_adoption else None,
            "target_version": target_policy_pack.version,
            "message": message,
            "severity": severity,
        })

    counts = {
        "total": len(item_results),
        "add": sum(1 for item in item_results if item["action"] == "add"),
        "change": sum(1 for item in item_results if item["action"] == "change"),
        "remove": sum(1 for item in item_results if item["action"] == "remove"),
        "unchanged": sum(1 for item in item_results if item["action"] == "unchanged"),
        "detached": sum(1 for item in item_results if item["action"] == "detached"),
    }
    return {
        "tenant_id": str(tenant.id),
        "tenant_code": tenant.code,
        "current_policy_pack_id": str(current_adoption.policy_pack_id) if current_adoption else "",
        "current_policy_pack_code": current_adoption.policy_pack.code if current_adoption else "",
        "current_policy_pack_version": current_adoption.policy_pack.version if current_adoption else None,
        "target_policy_pack_id": str(target_policy_pack.id),
        "target_policy_pack_code": target_policy_pack.code,
        "target_policy_pack_name": target_policy_pack.name,
        "target_policy_pack_version": target_policy_pack.version,
        "has_current_adoption": bool(current_adoption),
        "can_upgrade": counts["detached"] == 0,
        "counts": counts,
        "items": item_results,
    }


@transaction.atomic
def upgrade_policy_pack_for_tenant(
    *,
    tenant,
    target_policy_pack: PlatformPolicyPack,
    notes: str = "",
    actor_identifier: str = "",
) -> TenantPolicyPackAdoption:
    comparison = compare_policy_pack_upgrade(tenant=tenant, target_policy_pack=target_policy_pack)
    if not comparison["has_current_adoption"]:
        return adopt_policy_pack_for_tenant(
            tenant=tenant,
            policy_pack=target_policy_pack,
            adoption_mode=AdoptionMode.CLONE_TO_TENANT_RECORDS,
            notes=notes,
            actor_identifier=actor_identifier,
        )
    if comparison["counts"]["detached"]:
        raise serializers.ValidationError({
            "detail": "Detached tenant records require manual review before applying a template upgrade."
        })

    current_adoption = (
        TenantPolicyPackAdoption.objects.select_related("policy_pack")
        .prefetch_related("item_links__platform_item")
        .get(id=TenantPolicyPackAdoption.objects.filter(
            tenant=tenant,
            policy_pack_id=comparison["current_policy_pack_id"],
            status=TenantPolicyAdoptionStatus.ADOPTED,
        ).order_by("-adopted_at", "-created_at").values_list("id", flat=True).first())
    )
    current_links = _runtime_links_by_item_key(current_adoption)
    adoption = TenantPolicyPackAdoption.objects.create(
        tenant=tenant,
        policy_pack=target_policy_pack,
        status=TenantPolicyAdoptionStatus.ADOPTED,
        adoption_mode=AdoptionMode.CLONE_TO_TENANT_RECORDS,
        adopted_at=timezone.now(),
        adopted_by_identifier=actor_identifier,
        notes=notes,
    )

    leave_type_map = {}
    shift_map = {}
    holiday_calendar_map = {}
    item_results = []
    target_items = list(target_policy_pack.items.order_by("sort_order", "created_at"))
    target_item_keys = {item.item_key for item in target_items}

    for item in target_items:
        delegation_mode, locked_fields = _item_delegation_metadata(target_policy_pack, item.item_key)
        current_link = current_links.get(item.item_key)
        current_record = _linked_record_for_model(
            target_model=current_link.target_model,
            target_record_id=current_link.target_record_id,
        ) if current_link else None

        action = "updated" if current_record else "created"
        if item.item_type == PlatformPolicyItemType.LEAVE_TYPE:
            runtime_record = _update_leave_type_from_item(
                record=current_record,
                policy_pack=target_policy_pack,
                item=item,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            ) if current_record else _clone_leave_type_for_tenant(
                tenant=tenant,
                policy_pack=target_policy_pack,
                item=item,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            leave_type_map[item.item_key] = runtime_record
            target_model = "leave_management.LeaveType"
        elif item.item_type == PlatformPolicyItemType.LEAVE_POLICY:
            runtime_record = _update_leave_policy_from_item(
                record=current_record,
                policy_pack=target_policy_pack,
                item=item,
                leave_type_map=leave_type_map,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            ) if current_record else _clone_leave_policy_for_tenant(
                tenant=tenant,
                policy_pack=target_policy_pack,
                item=item,
                leave_type_map=leave_type_map,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            target_model = "leave_management.LeavePolicy"
        elif item.item_type == PlatformPolicyItemType.SHIFT:
            runtime_record = _update_shift_from_item(
                record=current_record,
                policy_pack=target_policy_pack,
                item=item,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            ) if current_record else _clone_shift_for_tenant(
                tenant=tenant,
                policy_pack=target_policy_pack,
                item=item,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            shift_map[item.item_key] = runtime_record
            target_model = "attendance.Shift"
        elif item.item_type == PlatformPolicyItemType.HOLIDAY_CALENDAR:
            runtime_record = _update_holiday_calendar_from_item(
                record=current_record,
                policy_pack=target_policy_pack,
                item=item,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            ) if current_record else _clone_holiday_calendar_for_tenant(
                tenant=tenant,
                policy_pack=target_policy_pack,
                item=item,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            holiday_calendar_map[item.item_key] = runtime_record
            target_model = "attendance.HolidayCalendar"
        elif item.item_type == PlatformPolicyItemType.ATTENDANCE_POLICY:
            runtime_record = _update_attendance_policy_from_item(
                record=current_record,
                policy_pack=target_policy_pack,
                item=item,
                shift_map=shift_map,
                holiday_calendar_map=holiday_calendar_map,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            ) if current_record else _clone_attendance_policy_for_tenant(
                tenant=tenant,
                policy_pack=target_policy_pack,
                item=item,
                shift_map=shift_map,
                holiday_calendar_map=holiday_calendar_map,
                delegation_mode=delegation_mode,
                locked_fields=locked_fields,
            )
            target_model = "attendance.AttendancePolicy"
        else:
            item_results.append({
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "skipped",
                "target_model": "",
                "target_record_id": "",
                "message": "Unsupported item type was skipped.",
                "severity": "warning",
            })
            continue

        _link_adopted_item(
            adoption=adoption,
            item=item,
            target_model=target_model,
            target_record_id=runtime_record.id,
        )
        item_results.append({
            "item_key": item.item_key,
            "item_type": item.item_type,
            "name": item.name,
            "action": action,
            "target_model": target_model,
            "target_record_id": str(runtime_record.id),
            "message": f"{action.title()} tenant runtime record during template upgrade.",
            "severity": "success",
        })

    for item_key, current_link in current_links.items():
        if item_key in target_item_keys:
            continue
        item_results.append({
            "item_key": item_key,
            "item_type": current_link.platform_item.item_type,
            "name": current_link.platform_item.name,
            "action": "skipped",
            "target_model": current_link.target_model,
            "target_record_id": str(current_link.target_record_id),
            "message": "Target template no longer contains this item; tenant runtime record was retained for manual review.",
            "severity": "warning",
        })

    result_summary = _adoption_result_summary(
        tenant=tenant,
        policy_pack=target_policy_pack,
        adoption_mode=AdoptionMode.CLONE_TO_TENANT_RECORDS,
        item_results=item_results,
    )
    adoption.result_summary = result_summary

    add_onboarding_event(
        tenant.onboarding_record,
        event_type="baseline_published",
        summary=f"Policy pack {target_policy_pack.code} upgrade applied for {tenant.code}.",
        actor_identifier=actor_identifier,
        payload={
            "policy_pack_id": str(target_policy_pack.id),
            "policy_pack_code": target_policy_pack.code,
            "adoption_id": str(adoption.id),
            "domain": target_policy_pack.domain,
            "upgrade_from_policy_pack_id": comparison["current_policy_pack_id"],
            "upgrade_from_policy_pack_code": comparison["current_policy_pack_code"],
            "upgrade_from_policy_pack_version": comparison["current_policy_pack_version"],
            "result_summary": result_summary,
        },
    )
    return adoption


def _adoption_result_summary(*, tenant, policy_pack: PlatformPolicyPack, adoption_mode: str, item_results: list[dict]) -> dict:
    counts = {
        "total": len(item_results),
        "created": sum(1 for item in item_results if item["action"] == "created"),
        "updated": sum(1 for item in item_results if item["action"] == "updated"),
        "skipped": sum(1 for item in item_results if item["action"] == "skipped"),
        "failed": sum(1 for item in item_results if item["action"] == "failed"),
        "evidence_only": sum(1 for item in item_results if item["action"] == "evidence_only"),
    }
    return {
        "tenant_id": str(tenant.id),
        "tenant_code": tenant.code,
        "policy_pack_id": str(policy_pack.id),
        "policy_pack_code": policy_pack.code,
        "policy_pack_name": policy_pack.name,
        "policy_pack_version": policy_pack.version,
        "adoption_mode": adoption_mode,
        "counts": counts,
        "items": item_results,
    }


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


def _version_root(policy_pack: PlatformPolicyPack) -> PlatformPolicyPack:
    return policy_pack.source_pack or policy_pack


def _next_version_number(root_pack: PlatformPolicyPack) -> int:
    descendant_versions = list(root_pack.derived_versions.values_list("version", flat=True))
    return max([root_pack.version, *descendant_versions], default=root_pack.version) + 1


def _version_code(root_code: str, version: int) -> str:
    suffix = f"-v{version}"
    return f"{root_code[:80 - len(suffix)]}{suffix}"


@transaction.atomic
def clone_policy_pack_new_version(policy_pack: PlatformPolicyPack) -> PlatformPolicyPack:
    if policy_pack.status != PlatformPolicyPackStatus.PUBLISHED:
        raise serializers.ValidationError({"status": "Only published setup templates can be cloned into a new version."})

    root_pack = _version_root(policy_pack)
    next_version = _next_version_number(root_pack)
    next_code = _version_code(root_pack.code, next_version)
    while PlatformPolicyPack.objects.filter(code=next_code).exists():
        next_version += 1
        next_code = _version_code(root_pack.code, next_version)

    cloned_pack = PlatformPolicyPack.objects.create(
        source_pack=root_pack,
        code=next_code,
        name=f"{root_pack.name} v{next_version}",
        domain=policy_pack.domain,
        country_code=policy_pack.country_code,
        industry_tag=policy_pack.industry_tag,
        description=policy_pack.description,
        status=PlatformPolicyPackStatus.DRAFT,
        version=next_version,
        is_active=policy_pack.is_active,
    )

    PlatformPolicyPackItem.objects.bulk_create([
        PlatformPolicyPackItem(
            policy_pack=cloned_pack,
            item_type=item.item_type,
            item_key=item.item_key,
            name=item.name,
            payload=item.payload,
            dependency_keys=item.dependency_keys,
            sort_order=item.sort_order,
            is_required=item.is_required,
        )
        for item in policy_pack.items.order_by("sort_order", "item_key")
    ])
    PlatformPolicyDelegationRule.objects.bulk_create([
        PlatformPolicyDelegationRule(
            policy_pack=cloned_pack,
            item_key=rule.item_key,
            delegation_mode=rule.delegation_mode,
            editable_paths=rule.editable_paths,
            locked_paths=rule.locked_paths,
            notes=rule.notes,
        )
        for rule in policy_pack.delegation_rules.order_by("item_key")
    ])
    return cloned_pack


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
    item_results = []

    for item in ordered_items:
        if adoption_mode == AdoptionMode.BASELINE_ONLY:
            item_results.append({
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "evidence_only",
                "target_model": "",
                "target_record_id": "",
                "message": "Recorded setup evidence without creating tenant runtime record.",
                "severity": "info",
            })
            continue

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
            item_results.append({
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "created",
                "target_model": "leave_management.LeaveType",
                "target_record_id": str(leave_type.id),
                "message": "Leave type created.",
                "severity": "success",
            })
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
            item_results.append({
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "created",
                "target_model": "leave_management.LeavePolicy",
                "target_record_id": str(leave_policy.id),
                "message": "Leave policy created.",
                "severity": "success",
            })
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
            item_results.append({
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "created",
                "target_model": "attendance.Shift",
                "target_record_id": str(shift.id),
                "message": "Shift created.",
                "severity": "success",
            })
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
            item_results.append({
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "created",
                "target_model": "attendance.HolidayCalendar",
                "target_record_id": str(holiday_calendar.id),
                "message": "Holiday calendar created.",
                "severity": "success",
            })
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
            item_results.append({
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "created",
                "target_model": "attendance.AttendancePolicy",
                "target_record_id": str(attendance_policy.id),
                "message": "Attendance policy created.",
                "severity": "success",
            })
        else:
            item_results.append({
                "item_key": item.item_key,
                "item_type": item.item_type,
                "name": item.name,
                "action": "skipped",
                "target_model": "",
                "target_record_id": "",
                "message": "Unsupported item type was skipped.",
                "severity": "warning",
            })

    result_summary = _adoption_result_summary(
        tenant=tenant,
        policy_pack=policy_pack,
        adoption_mode=adoption_mode,
        item_results=item_results,
    )
    adoption.result_summary = result_summary

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
            "result_summary": result_summary,
        },
    )
    return adoption
