from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0014_payrollproviderdelivery"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="storage_object_version",
            field=models.CharField(blank=True, max_length=180),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="download_strategy_ref",
            field=models.CharField(default="payroll.download.stream.local.v1", max_length=160),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="supports_signed_url",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="payrolloutputartifact",
            name="signed_url_expires_in_seconds",
            field=models.PositiveIntegerField(default=900),
        ),
    ]
