from django.db import migrations


PREFLIGHT_SQL = {
    "employment assignments": """
        SELECT count(*) FROM employee_lifecycle_employmentassignment a
        JOIN employee_lifecycle_employmentassignment b
          ON a.id < b.id AND a.tenant_id = b.tenant_id AND a.employee_id = b.employee_id
         AND a.status <> 'corrected' AND b.status <> 'corrected'
         AND daterange(a.effective_from, COALESCE(a.effective_to, 'infinity'::date), '[]')
             && daterange(b.effective_from, COALESCE(b.effective_to, 'infinity'::date), '[]')
    """,
    "employment spells": """
        SELECT count(*) FROM employee_lifecycle_employmentspell a
        JOIN employee_lifecycle_employmentspell b
          ON a.id < b.id AND a.tenant_id = b.tenant_id AND a.employee_id = b.employee_id
         AND daterange(a.started_on, COALESCE(a.ended_on, 'infinity'::date), '[]')
             && daterange(b.started_on, COALESCE(b.ended_on, 'infinity'::date), '[]')
    """,
    "salary assignments": """
        SELECT count(*) FROM payroll_employeesalaryassignment a
        JOIN payroll_employeesalaryassignment b
          ON a.id < b.id AND a.tenant_id = b.tenant_id AND a.employee_id = b.employee_id
         AND a.status = 'active' AND b.status = 'active'
         AND daterange(a.effective_from, COALESCE(a.effective_to, 'infinity'::date), '[]')
             && daterange(b.effective_from, COALESCE(b.effective_to, 'infinity'::date), '[]')
    """,
    "pay-group assignments": """
        SELECT count(*) FROM payroll_paygroupassignment a
        JOIN payroll_paygroupassignment b
          ON a.id < b.id AND a.tenant_id = b.tenant_id AND a.employee_id = b.employee_id
         AND a.status = 'active' AND b.status = 'active'
         AND daterange(a.effective_from, COALESCE(a.effective_to, 'infinity'::date), '[]')
             && daterange(b.effective_from, COALESCE(b.effective_to, 'infinity'::date), '[]')
    """,
    "statutory profiles": """
        SELECT count(*) FROM payroll_employeestatutoryprofile a
        JOIN payroll_employeestatutoryprofile b
          ON a.id < b.id AND a.tenant_id = b.tenant_id AND a.employee_id = b.employee_id
         AND a.status = 'active' AND b.status = 'active'
         AND daterange(a.effective_from, COALESCE(a.effective_to, 'infinity'::date), '[]')
             && daterange(b.effective_from, COALESCE(b.effective_to, 'infinity'::date), '[]')
    """,
    "leave policy assignments": """
        SELECT count(*) FROM leave_management_leavepolicyassignment a
        JOIN leave_management_leavepolicyassignment b ON a.id < b.id AND a.tenant_id = b.tenant_id
         AND a.priority = b.priority AND a.is_active AND b.is_active
         AND a.employee_id IS NOT DISTINCT FROM b.employee_id
         AND a.legal_entity_id IS NOT DISTINCT FROM b.legal_entity_id
         AND a.branch_id IS NOT DISTINCT FROM b.branch_id
         AND a.department_id IS NOT DISTINCT FROM b.department_id
         AND a.grade_id IS NOT DISTINCT FROM b.grade_id
         AND a.employment_type_id IS NOT DISTINCT FROM b.employment_type_id
        JOIN leave_management_leavepolicy pa ON pa.id = a.leave_policy_id
        JOIN leave_management_leavepolicy pb ON pb.id = b.leave_policy_id AND pb.leave_type_id = pa.leave_type_id
        WHERE daterange(COALESCE(a.effective_from, '-infinity'::date), COALESCE(a.effective_to, 'infinity'::date), '[]')
              && daterange(COALESCE(b.effective_from, '-infinity'::date), COALESCE(b.effective_to, 'infinity'::date), '[]')
    """,
    "attendance policy assignments": """
        SELECT count(*) FROM attendance_attendancepolicyassignment a
        JOIN attendance_attendancepolicyassignment b ON a.id < b.id AND a.tenant_id = b.tenant_id
         AND a.priority = b.priority AND a.is_active AND b.is_active
         AND a.employee_id IS NOT DISTINCT FROM b.employee_id
         AND a.legal_entity_id IS NOT DISTINCT FROM b.legal_entity_id
         AND a.branch_id IS NOT DISTINCT FROM b.branch_id
         AND a.location_id IS NOT DISTINCT FROM b.location_id
         AND a.department_id IS NOT DISTINCT FROM b.department_id
         AND a.grade_id IS NOT DISTINCT FROM b.grade_id
         AND a.employment_type_id IS NOT DISTINCT FROM b.employment_type_id
        WHERE daterange(COALESCE(a.effective_from, '-infinity'::date), COALESCE(a.effective_to, 'infinity'::date), '[]')
              && daterange(COALESCE(b.effective_from, '-infinity'::date), COALESCE(b.effective_to, 'infinity'::date), '[]')
    """,
}


