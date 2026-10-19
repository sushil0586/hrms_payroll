"""Real self notification authorization and state semantics on disposable PostgreSQL."""
from django.test import TestCase
from rest_framework.test import APIClient
from apps.notifications.models import Notification


class Ess5NotificationContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from tests.test_ess1_profile_contract import Ess1SelfProfileContractTests
        Ess1SelfProfileContractTests.setUpTestData.__func__(cls)
        cls.rows = [Notification.objects.create(tenant=emp.tenant, recipient_membership=emp.membership,
            audience_type='employee', channel='in_app', title=f'Private {emp.employee_code}', status='failed') for _, emp in cls.actors]

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.actors[0][0])
        self.path = f'/api/v1/me/notifications/{self.rows[0].id}/'

    def test_list_ignores_foreign_target_parameters(self):
        for row in self.rows[1:]:
            response = self.client.get('/api/v1/me/notifications/', {'employee_id': row.recipient_membership_id, 'tenant_id': row.tenant_id})
            self.assertEqual(response.status_code, 200)
            self.assertEqual([r['id'] for r in response.json()['items']], [str(self.rows[0].id)])

    def test_foreign_detail_and_patch_are_rejected(self):
        for row in self.rows[1:]:
            path = f'/api/v1/me/notifications/{row.id}/'
            self.assertEqual(self.client.get(path).status_code, 404)
            self.assertEqual(self.client.patch(path, {'read_at': None}, format='json').status_code, 404)
            row.refresh_from_db()
            self.assertIsNone(row.read_at)

    def test_repeated_read_unread_preserves_delivery_and_payload(self):
        for value in ['2026-10-19T10:00:00Z']*2 + [None]*2:
            result = self.client.patch(self.path, {'read_at': value}, format='json')
            self.assertEqual(result.status_code, 200)
            self.assertEqual(bool(result.json()['read_at']), bool(value))
            self.assertEqual(result.json()['status'], 'failed')
        row = Notification.objects.get(pk=self.rows[0].pk)
        self.assertEqual(row.payload, {})

    def test_invalid_read_timestamp_does_not_change_state(self):
        self.assertEqual(self.client.patch(self.path, {'read_at': 'invalid'}, format='json').status_code, 400)
        self.rows[0].refresh_from_db()
        self.assertIsNone(self.rows[0].read_at)

    def test_cannot_change_delivery_or_dispatch(self):
        result = self.client.patch(self.path, {'read_at': None, 'status':'delivered', 'channel':'sms'}, format='json')
        self.assertEqual(result.status_code, 200)
        self.rows[0].refresh_from_db()
        self.assertEqual(self.rows[0].status,'failed')
        self.assertEqual(self.rows[0].channel,'in_app')
        self.assertIn(self.client.post(f'/api/v1/hr-admin/notifications/{self.rows[0].id}/retry/',{},format='json').status_code, (403,404))

    def test_anonymous_and_revoked_membership_rejected(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.path).status_code,(401,403))
        self.assertIn(self.client.patch(self.path,{'read_at':None},format='json').status_code,(401,403))
        self.client.force_authenticate(self.actors[0][0])
        membership = self.actors[0][1].membership
        membership.status='revoked'; membership.save()
        self.assertEqual(self.client.get(self.path).status_code,404)

    def test_search_pagination_and_manager_exclusion(self):
        employee=self.actors[0][1]
        Notification.objects.create(tenant=employee.tenant, recipient_membership=employee.membership, audience_type='manager', channel='in_app',title='Manager secret')
        result=self.client.get('/api/v1/me/notifications/',{'q':'Private','page_size':1}).json()
        self.assertEqual(result['total_count'],1)
        self.assertEqual(len(result['items']),1)
        result=self.client.get('/api/v1/me/notifications/').json()
        self.assertEqual(result['total_count'],1)


from django.test import TransactionTestCase


class Ess5ConcurrentReadTests(TransactionTestCase):
    def test_concurrent_identical_reads_converge_without_dispatch(self):
        from concurrent.futures import ThreadPoolExecutor
        from django.db import close_old_connections
        from tests.test_ess1_profile_contract import Ess1SelfProfileContractTests
        Ess1SelfProfileContractTests.setUpTestData.__func__(type(self))
        user, employee = self.actors[0]
        row = Notification.objects.create(tenant=employee.tenant, recipient_membership=employee.membership,
            audience_type='employee', channel='in_app', status='failed', title='Concurrent synthetic read')
        def mutate(_):
            close_old_connections()
            try:
                client = APIClient(); client.force_authenticate(user)
                result = client.patch(f'/api/v1/me/notifications/{row.id}/', {'read_at':'2026-10-19T10:00:00Z'}, format='json')
                return result.status_code, result.json()['read_at']
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(mutate, range(2)))
        self.assertEqual([code for code,_ in results], [200,200])
        self.assertEqual(results[0][1],results[1][1])
        row.refresh_from_db()
        self.assertEqual(row.status,'failed')
        self.assertEqual(row.delivery_logs.count(),0)
        self.assertIsNotNone(row.read_at)
