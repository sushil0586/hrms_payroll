from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.payroll.models import PayrollOutputArtifactKind
from apps.payroll.services import _artifact_extension, _artifact_file_payload, build_payroll_payslip_render_model


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
                    "source_hash": "c" * 64,
                    "config_snapshot": {
                        "statutory_type": "tax_deducted_at_source",
                        "statutory_treatment_ref": "india.tds.section_192",
                    },
                }
            ],
            config_snapshot={
                "tax_regime": "new_regime",
                "proof_status_summary": {"verified": 2, "pending": 1, "rejected": 0},
            },
        )

        model = build_payroll_payslip_render_model(artifact)

        self.assertTrue(model["tax_sheet"]["available"])
        self.assertEqual(model["tax_sheet"]["tax_regime"], "new_regime")
        self.assertEqual(model["tax_sheet"]["current_period_tax"], "10000.00")
        self.assertEqual(model["tax_sheet"]["statutory_line_count"], 1)
        self.assertEqual(model["tax_sheet"]["proof_status_summary"]["verified"], 2)
        self.assertEqual(model["tax_sheet"]["lines"][0]["source_hash"], "c" * 64)

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
        self.assertIn("September 2026 Payslip", payload)
        self.assertIn("Net pay: 87500.00", payload)
        self.assertIn("Tax sheet", payload)
        self.assertIn("Tax regime: new_regime", payload)
        self.assertIn("Tax Deducted at Source", payload)
