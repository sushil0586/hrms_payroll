import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0005_saasincidentrecord"),
        ("iam", "0001_initial"),
        ("tenants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="HrmsImportBatchAudit",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("import_type", models.CharField(max_length=80)),
                ("status", models.CharField(choices=[("previewed", "Previewed"), ("committed", "Committed"), ("partial", "Partial"), ("failed", "Failed"), ("rollback_review", "Rollback Review")], default="previewed", max_length=30)),
                ("actor_identifier", models.CharField(blank=True, max_length=160)),
                ("file_name", models.CharField(blank=True, max_length=180)),
                ("source_hash", models.CharField(max_length=64)),
                ("row_count", models.PositiveIntegerField(default=0)),
                ("ready_count", models.PositiveIntegerField(default=0)),
                ("created_count", models.PositiveIntegerField(default=0)),
                ("blocked_count", models.PositiveIntegerField(default=0)),
                ("failed_count", models.PositiveIntegerField(default=0)),
                ("rollback_supported", models.BooleanField(default=False)),
                ("rollback_status", models.CharField(default="not_requested", max_length=40)),
                ("source_ref", models.CharField(default="hrms.bulk_import.browser.v1", max_length=160)),
                ("evidence_snapshot", models.JSONField(blank=True, default=dict)),
                ("row_errors", models.JSONField(blank=True, default=list)),
                ("batch_hash", models.CharField(blank=True, max_length=64)),
                ("actor_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="hrms_import_batch_audits", to="iam.user")),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="hrms_import_batch_audits", to="tenants.tenant")),
            ],
            options={
                "verbose_name": "HRMS Import Batch Audit",
                "verbose_name_plural": "HRMS Import Batch Audits",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="hrmsimportbatchaudit",
            index=models.Index(fields=["tenant", "import_type", "-created_at"], name="common_hrms_tenant__23363d_idx"),
        ),
        migrations.AddIndex(
            model_name="hrmsimportbatchaudit",
            index=models.Index(fields=["tenant", "status", "-created_at"], name="common_hrms_tenant__217dd7_idx"),
        ),
        migrations.AddIndex(
            model_name="hrmsimportbatchaudit",
            index=models.Index(fields=["tenant", "source_hash"], name="common_hrms_tenant__5c9a48_idx"),
        ),
    ]
