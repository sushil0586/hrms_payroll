from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("common", "0009_mutation_idempotency")]

    operations = [
        migrations.AddConstraint(
            model_name="hrmsimportbatchaudit",
            constraint=models.UniqueConstraint(
                condition=models.Q(import_type="leave_balance_actions"),
                fields=("tenant", "import_type", "source_hash"),
                name="uniq_leave_import_source_per_tenant",
            ),
        ),
    ]
