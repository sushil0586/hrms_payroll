from django.db import migrations


def allow_owned_synthetic_fiscal_event_teardown(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION payroll_guard_period_event_append_only()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' AND
               COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') = 'authorized' THEN
                RETURN OLD;
            END IF;
            RAISE EXCEPTION 'accounting period status events are append-only' USING ERRCODE = '55000';
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION payroll_guard_fiscal_year_event_append_only()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' AND
               COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') = 'authorized' THEN
                RETURN OLD;
            END IF;
            RAISE EXCEPTION 'financial year status events are append-only' USING ERRCODE = '55000';
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def restore_fiscal_event_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION payroll_guard_period_event_append_only()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'accounting period status events are append-only' USING ERRCODE = '55000';
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION payroll_guard_fiscal_year_event_append_only()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'financial year status events are append-only' USING ERRCODE = '55000';
        END;
        $$ LANGUAGE plpgsql;
        """
    )


class Migration(migrations.Migration):
    dependencies = [("payroll", "0043_temporal_configuration_overlap_guards")]

    operations = [
        migrations.RunPython(
            allow_owned_synthetic_fiscal_event_teardown,
            restore_fiscal_event_guards,
        )
    ]
