"""Navigation metadata and existing governance authorization remain independent."""
import pytest
from rest_framework.test import APIClient
from apps.iam.models import MenuCatalogEntry
from tests.test_leave_history_completion import scope  # noqa: F401

pytestmark = pytest.mark.django_db


def test_leave_year_navigation_uses_existing_view_permission_without_granting_access(scope):
    _, _, _, _, client, _ = scope
    rows = client.get('/api/v1/auth/menu-catalog/', {'workspace': 'tenant-admin'})
    assert rows.status_code == 200
    item = next(row for row in rows.data if row['href'] == '/tenant-admin/leave-year')
    assert item['label'] == 'Leave Years'
    assert item['permission_keys'] == ['leave.periods.view']
    assert client.get('/api/v1/tenant-admin/leave-year/periods/').status_code == 403
    assert APIClient().get('/api/v1/auth/menu-catalog/').status_code in (401, 403)


def test_database_hidden_navigation_override_is_not_resurrected(scope):
    _, _, _, _, client, _ = scope
    MenuCatalogEntry.objects.create(workspace='tenant-admin', kind='sidebar', href='/tenant-admin/leave-year', label='Leave Years', is_active=False, permission_keys=['leave.periods.view'])
    rows = client.get('/api/v1/auth/menu-catalog/', {'workspace': 'tenant-admin'})
    assert rows.status_code == 200
    assert not any(row['href'] == '/tenant-admin/leave-year' for row in rows.data)
