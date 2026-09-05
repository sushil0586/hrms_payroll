from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.iam.models import MembershipRole, MembershipScope, Role, RolePermission, TenantMembership, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "email", "display_name", "is_staff", "is_active")
    search_fields = ("username", "email", "display_name", "first_name", "last_name")
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "HRMS Access",
            {
                "fields": (
                    "phone_number",
                    "display_name",
                    "must_change_password",
                )
            },
        ),
    )


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 0


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "is_system_role", "is_active")
    list_filter = ("is_system_role", "is_active", "tenant")
    search_fields = ("name", "code", "tenant__name", "tenant__code")
    inlines = [RolePermissionInline]


class MembershipRoleInline(admin.TabularInline):
    model = MembershipRole
    extra = 0


class MembershipScopeInline(admin.TabularInline):
    model = MembershipScope
    extra = 0


@admin.register(TenantMembership)
class TenantMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "tenant", "status", "employee_code", "is_default")
    list_filter = ("status", "is_default", "tenant")
    search_fields = ("user__username", "user__email", "tenant__name", "employee_code")
    inlines = [MembershipRoleInline, MembershipScopeInline]


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("permission_key", "role", "description")
    search_fields = ("permission_key", "role__name", "role__tenant__name")


@admin.register(MembershipRole)
class MembershipRoleAdmin(admin.ModelAdmin):
    list_display = ("membership", "role", "is_primary")
    list_filter = ("is_primary", "role__tenant")
    search_fields = ("membership__user__username", "role__name")


@admin.register(MembershipScope)
class MembershipScopeAdmin(admin.ModelAdmin):
    list_display = ("membership", "scope_type", "scope_value")
    list_filter = ("scope_type",)
    search_fields = ("membership__user__username", "scope_value")