def install_db5_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    conflicts = []
    with schema_editor.connection.cursor() as cursor:
        for label, statement in PREFLIGHT_SQL.items():
            cursor.execute(statement)
            count = cursor.fetchone()[0]
            if count:
                conflicts.append(f"{label}: {count}")
    if conflicts:
        raise RuntimeError(
            "DB-5 effective-date preflight found ambiguous overlaps; no history was modified: " + "; ".join(conflicts)
        )

    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION hrms_db5_guard_employee_range_overlap()
        RETURNS trigger AS $$
        DECLARE overlap_exists boolean;
        BEGIN
            PERFORM pg_advisory_xact_lock(
                hashtextextended(TG_TABLE_NAME || ':' || NEW.tenant_id::text || ':' || NEW.employee_id::text, 0)
            );
            IF TG_TABLE_NAME = 'employee_lifecycle_employmentspell' THEN
                SELECT EXISTS(
                    SELECT 1 FROM employee_lifecycle_employmentspell existing
                     WHERE existing.id <> NEW.id AND existing.tenant_id = NEW.tenant_id
                       AND existing.employee_id = NEW.employee_id
                       AND daterange(existing.started_on, COALESCE(existing.ended_on, 'infinity'::date), '[]')
                           && daterange(NEW.started_on, COALESCE(NEW.ended_on, 'infinity'::date), '[]')
                ) INTO overlap_exists;
            ELSIF TG_TABLE_NAME = 'employee_lifecycle_employmentassignment' THEN
                SELECT EXISTS(
                    SELECT 1 FROM employee_lifecycle_employmentassignment existing
                     WHERE existing.id <> NEW.id AND existing.tenant_id = NEW.tenant_id
                       AND existing.employee_id = NEW.employee_id
                       AND existing.status <> 'corrected' AND NEW.status <> 'corrected'
                       AND daterange(existing.effective_from, COALESCE(existing.effective_to, 'infinity'::date), '[]')
                           && daterange(NEW.effective_from, COALESCE(NEW.effective_to, 'infinity'::date), '[]')
                ) INTO overlap_exists;
            ELSE
                EXECUTE format(
                    'SELECT EXISTS(SELECT 1 FROM %%I existing WHERE existing.id <> $1 AND existing.tenant_id = $2 AND existing.employee_id = $3 AND existing.status = ''active'' AND $4 = ''active'' AND daterange(existing.effective_from, COALESCE(existing.effective_to, ''infinity''::date), ''[]'') && daterange($5, COALESCE($6, ''infinity''::date), ''[]''))',
                    TG_TABLE_NAME
                ) INTO overlap_exists USING NEW.id, NEW.tenant_id, NEW.employee_id, NEW.status, NEW.effective_from, NEW.effective_to;
            END IF;
            IF overlap_exists THEN
                RAISE EXCEPTION 'overlapping effective range rejected on %%', TG_TABLE_NAME USING ERRCODE = '23P01';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION hrms_db5_guard_employment_scope()
        RETURNS trigger AS $$
        DECLARE related_tenant uuid; spell_employee uuid;
        BEGIN
            SELECT tenant_id INTO related_tenant FROM employees_employee WHERE id = NEW.employee_id;
            IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment history employee crosses tenant scope' USING ERRCODE = '23514'; END IF;
            IF TG_TABLE_NAME = 'employee_lifecycle_employmentassignment' THEN
                SELECT tenant_id, employee_id INTO related_tenant, spell_employee FROM employee_lifecycle_employmentspell WHERE id = NEW.employment_spell_id;
                IF related_tenant IS DISTINCT FROM NEW.tenant_id OR spell_employee IS DISTINCT FROM NEW.employee_id THEN
                    RAISE EXCEPTION 'employment assignment spell scope mismatch' USING ERRCODE = '23514';
                END IF;
            END IF;
            SELECT tenant_id INTO related_tenant FROM organizations_legalentity WHERE id = NEW.legal_entity_id;
            IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment legal entity crosses tenant scope' USING ERRCODE = '23514'; END IF;
            IF NEW.employment_type_id IS NOT NULL THEN
                SELECT tenant_id INTO related_tenant FROM organizations_employmenttype WHERE id = NEW.employment_type_id;
                IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment type crosses tenant scope' USING ERRCODE = '23514'; END IF;
            END IF;
            IF TG_TABLE_NAME = 'employee_lifecycle_employmentassignment' THEN
                IF NEW.branch_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_branch WHERE id = NEW.branch_id;
                    IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment branch crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.location_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_location WHERE id = NEW.location_id;
                    IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment location crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.department_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_department WHERE id = NEW.department_id;
                    IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment department crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.business_unit_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_businessunit WHERE id = NEW.business_unit_id;
                    IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment business unit crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.cost_center_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_costcenter WHERE id = NEW.cost_center_id;
                    IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment cost center crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.designation_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_designation WHERE id = NEW.designation_id;
                    IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment designation crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.grade_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_grade WHERE id = NEW.grade_id;
                    IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'employment grade crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.reporting_manager_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM employees_employee WHERE id = NEW.reporting_manager_id;
                    IF related_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'reporting manager crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION hrms_db5_guard_policy_assignment_overlap()
        RETURNS trigger AS $$
        DECLARE overlap_exists boolean;
        BEGIN
            IF NOT NEW.is_active THEN RETURN NEW; END IF;
            PERFORM pg_advisory_xact_lock(hashtextextended(TG_TABLE_NAME || ':' || NEW.tenant_id::text, 0));
            IF TG_TABLE_NAME = 'leave_management_leavepolicyassignment' THEN
                SELECT EXISTS(
                    SELECT 1 FROM leave_management_leavepolicyassignment existing
                    JOIN leave_management_leavepolicy existing_policy ON existing_policy.id = existing.leave_policy_id
                    JOIN leave_management_leavepolicy new_policy ON new_policy.id = NEW.leave_policy_id
                     WHERE existing.id <> NEW.id AND existing.tenant_id = NEW.tenant_id
                       AND existing.is_active AND existing.priority = NEW.priority
                       AND existing_policy.leave_type_id = new_policy.leave_type_id
                       AND existing.employee_id IS NOT DISTINCT FROM NEW.employee_id
                       AND existing.legal_entity_id IS NOT DISTINCT FROM NEW.legal_entity_id
                       AND existing.branch_id IS NOT DISTINCT FROM NEW.branch_id
                       AND existing.department_id IS NOT DISTINCT FROM NEW.department_id
                       AND existing.grade_id IS NOT DISTINCT FROM NEW.grade_id
                       AND existing.employment_type_id IS NOT DISTINCT FROM NEW.employment_type_id
                       AND daterange(COALESCE(existing.effective_from, '-infinity'::date), COALESCE(existing.effective_to, 'infinity'::date), '[]')
                           && daterange(COALESCE(NEW.effective_from, '-infinity'::date), COALESCE(NEW.effective_to, 'infinity'::date), '[]')
                ) INTO overlap_exists;
            ELSE
                SELECT EXISTS(
                    SELECT 1 FROM attendance_attendancepolicyassignment existing
                     WHERE existing.id <> NEW.id AND existing.tenant_id = NEW.tenant_id
                       AND existing.is_active AND existing.priority = NEW.priority
                       AND existing.employee_id IS NOT DISTINCT FROM NEW.employee_id
                       AND existing.legal_entity_id IS NOT DISTINCT FROM NEW.legal_entity_id
                       AND existing.branch_id IS NOT DISTINCT FROM NEW.branch_id
                       AND existing.location_id IS NOT DISTINCT FROM NEW.location_id
                       AND existing.department_id IS NOT DISTINCT FROM NEW.department_id
                       AND existing.grade_id IS NOT DISTINCT FROM NEW.grade_id
                       AND existing.employment_type_id IS NOT DISTINCT FROM NEW.employment_type_id
                       AND daterange(COALESCE(existing.effective_from, '-infinity'::date), COALESCE(existing.effective_to, 'infinity'::date), '[]')
                           && daterange(COALESCE(NEW.effective_from, '-infinity'::date), COALESCE(NEW.effective_to, 'infinity'::date), '[]')
                ) INTO overlap_exists;
            END IF;
            IF overlap_exists THEN
                RAISE EXCEPTION 'overlapping equal-priority policy assignment rejected on %%', TG_TABLE_NAME USING ERRCODE = '23P01';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    for table in [
        "employee_lifecycle_employmentspell",
        "employee_lifecycle_employmentassignment",
        "payroll_employeesalaryassignment",
        "payroll_paygroupassignment",
        "payroll_employeestatutoryprofile",
    ]:
        schema_editor.execute(f'DROP TRIGGER IF EXISTS "db5_range_overlap" ON "{table}"')
        schema_editor.execute(
            f'CREATE TRIGGER "db5_range_overlap" BEFORE INSERT OR UPDATE ON "{table}" '
            'FOR EACH ROW EXECUTE FUNCTION hrms_db5_guard_employee_range_overlap()'
        )
    for table in ["employee_lifecycle_employmentspell", "employee_lifecycle_employmentassignment"]:
        schema_editor.execute(f'DROP TRIGGER IF EXISTS "db5_employment_scope" ON "{table}"')
        schema_editor.execute(
            f'CREATE TRIGGER "db5_employment_scope" BEFORE INSERT OR UPDATE ON "{table}" '
            'FOR EACH ROW EXECUTE FUNCTION hrms_db5_guard_employment_scope()'
        )
    for table in ["leave_management_leavepolicyassignment", "attendance_attendancepolicyassignment"]:
        schema_editor.execute(f'DROP TRIGGER IF EXISTS "db5_policy_range_overlap" ON "{table}"')
        schema_editor.execute(
            f'CREATE TRIGGER "db5_policy_range_overlap" BEFORE INSERT OR UPDATE ON "{table}" '
            'FOR EACH ROW EXECUTE FUNCTION hrms_db5_guard_policy_assignment_overlap()'
        )


