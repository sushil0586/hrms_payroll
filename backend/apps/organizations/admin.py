from django.contrib import admin

from apps.organizations.models import (
    Branch,
    BusinessUnit,
    CostCenter,
    Department,
    Designation,
    EmploymentType,
    Grade,
    LegalEntity,
    Location,
)


@admin.register(LegalEntity)
class LegalEntityAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "country_code", "is_active")
    list_filter = ("country_code", "is_active", "tenant")
    search_fields = ("name", "code", "registered_name", "tenant__name")


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "city", "state", "country_code", "is_active")
    list_filter = ("country_code", "state", "is_active", "tenant")
    search_fields = ("name", "code", "city", "state", "tenant__name")


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "legal_entity", "location", "is_active")
    list_filter = ("legal_entity", "is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")


@admin.register(BusinessUnit)
class BusinessUnitAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "parent", "is_active")
    list_filter = ("is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "business_unit", "parent", "is_active")
    list_filter = ("business_unit", "is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")


@admin.register(CostCenter)
class CostCenterAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "legal_entity", "is_active")
    list_filter = ("legal_entity", "is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "level", "is_active")
    list_filter = ("is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "grade", "is_active")
    list_filter = ("grade", "is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")


@admin.register(EmploymentType)
class EmploymentTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "is_payroll_eligible", "is_active")
    list_filter = ("is_payroll_eligible", "is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")
