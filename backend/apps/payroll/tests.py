from types import SimpleNamespace
from datetime import date

from django.test import SimpleTestCase, TestCase

from apps.employees.models import Employee, EmploymentStatus
from apps.payroll.models import (
    PayrollCalendar,
    PayrollCalculationLine,
    PayrollCalculationLineStatus,
    PayrollCalculationStatus,
    PayrollFrequency,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollOutputArtifactKind,
    PayrollOutputBatchStatus,
    PayrollPeriod,
    PayrollPeriodStatus,
    PayrollReviewStatus,
    PayrollRuleDefinition,
    PayrollRuleType,
    PayrollRuleVersion,
    PayrollRuleVersionStatus,
    PayrollRun,
    PayrollRunStatus,
)
from apps.payroll.services import (
    _artifact_extension,
    _artifact_file_payload,
    build_payroll_rule_context_from_snapshot,
    build_payroll_output_reconciliation_summary,
    build_payroll_payslip_render_model,
    calculate_draft_payroll_run,
    evaluate_payroll_rule_version,
    generate_payroll_finance_handoff,
    publish_payroll_output_batch,
    PayrollFinanceHandoffError,
    PayrollOutputError,
)
from apps.tenants.models import SubscriptionPlan, Tenant, TenantStatus


class PayrollScheduleSpineRuleContextTests(SimpleTestCase):
    def test_payroll_rule_can_consume_schedule_spine_working_day_counts(self):
        snapshot = SimpleNamespace(
            employee_snapshot={},
            organization_snapshot={},
            salary_snapshot={"monthly_gross": "60000.00"},
            attendance_snapshot={
                "schedule_spine": {
                    "calendar_days": 30,
                    "working_days": 22,
                    "weekly_off_days": 8,
                    "holiday_days": 0,
                    "payable_schedule_days": 22,
                }
            },
            leave_snapshot={
                "schedule_spine": {
                    "working_days": 22,
                    "non_working_days": 8,
                }
            },
            lifecycle_snapshot={},
            document_snapshot={},
            banking_snapshot={},
            validation_snapshot={},
            config_snapshot={},
        )
        rule_version = SimpleNamespace(
            expression="round_decimal(salary.monthly_gross / attendance.schedule_spine.working_days * leave.schedule_spine.non_working_days, 2)"
        )

        context = build_payroll_rule_context_from_snapshot(snapshot)
        result = evaluate_payroll_rule_version(rule_version, context=context)

        self.assertEqual(str(result.result), "21818.18")
        self.assertIn("attendance.schedule_spine.working_days", result.dependencies)
        self.assertIn("leave.schedule_spine.non_working_days", result.dependencies)


class PayrollScheduleSpineCalculationTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            code="payroll-spine-co",
            name="Payroll Spine Co",
            legal_name="Payroll Spine Co Pvt Ltd",
            status=TenantStatus.ACTIVE,
            subscription_plan=SubscriptionPlan.ENTERPRISE,
            country_code="IN",
            timezone="Asia/Kolkata",
        )
        self.employee = Employee.objects.create(
            tenant=self.tenant,
            employee_code="EMP-PAY-001",
            first_name="Aditi",
            last_name="Payroll",
            employment_status=EmploymentStatus.ACTIVE,
        )
        calendar = PayrollCalendar.objects.create(
            tenant=self.tenant,
            code="monthly",
            name="Monthly",
            frequency=PayrollFrequency.MONTHLY,
        )
        period = PayrollPeriod.objects.create(
            tenant=self.tenant,
            calendar=calendar,
            code="oct-2026",
            name="October 2026",
            start_date=date(2026, 10, 1),
            end_date=date(2026, 10, 31),
            pay_date=date(2026, 11, 1),
            status=PayrollPeriodStatus.OPEN,
        )
        self.payroll_run = PayrollRun.objects.create(
            tenant=self.tenant,
            period=period,
            code="oct-2026-run",
            name="October 2026 Run",
            status=PayrollRunStatus.INPUTS_LOCKED,
            config_snapshot={"calculation_profile": {"rule_codes": ["schedule-spine-lwp"]}},
        )
        self.snapshot = PayrollInputSnapshot.objects.create(
            tenant=self.tenant,
            payroll_run=self.payroll_run,
            employee=self.employee,
            snapshot_status=PayrollInputSnapshotStatus.LOCKED,
            salary_snapshot={"annual_ctc": "744000.00", "monthly_gross": "62000.00"},
            attendance_snapshot={
                "schedule_spine": {
                    "calendar_days": 31,
                    "working_days": 23,
                    "weekly_off_days": 8,
                    "holiday_days": 0,
                    "payable_schedule_days": 23,
                }
            },
            leave_snapshot={
                "schedule_spine": {
                    "working_days": 23,
                    "non_working_days": 8,
                }
            },
            validation_snapshot={"blockers": [], "warnings": []},
        )
        rule = PayrollRuleDefinition.objects.create(
            tenant=self.tenant,
            code="schedule-spine-lwp",
            name="Schedule Spine LWP",
            rule_type=PayrollRuleType.FORMULA,
            config_snapshot={
                "component_code": "LWP_SCHEDULE",
                "component_name": "Schedule Spine LWP",
                "line_type": "deduction",
                "calculation_order": 40,
            },
        )
        self.rule_version = PayrollRuleVersion.objects.create(
            tenant=self.tenant,
            rule=rule,
            version=1,
            status=PayrollRuleVersionStatus.ACTIVE,
            expression="round_decimal(salary.monthly_gross / attendance.schedule_spine.working_days * leave.schedule_spine.non_working_days, 2)",
            effective_from=date(2026, 10, 1),
            config_snapshot=rule.config_snapshot,
        )

    def test_draft_calculation_uses_schedule_spine_context_from_locked_snapshot(self):
        calculation = calculate_draft_payroll_run(self.payroll_run)

        self.assertEqual(calculation.status, PayrollCalculationStatus.COMPLETED)
        line = PayrollCalculationLine.objects.get(calculation=calculation, rule_version=self.rule_version)
        self.assertEqual(line.status, PayrollCalculationLineStatus.CALCULATED)
        self.assertEqual(str(line.amount), "21565.22")
        self.assertEqual(line.component_code, "LWP_SCHEDULE")
        self.assertIn("attendance.schedule_spine.working_days", line.trace_snapshot["dependencies"])
        self.assertIn("leave.schedule_spine.non_working_days", line.trace_snapshot["dependencies"])
        self.assertEqual(line.context_snapshot["attendance"]["schedule_spine"]["working_days"], 23)
        self.payroll_run.refresh_from_db()
        self.assertEqual(self.payroll_run.status, PayrollRunStatus.CALCULATED)


class FakeArtifactQuerySet(list):
    def all(self):
        return self

    def count(self):
        return len(self)

    def filter(self, **kwargs):
        items = self
        for key, value in kwargs.items():
            items = [item for item in items if getattr(item, key) == value]
        return FakeArtifactQuerySet(items)

    def order_by(self, *_fields):
        return self

    def select_related(self, *_fields):
        return self

    def first(self):
        return self[0] if self else None