def remove_db5_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for table in [
        "employee_lifecycle_employmentspell",
        "employee_lifecycle_employmentassignment",
        "payroll_employeesalaryassignment",
        "payroll_paygroupassignment",
        "payroll_employeestatutoryprofile",
    ]:
        schema_editor.execute(f'DROP TRIGGER IF EXISTS "db5_range_overlap" ON "{table}"')
    for table in ["employee_lifecycle_employmentspell", "employee_lifecycle_employmentassignment"]:
        schema_editor.execute(f'DROP TRIGGER IF EXISTS "db5_employment_scope" ON "{table}"')
    for table in ["leave_management_leavepolicyassignment", "attendance_attendancepolicyassignment"]:
        schema_editor.execute(f'DROP TRIGGER IF EXISTS "db5_policy_range_overlap" ON "{table}"')
    schema_editor.execute("DROP FUNCTION IF EXISTS hrms_db5_guard_employee_range_overlap()")
    schema_editor.execute("DROP FUNCTION IF EXISTS hrms_db5_guard_employment_scope()")
    schema_editor.execute("DROP FUNCTION IF EXISTS hrms_db5_guard_policy_assignment_overlap()")


class Migration(migrations.Migration):
    dependencies = [
        ("employee_lifecycle", "0002_employmentassignment_and_more"),
        ("attendance", "0010_attendancepolicyassignment_attendance_policy_assignment_dates_ordered"),
        ("leave_management", "0010_leavepolicyassignment_leave_policy_assignment_dates_ordered"),
        ("payroll", "0039_fiscal_year_transition_guards"),
    ]

    operations = [migrations.RunPython(install_db5_guards, remove_db5_guards)]
