"""Tenant-code validation preserves database constraints and transaction recovery."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.db import IntegrityError, close_old_connections
from django.db.models.query import QuerySet
from rest_framework.exceptions import ValidationError

from apps.common.api_views import save_hr_admin_leave_type
from apps.leave_management.models import LeaveType
from apps.tenants.models import Tenant

pytestmark = pytest.mark.django_db(transaction=True)


def actor(code="type-validation"):
    return SimpleNamespace(tenant=Tenant.objects.create(code=code, name=code, legal_name=code))


def test_duplicate_create_and_edit_report_code_error_without_mutation():
    owner = actor()
    first = save_hr_admin_leave_type(owner, {"code": "paid", "name": "Paid"})
    second = save_hr_admin_leave_type(owner, {"code": "other", "name": "Other"})
    for data, item in [({"code": "paid", "name": "Duplicate"}, None), ({"code": "paid"}, second)]:
        with pytest.raises(ValidationError) as error:
            save_hr_admin_leave_type(owner, data, item=item)
        assert "code" in error.value.detail
    second.refresh_from_db()
    assert second.code == "other"
    assert LeaveType.objects.get(pk=first.pk).name == "Paid"
    assert LeaveType.objects.count() == 2


def test_same_code_is_allowed_in_separate_tenants_and_unchanged_edit():
    first_actor, second_actor = actor(), actor("other-tenant")
    first = save_hr_admin_leave_type(first_actor, {"code": "paid", "name": "Paid"})
    save_hr_admin_leave_type(second_actor, {"code": "paid", "name": "Other tenant"})
    assert save_hr_admin_leave_type(first_actor, {"name": "Renamed"}, item=first).name == "Renamed"
    assert LeaveType.objects.count() == 2


def test_racing_insert_returns_validation_and_leaves_connection_usable():
    owner = actor()
    barrier = Barrier(2, timeout=15)
    real_exists = QuerySet.exists

    def synchronized_exists(queryset):
        exists = real_exists(queryset)
        if queryset.model is LeaveType and not exists:
            barrier.wait()
        return exists

    def create():
        close_old_connections()
        try:
            scoped_actor = SimpleNamespace(tenant=Tenant.objects.get(pk=owner.tenant.pk))
            try:
                save_hr_admin_leave_type(scoped_actor, {"code": "raced", "name": "Concurrent"})
                result = "created"
            except ValidationError as error:
                assert "code" in error.detail
                result = "duplicate"
            assert LeaveType.objects.filter(tenant=owner.tenant, code="raced").count() == 1
            return result
        finally:
            close_old_connections()

    with patch.object(QuerySet, "exists", synchronized_exists), ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: create(), range(2)))
    assert sorted(results) == ["created", "duplicate"]
    assert LeaveType.objects.filter(tenant=owner.tenant).count() == 1


def test_unrelated_integrity_error_is_not_hidden():
    owner = actor()
    with patch.object(LeaveType, "save", side_effect=IntegrityError("unrelated constraint")):
        with pytest.raises(IntegrityError, match="unrelated constraint"):
            save_hr_admin_leave_type(owner, {"code": "paid", "name": "Paid"})
