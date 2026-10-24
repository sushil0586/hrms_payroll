"""Semantic filter regressions, separate from UI/API wiring parity."""
import pytest
from django.core.management import call_command
from django.utils import timezone
from django.test import override_settings
from rest_framework.test import APIClient
from apps.employees.models import Employee
from apps.employee_lifecycle.models import EmployeeOnboarding,ProbationReview,EmployeeMovement,EmployeeExit

@pytest.mark.django_db
@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
def test_lifecycle_owner_filter_excludes_unowned_exits_and_matches_supported_aliases():
    call_command('bootstrap_demo_workspace',password='Password@123',verbosity=0)
    client=APIClient()
    login=client.post('/api/v1/auth/login/',{'identifier':'nisha.rao','password':'Password@123'},format='json')
    assert login.status_code==200,login.json()
    client.credentials(HTTP_AUTHORIZATION='Token '+login.json()['token'])
    tenant=Employee.objects.get(employee_code='EMP-0042').tenant
    manager=Employee.objects.create(tenant=tenant,employee_code='OwnerFilter-Manager',first_name='OwnerFilter',last_name='Manager')
    subject=Employee.objects.create(tenant=tenant,employee_code='OwnerFilter-Subject',first_name='OwnerFilter',last_name='Subject')
    today=timezone.localdate()
    onboarding=EmployeeOnboarding.objects.create(tenant=tenant,employee=subject,assigned_owner_identifier=manager.employee_code,expected_joining_date=today)
    probation=ProbationReview.objects.create(tenant=tenant,employee=subject,reviewer_identifier=manager.employee_code,review_date=today)
    movement=EmployeeMovement.objects.create(tenant=tenant,employee=subject,to_manager=manager,movement_type='transfer',effective_date=today)
    exit_record=EmployeeExit.objects.create(tenant=tenant,employee=subject,status='draft',proposed_last_working_date=today)
    def ids(owner='',**extra):
        response=client.get('/api/v1/hr-admin/lifecycle-queue/',{'q':'OwnerFilter','page_size':100,'owner':owner,**extra})
        assert response.status_code==200,response.json()
        return {item['id'] for item in response.json()['items']}
    assert ids()=={str(x.pk) for x in [onboarding,probation,movement,exit_record]}
    assert ids('identifier:'+manager.employee_code)=={str(x.pk) for x in [onboarding,probation,movement]}
    assert ids('identifier:'+manager.employee_code.lower())=={str(x.pk) for x in [onboarding,probation,movement]}
    assert ids('employee:'+str(manager.pk))=={str(movement.pk)}
    assert ids('identifier:no-such-owner')==set()
    assert ids('identifier:'+manager.employee_code,item_type='exit')==set()
