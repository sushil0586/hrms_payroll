from django.db import migrations


def fix_pending_ledger_transition_guard(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION leave_guard_applied_ledger_immutable()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.status = 'applied' THEN
                RAISE EXCEPTION 'applied leave ledger entries are append-only' USING ERRCODE = '55000';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def restore_previous_guard(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION leave_guard_applied_ledger_immutable()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.status = 'applied' THEN
                RAISE EXCEPTION 'applied leave ledger entries are append-only' USING ERRCODE = '55000';
            END IF;
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


class Migration(migrations.Migration):
    dependencies = [("leave_management", "0010_leavepolicyassignment_leave_policy_assignment_dates_ordered")]

    operations = [migrations.RunPython(fix_pending_ledger_transition_guard, restore_previous_guard)]
