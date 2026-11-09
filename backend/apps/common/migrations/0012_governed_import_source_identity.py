from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("common", "0011_staging_evidence_authorization")]

    operations = [
        migrations.RemoveConstraint(
            model_name="hrmsimportbatchaudit",
            name="uniq_leave_import_source_per_tenant",
        ),
        migrations.AlterField(
            model_name="hrmsimportbatchaudit",
            name="status",
            field=models.CharField(
                choices=[
                    ("claimed", "Claimed"),
                    ("previewed", "Previewed"),
                    ("committed", "Committed"),
                    ("partial", "Partial"),
                    ("failed", "Failed"),
                    ("rollback_review", "Rollback Review"),
                ],
                default="previewed",
                max_length=30,
            ),
        ),
        migrations.AddConstraint(
            model_name="hrmsimportbatchaudit",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    import_type__in=[
                        "employees",
                        "reporting_manager_mappings",
                        "employee_bank_accounts",
                        "leave_balance_actions",
                    ],
                    source_ref="hrms.bulk_import.browser.v2",
                ),
                fields=("tenant", "import_type", "source_hash"),
                name="uniq_governed_import_source_per_tenant",
            ),
        ),
    ]
