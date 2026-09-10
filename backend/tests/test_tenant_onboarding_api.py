import pytest
from rest_framework.test import APIClient

from apps.attendance.models import AttendancePolicy, Holiday, HolidayCalendar, Shift
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, Role, TenantMembership, User
from apps.leave_management.models import LeavePolicy, LeaveType
from apps.platform_policies.models import (
    PlatformPolicyPack,
    PlatformPolicyDelegationRule,
    PlatformPolicyPackItem,
    PlatformPolicyPackStatus,
    TenantPolicyPackItemLink,
)
from apps.tenants.models import Tenant, TenantOnboardingStatus, TenantStatus


PASSWORD = "Password@123"


@pytest.fixture()
def platform_staff_user(db):
    return User.objects.create_user(
        username="platform.admin",
        email="platform.admin@example.com",
        password=PASSWORD,
        is_staff=True,
        is_superuser=True,
        is_active=True,
        display_name="Platform Admin",
    )


@pytest.fixture()
def api_client():
    return APIClient()


def create_tenant_hr_admin_user(*, tenant: Tenant, username: str, email: str) -> User:
    user = User.objects.create_user(
        username=username,
        email=email,
        password=PASSWORD,
        is_active=True,
        display_name=username.replace(".", " ").title(),
    )
    membership = TenantMembership.objects.create(
        tenant=tenant,
        user=user,
        employee_code=f"{username[:8].upper()}-001",
        status="active",
        is_default=True,
    )
    role, _ = Role.objects.get_or_create(
        tenant=tenant,
        code="hr-admin",
        defaults={"name": "HR Admin", "is_system_role": True, "is_active": True},
    )
    MembershipRole.objects.create(
        membership=membership,
        role=role,
        is_primary=True,
    )
    Employee.objects.create(
        tenant=tenant,
        membership=membership,
        employee_code=membership.employee_code,
        first_name="Tenant",
        last_name="Admin",
        preferred_name="Tenant",
        work_email=email,
        employment_status=EmploymentStatus.ACTIVE,
    )
    return user


