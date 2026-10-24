"""Synthetic render-only fixtures for the UI rollout, never production seeding."""
import json
import os
from datetime import date
from pathlib import Path

from django.apps import apps


def prepare(manifest_path):
    if os.environ.get('POSTGRES_DB') != 'hrms_ui_rollout' or os.environ.get('POSTGRES_HOST') != '127.0.0.1':
        raise RuntimeError('UI rollout fixtures require the owned local database.')
    manifest = json.loads(Path(manifest_path).read_text())
    tenant = apps.get_model('tenants.Tenant').objects.get(pk=manifest['tenant']['id'])
    if not tenant.is_sandbox or not tenant.code.startswith('pw-qa-'):
        raise RuntimeError('Refusing a non-synthetic tenant.')
    employee = apps.get_model('employees.Employee').objects.get(pk=manifest['credentials']['employee']['employee_id'], tenant=tenant)
    today = date.today()

    def model(label):
        return apps.get_model(label)

    def ensure(label, **values):
        cls = model(label)
        existing = cls.objects.filter(tenant=tenant).first()
        return existing or cls.objects.create(tenant=tenant, **values)

    shift = ensure('attendance.Shift', code='ui-shift', name='UI render shift')
    policy = model('attendance.AttendancePolicy').objects.filter(tenant=tenant).first()
    ensure('attendance.HolidayCalendar', code='ui-holidays', name='UI holidays', year=today.year)
    ensure('attendance.EmployeeShiftAssignment', employee=employee, shift=shift, effective_from=today)
    ensure('attendance.AttendancePolicyAssignment', attendance_policy=policy, employee=employee, effective_from=today)
    ensure('attendance.ShiftRosterTemplate', code='ui-roster', name='UI roster', shift=shift)
    ensure('employee_lifecycle.EmployeeOnboarding', employee=employee, expected_joining_date=today)
    ensure('employee_lifecycle.ProbationReview', employee=employee, review_date=today)
    ensure('employee_lifecycle.EmployeeMovement', employee=employee, effective_date=today, movement_type='transfer')
    ensure('employee_lifecycle.EmployeeExit', employee=employee)
    category = model('documents.DocumentCategory').objects.filter(tenant=tenant).first()
    ensure('documents.DocumentRequirementRule', category=category)
    template = ensure('notifications.NotificationTemplate', code='ui-notice', name='UI notice', channel='in_app', body_template='Synthetic render-only notice')
    ensure('notifications.NotificationEventDefinition', code='ui-event', name='UI event', module='employee', trigger_key='ui.render', audience_type='employee', channel='in_app', template=template)
    workflow = ensure('workflows.WorkflowTemplate', code='ui-workflow', name='UI workflow', module='leave', trigger_key='ui.render')
    if workflow:
        ensure('workflows.WorkflowTemplateAssignment', template=workflow)
    mapping = {
        'attendance-policies':'attendance.AttendancePolicy',
        'attendance-policy-assignments':'attendance.AttendancePolicyAssignment',
        'attendance-records':'attendance.AttendanceRecord',
        'attendance-regularizations':'attendance.AttendanceRegularization',
        'document-categories':'documents.DocumentCategory',
        'document-requirements':'documents.DocumentRequirementRule',
        'employee-documents':'documents.EmployeeDocument',
        'employee-shift-assignments':'attendance.EmployeeShiftAssignment',
        'exits':'employee_lifecycle.EmployeeExit',
        'holiday-calendars':'attendance.HolidayCalendar',
        'leave-policies':'leave_management.LeavePolicy',
        'leave-policy-assignments':'leave_management.LeavePolicyAssignment',
        'leave-types':'leave_management.LeaveType',
        'movements':'employee_lifecycle.EmployeeMovement',
        'notification-events':'notifications.NotificationEventDefinition',
        'notification-templates':'notifications.NotificationTemplate',
        'notifications':'notifications.Notification',
        'onboardings':'employee_lifecycle.EmployeeOnboarding',
        'probation-reviews':'employee_lifecycle.ProbationReview',
        'shift-roster-templates':'attendance.ShiftRosterTemplate',
        'shifts':'attendance.Shift',
        'workflow-template-assignments':'workflows.WorkflowTemplateAssignment',
        'workflow-templates':'workflows.WorkflowTemplate',
    }
    ids = {}
    for key, label in mapping.items():
        item = model(label).objects.filter(tenant=tenant).first()
        if not item:
            raise RuntimeError(f'Missing render fixture: {key}')
        ids[key] = str(item.pk)
    organization = {
        'legal_entities':'LegalEntity', 'locations':'Location', 'branches':'Branch',
        'business_units':'BusinessUnit', 'departments':'Department', 'cost_centers':'CostCenter',
        'grades':'Grade', 'designations':'Designation', 'employment_types':'EmploymentType',
    }
    routes = []
    for key, identifier in ids.items():
        action = 'review' if key in ['attendance-regularizations', 'employee-documents', 'notifications'] else 'edit'
        routes.append(f'/hr-admin/{key}/{identifier}/{action}')
    for action in ['access', 'bank-accounts', 'edit']:
        routes.append(f'/hr-admin/employees/{employee.pk}/{action}')
    for section, name in organization.items():
        item = model(f'organizations.{name}').objects.filter(tenant=tenant).first()
        routes.extend([f'/hr-admin/organization/{section}/{item.pk}/edit', f'/hr-admin/organization/{section}/new'])
    return routes


