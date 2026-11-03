from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [("documents", "0005_document_category_upload_policy")]

    operations = [
        migrations.CreateModel(
            name="DocumentLifecycleAuditEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("event_type", models.CharField(choices=[("uploaded", "Uploaded"), ("replacement_submitted", "Replacement submitted"), ("replacement_approved", "Replacement approved"), ("replacement_rejected", "Replacement rejected"), ("replacement_withdrawn", "Replacement withdrawn"), ("verification_updated", "Verification updated")], max_length=40)),
                ("actor_identifier", models.CharField(blank=True, max_length=120)),
                ("previous_record_status", models.CharField(blank=True, choices=[("active", "Active"), ("pending_replacement", "Pending replacement"), ("archived", "Archived"), ("replaced", "Replaced"), ("withdrawn", "Withdrawn")], max_length=20)),
                ("new_record_status", models.CharField(choices=[("active", "Active"), ("pending_replacement", "Pending replacement"), ("archived", "Archived"), ("replaced", "Replaced"), ("withdrawn", "Withdrawn")], max_length=20)),
                ("previous_verification_status", models.CharField(blank=True, choices=[("pending", "Pending"), ("verified", "Verified"), ("rejected", "Rejected"), ("expired", "Expired")], max_length=20)),
                ("new_verification_status", models.CharField(choices=[("pending", "Pending"), ("verified", "Verified"), ("rejected", "Rejected"), ("expired", "Expired")], max_length=20)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("employee_document", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lifecycle_events", to="documents.employeedocument")),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="document_lifecycle_audit_events", to="tenants.tenant")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="documentlifecycleauditevent",
            index=models.Index(fields=["tenant", "employee_document", "created_at"], name="doc_lifecycle_lookup_idx"),
        ),
        migrations.AddConstraint(
            model_name="employeedocument",
            constraint=models.UniqueConstraint(
                condition=models.Q(("status", "pending_replacement"), ("verification_status", "pending")),
                fields=("tenant", "previous_document"),
                name="unique_pending_document_replacement",
            ),
        ),
    ]
