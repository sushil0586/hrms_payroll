from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.payroll.models import PayrollOutputArtifactKind, PayrollOutputBatchStatus, PayrollReviewStatus, PayrollRunStatus
from apps.payroll.services import (
    _artifact_extension,
    _artifact_file_payload,
    build_payroll_output_reconciliation_summary,
    build_payroll_payslip_render_model,
    generate_payroll_finance_handoff,
    publish_payroll_output_batch,
    PayrollFinanceHandoffError,
    PayrollOutputError,
)


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
    def artifact(self, *, line_snapshot, totals_snapshot=None, config_snapshot=None):
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
            config_snapshot={"artifact_template_ref": "tenant.payslip.pdf.v1", "tax_regime": "new_regime"},
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
