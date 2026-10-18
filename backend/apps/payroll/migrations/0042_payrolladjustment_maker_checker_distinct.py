from django.db import migrations, models


def reject_ambiguous_adjustment_approvals(apps, schema_editor):
    adjustment = apps.get_model("payroll", "PayrollAdjustment")
    conflict_count = adjustment.objects.filter(
        submitted_by_id=models.F("approved_by_id"),
        submitted_by_id__isnull=False,
    ).count()
    if conflict_count:
        raise RuntimeError(
            "Cannot enforce payroll adjustment maker/checker separation: "
            f"{conflict_count} existing adjustment(s) have the same submitter and approver. "
            "Classify those records before applying this migration."
        )


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0041_payrollsettlement_maker_checker_distinct"),
    ]

    operations = [
        migrations.RunPython(reject_ambiguous_adjustment_approvals, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="payrolladjustment",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(submitted_by__isnull=True)
                    | models.Q(approved_by__isnull=True)
                    | ~models.Q(submitted_by=models.F("approved_by"))
                ),
                name="payroll_adjustment_maker_checker_distinct",
            ),
        ),
    ]
