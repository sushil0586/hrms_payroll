from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0003_employeeshiftassignment_runtime_config"),
    ]

    operations = [
        migrations.CreateModel(
            name="ShiftRosterTemplate",
            fields=[
                ("id", models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.SlugField(max_length=60)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("published", "Published"), ("locked", "Locked")], default="draft", max_length=20)),
                ("assignment_kind", models.CharField(choices=[("fixed", "Fixed"), ("weekly_rotation", "Weekly Rotation"), ("temporary_override", "Temporary Override")], default="fixed", max_length=30)),
                ("config_snapshot", models.JSONField(blank=True, default=dict)),
                ("shift", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roster_templates", to="attendance.shift")),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shift_roster_templates", to="tenants.tenant")),
            ],
            options={
                "verbose_name": "Shift Roster Template",
                "verbose_name_plural": "Shift Roster Templates",
                "ordering": ["name"],
                "unique_together": {("tenant", "code")},
            },
        ),
    ]
