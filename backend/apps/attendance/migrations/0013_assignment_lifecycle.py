from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("attendance", "0012_allow_owned_synthetic_close_teardown")]
    operations = [
        migrations.AddField(model_name="employeeshiftassignment", name="cancelled_at", field=models.DateTimeField(null=True, blank=True, editable=False)),
        migrations.AddField(model_name="employeeshiftassignment", name="lifecycle_snapshot", field=models.JSONField(default=dict, blank=True, editable=False)),
    ]
