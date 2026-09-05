from django.db import migrations, models

import apps.platform_policies.models


class Migration(migrations.Migration):
    dependencies = [
        ("leave_management", "0004_policy_source_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="leavetype",
            name="delegation_mode",
            field=models.CharField(
                blank=True,
                choices=apps.platform_policies.models.DelegationMode.choices,
                max_length=40,
            ),
        ),
    ]