def finance_persona(manifest_path):
    """Give an existing owned synthetic checker a finance role; cleanup owns that user."""
    if os.environ.get('POSTGRES_DB') != 'hrms_ui_rollout' or os.environ.get('POSTGRES_HOST') != '127.0.0.1':
        raise RuntimeError('UI rollout fixtures require the owned local database.')
    from apps.iam.permission_catalog import get_permission_catalog
    manifest = json.loads(Path(manifest_path).read_text())
    tenant = apps.get_model('tenants.Tenant').objects.get(pk=manifest['tenant']['id'])
    if not tenant.is_sandbox or not tenant.code.startswith('pw-qa-'):
        raise RuntimeError('Refusing a non-synthetic tenant.')
    username = manifest['credentials']['hr_checker']['username']
    membership = apps.get_model('iam.TenantMembership').objects.get(tenant=tenant, user__username=username)
    role, _ = apps.get_model('iam.Role').objects.get_or_create(tenant=tenant, code='payroll-finance-manager', defaults={'name':'Payroll Finance Manager'})
    apps.get_model('iam.MembershipRole').objects.get_or_create(membership=membership, role=role)
    for entry in get_permission_catalog():
        if 'payroll-finance-manager' in entry.get('default_role_codes', []):
            apps.get_model('iam.RolePermission').objects.get_or_create(role=role, permission_key=entry['key'])
    return username


def provider_dialogs(manifest_path):
    if os.environ.get('POSTGRES_DB') != 'hrms_ui_rollout' or os.environ.get('POSTGRES_HOST') != '127.0.0.1':
        raise RuntimeError('UI rollout fixtures require the owned local database.')
    manifest = json.loads(Path(manifest_path).read_text())
    tenant = apps.get_model('tenants.Tenant').objects.get(pk=manifest['tenant']['id'])
    if not tenant.is_sandbox or not tenant.code.startswith('pw-qa-'):
        raise RuntimeError('Refusing a non-synthetic tenant.')
    connection = apps.get_model('payroll.PayrollProviderConnection').objects.create(tenant=tenant, provider_ref='ui-render-only', provider_name='UI render-only provider')
    apps.get_model('payroll.PayrollProviderSchemaMappingPack').objects.create(tenant=tenant, provider_connection=connection, provider_ref='ui-render-only', artifact_kind='payslip', mapping_profile_ref='ui-render-only')
