from django.db import migrations, models


def backfill_typed_upload_policy(apps, schema_editor):
    DocumentCategory = apps.get_model("documents", "DocumentCategory")
    for category in DocumentCategory.objects.all().iterator():
        rules = category.visibility_rules if isinstance(category.visibility_rules, dict) else {}
        accepted = rules.get("accepted_mime_types")
        if isinstance(accepted, list):
            normalized = sorted({str(value).strip().lower() for value in accepted if str(value).strip()})
            if normalized:
                category.accepted_mime_types = normalized
                category.save(update_fields=["accepted_mime_types"])


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0004_employee_document_replacement_statuses"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentcategory",
            name="accepted_mime_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="documentcategory",
            name="max_upload_size_bytes",
            field=models.PositiveBigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="documentcategory",
            name="replacement_policy",
            field=models.CharField(
                choices=[
                    ("allowed", "Employee and HR"),
                    ("hr_only", "HR only"),
                    ("prohibited", "Not allowed"),
                ],
                default="allowed",
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_typed_upload_policy, migrations.RunPython.noop),
    ]
