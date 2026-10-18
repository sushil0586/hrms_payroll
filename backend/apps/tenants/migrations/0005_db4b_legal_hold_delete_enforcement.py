from django.db import migrations


HELD_TABLES = {
    "employees_employee": ("employee_master", "employees.Employee"),
    "documents_employeedocument": ("employee_documents", "documents.EmployeeDocument"),
    "documents_documentartifact": ("employee_documents", "documents.DocumentArtifact"),
    "attendance_attendancerecord": ("attendance", "attendance.AttendanceRecord"),
    "attendance_attendanceregularization": ("attendance", "attendance.AttendanceRegularization"),
    "leave_management_leaverequest": ("leave", "leave_management.LeaveRequest"),
    "leave_management_leavebalance": ("leave", "leave_management.LeaveBalance"),
    "leave_management_leavebalancetransaction": ("leave", "leave_management.LeaveBalanceTransaction"),
    "payroll_payrollrun": ("payroll", "payroll.PayrollRun"),
    "payroll_payrollcalculationline": ("payroll", "payroll.PayrollCalculationLine"),
    "payroll_payrolloutputartifact": ("payroll", "payroll.PayrollOutputArtifact"),
    "payroll_payrollfinancehandoff": ("finance", "payroll.PayrollFinanceHandoff"),
    "payroll_payrollproviderdelivery": ("finance", "payroll.PayrollProviderDelivery"),
    "workflows_workflowactionlog": ("workflow_audit", "workflows.WorkflowActionLog"),
    "common_saascommercialauditevent": ("workflow_audit", "common.SaasCommercialAuditEvent"),
}


def install_legal_hold_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION hrms_db4b_guard_legal_hold_delete()
        RETURNS trigger AS $$
        BEGIN
            IF COALESCE(current_setting('hrms.synthetic_tenant_teardown', true), '') = 'authorized' THEN
                RETURN OLD;
            END IF;
            IF EXISTS (
                SELECT 1
                  FROM tenants_legalhold hold
                 WHERE hold.tenant_id = OLD.tenant_id
                   AND hold.status = 'active'
                   AND hold.record_category IN ('', TG_ARGV[0])
                   AND (
                       hold.resource_id IS NULL
                       OR (
                           hold.resource_id = OLD.id
                           AND hold.resource_type IN ('', TG_ARGV[1])
                       )
                   )
            ) THEN
                RAISE EXCEPTION 'active legal hold prohibits deletion from %%', TG_TABLE_NAME
                    USING ERRCODE = '55000';
            END IF;
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    for table, (category, resource_type) in HELD_TABLES.items():
        trigger = f"db4b_legal_hold_delete_{table}"
        schema_editor.execute(f'DROP TRIGGER IF EXISTS "{trigger}" ON "{table}"')
        schema_editor.execute(
            f'''CREATE TRIGGER "{trigger}" BEFORE DELETE ON "{table}"
                FOR EACH ROW EXECUTE FUNCTION hrms_db4b_guard_legal_hold_delete('{category}', '{resource_type}')'''
        )


def remove_legal_hold_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for table in HELD_TABLES:
        schema_editor.execute(f'DROP TRIGGER IF EXISTS "db4b_legal_hold_delete_{table}" ON "{table}"')
    schema_editor.execute("DROP FUNCTION IF EXISTS hrms_db4b_guard_legal_hold_delete()")


class Migration(migrations.Migration):
    dependencies = [("tenants", "0004_remove_retentionpolicy_unique_retention_policy_scope_start_and_more")]

    operations = [migrations.RunPython(install_legal_hold_guards, remove_legal_hold_guards)]