class PayrollPayslipRenderModelTests(SimpleTestCase):
    def artifact(self, *, line_snapshot, totals_snapshot=None, config_snapshot=None, input_snapshot=None):
        return SimpleNamespace(
            id="artifact-1",
            title="September 2026 Payslip",
            file_name="september-2026-payslip.pdf",
            source_hash="a" * 64,
            checksum_sha256="b" * 64,
            totals_snapshot=totals_snapshot
            or {
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87500.00",
            },
            line_snapshot=line_snapshot,
            config_snapshot=config_snapshot or {},
            input_snapshot=input_snapshot,
            employee=SimpleNamespace(employee_code="E001", __str__=lambda self: "Anika Rao"),
            payroll_run=SimpleNamespace(code="PAY-SEP-2026", name="September Payroll", period=None),
        )

    def section(self, model, key):
        return next(item for item in model["sections"] if item["key"] == key)

    def test_groups_visible_lines_for_payslip_sections(self):
        artifact = self.artifact(
            line_snapshot=[
                {"component_code": "BASIC", "component_name": "Basic", "line_type": "earning", "amount": "60000.00"},
                {"component_code": "HRA", "component_name": "HRA", "line_type": "earning", "amount": "40000.00"},
                {"component_code": "PF", "component_name": "PF", "line_type": "deduction", "amount": "2500.00"},
                {"component_code": "TDS", "component_name": "TDS", "line_type": "tax", "amount": "10000.00"},
                {"component_code": "PF-ER", "component_name": "Employer PF", "line_type": "employer_contribution", "amount": "12000.00"},
            ],
            config_snapshot={"artifact_template_ref": "tenant.payslip.pdf.v1"},
        )

        model = build_payroll_payslip_render_model(artifact)

        self.assertEqual(model["template_ref"], "tenant.payslip.pdf.v1")
        self.assertEqual(self.section(model, "earnings")["total"], "100000.00")
        self.assertEqual(self.section(model, "deductions")["total"], "2500.00")
        self.assertEqual(self.section(model, "tax")["total"], "10000.00")
        self.assertEqual(self.section(model, "employer_contributions")["total"], "12000.00")
        self.assertEqual(model["totals"]["net_pay"], "87500.00")
        self.assertEqual(model["quality"]["visible_line_count"], 5)

    def test_carries_schedule_spine_day_count_basis_from_input_snapshot(self):
        artifact = self.artifact(
            line_snapshot=[
                {"component_code": "BASIC", "component_name": "Basic", "line_type": "earning", "amount": "60000.00"},
            ],
            input_snapshot=SimpleNamespace(
                attendance_snapshot={
                    "schedule_spine": {
                        "schema_ref": "payroll.schedule_spine.v1",
                        "source": "employee_roster",
                        "calendar_days": 30,
                        "working_days": 22,
                        "weekly_off_days": 6,
                        "holiday_days": 2,
                        "non_working_days": 8,
                        "payable_schedule_days": 22,
                        "days": [
                            {
                                "date": "2026-09-01",
                                "day_type": "working_day",
                                "is_working_day": True,
                                "shift_code": "DAY",
                                "resolution_source": "employee_shift_assignment",
                            },
                            {
                                "date": "2026-09-06",
                                "day_type": "weekly_off",
                                "is_working_day": False,
                                "weekly_off_source": "employee_shift_assignment",
                            },
                        ],
                    }
                },
                leave_snapshot={
                    "schedule_spine": {
                        "working_days": 22,
                        "non_working_days": 8,
                    }
                },
            ),
        )

        model = build_payroll_payslip_render_model(artifact)

        self.assertTrue(model["day_count_basis"]["available"])
        self.assertEqual(model["day_count_basis"]["source"], "employee_roster")
        self.assertEqual(model["day_count_basis"]["working_days"], 22)
        self.assertEqual(model["day_count_basis"]["weekly_off_days"], 6)
        self.assertEqual(model["day_count_basis"]["holiday_days"], 2)
        self.assertEqual(model["day_count_basis"]["leave_non_working_days"], 8)
        self.assertEqual(model["day_count_basis"]["days"][0]["resolution_source"], "employee_shift_assignment")
        self.assertEqual(model["day_count_basis"]["readiness_status"], "ready")
        self.assertTrue(model["quality"]["has_day_count_basis"])

    def test_hidden_payslip_lines_are_excluded_from_render_sections(self):
        artifact = self.artifact(
            line_snapshot=[
                {"component_code": "BASIC", "component_name": "Basic", "line_type": "earning", "amount": "60000.00"},
                {
                    "component_code": "INTERNAL",
                    "component_name": "Internal Accrual",
                    "line_type": "informational",
                    "amount": "1.00",
                    "config_snapshot": {"payslip_visibility": "hidden"},
                },
            ],
        )

        model = build_payroll_payslip_render_model(artifact)

        self.assertEqual(model["quality"]["hidden_line_count"], 1)
        self.assertEqual(model["quality"]["visible_line_count"], 1)
        self.assertEqual(self.section(model, "informational")["lines"], [])

    def test_tax_sheet_marks_available_and_carries_tds_trace(self):
        artifact = self.artifact(
            line_snapshot=[
                {
                    "component_code": "TDS",
                    "component_name": "Tax Deducted at Source",
                    "line_type": "tax",
                    "amount": "10000.00",
                    "ytd_amount": "45000.00",
                    "source_hash": "c" * 64,
                    "config_snapshot": {
                        "statutory_type": "tax_deducted_at_source",
                        "statutory_treatment_ref": "india.tds.section_192",
                    },
                }
            ],
            config_snapshot={
                "tax_regime": "new_regime",
                "taxable_earnings": "900000.00",
                "taxable_deductions": "150000.00",
                "projected_annual_tax": "120000.00",
                "remaining_annual_tax": "75000.00",
                "proof_status_summary": {"verified": 2, "pending": 1, "rejected": 0},
            },
        )

        model = build_payroll_payslip_render_model(artifact)

        self.assertTrue(model["tax_sheet"]["available"])
        self.assertEqual(model["tax_sheet"]["tax_regime"], "new_regime")
        self.assertEqual(model["tax_sheet"]["current_period_tax"], "10000.00")
        self.assertEqual(model["tax_sheet"]["ytd_tax"], "45000.00")
        self.assertEqual(model["tax_sheet"]["taxable_earnings"], "900000.00")
        self.assertEqual(model["tax_sheet"]["taxable_deductions"], "150000.00")
        self.assertEqual(model["tax_sheet"]["projected_annual_tax"], "120000.00")
        self.assertEqual(model["tax_sheet"]["remaining_annual_tax"], "75000.00")
        self.assertEqual(model["tax_sheet"]["readiness_status"], "warning")
        self.assertEqual(model["tax_sheet"]["source_hash_count"], 1)
        self.assertEqual(model["tax_sheet"]["statutory_line_count"], 1)
        self.assertEqual(model["tax_sheet"]["proof_status_summary"]["verified"], 2)
        self.assertIn("pending", model["tax_sheet"]["readiness_warnings"][0].lower())
        self.assertEqual(model["tax_sheet"]["lines"][0]["source_hash"], "c" * 64)

    def test_tax_sheet_warns_when_tax_line_lacks_source_hash(self):
        artifact = self.artifact(
            line_snapshot=[
                {
                    "component_code": "TDS",
                    "component_name": "Tax Deducted at Source",
                    "line_type": "tax",
                    "amount": "10000.00",
                    "config_snapshot": {"statutory_type": "tax_deducted_at_source"},
                }
            ],
            config_snapshot={"tax_sheet_profile": {"enabled": True}, "proof_status_summary": {"verified": 1, "pending": 0, "rejected": 0}},
        )

        model = build_payroll_payslip_render_model(artifact)

        self.assertEqual(model["tax_sheet"]["readiness_status"], "warning")
        self.assertEqual(model["tax_sheet"]["source_hash_count"], 0)
        self.assertIn("source hash", model["tax_sheet"]["readiness_warnings"][0].lower())

    def test_tax_sheet_marks_no_tax_payslip_not_applicable(self):
        artifact = self.artifact(
            line_snapshot=[
                {"component_code": "BASIC", "component_name": "Basic", "line_type": "earning", "amount": "60000.00"},
                {"component_code": "HRA", "component_name": "HRA", "line_type": "earning", "amount": "40000.00"},
            ],
            config_snapshot={"tax_regime": "old_regime"},
        )

        model = build_payroll_payslip_render_model(artifact)

        self.assertFalse(model["tax_sheet"]["available"])
        self.assertEqual(model["tax_sheet"]["tax_regime"], "old_regime")
        self.assertEqual(model["tax_sheet"]["current_period_tax"], "0.00")
        self.assertEqual(model["tax_sheet"]["readiness_status"], "not_applicable")
        self.assertEqual(model["tax_sheet"]["readiness_warnings"], [])

    def test_tax_sheet_distinguishes_old_and_new_regime(self):
        old_model = build_payroll_payslip_render_model(self.artifact(
            line_snapshot=[{
                "component_code": "TDS",
                "component_name": "Tax Deducted at Source",
                "line_type": "tax",
                "amount": "7000.00",
                "source_hash": "d" * 64,
                "config_snapshot": {"statutory_type": "tax_deducted_at_source"},
            }],
            config_snapshot={"tax_regime": "old_regime", "proof_status_summary": {"verified": 1, "pending": 0, "rejected": 0}},
        ))
        new_model = build_payroll_payslip_render_model(self.artifact(
            line_snapshot=[{
                "component_code": "TDS",
                "component_name": "Tax Deducted at Source",
                "line_type": "tax",
                "amount": "9000.00",
                "source_hash": "e" * 64,
                "config_snapshot": {"statutory_type": "tax_deducted_at_source"},
            }],
            config_snapshot={"tax_regime": "new_regime", "proof_status_summary": {"verified": 1, "pending": 0, "rejected": 0}},
        ))

        self.assertEqual(old_model["tax_sheet"]["tax_regime"], "old_regime")
        self.assertEqual(old_model["tax_sheet"]["readiness_status"], "ready")
        self.assertEqual(new_model["tax_sheet"]["tax_regime"], "new_regime")
        self.assertEqual(new_model["tax_sheet"]["readiness_status"], "ready")

    def test_tax_sheet_warns_for_rejected_proofs(self):
        artifact = self.artifact(
            line_snapshot=[{
                "component_code": "TDS",
                "component_name": "Tax Deducted at Source",
                "line_type": "tax",
                "amount": "10000.00",
                "source_hash": "f" * 64,
                "config_snapshot": {"statutory_type": "tax_deducted_at_source"},
            }],
            config_snapshot={"tax_regime": "new_regime", "proof_status_summary": {"verified": 1, "pending": 0, "rejected": 2}},
        )

        model = build_payroll_payslip_render_model(artifact)

        self.assertEqual(model["tax_sheet"]["readiness_status"], "warning")
        self.assertTrue(any("rejected" in warning.lower() for warning in model["tax_sheet"]["readiness_warnings"]))

    def test_pdf_payslip_payload_contains_required_sections(self):
        payload = _artifact_file_payload(
            kind=PayrollOutputArtifactKind.PAYSLIP,
            title="September 2026 Payslip",
            totals_snapshot={
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87500.00",
            },
            line_snapshot=[
                {"component_code": "BASIC", "component_name": "Basic", "line_type": "earning", "amount": "100000.00"},
                {
                    "component_code": "TDS",
                    "component_name": "Tax Deducted at Source",
                    "line_type": "tax",
                    "amount": "10000.00",
                    "config_snapshot": {"statutory_type": "tax_deducted_at_source"},
                },
            ],
            config_snapshot={
                "artifact_template_ref": "tenant.payslip.pdf.v1",
                "tax_regime": "new_regime",
                "day_count_basis": {
                    "attendance_schedule_spine": {
                        "source": "employee_roster",
                        "working_days": 22,
                        "weekly_off_days": 6,
                        "holiday_days": 2,
                    },
                    "leave_schedule_spine": {"working_days": 22, "non_working_days": 8},
                },
            },
            mime_type="application/pdf",
            employee_name="Anika Rao",
            employee_code="E001",
            payroll_run_name="September Payroll",
        )

        self.assertEqual(_artifact_extension("application/pdf"), "pdf")
        self.assertTrue(payload.startswith("%PDF-1.4"))
        self.assertIn("PAYSLIP", payload)
        self.assertIn("September 2026 Payslip", payload)
        self.assertIn("Employee details", payload)
        self.assertIn("Net pay summary", payload)
        self.assertIn("Net pay: 87500.00", payload)
        self.assertIn("Payslip detail", payload)
        self.assertIn("Tax sheet", payload)
        self.assertIn("Tax regime: new_regime", payload)
        self.assertIn("Readiness: warning", payload)
        self.assertIn("Taxable earnings: 0.00", payload)
        self.assertIn("Source hashes: 0", payload)
        self.assertIn("Day-count basis: employee_roster", payload)
        self.assertIn("Working/weekly off/holiday: 22/6/2", payload)
        self.assertIn("Tax Deducted at Source", payload)
        self.assertIn("HRMS Payroll - employee confidential", payload)

    def test_tax_sheet_profile_can_be_employee_specific(self):
        base_profile = {
            "tax_sheet_profile": {"enabled": True},
            "tax_regime": "new_regime",
            "taxable_earnings": "900000.00",
            "per_employee_tax_sheet_profiles": {
                "E002": {
                    "tax_sheet_profile": None,
                    "tax_regime": "old_regime",
                    "taxable_earnings": "0.00",
                }
            },
        }
        payslip_config = {"artifact_template_ref": "tenant.payslip.pdf.v1"}
        employee_profile = base_profile["per_employee_tax_sheet_profiles"]["E002"]
        for profile_key in ["tax_sheet_profile", "tax_regime", "taxable_earnings"]:
            if profile_key in employee_profile:
                payslip_config[profile_key] = employee_profile[profile_key]
            elif profile_key in base_profile:
                payslip_config[profile_key] = base_profile[profile_key]

        artifact = self.artifact(
            line_snapshot=[
                {"component_code": "BASIC", "component_name": "Basic", "line_type": "earning", "amount": "60000.00"},
                {
                    "component_code": "PF",
                    "component_name": "Provident Fund",
                    "line_type": "deduction",
                    "amount": "1800.00",
                    "config_snapshot": {"statutory_type": "provident_fund"},
                },
            ],
            config_snapshot=payslip_config,
        )

        model = build_payroll_payslip_render_model(artifact)

        self.assertIsNone(payslip_config["tax_sheet_profile"])
        self.assertFalse(model["tax_sheet"]["available"])
        self.assertEqual(model["tax_sheet"]["statutory_line_count"], 0)
        self.assertEqual(model["tax_sheet"]["tax_regime"], "old_regime")
        self.assertEqual(model["tax_sheet"]["taxable_earnings"], "0.00")
        self.assertEqual(model["tax_sheet"]["readiness_status"], "not_applicable")

    def test_output_reconciliation_passes_when_payslip_matches_register(self):
        employee = SimpleNamespace(employee_code="E001", __str__=lambda self: "Anika Rao")
        payslip = SimpleNamespace(
            kind=PayrollOutputArtifactKind.PAYSLIP,
            employee=employee,
            employee_id="employee-1",
            title="Payslip - Anika Rao",
            totals_snapshot={
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87500.00",
            },
        )
        register = SimpleNamespace(
            kind=PayrollOutputArtifactKind.REGISTER,
            created_at=1,
            line_snapshot=[{
                "employee_code": "E001",
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87500.00",
            }],
        )
        batch = SimpleNamespace(artifacts=FakeArtifactQuerySet([payslip, register]))

        summary = build_payroll_output_reconciliation_summary(batch)

        self.assertEqual(summary["status"], "passed")
        self.assertEqual(summary["matched_employee_count"], 1)
        self.assertEqual(summary["mismatch_count"], 0)

    def test_output_reconciliation_reports_amount_mismatches(self):
        employee = SimpleNamespace(employee_code="E001", __str__=lambda self: "Anika Rao")
        payslip = SimpleNamespace(
            kind=PayrollOutputArtifactKind.PAYSLIP,
            employee=employee,
            employee_id="employee-1",
            title="Payslip - Anika Rao",
            totals_snapshot={
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87500.00",
            },
        )
        register = SimpleNamespace(
            kind=PayrollOutputArtifactKind.REGISTER,
            created_at=1,
            line_snapshot=[{
                "employee_code": "E001",
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87000.00",
            }],
        )
        batch = SimpleNamespace(artifacts=FakeArtifactQuerySet([payslip, register]))

        summary = build_payroll_output_reconciliation_summary(batch)

        self.assertEqual(summary["status"], "failed")
        self.assertEqual(summary["mismatch_count"], 1)
        self.assertEqual(summary["mismatches"][0]["field"], "net_pay")

    def test_output_reconciliation_reports_register_rows_without_payslips(self):
        employee = SimpleNamespace(employee_code="E001", __str__=lambda self: "Anika Rao")
        payslip = SimpleNamespace(
            kind=PayrollOutputArtifactKind.PAYSLIP,
            employee=employee,
            employee_id="employee-1",
            title="Payslip - Anika Rao",
            totals_snapshot={
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87500.00",
            },
        )
        register = SimpleNamespace(
            kind=PayrollOutputArtifactKind.REGISTER,
            created_at=1,
            line_snapshot=[
                {
                    "employee_code": "E001",
                    "gross_earnings": "100000.00",
                    "employee_deductions": "12500.00",
                    "employer_contributions": "12000.00",
                    "net_pay": "87500.00",
                },
                {
                    "employee_code": "E002",
                    "employee_name": "Unexpected Employee",
                    "gross_earnings": "100.00",
                    "employee_deductions": "0.00",
                    "employer_contributions": "0.00",
                    "net_pay": "100.00",
                },
            ],
        )
        batch = SimpleNamespace(artifacts=FakeArtifactQuerySet([payslip, register]))

        summary = build_payroll_output_reconciliation_summary(batch)

        self.assertEqual(summary["status"], "failed")
        self.assertEqual(summary["mismatch_count"], 1)
        self.assertEqual(summary["mismatches"][0]["field"], "payslip_artifact")

    def test_publish_blocks_when_output_reconciliation_fails(self):
        employee = SimpleNamespace(employee_code="E001", __str__=lambda self: "Anika Rao")
        payslip = SimpleNamespace(
            kind=PayrollOutputArtifactKind.PAYSLIP,
            employee=employee,
            employee_id="employee-1",
            title="Payslip - Anika Rao",
            totals_snapshot={
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87500.00",
            },
        )
        register = SimpleNamespace(
            kind=PayrollOutputArtifactKind.REGISTER,
            created_at=1,
            line_snapshot=[{
                "employee_code": "E001",
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87000.00",
            }],
        )
        batch = SimpleNamespace(
            status=PayrollOutputBatchStatus.GENERATED,
            review=SimpleNamespace(status=PayrollReviewStatus.LOCKED),
            payroll_run=SimpleNamespace(status=PayrollRunStatus.LOCKED),
            artifacts=FakeArtifactQuerySet([payslip, register]),
        )

        with self.assertRaisesRegex(PayrollOutputError, "reconciliation failed"):
            publish_payroll_output_batch(batch)

    def test_finance_handoff_blocks_when_output_reconciliation_fails(self):
        employee = SimpleNamespace(employee_code="E001", __str__=lambda self: "Anika Rao")
        payslip = SimpleNamespace(
            kind=PayrollOutputArtifactKind.PAYSLIP,
            employee=employee,
            employee_id="employee-1",
            title="Payslip - Anika Rao",
            totals_snapshot={
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87500.00",
            },
        )
        register = SimpleNamespace(
            kind=PayrollOutputArtifactKind.REGISTER,
            created_at=1,
            line_snapshot=[{
                "employee_code": "E001",
                "gross_earnings": "100000.00",
                "employee_deductions": "12500.00",
                "employer_contributions": "12000.00",
                "net_pay": "87000.00",
            }],
        )
        batch = SimpleNamespace(
            status=PayrollOutputBatchStatus.PUBLISHED,
            artifacts=FakeArtifactQuerySet([payslip, register]),
        )

        with self.assertRaisesRegex(PayrollFinanceHandoffError, "reconciliation failed"):
            generate_payroll_finance_handoff(batch)
