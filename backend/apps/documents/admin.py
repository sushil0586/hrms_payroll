from django.contrib import admin

from apps.documents.models import (
    DocumentCategory,
    DocumentArtifact,
    DocumentRequirementRule,
    DocumentVerificationLog,
    EmployeeDocument,
    GeneratedLetter,
)


class DocumentRequirementRuleInline(admin.TabularInline):
    model = DocumentRequirementRule
    extra = 0


@admin.register(DocumentCategory)
class DocumentCategoryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "tenant",
        "code",
        "category_type",
        "requires_expiry_date",
        "requires_verification",
        "allow_employee_upload",
        "is_active",
    )
    list_filter = ("category_type", "requires_expiry_date", "requires_verification", "allow_employee_upload", "is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")
    inlines = [DocumentRequirementRuleInline]


@admin.register(DocumentRequirementRule)
class DocumentRequirementRuleAdmin(admin.ModelAdmin):
    list_display = ("category", "tenant", "priority", "legal_entity", "branch", "department", "employment_type", "is_mandatory", "is_active")
    list_filter = ("is_mandatory", "is_active", "tenant")
    search_fields = ("category__name", "tenant__name")


@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "employee",
        "category",
        "title",
        "status",
        "verification_status",
        "expires_on",
        "verified_at",
    )
    list_filter = ("status", "verification_status", "category", "tenant")
    search_fields = ("employee__employee_code", "employee__first_name", "title", "document_number")


@admin.register(DocumentArtifact)
class DocumentArtifactAdmin(admin.ModelAdmin):
    list_display = ("original_filename", "tenant", "employee", "source_kind", "storage_provider", "file_size_bytes", "created_at")
    list_filter = ("source_kind", "storage_provider", "tenant")
    search_fields = ("original_filename", "storage_key", "employee__employee_code", "tenant__name")


@admin.register(DocumentVerificationLog)
class DocumentVerificationLogAdmin(admin.ModelAdmin):
    list_display = ("employee_document", "previous_status", "new_status", "actor_identifier", "created_at")
    list_filter = ("new_status", "tenant")
    search_fields = ("employee_document__title", "employee_document__employee__employee_code", "actor_identifier")


@admin.register(GeneratedLetter)
class GeneratedLetterAdmin(admin.ModelAdmin):
    list_display = ("employee", "letter_type", "title", "status", "issue_date", "template_code")
    list_filter = ("letter_type", "status", "tenant")
    search_fields = ("employee__employee_code", "employee__first_name", "title", "template_code", "workflow_reference")
