from contextlib import contextmanager

from django.core.exceptions import PermissionDenied
from django.db import connection

from apps.tenants.models import Tenant


SYNTHETIC_TENANT_PREFIX = "pw-qa-"
SYNTHETIC_OWNER_DOMAIN = "@playwright.qa.invalid"


@contextmanager
def authorized_synthetic_tenant_teardown(tenant: Tenant, *, expected_owner_email: str):
    """Allow DB-4 retained-row deletion only for an ownership-verified QA tenant."""

    if (
        not tenant.is_sandbox
        or not tenant.code.startswith(SYNTHETIC_TENANT_PREFIX)
        or tenant.primary_email != expected_owner_email
        or not expected_owner_email.endswith(SYNTHETIC_OWNER_DOMAIN)
    ):
        raise PermissionDenied("Only an ownership-verified synthetic tenant can use destructive teardown.")

    if connection.vendor != "postgresql":
        yield
        return

    with connection.cursor() as cursor:
        cursor.execute("SET LOCAL hrms.synthetic_tenant_teardown = 'authorized'")
    try:
        yield
    finally:
        with connection.cursor() as cursor:
            cursor.execute("SET LOCAL hrms.synthetic_tenant_teardown = 'blocked'")
