from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0012_payrollvalidationissue"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="storage_provider_ref",
            field=models.CharField(default="payroll.storage.local.generated.v1", max_length=160),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="storage_key",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="mime_type",
            field=models.CharField(default="application/json", max_length=120),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="file_size_bytes",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="checksum_sha256",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="is_downloadable",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="retention_policy_ref",
            field=models.CharField(default="payroll.retention.7y.v1", max_length=160),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="file_payload",
            field=models.TextField(blank=True),
        ),
    ]
