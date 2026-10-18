import hashlib

from django.db import migrations


HISTORICAL_MODELS = {
    "attendance.AttendanceRecord",
    "attendance.AttendanceRegularization",
    "common.HrmsImportBatchAudit",
    "common.SaasCommercialAuditEvent",
    "common.SaasIncidentRecord",
    "common.SaasSupportAccessGrant",
    "common.SaasTenantChangeRequest",
    "documents.DocumentArtifact",
    "documents.DocumentVerificationLog",
    "documents.EmployeeDocument",
    "documents.GeneratedLetter",
    "employee_lifecycle.EmployeeExit",
    "employee_lifecycle.EmployeeMovement",
    "employee_lifecycle.EmployeeOnboarding",
    "employee_lifecycle.LifecycleEvent",
    "employee_lifecycle.ProbationReview",
    "leave_management.LeaveBalanceTransaction",
    "leave_management.LeaveBalance",
    "leave_management.LeaveEntitlementLot",
    "leave_management.LeaveRequest",
    "leave_management.LeaveRequestAllocation",
    "leave_management.LeaveYearCloseItem",
    "leave_management.LeaveYearCloseRun",
    "payroll.EmployeeStatutoryDeclaration",
    "payroll.EmployeeStatutoryDeclarationItem",
    "payroll.PayrollAdjustment",
    "payroll.PayrollArtifactAccessEvent",
    "payroll.PayrollArtifactSignedAccessGrant",
    "payroll.PayrollBackgroundJob",
    "payroll.PayrollCalculationLine",
    "payroll.PayrollFinanceHandoff",
    "payroll.PayrollInputSnapshot",
    "payroll.PayrollOutputArtifact",
    "payroll.PayrollOutputBatch",
    "payroll.PayrollProviderCallbackEvent",
    "payroll.PayrollProviderDelivery",
    "payroll.PayrollProviderJob",
    "payroll.PayrollProviderRetryEvent",
    "payroll.PayrollRunApproval",
    "payroll.PayrollRunCalculation",
    "payroll.PayrollRunException",
    "payroll.PayrollRunReview",
    "payroll.PayrollSettlement",
    "payroll.PayrollSettlementLine",
    "payroll.PayrollValidationIssue",
    "notifications.NotificationDeliveryLog",
    "platform_config.ConfigurationChangeLog",
    "tenant_onboarding.TenantOnboardingEvent",
    "workflows.WorkflowActionLog",
}


def _tenant_edges(apps):
    edges = []
    for model in apps.get_models():
        if model._meta.proxy or not model._meta.managed:
            continue
        fields = {field.name: field for field in model._meta.concrete_fields}
        tenant_field = fields.get("tenant")
        if tenant_field is None:
            continue
        for field in model._meta.concrete_fields:
            if field.name == "tenant" or not field.is_relation or not getattr(field, "many_to_one", False):
                continue
            target = field.remote_field.model
            target_fields = {item.name: item for item in target._meta.concrete_fields}
            target_tenant = target_fields.get("tenant")
            if target_tenant is None:
                continue
            edges.append(
                (
                    model._meta.label,
                    model._meta.db_table,
                    tenant_field.column,
                    field.column,
                    target._meta.db_table,
                    field.target_field.column,
                    target_tenant.column,
                )
            )
    return sorted(edges)


def _trigger_name(prefix, *parts):
    digest = hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]
    return f"{prefix}_{digest}"


