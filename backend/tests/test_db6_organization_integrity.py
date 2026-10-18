from __future__ import annotations

import pytest
from django.db import DatabaseError, transaction

from apps.organizations.models import BusinessUnit, Department
from apps.tenants.models import Tenant


pytestmark = pytest.mark.django_db(transaction=True)


@pytest.mark.parametrize("model_class", [BusinessUnit, Department])
def test_postgresql_rejects_indirect_organization_hierarchy_cycle(model_class):
    tenant = Tenant.objects.create(code=f"db6-{model_class._meta.model_name}", name="DB6 Organization")
    parent = model_class.objects.create(tenant=tenant, code="parent", name="Parent")
    child = model_class.objects.create(tenant=tenant, code="child", name="Child", parent=parent)

    with pytest.raises(DatabaseError, match="organization hierarchy cycle"):
        with transaction.atomic():
            model_class.objects.filter(id=parent.id).update(parent=child)

    parent.refresh_from_db()
    assert parent.parent_id is None
