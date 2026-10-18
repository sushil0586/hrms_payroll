from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

import pytest
from django.db import close_old_connections
from rest_framework import serializers

from apps.common.api_views import import_hr_admin_organization_items
from apps.organizations.models import Branch, LegalEntity
from apps.tenants.models import Tenant


pytestmark = pytest.mark.django_db(transaction=True)


def row(number, section, code, name, **extra):
    return {
        "row_number": number,
        "section": section,
        "data": {"code": code, "name": name, "is_active": "true", **extra},
    }


def test_organization_import_creates_dependency_graph_in_one_transaction():
    tenant = Tenant.objects.create(code="dd8-import-ok", name="DD8 Import Success")
    actor = SimpleNamespace(tenant=tenant)

    created = import_hr_admin_organization_items(
        actor,
        [
            row(2, "legal_entities", "LE-1", "Legal Entity", registered_name="Legal Entity Pvt Ltd"),
            row(3, "branches", "BR-1", "Branch", legal_entity_code="LE-1"),
        ],
    )

    assert [item["code"] for item in created] == ["LE-1", "BR-1"]
    branch = Branch.objects.get(tenant=tenant, code="BR-1")
    assert branch.legal_entity.code == "LE-1"


def test_organization_import_rolls_back_all_rows_when_later_row_fails():
    tenant = Tenant.objects.create(code="dd8-import-rollback", name="DD8 Import Rollback")
    actor = SimpleNamespace(tenant=tenant)

    with pytest.raises(serializers.ValidationError):
        import_hr_admin_organization_items(
            actor,
            [
                row(2, "legal_entities", "LE-ROLLBACK", "Must Roll Back"),
                row(3, "branches", "BR-BAD", "Invalid Branch", legal_entity_code="MISSING"),
            ],
        )

    assert not LegalEntity.objects.filter(tenant=tenant, code="LE-ROLLBACK").exists()
    assert not Branch.objects.filter(tenant=tenant, code="BR-BAD").exists()


def test_organization_import_never_resolves_dependency_from_another_tenant():
    tenant = Tenant.objects.create(code="dd8-import-a", name="DD8 Import A")
    other = Tenant.objects.create(code="dd8-import-b", name="DD8 Import B")
    LegalEntity.objects.create(tenant=other, code="LE-OTHER", name="Other Legal Entity")

    with pytest.raises(serializers.ValidationError):
        import_hr_admin_organization_items(
            SimpleNamespace(tenant=tenant),
            [row(2, "branches", "BR-CROSS", "Cross Tenant", legal_entity_code="LE-OTHER")],
        )

    assert not Branch.objects.filter(tenant=tenant, code="BR-CROSS").exists()


def test_concurrent_imports_cannot_create_duplicate_organization_codes():
    tenant = Tenant.objects.create(code="dd8-import-race", name="DD8 Import Race")

    def commit():
        close_old_connections()
        try:
            import_hr_admin_organization_items(
                SimpleNamespace(tenant=Tenant.objects.get(pk=tenant.pk)),
                [row(2, "legal_entities", "LE-RACE", "Race Legal Entity")],
            )
            return "created"
        except serializers.ValidationError:
            return "rejected"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _: commit(), range(2)))

    assert sorted(outcomes) == ["created", "rejected"]
    assert LegalEntity.objects.filter(tenant=tenant, code="LE-RACE").count() == 1