def install_db4_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    quote = schema_editor.quote_name
    edges = _tenant_edges(apps)
    violations = []
    with schema_editor.connection.cursor() as cursor:
        for label, source, source_tenant, source_fk, target, target_pk, target_tenant in edges:
            cursor.execute(
                f"""
                SELECT count(*)
                FROM {quote(source)} source
                JOIN {quote(target)} target
                  ON target.{quote(target_pk)} = source.{quote(source_fk)}
                WHERE source.{quote(source_fk)} IS NOT NULL
                  AND source.{quote(source_tenant)} IS DISTINCT FROM target.{quote(target_tenant)}
                """
            )
            count = cursor.fetchone()[0]
            if count:
                violations.append(f"{label}.{source_fk}->{target}: {count}")
        derived_checks = {
            "iam.MembershipRole": """
                SELECT count(*) FROM iam_membershiprole item
                JOIN iam_tenantmembership membership ON membership.id = item.membership_id
                JOIN iam_role role ON role.id = item.role_id
                WHERE membership.tenant_id IS DISTINCT FROM role.tenant_id
            """,
            "tenant_onboarding.TenantOnboardingAdminContact": """
                SELECT count(*) FROM tenant_onboarding_tenantonboardingadmincontact item
                JOIN tenant_onboarding_tenantonboarding onboarding ON onboarding.id = item.onboarding_id
                JOIN iam_tenantmembership membership ON membership.id = item.membership_id
                WHERE item.membership_id IS NOT NULL
                  AND onboarding.tenant_id IS DISTINCT FROM membership.tenant_id
            """,
            "attendance.ShiftRosterRolloutItem": """
                SELECT count(*) FROM attendance_shiftrosterrolloutitem item
                JOIN attendance_shiftrosterrollout rollout ON rollout.id = item.rollout_id
                LEFT JOIN employees_employee employee ON employee.id = item.employee_id
                LEFT JOIN attendance_employeeshiftassignment assignment ON assignment.id = item.assignment_id
                WHERE (item.employee_id IS NOT NULL AND rollout.tenant_id IS DISTINCT FROM employee.tenant_id)
                   OR (item.assignment_id IS NOT NULL AND rollout.tenant_id IS DISTINCT FROM assignment.tenant_id)
            """,
            "workflows.WorkflowStep": """
                SELECT count(*) FROM workflows_workflowstep step
                JOIN workflows_workflowtemplate template ON template.id = step.template_id
                LEFT JOIN iam_role role ON role.id = step.role_id
                LEFT JOIN iam_tenantmembership membership ON membership.id = step.membership_id
                WHERE (step.role_id IS NOT NULL AND template.tenant_id IS DISTINCT FROM role.tenant_id)
                   OR (step.membership_id IS NOT NULL AND template.tenant_id IS DISTINCT FROM membership.tenant_id)
            """,
            "platform_config.ScopedConfigurationOverride": """
                SELECT count(*) FROM platform_config_scopedconfigurationoverride item
                JOIN platform_config_tenantconfiguration config ON config.id = item.tenant_configuration_id
                LEFT JOIN organizations_legalentity entity ON entity.id = item.legal_entity_id
                LEFT JOIN organizations_branch branch ON branch.id = item.branch_id
                LEFT JOIN organizations_department department ON department.id = item.department_id
                LEFT JOIN organizations_grade grade ON grade.id = item.grade_id
                LEFT JOIN organizations_employmenttype employment_type ON employment_type.id = item.employment_type_id
                WHERE (item.legal_entity_id IS NOT NULL AND config.tenant_id IS DISTINCT FROM entity.tenant_id)
                   OR (item.branch_id IS NOT NULL AND config.tenant_id IS DISTINCT FROM branch.tenant_id)
                   OR (item.department_id IS NOT NULL AND config.tenant_id IS DISTINCT FROM department.tenant_id)
                   OR (item.grade_id IS NOT NULL AND config.tenant_id IS DISTINCT FROM grade.tenant_id)
                   OR (item.employment_type_id IS NOT NULL AND config.tenant_id IS DISTINCT FROM employment_type.tenant_id)
            """,
        }
        for label, statement in derived_checks.items():
            cursor.execute(statement)
            count = cursor.fetchone()[0]
            if count:
                violations.append(f"{label} derived tenant scope: {count}")
    if violations:
        raise RuntimeError(
            "DB-4 tenant-integrity preflight found incompatible historical rows; "
            "no guards were installed: " + "; ".join(violations)
        )

    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION hrms_db4_assert_tenant_reference()
        RETURNS trigger AS $$
        DECLARE
            source_tenant uuid;
            reference_id uuid;
            reference_tenant uuid;
        BEGIN
            source_tenant := NULLIF(to_jsonb(NEW)->>TG_ARGV[0], '')::uuid;
            reference_id := NULLIF(to_jsonb(NEW)->>TG_ARGV[1], '')::uuid;
            IF reference_id IS NULL THEN
                RETURN NEW;
            END IF;
            EXECUTE format('SELECT %%I FROM %%I WHERE %%I = $1', TG_ARGV[4], TG_ARGV[2], TG_ARGV[3])
                INTO reference_tenant USING reference_id;
            IF reference_tenant IS NULL OR reference_tenant IS DISTINCT FROM source_tenant THEN
                RAISE EXCEPTION 'cross-tenant reference rejected on %%.%%', TG_TABLE_NAME, TG_ARGV[1]
                    USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION hrms_db4_guard_historical_delete()
        RETURNS trigger AS $$
        BEGIN
            IF COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') <> 'authorized' THEN
                RAISE EXCEPTION 'historical record deletion is prohibited on %%', TG_TABLE_NAME
                    USING ERRCODE = '55000';
            END IF;
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION hrms_db4_guard_workflow_scope()
        RETURNS trigger AS $$
        DECLARE
            instance_tenant uuid;
            membership_tenant uuid;
            role_tenant uuid;
            template_tenant uuid;
            step_instance_workflow uuid;
        BEGIN
            IF TG_TABLE_NAME = 'workflows_workflowstepinstance' THEN
                SELECT tenant_id INTO instance_tenant
                  FROM workflows_workflowinstance WHERE id = NEW.workflow_instance_id;
                IF NEW.template_step_id IS NOT NULL THEN
                    SELECT template.tenant_id INTO template_tenant
                      FROM workflows_workflowstep template_step
                      JOIN workflows_workflowtemplate template ON template.id = template_step.template_id
                     WHERE template_step.id = NEW.template_step_id;
                    IF template_tenant IS DISTINCT FROM instance_tenant THEN
                        RAISE EXCEPTION 'workflow step instance template crosses tenant scope'
                            USING ERRCODE = '23514';
                    END IF;
                END IF;
                RETURN NEW;
            ELSIF TG_TABLE_NAME = 'workflows_workflowactionlog' THEN
                IF NEW.step_instance_id IS NOT NULL THEN
                    SELECT workflow_instance_id INTO step_instance_workflow
                      FROM workflows_workflowstepinstance WHERE id = NEW.step_instance_id;
                    IF step_instance_workflow IS DISTINCT FROM NEW.workflow_instance_id THEN
                        RAISE EXCEPTION 'workflow action step belongs to a different workflow instance'
                            USING ERRCODE = '23514';
                    END IF;
                END IF;
                RETURN NEW;
            END IF;

            IF NEW.membership_id IS NULL THEN
                membership_tenant := NULL;
            ELSE
                SELECT tenant_id INTO membership_tenant
                  FROM iam_tenantmembership WHERE id = NEW.membership_id;
            END IF;
            SELECT workflow_instance.tenant_id
              INTO instance_tenant
              FROM workflows_workflowstepinstance step_instance
              JOIN workflows_workflowinstance workflow_instance
                ON workflow_instance.id = step_instance.workflow_instance_id
             WHERE step_instance.id = NEW.step_instance_id;
            IF membership_tenant IS NOT NULL AND membership_tenant IS DISTINCT FROM instance_tenant THEN
                RAISE EXCEPTION 'workflow assignment membership crosses tenant scope'
                    USING ERRCODE = '23514';
            END IF;
            IF NEW.role_id IS NOT NULL THEN
                SELECT tenant_id INTO role_tenant FROM iam_role WHERE id = NEW.role_id;
                IF role_tenant IS DISTINCT FROM instance_tenant THEN
                    RAISE EXCEPTION 'workflow assignment role crosses tenant scope'
                        USING ERRCODE = '23514';
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION hrms_db4_guard_derived_tenant_scope()
        RETURNS trigger AS $$
        DECLARE
            owner_tenant uuid;
            related_tenant uuid;
        BEGIN
            IF TG_TABLE_NAME = 'iam_membershiprole' THEN
                SELECT tenant_id INTO owner_tenant FROM iam_tenantmembership WHERE id = NEW.membership_id;
                SELECT tenant_id INTO related_tenant FROM iam_role WHERE id = NEW.role_id;
                IF owner_tenant IS DISTINCT FROM related_tenant THEN
                    RAISE EXCEPTION 'membership role crosses tenant scope' USING ERRCODE = '23514';
                END IF;
            ELSIF TG_TABLE_NAME = 'tenant_onboarding_tenantonboardingadmincontact' THEN
                SELECT tenant_id INTO owner_tenant FROM tenant_onboarding_tenantonboarding WHERE id = NEW.onboarding_id;
                IF NEW.membership_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM iam_tenantmembership WHERE id = NEW.membership_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN
                        RAISE EXCEPTION 'onboarding contact membership crosses tenant scope' USING ERRCODE = '23514';
                    END IF;
                END IF;
            ELSIF TG_TABLE_NAME = 'attendance_shiftrosterrolloutitem' THEN
                SELECT tenant_id INTO owner_tenant FROM attendance_shiftrosterrollout WHERE id = NEW.rollout_id;
                IF NEW.employee_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM employees_employee WHERE id = NEW.employee_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN
                        RAISE EXCEPTION 'roster rollout employee crosses tenant scope' USING ERRCODE = '23514';
                    END IF;
                END IF;
                IF NEW.assignment_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM attendance_employeeshiftassignment WHERE id = NEW.assignment_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN
                        RAISE EXCEPTION 'roster rollout assignment crosses tenant scope' USING ERRCODE = '23514';
                    END IF;
                END IF;
            ELSIF TG_TABLE_NAME = 'workflows_workflowstep' THEN
                SELECT tenant_id INTO owner_tenant FROM workflows_workflowtemplate WHERE id = NEW.template_id;
                IF NEW.role_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM iam_role WHERE id = NEW.role_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN
                        RAISE EXCEPTION 'workflow step role crosses tenant scope' USING ERRCODE = '23514';
                    END IF;
                END IF;
                IF NEW.membership_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM iam_tenantmembership WHERE id = NEW.membership_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN
                        RAISE EXCEPTION 'workflow step membership crosses tenant scope' USING ERRCODE = '23514';
                    END IF;
                END IF;
            ELSE
                SELECT tenant_id INTO owner_tenant
                  FROM platform_config_tenantconfiguration WHERE id = NEW.tenant_configuration_id;
                IF NEW.legal_entity_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_legalentity WHERE id = NEW.legal_entity_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN RAISE EXCEPTION 'configuration legal entity crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.branch_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_branch WHERE id = NEW.branch_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN RAISE EXCEPTION 'configuration branch crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.department_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_department WHERE id = NEW.department_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN RAISE EXCEPTION 'configuration department crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.grade_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_grade WHERE id = NEW.grade_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN RAISE EXCEPTION 'configuration grade crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
                IF NEW.employment_type_id IS NOT NULL THEN
                    SELECT tenant_id INTO related_tenant FROM organizations_employmenttype WHERE id = NEW.employment_type_id;
                    IF owner_tenant IS DISTINCT FROM related_tenant THEN RAISE EXCEPTION 'configuration employment type crosses tenant scope' USING ERRCODE = '23514'; END IF;
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION payroll_reject_terminal_row_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' AND
               COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') = 'authorized' THEN
                RETURN OLD;
            END IF;
            IF (to_jsonb(OLD) ->> TG_ARGV[0]) = ANY(string_to_array(TG_ARGV[1], ',')) THEN
                RAISE EXCEPTION 'terminal payroll row in %% is immutable', TG_TABLE_NAME
                    USING ERRCODE = '55000';
            END IF;
            RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION payroll_guard_approved_run_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' AND
               COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') = 'authorized' THEN
                RETURN OLD;
            END IF;
            IF OLD.status = 'locked' OR TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'approved or locked payroll run is immutable' USING ERRCODE = '55000';
            END IF;
            IF OLD.status = 'approved' THEN
                IF NEW.status <> 'locked' OR
                   (to_jsonb(NEW) - ARRAY['status', 'final_locked_at', 'final_locked_by_id', 'updated_at'])
                   IS DISTINCT FROM
                   (to_jsonb(OLD) - ARRAY['status', 'final_locked_at', 'final_locked_by_id', 'updated_at']) THEN
                    RAISE EXCEPTION 'approved payroll run only permits final lock transition' USING ERRCODE = '55000';
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION leave_guard_applied_ledger_immutable()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' AND
               COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') = 'authorized' THEN
                RETURN OLD;
            END IF;
            IF OLD.status = 'applied' THEN
                RAISE EXCEPTION 'applied leave ledger entries are append-only' USING ERRCODE = '55000';
            END IF;
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION leave_guard_period_event_append_only()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' AND
               COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') = 'authorized' THEN
                RETURN OLD;
            END IF;
            RAISE EXCEPTION 'leave period status events are append-only' USING ERRCODE = '55000';
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    for _label, source, source_tenant, source_fk, target, target_pk, target_tenant in edges:
        trigger = _trigger_name("db4_scope", source, source_fk, target)
        schema_editor.execute(
            f"""
            CREATE TRIGGER {quote(trigger)}
            BEFORE INSERT OR UPDATE OF {quote(source_tenant)}, {quote(source_fk)} ON {quote(source)}
            FOR EACH ROW EXECUTE FUNCTION hrms_db4_assert_tenant_reference(
                '{source_tenant}', '{source_fk}', '{target}', '{target_pk}', '{target_tenant}'
            )
            """
        )

    for label in sorted(HISTORICAL_MODELS):
        try:
            model = apps.get_model(label)
        except LookupError:
            continue
        trigger = _trigger_name("db4_retain", model._meta.db_table)
        schema_editor.execute(
            f"""
            CREATE TRIGGER {quote(trigger)} BEFORE DELETE ON {quote(model._meta.db_table)}
            FOR EACH ROW EXECUTE FUNCTION hrms_db4_guard_historical_delete()
            """
        )

    schema_editor.execute(
        """
        CREATE TRIGGER db4_workflow_step_instance_scope
        BEFORE INSERT OR UPDATE OF workflow_instance_id, template_step_id ON workflows_workflowstepinstance
        FOR EACH ROW EXECUTE FUNCTION hrms_db4_guard_workflow_scope();
        CREATE TRIGGER db4_workflow_assignment_scope
        BEFORE INSERT OR UPDATE OF step_instance_id, membership_id, role_id ON workflows_workflowassignment
        FOR EACH ROW EXECUTE FUNCTION hrms_db4_guard_workflow_scope();
        CREATE TRIGGER db4_workflow_action_scope
        BEFORE INSERT OR UPDATE OF workflow_instance_id, step_instance_id ON workflows_workflowactionlog
        FOR EACH ROW EXECUTE FUNCTION hrms_db4_guard_workflow_scope();
        CREATE TRIGGER db4_membership_role_scope
        BEFORE INSERT OR UPDATE OF membership_id, role_id ON iam_membershiprole
        FOR EACH ROW EXECUTE FUNCTION hrms_db4_guard_derived_tenant_scope();
        CREATE TRIGGER db4_onboarding_contact_scope
        BEFORE INSERT OR UPDATE OF onboarding_id, membership_id ON tenant_onboarding_tenantonboardingadmincontact
        FOR EACH ROW EXECUTE FUNCTION hrms_db4_guard_derived_tenant_scope();
        CREATE TRIGGER db4_roster_rollout_item_scope
        BEFORE INSERT OR UPDATE OF rollout_id, employee_id, assignment_id ON attendance_shiftrosterrolloutitem
        FOR EACH ROW EXECUTE FUNCTION hrms_db4_guard_derived_tenant_scope();
        CREATE TRIGGER db4_workflow_step_scope
        BEFORE INSERT OR UPDATE OF template_id, role_id, membership_id ON workflows_workflowstep
        FOR EACH ROW EXECUTE FUNCTION hrms_db4_guard_derived_tenant_scope();
        CREATE TRIGGER db4_scoped_configuration_scope
        BEFORE INSERT OR UPDATE OF tenant_configuration_id, legal_entity_id, branch_id, department_id, grade_id, employment_type_id
        ON platform_config_scopedconfigurationoverride
        FOR EACH ROW EXECUTE FUNCTION hrms_db4_guard_derived_tenant_scope()
        """
    )


