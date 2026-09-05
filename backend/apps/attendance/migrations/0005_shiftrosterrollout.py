from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0004_shiftrostertemplate"),
        ("employees", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ShiftRosterRollout",
            fields=[
                ("id", models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("completed", "Completed"), ("preview", "Preview")], default="completed", max_length=20)),
                ("scope_snapshot", models.JSONField(blank=True, default=dict)),
                ("effective_from", models.DateField()),
                ("effective_to", models.DateField(blank=True, null=True)),
                ("is_primary", models.BooleanField(default=True)),
                ("target_count", models.PositiveIntegerField(default=0)),
                ("created_count", models.PositiveIntegerField(default=0)),
                ("skipped_count", models.PositiveIntegerField(default=0)),
                ("summary", models.CharField(blank=True, max_length=255)),
                ("initiated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="initiated_shift_roster_rollouts", to="employees.employee")),
                ("template", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="rollouts", to="attendance.shiftrostertemplate")),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shift_roster_rollouts", to="tenants.tenant")),
            ],
            options={
                "verbose_name": "Shift Roster Rollout",
                "verbose_name_plural": "Shift Roster Rollouts",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ShiftRosterRolloutItem",
            fields=[
                ("id", models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(max_length=20)),
                ("reason", models.CharField(blank=True, max_length=255)),
                ("assignment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="roster_rollout_items", to="attendance.employeeshiftassignment")),
                ("employee", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="shift_roster_rollout_items", to="employees.employee")),
                ("rollout", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="attendance.shiftrosterrollout")),
            ],
            options={
                "verbose_name": "Shift Roster Rollout Item",
                "verbose_name_plural": "Shift Roster Rollout Items",
                "ordering": ["employee__employee_code", "created_at"],
            },
        ),
    ]
