import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0013_payrolloutputartifact_file_payload"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PayrollProviderDelivery",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("artifact_kind", models.CharField(choices=[("payslip", "Payslip"), ("register", "Register"), ("bank_advice", "Bank Advice"), ("accounting_export", "Accounting Export"), ("statutory_report", "Statutory Report")], max_length=40)),
                ("status", models.CharField(choices=[("queued", "Queued"), ("submitted", "Submitted"), ("acknowledged", "Acknowledged"), ("rejected", "Rejected"), ("failed", "Failed"), ("reconciled", "Reconciled")], default="queued", max_length=20)),
                ("provider_ref", models.CharField(default="payroll.provider.manual.v1", max_length=160)),
                ("channel_ref", models.CharField(default="payroll.channel.manual.v1", max_length=160)),
                ("external_reference", models.CharField(blank=True, max_length=180)),
                ("retry_policy_ref", models.CharField(default="payroll.delivery.retry.standard.v1", max_length=160)),
                ("attempt_count", models.PositiveIntegerField(default=0)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("acknowledged_at", models.DateTimeField(blank=True, null=True)),
                ("reconciled_at", models.DateTimeField(blank=True, null=True)),
                ("failure_code", models.CharField(blank=True, max_length=80)),
                ("failure_reason", models.TextField(blank=True)),
                ("payload_checksum_sha256", models.CharField(blank=True, max_length=64)),
                ("request_snapshot", models.JSONField(blank=True, default=dict)),
                ("response_snapshot", models.JSONField(blank=True, default=dict)),
                ("reconciliation_snapshot", models.JSONField(blank=True, default=dict)),
                ("config_snapshot", models.JSONField(blank=True, default=dict)),
                ("acknowledged_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="acknowledged_payroll_provider_deliveries", to=settings.AUTH_USER_MODEL)),
                ("handoff", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="provider_deliveries", to="payroll.payrollfinancehandoff")),
                ("output_artifact", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="provider_deliveries", to="payroll.payrolloutputartifact")),
                ("output_batch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="provider_deliveries", to="payroll.payrolloutputbatch")),
                ("payroll_run", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="provider_deliveries", to="payroll.payrollrun")),
                ("reconciled_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reconciled_payroll_provider_deliveries", to=settings.AUTH_USER_MODEL)),
                ("review", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="provider_deliveries", to="payroll.payrollrunreview")),
                ("submitted_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="submitted_payroll_provider_deliveries", to=settings.AUTH_USER_MODEL)),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payroll_provider_deliveries", to="tenants.tenant")),
            ],
            options={
                "verbose_name": "Payroll Provider Delivery",
                "verbose_name_plural": "Payroll Provider Deliveries",
                "ordering": ["artifact_kind", "provider_ref", "created_at"],
                "unique_together": {("handoff", "output_artifact", "provider_ref")},
            },
        ),
    ]