def remove_db4_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    quote = schema_editor.quote_name
    schema_editor.execute("DROP TRIGGER IF EXISTS db4_scoped_configuration_scope ON platform_config_scopedconfigurationoverride")
    schema_editor.execute("DROP TRIGGER IF EXISTS db4_workflow_step_scope ON workflows_workflowstep")
    schema_editor.execute("DROP TRIGGER IF EXISTS db4_roster_rollout_item_scope ON attendance_shiftrosterrolloutitem")
    schema_editor.execute("DROP TRIGGER IF EXISTS db4_onboarding_contact_scope ON tenant_onboarding_tenantonboardingadmincontact")
    schema_editor.execute("DROP TRIGGER IF EXISTS db4_membership_role_scope ON iam_membershiprole")
    schema_editor.execute("DROP TRIGGER IF EXISTS db4_workflow_action_scope ON workflows_workflowactionlog")
    schema_editor.execute("DROP TRIGGER IF EXISTS db4_workflow_assignment_scope ON workflows_workflowassignment")
    schema_editor.execute("DROP TRIGGER IF EXISTS db4_workflow_step_instance_scope ON workflows_workflowstepinstance")
    for label in sorted(HISTORICAL_MODELS):
        try:
            model = apps.get_model(label)
        except LookupError:
            continue
        trigger = _trigger_name("db4_retain", model._meta.db_table)
        schema_editor.execute(f"DROP TRIGGER IF EXISTS {quote(trigger)} ON {quote(model._meta.db_table)}")
    for _label, source, _source_tenant, source_fk, target, _target_pk, _target_tenant in _tenant_edges(apps):
        trigger = _trigger_name("db4_scope", source, source_fk, target)
        schema_editor.execute(f"DROP TRIGGER IF EXISTS {quote(trigger)} ON {quote(source)}")
    schema_editor.execute("DROP FUNCTION IF EXISTS hrms_db4_guard_workflow_scope()")
    schema_editor.execute("DROP FUNCTION IF EXISTS hrms_db4_guard_derived_tenant_scope()")
    schema_editor.execute("DROP FUNCTION IF EXISTS hrms_db4_guard_historical_delete()")
    schema_editor.execute("DROP FUNCTION IF EXISTS hrms_db4_assert_tenant_reference()")
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION payroll_reject_terminal_row_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF (to_jsonb(OLD) ->> TG_ARGV[0]) = ANY(string_to_array(TG_ARGV[1], ',')) THEN
                RAISE EXCEPTION 'terminal payroll row in %% is immutable', TG_TABLE_NAME USING ERRCODE = '55000';
            END IF;
            RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
        END;
        $$ LANGUAGE plpgsql;
        CREATE OR REPLACE FUNCTION payroll_guard_approved_run_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.status = 'locked' OR TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'approved or locked payroll run is immutable' USING ERRCODE = '55000';
            END IF;
            IF OLD.status = 'approved' THEN
                IF NEW.status <> 'locked' OR
                   (to_jsonb(NEW) - ARRAY['status', 'final_locked_at', 'final_locked_by_id', 'updated_at'])
                   IS DISTINCT FROM
                   (to_jsonb(OLD) - ARRAY['status', 'final_locked_at', 'final_locked_by_id', 'updated_at']) THEN
                    RAISE EXCEPTION 'approved payroll run only permits final lock transition' USING ERRCODE = '55000';
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        CREATE OR REPLACE FUNCTION leave_guard_applied_ledger_immutable()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.status = 'applied' THEN
                RAISE EXCEPTION 'applied leave ledger entries are append-only' USING ERRCODE = '55000';
            END IF;
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
        CREATE OR REPLACE FUNCTION leave_guard_period_event_append_only()
        RETURNS trigger AS $$ BEGIN
            RAISE EXCEPTION 'leave period status events are append-only' USING ERRCODE = '55000';
        END; $$ LANGUAGE plpgsql;
        """
    )


class Migration(migrations.Migration):
    dependencies = [
        ("attendance", "0008_alter_shiftrosterrollout_id_and_more"),
        ("common", "0007_rename_common_hrms_tenant__23363d_idx_common_hrms_tenant__c40ff2_idx_and_more"),
        ("documents", "0003_employeedocument_previous_document_and_more"),
        ("employee_lifecycle", "0001_initial"),
        ("employees", "0002_initial"),
        ("iam", "0003_menucatalogentry"),
        ("leave_management", "0008_leave_year_close_scheduling"),
        ("notifications", "0002_notificationchannelconfiguration"),
        ("organizations", "0001_initial"),
        ("payroll", "0039_fiscal_year_transition_guards"),
        ("platform_config", "0001_initial"),
        ("platform_policies", "0003_platformpolicypack_source_pack"),
        ("tenant_onboarding", "0003_tenantonboarding_launch_applied_at_and_more"),
        ("tenants", "0002_tenant_onboarding_fields"),
        ("workflows", "0001_initial"),
    ]

    operations = [migrations.RunPython(install_db4_guards, remove_db4_guards)]
