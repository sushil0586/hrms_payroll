from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="holiday",
            name="holiday_type",
            field=models.CharField(
                choices=[
                    ("general", "General Holiday"),
                    ("compulsory", "Compulsory Holiday"),
                    ("restricted", "Restricted Holiday"),
                ],
                default="general",
                max_length=20,
            ),
        ),
    ]
