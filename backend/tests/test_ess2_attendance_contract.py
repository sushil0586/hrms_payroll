"""Employee monthly projection: database-backed authorization and history safety."""
from datetime import date, datetime, timezone
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.attendance.models import AttendanceRecord, AttendanceStatus, AttendanceSource
from apps.iam.models import MembershipStatus


class Ess2AttendanceContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from tests.test_ess1_profile_contract import Ess1SelfProfileContractTests
        Ess1SelfProfileContractTests.setUpTestData.__func__(cls)
        for index, (_, employee) in enumerate(cls.actors):
            employee.tenant.timezone = "America/New_York"
            employee.tenant.save(update_fields=["timezone"])
            for day in range(1, 30):
                AttendanceRecord.objects.create(tenant=employee.tenant, employee=employee,
                    attendance_date=date(2028, 2, day), status=AttendanceStatus.PRESENT,
                    source=AttendanceSource.MANUAL, work_duration_hours="8.00",
                    check_in_at=datetime(2028, 2, day, 4, 30, tzinfo=timezone.utc),
                    geo_metadata={"private": "DO-NOT-EXPOSE"}, source_payload={"raw": "DO-NOT-EXPOSE"})

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.actors[0][0])

    def get(self, **params):
        return self.client.get("/api/v1/me/attendance-records/", {"month": "2028-02", **params})

    def test_month_leap_day_pagination_and_no_materialization(self):
        before = list(AttendanceRecord.objects.values())
        result = self.get(page=3, page_size=10)
        self.assertEqual(result.status_code, 200)
        data = result.json()
        self.assertEqual((data["period_end"], data["total_count"], len(data["days"]), len(data["items"])), ("2028-02-29", 29, 29, 9))
        self.assertFalse(data["has_next"])
        self.assertEqual(self.get(page=999).json()["page"], 3)
        self.assertEqual(self.get(month="2030-01").json()["days"], [])
        self.assertEqual(list(AttendanceRecord.objects.values()), before)

    def test_same_tenant_and_foreign_tenant_ids_cannot_retarget_self(self):
        own = self.actors[0][1]
        own_ids = set(str(pk) for pk in own.attendance_records.values_list("pk", flat=True))
        for _, other in self.actors[1:]:
            result = self.get(employee_id=str(other.id), tenant_id=str(other.tenant_id))
            self.assertEqual(result.status_code, 200)
            self.assertEqual({day["id"] for day in result.json()["days"]}, own_ids)
            self.assertNotIn("DO-NOT-EXPOSE", result.content.decode())
            self.assertNotIn("source_payload", result.content.decode())

    def test_invalid_period_and_pagination_are_rejected(self):
        for params in [{"month": "2028-13"}, {"month": "2028-02-01"}, {"month": "0000-01"}, {"page": 0}, {"page_size": 32}, {"page": "bad"}]:
            self.assertEqual(self.get(**params).status_code, 400)

    def test_tenant_today_and_date_only_are_independent_of_utc_punch(self):
        with patch("apps.common.ess_attendance.timezone.now", return_value=datetime(2028, 3, 1, 0, 30, tzinfo=timezone.utc)):
            data = self.get(month="").json()
        self.assertEqual((data["month"], data["today"], data["timezone"]), ("2028-02", "2028-02-29", "America/New_York"))
        self.assertEqual(data["days"][0]["attendance_date"], "2028-02-01")
        self.assertIn("04:30:00", data["days"][0]["check_in_at"])

    def test_locked_record_has_no_live_derivation_or_correction(self):
        record = self.actors[0][1].attendance_records.first()
        record.is_locked = True
        record.save(update_fields=["is_locked"])
        before = list(AttendanceRecord.objects.values())
        with patch("apps.common.ess_attendance.build_attendance_derivation_summary", return_value={"warnings": [], "reasons": []}) as derivation:
            day = next(day for day in self.get().json()["days"] if day["id"] == str(record.id))
            self.assertEqual(derivation.call_count, 28)
        self.assertIsNone(day["derivation_summary"])
        self.assertFalse(day["can_regularize"])
        result = self.client.post("/api/v1/me/attendance-regularizations/", {"attendance_record_id": str(record.id), "requested_status": "present", "reason": "Synthetic correction"}, format="json")
        self.assertEqual(result.status_code, 400)
        self.assertEqual(list(AttendanceRecord.objects.values()), before)

    def test_foreign_regularization_and_raw_mutation_are_denied(self):
        for _, other in self.actors[1:]:
            result = self.client.post("/api/v1/me/attendance-regularizations/", {"attendance_record_id": str(other.attendance_records.first().id), "requested_status": "present", "reason": "Synthetic attempt"}, format="json")
            self.assertEqual(result.status_code, 404)
        for method in [self.client.post, self.client.patch, self.client.put, self.client.delete]:
            self.assertEqual(method("/api/v1/me/attendance-records/?month=2028-02", {"status": "absent"}, format="json").status_code, 405)

    def test_anonymous_missing_and_revoked_context_are_rejected(self):
        self.client.force_authenticate(None)
        self.assertIn(self.get().status_code, [401, 403])
        self.client.force_authenticate(self.actors[0][0])
        membership = self.actors[0][1].membership
        membership.status = MembershipStatus.REVOKED
        membership.save(update_fields=["status"])
        self.assertEqual(self.get().status_code, 404)

    def test_effective_policy_controls_per_day_correction_availability(self):
        from apps.attendance.models import AttendancePolicy, AttendancePolicyAssignment
        employee = self.actors[0][1]
        policy = AttendancePolicy.objects.create(tenant=employee.tenant, code="no-correction", name="Synthetic restricted policy", status="active", allow_regularization=False)
        AttendancePolicyAssignment.objects.create(tenant=employee.tenant, employee=employee, attendance_policy=policy, effective_from=date(2028, 2, 15), effective_to=date(2028, 2, 29))
        days = self.get().json()["days"]
        self.assertTrue(days[0]["can_regularize"])
        self.assertFalse(days[-1]["can_regularize"])
        result = self.client.post("/api/v1/me/attendance-regularizations/", {"attendance_record_id": days[-1]["id"], "requested_status": "present", "reason": "Synthetic blocked policy attempt"}, format="json")
        self.assertEqual(result.status_code, 400)

    def test_pending_request_disables_resubmission_and_foreign_detail_is_hidden(self):
        from apps.attendance.models import AttendanceRegularization
        employee = self.actors[0][1]
        record = employee.attendance_records.first()
        request = AttendanceRegularization.objects.create(tenant=employee.tenant, employee=employee, attendance_record=record, status="pending", requested_status="present", reason="Synthetic pending request")
        day = next(day for day in self.get().json()["days"] if day["id"] == str(record.id))
        self.assertFalse(day["can_regularize"])
        self.assertEqual(self.get().json()["summary"]["pending_corrections"], 1)
        for user, _ in self.actors[1:]:
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(f"/api/v1/me/attendance-regularizations/{request.id}/").status_code, 404)

    def test_legacy_latest_records_contract_remains_an_array(self):
        result = self.client.get("/api/v1/me/attendance-records/")
        self.assertEqual(result.status_code, 200)
        self.assertIsInstance(result.json(), list)
        self.assertLessEqual(len(result.json()), 30)
        self.assertTrue(result.json())
        self.assertIn("derivation_summary", result.json()[0])
