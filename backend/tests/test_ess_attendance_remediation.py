"""SQE ESS attendance repairs: approved/repeated submissions and schedule-aware eligibility."""
from datetime import date, datetime, timezone
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from apps.attendance.models import AttendanceRecord, AttendanceRegularization, AttendanceStatus, AttendanceSource, EmployeeShiftAssignment, Shift
from apps.attendance.services import submit_regularization, resolve_regularization

URL = '/api/v1/me/attendance-regularizations/'

class EssAttendanceRemediationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from tests.test_ess1_profile_contract import Ess1SelfProfileContractTests
        Ess1SelfProfileContractTests.setUpTestData.__func__(cls)
        cls.employee = cls.actors[0][1]
        cls.manager = cls.actors[1][1]
        cls.employee.reporting_manager = cls.manager
        cls.employee.save(update_fields=['reporting_manager'])
        cls.shift = Shift.objects.create(tenant=cls.employee.tenant, code='sqe-day', name='SQE day', start_time='09:00', end_time='18:00', working_hours='9', weekly_off_days=['saturday','sunday'])
        EmployeeShiftAssignment.objects.create(tenant=cls.employee.tenant, employee=cls.employee, shift=cls.shift, effective_from=date(2028,1,1), is_primary=True)
        cls.record = AttendanceRecord.objects.create(tenant=cls.employee.tenant, employee=cls.employee, attendance_date=date(2028,2,7), status=AttendanceStatus.ABSENT, source=AttendanceSource.MANUAL)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.actors[0][0])

    def payload(self, **changes):
        return {'attendance_record_id':str(self.record.id), 'requested_status':'present', 'requested_check_in_at':'2028-02-07T09:00:00Z', 'requested_check_out_at':'2028-02-07T17:30:00Z', 'reason':'Synthetic missed punches', **changes}

    def test_worked_statuses_require_both_punches_without_writes(self):
        for status in ['present','late','half_day','remote']:
            for missing in ['requested_check_in_at','requested_check_out_at']:
                with self.subTest(status=status,missing=missing):
                    response=self.client.post(URL,self.payload(requested_status=status,**{missing:None}),format='json')
                    self.assertEqual(response.status_code,400)
                    self.assertIn(missing,response.json())
        self.assertEqual(AttendanceRegularization.objects.count(),0)

    def test_service_also_rejects_missing_and_reversed_punches(self):
        with self.assertRaisesMessage(ValueError,'required'):
            submit_regularization(employee=self.employee,attendance_record=self.record,requested_status='present',reason='Synthetic')
        with self.assertRaisesMessage(ValueError,'earlier'):
            submit_regularization(employee=self.employee,attendance_record=self.record,requested_status='present',requested_check_in_at=datetime(2028,2,7,18,tzinfo=timezone.utc),requested_check_out_at=datetime(2028,2,7,9,tzinfo=timezone.utc),reason='Synthetic')
        self.assertEqual(AttendanceRegularization.objects.count(),0)

    def test_approved_request_cannot_be_resubmitted_and_duration_reconciles(self):
        first=self.client.post(URL,self.payload(),format='json');self.assertEqual(first.status_code,201,first.data)
        item=AttendanceRegularization.objects.get(id=first.data['id'])
        resolve_regularization(regularization=item,actor_employee=self.manager,approve=True)
        self.record.refresh_from_db();self.assertEqual(self.record.work_duration_hours,Decimal('8.50'))
        response=self.client.post(URL,self.payload(reason='Different retry'),format='json');self.assertEqual(response.status_code,400)
        self.assertIn('already been approved',response.json()['detail']);self.assertEqual(AttendanceRegularization.objects.count(),1)
        day=self.client.get('/api/v1/me/attendance-records/',{'month':'2028-02'}).json()['days'][0]
        self.assertFalse(day['can_regularize']);self.assertEqual(day['work_duration_hours'],'8.50')

    def test_pending_duplicate_rejected_but_rejected_request_may_retry(self):
        first=self.client.post(URL,self.payload(),format='json');self.assertEqual(first.status_code,201,first.data)
        self.assertEqual(self.client.post(URL,self.payload(),format='json').status_code,400)
        resolve_regularization(regularization=AttendanceRegularization.objects.get(id=first.data['id']),actor_employee=self.manager,approve=False,comment='Correct the explanation')
        self.assertEqual(self.client.post(URL,self.payload(reason='Corrected explanation'),format='json').status_code,201)

    def test_resolved_weekends_reject_but_configured_working_saturday_is_allowed(self):
        for day in [5,6]:
            record=AttendanceRecord.objects.create(tenant=self.employee.tenant,employee=self.employee,attendance_date=date(2028,2,day),status='absent')
            response=self.client.post(URL,self.payload(attendance_record_id=str(record.id)),format='json')
            self.assertEqual(response.status_code,400);self.assertIn('weekly off',response.json()['detail'])
        self.shift.weekly_off_days=['sunday'];self.shift.save(update_fields=['weekly_off_days'])
        saturday=self.employee.attendance_records.get(attendance_date=date(2028,2,5))
        response=self.client.post(URL,self.payload(attendance_record_id=str(saturday.id),requested_check_in_at='2028-02-05T09:00:00Z',requested_check_out_at='2028-02-05T17:30:00Z'),format='json')
        self.assertEqual(response.status_code,201,response.data)

    def test_absent_can_be_requested_without_punches(self):
        response=self.client.post(URL,self.payload(requested_status='absent',requested_check_in_at=None,requested_check_out_at=None),format='json');self.assertEqual(response.status_code,201,response.data)

    def test_approved_history_or_flag_disables_projection(self):
        self.record.is_regularized=True;self.record.save(update_fields=['is_regularized'])
        day=self.client.get('/api/v1/me/attendance-records/',{'month':'2028-02'}).json()['days'][0]
        self.assertFalse(day['can_regularize']);self.assertIn('already been approved',day['regularization_unavailable_reason'])

    def test_valid_punches_do_not_bypass_locked_day(self):
        self.record.is_locked=True;self.record.save(update_fields=['is_locked'])
        response=self.client.post(URL,self.payload(),format='json')
        self.assertEqual(response.status_code,400)
        self.assertIn('locked',response.json()['detail'])
        self.assertEqual(AttendanceRegularization.objects.count(),0)

    def test_foreign_record_cannot_be_submitted(self):
        other=self.actors[2][1];foreign=AttendanceRecord.objects.create(tenant=other.tenant,employee=other,attendance_date=date(2028,2,7),status='absent')
        response=self.client.post(URL,self.payload(attendance_record_id=str(foreign.id)),format='json');self.assertEqual(response.status_code,404);self.assertEqual(AttendanceRegularization.objects.count(),0)

from django.test import TransactionTestCase

class EssAttendanceSubmissionConcurrencyTests(TransactionTestCase):
    def setUp(self):
        EssAttendanceRemediationTests.setUpTestData.__func__(type(self))

    def test_simultaneous_submissions_create_one_request(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier
        from django.db import close_old_connections, connection
        self.assertEqual(connection.vendor,'postgresql')
        barrier=Barrier(2)
        def submit(_):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                try:
                    item=submit_regularization(employee=self.employee,attendance_record=self.record,requested_status='present',requested_check_in_at=datetime(2028,2,7,9,tzinfo=timezone.utc),requested_check_out_at=datetime(2028,2,7,17,30,tzinfo=timezone.utc),reason='Synthetic simultaneous correction')
                    return ('created',str(item.id))
                except ValueError as exc:
                    return ('rejected',str(exc))
            finally:close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(submit,range(2)))
        self.assertEqual(sorted(row[0] for row in results),['created','rejected'])
        self.assertIn('pending',next(row[1] for row in results if row[0]=='rejected'))
        self.assertEqual(AttendanceRegularization.objects.count(),1)
        self.assertTrue(AttendanceRegularization.objects.get().workflow_reference)
