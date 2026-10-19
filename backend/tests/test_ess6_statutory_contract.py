"""Final ESS self-service guard/precision checks against PostgreSQL, no policy changes."""
from datetime import date
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from apps.payroll.models import EmployeeStatutoryProfile, EmployeeStatutoryDeclaration, EmployeeStatutoryDeclarationItem, PayrollStatutoryPack


class Ess6StatutoryContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from tests.test_ess1_profile_contract import Ess1SelfProfileContractTests
        Ess1SelfProfileContractTests.setUpTestData.__func__(cls)
        cls.profiles = []
        cls.declarations = []
        for index, (_, employee) in enumerate(cls.actors):
            pack, _ = PayrollStatutoryPack.objects.get_or_create(tenant=employee.tenant, code='ess6-test', defaults={'name':'Synthetic statutory pack','status':'active','effective_from':date(2026,1,1)})
            profile = EmployeeStatutoryProfile.objects.create(tenant=employee.tenant,employee=employee,statutory_pack=pack,effective_from=date(2026,1,1),pan_number=f'ABCDE123{index}F',tax_regime='old')
            cls.profiles.append(profile)
            cls.declarations.append(EmployeeStatutoryDeclaration.objects.create(tenant=employee.tenant,employee=employee,employee_statutory_profile=profile,statutory_pack=pack,financial_year_code='FY2026-27',tax_regime='old'))

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.actors[0][0])

    def test_self_list_cannot_be_retargeted_and_profile_bank_data_stays_restricted(self):
        for _, other in self.actors[1:]:
            result = self.client.get('/api/v1/me/statutory-declarations/', {'employee_id':other.id,'tenant_id':other.tenant_id})
            self.assertEqual(result.status_code,200)
            self.assertEqual([i['id'] for i in result.json()['items']],[str(self.declarations[0].id)])
            self.assertNotIn(str(other.id),str(result.json()))
        general = self.client.get('/api/v1/me/profile/').json()
        self.assertNotIn('pan_number',general)
        self.assertNotIn('account_number',general)
        self.assertNotIn('PRIVATE-ACCOUNT',str(general))

    def test_cross_employee_and_tenant_detail_mutations_fail_without_state_changes(self):
        before = list(EmployeeStatutoryDeclaration.objects.values())
        for item in self.declarations[1:]:
            url=f'/api/v1/me/statutory-declarations/{item.id}/'
            self.assertEqual(self.client.get(url).status_code,404)
            self.assertEqual(self.client.patch(url,{'tax_regime':'new'},format='json').status_code,404)
            self.assertEqual(self.client.post(url+'submit/',{},format='json').status_code,404)
            self.assertEqual(self.client.post(url+'items/',{'name':'Forbidden','section_code':'80C','declared_amount':'1.00'},format='json').status_code,404)
        self.assertEqual(list(EmployeeStatutoryDeclaration.objects.values()),before)

    def test_foreign_profile_cannot_be_used_for_own_creation(self):
        for profile in self.profiles[1:]:
            result=self.client.post('/api/v1/me/statutory-declarations/',{'employee_statutory_profile_id':str(profile.id),'financial_year_code':'FY2027-28','tax_regime':'old'},format='json')
            self.assertEqual(result.status_code,400)
        self.assertEqual(EmployeeStatutoryDeclaration.objects.count(),4)

    def test_actual_draft_item_precision_submit_and_actor_are_persisted(self):
        item=self.declarations[0]
        result=self.client.post(f'/api/v1/me/statutory-declarations/{item.id}/items/',{'section_code':'80C','name':'ESS6 exact amount','declared_amount':'1234.56','proof_document_ref':'synthetic-proof-reference'},format='json')
        self.assertEqual(result.status_code,201)
        proof=EmployeeStatutoryDeclarationItem.objects.get(pk=result.json()['id'])
        self.assertEqual(proof.declared_amount,Decimal('1234.56'))
        self.assertEqual(proof.verified_amount,Decimal('0.00'))
        submitted=self.client.post(f'/api/v1/me/statutory-declarations/{item.id}/submit/',{},format='json')
        self.assertEqual(submitted.status_code,200)
        item.refresh_from_db()
        self.assertEqual(item.status,'submitted')
        self.assertEqual(item.submitted_by,self.actors[0][0])
        self.assertEqual(submitted.json()['declared_total_amount'],'1234.56')
        self.assertIsNotNone(item.submitted_at)

    def test_employee_cannot_verify_proof_or_mutate_locked_declaration(self):
        item=self.declarations[0]
        bad=self.client.post(f'/api/v1/me/statutory-declarations/{item.id}/items/',{'section_code':'80C','name':'Unsafe verification','declared_amount':'10.01','proof_status':'verified'},format='json')
        self.assertEqual(bad.status_code,400)
        self.assertFalse(item.items.exists())
        item.status='locked';item.submitted_at=item.verified_at=item.locked_at=timezone.now();item.save(update_fields=['status','submitted_at','verified_at','locked_at'])
        before=list(EmployeeStatutoryDeclaration.objects.filter(pk=item.pk).values())
        self.assertEqual(self.client.patch(f'/api/v1/me/statutory-declarations/{item.id}/',{'tax_regime':'new'},format='json').status_code,400)
        self.assertEqual(list(EmployeeStatutoryDeclaration.objects.filter(pk=item.pk).values()),before)

    def test_revoked_token_and_privileged_settings_endpoints_are_denied(self):
        from rest_framework.authtoken.models import Token
        token=Token.objects.create(user=self.actors[0][0]);key=token.key;token.delete()
        client=APIClient();client.credentials(HTTP_AUTHORIZATION=f'Token {key}')
        self.assertIn(client.get('/api/v1/me/statutory-declarations/').status_code,[401,403])
        for url in ['/api/v1/hr-admin/employees/','/api/v1/platform/tenants/']:
            self.assertIn(self.client.get(url).status_code,[403,404])
