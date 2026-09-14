import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.tenant_onboarding.models import PublicLeadStatus, PublicTenantLead


@pytest.mark.django_db
def test_public_lead_create_is_unauthenticated_and_reviewable_by_platform_admin():
    client = APIClient()

    create_response = client.post(
        "/api/v1/platform/public-leads/",
        {
            "intent": "signup",
            "company_name": "Acme Payroll Services",
            "contact_name": "Priya Sharma",
            "work_email": "PRIYA@ACME.EXAMPLE",
            "phone_number": "+91 90000 00000",
            "employee_count": 120,
            "industry": "Services",
            "country_code": "IN",
            "preferred_plan": "growth",
            "message": "We want a guided payroll pilot.",
            "source_path": "/",
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    lead = PublicTenantLead.objects.get()
    assert lead.work_email == "priya@acme.example"
    assert lead.status == PublicLeadStatus.NEW
    assert lead.employee_count == 120

    list_response = client.get("/api/v1/platform/leads/")
    assert list_response.status_code in {401, 403}

    user = get_user_model().objects.create_superuser(
        username="platform.qa",
        email="platform.qa@example.test",
        password="Password@123",
    )
    token = Token.objects.create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    list_response = client.get("/api/v1/platform/leads/")
    assert list_response.status_code == 200, list_response.json()
    assert list_response.json()[0]["company_name"] == "Acme Payroll Services"

    patch_response = client.patch(
        f"/api/v1/platform/leads/{lead.id}/",
        {"status": "qualified"},
        format="json",
    )
    assert patch_response.status_code == 200, patch_response.json()
    lead.refresh_from_db()
    assert lead.status == PublicLeadStatus.QUALIFIED
    assert lead.reviewed_by_identifier == "platform.qa"
