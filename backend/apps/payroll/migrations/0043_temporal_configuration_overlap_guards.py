from django.db import migrations


TEMPORAL_GUARDS = (
    ("payroll_fiscalyear", "calendar_id", "start_date", "end_date", None),
    ("payroll_accountingperiod", "fiscal_year_id", "start_date", "end_date", None),
    ("payroll_payrollperiod", "calendar_id", "start_date", "end_date", None),
    ("payroll_paygroupassignment", "employee_id", "effective_from", "effective_to", "active"),
    ("payroll_salarystructureversion", "structure_id", "effective_from", "effective_to", "active"),
    ("payroll_employeesalaryassignment", "employee_id", "effective_from", "effective_to", "active"),
    ("payroll_payrollstatutorypack", "tenant_id, code", "effective_from", "effective_to", "active"),
    (
        "payroll_payrollstatutoryemployerregistration",
        "tenant_id, registration_type_ref, registration_number",
        "effective_from",
        "effective_to",
        "active",
    ),
    ("payroll_employeestatutoryprofile", "employee_id", "effective_from", "effective_to", "active"),
    ("payroll_payrollruleversion", "rule_id", "effective_from", "effective_to", "active"),
)


def _key_expression(columns):
    return " || ':' || ".join(f"COALESCE(NEW.{column}::text, '')" for column in columns.split(", "))


def _identity_predicate(columns):
    return " AND ".join(f"candidate.{column} = NEW.{column}" for column in columns.split(", "))


def _status_predicate(status):
    return f"NEW.status = '{status}' AND candidate.status = '{status}' AND " if status else ""


def install_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        for table, columns, start_column, end_column, status in TEMPORAL_GUARDS:
            status_filter = f"status = '{status}' AND " if status else ""
            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM {table} left_row
                JOIN {table} right_row
                  ON left_row.id < right_row.id
                 AND {' AND '.join(f'left_row.{column} = right_row.{column}' for column in columns.split(', '))}
                 AND daterange(left_row.{start_column}, COALESCE(left_row.{end_column}, 'infinity'::date), '[]')
                     && daterange(right_row.{start_column}, COALESCE(right_row.{end_column}, 'infinity'::date), '[]')
                WHERE {status_filter.replace('status', 'left_row.status')}
                      {status_filter.replace('status', 'right_row.status')}
                      TRUE
                """
            )
            overlap_count = cursor.fetchone()[0]
            if overlap_count:
                raise RuntimeError(
                    f"Cannot install temporal guard for {table}: {overlap_count} overlapping existing pair(s) require classification."
                )

            function_name = f"guard_{table}_temporal_overlap"
            trigger_name = f"guard_{table}_temporal_overlap_trigger"
            cursor.execute(
                f"""
                CREATE OR REPLACE FUNCTION {function_name}() RETURNS trigger AS $$
                BEGIN
                    IF NEW.{end_column} IS NOT NULL AND NEW.{end_column} < NEW.{start_column} THEN
                        RAISE EXCEPTION 'effective-to date must be on or after effective-from date' USING ERRCODE = '23514';
                    END IF;
                    IF {"NEW.status <> '" + status + "'" if status else "FALSE"} THEN
                        RETURN NEW;
                    END IF;
                    PERFORM pg_advisory_xact_lock(hashtextextended('{table}:' || {_key_expression(columns)}, 0));
                    IF EXISTS (
                        SELECT 1 FROM {table} candidate
                        WHERE candidate.id <> NEW.id
                          AND {_identity_predicate(columns)}
                          AND {_status_predicate(status)}
                              daterange(candidate.{start_column}, COALESCE(candidate.{end_column}, 'infinity'::date), '[]')
                              && daterange(NEW.{start_column}, COALESCE(NEW.{end_column}, 'infinity'::date), '[]')
                    ) THEN
                        RAISE EXCEPTION 'temporal configuration overlaps an existing effective window' USING ERRCODE = '23P01';
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                DROP TRIGGER IF EXISTS {trigger_name} ON {table};
                CREATE TRIGGER {trigger_name}
                BEFORE INSERT OR UPDATE OF {columns}, {start_column}, {end_column}{', status' if status else ''}
                ON {table} FOR EACH ROW EXECUTE FUNCTION {function_name}();
                """
            )


def remove_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        for table, _columns, _start_column, _end_column, _status in TEMPORAL_GUARDS:
            function_name = f"guard_{table}_temporal_overlap"
            trigger_name = f"guard_{table}_temporal_overlap_trigger"
            cursor.execute(f"DROP TRIGGER IF EXISTS {trigger_name} ON {table}")
            cursor.execute(f"DROP FUNCTION IF EXISTS {function_name}()")


class Migration(migrations.Migration):
    dependencies = [("payroll", "0042_payrolladjustment_maker_checker_distinct")]

    operations = [migrations.RunPython(install_guards, remove_guards)]
