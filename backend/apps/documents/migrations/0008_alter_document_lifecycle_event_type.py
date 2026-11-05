from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0007_document_artifact_malware_scan"),
    ]

    operations = [
        migrations.AlterField(
            model_name="documentlifecycleauditevent",
            name="event_type",
            field=models.CharField(
                choices=[
                    ("uploaded", "Uploaded"),
                    ("replacement_submitted", "Replacement submitted"),
                    ("replacement_approved", "Replacement approved"),
                    ("replacement_rejected", "Replacement rejected"),
                    ("replacement_withdrawn", "Replacement withdrawn"),
                    ("verification_updated", "Verification updated"),
                    ("downloaded", "Downloaded"),
                ],
                max_length=40,
            ),
        ),
    ]
