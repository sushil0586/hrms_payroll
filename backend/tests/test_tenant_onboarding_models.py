import pytest

from apps.tenant_onboarding.models import (
    ChecklistStatus,
    TenantOnboarding,
    TenantOnboardingAdminContact,
    TenantOnboardingChecklistItem,
)
from apps.tenants.models import Tenant, TenantOnboardingStatus


@pytest.mark.django_db
def test_creating_tenant_auto_creates_onboarding_record_and_default_checklist():
    tenant = Tenant.objects.create(
        code="acme-industries",
        name="Acme Industries",
        primary_email="admin@acme.example",
    )

    onboarding = TenantOnboarding.objects.get(tenant=tenant)

    assert tenant.onboarding_status == TenantOnboardingStatus.DRAFT
    assert onboarding.country_context == "IN"
    assert list(onboarding.checklist_items.values_list("code", flat=True)) == [
        "tenant_created",
        "domain_mapped",
        "first_admin_provisioned",
        "baseline_published",
        "handoff_completed",
    ]


@pytest.mark.django_db
def test_onboarding_admin_contact_links_to_tenant_context():
    tenant = Tenant.objects.create(
        code="northwind-labs",
        name="Northwind Labs",
    )
    onboarding = tenant.onboarding_record

    contact = TenantOnboardingAdminContact.objects.create(
        onboarding=onboarding,
        full_name="Ava Patel",
        email="ava.patel@northwind.example",
        is_primary=True,
    )

    checklist_item = TenantOnboardingChecklistItem.objects.get(
        onboarding=onboarding,
        code="first_admin_provisioned",
    )

    assert str(contact) == "Ava Patel (ava.patel@northwind.example)"
    assert checklist_item.status == ChecklistStatus.PENDING
    assert onboarding.admin_contacts.get(is_primary=True) == contact
