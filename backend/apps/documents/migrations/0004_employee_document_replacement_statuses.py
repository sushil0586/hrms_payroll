from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0003_employeedocument_previous_document_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employeedocument",
            name="status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("pending_replacement", "Pending replacement"),
                    ("archived", "Archived"),
                    ("replaced", "Replaced"),
                    ("withdrawn", "Withdrawn"),
                ],
                default="active",
                max_length=20,
            ),
        ),
    ]
