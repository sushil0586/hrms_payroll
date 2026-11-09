"""Attendance-only schedule dependency and ordinary UTC elapsed-duration cases."""
from datetime import date,datetime,time,timezone
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone as clock
from apps.attendance.models import EmployeeShiftAssignment
from apps.attendance.services import _find_matching_employee_shift_assignment,AttendanceDerivationContext,evaluate_attendance_runtime

class AttendanceScheduleDependencyTests(TestCase):
 @classmethod
 def setUpTestData(cls):
  from test_ess_attendance_remediation import EssAttendanceRemediationTests
  EssAttendanceRemediationTests.setUpTestData.__func__(cls)

 def test_cancelled_assignment_does_not_resolve_direct_or_batch(self):
  item=EmployeeShiftAssignment.objects.get(employee=self.employee);item.cancelled_at=clock.now();item.save(update_fields=['cancelled_at'])
  self.assertIsNone(_find_matching_employee_shift_assignment(employee=self.employee,attendance_date=self.record.attendance_date))
  self.assertIsNone(AttendanceDerivationContext.for_records([self.record]).shift_assignment_for(self.employee,self.record.attendance_date))

 def test_ended_assignment_is_inclusive_for_attendance(self):
  item=EmployeeShiftAssignment.objects.get(employee=self.employee);item.effective_to=date(2028,2,7);item.save(update_fields=['effective_to'])
  self.assertEqual(_find_matching_employee_shift_assignment(employee=self.employee,attendance_date=date(2028,2,7)).id,item.id)
  self.assertIsNone(_find_matching_employee_shift_assignment(employee=self.employee,attendance_date=date(2028,2,8)))

 def test_ordinary_utc_overnight_duration_is_eight_hours(self):
  self.shift.start_time=time(22);self.shift.end_time=time(6);self.shift.is_night_shift=True;self.shift.working_hours=8;self.shift.save()
  result=evaluate_attendance_runtime(employee=self.employee,attendance_date=date(2028,2,7),check_in_at=datetime(2028,2,7,22,tzinfo=timezone.utc),check_out_at=datetime(2028,2,8,6,tzinfo=timezone.utc),explicit_status='present',shift=self.shift)
  self.assertEqual(result['work_duration_hours'],Decimal('8.00'))
