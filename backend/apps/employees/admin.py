from django.contrib import admin

from apps.employees.models import Employee, EmployeeAddress, EmployeeBankAccount, EmergencyContact


class EmployeeAddressInline(admin.TabularInline):
    model = EmployeeAddress
    extra = 0


class EmergencyContactInline(admin.TabularInline):
    model = EmergencyContact
    extra = 0


class EmployeeBankAccountInline(admin.TabularInline):
    model = EmployeeBankAccount
    extra = 0


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "employee_code",
        "first_name",
        "last_name",
        "tenant",
        "employment_status",
        "department",
        "designation",
        "reporting_manager",
    )
    list_filter = ("tenant", "employment_status", "department", "designation", "employment_type")
    search_fields = (
        "employee_code",
        "first_name",
        "last_name",
        "preferred_name",
        "work_email",
        "personal_email",
    )
    inlines = [EmployeeAddressInline, EmergencyContactInline, EmployeeBankAccountInline]


@admin.register(EmployeeAddress)
class EmployeeAddressAdmin(admin.ModelAdmin):
    list_display = ("employee", "address_type", "city", "state", "country_code", "is_primary")
    list_filter = ("address_type", "country_code", "is_primary")
    search_fields = ("employee__employee_code", "employee__first_name", "city", "state")


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ("employee", "name", "relationship", "phone_number", "is_primary")
    list_filter = ("is_primary",)
    search_fields = ("employee__employee_code", "employee__first_name", "name", "phone_number")


@admin.register(EmployeeBankAccount)
class EmployeeBankAccountAdmin(admin.ModelAdmin):
    list_display = ("employee", "account_holder_name", "bank_name", "is_primary")
    list_filter = ("is_primary",)
    search_fields = ("employee__employee_code", "employee__first_name", "account_holder_name", "bank_name")
