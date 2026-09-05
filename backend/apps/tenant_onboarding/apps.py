from django.apps import AppConfig


class TenantOnboardingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tenant_onboarding"
    verbose_name = "Tenant Onboarding"

    def ready(self) -> None:
        from . import signals  # noqa: F401
