from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.tenant_onboarding.models import TenantOnboarding, TenantOnboardingChecklistItem
from apps.tenants.models import Tenant


DEFAULT_CHECKLIST_ITEMS = (
    ("tenant_created", "Tenant created", 10),
    ("domain_mapped", "Domain mapped", 20),
    ("first_admin_provisioned", "First admin provisioned", 30),
    ("baseline_published", "Baseline published", 40),
    ("handoff_completed", "Handoff completed", 50),
)


@receiver(post_save, sender=Tenant)
def ensure_tenant_onboarding_exists(sender, instance: Tenant, created: bool, **kwargs) -> None:
    """Auto-create onboarding state so every tenant has a tracked setup record."""

    onboarding, onboarding_created = TenantOnboarding.objects.get_or_create(
        tenant=instance,
        defaults={"country_context": instance.country_code},
    )
    if onboarding_created:
        TenantOnboardingChecklistItem.objects.bulk_create(
            [
                TenantOnboardingChecklistItem(
                    onboarding=onboarding,
                    code=code,
                    label=label,
                    sort_order=sort_order,
                )
                for code, label, sort_order in DEFAULT_CHECKLIST_ITEMS
            ]
        )
