"""Guarded disposable ESS-5 notification fixtures, no provider dispatch."""
import json
from apps.tenants.models import Tenant
from apps.notifications.models import Notification
from tests.ess3_browser_fixture import prepare as prepare_history


def prepare(manifest_path):
    closed = prepare_history(manifest_path)
    with open(manifest_path) as handle:
        manifest = json.load(handle)
    tenant = Tenant.objects.get(pk=manifest['tenant']['id'], code__startswith='pw-qa-')
    employee = tenant.employees.get(pk=manifest['credentials']['employee']['employee_id'])
    for index in range(12):
        Notification.objects.create(tenant=tenant, recipient_membership=employee.membership,
            channel='in_app', audience_type='employee', title=f'ESS5 message {index:02}', body='Synthetic employee workflow update',
            subject_type='leave_request', subject_identifier=manifest['fixtures']['leave_request_id'], status='delivered')
    Notification.objects.create(tenant=tenant, recipient_membership=employee.membership,
        channel='email', audience_type='employee', title='ESS5 provider unavailable', body='Synthetic delivery failure; no provider is contacted', status='failed')
    manager = tenant.employees.get(pk=manifest['credentials']['manager']['employee_id'])
    Notification.objects.create(tenant=tenant, recipient_membership=manager.membership,
        channel='in_app', audience_type='manager', title='ESS5 manager private', status='delivered')
    return closed
