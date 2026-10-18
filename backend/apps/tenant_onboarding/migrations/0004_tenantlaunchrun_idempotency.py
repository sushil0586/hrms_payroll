from django.db import migrations, models


def reject_ambiguous_duplicates(apps, schema_editor):
    TenantLaunchRun = apps.get_model("tenant_onboarding", "TenantLaunchRun")
    duplicates = list(
        TenantLaunchRun.objects.exclude(idempotency_key="")
        .values("tenant_id", "run_type", "idempotency_key")
        .annotate(row_count=models.Count("id"))
        .filter(row_count__gt=1)[:25]
    )
    if duplicates:
        raise RuntimeError(
            "Duplicate tenant launch idempotency identities require manual classification before migration: "
            f"{duplicates}"
        )


class Migration(migrations.Migration):
    dependencies = [("tenant_onboarding", "0003_tenantonboarding_launch_applied_at_and_more")]

    operations = [
        migrations.RunPython(reject_ambiguous_duplicates, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="tenantlaunchrun",
            constraint=models.UniqueConstraint(
                fields=("tenant", "run_type", "idempotency_key"),
                condition=~models.Q(idempotency_key=""),
                name="uniq_tenant_launch_run_idempotency",
            ),
        ),
    ]
