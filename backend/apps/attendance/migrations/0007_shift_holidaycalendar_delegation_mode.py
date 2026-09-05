from django.db import migrations, models

import apps.platform_policies.models


class Migration(migrations.Migration):
    dependencies = [
        ("attendance", "0006_policy_source_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="holidaycalendar",
            name="delegation_mode",
            field=models.CharField(
                blank=True,
                choices=apps.platform_policies.models.DelegationMode.choices,
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="shift",
            name="delegation_mode",
            field=models.CharField(
                blank=True,
                choices=apps.platform_policies.models.DelegationMode.choices,
                max_length=40,
            ),
        ),
    ]
