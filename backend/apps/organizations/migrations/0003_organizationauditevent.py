import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0002_db6_hierarchy_cycle_guards"),
        ("tenants", "0005_db4b_legal_hold_delete_enforcement"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrganizationAuditEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("actor_identifier", models.CharField(max_length=160)),
                ("section", models.CharField(max_length=40)),
                ("item_id", models.UUIDField()),
                ("action", models.CharField(max_length=20)),
                ("previous_state", models.JSONField(blank=True, default=dict)),
                ("new_state", models.JSONField(blank=True, default=dict)),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="organization_audit_events", to="tenants.tenant")),
            ],
            options={
                "verbose_name": "Organization Audit Event",
                "verbose_name_plural": "Organization Audit Events",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="organizationauditevent",
            index=models.Index(fields=["tenant", "section", "item_id", "-created_at"], name="organizatio_tenant__20997d_idx"),
        ),
    ]
