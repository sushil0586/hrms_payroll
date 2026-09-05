from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0002_holiday_holiday_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="employeeshiftassignment",
            name="assignment_kind",
            field=models.CharField(
                choices=[
                    ("fixed", "Fixed"),
                    ("weekly_rotation", "Weekly Rotation"),
                    ("temporary_override", "Temporary Override"),
                ],
                default="fixed",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="employeeshiftassignment",
            name="config_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
