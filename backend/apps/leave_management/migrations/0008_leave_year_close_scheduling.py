from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("leave_management", "0007_leave_period_status_audit")]

    operations = [
        migrations.AddField(
            model_name="leaveyearcloserun",
            name="scheduled_for",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="leaveyearcloserun",
            name="dispatched_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="leaveyearcloserun",
            name="celery_task_id",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
