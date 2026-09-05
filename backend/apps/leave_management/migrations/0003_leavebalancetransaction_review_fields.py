from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("employees", "0001_initial"),
        ("leave_management", "0002_leavebalancetransaction"),
    ]

    operations = [
        migrations.AddField(
            model_name="leavebalancetransaction",
            name="rejection_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="leavebalancetransaction",
            name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="leavebalancetransaction",
            name="reviewed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reviewed_leave_balance_transactions",
                to="employees.employee",
            ),
        ),
        migrations.AddField(
            model_name="leavebalancetransaction",
            name="status",
            field=models.CharField(
                choices=[("pending", "Pending Review"), ("applied", "Applied"), ("rejected", "Rejected")],
                default="applied",
                max_length=20,
            ),
        ),
    ]
