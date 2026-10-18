from django.db import migrations


def allow_owned_synthetic_close_teardown(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_attendance_close_event_mutation()
        RETURNS trigger AS $$
        BEGIN
          IF TG_OP = 'DELETE' AND
             COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') = 'authorized' THEN
            RETURN OLD;
          END IF;
          RAISE EXCEPTION 'attendance close events are append-only';
        END; $$ LANGUAGE plpgsql;
        """
    )


class Migration(migrations.Migration):
    dependencies = [("attendance", "0011_monthly_attendance_close")]

    operations = [migrations.RunPython(allow_owned_synthetic_close_teardown, migrations.RunPython.noop)]
