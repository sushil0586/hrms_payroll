from django.db import migrations, models


def reject_ambiguous_settlement_approvals(apps, schema_editor):
    settlement = apps.get_model("payroll", "PayrollSettlement")
    conflict_count = settlement.objects.filter(
        submitted_by_id=models.F("approved_by_id"),
        submitted_by_id__isnull=False,
    ).count()
    if conflict_count:
        raise RuntimeError(
            "Cannot enforce payroll settlement maker/checker separation: "
            f"{conflict_count} existing settlement(s) have the same submitter and approver. "
            "Classify those records before applying this migration."
        )


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0040_attendance_close_reference"),
    ]

    operations = [
        migrations.RunPython(reject_ambiguous_settlement_approvals, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="payrollsettlement",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(submitted_by__isnull=True)
                    | models.Q(approved_by__isnull=True)
                    | ~models.Q(submitted_by=models.F("approved_by"))
                ),
                name="payroll_settlement_maker_checker_distinct",
            ),
        ),
    ]
