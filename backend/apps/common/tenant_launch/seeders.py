"""Certified tenant launch seeders for safe apply operations."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, time
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.attendance.models import (
    AttendancePolicy,
    AttendancePolicyAssignment,
    AttendancePolicyStatus,
    AttendanceUnit,
    Holiday,
    HolidayCalendar,
    HolidayType,
    Shift,
)
from apps.attendance.services import ensure_employee_attendance_records
from apps.documents.models import DocumentCategory, DocumentCategoryType, DocumentRequirementRule
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import Role, RolePermission, ScopeType
from apps.iam.permission_catalog import get_permission_catalog
from apps.leave_management.models import (
    AccrualFrequency,
    LeaveCategory,
    LeavePolicy,
    LeavePolicyAssignment,
    LeavePolicyStatus,
    LeaveType,
    LeaveUnit,
)
from apps.leave_management.services import ensure_employee_leave_balances
from apps.notifications.models import (
    NotificationAudienceType,
    NotificationChannel,
    NotificationEventDefinition,
    NotificationPriority,
    NotificationTemplate,
    NotificationTemplateStatus,
)
from apps.notifications.services import get_or_create_channel_configuration
from apps.organizations.models import (
    Branch,
    BusinessUnit,
    CostCenter,
    Department,
    Designation,
    EmploymentType,
    Grade,
    LegalEntity,
    Location,
)
from apps.payroll.models import (
    PayGroup,
    PayGroupStatus,
    PayrollCalendar,
    PayrollConfigStatus,
    PayrollFrequency,
    PayrollOutputArtifactKind,
    PayrollProviderCertificationStatus,
    PayrollProviderConnection,
    PayrollProviderConnectionKind,
    PayrollProviderConnectionStatus,
    PayrollProviderSchemaMappingPack,
    PayrollProviderSchemaMappingPackStatus,
    PayrollStatutoryCalculationMethod,
    PayrollStatutoryComponent,
    PayrollStatutoryComponentKind,
    PayrollStatutoryContributionOwner,
    PayrollStatutoryPack,
    SalaryComponent,
    SalaryComponentType,
    SalaryComponentValueType,
    SalaryStructure,
    SalaryStructureComponent,
    SalaryStructureVersion,
)
from apps.platform_policies.models import DelegationMode, PolicySourceKind
from apps.tenant_onboarding.models import ChecklistStatus, TenantOnboarding, TenantOnboardingChecklistItem
from apps.workflows.models import (
    WorkflowActorType,
    WorkflowModule,
    WorkflowStatus,
    WorkflowStep,
    WorkflowStepMode,
    WorkflowTemplate,
    WorkflowTemplateAssignment,
)


SAFE_APPLY_MODULES = frozenset(
    {
        "launch_checklist",
        "roles_users",
        "notifications",
        "org_masters",
        "leave_attendance",
        "shift_attendance",
        "documents",
        "workflows",
        "payroll_defaults",
        "provider_placeholders",
    }
)


ROLE_DEFINITIONS = (
    {
        "code": "tenant-admin",
        "name": "Tenant Admin",
        "description": "Owns tenant setup, users, roles, settings, support access, and audit evidence.",
        "minimum_plan": "starter",
    },
    {
        "code": "hr-admin",
        "name": "HR Admin",
        "description": "Owns employee, organization, document, leave, attendance, lifecycle, and HR reports.",
        "minimum_plan": "starter",
    },
    {
        "code": "payroll-finance-manager",
        "name": "Payroll Finance Manager",
        "description": "Reviews payroll outputs, finance handoff, statutory filing, and payroll reports.",
        "minimum_plan": "growth",
    },
    {
        "code": "manager",
        "name": "Manager",
        "description": "Reviews team leave, attendance, and manager self-service actions.",
        "minimum_plan": "starter",
    },
    {
        "code": "employee",
        "name": "Employee",
        "description": "Employee self-service access for documents, leave, attendance, and declarations.",
        "minimum_plan": "starter",
    },
    {
        "code": "auditor",
        "name": "Auditor",
        "description": "Read-only audit and evidence review access.",
        "minimum_plan": "growth",
    },
)


AUDITOR_PERMISSION_KEYS = (
    "tenant.audit.view",
    "reports.hr.view",
    "reports.payroll.view",
    "reports.compliance.view",
    "audit.hr.view",
)


LAUNCH_CHECKLIST_ITEMS = (
    ("launch_company_details_reviewed", "Company details reviewed", 100, "starter"),
    ("launch_admin_contact_confirmed", "Tenant admin contact confirmed", 110, "starter"),
    ("launch_roles_reviewed", "Default roles reviewed", 120, "starter"),
    ("launch_notification_templates_reviewed", "Notification templates reviewed", 130, "starter"),
    ("launch_org_structure_pending", "Organization structure pending customer review", 200, "starter"),
    ("launch_employee_import_pending", "Employee import pending", 210, "starter"),
    ("launch_payroll_credentials_pending", "Payroll provider credentials pending", 300, "growth"),
    ("launch_payroll_rehearsal_pending", "First payroll rehearsal pending", 310, "growth"),
)


NOTIFICATION_TEMPLATES = (
    {
        "code": "tenant-invite",
        "name": "Tenant invite",
        "channel": NotificationChannel.EMAIL,
        "subject": "Your {tenant_name} HRMS workspace is ready",
        "title": "Workspace access",
        "body": (
            "Hello {recipient_name},\n\n"
            "Your HRMS workspace for {tenant_name} is ready. Sign in with the access details shared by your admin."
        ),
        "module": "tenant",
        "trigger_key": "tenant.user.invited",
        "audience_type": NotificationAudienceType.MEMBERSHIP,
        "priority": NotificationPriority.HIGH,
        "minimum_plan": "starter",
    },
    {
        "code": "approval-request",
        "name": "Approval request",
        "channel": NotificationChannel.IN_APP,
        "subject": "",
        "title": "Approval needed",
        "body": "{actor_name} submitted {request_type}. Please review it when you can.",
        "module": "workflow",
        "trigger_key": "workflow.approval.requested",
        "audience_type": NotificationAudienceType.ROLE,
        "priority": NotificationPriority.NORMAL,
        "minimum_plan": "starter",
    },
    {
        "code": "approval-reminder",
        "name": "Approval reminder",
        "channel": NotificationChannel.IN_APP,
        "subject": "",
        "title": "Approval reminder",
        "body": "{request_type} is still waiting for approval.",
        "module": "workflow",
        "trigger_key": "workflow.approval.reminder",
        "audience_type": NotificationAudienceType.ROLE,
        "priority": NotificationPriority.HIGH,
        "minimum_plan": "starter",
    },
    {
        "code": "document-verification",
        "name": "Document verification",
        "channel": NotificationChannel.IN_APP,
        "subject": "",
        "title": "Document verification needed",
        "body": "{employee_name} uploaded {document_name}. Please verify the document.",
        "module": "documents",
        "trigger_key": "documents.verification.requested",
        "audience_type": NotificationAudienceType.ROLE,
        "priority": NotificationPriority.NORMAL,
        "minimum_plan": "starter",
    },
    {
        "code": "launch-readiness",
        "name": "Launch readiness",
        "channel": NotificationChannel.IN_APP,
        "subject": "",
        "title": "Launch readiness update",
        "body": "{tenant_name} launch readiness is now {readiness_status}.",
        "module": "launch",
        "trigger_key": "launch.readiness.updated",
        "audience_type": NotificationAudienceType.ROLE,
        "priority": NotificationPriority.NORMAL,
        "minimum_plan": "starter",
    },
    {
        "code": "payroll-ready",
        "name": "Payroll ready",
        "channel": NotificationChannel.IN_APP,
        "subject": "",
        "title": "Payroll is ready for review",
        "body": "{payroll_period} payroll is ready for review.",
        "module": "payroll",
        "trigger_key": "payroll.run.ready_for_review",
        "audience_type": NotificationAudienceType.ROLE,
        "priority": NotificationPriority.HIGH,
        "minimum_plan": "growth",
    },
    {
        "code": "payroll-exception",
        "name": "Payroll exception",
        "channel": NotificationChannel.IN_APP,
        "subject": "",
        "title": "Payroll exception needs attention",
        "body": "{exception_count} payroll exception(s) need review before payroll can continue.",
        "module": "payroll",
        "trigger_key": "payroll.exception.created",
        "audience_type": NotificationAudienceType.ROLE,
        "priority": NotificationPriority.CRITICAL,
        "minimum_plan": "growth",
    },
)


GRADE_DEFINITIONS = (
    ("g1", "G1 - Associate", 1),
    ("g2", "G2 - Senior Associate", 2),
    ("g3", "G3 - Manager", 3),
)


DESIGNATION_DEFINITIONS = (
    ("employee", "Employee", "g1"),
    ("senior-employee", "Senior Employee", "g2"),
    ("team-lead", "Team Lead", "g3"),
    ("hr-admin", "HR Admin", "g3"),
)


EMPLOYMENT_TYPE_DEFINITIONS = (
    ("full-time", "Full-time", "Regular payroll employee.", True),
    ("probation", "Probation", "Employee in probation period.", True),
    ("intern", "Intern", "Internship or trainee engagement.", False),
    ("contractor", "Contractor", "Contractor or consultant engagement.", False),
)


LEAVE_TYPE_DEFINITIONS = (
    {
        "code": "casual-leave",
        "name": "Casual Leave",
        "short_code": "CL",
        "category": LeaveCategory.PAID,
        "description": "Short planned or urgent personal leave.",
        "policy_code": "casual-leave-policy",
        "annual_entitlement": Decimal("12.00"),
        "max_carry_forward": Decimal("0.00"),
        "accrual_frequency": AccrualFrequency.MONTHLY,
        "allow_half_day": True,
        "notice_days_required": 0,
    },
    {
        "code": "sick-leave",
        "name": "Sick Leave",
        "short_code": "SL",
        "category": LeaveCategory.SICK,
        "description": "Medical leave for illness or recovery.",
        "policy_code": "sick-leave-policy",
        "annual_entitlement": Decimal("12.00"),
        "max_carry_forward": Decimal("0.00"),
        "accrual_frequency": AccrualFrequency.MONTHLY,
        "allow_half_day": True,
        "notice_days_required": 0,
    },
    {
        "code": "earned-leave",
        "name": "Earned Leave",
        "short_code": "EL",
        "category": LeaveCategory.VACATION,
        "description": "Planned paid leave for vacation or personal time.",
        "policy_code": "earned-leave-policy",
        "annual_entitlement": Decimal("15.00"),
        "max_carry_forward": Decimal("30.00"),
        "accrual_frequency": AccrualFrequency.MONTHLY,
        "allow_half_day": True,
        "notice_days_required": 7,
    },
    {
        "code": "loss-of-pay",
        "name": "Loss of Pay",
        "short_code": "LOP",
        "category": LeaveCategory.UNPAID,
        "description": "Unpaid leave when paid balance is unavailable or not applicable.",
        "policy_code": "loss-of-pay-policy",
        "annual_entitlement": Decimal("0.00"),
        "max_carry_forward": Decimal("0.00"),
        "accrual_frequency": AccrualFrequency.NONE,
        "allow_half_day": True,
        "notice_days_required": 0,
        "allow_negative_balance": True,
    },
)


OPTIONAL_LEAVE_TYPE_DEFINITIONS = (
    {
        "input_key": "enable_maternity_leave",
        "code": "maternity-leave",
        "name": "Maternity Leave",
        "short_code": "ML",
        "category": LeaveCategory.MATERNITY,
        "description": "Statutory maternity leave with evidence-ready employee request flow.",
        "policy_code": "maternity-leave-policy",
        "annual_entitlement": Decimal("182.00"),
        "max_carry_forward": Decimal("0.00"),
        "accrual_frequency": AccrualFrequency.YEARLY,
        "allow_half_day": False,
        "notice_days_required": 0,
        "requires_attachment": True,
    },
    {
        "input_key": "enable_paternity_leave",
        "code": "paternity-leave",
        "name": "Paternity Leave",
        "short_code": "PL",
        "category": LeaveCategory.PATERNITY,
        "description": "Configurable paternity leave for new-parent support.",
        "policy_code": "paternity-leave-policy",
        "annual_entitlement": Decimal("15.00"),
        "max_carry_forward": Decimal("0.00"),
        "accrual_frequency": AccrualFrequency.YEARLY,
        "allow_half_day": False,
        "notice_days_required": 0,
        "requires_attachment": True,
    },
    {
        "input_key": "enable_bereavement_leave",
        "code": "bereavement-leave",
        "name": "Bereavement Leave",
        "short_code": "BL",
        "category": LeaveCategory.SPECIAL,
        "description": "Compassionate leave for bereavement and family emergency scenarios.",
        "policy_code": "bereavement-leave-policy",
        "annual_entitlement": Decimal("5.00"),
        "max_carry_forward": Decimal("0.00"),
        "accrual_frequency": AccrualFrequency.YEARLY,
        "allow_half_day": False,
        "notice_days_required": 0,
    },
    {
        "input_key": "enable_marriage_leave",
        "code": "marriage-leave",
        "name": "Marriage Leave",
        "short_code": "MRG",
        "category": LeaveCategory.SPECIAL,
        "description": "Special paid leave for marriage events.",
        "policy_code": "marriage-leave-policy",
        "annual_entitlement": Decimal("5.00"),
        "max_carry_forward": Decimal("0.00"),
        "accrual_frequency": AccrualFrequency.YEARLY,
        "allow_half_day": False,
        "notice_days_required": 0,
        "requires_attachment": True,
    },
    {
        "input_key": "enable_comp_off_leave",
        "code": "comp-off-leave",
        "name": "Comp Off Leave",
        "short_code": "CO",
        "category": LeaveCategory.COMPENSATORY,
        "description": "Compensatory off leave; HR credits earned units before employees consume them.",
        "policy_code": "comp-off-leave-policy",
        "annual_entitlement": Decimal("0.00"),
        "max_carry_forward": Decimal("0.00"),
        "accrual_frequency": AccrualFrequency.NONE,
        "allow_half_day": False,
        "notice_days_required": 0,
    },
    {
        "input_key": "enable_jury_duty_leave",
        "code": "jury-duty-leave",
        "name": "Jury Duty Leave",
        "short_code": "JD",
        "category": LeaveCategory.SPECIAL,
        "description": "Optional jury-duty leave template for global or future country-specific use.",
        "policy_code": "jury-duty-leave-policy",
        "annual_entitlement": Decimal("10.00"),
        "max_carry_forward": Decimal("0.00"),
        "accrual_frequency": AccrualFrequency.YEARLY,
        "allow_half_day": False,
        "notice_days_required": 0,
        "requires_attachment": True,
    },
)


FIXED_IN_HOLIDAYS = (
    (1, 26, "Republic Day", HolidayType.COMPULSORY, False),
    (8, 15, "Independence Day", HolidayType.COMPULSORY, False),
    (10, 2, "Gandhi Jayanti", HolidayType.COMPULSORY, False),
)


REGIONAL_FIXED_HOLIDAYS = {
    "KA": ((11, 1, "Karnataka Rajyotsava", HolidayType.GENERAL, False),),
    "MH": ((5, 1, "Maharashtra Day", HolidayType.GENERAL, False),),
    "DL": ((5, 1, "Labour Day", HolidayType.GENERAL, True),),
    "TN": ((1, 14, "Pongal", HolidayType.GENERAL, False),),
}


DOCUMENT_CATEGORY_DEFINITIONS = (
    {
        "code": "identity-pan",
        "name": "PAN Card",
        "category_type": DocumentCategoryType.TAX,
        "description": "Permanent Account Number proof for payroll and tax declarations.",
        "requires_expiry_date": False,
        "required_within_days": 0,
        "priority": 10,
    },
    {
        "code": "identity-aadhaar",
        "name": "Aadhaar Card",
        "category_type": DocumentCategoryType.IDENTITY,
        "description": "Aadhaar identity proof for employee onboarding.",
        "requires_expiry_date": False,
        "required_within_days": 0,
        "priority": 20,
    },
    {
        "code": "address-proof",
        "name": "Address Proof",
        "category_type": DocumentCategoryType.ADDRESS,
        "description": "Current residential address proof.",
        "requires_expiry_date": False,
        "required_within_days": 7,
        "priority": 30,
    },
    {
        "code": "bank-proof",
        "name": "Bank Proof",
        "category_type": DocumentCategoryType.BANK,
        "description": "Cancelled cheque, passbook, or bank account proof for salary payout.",
        "requires_expiry_date": False,
        "required_within_days": 0,
        "priority": 40,
    },
    {
        "code": "education-certificate",
        "name": "Highest Education Certificate",
        "category_type": DocumentCategoryType.EDUCATION,
        "description": "Highest qualification certificate or marksheet.",
        "requires_expiry_date": False,
        "required_within_days": 15,
        "priority": 50,
    },
    {
        "code": "experience-letter",
        "name": "Previous Employment Proof",
        "category_type": DocumentCategoryType.EXPERIENCE,
        "description": "Experience or relieving letter from previous employer where applicable.",
        "requires_expiry_date": False,
        "required_within_days": 15,
        "priority": 60,
    },
    {
        "code": "signed-offer-letter",
        "name": "Signed Offer Letter",
        "category_type": DocumentCategoryType.CONTRACT,
        "description": "Signed offer or appointment letter.",
        "requires_expiry_date": False,
        "required_within_days": 0,
        "priority": 70,
    },
    {
        "code": "form-11",
        "name": "PF Form 11",
        "category_type": DocumentCategoryType.TAX,
        "description": "Employee provident fund declaration where payroll is in scope.",
        "requires_expiry_date": False,
        "required_within_days": 7,
        "priority": 80,
        "minimum_plan": "growth",
    },
)


WORKFLOW_TEMPLATE_DEFINITIONS = (
    {
        "code": "leave-approval-standard",
        "name": "Leave Approval Standard",
        "module": WorkflowModule.LEAVE,
        "trigger_key": "leave.request",
        "description": "Default manager and HR approval chain for employee leave requests.",
        "minimum_plan": "starter",
        "steps": (
            {
                "name": "Reporting manager approval",
                "actor_type": WorkflowActorType.MANAGER,
                "permission_key": "leave.requests.approve",
                "scope_type": ScopeType.DIRECT_REPORTS,
                "escalate_after_hours": 24,
                "rule_snapshot": {"source": "tenant_launch", "route": "manager"},
            },
            {
                "name": "HR final review",
                "actor_type": WorkflowActorType.ROLE,
                "role_code": "hr-admin",
                "permission_key": "leave.requests.approve",
                "scope_type": ScopeType.TENANT_ALL,
                "escalate_after_hours": 48,
                "rule_snapshot": {"source": "tenant_launch", "route": "hr_fallback"},
            },
        ),
    },
    {
        "code": "attendance-regularization-standard",
        "name": "Attendance Regularization Standard",
        "module": WorkflowModule.ATTENDANCE,
        "trigger_key": "attendance.regularization",
        "description": "Default manager review for missed punch and attendance correction requests.",
        "minimum_plan": "starter",
        "steps": (
            {
                "name": "Manager regularization review",
                "actor_type": WorkflowActorType.MANAGER,
                "permission_key": "attendance.regularization.review",
                "scope_type": ScopeType.DIRECT_REPORTS,
                "escalate_after_hours": 24,
                "rule_snapshot": {"source": "tenant_launch", "route": "manager"},
            },
            {
                "name": "HR attendance fallback",
                "actor_type": WorkflowActorType.ROLE,
                "role_code": "hr-admin",
                "permission_key": "attendance.regularization.review",
                "scope_type": ScopeType.TENANT_ALL,
                "escalate_after_hours": 48,
                "rule_snapshot": {"source": "tenant_launch", "route": "hr_fallback"},
            },
        ),
    },
    {
        "code": "document-verification-standard",
        "name": "Document Verification Standard",
        "module": WorkflowModule.DOCUMENTS,
        "trigger_key": "documents.employee.upload_submitted",
        "description": "Default HR verification flow for employee document uploads.",
        "minimum_plan": "starter",
        "steps": (
            {
                "name": "HR document verification",
                "actor_type": WorkflowActorType.ROLE,
                "role_code": "hr-admin",
                "permission_key": "documents.verify",
                "scope_type": ScopeType.TENANT_ALL,
                "escalate_after_hours": 48,
                "rule_snapshot": {"source": "tenant_launch", "route": "hr_document_queue"},
            },
        ),
    },
    {
        "code": "standard-office-joiner",
        "name": "Standard Office Joiner",
        "module": WorkflowModule.LIFECYCLE,
        "trigger_key": "standard-office-joiner",
        "description": "Default onboarding checklist template for Indian office employees.",
        "minimum_plan": "starter",
        "steps": (
            {
                "name": "Prepare employee profile",
                "actor_type": WorkflowActorType.HR_OWNER,
                "permission_key": "lifecycle.manage",
                "scope_type": ScopeType.TENANT_ALL,
                "escalate_after_hours": 24,
                "rule_snapshot": {
                    "source": "tenant_launch",
                    "due_anchor": "joining_date",
                    "due_offset_days": -5,
                    "due_offset_unit": "business_days",
                    "non_working_weekdays": ["saturday", "sunday"],
                },
            },
            {
                "name": "Collect joining documents",
                "actor_type": WorkflowActorType.HR_OWNER,
                "permission_key": "documents.verify",
                "scope_type": ScopeType.TENANT_ALL,
                "escalate_after_hours": 48,
                "rule_snapshot": {
                    "source": "tenant_launch",
                    "due_anchor": "joining_date",
                    "due_offset_days": -3,
                    "due_offset_unit": "business_days",
                    "non_working_weekdays": ["saturday", "sunday"],
                },
            },
            {
                "name": "Confirm first day readiness",
                "actor_type": WorkflowActorType.MANAGER,
                "permission_key": "lifecycle.manage",
                "scope_type": ScopeType.DIRECT_REPORTS,
                "escalate_after_hours": 24,
                "rule_snapshot": {
                    "source": "tenant_launch",
                    "due_anchor": "joining_date",
                    "due_offset_days": 0,
                    "due_offset_unit": "calendar_days",
                },
            },
        ),
    },
    {
        "code": "exit-clearance-standard",
        "name": "Exit Clearance Standard",
        "module": WorkflowModule.LIFECYCLE,
        "trigger_key": "exit-clearance-standard",
        "description": "Default exit clearance template for HR and manager handover.",
        "minimum_plan": "starter",
        "steps": (
            {
                "name": "Manager handover confirmation",
                "actor_type": WorkflowActorType.MANAGER,
                "permission_key": "lifecycle.manage",
                "scope_type": ScopeType.DIRECT_REPORTS,
                "escalate_after_hours": 48,
                "rule_snapshot": {
                    "source": "tenant_launch",
                    "due_anchor": "last_working_date",
                    "due_offset_days": -5,
                    "due_offset_unit": "business_days",
                    "non_working_weekdays": ["saturday", "sunday"],
                },
            },
            {
                "name": "HR exit closure",
                "actor_type": WorkflowActorType.HR_OWNER,
                "permission_key": "lifecycle.manage",
                "scope_type": ScopeType.TENANT_ALL,
                "escalate_after_hours": 24,
                "rule_snapshot": {
                    "source": "tenant_launch",
                    "due_anchor": "last_working_date",
                    "due_offset_days": 0,
                    "due_offset_unit": "calendar_days",
                },
            },
        ),
    },
    {
        "code": "payroll-review-standard",
        "name": "Payroll Review Standard",
        "module": WorkflowModule.PAYROLL,
        "trigger_key": "payroll.review",
        "description": "Default payroll review and approval chain for Growth and Enterprise tenants.",
        "minimum_plan": "growth",
        "steps": (
            {
                "name": "Payroll finance review",
                "actor_type": WorkflowActorType.ROLE,
                "role_code": "payroll-finance-manager",
                "permission_key": "payroll.review",
                "scope_type": ScopeType.TENANT_ALL,
                "escalate_after_hours": 24,
                "rule_snapshot": {"source": "tenant_launch", "route": "finance_review"},
            },
            {
                "name": "Payroll approval",
                "actor_type": WorkflowActorType.ROLE,
                "role_code": "payroll-finance-manager",
                "permission_key": "payroll.approve",
                "scope_type": ScopeType.TENANT_ALL,
                "escalate_after_hours": 24,
                "rule_snapshot": {"source": "tenant_launch", "route": "finance_approval"},
            },
        ),
    },
)


PAYROLL_COMPONENT_DEFINITIONS = (
    {
        "code": "annual-ctc",
        "name": "Annual CTC",
        "component_type": SalaryComponentType.INFORMATIONAL,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.annual_ctc.v1",
        "is_taxable": False,
        "is_proratable": False,
        "payslip_visibility": "hidden",
        "accounting_mapping_ref": "payroll.accounting.in.ctc.v1",
    },
    {
        "code": "basic",
        "name": "Basic",
        "component_type": SalaryComponentType.EARNING,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.basic_from_ctc.v1",
        "is_taxable": True,
        "statutory_treatment_ref": "payroll.statutory.india.basic.v1",
        "accounting_mapping_ref": "payroll.accounting.in.earnings.basic.v1",
    },
    {
        "code": "hra",
        "name": "House Rent Allowance",
        "component_type": SalaryComponentType.EARNING,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.hra_from_basic.v1",
        "is_taxable": True,
        "statutory_treatment_ref": "payroll.statutory.india.hra.v1",
        "accounting_mapping_ref": "payroll.accounting.in.earnings.hra.v1",
    },
    {
        "code": "special-allowance",
        "name": "Special Allowance",
        "component_type": SalaryComponentType.EARNING,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.special_allowance_balance.v1",
        "is_taxable": True,
        "statutory_treatment_ref": "payroll.statutory.india.allowance.taxable.v1",
        "accounting_mapping_ref": "payroll.accounting.in.earnings.allowance.v1",
    },
    {
        "code": "employee-pf",
        "name": "Employee Provident Fund",
        "component_type": SalaryComponentType.DEDUCTION,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.employee_pf.v1",
        "is_taxable": False,
        "statutory_treatment_ref": "payroll.statutory.india.pf.employee.v1",
        "accounting_mapping_ref": "payroll.accounting.in.liability.pf_employee.v1",
    },
    {
        "code": "employer-pf",
        "name": "Employer Provident Fund",
        "component_type": SalaryComponentType.EMPLOYER_CONTRIBUTION,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.employer_pf.v1",
        "is_taxable": False,
        "statutory_treatment_ref": "payroll.statutory.india.pf.employer.v1",
        "accounting_mapping_ref": "payroll.accounting.in.liability.pf_employer.v1",
    },
    {
        "code": "employee-esi",
        "name": "Employee State Insurance",
        "component_type": SalaryComponentType.DEDUCTION,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.employee_esi.v1",
        "is_taxable": False,
        "statutory_treatment_ref": "payroll.statutory.india.esi.employee.v1",
        "accounting_mapping_ref": "payroll.accounting.in.liability.esi_employee.v1",
    },
    {
        "code": "employer-esi",
        "name": "Employer State Insurance",
        "component_type": SalaryComponentType.EMPLOYER_CONTRIBUTION,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.employer_esi.v1",
        "is_taxable": False,
        "statutory_treatment_ref": "payroll.statutory.india.esi.employer.v1",
        "accounting_mapping_ref": "payroll.accounting.in.liability.esi_employer.v1",
    },
    {
        "code": "professional-tax",
        "name": "Professional Tax",
        "component_type": SalaryComponentType.TAX,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.professional_tax.v1",
        "is_taxable": False,
        "statutory_treatment_ref": "payroll.statutory.india.professional_tax.v1",
        "accounting_mapping_ref": "payroll.accounting.in.liability.professional_tax.v1",
    },
    {
        "code": "tds",
        "name": "Tax Deducted at Source",
        "component_type": SalaryComponentType.TAX,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.tds.v1",
        "is_taxable": False,
        "statutory_treatment_ref": "payroll.statutory.india.tds.v1",
        "accounting_mapping_ref": "payroll.accounting.in.liability.tds.v1",
    },
    {
        "code": "net-pay",
        "name": "Net Pay",
        "component_type": SalaryComponentType.INFORMATIONAL,
        "value_type": SalaryComponentValueType.FORMULA,
        "formula_ref": "payroll.formula.india.net_pay.v1",
        "is_taxable": False,
        "is_proratable": False,
        "payslip_visibility": "summary",
        "accounting_mapping_ref": "payroll.accounting.in.net_pay.v1",
    },
)


PAYROLL_STRUCTURE_COMPONENT_CODES = (
    "annual-ctc",
    "basic",
    "hra",
    "special-allowance",
    "employee-pf",
    "employer-pf",
    "employee-esi",
    "employer-esi",
    "professional-tax",
    "tds",
    "net-pay",
)


PAYROLL_STATUTORY_COMPONENT_DEFINITIONS = (
    {
        "code": "employee-pf",
        "name": "Employee Provident Fund",
        "salary_component_code": "employee-pf",
        "statutory_type": PayrollStatutoryComponentKind.PROVIDENT_FUND,
        "contribution_owner": PayrollStatutoryContributionOwner.EMPLOYEE,
        "calculation_method": PayrollStatutoryCalculationMethod.FORMULA,
        "formula_ref": "payroll.formula.india.employee_pf.v1",
        "statutory_treatment_ref": "payroll.statutory.india.pf.employee.v1",
    },
    {
        "code": "employer-pf",
        "name": "Employer Provident Fund",
        "salary_component_code": "employer-pf",
        "statutory_type": PayrollStatutoryComponentKind.PROVIDENT_FUND,
        "contribution_owner": PayrollStatutoryContributionOwner.EMPLOYER,
        "calculation_method": PayrollStatutoryCalculationMethod.FORMULA,
        "formula_ref": "payroll.formula.india.employer_pf.v1",
        "statutory_treatment_ref": "payroll.statutory.india.pf.employer.v1",
    },
    {
        "code": "employee-esi",
        "name": "Employee State Insurance",
        "salary_component_code": "employee-esi",
        "statutory_type": PayrollStatutoryComponentKind.EMPLOYEE_STATE_INSURANCE,
        "contribution_owner": PayrollStatutoryContributionOwner.EMPLOYEE,
        "calculation_method": PayrollStatutoryCalculationMethod.FORMULA,
        "formula_ref": "payroll.formula.india.employee_esi.v1",
        "statutory_treatment_ref": "payroll.statutory.india.esi.employee.v1",
    },
    {
        "code": "employer-esi",
        "name": "Employer State Insurance",
        "salary_component_code": "employer-esi",
        "statutory_type": PayrollStatutoryComponentKind.EMPLOYEE_STATE_INSURANCE,
        "contribution_owner": PayrollStatutoryContributionOwner.EMPLOYER,
        "calculation_method": PayrollStatutoryCalculationMethod.FORMULA,
        "formula_ref": "payroll.formula.india.employer_esi.v1",
        "statutory_treatment_ref": "payroll.statutory.india.esi.employer.v1",
    },
    {
        "code": "professional-tax",
        "name": "Professional Tax",
        "salary_component_code": "professional-tax",
        "statutory_type": PayrollStatutoryComponentKind.PROFESSIONAL_TAX,
        "contribution_owner": PayrollStatutoryContributionOwner.EMPLOYEE,
        "calculation_method": PayrollStatutoryCalculationMethod.FORMULA,
        "formula_ref": "payroll.formula.india.professional_tax.v1",
        "statutory_treatment_ref": "payroll.statutory.india.professional_tax.v1",
    },
    {
        "code": "tds",
        "name": "Tax Deducted at Source",
        "salary_component_code": "tds",
        "statutory_type": PayrollStatutoryComponentKind.TAX_DEDUCTED_AT_SOURCE,
        "contribution_owner": PayrollStatutoryContributionOwner.EMPLOYEE,
        "calculation_method": PayrollStatutoryCalculationMethod.FORMULA,
        "formula_ref": "payroll.formula.india.tds.v1",
        "statutory_treatment_ref": "payroll.statutory.india.tds.v1",
    },
)


PROVIDER_PLACEHOLDER_DEFINITIONS = (
    {
        "code": "bank-payout",
        "provider_ref": "payroll.provider.bank.placeholder.v1",
        "provider_name": "Bank payout provider",
        "provider_kind": PayrollProviderConnectionKind.BANK,
        "artifact_kind": PayrollOutputArtifactKind.BANK_ADVICE,
        "credential_required": True,
        "credential_profile_ref": "payroll.provider.credentials.bank.production.v1",
        "adapter_profile_ref": "payroll.provider_adapter.bank.production.v1",
        "channel_profile_ref": "payroll.provider_channel.bank.secure_file.v1",
        "callback_profile_ref": "payroll.provider_callback.bank.status.v1",
        "callback_verification_ref": "payroll.provider_callback.bank.signature.v1",
        "retry_policy_ref": "payroll.provider_retry.bank.standard.v1",
        "certification_profile_ref": "payroll.provider_certification.bank_payout.v1",
    },
    {
        "code": "accounting-export",
        "provider_ref": "payroll.provider.accounting.placeholder.v1",
        "provider_name": "Accounting export provider",
        "provider_kind": PayrollProviderConnectionKind.ACCOUNTING,
        "artifact_kind": PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
        "credential_required": True,
        "credential_profile_ref": "payroll.provider.credentials.accounting.production.v1",
        "adapter_profile_ref": "payroll.provider_adapter.accounting.production.v1",
        "channel_profile_ref": "payroll.provider_channel.accounting.api_or_file.v1",
        "callback_profile_ref": "payroll.provider_callback.accounting.status.v1",
        "callback_verification_ref": "payroll.provider_callback.accounting.audit.v1",
        "retry_policy_ref": "payroll.provider_retry.accounting.standard.v1",
        "certification_profile_ref": "payroll.provider_certification.accounting_export.v1",
    },
    {
        "code": "statutory-filing",
        "provider_ref": "payroll.provider.statutory.placeholder.v1",
        "provider_name": "Statutory filing provider",
        "provider_kind": PayrollProviderConnectionKind.STATUTORY,
        "artifact_kind": PayrollOutputArtifactKind.STATUTORY_REPORT,
        "credential_required": True,
        "credential_profile_ref": "payroll.provider.credentials.statutory.production.v1",
        "adapter_profile_ref": "payroll.provider_adapter.statutory.production.v1",
        "channel_profile_ref": "payroll.provider_channel.statutory.api_or_portal.v1",
        "callback_profile_ref": "payroll.provider_callback.statutory.receipt.v1",
        "callback_verification_ref": "payroll.provider_callback.statutory.signature.v1",
        "retry_policy_ref": "payroll.provider_retry.statutory.standard.v1",
        "certification_profile_ref": "payroll.provider_certification.statutory_filing.v1",
    },
)


@dataclass(frozen=True)
class SeederResult:
    module_ref: str
    status: str
    message: str
    created: list[str] = field(default_factory=list)
    existing: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "module_ref": self.module_ref,
            "status": self.status,
            "message": self.message,
            "created": list(self.created),
            "existing": list(self.existing),
            "skipped": list(self.skipped),
        }


def _plan_rank(plan: str) -> int:
    return {"starter": 1, "growth": 2, "enterprise": 3}.get(plan, 0)


def _plan_allows(tenant_plan: str, minimum_plan: str) -> bool:
    return _plan_rank(tenant_plan) >= _plan_rank(minimum_plan)


def _input_value(input_payload: dict | None, key: str, fallback: str = "") -> str:
    if not input_payload:
        return fallback
    value = input_payload.get(key)
    if value is None:
        return fallback
    cleaned = str(value).strip()
    return cleaned or fallback


def _input_enabled(input_payload: dict | None, key: str) -> bool:
    if not input_payload:
        return False
    value = input_payload.get(key)
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _stable_code(value: str, fallback: str) -> str:
    code = slugify(value)[:60]
    return code or fallback


def _weekly_off_days(work_week: str) -> list[str]:
    if work_week == "mon_fri":
        return ["saturday", "sunday"]
    if work_week == "mon_sat":
        return ["sunday"]
    return ["sunday"]


def _holiday_region(input_payload: dict | None) -> str:
    region = _input_value(input_payload, "holiday_region", "IN").upper()
    return region[:10] or "IN"


def _financial_year_start(input_payload: dict | None) -> date:
    financial_year = _input_value(input_payload, "financial_year")
    digits = "".join(character for character in financial_year[:4] if character.isdigit())
    if len(digits) == 4:
        return date(int(digits), 4, 1)
    today = timezone.now().date()
    year = today.year if today.month >= 4 else today.year - 1
    return date(year, 4, 1)


def _provider_placeholder_readiness(definition: dict, provider_strategy: str) -> dict:
    gates = [
        {
            "ref": "provider_selected",
            "label": "Provider lane selected",
            "passed": True,
            "value": definition["provider_kind"],
        },
        {
            "ref": "credential_reference_configured",
            "label": "Credential reference configured",
            "passed": False,
            "value": "",
        },
        {
            "ref": "production_adapter_configured",
            "label": "Production adapter configured",
            "passed": False,
            "value": definition["adapter_profile_ref"],
        },
        {
            "ref": "channel_contract_configured",
            "label": "Channel contract configured",
            "passed": False,
            "value": definition["channel_profile_ref"],
        },
        {
            "ref": "callback_verification_configured",
            "label": "Callback verification configured",
            "passed": False,
            "value": definition["callback_verification_ref"],
        },
        {
            "ref": "certification_passed",
            "label": "Certification passed",
            "passed": False,
            "value": PayrollProviderCertificationStatus.NOT_STARTED,
        },
    ]
    return {
        "source": "tenant_launch",
        "provider_ref": definition["provider_ref"],
        "provider_kind": definition["provider_kind"],
        "provider_strategy": provider_strategy,
        "readiness_profile_ref": f"payroll.provider_placeholder.{definition['provider_kind']}.readiness.v1",
        "gates": gates,
        "ready_gate_count": sum(1 for gate in gates if gate["passed"]),
        "total_gate_count": len(gates),
        "blocking_gate_refs": [gate["ref"] for gate in gates if not gate["passed"]],
        "active_allowed": False,
        "credential_required": definition["credential_required"],
        "uses_credential_ref": False,
        "updated_at": timezone.now().isoformat(),
    }


def _default_permission_keys_for_role(role_code: str, tenant_plan: str) -> list[str]:
    permission_keys = []
    for permission in get_permission_catalog():
        if role_code not in permission.get("default_role_codes", []):
            continue
        required_plan = permission.get("required_plan") or "starter"
        if _plan_allows(tenant_plan, required_plan):
            permission_keys.append(permission["key"])
    if role_code == "auditor" and _plan_allows(tenant_plan, "growth"):
        permission_keys.extend(AUDITOR_PERMISSION_KEYS)
    return sorted(set(permission_keys))


@transaction.atomic
def seed_launch_checklist(onboarding: TenantOnboarding, input_payload: dict | None = None) -> SeederResult:
    created = []
    existing = []
    skipped = []
    for code, label, sort_order, minimum_plan in LAUNCH_CHECKLIST_ITEMS:
        if not _plan_allows(onboarding.tenant.subscription_plan, minimum_plan):
            skipped.append(code)
            continue
        item, was_created = TenantOnboardingChecklistItem.objects.get_or_create(
            onboarding=onboarding,
            code=code,
            defaults={
                "label": label,
                "status": ChecklistStatus.PENDING,
                "sort_order": sort_order,
                "notes": "Created by launch blueprint safe apply.",
            },
        )
        if was_created:
            created.append(code)
        else:
            existing.append(item.code)
    return SeederResult(
        module_ref="launch_checklist",
        status="succeeded",
        message="Launch checklist is ready.",
        created=created,
        existing=existing,
        skipped=skipped,
    )


@transaction.atomic
def seed_roles_users(onboarding: TenantOnboarding, input_payload: dict | None = None) -> SeederResult:
    tenant = onboarding.tenant
    created = []
    existing = []
    skipped = []
    for definition in ROLE_DEFINITIONS:
        role_code = definition["code"]
        if not _plan_allows(tenant.subscription_plan, definition["minimum_plan"]):
            skipped.append(role_code)
            continue
        role, was_created = Role.objects.get_or_create(
            tenant=tenant,
            code=role_code,
            defaults={
                "name": definition["name"],
                "description": definition["description"],
                "is_system_role": True,
                "is_active": True,
            },
        )
        if was_created:
            created.append(role_code)
        else:
            existing.append(role_code)
        if role.permissions.exists():
            continue
        for permission_key in _default_permission_keys_for_role(role_code, tenant.subscription_plan):
            RolePermission.objects.get_or_create(
                role=role,
                permission_key=permission_key,
                defaults={"description": "Launch blueprint default permission."},
            )
    return SeederResult(
        module_ref="roles_users",
        status="succeeded",
        message="Default tenant roles are ready.",
        created=created,
        existing=existing,
        skipped=skipped,
    )


@transaction.atomic
def seed_notifications(onboarding: TenantOnboarding, input_payload: dict | None = None) -> SeederResult:
    tenant = onboarding.tenant
    created = []
    existing = []
    skipped = []
    for channel in [NotificationChannel.IN_APP, NotificationChannel.EMAIL]:
        get_or_create_channel_configuration(tenant=tenant, channel=channel)

    for definition in NOTIFICATION_TEMPLATES:
        if not _plan_allows(tenant.subscription_plan, definition["minimum_plan"]):
            skipped.append(definition["code"])
            continue
        template, template_created = NotificationTemplate.objects.get_or_create(
            tenant=tenant,
            code=definition["code"],
            channel=definition["channel"],
            defaults={
                "name": definition["name"],
                "status": NotificationTemplateStatus.ACTIVE,
                "subject_template": definition["subject"],
                "title_template": definition["title"],
                "body_template": definition["body"],
                "metadata_template": {"source": "launch_blueprint"},
                "is_system_seeded": True,
            },
        )
        event_code = f"{definition['code']}-{definition['channel']}"
        _, event_created = NotificationEventDefinition.objects.get_or_create(
            tenant=tenant,
            code=event_code,
            defaults={
                "name": definition["name"],
                "module": definition["module"],
                "trigger_key": definition["trigger_key"],
                "audience_type": definition["audience_type"],
                "channel": definition["channel"],
                "template": template,
                "is_active": True,
                "priority": definition["priority"],
                "recipient_snapshot": {"source": "launch_blueprint"},
            },
        )
        if template_created or event_created:
            created.append(definition["code"])
        else:
            existing.append(definition["code"])
    return SeederResult(
        module_ref="notifications",
        status="succeeded",
        message="Notification templates are ready.",
        created=created,
        existing=existing,
        skipped=skipped,
    )


def _default_grade_for_launch_employee(employee: Employee, grades_by_code: dict[str, Grade]) -> Grade | None:
    if employee.employee_code.startswith("ADMIN-"):
        return grades_by_code.get("g3") or grades_by_code.get("g1")
    membership = getattr(employee, "membership", None)
    if membership:
        role_codes = set(
            membership.membership_roles.filter(role__is_active=True).values_list("role__code", flat=True)
        )
        if role_codes & {"tenant-admin", "hr-admin", "manager", "payroll-finance-manager"}:
            return grades_by_code.get("g3") or grades_by_code.get("g1")
    return grades_by_code.get("g1")


def _ensure_default_employee_org_context(
    *,
    tenant,
    legal_entity: LegalEntity,
    branch: Branch,
    location: Location,
    business_unit: BusinessUnit,
    department: Department,
    grades_by_code: dict[str, Grade],
    employment_type: EmploymentType | None,
) -> list[str]:
    updated_refs: list[str] = []
    employees = (
        Employee.objects.filter(tenant=tenant, employment_status=EmploymentStatus.ACTIVE)
        .select_related("membership")
        .prefetch_related("membership__membership_roles__role")
    )
    for employee in employees:
        update_fields: list[str] = []
        if not employee.legal_entity_id:
            employee.legal_entity = legal_entity
            update_fields.append("legal_entity")
        if not employee.branch_id:
            employee.branch = branch
            update_fields.append("branch")
        if not employee.location_id:
            employee.location = location
            update_fields.append("location")
        if not employee.business_unit_id:
            employee.business_unit = business_unit
            update_fields.append("business_unit")
        if not employee.department_id:
            employee.department = department
            update_fields.append("department")
        if not employee.grade_id:
            employee.grade = _default_grade_for_launch_employee(employee, grades_by_code)
            update_fields.append("grade")
        if not employee.employment_type_id and employment_type:
            employee.employment_type = employment_type
            update_fields.append("employment_type")
        if update_fields:
            employee.save(update_fields=[*update_fields, "updated_at"])
            updated_refs.append(f"employee_org_context:{employee.employee_code}")
    return updated_refs


@transaction.atomic
def seed_org_masters(onboarding: TenantOnboarding, input_payload: dict | None = None) -> SeederResult:
    tenant = onboarding.tenant
    created = []
    existing = []

    legal_entity_name = _input_value(input_payload, "legal_entity", tenant.legal_name or tenant.name)
    branch_name = _input_value(input_payload, "default_branch", "Head Office")
    department_name = _input_value(input_payload, "default_department", "Operations")
    registered_address = _input_value(input_payload, "registered_address")

    legal_entity, was_created = LegalEntity.objects.get_or_create(
        tenant=tenant,
        code="default-legal-entity",
        defaults={
            "name": legal_entity_name,
            "registered_name": legal_entity_name,
            "country_code": tenant.country_code or "IN",
            "timezone": tenant.timezone or "Asia/Kolkata",
            "primary_email": tenant.primary_email,
        },
    )
    (created if was_created else existing).append("legal_entity:default-legal-entity")

    location, was_created = Location.objects.get_or_create(
        tenant=tenant,
        code="head-office",
        defaults={
            "name": branch_name,
            "address_line_1": registered_address[:255],
            "city": branch_name[:120],
            "country_code": tenant.country_code or "IN",
        },
    )
    (created if was_created else existing).append("location:head-office")

    branch, was_created = Branch.objects.get_or_create(
        tenant=tenant,
        code="default-branch",
        defaults={
            "name": branch_name,
            "legal_entity": legal_entity,
            "location": location,
            "branch_type": "head_office",
        },
    )
    (created if was_created else existing).append("branch:default-branch")

    business_unit, was_created = BusinessUnit.objects.get_or_create(
        tenant=tenant,
        code="corporate",
        defaults={"name": "Corporate"},
    )
    (created if was_created else existing).append("business_unit:corporate")

    department, was_created = Department.objects.get_or_create(
        tenant=tenant,
        code=_stable_code(department_name, "operations"),
        defaults={
            "name": department_name,
            "business_unit": business_unit,
        },
    )
    (created if was_created else existing).append(f"department:{department.code}")

    _, was_created = CostCenter.objects.get_or_create(
        tenant=tenant,
        code="default-cost-center",
        defaults={
            "name": f"{department.name} Cost Center",
            "legal_entity": legal_entity,
        },
    )
    (created if was_created else existing).append("cost_center:default-cost-center")

    grades_by_code = {}
    for code, name, level in GRADE_DEFINITIONS:
        grade, was_created = Grade.objects.get_or_create(
            tenant=tenant,
            code=code,
            defaults={"name": name, "level": level},
        )
        grades_by_code[code] = grade
        (created if was_created else existing).append(f"grade:{code}")

    for code, name, grade_code in DESIGNATION_DEFINITIONS:
        _, was_created = Designation.objects.get_or_create(
            tenant=tenant,
            code=code,
            defaults={"name": name, "grade": grades_by_code.get(grade_code)},
        )
        (created if was_created else existing).append(f"designation:{code}")

    employment_types_by_code = {}
    for code, name, description, payroll_eligible in EMPLOYMENT_TYPE_DEFINITIONS:
        employment_type, was_created = EmploymentType.objects.get_or_create(
            tenant=tenant,
            code=code,
            defaults={
                "name": name,
                "description": description,
                "is_payroll_eligible": payroll_eligible,
            },
        )
        employment_types_by_code[code] = employment_type
        (created if was_created else existing).append(f"employment_type:{code}")

    existing.extend(
        _ensure_default_employee_org_context(
            tenant=tenant,
            legal_entity=legal_entity,
            branch=branch,
            location=location,
            business_unit=business_unit,
            department=department,
            grades_by_code=grades_by_code,
            employment_type=employment_types_by_code.get("full-time"),
        )
    )

    return SeederResult(
        module_ref="org_masters",
        status="succeeded",
        message="Organization masters are ready for employee onboarding.",
        created=created,
        existing=existing,
    )


@transaction.atomic
def seed_leave_attendance(onboarding: TenantOnboarding, input_payload: dict | None = None) -> SeederResult:
    tenant = onboarding.tenant
    created = []
    existing = []
    skipped = []

    seed_org_masters(onboarding, input_payload)

    legal_entity = LegalEntity.objects.get(tenant=tenant, code="default-legal-entity")
    branch = Branch.objects.get(tenant=tenant, code="default-branch")
    location = Location.objects.get(tenant=tenant, code="head-office")
    department_name = _input_value(input_payload, "default_department", "Operations")
    department = Department.objects.get(tenant=tenant, code=_stable_code(department_name, "operations"))
    work_week = _input_value(input_payload, "work_week", "mon_fri")
    region = _holiday_region(input_payload)
    current_year = timezone.now().date().year

    selected_optional_keys = {
        definition["input_key"]
        for definition in OPTIONAL_LEAVE_TYPE_DEFINITIONS
        if _input_enabled(input_payload, definition["input_key"])
    }
    selected_optional_definitions = [
        definition
        for definition in OPTIONAL_LEAVE_TYPE_DEFINITIONS
        if definition["input_key"] in selected_optional_keys
    ]
    skipped.extend(
        f"optional_leave_addon:{definition['input_key']}"
        for definition in OPTIONAL_LEAVE_TYPE_DEFINITIONS
        if definition["input_key"] not in selected_optional_keys
    )

    leave_policies = []
    for definition in (*LEAVE_TYPE_DEFINITIONS, *selected_optional_definitions):
        leave_type, was_created = LeaveType.objects.get_or_create(
            tenant=tenant,
            code=definition["code"],
            defaults={
                "name": definition["name"],
                "short_code": definition["short_code"],
                "category": definition["category"],
                "unit": LeaveUnit.DAY,
                "description": definition["description"],
                "is_system_seeded": True,
                "is_approval_required": True,
                "requires_attachment": definition.get("requires_attachment", False),
                "allow_negative_balance": definition.get("allow_negative_balance", False),
                "source_kind": PolicySourceKind.TENANT_NATIVE,
                "delegation_mode": DelegationMode.TENANT_EDITABLE,
            },
        )
        (created if was_created else existing).append(f"leave_type:{definition['code']}")

        policy, was_created = LeavePolicy.objects.get_or_create(
            tenant=tenant,
            code=definition["policy_code"],
            defaults={
                "leave_type": leave_type,
                "name": f"{definition['name']} Policy",
                "status": LeavePolicyStatus.ACTIVE,
                "effective_from": date(current_year, 1, 1),
                "accrual_frequency": definition["accrual_frequency"],
                "annual_entitlement": definition["annual_entitlement"],
                "max_carry_forward": definition["max_carry_forward"],
                "min_days_per_request": Decimal("0.50"),
                "notice_days_required": definition["notice_days_required"],
                "allow_half_day": definition["allow_half_day"],
                "allow_backdated_application": True,
                "is_probation_eligible": True,
                "config_snapshot": {
                    "source": "tenant_launch",
                    "country_code": "IN",
                    "review_required": True,
                },
                "source_kind": PolicySourceKind.TENANT_NATIVE,
                "delegation_mode": DelegationMode.TENANT_EDITABLE,
            },
        )
        leave_policies.append(policy)
        (created if was_created else existing).append(f"leave_policy:{definition['policy_code']}")

        _, was_created = LeavePolicyAssignment.objects.get_or_create(
            tenant=tenant,
            leave_policy=policy,
            legal_entity=legal_entity,
            branch=branch,
            department=department,
            grade=None,
            employment_type=None,
            employee=None,
            defaults={"priority": 100, "is_active": True},
        )
        (created if was_created else existing).append(f"leave_assignment:{definition['policy_code']}")

    shift, was_created = Shift.objects.get_or_create(
        tenant=tenant,
        code="general-shift",
        defaults={
            "name": "General Shift",
            "start_time": time(9, 30),
            "end_time": time(18, 30),
            "working_hours": Decimal("8.00"),
            "break_minutes": 60,
            "grace_in_minutes": 10,
            "grace_out_minutes": 10,
            "weekly_off_days": _weekly_off_days(work_week),
            "source_kind": PolicySourceKind.TENANT_NATIVE,
            "delegation_mode": DelegationMode.TENANT_EDITABLE,
        },
    )
    (created if was_created else existing).append("shift:general-shift")

    for year in (current_year, current_year + 1):
        calendar, was_created = HolidayCalendar.objects.get_or_create(
            tenant=tenant,
            code=f"in-{region.lower()}-holidays",
            year=year,
            defaults={
                "name": f"India {region} Holidays",
                "legal_entity": legal_entity,
                "branch": branch,
                "location": location,
                "source_kind": PolicySourceKind.TENANT_NATIVE,
                "delegation_mode": DelegationMode.TENANT_EDITABLE,
            },
        )
        (created if was_created else existing).append(f"holiday_calendar:{year}")
        holiday_definitions = FIXED_IN_HOLIDAYS + REGIONAL_FIXED_HOLIDAYS.get(region, ())
        for month, day, name, holiday_type, is_optional in holiday_definitions:
            _, holiday_created = Holiday.objects.get_or_create(
                calendar=calendar,
                date=date(year, month, day),
                name=name,
                defaults={
                    "holiday_type": holiday_type,
                    "is_optional": is_optional,
                    "description": "Seeded by tenant launch; customer should review region-specific holidays.",
                },
            )
            (created if holiday_created else existing).append(f"holiday:{year}:{slugify(name)}")

    holiday_calendar = HolidayCalendar.objects.get(
        tenant=tenant,
        code=f"in-{region.lower()}-holidays",
        year=current_year,
    )
    attendance_policy, was_created = AttendancePolicy.objects.get_or_create(
        tenant=tenant,
        code="standard-attendance-policy",
        defaults={
            "name": "Standard Attendance Policy",
            "status": AttendancePolicyStatus.ACTIVE,
            "attendance_unit": AttendanceUnit.DAY,
            "default_shift": shift,
            "holiday_calendar": holiday_calendar,
            "full_day_min_hours": Decimal("8.00"),
            "half_day_min_hours": Decimal("4.00"),
            "late_mark_after_minutes": 15,
            "max_late_marks_in_period": 3,
            "overtime_threshold_minutes": 0,
            "allow_manual_entry": True,
            "allow_web_checkin": True,
            "allow_mobile_checkin": True,
            "allow_geofenced_checkin": False,
            "allow_regularization": True,
            "require_regularization_reason": True,
            "config_snapshot": {
                "source": "tenant_launch",
                "work_week": work_week,
                "holiday_region": region,
                "employee_assignments_seeded": False,
            },
            "source_kind": PolicySourceKind.TENANT_NATIVE,
            "delegation_mode": DelegationMode.TENANT_EDITABLE,
        },
    )
    (created if was_created else existing).append("attendance_policy:standard-attendance-policy")

    _, was_created = AttendancePolicyAssignment.objects.get_or_create(
        tenant=tenant,
        attendance_policy=attendance_policy,
        legal_entity=legal_entity,
        branch=branch,
        location=location,
        department=department,
        grade=None,
        employment_type=None,
        employee=None,
        defaults={"priority": 100, "is_active": True},
    )
    (created if was_created else existing).append("attendance_assignment:standard-attendance-policy")

    if work_week == "custom":
        skipped.append("custom_work_week_requires_customer_review")

    balance_refs = []
    employees = Employee.objects.filter(tenant=tenant, employment_status=EmploymentStatus.ACTIVE).select_related(
        "tenant",
        "legal_entity",
        "branch",
        "department",
        "grade",
        "employment_type",
    )
    for employee in employees:
        for balance in ensure_employee_leave_balances(employee):
            balance_refs.append(f"leave_balance:{employee.employee_code}:{balance.leave_policy.code}:{balance.period_year}")
    existing.extend(balance_refs)

    attendance_refs = []
    for employee in employees:
        for record in ensure_employee_attendance_records(employee):
            attendance_refs.append(f"attendance_record:{employee.employee_code}:{record.attendance_date.isoformat()}")
    existing.extend(attendance_refs)

    return SeederResult(
        module_ref="leave_attendance",
        status="succeeded",
        message="Leave and attendance defaults are ready for employee onboarding, including current employee leave balances and attendance placeholders.",
        created=created,
        existing=existing,
        skipped=skipped,
    )


@transaction.atomic
def seed_documents(onboarding: TenantOnboarding, input_payload: dict | None = None) -> SeederResult:
    tenant = onboarding.tenant
    created = []
    existing = []
    skipped = []

    seed_org_masters(onboarding, input_payload)

    legal_entity = LegalEntity.objects.get(tenant=tenant, code="default-legal-entity")
    branch = Branch.objects.get(tenant=tenant, code="default-branch")
    department_name = _input_value(input_payload, "default_department", "Operations")
    department = Department.objects.get(tenant=tenant, code=_stable_code(department_name, "operations"))

    for definition in DOCUMENT_CATEGORY_DEFINITIONS:
        minimum_plan = definition.get("minimum_plan", "starter")
        if not _plan_allows(tenant.subscription_plan, minimum_plan):
            skipped.append(definition["code"])
            continue

        category, was_created = DocumentCategory.objects.get_or_create(
            tenant=tenant,
            code=definition["code"],
            defaults={
                "name": definition["name"],
                "category_type": definition["category_type"],
                "description": definition["description"],
                "is_active": True,
                "is_system_seeded": True,
                "requires_expiry_date": definition["requires_expiry_date"],
                "requires_verification": True,
                "allow_employee_upload": True,
                "allow_multiple_files": False,
                "visibility_rules": {
                    "source": "tenant_launch",
                    "country_code": "IN",
                    "employee_upload": True,
                    "hr_verification_required": True,
                },
            },
        )
        (created if was_created else existing).append(f"document_category:{definition['code']}")

        _, was_created = DocumentRequirementRule.objects.get_or_create(
            tenant=tenant,
            category=category,
            legal_entity=legal_entity,
            branch=branch,
            department=department,
            grade=None,
            employment_type=None,
            defaults={
                "is_mandatory": True,
                "required_within_days_of_joining": definition["required_within_days"],
                "priority": definition["priority"],
                "is_active": True,
            },
        )
        (created if was_created else existing).append(f"document_rule:{definition['code']}")

    return SeederResult(
        module_ref="documents",
        status="succeeded",
        message="Document categories and mandatory onboarding rules are ready.",
        created=created,
        existing=existing,
        skipped=skipped,
    )


@transaction.atomic
def seed_workflows(onboarding: TenantOnboarding, input_payload: dict | None = None) -> SeederResult:
    tenant = onboarding.tenant
    created = []
    existing = []
    skipped = []

    seed_org_masters(onboarding, input_payload)
    seed_roles_users(onboarding, input_payload)

    legal_entity = LegalEntity.objects.get(tenant=tenant, code="default-legal-entity")
    branch = Branch.objects.get(tenant=tenant, code="default-branch")
    business_unit = BusinessUnit.objects.get(tenant=tenant, code="corporate")
    department_name = _input_value(input_payload, "default_department", "Operations")
    department = Department.objects.get(tenant=tenant, code=_stable_code(department_name, "operations"))
    roles_by_code = {role.code: role for role in Role.objects.filter(tenant=tenant, is_active=True)}
    effective_from = date(timezone.now().date().year, 1, 1)

    for definition in WORKFLOW_TEMPLATE_DEFINITIONS:
        minimum_plan = definition.get("minimum_plan", "starter")
        if not _plan_allows(tenant.subscription_plan, minimum_plan):
            skipped.append(definition["code"])
            continue

        missing_role_codes = sorted(
            {
                step["role_code"]
                for step in definition["steps"]
                if step.get("actor_type") == WorkflowActorType.ROLE
                and step.get("role_code")
                and step["role_code"] not in roles_by_code
            }
        )
        if missing_role_codes:
            skipped.append(f"{definition['code']}:missing_roles:{','.join(missing_role_codes)}")
            continue

        template, was_created = WorkflowTemplate.objects.get_or_create(
            tenant=tenant,
            code=definition["code"],
            version=1,
            defaults={
                "name": definition["name"],
                "module": definition["module"],
                "trigger_key": definition["trigger_key"],
                "description": definition["description"],
                "status": WorkflowStatus.ACTIVE,
                "is_system_seeded": True,
                "effective_from": effective_from,
                "condition_snapshot": {
                    "source": "tenant_launch",
                    "country_code": "IN",
                    "minimum_plan": minimum_plan,
                    "customer_editable": True,
                },
            },
        )
        (created if was_created else existing).append(f"workflow_template:{definition['code']}")

        for index, step_definition in enumerate(definition["steps"], start=1):
            role = roles_by_code.get(step_definition.get("role_code", ""))
            _, step_created = WorkflowStep.objects.get_or_create(
                template=template,
                step_order=index,
                defaults={
                    "name": step_definition["name"],
                    "mode": WorkflowStepMode.SEQUENTIAL,
                    "actor_type": step_definition["actor_type"],
                    "role": role,
                    "permission_key": step_definition["permission_key"],
                    "scope_type": step_definition["scope_type"],
                    "auto_approve_after_hours": 0,
                    "escalate_after_hours": step_definition["escalate_after_hours"],
                    "allow_delegate": True,
                    "allow_send_back": True,
                    "allow_comment": True,
                    "rule_snapshot": step_definition["rule_snapshot"],
                },
            )
            (created if step_created else existing).append(f"workflow_step:{definition['code']}:{index}")

        _, assignment_created = WorkflowTemplateAssignment.objects.get_or_create(
            tenant=tenant,
            template=template,
            legal_entity=legal_entity,
            branch=branch,
            department=department,
            business_unit=business_unit,
            grade=None,
            defaults={"priority": 100, "is_active": True},
        )
        (created if assignment_created else existing).append(f"workflow_assignment:{definition['code']}")

    return SeederResult(
        module_ref="workflows",
        status="succeeded",
        message="Workflow templates and default assignments are ready.",
        created=created,
        existing=existing,
        skipped=skipped,
    )


@transaction.atomic
def seed_payroll_defaults(onboarding: TenantOnboarding, input_payload: dict | None = None) -> SeederResult:
    tenant = onboarding.tenant
    created = []
    existing = []
    skipped = []

    if not _plan_allows(tenant.subscription_plan, "growth"):
        return SeederResult(
            module_ref="payroll_defaults",
            status="skipped",
            message="Payroll defaults require Growth or Enterprise subscription.",
            skipped=["requires_growth_plan"],
        )

    seed_org_masters(onboarding, input_payload)
    seed_roles_users(onboarding, input_payload)

    legal_entity = LegalEntity.objects.get(tenant=tenant, code="default-legal-entity")
    branch = Branch.objects.get(tenant=tenant, code="default-branch")
    location = Location.objects.get(tenant=tenant, code="head-office")
    department_name = _input_value(input_payload, "default_department", "Operations")
    department = Department.objects.get(tenant=tenant, code=_stable_code(department_name, "operations"))
    employment_type = EmploymentType.objects.get(tenant=tenant, code="full-time")
    pay_frequency = _input_value(input_payload, "pay_frequency", PayrollFrequency.MONTHLY)
    if pay_frequency not in {choice.value for choice in PayrollFrequency}:
        pay_frequency = PayrollFrequency.MONTHLY
        skipped.append("unsupported_pay_frequency_defaulted_to_monthly")
    salary_structure_style = _input_value(input_payload, "salary_structure_style", "simple_ctc")
    effective_from = _financial_year_start(input_payload)

    calendar, was_created = PayrollCalendar.objects.get_or_create(
        tenant=tenant,
        code="india-monthly-payroll",
        defaults={
            "name": "India Monthly Payroll",
            "frequency": pay_frequency,
            "timezone": tenant.timezone or "Asia/Kolkata",
            "currency_code": "INR",
            "period_start_day": 1,
            "is_active": True,
            "config_snapshot": {
                "source": "tenant_launch",
                "country_code": "IN",
                "financial_year_start": effective_from.isoformat(),
                "salary_structure_style": salary_structure_style,
                "review_required": True,
                "periods_seeded": False,
            },
        },
    )
    (created if was_created else existing).append("payroll_calendar:india-monthly-payroll")

    pay_group, was_created = PayGroup.objects.get_or_create(
        tenant=tenant,
        code="default-pay-group",
        defaults={
            "name": "Default Pay Group",
            "calendar": calendar,
            "status": PayGroupStatus.ACTIVE,
            "default_currency_code": "INR",
            "legal_entity": legal_entity,
            "branch": branch,
            "location": location,
            "department": department,
            "employment_type": employment_type,
            "config_snapshot": {
                "source": "tenant_launch",
                "country_code": "IN",
                "employee_assignments_seeded": False,
                "review_required": True,
            },
        },
    )
    (created if was_created else existing).append("pay_group:default-pay-group")

    components_by_code = {}
    for definition in PAYROLL_COMPONENT_DEFINITIONS:
        component, was_created = SalaryComponent.objects.get_or_create(
            tenant=tenant,
            code=definition["code"],
            defaults={
                "name": definition["name"],
                "component_type": definition["component_type"],
                "value_type": definition["value_type"],
                "formula_ref": definition["formula_ref"],
                "applicability_rule_ref": definition.get("applicability_rule_ref", ""),
                "rounding_rule_ref": definition.get("rounding_rule_ref", "payroll.rounding.india.standard.v1"),
                "accounting_mapping_ref": definition.get("accounting_mapping_ref", ""),
                "statutory_treatment_ref": definition.get("statutory_treatment_ref", ""),
                "is_taxable": definition.get("is_taxable", False),
                "is_proratable": definition.get("is_proratable", True),
                "payslip_visibility": definition.get("payslip_visibility", "visible"),
                "status": PayrollConfigStatus.ACTIVE,
                "config_snapshot": {
                    "source": "tenant_launch",
                    "country_code": "IN",
                    "review_required": True,
                },
            },
        )
        components_by_code[definition["code"]] = component
        (created if was_created else existing).append(f"salary_component:{definition['code']}")

    structure_status = PayrollConfigStatus.DRAFT if salary_structure_style == "customer_defined" else PayrollConfigStatus.ACTIVE
    structure, was_created = SalaryStructure.objects.get_or_create(
        tenant=tenant,
        code="standard-ctc-structure",
        defaults={
            "name": "Standard CTC Structure",
            "pay_group": pay_group,
            "currency_code": "INR",
            "status": structure_status,
            "description": "Default Indian payroll salary structure prepared by launch blueprint.",
            "config_snapshot": {
                "source": "tenant_launch",
                "country_code": "IN",
                "salary_structure_style": salary_structure_style,
                "employee_assignments_seeded": False,
                "review_required": True,
            },
        },
    )
    (created if was_created else existing).append("salary_structure:standard-ctc-structure")

    version, was_created = SalaryStructureVersion.objects.get_or_create(
        structure=structure,
        version=1,
        defaults={
            "tenant": tenant,
            "effective_from": effective_from,
            "status": structure_status,
            "annual_ctc": Decimal("0.00"),
            "currency_code": "INR",
            "config_snapshot": {
                "source": "tenant_launch",
                "country_code": "IN",
                "financial_year_start": effective_from.isoformat(),
                "employee_assignments_seeded": False,
                "review_required": True,
            },
        },
    )
    (created if was_created else existing).append("salary_structure_version:standard-ctc-structure:v1")

    if salary_structure_style == "customer_defined":
        skipped.append("salary_structure_components:customer_defined")
    else:
        for display_order, component_code in enumerate(PAYROLL_STRUCTURE_COMPONENT_CODES, start=1):
            component = components_by_code[component_code]
            _, was_created = SalaryStructureComponent.objects.get_or_create(
                structure_version=version,
                component=component,
                defaults={
                    "tenant": tenant,
                    "display_order": display_order * 10,
                    "formula_ref": component.formula_ref,
                    "calculation_rule_ref": f"payroll.structure.india.{salary_structure_style}.{component_code}.v1",
                    "is_active": True,
                    "config_snapshot": {
                        "source": "tenant_launch",
                        "country_code": "IN",
                        "salary_structure_style": salary_structure_style,
                        "review_required": True,
                    },
                },
            )
            (created if was_created else existing).append(f"salary_structure_component:{component_code}")

    statutory_pack, was_created = PayrollStatutoryPack.objects.get_or_create(
        tenant=tenant,
        code="india-default-statutory-pack",
        defaults={
            "name": "India Default Statutory Pack",
            "country_code": "IN",
            "jurisdiction_ref": "country:IN",
            "status": PayrollConfigStatus.DRAFT,
            "effective_from": effective_from,
            "currency_code": "INR",
            "statutory_profile_ref": "payroll.statutory.india.default.v1",
            "validation_profile_ref": "payroll.statutory.validation.india.default.v1",
            "config_snapshot": {
                "source": "tenant_launch",
                "country_code": "IN",
                "requires_registration_numbers": True,
                "requires_legal_review": True,
                "review_required": True,
                "rates_seeded": False,
            },
        },
    )
    (created if was_created else existing).append("statutory_pack:india-default-statutory-pack")

    for definition in PAYROLL_STATUTORY_COMPONENT_DEFINITIONS:
        salary_component = components_by_code[definition["salary_component_code"]]
        _, was_created = PayrollStatutoryComponent.objects.get_or_create(
            statutory_pack=statutory_pack,
            code=definition["code"],
            defaults={
                "tenant": tenant,
                "salary_component": salary_component,
                "name": definition["name"],
                "statutory_type": definition["statutory_type"],
                "contribution_owner": definition["contribution_owner"],
                "calculation_method": definition["calculation_method"],
                "wage_base_ref": "payroll.wage_base.india.standard.v1",
                "statutory_treatment_ref": definition["statutory_treatment_ref"],
                "applicability_profile_ref": "payroll.applicability.india.default.v1",
                "rounding_rule_ref": "payroll.rounding.india.standard.v1",
                "formula_ref": definition["formula_ref"],
                "status": PayrollConfigStatus.DRAFT,
                "config_snapshot": {
                    "source": "tenant_launch",
                    "country_code": "IN",
                    "requires_registration_numbers": True,
                    "requires_legal_review": True,
                    "review_required": True,
                    "rates_seeded": False,
                },
            },
        )
        (created if was_created else existing).append(f"statutory_component:{definition['code']}")

    skipped.extend(
        [
            "payroll_periods_require_customer_review",
            "employee_pay_group_assignments_not_seeded",
            "employee_salary_assignments_not_seeded",
            "statutory_registration_numbers_not_seeded",
            "statutory_rates_not_seeded",
            "provider_credentials_not_seeded",
            "finance_handoff_runtime_records_not_seeded",
        ]
    )

    return SeederResult(
        module_ref="payroll_defaults",
        status="succeeded",
        message=(
            "Payroll configuration defaults are ready for Growth launch review; "
            "employee assignments, statutory registrations, provider credentials, and payroll runs remain gated."
        ),
        created=created,
        existing=existing,
        skipped=skipped,
    )


@transaction.atomic
def seed_provider_placeholders(onboarding: TenantOnboarding, input_payload: dict | None = None) -> SeederResult:
    tenant = onboarding.tenant
    created = []
    existing = []
    skipped = []

    if not _plan_allows(tenant.subscription_plan, "growth"):
        return SeederResult(
            module_ref="provider_placeholders",
            status="skipped",
            message="Payroll provider placeholders require Growth or Enterprise subscription.",
            skipped=["requires_growth_plan"],
        )

    seed_payroll_defaults(onboarding, input_payload)
    provider_strategy = _input_value(input_payload, "provider_strategy", "none")
    if provider_strategy == "none":
        skipped.append("provider_strategy:none")

    for definition in PROVIDER_PLACEHOLDER_DEFINITIONS:
        readiness_snapshot = _provider_placeholder_readiness(definition, provider_strategy)
        connection, was_created = PayrollProviderConnection.objects.get_or_create(
            tenant=tenant,
            provider_ref=definition["provider_ref"],
            defaults={
                "provider_name": definition["provider_name"],
                "provider_kind": definition["provider_kind"],
                "environment_ref": "production",
                "status": PayrollProviderConnectionStatus.BLOCKED,
                "adapter_ref": "",
                "sandbox_adapter_ref": "",
                "channel_ref": "",
                "credential_ref": "",
                "credential_profile_ref": definition["credential_profile_ref"],
                "credential_required": False,
                "callback_profile_ref": "",
                "callback_verification_ref": "",
                "retry_policy_ref": definition["retry_policy_ref"],
                "certification_status": PayrollProviderCertificationStatus.NOT_STARTED,
                "certification_profile_ref": definition["certification_profile_ref"],
                "readiness_snapshot": readiness_snapshot,
                "certification_snapshot": {
                    "source": "tenant_launch",
                    "status": PayrollProviderCertificationStatus.NOT_STARTED,
                    "certification_required": True,
                    "certification_runs_seeded": False,
                },
                "config_snapshot": {
                    "source": "tenant_launch",
                    "provider_strategy": provider_strategy,
                    "placeholder": True,
                    "live_delivery_enabled": False,
                    "requires_real_credentials": True,
                    "requires_provider_certification": True,
                    "required_setup_refs": {
                        "adapter_profile_ref": definition["adapter_profile_ref"],
                        "channel_profile_ref": definition["channel_profile_ref"],
                        "callback_profile_ref": definition["callback_profile_ref"],
                        "callback_verification_ref": definition["callback_verification_ref"],
                        "retry_policy_ref": definition["retry_policy_ref"],
                        "certification_profile_ref": definition["certification_profile_ref"],
                    },
                },
            },
        )
        if not was_created:
            existing.append(f"provider_connection:{definition['code']}")
            if connection.status != PayrollProviderConnectionStatus.ACTIVE:
                connection.readiness_snapshot = readiness_snapshot
                connection.config_snapshot = {
                    **(connection.config_snapshot if isinstance(connection.config_snapshot, dict) else {}),
                    "source": "tenant_launch",
                    "provider_strategy": provider_strategy,
                    "placeholder": True,
                    "live_delivery_enabled": False,
                    "requires_real_credentials": True,
                    "requires_provider_certification": True,
                }
                connection.save(update_fields=["readiness_snapshot", "config_snapshot", "updated_at"])
        else:
            created.append(f"provider_connection:{definition['code']}")

        mapping_profile_ref = f"payroll.provider_mapping.{definition['provider_kind']}.{definition['artifact_kind']}.placeholder.v1"
        _, was_created = PayrollProviderSchemaMappingPack.objects.get_or_create(
            tenant=tenant,
            mapping_profile_ref=mapping_profile_ref,
            version=1,
            defaults={
                "provider_connection": connection,
                "provider_ref": connection.provider_ref,
                "provider_kind": connection.provider_kind,
                "environment_ref": connection.environment_ref,
                "artifact_kind": definition["artifact_kind"],
                "status": PayrollProviderSchemaMappingPackStatus.DRAFT,
                "source_schema_ref": f"payroll.internal.{definition['artifact_kind']}.submission.v1",
                "target_schema_ref": f"{definition['provider_ref']}.{definition['artifact_kind']}.payload.v1",
                "transform_profile_ref": "payroll.provider_mapping.transform.customer_review.v1",
                "validation_profile_ref": "payroll.provider_mapping.validation.customer_review.v1",
                "enforcement_mode": "disabled",
                "transform_rules": [],
                "validation_rules": [
                    {
                        "path": "provider.credentials",
                        "required": True,
                        "gate_ref": "real_credentials_configured",
                    },
                    {
                        "path": "provider.certification",
                        "required": True,
                        "gate_ref": "provider_certification_passed",
                    },
                ],
                "evidence_snapshot": {
                    "source": "tenant_launch",
                    "provider_strategy": provider_strategy,
                    "placeholder": True,
                    "activation_required": True,
                    "simulation_required": True,
                },
            },
        )
        (created if was_created else existing).append(f"provider_mapping_pack:{definition['code']}")

    skipped.extend(
        [
            "real_provider_credentials_not_seeded",
            "provider_certification_runs_not_seeded",
            "provider_jobs_not_seeded",
            "provider_deliveries_not_seeded",
            "active_provider_mappings_not_seeded",
            "live_provider_submission_disabled",
        ]
    )

    return SeederResult(
        module_ref="provider_placeholders",
        status="succeeded",
        message=(
            "Blocked payroll provider placeholders are ready for credential collection, mapping review, "
            "sandbox certification, and explicit activation."
        ),
        created=created,
        existing=existing,
        skipped=skipped,
    )


SEEDER_BY_MODULE = {
    "documents": seed_documents,
    "launch_checklist": seed_launch_checklist,
    "leave_attendance": seed_leave_attendance,
    "shift_attendance": seed_leave_attendance,
    "payroll_defaults": seed_payroll_defaults,
    "provider_placeholders": seed_provider_placeholders,
    "roles_users": seed_roles_users,
    "org_masters": seed_org_masters,
    "notifications": seed_notifications,
    "workflows": seed_workflows,
}
