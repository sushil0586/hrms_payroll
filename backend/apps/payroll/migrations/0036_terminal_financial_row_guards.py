from django.db import migrations


TERMINAL_GUARDS = {
    "payroll_payrollinputsnapshot": ("snapshot_status", "locked"),
    "payroll_payrolladjustment": ("status", "applied,voided"),
    "payroll_payrollsettlement": ("status", "applied,voided"),
    "payroll_payrollrunreview": ("status", "locked"),
    "payroll_payrolloutputbatch": ("status", "published"),
    "payroll_payrolloutputartifact": ("status", "published"),
    "payroll_payrollfinancehandoff": ("status", "accepted"),
    "payroll_payrollproviderdelivery": ("status", "reconciled"),
}


def install_terminal_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION payroll_reject_terminal_row_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF (to_jsonb(OLD) ->> TG_ARGV[0]) = ANY(string_to_array(TG_ARGV[1], ',')) THEN
                RAISE EXCEPTION 'terminal payroll row in %% is immutable', TG_TABLE_NAME
                    USING ERRCODE = '55000';
            END IF;
            RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION payroll_guard_approved_run_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.status = 'locked' OR TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'approved or locked payroll run is immutable'
                    USING ERRCODE = '55000';
            END IF;
            IF OLD.status = 'approved' THEN
                IF NEW.status <> 'locked' OR
                   (to_jsonb(NEW) - ARRAY['status', 'final_locked_at', 'final_locked_by_id', 'updated_at'])
                   IS DISTINCT FROM
                   (to_jsonb(OLD) - ARRAY['status', 'final_locked_at', 'final_locked_by_id', 'updated_at']) THEN
                    RAISE EXCEPTION 'approved payroll run only permits final lock transition'
                        USING ERRCODE = '55000';
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    schema_editor.execute(
        'CREATE TRIGGER "guard_payroll_payrollrun_terminal" '
        'BEFORE UPDATE OR DELETE ON "payroll_payrollrun" '
        "FOR EACH ROW WHEN (OLD.status IN ('approved', 'locked')) "
        "EXECUTE FUNCTION payroll_guard_approved_run_mutation()"
    )
    for table, (status_column, terminal_values) in TERMINAL_GUARDS.items():
        trigger = f"guard_{table}_terminal"
        schema_editor.execute(
            f'CREATE TRIGGER "{trigger}" BEFORE UPDATE OR DELETE ON "{table}" '
            f"FOR EACH ROW EXECUTE FUNCTION payroll_reject_terminal_row_mutation('{status_column}', '{terminal_values}')"
        )


def remove_terminal_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        'DROP TRIGGER IF EXISTS "guard_payroll_payrollrun_terminal" ON "payroll_payrollrun"'
    )
    for table in TERMINAL_GUARDS:
        trigger = f"guard_{table}_terminal"
        schema_editor.execute(f'DROP TRIGGER IF EXISTS "{trigger}" ON "{table}"')
    schema_editor.execute("DROP FUNCTION IF EXISTS payroll_reject_terminal_row_mutation()")
    schema_editor.execute("DROP FUNCTION IF EXISTS payroll_guard_approved_run_mutation()")


class Migration(migrations.Migration):
    dependencies = [("payroll", "0035_payrollrun_run_kind_and_more")]

    operations = [migrations.RunPython(install_terminal_guards, remove_terminal_guards)]