@pytest.mark.django_db
def test_platform_staff_can_create_tenant_and_seed_onboarding(api_client: APIClient, platform_staff_user: User):
    api_client.force_authenticate(user=platform_staff_user)

    response = api_client.post(
        "/api/v1/platform/tenants/",
        {
            "code": "atlas-dynamics",
            "name": "Atlas Dynamics",
            "primary_email": "ops@atlas.example",
            "country_code": "IN",
            "primary_domain": "atlas.example.local",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["code"] == "atlas-dynamics"
    assert payload["onboarding_status"] == TenantOnboardingStatus.CREATED
    assert payload["primary_domain"] == "atlas.example.local"

    tenant = Tenant.objects.get(code="atlas-dynamics")
    checklist_codes = list(tenant.onboarding_record.checklist_items.filter(status="completed").values_list("code", flat=True))
    assert "tenant_created" in checklist_codes
    assert "domain_mapped" in checklist_codes


@pytest.mark.django_db
def test_platform_staff_can_provision_first_admin_and_activate_tenant(api_client: APIClient, platform_staff_user: User):
    api_client.force_authenticate(user=platform_staff_user)
    tenant = Tenant.objects.create(
        code="northstar-labs",
        name="Northstar Labs",
        onboarding_status=TenantOnboardingStatus.CREATED,
    )

    onboarding_patch_response = api_client.patch(
        f"/api/v1/platform/tenants/{tenant.id}/onboarding/",
        {
            "owner_mode": "combined_platform_admin",
            "setup_style": "platform_assisted",
            "policy_control_style": "mixed",
            "industry_context": "technology",
        },
        format="json",
    )
    assert onboarding_patch_response.status_code == 200, onboarding_patch_response.json()

    contact_response = api_client.post(
        f"/api/v1/platform/tenants/{tenant.id}/admin-contacts/",
        {
            "full_name": "Ava Patel",
            "email": "ava.patel@northstar.example",
            "is_primary": True,
        },
        format="json",
    )
    assert contact_response.status_code == 201, contact_response.json()
    contact_id = contact_response.json()["id"]

    provision_response = api_client.post(
        f"/api/v1/platform/admin-contacts/{contact_id}/provision-user/",
        {
            "username": "ava.patel",
            "role_code": "hr-admin",
        },
        format="json",
    )
    assert provision_response.status_code == 200, provision_response.json()
    provision_payload = provision_response.json()
    assert provision_payload["role_code"] == "hr-admin"
    assert provision_payload["generated_password"]

    policy_pack = PlatformPolicyPack.objects.create(
        code="india-office-leave-pack",
        name="India Office Leave Pack",
        domain="leave",
        status=PlatformPolicyPackStatus.PUBLISHED,
        published_by_identifier=platform_staff_user.username,
    )

    adoption_response = api_client.post(
        f"/api/v1/platform-policy-packs/{policy_pack.id}/adopt-for-tenant/",
        {
            "tenant_id": str(tenant.id),
            "adoption_mode": "clone_to_tenant_records",
        },
        format="json",
    )
    assert adoption_response.status_code == 201, adoption_response.json()

    handoff_response = api_client.post(
        f"/api/v1/platform/tenants/{tenant.id}/onboarding/mark-handoff-ready/",
        {},
        format="json",
    )
    assert handoff_response.status_code == 200, handoff_response.json()

    activate_response = api_client.post(
        f"/api/v1/platform/tenants/{tenant.id}/onboarding/activate/",
        {},
        format="json",
    )
    assert activate_response.status_code == 200, activate_response.json()

    tenant.refresh_from_db()
    provisioned_user = User.objects.get(username="ava.patel")
    membership = TenantMembership.objects.get(user=provisioned_user, tenant=tenant)
    role = Role.objects.get(tenant=tenant, code="hr-admin")
    employee = Employee.objects.get(membership=membership, tenant=tenant)

    assert tenant.status == TenantStatus.ACTIVE
    assert tenant.onboarding_status == TenantOnboardingStatus.ACTIVE
    assert membership.is_default is True
    assert membership.employee_code == employee.employee_code
    assert employee.work_email == "ava.patel@northstar.example"
    assert employee.employment_status == EmploymentStatus.ACTIVE
    assert MembershipRole.objects.filter(membership=membership, role=role, is_primary=True).exists()

    api_client.force_authenticate(user=provisioned_user)
    hr_dashboard_response = api_client.get("/api/v1/hr-admin/dashboard/")
    assert hr_dashboard_response.status_code == 200, hr_dashboard_response.json()


@pytest.mark.django_db
def test_policy_pack_adoption_drives_onboarding_baseline_published(api_client: APIClient, platform_staff_user: User):
    api_client.force_authenticate(user=platform_staff_user)
    tenant = Tenant.objects.create(
        code="aurora-health",
        name="Aurora Health",
        onboarding_status=TenantOnboardingStatus.PREPARED,
    )
    policy_pack = PlatformPolicyPack.objects.create(
        code="aurora-attendance-pack",
        name="Aurora Attendance Pack",
        domain="attendance",
        status=PlatformPolicyPackStatus.PUBLISHED,
        published_by_identifier=platform_staff_user.username,
    )

    response = api_client.post(
        f"/api/v1/platform-policy-packs/{policy_pack.id}/adopt-for-tenant/",
        {
            "tenant_id": str(tenant.id),
            "adoption_mode": "clone_to_tenant_records",
            "notes": "Initial attendance baseline",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    tenant.refresh_from_db()
    onboarding = tenant.onboarding_record
    assert tenant.onboarding_status == TenantOnboardingStatus.BASELINE_PUBLISHED
    assert onboarding.baseline_published_at is not None
    assert onboarding.events.filter(event_type="baseline_published").exists()


@pytest.mark.django_db
def test_policy_pack_adoption_clones_runtime_leave_and_attendance_records(api_client: APIClient, platform_staff_user: User):
    api_client.force_authenticate(user=platform_staff_user)
    tenant = Tenant.objects.create(
        code="zenith-ops",
        name="Zenith Ops",
        onboarding_status=TenantOnboardingStatus.PREPARED,
    )
    policy_pack = PlatformPolicyPack.objects.create(
        code="zenith-hrms-pack",
        name="Zenith HRMS Pack",
        domain="leave",
        status=PlatformPolicyPackStatus.PUBLISHED,
        published_by_identifier=platform_staff_user.username,
        version=3,
    )
    PlatformPolicyPackItem.objects.create(
        policy_pack=policy_pack,
        item_type="leave_type",
        item_key="casual-leave-type",
        sort_order=10,
        payload={
            "code": "casual-leave",
            "name": "Casual Leave",
            "category": "paid",
            "unit": "day",
            "requires_attachment": False,
            "allow_negative_balance": False,
            "is_approval_required": True,
        },
    )
    PlatformPolicyPackItem.objects.create(
        policy_pack=policy_pack,
        item_type="leave_policy",
        item_key="casual-leave-policy",
        sort_order=20,
        payload={
            "code": "casual-leave-policy",
            "name": "Casual Leave Policy",
            "leave_type_item_key": "casual-leave-type",
            "status": "active",
            "annual_entitlement": "12.00",
            "min_days_per_request": "0.50",
            "notice_days_required": 2,
            "allow_half_day": True,
        },
    )
    PlatformPolicyPackItem.objects.create(
        policy_pack=policy_pack,
        item_type="shift",
        item_key="general-shift",
        sort_order=30,
        payload={
            "code": "general-shift",
            "name": "General Shift",
            "start_time": "09:00:00",
            "end_time": "18:00:00",
            "working_hours": "8.00",
            "weekly_off_days": ["sunday"],
        },
    )
    PlatformPolicyPackItem.objects.create(
        policy_pack=policy_pack,
        item_type="holiday_calendar",
        item_key="india-2026-calendar",
        sort_order=40,
        payload={
            "code": "india-2026",
            "name": "India 2026",
            "year": 2026,
            "holidays": [
                {
                    "date": "2026-01-26",
                    "name": "Republic Day",
                    "holiday_type": "compulsory",
                }
            ],
        },
    )
    PlatformPolicyPackItem.objects.create(
        policy_pack=policy_pack,
        item_type="attendance_policy",
        item_key="office-attendance-policy",
        sort_order=50,
        payload={
            "code": "office-attendance",
            "name": "Office Attendance",
            "status": "active",
            "default_shift_item_key": "general-shift",
            "holiday_calendar_item_key": "india-2026-calendar",
            "full_day_min_hours": "8.00",
            "half_day_min_hours": "4.00",
            "late_mark_after_minutes": 15,
            "allow_regularization": True,
            "require_regularization_reason": True,
        },
    )
    PlatformPolicyDelegationRule.objects.create(
        policy_pack=policy_pack,
        item_key="casual-leave-type",
        delegation_mode="tenant_editable",
        locked_paths=["is_approval_required"],
    )
    PlatformPolicyDelegationRule.objects.create(
        policy_pack=policy_pack,
        item_key="casual-leave-policy",
        delegation_mode="tenant_editable",
        locked_paths=["notice_days_required"],
    )
    PlatformPolicyDelegationRule.objects.create(
        policy_pack=policy_pack,
        item_key="general-shift",
        delegation_mode="tenant_editable_after_clone",
        locked_paths=["start_time", "end_time"],
    )
    PlatformPolicyDelegationRule.objects.create(
        policy_pack=policy_pack,
        item_key="india-2026-calendar",
        delegation_mode="locked",
        locked_paths=["year", "holidays"],
    )
    PlatformPolicyDelegationRule.objects.create(
        policy_pack=policy_pack,
        item_key="office-attendance-policy",
        delegation_mode="tenant_editable",
        locked_paths=["default_shift_id"],
    )

    response = api_client.post(
        f"/api/v1/platform-policy-packs/{policy_pack.id}/adopt-for-tenant/",
        {
            "tenant_id": str(tenant.id),
            "adoption_mode": "clone_to_tenant_records",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()

    leave_type = LeaveType.objects.get(tenant=tenant, code="casual-leave")
    leave_policy = LeavePolicy.objects.get(tenant=tenant, code="casual-leave-policy")
    shift = Shift.objects.get(tenant=tenant, code="general-shift")
    holiday_calendar = HolidayCalendar.objects.get(tenant=tenant, code="india-2026")
    attendance_policy = AttendancePolicy.objects.get(tenant=tenant, code="office-attendance")

    assert leave_type.source_kind == "platform_pack"
    assert leave_type.source_pack_code == policy_pack.code
    assert leave_type.source_item_key == "casual-leave-type"
    assert leave_type.delegation_mode == "tenant_editable"
    assert leave_policy.leave_type == leave_type
    assert leave_policy.source_kind == "platform_pack"
    assert leave_policy.delegation_mode == "tenant_editable"
    assert leave_policy.managed_by_platform is True
    assert shift.source_kind == "platform_pack"
    assert shift.delegation_mode == "tenant_editable_after_clone"
    assert holiday_calendar.holidays.count() == 1
    assert holiday_calendar.delegation_mode == "locked"
    assert attendance_policy.default_shift == shift
    assert attendance_policy.holiday_calendar == holiday_calendar
    assert attendance_policy.source_version == 3
    assert TenantPolicyPackItemLink.objects.filter(tenant_adoption__tenant=tenant).count() == 5

    api_client.force_authenticate(user=create_tenant_hr_admin_user(
        tenant=tenant,
        username="zenith.hr",
        email="zenith.hr@example.com",
    ))
    shift_detail = api_client.get(f"/api/v1/hr-admin/shifts/{shift.id}/")
    attendance_policy_detail = api_client.get(f"/api/v1/hr-admin/attendance-policies/{attendance_policy.id}/")

    assert shift_detail.status_code == 200, shift_detail.json()
    assert shift_detail.json()["governance_state"] == "platform_clone_required"
    assert shift_detail.json()["can_detach_from_platform"] is True
    assert shift_detail.json()["edit_mode"] == "detach_required"

    assert attendance_policy_detail.status_code == 200, attendance_policy_detail.json()
    assert attendance_policy_detail.json()["governance_state"] == "platform_editable"
    assert attendance_policy_detail.json()["can_edit_directly"] is True
    assert attendance_policy_detail.json()["locked_field_count"] == 1


@pytest.mark.django_db
def test_hr_admin_cannot_edit_platform_locked_leave_policy_fields(api_client: APIClient, platform_staff_user: User):
    tenant = Tenant.objects.create(
        code="lock-leave-tenant",
        name="Lock Leave Tenant",
        onboarding_status=TenantOnboardingStatus.PREPARED,
    )
    hr_admin_user = create_tenant_hr_admin_user(
        tenant=tenant,
        username="locked.leave.hr",
        email="locked.leave.hr@example.com",
    )
    leave_type = LeaveType.objects.create(
        tenant=tenant,
        code="casual-leave",
        name="Casual Leave",
        source_kind="platform_pack",
        source_pack_code="baseline-pack",
        source_item_key="casual-leave-type",
        managed_by_platform=True,
    )
    leave_policy = LeavePolicy.objects.create(
        tenant=tenant,
        leave_type=leave_type,
        code="casual-policy",
        name="Casual Policy",
        status="active",
        annual_entitlement="12.00",
        min_days_per_request="0.50",
        notice_days_required=2,
        managed_by_platform=True,
        source_kind="platform_pack",
        source_pack_code="baseline-pack",
        source_item_key="casual-leave-policy",
        delegation_mode="tenant_editable",
        platform_locked_fields=["notice_days_required", "config_snapshot.approval.default_route"],
    )

    api_client.force_authenticate(user=hr_admin_user)
    response = api_client.patch(
        f"/api/v1/hr-admin/leave-policies/{leave_policy.id}/",
        {"notice_days_required": 5},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["locked_fields"] == ["notice_days_required"]

    config_response = api_client.patch(
        f"/api/v1/hr-admin/leave-policies/{leave_policy.id}/",
        {"config_snapshot": {"approval": {"default_route": "manager_then_hr"}}},
        format="json",
    )

    assert config_response.status_code == 400
    assert config_response.json()["locked_fields"] == ["config_snapshot"]


@pytest.mark.django_db
def test_hr_admin_can_edit_delegated_attendance_policy_fields_but_not_clone_only_policies(api_client: APIClient):
    tenant = Tenant.objects.create(
        code="attendance-lock-tenant",
        name="Attendance Lock Tenant",
        onboarding_status=TenantOnboardingStatus.PREPARED,
    )
    hr_admin_user = create_tenant_hr_admin_user(
        tenant=tenant,
        username="attendance.hr",
        email="attendance.hr@example.com",
    )
    editable_policy = AttendancePolicy.objects.create(
        tenant=tenant,
        code="editable-attendance",
        name="Editable Attendance",
        status="active",
        full_day_min_hours="8.00",
        half_day_min_hours="4.00",
        managed_by_platform=True,
        source_kind="platform_pack",
        source_pack_code="attendance-pack",
        source_item_key="editable-attendance",
        delegation_mode="tenant_editable",
        platform_locked_fields=["default_shift_id"],
    )
    clone_only_policy = AttendancePolicy.objects.create(
        tenant=tenant,
        code="clone-attendance",
        name="Clone Attendance",
        status="active",
        full_day_min_hours="8.00",
        half_day_min_hours="4.00",
        managed_by_platform=True,
        source_kind="platform_pack",
        source_pack_code="attendance-pack",
        source_item_key="clone-attendance",
        delegation_mode="tenant_editable_after_clone",
    )

    api_client.force_authenticate(user=hr_admin_user)
    success_response = api_client.patch(
        f"/api/v1/hr-admin/attendance-policies/{editable_policy.id}/",
        {"late_mark_after_minutes": 12},
        format="json",
    )

    assert success_response.status_code == 200, success_response.json()
    editable_policy.refresh_from_db()
    assert editable_policy.late_mark_after_minutes == 12
    assert success_response.json()["managed_by_platform"] is True

    blocked_response = api_client.patch(
        f"/api/v1/hr-admin/attendance-policies/{clone_only_policy.id}/",
        {"late_mark_after_minutes": 30},
        format="json",
    )

    assert blocked_response.status_code == 400
    assert "cloned or detached" in blocked_response.json()["detail"]


@pytest.mark.django_db
def test_hr_admin_can_detach_clone_only_policies_and_then_edit_them(api_client: APIClient):
    tenant = Tenant.objects.create(
        code="detach-policy-tenant",
        name="Detach Policy Tenant",
        onboarding_status=TenantOnboardingStatus.PREPARED,
    )
    hr_admin_user = create_tenant_hr_admin_user(
        tenant=tenant,
        username="detach.hr",
        email="detach.hr@example.com",
    )
    leave_type = LeaveType.objects.create(
        tenant=tenant,
        code="earned-leave",
        name="Earned Leave",
        source_kind="platform_pack",
        source_pack_code="leave-pack",
        source_item_key="earned-leave-type",
        source_version=2,
        delegation_mode="tenant_editable_after_clone",
        managed_by_platform=True,
    )
    shift = Shift.objects.create(
        tenant=tenant,
        code="detach-shift",
        name="Detach Shift",
        start_time="09:00:00",
        end_time="18:00:00",
        working_hours="8.00",
        source_kind="platform_pack",
        source_pack_code="attendance-pack",
        source_item_key="detach-shift",
        source_version=4,
        delegation_mode="tenant_editable_after_clone",
        managed_by_platform=True,
    )
    holiday_calendar = HolidayCalendar.objects.create(
        tenant=tenant,
        code="detach-calendar",
        name="Detach Calendar",
        year=2026,
        source_kind="platform_pack",
        source_pack_code="attendance-pack",
        source_item_key="detach-calendar",
        source_version=4,
        delegation_mode="tenant_editable_after_clone",
        managed_by_platform=True,
    )
    Holiday.objects.create(
        calendar=holiday_calendar,
        date="2026-01-26",
        name="Republic Day",
        holiday_type="compulsory",
    )
    leave_policy = LeavePolicy.objects.create(
        tenant=tenant,
        leave_type=leave_type,
        code="earned-policy",
        name="Earned Policy",
        status="active",
        annual_entitlement="15.00",
        min_days_per_request="0.50",
        managed_by_platform=True,
        source_kind="platform_pack",
        source_pack_code="leave-pack",
        source_item_key="earned-policy",
        source_version=2,
        delegation_mode="tenant_editable_after_clone",
    )
    attendance_policy = AttendancePolicy.objects.create(
        tenant=tenant,
        code="detach-attendance",
        name="Detach Attendance",
        status="active",
        full_day_min_hours="8.00",
        half_day_min_hours="4.00",
        managed_by_platform=True,
        source_kind="platform_pack",
        source_pack_code="attendance-pack",
        source_item_key="detach-attendance",
        source_version=4,
        delegation_mode="tenant_editable_after_clone",
    )
    platform_pack = PlatformPolicyPack.objects.create(
        code="detach-baseline-pack",
        name="Detach Baseline Pack",
        domain="leave",
        status=PlatformPolicyPackStatus.PUBLISHED,
    )
    adoption = platform_pack.tenant_adoptions.create(
        tenant=tenant,
        status="adopted",
        adoption_mode="clone_to_tenant_records",
    )
    leave_type_pack_item = PlatformPolicyPackItem.objects.create(
        policy_pack=platform_pack,
        item_type="leave_type",
        item_key="earned-leave-type",
        sort_order=5,
    )
    leave_pack_item = PlatformPolicyPackItem.objects.create(
        policy_pack=platform_pack,
        item_type="leave_policy",
        item_key="earned-policy",
        sort_order=10,
    )
    shift_pack_item = PlatformPolicyPackItem.objects.create(
        policy_pack=platform_pack,
        item_type="shift",
        item_key="detach-shift",
        sort_order=15,
    )
    holiday_calendar_pack_item = PlatformPolicyPackItem.objects.create(
        policy_pack=platform_pack,
        item_type="holiday_calendar",
        item_key="detach-calendar",
        sort_order=18,
    )
    attendance_pack_item = PlatformPolicyPackItem.objects.create(
        policy_pack=platform_pack,
        item_type="attendance_policy",
        item_key="detach-attendance",
        sort_order=20,
    )
    leave_type_link = TenantPolicyPackItemLink.objects.create(
        tenant_adoption=adoption,
        platform_item=leave_type_pack_item,
        target_model="leave_management.LeaveType",
        target_record_id=leave_type.id,
        source_version=2,
    )
    leave_link = TenantPolicyPackItemLink.objects.create(
        tenant_adoption=adoption,
        platform_item=leave_pack_item,
        target_model="leave_management.LeavePolicy",
        target_record_id=leave_policy.id,
        source_version=2,
    )
    shift_link = TenantPolicyPackItemLink.objects.create(
        tenant_adoption=adoption,
        platform_item=shift_pack_item,
        target_model="attendance.Shift",
        target_record_id=shift.id,
        source_version=4,
    )
    holiday_calendar_link = TenantPolicyPackItemLink.objects.create(
        tenant_adoption=adoption,
        platform_item=holiday_calendar_pack_item,
        target_model="attendance.HolidayCalendar",
        target_record_id=holiday_calendar.id,
        source_version=4,
    )
    attendance_link = TenantPolicyPackItemLink.objects.create(
        tenant_adoption=adoption,
        platform_item=attendance_pack_item,
        target_model="attendance.AttendancePolicy",
        target_record_id=attendance_policy.id,
        source_version=4,
    )

    api_client.force_authenticate(user=hr_admin_user)
    leave_type_detach_response = api_client.post(
        f"/api/v1/hr-admin/leave-types/{leave_type.id}/detach/",
        {},
        format="json",
    )
    shift_detach_response = api_client.post(
        f"/api/v1/hr-admin/shifts/{shift.id}/detach/",
        {},
        format="json",
    )
    holiday_calendar_detach_response = api_client.post(
        f"/api/v1/hr-admin/holiday-calendars/{holiday_calendar.id}/detach/",
        {},
        format="json",
    )
    leave_detach_response = api_client.post(
        f"/api/v1/hr-admin/leave-policies/{leave_policy.id}/detach/",
        {},
        format="json",
    )
    attendance_detach_response = api_client.post(
        f"/api/v1/hr-admin/attendance-policies/{attendance_policy.id}/detach/",
        {},
        format="json",
    )

    assert leave_type_detach_response.status_code == 200, leave_type_detach_response.json()
    assert shift_detach_response.status_code == 200, shift_detach_response.json()
    assert holiday_calendar_detach_response.status_code == 200, holiday_calendar_detach_response.json()
    assert leave_detach_response.status_code == 200, leave_detach_response.json()
    assert attendance_detach_response.status_code == 200, attendance_detach_response.json()
    assert leave_type_detach_response.json()["governance_state"] == "tenant_detached_clone"
    assert leave_type_detach_response.json()["can_detach_from_platform"] is False
    assert shift_detach_response.json()["governance_state"] == "tenant_detached_clone"
    assert holiday_calendar_detach_response.json()["governance_state"] == "tenant_detached_clone"
    assert leave_detach_response.json()["governance_state"] == "tenant_detached_clone"
    assert attendance_detach_response.json()["governance_state"] == "tenant_detached_clone"

    leave_type.refresh_from_db()
    shift.refresh_from_db()
    holiday_calendar.refresh_from_db()
    leave_policy.refresh_from_db()
    attendance_policy.refresh_from_db()
    leave_type_link.refresh_from_db()
    leave_link.refresh_from_db()
    shift_link.refresh_from_db()
    holiday_calendar_link.refresh_from_db()
    attendance_link.refresh_from_db()

    assert leave_type.source_kind == "tenant_clone"
    assert leave_type.managed_by_platform is False
    assert leave_type.delegation_mode == ""
    assert leave_type_link.is_detached_from_source is True

    assert shift.source_kind == "tenant_clone"
    assert shift.managed_by_platform is False
    assert shift.delegation_mode == ""
    assert shift_link.is_detached_from_source is True

    assert holiday_calendar.source_kind == "tenant_clone"
    assert holiday_calendar.managed_by_platform is False
    assert holiday_calendar.delegation_mode == ""
    assert holiday_calendar_link.is_detached_from_source is True

    assert leave_policy.source_kind == "tenant_clone"
    assert leave_policy.managed_by_platform is False
    assert leave_policy.delegation_mode == ""
    assert leave_link.is_detached_from_source is True

    assert attendance_policy.source_kind == "tenant_clone"
    assert attendance_policy.managed_by_platform is False
    assert attendance_policy.delegation_mode == ""
    assert attendance_link.is_detached_from_source is True

    edit_leave_type_response = api_client.patch(
        f"/api/v1/hr-admin/leave-types/{leave_type.id}/",
        {"description": "Tenant-owned leave type"},
        format="json",
    )
    edit_shift_response = api_client.patch(
        f"/api/v1/hr-admin/shifts/{shift.id}/",
        {"grace_in_minutes": 15},
        format="json",
    )
    edit_holiday_calendar_response = api_client.patch(
        f"/api/v1/hr-admin/holiday-calendars/{holiday_calendar.id}/",
        {"name": "Tenant-owned calendar"},
        format="json",
    )
    edit_leave_response = api_client.patch(
        f"/api/v1/hr-admin/leave-policies/{leave_policy.id}/",
        {"notice_days_required": 6},
        format="json",
    )
    edit_attendance_response = api_client.patch(
        f"/api/v1/hr-admin/attendance-policies/{attendance_policy.id}/",
        {"late_mark_after_minutes": 25},
        format="json",
    )

    assert edit_leave_type_response.status_code == 200, edit_leave_type_response.json()
    assert edit_shift_response.status_code == 200, edit_shift_response.json()
    assert edit_holiday_calendar_response.status_code == 200, edit_holiday_calendar_response.json()
    assert edit_leave_response.status_code == 200, edit_leave_response.json()
    assert edit_attendance_response.status_code == 200, edit_attendance_response.json()


@pytest.mark.django_db
def test_hr_admin_governance_rules_extend_to_cloned_runtime_masters(api_client: APIClient):
    tenant = Tenant.objects.create(
        code="runtime-master-governance",
        name="Runtime Master Governance",
        onboarding_status=TenantOnboardingStatus.PREPARED,
    )
    hr_admin_user = create_tenant_hr_admin_user(
        tenant=tenant,
        username="runtime.master.hr",
        email="runtime.master.hr@example.com",
    )
    leave_type = LeaveType.objects.create(
        tenant=tenant,
        code="platform-leave-type",
        name="Platform Leave Type",
        category="paid",
        unit="day",
        source_kind="platform_pack",
        source_pack_code="governance-pack",
        source_item_key="platform-leave-type",
        source_version=5,
        delegation_mode="tenant_editable",
        managed_by_platform=True,
        platform_locked_fields=["is_approval_required"],
    )
    shift = Shift.objects.create(
        tenant=tenant,
        code="platform-shift",
        name="Platform Shift",
        start_time="09:00:00",
        end_time="18:00:00",
        working_hours="8.00",
        source_kind="platform_pack",
        source_pack_code="governance-pack",
        source_item_key="platform-shift",
        source_version=5,
        delegation_mode="tenant_editable_after_clone",
        managed_by_platform=True,
        platform_locked_fields=["start_time", "end_time"],
    )
    holiday_calendar = HolidayCalendar.objects.create(
        tenant=tenant,
        code="platform-calendar",
        name="Platform Calendar",
        year=2026,
        source_kind="platform_pack",
        source_pack_code="governance-pack",
        source_item_key="platform-calendar",
        source_version=5,
        delegation_mode="locked",
        managed_by_platform=True,
        platform_locked_fields=["year", "holidays"],
    )
    Holiday.objects.create(
        calendar=holiday_calendar,
        date="2026-01-26",
        name="Republic Day",
        holiday_type="compulsory",
    )

    api_client.force_authenticate(user=hr_admin_user)

    leave_type_detail = api_client.get(f"/api/v1/hr-admin/leave-types/{leave_type.id}/")
    assert leave_type_detail.status_code == 200, leave_type_detail.json()
    assert leave_type_detail.json()["managed_by_platform"] is True
    assert leave_type_detail.json()["delegation_mode"] == "tenant_editable"
    assert leave_type_detail.json()["governance_state"] == "platform_editable"
    assert leave_type_detail.json()["can_edit_directly"] is True
    assert leave_type_detail.json()["locked_field_count"] == 1

    leave_type_locked_response = api_client.patch(
        f"/api/v1/hr-admin/leave-types/{leave_type.id}/",
        {"is_approval_required": False},
        format="json",
    )
    assert leave_type_locked_response.status_code == 400
    assert leave_type_locked_response.json()["locked_fields"] == ["is_approval_required"]

    leave_type_edit_response = api_client.patch(
        f"/api/v1/hr-admin/leave-types/{leave_type.id}/",
        {"description": "Tenant-side help text"},
        format="json",
    )
    assert leave_type_edit_response.status_code == 200, leave_type_edit_response.json()
    leave_type.refresh_from_db()
    assert leave_type.description == "Tenant-side help text"

    shift_blocked_response = api_client.patch(
        f"/api/v1/hr-admin/shifts/{shift.id}/",
        {"grace_in_minutes": 20},
        format="json",
    )
    assert shift_blocked_response.status_code == 400
    assert "cloned or detached" in shift_blocked_response.json()["detail"]

    holiday_calendar_detail = api_client.get(f"/api/v1/hr-admin/holiday-calendars/{holiday_calendar.id}/")
    assert holiday_calendar_detail.status_code == 200, holiday_calendar_detail.json()
    assert holiday_calendar_detail.json()["managed_by_platform"] is True
    assert holiday_calendar_detail.json()["delegation_mode"] == "locked"
    assert holiday_calendar_detail.json()["governance_state"] == "platform_locked"
    assert holiday_calendar_detail.json()["requires_platform_change"] is True
    assert holiday_calendar_detail.json()["can_edit_directly"] is False

    holiday_calendar_blocked_response = api_client.patch(
        f"/api/v1/hr-admin/holiday-calendars/{holiday_calendar.id}/",
        {"name": "Tenant Override Calendar"},
        format="json",
    )
    assert holiday_calendar_blocked_response.status_code == 400
    assert "locked" in holiday_calendar_blocked_response.json()["detail"]


@pytest.mark.django_db
def test_non_platform_admin_user_cannot_access_platform_tenant_endpoints(api_client: APIClient, db):
    user = User.objects.create_user(
        username="ordinary.user",
        email="ordinary.user@example.com",
        password=PASSWORD,
        is_staff=True,
        is_superuser=False,
        is_active=True,
    )
    api_client.force_authenticate(user=user)

    response = api_client.get("/api/v1/platform/tenants/")

    assert response.status_code == 403
