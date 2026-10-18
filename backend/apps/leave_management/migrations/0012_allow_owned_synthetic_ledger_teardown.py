from django.db import migrations


def allow_owned_synthetic_ledger_teardown(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION leave_guard_applied_ledger_immutable()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.status = 'applied' AND NOT (
                TG_OP = 'DELETE' AND
                COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') = 'authorized'
            ) THEN
                RAISE EXCEPTION 'applied leave ledger entries are append-only' USING ERRCODE = '55000';
            END IF;
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


class Migration(migrations.Migration):
    dependencies = [("leave_management", "0011_fix_pending_ledger_transition_guard")]

    operations = [migrations.RunPython(allow_owned_synthetic_ledger_teardown, migrations.RunPython.noop)]
